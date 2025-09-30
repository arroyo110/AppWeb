from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from datetime import datetime, date, timedelta
from .models import Disponibilidad, HorarioTrabajo
from .serializers import (
    DisponibilidadSerializer, DisponibilidadDetalleSerializer,
    DisponibilidadMovilSerializer, DisponibilidadConsultaSerializer,
    DisponibilidadMasivaSerializer, HorarioTrabajoSerializer
)
from api.manicuristas.models import Manicurista
from api.novedades.models import Novedad
from api.citas.models import Cita


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def consultar_disponibilidad(request):
    """
    Consultar disponibilidad de una manicurista en una fecha específica
    """
    try:
        manicurista_id = request.GET.get('manicurista_id')
        fecha_str = request.GET.get('fecha')
        
        if not manicurista_id or not fecha_str:
            return Response(
                {'error': 'Se requiere manicurista_id y fecha'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar fecha
        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calcular disponibilidad
        disponibilidad_data = Disponibilidad.objects.calcular_disponibilidad(
            manicurista_id, fecha
        )
        
        if not disponibilidad_data:
            return Response(
                {'error': 'No se pudo calcular la disponibilidad'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(disponibilidad_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error consultando disponibilidad: {str(e)}'}, 
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
        
        # Calcular disponibilidad
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
def disponibilidad_masiva(request):
    """
    Consultar disponibilidad de múltiples manicuristas en un rango de fechas
    """
    try:
        manicuristas_ids = request.GET.getlist('manicuristas_ids')
        fecha_inicio_str = request.GET.get('fecha_inicio')
        fecha_fin_str = request.GET.get('fecha_fin')
        
        if not manicuristas_ids or not fecha_inicio_str or not fecha_fin_str:
            return Response(
                {'error': 'Se requiere manicuristas_ids, fecha_inicio y fecha_fin'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
            fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar rango de fechas
        if fecha_fin < fecha_inicio:
            return Response(
                {'error': 'La fecha fin debe ser posterior a la fecha inicio'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calcular disponibilidad para cada manicurista y fecha
        disponibilidades = []
        
        for manicurista_id in manicuristas_ids:
            try:
                manicurista = Manicurista.objects.get(id=manicurista_id)
                manicurista_disponibilidades = []
                
                current_date = fecha_inicio
                while current_date <= fecha_fin:
                    disponibilidad_data = Disponibilidad.objects.calcular_disponibilidad(
                        manicurista_id, current_date
                    )
                    
                    if disponibilidad_data:
                        # Optimizar para respuesta masiva
                        slots_disponibles = [slot for slot in disponibilidad_data['slots_disponibles'] if slot['disponible']]
                        
                        manicurista_disponibilidades.append({
                            'fecha': current_date.isoformat(),
                            'slots_disponibles': slots_disponibles,
                            'resumen': {
                                'total': len(disponibilidad_data['slots_disponibles']),
                                'disponibles': len(slots_disponibles),
                                'ocupados': len(disponibilidad_data['slots_disponibles']) - len(slots_disponibles)
                            }
                        })
                    
                    current_date += timedelta(days=1)
                
                disponibilidades.append({
                    'manicurista': {
                        'id': manicurista.id,
                        'nombre': manicurista.nombre,
                        'especialidad': manicurista.especialidad
                    },
                    'disponibilidades': manicurista_disponibilidades
                })
                
            except Manicurista.DoesNotExist:
                continue
        
        return Response({
            'fecha_inicio': fecha_inicio.isoformat(),
            'fecha_fin': fecha_fin.isoformat(),
            'disponibilidades': disponibilidades
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error consultando disponibilidad masiva: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def proximos_horarios_disponibles(request):
    """
    Obtener los próximos horarios disponibles para una manicurista
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
        hoy = date.today()
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
def disponibilidad_por_especialidad(request):
    """
    Obtener disponibilidad agrupada por especialidad
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
def actualizar_disponibilidades(request):
    """
    Actualizar todas las disponibilidades para una fecha específica
    """
    try:
        fecha_str = request.data.get('fecha')
        
        if not fecha_str:
            return Response(
                {'error': 'Se requiere fecha'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener todas las manicuristas activas
        manicuristas = Manicurista.objects.filter(estado='activo')
        
        actualizadas = 0
        errores = []
        
        for manicurista in manicuristas:
            try:
                # Calcular disponibilidad
                disponibilidad_data = Disponibilidad.objects.calcular_disponibilidad(
                    manicurista.id, fecha
                )
                
                if disponibilidad_data:
                    # Crear o actualizar registro de disponibilidad
                    disponibilidad, created = Disponibilidad.objects.update_or_create(
                        manicurista=manicurista,
                        fecha=fecha,
                        defaults={
                            'horario_inicio': datetime.strptime(disponibilidad_data['horario_base']['inicio'], '%H:%M').time(),
                            'horario_fin': datetime.strptime(disponibilidad_data['horario_base']['fin'], '%H:%M').time(),
                            'slots_disponibles': disponibilidad_data['slots_disponibles'],
                            'resumen': disponibilidad_data['resumen']
                        }
                    )
                    actualizadas += 1
                else:
                    errores.append(f"No se pudo calcular disponibilidad para {manicurista.nombre}")
                    
            except Exception as e:
                errores.append(f"Error con {manicurista.nombre}: {str(e)}")
        
        return Response({
            'fecha': fecha.isoformat(),
            'actualizadas': actualizadas,
            'errores': errores,
            'mensaje': f'Se actualizaron {actualizadas} disponibilidades'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error actualizando disponibilidades: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def slots(request):
	"""
	Endpoint compatible con el frontend: /api/availability/slots?professionalIds=1,2&date=YYYY-MM-DD&durationMinutes=30
	Devuelve lista de slots disponibles para cada profesional solicitado.
	"""
	try:
		ids_param = request.GET.get('professionalIds')
		date_str = request.GET.get('date')
		_ = request.GET.get('durationMinutes')  # por ahora no se usa en el cálculo base
		
		if not ids_param or not date_str:
			return Response({'error': 'Se requiere professionalIds y date'}, status=status.HTTP_400_BAD_REQUEST)
		
		try:
			fecha = datetime.strptime(date_str, '%Y-%m-%d').date()
		except ValueError:
			return Response({'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
		
		ids = [i.strip() for i in ids_param.split(',') if i.strip()]
		resultado = []
		for manicurista_id in ids:
			data = Disponibilidad.objects.calcular_disponibilidad(manicurista_id, fecha)
			if data:
				disponibles = [slot for slot in data['slots_disponibles'] if slot['disponible']]
				resultado.append({
					'professionalId': int(manicurista_id),
					'date': date_str,
					'slots': [s['inicio'] for s in disponibles]
				})
		
		return Response({'results': resultado}, status=status.HTTP_200_OK)
	except Exception as e:
		return Response({'error': f'Error obteniendo slots: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

