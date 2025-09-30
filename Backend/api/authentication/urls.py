from django.urls import path
from . import views

app_name = 'authentication'

urlpatterns = [
    # Sistema unificado de autenticación
    path('login/', views.login_unificado, name='login_unificado'),
    path('registro/', views.registro_unificado, name='registro_unificado'),
    path('cambiar-contraseña/', views.cambiar_contraseña, name='cambiar_contraseña'),
    
    # Recuperación de contraseña
    path('solicitar-codigo/', views.solicitar_codigo_recuperacion, name='solicitar_codigo'),
    path('confirmar-codigo/', views.confirmar_codigo_recuperacion, name='confirmar_codigo'),
]