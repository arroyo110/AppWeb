from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
import json


class MobileOptimizationMiddleware(MiddlewareMixin):
    """
    Middleware para optimizar respuestas para aplicaciones móviles
    """
    
    def process_response(self, request, response):
        # Solo aplicar a endpoints móviles
        if not request.path.startswith('/api/mobile/'):
            return response
        
        # Agregar headers específicos para móvil
        if hasattr(response, 'data') and isinstance(response.data, dict):
            # Comprimir datos si es necesario
            if len(str(response.data)) > 1000:  # Si la respuesta es grande
                response['X-Mobile-Optimized'] = 'true'
                response['X-Response-Size'] = str(len(str(response.data)))
        
        # Headers de cache para móvil
        if request.method == 'GET':
            response['Cache-Control'] = 'public, max-age=300'  # 5 minutos
            response['X-Mobile-Cache'] = 'enabled'
        
        # Headers de compresión
        response['X-Content-Encoding'] = 'gzip'
        
        return response


class MobileSecurityMiddleware(MiddlewareMixin):
    """
    Middleware de seguridad específico para aplicaciones móviles
    """
    
    def process_request(self, request):
        # Solo aplicar a endpoints móviles
        if not request.path.startswith('/api/mobile/'):
            return None
        
        # Verificar User-Agent móvil
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
        mobile_indicators = ['mobile', 'android', 'iphone', 'ipad', 'app']
        
        if not any(indicator in user_agent for indicator in mobile_indicators):
            # Permitir pero agregar header de advertencia
            request.mobile_warning = True
        
        # Headers de seguridad para móvil
        request.META['X-Mobile-API'] = 'true'
        
        return None
    
    def process_response(self, request, response):
        # Solo aplicar a endpoints móviles
        if not request.path.startswith('/api/mobile/'):
            return response
        
        # Headers de seguridad
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-Mobile-Security'] = 'enabled'
        
        # Si hay advertencia de móvil, agregar header
        if hasattr(request, 'mobile_warning'):
            response['X-Mobile-Warning'] = 'Non-mobile user agent detected'
        
        return response
