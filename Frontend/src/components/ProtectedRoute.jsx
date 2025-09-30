import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import permisosService from '../service/permisosService';

const ProtectedRoute = ({ children, requiredRole = null, requiredPermission = null }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    const [puedeAcceder, setPuedeAcceder] = useState(null);
    const [verificandoPermisos, setVerificandoPermisos] = useState(true);

    useEffect(() => {
        const verificarAcceso = async () => {
            console.log('🔐 ProtectedRoute - Verificando acceso para:', location.pathname);
            console.log('- Usuario:', user);
            console.log('- Rol:', user?.rol);
            console.log('- Es administrador:', user?.rol?.toLowerCase() === 'administrador');
            
            if (!user) {
                setPuedeAcceder(false);
                setVerificandoPermisos(false);
                return;
            }

            // Si es administrador, siempre puede acceder
            if (user.rol?.toLowerCase() === 'administrador') {
                console.log('✅ Es administrador - acceso permitido automáticamente');
                setPuedeAcceder(true);
                setVerificandoPermisos(false);
                return;
            }

            // Si está accediendo a cualquier dashboard, permitir acceso sin verificación de permisos
            if (location.pathname === '/dashboard' || location.pathname === '/dashboard-manicurista') {
                console.log('✅ Acceso al dashboard - permitido sin verificación de permisos');
                setPuedeAcceder(true);
                setVerificandoPermisos(false);
                return;
            }

            // Si se requiere un rol específico, verificar primero
            if (requiredRole && user.rol?.toLowerCase() !== requiredRole.toLowerCase()) {
                setPuedeAcceder(false);
                setVerificandoPermisos(false);
                return;
            }

            // Verificación ultra-rápida usando datos locales
            const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
            const permisosUsuario = userInfo.permisos || [];
            
            console.log('🔍 Verificando permisos para:', location.pathname);
            console.log('- Usuario info:', userInfo);
            console.log('- Permisos del usuario:', permisosUsuario);
            console.log('- Permiso requerido:', requiredPermission);
            
            // Si se requiere un permiso específico, verificar solo localmente
            if (requiredPermission) {
                // Verificar si es un permiso del sistema anterior (como "Usuarios") o nuevo (como "usuarios_listar")
                const tienePermisoLocal = permisosUsuario.some(permiso => {
                    const permisoNombre = permiso.nombre || permiso;
                    // Si es un permiso del sistema anterior, verificar directamente
                    if (permisoNombre === requiredPermission) {
                        console.log('✅ Permiso encontrado (sistema anterior):', permisoNombre);
                        return true;
                    }
                    // Si es un permiso del nuevo sistema, verificar si tiene alguna acción del módulo
                    if (requiredPermission.includes('_')) {
                        if (permisoNombre === requiredPermission) {
                            console.log('✅ Permiso encontrado (sistema nuevo):', permisoNombre);
                            return true;
                        }
                    } else {
                        // Mapear permisos del sistema anterior al nuevo sistema
                        const mapeoPermisos = {
                            'Usuarios': 'usuarios_listar',
                            'Roles': 'roles_listar',
                            'Clientes': 'clientes_listar',
                            'Manicuristas': 'manicuristas_listar',
                            'Citas': 'citas_listar',
                            'Servicios': 'servicios_listar',
                            'Insumos': 'insumos_listar',
                            'Categoria Insumos': 'categoria_insumos_listar',
                            'Compras': 'compras_listar',
                            'Proveedores': 'proveedores_listar',
                            'Abastecimientos': 'abastecimientos_listar',
                            'Venta Servicios': 'venta_servicios_listar',
                            'Liquidaciones': 'liquidaciones_listar',
                            'Novedades': 'novedades_listar',
                            'Dashboard': 'dashboard_acceder'
                        };
                        const permisoMapeado = mapeoPermisos[requiredPermission];
                        if (permisoMapeado && permisoNombre === permisoMapeado) {
                            console.log('✅ Permiso mapeado encontrado:', permisoNombre);
                            return true;
                        }
                    }
                    return false;
                });
                
                // Solo verificar el permiso específico requerido
                
                console.log('🔍 Resultado verificación permiso:', tienePermisoLocal);
                setPuedeAcceder(tienePermisoLocal);
                setVerificandoPermisos(false);
                return;
            }

            // Si no se requiere permiso específico, verificar acceso a la ruta localmente
            const ruta = location.pathname;
            
            // Rutas especiales que no requieren verificación de permisos específicos
            const rutasEspeciales = ['/reservar-cita', '/dashboard', '/perfil'];
            if (rutasEspeciales.includes(ruta)) {
                console.log('✅ Ruta especial - acceso permitido:', ruta);
                setPuedeAcceder(true);
                setVerificandoPermisos(false);
                return;
            }
            
            // Si el usuario no tiene permisos cargados, solo permitir dashboard y perfil
            if (permisosUsuario.length === 0) {
                console.log('⚠️ Usuario sin permisos cargados - solo dashboard y perfil permitidos');
                if (ruta === '/dashboard' || ruta === '/perfil') {
                    console.log('✅ Acceso permitido (sin permisos):', ruta);
                    setPuedeAcceder(true);
                    setVerificandoPermisos(false);
                    return;
                } else {
                    console.log('❌ Acceso denegado - sin permisos para:', ruta);
                    setPuedeAcceder(false);
                    setVerificandoPermisos(false);
                    return;
                }
            }
            
            const rutasPermitidas = userInfo.rutasPermitidas || [];
            const puedeAccederARuta = rutasPermitidas.includes(ruta);
            console.log('🔍 Verificación rutas permitidas:', { ruta, rutasPermitidas, puedeAccederARuta });
            setPuedeAcceder(puedeAccederARuta);
            setVerificandoPermisos(false);
        };

        // Ejecutar verificación inmediatamente
        verificarAcceso();
    }, [user, requiredRole, requiredPermission, location.pathname]);

    // Si está cargando, mostrar el contenido normalmente (sin indicadores)
    if (loading) {
        return children;
    }

    // Si está verificando permisos, mostrar el contenido normalmente (sin indicadores)
    if (verificandoPermisos) {
        return children;
    }

    // Si no hay usuario, redirigir al login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Si el usuario debe cambiar contraseña, redirigir a esa página
    if (user.debe_cambiar_contraseña) {
        return <Navigate to="/recuperar-contrasena" replace />;
    }

    // Si no puede acceder, mostrar página de acceso denegado en lugar de redirigir
    if (!puedeAcceder) {
        console.log('❌ Usuario no puede acceder - mostrando acceso denegado');
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                textAlign: 'center',
                padding: '20px'
            }}>
                <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>
                    Acceso Denegado
                </h1>
                <p style={{ marginBottom: '20px', fontSize: '18px' }}>
                    No tienes permisos para acceder a esta página.
                </p>
                <button 
                    onClick={() => window.history.back()}
                    style={{
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    Volver Atrás
                </button>
            </div>
        );
    }

    // Usuario autenticado y autorizado
    console.log('✅ Usuario autorizado - mostrando contenido');
    return children;
};

export default ProtectedRoute;
