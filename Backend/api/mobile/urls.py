from django.urls import path
from . import views

urlpatterns = [
    # Dashboard móvil
    path('dashboard/', views.dashboard_mobile, name='dashboard_mobile'),
    
    # Perfil de usuario
    path('perfil/', views.perfil_usuario_mobile, name='perfil_usuario_mobile'),
    
    # Citas
    path('citas/', views.citas_mobile, name='citas_mobile'),
    path('citas/crear/', views.crear_cita_mobile, name='crear_cita_mobile'),
    path('citas/<int:cita_id>/actualizar/', views.actualizar_cita_mobile, name='actualizar_cita_mobile'),
    
    # Servicios
    path('servicios/', views.servicios_mobile, name='servicios_mobile'),
    
    # Novedades
    path('novedades/', views.novedades_mobile, name='novedades_mobile'),
    
    # Liquidaciones (solo manicuristas)
    path('liquidaciones/', views.liquidaciones_mobile, name='liquidaciones_mobile'),
    
    # Insumos
    path('insumos/', views.insumos_mobile, name='insumos_mobile'),
    
    # Disponibilidades
    path('disponibilidad/', views.disponibilidad_movil, name='disponibilidad_movil'),
    path('proximos-horarios/', views.proximos_horarios_movil, name='proximos_horarios_movil'),
    path('disponibilidad-especialidad/', views.disponibilidad_por_especialidad_movil, name='disponibilidad_por_especialidad_movil'),
    path('disponibilidad-multiple/', views.disponibilidad_multiple_movil, name='disponibilidad_multiple_movil'),
    
    # Citas con múltiples relaciones
    path('citas-multiple/', views.listar_citas_multiple_movil, name='listar_citas_multiple_movil'),
    path('citas-multiple/crear/', views.crear_cita_multiple_movil, name='crear_cita_multiple_movil'),
]
