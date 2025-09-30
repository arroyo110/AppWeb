from functools import wraps
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import status
from api.roles.models import RolHasPermiso
from api.usuarios.models import Usuario


def require_permission(permiso_requerido):
    """
    Decorador para verificar permisos específicos en las vistas
    
    Args:
        permiso_requerido (str): Nombre del permiso requerido (ej: 'usuarios_crear')
    
    Usage:
        @require_permission('usuarios_crear')
        def create(self, request, *args, **kwargs):
            # Tu código aquí
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            # Obtener el usuario del token
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return Response(
                    {'error': 'Token de acceso requerido'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                token = auth_header.split(' ')[1]
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                
                # Obtener usuario
                try:
                    usuario = Usuario.objects.get(id=user_id)
                except Usuario.DoesNotExist:
                    return Response(
                        {'error': 'Usuario no encontrado'}, 
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                
                # Si es administrador, permitir acceso
                if usuario.rol and usuario.rol.nombre.lower() == 'administrador':
                    return view_func(self, request, *args, **kwargs)
                
                # Verificar si el usuario tiene el permiso específico
                permisos_usuario = RolHasPermiso.objects.filter(
                    rol=usuario.rol,
                    permiso__nombre=permiso_requerido
                ).exists()
                
                if permisos_usuario:
                    return view_func(self, request, *args, **kwargs)
                else:
                    return Response(
                        {'error': f'Acceso denegado. Se requiere el permiso: {permiso_requerido}'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                    
            except Exception as e:
                return Response(
                    {'error': f'Error al verificar permisos: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return wrapper
    return decorator


def require_any_permission(*permisos_requeridos):
    """
    Decorador para verificar que el usuario tenga al menos uno de los permisos especificados
    
    Args:
        *permisos_requeridos: Lista de permisos (ej: 'usuarios_crear', 'usuarios_editar')
    
    Usage:
        @require_any_permission('usuarios_crear', 'usuarios_editar')
        def create_or_update(self, request, *args, **kwargs):
            # Tu código aquí
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            # Obtener el usuario del token
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return Response(
                    {'error': 'Token de acceso requerido'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                token = auth_header.split(' ')[1]
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                
                # Obtener usuario
                try:
                    usuario = Usuario.objects.get(id=user_id)
                except Usuario.DoesNotExist:
                    return Response(
                        {'error': 'Usuario no encontrado'}, 
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                
                # Si es administrador, permitir acceso
                if usuario.rol and usuario.rol.nombre.lower() == 'administrador':
                    return view_func(self, request, *args, **kwargs)
                
                # Verificar si el usuario tiene al menos uno de los permisos
                permisos_usuario = RolHasPermiso.objects.filter(
                    rol=usuario.rol,
                    permiso__nombre__in=permisos_requeridos
                ).exists()
                
                if permisos_usuario:
                    return view_func(self, request, *args, **kwargs)
                else:
                    return Response(
                        {'error': f'Acceso denegado. Se requiere al menos uno de los permisos: {", ".join(permisos_requeridos)}'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                    
            except Exception as e:
                return Response(
                    {'error': f'Error al verificar permisos: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return wrapper
    return decorator


def require_all_permissions(*permisos_requeridos):
    """
    Decorador para verificar que el usuario tenga todos los permisos especificados
    
    Args:
        *permisos_requeridos: Lista de permisos (ej: 'usuarios_crear', 'usuarios_editar')
    
    Usage:
        @require_all_permissions('usuarios_crear', 'usuarios_editar')
        def create_and_update(self, request, *args, **kwargs):
            # Tu código aquí
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            # Obtener el usuario del token
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return Response(
                    {'error': 'Token de acceso requerido'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                token = auth_header.split(' ')[1]
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                
                # Obtener usuario
                try:
                    usuario = Usuario.objects.get(id=user_id)
                except Usuario.DoesNotExist:
                    return Response(
                        {'error': 'Usuario no encontrado'}, 
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                
                # Si es administrador, permitir acceso
                if usuario.rol and usuario.rol.nombre.lower() == 'administrador':
                    return view_func(self, request, *args, **kwargs)
                
                # Verificar si el usuario tiene todos los permisos
                permisos_usuario = RolHasPermiso.objects.filter(
                    rol=usuario.rol,
                    permiso__nombre__in=permisos_requeridos
                ).values_list('permiso__nombre', flat=True)
                
                permisos_faltantes = set(permisos_requeridos) - set(permisos_usuario)
                
                if not permisos_faltantes:
                    return view_func(self, request, *args, **kwargs)
                else:
                    return Response(
                        {'error': f'Acceso denegado. Faltan los permisos: {", ".join(permisos_faltantes)}'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                    
            except Exception as e:
                return Response(
                    {'error': f'Error al verificar permisos: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return wrapper
    return decorator
