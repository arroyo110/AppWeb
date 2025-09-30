from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from api.base.base import BaseModel
from api.clientes.models import Cliente
from api.servicios.models import Servicio
from api.manicuristas.models import Manicurista
from api.novedades.models import Novedad # Importar el modelo Novedad
from datetime import datetime, time


class CitaManicurista(models.Model):
    """
    Modelo intermedio para manejar múltiples manicuristas en una cita
    """
    cita = models.ForeignKey('Cita', on_delete=models.CASCADE, related_name='manicuristas_cita')
    manicurista = models.ForeignKey(Manicurista, on_delete=models.CASCADE)
    es_principal = models.BooleanField(default=False, help_text="Manicurista principal de la cita")
    orden = models.PositiveIntegerField(default=1, help_text="Orden de participación")
    
    class Meta:
        verbose_name = "Manicurista de Cita"
        verbose_name_plural = "Manicuristas de Cita"
        unique_together = ['cita', 'manicurista']
        ordering = ['orden', 'manicurista__nombre']
    
    def __str__(self):
        return f"{self.cita} - {self.manicurista.nombre}"


class CitaServicio(models.Model):
    """
    Modelo intermedio para manejar múltiples servicios en una cita
    """
    cita = models.ForeignKey('Cita', on_delete=models.CASCADE, related_name='servicios_cita')
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    orden = models.PositiveIntegerField(default=1, help_text="Orden de ejecución del servicio")
    
    class Meta:
        verbose_name = "Servicio de Cita"
        verbose_name_plural = "Servicios de Cita"
        unique_together = ['cita', 'servicio']
        ordering = ['orden', 'servicio__nombre']
    
    def __str__(self):
        return f"{self.cita} - {self.servicio.nombre} x{self.cantidad}"
    
    def save(self, *args, **kwargs):
        # Calcular subtotal automáticamente
        self.subtotal = self.cantidad * self.precio_unitario
        super().save(*args, **kwargs)


