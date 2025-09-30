from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import datetime, timedelta
from api.usuarios.models import Usuario
from api.clientes.models import Cliente
from api.manicuristas.models import Manicurista
from api.citas.models import Cita
from api.servicios.models import Servicio
from api.ventaservicios.models import VentaServicio
from api.liquidaciones.models import Liquidacion
from api.novedades.models import Novedad
from api.abastecimientos.models import Abastecimiento
from api.insumos.models import Insumo
from api.compras.models import Compra
from api.proveedores.models import Proveedor
from api.availability.models import Disponibilidad
from api.citas.serializers_multiple import CitaCrearMultipleSerializer, CitaMultipleMobileSerializer
from .serializers import (
    UsuarioMobileSerializer, ClienteMobileSerializer, ManicuristaMobileSerializer,
    ServicioMobileSerializer, CitaMobileSerializer, VentaServicioMobileSerializer,
    LiquidacionMobileSerializer, NovedadMobileSerializer, InsumoMobileSerializer,
    AbastecimientoMobileSerializer, CompraMobileSerializer, ProveedorMobileSerializer,
    DashboardMobileSerializer, PerfilUsuarioMobileSerializer
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_mobile(request):
    """
    Dashboard optimizado para móvil con datos esenciales
    """
    try:
        usuario = request.user
        hoy = timezone.now().date()
        
        # Datos básicos del dashboard
        total_citas_hoy = Cita.objects.filter(fecha_hora__date=hoy).count()
        total_ventas_hoy = VentaServicio.objects.filter(
            fecha_venta__date=hoy
        ).aggregate(total=Sum('precio_total'))['total'] or 0
        
        total_clientes = Cliente.objects.filter(estado=True).count()
        total_manicuristas = Manicurista.objects.filter(estado='activo').count()
        citas_pendientes = Cita.objects.filter(estado='pendiente').count()
        
        # Servicios más populares (últimos 30 días)
        fecha_limite = hoy - timedelta(days=30)
        servicios_populares = VentaServicio.objects.filter(
            fecha_venta__date__gte=fecha_limite
        ).values('servicio__nombre').annotate(
            total_ventas=Count('id')
        ).order_by('-total_ventas')[:5]
        
        # Novedades recientes
        novedades_recientes = Novedad.objects.filter(
            estado='activo'
        ).order_by('-fecha_publicacion')[:3]
        
        dashboard_data = {
            'total_citas_hoy': total_citas_hoy,
            'total_ventas_hoy': float(total_ventas_hoy),
            'total_clientes': total_clientes,
            'total_manicuristas': total_manicuristas,
            'citas_pendientes': citas_pendientes,
            'servicios_populares': list(servicios_populares),
            'novedades_recientes': NovedadMobileSerializer(novedades_recientes, many=True).data
        }
        
        serializer = DashboardMobileSerializer(dashboard_data)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error obteniendo dashboard: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def perfil_usuario_mobile(request):
    """
    Perfil de usuario optimizado para móvil
    """
    try:
        usuario = request.user
        
        # Información del usuario
        usuario_data = UsuarioMobileSerializer(usuario).data
        
        # Perfil específico según el rol
        perfil_especifico = {}
        estadisticas = {}
        
        if hasattr(usuario, 'cliente'):
            cliente = usuario.cliente
            perfil_especifico = ClienteMobileSerializer(cliente).data
            
            # Estadísticas del cliente
            total_citas = Cita.objects.filter(cliente=cliente).count()
            citas_este_mes = Cita.objects.filter(
                cliente=cliente,
                fecha_hora__date__gte=timezone.now().date().replace(day=1)
            ).count()
            
            estadisticas = {
                'total_citas': total_citas,
                'citas_este_mes': citas_este_mes,
                'ultima_cita': None
            }
            
            ultima_cita = Cita.objects.filter(cliente=cliente).order_by('-fecha_hora').first()
            if ultima_cita:
                estadisticas['ultima_cita'] = CitaMobileSerializer(ultima_cita).data
                
        elif hasattr(usuario, 'manicurista'):
            manicurista = usuario.manicurista
            perfil_especifico = ManicuristaMobileSerializer(manicurista).data
            
            # Estadísticas de la manicurista
            total_citas = Cita.objects.filter(manicurista=manicurista).count()
            citas_este_mes = Cita.objects.filter(
                manicurista=manicurista,
                fecha_hora__date__gte=timezone.now().date().replace(day=1)
            ).count()
            
            total_ventas = VentaServicio.objects.filter(manicurista=manicurista).aggregate(
                total=Sum('precio_total')
            )['total'] or 0
            
            estadisticas = {
                'total_citas': total_citas,
                'citas_este_mes': citas_este_mes,
                'total_ventas': float(total_ventas),
                'citas_pendientes': Cita.objects.filter(
                    manicurista=manicurista, 
                    estado='pendiente'
                ).count()
            }
        
        response_data = {
            'usuario': usuario_data,
            'perfil_especifico': perfil_especifico,
            'estadisticas': estadisticas
        }
        
        serializer = PerfilUsuarioMobileSerializer(response_data)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error obteniendo perfil: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def citas_mobile(request):
    """
    Lista de citas optimizada para móvil
    """
    try:
        usuario = request.user
        fecha_desde = request.GET.get('fecha_desde')
        fecha_hasta = request.GET.get('fecha_hasta')
        estado = request.GET.get('estado')
        
        # Filtros base
        queryset = Cita.objects.select_related('cliente', 'manicurista', 'servicio')
        
        # Filtros según el rol del usuario
        if hasattr(usuario, 'cliente'):
            queryset = queryset.filter(cliente=usuario.cliente)
        elif hasattr(usuario, 'manicurista'):
            queryset = queryset.filter(manicurista=usuario.manicurista)
        
        # Filtros adicionales
        if fecha_desde:
            queryset = queryset.filter(fecha_hora__date__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_hora__date__lte=fecha_hasta)
        if estado:
            queryset = queryset.filter(estado=estado)
        
        # Ordenar por fecha más reciente
        queryset = queryset.order_by('-fecha_hora')
        
        serializer = CitaMobileSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error obteniendo citas: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def servicios_mobile(request):
    """
    Lista de servicios optimizada para móvil
    """
    try:
        queryset = Servicio.objects.filter(estado='activo').order_by('nombre')
        serializer = ServicioMobileSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error obteniendo servicios: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def novedades_mobile(request):
    """
    Lista de novedades optimizada para móvil
    """
    try:
        queryset = Novedad.objects.filter(estado='activo').order_by('-fecha_publicacion')
        serializer = NovedadMobileSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error obteniendo novedades: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liquidaciones_mobile(request):
    """
    Lista de liquidaciones optimizada para móvil (solo manicuristas)
    """
    try:
        usuario = request.user
        
        if not hasattr(usuario, 'manicurista'):
            return Response(
                {'error': 'Acceso denegado. Solo manicuristas pueden ver liquidaciones'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = Liquidacion.objects.filter(
            manicurista=usuario.manicurista
        ).order_by('-fecha_liquidacion')
        
        serializer = LiquidacionMobileSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error obteniendo liquidaciones: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def insumos_mobile(request):
    """
    Lista de insumos optimizada para móvil
    """
    try:
        queryset = Insumo.objects.filter(estado='activo').select_related('categoria')
        
        # Filtrar por stock bajo si se solicita
        stock_bajo = request.GET.get('stock_bajo')
        if stock_bajo == 'true':
            queryset = queryset.filter(stock_actual__lte=models.F('stock_minimo'))
        
        serializer = InsumoMobileSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error obteniendo insumos: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_cita_mobile(request):
    """
    Crear cita desde móvil
    """
    try:
        usuario = request.user
        
        # Solo clientes pueden crear citas
        if not hasattr(usuario, 'cliente'):
            return Response(
                {'error': 'Solo los clientes pueden crear citas'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        data = request.data.copy()
        data['cliente'] = usuario.cliente.id
        
        serializer = CitaMobileSerializer(data=data)
        if serializer.is_valid():
            cita = serializer.save()
            return Response(
                CitaMobileSerializer(cita).data, 
                status=status.HTTP_201_CREATED
            )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response(
            {'error': f'Error creando cita: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def actualizar_cita_mobile(request, cita_id):
    """
    Actualizar cita desde móvil
    """
    try:
        usuario = request.user
        
        try:
            cita = Cita.objects.get(id=cita_id)
        except Cita.DoesNotExist:
            return Response(
                {'error': 'Cita no encontrada'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar permisos
        if hasattr(usuario, 'cliente') and cita.cliente != usuario.cliente:
            return Response(
                {'error': 'No tienes permisos para modificar esta cita'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        elif hasattr(usuario, 'manicurista') and cita.manicurista != usuario.manicurista:
            return Response(
                {'error': 'No tienes permisos para modificar esta cita'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CitaMobileSerializer(cita, data=request.data, partial=True)
        if serializer.is_valid():
            cita_actualizada = serializer.save()
            return Response(
                CitaMobileSerializer(cita_actualizada).data, 
                status=status.HTTP_200_OK
            )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response(
            {'error': f'Error actualizando cita: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def disponibilidad_movil(request):
    """
    Consultar disponibilidad optimizada para móvil
    """
    try:
        manicurista_id = request.GET.get('manicurista_id')
        fecha_str = request.GET.get('fecha')
        
        if not manicurista_id or not fecha_str:
            return Response(
                {'error': 'Se requiere manicurista_id y fecha'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calcular disponibilidad usando el sistema de disponibilidades
        disponibilidad_data = Disponibilidad.objects.calcular_disponibilidad(
            manicurista_id, fecha
        )
        
        if not disponibilidad_data:
            return Response(
                {'error': 'No se pudo calcular la disponibilidad'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Optimizar respuesta para móvil
        slots_disponibles = [slot for slot in disponibilidad_data['slots_disponibles'] if slot['disponible']]
        slots_ocupados = [slot for slot in disponibilidad_data['slots_disponibles'] if not slot['disponible']]
        
        response_data = {
            'manicurista': disponibilidad_data['manicurista'],
            'fecha': disponibilidad_data['fecha'],
            'horario_base': disponibilidad_data['horario_base'],
            'slots_disponibles': slots_disponibles,
            'slots_ocupados': slots_ocupados,
            'resumen': {
                'total': len(disponibilidad_data['slots_disponibles']),
                'disponibles': len(slots_disponibles),
                'ocupados': len(slots_ocupados),
                'porcentaje_disponibilidad': round((len(slots_disponibles) / len(disponibilidad_data['slots_disponibles'])) * 100, 2) if disponibilidad_data['slots_disponibles'] else 0
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error consultando disponibilidad móvil: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def proximos_horarios_movil(request):
    """
    Obtener próximos horarios disponibles para móvil
    """
    try:
        manicurista_id = request.GET.get('manicurista_id')
        dias_adelante = int(request.GET.get('dias_adelante', 7))
        
        if not manicurista_id:
            return Response(
                {'error': 'Se requiere manicurista_id'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener próximos días
        hoy = timezone.now().date()
        proximos_dias = []
        
        for i in range(dias_adelante):
            fecha_consulta = hoy + timedelta(days=i)
            disponibilidad_data = Disponibilidad.objects.calcular_disponibilidad(
                manicurista_id, fecha_consulta
            )
            
            if disponibilidad_data:
                slots_disponibles = [slot for slot in disponibilidad_data['slots_disponibles'] if slot['disponible']]
                
                if slots_disponibles:  # Solo incluir días con disponibilidad
                    proximos_dias.append({
                        'fecha': fecha_consulta.isoformat(),
                        'slots_disponibles': slots_disponibles,
                        'total_disponibles': len(slots_disponibles)
                    })
        
        return Response({
            'manicurista_id': manicurista_id,
            'proximos_dias': proximos_dias,
            'total_dias': len(proximos_dias)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error obteniendo próximos horarios: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def disponibilidad_por_especialidad_movil(request):
    """
    Obtener disponibilidad por especialidad para móvil
    """
    try:
        especialidad = request.GET.get('especialidad')
        fecha_str = request.GET.get('fecha')
        
        if not especialidad or not fecha_str:
            return Response(
                {'error': 'Se requiere especialidad y fecha'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener manicuristas por especialidad
        manicuristas = Manicurista.objects.filter(
            especialidad__icontains=especialidad,
            estado='activo'
        )
        
        disponibilidades_especialidad = []
        
        for manicurista in manicuristas:
            disponibilidad_data = Disponibilidad.objects.calcular_disponibilidad(
                manicurista.id, fecha
            )
            
            if disponibilidad_data:
                slots_disponibles = [slot for slot in disponibilidad_data['slots_disponibles'] if slot['disponible']]
                
                disponibilidades_especialidad.append({
                    'manicurista': {
                        'id': manicurista.id,
                        'nombre': manicurista.nombre,
                        'especialidad': manicurista.especialidad
                    },
                    'slots_disponibles': slots_disponibles,
                    'total_disponibles': len(slots_disponibles)
                })
        
        return Response({
            'especialidad': especialidad,
            'fecha': fecha.isoformat(),
            'manicuristas_disponibles': disponibilidades_especialidad,
            'total_manicuristas': len(disponibilidades_especialidad)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error obteniendo disponibilidad por especialidad: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_cita_multiple_movil(request):
    """
    Crear cita con múltiples manicuristas y servicios desde móvil
    """
    try:
        usuario = request.user
        
        # Solo clientes pueden crear citas
        if not hasattr(usuario, 'cliente'):
            return Response(
                {'error': 'Solo los clientes pueden crear citas'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Agregar cliente_id automáticamente
        data = request.data.copy()
        data['cliente_id'] = usuario.cliente.id
        
        serializer = CitaCrearMultipleSerializer(data=data)
        if serializer.is_valid():
            with transaction.atomic():
                cita = serializer.save()
                
                # Verificar disponibilidad de todas las manicuristas
                fecha = cita.fecha_cita
                hora = cita.hora_cita
                
                for manicurista_cita in cita.manicuristas_cita.all():
                    disponibilidad_data = Disponibilidad.objects.calcular_disponibilidad(
                        manicurista_cita.manicurista.id, fecha
                    )
                    
                    if disponibilidad_data:
                        hora_str = hora.strftime('%H:%M')
                        slot_disponible = False
                        
                        for slot in disponibilidad_data['slots_disponibles']:
                            if slot['inicio'] == hora_str and slot['disponible']:
                                slot_disponible = True
                                break
                        
                        if not slot_disponible:
                            cita.delete()
                            return Response({
                                'error': f'La manicurista {manicurista_cita.manicurista.nombre} no está disponible en ese horario'
                            }, status=status.HTTP_400_BAD_REQUEST)
                
                # Serializar respuesta optimizada para móvil
                response_serializer = CitaMultipleMobileSerializer(cita)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response(
            {'error': f'Error creando cita múltiple: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_citas_multiple_movil(request):
    """
    Listar citas con múltiples relaciones optimizado para móvil
    """
    try:
        usuario = request.user
        
        # Filtros base según el usuario
        queryset = Cita.objects.select_related('cliente', 'manicurista', 'servicio').prefetch_related(
            'manicuristas_cita__manicurista',
            'servicios_cita__servicio'
        )
        
        if hasattr(usuario, 'cliente'):
            queryset = queryset.filter(cliente=usuario.cliente)
        elif hasattr(usuario, 'manicurista'):
            queryset = queryset.filter(manicuristas_cita__manicurista=usuario.manicurista)
        
        # Filtros adicionales
        fecha_desde = request.GET.get('fecha_desde')
        fecha_hasta = request.GET.get('fecha_hasta')
        estado = request.GET.get('estado')
        
        if fecha_desde:
            queryset = queryset.filter(fecha_cita__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_cita__lte=fecha_hasta)
        if estado:
            queryset = queryset.filter(estado=estado)
        
        queryset = queryset.order_by('-fecha_cita', '-hora_cita')
        
        serializer = CitaMultipleMobileSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error listando citas múltiples móvil: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def disponibilidad_multiple_movil(request):
    """
    Consultar disponibilidad de múltiples manicuristas para móvil
    """
    try:
        manicuristas_ids = request.GET.getlist('manicuristas_ids')
        fecha_str = request.GET.get('fecha')
        
        if not manicuristas_ids or not fecha_str:
            return Response(
                {'error': 'Se requiere manicuristas_ids y fecha'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        disponibilidades = []
        
        for manicurista_id in manicuristas_ids:
            disponibilidad_data = Disponibilidad.objects.calcular_disponibilidad(
                manicurista_id, fecha
            )
            
            if disponibilidad_data:
                slots_disponibles = [slot for slot in disponibilidad_data['slots_disponibles'] if slot['disponible']]
                
                disponibilidades.append({
                    'manicurista': {
                        'id': disponibilidad_data['manicurista']['id'],
                        'nombre': disponibilidad_data['manicurista']['nombre'],
                        'especialidad': disponibilidad_data['manicurista']['especialidad']
                    },
                    'slots_disponibles': slots_disponibles,
                    'total_disponibles': len(slots_disponibles)
                })
        
        return Response({
            'fecha': fecha.isoformat(),
            'disponibilidades': disponibilidades,
            'total_manicuristas': len(disponibilidades)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error consultando disponibilidad múltiple móvil: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
