from rest_framework import serializers
from .models import Liquidacion
from api.manicuristas.models import Manicurista
from api.manicuristas.serializers import ManicuristaSerializer
from api.citas.models import Cita
from api.clientes.models import Cliente
from api.servicios.models import Servicio
from django.db.models import Sum
from datetime import datetime
from decimal import Decimal


class LiquidacionSerializer(serializers.ModelSerializer):
    # Campos calculados de solo lectura (propiedades del modelo)
    total_servicios_completados = serializers.ReadOnlyField()
    total_a_pagar = serializers.ReadOnlyField()
    cantidad_servicios_completados = serializers.ReadOnlyField()
    citascompletadas = serializers.ReadOnlyField()
    
    # Campos calculados para citas completadas
    total_citas_completadas = serializers.SerializerMethodField()
    cantidad_citas_completadas = serializers.SerializerMethodField()
    comision_50_porciento = serializers.SerializerMethodField()

    class Meta:
        model = Liquidacion
        fields = '__all__'
    
    def get_total_citas_completadas(self, obj):
        """Calcular total de citas completadas en el período"""
        try:
            total = Cita.objects.filter(
                manicurista=obj.manicurista,
                fecha_cita__range=(obj.fecha_inicio, obj.fecha_final),
                estado='finalizada'
            ).aggregate(total=Sum('precio_total'))['total'] or Decimal('0.00')
            return float(total)
        except Exception:
            return 0.0
    
    def get_cantidad_citas_completadas(self, obj):
        """Contar citas completadas en el período"""
        try:
            return Cita.objects.filter(
                manicurista=obj.manicurista,
                fecha_cita__range=(obj.fecha_inicio, obj.fecha_final),
                estado='finalizada'
            ).count()
        except Exception:
            return 0
    
    def get_comision_50_porciento(self, obj):
        """Calcular el 50% de las citas completadas"""
        total_citas = self.get_total_citas_completadas(obj)
        return total_citas * 0.5
        
    def validate(self, data):
        # Validar duplicados por manicurista y rango de fechas
        queryset = Liquidacion.objects.filter(
            manicurista=data['manicurista'],
            fecha_inicio=data['fecha_inicio'],
            fecha_final=data['fecha_final']
        )
        
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
            
        if queryset.exists():
            raise serializers.ValidationError("Ya existe una liquidación para esta manicurista en ese rango de fechas.")

        # Validar valores no negativos
        if data['valor'] < 0:
            raise serializers.ValidationError("El valor no puede ser negativo")
        if data['bonificacion'] < 0:
            raise serializers.ValidationError("La bonificación no puede ser negativa")
        
        return data


class LiquidacionDetailSerializer(serializers.ModelSerializer):
    manicurista = ManicuristaSerializer(read_only=True)
    
    # Campos calculados del modelo
    total_servicios_completados = serializers.ReadOnlyField()
    total_a_pagar = serializers.ReadOnlyField()
    cantidad_servicios_completados = serializers.ReadOnlyField()
    citascompletadas = serializers.ReadOnlyField()
    
    # Campos para citas completadas
    total_citas_completadas = serializers.SerializerMethodField()
    cantidad_citas_completadas = serializers.SerializerMethodField()
    comision_50_porciento = serializers.SerializerMethodField()
    
    class Meta:
        model = Liquidacion
        fields = '__all__'
    
    def get_total_citas_completadas(self, obj):
        """Calcular total de citas completadas en el período"""
        try:
            total = Cita.objects.filter(
                manicurista=obj.manicurista,
                fecha_cita__range=(obj.fecha_inicio, obj.fecha_final),
                estado='finalizada'
            ).aggregate(total=Sum('precio_total'))['total'] or Decimal('0.00')
            return float(total)
        except Exception:
            return 0.0
    
    def get_cantidad_citas_completadas(self, obj):
        """Contar citas completadas en el período"""
        try:
            return Cita.objects.filter(
                manicurista=obj.manicurista,
                fecha_cita__range=(obj.fecha_inicio, obj.fecha_final),
                estado='finalizada'
            ).count()
        except Exception:
            return 0
    
    def get_comision_50_porciento(self, obj):
        """Calcular el 50% de las citas completadas"""
        total_citas = self.get_total_citas_completadas(obj)
        return total_citas * 0.5


class LiquidacionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer específico para crear liquidaciones con cálculo automático de valor basado en citas
    """
    # Campo opcional para auto-calcular valor basado en citas completadas
    calcular_valor_automatico = serializers.BooleanField(write_only=True, required=False, default=True)
    
    class Meta:
        model = Liquidacion
        fields = ['manicurista', 'fecha_inicio', 'fecha_final', 'valor', 'bonificacion', 'calcular_valor_automatico']
    
    def create(self, validated_data):
        """
        Crear liquidación con cálculo automático de valor si se solicita
        """
        calcular_automatico = validated_data.pop('calcular_valor_automatico', True)
        
        # Si se solicita cálculo automático y no se proporciona valor, calcularlo
        if calcular_automatico and validated_data.get('valor', 0) == 0:
            manicurista = validated_data['manicurista']
            fecha_inicio = validated_data['fecha_inicio']
            fecha_final = validated_data['fecha_final']
            
            # Calcular total de citas completadas
            try:
                total_citas = Cita.objects.filter(
                    manicurista=manicurista,
                    fecha_cita__range=(fecha_inicio, fecha_final),
                    estado='finalizada'
                ).aggregate(total=Sum('precio_total'))['total'] or Decimal('0.00')
                
                # Calcular el 50% de comisión y redondear a 2 decimales
                comision = (total_citas * Decimal('0.5')).quantize(Decimal('0.01'))
                validated_data['valor'] = comision
            except Exception:
                validated_data['valor'] = Decimal('0.00')
        
        return Liquidacion.objects.create(**validated_data)


class LiquidacionUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para actualizar liquidaciones con opción de recalcular
    """
    recalcular_citas_completadas = serializers.BooleanField(write_only=True, required=False, default=False)
    recalcular_valor_citas = serializers.BooleanField(write_only=True, required=False, default=False)
    
    class Meta:
        model = Liquidacion
        fields = ['valor', 'bonificacion', 'recalcular_citas_completadas', 'recalcular_valor_citas']
    
    def update(self, instance, validated_data):
        recalcular_citas = validated_data.pop('recalcular_citas_completadas', False)
        recalcular_valor = validated_data.pop('recalcular_valor_citas', False)
        
        # Actualizar campos normales
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Recalcular citas completadas si se solicita
        if recalcular_citas:
            instance.calcular_citas_completadas()
        
        # Recalcular valor basado en citas si se solicita
        if recalcular_valor:
            try:
                total_citas = Cita.objects.filter(
                    manicurista=instance.manicurista,
                    fecha_cita__range=(instance.fecha_inicio, instance.fecha_final),
                    estado='finalizada'
                ).aggregate(total=Sum('precio_total'))['total'] or Decimal('0.00')
            
            # Calcular el 50% de comisión y redondear a 2 decimales
                comision = (total_citas * Decimal('0.5')).quantize(Decimal('0.01'))
                instance.valor = comision
            except Exception:
                # En caso de error, mantener el valor actual
                pass
        
        instance.save()
        return instance


class ClienteSimpleSerializer(serializers.ModelSerializer):
    """Serializer simple para información básica del cliente"""
    class Meta:
        model = Cliente
        fields = ['id', 'nombre', 'documento', 'telefono', 'correo']


class ServicioSimpleSerializer(serializers.ModelSerializer):
    """Serializer simple para información básica del servicio"""
    class Meta:
        model = Servicio
        fields = ['id', 'nombre', 'precio', 'duracion', 'descripcion']


class CitaDetalladaSerializer(serializers.ModelSerializer):
    """Serializer detallado para citas con información completa"""
    cliente = ClienteSimpleSerializer(read_only=True)
    servicios = ServicioSimpleSerializer(many=True, read_only=True)
    servicio_principal = ServicioSimpleSerializer(source='servicio', read_only=True)
    duracion_formateada = serializers.ReadOnlyField()
    puede_finalizar = serializers.ReadOnlyField()
    puede_cancelar = serializers.ReadOnlyField()
    
    class Meta:
        model = Cita
        fields = [
            'id', 'cliente', 'servicios', 'servicio_principal', 
            'fecha_cita', 'hora_cita', 'estado', 'observaciones',
            'motivo_cancelacion', 'precio_total', 'precio_servicio',
            'duracion_total', 'duracion_estimada', 'duracion_formateada',
            'fecha_finalizacion', 'fecha_creacion', 'fecha_actualizacion',
            'puede_finalizar', 'puede_cancelar'
        ]


