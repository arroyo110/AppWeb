from django.urls import path
from . import views

urlpatterns = [
	# Consultas de disponibilidad
	path('consultar/', views.consultar_disponibilidad, name='consultar_disponibilidad'),
	path('movil/', views.disponibilidad_movil, name='disponibilidad_movil'),
	path('masiva/', views.disponibilidad_masiva, name='disponibilidad_masiva'),
	path('proximos-horarios/', views.proximos_horarios_disponibles, name='proximos_horarios_disponibles'),
	path('por-especialidad/', views.disponibilidad_por_especialidad, name='disponibilidad_por_especialidad'),
	# Nueva ruta compatible con frontend
	path('slots', views.slots, name='availability_slots'),
	
	# Actualización de disponibilidades
	path('actualizar/', views.actualizar_disponibilidades, name='actualizar_disponibilidades'),
]

