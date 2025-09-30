from django.db import models
from django.utils import timezone
from datetime import datetime, time, timedelta
from api.manicuristas.models import Manicurista
from api.novedades.models import Novedad
from api.citas.models import Cita


class DisponibilidadManager(models.Manager):
    """Manager personalizado para disponibilidades"""
    
    def calcular_disponibilidad(self, manicurista_id, fecha):
        """
        Calcular disponibilidad de una manicurista en una fecha específica
        considerando novedades y citas existentes
        """
        try:
            manicurista = Manicurista.objects.get(id=manicurista_id)
            
            # Horario base de trabajo
            horario_inicio = Novedad.HORA_ENTRADA_BASE  # 10:00 AM
            horario_fin = Novedad.HORA_SALIDA_BASE      # 8:00 PM
            
            # Obtener novedades activas para esa fecha
            novedades = Novedad.objects.filter(
                manicurista=manicurista,
                fecha=fecha,
                estado__in=['ausente', 'tardanza', 'vacaciones', 'incapacidad']
            ).exclude(estado='anulada')
            
            # Obtener citas existentes
            citas = Cita.objects.filter(
                manicurista=manicurista,
                fecha_cita=fecha,
                estado__in=['pendiente', 'en_proceso']
            )
            
            # Calcular slots ocupados
            slots_ocupados = []
            
            # Procesar novedades
            for novedad in novedades:
                if novedad.estado == 'ausente':
                    if novedad.tipo_ausencia == 'completa':
                        # Ausencia completa - todo el día ocupado
                        slots_ocupados.append({
                            'inicio': horario_inicio,
                            'fin': horario_fin,
                            'motivo': f"Ausencia completa: {novedad.observaciones or 'Sin motivo'}",
                            'tipo': 'ausencia_completa'
                        })
                    elif novedad.tipo_ausencia == 'por_horas':
                        # Ausencia por horas
                        slots_ocupados.append({
                            'inicio': novedad.hora_inicio_ausencia,
                            'fin': novedad.hora_fin_ausencia,
                            'motivo': f"Ausencia por horas: {novedad.observaciones or 'Sin motivo'}",
                            'tipo': 'ausencia_parcial'
                        })
                
                elif novedad.estado == 'tardanza':
                    # Tardanza - ocupado desde inicio hasta hora de llegada
                    slots_ocupados.append({
                        'inicio': horario_inicio,
                        'fin': novedad.hora_entrada,
                        'motivo': f"Tardanza: llega a las {novedad.hora_entrada.strftime('%H:%M')}",
                        'tipo': 'tardanza'
                    })
                
                elif novedad.estado in ['vacaciones', 'incapacidad']:
                    # Vacaciones o incapacidad - todo el día ocupado
                    slots_ocupados.append({
                        'inicio': horario_inicio,
                        'fin': horario_fin,
                        'motivo': f"{novedad.get_estado_display()}: {novedad.observaciones or 'Sin motivo'}",
                        'tipo': 'ausencia_completa'
                    })
            
            # Procesar citas existentes
            for cita in citas:
                cita_inicio = cita.hora_cita
                cita_fin = (datetime.combine(fecha, cita_inicio) + 
                           timedelta(minutes=cita.duracion_total)).time()
                
                slots_ocupados.append({
                    'inicio': cita_inicio,
                    'fin': cita_fin,
                    'motivo': f"Cita con {cita.cliente.nombre}",
                    'tipo': 'cita_agendada'
                })
            
            # Generar slots de disponibilidad (30 minutos cada uno)
            slots_disponibles = []
            intervalo_minutos = 30
            
            current_time = datetime.combine(fecha, horario_inicio)
            end_time = datetime.combine(fecha, horario_fin)
            
            while current_time < end_time:
                slot_inicio = current_time.time()
                slot_fin = (current_time + timedelta(minutes=intervalo_minutos)).time()
                
                # Verificar si este slot está ocupado
                is_available = True
                motivo_ocupado = None
                tipo_ocupacion = None
                
                for ocupado in slots_ocupados:
                    # Verificar solapamiento
                    if (slot_inicio < ocupado['fin'] and slot_fin > ocupado['inicio']):
                        is_available = False
                        motivo_ocupado = ocupado['motivo']
                        tipo_ocupacion = ocupado['tipo']
                        break
                
                slots_disponibles.append({
                    'inicio': slot_inicio.strftime('%H:%M'),
                    'fin': slot_fin.strftime('%H:%M'),
                    'disponible': is_available,
                    'motivo_ocupado': motivo_ocupado,
                    'tipo_ocupacion': tipo_ocupacion
                })
                
                current_time += timedelta(minutes=intervalo_minutos)
            
            return {
                'manicurista': {
                    'id': manicurista.id,
                    'nombre': manicurista.nombre,
                    'especialidad': manicurista.especialidad
                },
                'fecha': fecha.isoformat(),
                'horario_base': {
                    'inicio': horario_inicio.strftime('%H:%M'),
                    'fin': horario_fin.strftime('%H:%M')
                },
                'slots_disponibles': slots_disponibles,
                'resumen': {
                    'total_slots': len(slots_disponibles),
                    'disponibles': len([s for s in slots_disponibles if s['disponible']]),
                    'ocupados': len([s for s in slots_disponibles if not s['disponible']])
                }
            }
            
        except Manicurista.DoesNotExist:
            return None
        except Exception as e:
            print(f"Error calculando disponibilidad: {e}")
            return None


class Disponibilidad(models.Model):
    """
    Modelo para almacenar disponibilidades calculadas
    """
    manicurista = models.ForeignKey(
        Manicurista,
        on_delete=models.CASCADE,
        related_name='disponibilidades'
    )
    fecha = models.DateField()
    horario_inicio = models.TimeField()
    horario_fin = models.TimeField()
    slots_disponibles = models.JSONField()
    resumen = models.JSONField()
    fecha_calculo = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    objects = DisponibilidadManager()
    
    class Meta:
        verbose_name = "Disponibilidad"
        verbose_name_plural = "Disponibilidades"
        unique_together = ['manicurista', 'fecha']
        ordering = ['-fecha', 'manicurista__nombre']
    
    def __str__(self):
        return f"Disponibilidad {self.manicurista.nombre} - {self.fecha}"
    
    def get_slots_disponibles(self):
        """Obtener solo los slots disponibles"""
        return [slot for slot in self.slots_disponibles if slot['disponible']]
    
    def get_slots_ocupados(self):
        """Obtener solo los slots ocupados"""
        return [slot for slot in self.slots_disponibles if not slot['disponible']]
    
    def actualizar_disponibilidad(self):
        """Actualizar la disponibilidad basada en novedades y citas actuales"""
        disponibilidad_data = self.objects.calcular_disponibilidad(
            self.manicurista.id, 
            self.fecha
        )
        
        if disponibilidad_data:
            self.slots_disponibles = disponibilidad_data['slots_disponibles']
            self.resumen = disponibilidad_data['resumen']
            self.save()
            return True
        return False


class HorarioTrabajo(models.Model):
    """
    Modelo para definir horarios de trabajo personalizados por manicurista
    """
    TIPO_HORARIO_CHOICES = [
        ('estandar', 'Estándar (10:00 - 20:00)'),
        ('matutino', 'Matutino (8:00 - 16:00)'),
        ('vespertino', 'Vespertino (14:00 - 22:00)'),
        ('personalizado', 'Personalizado'),
    ]
    
    manicurista = models.ForeignKey(
        Manicurista,
        on_delete=models.CASCADE,
        related_name='horarios_trabajo'
    )
    tipo_horario = models.CharField(
        max_length=20,
        choices=TIPO_HORARIO_CHOICES,
        default='estandar'
    )
    hora_inicio = models.TimeField(default=time(10, 0))
    hora_fin = models.TimeField(default=time(20, 0))
    dias_semana = models.JSONField(
        default=list,
        help_text="Días de la semana que trabaja (0=Lunes, 6=Domingo)"
    )
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Horario de Trabajo"
        verbose_name_plural = "Horarios de Trabajo"
        unique_together = ['manicurista', 'tipo_horario']
    
    def __str__(self):
        return f"Horario {self.manicurista.nombre} - {self.get_tipo_horario_display()}"
    
    def get_horario_estandar(self):
        """Obtener horario estándar si es personalizado"""
        if self.tipo_horario == 'personalizado':
            return {
                'inicio': self.hora_inicio,
                'fin': self.hora_fin
            }
        elif self.tipo_horario == 'matutino':
            return {
                'inicio': time(8, 0),
                'fin': time(16, 0)
            }
        elif self.tipo_horario == 'vespertino':
            return {
                'inicio': time(14, 0),
                'fin': time(22, 0)
            }
        else:  # estandar
            return {
                'inicio': time(10, 0),
                'fin': time(20, 0)
            }

