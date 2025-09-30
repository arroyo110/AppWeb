import { useState, useEffect } from 'react';
import permisosService from '../service/permisosService';

/**
 * Hook personalizado para manejar permisos en componentes
 * @returns {Object} - Objeto con funciones y estado de permisos
 */
export const usePermisos = () => {
    const [permisos, setPermisos] = useState([]);
    const [rutasPermitidas, setRutasPermitidas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Cargar permisos del usuario actual
     */
    const cargarPermisos = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
            if (!userInfo.id) {
                setPermisos([]);
                setRutasPermitidas([]);
                return;
            }

            // Usar los permisos que ya están cargados en localStorage
            const permisosUsuario = userInfo.permisos || [];
            
            // Cargar rutas permitidas
            const rutas = await permisosService.obtenerRutasPermitidas();
            
            setPermisos(permisosUsuario);
            setRutasPermitidas(rutas);
            
        } catch (err) {
            console.error('Error cargando permisos:', err);
            setError('Error al cargar permisos');
            // En caso de error, establecer permisos vacíos
            setPermisos([]);
            setRutasPermitidas([]);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Verificar si el usuario tiene un permiso específico
     * @param {string} permisoNombre - Nombre del permiso a verificar
     * @returns {boolean} - true si tiene el permiso
     */
    const tienePermiso = (permisoNombre) => {
        if (!permisoNombre) return false;
        return permisos.some(permiso => {
            const nombrePermiso = permiso.nombre || permiso;
            return nombrePermiso === permisoNombre;
        });
    };

    /**
     * Verificar si el usuario puede realizar una acción específica en un módulo
     * @param {string} modulo - Nombre del módulo (ej: 'usuarios')
     * @param {string} accion - Acción a verificar (ej: 'crear', 'editar', 'eliminar')
     * @returns {boolean} - true si puede realizar la acción
     */
    const puedeRealizarAccion = (modulo, accion) => {
        if (!modulo || !accion) return false;
        const permisoRequerido = `${modulo}_${accion}`;
        return tienePermiso(permisoRequerido);
    };

    /**
     * Verificar si el usuario puede crear en un módulo
     * @param {string} modulo - Nombre del módulo
     * @returns {boolean} - true si puede crear
     */
    const puedeCrear = (modulo) => {
        return puedeRealizarAccion(modulo, 'crear');
    };

    /**
     * Verificar si el usuario puede editar en un módulo
     * @param {string} modulo - Nombre del módulo
     * @returns {boolean} - true si puede editar
     */
    const puedeEditar = (modulo) => {
        return puedeRealizarAccion(modulo, 'editar');
    };

    /**
     * Verificar si el usuario puede eliminar en un módulo
     * @param {string} modulo - Nombre del módulo
     * @returns {boolean} - true si puede eliminar
     */
    const puedeEliminar = (modulo) => {
        return puedeRealizarAccion(modulo, 'eliminar');
    };

    /**
     * Verificar si el usuario puede ver detalles en un módulo
     * @param {string} modulo - Nombre del módulo
     * @returns {boolean} - true si puede ver detalles
     */
    const puedeVerDetalles = (modulo) => {
        return puedeRealizarAccion(modulo, 'ver_detalles');
    };

    /**
     * Verificar si el usuario puede acceder a un módulo (tiene al menos una acción)
     * @param {string} modulo - Nombre del módulo
     * @returns {boolean} - true si puede acceder al módulo
     */
    const puedeAccederModulo = (modulo) => {
        if (!modulo) return false;
        const acciones = ['crear', 'listar', 'ver_detalles', 'editar', 'eliminar'];
        return acciones.some(accion => puedeRealizarAccion(modulo, accion));
    };

    /**
     * Verificar si el usuario puede listar en un módulo
     * @param {string} modulo - Nombre del módulo
     * @returns {boolean} - true si puede listar
     */
    const puedeListar = (modulo) => {
        return puedeRealizarAccion(modulo, 'listar');
    };

    /**
     * Verificar si el usuario puede acceder a una ruta específica
     * @param {string} ruta - Ruta a verificar
     * @returns {boolean} - true si puede acceder
     */
    const puedeAccederARuta = (ruta) => {
        if (!ruta) return false;
        return rutasPermitidas.includes(ruta);
    };

    /**
     * Verificar si el usuario es administrador
     * @returns {boolean} - true si es administrador
     */
    const esAdministrador = () => {
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        return userInfo.rol && userInfo.rol.toLowerCase() === 'administrador';
    };

    /**
     * Verificar si el usuario es cliente
     * @returns {boolean} - true si es cliente
     */
    const esCliente = () => {
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        return userInfo.rol && userInfo.rol.toLowerCase() === 'cliente';
    };

    /**
     * Verificar si el usuario es manicurista
     * @returns {boolean} - true si es manicurista
     */
    const esManicurista = () => {
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        return userInfo.rol && userInfo.rol.toLowerCase() === 'manicurista';
    };

    /**
     * Obtener el rol del usuario actual
     * @returns {string|null} - Rol del usuario o null
     */
    const obtenerRol = () => {
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        return userInfo.rol || null;
    };

    /**
     * Renderizar contenido condicionalmente basado en permisos
     * @param {string} permisoRequerido - Permiso requerido para mostrar el contenido
     * @param {React.ReactNode} contenido - Contenido a mostrar si tiene el permiso
     * @param {React.ReactNode} contenidoAlternativo - Contenido alternativo si no tiene el permiso
     * @returns {React.ReactNode} - Contenido apropiado
     */
    const renderizarConPermiso = (permisoRequerido, contenido, contenidoAlternativo = null) => {
        if (esAdministrador() || tienePermiso(permisoRequerido)) {
            return contenido;
        }
        return contenidoAlternativo;
    };

    /**
     * Renderizar contenido condicionalmente basado en rol
     * @param {string} rolRequerido - Rol requerido para mostrar el contenido
     * @param {React.ReactNode} contenido - Contenido a mostrar si tiene el rol
     * @param {React.ReactNode} contenidoAlternativo - Contenido alternativo si no tiene el rol
     * @returns {React.ReactNode} - Contenido apropiado
     */
    const renderizarConRol = (rolRequerido, contenido, contenidoAlternativo = null) => {
        const rolActual = obtenerRol();
        if (rolActual && rolActual.toLowerCase() === rolRequerido.toLowerCase()) {
            return contenido;
        }
        return contenidoAlternativo;
    };

    /**
     * Verificar si el usuario puede ver un elemento del menú
     * @param {string} ruta - Ruta del menú
     * @returns {boolean} - true si puede ver el elemento
     */
    const puedeVerElementoMenu = (ruta) => {
        // Los administradores pueden ver todo
        if (esAdministrador()) return true;
        
        // Los dashboards son accesibles para todos los roles excepto cliente
        if (ruta === '/dashboard' || ruta === '/dashboard-manicurista') {
            return !esCliente();
        }
        
        // Los clientes solo pueden ver elementos específicos
        if (esCliente()) {
            const elementosPermitidos = ['/clientes', '/citas', '/servicios', '/venta-servicios'];
            return elementosPermitidos.includes(ruta);
        }
        
        // Para otros roles, verificar permisos específicos usando la lista de permisos cargada
        // Mapear la ruta al permiso requerido (nuevo sistema)
        const mapeoRutasPermisos = {
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
        
        const permisoRequerido = mapeoRutasPermisos[ruta];
        if (!permisoRequerido) {
            return false;
        }
        
        // Verificar si el usuario tiene el permiso requerido
        return permisos.some(permiso => permiso.nombre === permisoRequerido);
    };

    // Cargar permisos al montar el componente
    useEffect(() => {
        cargarPermisos();
    }, []);

    return {
        // Estado
        permisos,
        rutasPermitidas,
        loading,
        error,
        
        // Funciones básicas
        cargarPermisos,
        tienePermiso,
        puedeAccederARuta,
        puedeVerElementoMenu,
        esAdministrador,
        esCliente,
        esManicurista,
        obtenerRol,
        renderizarConPermiso,
        renderizarConRol,
        
        // Funciones específicas por acción
        puedeRealizarAccion,
        puedeCrear,
        puedeEditar,
        puedeEliminar,
        puedeVerDetalles,
        puedeListar,
        puedeAccederModulo
    };
};

export default usePermisos;
