from django.db import models
from django.utils import timezone
from datetime import timedelta
from api.usuarios.models import Usuario

class CodigoRecuperacion(models.Model):
    correo_electronico = models.EmailField(
        verbose_name='Correo Electrónico',
        help_text='Correo electrónico del usuario',
        null=True,  # Temporalmente nullable para migración
        blank=True
    )
    codigo = models.CharField(
        max_length=6,
        verbose_name='Código',
        help_text='Código de 6 dígitos para recuperación'
    )
    creado_en = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Creado en'
    )
    expiracion = models.DateTimeField(
        verbose_name='Expiración',
        help_text='Fecha y hora de expiración del código'
    )
    usado = models.BooleanField(
        default=False,
        verbose_name='Usado',
        help_text='Indica si el código ya fue utilizado'
    )
    
    class Meta:
        verbose_name = 'Código de Recuperación'
        verbose_name_plural = 'Códigos de Recuperación'
        ordering = ['-creado_en']
    
    def ha_expirado(self):
        return timezone.now() > self.expiracion
    
    def es_valido(self):
        return not self.usado and not self.ha_expirado()
    
    def __str__(self):
        return f"Código para {self.correo_electronico} ({'usado' if self.usado else 'activo' if self.es_valido() else 'expirado'})"
    
    def save(self, *args, **kwargs):
        # Si no se especifica expiración, establecer 10 minutos por defecto
        if not self.expiracion:
            self.expiracion = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)