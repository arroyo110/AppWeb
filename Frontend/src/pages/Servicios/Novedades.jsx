"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import {
  FaCalendarPlus,
  FaSearch,
  FaArrowLeft,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaEye,
  FaTrash,
  FaDownload,
} from "react-icons/fa"

// <CHANGE> Updated imports to use lib/services path
import { getManicuristas } from "../../service/manicuristasService.js"
import {
  getNovedades,
  createNovedad,
  anularNovedad,
  verificarDisponibilidadCitas,
  getNovedadById,
} from "../../service/NovedadesService.js"

import Swal from "sweetalert2"
import toast, { Toaster } from "react-hot-toast"
import dayjs from "dayjs"
import "dayjs/locale/es"
dayjs.locale("es")

import "../../styles/Admin.css"
import "../../styles/Novedades.css"

/* ----------------------------
   Constantes y utilidades
   ----------------------------*/
const HORARIO_BASE = {
  entrada: "10:00",
  salida: "20:00",
  entradaDisplay: "10:00 AM",
  salidaDisplay: "8:00 PM",
}

const ESTADO_COLORS = {
  tardanza: "#f59e0b",
  ausente: "#ef4444",
  anulada: "#6b7280",
  vacaciones: "#3b82f6",
  incapacidad: "#8b5cf6",
  horario: "#14b8a6",
}

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const formatHora = (hhmm) => {
  if (!hhmm) return "-"
  const [hStr, mStr] = String(hhmm).split(":")
  const h = Number(hStr)
  const m = mStr ?? "00"
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`
}

// Genera slots base (30 min) entre HORARIO_BASE.entrada y HORARIO_BASE.salida
const generateBaseSlots = (start = HORARIO_BASE.entrada, end = HORARIO_BASE.salida, stepMinutes = 30) => {
  const slots = []
  const cur = new Date(`2000-01-01T${start}:00`)
  const last = new Date(`2000-01-01T${end}:00`)
  while (cur <= last) {
    const hh = String(cur.getHours()).padStart(2, "0")
    const mm = String(cur.getMinutes()).padStart(2, "0")
    slots.push({ inicio: `${hh}:${mm}`, fin: null, disponible: true }) // fin puede llenarse si backend da fin
    cur.setMinutes(cur.getMinutes() + stepMinutes)
  }
  // calcular fin aproximado (siguiente slot) para cada slot
  for (let i = 0; i < slots.length; i++) {
    slots[i].fin = i + 1 < slots.length ? slots[i + 1].inicio : end
  }
  return slots
}
// Genera calendario laboral con descansos rotativos (domingo alternado + descanso compensatorio)
const generateWorkSchedule = (startDate = new Date(), weeks = 12) => {
  const schedule = {}
  let sundayWork = true // alterna domingos: el primero trabaja, el siguiente descansa

  const start = new Date(startDate)
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const current = new Date(start)
      current.setDate(start.getDate() + w * 7 + d)
      const iso = current.toISOString().split("T")[0]
      const dow = current.getDay() // 0=Dom, 1=Lun, ..., 6=Sáb

      let work = true
      let descanso = false

      if (dow === 0) {
        // Domingo: alternancia
        work = sundayWork
        descanso = !sundayWork
      }

      if (dow >= 1 && dow <= 3 && sundayWork) {
        // Si trabajó el domingo → descanso compensatorio en L/M/Mi
        // solo uno, distribuido en esos días
        if (!descanso && Math.random() < 0.33) {
          work = false
          descanso = true
        }
      }

      schedule[iso] = { work, descanso, dow }
    }
    sundayWork = !sundayWork // alterna domingo siguiente
  }
  return schedule
}

/* ----------------------------
   Componente principal - estado
   ----------------------------*/
export default function Novedades() {
  // Datos
  const [manicuristas, setManicuristas] = useState([])
  const [novedades, setNovedades] = useState([]) // lista completa
  const [novedadesPorManicurista, setNovedadesPorManicurista] = useState({}) // map id -> [novedades]

  // UI
  const [currentView, setCurrentView] = useState("manicuristas") // manicuristas, create, novedades, detail, calendario
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState(null)
  const [anularMotivo, setAnularMotivo] = useState("")
  const [workSchedule, setWorkSchedule] = useState({})

  // Selecciones
  const [selectedManicurista, setSelectedManicurista] = useState(null)
  const [selectedNovedad, setSelectedNovedad] = useState(null)
  const [manicuristaSearchTerm, setManicuristaSearchTerm] = useState("")
  const [showManicuristaDropdown, setShowManicuristaDropdown] = useState(false)
  const [showEstadoDropdown, setShowEstadoDropdown] = useState(false)
  const [estadoSearchTerm, setEstadoSearchTerm] = useState("")

  // Búsqueda / paginación / orden
  const [searchTerm, setSearchTerm] = useState("")
  const [novedadesSearchTerm, setNovedadesSearchTerm] = useState("")
  const [novedadesPage, setNovedadesPage] = useState(1)
  const [novedadesPerPage, setNovedadesPerPage] = useState(5)
  const [novedadesSort, setNovedadesSort] = useState({ key: "fecha", dir: "desc" })

  // --- Filtrado, orden y paginación ---
  const filteredNovedades = useMemo(() => {
    if (!Array.isArray(novedades)) return []
    const term = (novedadesSearchTerm || "").trim().toLowerCase()
    return novedades.filter((n) => {
      // filtrar por manicurista si hay uno seleccionado
      if (selectedManicurista && String(n.manicurista?.id) !== String(selectedManicurista.id)) return false

      if (!term) return true
      const hay = [n.observaciones, n.estado, n.id, n.manicurista?.nombre, n.manicurista?.nombres]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(term)
    })
  }, [novedades, novedadesSearchTerm, selectedManicurista])

  const sortedNovedades = useMemo(() => {
    return [...filteredNovedades].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  }, [filteredNovedades])

  const totalNovedadesPages = Math.max(1, Math.ceil(sortedNovedades.length / (novedadesPerPage || 1)))

  // Filtrar manicuristas para búsqueda
  const filteredManicuristas = useMemo(() => {
    if (!Array.isArray(manicuristas)) return []
    const term = (manicuristaSearchTerm || "").trim().toLowerCase()
    if (!term) return manicuristas
    return manicuristas.filter((m) => {
      const name = (m.nombre || m.nombres || "").toLowerCase()
      const lastName = (m.apellido || m.apellidos || "").toLowerCase()
      return name.includes(term) || lastName.includes(term) || `${name} ${lastName}`.includes(term)
    })
  }, [manicuristas, manicuristaSearchTerm])

  useEffect(() => {
    // si el filtro cambió y la página actual queda fuera de rango, volver a 1
    if (novedadesPage > totalNovedadesPages) setNovedadesPage(1)
  }, [totalNovedadesPages, novedadesPage])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showManicuristaDropdown && !event.target.closest('.searchable-select-container')) {
        setShowManicuristaDropdown(false)
      }
      if (showEstadoDropdown && !event.target.closest('#estado-select-container')) {
        setShowEstadoDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showManicuristaDropdown, showEstadoDropdown])

  const getCurrentPageNovedades = useMemo(() => {
    const start = (novedadesPage - 1) * novedadesPerPage
    return sortedNovedades.slice(start, start + novedadesPerPage)
  }, [sortedNovedades, novedadesPage, novedadesPerPage])

  // Handlers
  const handleClearFilters = () => {
    setNovedadesSearchTerm("")
    setSelectedManicurista(null)
    setNovedadesPage(1)
    if (typeof fetchData === "function") fetchData()
  }
  const handleChangeSearch = (value) => {
    setNovedadesSearchTerm(value)
    setNovedadesPage(1)
  }
  const handleGotoPage = (p) => setNovedadesPage(Math.max(1, Math.min(p, totalNovedadesPages)))

  // Formulario
  const [formData, setFormData] = useState({
    fecha: todayISO(),
    estado: "", // tardanza | ausente | vacaciones | incapacidad | horario
    tipo_ausencia: "", // completa | por_horas
    hora_entrada: "",
    hora_inicio_ausencia: "",
    hora_fin_ausencia: "",
    observaciones: "",
    dias: "", // para vacaciones
    turno: "", // para horario
    archivo_soporte: null, // File or {url,name,size}
  })
  const [formErrors, setFormErrors] = useState({})
  const [validationState, setValidationState] = useState({}) // { field: 'shake'|'valid'|'' }

  // Calendario
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarEvents, setCalendarEvents] = useState([]) // eventos mapeados desde novedades (y citas)
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]) // from backend for selected manicurista+fecha

  // Date selection helpers (single / multiple / week)
  const [dateSelectionMode, setDateSelectionMode] = useState("single") // single|multiple|week
  const [selectedDates, setSelectedDates] = useState([]) // ISO strings

  const estadoOptions = [
    { value: 'tardanza', label: 'Tardanza' },
    { value: 'ausente', label: 'Ausente' },
    { value: 'vacaciones', label: 'Vacaciones' },
    { value: 'incapacidad', label: 'Incapacidad' },
    { value: 'horario', label: 'Cambio de turno' },
  ]

  useEffect(() => {
    // Sincroniza el texto mostrado con el estado seleccionado
    const opt = estadoOptions.find(o => o.value === formData.estado)
    setEstadoSearchTerm(opt ? opt.label : "")
    // Restringir modos por tipo
    if (formData.estado === 'tardanza') {
      setDateSelectionMode('single')
      const today = todayISO()
      setFormData((f) => ({ ...f, fecha: today }))
    } else if (formData.estado === 'ausente') {
      // Solo día único o múltiples días
      setDateSelectionMode((m) => (m === 'single' || m === 'multiple' ? m : 'single'))
    } else if (formData.estado === 'vacaciones') {
      // Vacaciones: permitir múltiples días
      setDateSelectionMode((m) => (m === 'single' || m === 'multiple' ? m : 'multiple'))
    } else if (formData.estado === 'incapacidad') {
      // Solo día único o múltiples días
      setDateSelectionMode((m) => (m === 'single' || m === 'multiple' ? m : 'single'))
    } else if (formData.estado === 'horario') {
      setDateSelectionMode('single')
    }
  }, [formData.estado])

  /* ----------------------------
     fetchData: carga manicuristas + novedades
     - mapea novedadesPorManicurista
     ----------------------------*/
  const fetchData = useCallback(async () => {
    setLoading(true)
    setGlobalError(null)
    try {
      const [manisResp, novsResp] = await Promise.all([
        getManicuristas("activo"),
        getNovedades(), // asume endpoint que devuelve array de novedades y dentro incluye citas si aplican
      ])

      const manis = manisResp || []
      const novs = novsResp || []

      setManicuristas(manis)
      setNovedades(novs)

      // mapear por manicurista
      const map = {}
      novs.forEach((n) => {
        const id = n.manicurista?.id ?? n.manicurista
        if (!map[id]) map[id] = []
        map[id].push(n)
      })
      setNovedadesPorManicurista(map)
    } catch (err) {
      console.error("fetchData error:", err)
      setGlobalError("No se pudo cargar datos de novedades/manicuristas")
      toast.error("Error cargando novedades. Revisa la consola.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const schedule = generateWorkSchedule(new Date(), 12)
    setWorkSchedule(schedule)
  }, [fetchData])

  /* ----------------------------
     Cargar disponibilidad de horarios (slots) desde backend
     - se dispara cuando cambia manicurista o fecha en formData
     - fallback a base slots si falla o no hay datos
     - Para tipo "horario", las manicuristas siempre están disponibles
     ----------------------------*/
  useEffect(() => {
    let mounted = true
    const loadSlots = async () => {
      if (!selectedManicurista || !formData.fecha) {
        setAvailableTimeSlots([])
        return
      }

      if (formData.estado === "horario") {
        if (mounted) {
          const baseSlots = generateBaseSlots()
          const availableSlots = baseSlots.map((s) => ({ ...s, disponible: true }))
          setAvailableTimeSlots(availableSlots)
        }
        return
      }

      try {
        const resp = await verificarDisponibilidadCitas(selectedManicurista.id, formData.fecha)
        // resp.slots_disponibilidad = [{ inicio, fin, disponible, motivo_ocupado? }]
        if (mounted) {
          setAvailableTimeSlots(
            Array.isArray(resp?.slots_disponibilidad) && resp.slots_disponibilidad.length > 0
              ? resp.slots_disponibilidad.map((s) => ({ ...s })) // copiar
              : generateBaseSlots(),
          )
        }
      } catch (err) {
        console.warn("verificarDisponibilidadCitas error:", err)
        if (mounted) setAvailableTimeSlots(generateBaseSlots())
      }
    }
    loadSlots()
    return () => {
      mounted = false
    }
  }, [selectedManicurista, formData.fecha, formData.estado]) // Agregado formData.estado como dependencia

  /* ----------------------------
     Generar opciones que usa el UI (display + value)
     - utiliza availableTimeSlots si vienen del backend
     ----------------------------*/
  const timeOptions = useMemo(() => {
    if (!availableTimeSlots || availableTimeSlots.length === 0)
      return generateBaseSlots().map((s) => ({ value: s.inicio, display: formatHora(s.inicio), disponible: true }))
    return availableTimeSlots.map((s) => ({
      value: s.inicio,
      display: formatHora(s.inicio),
      disponible: !!s.disponible,
      motivo: s.motivo_ocupado || null,
    }))
  }, [availableTimeSlots])

  // Bloquear selección de slots no disponibles al enviar o elegir
  const ensureSlotDisponible = (value) => {
    const slot = timeOptions.find((s) => s.value === value)
    return !slot || slot.disponible
  }

  /* ----------------------------
     Mapeo novedades -> calendarEvents
     - vacaciones => multi-day event (start..end)
     - other states => single-day event (allDay)
     - citas dentro de novedad: si novedad.citas existe, mapear como eventos con hora
     ----------------------------*/
  useEffect(() => {
    const events = []
    ;(novedades || []).forEach((n) => {
      if (!n || !n.fecha) return
      // Título breve: nombre manicurista + estado
      const titleBase = `${n.manicurista?.nombres ?? n.manicurista?.nombre ?? "Manicurista"} • ${(n.estado || "NOVEDAD").toUpperCase()}`

      if (n.estado === "vacaciones" && n.dias && Number(n.dias) > 0) {
        const start = new Date(n.fecha)
        const end = new Date(n.fecha)
        end.setDate(end.getDate() + Number(n.dias) - 1)
        events.push({
          id: `n-${n.id}`,
          type: "novedad",
          title: titleBase,
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
          allDay: true,
          color: ESTADO_COLORS.vacaciones,
          meta: n,
        })
      } else {
        // single day
        events.push({
          id: `n-${n.id}`,
          type: "novedad",
          title: titleBase,
          start: n.fecha,
          end: n.fecha,
          allDay: true,
          color: ESTADO_COLORS[n.estado] || ESTADO_COLORS.normal,
          meta: n,
        })
      }

      // Si backend nos trae citas relacionadas dentro de la novedad, mapearlas (opcional)
      if (Array.isArray(n.citas) && n.citas.length > 0) {
        n.citas.forEach((c) => {
          // c: { id, fecha_cita, hora_inicio, hora_fin, cliente, servicio }
          const ev = {
            id: `c-${c.id}`,
            type: "cita",
            title: `Cita • ${c.cliente?.nombre || c.servicio || "Cliente"}`,
            start: `${c.fecha_cita}T${c.hora_inicio}`,
            end: `${c.fecha_cita}T${c.hora_fin}`,
            allDay: false,
            color: "#7c3aed",
            meta: { cita: c, parentNovedadId: n.id },
          }
          events.push(ev)
        })
      }
    })
    setCalendarEvents(events)
  }, [novedades])

  /* ----------------------------
     EventsByDate helper: indexa events por fecha para mostrar en grid
     - devuelve map: 'YYYY-MM-DD' => [events]
     - si event is range (has end != start) marca todos los días del rango
     ----------------------------*/
  const eventsByDate = useMemo(() => {
    const map = {}
    calendarEvents.forEach((ev) => {
      try {
        if (ev.allDay && ev.start && ev.end) {
          const s = new Date(ev.start)
          const e = new Date(ev.end)
          for (let dt = new Date(s); dt <= e; dt.setDate(dt.getDate() + 1)) {
            const key = dt.toISOString().split("T")[0]
            map[key] = map[key] || []
            map[key].push(ev)
          }
        } else if (ev.start) {
          // single day or timed event
          const key = ev.start.split("T")[0]
          map[key] = map[key] || []
          map[key].push(ev)
        }
      } catch (err) {
        console.warn("eventsByDate mapping error:", err, ev)
      }
    })
    return map
  }, [calendarEvents])

  /* ----------------------------
     Validación por campo (tiempo real)
     - validateField(name, value)
     - setValidationState for animations (shake / valid)
     ----------------------------*/
  const validateField = useCallback(
    (name, value) => {
      const errs = { ...formErrors }
      let invalid = false

      // Validación de manicurista
      if (name === "manicurista") {
        if (!value) {
          errs.manicurista = "Debes seleccionar una manicurista."
          invalid = true
        } else {
          delete errs.manicurista
        }
      }

      // Validación de estado
      if (name === "estado") {
        if (!value) {
          errs.estado = "Selecciona un tipo de novedad."
          invalid = true
        } else {
          delete errs.estado
        }
      }

      // Validación de fecha
      if (name === "fecha") {
        if (!value) {
          errs.fecha = "Selecciona una fecha válida."
          invalid = true
        } else {
          const fechaSel = new Date(value)
          const hoy = new Date()
          const limite = new Date(hoy)
          limite.setFullYear(hoy.getFullYear() + 1)
          
          // No permitir fechas pasadas para ciertos tipos
          if (formData.estado === "ausente" && fechaSel < hoy) {
            errs.fecha = "Las ausencias no pueden ser en fechas pasadas."
            invalid = true
          } else if (fechaSel > limite) {
            errs.fecha = "La fecha no puede ser mayor a 1 año desde hoy."
            invalid = true
          } else {
            delete errs.fecha
          }
        }
      }

      // Validación de hora de entrada (tardanza)
      if (name === "hora_entrada") {
        if (formData.estado === "tardanza") {
          if (!value) {
            errs.hora_entrada = "Selecciona la hora de entrada."
            invalid = true
          } else {
            // Verificar que la hora no sea muy temprana o muy tarde
            const [hora, minuto] = value.split(':').map(Number)
            const horaDecimal = hora + minuto / 60
            
            if (horaDecimal < 6 || horaDecimal > 23) {
              errs.hora_entrada = "La hora debe estar entre 6:00 AM y 11:00 PM."
              invalid = true
            } else {
              // bloquear slots no disponibles
              const slotOk = ensureSlotDisponible(value)
              if (!slotOk) {
                const slot = timeOptions.find(s=>s.value===value)
                errs.hora_entrada = `Hora ocupada: ${slot?.motivo || 'ocupado'}`
                invalid = true
              } else {
                delete errs.hora_entrada
              }
            }
          }
        } else {
          delete errs.hora_entrada
        }
      }

      // Validación de tipo de ausencia
      if (name === "tipo_ausencia") {
        if (formData.estado === "ausente") {
          if (!value) {
            errs.tipo_ausencia = "Selecciona el tipo de ausencia."
            invalid = true
          } else {
            delete errs.tipo_ausencia
          }
        } else {
          delete errs.tipo_ausencia
        }
      }

      // Validación de horas de ausencia
      if (name === "hora_inicio_ausencia") {
        if (formData.estado === "ausente" && formData.tipo_ausencia === "por_horas") {
          if (!value) {
            errs.hora_inicio_ausencia = "Selecciona la hora de inicio."
            invalid = true
          } else {
            // Si es hoy, inicio > ahora
            if (formData.fecha === todayISO()) {
              const now = new Date()
              const start = new Date(`2000-01-01T${value}:00`)
              const nowHM = now.getHours() * 60 + now.getMinutes()
              const startHM = start.getHours() * 60 + start.getMinutes()
              if (startHM <= nowHM) {
                errs.hora_inicio_ausencia = "Para hoy, el inicio debe ser posterior a la hora actual."
                invalid = true
              } else {
                delete errs.hora_inicio_ausencia
              }
            } else {
              delete errs.hora_inicio_ausencia
            }
          }
        } else {
          delete errs.hora_inicio_ausencia
        }
      }

      if (name === "hora_fin_ausencia") {
        if (formData.estado === "ausente" && formData.tipo_ausencia === "por_horas") {
          if (!value) {
            errs.hora_fin_ausencia = "Selecciona la hora de fin."
            invalid = true
          } else if (formData.hora_inicio_ausencia && value <= formData.hora_inicio_ausencia) {
            errs.hora_fin_ausencia = "La hora de fin debe ser posterior a la hora de inicio."
            invalid = true
          } else {
            delete errs.hora_fin_ausencia
          }
        } else {
          delete errs.hora_fin_ausencia
        }
      }

      // Validación de días de vacaciones
      if (name === "dias") {
        if (formData.estado === "vacaciones") {
          const v = Number(value)
          if (!v || v < 7) {
            errs.dias = "Las vacaciones deben ser mínimo 7 días."
            invalid = true
          } else if (v % 7 !== 0) {
            errs.dias = "Los días deben ser múltiplos de 7 (semanas completas)."
            invalid = true
          } else if (v > 30) {
            errs.dias = "Las vacaciones no pueden exceder 30 días."
            invalid = true
          } else {
            delete errs.dias
          }
        } else {
          delete errs.dias
        }
      }

      // Validación de turno
      if (name === "turno") {
        if (formData.estado === "horario") {
          if (!value) {
            errs.turno = "Selecciona un turno."
            invalid = true
          } else {
            delete errs.turno
          }
        } else {
          delete errs.turno
        }
      }

      // Validación de archivo de soporte
      if (name === "archivo_soporte") {
        if (formData.estado === "incapacidad") {
          if (!value) {
            errs.archivo_soporte = "Debes adjuntar un archivo de soporte para incapacidades."
            invalid = true
          } else if (value.size > 5 * 1024 * 1024) { // 5MB
            errs.archivo_soporte = "El archivo no puede exceder 5MB."
            invalid = true
          } else {
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
            if (!allowedTypes.includes(value.type)) {
              errs.archivo_soporte = "Solo se permiten archivos PDF, JPG, JPEG o PNG."
              invalid = true
            } else {
              delete errs.archivo_soporte
            }
          }
        } else {
          delete errs.archivo_soporte
        }
      }

      // Validación de observaciones
      if (name === "observaciones") {
        if (value && value.length > 400) {
          errs.observaciones = "Las observaciones no pueden exceder 400 caracteres."
          invalid = true
        } else {
          delete errs.observaciones
        }
      }

      // Validación de fechas seleccionadas
      if (name === "selectedDates") {
        if (dateSelectionMode === "multiple" && (!value || value.length === 0)) {
          errs.selectedDates = "Debes seleccionar al menos una fecha."
          invalid = true
        } else if (dateSelectionMode === "week" && (!value || value.length === 0)) {
          errs.selectedDates = "Debes seleccionar una semana completa."
          invalid = true
        } else {
          delete errs.selectedDates
        }
      }

      // aplicar cambios
      setFormErrors(errs)
      
      // Solo mostrar animación si hay error
      if (invalid) {
        setValidationState((s) => ({ ...s, [name]: "shake" }))
        // limpiar el estado de validación después de la animación
        setTimeout(() => setValidationState((s) => ({ ...s, [name]: "" })), 600)
      } else {
        setValidationState((s) => ({ ...s, [name]: "valid" }))
        // limpiar el estado de validación después de un momento
        setTimeout(() => setValidationState((s) => ({ ...s, [name]: "" })), 1000)
      }
      
      return !invalid
    },
    [formData, formErrors, dateSelectionMode],
  )

  /* ----------------------------
     validateForm completo - usado antes de submit
     - devuelve boolean
     ----------------------------*/
  const validateForm = useCallback(
    (overrides = {}) => {
      const data = { ...formData, ...overrides }
      const errs = {}

      // Validación de manicurista
      if (!selectedManicurista) {
        errs.manicurista = "Debes seleccionar una manicurista."
      }

      // Validación de estado
      if (!data.estado) {
        errs.estado = "Selecciona un tipo de novedad."
      }

      // Validación de fecha
      if (!data.fecha) {
        errs.fecha = "Selecciona una fecha."
      } else {
        const fechaSel = new Date(data.fecha)
        const hoy = new Date(todayISO())
        const limite = new Date(hoy)
        limite.setFullYear(hoy.getFullYear() + 1)
        
        // No permitir fechas pasadas para ausencias
        if (data.estado === "ausente" && fechaSel < hoy) {
          errs.fecha = "Las ausencias no pueden ser en fechas pasadas."
        } else if (fechaSel > limite) {
          errs.fecha = "La fecha no puede ser mayor a 1 año desde hoy."
        }
      }

      // Validación de fechas seleccionadas para modos múltiples
      if (dateSelectionMode === "multiple" && selectedDates.length === 0) {
        errs.selectedDates = "Debes seleccionar al menos una fecha."
      } else if (dateSelectionMode === "week" && selectedDates.length === 0) {
        errs.selectedDates = "Debes seleccionar una semana completa."
      }

      // Validaciones específicas por tipo de novedad
      if (data.estado === "tardanza") {
        if (!data.hora_entrada) {
          errs.hora_entrada = "Selecciona la hora de llegada."
        } else {
          // Verificar disponibilidad del slot
          const slot = availableTimeSlots.find((s) => s.inicio === data.hora_entrada)
          if (slot && !slot.disponible) {
            errs.hora_entrada = `Hora ocupada: ${slot.motivo_ocupado || "ocupado"}`
          }
          
          // Verificar rango de horas válido
          const [hora, minuto] = data.hora_entrada.split(':').map(Number)
          const horaDecimal = hora + minuto / 60
          if (horaDecimal < 6 || horaDecimal > 23) {
            errs.hora_entrada = "La hora debe estar entre 6:00 AM y 11:00 PM."
          }
        }
      }

      if (data.estado === "ausente") {
        if (!data.tipo_ausencia) {
          errs.tipo_ausencia = "Selecciona el tipo de ausencia."
        }
        
        if (data.tipo_ausencia === "por_horas") {
          if (!data.hora_inicio_ausencia) {
            errs.hora_inicio_ausencia = "Hora de inicio requerida."
          }
          if (!data.hora_fin_ausencia) {
            errs.hora_fin_ausencia = "Hora de fin requerida."
          }
          
          if (data.hora_inicio_ausencia && data.hora_fin_ausencia) {
            const st = new Date(`2000-01-01T${data.hora_inicio_ausencia}:00`)
            const en = new Date(`2000-01-01T${data.hora_fin_ausencia}:00`)
            if (st >= en) {
              errs.hora_fin_ausencia = "La hora de fin debe ser posterior a la hora de inicio."
            }
          }
        }
      }

      if (data.estado === "vacaciones") {
        const v = Number(data.dias)
        if (!v || v < 7) {
          errs.dias = "Las vacaciones deben ser mínimo 7 días."
        } else if (v % 7 !== 0) {
          errs.dias = "Las vacaciones deben ser en semanas completas (múltiplos de 7)."
        } else if (v > 30) {
          errs.dias = "Las vacaciones no pueden exceder 30 días."
        }
      }

      if (data.estado === "horario") {
        if (!data.turno) {
          errs.turno = "Selecciona un turno."
        }
      }

      if (data.estado === "incapacidad") {
        if (!data.archivo_soporte) {
          errs.archivo_soporte = "Debes adjuntar un archivo de soporte para incapacidades."
        } else if (data.archivo_soporte.size > 5 * 1024 * 1024) {
          errs.archivo_soporte = "El archivo no puede exceder 5MB."
        } else {
          const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
          if (!allowedTypes.includes(data.archivo_soporte.type)) {
            errs.archivo_soporte = "Solo se permiten archivos PDF, JPG, JPEG o PNG."
          }
        }
      }

      // Validación de observaciones
      if (data.observaciones && data.observaciones.length > 400) {
        errs.observaciones = "Las observaciones no pueden exceder 400 caracteres."
      }

      // Validación de conflictos de horarios
      if (data.estado === "tardanza" && data.hora_entrada) {
        // Verificar si ya existe una novedad para la misma manicurista, fecha y hora
        const conflicto = novedades.find(n => 
          n.manicurista?.id === selectedManicurista?.id &&
          n.fecha === data.fecha &&
          n.estado === "tardanza" &&
          n.hora_entrada === data.hora_entrada &&
          n.estado !== "anulada"
        )
        
        if (conflicto) {
          errs.hora_entrada = "Ya existe una novedad de tardanza para esta hora."
        }
      }

      // Validación de vacaciones superpuestas
      if (data.estado === "vacaciones" && data.dias) {
        const fechaInicio = new Date(data.fecha)
        const fechaFin = new Date(fechaInicio)
        fechaFin.setDate(fechaFin.getDate() + Number(data.dias) - 1)
        
        const conflicto = novedades.find(n => 
          n.manicurista?.id === selectedManicurista?.id &&
          n.estado === "vacaciones" &&
          n.estado !== "anulada" &&
          ((new Date(n.fecha) <= fechaFin && new Date(n.fecha) >= fechaInicio) ||
           (new Date(n.fecha) <= fechaInicio && new Date(n.fecha).setDate(new Date(n.fecha).getDate() + Number(n.dias) - 1) >= fechaInicio))
        )
        
        if (conflicto) {
          errs.dias = "Las vacaciones se superponen con un período ya registrado."
        }
      }

      setFormErrors(errs)
      return Object.keys(errs).length === 0
    },
    [formData, selectedManicurista, selectedDates, dateSelectionMode, availableTimeSlots, novedades],
  )

  /* ----------------------------
     Helpers calendario: generar grid days for currentMonth
     ----------------------------*/
  const getDaysGridForMonth = useCallback((date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const first = new Date(year, month, 1)
    const startWeekday = first.getDay() // 0..6 (Sun..Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < startWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    return cells
  }, [])

  /* ----------------------------
     (Parte 1 finalizada)
     - A partir de aquí en la Parte 2 incluyo:
       • Render del calendario mensual con eventos visuales (tipo Google)
       • Selección de días/semana bonita
       • Formulario completo con validaciones en tiempo real y animaciones
       • Logic submit (createNovedad) con FormData, manejo de archivos y refresco
  ----------------------------*/

  // exporto utilidades internas (opcionales) o paso al render
  /* ----------------------------
   PARTE 2 — Render completo + handlers
   Reemplaza el `return { ... }` final de la Parte 1 por todo lo que sigue.
   ----------------------------*/

  // ----------------------
  // Handlers UI y utilidades
  // ----------------------
  const goToPrevMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const goToNextMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  const getDaysGrid = () => getDaysGridForMonth(currentMonth)

  const handleDayClick = (dateObj) => {
    if (!dateObj) return
    const iso = dateObj.toISOString().split("T")[0]

    const dayOfWeek = dateObj.getDay()
    const isRestDay = workSchedule[iso]?.descanso
    const today = new Date(todayISO())
    const isPast = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate())

    // No permitir seleccionar días de descanso ni pasados
    if (isRestDay || isPast) {
      return
    }

    if (dateSelectionMode === "single") {
      setFormData((f) => ({ ...f, fecha: iso }))
      setSelectedDates([iso])
    } else if (dateSelectionMode === "multiple") {
      setSelectedDates((prevDates) => {
        const isSelected = prevDates.includes(iso)
        if (isSelected) {
          return prevDates.filter((x) => x !== iso)
        } else {
          return [...prevDates, iso]
        }
      })
    } else if (dateSelectionMode === "week") {
      const d = new Date(iso)
      const dow = d.getDay() // 0 Sun .. 6 Sat
      const monday = new Date(d)
      const offset = (dow + 6) % 7 // days since Monday
      monday.setDate(d.getDate() - offset)

      const weekDates = []
      for (let i = 0; i < 6; i++) {
        // Changed from 7 to 6
        const dt = new Date(monday)
        dt.setDate(monday.getDate() + i)
        const dateIso = dt.toISOString().split("T")[0]

        if (!workSchedule[dateIso]?.descanso) {
          weekDates.push(dateIso)
        }
      }

      setSelectedDates(weekDates)
      setFormData((f) => ({ ...f, fecha: weekDates[0] }))
    }
  }

  const handleTempAdd = (iso) => {
    if (!iso) return
    if (!selectedDates.includes(iso)) setSelectedDates((s) => [...s, iso])
  }

  const handleInputChange = (e) => {
    const { name, value, files } = e.target
    const val = files ? files[0] : value
    setFormData((f) => ({ ...f, [name]: val }))
    
    // Limpiar error del campo al cambiar
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
    
    // validación en tiempo real con delay para evitar validaciones excesivas
    setTimeout(() => {
      validateField(name, val)
    }, 300)
  }

  const handleSelectManicurista = (manicurista) => {
    setSelectedManicurista(manicurista)
    setManicuristaSearchTerm(manicurista.nombre || manicurista.nombres || "")
    setShowManicuristaDropdown(false)
    // limpiar slots
    setAvailableTimeSlots([])
    // validar selección de manicurista
    validateField("manicurista", manicurista.id)
  }

  const handleManicuristaSearchChange = (e) => {
    const value = e.target.value
    setManicuristaSearchTerm(value)
    setShowManicuristaDropdown(true)
    
    // Si se borra el texto, limpiar selección
    if (!value.trim()) {
      setSelectedManicurista(null)
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.manicurista
        return newErrors
      })
    }
  }

  const handleEventClick = (ev) => {
    // ev.meta contiene novedad o cita
    if (!ev) return
    const meta = ev.meta
    if (meta && meta.id) {
      // obtener novedad completa del backend si quieres datos frescos
      ;(async () => {
        try {
          setLoading(true)
          const detail = await getNovedadById(meta.id)
          setSelectedNovedad(detail)
          setCurrentView("detail")
        } catch (err) {
          console.error("Error fetching detail:", err)
          toast.error("No se pudo cargar detalle", "error")
        } finally {
          setLoading(false)
        }
      })()
    } else if (ev.meta?.cita) {
      // si es cita, mostrar detalle de cita (puedes integrar tu modal de citas)
      setSelectedNovedad({ ...ev.meta, isCita: true })
      setCurrentView("detail")
    }
  }

  // abrir soporte (archivo)
  const openSoporte = (archivo) => {
    if (!archivo) return
    const url = archivo.url || archivo
    window.open(url, "_blank", "noopener")
  }

  // ----------------------
  // Submit crear novedad
  // ----------------------
  const handleCreateSubmit = async (evt) => {
    evt.preventDefault()

    // si hay fechas seleccionadas (modo multi o week) usamos selectedDates, sino formData.fecha
    const fechas = selectedDates.length ? selectedDates : [formData.fecha]

    // Validaciones básicas antes de enviar
    if (!validateForm()) {
      // Mostrar errores específicos
      const errorMessages = Object.values(formErrors).filter(Boolean)
      const errorText = errorMessages.length > 0 
        ? `Errores encontrados:\n• ${errorMessages.join('\n• ')}`
        : "Corrige los errores antes de enviar"
      
      Swal.fire({
        icon: "error",
        title: "Formulario incompleto",
        text: errorText,
        confirmButtonColor: "#e83e8c",
        width: 500,
      })
      
      // Scroll al primer campo con error
      const firstErrorField = document.querySelector('.form-group input.error, .form-group select.error, .form-group textarea.error')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
        firstErrorField.focus()
      }
      
      return
    }

    try {
      setLoading(true)

      for (const fecha of fechas) {
        const fd = new FormData()
        fd.append("fecha", fecha) // ✅ obligatorio
        fd.append("estado", formData.estado) // ✅ obligatorio

        if (selectedManicurista?.id) {
          fd.append("manicurista", selectedManicurista.id) // ✅ obligatorio
        } else {
          throw new Error("Debes seleccionar un manicurista")
        }

        if (formData.tipo_ausencia) fd.append("tipo_ausencia", formData.tipo_ausencia)
        if (formData.hora_entrada) fd.append("hora_entrada", formData.hora_entrada)
        if (formData.hora_inicio_ausencia) fd.append("hora_inicio_ausencia", formData.hora_inicio_ausencia)
        if (formData.hora_fin_ausencia) fd.append("hora_fin_ausencia", formData.hora_fin_ausencia)
        if (formData.observaciones) fd.append("observaciones", formData.observaciones)
        if (formData.dias) fd.append("dias", formData.dias)
        if (formData.turno) fd.append("turno", formData.turno)
        if (formData.archivo_soporte) fd.append("archivo_soporte", formData.archivo_soporte)
        console.log("DEBUG FormData:")
        for (const [k, v] of fd.entries()) {
          console.log(" ->", k, v)
        }

        // POST al backend
        const resp = await createNovedad(fd)
        // Si el backend retorna warning 200 con message, mostrar alerta del sistema y abortar flujo de éxito
        if (resp && (resp.warning || resp.warning === true)) {
          const isVacaciones = (formData.estado || "").toLowerCase() === "vacaciones"
          Swal.fire({
            icon: "warning",
            title: "Aviso",
            text: isVacaciones
              ? "No es posible crear la novedad tipo vacaciones porque no cumples los 6 meses de antigüedad."
              : (resp.message || "No se pudo crear la novedad"),
            confirmButtonText: "Entendido",
          })
          // Saltar el success y no limpiar ni recargar, para que el usuario corrija
          return
        }
      }

      Swal.fire({
        icon: "success",
        title: "Novedad creada",
        text: fechas.length > 1 ? "Se crearon varias novedades correctamente." : "Se creó la novedad correctamente.",
        showConfirmButton: false,
        timer: 2000,
      })

      // recargar novedades
      await fetchData()

      // limpiar formulario completamente
      setFormData({
        fecha: todayISO(),
        estado: "",
        tipo_ausencia: "",
        hora_entrada: "",
        hora_inicio_ausencia: "",
        hora_fin_ausencia: "",
        observaciones: "",
        dias: "",
        turno: "",
        archivo_soporte: null,
      })
       setSelectedDates([])
       setSelectedManicurista(null)
       setManicuristaSearchTerm("")
       setShowManicuristaDropdown(false)
       setFormErrors({})
       setValidationState({})
       setDateSelectionMode("single")
       setCurrentView("manicuristas")
    } catch (err) {
      console.error("❌ create error", err)

      // Si el backend devolvió 400 por reglas de negocio (p.ej., vacaciones sin antigüedad suficiente),
      // mostramos alerta de aviso y NO llenamos el banner rojo de errores del sistema.
      const status = err?.response?.status
      const isVacaciones = (formData.estado || "").toLowerCase() === "vacaciones"
      if (status === 400 && isVacaciones) {
        Swal.fire({
          icon: "warning",
          title: "Aviso",
          text: "No es posible crear la novedad tipo vacaciones porque no cumples los 6 meses de antigüedad.",
          confirmButtonColor: "#e83e8c",
        })
        return
      }

      // Otros errores: mostrar como error y registrar detalle
      Swal.fire({
        icon: "error",
        title: "Error al crear la novedad",
        text: err?.response?.data?.detail || err.message,
        confirmButtonColor: "#e83e8c",
      })

      if (err?.response?.data) {
        const data = err.response.data
        setFormErrors((prev) => ({ ...prev, server: JSON.stringify(data) }))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAnularSubmit = async () => {
    if (!anularMotivo.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Motivo requerido",
        text: "Debes ingresar un motivo de anulación.",
        confirmButtonColor: "#e83e8c",
      })
      return
    }

    // 🔹 Confirmación antes de anular
    const result = await Swal.fire({
      title: "¿Estás seguro?",
      text: "Esta acción anulará la novedad seleccionada y no se podrá revertir.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, anular",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d9534f",
      cancelButtonColor: "#6c757d",
    })

    if (!result.isConfirmed) {
      return // ❌ El usuario canceló
    }

    try {
      setLoading(true)

      await anularNovedad(selectedNovedad.id, anularMotivo.trim())

      Swal.fire({
        icon: "success",
        title: "Novedad anulada",
        text: "La novedad fue anulada correctamente.",
        showConfirmButton: false,
        timer: 2000,
      })

      await fetchData()
      setCurrentView("manicuristas")
      setSelectedNovedad(null)
      setAnularMotivo("")
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error al anular",
        text: err?.message || "No se pudo anular la novedad.",
        confirmButtonColor: "#e83e8c",
      })
    } finally {
      setLoading(false)
    }
  }

  // ----------------------
  // Small helper: badge component (inline)
  // ----------------------
  const EstadoBadge = ({ estado }) => {
    return (
      <span className={`novedades-status-badge ${estado || ""}`}>
        {(estado || "SIN ESTADO").toUpperCase()}
      </span>
    )
  }

  // ----------------------
  // Render principal
  // ----------------------
  return (
    <div className="admin-container">
      <Toaster position="top-right" />

      {currentView === "create" ? (
      <div className="admin-header">
          <h1 className="admin-title">Crear novedad</h1>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              type="button"
              className="admin-button secondary"
              onClick={() => setCurrentView("manicuristas")}
            >
              <FaArrowLeft /> Volver
            </button>
            <button
              type="button"
              className="admin-button primary"
              disabled={loading}
              onClick={() => document.getElementById('novedadesCreateForm')?.requestSubmit()}
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      ) : currentView === "calendario" ? (
        <div className="admin-header">
          <h1 className="admin-title">Calendario de Novedades</h1>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              className="admin-button secondary"
              onClick={() => setCurrentView("manicuristas")}
            >
              <FaArrowLeft /> Volver
            </button>
            <button
              className="admin-button primary"
              onClick={() => {
                // Resetear completamente el formulario
                setFormData({
                  fecha: todayISO(),
                  estado: "",
                  tipo_ausencia: "",
                  hora_entrada: "",
                  hora_inicio_ausencia: "",
                  hora_fin_ausencia: "",
                  observaciones: "",
                  dias: "",
                  turno: "",
                  archivo_soporte: null,
                })
                setSelectedDates([])
                setSelectedManicurista(null)
                setManicuristaSearchTerm("")
                setShowManicuristaDropdown(false)
                setFormErrors({})
                setValidationState({})
                setDateSelectionMode("single")
                setCurrentView("create")
              }}
            >
              <FaCalendarPlus /> Nueva
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-header">
          <h1 className="admin-title">Gestión de Novedades</h1>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              className="admin-button primary"
              onClick={() => {
                // Resetear completamente el formulario
                setFormData({
                  fecha: todayISO(),
                  estado: "",
                  tipo_ausencia: "",
                  hora_entrada: "",
                  hora_inicio_ausencia: "",
                  hora_fin_ausencia: "",
                  observaciones: "",
                  dias: "",
                  turno: "",
                  archivo_soporte: null,
                })
                setSelectedDates([])
                setSelectedManicurista(null)
                setManicuristaSearchTerm("")
                setShowManicuristaDropdown(false)
                setFormErrors({})
                setValidationState({})
                setDateSelectionMode("single")
                setCurrentView("create")
              }}
            >
              <FaCalendarPlus /> Nueva
            </button>
            <button className="admin-button secondary" onClick={() => setCurrentView("calendario")}>
              <FaCalendarAlt /> Calendario
            </button>
          </div>
        </div>
      )}

      {/* Error global */}
      {globalError && <div className="novedades-global-error">{globalError}</div>}

      {/* LISTADO / MANICURISTAS */}
      {currentView === "manicuristas" && (
        <>
          {/* filtros */}
          <div className="admin-filters">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Buscar novedades..."
                value={novedadesSearchTerm}
                onChange={(e) => handleChangeSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="items-per-page">
              <span>Mostrar:</span>
              <select
                value={novedadesPerPage}
                onChange={(e) => {
                  setNovedadesPerPage(Number(e.target.value))
                  setNovedadesPage(1)
                }}
                className="items-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Texto de total removido para mantener consistencia visual con Manicuristas */}
          </div>

          {/* tabla */}
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Manicurista</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageNovedades.length > 0 ? (
                  getCurrentPageNovedades.map((n) => (
                    <tr key={n.id} className={n.anulada ? "anulada-row" : ""}>
                      <td>{dayjs(n.fecha).format("DD/MM/YYYY")}</td>
                      <td>{n.manicurista?.nombre || n.manicurista?.nombres || "-"}</td>
                      <td className="ellipsis" style={{ maxWidth: 220 }}>
                        {n.observaciones || "-"}
                      </td>
                      <td>
                        <EstadoBadge estado={n.estado} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="action-buttons">
                          <button
                            className="action-button view"
                            title="Ver"
                            onClick={() => {
                              setSelectedNovedad(n)
                              setCurrentView("detail")
                            }}
                          >
                            <FaEye />
                          </button>

                          {n.estado !== "anulada" && (
                            <>
                              <button
                                className="action-button delete"
                                title="Anular"
                                onClick={() => {
                                  setSelectedNovedad(n)
                                  setCurrentView("anular")
                                }}
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="no-data">
                      No se encontraron novedades
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* paginación */}
          {totalNovedadesPages > 1 && (
            <div className="pagination">
              <button onClick={() => handleGotoPage(1)} disabled={novedadesPage === 1} className="pagination-button">
                &laquo;
              </button>
              <button
                onClick={() => handleGotoPage(novedadesPage - 1)}
                disabled={novedadesPage === 1}
                className="pagination-button"
              >
                &lt;
              </button>

              <div className="pagination-info">
                Página {novedadesPage} de {totalNovedadesPages}
              </div>

              <button
                onClick={() => handleGotoPage(novedadesPage + 1)}
                disabled={novedadesPage === totalNovedadesPages}
                className="pagination-button"
              >
                &gt;
              </button>
              <button
                onClick={() => handleGotoPage(totalNovedadesPages)}
                disabled={novedadesPage === totalNovedadesPages}
                className="pagination-button"
              >
                &raquo;
              </button>
            </div>
          )}
        </>
      )}

      {/* CALENDARIO */}
      {currentView === "calendario" && (
        <div className="novedades-calendar-wrapper">
          <div className="novedades-calendar-header" style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="admin-button secondary" onClick={goToPrevMonth}>
                <FaChevronLeft />
              </button>
              <div style={{ fontWeight: 700 }}>
                {currentMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
              </div>
              <button className="admin-button secondary" onClick={goToNextMonth}>
                <FaChevronRight />
              </button>
            </div>
          </div>

          <div className="novedades-calendar-grid">
            <div className="novedades-weekdays">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                <div key={d} className="weekday-cell">
                  {d}
                </div>
              ))}
            </div>

            <div className="novedades-days-grid">
              {getDaysGrid().map((dateObj, idx) => {
                const iso = dateObj ? dateObj.toISOString().split("T")[0] : null
                const evs = iso ? eventsByDate[iso] || [] : []
                const isSelected = iso && selectedDates.includes(iso)
                const isToday = iso === todayISO()
                const today = new Date(todayISO())
                const isPast = dateObj && dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                return (
                  <div
                    key={idx}
                    className={`day-cell ${!dateObj ? "empty" : ""} ${isSelected ? "selected" : ""} ${isPast ? "past" : ""}`}
                    onClick={() => !isPast && dateObj && handleDayClick(dateObj)}
                    style={{ cursor: isPast ? "not-allowed" : "pointer", opacity: isPast ? 0.5 : 1, backgroundColor: isPast ? "#f3f4f6" : undefined }}
                    title={isPast ? "No disponible (día pasado)" : undefined}
                  >
                    <div className="day-cell-header">
                      <div className={`day-number ${isToday ? "today" : ""}`}>{dateObj ? dateObj.getDate() : ""}</div>
                      <div className="day-dots">
                        {evs.slice(0, 3).map((e, i) => (
                          <span key={i} className="dot" style={{ background: e.color }} />
                        ))}
                      </div>
                    </div>
                    <div className="day-events">
                      {evs.slice(0, 3).map((e, i) => (
                        <div
                          key={i}
                          className="calendar-event"
                          style={{ background: e.color }}
                          onClick={(evt) => {
                            evt.stopPropagation()
                            handleEventClick(e)
                          }}
                        >
                          {e.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* CREATE FORM */}
      {currentView === "create" && (
        <div className="novedades-create-wrapper novedades-modal">
           {/* Formulario */}
           <form id="novedadesCreateForm" className="novedades-create-form" onSubmit={handleCreateSubmit}>
             {/* Resumen de validación */}
             {Object.keys(formErrors).length > 0 && (
               <div className="validation-summary">
                 <div className="validation-summary-header">
                   <span className="validation-icon">⚠</span>
                   <span>Corrige los siguientes errores:</span>
                 </div>
                 <ul className="validation-summary-list">
                   {Object.entries(formErrors).map(([field, error]) => (
                     <li key={field} className="validation-summary-item">
                       {error}
                     </li>
                   ))}
                 </ul>
               </div>
             )}

             {/* Sección Principal - Información Básica */}
             <div className="form-section">
               <h4 className="section-title">Información Básica</h4>
               
               <div className="form-row">
                 {/* Manicurista - Búsqueda */}
                 <div className="form-group form-group-large">
                   <label htmlFor="manicurista">Manicurista</label>
                   <div className="searchable-select-container">
                     <input
                       id="manicurista"
                       type="text"
                       value={manicuristaSearchTerm}
                       onChange={handleManicuristaSearchChange}
                       onFocus={() => setShowManicuristaDropdown(true)}
                       placeholder="Buscar manicurista..."
                       required
                       className={`searchable-input ${formErrors.manicurista ? "error" : ""} ${validationState.manicurista === "valid" ? "valid" : ""}`}
                     />
                     {showManicuristaDropdown && filteredManicuristas.length > 0 && (
                       <div className="searchable-dropdown">
                         {filteredManicuristas.map((m) => (
                           <div
                             key={m.id}
                             className="searchable-option"
                             onClick={() => handleSelectManicurista(m)}
                           >
                             <div className="option-name">
                               {m.nombre || m.nombres} {m.apellido || m.apellidos}
                             </div>
                             {m.telefono && (
                               <div className="option-detail">{m.telefono}</div>
                             )}
                           </div>
                         ))}
                         {filteredManicuristas.length === 0 && manicuristaSearchTerm && (
                           <div className="searchable-option no-results">
                             No se encontraron manicuristas
                           </div>
                         )}
                       </div>
                     )}
                     {selectedManicurista && (
                       <div className="selected-manicurista">
                         <span className="selected-name">
                           {selectedManicurista.nombre || selectedManicurista.nombres} {selectedManicurista.apellido || selectedManicurista.apellidos}
                         </span>
                         <button
                           type="button"
                           className="clear-selection"
                           onClick={() => {
                             setSelectedManicurista(null)
                             setManicuristaSearchTerm("")
                             setShowManicuristaDropdown(false)
                           }}
                         >
                           <FaTimes />
                         </button>
                       </div>
                     )}
                   </div>
                   {formErrors.manicurista && <div className="field-error">{formErrors.manicurista}</div>}
                 </div>

                 {/* Tipo de novedad - Dropdown con estilo de buscador (searchable) */}
                 <div className="form-group form-group-large">
                   <label htmlFor="estado">Tipo de novedad</label>
                   <div id="estado-select-container" className="searchable-select-container">
                    <input
                     id="estado" 
                      type="text"
                      value={estadoSearchTerm}
                      placeholder="Selecciona o busca el tipo de novedad..."
                      onFocus={() => setShowEstadoDropdown(true)}
                      onChange={(e) => {
                        setEstadoSearchTerm(e.target.value)
                        setShowEstadoDropdown(true)
                      }}
                      className={`searchable-input ${formErrors.estado ? 'error' : ''} ${validationState.estado === 'valid' ? 'valid' : ''}`}
                    />
                    {showEstadoDropdown && (
                      <div className="searchable-dropdown">
                        {estadoOptions
                          .filter(opt => opt.label.toLowerCase().includes((estadoSearchTerm || '').trim().toLowerCase()))
                          .map((opt) => (
                            <div
                              key={opt.value}
                              className="searchable-option"
                              onClick={() => {
                                setFormData((f) => ({ ...f, estado: opt.value }))
                                setEstadoSearchTerm(opt.label)
                                setShowEstadoDropdown(false)
                                validateField('estado', opt.value)
                              }}
                            >
                              <div className="option-name">{opt.label}</div>
                            </div>
                          ))}
                        {estadoOptions.filter(opt => opt.label.toLowerCase().includes((estadoSearchTerm || '').trim().toLowerCase())).length === 0 && (
                          <div className="searchable-option no-results">Sin resultados</div>
                        )}
                      </div>
                    )}
                  </div>
                   {formErrors.estado && <div className="field-error">{formErrors.estado}</div>}
                 </div>
               </div>
             </div>

             {/* Sección de Fechas */}
             <div className="form-section">
               <h4 className="section-title">Configuración de Fechas</h4>
               
               {/* Modo de fecha */}
               <div className="form-group">
                 <label>Modo de selección</label>
                 <div className="chip-group">
                   {formData.estado === 'tardanza' && (
                     <button
                       type="button"
                       className={`chip active`}
                       disabled
                     >
                       Día único
                     </button>
                   )}
                   
                   {formData.estado === 'ausente' && (
                     <>
                       <button
                         type="button"
                         className={`chip ${dateSelectionMode === "single" ? "active" : ""}`}
                         onClick={() => {
                           setDateSelectionMode("single")
                           setSelectedDates([])
                         }}
                       >
                         Día único
                       </button>
                       <button
                         type="button"
                         className={`chip ${dateSelectionMode === "multiple" ? "active" : ""}`}
                         onClick={() => {
                           setDateSelectionMode("multiple")
                           setSelectedDates([])
                         }}
                       >
                         Múltiples días
                       </button>
                     </>
                   )}
                   
                   {formData.estado === 'vacaciones' && (
                     <>
                       <button
                         type="button"
                         className={`chip ${dateSelectionMode === "single" ? "active" : ""}`}
                         onClick={() => {
                           setDateSelectionMode("single")
                           setSelectedDates([])
                         }}
                       >
                         Día único
                       </button>
                       <button
                         type="button"
                         className={`chip ${dateSelectionMode === "multiple" ? "active" : ""}`}
                         onClick={() => {
                           setDateSelectionMode("multiple")
                           setSelectedDates([])
                         }}
                       >
                         Múltiples días
                       </button>
                     </>
                   )}
                   
                   {formData.estado === 'incapacidad' && (
                     <>
                       <button
                         type="button"
                         className={`chip ${dateSelectionMode === "single" ? "active" : ""}`}
                         onClick={() => {
                           setDateSelectionMode("single")
                           setSelectedDates([])
                         }}
                       >
                         Día único
                       </button>
                       <button
                         type="button"
                         className={`chip ${dateSelectionMode === "multiple" ? "active" : ""}`}
                         onClick={() => {
                           setDateSelectionMode("multiple")
                           setSelectedDates([])
                         }}
                       >
                         Múltiples días
                       </button>
                     </>
                   )}
                   
                   {formData.estado === 'horario' && (
                     <button
                       type="button"
                       className={`chip active`}
                       disabled
                     >
                       Día único
                     </button>
                   )}
                 </div>
               </div>

            {/* Calendario de selección de fechas (solo del manicurista elegido) */}
            {/* Calendario de selección de fechas (solo del manicurista elegido) */}
            <div className="novedades-calendar-wrapper mini-calendar">
                <div className="novedades-calendar-header">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button type="button" className="novedades-admin-button secondary" onClick={goToPrevMonth}>
                      <FaChevronLeft />
                    </button>
                    <div style={{ fontWeight: 700 }}>
                      {currentMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                    </div>
                    <button type="button" className="novedades-admin-button secondary" onClick={goToNextMonth}>
                      <FaChevronRight />
                    </button>
                  </div>
                </div>

                {/* Grid del calendario */}
                <div className="novedades-weekdays">
                  {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                    <div key={d} className="weekday-cell">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="novedades-days-grid">
                  {getDaysGrid().map((dateObj, idx) => {
                    const iso = dateObj ? dateObj.toISOString().split("T")[0] : null
                    const evs = iso
                      ? (eventsByDate[iso] || []).filter((e) => !selectedManicurista || e.meta?.manicurista?.id === selectedManicurista.id)
                      : []
                    const isSelected = iso && selectedDates.includes(iso)
                    const isToday = iso === todayISO()
                const isRestDay = iso && workSchedule[iso]?.descanso
                const today = new Date(todayISO())
                const isPast = dateObj && dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate())

                    return (
                      <div
                        key={idx}
                        className={`day-cell 
                            ${!dateObj ? "empty" : ""} 
                            ${isSelected ? "selected" : ""} 
                            ${isRestDay ? "rest-day" : ""}
                            ${isPast ? "past" : ""}`}
                    onClick={() => !isRestDay && !isPast && dateObj && handleDayClick(dateObj)}
                        style={{
                      cursor: isRestDay || isPast ? "not-allowed" : "pointer",
                      opacity: isRestDay || isPast ? 0.5 : 1,
                      backgroundColor: isRestDay || isPast ? "#f3f4f6" : undefined,
                        }}
                        title={
                      isPast
                        ? "No disponible (día pasado)"
                        : isRestDay
                        ? "Día de descanso - No disponible"
                            : evs.map((e) => `${e.meta?.estado?.toUpperCase() || "EVENTO"}`).join(", ")
                        }
                      >
                        <div className="day-cell-header">
                          <div className={`day-number ${isToday ? "today" : ""}`}>
                            {dateObj ? dateObj.getDate() : ""}
                          </div>
                          <div className="day-dots">
                            {evs.slice(0, 3).map((e, i) => (
                              <span
                                key={i}
                                className="dot"
                                style={{ background: e.color }}
                                title={e.meta?.estado?.toUpperCase()}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 🔹 Leyenda de colores */}
                <div className="calendar-legend">
                  {Object.entries(ESTADO_COLORS).map(([estado, color]) => (
                    <div key={estado} className="legend-item">
                      <span className="legend-dot" style={{ background: color }}></span>
                      <span className="legend-label">{estado.charAt(0).toUpperCase() + estado.slice(1)}</span>
                    </div>
                  ))}
                </div>
              </div>

               {/* Fecha input según modo */}
               <div className="form-row">
                 {dateSelectionMode === "single" && (
                   <div className="form-group form-group-large">
                     <label htmlFor="fecha">Fecha</label>
                     <input
                       id="fecha"
                       type="date"
                       name="fecha"
                       value={formData.fecha}
                       onChange={(e) => {
                         handleInputChange(e)
                         validateField("fecha", e.target.value)
                       }}
                       min={todayISO()}
                       className={formErrors.fecha ? "error" : ""}
                     />
                     {formErrors.fecha && <div className="field-error">{formErrors.fecha}</div>}
                   </div>
                 )}

                 {dateSelectionMode === "multiple" && (
                   <div className="form-group form-group-large">
                     <label>Fechas seleccionadas</label>
                     <div className="date-multi-wrapper">
                       <input
                         type="date"
                         value=""
                         onChange={(e) => {
                           const selectedDate = e.target.value
                           const dateObj = new Date(selectedDate)
                           const isRestDay = workSchedule[selectedDate]?.descanso

                           if (!isRestDay) {
                             handleTempAdd(selectedDate)
                             validateField("selectedDates", [...selectedDates, selectedDate])
                           }
                         }}
                         min={todayISO()}
                         className={formErrors.selectedDates ? "error" : ""}
                       />
                       <div className="tags-wrapper">
                         {selectedDates.map((d) => (
                           <span className="date-tag" key={d}>
                             {dayjs(d).format("DD/MM/YYYY")}
                             <button
                               type="button"
                               className="remove-date"
                               onClick={() => {
                                 const newDates = selectedDates.filter((x) => x !== d)
                                 setSelectedDates(newDates)
                                 validateField("selectedDates", newDates)
                               }}
                             >
                               <FaTimes />
                             </button>
                           </span>
                         ))}
                       </div>
                     </div>
                     {formErrors.selectedDates && <div className="field-error">{formErrors.selectedDates}</div>}
                   </div>
                 )}

                 {dateSelectionMode === "week" && (
                   <div className="form-group form-group-large">
                     <label htmlFor="weekRef">Fecha de referencia (semana completa)</label>
                     <input
                       id="weekRef"
                       type="date"
                       onChange={(e) => {
                         handleDayClick(new Date(e.target.value))
                         validateField("selectedDates", selectedDates)
                       }}
                       min={todayISO()}
                       className={formErrors.selectedDates ? "error" : ""}
                     />
                     {selectedDates.length > 0 && (
                       <div className="field-note">
                         Semana: {dayjs(selectedDates[0]).format("DD/MM")} —{" "}
                         {dayjs(selectedDates[selectedDates.length - 1]).format("DD/MM")}
                       </div>
                     )}
                     {formErrors.selectedDates && <div className="field-error">{formErrors.selectedDates}</div>}
                   </div>
                 )}
               </div>
             </div>

            {/* Sección de Detalles Específicos */}
            {(formData.estado === "tardanza" || formData.estado === "ausente" || formData.estado === "vacaciones" || formData.estado === "incapacidad" || formData.estado === "horario") && (
              <div className="form-section">
                <h4 className="section-title">Detalles Específicos</h4>
                
                {formData.estado === "tardanza" && (
                  <div className="form-group form-group-medium">
                    <label htmlFor="hora_entrada">Hora de entrada</label>
                    <select
                      id="hora_entrada"
                      name="hora_entrada"
                      value={formData.hora_entrada}
                      onChange={handleInputChange}
                      className={formErrors.hora_entrada ? "error" : ""}
                    >
                      <option value="">-- Selecciona --</option>
                      {timeOptions.map((s) => (
                        <option key={s.value} value={s.value} disabled={!s.disponible}>
                          {s.display} {!s.disponible ? "— ocupado" : ""}
                        </option>
                      ))}
                    </select>
                    {formErrors.hora_entrada && <div className="field-error">{formErrors.hora_entrada}</div>}
                  </div>
                )}

                {formData.estado === "ausente" && (
                  <div className="form-row">
                    <div className="form-group form-group-medium">
                      <label htmlFor="tipo_ausencia">Tipo de ausencia</label>
                      <select
                        id="tipo_ausencia"
                        name="tipo_ausencia"
                        value={formData.tipo_ausencia}
                        onChange={handleInputChange}
                        className={formErrors.tipo_ausencia ? "error" : ""}
                      >
                        <option value="">-- Selecciona --</option>
                        <option value="completa">Día completo</option>
                        <option value="por_horas">Por horas</option>
                      </select>
                      {formErrors.tipo_ausencia && <div className="field-error">{formErrors.tipo_ausencia}</div>}
                    </div>

                    {formData.tipo_ausencia === "por_horas" && (
                      <>
                        <div className="form-group form-group-small">
                          <label htmlFor="hora_inicio_ausencia">Inicio</label>
                          <select
                            id="hora_inicio_ausencia"
                            name="hora_inicio_ausencia"
                            value={formData.hora_inicio_ausencia}
                            onChange={handleInputChange}
                            className={formErrors.hora_inicio_ausencia ? "error" : ""}
                          >
                            <option value="">-- Inicio --</option>
                            {timeOptions.map((s) => (
                              <option key={s.value} value={s.value} disabled={!s.disponible}>
                                {s.display}
                              </option>
                            ))}
                          </select>
                          {formErrors.hora_inicio_ausencia && (
                            <div className="field-error">{formErrors.hora_inicio_ausencia}</div>
                          )}
                        </div>

                        <div className="form-group form-group-small">
                          <label htmlFor="hora_fin_ausencia">Fin</label>
                          <select
                            id="hora_fin_ausencia"
                            name="hora_fin_ausencia"
                            value={formData.hora_fin_ausencia}
                            onChange={handleInputChange}
                            className={formErrors.hora_fin_ausencia ? "error" : ""}
                          >
                            <option value="">-- Fin --</option>
                            {timeOptions.map((s) => (
                              <option key={s.value} value={s.value} disabled={!s.disponible}>
                                {s.display}
                              </option>
                            ))}
                          </select>
                          {formErrors.hora_fin_ausencia && (
                            <div className="field-error">{formErrors.hora_fin_ausencia}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {formData.estado === "vacaciones" && (
                  <div className="form-group form-group-small">
                    <label htmlFor="dias">Días (múltiplos de 7)</label>
                    <input
                      id="dias"
                      type="number"
                      name="dias"
                      value={formData.dias}
                      onChange={handleInputChange}
                      min={7}
                      step={7}
                      className={formErrors.dias ? "error" : ""}
                    />
                    {formErrors.dias && <div className="field-error">{formErrors.dias}</div>}

                    {Number(formData.dias) > 0 && selectedDates.length === 0 && (
                      <div className="field-note">
                        Selecciona la fecha de inicio en el calendario para marcar {formData.dias} días.
                      </div>
                    )}
                  </div>
                )}

                {formData.estado === "incapacidad" && (
                  <div className="form-group form-group-medium">
                    <label htmlFor="archivo_soporte">Soporte (PDF / Imagen)</label>
                    <input
                      id="archivo_soporte"
                      type="file"
                      name="archivo_soporte"
                      accept=".pdf,image/*"
                      onChange={handleInputChange}
                      className={formErrors.archivo_soporte ? "error" : ""}
                    />
                    {formErrors.archivo_soporte && <div className="field-error">{formErrors.archivo_soporte}</div>}
                  </div>
                )}

                {formData.estado === "horario" && (
                  <div className="form-group form-group-medium">
                    <label>Turno</label>
                    <select
                      value={formData.turno}
                      onChange={(e) => {
                        setFormData({ ...formData, turno: e.target.value })
                        validateField("turno", e.target.value)
                      }}
                      required
                      className={formErrors.turno ? "error" : ""}
                    >
                      <option value="">-- Seleccione --</option>
                      <option value="apertura">Apertura (10:00 - 19:00)</option>
                      <option value="cierre">Cierre (11:00 - 20:00)</option>
                    </select>
                    {formErrors.turno && <div className="field-error">{formErrors.turno}</div>}
                  </div>
                )}
              </div>
            )}

            {/* Sección de Observaciones */}
            <div className="form-section">
              <h4 className="section-title">Información Adicional</h4>
              
              <div className="form-group">
                <label htmlFor="observaciones">Motivo / Observaciones</label>
                <textarea
                  id="observaciones"
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  maxLength={400}
                  placeholder="Escribe el motivo o detalles..."
                  className={formErrors.observaciones ? "error" : ""}
                />
                {formErrors.observaciones && <div className="field-error">{formErrors.observaciones}</div>}
                <div className="field-note">
                  {formData.observaciones.length}/400 caracteres
                </div>
              </div>
              </div>

              {/* Errores de servidor */}
              {formErrors.server && (
                <div className="novedades-error-server">{formErrors.server}</div>
              )}
          </form>
        </div>
      )}


      {/* DETAIL */}
      {currentView === "detail" && selectedNovedad && (
        <div className="novedades-detail">
          {/* Encabezado */}
          <div className="detail-header">
            <button
              className="admin-button secondary"
              onClick={() => setCurrentView("manicuristas")}
            >
              <FaArrowLeft /> Volver
            </button>
            <div className="detail-title">
              <h3>Detalle de novedad</h3>
              <EstadoBadge estado={selectedNovedad.estado} />
            </div>
          </div>

          {/* Cuerpo */}
          <div className="detail-body">
            <div className="detail-row">
              <strong>Fecha:</strong>
              <span>{dayjs(selectedNovedad.fecha).format("DD/MM/YYYY")}</span>
            </div>

            <div className="detail-row">
              <strong>Manicurista:</strong>
              <span>
                {selectedNovedad.manicurista?.nombre ||
                  selectedNovedad.manicurista?.nombres}
              </span>
            </div>

            {selectedNovedad.estado === "tardanza" && (
              <div className="detail-row">
                <strong>Hora entrada:</strong>
                <span>{formatHora(selectedNovedad.hora_entrada)}</span>
              </div>
            )}

            {selectedNovedad.estado === "ausente" && (
              <div className="detail-row">
                <strong>Tipo ausencia:</strong>
                <span>{selectedNovedad.tipo_ausencia || "-"}</span>
              </div>
            )}

            {selectedNovedad.estado === "vacaciones" && (
              <div className="detail-row">
                <strong>Días:</strong>
                <span>{selectedNovedad.dias || "-"}</span>
              </div>
            )}

            {selectedNovedad.estado === "incapacidad" &&
              selectedNovedad.archivo_soporte && (
                <div className="detail-row soporte-section">
                  <strong>Soporte:</strong>
                  <div className="soporte-row">
                    <div>
                      {selectedNovedad.archivo_soporte.name || "Archivo"}
                      {selectedNovedad.archivo_soporte.size && (
                        <div className="small-muted">
                          {Math.round(selectedNovedad.archivo_soporte.size / 1024)} KB
                        </div>
                      )}
                    </div>
                    <div className="soporte-actions">
                      <button
                        className="novedades-admin-button secondary"
                        onClick={() => openSoporte(selectedNovedad.archivo_soporte)}
                      >
                        <FaEye /> Ver
                      </button>
                      <button
                        className="novedades-admin-button primary"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href =
                            selectedNovedad.archivo_soporte.url ||
                            selectedNovedad.archivo_soporte;
                          link.download =
                            selectedNovedad.archivo_soporte.name || "soporte";
                          link.click();
                        }}
                      >
                        <FaDownload /> Descargar
                      </button>
                    </div>
                  </div>
                </div>
              )}

            {selectedNovedad.observaciones && (
              <div className="detail-row">
                <strong>Motivo:</strong>
                <span className="muted">{selectedNovedad.observaciones}</span>
              </div>
            )}

            {selectedNovedad.motivo_anulacion && (
              <div className="detail-row anulacion-box">
                <strong>Motivo de anulación:</strong>
                <span>{selectedNovedad.motivo_anulacion}</span>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="detail-actions">
            {selectedNovedad.estado !== "anulada" && (
              <button
                className="admin-button danger"
                onClick={() => setCurrentView("anular")}
              >
                Anular
              </button>
            )}
            <button
              className="admin-button secondary"
              onClick={() => setCurrentView("manicuristas")}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}


      {/* ANULAR VIEW */}
{currentView === "anular" && selectedNovedad && (
  <div className="novedades-anular">
    <div className="anular-header">
      <h3>Anular novedad #{selectedNovedad.id}</h3>
    </div>

    <div className="anular-body">
      <label htmlFor="motivoAnulacion">Motivo de anulación</label>
      <textarea
        id="motivoAnulacion"
        placeholder="Escribe el motivo..."
        value={anularMotivo}
        onChange={(e) => setAnularMotivo(e.target.value)}
      />
    </div>

    <div className="anular-actions">
      <button
        className="admin-button secondary"
        onClick={() => setCurrentView("manicuristas")}
      >
        Cancelar
      </button>
      <button
        className="admin-button danger"
        onClick={handleAnularSubmit}
      >
        Anular
      </button>
    </div>
  </div>
)}

</div> ); } // fin componente Novedades
