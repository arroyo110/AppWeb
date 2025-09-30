from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RolViewSet, PermisoViewSet, RolHasPermisoViewSet, 
    ModuloViewSet, AccionViewSet
)

router = DefaultRouter()
router.register(r'roles', RolViewSet, basename='rol')
router.register(r'permisos', PermisoViewSet, basename='permiso')
router.register(r'roles-permisos', RolHasPermisoViewSet, basename='rol-permiso')
router.register(r'modulos', ModuloViewSet, basename='modulo')
router.register(r'acciones', AccionViewSet, basename='accion')

urlpatterns = [
    # Endpoints personalizados para permisos
    path('permisos_usuario/', RolViewSet.as_view({'get': 'permisos_usuario'}), name='permisos-usuario'),
    path('verificar_permiso/', RolViewSet.as_view({'get': 'verificar_permiso'}), name='verificar-permiso'),
    
    # Incluir las rutas del router
    path('', include(router.urls)),
]

roles_urlpatterns = urlpatterns