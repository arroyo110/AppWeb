"""
Configuración específica para la API móvil de WineSpa
"""

# Configuración de paginación para móvil
MOBILE_PAGINATION = {
    'PAGE_SIZE': 20,
    'MAX_PAGE_SIZE': 50,
}

# Configuración de cache para móvil
MOBILE_CACHE_TIMEOUT = 300  # 5 minutos

# Endpoints que requieren autenticación
PROTECTED_ENDPOINTS = [
    'dashboard/',
    'perfil/',
    'citas/',
    'liquidaciones/',
    'insumos/',
]

# Endpoints públicos
PUBLIC_ENDPOINTS = [
    'servicios/',
    'novedades/',
]

# Configuración de respuestas móviles
MOBILE_RESPONSE_CONFIG = {
    'INCLUDE_METADATA': True,
    'COMPRESS_RESPONSES': True,
    'CACHE_HEADERS': True,
}

# Configuración de notificaciones push (para implementación futura)
PUSH_NOTIFICATIONS = {
    'ENABLED': False,
    'FIREBASE_SERVER_KEY': '',
    'FCM_ENDPOINT': 'https://fcm.googleapis.com/fcm/send',
}
