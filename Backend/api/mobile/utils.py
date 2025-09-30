from django.core.cache import cache
from django.db import models
from django.utils import timezone
from datetime import timedelta
import json


def get_mobile_cache_key(endpoint, user_id=None, params=None):
    """
    Genera una clave de cache específica para endpoints móviles
    """
    key_parts = ['mobile', endpoint]
    
    if user_id:
        key_parts.append(f'user_{user_id}')
    
    if params:
        # Crear hash de parámetros para evitar claves muy largas
        params_str = json.dumps(params, sort_keys=True)
        key_parts.append(f'params_{hash(params_str)}')
    
    return ':'.join(key_parts)


def cache_mobile_response(cache_key, data, timeout=300):
    """
    Cachea una respuesta móvil
    """
    try:
        cache.set(cache_key, data, timeout)
        return True
    except Exception as e:
        print(f"Error cacheando respuesta móvil: {e}")
        return False


def get_cached_mobile_response(cache_key):
    """
    Obtiene una respuesta móvil del cache
    """
    try:
        return cache.get(cache_key)
    except Exception as e:
        print(f"Error obteniendo respuesta del cache: {e}")
        return None


def format_mobile_response(data, metadata=None):
    """
    Formatea una respuesta para móvil con metadatos
    """
    response = {
        'data': data,
        'timestamp': timezone.now().isoformat(),
        'mobile_optimized': True
    }
    
    if metadata:
        response['metadata'] = metadata
    
    return response


def get_mobile_pagination_params(request):
    """
    Obtiene parámetros de paginación para móvil
    """
    page = int(request.GET.get('page', 1))
    page_size = min(int(request.GET.get('page_size', 20)), 50)  # Máximo 50 items
    
    return {
        'page': page,
        'page_size': page_size,
        'offset': (page - 1) * page_size
    }


def paginate_mobile_response(queryset, page, page_size):
    """
    Pagina un queryset para respuesta móvil
    """
    total = queryset.count()
    offset = (page - 1) * page_size
    
    items = queryset[offset:offset + page_size]
    
    return {
        'items': items,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': (total + page_size - 1) // page_size,
            'has_next': offset + page_size < total,
            'has_previous': page > 1
        }
    }


def get_user_statistics(user):
    """
    Obtiene estadísticas del usuario para móvil
    """
    stats = {}
    
    if hasattr(user, 'cliente'):
        cliente = user.cliente
        
        # Estadísticas del cliente
        hoy = timezone.now().date()
        este_mes = hoy.replace(day=1)
        
        stats = {
            'total_citas': models.Count('cita', filter=models.Q(cita__cliente=cliente)),
            'citas_este_mes': models.Count('cita', filter=models.Q(
                cita__cliente=cliente,
                cita__fecha_hora__date__gte=este_mes
            )),
            'citas_hoy': models.Count('cita', filter=models.Q(
                cita__cliente=cliente,
                cita__fecha_hora__date=hoy
            )),
            'ultima_cita': None
        }
        
        # Obtener última cita
        ultima_cita = cliente.cita_set.order_by('-fecha_hora').first()
        if ultima_cita:
            stats['ultima_cita'] = {
                'fecha': ultima_cita.fecha_hora.isoformat(),
                'servicio': ultima_cita.servicio.nombre,
                'estado': ultima_cita.estado
            }
    
    elif hasattr(user, 'manicurista'):
        manicurista = user.manicurista
        
        # Estadísticas de la manicurista
        hoy = timezone.now().date()
        este_mes = hoy.replace(day=1)
        
        stats = {
            'total_citas': models.Count('cita', filter=models.Q(cita__manicurista=manicurista)),
            'citas_este_mes': models.Count('cita', filter=models.Q(
                cita__manicurista=manicurista,
                cita__fecha_hora__date__gte=este_mes
            )),
            'citas_hoy': models.Count('cita', filter=models.Q(
                cita__manicurista=manicurista,
                cita__fecha_hora__date=hoy
            )),
            'citas_pendientes': models.Count('cita', filter=models.Q(
                cita__manicurista=manicurista,
                cita__estado='pendiente'
            )),
            'total_ventas': models.Sum('ventaservicio__precio_total', filter=models.Q(
                ventaservicio__manicurista=manicurista
            ))
        }
    
    return stats


def validate_mobile_request(request):
    """
    Valida que la petición sea de una aplicación móvil
    """
    user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
    mobile_indicators = ['mobile', 'android', 'iphone', 'ipad', 'app']
    
    return any(indicator in user_agent for indicator in mobile_indicators)


def get_mobile_headers():
    """
    Retorna headers específicos para respuestas móviles
    """
    return {
        'X-Mobile-API': 'true',
        'X-Content-Type': 'application/json',
        'X-Cache-Control': 'public, max-age=300',
        'X-Mobile-Optimized': 'true'
    }
