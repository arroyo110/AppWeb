from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CitaViewSet

router = DefaultRouter()
router.register(r'', CitaViewSet, basename='cita')

urlpatterns = [
    path('', include(router.urls)),
    # URLs para múltiples manicuristas y servicios
    path('multiple/', include('api.citas.urls_multiple')),
]

citas_urlpatterns = urlpatterns
