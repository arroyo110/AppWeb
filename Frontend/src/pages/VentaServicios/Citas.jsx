"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { FaCalendarAlt, FaPlus, FaList, FaUserMd, FaEye, FaCheck, FaTimes, FaSearch, FaServicestack, FaFilter, FaSort, FaSortUp, FaSortDown, FaTrash, FaSyncAlt, FaArrowLeft, FaUser, FaSave, FaChevronLeft, FaChevronRight, FaEdit, FaExclamationTriangle, FaBan } from "react-icons/fa"
import citasService from "../../service/CitasService"
import NovedadesService from "../../service/NovedadesService"
import toast, { Toaster } from "react-hot-toast"
import "../../styles/CitasV2.css"
import "../../styles/Admin.css"
import "../../styles/modals/ManicuristasModal.css"

const VIEWS = { DAY: "day", WEEK: "week", MONTH: "month" }

const CitasUnified = ({ mode }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const prefillState = location.state || {}

  const [view, setView] = useState(VIEWS.MONTH)
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date()
    // Si quedan menos de 3 días del mes actual, avanzar al siguiente mes para evitar confusiones
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    if (lastDay - d.getDate() < 3) {
      return new Date(d.getFullYear(), d.getMonth() + 1, 1)
    }
    return d
  })
  const [manicuristas, setManicuristas] = useState([])
  const [servicios, setServicios] = useState([])
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [selectedManicuristaIds, setSelectedManicuristaIds] = useState([])
  const [prefillHora, setPrefillHora] = useState(prefillState.hora || "")
  const [prefillFecha, setPrefillFecha] = useState(prefillState.fecha || "")
  const [showList, setShowList] = useState(false)
  const [uiLoading, setUiLoading] = useState(false)
  const [selectedCita, setSelectedCita] = useState(null)
  // Eliminado modal de detalle; el detalle es una vista independiente
  const [detailMode, setDetailMode] = useState(false)

  // Modal: cambiar estado
  const [showChangeStateModal, setShowChangeStateModal] = useState(false)
  const [changeState, setChangeState] = useState("")
  const [changeObservations, setChangeObservations] = useState("")
  const [savingState, setSavingState] = useState(false)

  // Utilidades usadas por la vista de detalle (definidas antes de su uso)
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "Fecha no disponible"

    try {
      const [year, month, day] = fechaStr.toString().split("-")
      const fecha = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))

      return fecha.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (error) {
      console.error("Error formateando fecha:", error)
      return fechaStr
    }
  }

  const getEstadoColor = (estado) => {
    // Colores de fondo más suaves (pastel) para el badge
    const coloresSuaves = {
      pendiente: "#FEF7CD", // amarillo más suave
      en_proceso: "#E0F2FE", // azul más suave
      finalizada: "#DCFCE7", // verde más suave
      cancelada: "#FEE2E2", // rojo más suave
    }
    return coloresSuaves[estado] || "#F3F4F6" // gris más suave por defecto
  }

  const getEstadoTextColor = (estado) => {
    // Color de texto más suave sobre el fondo
    const textos = {
      pendiente: "#A16207", // ámbar más suave
      en_proceso: "#1E40AF", // azul más suave
      finalizada: "#047857", // verde más suave
      cancelada: "#B91C1C", // rojo más suave
    }
    return textos[estado] || "#4B5563"
  }

  const getEstadoTexto = (estado) => {
    const textos = {
      pendiente: "Pendiente",
      en_proceso: "En Proceso",
      finalizada: "Finalizada",
      cancelada: "Cancelada",
    }
    return textos[estado] || estado
  }

  const formatPrice = (price) => {
    const numPrice = Number(price) || 0
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(numPrice)
  }

  // Abrir vista de detalle en ruta separada
  const handleVerDetalle = useCallback((cita) => {
    if (cita?.id) {
      navigate(`/citas/${cita.id}`)
    }
  }, [navigate])

  const renderDetailViewPage = () => (
    <div className="citas-module">
      <div className="citas-module-admin-container">
        <div className="citas-module-form-header">
          <div className="citas-module-form-header-left">
            <button className="citas-module-admin-button secondary" onClick={() => { setDetailMode(false); setSelectedCita(null); navigate("/citas") } }>
              <FaArrowLeft /> Volver
            </button>
          </div>
          <h1 className="citas-module-form-title">Detalle de Cita</h1>
          <div className="citas-module-form-header-right"></div>
        </div>

        {uiLoading ? (
          <div className="loading-overlay">
            <div className="loading-box">
              <div className="spinner small" />
              <span>Cargando detalle...</span>
            </div>
          </div>
        ) : !selectedCita ? (
          <div className="no-data" style={{ padding: 24 }}>No se encontró la cita solicitada.</div>
        ) : (
        <div className="citas-module-detail-view-grid">
          <div className="citas-module-detail-section">
            <h3>
              <FaUser className="citas-module-form-icon" /> Cliente
            </h3>
            <div className="citas-module-detail-info-grid">
              <div className="citas-module-detail-info-item"><span className="citas-module-detail-label">Nombre:</span><span className="citas-module-detail-value">{selectedCita?.cliente_nombre}</span></div>
              <div className="citas-module-detail-info-item"><span className="citas-module-detail-label">Documento:</span><span className="citas-module-detail-value">{selectedCita?.cliente_documento}</span></div>
              <div className="citas-module-detail-info-item"><span className="citas-module-detail-label">Teléfono:</span><span className="citas-module-detail-value">{selectedCita?.cliente_telefono || "No registrado"}</span></div>
              <div className="citas-module-detail-info-item">
                <span className="citas-module-detail-label">Estado:</span>
                <span
                  className="citas-module-status-badge"
                  style={{
                    backgroundColor: getEstadoColor(selectedCita?.estado),
                    color: getEstadoTextColor(selectedCita?.estado),
                  }}
                >
                  {getEstadoTexto(selectedCita?.estado)}
                </span>
              </div>
            </div>
          </div>

          <div className="citas-module-detail-section">
            <h3>
              <FaCalendarAlt className="citas-module-form-icon" /> Información de la Cita
            </h3>
            <div className="citas-module-detail-info-grid">
              <div className="citas-module-detail-info-item"><span className="citas-module-detail-label">Fecha:</span><span className="citas-module-detail-value">{formatearFecha(selectedCita?.fecha_cita)}</span></div>
              <div className="citas-module-detail-info-item"><span className="citas-module-detail-label">Hora:</span><span className="citas-module-detail-value">{selectedCita?.hora_cita}</span></div>
              <div className="citas-module-detail-info-item"><span className="citas-module-detail-label">Manicurista:</span><span className="citas-module-detail-value">{selectedCita?.manicurista_nombre}</span></div>
              <div className="citas-module-detail-info-item"><span className="citas-module-detail-label">Duración Total:</span><span className="citas-module-detail-value">{selectedCita?.duracion_formateada || "N/A"}</span></div>
            </div>
          </div>

          <div className="citas-module-detail-section" style={{ gridColumn: "1 / -1" }}>
            <h3>
              <FaServicestack className="citas-module-form-icon" /> Servicios
            </h3>
            <div className="citas-module-servicios-detalle-grid">
              {selectedCita?.servicios_info?.length ? (
                selectedCita.servicios_info.map((servicio, index) => (
                  <div key={index} className="citas-module-servicio-detalle-card">
                    <div className="citas-module-servicio-detalle-nombre">{servicio.nombre || "Servicio"}{servicio.duracion && (<span className="citas-module-servicio-detalle-duracion">({servicio.duracion} min)</span>)}</div>
                    <div className="citas-module-servicio-detalle-precio">{formatPrice(servicio.precio || 0)}</div>
                  </div>
                ))
              ) : (
                <div className="citas-module-servicio-detalle-card">
                  <div className="citas-module-servicio-detalle-nombre">{selectedCita?.servicio_nombre || "Servicio no disponible"}</div>
                  <div className="citas-module-servicio-detalle-precio">{formatPrice(selectedCita?.precio_total || 0)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )

  const manicuristaColors = useMemo(() => {
    const warmPalette = [
      "#E57373", "#F06292", "#BA68C8", "#9575CD", "#64B5F6",
      "#4FC3F7", "#4DD0E1", "#4DB6AC", "#81C784", "#AED581",
      "#FFD54F", "#FFB74D", "#FF8A65", "#A1887F", "#90A4AE",
    ]
    const map = {}
    manicuristas.forEach((m, idx) => { map[m.id] = warmPalette[idx % warmPalette.length] })
    return map
  }, [manicuristas])

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
  const startOfWeek = (d) => { const copy = startOfDay(d); const day = copy.getDay() === 0 ? 6 : copy.getDay() - 1; return addDays(copy, -day) }
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)

  const visibleRange = useMemo(() => {
    // Forzar rango de mes únicamente
    const start = startOfMonth(currentDate); const end = new Date(start.getFullYear(), start.getMonth() + 1, 1); return { start, end }
  }, [view, currentDate])

  // Cargar detalle si la URL contiene un ID
  useEffect(() => {
    const id = params?.id
    if (!id) return
    setUiLoading(true)
    setDetailMode(true)
    citasService.obtenerCitaPorId(id)
      .then((cita) => {
        console.log("🔍 Cita obtenida del servicio:", cita)
        // Normalizar estructura mínima para la vista
        let normalized = { ...cita }
        
        // Debug: mostrar estructura del cliente y manicurista
        console.log("🔍 Cliente original:", cita.cliente)
        console.log("🔍 Manicurista original:", cita.manicurista)
        console.log("🔍 Servicios_info original:", cita.servicios_info)
        console.log("🔍 Servicio_info original:", cita.servicio_info)
        console.log("🔍 Servicios original:", cita.servicios)
        
        // Normalizar servicios_info - siempre intentar reconstruir si está vacío
        if (!normalized.servicios_info || normalized.servicios_info.length === 0) {
          console.log("🔧 Reconstruyendo servicios_info...")
          
          // Intentar usar servicio_info (singular) primero
          if (cita.servicio_info && typeof cita.servicio_info === 'object') {
            console.log("✅ Usando servicio_info:", cita.servicio_info)
            normalized.servicios_info = [{
              id: cita.servicio_info.id || cita.servicio_info.servicio || cita.servicio_info.servicio_id,
              nombre: cita.servicio_info.nombre || cita.servicio_info.servicio_nombre || "Servicio",
              precio: Number(cita.servicio_info.precio || cita.servicio_info.precio_unitario || 0),
              duracion: cita.servicio_info.duracion || null,
            }]
          }
          // Si no hay servicio_info, intentar usar servicios (array)
          else if (Array.isArray(cita.servicios) && cita.servicios.length > 0) {
            console.log("✅ Usando servicios array:", cita.servicios)
            normalized.servicios_info = cita.servicios.map((s) => ({
              id: s.id || s.servicio || s.servicio_id,
              nombre: s.nombre || s.servicio_nombre || (s.detalle && s.detalle.nombre) || "Servicio",
              precio: Number(s.precio || s.precio_unitario || 0),
              duracion: s.duracion || null,
            }))
          }
          // Si no hay nada, crear un servicio genérico con datos de la cita
          else {
            console.log("⚠️ Creando servicio genérico con datos de la cita")
            console.log("🔍 Datos disponibles para servicio:", {
              servicio: cita.servicio,
              servicio_id: cita.servicio_id,
              servicio_nombre: cita.servicio_nombre,
              precio: cita.precio,
              precio_total: cita.precio_total,
              duracion: cita.duracion
            })
            
            normalized.servicios_info = [{
              id: cita.servicio || cita.servicio_id || "unknown",
              nombre: cita.servicio_nombre || cita.servicio || "Servicio no especificado",
              precio: Number(cita.precio || cita.precio_total || 0),
              duracion: cita.duracion || null,
            }]
          }
        } else {
          console.log("✅ servicios_info ya tiene datos:", normalized.servicios_info)
        }
        
        // Cliente: usar cliente_info
        if (cita.cliente_info && typeof cita.cliente_info === 'object') {
          normalized.cliente_nombre = cita.cliente_info.nombre || 
                                   cita.cliente_info.nombres || 
                                   cita.cliente_info.nombre_completo || 
                                   cita.cliente_info.first_name || 
                                   cita.cliente_info.last_name ||
                                   "Cliente"
          
          normalized.cliente_documento = cita.cliente_info.documento || 
                                      cita.cliente_info.identificacion || 
                                      cita.cliente_info.cedula || 
                                      cita.cliente_info.dni ||
                                      "N/A"
          
          normalized.cliente_telefono = cita.cliente_info.telefono || 
                                     cita.cliente_info.celular || 
                                     cita.cliente_info.phone ||
                                     ""
        }
        
        // Manicurista: usar manicurista_info
        if (cita.manicurista_info && typeof cita.manicurista_info === 'object') {
          normalized.manicurista_nombre = cita.manicurista_info.nombre || 
                                       cita.manicurista_info.nombres || 
                                       cita.manicurista_info.nombre_completo || 
                                       cita.manicurista_info.first_name || 
                                       cita.manicurista_info.last_name ||
                                       ""
        }
        
        console.log("🔍 Cita normalizada:", normalized)
        console.log("🔍 Servicios_info final:", normalized.servicios_info)
        setSelectedCita(normalized)
      })
      .catch((error) => {
        console.error("❌ Error cargando cita:", error)
        toast.error("No se pudo cargar el detalle de la cita")
        navigate('/citas')
      })
      .finally(() => setUiLoading(false))
  }, [params?.id])

  // Si salimos de la ruta /citas/:id, limpiamos el modo detalle
  useEffect(() => {
    if (!params?.id && detailMode) {
      setDetailMode(false)
      setSelectedCita(null)
    }
  }, [params?.id, detailMode])

  // Guardar cambio de estado
  const handleConfirmChangeState = async () => {
    if (!selectedCita) return
    try {
      setSavingState(true)
      console.log("🔄 Cambiando estado de cita:", selectedCita.id, "a", changeState)
      
      await citasService.actualizarEstadoCita(selectedCita.id, changeState, changeObservations)
      toast.success("Estado actualizado correctamente")
      
      // Si se está finalizando la cita, crear venta automáticamente
      if (changeState === "finalizada") {
        console.log("🔄 Cita finalizada, creando venta automáticamente...")
        try {
          // Obtener la cita actualizada con todos los datos
          const citaActualizada = await citasService.obtenerCitaPorId(selectedCita.id)
          console.log("🔍 Cita actualizada obtenida:", citaActualizada)
          
          // Crear venta desde la cita finalizada usando el método original que funcionaba
          await citasService.crearVenta({ 
            cita: citaActualizada.id, 
            cliente: citaActualizada.cliente, 
            manicurista: citaActualizada.manicurista, 
            observaciones: `Venta desde cita #${citaActualizada.id}` 
          })
          console.log("✅ Venta creada exitosamente desde cita finalizada")
        } catch (ventaError) {
          console.error("⚠️ Error creando venta, pero la cita se actualizó:", ventaError)
          toast.error("Cita finalizada, pero error creando venta")
        }
      }
      
      // Actualizar detalle y listado en memoria
      setSelectedCita((prev) => prev ? { ...prev, estado: changeState, observaciones: changeObservations || prev.observaciones } : prev)
      setCitas((prev) => prev.map((c) => c.id === selectedCita.id ? { ...c, estado: changeState } : c))
      setShowChangeStateModal(false)
      
      // Recargar datos para mostrar cambios
      const rec = await citasService.obtenerCitas({})
      setCitas(rec)
    } catch (e) {
      console.error("Error actualizando estado:", e)
      toast.error("No se pudo actualizar el estado")
    } finally {
      setSavingState(false)
    }
  }

  // Carga optimizada con caché y carga lazy
  useEffect(() => {
    setError("")
    let cancelled = false
    
    // Cargar datos críticos primero (manicuristas y servicios)
    const loadCriticalData = async () => {
      try {
        console.log("🔄 Iniciando carga de datos críticos...")
        
        const [manicuristasData, serviciosData] = await Promise.all([
          citasService.obtenerManicuristasDisponibles(),
          citasService.obtenerServiciosActivos()
        ])
        
        console.log("📊 Datos recibidos:")
        console.log("- Manicuristas:", manicuristasData?.length || 0)
        console.log("- Servicios:", serviciosData?.length || 0)
        console.log("- Servicios raw:", serviciosData)
        
        if (!cancelled) {
          setManicuristas(manicuristasData || [])
          if (manicuristasData?.length) setSelectedManicuristaIds(manicuristasData.map(x=>x.id))
          setServicios(serviciosData || [])
          console.log("✅ Servicios cargados:", serviciosData?.length || 0)
          
          // Si no hay servicios, intentar cargar desde otro endpoint
          if (!serviciosData || serviciosData.length === 0) {
            console.log("⚠️ No se encontraron servicios, intentando endpoint alternativo...")
            try {
              const serviciosAlt = await citasService.obtenerServicios()
              if (serviciosAlt && serviciosAlt.length > 0) {
                setServicios(serviciosAlt)
                console.log("✅ Servicios cargados desde endpoint alternativo:", serviciosAlt.length)
              }
            } catch (altErr) {
              console.error("❌ Error en endpoint alternativo:", altErr)
            }
          }
          
          setLoading(false) // UI lista con datos críticos
        }
      } catch (err) {
        if (!cancelled) {
          console.error("❌ Error cargando datos críticos:", err)
          console.error("❌ Error details:", err.response?.data || err.message)
          toast.error(`Error cargando datos: ${err.message}`)
          setLoading(false)
        }
      }
    }

    // Cargar citas en segundo plano (no bloquea la UI)
    const loadCitasBackground = async () => {
      try {
        const citasData = await citasService.obtenerCitas({})
        if (!cancelled) {
          setCitas(citasData)
          console.log("✅ Citas cargadas:", citasData?.length || 0)
          // Debug: verificar estructura de servicios en las citas
          if (citasData?.length > 0) {
            console.log("🔍 Primera cita:", citasData[0])
            console.log("🔍 Servicios en primera cita:", citasData[0].servicios_info || citasData[0].servicios)
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error cargando citas:", err)
          toast.error("Error cargando citas")
        }
      }
    }

    loadCriticalData()
    // Cargar citas después de 200ms para no bloquear
    setTimeout(loadCitasBackground, 200)

    return () => { cancelled = true }
  }, [])

  // Forzar volver a vista por mes si viene indicado desde navegación
  useEffect(() => {
    if (prefillState && prefillState.forceMonth) {
      setView(VIEWS.MONTH)
      setShowList(false)
      setDetailMode(false)
      setDayModalDate(null)
    }
  }, [prefillState])

  const goPrev = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)) }
  const goNext = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)) }
  const goToday = () => { setCurrentDate(new Date()); setView(VIEWS.MONTH); setShowList(false) }

  const filteredCitas = useMemo(() => {
    const { start, end } = visibleRange
    const filtered = citas.filter((c) => {
      if (selectedManicuristaIds.length && c.manicurista && !selectedManicuristaIds.includes(Number(c.manicurista))) return false
      if (!c.fecha_cita) return false
      const [y,m,d] = c.fecha_cita.split("-").map(Number)
      const date = new Date(y, m-1, d)
      return date >= start && date < end
    })
    
    // Debug temporal: Log de citas filtradas
    console.log(`🔍 ${view} - Rango visible:`, start.toISOString().split('T')[0], 'a', end.toISOString().split('T')[0])
    console.log(`🔍 ${view} - Citas filtradas:`, filtered.length, filtered.map(c => `${c.fecha_cita} ${c.hora_cita}`))
    
    // Debug específico para verificar fechas en el rango
    if (view === VIEWS.WEEK) {
      console.log(`🔍 WEEK - Verificando fechas en el rango:`)
      citas.forEach(c => {
        if (c.fecha_cita) {
          const [y,m,d] = c.fecha_cita.split("-").map(Number)
          const date = new Date(y, m-1, d)
          const inRange = date >= start && date < end
          console.log(`🔍 WEEK - Cita ${c.fecha_cita}: ${date.toISOString().split('T')[0]} - En rango: ${inRange}`)
        }
      })
    }
    
    // Debug específico para verificar fechas en el rango para DAY
    if (view === VIEWS.DAY) {
      console.log(`🔍 DAY - Verificando fechas en el rango:`)
      citas.forEach(c => {
        if (c.fecha_cita) {
          const [y,m,d] = c.fecha_cita.split("-").map(Number)
          const date = new Date(y, m-1, d)
          const inRange = date >= start && date < end
          console.log(`🔍 DAY - Cita ${c.fecha_cita}: ${date.toISOString().split('T')[0]} - En rango: ${inRange}`)
        }
      })
    }
    
    // Debug adicional: Mostrar todas las citas para verificar fechas
    // Logs de semana deshabilitados: solo vista mes
    
    return filtered
  }, [citas, selectedManicuristaIds, visibleRange, view])

  // Utilidad: determinar si una cita ya finalizada debe ocultarse (finalizada y hora pasada del día)
  const isFinalizadaPasada = (cita) => {
    const estado = (cita?.estado || "").toLowerCase()
    if (estado !== "finalizada") return false
    if (!cita.fecha_cita || !cita.hora_cita) return false
    const [y, m, d] = cita.fecha_cita.split("-").map(Number)
    const [hh, mm] = (cita.hora_cita || "00:00").split(":").map(Number)
    const when = new Date(y, (m || 1) - 1, d, hh || 0, mm || 0, 0, 0)
    return when < new Date()
  }

  const withUiLoading = (action) => {
    setUiLoading(true)
    try { 
      action && action() 
    } finally { 
      setTimeout(()=> {
        setUiLoading(false)
      }, 450) 
    }
  }

  const Title = () => {
    if (showList || mode === 'create') return null
    const headerTitle = `Gestión de Citas`
    return (
      <div className="admin-content-wrapper">
        <div className="admin-header">
          <h1 className="admin-title">{headerTitle}</h1>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div className="citasv2-toolbar">
              <div className="left">
                <button className="admin-button secondary" onClick={() => withUiLoading(()=> setShowList(true))}><FaList /> Ver citas</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const [monthCells, setMonthCells] = useState(() => {
    const start = startOfMonth(currentDate); const startWeek = startOfWeek(start); const arr=[]; for(let i=0;i<42;i++){arr.push(addDays(startWeek,i))}; return arr
  })
  useEffect(() => { const start = startOfMonth(currentDate); const startWeek = startOfWeek(start); const arr=[]; for(let i=0;i<42;i++){arr.push(addDays(startWeek,i))}; setMonthCells(arr) }, [currentDate])

  const [dayModalDate, setDayModalDate] = useState(null)
  const setShowDayModal = (d) => setDayModalDate(d)

  const MiniSidebar = () => (
    <div className="citasv2-sidebar">
      <div className="mini-calendar">
        <div className="mini-calendar-header">
          <button className="btn" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()-1, 1))}>◀</button>
          <div className="mini-calendar-title">{currentDate.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}</div>
          <button className="btn" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 1))}>▶</button>
        </div>
        <div className="mini-calendar-grid">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <div key={d} className="dow">{d}</div>
          ))}
          {monthCells.map((d) => {
            const isCurrentMonth = d.getMonth() === currentDate.getMonth()
            const isToday = startOfDay(d).getTime() === startOfDay(new Date()).getTime()
            const iso = d.toISOString().split("T")[0]
            return (
              <button
                key={d.toISOString()}
                className={`mini-day ${isCurrentMonth?"":"muted"} ${isToday?"today":""}`}
                onClick={() => { navigate('/citas/crear', { state: { fecha: iso, origin: 'mini' } }) }}
              >
                {d.getDate()}
              </button>
            )
          })}
        </div>
      </div>
      <div className="manicuristas-list">
        <h4>Manicuristas</h4>
        <div className="manicuristas-items">
          {manicuristas.map((m) => {
            const checked = selectedManicuristaIds.includes(m.id)
            return (
              <label key={m.id} className="manicurista-item" style={{ borderLeftColor: manicuristaColors[m.id] }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setSelectedManicuristaIds((prev) =>
                      e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id),
                    )
                  }}
                />
                <span className="icon"><FaUserMd /></span>
                <span className="name">{m.nombres || m.nombre || m.name || `#${m.id}`}</span>
              </label>
            )
          })}
        </div>
        {/* paginación solo en Ver Citas; no aquí */}
      </div>
    </div>
  )

  const MonthGrid = () => {
    const firstMonthDay = startOfMonth(currentDate).getMonth()
    const citasByDate = useMemo(() => {
      const map = {}; filteredCitas.forEach((c)=>{ const key=c.fecha_cita; if(!map[key]) map[key]=[]; map[key].push(c)}); return map
    }, [filteredCitas])

    const handleCreate = (dateObj) => {
      const iso = dateObj.toISOString().split("T")[0]
      // Permitir crear hoy y mañana; bloquear únicamente días anteriores al día actual - 1
      const start = startOfDay(new Date())
      if (startOfDay(dateObj) < start) {
        // Si es hoy o futuro, permitirá; si es pasado real, no creará
        return
      }
      navigate('/citas/crear', { state: { fecha: iso } })
    }
    return (
      <div className="month-grid">
        <div className="month-grid-header">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((d)=> (<div key={d} className="month-dow">{d}</div>))}</div>
        <div className="month-grid-body">
          {monthCells.map((d) => {
            const dateStr = d.toISOString().split('T')[0]
            const isCurrentMonth = d.getMonth() === firstMonthDay
            const isToday = startOfDay(d).getTime() === startOfDay(new Date()).getTime()
            const isPast = startOfDay(d) < startOfDay(new Date())
            const dayCitas = citasByDate[dateStr] || []
            return (
              <div key={dateStr} className={`month-cell ${(!isCurrentMonth && !isPast)? '':' ' } ${isPast? 'past':''} ${isToday? 'today':''}`} onClick={() => setShowDayModal(d)} onDoubleClick={() => handleCreate(d)}>
                <div className="month-cell-top">
                  <span className="month-date">{d.getDate()}</span>
                  <div className="month-top-actions">
                    <button
                      className="month-view-btn"
                      onClick={(e)=>{ e.stopPropagation(); setShowDayModal(d) }}
                      title="Ver citas del día"
                    >
                      <FaEye />
                    </button>
                    <button className="month-add" title="Nueva cita" onClick={(e) => { e.stopPropagation(); handleCreate(d) }}>+</button>
                  </div>
                </div>
                <div className="month-events">
                  {dayCitas.filter(c => !isFinalizadaPasada(c)).slice(0,2).map((c) => (
                    <div key={c.id} className="month-event" style={{ background: (manicuristaColors[c.manicurista]||'#9ca3af')+ '22', borderLeft: `3px solid ${manicuristaColors[c.manicurista]||'#9ca3af'}` }} onClick={(e) => { e.stopPropagation(); }}>
                      <span className="dot" style={{ background: manicuristaColors[c.manicurista]||'#9ca3af' }}></span>
                      <span className="txt">{c.hora_cita} · {c.cliente_nombre || `Cita #${c.id}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [filterMani, setFilterMani] = useState("")
  const maniOptions = useMemo(() => [ ...new Set((showList ? citas : filteredCitas).map(c => c.manicurista_nombre || c.manicurista).filter(Boolean)) ], [filteredCitas, citas, showList])

  const citasFiltradasTabla = useMemo(() => {
    const base = showList ? citas : filteredCitas
    return base.filter(c => {
      // Aplicar la misma lógica de normalización para búsqueda
      let serviciosParaBusqueda = ""
      if (c.servicios_info && c.servicios_info.length > 0) {
        serviciosParaBusqueda = c.servicios_info.map(s => s.nombre).join(" ")
      } else if (c.servicio_info && typeof c.servicio_info === 'object') {
        serviciosParaBusqueda = c.servicio_info.nombre || c.servicio_info.servicio_nombre || ""
      } else if (Array.isArray(c.servicios) && c.servicios.length > 0) {
        serviciosParaBusqueda = c.servicios.map(s => s.nombre || s.servicio_nombre || "").join(" ")
      } else {
        serviciosParaBusqueda = c.servicio_nombre || c.servicio || ""
      }
      
      const txt = `${c.fecha_cita} ${c.hora_cita} ${c.cliente_nombre||""} ${serviciosParaBusqueda} ${c.manicurista_nombre||c.manicurista||""} ${c.estado||""}`.toLowerCase()
      const okSearch = txt.includes(searchTerm.toLowerCase())
      const okMani = !filterMani || (c.manicurista_nombre||c.manicurista) === filterMani
      return okSearch && okMani
    })
  }, [filteredCitas, citas, showList, searchTerm, filterMani])

  const [pageSize, setPageSize] = useState(5)
  const [page, setPage] = useState(1)
  const [sortConfig, setSortConfig] = useState({ key: "fecha", direction: "asc" })
  const sortedData = useMemo(() => {
    const data = [...citasFiltradasTabla]
    const dir = sortConfig.direction === "asc" ? 1 : -1
    const getEstadoRank = (estado) => {
      const e = (estado || "").toLowerCase().replace(/\s+/g, "_")
      if (e.includes("pendiente")) return 0
      if (e.includes("en_proceso") || e.includes("proceso")) return 1
      if (e.includes("finaliz")) return 2
      // Cualquier otro (ej. cancelada) al final
      return 3
    }
    const getVal = (c) => {
      switch (sortConfig.key) {
        case "fecha": return new Date(`${c.fecha_cita || ''}T${c.hora_cita || '00:00'}`).getTime() || 0
        case "cliente": return (c.cliente_nombre || c.cliente || "").toString().toLowerCase()
        case "manicurista": return (c.manicurista_nombre || c.manicurista || "").toString().toLowerCase()
        case "servicio": {
          // Aplicar la misma lógica de normalización para ordenamiento
          let serviciosParaOrdenamiento = ""
          if (c.servicios_info && c.servicios_info.length > 0) {
            serviciosParaOrdenamiento = c.servicios_info.map(s => s.nombre).join(", ")
          } else if (c.servicio_info && typeof c.servicio_info === 'object') {
            serviciosParaOrdenamiento = c.servicio_info.nombre || c.servicio_info.servicio_nombre || ""
          } else if (Array.isArray(c.servicios) && c.servicios.length > 0) {
            serviciosParaOrdenamiento = c.servicios.map(s => s.nombre || s.servicio_nombre || "").join(", ")
          } else {
            serviciosParaOrdenamiento = c.servicio_nombre || c.servicio || ""
          }
          return serviciosParaOrdenamiento.toString().toLowerCase()
        }
        case "estado": return (c.estado || "").toString().toLowerCase()
        default: return 0
      }
    }
    data.sort((a,b)=>{
      // Orden fijo por estado: pendiente -> en_proceso -> finalizada -> otros
      const ra = getEstadoRank(a.estado)
      const rb = getEstadoRank(b.estado)
      if (ra !== rb) return ra - rb
      // Secundario: respetar el sort actual seleccionado por el usuario
      const va=getVal(a), vb=getVal(b)
      if(va<vb) return -1*dir; if(va>vb) return 1*dir; return 0
    })
    return data
  }, [citasFiltradasTabla, sortConfig])

  const totalPages = Math.max(1, Math.ceil((sortedData.length || 0) / pageSize))
  const pageData = useMemo(() => { const start = (page - 1) * pageSize; return sortedData.slice(start, start + pageSize) }, [sortedData, page, pageSize])
  const handleSort = (key) => { setPage(1); setSortConfig((prev)=> prev.key===key ? { key, direction: prev.direction==='asc'?'desc':'asc' } : { key, direction:'asc' }) }
  const renderSortIndicator = (key) => { if (sortConfig.key !== key) return <FaSort className="sort-icon" />; return sortConfig.direction === "asc" ? (<FaSortUp className="sort-icon active" />) : (<FaSortDown className="sort-icon active" />) }

  // FUNCIÓN PARA VERIFICAR Y CREAR VENTAS FALTANTES
  const verificarYCrearVentasFaltantes = async () => {
    try {
      console.log("🔍 Verificando citas finalizadas sin venta...")
      
      // Obtener todas las citas finalizadas
      const citasFinalizadas = citas.filter(c => c.estado === "finalizada")
      console.log(`📊 Encontradas ${citasFinalizadas.length} citas finalizadas`)
      
      let ventasCreadas = 0
      let errores = 0
      
      for (const cita of citasFinalizadas) {
        try {
          // Verificar si ya tiene venta
          const ventasExistentes = await ventaServiciosService.obtenerVentas({ cita: cita.id })
          
          if (!ventasExistentes || ventasExistentes.length === 0) {
            console.log(`🔄 Creando venta para cita ${cita.id}...`)
            await crearVentaDesdeCita(cita)
            ventasCreadas++
            await new Promise(resolve => setTimeout(resolve, 500)) // Pequeña pausa entre creaciones
          } else {
            console.log(`✅ Cita ${cita.id} ya tiene venta: ${ventasExistentes[0].id}`)
          }
        } catch (error) {
          console.error(`❌ Error creando venta para cita ${cita.id}:`, error)
          errores++
        }
      }
      
      if (ventasCreadas > 0) {
        showNotification(`${ventasCreadas} ventas creadas automáticamente`, "success")
        // Recargar datos
        await fetchCitas()
      }
      
      if (errores > 0) {
        showNotification(`${errores} errores al crear ventas`, "warning")
      }
      
      console.log(`✅ Verificación completada: ${ventasCreadas} ventas creadas, ${errores} errores`)
      
    } catch (error) {
      console.error("❌ Error en verificación de ventas:", error)
      showNotification("Error verificando ventas faltantes", "error")
    }
  }

  // FUNCIÓN MEJORADA PARA CREAR VENTA DESDE CITA
  const crearVentaDesdeCita = async (cita) => {
    try {
      console.log("🔄 Iniciando creación de venta desde cita:", cita.id)
      console.log("🔍 Cita completa:", cita)
      
      if (!cita.cliente || !cita.manicurista) {
        throw new Error("Faltan datos requeridos para crear la venta: cliente o manicurista.")
      }

      if (cita.estado !== "finalizada") {
        throw new Error("La cita debe estar finalizada para crear una venta.")
      }

      // Verificar si ya existe una venta para esta cita
      try {
        const ventasExistentes = await ventaServiciosService.obtenerVentas({ cita: cita.id })
        if (ventasExistentes && ventasExistentes.length > 0) {
          console.log("⚠️ Ya existe una venta para esta cita:", ventasExistentes[0].id)
          showNotification("Ya existe una venta para esta cita", "info")
          return ventasExistentes[0]
        }
      } catch (error) {
        console.log("ℹ️ No se pudo verificar ventas existentes, continuando con la creación")
      }

      // Verificar si es una cita múltiple (con servicios_asignados)
      if (cita.servicios_asignados && Array.isArray(cita.servicios_asignados) && cita.servicios_asignados.length > 0) {
        console.log("🔍 Cita múltiple detectada, creando ventas separadas por manicurista")
        console.log("🔍 Servicios asignados:", cita.servicios_asignados)
        
        // Agrupar servicios por manicurista
        const serviciosPorManicurista = {}
        cita.servicios_asignados.forEach(servicio => {
          const manicuristaId = servicio.manicurista_id
          if (!serviciosPorManicurista[manicuristaId]) {
            serviciosPorManicurista[manicuristaId] = []
          }
          serviciosPorManicurista[manicuristaId].push(servicio)
        })

        console.log("🔍 Servicios agrupados por manicurista:", serviciosPorManicurista)

        // Crear una venta por cada manicurista
        const ventasCreadas = []
        for (const [manicuristaId, servicios] of Object.entries(serviciosPorManicurista)) {
          const detalles = servicios.map(servicio => ({
            servicio: Number(servicio.servicio_id),
            cantidad: 1,
            precio_unitario: Number(servicio.precio) || 0,
            descuento_linea: 0,
          }))

          const precioTotal = detalles.reduce((total, detalle) => total + detalle.precio_unitario, 0)

          const ventaData = {
            cliente: Number(cita.cliente),
            manicurista: Number(manicuristaId),
            servicios: servicios.map(s => Number(s.servicio_id)),
            citas: [Number(cita.id)],
            fecha_venta: cita.fecha_cita,
            hora_venta: servicios[0].hora_inicio,
            estado: "pendiente",
            metodo_pago: "efectivo",
            observaciones: `Venta creada automáticamente desde cita #${cita.id} (manicurista ${manicuristaId})`,
            cita_origen: Number(cita.id),
            porcentaje_comision: 0,
            detalles: detalles,
            total: precioTotal,
          }

          console.log(`🔄 Creando venta para manicurista ${manicuristaId}:`, ventaData)
          const ventaCreada = await citasService.crearVenta(ventaData)
          ventasCreadas.push(ventaCreada)
        }

        console.log("✅ Ventas creadas:", ventasCreadas.length)
        showNotification(`${ventasCreadas.length} venta(s) creada(s) automáticamente desde cita múltiple`, "success")
        return ventasCreadas
      }

      // Lógica original para citas simples
      console.log("🔍 Cita simple detectada, usando lógica original")
      console.log("🔍 Cita.servicios_info:", cita.servicios_info)
      console.log("🔍 Cita.servicios:", cita.servicios)
      console.log("🔍 Cita.servicio:", cita.servicio)
      
      let serviciosParaVenta = []
      if (cita.servicios_info && Array.isArray(cita.servicios_info)) {
        serviciosParaVenta = cita.servicios_info.map((s) => s.id)
        console.log("✅ Usando servicios_info:", serviciosParaVenta)
      } else if (cita.servicios && Array.isArray(cita.servicios)) {
        serviciosParaVenta = cita.servicios
        console.log("✅ Usando servicios:", serviciosParaVenta)
      } else if (cita.servicio) {
        serviciosParaVenta = [cita.servicio]
        console.log("✅ Usando servicio:", serviciosParaVenta)
      } else {
        console.warn("⚠️ No se encontraron servicios en la cita")
      }

      const precioTotalCalculado =
        cita.servicios_info?.reduce((total, servicio) => {
          return total + (Number(servicio.precio) || 0), 0
        }) ||
        cita.precio_total ||
        0

      // Crear detalles para la venta
      const detalles = []
      console.log("🔍 Creando detalles para venta...")
      
      if (cita.servicios_info && Array.isArray(cita.servicios_info)) {
        console.log("✅ Creando detalles desde servicios_info")
        cita.servicios_info.forEach((servicio) => {
          const detalle = {
            servicio: Number(servicio.id),
            cantidad: 1,
            precio_unitario: Number(servicio.precio) || 0,
            descuento_linea: 0,
          }
          console.log("📦 Detalle creado:", detalle)
          detalles.push(detalle)
        })
      } else if (cita.servicio) {
        console.log("✅ Creando detalle desde servicio único")
        const detalle = {
          servicio: Number(cita.servicio),
          cantidad: 1,
          precio_unitario: precioTotalCalculado,
          descuento_linea: 0,
        }
        console.log("📦 Detalle creado:", detalle)
        detalles.push(detalle)
      } else {
        console.warn("⚠️ No se pudieron crear detalles para la venta")
      }
      
      console.log("📦 Total de detalles creados:", detalles.length)

      const ventaData = {
        cliente: Number(cita.cliente),
        manicurista: Number(cita.manicurista),
        servicio: serviciosParaVenta.length > 0 ? Number(serviciosParaVenta[0]) : null,
        servicios: serviciosParaVenta.map((id) => Number(id)),
        citas: [Number(cita.id)],
        fecha_venta: cita.fecha_cita,
        hora_venta: cita.hora_cita,
        estado: "pendiente",
        metodo_pago: "efectivo", // Método de pago por defecto para citas finalizadas
        observaciones: `Venta creada automáticamente desde cita #${cita.id}${
          cita.observaciones ? ". Observaciones de la cita: " + cita.observaciones : ""
        }`,
        cita_origen: Number(cita.id),
        porcentaje_comision: 0,
        detalles: detalles,
        // Asegurar que el total se calcule correctamente
        total: precioTotalCalculado,
      }

      console.log("📦 Datos para crear venta:", ventaData)

      const ventaCreada = await citasService.crearVenta(ventaData)
      showNotification(`Cita finalizada y venta #${ventaCreada.id} creada automáticamente`, "success")
      return ventaCreada
    } catch (error) {
      console.error("❌ Error creando venta desde cita:", error)
      const errorMessage = error.userMessage || error.response?.data?.message || error.message || "Error desconocido"
      showNotification(`Cita actualizada pero error al crear venta: ${errorMessage}`, "warning")
      throw error
    }
  }

  const Listado = () => {
    return (
      <div className="citasv2-listado">
        <div className="admin-content-wrapper">
          <div className="admin-header">
            <h1 className="admin-title">Listado de Citas</h1>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button className="admin-button primary" onClick={() => withUiLoading(()=> setShowList(false))}><FaCalendarAlt /> Calendario</button>
          </div>
        </div>
        <div className="admin-filters">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input className="search-input" placeholder="Buscar citas..." value={searchTerm} onChange={(e)=>{ setPage(1); setSearchTerm(e.target.value) }} />
          </div>
          <div className="filter-container">
            <FaFilter className="filter-icon" />
            <select className="filter-select" value={filterMani} onChange={(e)=>{ setPage(1); setFilterMani(e.target.value) }}>
              <option value="">Todas las manicuristas</option>
              {maniOptions.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div className="items-per-page">
            <span>Mostrar:</span>
            <select className="items-select" value={pageSize} onChange={(e)=>{ setPage(1); setPageSize(Number(e.target.value)) }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("fecha")}>Fecha y hora {renderSortIndicator("fecha")}</th>
                <th onClick={() => handleSort("cliente")}>Cliente {renderSortIndicator("cliente")}</th>
                <th onClick={() => handleSort("manicurista")}>Manicurista {renderSortIndicator("manicurista")}</th>
                <th onClick={() => handleSort("servicio")}>Servicio {renderSortIndicator("servicio")}</th>
                <th onClick={() => handleSort("estado")}>Estado {renderSortIndicator("estado")}</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length > 0 ? pageData.map((c) => (
                <tr key={c.id}>
                  <td>{c.fecha_cita} {c.hora_cita}</td>
                  <td>{c.cliente_nombre || c.cliente}</td>
                  <td>{c.manicurista_nombre || c.manicurista}</td>
                  <td>
                    {(() => {
                      // Aplicar la misma lógica de normalización que en el detalle
                      let serviciosParaMostrar = []
                      
                      if (c.servicios_info && c.servicios_info.length > 0) {
                        serviciosParaMostrar = c.servicios_info.map(s => s.nombre)
                      } else if (c.servicio_info && typeof c.servicio_info === 'object') {
                        serviciosParaMostrar = [c.servicio_info.nombre || c.servicio_info.servicio_nombre || "Servicio"]
                      } else if (Array.isArray(c.servicios) && c.servicios.length > 0) {
                        serviciosParaMostrar = c.servicios.map(s => s.nombre || s.servicio_nombre || "Servicio")
                      } else {
                        serviciosParaMostrar = [c.servicio_nombre || c.servicio || "Sin servicios"]
                      }
                      
                      return serviciosParaMostrar.join(", ")
                    })()}
                  </td>
                  <td><span className="status-badge" style={{ backgroundColor: getEstadoColor(c.estado), color: getEstadoTextColor(c.estado), fontSize: "12px", padding: "4px 8px", borderRadius: "4px", fontWeight: "500" }}>{getEstadoTexto(c.estado)}</span></td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-button view" onClick={() => handleVerDetalle(c)} title="Ver detalle"><FaEye /></button>
                      {c.estado !== "finalizada" && c.estado !== "cancelada" && (
                        <button
                          className="action-button edit"
                          onClick={() => { setSelectedCita(c); setChangeState(c.estado || "pendiente"); setChangeObservations(""); setShowChangeStateModal(true) }}
                          title="Cambiar estado"
                        >
                          <FaSyncAlt />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="no-data">No se encontraron citas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="pagination">
      <button className="pagination-button" disabled={page===1} onClick={()=>setPage(1)}>&laquo;</button>
      <button className="pagination-button" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>&lt;</button>
      <div className="pagination-info">Página {page} de {totalPages}</div>
      <button className="pagination-button" disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>&gt;</button>
      <button className="pagination-button" disabled={page===totalPages} onClick={()=>setPage(totalPages)}>&raquo;</button>
      </div>
    </div>
    )
  }

  const daysOfWeek = useMemo(() => { 
    if (view !== VIEWS.WEEK) return []; 
    
    // Calcular la semana comenzando desde el día de hoy
    const today = startOfDay(currentDate)
    const days = Array.from({ length: 7 }).map((_, i) => addDays(today, i))
    
    return days
  }, [view, currentDate])
  const citasByDay = useMemo(() => { 
    if (view !== VIEWS.WEEK) return {}; 
    const map={}; 
    daysOfWeek.forEach((d)=>{ map[d.toDateString()] = [] }); 
    
    // Debug temporal: Log de citas filtradas para semana
    console.log(`🔍 WEEK - Citas filtradas:`, filteredCitas.length)
    filteredCitas.forEach(c => {
      console.log(`🔍 WEEK - Cita: ${c.fecha_cita} ${c.hora_cita} - ${c.cliente_nombre}`)
    })
    
    filteredCitas.forEach((c)=>{ 
      // Corregir el mapeo de fechas - usar la fecha exacta de la cita
      const [y,m,d] = c.fecha_cita.split("-").map(Number)
      const citaDate = new Date(y, m-1, d)
      const key = citaDate.toDateString()
      if(!map[key]) map[key]=[]; 
      
      // Debug temporal: Log de mapeo de citas
      console.log(`🔍 WEEK - Mapeando cita: ${c.fecha_cita} -> ${key}`)
      
      // Si la cita tiene servicios_asignados, crear un bloque por cada servicio
      if (c.servicios_asignados && Array.isArray(c.servicios_asignados) && c.servicios_asignados.length > 0) {
        c.servicios_asignados.forEach((servicio, idx) => {
          const servicioCita = {
            ...c,
            id: `${c.id}-${idx}`, // ID único para cada servicio
            hora_cita: servicio.hora_inicio,
            hora_fin: servicio.hora_fin,
            duracion: servicio.duracion,
            manicurista: servicio.manicurista_id,
            servicio_nombre: servicio.servicio_nombre || `Servicio ${idx + 1}`,
            es_servicio_multiple: true,
            cita_principal_id: c.id
          }
          map[key].push(servicioCita)
          console.log(`🔍 WEEK - Servicio agregado: ${servicioCita.hora_cita} - ${servicioCita.servicio_nombre}`)
        })
      } else {
        // Cita tradicional sin servicios múltiples
        map[key].push(c)
        console.log(`🔍 WEEK - Cita tradicional agregada: ${c.hora_cita} - ${c.cliente_nombre}`)
      }
    }); 
    
    Object.keys(map).forEach((k)=>{ map[k].sort((a,b)=>(a.hora_cita||'').localeCompare(b.hora_cita||'')) }); 
    
    // Debug temporal: Log del mapa final
    console.log(`🔍 WEEK - Mapa final:`, Object.keys(map).map(k => `${k}: ${map[k].length} citas`))
    
    return map 
  }, [filteredCitas, daysOfWeek, view])
  const timeSlots = useMemo(() => { const slots=[]; for(let h=8; h<=20; h++){ slots.push(`${String(h).padStart(2,'0')}:00`); if(h!==20) slots.push(`${String(h).padStart(2,'0')}:30`) } return slots }, [])
  const parseTimeToMinutes = (hhmm) => { if(!hhmm) return 0; const [h,m] = hhmm.split(":").map(Number); return h*60 + (m||0) }
  const serviceDurationMinutes = (cita) => { 
    // Si es un servicio múltiple, usar su duración específica
    if (cita.es_servicio_multiple && cita.duracion) {
      return Number(cita.duracion) || 60
    }
    // Lógica tradicional para citas normales
    const sum=(cita?.servicios_info||[]).reduce((acc,s)=> acc + (Number(s.duracion)||0),0); 
    return sum>0?sum:60 
  }

  const WeekGrid = () => {
    useEffect(()=>{ const updateNow=()=>{ const now=new Date(); const root=document.querySelector('.citasv2'); if(root){ const nowMin= now.getHours()*60 + now.getMinutes(); root.style.setProperty('--now-min', String(nowMin)); const pct=Math.max(0, Math.min(100, ((nowMin-480)/720)*100)); root.style.setProperty('--now-pct', pct+'%') } }; updateNow(); const id=setInterval(updateNow,60000); return ()=>clearInterval(id)},[])
    const todayStart = startOfDay(new Date())
    return (
      <div className="week-grid week">
        <div className="week-grid-header">
          <div className="time-col-header"></div>
          {daysOfWeek.map((d)=>{ const isToday=startOfDay(d).getTime()===todayStart.getTime(); const isPast=startOfDay(d) < todayStart; return (<div key={d.toISOString()} className={`day-col ${isPast?'past':''} ${isToday?'today':''}`}><div className="day-col-header">{d.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit" })}</div></div>) })}
        </div>
        <div className="week-grid-body">
          <div className="time-col">{timeSlots.map((t)=>(<div key={t} className="time-label">{t}</div>))}</div>
          {daysOfWeek.map((d)=>{ const key=d.toDateString(); const isToday=startOfDay(d).getTime()===todayStart.getTime(); const isPast=startOfDay(d) < todayStart; 
            // Debug temporal: Log de días renderizados
            console.log(`🔍 WEEK - Renderizando día: ${key}, citas: ${citasByDay[key]?.length || 0}`)
            return (
            <div key={d.toISOString()} className={`day-col ${isPast?'past':''} ${isToday?'today':''}`}>
              <div className="day-slots" style={{ height: `calc(var(--slot-h) * ${timeSlots.length})` }}>
                {timeSlots.map((t,idx)=>(<>
                  <div key={`row-${d.toDateString()}-${t}`} className="hour-row" style={{ top: `calc(var(--slot-h) * ${idx})` }} />
                  <button key={`${d.toDateString()}-${t}`} className="time-slot" style={{ top: `calc(var(--slot-h) * ${idx})` }} onClick={()=>{ const now=new Date(); const [hh,mm]=t.split(":").map(Number); const slotDate=new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm); if(slotDate<now) return; navigate('/citas/crear', { state: { fecha: d.toISOString().split('T')[0], hora: t, origin: 'week' } }) }} title={`Crear cita ${t}`} />
                </>))}
              </div>
              <div className="events-layer">{citasByDay[key]?.map((c,idx)=>{ 
                // Debug temporal: Log de renderizado de citas
                console.log(`🔍 WEEK - Renderizando cita en ${key}: ${c.hora_cita} - ${c.cliente_nombre}`)
                const base=manicuristaColors[c.manicurista]||"#9ca3af"; const startMin=parseTimeToMinutes(c.hora_cita); const dur=serviceDurationMinutes(c); const top=(startMin-8*60)/((20-8)*60)*100; const height=Math.max((dur/((20-8)*60))*100,4); const leftOffset=(idx%3)*6; const displayText = c.es_servicio_multiple ? `${c.servicio_nombre} - ${c.cliente_nombre}` : (c.cliente_nombre || `Cita #${c.id}`); return (<div key={c.id} className="event-block" style={{ top:`${top}%`, height:`${height}%`, left:`${leftOffset}px`, background:`${base}1A`, border:`1px solid ${base}44` }}><div className="event-chip"><span className="dot" style={{ background: base }} /><span className="chip-time">{c.hora_cita}</span><span className="chip-sep">·</span><span className="chip-text">{displayText}</span></div></div>) 
              })}</div>
            </div>) })}
        </div>
      </div>
    )
  }

  const DayList = () => {
    const start = startOfDay(currentDate)
    const dayKey = start.toDateString()
    const citasHoy = useMemo(() => {
      const citasDelDia = filteredCitas.filter((c)=> new Date(c.fecha_cita).toDateString() === dayKey)
      const citasExpandidas = []
      
      // Debug temporal: Log de citas del día
      console.log(`🔍 DAY - Día actual: ${dayKey}`)
      console.log(`🔍 DAY - Citas del día: ${citasDelDia.length}`)
      citasDelDia.forEach(c => {
        console.log(`🔍 DAY - Cita: ${c.fecha_cita} ${c.hora_cita} - ${c.cliente_nombre}`)
      })
      
      // Agrupar citas por cliente y fecha para manejar citas múltiples
      const citasAgrupadas = {}
      citasDelDia.forEach(c => {
        const clave = `${c.cliente}-${c.fecha_cita}`
        if (!citasAgrupadas[clave]) {
          citasAgrupadas[clave] = []
        }
        citasAgrupadas[clave].push(c)
      })

      // Procesar cada grupo de citas
      Object.values(citasAgrupadas).forEach(grupo => {
        if (grupo.length === 1) {
          // Cita individual
          const c = grupo[0]
          if (c.servicios_asignados && Array.isArray(c.servicios_asignados) && c.servicios_asignados.length > 0) {
            c.servicios_asignados.forEach((servicio, idx) => {
              const servicioCita = {
                ...c,
                id: `${c.id}-${idx}`,
                hora_cita: servicio.hora_inicio,
                hora_fin: servicio.hora_fin,
                duracion: servicio.duracion,
                manicurista: servicio.manicurista_id,
                servicio_nombre: servicio.servicio_nombre || `Servicio ${idx + 1}`,
                es_servicio_multiple: true,
                cita_principal_id: c.id
              }
              citasExpandidas.push(servicioCita)
              console.log(`🔍 DAY - Servicio individual: ${servicioCita.hora_cita} - ${servicioCita.servicio_nombre}`)
            })
          } else {
            citasExpandidas.push(c)
            console.log(`🔍 DAY - Cita individual: ${c.hora_cita} - ${c.cliente_nombre}`)
          }
        } else {
          // Citas múltiples - mostrar cada una pero indicar que son del mismo cliente
          grupo.forEach(c => {
            const citaMultiple = {
              ...c,
              es_cita_multiple: true,
              grupo_id: `${c.cliente}-${c.fecha_cita}`,
              total_citas_grupo: grupo.length,
              cliente_grupo: c.cliente_nombre
            }
            citasExpandidas.push(citaMultiple)
            console.log(`🔍 DAY - Cita múltiple: ${c.hora_cita} - ${c.cliente_nombre} (${grupo.length} citas)`)
          })
        }
      })
      
      console.log(`🔍 DAY - Citas expandidas: ${citasExpandidas.length}`)
      return citasExpandidas.sort((a,b)=>(a.hora_cita||'').localeCompare(b.hora_cita||''))
    }, [filteredCitas, dayKey])
    const dayContainerRef = useRef(null)
    const slotsHeightStyle = { height: `calc(var(--slot-h) * ${timeSlots.length})` }
    useEffect(()=>{ const updateNow=()=>{ const now=new Date(); const root=document.querySelector('.citasv2'); if(root){ const nowMin=now.getHours()*60 + now.getMinutes(); root.style.setProperty('--now-min', String(nowMin)); const pct=Math.max(0, Math.min(100, ((nowMin-480)/720)*100)); root.style.setProperty('--now-pct', pct+'%') } }; updateNow(); const id=setInterval(updateNow,60000); return ()=>clearInterval(id)},[start])
    return (
      <div className="week-grid day">
        <div className="week-grid-header"><div className="time-col-header"></div><div className="day-col big-title"><div className="day-col-header">{currentDate.toLocaleDateString("es-CO", { weekday: "long", day: "2-digit", month: "short" })}</div></div></div>
        <div className="week-grid-body" ref={dayContainerRef}>
          <div className="time-col" style={slotsHeightStyle}>{timeSlots.map((t)=>(<div key={t} className="time-label">{t}</div>))}</div>
          <div className="day-col" style={slotsHeightStyle}><div className="day-slots" style={slotsHeightStyle}>{timeSlots.map((t,idx)=>(<>
            <div key={`row-${dayKey}-${t}`} className={`hour-row ${t.endsWith(':30') ? 'half' : 'full'}`} style={{ top: `calc(var(--slot-h) * ${idx})` }} />
            <button key={`${dayKey}-${t}`} className={`time-slot ${t.endsWith(':00') ? 'hour' : ''}`} style={{ top: `calc(var(--slot-h) * ${idx})` }} onClick={()=>{ const now=new Date(); const [hh,mm]=t.split(":").map(Number); const slotDate=new Date(start.getFullYear(), start.getMonth(), start.getDate(), hh, mm); if(slotDate<now) return; navigate('/citas/crear', { state: { fecha: start.toISOString().split('T')[0], hora: t, origin: 'day' } }) }} title={`Crear cita ${t}`} />
          </>))}<div className="now-line" /></div><div className="events-layer">{citasHoy.filter(c=>!isFinalizadaPasada(c)).map((c,idx)=>{ 
            const base=manicuristaColors[c.manicurista]||"#9ca3af"; 
            const top=(parseTimeToMinutes(c.hora_cita)-8*60)/((20-8)*60)*100; 
            const height=Math.max((serviceDurationMinutes(c)/((20-8)*60))*100,4); 
            const leftOffset=(idx%3)*6; 
            
            // Texto de visualización mejorado para citas múltiples
            let displayText = c.cliente_nombre || `Cita #${c.id}`;
            if (c.es_cita_multiple) {
              displayText = `${c.cliente_nombre} (${c.total_citas_grupo} citas)`;
            } else if (c.es_servicio_multiple) {
              displayText = `${c.servicio_nombre} - ${c.cliente_nombre}`;
            }
            
            // Estilo diferenciado para citas múltiples
            const isMultiple = c.es_cita_multiple;
            const borderStyle = isMultiple ? `2px dashed ${base}88` : `1px solid ${base}44`;
            const backgroundStyle = isMultiple ? `${base}2A` : `${base}1A`;
            
            return (
              <div 
                key={c.id} 
                className={`event-block ${isMultiple ? 'multiple-cita' : ''}`} 
                style={{ 
                  top:`${top}%`, 
                  height:`${height}%`, 
                  left:`${leftOffset}px`, 
                  background: backgroundStyle, 
                  border: borderStyle 
                }}
              >
                <div className="event-chip">
                  <span className="dot" style={{ background: base }} />
                  <span className="chip-time">{c.hora_cita}</span>
                  <span className="chip-sep">·</span>
                  <span className="chip-text">{displayText}</span>
                  {isMultiple && <span className="chip-badge">Múltiple</span>}
                </div>
              </div>
            ) 
          })}</div></div>
        </div>
      </div>
    )
  }

  const NewAppointmentView = () => {
    const [clienteQuery, setClienteQuery] = useState("")
    const [clientesRes, setClientesRes] = useState([])
    const [clienteId, setClienteId] = useState("")
    const [clienteInfo, setClienteInfo] = useState(null)
    const [fechaSel, setFechaSel] = useState(() => prefillFecha || new Date().toISOString().split("T")[0])
    // La hora se define por servicio en el modal de asignación
    // Sincronizar prefill proveniente de navegación (día/semana/mes)
    useEffect(()=>{
      if (prefillState?.fecha) setFechaSel(prefillState.fecha)
      if (prefillState?.hora) setHoraSel(prefillState.hora)
    }, [prefillState])
    const [observ, setObserv] = useState("")
    const [loadingModal, setLoadingModal] = useState(false)

    // Nueva UX: agregar múltiples servicios con manicuristas y hora
    const [servicioAddId, setServicioAddId] = useState("")
    const [maniAddId, setManiAddId] = useState("")
    const [horaAdd, setHoraAdd] = useState("")
    const [horasAddDisponibles, setHorasAddDisponibles] = useState([])
    const [serviciosAsignados, setServiciosAsignados] = useState([]) // {servicioId, servicioNombre, duracion, manicuristaId, manicuristaNombre, hora, horasDisponibles?}
    const [showAddServiceModal, setShowAddServiceModal] = useState(false)
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [assignAllManicuristaId, setAssignAllManicuristaId] = useState("")

    const totalMin = useMemo(()=> serviciosAsignados.reduce((min,row)=> min + (Number(row.duracion)||0),0),[serviciosAsignados])
    const buscarClientes = useCallback(async(q)=>{ if(!q||q.length<2){ setClientesRes([]); return } const res=await citasService.buscarClientes(q); setClientesRes(res) },[])
    useEffect(()=>{ buscarClientes(clienteQuery) },[clienteQuery, buscarClientes])
    // Helpers de tiempo
    const normalizeHHmm = (t) => {
      if (!t) return ""
      const p = t.split(":")
      return `${String(p[0]).padStart(2,'0')}:${String(p[1]).padStart(2,'0')}`
    }
    const getSlotsInDuration = (startHHmm, durMin) => {
      const slots = []
      const [h0,m0] = normalizeHHmm(startHHmm).split(":").map(Number)
      let total = durMin
      let h=h0, m=m0
      while (total>0) {
        slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
        m += 30
        if (m>=60){ m=0; h+=1 }
        total -= 30
      }
      return slots
    }
    const canFitAt = (start, durMin, ocupadasSet) => {
      return getSlotsInDuration(start, durMin).every(s=> !ocupadasSet.has(s))
    }
    const loadHorasDisponibles = useCallback(async(manicuristaId, fecha, duracionMin) => {
      if (!manicuristaId || !fecha) { setHorasAddDisponibles([]); return }
      try {
        const base = await citasService.verificarDisponibilidad(Number(manicuristaId), fecha, 30)
        const ocupadas = new Set((base.horarios_ocupados||[]).map(normalizeHHmm))
        
        // Debug para modal de asignar manicurista
        console.log(`🔍 Modal asignar - Manicurista ${manicuristaId} fecha ${fecha}:`)
        console.log(`🔍 Respuesta del backend:`, base)

        // Bloquear horarios por novedades (ausencias/tardanzas) del día
        try {
          const novedades = await NovedadesService.getNovedadesPorManicurista(Number(manicuristaId), fecha, fecha)
          novedades.forEach((nov) => {
            if (nov.estado === "ausente") {
              const inicio = nov.hora_inicio_ausencia || nov.hora_entrada
              const fin = nov.hora_fin_ausencia || nov.hora_salida
              if (inicio && fin) {
                // calcular minutos entre inicio y fin y bloquear slots de 30m
                const [h1,m1] = inicio.split(":").map(Number)
                const [h2,m2] = fin.split(":").map(Number)
                const total = Math.max(0, (h2*60+m2) - (h1*60+m1))
                getSlotsInDuration(inicio, total).forEach(s => ocupadas.add(s))
              }
            } else if (nov.estado === "tardanza") {
              // Para tardanzas: bloquear desde la hora programada hasta la hora real de entrada
              if (nov.hora_entrada && nov.hora_llegada) {
                const horaProgramada = convertTimeToMinutes(nov.hora_entrada)
                const horaReal = convertTimeToMinutes(nov.hora_llegada)
                
                // Si llegó después de la hora programada, bloquear el tiempo perdido
                if (horaReal > horaProgramada) {
                  let currentMinutes = horaProgramada
                  while (currentMinutes < horaReal) {
                    ocupadas.add(convertMinutesToTime(currentMinutes))
                    currentMinutes += 30
                  }
                }
              }
            }
          })
        } catch (_) { /* ignorar errores de novedades */ }
        // bloquear horas ya usadas en esta pantalla para esa manicurista
        serviciosAsignados.filter(r=> Number(r.manicuristaId)===Number(manicuristaId) && r.hora).forEach(r=> {
          getSlotsInDuration(r.hora, Number(r.duracion)||0).forEach(s=> ocupadas.add(s))
        })
        // bloquear por citas ya cargadas del día
        const existentes = citas.filter(c=> c.fecha_cita===fecha && Number(c.manicurista)===Number(manicuristaId))
        existentes.forEach(c=> { getSlotsInDuration(normalizeHHmm(c.hora_cita), (c.servicios_info||[]).reduce((a,s)=>a+(Number(s.duracion)||0),0)||60).forEach(s=> ocupadas.add(s)) })
        const candidatos = (base.horarios_disponibles||[]).map(normalizeHHmm)
        const validos = candidatos.filter(h=> canFitAt(h, duracionMin, ocupadas))
        
        // Debug para modal de asignar manicurista
        console.log(`🔍 Modal asignar - Manicurista ${manicuristaId} fecha ${fecha}:`)
        console.log(`🔍 Candidatos del backend:`, candidatos)
        console.log(`🔍 Ocupadas por novedades:`, Array.from(ocupadas))
        console.log(`🔍 Horarios válidos finales:`, validos)
        
        setHorasAddDisponibles(validos)
        // autoseleccionar hora si viene de día/semana
        if (prefillHora) {
          const preN = normalizeHHmm(prefillHora)
          if (validos.includes(preN)) setHoraAdd(preN)
        }
      } catch(e){ 
        console.error("Error cargando horarios:", e)
        // Si el backend falla, generar horarios básicos como fallback
        const horariosBasicos = generarHorariosPosiblesDelDia()
        console.log(`🔍 Fallback - Generando horarios básicos:`, horariosBasicos)
        setHorasAddDisponibles(horariosBasicos)
      }
    },[citas, serviciosAsignados, prefillHora])

    useEffect(()=>{
      const s = servicios.find(x=> Number(x.id)===Number(servicioAddId))
      const dur = Number(s?.duracion)||60
      if (maniAddId && fechaSel) loadHorasDisponibles(maniAddId, fechaSel, dur)
    },[servicioAddId, maniAddId, fechaSel, loadHorasDisponibles, servicios])

    const agregarServicio = () => {
      const s = servicios.find(x=> Number(x.id)===Number(servicioAddId))
      const m = manicuristas.find(x=> Number(x.id)===Number(maniAddId))
      if (!s || !m || !horaAdd) { toast.error('Selecciona servicio, manicurista y hora'); return }
      setServiciosAsignados(prev=> [...prev, { servicioId: s.id, servicioNombre: s.nombre, duracion: Number(s.duracion)||60, manicuristaId: m.id, manicuristaNombre: m.nombres||m.nombre, hora: horaAdd }])
      setShowAssignModal(true)
      setServicioAddId("")
      setManiAddId("")
      setHoraAdd("")
      setHorasAddDisponibles([])
    }
    const eliminarFila = (idx) => setServiciosAsignados(prev=> prev.filter((_,i)=> i!==idx))
    const actualizarManiFila = async(idx, manicuristaId) => {
      const row = serviciosAsignados[idx]
      const s = servicios.find(x=> Number(x.id)===Number(row.servicioId))
      const dur = Number(s?.duracion)||60
      // recomputar hora disponible para esa fila
      try {
        const base = await citasService.verificarDisponibilidad(Number(manicuristaId), fechaSel, 30)
        const ocupadas = new Set(base.horarios_ocupados||[])
        
        // Bloquear horarios por novedades (ausencias/tardanzas) del día
        try {
          const novedades = await NovedadesService.getNovedadesPorManicurista(Number(manicuristaId), fechaSel, fechaSel)
          novedades.forEach((nov) => {
            if (nov.estado === "ausente") {
              const inicio = nov.hora_inicio_ausencia || nov.hora_entrada
              const fin = nov.hora_fin_ausencia || nov.hora_salida
              if (inicio && fin) {
                const [h1,m1] = inicio.split(":").map(Number)
                const [h2,m2] = fin.split(":").map(Number)
                const total = Math.max(0, (h2*60+m2) - (h1*60+m1))
                getSlotsInDuration(inicio, total).forEach(s => ocupadas.add(s))
              }
            } else if (nov.estado === "tardanza") {
              if (nov.hora_entrada && nov.hora_llegada) {
                const horaProgramada = convertTimeToMinutes(nov.hora_entrada)
                const horaReal = convertTimeToMinutes(nov.hora_llegada)
                if (horaReal > horaProgramada) {
                  let currentMinutes = horaProgramada
                  while (currentMinutes < horaReal) {
                    ocupadas.add(convertMinutesToTime(currentMinutes))
                    currentMinutes += 30
                  }
                }
              }
            }
          })
        } catch (_) { /* ignorar errores de novedades */ }
        
        // excluir otras filas de ese mani
        serviciosAsignados.forEach((r,i)=>{ if(i!==idx && Number(r.manicuristaId)===Number(manicuristaId) && r.hora){ getSlotsInDuration(r.hora, Number(r.duracion)||0).forEach(s=> ocupadas.add(s)) } })
        const candidatos = base.horarios_disponibles||[]
        const validos = candidatos.filter(h=> canFitAt(h, dur, ocupadas))
        const nuevaHora = validos.includes(row.hora)? row.hora : (validos[0]||"")
        setServiciosAsignados(prev=> prev.map((r,i)=> i===idx? { 
          ...r, 
          manicuristaId, 
          manicuristaNombre: (manicuristas.find(x=>Number(x.id)===Number(manicuristaId))?.nombres||manicuristas.find(x=>Number(x.id)===Number(manicuristaId))?.nombre||r.manicuristaNombre), 
          hora: nuevaHora,
          horasDisponibles: validos
        } : r))
      } catch (error) {
        console.error("Error actualizando manicurista:", error)
        // Si el backend falla, generar horarios básicos como fallback
        const horariosBasicos = generarHorariosPosiblesDelDia()
        setServiciosAsignados(prev=> prev.map((r,i)=> i===idx? { 
          ...r, 
          manicuristaId, 
          manicuristaNombre: (manicuristas.find(x=>Number(x.id)===Number(manicuristaId))?.nombres||manicuristas.find(x=>Number(x.id)===Number(manicuristaId))?.nombre||r.manicuristaNombre), 
          hora: "", 
          horasDisponibles: horariosBasicos 
        } : r))
      }
    }
    const actualizarHoraFila = (idx, hora) => setServiciosAsignados(prev=> prev.map((r,i)=> i===idx? { ...r, hora } : r))

    const asignarManicuristaATodos = async (manicuristaId) => {
      setAssignAllManicuristaId(manicuristaId)
      for (let i = 0; i < serviciosAsignados.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        await actualizarManiFila(i, manicuristaId)
      }
    }

    // Las filas del modal se gestionan al agregar/eliminar servicios en esta vista
    const crear = async () => {
      if (!clienteId || !fechaSel) { toast.error("Complete los datos obligatorios"); return }
      if (serviciosAsignados.length===0) { toast.error('Agrega al menos un servicio'); return }
      if (serviciosAsignados.some(r=> !r.manicuristaId || !r.hora)) { toast.error('Completa manicurista y hora en cada servicio'); return }
      setLoadingModal(true)
      try {
        // Agrupar servicios por manicurista
        const serviciosPorManicurista = {}
        serviciosAsignados.forEach(servicio => {
          const manicuristaId = servicio.manicuristaId
          if (!serviciosPorManicurista[manicuristaId]) {
            serviciosPorManicurista[manicuristaId] = []
          }
          serviciosPorManicurista[manicuristaId].push(servicio)
        })

        console.log("🔍 Servicios agrupados por manicurista:", serviciosPorManicurista)

        // Crear una cita por cada manicurista
        const citasCreadas = []
        for (const [manicuristaId, servicios] of Object.entries(serviciosPorManicurista)) {
          // Validar datos antes de enviar
          if (!clienteId || !manicuristaId || !fechaSel || !servicios[0]?.hora) {
            throw new Error(`Datos incompletos para manicurista ${manicuristaId}: cliente=${clienteId}, manicurista=${manicuristaId}, fecha=${fechaSel}, hora=${servicios[0]?.hora}`)
          }

          const payload = {
            cliente: Number(clienteId),
            manicurista: Number(manicuristaId),
            servicios: servicios.map(r => Number(r.servicioId)),
            fecha_cita: fechaSel,
            hora_cita: servicios[0].hora, // Usar la primera hora de este manicurista
            observaciones: observ,
            estado: "pendiente",
            // Marcar como parte de una cita múltiple
            es_cita_multiple: Object.keys(serviciosPorManicurista).length > 1,
            grupo_cita: Date.now() // ID único para agrupar las citas relacionadas
          }
          
          console.log(`🔄 Creando cita para manicurista ${manicuristaId}:`, payload)
          console.log(`🔍 Datos específicos:`, {
            cliente: payload.cliente,
            manicurista: payload.manicurista,
            servicios: payload.servicios,
            fecha_cita: payload.fecha_cita,
            hora_cita: payload.hora_cita,
            observaciones: payload.observaciones,
            estado: payload.estado
          })
          
          const citaCreada = await citasService.crearCita(payload)
          citasCreadas.push(citaCreada)
        }
        
        console.log("✅ Citas creadas:", citasCreadas.length)
        toast.success(`${citasCreadas.length} cita(s) creada(s) con múltiples servicios`)
        
        // Recargar la lista de citas inmediatamente
        const rec = await citasService.obtenerCitas({})
        setCitas(rec)
        
        // Cerrar modales y navegar
        setShowAssignModal(false)
        setShowAddServiceModal(false)
        navigate('/citas')
      } catch(e){ 
        console.error("❌ Error creando citas:", e)
        const errorMessage = e.userMessage || e.response?.data?.message || e.message || "Error creando citas"
        toast.error(errorMessage)
        
        // Cerrar modales en caso de error para no quedar atrapado
        setShowAssignModal(false)
        setShowAddServiceModal(false)
      } finally{ 
        setLoadingModal(false) 
      }
    }

    // Función auxiliar para calcular la hora de fin
    const calcularHoraFin = (horaInicio, duracionMinutos) => {
      const [hora, minutos] = horaInicio.split(':').map(Number)
      const totalMinutos = hora * 60 + minutos + duracionMinutos
      const horaFin = Math.floor(totalMinutos / 60)
      const minutosFin = totalMinutos % 60
      return `${horaFin.toString().padStart(2, '0')}:${minutosFin.toString().padStart(2, '0')}`
    }

    return (
      <div className="new-appointment">
        <div className="admin-header">
          <h2 className="admin-title">Crear Nueva Cita</h2>
          <div style={{ display:'flex', gap:'0.75rem' }}>
            <button className="admin-button secondary" onClick={()=> { setDayModalDate(null); navigate('/citas', { state: { forceMonth: true } }) }}><FaTimes /> Cancelar</button>
            <button className="admin-button primary" onClick={crear} disabled={loadingModal}><FaCheck /> Crear Cita</button>
          </div>
        </div>
        
        {/* Div izquierdo - Información de la Cita */}
        <div className="form-section left">
          <div className="section-header">
            <h3>Información de la Cita</h3>
          </div>
          <div className="form-group">
            <label>Cliente</label>
            <div className="cliente-search">
              <FaSearch className="search-icon" />
              <input 
                placeholder="Buscar por nombre o documento" 
                value={clienteQuery} 
                onChange={(e)=>setClienteQuery(e.target.value)} 
              />
            </div>
            {clienteInfo ? (
              <div className="cliente-card">
                <div className="avatar">{(clienteInfo.nombre||'')[0]?.toUpperCase()}</div>
                <div className="meta">
                  <div className="name">{clienteInfo.nombre}</div>
                  <div className="doc">{clienteInfo.documento}</div>
                  {clienteInfo.telefono && <div className="doc">{clienteInfo.telefono}</div>}
                </div>
                <button className="link" onClick={()=>{ setClienteId(""); setClienteInfo(null) }}>Cambiar</button>
              </div>
            ) : (
              <ul className="cliente-results-list">
                {clientesRes.map((c)=>(
                  <li
                    key={c.id}
                    className={`cliente-result-item ${Number(c.id)===Number(clienteId)?'active':''}`}
                    onClick={()=>{ setClienteId(c.id); setClienteInfo(c) }}
                  >
                    {c.nombre} • {c.documento}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fecha</label>
              <input type="date" value={fechaSel} onChange={(e)=>setFechaSel(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Observaciones</label>
            <textarea rows={4} value={observ} onChange={(e)=>setObserv(e.target.value)} placeholder="Observaciones adicionales (opcional)" />
          </div>
        </div>

        {/* Div derecho - Servicios de la Cita */}
        <div className="form-section right">
          <div className="section-header">
            <h3>Servicios de la Cita</h3>
          </div>
          <div className="form-group">
            <label>Agregar Servicio</label>
            <button type="button" className="admin-button primary" onClick={()=> setShowAddServiceModal(true)}>
              Seleccionar Servicio
            </button>
          </div>

          {showAddServiceModal && (
            <div className="modal-overlay" onClick={()=> setShowAddServiceModal(false)}>
              <div className="modal-container wide" onClick={(e)=> e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Seleccionar Servicio</h3>
                  <button className="modal-close" onClick={()=> setShowAddServiceModal(false)}>
                    <FaTimes />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="servicios-grid">
                    {servicios.map(servicio => (
                      <div key={servicio.id} className="servicio-card" onClick={()=>{ 
                        setServicioAddId(servicio.id); 
                        // Agregar servicio seleccionado (sin manicurista/hora aún) y abrir modal de asignación
                        setServiciosAsignados(prev=> {
                          if (prev.some(r=> Number(r.servicioId)===Number(servicio.id))) return prev
                          return [...prev, { 
                          servicioId: servicio.id, 
                          servicioNombre: servicio.nombre, 
                          duracion: Number(servicio.duracion)||60, 
                          manicuristaId: "", 
                          manicuristaNombre: "", 
                          hora: "",
                          horasDisponibles: []
                          }]
                        })
                        setShowAddServiceModal(false);
                        setShowAssignModal(true);
                      }}>
                        <div className="servicio-info">
                          <div className="servicio-nombre">{servicio.nombre}</div>
                          <div className="servicio-duracion">{servicio.duracion} minutos</div>
                          {servicio.precio && <div className="servicio-precio">${servicio.precio}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de servicios - como insumos en Compras */}
          {serviciosAsignados && serviciosAsignados.length > 0 ? (
            <div className="services-table-container">
              <table className="admin-table services-table">
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th>Duración</th>
                    <th>Manicurista</th>
                    <th>Hora</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {serviciosAsignados.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.servicioNombre}</td>
                      <td>{item.duracion} min</td>
                      <td>
                        <select value={item.manicuristaId} onChange={(e)=> actualizarManiFila(idx, e.target.value)}>
                          <option value="">Seleccionar</option>
                          {manicuristas
                            .filter(m => {
                              if (!fechaSel) return true
                              const fn = (typeof isManicuristaBloqueadaPorAusenciaCompleta === 'function') && isManicuristaBloqueadaPorAusenciaCompleta
                              return fn ? !fn(m.id, fechaSel) : true
                            })
                            .map(m=> (
                              <option key={m.id} value={m.id}>{m.nombres||m.nombre}</option>
                            ))}
                        </select>
                      </td>
                      <td>
                        <select value={item.hora||""} onChange={(e)=> actualizarHoraFila(idx, e.target.value)}>
                          <option value="">Seleccione</option>
                          {item.horasDisponibles?.map(h=> (<option key={`${idx}-${h}`} value={h}>{h}</option>)) || []}
                        </select>
                      </td>
                      <td>
                        <button 
                          type="button"
                          className="action-button delete small"
                          onClick={() => eliminarFila(idx)}
                          title="Eliminar servicio"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="subtotal-row">
                    <td colSpan="4"><strong>Duración Total:</strong></td>
                    <td><strong>{totalMin} min</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No hay servicios agregados a la cita</p>
              <p>Agregue al menos un servicio para continuar</p>
            </div>
          )}
          {showAssignModal && createPortal(
            <div className="modal-overlay" onClick={()=> setShowAssignModal(false)}>
              <div className="modal-container" style={{ maxWidth: '1200px', width: '98%', padding: 0 }} onClick={(e)=> e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '16px 20px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Asignar manicurista y horarios</h2>
                  <button className="modal-close" onClick={()=> setShowAssignModal(false)}><FaTimes /></button>
                </div>
                <div className="modal-body" style={{ padding: '12px 20px 20px 20px' }}>
                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th style={{ width: '20%' }}>Servicio</th>
                          <th style={{ width: '8%' }}>Duración</th>
                          <th style={{ width: '36%' }}>Manicurista</th>
                          <th style={{ width: '36%' }}>Horarios</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviciosAsignados.map((row, idx) => (
                          <tr key={`${row.servicioId}-${idx}`}>
                            <td>{row.servicioNombre}</td>
                            <td>{row.duracion} min</td>
                            <td>
                              <div className="citas-module-servicios-grid-compact" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
                                {manicuristas.map((m) => {
                                  const fecha = fechaSel || selectedDate || formData.fecha_cita
                                  const fnBlock = (typeof isManicuristaBloqueadaPorAusenciaCompleta === 'function') && isManicuristaBloqueadaPorAusenciaCompleta
                                  const fnMotivo = (typeof getMotivoBloqueo === 'function') && getMotivoBloqueo
                                  const bloqueada = fecha && fnBlock ? fnBlock(m.id, fecha) : false
                                  const motivo = bloqueada && fnMotivo ? fnMotivo(m.id, fecha) : ''
                                  const isSelected = Number(row.manicuristaId)===Number(m.id)
                                  return (
                                    <div
                                      key={m.id}
                                      className={`citas-module-servicio-card-compact ${isSelected?'selected':''}`}
                                      onClick={async()=>{ if (bloqueada) return; await actualizarManiFila(idx, Number(m.id)) }}
                                      title={bloqueada ? (motivo || 'No disponible por novedad') : ''}
                                      style={bloqueada ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                                    >
                                      <div className="citas-module-servicio-nombre-compact">
                                        {m.nombres||m.nombre}{bloqueada ? ' (Ausente)' : ''}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </td>
                            <td>
                              {row.horasDisponibles && row.horasDisponibles.length>0 ? (
                                <div className="citas-module-servicios-grid-compact" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
                                  {row.horasDisponibles.map((h)=> (
                                    <div key={h} className={`citas-module-servicio-card-compact ${row.hora===h?'selected':''}`} onClick={()=> actualizarHoraFila(idx, h)}>
                                      <div className="citas-module-servicio-nombre-compact">{h}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color:'#6b7280' }}>Seleccione manicurista para ver horarios</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {serviciosAsignados.length===0 && (
                          <tr><td colSpan="4" className="no-data">No hay servicios seleccionados</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="modal-footer" style={{ display:'flex', justifyContent:'flex-end', gap: 12, padding: '12px 20px 20px 20px' }}>
                  <button className="citas-module-admin-button secondary" onClick={()=> setShowAssignModal(false)}>Cerrar</button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
    )
  }

  if (mode === 'create') {
    return (
      <div className="citasv2">
        <Toaster />
        <NewAppointmentView />
      </div>
    )
  }

  const DayCitasModal = () => {
    if (!dayModalDate) return null
    const key = startOfDay(dayModalDate).toISOString().split('T')[0]
    const list = citas.filter((c) => c.fecha_cita === key && (!selectedManicuristaIds.length || selectedManicuristaIds.includes(Number(c.manicurista || c.manicurista_id))))
    return (
      <div className="modal-overlay" onClick={() => setDayModalDate(null)}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Citas de {dayModalDate.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'short' })}</h2>
            <button className="modal-close" onClick={() => setDayModalDate(null)}><FaTimes /></button>
          </div>
          <div className="modal-body">
            {list.length === 0 ? (
              <div className="no-events">Sin citas</div>
            ) : (
              <div className="day-list">
                {list.filter(c => !isFinalizadaPasada(c)).sort((a,b)=> (a.hora_cita||'').localeCompare(b.hora_cita||'')).map((c) => (
                  <div key={c.id} className="event-row">
                    <div className="time">{c.hora_cita}</div>
                    <div className="info">
                      <div className="title">{c.cliente_nombre || `Cita #${c.id}`}</div>
                      <div className="sub">{c.servicio_nombre || c.servicios_info?.map((s)=>s.nombre).join(', ')}</div>
                    </div>
                    <div className="tag" style={{ background: manicuristaColors[c.manicurista] || '#9ca3af' }}>{c.manicurista_nombre || c.manicurista}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Botón de asignación removido en modal del día para evitar dependencias del flujo de creación */}
        </div>
      </div>
    )
  }

  // Modal de detalle removido: detalle es vista independiente
  const AppointmentDetailModal = () => {
    const [observ, setObserv] = useState("")
    const [cancelMotivo, setCancelMotivo] = useState("")
    const [saving, setSaving] = useState(false)

    const avanzarEstado = async () => {
      if (!selectedCita) return
      setSaving(true)
      try {
        const current = selectedCita.estado
        if (current === "pendiente") {
          await citasService.actualizarEstadoCita(selectedCita.id, "iniciada", observ)
          toast.success("Cita marcada en curso")
        } else if (current === "iniciada") {
          const updated = await citasService.forzarActualizacionEstado(selectedCita.id, "finalizada", observ, 3)
          await new Promise((r) => setTimeout(r, 600))
          try {
            await citasService.crearVenta({ cita: selectedCita.id, cliente: selectedCita.cliente, manicurista: selectedCita.manicurista, observaciones: `Venta desde cita #${selectedCita.id}` })
            toast.success("Cita finalizada y venta creada")
          } catch (e) {
            toast.error(e.userMessage || "Cita finalizada, pero error creando venta")
          }
        }
        const rec = await citasService.obtenerCitas({})
        setCitas(rec)
        setShowDetailModal(false)
      } catch (e) {
        toast.error(e.userMessage || "Error actualizando estado")
      } finally {
        setSaving(false)
      }
    }

    const cancelarCita = async () => {
      if (!selectedCita) return
      if (!cancelMotivo) { toast.error("Ingrese motivo de cancelación"); return }
      setSaving(true)
      try {
        await citasService.actualizarEstadoCita(selectedCita.id, "cancelada", cancelMotivo)
        toast.success("Cita cancelada")
        const rec = await citasService.obtenerCitas({})
        setCitas(rec)
        setShowDetailModal(false)
      } catch (e) {
        toast.error(e.userMessage || "Error cancelando cita")
      } finally {
        setSaving(false)
      }
    }

    const nextLabel = selectedCita?.estado === "pendiente" ? "Marcar en curso" : selectedCita?.estado === "iniciada" ? "Finalizar" : null

    return (
      <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Detalle de Cita #{selectedCita?.id}</h2>
            <button className="modal-close" onClick={() => setShowDetailModal(false)}><FaTimes /></button>
          </div>
          <div className="user-details-grid">
            <div className="detail-item">
              <div className="detail-label"><span className="detail-icon">👤</span> Cliente</div>
              <div className="detail-value">{selectedCita?.cliente_nombre} ({selectedCita?.cliente_documento})</div>
            </div>
            <div className="detail-item">
              <div className="detail-label"><span className="detail-icon">💅</span> Manicurista</div>
              <div className="detail-value">{selectedCita?.manicurista_nombre}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label"><span className="detail-icon">📅</span> Fecha y Hora</div>
              <div className="detail-value">{selectedCita?.fecha_cita} {selectedCita?.hora_cita}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label"><span className="detail-icon">🧾</span> Servicios</div>
              <div className="detail-value">{selectedCita?.servicios_info?.map((s) => `${s.nombre} (${s.duracion}m)`).join(", ") || selectedCita?.servicio_nombre}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label"><span className="detail-icon">⏱</span> Estado</div>
              <div className="detail-value">{selectedCita?.estado}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Observaciones</div>
              <input className="detail-value" style={{ border: 0 }} value={observ} onChange={(e) => setObserv(e.target.value)} placeholder="Agregar/editar observaciones" />
            </div>
            {selectedCita?.estado !== "cancelada" && (
              <div className="detail-item">
                <div className="detail-label">Cancelar (motivo)</div>
                <input className="detail-value" style={{ border: 0 }} value={cancelMotivo} onChange={(e) => setCancelMotivo(e.target.value)} placeholder="Motivo de cancelación" />
              </div>
            )}
          </div>
          <div className="detail-actions">
            <button className="admin-button secondary" onClick={() => setShowDetailModal(false)}><FaTimes /> Cerrar</button>
            {selectedCita?.estado !== "cancelada" && selectedCita?.estado !== "finalizada" && (
              <>
                <button className="admin-button danger" onClick={cancelarCita} disabled={saving}>Cancelar</button>
                {nextLabel && (
                  <button className="admin-button primary" onClick={avanzarEstado} disabled={saving}>{nextLabel}</button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="citasv2">
      <Toaster />
      <Title />
      {detailMode ? (
        renderDetailViewPage()
      ) : (
        <div className={`citasv2-content ${showList ? 'single' : ''}`}>
          {!showList && <MiniSidebar />}
          <div className="citasv2-main">{showList ? <Listado /> : view === VIEWS.DAY ? <DayList /> : view === VIEWS.WEEK ? <WeekGrid /> : <MonthGrid />}</div>
        </div>
      )}
      {dayModalDate && <DayCitasModal />}
      {showChangeStateModal && createPortal(
        <div className="modal-overlay" onClick={() => !savingState && setShowChangeStateModal(false)}>
          <div className="modal-container" style={{ maxWidth: "720px", width: "92%", padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: "20px 24px 16px 24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#374151" }}>Cambio de estado</h2>
              <button className="modal-close" onClick={() => !savingState && setShowChangeStateModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-body" style={{ padding: "12px 24px 20px 24px" }}>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#374151" }}>Estado</label>
                <select
                  className="citas-module-form-group-input"
                  value={changeState}
                  onChange={(e) => setChangeState(e.target.value)}
                  disabled={savingState}
                  style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="finalizada">Finalizada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#374151" }}>Observaciones</label>
                <textarea
                  className="citas-module-form-group-textarea"
                  rows="4"
                  value={changeObservations}
                  onChange={(e) => setChangeObservations(e.target.value)}
                  placeholder="Escribe observaciones (opcional)"
                  disabled={savingState}
                  style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", resize: "vertical", minHeight: "80px" }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "12px", padding: "16px 24px 24px 24px", borderTop: "1px solid #e5e7eb" }}>
              <button className="citas-module-admin-button secondary" onClick={() => !savingState && setShowChangeStateModal(false)} disabled={savingState}>
                Cancelar
              </button>
              <button className="citas-module-admin-button primary" onClick={handleConfirmChangeState} disabled={savingState}>
                {savingState ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Modal de detalle eliminado: ahora el detalle es solo vista independiente */}
      {(loading || uiLoading) && (
        <div className="loading-overlay">
          <div className="loading-box">
            <div className="spinner small" />
            <span>Cargando...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default CitasUnified

const Citas = () => {
  const navigate = useNavigate()

  // Estados principales
  const [currentView, setCurrentView] = useState("manicuristas")
  const [selectedManicurista, setSelectedManicurista] = useState(null)
  const [manicuristas, setManicuristas] = useState([])
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCita, setSelectedCita] = useState(null)
  const [filterEstado, setFilterEstado] = useState("")
  const [filterManicurista, setFilterManicurista] = useState("")
  const [filterFecha, setFilterFecha] = useState("")
  const [citas, setCitas] = useState([])
  const [novedades, setNovedades] = useState([]) // Nuevo estado para novedades

  // Estados para búsqueda y paginación de manicuristas
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(4)

  // Estados para la tabla de citas
  const [citasSearchTerm, setCitasSearchTerm] = useState("")
  const [citasCurrentPage, setCitasCurrentPage] = useState(1)
  const [citasItemsPerPage, setCitasItemsPerPage] = useState(10)
  const [citasSortConfig, setCitasSortConfig] = useState({
    key: "fecha_cita",
    direction: "desc",
  })

  // Estados del formulario
  const [formData, setFormData] = useState({
    cliente: "",
    servicios: [],
    fecha_cita: "",
    hora_cita: "",
    observaciones: "",
  })
  const [formErrors, setFormErrors] = useState({})
  const [generalError, setGeneralError] = useState("")

  // Estados para búsqueda de cliente
  const [clientes, setClientes] = useState([])
  const [busquedaCliente, setBusquedaCliente] = useState("")
  const [mostrarResultadosClientes, setMostrarResultadosClientes] = useState(false)

  // Estados para calendario y horarios
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState("")
  const [horariosDisponibles, setHorariosDisponibles] = useState([])
  const [horariosOcupados, setHorariosOcupados] = useState([])

  // Estados para gestión de citas
  const [citasManicurista, setCitasManicurista] = useState({})
  const [editFormData, setEditFormData] = useState({
    estado: "",
    observaciones: "",
  })
  const [cancelReason, setCancelReason] = useState("")
  const [actionTimeouts, setActionTimeouts] = useState(new Set())

  // Estados para modales
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Estados para vista de disponibilidad
  const [disponibilidadData, setDisponibilidadData] = useState({})
  const [disponibilidadLoading, setDisponibilidadLoading] = useState(false)
  const [disponibilidadDate, setDisponibilidadDate] = useState(getTodayInMedellin())

  // Helper to convert "HH:MM" to minutes from midnight
  const convertTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0
    const [hours, minutes] = timeStr.split(":").map(Number)
    return hours * 60 + minutes
  }

  // Helper: parse YYYY-MM-DD as local date (avoid UTC shift)
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date()
    const [y, m, d] = dateStr.toString().split("-").map(Number)
    return new Date(Number(y), Number(m) - 1, Number(d))
  }

  // Helper to convert minutes from midnight to "HH:MM"
  const convertMinutesToTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
  }

  // Helper: obtener fecha futura en formato YYYY-MM-DD
  const getDatePlusDaysYMD = (days) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  // Helper: obtener duración total de una cita en minutos
  const getDuracionCitaEnMinutos = (cita) => {
    if (!cita) return 30
    if (cita.duracion_total) return Number(cita.duracion_total) || 30
    if (Array.isArray(cita.servicios_info)) {
      const sum = cita.servicios_info.reduce((acc, s) => acc + (Number(s.duracion) || 0), 0)
      return sum || 30
    }
    if (cita.servicio_duracion) return Number(cita.servicio_duracion) || 30
    return 30
  }

  // Helper to get all 30-minute slots within a given start time and duration
  const getSlotsInDuration = useCallback((startTimeStr, durationMinutes) => {
    const slots = new Set()
    let currentMinutes = convertTimeToMinutes(startTimeStr)
    const endMinutes = currentMinutes + durationMinutes

    // Add the starting slot and subsequent 30-minute intervals
    while (currentMinutes < endMinutes) {
      slots.add(convertMinutesToTime(currentMinutes))
      currentMinutes += 30
    }
    return Array.from(slots)
  }, [])

  // Helper to get occupied slots based on a novedad
  const getOccupiedSlotsFromNovedad = useCallback((novedad, selectedDate) => {
    const occupied = new Set()
    const novedadDate = new Date(novedad.fecha)
    const selectedDateObj = parseLocalDate(selectedDate)

    // Ensure the novedad is for the selected date
    if (novedadDate.toDateString() !== selectedDateObj.toDateString()) {
      return []
    }

    if (novedad.estado === "ausente") {
      if (novedad.tipo_ausencia === "completa") {
        // Full day absence: 10:00 to 20:00
        let currentMinutes = convertTimeToMinutes("10:00")
        const endMinutes = convertTimeToMinutes("20:00")
        while (currentMinutes < endMinutes) {
          occupied.add(convertMinutesToTime(currentMinutes))
          currentMinutes += 30
        }
      } else if (novedad.tipo_ausencia === "por_horas") {
        // Absence for specific hours
        if (novedad.hora_inicio_ausencia && novedad.hora_fin_ausencia) {
          let currentMinutes = convertTimeToMinutes(novedad.hora_inicio_ausencia)
          const endMinutes = convertTimeToMinutes(novedad.hora_fin_ausencia)
          while (currentMinutes < endMinutes) {
            occupied.add(convertMinutesToTime(currentMinutes))
            currentMinutes += 30
          }
        }
      }
    } else if (novedad.estado === "tardanza") {
      // Para tardanzas: bloquear desde la hora programada hasta la hora real de entrada
      if (novedad.hora_entrada && novedad.hora_llegada) {
        const horaProgramada = convertTimeToMinutes(novedad.hora_entrada)
        const horaReal = convertTimeToMinutes(novedad.hora_llegada)
        
        // Si llegó después de la hora programada, bloquear el tiempo perdido
        if (horaReal > horaProgramada) {
          let currentMinutes = horaProgramada
          while (currentMinutes < horaReal) {
            occupied.add(convertMinutesToTime(currentMinutes))
            currentMinutes += 30
          }
        }
      }
    }
    
    return Array.from(occupied)
  }, [])

  // FUNCIÓN MEJORADA PARA CARGAR CITAS CON REINTENTO Y DEBOUNCE
  const fetchCitas = useCallback(async (forceReload = false) => {
    // Evitar llamadas múltiples simultáneas
    if (loading && !forceReload) {
      console.log("⏳ Ya hay una carga en progreso, omitiendo...")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (filterEstado) params.estado = filterEstado
      if (filterManicurista) params.manicurista = filterManicurista
      if (filterFecha) params.fecha_cita = filterFecha

      console.log("🔄 Cargando citas con filtros:", params)
      const data = await citasService.obtenerCitas(params)
      console.log("✅ Citas cargadas desde servicio:", data)

      setCitas(data)

      // CORREGIDO: Reorganizar citas por manicurista usando el ID correcto
      const citasPorManicuristaTemp = {}
      data.forEach((cita) => {
        const manicuristaId = cita.manicurista || cita.manicurista_id
        if (!citasPorManicuristaTemp[manicuristaId]) {
          citasPorManicuristaTemp[manicuristaId] = []
        }
        citasPorManicuristaTemp[manicuristaId].push(cita)
      })

      setCitasManicurista(citasPorManicuristaTemp)
      console.log("✅ Citas organizadas por manicurista:", citasPorManicuristaTemp)
    } catch (err) {
      setError("Error al cargar las citas.")
      console.error("❌ Error en fetchCitas:", err)
      showNotification("Error al cargar las citas", "error")
    } finally {
      setLoading(false)
    }
  }, [filterEstado, filterManicurista, filterFecha, loading])

  const fetchManicuristas = useCallback(async () => {
    try {
      const data = await citasService.obtenerManicuristasDisponibles()
      setManicuristas(data)
    } catch (err) {
      console.error("Error al cargar manicuristas:", err)
    }
  }, [])

  // Función para cargar disponibilidad de todas las manicuristas
  const fetchDisponibilidad = useCallback(async (fecha = disponibilidadDate) => {
    try {
      setDisponibilidadLoading(true)
      const disponibilidad = {}
      
      // Cargar disponibilidad para cada manicurista usando el servicio de citas
      for (const manicurista of manicuristas) {
        try {
          // Intervalo base 30min
          const data = await citasService.verificarDisponibilidad(manicurista.id, fecha, 30)

          // Mezclar ocupaciones por citas locales del mismo día
          const existentes = (citasManicurista[manicurista.id] || []).filter((c) => {
            const citaDate = new Date(c.fecha_cita)
            const sel = parseLocalDate(fecha)
            return (
              citaDate.toDateString() === sel.toDateString() &&
              (c.estado === "pendiente" || c.estado === "en_proceso")
            )
          })

          const ocupadasLocal = new Set(data.horarios_ocupados || [])
          existentes.forEach((c) => {
            if (!c.hora_cita) return
            const dur = getDuracionCitaEnMinutos(c)
            getSlotsInDuration(c.hora_cita, dur).forEach((slot) => ocupadasLocal.add(slot))
          })

          const disponiblesBase = new Set(data.horarios_disponibles || [])
          const disponiblesFinal = Array.from(disponiblesBase).filter((h) => !ocupadasLocal.has(h))

          disponibilidad[manicurista.id] = {
            ...data,
            horarios_disponibles: disponiblesFinal,
            horarios_ocupados: Array.from(ocupadasLocal),
          }
        } catch (error) {
          console.warn(`Error cargando disponibilidad para manicurista ${manicurista.id}:`, error)
          disponibilidad[manicurista.id] = {
            horarios_disponibles: [],
            horarios_ocupados: [],
            error: true
          }
        }
      }
      
      setDisponibilidadData(disponibilidad)
    } catch (error) {
      console.error("Error cargando disponibilidad:", error)
      toast.error("Error al cargar la disponibilidad")
    } finally {
      setDisponibilidadLoading(false)
    }
  }, [manicuristas, disponibilidadDate, citasManicurista])

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "Fecha no disponible"

    try {
      const [year, month, day] = fechaStr.toString().split("-")
      const fecha = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))

      return fecha.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (error) {
      console.error("Error formateando fecha:", error)
      return fechaStr
    }
  }

  useEffect(() => {
    fetchCitas()
    fetchManicuristas()
  }, [fetchCitas, fetchManicuristas])

  const handleCreateCita = () => {
    setSelectedCita(null)
    setCurrentView("create")
  }

  const handleEditCita = (cita) => {
    setSelectedCita(cita)
    setEditFormData({
      estado: cita.estado || "pendiente",
      observaciones: cita.observaciones || "",
    })
    setCurrentView("edit")
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pendiente":
        return "citas-module-status-badge tardanza"
      case "en_proceso":
        return "citas-module-status-badge normal" // Changed to normal as per Novedades.css for 'en_proceso' equivalent
      case "finalizada":
        return "citas-module-status-badge normal"
      case "cancelada":
        return "citas-module-status-badge anulada"
      default:
        return "citas-module-status-badge"
    }
  }

  const showNotification = (message, type = "success") => {
    const notificationKey = `${message}-${type}`

    if (actionTimeouts.has(notificationKey)) {
      return
    }

    setActionTimeouts((prev) => new Set([...prev, notificationKey]))

    switch (type) {
      case "success":
        toast.success(message, {
          duration: 4000,
          position: "top-right",
          style: {
            background: "#10b981",
            color: "#fff",
            fontWeight: "500",
          },
        })
        break
      case "error":
        toast.error(message, {
          duration: 5000,
          position: "top-right",
          style: {
            background: "#ef4444",
            color: "#fff",
            fontWeight: "500",
          },
        })
        break
      case "warning":
        toast(message, {
          duration: 4000,
          position: "top-right",
          icon: "⚠️",
          style: {
            background: "#f59e0b",
            color: "#fff",
            fontWeight: "500",
          },
        })
        break
      default:
        toast(message)
    }

    setTimeout(() => {
      setActionTimeouts((prev) => {
        const newSet = new Set(prev)
        newSet.delete(notificationKey)
        return newSet
      })
    }, 2000)
  }

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true)

        const [manicuristasDataRaw, serviciosData, citasData, novedadesData] = await Promise.all([
          citasService.obtenerManicuristasDisponibles(),
          citasService.obtenerServiciosActivos(),
          citasService.obtenerCitas(),
          getNovedades(), // Obtener novedades
        ])

        // Filtrar manicuristas que estén ausentes (vacaciones/incapacidad o ausencia completa) hoy
        const isNovedadBloqueanteEnFecha = (n, date) => {
          // Reglas: estados/tipos que bloquean: vacaciones, incapacidad, ausente completa
          const estado = (n.estado || n.tipo || '').toLowerCase()
          const tipoAus = (n.tipo_ausencia || '').toLowerCase()
          const base = date instanceof Date ? date : new Date(date)
          const dayStart = new Date(base.getFullYear(), base.getMonth(), base.getDate())
          const dayEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1)

          const fechaN = n.fecha ? new Date(n.fecha) : null
          // Si la novedad tiene rango de fechas
          const inicio = n.fecha_inicio ? new Date(n.fecha_inicio) : fechaN
          const fin = n.fecha_fin ? new Date(n.fecha_fin) : fechaN
          if (!inicio || !fin) return false
          const overlap = !(fin < dayStart || inicio >= dayEnd)
          if (!overlap) return false
          if (estado.includes('vacac') || estado.includes('incap')) return true
          if (estado.includes('ausen') && (tipoAus.includes('completa') || tipoAus.includes('todo'))) return true
          return false
        }

        // Determinar fecha base: preferir selectedDate (crear), luego disponibilidadDate, luego currentDate
        const baseDateForFilter = selectedDate || disponibilidadDate || currentDate
        const manisBloqueadasIds = new Set(
          (novedadesData || [])
            .filter((n) => n.manicurista?.id && isNovedadBloqueanteEnFecha(n, baseDateForFilter))
            .map((n) => n.manicurista.id)
        )

        const manicuristasData = (manicuristasDataRaw || []).filter((m) => !manisBloqueadasIds.has(m.id))

        setManicuristas(manicuristasData)
        setServicios(serviciosData)
        setCitas(citasData)
        setNovedades(novedadesData) // Establecer el estado de novedades

        const citasPorManicurista = {}
        citasData.forEach((cita) => {
          const manicuristaId = cita.manicurista || cita.manicurista_id
          if (!citasPorManicurista[manicuristaId]) {
            citasPorManicurista[manicuristaId] = []
          }
          citasPorManicurista[manicuristaId].push(cita)
        })
        setCitasManicurista(citasPorManicurista)

        const today = new Date()
        const todayString = today.toISOString().split("T")[0]
        setSelectedDate(todayString)
        setFormData((prev) => ({ ...prev, fecha_cita: todayString }))
      } catch (error) {
        console.error("Error cargando datos:", error)
        showNotification("Error cargando datos iniciales", "error")
      } finally {
        setLoading(false)
      }
    }

    cargarDatos()
  }, [])

  // Refiltrar manicuristas cuando cambie la fecha base o novedades (para ocultar durante rangos como vacaciones/ausencia completa)
  useEffect(() => {
    if (!novedades || !Array.isArray(novedades) || manicuristas.length === 0) return
    const isNovedadBloqueanteEnFecha = (n, date) => {
      const estado = (n.estado || n.tipo || '').toLowerCase()
      const tipoAus = (n.tipo_ausencia || '').toLowerCase()
      const base = date instanceof Date ? date : new Date(date)
      const dayStart = new Date(base.getFullYear(), base.getMonth(), base.getDate())
      const dayEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1)
      const fechaN = n.fecha ? new Date(n.fecha) : null
      const inicio = n.fecha_inicio ? new Date(n.fecha_inicio) : fechaN
      const fin = n.fecha_fin ? new Date(n.fecha_fin) : fechaN
      if (!inicio || !fin) return false
      const overlap = !(fin < dayStart || inicio >= dayEnd)
      if (!overlap) return false
      if (estado.includes('vacac') || estado.includes('incap')) return true
      if (estado.includes('ausen') && (tipoAus.includes('completa') || tipoAus.includes('todo'))) return true
      return false
    }
    const baseDateForFilter = selectedDate || disponibilidadDate || currentDate
    const blocked = new Set(
      novedades.filter((n) => n.manicurista?.id && isNovedadBloqueanteEnFecha(n, baseDateForFilter)).map((n) => n.manicurista.id),
    )
    setManicuristas((prev) => prev.filter((m) => !blocked.has(m.id)))
  }, [novedades, selectedDate, disponibilidadDate, currentDate])

  // Cargar disponibilidad global cuando cambie la fecha seleccionada (para poder ocultar a quien no tenga horarios)
  useEffect(() => {
    if (selectedDate) {
      fetchDisponibilidad(selectedDate)
    }
  }, [selectedDate])

  const calcularDuracionTotalServicios = useCallback(() => {
    return formData.servicios.reduce((total, servicioId) => {
      const servicio = servicios.find((s) => s.id.toString() === servicioId.toString())
      return total + (Number(servicio?.duracion) || 0)
    }, 0)
  }, [formData.servicios, servicios])

  // Checks if a slot is unavailable due to overlap with a selected appointment
  const isSlotUnavailableDueToSelectedAppointment = useCallback(
    (slotTimeStr) => {
      if (!formData.hora_cita || formData.servicios.length === 0) return false

      const selectedStartMinutes = convertTimeToMinutes(formData.hora_cita)
      const totalDurationMinutes = calcularDuracionTotalServicios()
      const selectedEndMinutes = selectedStartMinutes + totalDurationMinutes

      const slotStartMinutes = convertTimeToMinutes(slotTimeStr)
      // A slot is unavailable if its start time is after the selected start time
      // but before or at the selected end time.
      return slotStartMinutes > selectedStartMinutes && slotStartMinutes < selectedEndMinutes
    },
    [formData.hora_cita, formData.servicios, calcularDuracionTotalServicios],
  )

  // Helper: verificar si una novedad bloquea completamente a la manicurista en una fecha (ausente día completo o rangos)
  const isManicuristaBloqueadaPorAusenciaCompleta = useCallback((manicuristaId, ymdDate) => {
    if (!manicuristaId || !ymdDate || !Array.isArray(novedades)) return false
    const base = parseLocalDate(ymdDate)
    const dayStart = new Date(base.getFullYear(), base.getMonth(), base.getDate())
    const dayEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1)

    for (const n of novedades) {
      if (!n || !n.manicurista?.id || Number(n.manicurista.id) !== Number(manicuristaId)) continue
      const estado = (n.estado || n.tipo || '').toLowerCase()
      const tipoAus = (n.tipo_ausencia || '').toLowerCase()

      // vacaciones/incapacidad también bloquean días completos
      if (estado.includes('vacac') || estado.includes('incap')) {
        const fechaN = n.fecha ? new Date(n.fecha) : null
        const inicio = n.fecha_inicio ? new Date(n.fecha_inicio) : fechaN
        const fin = n.fecha_fin ? new Date(n.fecha_fin) : fechaN
        if (!inicio || !fin) continue
        const overlap = !(fin < dayStart || inicio >= dayEnd)
        if (overlap) return true
      }

      // Ausente día completo o "todo el día"
      if (estado.includes('ausen') && (tipoAus.includes('completa') || tipoAus.includes('todo'))) {
        const fechaN = n.fecha ? new Date(n.fecha) : null
        const inicio = n.fecha_inicio ? new Date(n.fecha_inicio) : fechaN
        const fin = n.fecha_fin ? new Date(n.fecha_fin) : fechaN
        if (!inicio || !fin) continue
        const overlap = !(fin < dayStart || inicio >= dayEnd)
        if (overlap) return true
      }
    }
    return false
  }, [novedades])

  // Motivo de bloqueo por novedad completa (para mensajes UI)
  const getMotivoBloqueo = useCallback((manicuristaId, ymdDate) => {
    if (!manicuristaId || !ymdDate || !Array.isArray(novedades)) return ""
    const base = parseLocalDate(ymdDate)
    const dayStart = new Date(base.getFullYear(), base.getMonth(), base.getDate())
    const dayEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1)
    for (const n of novedades) {
      if (!n || !n.manicurista?.id || Number(n.manicurista.id) !== Number(manicuristaId)) continue
      const estado = (n.estado || n.tipo || '').toLowerCase()
      const tipoAus = (n.tipo_ausencia || '').toLowerCase()
      const fechaN = n.fecha ? new Date(n.fecha) : null
      const inicio = n.fecha_inicio ? new Date(n.fecha_inicio) : fechaN
      const fin = n.fecha_fin ? new Date(n.fecha_fin) : fechaN
      if (!inicio || !fin) continue
      const overlap = !(fin < dayStart || inicio >= dayEnd)
      if (!overlap) continue
      if (estado.includes('vacac')) return 'Vacaciones (día completo)'
      if (estado.includes('incap')) return 'Incapacidad (día completo)'
      if (estado.includes('ausen') && (tipoAus.includes('completa') || tipoAus.includes('todo'))) return 'Ausencia (día completo)'
    }
    return ''
  }, [novedades])

  // Genera TODOS los horarios posibles para el día (10:00 AM - 8:00 PM)
  const generarHorariosPosiblesDelDia = useCallback(() => {
    const horarios = []
    const HORA_INICIO_CITAS = 10
    const HORA_FIN_CITAS = 20 // 8:00 PM

    for (let hora = HORA_INICIO_CITAS; hora < HORA_FIN_CITAS; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 30) {
        horarios.push(`${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`)
      }
    }
    return horarios
  }, [])

  const verificarDisponibilidad = useCallback(async () => {
    if (!selectedManicurista || !selectedDate) return

    try {
      const duracionTotalMinutos = calcularDuracionTotalServicios() // Duración de la NUEVA cita que se está considerando

      // 1. Obtener disponibilidad del backend (principalmente para citas existentes y disponibilidad general)
      // Si la manicurista está bloqueada por ausencia completa en la fecha seleccionada, ocultar horarios por completo
      if (isManicuristaBloqueadaPorAusenciaCompleta(selectedManicurista.id, selectedDate)) {
        setHorariosDisponibles([])
        setHorariosOcupados([])
        const motivo = getMotivoBloqueo(selectedManicurista.id, selectedDate)
        setError(`Sin disponibilidad: ${motivo || 'Novedad de día completo'}`)
        return
      }

      const disponibilidad = await citasService.verificarDisponibilidad(
        selectedManicurista.id,
        selectedDate,
        duracionTotalMinutos,
      )

      const backendAvailable = new Set(disponibilidad.horarios_disponibles || [])
      const backendOccupied = new Set(disponibilidad.horarios_ocupados || [])

      // 2. Calcular horarios ocupados por citas existentes para esta manicurista y fecha
      const existingCitasForManicurista = citasManicurista[selectedManicurista.id] || []
      const occupiedFromExistingAppointments = new Set()

      existingCitasForManicurista.forEach((cita) => {
        const citaDate = new Date(cita.fecha_cita)
        const selectedDateObj = new Date(selectedDate)

        if (citaDate.toDateString() === selectedDateObj.toDateString()) {
          // Solo considerar citas pendientes o en proceso, excluir finalizadas/canceladas/no_presentadas
          if (cita.estado === "pendiente" || cita.estado === "en_proceso") {
            const duracion = getDuracionCitaEnMinutos(cita)
            const occupiedSlots = getSlotsInDuration(cita.hora_cita, duracion)
            occupiedSlots.forEach((slot) => occupiedFromExistingAppointments.add(slot))
          }
        }
      })

      // 3. Calcular horarios ocupados por Novedades para esta manicurista y fecha
      const novedadesForManicurista = novedades.filter((n) => n.manicurista?.id === selectedManicurista.id)
      const occupiedFromNovedades = new Set()

      novedadesForManicurista.forEach((novedad) => {
        const novedadOccupied = getOccupiedSlotsFromNovedad(novedad, selectedDate)
        console.log(`🔍 Novedad ${novedad.estado} para ${selectedManicurista.nombre}:`, {
          novedad,
          ocupados: novedadOccupied
        })
        novedadOccupied.forEach((slot) => occupiedFromNovedades.add(slot))
      })

      const allPossibleSlots = generarHorariosPosiblesDelDia()

      const now = new Date()
      const isToday = selectedDate === new Date().toISOString().split("T")[0]
      const bufferTime = new Date(now.getTime() + 15 * 60 * 1000) // Hora actual + 15 min de buffer
      const closingTime = parseLocalDate(selectedDate)
      closingTime.setHours(20, 0, 0, 0) // 8:00 PM hora de cierre

      const finalAvailable = []
      const finalOccupied = new Set() // Usar un Set para evitar duplicados

      allPossibleSlots.forEach((slotTimeStr) => {
        const [hour, minute] = slotTimeStr.split(":").map(Number)
        const slotDateTime = parseLocalDate(selectedDate)
        slotDateTime.setHours(hour, minute, 0, 0)

        // Verificar si la NUEVA cita se extendería más allá de la hora de cierre
        const potentialAppointmentEndTime = new Date(slotDateTime.getTime() + duracionTotalMinutos * 60 * 1000)

        // Priorizar estados ocupados
        if (
          (isToday && slotDateTime < bufferTime) || // Pasado o muy pronto para hoy
          potentialAppointmentEndTime > closingTime // Nueva cita se extiende más allá del cierre
        ) {
          finalOccupied.add(slotTimeStr)
          return // Skip further checks for this slot
        }

        // Check if the current slot or any subsequent slot required for the NEW appointment's duration
        // is blocked by existing appointments, backend occupied slots, or novedades.
        const requiredSlotsForNewAppointment = getSlotsInDuration(slotTimeStr, duracionTotalMinutos)
        let isBlockedByAnySource = false

        for (const requiredSlot of requiredSlotsForNewAppointment) {
          if (
            backendOccupied.has(requiredSlot) || // From backend (might be start times, but getSlotsInDuration helps)
            occupiedFromExistingAppointments.has(requiredSlot) || // From existing appointments
            occupiedFromNovedades.has(requiredSlot) // From manicurist absences
          ) {
            isBlockedByAnySource = true
            break
          }
        }

        if (isBlockedByAnySource) {
          finalOccupied.add(slotTimeStr)
        } else {
          // Estrategia: si el backend no devuelve disponibilidad (o está vacío),
          // consideramos disponible todo lo que no esté ocupado por ninguna fuente.
          // Si sí devuelve disponibilidad, restringimos a esos slots.
          if (backendAvailable.size === 0 || backendAvailable.has(slotTimeStr)) {
            finalAvailable.push(slotTimeStr)
          }
        }
      })

      // Filtrar cualquier horario disponible que también esté en finalOccupied (no debería ocurrir con la lógica correcta, pero es bueno para la robustez)
      const trulyAvailable = finalAvailable.filter((slot) => !finalOccupied.has(slot))

      // Debug: Log de disponibilidad
      console.log(`🔍 Disponibilidad para ${selectedManicurista.nombre} el ${selectedDate}:`)
      console.log(`🔍 Backend disponibles:`, Array.from(backendAvailable))
      console.log(`🔍 Backend ocupados:`, Array.from(backendOccupied))
      console.log(`🔍 Ocupados por citas existentes:`, Array.from(occupiedFromExistingAppointments))
      console.log(`🔍 Ocupados por novedades:`, Array.from(occupiedFromNovedades))
      console.log(`🔍 Finalmente disponibles:`, trulyAvailable)
      console.log(`🔍 Finalmente ocupados:`, Array.from(finalOccupied))

      // No mostrar horarios ocupados (pendiente/en_proceso) ni estados finalizada/cancelada/no_presentada
      setHorariosDisponibles(trulyAvailable)
      setHorariosOcupados(Array.from(finalOccupied)) // Convertir de nuevo a array para el estado
    } catch (error) {
      console.error("Error verificando disponibilidad:", error)
      // Fallback en caso de error, mostrando horarios generales y marcando pasados
      const allPossibleSlots = generarHorariosPosiblesDelDia()
      const now = new Date()
      const isToday = selectedDate === new Date().toISOString().split("T")[0]
      const bufferTime = new Date(now.getTime() + 15 * 60 * 1000)

      const fallbackAvailable = []
      const fallbackOccupied = []

      allPossibleSlots.forEach((slotTimeStr) => {
        const [hour, minute] = slotTimeStr.split(":").map(Number)
        const slotDateTime = parseLocalDate(selectedDate)
        slotDateTime.setHours(hour, minute, 0, 0)

        const duracionTotalMinutos = calcularDuracionTotalServicios()
        const appointmentEndTime = new Date(slotDateTime.getTime() + duracionTotalMinutos * 60 * 1000)
        const closingTime = parseLocalDate(selectedDate)
        closingTime.setHours(20, 0, 0, 0)

        if (isToday && slotDateTime < bufferTime) {
          fallbackOccupied.push(slotTimeStr)
        } else if (appointmentEndTime > closingTime) {
          fallbackOccupied.push(slotTimeStr)
        } else {
          fallbackAvailable.push(slotTimeStr)
        }
      })

      setHorariosDisponibles(fallbackAvailable)
      setHorariosOcupados(fallbackOccupied)
      showNotification("Error al obtener disponibilidad, mostrando horarios generales.", "warning")
    }
  }, [
    selectedManicurista,
    selectedDate,
    calcularDuracionTotalServicios,
    generarHorariosPosiblesDelDia,
    citasManicurista,
    novedades, // Añadir novedades a las dependencias
    getSlotsInDuration, // Añadir helper a las dependencias
    getOccupiedSlotsFromNovedad, // Añadir helper a las dependencias
  ])

  useEffect(() => {
    if (selectedManicurista && selectedDate) {
      verificarDisponibilidad()
    }
  }, [selectedManicurista, selectedDate, formData.servicios, verificarDisponibilidad])

  const filteredAndPaginatedManicuristas = () => {
    const filtered = manicuristas.filter((manicurista) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        (manicurista.nombre?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.nombres?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.name?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.especialidad?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.email?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.documento?.toLowerCase() || "").includes(searchLower)
      )
    })

    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  const totalPages = Math.ceil(
    manicuristas.filter((manicurista) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        (manicurista.nombre?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.nombres?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.name?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.especialidad?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.email?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.documento?.toLowerCase() || "").includes(searchLower)
      )
    }).length / itemsPerPage,
  )

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  const handleCitasSort = (key) => {
    let direction = "asc"
    if (citasSortConfig.key === key && citasSortConfig.direction === "asc") {
      direction = "desc"
    }
    setCitasSortConfig({ key, direction })
  }

  const renderCitasSortIndicator = (key) => {
    if (citasSortConfig.key !== key) {
      return <FaSort className="citas-module-sort-icon" />
    }
    return citasSortConfig.direction === "asc" ? (
      <FaSortUp className="citas-module-sort-icon active" />
    ) : (
      <FaSortDown className="citas-module-sort-icon active" />
    )
  }

  const getFilteredAndSortedCitas = () => {
    if (!selectedManicurista) return []

    const citasDeManicurista = citasManicurista[selectedManicurista.id] || []
    console.log(`Citas para manicurista ${selectedManicurista.id}:`, citasDeManicurista)

    const filtered = citasDeManicurista.filter((cita) => {
      const searchLower = citasSearchTerm.toLowerCase()
      return (
        (cita.cliente_nombre?.toLowerCase() || "").includes(searchLower) ||
        (cita.cliente_documento?.toLowerCase() || "").includes(searchLower) ||
        (cita.servicio_nombre?.toLowerCase() || "").includes(searchLower) ||
        (cita.fecha_cita?.toLowerCase() || "").includes(searchLower) ||
        (cita.estado?.toLowerCase() || "").includes(searchLower)
      )
    })

    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[citasSortConfig.key] || ""
      let bValue = b[citasSortConfig.key] || ""

      if (citasSortConfig.key === "fecha_cita") {
        aValue = new Date(aValue + "T" + (a.hora_cita || "00:00"))
        bValue = new Date(bValue + "T" + (b.hora_cita || "00:00"))
      }

      if (aValue < bValue) {
        return citasSortConfig.direction === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return citasSortConfig.direction === "asc" ? 1 : -1
      }
      return 0
    })

    return sorted
  }

  const getCurrentPageCitas = () => {
    const filtered = getFilteredAndSortedCitas()
    const indexOfLastItem = citasCurrentPage * citasItemsPerPage
    const indexOfFirstItem = indexOfLastItem - citasItemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  const totalCitasPages = Math.ceil(getFilteredAndSortedCitas().length / citasItemsPerPage)

  const paginateCitas = (pageNumber) => setCitasCurrentPage(pageNumber)

  // Funciones del calendario
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const formatDateForInput = (date) => {
    return date.toISOString().split("T")[0]
  }

  const isDateDisabled = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    maxDate.setHours(23, 59, 59, 999)

    return date < today || date > maxDate
  }

  const handleDateSelect = (date) => {
    const dateString = formatDateForInput(date)
    setSelectedDate(dateString)
    setFormData((prev) => ({ ...prev, fecha_cita: dateString, hora_cita: "" }))
  }

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  const handleSelectManicurista = (manicurista) => {
    setSelectedManicurista(manicurista)
    setCurrentView("create")
    resetForm()
  }

  const resetForm = () => {
    const today = new Date().toISOString().split("T")[0]
    setFormData({
      cliente: "",
      servicios: [],
      fecha_cita: today,
      hora_cita: "",
      observaciones: "",
    })
    setBusquedaCliente("")
    setFormErrors({})
    setGeneralError("")
    setMostrarResultadosClientes(false)
    setSelectedDate(today)
  }

  const toggleServicio = (servicioId) => {
    const servicioIdString = servicioId.toString()
    setFormData((prev) => ({
      ...prev,
      servicios: prev.servicios.includes(servicioIdString)
        ? prev.servicios.filter((id) => id !== servicioIdString)
        : [...prev.servicios, servicioIdString],
      hora_cita: "", // Reset hora_cita when services change to re-evaluate availability
    }))

    if (formErrors.servicios) {
      setFormErrors((prev) => ({ ...prev, servicios: "" }))
    }
  }

  const buscarClientes = async (query) => {
    if (query.length < 2) {
      setClientes([])
      setMostrarResultadosClientes(false)
      return
    }

    try {
      const clientesData = await citasService.buscarClientes(query)

      const clientesFiltrados = clientesData.filter((cliente) => {
        const queryLower = query.toLowerCase()
        const nombre = (cliente.nombre || "").toLowerCase()
        const documento = (cliente.documento || "").toLowerCase()

        return nombre.includes(queryLower) || documento.includes(queryLower)
      })

      setClientes(clientesFiltrados)
      setMostrarResultadosClientes(clientesFiltrados.length > 0)
    } catch (error) {
      console.error("Error buscando clientes:", error)
      showNotification("Error buscando clientes", "error")
    }
  }

  const seleccionarCliente = (cliente) => {
    setFormData((prev) => ({ ...prev, cliente: cliente.id }))
    setBusquedaCliente(`${cliente.nombre} - ${cliente.documento}`)
    setMostrarResultadosClientes(false)
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.cliente) errors.cliente = "Cliente es requerido"
    if (!formData.servicios || formData.servicios.length === 0) errors.servicios = "Al menos un servicio es requerido"
    if (!formData.fecha_cita) errors.fecha_cita = "Fecha es requerida"
    if (!formData.hora_cita) errors.hora_cita = "Hora es requerida"

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      showNotification("Por favor corrija los errores en el formulario", "error")
      return
    }

    try {
      setLoading(true)
      setGeneralError("")

      const dataToSend = {
        cliente: Number.parseInt(formData.cliente),
        manicurista: selectedManicurista.id,
        servicios: formData.servicios.map((id) => Number.parseInt(id)),
        fecha_cita: formData.fecha_cita,
        hora_cita: formData.hora_cita,
        observaciones: formData.observaciones,
        servicio: formData.servicios.length > 0 ? Number.parseInt(formData.servicios[0]) : null,
        estado: "pendiente", // Agregar estado explícitamente
      }

      const citaCreada = await citasService.crearCita(dataToSend)
      showNotification("Cita creada exitosamente", "success")
      // Intentar enviar confirmación al cliente (si hay endpoint en backend)
      try {
        if (citaCreada?.id) {
          const resConf = await citasService.enviarConfirmacionCita(citaCreada.id)
          if (!resConf?.skipped) {
            showNotification("Confirmación enviada al cliente", "success")
          } else {
            // Silencioso si está omitido por no implementado; dejar solo la confirmación de creación
            console.info("Confirmación omitida (no implementada)", resConf)
          }
        }
      } catch (notifErr) {
        console.warn("Error enviando confirmación al cliente:", notifErr)
        // Dejar en log sin mostrar advertencia amarilla al usuario
      }
      
      // Notificar al dashboard que debe actualizarse
      localStorage.setItem('dashboardNeedsUpdate', 'true')
      localStorage.setItem('lastCitaCreated', new Date().toISOString())
      
      // Recargar datos inmediatamente
      const rec = await citasService.obtenerCitas({})
      setCitas(rec)
      
      setCurrentView("manicuristas")
      setSelectedManicurista(null)
    } catch (err) {
      console.error("Error al crear cita:", err)
      const errorMessage = err.userMessage || err.response?.data?.message || err.message || "Ha ocurrido un error"
      setGeneralError(`Error: ${errorMessage}`)
      showNotification(`Error: ${errorMessage}`, "error")
    } finally {
      setLoading(false)
    }
  }

  const calcularPrecioTotal = () => {
    return formData.servicios.reduce((total, servicioId) => {
      const servicio = servicios.find((s) => s.id.toString() === servicioId.toString())
      return total + (Number(servicio?.precio) || 0)
    }, 0)
  }

  // (eliminada: ahora se define al inicio para evitar duplicidad)

  const handleVerDetalle = (cita) => {
    setSelectedCita(cita)
    setCurrentView("detail")
  }

  // (deshabilitado) El cambio de estado será por modal, no vista separada

  const handleVerCitas = (manicurista) => {
    setSelectedManicurista(manicurista)
    setCitasSearchTerm("")
    setCitasCurrentPage(1)
    setCurrentView("citas")
  }

  const handleCancelCitaModal = (cita) => {
    setSelectedCita(cita)
    setCancelReason("")
    setShowCancelModal(true)
  }



  // FUNCIÓN MEJORADA PARA ACTUALIZAR CITA CON MEJOR GESTIÓN DE ESTADO
  const handleUpdateCita = async () => {
    if (!selectedCita) {
      showNotification("No hay cita seleccionada para actualizar.", "error")
      setCurrentView("citas")
      return
    }

    console.log("🔄 Iniciando actualización para cita ID:", selectedCita.id)
    console.log("🔄 Nuevo estado propuesto:", editFormData.estado)

    try {
      setLoading(true)

      if (editFormData.estado === "finalizada") {
        console.log("🔄 Intentando finalizar cita y crear venta...")

        // Actualizar estado a finalizada usando el servicio mejorado
        const citaActualizada = await citasService.forzarActualizacionEstado(
          selectedCita.id,
          "finalizada",
          editFormData.observaciones,
          3,
        )

        console.log("✅ Cita actualizada a finalizada:", citaActualizada)
        showNotification("Cita actualizada exitosamente", "success")

        // Pequeña pausa para asegurar que la BD se actualice
        await new Promise((resolve) => setTimeout(resolve, 1000))

        try {
          const citaParaVenta = {
            ...selectedCita,
            ...citaActualizada,
            estado: "finalizada",
            observaciones: editFormData.observaciones,
          }
          console.log("🔄 Intentando crear venta para cita:", citaParaVenta.id)
          await crearVentaDesdeCita(citaParaVenta)
          console.log("✅ Venta creada exitosamente.")
        } catch (ventaError) {
          console.error("⚠️ Error creando venta, pero la cita se actualizó:", ventaError)
        }
      } else {
        console.log("🔄 Actualizando estado de cita sin finalizar...")
        await citasService.actualizarEstadoCita(selectedCita.id, editFormData.estado, editFormData.observaciones)
        showNotification("Cita actualizada exitosamente", "success")
      }

      // Recargar datos desde el servidor
      console.log("🔄 Recargando datos desde el servidor...")
      const rec = await citasService.obtenerCitas({})
      setCitas(rec)

      // Actualizar estado local
      setSelectedCita({
        ...selectedCita,
        estado: editFormData.estado,
        observaciones: editFormData.observaciones,
      })

      setCurrentView("citas")
    } catch (error) {
      console.error("❌ Error actualizando cita:", error)
      showNotification("Error actualizando cita", "error")
    } finally {
      setLoading(false)
    }
  }

  // Cambio de estado automático: pendiente -> en_proceso -> finalizada
  useEffect(() => {
    const tick = async () => {
      try {
        if (!Array.isArray(citas) || citas.length === 0) return
        const now = new Date()
        const todayYMD = now.toISOString().split("T")[0]

        // 1. Cambiar pendiente -> en_proceso cuando llega la hora
        const candidates = citas.filter(
          (c) =>
            (c.estado === "pendiente") &&
            c.fecha_cita === todayYMD &&
            typeof c.hora_cita === "string",
        )

        for (const c of candidates) {
          const [hh, mm] = c.hora_cita.split(":").map(Number)
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0)
          if (now >= start) {
            try {
              await citasService.actualizarEstadoCita(c.id, "en_proceso", (c.observaciones || "") + "\n[Auto] Inicio automático")
              // Actualizar en memoria
              setCitas((prev) => prev.map((x) => (x.id === c.id ? { ...x, estado: "en_proceso" } : x)))
            } catch (e) {
              console.warn("No se pudo actualizar estado automático de cita", c.id, e)
            }
          }
        }

        // 2. Cambiar en_proceso -> finalizada cuando ya pasó la duración estimada
        const enProceso = citas.filter(
          (c) =>
            (c.estado === "en_proceso") &&
            c.fecha_cita === todayYMD &&
            typeof c.hora_cita === "string",
        )

        for (const c of enProceso) {
          const [hh, mm] = c.hora_cita.split(":").map(Number)
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0)
          // Calcular duración estimada (60 min por defecto si no hay servicios_info)
          const duracionMin = c.servicios_info?.reduce((acc, s) => acc + (Number(s.duracion) || 60), 0) || 60
          const end = new Date(start.getTime() + duracionMin * 60000)
          
          if (now >= end) {
            try {
              await citasService.actualizarEstadoCita(c.id, "finalizada", (c.observaciones || "") + "\n[Auto] Finalización automática")
              // Actualizar en memoria
              setCitas((prev) => prev.map((x) => (x.id === c.id ? { ...x, estado: "finalizada" } : x)))
            } catch (e) {
              console.warn("No se pudo finalizar automáticamente la cita", c.id, e)
            }
          }
        }

        // 3. Cambiar pendiente -> finalizada para citas de días anteriores
        const citasPasadas = citas.filter(
          (c) =>
            (c.estado === "pendiente") &&
            c.fecha_cita < todayYMD
        )

        for (const c of citasPasadas) {
          try {
            await citasService.actualizarEstadoCita(c.id, "finalizada", (c.observaciones || "") + "\n[Auto] Finalizada por fecha pasada")
            // Actualizar en memoria
            setCitas((prev) => prev.map((x) => (x.id === c.id ? { ...x, estado: "finalizada" } : x)))
          } catch (e) {
            console.warn("No se pudo finalizar cita pasada", c.id, e)
          }
        }
      } catch (err) {
        console.warn("Auto avance estados falló", err)
      }
    }
    // Ejecutar al montar y luego cada minuto
    tick()
    const id = setInterval(tick, 60 * 1000)
    return () => clearInterval(id)
  }, [citas])

  const handleConfirmCancel = async () => {
    if (!selectedCita || !cancelReason.trim()) {
      showNotification("Debe especificar el motivo de cancelación", "error")
      return
    }

    console.log("🔄 Iniciando cancelación para cita ID:", selectedCita.id)

    try {
      setLoading(true)

      await citasService.actualizarEstadoCita(
        selectedCita.id,
        "cancelada",
        `${selectedCita.observaciones || ""}\n\n[CANCELADA] Motivo: ${cancelReason}`,
      )

      showNotification("Cita cancelada exitosamente", "success")
      setShowCancelModal(false)
      setCurrentView("citas")

      // Recargar datos
      await fetchCitas()
    } catch (error) {
      console.error("❌ Error cancelando cita:", error)
      showNotification("Error cancelando cita", "error")
    } finally {
      setLoading(false)
    }
  }

  // (eliminadas: ahora se definen antes para evitar duplicidad)

  // VISTA DE MANICURISTAS
  const renderManicuristasView = () => (
    <div className="citas-module">
      <div className="citas-module-admin-container">
        {/* Contenedor unificado para header y filtros */}
        <div className="citas-module-admin-content-wrapper">
          <div className="citas-module-admin-header">
            <h1 className="citas-module-admin-title">Gestión de Citas por Manicurista</h1>
            <button
              className="citas-module-admin-button primary"
              onClick={() => {
                setCurrentView("disponibilidad")
                fetchDisponibilidad()
              }}
            >
              <FaClock /> Ver Disponibilidad
            </button>
          </div>

          {/* Filtros y búsqueda */}
          <div className="citas-module-admin-filters">
            <div className="citas-module-search-container">
              <FaSearch className="citas-module-search-icon" />
              <input
                type="text"
                placeholder="Buscar manicuristas..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="citas-module-search-input"
              />
            </div>

            <div className="citas-module-items-per-page">
              <span>Mostrar:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="citas-module-items-select"
              >
                <option value={4}>4</option>
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={16}>16</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="citas-module-loading-container">
            <div className="citas-module-spinner"></div>
            <p>Cargando manicuristas...</p>
          </div>
        ) : error ? (
          <div className="citas-module-error-container">
            <p>{error}</p>
            <button className="citas-module-admin-button secondary" onClick={fetchManicuristas}>
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <div className="citas-module-manicuristas-grid">
              {filteredAndPaginatedManicuristas().map((manicurista) => {
                const citasManicuristaActual = citasManicurista[manicurista.id] || []

                return (
                  <div key={manicurista.id} className="citas-module-manicurista-card">
                    <div className="citas-module-card-border"></div>
                    <div className="citas-module-manicurista-content">
                      <div className="citas-module-manicurista-avatar">
                        <FaUserMd />
                      </div>
                      <h3 className="citas-module-manicurista-nombre">
                        {manicurista.nombre || manicurista.nombres || manicurista.name || "Manicurista"}
                      </h3>
                      <p className="citas-module-manicurista-especialidad">Especialista en manicure</p>

                      <div className="citas-module-manicurista-actions">
                        <PermissionButton
                          modulo="citas"
                          accion="crear"
                          className="citas-module-btn-nueva-cita"
                          onClick={() => handleSelectManicurista(manicurista)}
                          hidden={true}
                        >
                          <FaCalendarPlus /> Nueva Cita
                        </PermissionButton>

                        <button className="citas-module-btn-ver-citas" onClick={() => handleVerCitas(manicurista)}>
                          <FaClipboardList /> Ver Citas ({citasManicuristaActual.length})
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="citas-module-pagination">
                <button
                  className="citas-module-pagination-button"
                  onClick={() => paginate(1)}
                  disabled={currentPage === 1}
                >
                  &laquo;
                </button>
                <button
                  className="citas-module-pagination-button"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>

                <div className="citas-module-pagination-info">
                  Página {currentPage} de {totalPages}
                </div>

                <button
                  className="citas-module-pagination-button"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </button>
                <button
                  className="citas-module-pagination-button"
                  onClick={() => paginate(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  &raquo;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

  // VISTA DE FORMULARIO (Nueva Cita)
  const renderFormView = () => (
    <div className="citas-module">
      <div className="citas-module-admin-container">
        <div className="citas-module-form-header">
          <div className="citas-module-form-header-left">
            <button
              className="citas-module-admin-button secondary"
              onClick={() => {
                setCurrentView("manicuristas")
                setSelectedManicurista(null)
              }}
            >
              <FaArrowLeft /> Volver
            </button>
          </div>
          <h1 className="citas-module-form-title">Nueva Cita - {selectedManicurista?.nombre}</h1>
          <div className="citas-module-form-header-right">
            <button className="citas-module-admin-button primary" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <div className="citas-module-spinner-small"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <FaSave /> Crear Cita
                </>
              )}
            </button>
          </div>
        </div>

        {generalError && <div className="citas-module-general-error">{generalError}</div>}

        {/* Aplicamos la clase para el layout de dos columnas con ajuste de tamaño */}
        <div className="citas-module-form-content-compact citas-module-form-content-adjusted-columns">
          {/* Columna Izquierda: Cliente y Servicios */}
          <div className="flex flex-col gap-4">
            {/* Información del cliente */}
            <div className="citas-module-form-section-compact">
              <h3>
                <FaUser className="citas-module-form-icon" /> Cliente
              </h3>
              <div className="cliente-search-section">
                <div style={{ position: "relative" }}>
                  <FaSearch className="cliente-search-icon" />
                  <input
                    type="text"
                    value={busquedaCliente}
                    onChange={(e) => {
                      setBusquedaCliente(e.target.value)
                      buscarClientes(e.target.value)
                    }}
                    onFocus={() => setMostrarResultadosClientes(true)}
                    placeholder="Buscar cliente por nombre o documento..."
                    className={`cliente-search-input ${formErrors.cliente ? "error" : ""}`}
                  />

                  {mostrarResultadosClientes && (
                    <div className="cliente-search-overlay" onClick={() => setMostrarResultadosClientes(false)} />
                  )}

                  {mostrarResultadosClientes && (
                    <div className="cliente-results-dropdown fade-in">
                      <div className="cliente-results-header">
                        <span>
                          {clientes.length > 0 ? `Clientes encontrados (${clientes.length})` : "Sin resultados"}
                        </span>
                        <button
                          type="button"
                          className="cliente-results-close"
                          onClick={() => setMostrarResultadosClientes(false)}
                        >
                          <FaTimes />
                        </button>
                      </div>

                      {clientes.length > 0 ? (
                        clientes.map((cliente) => (
                          <div key={cliente.id} className="cliente-item" onClick={() => seleccionarCliente(cliente)}>
                            <div className="cliente-item-nombre">{cliente.nombre}</div>
                            <div className="cliente-item-info">
                              <div className="cliente-item-info-row">
                                <span>📄 Documento: {cliente.documento}</span>
                              </div>
                              <div className="cliente-item-info-row">
                                <span>📞 Teléfono: {cliente.celular || "No registrado"}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-cliente-results">
                          <div className="no-cliente-message">No se encontraron clientes</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {formErrors.cliente && <div className="citas-module-error-text">{formErrors.cliente}</div>}
              </div>
            </div>

            {/* Servicios */}
            <div className="citas-module-form-section-compact">
              <h3>
                <FaServicestack className="citas-module-form-icon" /> Servicios
              </h3>
              <div className="citas-module-servicios-grid-compact">
                {servicios.map((servicio) => (
                  <div
                    key={servicio.id}
                    className={`citas-module-servicio-card-compact ${
                      formData.servicios.includes(servicio.id.toString()) ? "selected" : ""
                    }`}
                    onClick={() => toggleServicio(servicio.id)}
                  >
                    <div className="citas-module-servicio-nombre-compact">{servicio.nombre}</div>
                    <div className="citas-module-servicio-precio-compact">{formatPrice(servicio.precio)}</div>
                    {formData.servicios.includes(servicio.id.toString()) && (
                      <div className="citas-module-servicio-selected-icon">
                        <FaCheck />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {formErrors.servicios && <div className="citas-module-error-text">{formErrors.servicios}</div>}
            </div>
          </div>

          {/* Columna Derecha: Fecha y Horario */}
          <div className="citas-module-form-section-compact flex flex-col">
            <h3>
              <FaCalendarAlt className="citas-module-form-icon" /> Fecha y Horario
            </h3>
            {/* Contenedor para calendario y horarios, con altura limitada y scroll */}
            <div className="citas-module-calendario-horarios-container-scroll">
              {/* Mini calendario */}
              <div className="citas-module-mini-calendario">
                <div className="citas-module-calendario-header">
                  <button type="button" className="citas-module-nav-button" onClick={() => navigateMonth(-1)}>
                    <FaChevronLeft />
                  </button>
                  <span className="citas-module-mes-año">
                    {currentDate.toLocaleDateString("es-ES", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button type="button" className="citas-module-nav-button" onClick={() => navigateMonth(1)}>
                    <FaChevronRight />
                  </button>
                </div>

                <div className="citas-module-calendario-grid">
                  <div className="citas-module-dias-semana">
                    {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((dia) => (
                      <div key={dia} className="citas-module-dia-semana">
                        {dia}
                      </div>
                    ))}
                  </div>

                  <div className="citas-module-dias-mes">
                    {getDaysInMonth(currentDate).map((date, index) => (
                      <div key={index} className="citas-module-dia-container">
                        {date && (
                          <button
                            type="button"
                            className={`citas-module-dia-button ${
                              selectedDate === formatDateForInput(date) ? "selected" : ""
                            } ${isDateDisabled(date) ? "disabled" : ""}`}
                            onClick={() => !isDateDisabled(date) && handleDateSelect(date)}
                            disabled={isDateDisabled(date)}
                          >
                            {date.getDate()}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Horarios disponibles */}
              <div className="citas-module-horarios-disponibles">
                <h4>Horarios Disponibles</h4>
                {selectedDate && selectedManicurista ? (
                  horariosDisponibles.length > 0 || horariosOcupados.length > 0 ? (
                    <div className="citas-module-horarios-grid-compact">
                      {(() => {
                        const visibleSlots = generarHorariosPosiblesDelDia().filter((hora) => {
                          const isAvailable = horariosDisponibles.includes(hora)
                          const isOverlapping = isSlotUnavailableDueToSelectedAppointment(hora)
                          return isAvailable && !isOverlapping
                        })
                        return visibleSlots.length > 0
                          ? visibleSlots.map((hora) => (
                              <button
                                key={hora}
                                type="button"
                                className={`citas-module-horario-option-compact ${
                                  formData.hora_cita === hora ? "selected" : ""
                                }`}
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    hora_cita: hora,
                                  }))
                                  if (formErrors.hora_cita) {
                                    setFormErrors((prev) => ({
                                      ...prev,
                                      hora_cita: "",
                                    }))
                                  }
                                }}
                                title="Disponible"
                              >
                                {hora}
                              </button>
                            ))
                          : (
                              <div className="citas-module-no-horarios-message-container" style={{ gridColumn: '1 / -1' }}>
                                <FaTimes className="citas-module-no-horarios-icon" />
                                <p className="citas-module-no-horarios-text-large">
                                  {getMotivoBloqueo(selectedManicurista.id, selectedDate)
                                    ? `Sin disponibilidad: ${getMotivoBloqueo(selectedManicurista.id, selectedDate)}`
                                    : 'No hay horarios disponibles para esta fecha y servicios seleccionados.'}
                                </p>
                              </div>
                            )
                      })()}
                    </div>
                  ) : (
                    <div className="citas-module-no-horarios-message-container">
                      <FaTimes className="citas-module-no-horarios-icon" />
                      <p className="citas-module-no-horarios-text-large">
                        {getMotivoBloqueo(selectedManicurista.id, selectedDate)
                          ? `Sin disponibilidad: ${getMotivoBloqueo(selectedManicurista.id, selectedDate)}`
                          : 'No hay horarios disponibles para esta fecha y servicios seleccionados.'}
                      </p>
                      <p>Intenta con otra fecha o ajusta los servicios.</p>
                    </div>
                  )
                ) : (
                  <div className="citas-module-no-horarios-message-container">
                    <FaCalendarAlt className="citas-module-no-horarios-icon" />
                    <p className="citas-module-no-horarios-text-large">
                      {!selectedDate
                        ? "Seleccione una fecha para ver horarios disponibles"
                        : "Seleccione una manicurista y fecha para ver horarios disponibles"}
                    </p>
                  </div>
                )}
                {formErrors.hora_cita && <div className="citas-module-error-text">{formErrors.hora_cita}</div>}
              </div>
            </div>
          </div>

          {/* Observaciones (ancho completo, debajo de las dos columnas) */}
          <div className="citas-module-form-section-compact citas-module-observaciones-section full-width-section">
            <h3>
              <FaStickyNote className="citas-module-form-icon" /> Observaciones
            </h3>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  observaciones: e.target.value,
                }))
              }
              placeholder="Observaciones adicionales..."
              className="citas-module-form-group-textarea"
              rows="3"
            />
          </div>

          {/* Resumen (ancho completo, debajo de observaciones) */}
          {formData.servicios.length > 0 && (
            <div className="citas-module-resumen-cita-compact full-width-section">
              <h4>Resumen</h4>
              <div className="citas-module-resumen-items">
                {formData.servicios.map((servicioId) => {
                  const servicio = servicios.find((s) => s.id.toString() === servicioId.toString())
                  return (
                    <div key={servicioId} className="citas-module-resumen-item">
                      <span>{servicio?.nombre}</span>
                      <span>{formatPrice(servicio?.precio || 0)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="citas-module-resumen-total">
                <span>Total:</span>
                <span>{formatPrice(calcularPrecioTotal())}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // VISTA DE DETALLE
  const renderDetailView = () => (
    <div className="citas-module">
      <div className="citas-module-admin-container">
        <div className="citas-module-form-header">
          <div className="citas-module-form-header-left">
            <button className="citas-module-admin-button secondary" onClick={() => setCurrentView("citas")}>
              <FaArrowLeft /> Volver
            </button>
          </div>
          <h1 className="citas-module-form-title">Detalle de Cita</h1>
          <div className="citas-module-form-header-right">
            {selectedCita && selectedCita.estado !== "finalizada" && selectedCita.estado !== "cancelada" && (
              <button
                className="citas-module-admin-button primary"
                onClick={() => handleIrCambiarEstado(selectedCita)}
              >
                Cambiar estado
              </button>
            )}
          </div>
        </div>

        <div className="citas-module-detail-view-grid">
          {/* Información del Cliente */}
          <div className="citas-module-detail-section">
            <h3>
              <FaUser className="citas-module-form-icon" /> Cliente
            </h3>
            <div className="citas-module-detail-info-grid">
              <div className="citas-module-detail-info-item">
                <span className="citas-module-detail-label">Nombre:</span>
                <span className="citas-module-detail-value">{selectedCita?.cliente_nombre}</span>
              </div>
              <div className="citas-module-detail-info-item">
                <span className="citas-module-detail-label">Documento:</span>
                <span className="citas-module-detail-value">{selectedCita?.cliente_documento}</span>
              </div>
              <div className="citas-module-detail-info-item">
                <span className="citas-module-detail-label">Teléfono:</span>
                <span className="citas-module-detail-value">{selectedCita?.cliente_telefono || "No registrado"}</span>
              </div>
              <div className="citas-module-detail-info-item">
                <span className="citas-module-detail-label">Estado:</span>
                <span
                  className="citas-module-status-badge"
                  style={{
                    backgroundColor: getEstadoColor(selectedCita?.estado),
                    color: getEstadoTextColor(selectedCita?.estado),
                  }}
                >
                  {getEstadoTexto(selectedCita?.estado)}
                </span>
              </div>
            </div>
          </div>
          {/* Información de la Cita */}
          <div className="citas-module-detail-section">
            <h3>
              <FaCalendarAlt className="citas-module-form-icon" /> Información de la Cita
            </h3>
            <div className="citas-module-detail-info-grid">
              <div className="citas-module-detail-info-item">
                <span className="citas-module-detail-label">Fecha:</span>
                <span className="citas-module-detail-value">{formatearFecha(selectedCita?.fecha_cita)}</span>
              </div>
              <div className="citas-module-detail-info-item">
                <span className="citas-module-detail-label">Hora:</span>
                <span className="citas-module-detail-value">{selectedCita?.hora_cita}</span>
              </div>
              <div className="citas-module-detail-info-item">
                <span className="citas-module-detail-label">Manicurista:</span>
                <span className="citas-module-detail-value">{selectedCita?.manicurista_nombre}</span>
              </div>
              <div className="citas-module-detail-info-item">
                <span className="citas-module-detail-label">Duración Total:</span>
                <span className="citas-module-detail-value">{selectedCita?.duracion_formateada || "N/A"}</span>
              </div>
            </div>
          </div>
          {/* Servicios */}
          <div
            className="citas-module-detail-section"
            style={{ gridColumn: "1 / -1" }} /* This makes it span both columns */
          >
            <h3>
              <FaServicestack className="citas-module-form-icon" /> Servicios
            </h3>
            <div className="citas-module-servicios-detalle-grid">
              {selectedCita?.servicios_info && selectedCita.servicios_info.length > 0 ? (
                selectedCita.servicios_info.map((servicio, index) => (
                  <div key={index} className="citas-module-servicio-detalle-card">
                    <div className="citas-module-servicio-detalle-nombre">
                      {servicio.nombre || "Servicio"}
                      {servicio.duracion && (
                        <span className="citas-module-servicio-detalle-duracion">({servicio.duracion} min)</span>
                      )}
                    </div>
                    <div className="citas-module-servicio-detalle-precio">{formatPrice(servicio.precio || 0)}</div>
                  </div>
                ))
              ) : (
                <div className="citas-module-servicio-detalle-card">
                  <div className="citas-module-servicio-detalle-nombre">
                    {selectedCita?.servicio_nombre || "Servicio no disponible"}
                  </div>
                  <div className="citas-module-servicio-detalle-precio">
                    {formatPrice(selectedCita?.precio_total || 0)}
                  </div>
                </div>
              )}
            </div>
            <div className="citas-module-total-detalle-section">
              <div className="citas-module-total-detalle-row">
                <span className="citas-module-total-detalle-label">Total:</span>
                <span className="citas-module-total-detalle-value">
                  {formatPrice(
                    selectedCita?.servicios_info?.reduce(
                      (total, servicio) => total + (Number(servicio.precio) || 0),
                      0,
                    ) ||
                      selectedCita?.precio_total ||
                      0,
                  )}
                </span>
              </div>
            </div>
          </div>
          {/* Observaciones */}
          {selectedCita?.observaciones && (
            <div
              className="citas-module-detail-section" /* Changed from novedades-observaciones-detalle to novedades-form-section for consistency */
              style={{ gridColumn: "1 / -1" }}
            >
              <h3>
                <FaStickyNote className="citas-module-form-icon" /> Observaciones
              </h3>
              <div className="citas-module-observaciones-detalle-content">
                <p>{selectedCita.observaciones}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // VISTA DE EDICIÓN
  const renderEditView = () => {
    if (!selectedCita) {
      setCurrentView("citas")
      showNotification("No se pudo cargar la cita para edición. Intente de nuevo.", "error")
      return null
    }

    return (
      <div className="citas-module">
        <div className="citas-module-admin-container">
          <div className="citas-module-form-header">
            <div className="citas-module-form-header-left">
              <button className="citas-module-admin-button secondary" onClick={() => setCurrentView("citas")}>
                <FaArrowLeft /> Volver
              </button>
            </div>
            <h1 className="citas-module-form-title">Editar Cita</h1>
            <div className="citas-module-form-header-right">
              <button className="citas-module-admin-button primary" onClick={handleUpdateCita} disabled={loading}>
                {loading ? (
                  <>
                    <div className="citas-module-spinner-small"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <FaSave /> Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="citas-module-detail-view-grid">
            {/* Información de la Cita */}
            <div className="citas-module-detail-section">
              <h3>
                <FaUser className="citas-module-form-icon" /> Información de la Cita
              </h3>
              <div className="citas-module-detail-info-grid">
                <div className="citas-module-detail-info-item">
                  <span className="citas-module-detail-label">Cliente:</span>
                  <span className="citas-module-detail-value">{selectedCita?.cliente_nombre}</span>
                </div>
                <div className="citas-module-detail-info-item">
                  <span className="citas-module-detail-label">Documento:</span>
                  <span className="citas-module-detail-value">{selectedCita?.cliente_documento}</span>
                </div>
                <div className="citas-module-detail-info-item">
                  <span className="citas-module-detail-label">Fecha:</span>
                  <span className="citas-module-detail-value">{formatearFecha(selectedCita?.fecha_cita)}</span>
                </div>
                <div className="citas-module-detail-info-item">
                  <span className="citas-module-detail-label">Hora:</span>
                  <span className="citas-module-detail-value">{selectedCita?.hora_cita}</span>
                </div>
                <div className="citas-module-detail-info-item">
                  <span className="citas-module-detail-label">Manicurista:</span>
                  <span className="citas-module-detail-value">{selectedCita?.manicurista_nombre}</span>
                </div>
                <div className="citas-module-detail-info-item">
                  <span className="citas-module-detail-label">Servicio:</span>
                  <span className="citas-module-detail-value">{selectedCita?.servicio_nombre}</span>
                </div>
              </div>
            </div>
            {/* Edición de Estado y Observaciones */}
            <div className="citas-module-detail-section">
              <h3>
                <FaEdit className="citas-module-form-icon" /> Editar Estado
              </h3>
              <div className="citas-module-form-group">
                <label className="citas-module-form-group-label">Estado de la Cita:</label>
                <select
                  value={editFormData.estado}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      estado: e.target.value,
                    }))
                  }
                  className="citas-module-form-group-input"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="finalizada">Finalizada</option>
                  <option value="cancelada">Cancelada</option>
                </select>

                {editFormData.estado === "finalizada" && (
                  <div className="citas-module-finalized-notice">
                    <FaCheck className="citas-module-notice-icon" />
                    <p>Al finalizar la cita, pasará automáticamente al módulo de ventas.</p>
                  </div>
                )}
              </div>

              <div className="citas-module-form-group">
                <label className="citas-module-form-group-label">Observaciones:</label>
                <textarea
                  value={editFormData.observaciones}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      observaciones: e.target.value,
                    }))
                  }
                  className="citas-module-form-group-textarea"
                  rows="4"
                  placeholder="Observaciones adicionales..."
                />
              </div>
              {/* Se elimina el botón de cancelar cita, ya que la funcionalidad está en el select de estado */}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // VISTA CAMBIAR ESTADO (manual: finalizada/cancelada)
  const renderChangeStatusView = () => {
    if (!selectedCita) {
      setCurrentView("citas")
      showNotification("No se pudo cargar la cita.", "error")
      return null
    }

    return (
      <div className="citas-module">
        <div className="citas-module-admin-container">
          <div className="citas-module-form-header">
            <div className="citas-module-form-header-left">
              <button className="citas-module-admin-button secondary" onClick={() => setCurrentView("detail")}>
                <FaArrowLeft /> Volver al detalle
              </button>
            </div>
            <h1 className="citas-module-form-title">Cambiar estado de la Cita #{selectedCita?.id}</h1>
            <div className="citas-module-form-header-right">
              <button className="citas-module-admin-button primary" onClick={handleUpdateCita} disabled={loading}>
                {loading ? (
                  <>
                    <div className="citas-module-spinner-small"></div>
                    Guardando...
                  </>
                ) : (
                  <>Guardar</>
                )}
              </button>
            </div>
          </div>

          <div className="citas-module-detail-view-grid">
            <div className="citas-module-detail-section">
              <h3>Estado actual</h3>
              <div className="citas-module-detail-info-grid">
                <div className="citas-module-detail-info-item">
                  <span className="citas-module-detail-label">Estado:</span>
                  <span
                    className="citas-module-status-badge"
                    style={{ backgroundColor: getEstadoColor(selectedCita?.estado) }}
                  >
                    {getEstadoTexto(selectedCita?.estado)}
                  </span>
                </div>
              </div>
            </div>

            <div className="citas-module-detail-section">
              <h3>Nuevo estado</h3>
              <div className="citas-module-form-group">
                <label className="citas-module-form-group-label">Seleccione el nuevo estado:</label>
                <select
                  value={editFormData.estado}
                  onChange={(e) => setEditFormData((p) => ({ ...p, estado: e.target.value }))}
                  className="citas-module-form-group-input"
                >
                  {/* Solo estados manuales, condicionales */}
                  {selectedCita.estado !== "finalizada" && <option value="finalizada">Finalizada</option>}
                  {selectedCita.estado !== "cancelada" && <option value="cancelada">Cancelada</option>}
                </select>
              </div>

              <div className="citas-module-form-group">
                <label className="citas-module-form-group-label">Observaciones:</label>
                <textarea
                  value={editFormData.observaciones}
                  onChange={(e) => setEditFormData((p) => ({ ...p, observaciones: e.target.value }))}
                  className="citas-module-form-group-textarea"
                  rows="4"
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // VISTA DE CITAS
  const renderCitasView = () => (
    <div className="citas-module">
      <div className="citas-module-admin-container">
        <Toaster />

        {/* Contenedor unificado para header, filtros y tabla */}
        <div className="citas-module-admin-content-wrapper">
          <div className="citas-module-admin-header">
            <h1 className="citas-module-admin-title">Citas de {selectedManicurista?.nombre}</h1>
            <button className="citas-module-admin-button secondary" onClick={() => setCurrentView("manicuristas")}>
              <FaArrowLeft /> Volver
            </button>
          </div>

          {/* Filtros y búsqueda */}
          <div className="citas-module-admin-filters">
            <div className="citas-module-search-container">
              <FaSearch className="citas-module-search-icon" />
              <input
                type="text"
                placeholder="Buscar citas..."
                value={citasSearchTerm}
                onChange={(e) => setCitasSearchTerm(e.target.value)}
                className="citas-module-search-input"
              />
            </div>

            <div className="citas-module-items-per-page">
              <span>Mostrar:</span>
              <select
                value={citasItemsPerPage}
                onChange={(e) => setCitasItemsPerPage(Number(e.target.value))}
                className="citas-module-items-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Tabla de citas */}
          {loading ? (
            <div className="citas-module-loading-container">
              <div className="citas-module-spinner"></div>
              <p>Cargando citas...</p>
            </div>
          ) : (
            <div className="citas-module-table-container">
              <table className="citas-module-admin-table">
                <thead>
                  <tr>
                    <th onClick={() => handleCitasSort("fecha_cita")}>
                      Fecha {renderCitasSortIndicator("fecha_cita")}
                    </th>
                    <th onClick={() => handleCitasSort("cliente_nombre")}>
                      Cliente {renderCitasSortIndicator("cliente_nombre")}
                    </th>
                    <th>Servicio</th>
                    <th onClick={() => handleCitasSort("estado")}>Estado {renderCitasSortIndicator("estado")}</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentPageCitas().length > 0 ? (
                    getCurrentPageCitas().map((cita) => (
                      <tr key={cita.id}>
                        <td>
                          <div className="citas-module-service-info">
                            <div className="citas-module-service-name">{formatearFecha(cita.fecha_cita)}</div>
                            <div className="citas-module-service-description">{cita.hora_cita || "N/A"}</div>
                          </div>
                        </td>
                        <td>
                          <div className="citas-module-service-info">
                            <div className="citas-module-service-name">
                              {cita.cliente_nombre || "Cliente Desconocido"}
                            </div>
                            <div className="citas-module-service-description">
                              {cita.cliente_documento || "Sin documento"}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="citas-module-service-info">
                            <div className="citas-module-service-name">{cita.servicio_nombre || "N/A"}</div>
                            <div className="citas-module-service-description">{cita.duracion_formateada || "N/A"}</div>
                          </div>
                        </td>
                        <td>
                          <span className={getStatusBadgeClass(cita.estado)}>{getEstadoTexto(cita.estado)}</span>
                        </td>
                        <td>
                          <div className="citas-module-action-buttons">
                            <PermissionButton
                              modulo="citas"
                              accion="ver_detalles"
                              className="citas-module-action-button view"
                              onClick={() => handleVerDetalle(cita)}
                              title="Ver detalles"
                              hidden={true}
                            >
                              <FaEye />
                            </PermissionButton>
                            {cita.estado !== "finalizada" && cita.estado !== "cancelada" && (
                              <PermissionButton
                                modulo="citas"
                                accion="editar"
                                className="citas-module-action-button edit"
                                onClick={() => handleEditCita(cita)}
                                title="Editar cita"
                                hidden={true}
                              >
                                <FaEdit />
                              </PermissionButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="citas-module-no-data">
                        No se encontraron citas para esta manicurista.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalCitasPages > 1 && (
          <div className="citas-module-pagination">
            <button
              className="citas-module-pagination-button"
              onClick={() => paginateCitas(1)}
              disabled={citasCurrentPage === 1}
            >
              &laquo;
            </button>
            <button
              className="citas-module-pagination-button"
              onClick={() => paginateCitas(citasCurrentPage - 1)}
              disabled={citasCurrentPage === 1}
            >
              &lt;
            </button>

            <div className="citas-module-pagination-info">
              Página {citasCurrentPage} de {totalCitasPages}
            </div>

            <button
              className="citas-module-pagination-button"
              onClick={() => paginateCitas(citasCurrentPage + 1)}
              disabled={citasCurrentPage === totalCitasPages}
            >
              &gt;
            </button>
            <button
              className="citas-module-pagination-button"
              onClick={() => paginateCitas(totalCitasPages)}
              disabled={citasCurrentPage === totalCitasPages}
            >
              &raquo;
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // VISTA DE DISPONIBILIDAD
  const renderDisponibilidadView = () => (
    <div className="citas-module">
      <div className="citas-module-admin-container">
        {/* Header */}
        <div className="citas-module-admin-content-wrapper">
          <div className="citas-module-admin-header">
            <h1 className="citas-module-admin-title">Disponibilidad de Manicuristas</h1>
            <div className="citas-module-admin-actions">
              <button 
                className="citas-module-admin-button secondary" 
                onClick={() => setCurrentView("manicuristas")}
              >
                <FaArrowLeft /> Volver
              </button>
            </div>
          </div>

          {/* Filtros de fecha */}
          <div className="citas-module-admin-filters disponibilidad">
            <div className="citas-module-filters-left">
              <div className="citas-module-date-filter">
                <label>Fecha:</label>
                <input
                  type="date"
                  value={disponibilidadDate}
                  min={getTodayInMedellin()} 
                  max={getDatePlusDaysYMD(90)}
                  onChange={(e) => {
                    const newDate = e.target.value
                    // Validaciones: no permitir pasado ni más de 90 días
                    const today = parseLocalDate(getTodayInMedellin())
                    const picked = parseLocalDate(newDate)
                    const max = parseLocalDate(getDatePlusDaysYMD(90))
                    if (picked < today) {
                      toast.error("No puede seleccionar una fecha pasada")
                      return
                    }
                    if (picked > max) {
                      toast.error("La fecha no puede ser mayor a 90 días desde hoy")
                      return
                    }
                    setDisponibilidadDate(newDate)
                    fetchDisponibilidad(newDate)
                  }}
                  className="citas-module-date-input"
                />
              </div>
            </div>

            <div className="citas-module-filters-right">
              <button
                className="citas-module-admin-button primary"
                onClick={async () => { await fetchCitas(); await fetchDisponibilidad(); }}
                disabled={disponibilidadLoading}
              >
                <FaClock /> {disponibilidadLoading ? "Cargando..." : "Actualizar"}
              </button>
            </div>
          </div>
        </div>
        {disponibilidadLoading ? (
            <div className="citas-module-loading-container">
              <div className="citas-module-spinner"></div>
              <p>Cargando disponibilidad...</p>
            </div>
          ) : (
            <div className="citas-module-disponibilidad-grid">
              {manicuristas
                .filter((m) => {
                  const fecha = disponibilidadDate || selectedDate
                  if (!fecha) return true
                  const fn = (typeof isManicuristaBloqueadaPorAusenciaCompleta === 'function') && isManicuristaBloqueadaPorAusenciaCompleta
                  return fn ? !fn(m.id, fecha) : true
                })
                .map((manicurista) => {
                const disponibilidad = disponibilidadData[manicurista.id] || {}
                const horariosDisponibles = disponibilidad.horarios_disponibles || []
                const horariosOcupados = disponibilidad.horarios_ocupados || []
                const tieneError = disponibilidad.error

                // Ocultar manicuristas sin disponibilidad (por novedades bloqueantes o backend)
                if ((horariosDisponibles || []).length === 0 && disponibilidad.error) {
                  return null
                }
                return (
                  <div key={manicurista.id} className="citas-module-disponibilidad-card">
                    <div className="citas-module-card-border"></div>
                    <div className="citas-module-disponibilidad-content">
                      <div className="citas-module-manicurista-avatar">
                        <FaUserMd />
                      </div>
                      <h3 className="citas-module-manicurista-nombre">
                        {manicurista.nombre || manicurista.nombres || manicurista.name || "Manicurista"}
                      </h3>
                      
                      {tieneError ? (
                        <div className="citas-module-error-message">
                          <FaExclamationTriangle />
                          <span>Error al cargar disponibilidad</span>
                        </div>
                      ) : (
                        <>
                          {/* Horarios disponibles - Mejorado */}
                          <div className="citas-module-horarios-section">
                            <h4 className="citas-module-horarios-title">
                              <FaClock /> Horarios Disponibles ({horariosDisponibles.length})
                            </h4>
                            <div className="citas-module-horarios-grid">
                              {horariosDisponibles.length > 0 ? (
                                [...horariosDisponibles]
                                  .sort((a, b) => convertTimeToMinutes(a) - convertTimeToMinutes(b))
                                  .map((hora, index) => (
                                  <div
                                    key={index}
                                    className="citas-module-horario-disponible-item"
                                    onClick={() => {
                                      setSelectedManicurista(manicurista)
                                      setCurrentView("create")
                                      setSelectedDate(disponibilidadDate)
                                      setFormData((prev) => ({ ...prev, fecha_cita: disponibilidadDate, hora_cita: hora }))
                                    }}
                                  >
                                    <span className="citas-module-horario-disponible">
                                      {formatHora(hora)}
                                    </span>
                                    <span className="citas-module-horario-duracion">
                                      {(disponibilidad?.horario_trabajo?.intervalo_minutos || 30)} min
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="citas-module-no-horarios">
                                  <FaTimes />
                                  <span>
                                    {getMotivoBloqueo(manicurista.id, disponibilidadDate)
                                      ? `Sin disponibilidad: ${getMotivoBloqueo(manicurista.id, disponibilidadDate)}`
                                      : 'No hay horarios disponibles para este día'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Horarios ocupados - Mejorado */}
                          {horariosOcupados.length > 0 && (
                            <div className="citas-module-horarios-section ocupados">
                              <h4 className="citas-module-horarios-title ocupados">
                                <FaTimes /> Horarios Ocupados ({horariosOcupados.length})
                              </h4>
                              <div className="citas-module-horarios-grid">
                                {[...horariosOcupados]
                                  .sort((a, b) => convertTimeToMinutes(a) - convertTimeToMinutes(b))
                                  .map((hora, index) => (
                                  <div key={index} className="citas-module-horario-ocupado-item">
                                    <span className="citas-module-horario-ocupado">
                                      {formatHora(hora)}
                                    </span>
                                    <span className="citas-module-horario-estado">
                                      Ocupado
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Resumen de disponibilidad - Mejorado */}
                          <div className="citas-module-resumen-section">
                            <div className="citas-module-resumen-item">
                              <span className="citas-module-resumen-label">Horarios disponibles:</span>
                              <span className="citas-module-resumen-value disponible">
                                {horariosDisponibles.length} cupos
                              </span>
                            </div>
                            <div className="citas-module-resumen-item">
                              <span className="citas-module-resumen-label">Horarios ocupados:</span>
                              <span className="citas-module-resumen-value ocupados">
                                {horariosOcupados.length} cupos
                              </span>
                            </div>
                            <div className="citas-module-resumen-item">
                              <span className="citas-module-resumen-label">Disponibilidad:</span>
                              <span className={`citas-module-resumen-value disponibilidad ${getDisponibilidadClass(horariosDisponibles.length, horariosOcupados.length)}`}>
                                {calcularPorcentajeDisponibilidad(horariosDisponibles.length, horariosOcupados.length)}%
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
      </div>
    </div>
  )

  return (
    <>
      <Toaster />
      {currentView === "manicuristas" && renderManicuristasView()}
      {currentView === "create" && renderFormView()}
      {currentView === "detail" && renderDetailView()}
      {currentView === "edit" && renderEditView()}
      {currentView === "citas" && renderCitasView()}
      {currentView === "disponibilidad" && renderDisponibilidadView()}

      {/* Modal de cancelación */}
      {showCancelModal && (
        <div className="citas-module-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="citas-module-modal-container confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="citas-module-modal-header">
              <h3>
                <FaExclamationTriangle className="citas-module-modal-icon warning" /> Cancelar Cita
              </h3>
              <button className="citas-module-modal-close" onClick={() => setShowCancelModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="citas-module-modal-body">
              <div className="citas-module-warning-section">
                <p>
                  <strong>¿Está seguro que desea cancelar esta cita?</strong>
                </p>
                <p>Esta acción no se puede deshacer.</p>

                <div className="citas-module-cita-info">
                  <p>
                    <strong>Cliente:</strong> {selectedCita?.cliente_nombre}
                  </p>
                  <p>
                    <strong>Fecha:</strong> {selectedCita?.fecha_cita} - {selectedCita?.hora_cita}
                  </p>
                  <p>
                    <strong>Manicurista:</strong> {selectedCita?.manicurista_nombre}
                  </p>
                </div>
              </div>

              <div className="citas-module-form-group">
                <label htmlFor="motivo-cancelar" className="citas-module-form-group-label">
                  Motivo de cancelación (requerido):
                </label>
                <textarea
                  id="motivo-cancelar"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="citas-module-form-group-textarea"
                  rows="3"
                  placeholder="Especifique el motivo por el cual se cancela esta cita..."
                  required
                />
              </div>
            </div>

            <div className="citas-module-modal-footer">
              <button className="citas-module-admin-button secondary" onClick={() => setShowCancelModal(false)}>
                Cancelar
              </button>
              <button
                className="citas-module-admin-button danger"
                onClick={handleConfirmCancel}
                disabled={loading || !cancelReason.trim()}
              >
                {loading ? (
                  <>
                    <div className="citas-module-spinner-small"></div>
                    Cancelando...
                  </>
                ) : (
                  <>
                    <FaBan /> Cancelar Cita
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


