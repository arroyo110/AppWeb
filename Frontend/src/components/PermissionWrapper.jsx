import React from 'react';
import usePermisos from '../hooks/usePermisos';

/**
 * Componente wrapper que oculta contenido según los permisos del usuario
 * @param {Object} props - Propiedades del componente
 * @param {string} props.modulo - Nombre del módulo (ej: 'usuarios')
 * @param {string} props.accion - Acción requerida (ej: 'crear', 'editar', 'eliminar')
 * @param {React.ReactNode} props.children - Contenido a mostrar/ocultar
 * @param {boolean} props.fallback - Si true, muestra contenido alternativo cuando no tiene permisos
 * @param {React.ReactNode} props.fallbackContent - Contenido alternativo
 */
const PermissionWrapper = ({ 
    modulo, 
    accion, 
    children, 
    fallback = false,
    fallbackContent = null
}) => {
    const { puedeRealizarAccion, esAdministrador, puedeAccederModulo } = usePermisos();
    
    // Los administradores siempre pueden realizar todas las acciones
    const puedeRealizar = esAdministrador() || puedeRealizarAccion(modulo, accion);
    
    // Si no tiene acceso al módulo, no puede realizar ninguna acción
    const tieneAccesoModulo = esAdministrador() || puedeAccederModulo(modulo);
    
    // Si no tiene acceso al módulo o no puede realizar la acción y no hay fallback, no renderizar nada
    if ((!tieneAccesoModulo || !puedeRealizar) && !fallback) {
        return null;
    }
    
    // Si no tiene acceso al módulo o no puede realizar la acción pero hay fallback, mostrar contenido alternativo
    if ((!tieneAccesoModulo || !puedeRealizar) && fallback) {
        return fallbackContent;
    }
    
    // Si puede realizar la acción, mostrar el contenido
    return children;
};

export default PermissionWrapper;
