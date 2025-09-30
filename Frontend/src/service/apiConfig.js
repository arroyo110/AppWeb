import axios from 'axios';

// Configuración base de axios
const apiClient = axios.create({
    baseURL: 'https://appweb-rxph.onrender.com/api/',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para agregar token a todas las peticiones
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar errores 401 y refresh automático
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const refresh = localStorage.getItem('refresh_token');
                if (!refresh) {
                    throw new Error('No hay refresh token disponible');
                }

                const response = await axios.post(`https://appweb-rxph.onrender.com/api/auth/refresh/`, {
                    refresh: refresh
                });
                
                if (response.data.access) {
                    localStorage.setItem('access_token', response.data.access);
                    
                    // Reintentar la petición original
                    originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
                    return apiClient(originalRequest);
                } else {
                    throw new Error('No se recibió un token válido');
                }
            } catch (refreshError) {
                // Refresh falló, limpiar datos de autenticación
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user_info');
                
                // Solo redirigir si no estamos ya en la página de login
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
                
                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);

// Configuración de la API
export const apiConfig = {
    baseURL: 'https://appweb-rxph.onrender.com/api/',
};

export default apiClient;
