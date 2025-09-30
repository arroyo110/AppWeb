import axios from 'axios';
import apiClient, { apiConfig } from './apiConfig';

const API_BASE_URL = (apiConfig?.baseURL || 'https://appweb-rxph.onrender.com/api/').replace(/\/$/, '');

// Configurar axios para incluir el token en todas las peticiones
axios.interceptors.request.use(
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

class PermisosService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    /**
     * Obtener todos los permisos de un usuario
     * @param {number} usuarioId - ID del usuario
     * @returns {Promise<Object>} - Permisos del usuario
     */
    async obtenerPermisosUsuario(usuarioId) {
        try {
            const response = await axios.get(`${API_BASE_URL}/roles/permisos_usuario/`, {
                params: { usuario_id: usuarioId }
            });
            return response.data;
        } catch (error) {
            console.error('Error al obtener permisos del usuario:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los módulos disponibles
     * @returns {Promise<Array>} - Lista de módulos
     */
    async obtenerModulos() {
        try {
            const response = await axios.get(`${API_BASE_URL}/roles/modulos/`);
            return response.data;
        } catch (error) {
            console.error('Error al obtener módulos:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las acciones disponibles
     * @returns {Promise<Array>} - Lista de acciones
     */
    async obtenerAcciones() {
        try {
            const response = await axios.get(`${API_BASE_URL}/roles/acciones/`);
            return response.data;
        } catch (error) {
            console.error('Error al obtener acciones:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los permisos organizados por módulos
     * @returns {Promise<Object>} - Permisos organizados por módulo
     */
    async obtenerPermisosPorModulos() {
        try {
            const response = await axios.get(`${API_BASE_URL}/roles/permisos/`);
            const permisos = response.data;
            
            // Organizar permisos por módulo
            const permisosPorModulo = {};
            
            permisos.forEach(permiso => {
                // Mapeo específico para módulos con guiones bajos
                const moduloAccionMap = {
                    'categoria_insumos': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'venta_servicios': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'abastecimientos': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'liquidaciones': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'manicuristas': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'novedades': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'proveedores': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'compras': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'insumos': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'servicios': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'clientes': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'citas': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'roles': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'usuarios': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
                    'dashboard': ['listar']
                };

                let modulo, accion;
                
                // Buscar el módulo correcto
                for (const [moduloNombre, acciones] of Object.entries(moduloAccionMap)) {
                    if (permiso.nombre.startsWith(moduloNombre + '_')) {
                        modulo = moduloNombre;
                        accion = permiso.nombre.substring(moduloNombre.length + 1);
                        break;
                    }
                }
                
                // Si no se encontró en el mapeo, usar la lógica original
                if (!modulo) {
                    const parts = permiso.nombre.split('_');
                    accion = parts.pop();
                    modulo = parts.join('_');
                }
                
                if (!permisosPorModulo[modulo]) {
                    permisosPorModulo[modulo] = {
                        nombre: modulo,
                        acciones: {}
                    };
                }
                permisosPorModulo[modulo].acciones[accion] = {
                    id: permiso.id,
                    nombre: permiso.nombre,
                    descripcion: permiso.descripcion || ''
                };
            });
            
            return permisosPorModulo;
        } catch (error) {
            console.error('Error al obtener permisos por módulos:', error);
            throw error;
        }
    }

    /**
     * Verificar si un usuario tiene un permiso específico
     * @param {number} usuarioId - ID del usuario
     * @param {string} permisoNombre - Nombre del permiso a verificar
     * @returns {Promise<Object>} - Resultado de la verificación
     */
    async verificarPermiso(usuarioId, permisoNombre) {
        try {
            const response = await axios.get(`${API_BASE_URL}/roles/verificar_permiso/`, {
                params: { 
                    usuario_id: usuarioId,
                    permiso_nombre: permisoNombre
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al verificar permiso:', error);
            throw error;
        }
    }

    /**
     * Verificar si el usuario actual tiene un permiso específico
     * @param {string} permisoNombre - Nombre del permiso a verificar
     * @returns {Promise<boolean>} - true si tiene el permiso, false si no
     */
    async usuarioTienePermiso(permisoNombre) {
        try {
            const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
            if (!userInfo.id) {
                return false;
            }

            const resultado = await this.verificarPermiso(userInfo.id, permisoNombre);
            return resultado.tiene_permiso;
        } catch (error) {
            console.error('Error al verificar permiso del usuario actual:', error);
            return false;
        }
    }

    /**
     * Obtener permisos del usuario actual
     * @returns {Promise<Array>} - Lista de permisos del usuario
     */
    async obtenerPermisosUsuarioActual() {
        try {
            const token = localStorage.getItem('access_token');
            const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
            
            if (!token || !userInfo.id) {
                return [];
            }

            const response = await axios.get(`${this.baseURL}/roles/permisos_usuario/?usuario_id=${userInfo.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Error al obtener permisos');
            
            const data = response.data;
            return data.permisos ? data.permisos.map(permiso => permiso.nombre) : [];
        } catch (error) {
            console.error('Error obteniendo permisos:', error);
            return [];
        }
    }

    /**
     * Verificar si el usuario tiene un permiso específico
     * @param {string} permiso - Nombre del permiso
     * @returns {Promise<boolean>} - true si tiene el permiso
     */
    async tienePermiso(permiso) {
        const permisos = await this.obtenerPermisosUsuarioActual();
        return permisos.includes(permiso);
    }

    /**
     * Verificar si el usuario tiene cualquiera de los permisos
     * @param {Array} permisos - Array de permisos
     * @returns {Promise<boolean>} - true si tiene al menos uno
     */
    async tieneAlgunPermiso(permisos) {
        const permisosUsuario = await this.obtenerPermisosUsuarioActual();
        return permisos.some(permiso => permisosUsuario.includes(permiso));
    }

    /**
     * Verificar si el usuario tiene todos los permisos
     * @param {Array} permisos - Array de permisos
     * @returns {Promise<boolean>} - true si tiene todos
     */
    async tieneTodosLosPermisos(permisos) {
        const permisosUsuario = await this.obtenerPermisosUsuarioActual();
        return permisos.every(permiso => permisosUsuario.includes(permiso));
    }

    /**
     * Obtener permisos por módulo
     * @param {string} modulo - Nombre del módulo
     * @returns {Promise<Array>} - Permisos del módulo
     */
    async obtenerPermisosPorModulo(modulo) {
        const permisos = await this.obtenerPermisosUsuarioActual();
        return permisos.filter(permiso => permiso.startsWith(`${modulo}_`));
    }

    /**
     * Verificar acceso a una ruta específica
     * @param {string} ruta - Ruta a verificar
     * @param {string} metodo - Método HTTP
     * @returns {Promise<boolean>} - true si puede acceder
     */
    async puedeAccederARuta(ruta, metodo = 'GET') {
        const mapeoRutas = {
            '/usuarios': 'usuarios',
            '/clientes': 'clientes',
            '/manicuristas': 'manicuristas',
            '/roles': 'roles',
            '/citas': 'citas',
            '/servicios': 'servicios',
            '/insumos': 'insumos',
            '/categoria-insumos': 'categoria_insumos',
            '/compras': 'compras',
            '/proveedores': 'proveedores',
            '/abastecimientos': 'abastecimientos',
            '/venta-servicios': 'venta_servicios',
            '/liquidaciones': 'liquidaciones',
            '/novedades': 'novedades',
            '/dashboard': 'dashboard'
        };

        const mapeoMetodos = {
            'GET': ruta.endsWith('/') ? 'listar' : 'ver_detalles',
            'POST': 'crear',
            'PUT': 'editar',
            'PATCH': 'editar',
            'DELETE': 'eliminar'
        };

        const modulo = mapeoRutas[ruta];
        const accion = mapeoMetodos[metodo] || 'listar';
        
        if (!modulo) return true; // Ruta no protegida
        
        const permiso = `${modulo}_${accion}`;
        return await this.tienePermiso(permiso);
    }

    /**
     * Obtener ID del usuario actual
     * @returns {number|null} - ID del usuario
     */
    getUserId() {
        const user = JSON.parse(localStorage.getItem('user_info') || '{}');
        return user.id || null;
    }

    /**
     * Mapeo de rutas a permisos requeridos
     */
    getRutasPermisos() {
        return {
            '/dashboard': 'dashboard_listar',
            '/usuarios': 'usuarios_listar',
            '/roles': 'roles_listar',
            '/abastecimientos': 'abastecimientos_listar',
            '/abastecimiento': 'abastecimientos_listar',
            '/categoria-insumos': 'categoria_insumos_listar',
            '/citas': 'citas_listar',
            '/clientes': 'clientes_listar',
            '/compras': 'compras_listar',
            '/compra-insumo': 'compras_listar',
            '/insumos': 'insumos_listar',
            '/insumo-abastecimiento': 'abastecimientos_listar',
            '/liquidaciones': 'liquidaciones_listar',
            '/liquidacion': 'liquidaciones_listar',
            '/manicuristas': 'manicuristas_listar',
            '/novedades': 'novedades_listar',
            '/proveedores': 'proveedores_listar',
            '/servicios': 'servicios_listar',
            '/venta-servicios': 'venta_servicios_listar',
            '/ventas-servicio': 'venta_servicios_listar'
        };
    }

    /**
     * Verificar si el usuario actual puede acceder a una ruta específica
     * @param {string} ruta - Ruta a verificar (ej: '/usuarios', '/roles')
     * @returns {Promise<boolean>} - true si puede acceder, false si no
     */
    async puedeAccederARuta(ruta) {
        try {
            const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
            
            // Si no hay usuario, no puede acceder
            if (!userInfo.id) {
                return false;
            }

            // Si es administrador, puede acceder a todo
            if (userInfo.rol && userInfo.rol.toLowerCase() === 'administrador') {
                return true;
            }

            // Si es cliente, solo puede acceder a rutas específicas
            if (userInfo.rol && userInfo.rol.toLowerCase() === 'cliente') {
                const rutasPermitidas = ['/dashboard', '/usuarios', '/clientes', '/citas', '/servicios', '/venta-servicios', '/reservar-cita'];
                return rutasPermitidas.includes(ruta);
            }

            // Para otros roles, verificar permisos específicos usando los nombres correctos
            const rutasPermisos = this.getRutasPermisos();
            const permisoRequerido = rutasPermisos[ruta];
            
            if (!permisoRequerido) {
                return false;
            }

            return await this.usuarioTienePermiso(permisoRequerido);
        } catch (error) {
            console.error('Error al verificar acceso a ruta:', error);
            return false;
        }
    }

    /**
     * Obtener todas las rutas a las que puede acceder el usuario actual
     * @returns {Promise<Array>} - Array de rutas permitidas
     */
    async obtenerRutasPermitidas() {
        try {
            const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
            
            if (!userInfo.id) {
                return [];
            }

            // Si es administrador, todas las rutas están permitidas
            if (userInfo.rol && userInfo.rol.toLowerCase() === 'administrador') {
                return [
                    '/dashboard', '/usuarios', '/roles', '/abastecimientos', '/abastecimiento',
                    '/categoria-insumos', '/citas', '/clientes', '/compras', '/compra-insumo', 
                    '/insumos', '/insumo-abastecimiento', '/liquidaciones', '/liquidacion', 
                    '/manicuristas', '/novedades', '/proveedores', '/servicios', 
                    '/venta-servicios', '/ventas-servicio', '/reservar-cita'
                ];
            }

            // Si es cliente, solo rutas específicas
            if (userInfo.rol && userInfo.rol.toLowerCase() === 'cliente') {
                return ['/dashboard', '/usuarios', '/clientes', '/citas', '/servicios', '/venta-servicios', '/reservar-cita'];
            }

            // Para otros roles, verificar permisos y construir rutas permitidas usando nombres correctos
            const todasLasRutas = [
                '/dashboard', '/usuarios', '/roles', '/abastecimientos', '/abastecimiento',
                '/categoria-insumos', '/citas', '/clientes', '/compras', '/compra-insumo', 
                '/insumos', '/insumo-abastecimiento', '/liquidaciones', '/liquidacion', 
                '/manicuristas', '/novedades', '/proveedores', '/servicios', 
                '/venta-servicios', '/ventas-servicio', '/reservar-cita'
            ];

            const rutasPermitidas = [];
            for (const ruta of todasLasRutas) {
                if (await this.puedeAccederARuta(ruta)) {
                    rutasPermitidas.push(ruta);
                }
            }

            return rutasPermitidas;
        } catch (error) {
            console.error('Error al obtener rutas permitidas:', error);
            return [];
        }
    }

    /**
     * Verificar si el usuario puede ver un elemento del menú
     * @param {string} ruta - Ruta del menú
     * @returns {Promise<boolean>} - true si puede ver el elemento
     */
    async puedeVerElementoMenu(ruta) {
        try {
            const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
            
            if (!userInfo.id) {
                return false;
            }

            // Los administradores pueden ver todo
            if (userInfo.rol && userInfo.rol.toLowerCase() === 'administrador') {
                return true;
            }
            
            // Los clientes solo pueden ver elementos específicos
            if (userInfo.rol && userInfo.rol.toLowerCase() === 'cliente') {
                const elementosPermitidos = ['/dashboard', '/clientes', '/citas', '/servicios', '/venta-servicios', '/reservar-cita'];
                return elementosPermitidos.includes(ruta);
            }
            
            // Para otros roles, verificar permisos específicos usando los nombres correctos
            const rutasPermisos = this.getRutasPermisos();
            const permisoRequerido = rutasPermisos[ruta];
            
            if (!permisoRequerido) {
                return false;
            }

            // Verificar si el usuario tiene el permiso específico
            return await this.usuarioTienePermiso(permisoRequerido);
        } catch (error) {
            console.error('Error al verificar elemento del menú:', error);
            return false;
        }
    }
}

export default new PermisosService();
