from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from .models import VentaServicio, DetalleVentaServicio
from .serializers import (
    VentaServicioSerializer,
    VentaServicioCreateSerializer,
    VentaServicioUpdateSerializer,
    VentaServicioUpdateEstadoSerializer,
    VentaServicioEditarServiciosSerializer,
    AgregarServicioVentaSerializer,
    EliminarServicioVentaSerializer,
    DetalleVentaServicioSerializer
)


class VentaServicioViewSet(viewsets.ModelViewSet):
    queryset = VentaServicio.objects.all()
    serializer_class = VentaServicioSerializer

    def get_serializer_class(self):
        """Retorna el serializer apropiado según la acción"""
        if self.action == 'create':
            return VentaServicioCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return VentaServicioUpdateSerializer
        elif self.action == 'actualizar_estado':
            return VentaServicioUpdateEstadoSerializer
        elif self.action in ['editar_servicios', 'ver_detalles']:
            return VentaServicioEditarServiciosSerializer
        elif self.action == 'agregar_servicio':
            return AgregarServicioVentaSerializer
        elif self.action == 'eliminar_servicio':
            return EliminarServicioVentaSerializer
        return VentaServicioSerializer

    def get_queryset(self):
        """Filtrar ventas según parámetros de consulta"""
        queryset = VentaServicio.objects.select_related(
            'cliente', 'manicurista', 'cita' # 'servicio' ya no es el principal
        ).prefetch_related('citas', 'detalles__servicio').all() # Cargar detalles y sus servicios
        
        # Filtros
        estado = self.request.query_params.get('estado')
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        manicurista_id = self.request.query_params.get('manicurista')
        cliente_id = self.request.query_params.get('cliente')
        metodo_pago = self.request.query_params.get('metodo_pago')
        
        if estado:
            queryset = queryset.filter(estado=estado)
        
        if fecha_desde:
            try:
                fecha_desde = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_venta__date__gte=fecha_desde)
            except ValueError:
                pass
        
        if fecha_hasta:
            try:
                fecha_hasta = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_venta__date__lte=fecha_hasta)
            except ValueError:
                pass
        
        if manicurista_id:
            queryset = queryset.filter(manicurista_id=manicurista_id)
        
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        
        if metodo_pago:
            queryset = queryset.filter(metodo_pago=metodo_pago)
        
        return queryset.order_by('-fecha_venta')

    def create(self, request, *args, **kwargs):
        """Crear nueva venta con múltiples citas y detalles de servicio"""
        print("Datos recibidos para crear venta:", request.data)
        
        # Procesar citas del frontend
        data = request.data.copy()
        
        # Si viene 'citas' como array, usarlo
        if 'citas' in data and isinstance(data['citas'], list):
            citas_ids = [int(cid) for cid in data['citas'] if str(cid).isdigit()]
            data['citas'] = citas_ids
            
            # Si no hay cita principal, usar la primera
            if not data.get('cita') and citas_ids:
                data['cita'] = citas_ids[0]
        
        # Si solo viene 'cita', crear array con esa cita
        elif 'cita' in data and not data.get('citas'):
            data['citas'] = [int(data['cita'])]
        
        print("Datos procesados:", data)
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        venta = serializer.save()
        
        # Retornar con información completa
        response_serializer = VentaServicioSerializer(venta)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Actualizar venta con múltiples citas y detalles de servicio"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Procesar citas del frontend
        data = request.data.copy()
        
        if 'citas' in data and isinstance(data['citas'], list):
            citas_ids = [int(cid) for cid in data['citas'] if str(cid).isdigit()]
            data['citas'] = citas_ids
            
            # Si no hay cita principal, usar la primera
            if not data.get('cita') and citas_ids:
                data['cita'] = citas_ids[0]
        
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        venta = serializer.save()
        
        # Retornar con información completa
        response_serializer = VentaServicioSerializer(venta)
        return Response(response_serializer.data)

    @action(detail=True, methods=['patch'])
    def actualizar_estado(self, request, pk=None):
        """Actualizar estado de la venta como en citas"""
        venta = self.get_object()
        
        print(f"Actualizando estado de venta {pk}:", request.data)
        
        serializer = VentaServicioUpdateEstadoSerializer(venta, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        venta_actualizada = serializer.save()
        
        print(f"Venta {pk} actualizada a estado:", venta_actualizada.estado)
        
        response_serializer = VentaServicioSerializer(venta_actualizada)
        return Response(response_serializer.data)

    @action(detail=False, methods=['get'])
    def ventas_hoy(self, request):
        """Obtener ventas de hoy"""
        hoy = timezone.now().date()
        ventas = self.get_queryset().filter(fecha_venta__date=hoy)
        serializer = self.get_serializer(ventas, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def ventas_pendientes(self, request):
        """Obtener ventas pendientes de pago"""
        ventas = self.get_queryset().filter(estado='pendiente')
        serializer = self.get_serializer(ventas, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas de ventas"""
        hoy = timezone.now().date()
        inicio_mes = hoy.replace(day=1)
        
        # Estadísticas generales
        total_ventas = self.get_queryset().count()
        ventas_hoy = self.get_queryset().filter(fecha_venta__date=hoy).count()
        ventas_pendientes = self.get_queryset().filter(estado='pendiente').count()
        ventas_mes = self.get_queryset().filter(fecha_venta__date__gte=inicio_mes).count()
        
        # Ingresos
        ingresos_hoy = self.get_queryset().filter(
            fecha_venta__date=hoy,
            estado='pagada'
        ).aggregate(total=Sum('total'))['total'] or 0
        
        ingresos_mes = self.get_queryset().filter(
            fecha_venta__date__gte=inicio_mes,
            estado='pagada'
        ).aggregate(total=Sum('total'))['total'] or 0
        
        # Ventas por estado
        por_estado = self.get_queryset().values('estado').annotate(
            count=Count('id'),
            total_ingresos=Sum('total')
        ).order_by('estado')
        
        # Ventas por método de pago (solo efectivo y transferencia)
        por_metodo_pago = self.get_queryset().filter(
            estado='pagada'
        ).values('metodo_pago').annotate(
            count=Count('id'),
            total=Sum('total')
        ).order_by('-total')
        
        # Servicios más vendidos (a través de detalles)
        servicios_top = DetalleVentaServicio.objects.filter(
            venta__estado='pagada'
        ).values(
            'servicio__nombre'
        ).annotate(
            total_vendido=Sum('cantidad'),
            ingresos=Sum('subtotal')
        ).order_by('-total_vendido')[:10]
        
        # Manicuristas con más ventas
        manicuristas_top = self.get_queryset().values(
            'manicurista__nombres', 'manicurista__apellidos'
        ).annotate(
            total_ventas=Count('id'),
            total_ingresos=Sum('total'),
            total_comisiones=Sum('comision_manicurista')
        ).order_by('-total_ventas')[:10]
        
        return Response({
            'total_ventas': total_ventas,
            'ventas_hoy': ventas_hoy,
            'ventas_pendientes': ventas_pendientes,
            'ventas_mes': ventas_mes,
            'ingresos_hoy': float(ingresos_hoy),
            'ingresos_mes': float(ingresos_mes),
            'por_estado': list(por_estado),
            'por_metodo_pago': list(por_metodo_pago),
            'servicios_top': list(servicios_top),
            'manicuristas_top': list(manicuristas_top)
        })

    @action(detail=False, methods=['get'])
    def reporte_comisiones(self, request):
        """Reporte de comisiones por manicurista"""
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        
        queryset = self.get_queryset().filter(estado='pagada')
        
        if fecha_desde:
            try:
                fecha_desde = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_venta__date__gte=fecha_desde)
            except ValueError:
                pass
        
        if fecha_hasta:
            try:
                fecha_hasta = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha_venta__date__lte=fecha_hasta)
            except ValueError:
                pass
        
        comisiones = queryset.values(
            'manicurista__id',
            'manicurista__nombres',
            'manicurista__apellidos'
        ).annotate(
            total_ventas=Count('id'),
            total_ingresos=Sum('total'),
            total_comisiones=Sum('comision_manicurista'),
            promedio_venta=Avg('total')
        ).order_by('-total_comisiones')
        
        return Response(list(comisiones))

    @action(detail=False, methods=['get'])
    def ventas_desde_citas(self, request):
        """Obtener ventas que fueron creadas desde citas"""
        ventas = self.get_queryset().filter(
            Q(cita__isnull=False) | Q(citas__isnull=False)
        ).distinct()
        serializer = self.get_serializer(ventas, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def metodos_pago_disponibles(self, request):
        """Obtener métodos de pago disponibles"""
        return Response({
            'metodos': [
                {'value': 'efectivo', 'label': 'Efectivo'},
                {'value': 'transferencia', 'label': 'Transferencia'},
            ]
        })

    @action(detail=True, methods=['get'])
    def ver_detalles(self, request, pk=None):
        """Ver detalles completos de una venta"""
        venta = self.get_object()
        serializer = VentaServicioEditarServiciosSerializer(venta)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def editar_servicios(self, request, pk=None):
        """Obtener información para editar servicios de una venta"""
        venta = self.get_object()
        
        # Verificar que la venta esté en estado pendiente
        if venta.estado != 'pendiente':
            return Response({
                'error': 'Solo se pueden editar servicios en ventas pendientes'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = VentaServicioEditarServiciosSerializer(venta)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def agregar_servicio(self, request, pk=None):
        """Agregar un servicio a una venta existente"""
        venta = self.get_object()
        
        # Verificar que la venta esté en estado pendiente
        if venta.estado != 'pendiente':
            return Response({
                'error': 'Solo se pueden agregar servicios en ventas pendientes'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = AgregarServicioVentaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Crear el detalle del servicio
        detalle_data = serializer.validated_data
        detalle_data['venta'] = venta
        
        # Calcular subtotal
        precio_unitario = detalle_data.get('precio_unitario', 0)
        cantidad = detalle_data.get('cantidad', 1)
        descuento_linea = detalle_data.get('descuento_linea', 0)
        detalle_data['subtotal'] = (precio_unitario * cantidad) - descuento_linea
        
        detalle = DetalleVentaServicio.objects.create(**detalle_data)
        
        # La señal post_save actualizará automáticamente el total de la venta
        return Response({
            'mensaje': 'Servicio agregado correctamente',
            'detalle': DetalleVentaServicioSerializer(detalle).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'])
    def eliminar_servicio(self, request, pk=None):
        """Eliminar un servicio de una venta existente"""
        venta = self.get_object()
        
        # Verificar que la venta esté en estado pendiente
        if venta.estado != 'pendiente':
            return Response({
                'error': 'Solo se pueden eliminar servicios en ventas pendientes'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = EliminarServicioVentaSerializer(
            data=request.data, 
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        detalle_id = serializer.validated_data['detalle_id']
        
        try:
            detalle = DetalleVentaServicio.objects.get(id=detalle_id, venta=venta)
            servicio_nombre = detalle.servicio.nombre
            detalle.delete()
            
            # La señal post_delete actualizará automáticamente el total de la venta
            return Response({
                'mensaje': f'Servicio "{servicio_nombre}" eliminado correctamente'
            }, status=status.HTTP_200_OK)
            
        except DetalleVentaServicio.DoesNotExist:
            return Response({
                'error': 'El detalle de servicio no existe o no pertenece a esta venta'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['patch'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado de la venta (pendiente → pagada)"""
        venta = self.get_object()
        
        # Solo permitir cambiar de pendiente a pagada
        if venta.estado != 'pendiente':
            return Response({
                'error': f'No se puede cambiar el estado de una venta {venta.estado}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        nuevo_estado = request.data.get('estado')
        if nuevo_estado != 'pagada':
            return Response({
                'error': 'Solo se puede cambiar a estado "pagada"'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validar que se proporcione método de pago
        metodo_pago = request.data.get('metodo_pago')
        if not metodo_pago:
            return Response({
                'error': 'Debe seleccionar un método de pago'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Actualizar la venta
        venta.estado = 'pagada'
        venta.metodo_pago = metodo_pago
        venta.fecha_pago = timezone.now()
        venta.save()
        
        serializer = VentaServicioSerializer(venta)
        return Response({
            'mensaje': 'Venta marcada como pagada correctamente',
            'venta': serializer.data
        }, status=status.HTTP_200_OK)
