"use client"

import { useState, useEffect } from "react"
import {
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendarAlt,
  FaClock,
  FaCheckCircle,
  FaTimes,
  FaExclamationTriangle,
  FaEye,
  FaFilter,
  FaUser,
  FaServicestack,
  FaDollarSign,
  FaChartLine,
  FaHourglassHalf,
  FaPlay,
  FaStop,
} from "react-icons/fa"
import citasService from "../service/CitasService"
import "../styles/Dashboard.css"
import "../styles/DashboardManicurista.css"
import toast from "react-hot-toast"

const DashboardManicurista = () => {
  // Estados principales
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [citas, setCitas] = useState([])
  const [manicuristaInfo, setManicuristaInfo] = useState(null)

  // Estados para filtros
  const [filtroTiempo, setFiltroTiempo] = useState("dia") // dia, semana, mes
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date())

  // Estados para estadísticas
  const [estadisticas, setEstadisticas] = useState({
    pendientes: 0,
    completadas: 0,
    canceladas: 0,
    proximas: 0,
    totalIngresos: 0
  })

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosManicurista()
  }, [])

  // Cargar citas cuando cambie el filtro
  useEffect(() => {
    if (manicuristaInfo) {
      cargarCitasManicurista()
    }
  }, [filtroTiempo, fechaSeleccionada, manicuristaInfo])

  const cargarDatosManicurista = async () => {
    try {
      setLoading(true)
      
      // Obtener información del usuario actual
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
      
      if (!userInfo.id) {
        throw new Error('No se encontró información del usuario')
      }

      // Usar la información del usuario directamente como manicurista
      // En el sistema, el usuario con rol manicurista ES la manicurista
      const manicuristaData = {
        id: userInfo.id,
        nombres: userInfo.nombres || userInfo.nombre || 'Manicurista',
        apellidos: userInfo.apellidos || userInfo.apellido || '',
        correo: userInfo.correo_electronico || userInfo.correo || '',
        telefono: userInfo.telefono || userInfo.celular || '',
        estado: userInfo.is_active ? 'activo' : 'inactivo'
      }
      
      setManicuristaInfo(manicuristaData)
      
    } catch (error) {
      console.error('Error cargando datos de manicurista:', error)
      setError('Error al cargar los datos de la manicurista')
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const cargarCitasManicurista = async () => {
    try {
      if (!manicuristaInfo) return

      // Calcular fechas según el filtro
      const { fechaInicio, fechaFin } = calcularFechasFiltro()
      
      // Obtener citas con filtros
      const filtros = {
        manicurista_id: manicuristaInfo.id,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      }

      const citasData = await citasService.obtenerCitas(filtros)
      setCitas(citasData || [])
      
      // Calcular estadísticas
      calcularEstadisticas(citasData || [])
      
    } catch (error) {
      console.error('Error cargando citas:', error)
      toast.error('Error al cargar las citas')
    }
  }

  const calcularFechasFiltro = () => {
    const hoy = new Date(fechaSeleccionada)
    let fechaInicio, fechaFin

    switch (filtroTiempo) {
      case 'dia':
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
        fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59)
        break
      case 'semana':
        const inicioSemana = new Date(hoy)
        inicioSemana.setDate(hoy.getDate() - hoy.getDay())
        fechaInicio = new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate())
        
        const finSemana = new Date(inicioSemana)
        finSemana.setDate(inicioSemana.getDate() + 6)
        fechaFin = new Date(finSemana.getFullYear(), finSemana.getMonth(), finSemana.getDate(), 23, 59, 59)
        break
      case 'mes':
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59)
        break
      default:
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
        fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59)
    }

    return {
      fechaInicio: fechaInicio.toISOString().split('T')[0],
      fechaFin: fechaFin.toISOString().split('T')[0]
    }
  }

  const calcularEstadisticas = (citasData) => {
    const stats = {
      pendientes: 0,
      completadas: 0,
      canceladas: 0,
      proximas: 0,
      totalIngresos: 0
    }

    const ahora = new Date()
    const proximas24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000)

    citasData.forEach(cita => {
      switch (cita.estado) {
        case 'pendiente':
          stats.pendientes++
          break
        case 'finalizada':
        case 'realizada':
          stats.completadas++
          break
        case 'cancelada':
          stats.canceladas++
          break
      }

      // Verificar si es próxima (dentro de 24 horas)
      const fechaCita = new Date(cita.fecha_cita)
      if (fechaCita >= ahora && fechaCita <= proximas24h) {
        stats.proximas++
      }

      // Sumar ingresos si la cita está completada
      if ((cita.estado === 'finalizada' || cita.estado === 'realizada') && cita.total) {
        stats.totalIngresos += parseFloat(cita.total) || 0
      }
    })

    setEstadisticas(stats)
  }

  const cambiarFiltroTiempo = (nuevoFiltro) => {
    setFiltroTiempo(nuevoFiltro)
  }


  const formatearFecha = (fecha) => {
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatearHora = (hora) => {
    return hora.substring(0, 5) // HH:MM
  }

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor)
  }

  const obtenerTextoEstado = (estado) => {
    const estados = {
      pendiente: "Pendiente",
      finalizada: "Completada",
      cancelada: "Cancelada",
      realizada: "Realizada"
    }
    return estados[estado] || estado
  }

  const obtenerClaseEstado = (estado) => {
    const clases = {
      pendiente: "estado-pendiente",
      finalizada: "estado-completada",
      cancelada: "estado-cancelada",
      realizada: "estado-realizada"
    }
    return clases[estado] || ""
  }

  const obtenerIconoEstado = (estado) => {
    const iconos = {
      pendiente: <FaHourglassHalf className="icono-estado" />,
      finalizada: <FaCheckCircle className="icono-estado" />,
      cancelada: <FaTimes className="icono-estado" />,
      realizada: <FaCheckCircle className="icono-estado" />
    }
    return iconos[estado] || <FaExclamationTriangle className="icono-estado" />
  }

  const obtenerTextoPeriodo = () => {
    switch (filtroTiempo) {
      case "dia":
        return "Hoy"
      case "semana":
        return "Esta Semana"
      case "mes":
        return "Este Mes"
      default:
        return "Período"
    }
  }

  // Renderizar lista de citas
  const renderCitas = () => {
    if (citas.length === 0) {
      return (
        <div className="empty-state">
          <FaCalendarAlt className="empty-icon" />
          <p>No hay citas en este período</p>
          <small>Intenta cambiar el período o los filtros</small>
        </div>
      )
    }

    return (
      <div className="citas-list">
        {citas.slice(0, 10).map((cita) => (
          <div key={cita.id} className="cita-item">
            <div className="cita-header">
              <div className="cita-id">📅 Cita #{cita.id}</div>
              <div className={`cita-estado ${obtenerClaseEstado(cita.estado)}`}>
                {obtenerIconoEstado(cita.estado)}
                {obtenerTextoEstado(cita.estado)}
              </div>
            </div>
            
            <div className="cita-info">
              <div className="cita-cliente">
                <strong>👤 Cliente:</strong> 
                <span className="cliente-nombre">{cita.cliente_nombre || "No disponible"}</span>
              </div>
              
              <div className="cita-servicio">
                <strong>🔧 Servicio:</strong> 
                <span className="servicio-nombre">{cita.servicio_nombre || "No especificado"}</span>
              </div>
              
              <div className="cita-fecha-hora">
                <strong>📅 Fecha:</strong> 
                <span className="fecha-formateada">
                  {new Date(cita.fecha_cita).toLocaleDateString('es-ES')} - {formatearHora(cita.hora_cita)}
                </span>
              </div>
              
              {cita.total && (
                <div className="cita-total">
                  <strong>💵 Total:</strong> 
                  <span className="total-valor">{formatearMoneda(cita.total)}</span>
                </div>
              )}
              
              {cita.observaciones && (
                <div className="cita-observaciones">
                  <strong>📝 Observaciones:</strong> 
                  <span className="observaciones-texto">{cita.observaciones}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {citas.length > 10 && (
          <div className="ver-mas">
            <button className="btn-ver-mas">
              Ver {citas.length - 10} más...
            </button>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="dashboard-main">
        <div className="loading-state">
          <div className="spinner"></div>
          <h3>Cargando Dashboard</h3>
          <p>Obteniendo datos de citas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-main">
        <div className="error-state">
          <FaExclamationTriangle className="error-icon" />
          <h3>Error al cargar el Dashboard</h3>
          <p>{error}</p>
          <button onClick={cargarDatosManicurista} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!manicuristaInfo) {
    return (
      <div className="dashboard-main">
        <div className="empty-state">
          <FaExclamationTriangle className="empty-icon" />
          <h3>No hay datos disponibles</h3>
          <p>No se pudieron obtener los datos de la manicurista</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-main">
      <div className="dashboard-container">
        {/* Header del Dashboard */}
        <div className="dashboard-header">
          <div className="dashboard-title-section">
            <h1>
              <FaUser className="title-icon" />
              Dashboard de Manicurista
            </h1>
            <p>Gestión de citas y servicios - {manicuristaInfo.nombres} {manicuristaInfo.apellidos}</p>
          </div>

          {/* Filtros de período */}
          <div className="period-filters">
            <span className="period-label">Período:</span>
            <div className="period-buttons">
              <button
                className={`period-btn ${filtroTiempo === "dia" ? "active" : ""}`}
                onClick={() => setFiltroTiempo("dia")}
              >
                <FaCalendarDay />
                Día
              </button>
              <button
                className={`period-btn ${filtroTiempo === "semana" ? "active" : ""}`}
                onClick={() => setFiltroTiempo("semana")}
              >
                <FaCalendarWeek />
                Semana
              </button>
              <button
                className={`period-btn ${filtroTiempo === "mes" ? "active" : ""}`}
                onClick={() => setFiltroTiempo("mes")}
              >
                <FaCalendarAlt />
                Mes
              </button>
            </div>
          </div>
        </div>


        {/* Grid de métricas */}
        <div className="metrics-grid">
          {/* Card de Citas Pendientes */}
          <div className="metric-card earnings">
            <div className="metric-header">
              <div className="metric-icon earnings">
                <FaHourglassHalf />
              </div>
            </div>
            <div className="metric-title">Citas Pendientes {obtenerTextoPeriodo()}</div>
            <div className="metric-value">{estadisticas.pendientes}</div>
            <div className="metric-details">
              <div className="metric-detail">
                <FaClock className="metric-detail-icon" />
                <span>Por realizar</span>
              </div>
            </div>
          </div>

          {/* Card de Citas Completadas */}
          <div className="metric-card manicurista">
            <div className="metric-header">
              <div className="metric-icon manicurist">
                <FaCheckCircle />
              </div>
            </div>
            <div className="metric-title">Citas Completadas {obtenerTextoPeriodo()}</div>
            <div className="metric-value">{estadisticas.completadas}</div>
            <div className="metric-details">
              <div className="metric-detail">
                <FaCheckCircle className="metric-detail-icon" />
                <span>Realizadas</span>
              </div>
            </div>
          </div>

          {/* Card de Citas Canceladas */}
          <div className="metric-card service">
            <div className="metric-header">
              <div className="metric-icon service">
                <FaTimes />
              </div>
            </div>
            <div className="metric-title">Citas Canceladas {obtenerTextoPeriodo()}</div>
            <div className="metric-value">{estadisticas.canceladas}</div>
            <div className="metric-details">
              <div className="metric-detail">
                <FaTimes className="metric-detail-icon" />
                <span>Canceladas</span>
              </div>
            </div>
          </div>

          {/* Card de Próximas 24h */}
          <div className="metric-card summary">
            <div className="metric-header">
              <div className="metric-icon summary">
                <FaExclamationTriangle />
              </div>
            </div>
            <div className="metric-title">Próximas 24h</div>
            <div className="metric-value">{estadisticas.proximas}</div>
            <div className="metric-details">
              <div className="metric-detail">
                <FaClock className="metric-detail-icon" />
                <span>Citas próximas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Citas */}
        <div className="pending-section">
          <div className="pending-grid">
            {/* Citas del Período */}
            <div className="pending-card">
              <div className="pending-header">
                <h3>
                  <FaServicestack className="pending-icon" />
                  Citas del Período ({citas.length})
                </h3>
              </div>
              <div className="pending-content">
                {renderCitas()}
              </div>
            </div>

            {/* Resumen de Ingresos */}
            <div className="pending-card">
              <div className="pending-header">
                <h3>
                  <FaDollarSign className="pending-icon" />
                  Resumen de Ingresos {obtenerTextoPeriodo()}
                </h3>
              </div>
              <div className="pending-content">
                <div className="ingresos-summary">
                  <div className="ingresos-total">
                    <div className="ingresos-label">Total Ingresos:</div>
                    <div className="ingresos-valor">{formatearMoneda(estadisticas.totalIngresos)}</div>
                  </div>
                  <div className="ingresos-details">
                    <div className="ingresos-detail">
                      <span className="detail-label">Citas Completadas:</span>
                      <span className="detail-value">{estadisticas.completadas}</span>
                    </div>
                    <div className="ingresos-detail">
                      <span className="detail-label">Promedio por Cita:</span>
                      <span className="detail-value">
                        {formatearMoneda(estadisticas.completadas > 0 ? estadisticas.totalIngresos / estadisticas.completadas : 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardManicurista