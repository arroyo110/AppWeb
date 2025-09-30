"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('access_token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const currentTime = Date.now() / 1000;
                
                if (decoded.exp < currentTime) {
                    // Token expirado
                    logout();
                } else {
                    // Token válido, obtener información del usuario
                    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
                    setUser(userInfo);
                }
            } catch (error) {
                console.error('Error decodificando token:', error);
                logout();
            }
        }
        setLoading(false);
    }, [token]);

    const login = async (correo, contraseña) => {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    correo_electronico: correo,
                    contraseña: contraseña
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Guardar tokens (inmediato)
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);

                // Guardar información básica del usuario (inmediato)
                localStorage.setItem('user_info', JSON.stringify(data.usuario));
                setUser(data.usuario);
                setToken(data.access_token);

                // Cargar permisos en segundo plano (no bloquear navegación)
                (async () => {
                    try {
                        const permisosResponse = await fetch(`http://127.0.0.1:8000/api/roles/permisos_usuario/?usuario_id=${data.usuario.id}`, {
                            headers: {
                                'Authorization': `Bearer ${data.access_token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        if (permisosResponse.ok) {
                            const permisosData = await permisosResponse.json();
                            const userInfoActualizado = {
                                ...data.usuario,
                                permisos: permisosData.permisos || []
                            };
                            localStorage.setItem('user_info', JSON.stringify(userInfoActualizado));
                            setUser(userInfoActualizado);
                        }
                    } catch (permisosError) {
                        // Silenciar error de permisos en background para no bloquear
                        console.error('Error al cargar permisos:', permisosError);
                    }
                })();

                return { success: true, data };
            } else {
                return {
                    success: false,
                    error: data.error || 'Error en el login'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: 'Error de conexión'
            };
        }
    };

    const register = async (userData) => {
        try {
            console.log('Datos enviados al registro:', JSON.stringify(userData, null, 2));
            
            const response = await fetch('http://127.0.0.1:8000/api/auth/registro/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            console.log('Respuesta del servidor:', JSON.stringify(data, null, 2));

            if (response.ok) {
                // Guardar tokens e información del usuario para autenticación automática
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                
                // Guardar información del usuario
                localStorage.setItem('user_info', JSON.stringify(data.usuario));
                
                // Cargar permisos del usuario después del registro
                try {
                    const permisosResponse = await fetch(`http://127.0.0.1:8000/api/roles/permisos_usuario/?usuario_id=${data.usuario.id}`, {
                        headers: {
                            'Authorization': `Bearer ${data.access_token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (permisosResponse.ok) {
                        const permisosData = await permisosResponse.json();
                        console.log('🔐 Permisos cargados en registro:', permisosData);
                        
                        // Actualizar user_info con los permisos
                        const userInfoActualizado = {
                            ...data.usuario,
                            permisos: permisosData.permisos || []
                        };
                        localStorage.setItem('user_info', JSON.stringify(userInfoActualizado));
                        setUser(userInfoActualizado);
                    } else {
                        console.error('Error cargando permisos en registro:', permisosResponse.status);
                        setUser(data.usuario);
                    }
                } catch (permisosError) {
                    console.error('Error al cargar permisos en registro:', permisosError);
                    setUser(data.usuario);
                }
                
                // Actualizar estado
                setToken(data.access_token);
                
                return {
                    success: true,
                    data: data
                };
            } else {
                console.error('Error en registro:', data);
                
                // Manejar errores de validación específicos
                if (data.correo_electronico || data.documento || data.celular) {
                    let errorMessage = 'Errores de validación:\n';
                    if (data.correo_electronico) {
                        errorMessage += `• ${data.correo_electronico[0]}\n`;
                    }
                    if (data.documento) {
                        errorMessage += `• ${data.documento[0]}\n`;
                    }
                    if (data.celular) {
                        errorMessage += `• ${data.celular[0]}\n`;
                    }
                    return {
                        success: false,
                        error: errorMessage.trim()
                    };
                }
                
                return {
                    success: false,
                    error: data.error || data.detail || 'Error en el registro'
                };
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            return {
                success: false,
                error: 'Error de conexión: ' + error.message
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        setToken(null);
        setUser(null);
    };

    const refreshToken = async () => {
        try {
            const refresh = localStorage.getItem('refresh_token');
            if (!refresh) {
                logout();
                return false;
            }

            const response = await fetch('http://127.0.0.1:8000/api/auth/refresh/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh: refresh
                })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access);
                setToken(data.access);
                return true;
            } else {
                logout();
                return false;
            }
        } catch (error) {
            logout();
            return false;
        }
    };

    // Función para solicitar recuperación de contraseña
    const requestPasswordReset = async (correo) => {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/auth/solicitar-codigo/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    correo_electronico: correo
                })
            });

            const data = await response.json();

            if (response.ok) {
                return {
                    success: true,
                    message: data.mensaje || 'Código enviado al correo.'
                };
            } else {
                throw new Error(data.error || 'Error al solicitar código de recuperación');
            }
        } catch (error) {
            throw error;
        }
    };

    // Función para confirmar código y restablecer contraseña
    const resetPassword = async (correo, codigo, nuevaPassword) => {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/auth/confirmar-codigo/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    correo_electronico: correo,
                    codigo: codigo,
                    nueva_contraseña: nuevaPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                return {
                    success: true,
                    message: data.mensaje || 'Contraseña actualizada correctamente.'
                };
            } else {
                throw new Error(data.error || 'Error al restablecer contraseña');
            }
        } catch (error) {
            throw error;
        }
    };

    // Función para cambiar contraseña temporal
    const cambiarContraseña = async (correo, contraseñaTemporal, nuevaContraseña, confirmarContraseña) => {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/auth/cambiar-contraseña/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    correo_electronico: correo,
                    contraseña_temporal: contraseñaTemporal,
                    nueva_contraseña: nuevaContraseña,
                    confirmar_contraseña: confirmarContraseña
                })
            });

            const data = await response.json();

            if (response.ok) {
                return {
                    success: true,
                    message: data.mensaje || 'Contraseña cambiada correctamente.'
                };
            } else {
                throw new Error(data.error || 'Error al cambiar contraseña');
            }
        } catch (error) {
            throw error;
        }
    };

     const loginManicurista = async ({ numero_documento, contraseña }) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/manicuristas/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ numero_documento, contraseña }),
      });

      const data = await response.json();

      if (response.ok) {
        // 🔑 Guardar tokens si tu endpoint devuelve JWT
        if (data.access_token) {
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token || "");
          setToken(data.access_token);
        }

        // 👩‍🦰 Normalizar info del manicurista
        const userInfo = {
          ...data.manicurista,
          rol: "manicurista",
          manicurista_id: data.manicurista?.id,
          debe_cambiar_contraseña: data.manicurista?.debe_cambiar_contraseña || false,
        };

        localStorage.setItem("user_info", JSON.stringify(userInfo));
        setUser(userInfo);

        return { success: true, data };
      } else {
        return {
          success: false,
          error: data.error || "Error en el login de manicurista",
        };
      }
    } catch (error) {
      return { success: false, error: "Error de conexión" };
    }
  };

    const updateUser = (updatedData) => {
        const currentUser = { ...user, ...updatedData };
        setUser(currentUser);
        localStorage.setItem('user_info', JSON.stringify(currentUser));
    };

    const value = {
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshToken,
        requestPasswordReset,
        resetPassword,
        cambiarContraseña,
        loginManicurista,
        updateUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
