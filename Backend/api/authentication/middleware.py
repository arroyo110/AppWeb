import jwt
from django.conf import settings
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.tokens import AccessToken
from api.roles.models import RolHasPermiso, Permiso, Modulo, Accion
from api.usuarios.models import Usuario

class PermisosMiddleware(MiddlewareMixin):
    """
    Middleware personalizado para verificar permisos en endpoints de la API
    """
    
    def process_request(self, request):
        # Solo aplicar a endpoints de la API
        if not request.path.startswith('/api/'):
            return None
            
        # Permitir endpoints de autenticación
        if request.path.startswith('/api/auth/'):
            return None
            
        # Permitir métodos OPTIONS (CORS preflight)
        if request.method == 'OPTIONS':
            return None
            
        # Obtener token del header Authorization
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse(
                {'error': 'Token de acceso requerido'}, 
                status=401
            )
            
        token = auth_header.split(' ')[1]
        
        try:
            # Decodificar token JWT
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            
            # Obtener usuario
            try:
                usuario = Usuario.objects.get(id=user_id)
            except Usuario.DoesNotExist:
                return JsonResponse(
                    {'error': 'Usuario no encontrado'}, 
                    status=401
                )
                
            # Si es administrador, permitir acceso a todo
            if usuario.rol and usuario.rol.nombre.lower() == 'administrador':
                return None
                
            # Obtener permisos del usuario
            permisos_usuario = RolHasPermiso.objects.filter(
                rol=usuario.rol
            ).values_list('permiso__nombre', flat=True)
            
            # Verificar si el usuario tiene permisos para la ruta y acción
            ruta = request.path
            metodo = request.method
            
            if self.usuario_tiene_acceso(ruta, metodo, permisos_usuario):
                return None
            else:
                return JsonResponse(
                    {'error': 'Acceso denegado. Permisos insuficientes'}, 
                    status=403
                )
                
        except jwt.InvalidTokenError:
            return JsonResponse(
                {'error': 'Token inválido'}, 
                status=401
            )
        except Exception as e:
            return JsonResponse(
                {'error': f'Error al verificar permisos: {str(e)}'}, 
                status=500
            )
    
    def usuario_tiene_acceso(self, ruta, metodo, permisos_usuario):
        """
        Verifica si el usuario tiene acceso a la ruta basado en sus permisos
        """
        # Mapeo de rutas a módulos
        mapeo_rutas_modulos = {
            '/api/usuarios/': 'usuarios',
            '/api/clientes/': 'clientes',
            '/api/manicuristas/': 'manicuristas',
            '/api/roles/': 'roles',
            '/api/citas/': 'citas',
            '/api/servicios/': 'servicios',
            '/api/insumos/': 'insumos',
            '/api/categoria-insumos/': 'categoria_insumos',
            '/api/compras/': 'compras',
            '/api/proveedores/': 'proveedores',
            '/api/abastecimientos/': 'abastecimientos',
            '/api/venta-servicios/': 'venta_servicios',
            '/api/liquidaciones/': 'liquidaciones',
            '/api/novedades/': 'novedades',
        }
        
        # Mapeo de métodos HTTP a acciones
        mapeo_metodos_acciones = {
            'GET': 'listar' if ruta.endswith('/') else 'ver_detalles',
            'POST': 'crear',
            'PUT': 'editar',
            'PATCH': 'editar',
            'DELETE': 'eliminar',
        }
        
        # Determinar el módulo
        modulo = None
        for ruta_patron, nombre_modulo in mapeo_rutas_modulos.items():
            if ruta.startswith(ruta_patron):
                modulo = nombre_modulo
                break
        
        if not modulo:
            # Si no es una ruta conocida, permitir acceso (para rutas nuevas)
            return True
        
        # Determinar la acción
        accion = mapeo_metodos_acciones.get(metodo, 'listar')
        
        # Para rutas que terminan en / (listado), usar 'listar'
        if ruta.endswith('/') and metodo == 'GET':
            accion = 'listar'
        # Para rutas con ID (detalle), usar 'ver_detalles'
        elif metodo == 'GET' and not ruta.endswith('/'):
            accion = 'ver_detalles'
        
        # Construir el nombre del permiso requerido
        permiso_requerido = f"{modulo}_{accion}"
        
        # Verificar si el usuario tiene el permiso
        return permiso_requerido in permisos_usuario