class Cita(BaseModel):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('en_proceso', 'En Proceso'),
        ('finalizada', 'Finalizada'),
        ('cancelada', 'Cancelada'),
        ('cancelada_por_novedad', 'Cancelada por Novedad'), # Nuevo estado
    ]

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        verbose_name="Cliente"
    )
    
    # NUEVO: Relaciones ManyToMany a través de modelos intermedios
    manicuristas = models.ManyToManyField(
        Manicurista,
        through='CitaManicurista',
        related_name='citas_asignadas',
        verbose_name="Manicuristas",
        help_text="Manicuristas asignadas a la cita"
    )
    
    servicios = models.ManyToManyField(
        Servicio,
        through='CitaServicio',
        related_name='citas_incluidas',
        verbose_name="Servicios",
        help_text="Servicios incluidos en la cita"
    )
    
    # MANTENER para compatibilidad con código existente
    manicurista = models.ForeignKey(
        Manicurista,
        on_delete=models.CASCADE,
        verbose_name="Manicurista Principal",
        help_text="Manicurista principal (para compatibilidad)",
        related_name="citas_principal",
        null=True,
        blank=True
    )
    
    servicio = models.ForeignKey(
        Servicio,
        on_delete=models.CASCADE,
        verbose_name="Servicio Principal",
        help_text="Servicio principal (para compatibilidad)",
        related_name="citas_principal",
        null=True,
        blank=True
    )
    
    fecha_cita = models.DateField(
        verbose_name="Fecha de la cita"
    )
    
    hora_cita = models.TimeField(
        verbose_name="Hora de la cita"
    )
    
    estado = models.CharField(
        max_length=30, # Aumentado de 20 a 30
        choices=ESTADO_CHOICES,
        default='pendiente',
        verbose_name="Estado"
    )
    
    observaciones = models.TextField(
        blank=True,
        null=True,
        verbose_name="Observaciones"
    )

    motivo_cancelacion = models.TextField( # Nuevo campo
        blank=True,
        null=True,
        verbose_name="Motivo de Cancelación"
    )

    novedad_relacionada = models.ForeignKey( # Nuevo campo
        Novedad,
        on_delete=models.SET_NULL, # Si la novedad se elimina, no se elimina la cita
        null=True,
        blank=True,
        related_name='citas_afectadas',
        verbose_name="Novedad Relacionada"
    )
    
    # NUEVO: Precio total con valor por defecto
    precio_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Precio total de la cita",
        help_text="Precio total de todos los servicios",
        default=0  # Valor por defecto para evitar problemas de migración
    )
    
    # MANTENER para compatibilidad
    precio_servicio = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Precio del servicio principal",
        help_text="Precio del servicio principal (para compatibilidad)"
    )
    
    # NUEVO: Duración total con valor por defecto
    duracion_total = models.PositiveIntegerField(
        verbose_name="Duración total (minutos)",
        help_text="Duración total de todos los servicios en minutos",
        default=0  # Valor por defecto para evitar problemas de migración
    )
    
    # MANTENER para compatibilidad
    duracion_estimada = models.PositiveIntegerField(
        verbose_name="Duración estimada (minutos)",
        help_text="Duración del servicio principal (para compatibilidad)"
    )
    
    fecha_finalizacion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de finalización"
    )

    class Meta:
        verbose_name = "Cita"
        verbose_name_plural = "Citas"
        ordering = ['-fecha_cita', '-hora_cita']
        unique_together = ['manicurista', 'fecha_cita', 'hora_cita']

    def __str__(self):
        return f"Cita {self.cliente.nombre} - {self.fecha_cita} {self.hora_cita}"

    def clean(self):
        """Validaciones personalizadas"""
        # Validar que la fecha no sea en el pasado
        if self.fecha_cita and self.fecha_cita < datetime.now().date():
            raise ValidationError({'fecha_cita': 'La fecha de la cita no puede ser en el pasado'})
        
        # Validar horario de trabajo (10:00 AM - 8:00 PM)
        if self.hora_cita:
            # --- CAMBIO AQUÍ: Horario de 10:00 AM a 8:00 PM ---
            if self.hora_cita < time(10, 0) or self.hora_cita >= time(20, 0):
                raise ValidationError({'hora_cita': 'La hora debe estar entre 10:00 AM y 8:00 PM'})
        
        # Validar que la manicurista esté disponible
        if self.manicurista and self.manicurista.estado != 'activo':
            raise ValidationError({'manicurista': 'La manicurista seleccionada no está activa'})
        
        # Validar que el servicio principal esté activo
        if self.servicio and self.servicio.estado != 'activo':
            raise ValidationError({'servicio': 'El servicio seleccionado no está activo'})

    def save(self, *args, **kwargs):
        # Establecer manicurista y servicio principal para compatibilidad
        if not self.manicurista and self.manicuristas.exists():
            # Asignar la primera manicurista como principal
            self.manicurista = self.manicuristas.first()
        
        if not self.servicio and self.servicios.exists():
            # Asignar el primer servicio como principal
            self.servicio = self.servicios.first()
        
        # Establecer precio y duración del servicio principal para compatibilidad
        if self.servicio:
            self.precio_servicio = self.servicio.precio
            self.duracion_estimada = self.servicio.duracion
            
            # Si no hay precio_total, usar el del servicio principal
            if self.precio_total == 0:
                self.precio_total = self.servicio.precio
            
            # Si no hay duracion_total, usar la del servicio principal
            if self.duracion_total == 0:
                self.duracion_total = self.servicio.duracion
        
        # Establecer fecha de finalización cuando se marca como finalizada
        if self.estado == 'finalizada' and not self.fecha_finalizacion:
            self.fecha_finalizacion = datetime.now()
        
        super().save(*args, **kwargs)

    def calcular_totales(self):
        """Calcular precio y duración total de todos los servicios"""
        servicios_cita = self.servicios_cita.all()
        if servicios_cita.exists():
            self.precio_total = sum(servicio_cita.subtotal for servicio_cita in servicios_cita)
            self.duracion_total = sum(servicio_cita.servicio.duracion * servicio_cita.cantidad for servicio_cita in servicios_cita)
            
            # Mantener compatibilidad con campos individuales
            primer_servicio_cita = servicios_cita.first()
            if not self.servicio:
                self.servicio = primer_servicio_cita.servicio
            self.precio_servicio = primer_servicio_cita.precio_unitario
            self.duracion_estimada = primer_servicio_cita.servicio.duracion
            
            self.save()
    
    def crear_ventas_automaticas(self):
        """Crear ventas automáticamente separadas por manicurista cuando se finaliza una cita"""
        try:
            # Importar aquí para evitar importación circular
            from api.ventaservicios.models import VentaServicio, DetalleVentaServicio

            # Verificar que no existan ventas para esta cita
            if VentaServicio.objects.filter(citas=self).exists():
                print(f"Ya existen ventas para la cita {self.id}")
                return

            # Obtener servicios agrupados por manicurista
            servicios_por_manicurista = {}
            
            # Obtener servicios de la cita con sus manicuristas asignadas
            for cita_manicurista in self.manicuristas_cita.all():
                manicurista = cita_manicurista.manicurista
                servicios_por_manicurista[manicurista] = []
                
                # Obtener servicios asignados a esta manicurista específica
                for cita_servicio in self.servicios_cita.all():
                    servicios_por_manicurista[manicurista].append(cita_servicio)

            # Crear una venta separada para cada manicurista
            for manicurista, servicios_cita in servicios_por_manicurista.items():
                if not servicios_cita:  # Si no tiene servicios asignados, saltar
                    continue
                    
                # Calcular total para esta manicurista
                total_manicurista = sum(cs.subtotal for cs in servicios_cita)
                
                # Crear venta para esta manicurista
                venta_data = {
                    'cliente': self.cliente,
                    'manicurista': manicurista,
                    'cita': self,  # Mantener referencia a la cita principal
                    'cantidad': 1,
                    'precio_unitario': total_manicurista,
                    'total': total_manicurista,
                    'fecha_venta': self.fecha_finalizacion or timezone.now(),
                    'observaciones': f"Venta generada automáticamente desde cita #{self.id} - Manicurista: {manicurista.nombre}",
                    'estado': 'pendiente',
                    'metodo_pago': 'efectivo'  # Método por defecto
                }

                # Crear la venta para esta manicurista
                venta = VentaServicio.objects.create(**venta_data)
                
                # Agregar la cita a la relación many-to-many
                venta.citas.add(self)
                
                # Crear detalles para cada servicio de esta manicurista
                for cita_servicio in servicios_cita:
                    detalle_data = {
                        'venta': venta,
                        'servicio': cita_servicio.servicio,
                        'cantidad': cita_servicio.cantidad,
                        'precio_unitario': cita_servicio.precio_unitario,
                        'descuento_linea': 0,
                        'subtotal': cita_servicio.subtotal
                    }
                    DetalleVentaServicio.objects.create(**detalle_data)
                    print(f"Detalle creado para servicio {cita_servicio.servicio.nombre} en venta {venta.id} para manicurista {manicurista.nombre}")

            print(f"Venta {venta.id} creada automáticamente para cita {self.id} con {self.servicios.count()} servicios")

        except ImportError:
            print("Módulo de ventas no disponible")
        except Exception as e:
            print(f"Error creando ventas automáticas: {e}")
            raise

    @property
    def duracion_formateada(self):
        """Retorna la duración total en formato legible"""
        duracion = self.duracion_total if self.duracion_total > 0 else self.duracion_estimada
        if duracion < 60:
            return f"{duracion} min"
        else:
            horas = duracion // 60
            minutos = duracion % 60
            if minutos == 0:
                return f"{horas}h"
            else:
                return f"{horas}h {minutos}min"

    @property
    def puede_finalizar(self):
        """Verifica si la cita puede ser finalizada"""
        return self.estado in ['pendiente', 'en_proceso']

    @property
    def puede_cancelar(self):
        """Verifica si la cita puede ser cancelada"""
        return self.estado in ['pendiente', 'en_proceso']

    def get_servicios_info(self):
        """Obtener información de todos los servicios"""
        return self.servicios_cita.all()
    
    def get_manicuristas_info(self):
        """Obtener información de todas las manicuristas"""
        return self.manicuristas_cita.all()
    
    def agregar_manicurista(self, manicurista, es_principal=False, orden=1):
        """Agregar una manicurista a la cita"""
        CitaManicurista.objects.create(
            cita=self,
            manicurista=manicurista,
            es_principal=es_principal,
            orden=orden
        )
        
        # Si es la primera manicurista, establecer como principal
        if not self.manicurista:
            self.manicurista = manicurista
            self.save()
    
    def agregar_servicio(self, servicio, cantidad=1, orden=1):
        """Agregar un servicio a la cita"""
        CitaServicio.objects.create(
            cita=self,
            servicio=servicio,
            cantidad=cantidad,
            precio_unitario=servicio.precio,
            orden=orden
        )
        
        # Si es el primer servicio, establecer como principal
        if not self.servicio:
            self.servicio = servicio
            self.save()
        
        # Recalcular totales
        self.calcular_totales()
    
    def remover_manicurista(self, manicurista):
        """Remover una manicurista de la cita"""
        CitaManicurista.objects.filter(cita=self, manicurista=manicurista).delete()
        
        # Si era la manicurista principal, asignar otra
        if self.manicurista == manicurista:
            siguiente_manicurista = self.manicuristas_cita.first()
            if siguiente_manicurista:
                self.manicurista = siguiente_manicurista.manicurista
                self.save()
    
    def remover_servicio(self, servicio):
        """Remover un servicio de la cita"""
        CitaServicio.objects.filter(cita=self, servicio=servicio).delete()
        
        # Si era el servicio principal, asignar otro
        if self.servicio == servicio:
            siguiente_servicio = self.servicios_cita.first()
            if siguiente_servicio:
                self.servicio = siguiente_servicio.servicio
                self.save()
        
        # Recalcular totales
        self.calcular_totales()
    
    def get_manicurista_principal(self):
        """Obtener la manicurista principal"""
        manicurista_principal = self.manicuristas_cita.filter(es_principal=True).first()
        if manicurista_principal:
            return manicurista_principal.manicurista
        return self.manicurista
    
    def get_servicios_detalle(self):
        """Obtener servicios con detalles (cantidad, precio, etc.)"""
        return self.servicios_cita.all().order_by('orden')
    
    def get_manicuristas_detalle(self):
        """Obtener manicuristas con detalles (orden, principal, etc.)"""
        return self.manicuristas_cita.all().order_by('orden')
