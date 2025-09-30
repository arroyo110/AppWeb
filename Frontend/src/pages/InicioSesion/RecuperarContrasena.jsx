import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEye, FaEyeSlash, FaEnvelope, FaKey, FaArrowLeft, FaSpa, FaTimes, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import '../../styles/Login.css';

const RecuperarContrasena = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Obtener el email del estado de navegación si viene del Login
  const emailFromState = location.state?.email;
  
  const [step, setStep] = useState(emailFromState ? 'code' : 'email');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    email: emailFromState || "",
    codigo: "",
    nueva_contraseña: "",
    confirmar_contraseña: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState('error'); // 'error' o 'success'
  const [alertMessage, setAlertMessage] = useState('');

  // Mostrar alerta
  useEffect(() => {
    if (alertMessage) {
      setShowAlert(true);
      // Ocultar la alerta después de 5 segundos
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const showErrorAlert = (message) => {
    setAlertType('error');
    setAlertMessage(message);
  };

  const showSuccessAlert = (message) => {
    setAlertType('success');
    setAlertMessage(message);
  };

  const closeAlert = () => {
    setShowAlert(false);
    setAlertMessage('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Limpiar errores cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password) => {
    // Validación básica de contraseña
    if (password.length < 8) return false;
    if (!/(?=.*[A-Z])/.test(password)) return false;
    if (!/(?=.*\d)/.test(password)) return false;
    if (!/(?=.*[!@#$%^&*])/.test(password)) return false;
    return true;
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    
    if (!form.email || !validateEmail(form.email)) {
      setErrors(prev => ({ ...prev, email: 'Ingresa un email válido' }));
      showErrorAlert('Ingresa un email válido');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Enviando código a:', form.email);
      
      const response = await fetch('https://appweb-rxph.onrender.com/api/auth/solicitar-codigo/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo_electronico: form.email
        })
      });

      const data = await response.json();
      console.log('Respuesta del backend:', data);

      if (response.ok) {
        console.log('Código enviado exitosamente');
        setStep('code');
        setErrors({});
        showSuccessAlert('Código enviado exitosamente. Revisa tu correo electrónico.');
      } else {
        console.error('Error del backend:', data);
        const errorMsg = data.error || data.detail || 'Error al enviar el código';
        showErrorAlert(errorMsg);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      showErrorAlert('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!form.codigo) {
      setErrors(prev => ({ ...prev, codigo: 'Ingresa el código recibido' }));
      showErrorAlert('Ingresa el código recibido');
      return;
    }
    
    if (!form.nueva_contraseña || !validatePassword(form.nueva_contraseña)) {
      const errorMsg = 'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo';
      setErrors(prev => ({ ...prev, nueva_contraseña: errorMsg }));
      showErrorAlert(errorMsg);
      return;
    }
    
    if (form.nueva_contraseña !== form.confirmar_contraseña) {
      setErrors(prev => ({ ...prev, confirmar_contraseña: 'Las contraseñas no coinciden' }));
      showErrorAlert('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Cambiando contraseña para:', form.email, 'con código:', form.codigo);
      
      const response = await fetch('https://appweb-rxph.onrender.com/api/auth/confirmar-codigo/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo_electronico: form.email,
          codigo: form.codigo,
          nueva_contraseña: form.nueva_contraseña
        })
      });

      const data = await response.json();
      console.log('Respuesta del backend:', data);

      if (response.ok) {
        console.log('Contraseña cambiada exitosamente');
        showSuccessAlert('¡Contraseña cambiada exitosamente! Ahora puedes iniciar sesión.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        console.error('Error del backend:', data);
        const errorMsg = data.error || data.detail || 'Error al cambiar la contraseña';
        showErrorAlert(errorMsg);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      showErrorAlert('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="glass-effect"></div>
        <div className="background-decoration"></div>
      </div>

      {/* Alerta flotante */}
      {showAlert && alertMessage && (
        <div className={`login-error-alert ${alertType === 'success' ? 'success' : ''}`}>
          {alertType === 'success' ? (
            <FaCheckCircle className="login-error-alert-icon" />
          ) : (
            <FaExclamationTriangle className="login-error-alert-icon" />
          )}
          <div className="login-error-alert-message">{alertMessage}</div>
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
        <button
          className="login-back-button"
          onClick={() => navigate('/login')}
        >
          <FaArrowLeft className="login-back-icon" /> Volver al Login
        </button>

        <div className="login-header">
          <h1 className="login-title">
            <span className="wine-text">Wine</span>
            <span className="spa-text">Spa</span>
          </h1>
          <p className="login-subtitle">Recupera tu contraseña</p>
        </div>

        {step === 'email' ? (
          <div>
            <h2 className="login-step-title">Recuperar Contraseña</h2>
            <p className="login-step-description">Ingresa tu correo electrónico para recibir un código de recuperación</p>
            
            <form onSubmit={handleSendCode} className="login-form">
              <div className="login-form-group">
                <label htmlFor="email">Correo Electrónico</label>
                <div className="login-input-container">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="correo@ejemplo.com"
                    className={`login-input ${errors.email ? 'login-error-input' : ''}`}
                    disabled={isLoading}
                    required
                  />
                </div>
                {errors.email && <span className="login-error-text">{errors.email}</span>}
              </div>
              
              <div className="login-button-container">
                <button type="submit" className="login-button" disabled={isLoading}>
                  {isLoading ? (
                    <div className="login-spinner-container">
                      <div className="login-spinner"></div>
                      <span>Enviar Código</span>
                    </div>
                  ) : (
                    <>
                      <span className="login-button-text">Enviar Código</span>
                      <span className="login-button-icon">
                        <FaEnvelope />
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <h2 className="login-step-title">Cambiar Contraseña</h2>
            <p className="login-step-description">Ingresa el código recibido y tu nueva contraseña</p>
            
            <form onSubmit={handleResetPassword} className="login-form">
              <div className="login-form-group">
                <label htmlFor="codigo">Código de Recuperación</label>
                <div className="login-input-container">
                  <input
                    type="text"
                    id="codigo"
                    name="codigo"
                    value={form.codigo}
                    onChange={handleChange}
                    placeholder="Ingresa el código de 6 dígitos"
                    maxLength={6}
                    className={`login-input ${errors.codigo ? 'login-error-input' : ''}`}
                    disabled={isLoading}
                    required
                  />
                </div>
                {errors.codigo && <span className="login-error-text">{errors.codigo}</span>}
              </div>

              <div className="login-form-group">
                <label htmlFor="nueva_contraseña">Nueva Contraseña</label>
                <div className="login-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="nueva_contraseña"
                    name="nueva_contraseña"
                    value={form.nueva_contraseña}
                    onChange={handleChange}
                    placeholder="Nueva contraseña"
                    className={`login-input ${errors.nueva_contraseña ? 'login-error-input' : ''}`}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="login-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.nueva_contraseña && <span className="login-error-text">{errors.nueva_contraseña}</span>}
                <div className="login-password-hint">
                  <small>Mínimo 8 caracteres, una mayúscula, un número y un símbolo</small>
                </div>
              </div>

              <div className="login-form-group">
                <label htmlFor="confirmar_contraseña">Confirmar Contraseña</label>
                <div className="login-input-container">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmar_contraseña"
                    name="confirmar_contraseña"
                    value={form.confirmar_contraseña}
                    onChange={handleChange}
                    placeholder="Confirmar contraseña"
                    className={`login-input ${errors.confirmar_contraseña ? 'login-error-input' : ''}`}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="login-toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.confirmar_contraseña && <span className="login-error-text">{errors.confirmar_contraseña}</span>}
              </div>
              
              <div className="login-button-container">
                <button type="submit" className="login-button" disabled={isLoading}>
                  {isLoading ? (
                    <div className="login-spinner-container">
                      <div className="login-spinner"></div>
                      <span>Cambiando...</span>
                    </div>
                  ) : (
                    <>
                      <span className="login-button-text">Cambiar Contraseña</span>
                      <span className="login-button-icon">
                        <FaKey />
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecuperarContrasena;