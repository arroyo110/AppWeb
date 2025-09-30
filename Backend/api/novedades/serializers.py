from rest_framework import serializers
from api.novedades.models import Novedad
from api.manicuristas.models import Manicurista
from api.manicuristas.serializers import ManicuristaSerializer
from datetime import datetime, date, time, timedelta

from django.utils.timezone import localdate, localtime, now


class NovedadSerializer(serializers.ModelSerializer):
    manicurista = serializers.PrimaryKeyRelatedField(
        queryset=Manicurista.objects.filter(estado='activo')
    )
    manicurista_info = ManicuristaSerializer(source='manicurista', read_only=True)

    class Meta:
        model = Novedad
        fields = '__all__'

    def validate_fecha(self, value):
        # Asegurarse de que sea una fecha local
        if isinstance(value, datetime):
            value = localdate(value)
        return value

    def validate_manicurista(self, value):
        if not value:
            raise serializers.ValidationError("Debe seleccionar una manicurista.")
        return value

    def validate_estado(self, value):
        if not value:
            raise serializers.ValidationError("Debe seleccionar un estado.")
        return value

    def validate_hora_entrada(self, value):
        if value and not (Novedad.HORA_MIN_PERMITIDA <= value <= Novedad.HORA_MAX_PERMITIDA):
            raise serializers.ValidationError(
                f"La hora de entrada debe estar entre {Novedad.HORA_MIN_PERMITIDA.strftime('%H:%M')} "
                f"y {Novedad.HORA_MAX_PERMITIDA.strftime('%H:%M')}."
            )
        return value

    def validate_hora_inicio_ausencia(self, value):
        if value and not (Novedad.HORA_MIN_PERMITIDA <= value <= Novedad.HORA_MAX_PERMITIDA):
            raise serializers.ValidationError(
                f"La hora de inicio debe estar entre {Novedad.HORA_MIN_PERMITIDA.strftime('%H:%M')} "
                f"y {Novedad.HORA_MAX_PERMITIDA.strftime('%H:%M')}."
            )
        return value

    def validate_hora_fin_ausencia(self, value):
        if value and not (Novedad.HORA_MIN_PERMITIDA <= value <= Novedad.HORA_MAX_PERMITIDA):
            raise serializers.ValidationError(
                f"La hora de fin debe estar entre {Novedad.HORA_MIN_PERMITIDA.strftime('%H:%M')} "
                f"y {Novedad.HORA_MAX_PERMITIDA.strftime('%H:%M')}."
            )
        return value

    def validate(self, data):
        instance = getattr(self, 'instance', None)
        estado = data.get('estado')
        fecha = data.get('fecha') or getattr(instance, 'fecha', None)
        manicurista = data.get('manicurista') or getattr(instance, 'manicurista', None)
        hora_entrada = data.get('hora_entrada') or getattr(instance, 'hora_entrada', None)
        tipo_ausencia = data.get('tipo_ausencia') or getattr(instance, 'tipo_ausencia', None)
        hora_inicio_ausencia = data.get('hora_inicio_ausencia') or getattr(instance, 'hora_inicio_ausencia', None)
        hora_fin_ausencia = data.get('hora_fin_ausencia') or getattr(instance, 'hora_fin_ausencia', None)
        dias = data.get('dias') or getattr(instance, 'dias', None)
        archivo = data.get('archivo_soporte') or getattr(instance, 'archivo_soporte', None)
        turno = data.get('turno') or getattr(instance, 'turno', None)

        # 1️⃣ Validación de duplicados
        if estado != "anulada" and manicurista and fecha:
            qs = Novedad.objects.filter(manicurista=manicurista, fecha=fecha).exclude(estado="anulada")
            if instance and instance.pk:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    "fecha": f"Ya existe una novedad activa para {manicurista} en la fecha {fecha}."
                })

        # 2️⃣ Tardanza
        if estado == "tardanza":
            if not hora_entrada:
                raise serializers.ValidationError({"hora_entrada": "La hora de entrada es requerida para tardanza."})
            # Solo validar hora actual si es para el día de hoy y la hora es muy temprana
            if fecha == localdate():
                hora_actual = localtime(now()).time()
                # Permitir hasta 2 horas antes de la hora actual para flexibilidad
                hora_limite_hour = max(0, hora_actual.hour - 2)
                hora_limite = time(hora_limite_hour, hora_actual.minute)
                if hora_entrada < hora_limite:
                    raise serializers.ValidationError({"hora_entrada": "La hora de entrada no puede ser más de 2 horas anterior a la hora actual."})
            # Permitir tardanza hoy y futuro; bloquear solo pasado (mensaje claro)
            today = localdate()
            if fecha and fecha < today:
                raise serializers.ValidationError({"fecha": "La tardanza no puede registrarse en fechas pasadas."})

        # 3️⃣ Ausencia por horas
        if estado == "ausente" and tipo_ausencia == "por_horas":
            if not hora_inicio_ausencia or not hora_fin_ausencia:
                raise serializers.ValidationError("Debes indicar hora de inicio y fin para ausencia por horas.")
            if hora_inicio_ausencia >= hora_fin_ausencia:
                raise serializers.ValidationError("La hora de inicio debe ser anterior a la hora de fin.")

            overlap = Novedad.objects.filter(
                manicurista=manicurista,
                fecha=fecha,
                estado="ausente",
                tipo_ausencia="por_horas",
                hora_inicio_ausencia__lt=hora_fin_ausencia,
                hora_fin_ausencia__gt=hora_inicio_ausencia
            )
            if instance and instance.pk:
                overlap = overlap.exclude(pk=instance.pk)
            if overlap.exists():
                raise serializers.ValidationError({"hora_inicio_ausencia": "Ya existe otra ausencia en este horario."})

        # 4️⃣ Validación de fecha general - más flexible
        today = localdate()
        yesterday = today - timedelta(days=1)
        if fecha:
            # Solo validar fechas muy antiguas (más de 7 días en el pasado)
            if fecha < today - timedelta(days=7):
                raise serializers.ValidationError({"fecha": "No se puede registrar una novedad con más de 7 días de antigüedad."})
            # Para ausencias, permitir desde ayer para casos de emergencia
            if estado == "ausente" and fecha < yesterday:
                raise serializers.ValidationError({"fecha": "Las ausencias no pueden registrarse con más de 1 día de antigüedad."})
            # Para tardanzas, permitir hasta ayer
            if estado == "tardanza" and fecha < yesterday:
                raise serializers.ValidationError({"fecha": "Las tardanzas no pueden registrarse con más de 1 día de antigüedad."})

        # 5️⃣ Vacaciones (mínimo 7 días y semanas completas)
        if estado == "vacaciones":
            if not dias or dias < 7:
                raise serializers.ValidationError({"dias": "Las vacaciones deben ser mínimo de 7 días."})
            if dias % 7 != 0:
                raise serializers.ValidationError({"dias": "Las vacaciones deben tomarse en semanas completas (7, 14, ...)."})
            if fecha and fecha < localdate():
                raise serializers.ValidationError({"fecha": "La fecha de inicio de vacaciones no puede estar en el pasado."})
            if manicurista and manicurista.fecha_ingreso:
                antiguedad = (fecha - manicurista.fecha_ingreso).days
                if antiguedad < 180:
                    # La vista ya convierte esto en warning 200; aquí mantenemos consistencia
                    raise serializers.ValidationError({"estado": "La manicurista aún no cumple seis meses de antigüedad para tomar vacaciones."})

        # 6️⃣ Incapacidad
        if estado == "incapacidad" and not archivo:
            raise serializers.ValidationError({"archivo_soporte": "Debes adjuntar el soporte de la incapacidad."})

        # 7️⃣ Horario
        if estado == "horario":
            if not turno:
                raise serializers.ValidationError({"turno": "Debes indicar el turno (apertura/cierre)."})
            if Novedad.objects.filter(manicurista=manicurista, fecha=fecha, estado="horario").exclude(pk=getattr(instance, "pk", None)).exists():
                raise serializers.ValidationError({"fecha": "Ya existe un turno asignado a esta manicurista en esa fecha."})

        return data


class NovedadDetailSerializer(serializers.ModelSerializer):
    manicurista = ManicuristaSerializer(read_only=True)
    mensaje_personalizado = serializers.SerializerMethodField()
    horario_base = serializers.SerializerMethodField()
    validacion_fecha = serializers.SerializerMethodField()
    citas_afectadas = serializers.SerializerMethodField()

    class Meta:
        model = Novedad
        fields = '__all__'

    def get_horario_base(self, obj):
        return {
            'entrada': Novedad.HORA_ENTRADA_BASE.strftime('%H:%M'),
            'salida': Novedad.HORA_SALIDA_BASE.strftime('%H:%M')
        }

    def get_validacion_fecha(self, obj):
        today = localdate()
        tomorrow = today + timedelta(days=1)
        return {
            'hoy': today.isoformat(),
            'manana': tomorrow.isoformat(),
            'reglas': {
                'ausente': 'Debe programarse con al menos un día de anticipación (desde mañana)',
                'tardanza': 'Puede registrarse desde hoy',
                'vacaciones': 'Se deben registrar en semanas completas (mínimo 7 días)',
                'incapacidad': 'Debe adjuntar soporte médico',
                'horario': 'Se debe indicar turno (apertura o cierre)'
            }
        }

    def get_motivo(self, obj):
        return obj.motivo if obj.motivo else "Sin motivo especificado"

    def get_mensaje_personalizado(self, obj):
        nombre = obj.manicurista.nombre if obj.manicurista else "Manicurista"

        if obj.estado == 'tardanza':
            if obj.hora_entrada:
                return f"La manicurista {nombre} llegó tarde a las {obj.hora_entrada.strftime('%I:%M %p')}."
            else:
                return f"La manicurista {nombre} llegó tarde, sin hora registrada."

        elif obj.estado == 'ausente':
            if obj.tipo_ausencia == 'completa':
                return f"La manicurista {nombre} se ausentó todo el día ({Novedad.HORA_ENTRADA_BASE.strftime('%I:%M %p')} - {Novedad.HORA_SALIDA_BASE.strftime('%I:%M %p')})."
            elif obj.tipo_ausencia == 'por_horas':
                if obj.hora_inicio_ausencia and obj.hora_fin_ausencia:
                    return f"La manicurista {nombre} se ausentó desde {obj.hora_inicio_ausencia.strftime('%I:%M %p')} hasta {obj.hora_fin_ausencia.strftime('%I:%M %p')}."
                else:
                    return f"La manicurista {nombre} se ausenta por horas, sin horario definido."

        elif obj.estado == 'vacaciones':
            return f"La manicurista {nombre} está de vacaciones por {obj.dias or 'X'} días."

        elif obj.estado == 'incapacidad':
            return f"La manicurista {nombre} está incapacitada. Ver soporte adjunto."

        elif obj.estado == 'horario':
            return f"La manicurista {nombre} tiene turno de {obj.get_turno_display()}."

        elif obj.estado == 'anulada':
            return f"Novedad de {nombre} anulada: {obj.motivo_anulacion}"

        return f"La manicurista {nombre} tiene una novedad registrada."

    def get_citas_afectadas(self, obj):
        """Obtener información de citas afectadas por esta novedad"""
        try:
            from api.citas.models import Cita
            citas = Cita.objects.filter(
                novedad_relacionada=obj
            ).values('id', 'hora_cita', 'estado', 'cliente__nombre')
            return list(citas)
        except Exception as e:
            print(f"Error al obtener citas afectadas: {e}")
            return []


class NovedadUpdateEstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Novedad
        fields = ['estado', 'observaciones', 'archivo_soporte', 'dias', 'turno']

    def validate_estado(self, value):
        """Validar transiciones de estado válidas."""
        if self.instance:
            estado_actual = self.instance.estado
            transiciones_validas = {
                'normal': ['tardanza', 'ausente', 'vacaciones', 'incapacidad', 'horario', 'anulada'],
                'tardanza': ['normal', 'ausente', 'anulada'],
                'ausente': ['normal', 'tardanza', 'anulada'],
                'vacaciones': ['anulada'],
                'incapacidad': ['anulada'],
                'horario': ['anulada'],
                'anulada': [],  # No se puede cambiar desde anulada
            }
            if value not in transiciones_validas.get(estado_actual, []):
                raise serializers.ValidationError(
                    f"No se puede cambiar de '{estado_actual}' a '{value}'"
                )
        return value
