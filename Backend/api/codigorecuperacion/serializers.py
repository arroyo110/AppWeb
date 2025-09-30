from datetime import timezone
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import CodigoRecuperacion
from api.usuarios.models import Usuario


class SolicitudCodigoSerializer(serializers.Serializer):
    """
    Serializer para solicitar código de recuperación
    """
    correo_electronico = serializers.EmailField(
        label='Correo Electrónico',
        help_text='Ingresa tu correo electrónico'
    )


class ConfirmarCodigoSerializer(serializers.Serializer):
    """
    Serializer para confirmar código y cambiar contraseña
    """
    correo_electronico = serializers.EmailField(
        label='Correo Electrónico',
        help_text='Ingresa tu correo electrónico'
    )
    codigo = serializers.CharField(
        max_length=6,
        label='Código de Verificación',
        help_text='Ingresa el código de 6 dígitos enviado a tu correo'
    )
    nueva_contraseña = serializers.CharField(
        write_only=True,
        label='Nueva Contraseña',
        help_text='Ingresa tu nueva contraseña'
    )

    def validate(self, data):
        correo_electronico = data.get('correo_electronico')
        codigo = data.get('codigo')
        nueva_contraseña = data.get('nueva_contraseña')

        try:
            usuario = Usuario.objects.get(correo_electronico=correo_electronico)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Usuario no encontrado.")

        try:
            registro = CodigoRecuperacion.objects.get(
                correo_electronico=correo_electronico, 
                codigo=codigo,
                usado=False
            )
        except CodigoRecuperacion.DoesNotExist:
            raise serializers.ValidationError("Código inválido o ya usado.")

        try:
            validate_password(nueva_contraseña)
        except Exception as e:
            raise serializers.ValidationError({"nueva_contraseña": list(e.messages)})

        data['usuario'] = usuario
        data['registro'] = registro
        return data


# Mantener compatibilidad con el serializer existente
class ConfirmacionCodigoSerializer(ConfirmarCodigoSerializer):
    """
    Alias para mantener compatibilidad
    """
    nueva_password = serializers.CharField(
        source='nueva_contraseña',
        write_only=True,
        label='Nueva Contraseña'
    )
