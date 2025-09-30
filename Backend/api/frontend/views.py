from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum, Q, Avg
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_admin(request):
    """
    Dashboard completo para administradores del frontend
    """
    try:
        hoy = timezone.now().date()
        inicio_mes = hoy.replace(day=1)
        inicio_semana = hoy - timedelta(days=hoy.weekday())
        
        # Estadísticas generales
        total_clientes = Cliente.objects.filter(estado=True).count()
        total_manicuristas = Manicurista.objects.filter(estado='activo').count()
        total_servicios = Servicio.objects.filter(estado='activo').count()
        
        # Estadísticas de citas
        citas_hoy = Cita.objects.filter(fecha_hora__date=hoy).count()
        citas_este_mes = Cita.objects.filter(fecha_hora__date__gte=inicio_mes).count()
        citas_pendientes = Cita.objects.filter(estado='pendiente').count()
        citas_completadas = Cita.objects.filter(estado='completada').count()
        
        # Estadísticas de ventas
        ventas_hoy = VentaServicio.objects.filter(fecha_venta__date=hoy).aggregate(
            total=Sum('precio_total')
        )['total'] or 0
        
        ventas_este_mes = VentaServicio.objects.filter(fecha_venta__date__gte=inicio_mes).aggregate(
            total=Sum('precio_total')
        )['total'] or 0
        
        ventas_semana = VentaServicio.objects.filter(fecha_venta__date__gte=inicio_semana).aggregate(
            total=Sum('precio_total')
        )['total'] or 0
        
        # Servicios más populares
        servicios_populares = VentaServicio.objects.filter(
            fecha_venta__date__gte=inicio_mes
        ).values('servicio__nombre').annotate(
            total_ventas=Count('id'),
            total_ingresos=Sum('precio_total')
        ).order_by('-total_ventas')[:10]
        
        # Manicuristas más activas
        manicuristas_activas = Cita.objects.filter(
            fecha_hora__date__gte=inicio_mes
        ).values('manicurista__nombre').annotate(
            total_citas=Count('id')
        ).order_by('-total_citas')[:10]
        
        # Clientes más frecuentes
        clientes_frecuentes = Cita.objects.filter(
            fecha_hora__date__gte=inicio_mes
        ).values('cliente__nombre').annotate(
            total_citas=Count('id')
        ).order_by('-total_citas')[:10]
        
        # Estadísticas de liquidaciones
        liquidaciones_este_mes = Liquidacion.objects.filter(
            fecha_liquidacion__date__gte=inicio_mes
        ).aggregate(
            total_liquidaciones=Sum('total_liquidacion')
        )['total_liquidaciones'] or 0
        
        # Citas por estado
        citas_por_estado = Cita.objects.values('estado').annotate(
            total=Count('id')
        ).order_by('-total')
        
        # Ventas por día de la semana (últimas 4 semanas)
        ventas_por_dia = []
        for i in range(7):
            fecha = inicio_semana + timedelta(days=i)
            ventas_dia = VentaServicio.objects.filter(
                fecha_venta__date=fecha
            ).aggregate(total=Sum('precio_total'))['total'] or 0
            
            ventas_por_dia.append({
                'dia': fecha.strftime('%A'),
                'fecha': fecha.isoformat(),
                'total': float(ventas_dia)
            })
        
        # Novedades recientes
        novedades_recientes = Novedad.objects.filter(
            estado='activo'
        ).order_by('-fecha_publicacion')[:5]
        
        dashboard_data = {
            'resumen_general': {
                'total_clientes': total_clientes,
                'total_manicuristas': total_manicuristas,
                'total_servicios': total_servicios,
                'citas_hoy': citas_hoy,
                'citas_este_mes': citas_este_mes,
                'citas_pendientes': citas_pendientes,
                'citas_completadas': citas_completadas
            },
            'estadisticas_ventas': {
                'ventas_hoy': float(ventas_hoy),
                'ventas_este_mes': float(ventas_este_mes),
                'ventas_semana': float(ventas_semana),
                'liquidaciones_este_mes': float(liquidaciones_este_mes)
            },
            'servicios_populares': list(servicios_populares),
            'manicuristas_activas': list(manicuristas_activas),
            'clientes_frecuentes': list(clientes_frecuentes),
            'citas_por_estado': list(citas_por_estado),
            'ventas_por_dia': ventas_por_dia,
            'novedades_recientes': [
                {
                    'id': n.id,
                    'titulo': n.titulo,
                    'descripcion': n.descripcion,
                    'fecha_publicacion': n.fecha_publicacion.isoformat(),
                    'tipo': n.tipo
                } for n in novedades_recientes
            ]
        }
        
        return Response(dashboard_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error obteniendo dashboard: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reportes_avanzados(request):
    """
    Reportes avanzados para el frontend
    """
    try:
        fecha_desde = request.GET.get('fecha_desde')
        fecha_hasta = request.GET.get('fecha_hasta')
        tipo_reporte = request.GET.get('tipo', 'ventas')
        
        # Validar fechas
        if not fecha_desde:
            fecha_desde = (timezone.now().date() - timedelta(days=30)).isoformat()
        if not fecha_hasta:
            fecha_hasta = timezone.now().date().isoformat()
        
        reportes = {}
        
        if tipo_reporte == 'ventas':
            # Reporte de ventas
            ventas = VentaServicio.objects.filter(
                fecha_venta__date__range=[fecha_desde, fecha_hasta]
            )
            
            reportes['ventas'] = {
                'total_ventas': ventas.count(),
                'total_ingresos': float(ventas.aggregate(total=Sum('precio_total'))['total'] or 0),
                'promedio_venta': float(ventas.aggregate(promedio=Avg('precio_total'))['promedio'] or 0),
                'ventas_por_metodo_pago': list(ventas.values('metodo_pago').annotate(
                    total=Count('id'),
                    ingresos=Sum('precio_total')
                )),
                'ventas_por_manicurista': list(ventas.values(
                    'manicurista__nombre'
                ).annotate(
                    total_ventas=Count('id'),
                    total_ingresos=Sum('precio_total')
                ).order_by('-total_ingresos'))
            }
        
        elif tipo_reporte == 'citas':
            # Reporte de citas
            citas = Cita.objects.filter(
                fecha_hora__date__range=[fecha_desde, fecha_hasta]
            )
            
            reportes['citas'] = {
                'total_citas': citas.count(),
                'citas_por_estado': list(citas.values('estado').annotate(
                    total=Count('id')
                )),
                'citas_por_manicurista': list(citas.values(
                    'manicurista__nombre'
                ).annotate(
                    total=Count('id')
                ).order_by('-total')),
                'citas_por_servicio': list(citas.values(
                    'servicio__nombre'
                ).annotate(
                    total=Count('id')
                ).order_by('-total'))
            }
        
        elif tipo_reporte == 'clientes':
            # Reporte de clientes
            clientes = Cliente.objects.filter(estado=True)
            
            reportes['clientes'] = {
                'total_clientes': clientes.count(),
                'clientes_por_genero': list(clientes.values('genero').annotate(
                    total=Count('id')
                )),
                'clientes_mas_activos': list(Cita.objects.filter(
                    fecha_hora__date__range=[fecha_desde, fecha_hasta]
                ).values('cliente__nombre').annotate(
                    total_citas=Count('id')
                ).order_by('-total_citas')[:10])
            }
        
        return Response(reportes, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error generando reportes: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def estadisticas_tiempo_real(request):
    """
    Estadísticas en tiempo real para el frontend
    """
    try:
        ahora = timezone.now()
        hoy = ahora.date()
        
        # Citas en tiempo real
        citas_hoy = Cita.objects.filter(fecha_hora__date=hoy)
        citas_ahora = citas_hoy.filter(
            fecha_hora__time__range=[
                (ahora - timedelta(hours=1)).time(),
                (ahora + timedelta(hours=1)).time()
            ]
        )
        
        # Ventas en tiempo real
        ventas_hoy = VentaServicio.objects.filter(fecha_venta__date=hoy)
        ventas_ultima_hora = ventas_hoy.filter(
            fecha_venta__gte=ahora - timedelta(hours=1)
        )
        
        estadisticas = {
            'timestamp': ahora.isoformat(),
            'citas': {
                'total_hoy': citas_hoy.count(),
                'en_progreso': citas_ahora.count(),
                'pendientes': citas_hoy.filter(estado='pendiente').count(),
                'completadas': citas_hoy.filter(estado='completada').count()
            },
            'ventas': {
                'total_hoy': float(ventas_hoy.aggregate(total=Sum('precio_total'))['total'] or 0),
                'ultima_hora': float(ventas_ultima_hora.aggregate(total=Sum('precio_total'))['total'] or 0),
                'transacciones_hoy': ventas_hoy.count()
            },
            'sistema': {
                'usuarios_activos': Usuario.objects.filter(is_active=True).count(),
                'manicuristas_disponibles': Manicurista.objects.filter(
                    estado='activo'
                ).count()
            }
        }
        
        return Response(estadisticas, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error obteniendo estadísticas: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
