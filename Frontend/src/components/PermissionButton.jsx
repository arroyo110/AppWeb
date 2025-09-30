import React from 'react';
import usePermisos from '../hooks/usePermisos';

/**
 * Componente de botón que se desactiva según los permisos del usuario
 * @param {Object} props - Propiedades del componente
 * @param {string} props.modulo - Nombre del módulo (ej: 'usuarios')
 * @param {string} props.accion - Acción requerida (ej: 'crear', 'editar', 'eliminar')
 * @param {React.ReactNode} props.children - Contenido del botón
 * @param {boolean} props.hidden - Si true, oculta el botón en lugar de deshabilitarlo
 * @param {string} props.className - Clases CSS adicionales
 * @param {Object} props.style - Estilos adicionales
 * @param {Function} props.onClick - Función de click
 * @param {boolean} props.disabled - Si está deshabilitado por otras razones
 * @param {string} props.title - Tooltip del botón
 * @param {Object} props.otherProps - Otras propiedades del botón
 */
const PermissionButton = ({ 
    modulo, 
    accion, 
    children, 
    hidden = false, 
    className = '', 
    style = {}, 
    onClick, 
    disabled = false,
    title,
    ...otherProps 
}) => {
    const { puedeRealizarAccion, esAdministrador, puedeAccederModulo } = usePermisos();
    
    // Los administradores siempre pueden realizar todas las acciones
    const puedeRealizar = esAdministrador() || puedeRealizarAccion(modulo, accion);
    
    // Si no tiene acceso al módulo, no puede realizar ninguna acción
    const tieneAccesoModulo = esAdministrador() || puedeAccederModulo(modulo);
    
    // Si no tiene acceso al módulo o no puede realizar la acción y hidden es true, no renderizar el botón
    if ((!tieneAccesoModulo || !puedeRealizar) && hidden) {
        return null;
    }
    
    // Determinar el estado del botón
    const isDisabled = disabled || !tieneAccesoModulo || !puedeRealizar;
    
    // Determinar las clases CSS
    const buttonClassName = `${className} ${isDisabled ? 'disabled' : ''}`.trim();
    
    // Determinar el tooltip
    const buttonTitle = title || (isDisabled ? 
        (!tieneAccesoModulo ? `No tienes acceso al módulo ${modulo}` : `No tienes permisos para ${accion} en ${modulo}`) 
        : '');
    
    return (
        <button
            className={buttonClassName}
            style={style}
            onClick={onClick}
            disabled={isDisabled}
            title={buttonTitle}
            {...otherProps}
        >
            {children}
        </button>
    );
};

export default PermissionButton;
