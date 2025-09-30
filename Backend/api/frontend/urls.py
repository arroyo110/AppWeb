from django.urls import path
from . import views

urlpatterns = [
    # Dashboard administrativo
    path('dashboard/', views.dashboard_admin, name='dashboard_admin'),
    
    # Reportes avanzados
    path('reportes/', views.reportes_avanzados, name='reportes_avanzados'),
    
    # Estadísticas en tiempo real
    path('estadisticas/', views.estadisticas_tiempo_real, name='estadisticas_tiempo_real'),
]
