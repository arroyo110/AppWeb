// src/pages/Servicios/Views/CambiarPasswordManicurista.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaSpa, FaExclamationTriangle, FaTimes, FaEye, FaEyeSlash } from "react-icons/fa";
import { cambiarContraseñaManicurista } from "../../../service/manicuristasService";
import logo from "../../../assets/logo.jpg";

export default function CambiarPasswordManicurista() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const manicuristaId = state?.id;

  const [formData, setFormData] = useState({
    contraseña_temporal: "",
    nueva_contraseña: "",
    confirmar_contraseña: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);


  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  

  const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData({ ...formData, [name]: value });
  setError("");
  setShowAlert(false);

  // Validación en tiempo real para confirmar contraseña
  if (name === "nueva_contraseña" || name === "confirmar_contraseña") {
    const nueva = name === "nueva_contraseña" ? value : formData.nueva_contraseña;
    const confirmar = name === "confirmar_contraseña" ? value : formData.confirmar_contraseña;
    setPasswordMatch(nueva === confirmar);
  }
};
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setShowAlert(false);
    
    if (formData.nueva_contraseña !== formData.confirmar_contraseña) {
      setError("Las contraseñas no coinciden");
      setShowAlert(true);
      return;
    }

    setLoading(true);
    try {
      // Solo enviamos las propiedades que el backend necesita
      const payload = {
        contraseña_temporal: formData.contraseña_temporal,
        nueva_contraseña: formData.nueva_contraseña,
        confirmar_contraseña: formData.confirmar_contraseña,
      };

      const resp = await cambiarContraseñaManicurista(manicuristaId, payload);
      setSuccess(resp.mensaje || "Contraseña cambiada correctamente");
      setShowAlert(false);

      // Redirigir automáticamente al login después de 2 segundos
      setTimeout(() => {
        navigate("/login?type=email", { replace: true });
      }, 2000);

    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("No se pudo cambiar la contraseña");
      }
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const closeAlert = () => {
    setShowAlert(false);
    setError("");
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
          <p className="login-subtitle">Actualiza tu contraseña temporal</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="login-form">
          {/* Contraseña temporal */}
          <div className="login-form-group">
            <label htmlFor="contraseña_temporal">Contraseña Temporal</label>
            <div className="login-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="contraseña_temporal"
                name="contraseña_temporal"
                placeholder="Contraseña temporal"
                value={formData.contraseña_temporal}
                onChange={handleChange}
                className="login-input"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={loading}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div className="login-form-group">
            <label htmlFor="nueva_contraseña">Nueva Contraseña</label>
            <div className="login-input-container">
              <input
                type={showNew ? "text" : "password"}
                id="nueva_contraseña"
                name="nueva_contraseña"
                placeholder="Nueva contraseña"
                value={formData.nueva_contraseña}
                onChange={handleChange}
                className="login-input"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setShowNew(prev => !prev)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={loading}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div className="login-form-group">
            <label htmlFor="confirmar_contraseña">Confirmar Contraseña</label>
            <div className="login-input-container">
              <input
                type={showConfirm ? "text" : "password"}
                id="confirmar_contraseña"
                name="confirmar_contraseña"
                placeholder="Repite tu nueva contraseña"
                value={formData.confirmar_contraseña}
                onChange={handleChange}
                className={`login-input border ${!passwordMatch ? 'border-red-500 animate-shake' : 'border-gray-300'}`}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setShowConfirm(prev => !prev)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={loading}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {!passwordMatch && (
              <span className="text-red-600 font-semibold text-sm mt-1 block animate-pulse">
                Las contraseñas no coinciden
              </span>
            )}
          </div>

          <div className="login-button-container">
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? (
                <div className="login-spinner-container">
                  <div className="login-spinner"></div>
                  <span>Guardando...</span>
                </div>
              ) : (
                <>
                  <span className="login-button-text">Cambiar Contraseña</span>
                  <span className="login-button-icon">
                    <FaSpa />
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        {success && (
          <div className="text-green-600 mt-4 text-center">{success}</div>
        )}
      </div>
    </div>
  );
}
