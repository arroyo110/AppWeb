from rest_framework import serializers
from django.core.validators import RegexValidator


class LoginUnificadoSerializer(serializers.Serializer):
    """
    Serializer para login unificado
    """
    correo_electronico = serializers.EmailField(
        label='Correo Electrónico',
        help_text='Ingresa tu correo electrónico'
    )
    contraseña = serializers.CharField(
        label='Contraseña',
        help_text='Ingresa tu contraseña',
        write_only=True,
        style={'input_type': 'password'}
    )


class RegistroUnificadoSerializer(serializers.Serializer):
    """
    Serializer para registro unificado de usuarios
    """
    # Campos básicos
    nombre = serializers.CharField(
        max_length=100,
        label='Nombre Completo',
        help_text='Ingresa tu nombre completo'
    )
    
    tipo_documento = serializers.ChoiceField(
        choices=[
            ('CC', 'Cédula de Ciudadanía'),
            ('CE', 'Cédula de Extranjería'),
            ('TI', 'Tarjeta de Identidad'),
            ('PP', 'Pasaporte'),
            ('NIT', 'NIT')
        ],
        label='Tipo de Documento',
        help_text='Selecciona el tipo de documento'
    )
    
    documento = serializers.CharField(
        max_length=20,
        label='Número de Documento',
        help_text='Ingresa tu número de documento'
    )
    
    celular = serializers.CharField(
        max_length=15,
        label='Celular',
        help_text='Ingresa tu número de celular',
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message='Ingresa un número de celular válido'
            )
        ]
    )
    
    correo_electronico = serializers.EmailField(
        label='Correo Electrónico',
        help_text='Ingresa tu correo electrónico'
    )
    
    direccion = serializers.CharField(
        max_length=200,
        required=False,
        allow_blank=True,
        label='Dirección',
        help_text='Ingresa tu dirección (opcional)'
    )
    
    # Tipo de usuario
    tipo_usuario = serializers.ChoiceField(
        choices=[
            ('cliente', 'Cliente'),
            ('manicurista', 'Manicurista'),
            ('usuario', 'Usuario General')
        ],
        label='Tipo de Usuario',
        help_text='Selecciona el tipo de usuario que quieres ser'
    )
    
    # Contraseña (opcional - si no se proporciona se genera temporal)
    password = serializers.CharField(
        max_length=128,
        required=False,
        write_only=True,
        label='Contraseña',
        help_text='Deja vacío para generar contraseña temporal',
        style={'input_type': 'password'}
    )
    
    # Campos específicos para cliente
    genero = serializers.ChoiceField(
        choices=[
            ('M', 'Masculino'),
            ('F', 'Femenino'),
            ('O', 'Otro')
        ],
        required=False,
        label='Género',
        help_text='Selecciona tu género (solo para clientes)'
    )
    
    # Campos específicos para manicurista
    especialidad = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        label='Especialidad',
        help_text='Ingresa tu especialidad (solo para manicuristas)'
    )
    
    def validate(self, data):
        """
        Validación personalizada
        """
        tipo_usuario = data.get('tipo_usuario')
        
        # Validar campos específicos según tipo de usuario
        if tipo_usuario == 'cliente':
            if not data.get('genero'):
                data['genero'] = 'M'  # Valor por defecto
        
        elif tipo_usuario == 'manicurista':
            if not data.get('especialidad'):
                data['especialidad'] = 'General'  # Valor por defecto
        
        return data
    
    def validate_correo_electronico(self, value):
        """
        Validar que el correo no esté en uso
        """
        from api.usuarios.models import Usuario
        if Usuario.objects.filter(correo_electronico=value).exists():
            raise serializers.ValidationError(
                'Este correo electrónico ya está registrado'
            )
        return value
    
    def validate_documento(self, value):
        """
        Validar que el documento no esté en uso
        """
        from api.usuarios.models import Usuario
        if Usuario.objects.filter(documento=value).exists():
            raise serializers.ValidationError(
                'Este documento ya está registrado'
            )
        return value


class CambiarContraseñaSerializer(serializers.Serializer):
    """
    Serializer para cambiar contraseña temporal
    """
    correo_electronico = serializers.EmailField(
        label='Correo Electrónico',
        help_text='Ingresa tu correo electrónico'
    )
    
    contraseña_temporal = serializers.CharField(
        label='Contraseña Temporal',
        help_text='Ingresa tu contraseña temporal actual',
        write_only=True,
        style={'input_type': 'password'}
    )
    
    nueva_contraseña = serializers.CharField(
        max_length=128,
        min_length=8,
        label='Nueva Contraseña',
        help_text='Ingresa tu nueva contraseña (mínimo 8 caracteres)',
        write_only=True,
        style={'input_type': 'password'}
    )
    
    confirmar_contraseña = serializers.CharField(
        max_length=128,
        label='Confirmar Contraseña',
        help_text='Confirma tu nueva contraseña',
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, data):
        """
        Validar que las contraseñas coincidan
        """
        nueva_contraseña = data.get('nueva_contraseña')
        confirmar_contraseña = data.get('confirmar_contraseña')
        
        if nueva_contraseña != confirmar_contraseña:
            raise serializers.ValidationError(
                'Las contraseñas no coinciden'
            )
        
        return data
    
    def validate_nueva_contraseña(self, value):
        """
        Validar que la nueva contraseña sea diferente a la temporal
        """
        contraseña_temporal = self.initial_data.get('contraseña_temporal')
        
        if value == contraseña_temporal:
            raise serializers.ValidationError(
                'La nueva contraseña debe ser diferente a la temporal'
            )
        
        return value
