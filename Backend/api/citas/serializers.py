from rest_framework import serializers
from django.utils import timezone
from datetime import datetime, time
from .models import Cita, CitaServicio
from api.clientes.models import Cliente
from api.servicios.models import Servicio
from api.manicuristas.models import Manicurista
from api.clientes.serializers import ClienteSerializer
from api.servicios.serializers import ServicioSerializer
from api.manicuristas.serializers import ManicuristaSerializer


class CitaSerializer(serializers.ModelSerializer):
    # Campos de solo lectura para mostrar información completa
    cliente_info = ClienteSerializer(source='cliente', read_only=True)
    manicurista_info = ManicuristaSerializer(source='manicurista', read_only=True)
    servicio_info = ServicioSerializer(source='servicio', read_only=True)
    
    # NUEVO: Información de todos los servicios
    servicios_info = ServicioSerializer(source='servicios', many=True, read_only=True)
    
    # Campos calculados
    duracion_formateada = serializers.ReadOnlyField()
    puede_finalizar = serializers.ReadOnlyField()
    puede_cancelar = serializers.ReadOnlyField()
    
    # NUEVO: Campos para múltiples servicios
    servicios = serializers.PrimaryKeyRelatedField(
        queryset=Servicio.objects.filter(estado='activo'),
        many=True,
        required=False
    )
    
    class Meta:
        model = Cita
        fields = '__all__'

    def validate_fecha_cita(self, value):
        """Validar que la fecha no sea en el pasado"""
        if value < timezone.now().date():
            raise serializers.ValidationError("La fecha de la cita no puede ser en el pasado")
        return value

    def validate_hora_cita(self, value):
        """Validar horario de trabajo"""
        # --- CAMBIO AQUÍ: Horario de 10:00 AM a 8:00 PM ---
        if value < time(10, 0) or value >= time(20, 0):
            raise serializers.ValidationError("La hora debe estar entre 10:00 AM y 8:00 PM")
        return value

    def validate_cliente(self, value):
        """Validar que el cliente esté activo"""
        if not value.estado:
            raise serializers.ValidationError("El cliente seleccionado no está activo")
        return value

    def validate_manicurista(self, value):
        """Validar que la manicurista esté activa y disponible"""
        if value.estado != 'activo':
            raise serializers.ValidationError("La manicurista seleccionada no está activa")
        if not value.disponible:
            raise serializers.ValidationError("La manicurista seleccionada no está disponible")
        return value

    def validate_servicio(self, value):
        """Validar que el servicio esté activo"""
        if value and value.estado != 'activo':
            raise serializers.ValidationError("El servicio seleccionado no está activo")
        return value

    def validate_servicios(self, value):
        """Validar que todos los servicios estén activos"""
        if not value:
            raise serializers.ValidationError("Debe seleccionar al menos un servicio")
        
        for servicio in value:
            if servicio.estado != 'activo':
                raise serializers.ValidationError(f"El servicio '{servicio.nombre}' no está activo")
        
        return value

    def validate(self, data):
        """Validaciones a nivel de objeto"""
        fecha_cita = data.get('fecha_cita')
        hora_cita = data.get('hora_cita')
        manicurista = data.get('manicurista')

        # Verificar disponibilidad de la manicurista en esa fecha y hora
        if fecha_cita and hora_cita and manicurista:
            # Excluir la cita actual si estamos editando
            queryset = Cita.objects.filter(
                manicurista=manicurista,
                fecha_cita=fecha_cita,
                hora_cita=hora_cita,
                estado__in=['pendiente', 'en_proceso']
            )
            
            if self.instance:
                queryset = queryset.exclude(id=self.instance.id)
            
            if queryset.exists():
                raise serializers.ValidationError({
                    'hora_cita': 'La manicurista ya tiene una cita programada en esta fecha y hora'
                })

        return data


