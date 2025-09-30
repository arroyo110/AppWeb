"use client"

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import logo from '../../assets/logo2.svg';
import '../../styles/Login.css';
import { FaEye, FaEyeSlash, FaSpa, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import { loginManicurista as loginManService } from "../../service/manicuristasService";
import { useLocation } from "react-router-dom";


const Login = () => {
    const { login: loginAuth, user } = useAuth();
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    const isManicurista = params.get("type") === "manicurista"; // agregado para manicuristas

    const [formData, setFormData] = useState({
        numero_documento: "",
        correo_electronico: "",
        contraseña: ""
        });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    
    const navigate = useNavigate();

    // Verificar si ya hay un usuario autenticado
    useEffect(() => {
        if (user) {
            if (user.debe_cambiar_contraseña) {
            navigate("/recuperar-contrasena", {
                state: { email: user.correo_electronico },
            });
            } else {
            switch (user.rol?.toLowerCase()) {
                case "cliente":
                navigate("/");
                break;
                case "manicurista":
                navigate("/dashboard-manicurista");
                break;
                default:
                navigate("/dashboard");
                break;
            }
            }
        }
        }, [user, navigate]);

    // Mostrar alerta de error
    useEffect(() => {
        if (error) {
            setShowAlert(true);
            // Ocultar la alerta después de 5 segundos
            const timer = setTimeout(() => {
                setShowAlert(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        
        // Limpiar mensaje de error cuando el usuario empiece a escribir
        if (error) {
            setError('');
            setShowAlert(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

           try { // agregado para manicuristas
            if (isManicurista) {
                // 🔹 LOGIN MANICURISTA
                const result = await loginManService({
                numero_documento: formData.numero_documento,
                contraseña: formData.contraseña,
                });

                console.log("Resultado login manicurista:", result);

                if (result.success) {
                const manicurista = result.data.manicurista;

                if (manicurista?.debe_cambiar_contraseña) {
                    navigate("/cambiar-password", {
                    state: { id: manicurista.id, correo: manicurista.correo },
                    });
                } else {
                    navigate("/dashboard-manicurista", {
                    state: { id: manicurista.id },
                    });
                }
                } else {
                setError(result.error || "Error en el login de manicurista");
                }
            } else {
                // 🔹 LOGIN ADMIN/CLIENTE/OTROS
                const result = await loginAuth(
                formData.correo_electronico,
                formData.contraseña
                );

                console.log("Resultado login usuario:", result);

                if (result.success) {
                const user = result.data.usuario;

                if (user.debe_cambiar_contraseña) {
                    navigate("/recuperar-contrasena", {
                    state: { email: formData.correo_electronico },
                    });
                } else {
                    switch (user.rol?.toLowerCase()) {
                    case "cliente":
                        navigate("/");
                        break;
                    default:
                        navigate("/dashboard");
                        break;
                    }
                }
                } else {
                setError(result.error || "Credenciales incorrectas");
                }
            }
            } catch (err) {
            console.error(err);
            setError("Error de conexión. Intenta nuevamente.");
            } finally {
            setLoading(false);
            }
        };

    const closeAlert = () => {
        setShowAlert(false);
        setError('');
    };

    return (
        <div className="login-page">
            <div className="login-background">
                <div className="glass-effect"></div>
                <div className="background-decoration"></div>
            </div>

            {/* Alerta flotante de error */}
            {showAlert && error && (
                <div className="login-error-alert">
                    <FaExclamationTriangle className="login-error-alert-icon" />
                    <div className="login-error-alert-message">{error}</div>
                    <button 
                        type="button" 
                        className="login-error-alert-close"
                        onClick={closeAlert}
                        aria-label="Cerrar alerta"
                    >
                        <FaTimes />
                    </button>
                </div>
            )}

            <div className="login-container">
                <div className="login-header">
                    <img src={logo} alt="Wine Spa Logo" className="login-logo" />
                    <h1 className="login-title">
                        <span className="wine-text">Wine</span>
                        <span className="spa-text">Spa</span>
                    </h1>
                    <p className="login-subtitle">Inicia sesión y accede a tu cuenta</p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="login-form">
                    {isManicurista ? (
                        <div className="login-form-group">
                        <label htmlFor="numero_documento">Número de Documento</label>
                        <input
                            type="text"
                            id="numero_documento"
                            name="numero_documento"
                            value={formData.numero_documento}
                            onChange={handleChange}
                            className="login-input"
                            required
                            disabled={loading}
                        />
                        </div>
                    ) : (
                        <div className="login-form-group">
                        <label htmlFor="correo_electronico">Correo Electrónico</label>
                        <input
                            type="email"
                            id="correo_electronico"
                            name="correo_electronico"
                            placeholder="correo@ejemplo.com"
                            value={formData.correo_electronico}
                            onChange={handleChange}
                            className="login-input"
                            required
                            disabled={loading}
                        />
                        </div>
                    )}

                    <div className="login-form-group">
                        <label htmlFor="contraseña">Contraseña</label>
                        <div className="login-input-container">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="contraseña"
                                name="contraseña"
                                placeholder="Contraseña"
                                value={formData.contraseña}
                                onChange={handleChange}
                                className="login-input"
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="login-toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                disabled={loading}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <div className="login-form-options">
                        <button type="button" className="login-forgot-password" onClick={() => navigate('/recuperar-contrasena')}>
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>

                    <div className="login-button-container">
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? (
                                <div className="login-spinner-container">
                                    <div className="login-spinner"></div>
                                    <span>Iniciando sesión...</span>
                                </div>
                            ) : (
                                <>
                                    <span className="login-button-text">Iniciar Sesión</span>
                                    <span className="login-button-icon">
                                        <FaSpa />
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="login-register-link">
                    ¿No tienes una cuenta?{' '}
                    <Link to="/register" className="login-register-link-a">
                        Regístrate ahora
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
