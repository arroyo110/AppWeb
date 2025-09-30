from django.urls import path
from . import views_multiple

urlpatterns = [
    # Crear citas con múltiples relaciones
    path('crear-multiple/', views_multiple.crear_cita_multiple, name='crear_cita_multiple'),
    
    # Listar citas con múltiples relaciones
    path('listar-multiple/', views_multiple.listar_citas_multiple, name='listar_citas_multiple'),
    path('listar-multiple-movil/', views_multiple.listar_citas_multiple_movil, name='listar_citas_multiple_movil'),
    
    # Actualizar citas
    path('<int:cita_id>/actualizar-multiple/', views_multiple.actualizar_cita_multiple, name='actualizar_cita_multiple'),
    
    # Gestionar manicuristas
    path('<int:cita_id>/agregar-manicurista/', views_multiple.agregar_manicurista_cita, name='agregar_manicurista_cita'),
    path('<int:cita_id>/remover-manicurista/<int:manicurista_id>/', views_multiple.remover_manicurista_cita, name='remover_manicurista_cita'),
    
    # Gestionar servicios
    path('<int:cita_id>/agregar-servicio/', views_multiple.agregar_servicio_cita, name='agregar_servicio_cita'),
    path('<int:cita_id>/remover-servicio/<int:servicio_id>/', views_multiple.remover_servicio_cita, name='remover_servicio_cita'),
    
    # Disponibilidad múltiple
    path('disponibilidad-multiple/', views_multiple.disponibilidad_multiple_manicuristas, name='disponibilidad_multiple_manicuristas'),
]
