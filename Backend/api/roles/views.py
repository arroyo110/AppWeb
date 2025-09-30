from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.apps import apps
from .models import Rol, Permiso, RolHasPermiso, Modulo, Accion
from .serializers import (
    RolSerializer,
    RolDetailSerializer,
    PermisoSerializer,
    RolHasPermisoSerializer,
    ModuloSerializer,
    AccionSerializer
)


class RolViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el modelo Rol.
    Proporciona operaciones CRUD completas y algunos endpoints adicionales.
    """
    queryset = Rol.objects.all()
    # Habilitar búsqueda y filtrado por estado para el listado de roles
    from django_filters.rest_framework import DjangoFilterBackend
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'estado']
    filterset_fields = ['estado']
    ordering_fields = ['nombre', 'created_at', 'updated_at']
    ordering = ['nombre']

    def get_serializer_class(self):
        """
        Retorna el serializer adecuado según la acción que se esté realizando.
        """
        if self.action == 'retrieve' or self.action == 'list_detail':
            return RolDetailSerializer
        return RolSerializer

    @action(detail=False, methods=['get'])
    def permisos_usuario(self, request):
        """
        Endpoint para obtener los permisos de un usuario específico.
        """
        usuario_id = request.query_params.get('usuario_id')
        if not usuario_id:
            return Response(
                {"error": "Se requiere el parámetro usuario_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Obtener el usuario
            Usuario = apps.get_model('usuarios', 'Usuario')
            usuario = Usuario.objects.get(pk=usuario_id)
            
            if not usuario.rol:
                return Response(
                    {"error": "El usuario no tiene rol asignado"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Obtener los permisos del rol del usuario
            permisos = usuario.rol.permisos.filter(estado='activo')
            serializer = PermisoSerializer(permisos, many=True)
            
            return Response({
                "usuario_id": usuario_id,
                "rol": usuario.rol.nombre,
                "permisos": serializer.data
            })
            
        except Usuario.DoesNotExist:
            return Response(
                {"error": "Usuario no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"Error al obtener permisos: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def verificar_permiso(self, request):
        """
        Endpoint para verificar si un usuario tiene un permiso específico.
        """
        usuario_id = request.query_params.get('usuario_id')
        permiso_nombre = request.query_params.get('permiso_nombre')
        
        if not usuario_id or not permiso_nombre:
            return Response(
                {"error": "Se requieren los parámetros usuario_id y permiso_nombre"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Obtener el usuario
            Usuario = apps.get_model('usuarios', 'Usuario')
            usuario = Usuario.objects.get(pk=usuario_id)
            
            if not usuario.rol:
                return Response({
                    "tiene_permiso": False,
                    "mensaje": "El usuario no tiene rol asignado"
                })
            
            # Verificar si el rol tiene el permiso
            tiene_permiso = usuario.rol.permisos.filter(
                nombre=permiso_nombre,
                estado='activo'
            ).exists()
            
            return Response({
                "usuario_id": usuario_id,
                "rol": usuario.rol.nombre,
                "permiso": permiso_nombre,
                "tiene_permiso": tiene_permiso
            })
            
        except Usuario.DoesNotExist:
            return Response(
                {"error": "Usuario no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"Error al verificar permiso: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """
        Eliminar un rol con validación de usuarios asociados.
        """
        rol = self.get_object()

        # Verificar si es el rol Admin (protección adicional)
        if rol.nombre.lower() == 'administrador':
            return Response(
                {"error": "No se puede eliminar el rol Administrador"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar si el rol tiene usuarios asociados
        usuarios_info = self.get_usuarios_info_by_rol(rol.id)

        if usuarios_info['total'] > 0:
            # Mensaje de error simplificado: solo muestra la cantidad total
            return Response(
                {
                    "error": f"No se puede eliminar el rol '{rol.nombre}' porque tiene {usuarios_info['total']} usuario(s) asociado(s). "
                            "Primero debe reasignar o eliminar los usuarios que tienen este rol."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si no hay usuarios asociados, proceder con la eliminación
        return super().destroy(request, *args, **kwargs)

    def get_usuarios_info_by_rol(self, rol_id):
        """
        Obtener información detallada de usuarios que tienen este rol asignado.
        Usa apps.get_model para evitar importaciones circulares.
        """
        info = {
            'usuarios': 0,
            'clientes': 0,
            'manicuristas': 0,
            'total': 0
        }

        try:
            # Contar usuarios generales con este rol
            try:
                Usuario = apps.get_model('usuarios', 'Usuario')
                usuarios_count = Usuario.objects.filter(rol_id=rol_id).count()
                info['usuarios'] = usuarios_count
                # print(f"Usuarios generales con rol {rol_id}: {usuarios_count}") # Comentado para reducir logs
            except Exception as e:
                print(f"Error al contar usuarios generales: {e}")

            # Contar clientes con este rol
            try:
                Cliente = apps.get_model('clientes', 'Cliente')
                # Buscar tanto por rol directo como por usuario.rol
                clientes_count = Cliente.objects.filter(
                    Q(rol_id=rol_id) | Q(usuario__rol_id=rol_id)
                ).count()
                info['clientes'] = clientes_count
                # print(f"Clientes con rol {rol_id}: {clientes_count}") # Comentado para reducir logs
            except Exception as e:
                print(f"Error al contar clientes: {e}")

            # Contar manicuristas con este rol
            try:
                Manicurista = apps.get_model('manicuristas', 'Manicurista')
                # Buscar tanto por rol directo como por usuario.rol
                manicuristas_count = Manicurista.objects.filter(
                    Q(rol_id=rol_id) | Q(usuario__rol_id=rol_id)
                ).count()
                info['manicuristas'] = manicuristas_count
                # print(f"Manicuristas con rol {rol_id}: {manicuristas_count}") # Comentado para reducir logs
            except Exception as e:
                print(f"Error al contar manicuristas: {e}")

            # Calcular total
            info['total'] = info['usuarios'] + info['clientes'] + info['manicuristas']

            # print(f"Total usuarios con rol {rol_id}: {info}") # Comentado para reducir logs
            return info

        except Exception as e:
            print(f"Error general al contar usuarios por rol: {e}")
            return info

    @action(detail=True, methods=['get'])
    def check_usuarios(self, request, pk=None):
        """
        Endpoint para verificar si un rol tiene usuarios asociados.
        """
        rol = self.get_object()
        usuarios_info = self.get_usuarios_info_by_rol(rol.id)

        return Response({
            'rol_id': rol.id,
            'rol_nombre': rol.nombre,
            'usuarios_info': usuarios_info,
            'puede_eliminar': usuarios_info['total'] == 0,
            'es_admin': rol.nombre.lower() == 'administrador'
        })
    
    @action(detail=True, methods=['get'])
    def verificar_cambio_estado(self, request, pk=None):
        """
        Verificar si un rol puede cambiar estado.
        Endpoint esperado por el frontend.
        """
        rol = self.get_object()
        restricciones = rol.get_restricciones_cambio_estado()
        
        return Response({
            'rol_id': rol.id,
            'rol_nombre': rol.nombre,
            'puede_cambiar_estado': restricciones['puede_cambiar_estado'],
            'usuarios_info': {
                'total': restricciones['usuarios_count']
            },
            'restricciones': restricciones
        })

    @action(detail=False, methods=['get'])
    def list_detail(self, request):
        """
        Endpoint para listar todos los roles con información detallada.
        """
        roles = self.get_queryset()
        serializer = self.get_serializer(roles, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def activos(self, request):
        """
        Endpoint para listar solo los roles activos.
        """
        roles = self.get_queryset().filter(estado='activo')
        serializer = self.get_serializer(roles, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def cambiar_estado(self, request, pk=None):
        """
        Cambiar estado de un rol con validaciones.
        No se puede cambiar estado si tiene usuarios asociados.
        """
        rol = self.get_object()
        restricciones = rol.get_restricciones_cambio_estado()
        
        if not restricciones['puede_cambiar_estado']:
            return Response(
                {
                    'error': f'No se puede cambiar el estado del rol "{rol.nombre}" porque {restricciones["mensaje"]}',
                    'detalle': restricciones['mensaje'],
                    'restricciones': restricciones
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        nuevo_estado = 'inactivo' if rol.estado == 'activo' else 'activo'
        rol.estado = nuevo_estado
        rol.save()
        
        serializer = self.get_serializer(rol)
        return Response({
            'mensaje': f'Estado cambiado a {nuevo_estado} exitosamente',
            'rol': serializer.data
        })

    @action(detail=True, methods=['post'])
    def add_permiso(self, request, pk=None):
        """
        Endpoint para añadir un permiso a un rol.
        """
        rol = self.get_object()
        permiso_id = request.data.get('permiso_id')

        if not permiso_id:
            return Response(
                {"error": "Se requiere el parámetro permiso_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            permiso = Permiso.objects.get(pk=permiso_id)
        except Permiso.DoesNotExist:
            return Response(
                {"error": "El permiso no existe"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar si ya existe la relación
        if RolHasPermiso.objects.filter(rol=rol, permiso=permiso).exists():
            return Response(
                {"error": "El rol ya tiene este permiso"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear la relación
        RolHasPermiso.objects.create(rol=rol, permiso=permiso)

        return Response(
            {"mensaje": "Permiso añadido correctamente"},
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def remove_permiso(self, request, pk=None):
        """
        Endpoint para eliminar un permiso de un rol.
        """
        rol = self.get_object()
        permiso_id = request.data.get('permiso_id')

        if not permiso_id:
            return Response(
                {"error": "Se requiere el parámetro permiso_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            relacion = RolHasPermiso.objects.get(rol=rol, permiso_id=permiso_id)
            relacion.delete()
            return Response(
                {"mensaje": "Permiso eliminado correctamente"},
                status=status.HTTP_200_OK
            )
        except RolHasPermiso.DoesNotExist:
            return Response(
                {"error": "El rol no tiene este permiso"},
                status=status.HTTP_404_NOT_FOUND
            )


class PermisoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el modelo Permiso.
    Proporciona operaciones CRUD completas.
    """
    queryset = Permiso.objects.all()
    serializer_class = PermisoSerializer


class RolHasPermisoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el modelo RolHasPermiso.
    Proporciona operaciones CRUD completas y algunos endpoints adicionales.
    """
    queryset = RolHasPermiso.objects.all()
    serializer_class = RolHasPermisoSerializer

    @action(detail=False, methods=['get'])
    def by_rol(self, request):
        """
        Endpoint para filtrar por rol.
        """
        rol_id = request.query_params.get('rol_id')
        if not rol_id:
            return Response(
                {"error": "Se requiere el parámetro rol_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        relaciones = self.get_queryset().filter(rol_id=rol_id)
        serializer = self.get_serializer(relaciones, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_permiso(self, request):
        """
        Endpoint para filtrar por permiso.
        """
        permiso_id = request.query_params.get('permiso_id')
        if not permiso_id:
            return Response(
                {"error": "Se requiere el parámetro permiso_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        relaciones = self.get_queryset().filter(permiso_id=permiso_id)
        serializer = self.get_serializer(relaciones, many=True)
        return Response(serializer.data)


class ModuloViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el modelo Modulo.
    Proporciona operaciones CRUD completas.
    """
    queryset = Modulo.objects.all()
    serializer_class = ModuloSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'created_at']
    ordering = ['nombre']

    @action(detail=False, methods=['get'])
    def activos(self, request):
        """
        Endpoint para listar solo los módulos activos.
        """
        modulos = self.get_queryset().filter(estado='activo')
        serializer = self.get_serializer(modulos, many=True)
        return Response(serializer.data)


class AccionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el modelo Accion.
    Proporciona operaciones CRUD completas.
    """
    queryset = Accion.objects.all()
    serializer_class = AccionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'created_at']
    ordering = ['nombre']

    @action(detail=False, methods=['get'])
    def activas(self, request):
        """
        Endpoint para listar solo las acciones activas.
        """
        acciones = self.get_queryset().filter(estado='activo')
        serializer = self.get_serializer(acciones, many=True)
        return Response(serializer.data)


class PermisoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el modelo Permiso.
    Proporciona operaciones CRUD completas y endpoints adicionales.
    """
    queryset = Permiso.objects.all()
    serializer_class = PermisoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion', 'modulo__nombre', 'accion__nombre']
    ordering_fields = ['nombre', 'modulo__nombre', 'accion__nombre', 'created_at']
    ordering = ['modulo__nombre', 'accion__nombre']

    @action(detail=False, methods=['get'])
    def activos(self, request):
        """
        Endpoint para listar solo los permisos activos.
        """
        permisos = self.get_queryset().filter(estado='activo')
        serializer = self.get_serializer(permisos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_modulo(self, request):
        """
        Endpoint para filtrar permisos por módulo.
        """
        modulo_id = request.query_params.get('modulo_id')
        if not modulo_id:
            return Response(
                {"error": "Se requiere el parámetro modulo_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        permisos = self.get_queryset().filter(modulo_id=modulo_id)
        serializer = self.get_serializer(permisos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_accion(self, request):
        """
        Endpoint para filtrar permisos por acción.
        """
        accion_id = request.query_params.get('accion_id')
        if not accion_id:
            return Response(
                {"error": "Se requiere el parámetro accion_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        permisos = self.get_queryset().filter(accion_id=accion_id)
        serializer = self.get_serializer(permisos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_modulo_accion(self, request):
        """
        Endpoint para obtener permisos por módulo y acción específicos.
        """
        modulo_id = request.query_params.get('modulo_id')
        accion_id = request.query_params.get('accion_id')
        
        if not modulo_id or not accion_id:
            return Response(
                {"error": "Se requieren los parámetros modulo_id y accion_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        permisos = self.get_queryset().filter(
            modulo_id=modulo_id,
            accion_id=accion_id
        )
        serializer = self.get_serializer(permisos, many=True)
        return Response(serializer.data)
