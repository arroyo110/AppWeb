from rest_framework import serializers
from .models import Disponibilidad, HorarioTrabajo
from api.manicuristas.models import Manicurista
from api.manicuristas.serializers import ManicuristaSerializer


class HorarioTrabajoSerializer(serializers.ModelSerializer):
    """Serializer para horarios de trabajo"""
    manicurista_info = ManicuristaSerializer(source='manicurista', read_only=True)
    
    class Meta:
        model = HorarioTrabajo
        fields = [
            'id', 'manicurista', 'manicurista_info', 'tipo_horario',
            'hora_inicio', 'hora_fin', 'dias_semana', 'activo',
            'fecha_creacion'
        ]


class DisponibilidadSerializer(serializers.ModelSerializer):
    """Serializer para disponibilidades"""
    manicurista_info = ManicuristaSerializer(source='manicurista', read_only=True)
    slots_disponibles_count = serializers.SerializerMethodField()
    slots_ocupados_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Disponibilidad
        fields = [
            'id', 'manicurista', 'manicurista_info', 'fecha',
            'horario_inicio', 'horario_fin', 'slots_disponibles',
            'resumen', 'slots_disponibles_count', 'slots_ocupados_count',
            'fecha_calculo', 'fecha_actualizacion'
        ]
    
    def get_slots_disponibles_count(self, obj):
        """Contar slots disponibles"""
        return len([slot for slot in obj.slots_disponibles if slot['disponible']])
    
    def get_slots_ocupados_count(self, obj):
        """Contar slots ocupados"""
        return len([slot for slot in obj.slots_disponibles if not slot['disponible']])


class DisponibilidadDetalleSerializer(serializers.ModelSerializer):
    """Serializer detallado para disponibilidades con información adicional"""
    manicurista_info = ManicuristaSerializer(source='manicurista', read_only=True)
    slots_disponibles_list = serializers.SerializerMethodField()
    slots_ocupados_list = serializers.SerializerMethodField()
    porcentaje_disponibilidad = serializers.SerializerMethodField()
    
    class Meta:
        model = Disponibilidad
        fields = [
            'id', 'manicurista', 'manicurista_info', 'fecha',
            'horario_inicio', 'horario_fin', 'slots_disponibles',
            'resumen', 'slots_disponibles_list', 'slots_ocupados_list',
            'porcentaje_disponibilidad', 'fecha_calculo', 'fecha_actualizacion'
        ]
    
    def get_slots_disponibles_list(self, obj):
        """Obtener lista de slots disponibles"""
        return [slot for slot in obj.slots_disponibles if slot['disponible']]
    
    def get_slots_ocupados_list(self, obj):
        """Obtener lista de slots ocupados"""
        return [slot for slot in obj.slots_disponibles if not slot['disponible']]
    
    def get_porcentaje_disponibilidad(self, obj):
        """Calcular porcentaje de disponibilidad"""
        total = len(obj.slots_disponibles)
        disponibles = len([slot for slot in obj.slots_disponibles if slot['disponible']])
        
        if total > 0:
            return round((disponibles / total) * 100, 2)
        return 0


class DisponibilidadMovilSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil"""
    manicurista_nombre = serializers.CharField(source='manicurista.nombre', read_only=True)
    manicurista_especialidad = serializers.CharField(source='manicurista.especialidad', read_only=True)
    slots_resumen = serializers.SerializerMethodField()
    
    class Meta:
        model = Disponibilidad
        fields = [
            'id', 'manicurista', 'manicurista_nombre', 'manicurista_especialidad',
            'fecha', 'horario_inicio', 'horario_fin', 'slots_resumen',
            'fecha_actualizacion'
        ]
    
    def get_slots_resumen(self, obj):
        """Obtener resumen de slots para móvil"""
        disponibles = [slot for slot in obj.slots_disponibles if slot['disponible']]
        ocupados = [slot for slot in obj.slots_disponibles if not slot['disponible']]
        
        return {
            'disponibles': disponibles,
            'ocupados': ocupados,
            'total': len(obj.slots_disponibles),
            'disponibles_count': len(disponibles),
            'ocupados_count': len(ocupados)
        }


class DisponibilidadConsultaSerializer(serializers.Serializer):
    """Serializer para consultas de disponibilidad"""
    manicurista_id = serializers.IntegerField()
    fecha = serializers.DateField()
    incluir_novedades = serializers.BooleanField(default=True)
    incluir_citas = serializers.BooleanField(default=True)
    intervalo_minutos = serializers.IntegerField(default=30)
    
    def validate_manicurista_id(self, value):
        """Validar que la manicurista exista y esté activa"""
        try:
            manicurista = Manicurista.objects.get(id=value)
            if manicurista.estado != 'activo':
                raise serializers.ValidationError("La manicurista no está activa")
            return value
        except Manicurista.DoesNotExist:
            raise serializers.ValidationError("La manicurista no existe")
    
    def validate_fecha(self, value):
        """Validar que la fecha no sea en el pasado"""
        from datetime import date
        if value < date.today():
            raise serializers.ValidationError("No se puede consultar disponibilidad en el pasado")
        return value
    
    def validate_intervalo_minutos(self, value):
        """Validar intervalo de minutos"""
        if value not in [15, 30, 45, 60]:
            raise serializers.ValidationError("El intervalo debe ser 15, 30, 45 o 60 minutos")
        return value


class DisponibilidadMasivaSerializer(serializers.Serializer):
    """Serializer para consultas masivas de disponibilidad"""
    manicuristas_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=10
    )
    fecha_inicio = serializers.DateField()
    fecha_fin = serializers.DateField()
    incluir_fines_semana = serializers.BooleanField(default=True)
    
    def validate_manicuristas_ids(self, value):
        """Validar que todas las manicuristas existan y estén activas"""
        manicuristas = Manicurista.objects.filter(id__in=value, estado='activo')
        if len(manicuristas) != len(value):
            raise serializers.ValidationError("Algunas manicuristas no existen o no están activas")
        return value
    
    def validate_fecha_fin(self, value):
        """Validar que la fecha fin sea posterior a la fecha inicio"""
        fecha_inicio = self.initial_data.get('fecha_inicio')
        if fecha_inicio and value < fecha_inicio:
            raise serializers.ValidationError("La fecha fin debe ser posterior a la fecha inicio")
        return value