class CitaCreateSerializer(serializers.ModelSerializer):
    """Serializer específico para crear citas con múltiples servicios"""
    
    servicios = serializers.PrimaryKeyRelatedField(
        queryset=Servicio.objects.filter(estado='activo'),
        many=True,
        required=True
    )
    
    # Cambiar cliente a IntegerField para evitar validación automática de ForeignKey
    cliente = serializers.IntegerField()
    
    class Meta:
        model = Cita
        fields = [
            'cliente', 'manicurista', 'servicio', 'servicios',
            'fecha_cita', 'hora_cita', 'observaciones'
        ]

    def validate_cliente(self, value):
        """Validar cliente - buscar por correo electrónico del usuario"""
        try:
            # Intentar obtener el cliente directamente por ID
            cliente = Cliente.objects.get(id=value)
            if not cliente.estado:
                raise serializers.ValidationError("El cliente seleccionado no está activo")
            return cliente
        except Cliente.DoesNotExist:
            # Si no existe cliente con ese ID, buscar por correo del usuario
            from api.usuarios.models import Usuario
            try:
                usuario = Usuario.objects.get(id=value)
                if usuario.rol and usuario.rol.nombre.lower() == 'cliente':
                    # Buscar cliente por correo electrónico
                    cliente = Cliente.objects.filter(correo_electronico=usuario.correo_electronico).first()
                    if cliente:
                        print(f"✅ Cliente encontrado por correo para usuario {usuario.id}: {cliente.id}")
                        return cliente
                    else:
                        # Si no existe cliente con ese correo, crear uno
                        cliente_data = {
                            'usuario': usuario,
                            'nombre': usuario.nombre,
                            'tipo_documento': usuario.tipo_documento,
                            'documento': usuario.documento,
                            'celular': usuario.celular,
                            'correo_electronico': usuario.correo_electronico,
                            'direccion': usuario.direccion,
                            'estado': True
                        }
                        
                        cliente = Cliente.objects.create(**cliente_data)
                        print(f"✅ Cliente creado automáticamente para usuario {usuario.id}: {cliente.id}")
                        return cliente
                else:
                    raise serializers.ValidationError("El usuario no tiene rol de Cliente")
            except Usuario.DoesNotExist:
                raise serializers.ValidationError("No se encontró el usuario")

    def validate_servicios(self, value):
        """Validar que se seleccionen servicios"""
        if not value:
            raise serializers.ValidationError("Debe seleccionar al menos un servicio")
        return value

    def create(self, validated_data):
        """Crear cita con múltiples servicios"""
        servicios_data = validated_data.pop('servicios', [])
        
        # Obtener el cliente del validated_data (ya fue procesado por validate_cliente)
        cliente = validated_data.pop('cliente')
        validated_data['cliente'] = cliente
        
        # Si no hay servicio principal, usar el primero de la lista
        if not validated_data.get('servicio') and servicios_data:
            validated_data['servicio'] = servicios_data[0]
        
        # Calcular totales
        precio_total = sum(servicio.precio for servicio in servicios_data)
        duracion_total = sum(servicio.duracion for servicio in servicios_data)
        
        validated_data['precio_total'] = precio_total
        validated_data['duracion_total'] = duracion_total
        
        # Mantener compatibilidad
        if validated_data.get('servicio'):
            validated_data['precio_servicio'] = validated_data['servicio'].precio
            validated_data['duracion_estimada'] = validated_data['servicio'].duracion
        
        # Crear la cita
        cita = super().create(validated_data)
        
        # Crear registros en el through con precio y subtotal
        orden = 1
        for servicio in servicios_data:
            CitaServicio.objects.create(
                cita=cita,
                servicio=servicio,
                cantidad=1,
                precio_unitario=servicio.precio,
                subtotal=servicio.precio,
                orden=orden,
            )
            orden += 1
        
        # Recalcular totales
        cita.calcular_totales()
        
        return cita

    def update(self, instance, validated_data):
        """Actualizar cita con múltiples servicios"""
        servicios_data = validated_data.pop('servicios', None)
        
        # Actualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Actualizar servicios si se proporcionaron
        if servicios_data is not None:
            # Eliminar detalles actuales y recrear con valores
            instance.servicios_cita.all().delete()
            orden = 1
            for servicio in servicios_data:
                CitaServicio.objects.create(
                    cita=instance,
                    servicio=servicio,
                    cantidad=1,
                    precio_unitario=servicio.precio,
                    subtotal=servicio.precio,
                    orden=orden,
                )
                orden += 1
            
            # Recalcular totales
            instance.calcular_totales()
        
        return instance


class CitaUpdateEstadoSerializer(serializers.ModelSerializer):
    """Serializer para actualizar solo el estado de la cita"""
    
    class Meta:
        model = Cita
        fields = ['estado', 'observaciones', 'motivo_cancelacion'] # Añadir motivo_cancelacion

    def validate_estado(self, value):
        """Validar transiciones de estado válidas"""
        if self.instance:
            estado_actual = self.instance.estado
            
            # Definir transiciones válidas
            transiciones_validas = {
                'pendiente': ['en_proceso', 'cancelada', 'cancelada_por_novedad'], # Añadir cancelada_por_novedad
                'en_proceso': ['finalizada', 'cancelada', 'cancelada_por_novedad'], # Añadir cancelada_por_novedad
                'finalizada': [],  # No se puede cambiar desde finalizada
                'cancelada': [],    # No se puede cambiar desde cancelada
                'cancelada_por_novedad': ['pendiente'], # Se puede reactivar a pendiente
            }
            
            if value not in transiciones_validas.get(estado_actual, []):
                raise serializers.ValidationError(
                    f"No se puede cambiar de '{estado_actual}' a '{value}'"
                )
        
        return value

    def update(self, instance, validated_data):
        """Actualizar estado y manejar lógica especial"""
        nuevo_estado = validated_data.get('estado')
        
        # Si se finaliza la cita, establecer fecha de finalización
        if nuevo_estado == 'finalizada' and not instance.fecha_finalizacion:
            instance.fecha_finalizacion = timezone.now()
        
        # Si se cancela, establecer motivo de cancelación si no es por novedad
        if nuevo_estado == 'cancelada' and not instance.motivo_cancelacion:
            if not validated_data.get('motivo_cancelacion'):
                raise serializers.ValidationError({'motivo_cancelacion': 'El motivo de cancelación es requerido para el estado "cancelada".'})
            instance.motivo_cancelacion = validated_data.get('motivo_cancelacion')
        
        # Si se reactiva de 'cancelada_por_novedad', limpiar campos
        if instance.estado == 'cancelada_por_novedad' and nuevo_estado == 'pendiente':
            instance.motivo_cancelacion = None
            instance.novedad_relacionada = None

        # Guardar la instancia
        cita_actualizada = super().update(instance, validated_data)
        
        # Si se finaliza la cita, crear ventas automáticamente
        if nuevo_estado == 'finalizada':
            try:
                cita_actualizada.crear_ventas_automaticas()
            except Exception as e:
                print(f"Error creando ventas automáticas desde serializer: {e}")
        
        return cita_actualizada


class BuscarClienteSerializer(serializers.Serializer):
    """Serializer para búsqueda de clientes"""
    query = serializers.CharField(
        max_length=100,
        help_text="Nombre o documento del cliente"
    )

    def validate_query(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError(
                "La búsqueda debe tener al menos 2 caracteres"
            )
        return value.strip()
