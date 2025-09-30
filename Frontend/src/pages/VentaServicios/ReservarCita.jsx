import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  FaCalendarAlt, 
  FaClock, 
  FaUser, 
  FaHandSparkles, 
  FaArrowLeft, 
  FaSpinner, 
  FaExclamationTriangle,
  FaPlus,
  FaTrash,
  FaCheck
} from 'react-icons/fa';
import { useAuth } from '../../context/authContext';
import apiClient from '../../service/apiConfig';
import citasService from '../../service/CitasService';
import '../../styles/ReservarCita.css';

const ReservarCita = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estados principales
  const [servicios, setServicios] = useState([]);
  const [manicuristas, setManicuristas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    fecha_cita: '',
    observaciones: '',
    servicios: [] // Array de {servicio_id, manicurista_id, hora_cita}
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  // Estados de UI
  const [currentStep, setCurrentStep] = useState(1); // 1: Fecha, 2: Servicios, 3: Confirmación
  const [selectedServicio, setSelectedServicio] = useState(null);
  const [selectedManicurista, setSelectedManicurista] = useState(null);
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  // Manicuristas sin disponibilidad para la fecha escogida
  const [manicuristasSinDisponibilidad, setManicuristasSinDisponibilidad] = useState(new Set());

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      const [serviciosRes, manicuristasRes] = await Promise.all([
        apiClient.get('citas/user/servicios_activos/'),
        apiClient.get('citas/user/manicuristas_disponibles/')
      ]);
      
      const serviciosData = serviciosRes.data || [];
      const manicuristasData = manicuristasRes.data || [];
      setServicios(serviciosData);
      setManicuristas(manicuristasData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error cargando datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  // Detectar manicuristas sin disponibilidad (ausencia completa u horarios vacíos) en la fecha seleccionada
  useEffect(() => {
    if (!formData.fecha_cita || manicuristas.length === 0) return;
    const filtrarAusentes = async () => {
      try {
        // Endpoint de disponibilidad por profesional para el día: si no hay horarios, lo ocultamos
        const paramsBase = (id) => new URLSearchParams({
          professionalIds: id,
          date: formData.fecha_cita,
          durationMinutes: '30'
        });
        const checks = await Promise.all(
          manicuristas.map(async (m) => {
            try {
              const res = await apiClient.get(`availability/slots?${paramsBase(m.id)}`);
              const slots = res.data?.slots || res.data?.horarios_disponibles || [];
              return { id: m.id, has: Array.isArray(slots) && slots.length > 0 };
            } catch {
              // Si falla el backend, conservamos la manicurista para no vaciar la lista por error temporal
              return { id: m.id, has: true };
            }
          })
        );
        const sinDisp = new Set(checks.filter(c => !c.has).map(c => c.id));
        setManicuristasSinDisponibilidad(sinDisp);
        // Si la seleccionada quedó sin disponibilidad, deseleccionarla y limpiar horarios
        if (selectedManicurista && sinDisp.has(selectedManicurista.id)) {
          setSelectedManicurista(null);
          setHorariosDisponibles([]);
        }
      } catch {
        // ignorar
      }
    };
    filtrarAusentes();
  }, [formData.fecha_cita, manicuristas, selectedManicurista]);

  const cargarHorariosDisponibles = async (fecha, manicuristaId) => {
    if (!fecha || !manicuristaId || !selectedServicio) return;
    
    try {
      setLoadingHorarios(true);
      const params = new URLSearchParams({
        fecha: fecha,
        duracion: selectedServicio.duracion.toString(),
        manicurista: manicuristaId
      });
      
      const response = await apiClient.get(`citas/user/disponibilidad/?${params}`);
      setHorariosDisponibles(response.data.horarios_disponibles || []);
      
    } catch (error) {
      console.error('Error cargando horarios:', error);
      setHorariosDisponibles([]);
    } finally {
      setLoadingHorarios(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar errores del campo
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleServicioSelect = (servicio) => {
    setSelectedServicio(servicio);
    setSelectedManicurista(null);
    setHorariosDisponibles([]);
  };

  const handleManicuristaSelect = (manicurista) => {
    setSelectedManicurista(manicurista);
    setHorariosDisponibles([]);
    
    if (formData.fecha_cita) {
      cargarHorariosDisponibles(formData.fecha_cita, manicurista.id);
    }
  };

  const handleHoraSelect = (hora) => {
    if (!selectedServicio || !selectedManicurista) return;
    
    const nuevoServicio = {
      servicio_id: selectedServicio.id,
      manicurista_id: selectedManicurista.id,
      hora_cita: hora
    };
    
    setFormData(prev => ({
      ...prev,
      servicios: [...prev.servicios, nuevoServicio]
    }));
    
    // Limpiar selección
    setSelectedServicio(null);
    setSelectedManicurista(null);
    setHorariosDisponibles([]);
  };

  const removeServicio = (index) => {
    setFormData(prev => ({
      ...prev,
      servicios: prev.servicios.filter((_, i) => i !== index)
    }));
  };

  const validarPaso = (paso) => {
    switch (paso) {
      case 1:
        return formData.fecha_cita !== '';
      case 2:
        return formData.servicios.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const siguientePaso = () => {
    if (validarPaso(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const pasoAnterior = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getFechaMinima = () => {
    const hoy = new Date();
    hoy.setDate(hoy.getDate() + 1); // Mínimo mañana
    return hoy.toISOString().split('T')[0];
  };

  const getFechaMaxima = () => {
    const hoy = new Date();
    hoy.setDate(hoy.getDate() + 30); // Máximo 30 días
    return hoy.toISOString().split('T')[0];
  };

  const calcularTotal = () => {
    return formData.servicios.reduce((total, servicioInfo) => {
      const servicio = servicios.find(s => s.id === servicioInfo.servicio_id);
      const precio = servicio?.precio ? parseFloat(servicio.precio) : 0;
      return total + (isNaN(precio) ? 0 : precio);
    }, 0);
  };

  const calcularDuracionTotal = () => {
    return formData.servicios.reduce((total, servicioInfo) => {
      const servicio = servicios.find(s => s.id === servicioInfo.servicio_id);
      const duracion = servicio?.duracion ? parseInt(servicio.duracion) : 0;
      return total + (isNaN(duracion) ? 0 : duracion);
    }, 0);
  };

  const formatearPrecio = (precio) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(precio || 0);
  };

  const formatearDuracion = (minutos) => {
    if (!minutos) return '0 min';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
    }
    return `${mins}min`;
  };

  const confirmarReserva = async () => {
    try {
      setLoading(true);
      
      console.log('=== VERIFICANDO AUTENTICACIÓN ===');
      
      // Verificar si el usuario está autenticado
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
      const accessToken = localStorage.getItem('access_token');
      
      if (!userInfo.id || !accessToken) {
        console.log('❌ Usuario no autenticado, redirigiendo al login');
        toast.error('Debes iniciar sesión para reservar una cita');
        navigate('/login');
        return;
      }
      
      console.log('✅ Usuario autenticado:', userInfo.nombre, 'ID:', userInfo.id);
      console.log('=== INICIANDO CONFIRMACIÓN DE RESERVA ===');
      console.log('formData.servicios:', formData.servicios);
      console.log('servicios disponibles:', servicios);
      console.log('manicuristas disponibles:', manicuristas);
      
      // Crear una cita por cada servicio (como en el administrativo)
      const citasCreadas = [];
      
      for (const servicioInfo of formData.servicios) {
        const servicio = servicios.find(s => s.id === servicioInfo.servicio_id);
        const manicurista = manicuristas.find(m => m.id === servicioInfo.manicurista_id);
        
        // Validar que tenemos todos los datos necesarios
        if (!servicio || !manicurista || !servicioInfo.hora_cita) {
          console.error('Datos incompletos:', { servicio, manicurista, hora: servicioInfo.hora_cita });
          throw new Error('Datos incompletos para crear la cita');
        }
        
        // Usar directamente el ID del usuario como cliente
        const clienteFinalId = userInfo.id;
        
        console.log('=== CREANDO CITA ===');
        console.log('Usuario ID:', userInfo.id);
        console.log('Usuario rol:', userInfo.rol);
        console.log('Cliente ID a usar:', clienteFinalId);
        
        const dataToSend = {
          cliente: Number(clienteFinalId), // Usar el cliente final (creado o existente)
          manicurista: Number(servicioInfo.manicurista_id),
          servicios: [Number(servicioInfo.servicio_id)], // Array con un solo servicio como número
          servicio: Number(servicioInfo.servicio_id), // Campo adicional como en el admin
          fecha_cita: formData.fecha_cita,
          hora_cita: servicioInfo.hora_cita,
          observaciones: formData.observaciones || '',
          estado: "pendiente"
        };
        
        console.log('=== DATOS DETALLADOS ===');
        console.log('servicioInfo:', servicioInfo);
        console.log('servicio encontrado:', servicio);
        console.log('manicurista encontrada:', manicurista);
        console.log('dataToSend completo:', JSON.stringify(dataToSend, null, 2));
        console.log('Validación de datos:', {
          cliente: dataToSend.cliente,
          manicurista: dataToSend.manicurista,
          servicios: dataToSend.servicios,
          fecha_cita: dataToSend.fecha_cita,
          hora_cita: dataToSend.hora_cita
        });
        
        const response = await citasService.crearCita(dataToSend);
        citasCreadas.push(response);
      }
      
      if (citasCreadas.length > 0) {
        toast.success(`¡${citasCreadas.length} cita(s) reservada(s) exitosamente!`);
        navigate('/');
      }
    } catch (error) {
      console.error('=== ERROR DETALLADO ===');
      console.error('Error completo:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      
      let errorMessage = 'Error al reservar la cita';
      if (error.response?.data) {
        console.error('Datos de error del backend:', JSON.stringify(error.response.data, null, 2));
        
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.servicios) {
          errorMessage = `Error en servicios: ${Array.isArray(error.response.data.servicios) ? error.response.data.servicios.join(', ') : error.response.data.servicios}`;
        } else {
          // Mostrar todos los errores de validación
          const errors = [];
          Object.keys(error.response.data).forEach(key => {
            if (Array.isArray(error.response.data[key])) {
              errors.push(`${key}: ${error.response.data[key].join(', ')}`);
            } else {
              errors.push(`${key}: ${error.response.data[key]}`);
            }
          });
          errorMessage = errors.join(' | ');
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Paso 1: Selección de Fecha
  const renderFechaStep = () => (
    <div className="booking-step">
      <div className="step-header">
        <div className="step-icon">
          <FaCalendarAlt />
        </div>
        <div className="step-info">
          <h2>Selecciona la Fecha</h2>
          <p>Elige el día que mejor te convenga para tu cita</p>
        </div>
      </div>

      <div className="date-selection-main">
        <div className="date-input-container">
          <label>
            <FaCalendarAlt className="icon" />
            Fecha de la cita
          </label>
          <input
            type="date"
            value={formData.fecha_cita}
            onChange={(e) => handleInputChange('fecha_cita', e.target.value)}
            min={getFechaMinima()}
            max={getFechaMaxima()}
            className={`date-input-large ${formErrors.fecha_cita ? 'error' : ''}`}
          />
          {formErrors.fecha_cita && <div className="error-message">{formErrors.fecha_cita}</div>}
        </div>

        {formData.fecha_cita && (
          <div className="date-preview">
            <div className="date-info">
              <h3>Fecha seleccionada:</h3>
              <p className="selected-date">
                {new Date(formData.fecha_cita).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="step-actions">
        <button 
          className="btn-primary"
          onClick={siguientePaso}
          disabled={!validarPaso(1)}
        >
          Continuar
          <FaArrowLeft className="icon-rotate" />
        </button>
      </div>
    </div>
  );

  // Paso 2: Selección de Servicios
  const renderServiciosStep = () => (
    <div className="booking-step">
      <div className="step-header">
        <div className="step-icon">
          <FaHandSparkles />
        </div>
        <div className="step-info">
          <h2>Selecciona tus Servicios</h2>
          <p>Elige los servicios que deseas para tu cita</p>
        </div>
      </div>

      <div className="services-selection">
        {/* Servicios ya agregados */}
        {formData.servicios.length > 0 && (
          <div className="servicios-agregados">
            <h3>Servicios agregados:</h3>
            <div className="servicios-list">
              {formData.servicios.map((servicioInfo, index) => {
                const servicio = servicios.find(s => s.id === servicioInfo.servicio_id);
                const manicurista = manicuristas.find(m => m.id === servicioInfo.manicurista_id);
                return (
                  <div key={index} className="servicio-agregado">
                    <div className="servicio-info">
                      <h4>{servicio?.nombre}</h4>
                      <p>Con {manicurista?.nombres || manicurista?.nombre} a las {servicioInfo.hora_cita}</p>
                      <span className="servicio-precio">{formatearPrecio(servicio?.precio)}</span>
                    </div>
                    <button 
                      className="btn-remove"
                      onClick={() => removeServicio(index)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selección de nuevo servicio */}
        <div className="nuevo-servicio">
          <h3>Agregar servicio:</h3>
          
          {/* Selección de servicio */}
          <div className="servicio-selector">
            <label>Servicio:</label>
            <div className="servicios-grid">
              {servicios.map(servicio => (
                <div 
                  key={servicio.id}
                  className={`servicio-card ${selectedServicio?.id === servicio.id ? 'selected' : ''}`}
                  onClick={() => handleServicioSelect(servicio)}
                >
                  <div className="servicio-header">
                    <h4>{servicio.nombre}</h4>
                    <span className="servicio-precio">{formatearPrecio(servicio.precio)}</span>
                  </div>
                  <div className="servicio-details">
                    <p>{servicio.descripcion}</p>
                    <span className="servicio-duracion">{formatearDuracion(servicio.duracion)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selección de manicurista */}
          {selectedServicio && (
            <div className="manicurista-selector">
              <label>Manicurista:</label>
              <div className="manicuristas-grid">
                {manicuristas.map(manicurista => {
                  const disabled = manicuristasSinDisponibilidad.has(manicurista.id);
                  return (
                  <div 
                    key={manicurista.id}
                    className={`manicurista-card ${selectedManicurista?.id === manicurista.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={() => { if (!disabled) handleManicuristaSelect(manicurista); }}
                    title={disabled ? 'No disponible en la fecha seleccionada' : ''}
                    style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
                  >
                    <div className="manicurista-avatar">
                      <FaUser />
                    </div>
                    <div className="manicurista-info">
                      <h4>{manicurista.nombres || manicurista.nombre}</h4>
                      <p>{manicurista.especialidad || 'Sin especialidad'}</p>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )}

          {/* Selección de hora */}
          {selectedServicio && selectedManicurista && (
            <div className="hora-selector">
              <label>Hora disponible:</label>
              {loadingHorarios ? (
                <div className="loading-horarios">
                  <FaSpinner className="spinner" />
                  <span>Cargando horarios...</span>
                </div>
              ) : horariosDisponibles.length > 0 ? (
                <div className="horarios-grid">
                  {horariosDisponibles
                    .sort((a, b) => {
                      const [horaA, minA] = a.split(':').map(Number);
                      const [horaB, minB] = b.split(':').map(Number);
                      return (horaA * 60 + minA) - (horaB * 60 + minB);
                    })
                    .map(horario => (
                      <button
                        key={horario}
                        className="horario-btn"
                        onClick={() => handleHoraSelect(horario)}
                      >
                        {horario}
                      </button>
                    ))}
                </div>
              ) : (
                <div className="no-horarios">
                  <FaExclamationTriangle />
                  <p>No hay horarios disponibles</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resumen */}
        {formData.servicios.length > 0 && (
          <div className="resumen-servicios">
            <h3>Resumen:</h3>
            <div className="resumen-details">
              <div className="resumen-item">
                <span>Total servicios:</span>
                <span>{formData.servicios.length}</span>
              </div>
              <div className="resumen-item">
                <span>Duración total:</span>
                <span>{formatearDuracion(calcularDuracionTotal())}</span>
              </div>
              <div className="resumen-item total">
                <span>Total a pagar:</span>
                <span>{formatearPrecio(calcularTotal())}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="step-actions">
        <button className="btn-secondary" onClick={pasoAnterior}>
          <FaArrowLeft />
          Anterior
        </button>
        <button 
          className="btn-primary"
          onClick={siguientePaso}
          disabled={!validarPaso(2)}
        >
          Continuar
          <FaArrowLeft className="icon-rotate" />
        </button>
      </div>
    </div>
  );

  // Paso 3: Confirmación
  const renderConfirmacionStep = () => (
    <div className="booking-step">
      <div className="step-header">
        <div className="step-icon">
          <FaCheck />
        </div>
        <div className="step-info">
          <h2>Confirma tu Cita</h2>
          <p>Revisa todos los detalles antes de confirmar</p>
        </div>
      </div>

      <div className="confirmation-content">
        <div className="confirmation-summary">
          <h3>Resumen de tu cita:</h3>
          
          <div className="summary-section">
            <div className="summary-item">
              <FaCalendarAlt className="icon" />
              <div>
                <span className="label">Fecha:</span>
                <span className="value">
                  {new Date(formData.fecha_cita).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <h4>Servicios:</h4>
            {formData.servicios.map((servicioInfo, index) => {
              const servicio = servicios.find(s => s.id === servicioInfo.servicio_id);
              const manicurista = manicuristas.find(m => m.id === servicioInfo.manicurista_id);
              return (
                <div key={index} className="service-summary-item">
                  <div className="service-info">
                    <span className="service-name">{servicio?.nombre}</span>
                    <span className="service-duration">({formatearDuracion(servicio?.duracion)})</span>
                  </div>
                  <div className="service-details">
                    <span className="service-price">{formatearPrecio(servicio?.precio)}</span>
                    <span className="service-manicurista">
                      Con {manicurista?.nombres || manicurista?.nombre} a las {servicioInfo.hora_cita}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="summary-total">
            <div className="total-item">
              <span>Duración total:</span>
              <span>{formatearDuracion(calcularDuracionTotal())}</span>
            </div>
            <div className="total-item final">
              <span>Total a pagar:</span>
              <span>{formatearPrecio(calcularTotal())}</span>
            </div>
          </div>
        </div>

        <div className="confirmation-form">
          <div className="form-group">
            <label>
              <FaHandSparkles className="icon" />
              Observaciones (opcional)
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => handleInputChange('observaciones', e.target.value)}
              placeholder="Agrega cualquier observación especial..."
              rows={4}
              className="observaciones-input"
            />
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button className="btn-secondary" onClick={pasoAnterior}>
          <FaArrowLeft />
          Anterior
        </button>
        <button 
          className="btn-primary btn-confirm"
          onClick={confirmarReserva}
          disabled={loading}
        >
          {loading ? (
            <>
              <FaSpinner className="spinner" />
              Confirmando...
            </>
          ) : (
            <>
              <FaCheck />
              Confirmar Cita
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="booking-page">
        <div className="loading-container">
          <FaSpinner className="spinner" />
          <p>Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      {/* Header */}
      <div className="booking-header">
        <div className="header-left">
          <button 
            className="btn-back"
            onClick={() => navigate('/')}
          >
            <FaArrowLeft />
            Volver al Inicio
          </button>
        </div>
        <div className="header-center">
          <h1>Reservar Cita</h1>
          <p>Reserva tu cita de manera fácil y rápida</p>
        </div>
        <div className="header-right">
          <div className="user-info">
            <FaUser />
            <span>{user?.nombre || user?.cliente?.nombre}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div className="progress-step">
            <div className={`step-circle ${currentStep >= 1 ? 'active' : ''}`}>
              <span>1</span>
            </div>
            <span className="step-label">Fecha</span>
          </div>
          <div className="progress-line"></div>
          <div className="progress-step">
            <div className={`step-circle ${currentStep >= 2 ? 'active' : ''}`}>
              <span>2</span>
            </div>
            <span className="step-label">Servicios</span>
          </div>
          <div className="progress-line"></div>
          <div className="progress-step">
            <div className={`step-circle ${currentStep >= 3 ? 'active' : ''}`}>
              <span>3</span>
            </div>
            <span className="step-label">Confirmación</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="booking-content">
        {currentStep === 1 && renderFechaStep()}
        {currentStep === 2 && renderServiciosStep()}
        {currentStep === 3 && renderConfirmacionStep()}
      </div>

      {/* Error Messages */}
      {generalError && (
        <div className="error-banner">
          <FaExclamationTriangle />
          <span>{generalError}</span>
        </div>
      )}
    </div>
  );
};

export default ReservarCita;