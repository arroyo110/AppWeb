"use client"

import { useState, useEffect } from "react"
import {
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendarAlt,
  FaDollarSign,
  FaUserTie,
  FaServicestack,
  FaChartLine,
  FaUsers,
  FaClock,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaExclamationTriangle,
  FaChartBar,
} from "react-icons/fa"
import dashboardRealService from "../service/dashboardService"
import "../styles/Dashboard.css"
import toast from "react-hot-toast"

const DashboardReal = () => {
  // Estados
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [datos, setDatos] = useState(null)
  const [datosGrafico, setDatosGrafico] = useState([])

  // Estados para filtros
  const [tipoFiltro, setTipoFiltro] = useState("periodo")
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("mes")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")


  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos()
  }, [])

  // Escuchar cambios en localStorage para actualización automática
  useEffect(() => {
    const checkForUpdates = () => {
      const needsUpdate = localStorage.getItem('dashboardNeedsUpdate')
      if (needsUpdate === 'true') {
        console.log("🔄 Dashboard detectó nueva cita, actualizando datos...")
        localStorage.removeItem('dashboardNeedsUpdate')
        const lastCitaCreated = localStorage.getItem('lastCitaCreated')
        if (lastCitaCreated) {
          const timeDiff = Date.now() - new Date(lastCitaCreated).getTime()
          if (timeDiff < 60000) { // Si la cita se creó hace menos de 1 minuto
            toast.success("¡Nueva cita detectada! Actualizando dashboard...")
          }
        }
        cargarDatos()
      }
    }

    // Verificar al cargar
    checkForUpdates()

    // Escuchar eventos de storage
    const handleStorageChange = (e) => {
      if (e.key === 'dashboardNeedsUpdate' && e.newValue === 'true') {
        console.log("🔄 Dashboard detectó cambio en localStorage, actualizando...")
        localStorage.removeItem('dashboardNeedsUpdate')
        cargarDatos()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Verificar periódicamente (cada 30 segundos)
    const interval = setInterval(checkForUpdates, 30000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  // Recargar cuando cambien los filtros
  useEffect(() => {
    if (datos) {
      if (tipoFiltro === "periodo") {
        cargarDatosPorPeriodo()
      } else {
        cargarDatosPersonalizados()
      }
    }
  }, [tipoFiltro, periodoSeleccionado, fechaDesde, fechaHasta])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Limpiar notificaciones de localStorage
      localStorage.removeItem('dashboardNeedsUpdate')
      localStorage.removeItem('lastCitaCreated')
      
      await cargarDatosPorPeriodo()
    } catch (err) {
      console.error("Error cargando datos:", err)
      setError("Error al cargar los datos del dashboard. Verifique que las APIs estén funcionando.")
    } finally {
      setLoading(false)
    }
  }

  const cargarDatosPorPeriodo = async () => {
    try {
      let fechaDesdeCalc = null
      let fechaHastaCalc = null

      const hoy = new Date()

      if (periodoSeleccionado === "dia") {
        fechaDesdeCalc = hoy
        fechaHastaCalc = hoy
      } else if (periodoSeleccionado === "semana") {
        const inicioSemana = new Date(hoy)
        inicioSemana.setDate(hoy.getDate() - hoy.getDay())
        fechaDesdeCalc = inicioSemana
        fechaHastaCalc = hoy
      } else if (periodoSeleccionado === "mes") {
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        fechaDesdeCalc = inicioMes
        fechaHastaCalc = hoy
      }

      const [estadisticas, datosGraf] = await Promise.all([
        dashboardRealService.obtenerEstadisticasCompletas(fechaDesdeCalc, fechaHastaCalc),
        dashboardRealService.obtenerDatosGraficos(periodoSeleccionado, fechaDesdeCalc, fechaHastaCalc),
      ])

      console.log("🎯 Datos recibidos en el componente:", estadisticas)
      setDatos(estadisticas)
      setDatosGrafico(datosGraf)
    } catch (err) {
      throw err
    }
  }

  const cargarDatosPersonalizados = async () => {
    if (!fechaDesde || !fechaHasta) return

    try {
      const fechaDesdeObj = new Date(fechaDesde)
      const fechaHastaObj = new Date(fechaHasta)

      const [estadisticas, datosGraf] = await Promise.all([
        dashboardRealService.obtenerEstadisticasCompletas(fechaDesdeObj, fechaHastaObj),
        dashboardRealService.obtenerDatosGraficos("personalizado", fechaDesdeObj, fechaHastaObj),
      ])

      setDatos(estadisticas)
      setDatosGrafico(datosGraf)
    } catch (err) {
      console.error("Error cargando datos personalizados:", err)
      setError("Error al cargar los datos personalizados")
    }
  }


  // Obtener texto del período
  const obtenerTextoPeriodo = () => {
    if (tipoFiltro === "personalizado") {
      if (fechaDesde && fechaHasta) {
        return `${fechaDesde} - ${fechaHasta}`
      }
      return "Período Personalizado"
    }

    switch (periodoSeleccionado) {
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


  // Renderizar gráfico mejorado
  const renderChart = () => {
    if (!datosGrafico || datosGrafico.length === 0) {
      return (
        <div className="empty-state">
          <FaExclamationTriangle className="empty-icon" />
          <p>No hay datos para mostrar</p>
          <small>Intenta cambiar el período o los filtros</small>
        </div>
      )
    }

    const maxValue = Math.max(...datosGrafico.map((item) => item.ingresos))
    const maxCitas = Math.max(...datosGrafico.map((item) => item.citas))

    return (
      <div className="chart-container-improved">
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color ingresos"></div>
            <span>Ingresos</span>
          </div>
          <div className="legend-item">
            <div className="legend-color citas"></div>
            <span>Citas</span>
          </div>
        </div>
        
        <div className="chart-bars-container">
          {datosGrafico.map((item, index) => {
            const heightIngresos = maxValue > 0 ? (item.ingresos / maxValue) * 120 : 0
            const heightCitas = maxCitas > 0 ? (item.citas / maxCitas) * 120 : 0
            
            return (
              <div key={index} className="chart-bar-group">
                <div className="chart-bar">
                  <div
                    className="chart-bar-column ingresos"
                    style={{
                      height: `${Math.max(heightIngresos, 8)}px`,
                    }}
                  >
                    <div className="chart-tooltip">
                      <div><strong>{item.periodo}</strong></div>
                      <div>Ingresos: {dashboardRealService.formatearMoneda(item.ingresos)}</div>
                      <div>Citas: {item.citas}</div>
                    </div>
                  </div>
                </div>
                
                <div className="chart-bar">
                  <div
                    className="chart-bar-column citas"
                    style={{
                      height: `${Math.max(heightCitas, 8)}px`,
                    }}
                  >
                    <div className="chart-tooltip">
                      <div><strong>{item.periodo}</strong></div>
                      <div>Ingresos: {dashboardRealService.formatearMoneda(item.ingresos)}</div>
                      <div>Citas: {item.citas}</div>
                    </div>
                  </div>
                </div>
                
                <span className="chart-bar-label">{item.periodo}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }


  if (loading) {
    return (
      <div className="dashboard-main">
        <div className="loading-state">
          <div className="spinner"></div>
          <h3>Cargando Dashboard</h3>
          <p>Obteniendo datos de citas y ventas...</p>
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
          <button onClick={cargarDatos} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!datos) {
    return (
      <div className="dashboard-main">
        <div className="empty-state">
          <FaExclamationTriangle className="empty-icon" />
          <h3>No hay datos disponibles</h3>
          <p>No se pudieron obtener los datos del dashboard</p>
        </div>
      </div>
    )
  }

  // Verificaciones de seguridad para acceder a los datos
  const ventasData = datos.ventas || {}
  const citasData = datos.citas || {}

  // Valores con fallbacks seguros
  const ingresosMes = ventasData.ingresosMes || 0
  const ingresosHoy = ventasData.ingresosHoy || 0
  const ventasPagadas = ventasData.pagadas || 0
  const citasRealizadas = citasData.realizadas || 0

  // Calcular tendencias
  const tendenciaIngresos = dashboardRealService.calcularTendencia(ingresosMes, ingresosMes * 0.9)
  const tendenciaCitas = dashboardRealService.calcularTendencia(citasRealizadas, citasRealizadas * 0.95)

  return (
    <div className="dashboard-main">
      <div className="dashboard-container">
        {/* Header del Dashboard */}
        <div className="dashboard-header">
          <div className="dashboard-title-section">
            <h1>
              <FaChartLine className="title-icon" />
              Dashboard de Métricas
            </h1>
            <p>Resumen de rendimiento y estadísticas</p>
          </div>

          {/* Filtros de período */}
          <div className="period-filters">
            <span className="period-label">Período:</span>
            <div className="period-buttons">
              <button
                className={`period-btn ${periodoSeleccionado === "dia" ? "active" : ""}`}
                onClick={() => setPeriodoSeleccionado("dia")}
              >
                <FaCalendarDay />
                Día
              </button>
              <button
                className={`period-btn ${periodoSeleccionado === "semana" ? "active" : ""}`}
                onClick={() => setPeriodoSeleccionado("semana")}
              >
                <FaCalendarWeek />
                Semana
              </button>
              <button
                className={`period-btn ${periodoSeleccionado === "mes" ? "active" : ""}`}
                onClick={() => setPeriodoSeleccionado("mes")}
              >
                <FaCalendarAlt />
                Mes
              </button>
            </div>
          </div>
        </div>

        {/* Grid de métricas */}
        <div className="metrics-grid">
          {/* Card de Ganancias */}
          <div className="metric-card earnings">
            <div className="metric-header">
              <div className="metric-icon earnings">
                <FaDollarSign />
              </div>
              <div className={`metric-trend ${tendenciaIngresos.tipo}`}>
                {tendenciaIngresos.tipo === "up" ? (
                  <FaArrowUp className="trend-arrow" />
                ) : (
                  <FaArrowDown className="trend-arrow" />
                )}
                {tendenciaIngresos.valor}%
              </div>
            </div>
            <div className="metric-title">Ganancias {obtenerTextoPeriodo()}</div>
            <div className="metric-value">{dashboardRealService.formatearMoneda(ingresosMes)}</div>
            <div className="metric-details">
              <div className="metric-detail">
                <FaUsers className="metric-detail-icon" />
                <span>{ventasPagadas} citas</span>
              </div>
              <div className="metric-detail">
                <FaDollarSign className="metric-detail-icon" />
                <span>{dashboardRealService.formatearMoneda(ingresosHoy)} promedio</span>
              </div>
            </div>
          </div>

          {/* Card de Top Manicurista */}
          <div className="metric-card manicurista">
            <div className="metric-header">
              <div className="metric-icon manicurist">
                <FaUserTie />
              </div>
              <div className="metric-trend">
                <FaArrowUp className="trend-arrow" />
                +2
              </div>
            </div>
            <div className="metric-title">Top Manicurista {obtenerTextoPeriodo()}</div>
            {ventasData.manicuristasTop && ventasData.manicuristasTop.length > 0 ? (
              <div className="manicurist-info">
                <div className="manicurist-avatar">
                  {ventasData.manicuristasTop[0].manicurista_nombre?.charAt(0) || "M"}
                </div>
                <div className="manicurist-details">
                  <div className="name">{ventasData.manicuristasTop[0].manicurista_nombre || "Manicurista"}</div>
                  <div className="stats">
                    {ventasData.manicuristasTop[0].total_ventas || 0} servicios •{" "}
                    {dashboardRealService.formatearMoneda(ventasData.manicuristasTop[0].total_ingresos || 0)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No hay datos disponibles</p>
              </div>
            )}
          </div>

          {/* Card de Servicio Más Usado */}
          <div className="metric-card service">
            <div className="metric-header">
              <div className="metric-icon service">
                <FaServicestack />
              </div>
              <div className="metric-trend">
                <FaArrowUp className="trend-arrow" />
                +1
              </div>
            </div>
            <div className="metric-title">Servicio Más Usado {obtenerTextoPeriodo()}</div>
            {ventasData.serviciosTop && ventasData.serviciosTop.length > 0 ? (
              <div>
                <div className="metric-value" style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
                  {ventasData.serviciosTop[0].servicio_nombre || "Servicio"}
                </div>
                <div className="service-stats">
                  <div className="service-stat">
                    <div className="service-stat-icon users">
                      <FaUsers />
                    </div>
                    <span>{ventasData.serviciosTop[0].total_vendido || 0} usos</span>
                  </div>
                  <div className="service-stat">
                    <div className="service-stat-icon time">
                      <FaClock />
                    </div>
                    <span>45 min</span>
                  </div>
                  <div className="service-stat">
                    <div className="service-stat-icon money">
                      <FaDollarSign />
                    </div>
                    <span>{dashboardRealService.formatearMoneda(ventasData.serviciosTop[0].ingresos || 0)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No hay datos disponibles</p>
              </div>
            )}
          </div>

          {/* Card de Resumen */}
          <div className="metric-card summary">
            <div className="metric-header">
              <div className="metric-icon summary">
                <FaEye />
              </div>
            </div>
            <div className="metric-title">Resumen {obtenerTextoPeriodo()}</div>
            <div className="summary-stats">
              <div className="summary-stat">
                <span className="summary-stat-label">Citas Realizadas</span>
                <span className="summary-stat-value">{citasRealizadas}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat-label">Ventas Pagadas</span>
                <span className="summary-stat-value">{ventasPagadas}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat-label">Promedio por Cita</span>
                <span className="summary-stat-value">
                  {dashboardRealService.formatearMoneda(citasRealizadas > 0 ? ingresosMes / citasRealizadas : 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Ingresos */}
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">
              <FaChartBar className="chart-title-icon" />
              Ingresos y Citas {obtenerTextoPeriodo()}
            </div>
            <div className="chart-total">
              <div className="chart-total-label">Total:</div>
              <div className="chart-total-value">{dashboardRealService.formatearMoneda(ingresosMes)}</div>
            </div>
          </div>
          <div className="chart-content">{renderChart()}</div>
        </div>

      </div>
    </div>
  )
}

export default DashboardReal
