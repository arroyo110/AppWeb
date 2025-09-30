from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Cita, CitaManicurista, CitaServicio
from .serializers_multiple import (
    CitaMultipleSerializer, CitaMultipleMobileSerializer, 
    CitaCrearMultipleSerializer, CitaManicuristaSerializer, CitaServicioSerializer
)
from api.availability.models import Disponibilidad


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_cita_multiple(request):
    """
    Crear cita con múltiples manicuristas y servicios
    """
    try:
        serializer = CitaCrearMultipleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            cita = serializer.save()
            
            # Verificar disponibilidad de todas las manicuristas
            fecha = cita.fecha_cita
            hora = cita.hora_cita
            
            for manicurista_cita in cita.manicuristas_cita.all():
                # Verificar disponibilidad usando el sistema de disponibilidades
                disponibilidad_data = Disponibilidad.objects.calcular_disponibilidad(
                    manicurista_cita.manicurista.id, fecha
                )
                
                if disponibilidad_data:
                    # Verificar si el horario está disponible
                    hora_str = hora.strftime('%H:%M')
                    slot_disponible = False
                    
                    for slot in disponibilidad_data['slots_disponibles']:
                        if slot['inicio'] == hora_str and slot['disponible']:
                            slot_disponible = True
                            break
                    
                    if not slot_disponible:
                        # Si no está disponible, cancelar la creación
                        cita.delete()
                        return Response({
                            'error': f'La manicurista {manicurista_cita.manicurista.nombre} no está disponible en ese horario'
                        }, status=status.HTTP_400_BAD_REQUEST)
            
            # Serializar respuesta
            response_serializer = CitaMultipleSerializer(cita)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        return Response(
            {'error': f'Error creando cita: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_citas_multiple(request):
    """
    Listar citas con información de múltiples manicuristas y servicios
    """
    try:
        # Filtros
        cliente_id = request.GET.get('cliente_id')
        manicurista_id = request.GET.get('manicurista_id')
        fecha_desde = request.GET.get('fecha_desde')
        fecha_hasta = request.GET.get('fecha_hasta')
        estado = request.GET.get('estado')
        
        queryset = Cita.objects.select_related('cliente', 'manicurista', 'servicio').prefetch_related(
            'manicuristas_cita__manicurista',
            'servicios_cita__servicio'
        )
        
        # Aplicar filtros
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        
        if manicurista_id:
            queryset = queryset.filter(manicuristas_cita__manicurista_id=manicurista_id)
        
        if fecha_desde:
            queryset = queryset.filter(fecha_cita__gte=fecha_desde)
        
        if fecha_hasta:
            queryset = queryset.filter(fecha_cita__lte=fecha_hasta)
        
        if estado:
            queryset = queryset.filter(estado=estado)
        
        # Ordenar por fecha
        queryset = queryset.order_by('-fecha_cita', '-hora_cita')
        
        serializer = CitaMultipleSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error listando citas: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_citas_multiple_movil(request):
    """
    Listar citas optimizado para móvil con múltiples relaciones
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
            {'error': f'Error listando citas móvil: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def actualizar_cita_multiple(request, cita_id):
    """
    Actualizar cita con múltiples manicuristas y servicios
    """
    try:
        try:
            cita = Cita.objects.get(id=cita_id)
        except Cita.DoesNotExist:
            return Response(
                {'error': 'Cita no encontrada'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar permisos
        usuario = request.user
        if hasattr(usuario, 'cliente') and cita.cliente != usuario.cliente:
            return Response(
                {'error': 'No tienes permisos para modificar esta cita'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        elif hasattr(usuario, 'manicurista'):
            # Verificar si la manicurista está asignada a la cita
            if not cita.manicuristas_cita.filter(manicurista=usuario.manicurista).exists():
                return Response(
                    {'error': 'No tienes permisos para modificar esta cita'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        serializer = CitaMultipleSerializer(cita, data=request.data, partial=True)
        if serializer.is_valid():
            with transaction.atomic():
                cita_actualizada = serializer.save()
                return Response(
                    CitaMultipleSerializer(cita_actualizada).data, 
                    status=status.HTTP_200_OK
                )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response(
            {'error': f'Error actualizando cita: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agregar_manicurista_cita(request, cita_id):
    """
    Agregar una manicurista a una cita existente
    """
    try:
        try:
            cita = Cita.objects.get(id=cita_id)
        except Cita.DoesNotExist:
            return Response(
                {'error': 'Cita no encontrada'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        manicurista_id = request.data.get('manicurista_id')
        es_principal = request.data.get('es_principal', False)
        orden = request.data.get('orden', cita.manicuristas_cita.count() + 1)
        
        if not manicurista_id:
            return Response(
                {'error': 'Se requiere manicurista_id'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que la manicurista no esté ya asignada
        if cita.manicuristas_cita.filter(manicurista_id=manicurista_id).exists():
            return Response(
                {'error': 'La manicurista ya está asignada a esta cita'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Agregar manicurista
        cita.agregar_manicurista(
            manicurista_id=manicurista_id,
            es_principal=es_principal,
            orden=orden
        )
        
        return Response({
            'mensaje': 'Manicurista agregada exitosamente',
            'cita': CitaMultipleSerializer(cita).data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error agregando manicurista: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agregar_servicio_cita(request, cita_id):
    """
    Agregar un servicio a una cita existente
    """
    try:
        try:
            cita = Cita.objects.get(id=cita_id)
        except Cita.DoesNotExist:
            return Response(
                {'error': 'Cita no encontrada'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        servicio_id = request.data.get('servicio_id')
        cantidad = request.data.get('cantidad', 1)
        orden = request.data.get('orden', cita.servicios_cita.count() + 1)
        
        if not servicio_id:
            return Response(
                {'error': 'Se requiere servicio_id'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que el servicio no esté ya incluido
        if cita.servicios_cita.filter(servicio_id=servicio_id).exists():
            return Response(
                {'error': 'El servicio ya está incluido en esta cita'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Agregar servicio
        cita.agregar_servicio(
            servicio_id=servicio_id,
            cantidad=cantidad,
            orden=orden
        )
        
        return Response({
            'mensaje': 'Servicio agregado exitosamente',
            'cita': CitaMultipleSerializer(cita).data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error agregando servicio: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remover_manicurista_cita(request, cita_id, manicurista_id):
    """
    Remover una manicurista de una cita
    """
    try:
        try:
            cita = Cita.objects.get(id=cita_id)
        except Cita.DoesNotExist:
            return Response(
                {'error': 'Cita no encontrada'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar que la manicurista esté asignada
        if not cita.manicuristas_cita.filter(manicurista_id=manicurista_id).exists():
            return Response(
                {'error': 'La manicurista no está asignada a esta cita'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar que no sea la única manicurista
        if cita.manicuristas_cita.count() <= 1:
            return Response(
                {'error': 'No se puede remover la única manicurista de la cita'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Remover manicurista
        cita.remover_manicurista(manicurista_id=manicurista_id)
        
        return Response({
            'mensaje': 'Manicurista removida exitosamente',
            'cita': CitaMultipleSerializer(cita).data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error removiendo manicurista: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remover_servicio_cita(request, cita_id, servicio_id):
    """
    Remover un servicio de una cita
    """
    try:
        try:
            cita = Cita.objects.get(id=cita_id)
        except Cita.DoesNotExist:
            return Response(
                {'error': 'Cita no encontrada'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar que el servicio esté incluido
        if not cita.servicios_cita.filter(servicio_id=servicio_id).exists():
            return Response(
                {'error': 'El servicio no está incluido en esta cita'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar que no sea el único servicio
        if cita.servicios_cita.count() <= 1:
            return Response(
                {'error': 'No se puede remover el único servicio de la cita'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Remover servicio
        cita.remover_servicio(servicio_id=servicio_id)
        
        return Response({
            'mensaje': 'Servicio removido exitosamente',
            'cita': CitaMultipleSerializer(cita).data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error removiendo servicio: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def disponibilidad_multiple_manicuristas(request):
    """
    Consultar disponibilidad de múltiples manicuristas para una fecha
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
                    'manicurista': disponibilidad_data['manicurista'],
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
            {'error': f'Error consultando disponibilidad múltiple: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
