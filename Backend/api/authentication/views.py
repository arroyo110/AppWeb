from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db import transaction
from api.usuarios.models import Usuario
from api.clientes.models import Cliente
from api.manicuristas.models import Manicurista
from api.roles.models import Rol
from .serializers import (
    LoginUnificadoSerializer,
    RegistroUnificadoSerializer,
    CambiarContraseñaSerializer
)
from api.codigorecuperacion.models import CodigoRecuperacion
from api.codigorecuperacion.serializers import SolicitudCodigoSerializer, ConfirmarCodigoSerializer
from django.core.mail import send_mail
from django.conf import settings
import secrets
import string


@api_view(['POST'])
@permission_classes([AllowAny])
def login_unificado(request):
    """
    Login unificado para todos los tipos de usuario
    """
    serializer = LoginUnificadoSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    correo = serializer.validated_data['correo_electronico']
    contraseña = serializer.validated_data['contraseña']
    
    try:
        # Buscar usuario por correo
        usuario = Usuario.objects.get(correo_electronico=correo)
        
        # Verificar contraseña
        if not usuario.check_password(contraseña):
            return Response(
                {'error': 'Credenciales incorrectas'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Verificar que el usuario esté activo
        if not usuario.is_active:
            return Response(
                {'error': 'Cuenta inactiva. Contacta al administrador'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Obtener información del rol
        rol = usuario.rol.nombre if usuario.rol else None
        
        # Obtener información adicional según el tipo de usuario
        info_adicional = {}
        if rol and rol.lower() == 'cliente':
            try:
                cliente = Cliente.objects.get(usuario=usuario)
                info_adicional = {
                    'tipo_usuario': 'cliente',
                    'debe_cambiar_contraseña': cliente.debe_cambiar_contraseña,
                    'nombre_completo': cliente.nombre,
                    'documento': cliente.documento
                }
            except Cliente.DoesNotExist:
                pass
        elif rol and rol.lower() == 'manicurista':
            try:
                manicurista = Manicurista.objects.get(usuario=usuario)
                info_adicional = {
                    'tipo_usuario': 'manicurista',
                    'debe_cambiar_contraseña': manicurista.debe_cambiar_contraseña,
                    'nombre_completo': manicurista.nombre,
                    'documento': manicurista.numero_documento,
                    'especialidad': manicurista.especialidad
                }
            except Manicurista.DoesNotExist:
                pass
        else:
            info_adicional = {
                'tipo_usuario': 'usuario',
                'debe_cambiar_contraseña': usuario.debe_cambiar_contraseña,
                'nombre_completo': usuario.nombre,
                'documento': usuario.documento
            }
        
        # Generar tokens JWT
        refresh = RefreshToken.for_user(usuario)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # Preparar respuesta
        response_data = {
            'mensaje': 'Login exitoso',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'usuario': {
                'id': usuario.id,
                'nombre': usuario.nombre,
                'correo_electronico': usuario.correo_electronico,
                'rol': rol,
                'is_active': usuario.is_active,
                'debe_cambiar_contraseña': usuario.debe_cambiar_contraseña
            },
            **info_adicional
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Usuario.DoesNotExist:
        return Response(
            {'error': 'Credenciales incorrectas'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    except Exception as e:
        return Response(
            {'error': f'Error en el servidor: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def registro_unificado(request):
    """
    Registro unificado para todos los tipos de usuario
    """
    serializer = RegistroUnificadoSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        with transaction.atomic():
            # Obtener el rol
            rol_nombre = serializer.validated_data['tipo_usuario']
            rol, created = Rol.objects.get_or_create(
                nombre=rol_nombre.title(),
                defaults={'estado': 'activo'}
            )
            
            # Crear el usuario
            usuario_data = {
                'nombre': serializer.validated_data['nombre'],
                'tipo_documento': serializer.validated_data['tipo_documento'],
                'documento': serializer.validated_data['documento'],
                'celular': serializer.validated_data['celular'],
                'correo_electronico': serializer.validated_data['correo_electronico'],
                'direccion': serializer.validated_data.get('direccion', ''),
                'rol': rol,
                'is_active': True
            }
            
            # Si se proporciona contraseña, usarla; si no, generar temporal
            contraseña = serializer.validated_data.get('password')
            if not contraseña:
                contraseña = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
                debe_cambiar = True
            else:
                debe_cambiar = False
            
            usuario = Usuario.objects.create_user(
                correo_electronico=usuario_data['correo_electronico'],
                password=contraseña,
                **{k: v for k, v in usuario_data.items() if k != 'correo_electronico'}
            )
            
            # Crear el perfil específico según el tipo de usuario
            if rol_nombre.lower() == 'cliente':
                cliente_data = {
                    'nombre': serializer.validated_data['nombre'],
                    'tipo_documento': serializer.validated_data['tipo_documento'],
                    'documento': serializer.validated_data['documento'],
                    'celular': serializer.validated_data['celular'],
                    'correo_electronico': serializer.validated_data['correo_electronico'],
                    'direccion': serializer.validated_data.get('direccion', ''),
                    'genero': serializer.validated_data.get('genero', 'M'),
                    'estado': True,
                    'usuario': usuario,
                    'debe_cambiar_contraseña': debe_cambiar
                }
                
                if debe_cambiar:
                    cliente_data['contraseña_temporal'] = contraseña
                
                cliente = Cliente.objects.create(**cliente_data)
                
            elif rol_nombre.lower() == 'manicurista':
                manicurista_data = {
                    'nombre': serializer.validated_data['nombre'],
                    'tipo_documento': serializer.validated_data['tipo_documento'],
                    'numero_documento': serializer.validated_data['documento'],
                    'celular': serializer.validated_data['celular'],
                    'correo': serializer.validated_data['correo_electronico'],
                    'direccion': serializer.validated_data.get('direccion', ''),
                    'especialidad': serializer.validated_data.get('especialidad'),
                    'estado': 'activo',
                    'usuario': usuario,
                    'debe_cambiar_contraseña': debe_cambiar
                }
                
                if debe_cambiar:
                    manicurista_data['contraseña_temporal'] = contraseña
                
                manicurista = Manicurista.objects.create(**manicurista_data)
            
            # Generar tokens JWT
            refresh = RefreshToken.for_user(usuario)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Preparar respuesta
            response_data = {
                'mensaje': 'Usuario registrado exitosamente',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'usuario': {
                    'id': usuario.id,
                    'nombre': usuario.nombre,
                    'correo_electronico': usuario.correo_electronico,
                    'rol': rol.nombre,
                    'is_active': usuario.is_active,
                    'debe_cambiar_contraseña': debe_cambiar
                },
                'tipo_usuario': rol_nombre,
                'contraseña_generada': contraseña if debe_cambiar else None
            }
            
            # Enviar correo con contraseña si se generó temporal
            if debe_cambiar:
                try:
                    enviar_correo_contraseña_temporal(
                        usuario.correo_electronico,
                        usuario.nombre,
                        contraseña,
                        rol_nombre
                    )
                except Exception as e:
                    print(f"Error enviando correo: {e}")
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        return Response(
            {'error': f'Error en el servidor: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST', 'OPTIONS'])
@permission_classes([AllowAny])
def solicitar_codigo_recuperacion(request):
    """
    Solicitar código de recuperación de contraseña
    """
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    serializer = SolicitudCodigoSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    correo = serializer.validated_data['correo_electronico']
    
    try:
        usuario = Usuario.objects.get(correo_electronico=correo)
        
        # Generar código de recuperación
        codigo = ''.join(secrets.choice(string.digits) for _ in range(6))
        
        # Guardar código en la base de datos
        CodigoRecuperacion.objects.create(
            correo_electronico=correo,
            codigo=codigo
        )
        
        # Enviar correo con el código
        try:
            enviar_correo_codigo_recuperacion(correo, usuario.nombre, codigo)
        except Exception as e:
            print(f"❌ Error capturado en solicitar_codigo_recuperacion: {str(e)}")
            return Response(
                {'error': f'Error enviando correo: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'mensaje': 'Código de recuperación enviado a tu correo electrónico'
        }, status=status.HTTP_200_OK)
        
    except Usuario.DoesNotExist:
        return Response(
            {'error': 'No existe un usuario con este correo electrónico'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST', 'OPTIONS'])
@permission_classes([AllowAny])
def confirmar_codigo_recuperacion(request):
    """
    Confirmar código de recuperación y cambiar contraseña
    """
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    serializer = ConfirmarCodigoSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    correo = serializer.validated_data['correo_electronico']
    codigo = serializer.validated_data['codigo']
    nueva_contraseña = serializer.validated_data['nueva_contraseña']
    
    try:
        # Verificar código
        codigo_recuperacion = CodigoRecuperacion.objects.get(
            correo_electronico=correo,
            codigo=codigo,
            usado=False
        )
        
        # Marcar código como usado
        codigo_recuperacion.usado = True
        codigo_recuperacion.save()
        
        # Cambiar contraseña del usuario
        usuario = Usuario.objects.get(correo_electronico=correo)
        usuario.set_password(nueva_contraseña)
        usuario.debe_cambiar_contraseña = False
        usuario.save()
        
        # También actualizar en el perfil específico si existe
        try:
            if hasattr(usuario, 'cliente'):
                cliente = usuario.cliente
                cliente.debe_cambiar_contraseña = False
                cliente.save(update_fields=['debe_cambiar_contraseña'])
            elif hasattr(usuario, 'manicurista'):
                manicurista = usuario.manicurista
                manicurista.debe_cambiar_contraseña = False
                manicurista.save(update_fields=['debe_cambiar_contraseña'])
        except Exception as e:
            print(f"Error actualizando perfil: {e}")
        
        return Response({
            'mensaje': 'Contraseña cambiada exitosamente'
        }, status=status.HTTP_200_OK)
        
    except CodigoRecuperacion.DoesNotExist:
        return Response(
            {'error': 'Código inválido o ya usado'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Usuario.DoesNotExist:
        return Response(
            {'error': 'Usuario no encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def cambiar_contraseña(request):
    """
    Cambiar contraseña temporal por una nueva
    """
    serializer = CambiarContraseñaSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    correo = serializer.validated_data['correo_electronico']
    contraseña_temporal = serializer.validated_data['contraseña_temporal']
    nueva_contraseña = serializer.validated_data['nueva_contraseña']
    
    try:
        usuario = Usuario.objects.get(correo_electronico=correo)
        
        # Verificar contraseña temporal
        if not usuario.check_password(contraseña_temporal):
            return Response(
                {'error': 'Contraseña temporal incorrecta'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cambiar contraseña
        usuario.set_password(nueva_contraseña)
        usuario.debe_cambiar_contraseña = False
        usuario.save()
        
        # También actualizar en el perfil específico si existe
        try:
            if hasattr(usuario, 'cliente'):
                cliente = usuario.cliente
                cliente.debe_cambiar_contraseña = False
                cliente.save(update_fields=['debe_cambiar_contraseña'])
            elif hasattr(usuario, 'manicurista'):
                manicurista = usuario.manicurista
                manicurista.debe_cambiar_contraseña = False
                manicurista.save(update_fields=['debe_cambiar_contraseña'])
        except Exception as e:
            print(f"Error actualizando perfil: {e}")
        
        return Response({
            'mensaje': 'Contraseña cambiada exitosamente'
        }, status=status.HTTP_200_OK)
        
    except Usuario.DoesNotExist:
        return Response(
            {'error': 'Usuario no encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )


def enviar_correo_contraseña_temporal(correo, nombre, contraseña, tipo_usuario):
    """Envía correo con contraseña temporal"""
    asunto = f'Bienvenido a WineSpa - {tipo_usuario.title()}'
    
    mensaje_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #8B4513;">🍷 Bienvenido a WineSpa</h2>
            <p>Hola <strong>{nombre}</strong>,</p>
            <p>Tu cuenta de {tipo_usuario} ha sido creada exitosamente.</p>
            
            <div style="background-color: #FFF8DC; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B4513;">
                <h3 style="color: #8B4513; margin-top: 0;">🔑 Contraseña Temporal</h3>
                <p style="font-size: 18px; font-weight: bold; color: #8B4513; text-align: center; padding: 10px; background-color: #F5F5DC; border-radius: 4px;">
                    {contraseña}
                </p>
                <p><strong>Importante:</strong> Esta es tu contraseña temporal. Deberás cambiarla en tu primer inicio de sesión.</p>
            </div>
            
            <p>Para acceder a tu cuenta, ve a:</p>
            <div style="text-align: center; margin: 20px 0;">
                <a href="http://localhost:5173/login" style="background-color: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    🚀 Iniciar Sesión
                </a>
            </div>
            
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Saludos,<br>
                El equipo de WineSpa
            </p>
        </div>
    </body>
    </html>
    """
    
    send_mail(
        asunto,
        f'Tu contraseña temporal es: {contraseña}',
        settings.DEFAULT_FROM_EMAIL,
        [correo],
        html_message=mensaje_html,
        fail_silently=False,
    )


def enviar_correo_codigo_recuperacion(correo, nombre, codigo):
    """Envía correo con código de recuperación"""
    try:
        print(f"🔍 Iniciando envío de correo a: {correo}")
        print(f"🔍 Configuración actual:")
        print(f"   - EMAIL_HOST: {settings.EMAIL_HOST}")
        print(f"   - EMAIL_PORT: {settings.EMAIL_PORT}")
        print(f"   - EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
        print(f"   - EMAIL_HOST_USER: {'Configurado' if settings.EMAIL_HOST_USER else 'NO CONFIGURADO'}")
        print(f"   - EMAIL_HOST_PASSWORD: {'Configurado' if settings.EMAIL_HOST_PASSWORD else 'NO CONFIGURADO'}")
        print(f"   - DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        
        asunto = 'Código de Recuperación - WineSpa'
        
        mensaje_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #8B4513;">🔐 Recuperación de Contraseña</h2>
                <p>Hola <strong>{nombre}</strong>,</p>
                <p>Has solicitado recuperar tu contraseña en WineSpa.</p>
                
                <div style="background-color: #FFF8DC; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B4513;">
                    <h3 style="color: #8B4513; margin-top: 0;">📱 Código de Verificación</h3>
                    <p style="font-size: 24px; font-weight: bold; color: #8B4513; text-align: center; padding: 15px; background-color: #F5F5DC; border-radius: 4px; letter-spacing: 5px;">
                        {codigo}
                    </p>
                    <p><strong>Importante:</strong> Este código expira en 10 minutos y solo puede usarse una vez.</p>
                </div>
                
                <p>Si no solicitaste este código, puedes ignorar este correo.</p>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    Saludos,<br>
                    El equipo de WineSpa
                </p>
            </div>
        </body>
        </html>
        """
        
        print(f"🔍 Intentando enviar correo...")
        resultado = send_mail(
            asunto,
            f'Tu código de recuperación es: {codigo}',
            settings.DEFAULT_FROM_EMAIL,
            [correo],
            html_message=mensaje_html,
            fail_silently=False,
        )
        
        print(f"✅ Correo enviado exitosamente. Resultado: {resultado}")
        return True
        
    except Exception as e:
        print(f"❌ ERROR en enviar_correo_codigo_recuperacion:")
        print(f"   - Error: {str(e)}")
        print(f"   - Tipo: {type(e).__name__}")
        import traceback
        print(f"   - Traceback: {traceback.format_exc()}")
        raise e
