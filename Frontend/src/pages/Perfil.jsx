import React, { useState, useEffect } from 'react';
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaLock, FaSave, FaArrowLeft, FaIdCard, FaSpa } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { updateUserProfile, changeUserPassword, getUserProfile } from '../service/userProfileService';
import { useAuth } from '../context/authContext';
import '../styles/Perfil.css';

const Perfil = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    tipo_documento: 'CC',
    documento: '',
    celular: '',
    correo_electronico: '',
    direccion: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({});

  // Estados para dirección
  const [tipoVia, setTipoVia] = useState('');
  const [numeroPrincipal, setNumeroPrincipal] = useState('');
  const [numeroSecundario, setNumeroSecundario] = useState('');
  const [complemento, setComplemento] = useState('');

  // Cargar datos del usuario desde el backend
  useEffect(() => {
    const loadUserData = async () => {
      if (user && user.id) {
        try {
          console.log('👤 Cargando datos del usuario desde backend...');
          const userData = await getUserProfile(user.id);
          console.log('📊 Datos completos del usuario:', userData);
          
          setFormData({
            nombre: userData.nombre || '',
            tipo_documento: userData.tipo_documento || 'CC',
            documento: userData.documento || '',
            celular: userData.celular || '',
            correo_electronico: userData.correo_electronico || '',
            direccion: userData.direccion || '',
            current_password: '',
            new_password: '',
            confirm_password: ''
          });

          // Parsear la dirección si existe
          if (userData.direccion) {
            console.log('🏠 Dirección completa:', userData.direccion);
            const direccionParts = userData.direccion.split(' ');
            console.log('🔍 Partes de la dirección:', direccionParts);
            
            // Intentar parsear la dirección en diferentes formatos
            if (direccionParts.length >= 3) {
              // Buscar el índice del separador "#"
              const hashIndex = direccionParts.findIndex(part => part === '#');
              
              if (hashIndex > 0 && hashIndex < direccionParts.length - 1) {
                // Formato: "TipoVia Numero # NumeroSecundario Complemento"
                setTipoVia(direccionParts[0] || '');
                setNumeroPrincipal(direccionParts[1] || '');
                setNumeroSecundario(direccionParts[hashIndex + 1] || '');
                setComplemento(direccionParts.slice(hashIndex + 2).join(' ') || '');
              } else {
                // Buscar formato con "#" dentro de una parte: "TipoVia Numero #NumeroSecundario-Complemento"
                const partWithHash = direccionParts.find(part => part.includes('#'));
                if (partWithHash) {
                  const hashParts = partWithHash.split('#');
                  if (hashParts.length === 2) {
                    const afterHash = hashParts[1];
                    const dashIndex = afterHash.indexOf('-');
                    
                    setTipoVia(direccionParts[0] || '');
                    setNumeroPrincipal(direccionParts[1] || '');
                    
                    if (dashIndex > 0) {
                      // Formato: "#NumeroSecundario-Complemento"
                      setNumeroSecundario(afterHash.substring(0, dashIndex));
                      setComplemento(afterHash.substring(dashIndex + 1));
                    } else {
                      // Formato: "#NumeroSecundario"
                      setNumeroSecundario(afterHash);
                      setComplemento('');
                    }
                  } else {
                    // Formato alternativo: "TipoVia Numero NumeroSecundario Complemento"
                    setTipoVia(direccionParts[0] || '');
                    setNumeroPrincipal(direccionParts[1] || '');
                    setNumeroSecundario(direccionParts[2] || '');
                    setComplemento(direccionParts.slice(3).join(' ') || '');
                  }
                } else {
                  // Formato alternativo: "TipoVia Numero NumeroSecundario Complemento"
                  setTipoVia(direccionParts[0] || '');
                  setNumeroPrincipal(direccionParts[1] || '');
                  setNumeroSecundario(direccionParts[2] || '');
                  setComplemento(direccionParts.slice(3).join(' ') || '');
                }
              }
            } else if (direccionParts.length >= 2) {
              // Formato mínimo: "TipoVia Numero"
              setTipoVia(direccionParts[0] || '');
              setNumeroPrincipal(direccionParts[1] || '');
              setNumeroSecundario('');
              setComplemento(direccionParts.slice(2).join(' ') || '');
            } else {
              // Si no tiene el formato esperado, usar la dirección completa en complemento
              setTipoVia('');
              setNumeroPrincipal('');
              setNumeroSecundario('');
              setComplemento(userData.direccion);
            }
            
            console.log('📝 Dirección parseada:');
            console.log('  Tipo de vía:', direccionParts[0] || '');
            console.log('  Número principal:', direccionParts[1] || '');
            console.log('  Número secundario:', direccionParts[2] || '');
            console.log('  Complemento:', direccionParts.slice(3).join(' ') || '');
          }
        } catch (error) {
          console.error('❌ Error cargando datos del usuario:', error);
          // Fallback a los datos del contexto si hay error
          setFormData({
            nombre: user.nombre || '',
            tipo_documento: user.tipo_documento || 'CC',
            documento: user.documento || '',
            celular: user.celular || '',
            correo_electronico: user.correo_electronico || '',
            direccion: user.direccion || '',
            current_password: '',
            new_password: '',
            confirm_password: ''
          });
        }
      }
    };

    loadUserData();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Limpiar error de validación cuando el usuario empiece a escribir
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  };

  const actualizarDireccion = () => {
    const direccionCompleta = `${tipoVia} ${numeroPrincipal} #${numeroSecundario}-${complemento}`.trim();
    setFormData(prev => ({
      ...prev,
      direccion: direccionCompleta
    }));
    setTouched(prev => ({ ...prev, direccion: true }));
  };

  // Efecto para actualizar la dirección cuando cambian los componentes
  useEffect(() => {
    if (tipoVia || numeroPrincipal || numeroSecundario || complemento) {
      actualizarDireccion();
    }
  }, [tipoVia, numeroPrincipal, numeroSecundario, complemento]);

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = () => {
    const errors = {};

    // Validar nombre
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre completo es requerido';
    } else if (formData.nombre.trim().length < 3) {
      errors.nombre = 'El nombre debe tener al menos 3 caracteres';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.nombre)) {
      errors.nombre = 'El nombre solo puede contener letras y espacios';
    }

    // Validar documento
    if (!formData.documento.trim()) {
      errors.documento = 'El número de documento es requerido';
    } else if (formData.documento.length < 6) {
      errors.documento = 'El documento debe tener al menos 6 caracteres';
    }

    // Validar celular
    if (!formData.celular.trim()) {
      errors.celular = 'El número de celular es requerido';
    } else if (formData.celular.length !== 10) {
      errors.celular = 'El celular debe tener exactamente 10 dígitos';
    } else if (!formData.celular.startsWith('3')) {
      errors.celular = 'El celular debe iniciar con 3';
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.correo_electronico.trim()) {
      errors.correo_electronico = 'El correo electrónico es requerido';
    } else if (!emailRegex.test(formData.correo_electronico)) {
      errors.correo_electronico = 'Formato de correo electrónico inválido';
    }

    // Validar dirección
    if (!tipoVia) {
      errors.direccion = 'Debe seleccionar el tipo de vía';
    } else if (!numeroPrincipal) {
      errors.direccion = 'Debe ingresar el número principal';
    } else if (!numeroSecundario) {
      errors.direccion = 'Debe ingresar el número secundario';
    } else if (!complemento) {
      errors.direccion = 'Debe ingresar el complemento';
    } else if (!/^[a-zA-Z0-9]{1,6}$/.test(numeroPrincipal)) {
      errors.direccion = 'Número principal inválido (1-6 caracteres alfanuméricos)';
    } else if (!/^[a-zA-Z0-9]{1,6}$/.test(numeroSecundario)) {
      errors.direccion = 'Número secundario inválido (1-6 caracteres alfanuméricos)';
    } else if (!/^[a-zA-Z0-9]{1,6}$/.test(complemento)) {
      errors.direccion = 'Complemento inválido (1-6 caracteres alfanuméricos)';
    }

    // Validar contraseña actual si se está cambiando la contraseña
    if (formData.new_password || formData.confirm_password) {
      if (!formData.current_password) {
        errors.current_password = 'La contraseña actual es requerida para cambiar la contraseña';
      }
    }

    // Validar nueva contraseña
    if (formData.new_password) {
      if (formData.new_password.length < 8) {
        errors.new_password = 'La nueva contraseña debe tener al menos 8 caracteres';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.new_password)) {
        errors.new_password = 'La contraseña debe contener al menos una mayúscula, una minúscula y un número';
      }
    }

    // Validar confirmación de contraseña
    if (formData.confirm_password) {
      if (formData.confirm_password !== formData.new_password) {
        errors.confirm_password = 'Las contraseñas no coinciden';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }

    setIsLoading(true);
    try {
      // Preparar datos para enviar (usando nombres de campos del backend)
      const updateData = {
        nombre: formData.nombre.trim(),
        tipo_documento: formData.tipo_documento,
        documento: formData.documento.trim(),
        celular: formData.celular.trim(),
        correo_electronico: formData.correo_electronico.trim(),
        direccion: formData.direccion.trim()
      };

      // Actualizar perfil básico
      await updateUserProfile(user.id, updateData);

      // Si se está cambiando la contraseña, hacerlo por separado
      if (formData.new_password) {
        const passwordData = {
          current_password: formData.current_password,
          new_password: formData.new_password
        };
        await changeUserPassword(user.id, passwordData);
      }
      
      // Actualizar el contexto del usuario
      updateUser(updateData);
      
      toast.success('Perfil actualizado exitosamente');
      
      // Limpiar campos de contraseña
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Error al actualizar el perfil. Inténtalo de nuevo.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="perfil-page">
      <div className="perfil-container">
        <div className="perfil-header">
          <div className="header-content">
            <h1>Mi Perfil</h1>
            <p>Actualiza tu información personal</p>
          </div>
          {/* Botón Volver para todos los usuarios */}
          <button 
            className="volver-btn"
            onClick={handleBack}
          >
            <FaArrowLeft className="btn-icon" />
            <span>Volver</span>
          </button>
        </div>

        <div className="perfil-content">
          <form className="perfil-form" onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Información Personal</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nombre">
                    <FaUser className="input-icon" />
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    maxLength={50}
                    value={formData.nombre}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={touched.nombre && validationErrors.nombre ? 'error' : ''}
                    placeholder="Nombre completo"
                  />
                  {touched.nombre && validationErrors.nombre && (
                    <span className="error-message">{validationErrors.nombre}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="documento">
                    <FaIdCard className="input-icon" />
                    Documento *
                  </label>
                  <div className="documento-group">
                    <select
                      id="tipo_documento"
                      name="tipo_documento"
                      value={formData.tipo_documento}
                      onChange={handleInputChange}
                      className="documento-select"
                    >
                      <option value="CC">CC</option>
                      <option value="CE">CE</option>
                      <option value="TI">TI</option>
                      <option value="PP">PP</option>
                    </select>
                    <input
                      type="text"
                      id="documento"
                      name="documento"
                      maxLength={15}
                      value={formData.documento}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                        setFormData({
                          ...formData,
                          documento: value,
                        });
                        setTouched({
                          ...touched,
                          documento: true,
                        });
                      }}
                      onBlur={handleBlur}
                      className={touched.documento && validationErrors.documento ? 'error' : ''}
                      placeholder="Número"
                    />
                  </div>
                  {touched.documento && validationErrors.documento && (
                    <span className="error-message">{validationErrors.documento}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="celular">
                    <FaPhone className="input-icon" />
                    Número celular *
                  </label>
                  <input
                    type="text"
                    id="celular"
                    name="celular"
                    maxLength={10}
                    value={formData.celular}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setFormData({
                        ...formData,
                        celular: value,
                      });
                      setTouched({
                        ...touched,
                        celular: true,
                      });
                    }}
                    onBlur={handleBlur}
                    className={touched.celular && validationErrors.celular ? 'error' : ''}
                    placeholder="3001234567"
                  />
                  {touched.celular && validationErrors.celular && (
                    <span className="error-message">{validationErrors.celular}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="correo_electronico">
                    <FaEnvelope className="input-icon" />
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    id="correo_electronico"
                    name="correo_electronico"
                    maxLength={50}
                    value={formData.correo_electronico}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={touched.correo_electronico && validationErrors.correo_electronico ? 'error' : ''}
                    placeholder="correo@ejemplo.com"
                  />
                  {touched.correo_electronico && validationErrors.correo_electronico && (
                    <span className="error-message">{validationErrors.correo_electronico}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="direccion">
                  <FaMapMarkerAlt className="input-icon" />
                  Dirección *
                </label>
                <div className="direccion-group">
                  <select 
                    value={tipoVia} 
                    onChange={(e) => setTipoVia(e.target.value)} 
                    className="direccion-select"
                    required
                  >
                    <option value="">Tipo de vía</option>
                    <option value="Calle">Calle</option>
                    <option value="Carrera">Carrera</option>
                    <option value="Avenida">Avenida</option>
                    <option value="Transversal">Transversal</option>
                    <option value="Diagonal">Diagonal</option>
                  </select>

                  <input
                    type="text"
                    value={numeroPrincipal}
                    onChange={(e) => setNumeroPrincipal(e.target.value)}
                    placeholder="Ej: 34B"
                    maxLength={6}
                    className="direccion-input"
                  />

                  <span className="direccion-separador">#</span>

                  <input
                    type="text"
                    value={numeroSecundario}
                    onChange={(e) => setNumeroSecundario(e.target.value)}
                    placeholder="Ej: 23"
                    maxLength={6}
                    className="direccion-input"
                  />

                  <span className="direccion-separador">-</span>

                  <input
                    type="text"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Ej: 45A"
                    maxLength={6}
                    className="direccion-input"
                  />
                </div>

                <input
                  type="text"
                  value={`${tipoVia} ${numeroPrincipal} #${numeroSecundario}-${complemento}`}
                  className="direccion-preview"
                  disabled
                />

                {touched.direccion && validationErrors.direccion && (
                  <span className="error-message">{validationErrors.direccion}</span>
                )}
              </div>
            </div>

            <div className="form-section">
              <h3>Cambiar Contraseña</h3>
              <p className="section-description">
                Deja estos campos vacíos si no quieres cambiar tu contraseña
              </p>

              <div className="form-group">
                <label htmlFor="current_password">
                  <FaLock className="input-icon" />
                  Contraseña actual
                </label>
                <div className="password-input-container">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    id="current_password"
                    name="current_password"
                    value={formData.current_password}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={touched.current_password && validationErrors.current_password ? 'error' : ''}
                    placeholder="Ingresa tu contraseña actual"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('current')}
                  >
                    {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {touched.current_password && validationErrors.current_password && (
                  <span className="error-message">{validationErrors.current_password}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="new_password">
                  <FaLock className="input-icon" />
                  Nueva contraseña
                </label>
                <div className="password-input-container">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    id="new_password"
                    name="new_password"
                    value={formData.new_password}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={touched.new_password && validationErrors.new_password ? 'error' : ''}
                    placeholder="Ingresa tu nueva contraseña"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {touched.new_password && validationErrors.new_password && (
                  <span className="error-message">{validationErrors.new_password}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">
                  <FaLock className="input-icon" />
                  Confirmar nueva contraseña
                </label>
                <div className="password-input-container">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    id="confirm_password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={touched.confirm_password && validationErrors.confirm_password ? 'error' : ''}
                    placeholder="Confirma tu nueva contraseña"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {touched.confirm_password && validationErrors.confirm_password && (
                  <span className="error-message">{validationErrors.confirm_password}</span>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="save-button"
                disabled={isLoading}
              >
                <FaSave />
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
