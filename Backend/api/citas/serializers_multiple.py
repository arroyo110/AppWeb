from rest_framework import serializers
from .models import Cita, CitaManicurista, CitaServicio
from api.clientes.models import Cliente
from api.manicuristas.models import Manicurista
from api.servicios.models import Servicio
from api.manicuristas.serializers import ManicuristaSerializer
from api.servicios.serializers import ServicioSerializer


class CitaManicuristaSerializer(serializers.ModelSerializer):
    """Serializer para manicuristas de cita"""
    manicurista_info = ManicuristaSerializer(source='manicurista', read_only=True)
    manicurista_nombre = serializers.CharField(source='manicurista.nombre', read_only=True)
    manicurista_especialidad = serializers.CharField(source='manicurista.especialidad', read_only=True)
    
    class Meta:
        model = CitaManicurista
        fields = [
            'id', 'manicurista', 'manicurista_info', 'manicurista_nombre', 
            'manicurista_especialidad', 'es_principal', 'orden'
        ]


class CitaServicioSerializer(serializers.ModelSerializer):
    """Serializer para servicios de cita"""
    servicio_info = ServicioSerializer(source='servicio', read_only=True)
    servicio_nombre = serializers.CharField(source='servicio.nombre', read_only=True)
    servicio_precio = serializers.DecimalField(source='servicio.precio', max_digits=10, decimal_places=2, read_only=True)
    servicio_duracion = serializers.IntegerField(source='servicio.duracion', read_only=True)
    
    class Meta:
        model = CitaServicio
        fields = [
            'id', 'servicio', 'servicio_info', 'servicio_nombre', 
            'servicio_precio', 'servicio_duracion', 'cantidad', 
            'precio_unitario', 'subtotal', 'orden'
        ]


class CitaMultipleSerializer(serializers.ModelSerializer):
    """Serializer para citas con múltiples manicuristas y servicios"""
    manicuristas_detalle = CitaManicuristaSerializer(source='manicuristas_cita', many=True, read_only=True)
    servicios_detalle = CitaServicioSerializer(source='servicios_cita', many=True, read_only=True)
    
    # Campos para crear/actualizar
    manicuristas_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="IDs de las manicuristas a asignar"
    )
    servicios_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="Datos de servicios: [{'servicio_id': 1, 'cantidad': 2, 'orden': 1}]"
    )
    
    # Información de compatibilidad
    manicurista_principal_nombre = serializers.CharField(source='manicurista.nombre', read_only=True)
    servicio_principal_nombre = serializers.CharField(source='servicio.nombre', read_only=True)
    
    class Meta:
        model = Cita
        fields = [
            'id', 'cliente', 'fecha_cita', 'hora_cita', 'estado', 'observaciones',
            'motivo_cancelacion', 'precio_total', 'duracion_total', 'fecha_finalizacion',
            
            # Múltiples relaciones
            'manicuristas_detalle', 'servicios_detalle',
            'manicuristas_ids', 'servicios_data',
            
            # Compatibilidad
            'manicurista', 'servicio', 'manicurista_principal_nombre', 'servicio_principal_nombre',
            
            # Campos de sistema
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']
    
    def validate_manicuristas_ids(self, value):
        """Validar que las manicuristas existan y estén activas"""
        if value:
            manicuristas = Manicurista.objects.filter(id__in=value, estado='activo')
            if len(manicuristas) != len(value):
                raise serializers.ValidationError("Algunas manicuristas no existen o no están activas")
        return value
    
    def validate_servicios_data(self, value):
        """Validar datos de servicios"""
        if value:
            for servicio_data in value:
                if 'servicio_id' not in servicio_data:
                    raise serializers.ValidationError("Cada servicio debe tener 'servicio_id'")
                if 'cantidad' not in servicio_data:
                    servicio_data['cantidad'] = 1
                if 'orden' not in servicio_data:
                    servicio_data['orden'] = 1
                
                # Validar que el servicio exista y esté activo
                try:
                    servicio = Servicio.objects.get(id=servicio_data['servicio_id'])
                    if servicio.estado != 'activo':
                        raise serializers.ValidationError(f"El servicio {servicio.nombre} no está activo")
                except Servicio.DoesNotExist:
                    raise serializers.ValidationError(f"El servicio con ID {servicio_data['servicio_id']} no existe")
        return value
    
    def create(self, validated_data):
        """Crear cita con múltiples manicuristas y servicios"""
        manicuristas_ids = validated_data.pop('manicuristas_ids', [])
        servicios_data = validated_data.pop('servicios_data', [])
        
        # Crear la cita
        cita = Cita.objects.create(**validated_data)
        
        # Asignar manicuristas
        for i, manicurista_id in enumerate(manicuristas_ids):
            CitaManicurista.objects.create(
                cita=cita,
                manicurista_id=manicurista_id,
                es_principal=(i == 0),  # La primera es principal
                orden=i + 1
            )
        
        # Asignar servicios
        for servicio_data in servicios_data:
            servicio = Servicio.objects.get(id=servicio_data['servicio_id'])
            CitaServicio.objects.create(
                cita=cita,
                servicio=servicio,
                cantidad=servicio_data['cantidad'],
                precio_unitario=servicio.precio,
                orden=servicio_data['orden']
            )
        
        # Recalcular totales
        cita.calcular_totales()
        
        return cita
    
    def update(self, instance, validated_data):
        """Actualizar cita con múltiples manicuristas y servicios"""
        manicuristas_ids = validated_data.pop('manicuristas_ids', None)
        servicios_data = validated_data.pop('servicios_data', None)
        
        # Actualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Actualizar manicuristas si se proporcionan
        if manicuristas_ids is not None:
            # Eliminar asignaciones actuales
            instance.manicuristas_cita.all().delete()
            
            # Crear nuevas asignaciones
            for i, manicurista_id in enumerate(manicuristas_ids):
                CitaManicurista.objects.create(
                    cita=instance,
                    manicurista_id=manicurista_id,
                    es_principal=(i == 0),
                    orden=i + 1
                )
        
        # Actualizar servicios si se proporcionan
        if servicios_data is not None:
            # Eliminar servicios actuales
            instance.servicios_cita.all().delete()
            
            # Crear nuevos servicios
            for servicio_data in servicios_data:
                servicio = Servicio.objects.get(id=servicio_data['servicio_id'])
                CitaServicio.objects.create(
                    cita=instance,
                    servicio=servicio,
                    cantidad=servicio_data['cantidad'],
                    precio_unitario=servicio.precio,
                    orden=servicio_data['orden']
                )
        
        # Recalcular totales
        instance.calcular_totales()
        
        return instance


class CitaMultipleMobileSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil con múltiples relaciones"""
    manicuristas_nombres = serializers.SerializerMethodField()
    servicios_nombres = serializers.SerializerMethodField()
    total_manicuristas = serializers.SerializerMethodField()
    total_servicios = serializers.SerializerMethodField()
    
    class Meta:
        model = Cita
        fields = [
            'id', 'fecha_cita', 'hora_cita', 'estado', 'precio_total', 'duracion_total',
            'manicuristas_nombres', 'servicios_nombres', 'total_manicuristas', 'total_servicios'
        ]
    
    def get_manicuristas_nombres(self, obj):
        """Obtener nombres de manicuristas"""
        return [cm.manicurista.nombre for cm in obj.manicuristas_cita.all()]
    
    def get_servicios_nombres(self, obj):
        """Obtener nombres de servicios"""
        return [cs.servicio.nombre for cs in obj.servicios_cita.all()]
    
    def get_total_manicuristas(self, obj):
        """Obtener total de manicuristas"""
        return obj.manicuristas_cita.count()
    
    def get_total_servicios(self, obj):
        """Obtener total de servicios"""
        return obj.servicios_cita.count()


class CitaCrearMultipleSerializer(serializers.Serializer):
    """Serializer para crear citas con múltiples relaciones desde móvil"""
    cliente_id = serializers.IntegerField()
    fecha_cita = serializers.DateField()
    hora_cita = serializers.TimeField()
    observaciones = serializers.CharField(required=False, allow_blank=True)
    
    # Múltiples manicuristas
    manicuristas_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text="IDs de las manicuristas (mínimo 1)"
    )
    
    # Múltiples servicios
    servicios_data = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        help_text="Datos de servicios: [{'servicio_id': 1, 'cantidad': 2}]"
    )
    
    def validate_manicuristas_ids(self, value):
        """Validar manicuristas"""
        if not value:
            raise serializers.ValidationError("Debe asignar al menos una manicurista")
        
        manicuristas = Manicurista.objects.filter(id__in=value, estado='activo')
        if len(manicuristas) != len(value):
            raise serializers.ValidationError("Algunas manicuristas no existen o no están activas")
        
        return value
    
    def validate_servicios_data(self, value):
        """Validar servicios"""
        if not value:
            raise serializers.ValidationError("Debe incluir al menos un servicio")
        
        for servicio_data in value:
            if 'servicio_id' not in servicio_data:
                raise serializers.ValidationError("Cada servicio debe tener 'servicio_id'")
            
            try:
                servicio = Servicio.objects.get(id=servicio_data['servicio_id'])
                if servicio.estado != 'activo':
                    raise serializers.ValidationError(f"El servicio {servicio.nombre} no está activo")
            except Servicio.DoesNotExist:
                raise serializers.ValidationError(f"El servicio con ID {servicio_data['servicio_id']} no existe")
        
        return value
    
    def create(self, validated_data):
        """Crear cita con validaciones adicionales"""
        # Verificar disponibilidad de todas las manicuristas
        fecha = validated_data['fecha_cita']
        hora = validated_data['hora_cita']
        
        for manicurista_id in validated_data['manicuristas_ids']:
            # Aquí podrías agregar validaciones de disponibilidad
            # usando el sistema de disponibilidades que creamos
            pass
        
        # Crear la cita usando el serializer completo
        cita_data = {
            'cliente_id': validated_data['cliente_id'],
            'fecha_cita': validated_data['fecha_cita'],
            'hora_cita': validated_data['hora_cita'],
            'observaciones': validated_data.get('observaciones', ''),
            'manicuristas_ids': validated_data['manicuristas_ids'],
            'servicios_data': validated_data['servicios_data']
        }
        
        serializer = CitaMultipleSerializer(data=cita_data)
        if serializer.is_valid():
            return serializer.save()
        else:
            raise serializers.ValidationError(serializer.errors)
