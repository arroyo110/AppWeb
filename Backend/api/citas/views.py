from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from datetime import datetime, timedelta, time
from .models import Cita
from .serializers import (
    CitaSerializer,
    CitaCreateSerializer,
    CitaUpdateEstadoSerializer,
    BuscarClienteSerializer
)
from api.clientes.models import Cliente
from api.clientes.serializers import ClienteSerializer
from api.servicios.models import Servicio
from api.servicios.serializers import ServicioSerializer
from api.manicuristas.models import Manicurista
from api.manicuristas.serializers import ManicuristaSerializer


class CitaViewSet(viewsets.ModelViewSet):
    queryset = Cita.objects.all()
    serializer_class = CitaSerializer

    # CONFIGURACIÓN DE HORARIOS DE CITAS - UNIFICADO 10:00 AM - 8:00 PM
    HORA_INICIO_CITAS = time(10, 0)  # 10:00 AM
    HORA_FIN_CITAS = time(20, 0)     # 8:00 PM
    INTERVALO_MINUTOS = 30           # Citas cada 30 minutos

    def get_serializer_class(self):
        """Retorna el serializer apropiado según la acción"""
        if self.action in ['create', 'update', 'partial_update']:
            return CitaCreateSerializer
        elif self.action == 'actualizar_estado':
            return CitaUpdateEstadoSerializer
        return CitaSerializer

    def get_queryset(self):
        """Filtrar citas según parámetros de consulta"""
        queryset = Cita.objects.select_related(
            'cliente', 'manicurista', 'servicio'
        ).prefetch_related('servicios').all()

        # Filtros
        estado = self.request.query_params.get('estado')
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        manicurista_id = self.request.query_params.get('manicurista')
        cliente_id = self.request.query_params.get('cliente')

        if estado:
            queryset = queryset.filter(estado=estado)

        if fecha_desde:
            try:
                fecha_desde = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_cita__gte=fecha_desde)
            except ValueError:
                pass

        if fecha_hasta:
            try:
                fecha_hasta = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_cita__lte=fecha_hasta)
            except ValueError:
                pass

        if manicurista_id:
            queryset = queryset.filter(manicurista_id=manicurista_id)

        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)

        return queryset.order_by('-fecha_cita', '-hora_cita')

    def create(self, request, *args, **kwargs):
        """Crear nueva cita con validación de disponibilidad"""
        print("Datos recibidos para crear cita:", request.data)

        # Procesar servicios del frontend
        data = request.data.copy()

        # Si viene 'servicios' como array, usarlo
        if 'servicios' in data and isinstance(data['servicios'], list):
            servicios_ids = [int(sid) for sid in data['servicios'] if str(sid).isdigit()]
            data['servicios'] = servicios_ids

            # Si no hay servicio principal, usar el primero
            if not data.get('servicio') and servicios_ids:
                data['servicio'] = servicios_ids[0]

        # Si solo viene 'servicio', crear array con ese servicio
        elif 'servicio' in data and not data.get('servicios'):
            data['servicios'] = [int(data['servicio'])]

        print("Datos procesados:", data)

        # Usar el serializer para validar y crear la cita
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        cita = serializer.save()

        # Retornar con información completa
        response_serializer = CitaSerializer(cita)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Actualizar cita con validación de disponibilidad"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Validar disponibilidad si se cambian datos críticos
        manicurista_id = request.data.get('manicurista', instance.manicurista_id)
        cliente_id = request.data.get('cliente', instance.cliente_id)
        fecha_cita = request.data.get('fecha_cita', instance.fecha_cita)
        hora_cita = request.data.get('hora_cita', instance.hora_cita)

        # Solo validar si hay cambios en datos críticos
        cambios_criticos = (
            str(manicurista_id) != str(instance.manicurista_id) or
            str(fecha_cita) != str(instance.fecha_cita) or
            str(hora_cita) != str(instance.hora_cita)
        )

        if cambios_criticos:
            # Verificar disponibilidad de manicurista (excluyendo la cita actual)
            disponibilidad_manicurista = self._verificar_disponibilidad_manicurista(
                manicurista_id, fecha_cita, hora_cita, excluir_cita_id=instance.id
            )
            if not disponibilidad_manicurista['disponible']:
                return Response(
                    {'error': disponibilidad_manicurista['razon']},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verificar disponibilidad de cliente (excluyendo la cita actual)
            disponibilidad_cliente = self._verificar_disponibilidad_cliente(
                cliente_id, fecha_cita, hora_cita, excluir_cita_id=instance.id
            )
            if not disponibilidad_cliente['disponible']:
                return Response(
                    {'error': disponibilidad_cliente['razon']},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Procesar servicios del frontend
        data = request.data.copy()

        if 'servicios' in data and isinstance(data['servicios'], list):
            servicios_ids = [int(sid) for sid in data['servicios'] if str(sid).isdigit()]
            data['servicios'] = servicios_ids

            # Si no hay servicio principal, usar el primero
            if not data.get('servicio') and servicios_ids:
                data['servicio'] = servicios_ids[0]

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        cita = serializer.save()

        # Retornar con información completa
        response_serializer = CitaSerializer(cita)
        return Response(response_serializer.data)

    def _verificar_disponibilidad_manicurista(self, manicurista_id, fecha, hora, excluir_cita_id=None):
        """Verificar si la manicurista está disponible en la fecha y hora especificada"""
        try:
            # Convertir strings a objetos apropiados
            if isinstance(fecha, str):
                fecha = datetime.strptime(fecha, '%Y-%m-%d').date()
            if isinstance(hora, str):
                hora = datetime.strptime(hora, '%H:%M').time()

            # 1. Verificar que la manicurista existe y está activa
            try:
                manicurista = Manicurista.objects.get(id=manicurista_id)
                if manicurista.estado != 'activo':
                    return {
                        'disponible': False,
                        'razon': f'La manicurista {manicurista.nombres} no está activa'
                    }
            except Manicurista.DoesNotExist:
                return {
                    'disponible': False,
                    'razon': 'Manicurista no encontrada'
                }

            # 2. Verificar horario de trabajo (UNIFICADO 10:00 AM - 8:00 PM)
            if hora < self.HORA_INICIO_CITAS or hora >= self.HORA_FIN_CITAS:
                return {
                    'disponible': False,
                    'razon': f'Horario fuera del rango de atención (10:00 AM - 8:00 PM)'
                }

            # 3. Verificar novedades (ausencias y tardanzas)
            try:
                from api.novedades.models import Novedad

                novedad = Novedad.objects.filter(
                    manicurista_id=manicurista_id,
                    fecha=fecha
                ).first()

                if novedad:
                    if novedad.estado == 'ausente':
                        if novedad.tipo_ausencia == 'completa':
                            return {
                                'disponible': False,
                                'razon': f'{manicurista.nombres} tiene ausencia completa este día'
                            }
                        elif novedad.tipo_ausencia == 'por_horas':
                            # Verificar si la hora está en el rango de ausencia
                            if (novedad.hora_inicio_ausencia and novedad.hora_fin_ausencia and
                                novedad.hora_inicio_ausencia <= hora < novedad.hora_fin_ausencia):
                                return {
                                    'disponible': False,
                                    'razon': f'{manicurista.nombres} tiene ausencia de {novedad.hora_inicio_ausencia.strftime("%H:%M")} a {novedad.hora_fin_ausencia.strftime("%H:%M")}'
                                }

                    elif novedad.estado == 'tardanza':
                        # Si hay tardanza y la cita es antes de la hora de llegada
                        if novedad.hora_entrada and hora < novedad.hora_entrada:
                            return {
                                'disponible': False,
                                'razon': f'{manicurista.nombres} llegará tarde (a las {novedad.hora_entrada.strftime("%H:%M")})'
                            }

            except ImportError:
                # Si no existe el módulo de novedades, continuar sin verificar
                pass

            # 4. Verificar citas existentes
            queryset = Cita.objects.filter(
                manicurista_id=manicurista_id,
                fecha_cita=fecha,
                hora_cita=hora,
                estado__in=['pendiente', 'en_proceso']
            )

            if excluir_cita_id:
                queryset = queryset.exclude(id=excluir_cita_id)

            if queryset.exists():
                return {
                    'disponible': False,
                    'razon': f'{manicurista.nombres} ya tiene una cita programada a esta hora'
                }

            return {
                'disponible': True,
                'razon': 'Horario disponible'
            }

        except Exception as e:
            print(f"Error verificando disponibilidad de manicurista: {e}")
            return {
                'disponible': False,
                'razon': 'Error al verificar disponibilidad'
            }

    def _verificar_disponibilidad_cliente(self, cliente_id, fecha, hora, excluir_cita_id=None):
        """Verificar si el cliente está disponible en la fecha y hora especificada"""
        try:
            # Convertir strings a objetos apropiados
            if isinstance(fecha, str):
                fecha = datetime.strptime(fecha, '%Y-%m-%d').date()
            if isinstance(hora, str):
                hora = datetime.strptime(hora, '%H:%M').time()

            # Verificar que el cliente existe y está activo
            try:
                cliente = Cliente.objects.get(id=cliente_id)
                if not cliente.estado:
                    return {
                        'disponible': False,
                        'razon': f'El cliente {cliente.nombre} no está activo'
                    }
            except Cliente.DoesNotExist:
                # Si no existe cliente con ese ID, buscar por correo del usuario
                try:
                    from api.usuarios.models import Usuario
                    usuario = Usuario.objects.get(id=cliente_id)
                    
                    if usuario.rol and usuario.rol.nombre.lower() == 'cliente':
                        # Buscar cliente por correo electrónico
                        cliente = Cliente.objects.filter(correo_electronico=usuario.correo_electronico).first()
                        if cliente:
                            print(f"✅ Cliente encontrado por correo para usuario {usuario.id}: {cliente.id}")
                        else:
                            # Si no existe cliente con ese correo, crear uno
                            cliente_data = {
                                'usuario': usuario,
                                'nombre': usuario.nombre,
                                'tipo_documento': usuario.tipo_documento,
                                'documento': usuario.documento,
                                'celular': usuario.celular,
                                'correo_electronico': usuario.correo_electronico,
                                'direccion': usuario.direccion,
                                'estado': True
                            }
                            
                            cliente = Cliente.objects.create(**cliente_data)
                            print(f"✅ Cliente creado automáticamente para usuario {usuario.id}: {cliente.id}")
                    else:
                        return {
                            'disponible': False,
                            'razon': 'El usuario no tiene rol de Cliente'
                        }
                except Usuario.DoesNotExist:
                    return {
                        'disponible': False,
                        'razon': 'No se encontró el usuario'
                    }

            # Verificar citas existentes del cliente
            queryset = Cita.objects.filter(
                cliente_id=cliente_id,
                fecha_cita=fecha,
                hora_cita=hora,
                estado__in=['pendiente', 'en_proceso']
            )

            if excluir_cita_id:
                queryset = queryset.exclude(id=excluir_cita_id)

            if queryset.exists():
                return {
                    'disponible': False,
                    'razon': f'{cliente.nombre} ya tiene una cita programada a esta hora'
                }

            return {
                'disponible': True,
                'razon': 'Cliente disponible'
            }

        except Exception as e:
            print(f"Error verificando disponibilidad de cliente: {e}")
            return {
                'disponible': False,
                'razon': 'Error al verificar disponibilidad del cliente'
            }

    def _generar_horarios_disponibles(self, fecha):
        """Generar lista de horarios disponibles para el día (10:00 AM - 8:00 PM cada 30 min)"""
        horarios = []
        hora_actual = datetime.combine(fecha, self.HORA_INICIO_CITAS)
        hora_fin = datetime.combine(fecha, self.HORA_FIN_CITAS)

        while hora_actual < hora_fin:
            horarios.append(hora_actual.time().strftime('%H:%M'))
            hora_actual += timedelta(minutes=self.INTERVALO_MINUTOS)

        return horarios

    @action(detail=False, methods=['post'])
    def buscar_clientes(self, request):
        """Buscar clientes por nombre o documento"""
        serializer = BuscarClienteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        query = serializer.validated_data['query']

        # Buscar por nombre o documento
        clientes = Cliente.objects.filter(
            Q(nombre__icontains=query) | Q(documento__icontains=query)
        ).order_by('nombre')[:10]  # Limitar a 10 resultados

        serializer = ClienteSerializer(clientes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def manicuristas_disponibles(self, request):
        """Obtener manicuristas disponibles"""
        manicuristas = Manicurista.objects.filter(
            estado='activo',
            disponible=True
        ).order_by('nombre')

        serializer = ManicuristaSerializer(manicuristas, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def servicios_activos(self, request):
        """Obtener servicios activos"""
        servicios = Servicio.objects.filter(
            estado='activo'
        ).order_by('nombre')

        serializer = ServicioSerializer(servicios, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def actualizar_estado(self, request, pk=None):
        """Actualizar estado de la cita"""
        cita = self.get_object()
        serializer = CitaUpdateEstadoSerializer(cita, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        cita_actualizada = serializer.save()

        # Si se finaliza la cita, crear ventas automáticamente para todos los servicios
        if cita_actualizada.estado == 'finalizada':
            try:
                self.crear_ventas_automaticas(cita_actualizada)
            except Exception as e:
                # Log del error pero no fallar la actualización de la cita
                print(f"Error creando ventas automáticas: {e}")

        response_serializer = CitaSerializer(cita_actualizada)
        return Response(response_serializer.data)

    def crear_ventas_automaticas(self, cita):
        """Crear ventas automáticamente separadas por manicurista cuando se finaliza una cita"""
        try:
            # Importar aquí para evitar importación circular
            from api.ventaservicios.models import VentaServicio, DetalleVentaServicio

            # Verificar que no existan ventas para esta cita
            if VentaServicio.objects.filter(citas=cita).exists():
                print(f"Ya existen ventas para la cita {cita.id}")
                return

            # Obtener servicios agrupados por manicurista
            servicios_por_manicurista = {}
            
            # Obtener servicios de la cita con sus manicuristas asignadas
            for cita_manicurista in cita.manicuristas_cita.all():
                manicurista = cita_manicurista.manicurista
                servicios_por_manicurista[manicurista] = []
                
                # Obtener servicios asignados a esta manicurista específica
                for cita_servicio in cita.servicios_cita.all():
                    servicios_por_manicurista[manicurista].append(cita_servicio)

            # Crear una venta separada para cada manicurista
            for manicurista, servicios_cita in servicios_por_manicurista.items():
                if not servicios_cita:  # Si no tiene servicios asignados, saltar
                    continue
                    
                # Calcular total para esta manicurista
                total_manicurista = sum(cs.subtotal for cs in servicios_cita)
                
                # Crear venta para esta manicurista
                venta_data = {
                    'cliente': cita.cliente,
                    'manicurista': manicurista,
                    'cita': cita,  # Mantener referencia a la cita principal
                    'cantidad': 1,
                    'precio_unitario': total_manicurista,
                    'total': total_manicurista,
                    'fecha_venta': cita.fecha_finalizacion or timezone.now(),
                    'observaciones': f"Venta generada automáticamente desde cita #{cita.id} - Manicurista: {manicurista.nombre}",
                    'estado': 'pendiente',
                    'metodo_pago': 'efectivo'  # Método por defecto
                }

                # Crear la venta para esta manicurista
                venta = VentaServicio.objects.create(**venta_data)
                
                # Agregar la cita a la relación many-to-many
                venta.citas.add(cita)
                
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

            print(f"Venta {venta.id} creada automáticamente para cita {cita.id} con {cita.servicios.count()} servicios")

        except ImportError:
            print("Módulo de ventas no disponible")
        except Exception as e:
            print(f"Error creando ventas automáticas: {e}")
            raise

    @action(detail=False, methods=['get'])
    def citas_hoy(self, request):
        """Obtener citas de hoy"""
        hoy = timezone.now().date()
        citas = self.get_queryset().filter(fecha_cita=hoy)
        serializer = self.get_serializer(citas, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def citas_pendientes(self, request):
        """Obtener citas pendientes"""
        citas = self.get_queryset().filter(estado='pendiente')
        serializer = self.get_serializer(citas, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas de citas"""
        hoy = timezone.now().date()
        inicio_mes = hoy.replace(day=1)

        # Estadísticas generales
        total_citas = self.get_queryset().count()
        citas_hoy = self.get_queryset().filter(fecha_cita=hoy).count()
        citas_pendientes = self.get_queryset().filter(estado='pendiente').count()
        citas_mes = self.get_queryset().filter(fecha_cita__gte=inicio_mes).count()

        # Estadísticas por estado
        por_estado = self.get_queryset().values('estado').annotate(
            count=Count('id')
        ).order_by('estado')

        # Ingresos del mes (solo citas finalizadas) - USAR PRECIO TOTAL
        ingresos_mes = self.get_queryset().filter(
            fecha_cita__gte=inicio_mes,
            estado='finalizada'
        ).aggregate(total=Sum('precio_total'))['total'] or 0

        # Manicuristas más ocupadas
        manicuristas_top = self.get_queryset().filter(
            fecha_cita__gte=inicio_mes
        ).values(
            'manicurista__nombre'
        ).annotate(
            total_citas=Count('id')
        ).order_by('-total_citas')[:5]

        return Response({
            'total_citas': total_citas,
            'citas_hoy': citas_hoy,
            'citas_pendientes': citas_pendientes,
            'citas_mes': citas_mes,
            'por_estado': list(por_estado),
            'ingresos_mes': float(ingresos_mes),
            'manicuristas_top': list(manicuristas_top)
        })

    # ===== ENDPOINT PRINCIPAL PARA EL FRONTEND =====
    @action(detail=False, methods=['get'])
    def disponibilidad(self, request):
        """
        Endpoint principal para verificar disponibilidad - Compatible con frontend
        URL: /api/citas/disponibilidad/?manicurista=1&fecha=2024-01-15
        """
        manicurista_id = request.query_params.get('manicurista')
        fecha = request.query_params.get('fecha')
        duracion_cita = request.query_params.get('duracion_cita', 30)  # Default 30 minutos

        if not manicurista_id or not fecha:
            return Response(
                {'error': 'Se requieren parámetros manicurista y fecha'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generar todos los horarios posibles (10:00 AM - 8:00 PM)
        todos_los_horarios = self._generar_horarios_disponibles(fecha_obj, int(duracion_cita), manicurista_id)

        # Obtener horarios ocupados por citas
        citas_ocupadas = Cita.objects.filter(
            manicurista_id=manicurista_id,
            fecha_cita=fecha_obj,
            estado__in=['pendiente', 'en_proceso']
        ).values_list('hora_cita', flat=True)

        horarios_ocupados_citas = [hora.strftime('%H:%M') for hora in citas_ocupadas]

        # Verificar novedades (ausencias y tardanzas)
        horarios_ocupados_novedades = []
        razon_no_disponible = None

        try:
            from api.novedades.models import Novedad

            novedad = Novedad.objects.filter(
                manicurista_id=manicurista_id,
                fecha=fecha_obj
            ).first()

            if novedad:
                if novedad.estado == 'ausente':
                    if novedad.tipo_ausencia == 'completa':
                        # Toda la jornada no disponible
                        horarios_ocupados_novedades = todos_los_horarios.copy()
                        razon_no_disponible = f"Ausencia completa (10:00 - 20:00)"

                    elif novedad.tipo_ausencia == 'por_horas' and novedad.hora_inicio_ausencia and novedad.hora_fin_ausencia:
                        # Marcar horarios específicos como no disponibles
                        for horario_str in todos_los_horarios:
                            horario_time = datetime.strptime(horario_str, '%H:%M').time()
                            if novedad.hora_inicio_ausencia <= horario_time < novedad.hora_fin_ausencia:
                                horarios_ocupados_novedades.append(horario_str)

                elif novedad.estado == 'tardanza' and novedad.hora_entrada:
                    # Marcar horarios antes de la llegada como no disponibles
                    for horario_str in todos_los_horarios:
                        horario_time = datetime.strptime(horario_str, '%H:%M').time()
                        if horario_time < novedad.hora_entrada:
                            horarios_ocupados_novedades.append(horario_str)

        except ImportError:
            # Si no existe el módulo de novedades, continuar sin verificar
            pass

        # Combinar todos los horarios ocupados
        todos_ocupados = set(horarios_ocupados_citas + horarios_ocupados_novedades)

        # Calcular horarios disponibles
        horarios_disponibles = [h for h in todos_los_horarios if h not in todos_ocupados]

        # Formato esperado por el frontend
        return Response({
            'horarios_disponibles': horarios_disponibles,
            'horarios_ocupados': list(todos_ocupados),
            'horarios_ocupados_citas': horarios_ocupados_citas,
            'horarios_ocupados_novedades': horarios_ocupados_novedades,
            'total_disponibles': len(horarios_disponibles),
            'total_ocupados': len(todos_ocupados),
            'horario_trabajo': {
                'inicio': self.HORA_INICIO_CITAS.strftime('%H:%M'),
                'fin': self.HORA_FIN_CITAS.strftime('%H:%M'),
                'intervalo_minutos': self.INTERVALO_MINUTOS
            },
            'razon_no_disponible': razon_no_disponible
        })

    # ===== MANTENER ENDPOINT ORIGINAL PARA COMPATIBILIDAD =====
    @action(detail=False, methods=['get'])
    def disponibilidad_manicurista(self, request):
        """Endpoint de compatibilidad - redirige al endpoint principal"""
        return self.disponibilidad(request)

    @action(detail=False, methods=['get'])
    def disponibilidad_cliente(self, request):
        """Verificar disponibilidad de cliente en fecha específica"""
        cliente_id = request.query_params.get('cliente_id')
        fecha = request.query_params.get('fecha')

        if not cliente_id or not fecha:
            return Response(
                {'error': 'Se requieren cliente_id y fecha'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Obtener citas del cliente en esa fecha
        citas_cliente = Cita.objects.filter(
            cliente_id=cliente_id,
            fecha_cita=fecha_obj,
            estado__in=['pendiente', 'en_proceso']
        ).values('hora_cita', 'manicurista__nombres')

        horarios_ocupados = []
        for cita in citas_cliente:
            horarios_ocupados.append({
                'hora': cita['hora_cita'].strftime('%H:%M'),
                'manicurista': cita['manicurista__nombres']
            })

        # Obtener información del cliente
        try:
            cliente = Cliente.objects.get(id=cliente_id)
            cliente_nombre = cliente.nombre
        except Cliente.DoesNotExist:
            cliente_nombre = "Cliente no encontrado"

        return Response({
            'fecha': fecha,
            'cliente_id': cliente_id,
            'cliente_nombre': cliente_nombre,
            'citas_existentes': horarios_ocupados,
            'puede_agendar_mas': len(horarios_ocupados) < 3,  # Máximo 3 citas por día
            'limite_citas_dia': 3
        })
    
    # ===== ENDPOINTS ESPECÍFICOS PARA USUARIOS =====
    @action(detail=False, methods=['get'], url_path='user/manicuristas_disponibles')
    def manicuristas_disponibles_user(self, request):
        """
        Obtener manicuristas disponibles para usuarios (clientes)
        """
        try:
            print("🔍 Obteniendo manicuristas disponibles...")
            manicuristas = Manicurista.objects.filter(estado='activo').order_by('nombre')
            print(f"📊 Encontradas {manicuristas.count()} manicuristas activas")
            
            # Crear respuesta manual para evitar problemas con el serializer
            manicuristas_data = []
            for manicurista in manicuristas:
                manicuristas_data.append({
                    'id': manicurista.id,
                    'nombre': getattr(manicurista, 'nombre', 'Sin nombre'),
                    'nombres': getattr(manicurista, 'nombres', getattr(manicurista, 'nombre', 'Sin nombre')),
                    'especialidad': getattr(manicurista, 'especialidad', 'Sin especialidad'),
                    'estado': manicurista.estado
                })
            
            print("✅ Datos preparados exitosamente")
            return Response(manicuristas_data)
        except Exception as e:
            print(f"❌ Error obteniendo manicuristas: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Error obteniendo manicuristas: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='user/servicios_activos')
    def servicios_activos_user(self, request):
        """
        Obtener servicios activos para usuarios (clientes)
        """
        try:
            print("🔍 Obteniendo servicios activos...")
            servicios = Servicio.objects.filter(estado='activo').order_by('nombre')
            print(f"📊 Encontrados {servicios.count()} servicios activos")
            
            # Crear respuesta manual para evitar problemas con el serializer
            servicios_data = []
            for servicio in servicios:
                servicios_data.append({
                    'id': servicio.id,
                    'nombre': getattr(servicio, 'nombre', 'Sin nombre'),
                    'precio': float(getattr(servicio, 'precio', 0)),
                    'duracion': getattr(servicio, 'duracion', 60),
                    'descripcion': getattr(servicio, 'descripcion', 'Sin descripción'),
                    'estado': servicio.estado
                })
            
            print("✅ Datos preparados exitosamente")
            return Response(servicios_data)
        except Exception as e:
            print(f"❌ Error obteniendo servicios: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Error obteniendo servicios: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='user/disponibilidad')
    def disponibilidad_user(self, request):
        """
        Verificar disponibilidad para usuarios (clientes)
        """
        try:
            fecha = request.query_params.get('fecha')
            duracion = request.query_params.get('duracion', 60)  # Duración por defecto
            manicurista_id = request.query_params.get('manicurista')
            
            if not fecha:
                return Response(
                    {'error': 'Se requiere fecha'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generar horarios disponibles
            horarios_disponibles = self._generar_horarios_disponibles(fecha_obj, int(duracion), manicurista_id)
            
            return Response({
                'horarios_disponibles': horarios_disponibles,
                'fecha': fecha,
                'duracion': int(duracion),
                'manicurista_id': manicurista_id
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error verificando disponibilidad: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='user/crear_cita')
    def crear_cita_user(self, request):
        """
        Crear cita desde el frontend de usuario (cliente)
        """
        try:
            print("Datos recibidos para crear cita desde usuario:", request.data)
            
            # Obtener el cliente del usuario autenticado
            usuario = request.user
            if not hasattr(usuario, 'cliente'):
                return Response(
                    {'error': 'Usuario no tiene perfil de cliente'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            cliente = usuario.cliente
            
            # Preparar datos para crear la cita
            fecha_cita = request.data.get('fecha_cita')
            hora_cita = request.data.get('hora_cita')
            servicios_data = request.data.get('servicios', [])  # Array de {servicio_id, manicurista_id}
            observaciones = request.data.get('observaciones', '')
            
            # Validar datos requeridos
            if not fecha_cita or not hora_cita:
                return Response(
                    {'error': 'Fecha y hora son requeridas'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not servicios_data or len(servicios_data) == 0:
                return Response(
                    {'error': 'Al menos un servicio es requerido'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Crear la cita básica
            cita_data = {
                'cliente': cliente.id,
                'fecha_cita': fecha_cita,
                'hora_cita': hora_cita,
                'observaciones': observaciones,
                'estado': 'pendiente'
            }
            
            serializer = CitaCreateSerializer(data=cita_data)
            if serializer.is_valid():
                cita = serializer.save()
                
                # Agregar servicios con sus manicuristas específicas
                manicuristas_asignadas = set()
                for servicio_info in servicios_data:
                    servicio_id = servicio_info.get('servicio_id') or servicio_info.get('servicio')
                    manicurista_id = servicio_info.get('manicurista_id') or servicio_info.get('manicurista')
                    
                    if not servicio_id:
                        continue
                    
                    try:
                        servicio = Servicio.objects.get(id=servicio_id, estado='activo')
                        cita.agregar_servicio(servicio)
                        
                        # Asignar manicurista específica para este servicio
                        if manicurista_id and manicurista_id != 'cualquiera':
                            try:
                                manicurista = Manicurista.objects.get(id=manicurista_id, estado='activo')
                                manicuristas_asignadas.add(manicurista)
                                
                                # Crear relación específica servicio-manicurista
                                from .models import CitaManicurista
                                CitaManicurista.objects.create(
                                    cita=cita,
                                    manicurista=manicurista,
                                    es_principal=len(manicuristas_asignadas) == 1,
                                    orden=len(manicuristas_asignadas)
                                )
                            except Manicurista.DoesNotExist:
                                print(f"Manicurista {manicurista_id} no encontrada")
                    except Servicio.DoesNotExist:
                        print(f"Servicio {servicio_id} no encontrado")
                        continue
                
                # Si no se asignaron manicuristas específicas, asignar automáticamente
                if not manicuristas_asignadas:
                    manicuristas_disponibles = Manicurista.objects.filter(estado='activo')
                    if manicuristas_disponibles.exists():
                        manicurista_principal = manicuristas_disponibles.first()
                        cita.agregar_manicurista(manicurista_principal, es_principal=True)
                
                # Recalcular totales
                cita.calcular_totales()
                
                # Serializar respuesta
                response_serializer = CitaSerializer(cita)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"Error creando cita desde usuario: {str(e)}")
            return Response(
                {'error': f'Error creando cita: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generar_horarios_disponibles(self, fecha, duracion_minutos, manicurista_id=None):
        """
        Generar horarios disponibles para una fecha específica
        """
        try:
            # Generar todos los horarios posibles
            todos_los_horarios = []
            hora_actual = self.HORA_INICIO_CITAS
            hora_fin = self.HORA_FIN_CITAS
            
            while hora_actual < hora_fin:
                todos_los_horarios.append(hora_actual.strftime('%H:%M'))
                hora_actual = datetime.combine(datetime.today(), hora_actual) + timedelta(minutes=self.INTERVALO_MINUTOS)
                hora_actual = hora_actual.time()
            
            # Obtener horarios ocupados
            horarios_ocupados = []
            
            # Filtrar por manicurista si se especifica
            filtros_citas = {
                'fecha_cita': fecha,
                'estado__in': ['pendiente', 'en_proceso']
            }
            
            if manicurista_id:
                filtros_citas['manicurista_id'] = manicurista_id
            
            citas_existentes = Cita.objects.filter(**filtros_citas)
            
            for cita in citas_existentes:
                hora_cita = cita.hora_cita.strftime('%H:%M')
                horarios_ocupados.append(hora_cita)
                
                # También ocupar horarios según la duración de la cita
                duracion_cita = cita.duracion_total or cita.duracion_estimada or 60
                slots_ocupados = int(duracion_cita / self.INTERVALO_MINUTOS)
                
                hora_actual_cita = datetime.combine(datetime.today(), cita.hora_cita)
                for i in range(1, slots_ocupados):
                    hora_ocupada = hora_actual_cita + timedelta(minutes=self.INTERVALO_MINUTOS * i)
                    if hora_ocupada.time() < self.HORA_FIN_CITAS:
                        horarios_ocupados.append(hora_ocupada.time().strftime('%H:%M'))
            
            # Filtrar horarios disponibles
            horarios_disponibles = []
            for horario in todos_los_horarios:
                if horario not in horarios_ocupados:
                    # Verificar que el horario + duración no exceda el horario de cierre
                    hora_inicio = datetime.strptime(horario, '%H:%M').time()
                    hora_fin_cita = datetime.combine(datetime.today(), hora_inicio) + timedelta(minutes=duracion_minutos)
                    
                    if hora_fin_cita.time() <= self.HORA_FIN_CITAS:
                        horarios_disponibles.append(horario)
            
            return horarios_disponibles
            
        except Exception as e:
            print(f"Error generando horarios disponibles: {str(e)}")
            return []