class LiquidacionCompletaSerializer(serializers.ModelSerializer):
    """Serializer completo para liquidaciones con todos los detalles de citas"""
    manicurista = ManicuristaSerializer(read_only=True)
    
    # Campos calculados del modelo
    total_servicios_completados = serializers.ReadOnlyField()
    total_a_pagar = serializers.ReadOnlyField()
    cantidad_servicios_completados = serializers.ReadOnlyField()
    citascompletadas = serializers.ReadOnlyField()
    
    # Campos para citas completadas
    total_citas_completadas = serializers.SerializerMethodField()
    cantidad_citas_completadas = serializers.SerializerMethodField()
    comision_50_porciento = serializers.SerializerMethodField()
    
    # Información detallada de citas
    citas_detalladas = serializers.SerializerMethodField()
    resumen_citas = serializers.SerializerMethodField()
    
    class Meta:
        model = Liquidacion
        fields = [
            'id', 'manicurista', 'fecha_inicio', 'fecha_final', 
            'valor', 'bonificacion', 'estado', 'observaciones',
            'fecha_creacion', 'fecha_actualizacion',
            'total_servicios_completados', 'total_a_pagar',
            'cantidad_servicios_completados', 'citascompletadas',
            'total_citas_completadas', 'cantidad_citas_completadas',
            'comision_50_porciento', 'citas_detalladas', 'resumen_citas'
        ]
    
    def get_total_citas_completadas(self, obj):
        """Calcular total de citas completadas en el período"""
        try:
            total = Cita.objects.filter(
                manicurista=obj.manicurista,
                fecha_cita__range=(obj.fecha_inicio, obj.fecha_final),
                estado='finalizada'
            ).aggregate(total=Sum('precio_total'))['total'] or Decimal('0.00')
            return float(total)
        except Exception:
            return 0.0
    
    def get_cantidad_citas_completadas(self, obj):
        """Contar citas completadas en el período"""
        try:
            return Cita.objects.filter(
                manicurista=obj.manicurista,
                fecha_cita__range=(obj.fecha_inicio, obj.fecha_final),
                estado='finalizada'
            ).count()
        except Exception:
            return 0
    
    def get_comision_50_porciento(self, obj):
        """Calcular el 50% de las citas completadas"""
        total_citas = self.get_total_citas_completadas(obj)
        return total_citas * 0.5
    
    def get_citas_detalladas(self, obj):
        """Obtener información detallada de todas las citas completadas"""
        try:
            citas = Cita.objects.filter(
                manicurista=obj.manicurista,
                fecha_cita__range=(obj.fecha_inicio, obj.fecha_final),
                estado='finalizada'
            ).select_related('cliente', 'servicio').prefetch_related('servicios').order_by('fecha_cita', 'hora_cita')
            
            return CitaDetalladaSerializer(citas, many=True).data
        except Exception:
            return []
    
    def get_resumen_citas(self, obj):
        """Obtener resumen estadístico de las citas"""
        try:
            citas = Cita.objects.filter(
                manicurista=obj.manicurista,
                fecha_cita__range=(obj.fecha_inicio, obj.fecha_final),
                estado='finalizada'
            )
            
            total_citas = citas.aggregate(total=Sum('precio_total'))['total'] or Decimal('0.00')
            cantidad_citas = citas.count()
            comision_50 = (total_citas * Decimal('0.5')).quantize(Decimal('0.01'))
            
            # Estadísticas por día
            citas_por_dia = {}
            for cita in citas:
                fecha_str = cita.fecha_cita.strftime('%Y-%m-%d')
                if fecha_str not in citas_por_dia:
                    citas_por_dia[fecha_str] = {
                        'fecha': fecha_str,
                        'cantidad': 0,
                        'total': Decimal('0.00')
                    }
                citas_por_dia[fecha_str]['cantidad'] += 1
                citas_por_dia[fecha_str]['total'] += cita.precio_total
            
            # Estadísticas por servicio
            servicios_stats = {}
            for cita in citas:
                for servicio in cita.servicios.all():
                    if servicio.nombre not in servicios_stats:
                        servicios_stats[servicio.nombre] = {
                            'nombre': servicio.nombre,
                            'cantidad': 0,
                            'total': Decimal('0.00')
                        }
                    servicios_stats[servicio.nombre]['cantidad'] += 1
                    servicios_stats[servicio.nombre]['total'] += servicio.precio
            
            return {
                'total_general': float(total_citas),
                'cantidad_total': cantidad_citas,
                'comision_50_porciento': float(comision_50),
                'promedio_por_cita': float(total_citas / cantidad_citas) if cantidad_citas > 0 else 0,
                'citas_por_dia': list(citas_por_dia.values()),
                'servicios_mas_solicitados': list(servicios_stats.values())
            }
        except Exception:
            return {
                'total_general': 0.0,
                'cantidad_total': 0,
                'comision_50_porciento': 0.0,
                'promedio_por_cita': 0.0,
                'citas_por_dia': [],
                'servicios_mas_solicitados': []
            }
