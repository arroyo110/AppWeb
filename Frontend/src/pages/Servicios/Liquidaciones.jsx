"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  FaSearch,
  FaMoneyBillWave,
  FaUserMd,
  FaStickyNote,
  FaArrowLeft,
  FaSave,
  FaCalendarAlt,
  FaEdit,
  FaClipboardList,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaEye,
  FaCalculator,
  FaFileInvoiceDollar,
  FaClock,
  FaCheckCircle,
  FaFilePdf,
} from "react-icons/fa"
import liquidacionesService from "../../service/liquidacionesService.js"
import {
  generateLiquidacionPDF,
  generateLiquidacionPDFSimple,
  checkAutoTableAvailability,
} from "../../components/LiquidacionesPDFGenerator.js"
import PermissionButton from "../../components/PermissionButton"
import PermissionWrapper from "../../components/PermissionWrapper"
import toast, { Toaster } from "react-hot-toast"
import "../../styles/liquidaciones-compact.css"

const Liquidaciones = () => {
  const navigate = useNavigate()

  // Obtener información del usuario actual
  const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
  const isManicurista = userInfo.rol?.toLowerCase() === 'manicurista'
  const currentManicuristaId = isManicurista ? userInfo.id : null

  // Estados principales
  const [currentView, setCurrentView] = useState("main")
  const [selectedManicurista, setSelectedManicurista] = useState(null)
  const [manicuristas, setManicuristas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLiquidacion, setSelectedLiquidacion] = useState(null)
  const [filterManicurista, setFilterManicurista] = useState("")
  const [filterFecha, setFilterFecha] = useState("")
  const [liquidaciones, setLiquidaciones] = useState([])

  // Estados para liquidaciones globales
  const [selectedManicuristas, setSelectedManicuristas] = useState([])
  const [globalLiquidaciones, setGlobalLiquidaciones] = useState([])
  const [calculandoGlobales, setCalculandoGlobales] = useState(false)
  const [serviciosGlobales, setServiciosGlobales] = useState([])
  
  // Estados para paginación de servicios globales
  const [serviciosCurrentPage, setServiciosCurrentPage] = useState(1)
  const [serviciosItemsPerPage, setServiciosItemsPerPage] = useState(20)
  const [serviciosSearchTerm, setServiciosSearchTerm] = useState("")

  // Estados para búsqueda y paginación de manicuristas
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(4)

  // Estados para la tabla de liquidaciones
  const [liquidacionesSearchTerm, setLiquidacionesSearchTerm] = useState("")
  const [liquidacionesCurrentPage, setLiquidacionesCurrentPage] = useState(1)
  const [liquidacionesItemsPerPage, setLiquidacionesItemsPerPage] = useState(5)
  const [liquidacionesSortConfig, setLiquidacionesSortConfig] = useState({
    key: "fecha_inicio",
    direction: "desc",
  })

  // Estados para paginación de servicios en el formulario
  const [citasCurrentPage, setCitasCurrentPage] = useState(1)
  const [citasItemsPerPage, setCitasItemsPerPage] = useState(10)

  // Estados del formulario
  const [formData, setFormData] = useState({
    fecha_inicio: "",
    fecha_final: "",
    valor: 0,
    bonificacion: 0,
    observaciones: "",
  })
  const [formErrors, setFormErrors] = useState({})
  const [generalError, setGeneralError] = useState("")

  // Estados para cálculo de servicios
  const [citasCalculadas, setCitasCalculadas] = useState(null)
  const [calculandoCitas, setCalculandoCitas] = useState(false)

  // Estados para gestión de liquidaciones
  const [liquidacionesManicurista, setLiquidacionesManicurista] = useState({})
  const [editFormData, setEditFormData] = useState({
    valor: 0,
    bonificacion: 0,
    observaciones: "",
  })
  const [actionTimeouts, setActionTimeouts] = useState(new Set())

  // Estados para PDF
  const [generatingPDF, setGeneratingPDF] = useState(false)
  
  // Estado para carga de detalles de servicios
  const [loadingCitasDetalle, setLoadingCitasDetalle] = useState(false)
  const [citasDetalle, setCitasDetalle] = useState([])
  
  // Estados para paginación de servicios en detalle
  const [citasDetalleCurrentPage, setCitasDetalleCurrentPage] = useState(1)
  const [citasDetalleItemsPerPage, setCitasDetalleItemsPerPage] = useState(10)
  const [citasDetalleSearchTerm, setCitasDetalleSearchTerm] = useState("")

  // FUNCIÓN PARA CARGAR LIQUIDACIONES
  const fetchLiquidaciones = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (filterManicurista) params.manicurista = filterManicurista
      if (filterFecha) params.fecha_inicio = filterFecha
      
      // Si es manicurista, solo mostrar sus propias liquidaciones
      if (isManicurista && currentManicuristaId) {
        params.manicurista = currentManicuristaId
        console.log("🔒 Manicurista detectada - filtrando por ID:", currentManicuristaId)
      }

      console.log("🔄 Cargando liquidaciones con filtros:", params)
      const data = await liquidacionesService.obtenerLiquidaciones(params)
      console.log("✅ Liquidaciones cargadas:", data)

      setLiquidaciones(data)

      // Organizar liquidaciones por manicurista
      const liquidacionesPorManicuristaTemp = {}
      data.forEach((liquidacion) => {
        const manicuristaId = liquidacion.manicurista?.id || liquidacion.manicurista
        if (!liquidacionesPorManicuristaTemp[manicuristaId]) {
          liquidacionesPorManicuristaTemp[manicuristaId] = []
        }
        liquidacionesPorManicuristaTemp[manicuristaId].push(liquidacion)
      })

      setLiquidacionesManicurista(liquidacionesPorManicuristaTemp)
      console.log("✅ Liquidaciones organizadas por manicurista:", liquidacionesPorManicuristaTemp)
    } catch (err) {
      setError("Error al cargar las liquidaciones.")
      console.error("❌ Error en fetchLiquidaciones:", err)
      showNotification("Error al cargar las liquidaciones", "error")
    } finally {
      setLoading(false)
    }
  }, [filterManicurista, filterFecha])

  const fetchManicuristas = useCallback(async () => {
    try {
      let data
      if (isManicurista && currentManicuristaId) {
        // Si es manicurista, solo obtener su propia información
        console.log("🔒 Manicurista detectada - cargando solo su información")
        data = await liquidacionesService.obtenerManicuristasDisponibles()
        // Filtrar solo la manicurista actual
        data = data.filter(manicurista => manicurista.id === currentManicuristaId)
      } else {
        // Si es admin/ayudante, cargar todas las manicuristas
        data = await liquidacionesService.obtenerManicuristasDisponibles()
      }
      setManicuristas(data)
    } catch (err) {
      console.error("Error al cargar manicuristas:", err)
    }
  }, [isManicurista, currentManicuristaId])

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

  const formatPrice = (price) => {
    const numPrice = Number(price) || 0
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(numPrice)
  }

  useEffect(() => {
    fetchLiquidaciones()
    fetchManicuristas()
  }, [fetchLiquidaciones, fetchManicuristas])

  // Forzar que en la vista principal siempre se muestren 5 por página
  useEffect(() => {
    if (currentView === "main") {
      setLiquidacionesItemsPerPage(5)
      setLiquidacionesCurrentPage(1)
    }
  }, [currentView])

  const handleCreateLiquidacion = () => {
    setSelectedLiquidacion(null)
    setCurrentView("selectManicurista")
  }

  const handleEditLiquidacion = (liquidacion) => {
    setSelectedLiquidacion(liquidacion)
    setEditFormData({
      valor: liquidacion.valor || 0,
      bonificacion: liquidacion.bonificacion || 0,
      observaciones: liquidacion.observaciones || "",
    })
    setCurrentView("edit")
  }

  // FUNCIÓN PARA GENERAR PDF
  const handleGeneratePDF = async (liquidacion) => {
    if (generatingPDF) return

    setGeneratingPDF(true)
    try {
      showNotification("Generando PDF...", "info")

      // Obtener detalle de citas si es necesario
      let citasDetalle = []
      try {
        const detalleCitas = await liquidacionesService.obtenerDetalleCitas(liquidacion.id)
        citasDetalle = detalleCitas.citas_detalle || []
      } catch (error) {
        console.warn("No se pudieron obtener las citas detalle:", error)
      }

      // Intentar generar PDF con autoTable primero
      let success = false
      if (checkAutoTableAvailability()) {
        success = generateLiquidacionPDF(liquidacion, citasDetalle)
      } else {
        success = generateLiquidacionPDFSimple(liquidacion, citasDetalle)
      }

      if (success) {
        showNotification("PDF generado exitosamente", "success")
      } else {
        showNotification("Error al generar el PDF", "error")
      }
    } catch (error) {
      console.error("Error generando PDF:", error)
      showNotification("Error al generar el PDF", "error")
    } finally {
      setGeneratingPDF(false)
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
      case "info":
        toast(message, {
          duration: 3000,
          position: "top-right",
          icon: "ℹ️",
          style: {
            background: "#3b82f6",
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

  const handleLiquidacionesSort = (key) => {
    let direction = "asc"
    if (liquidacionesSortConfig.key === key && liquidacionesSortConfig.direction === "asc") {
      direction = "desc"
    }
    setLiquidacionesSortConfig({ key, direction })
  }

  const renderLiquidacionesSortIndicator = (key) => {
    if (liquidacionesSortConfig.key !== key) {
      return <FaSort className="liquidaciones-module-sort-icon" />
    }
    return liquidacionesSortConfig.direction === "asc" ? (
      <FaSortUp className="liquidaciones-module-sort-icon active" />
    ) : (
      <FaSortDown className="liquidaciones-module-sort-icon active" />
    )
  }

  // Función para obtener liquidaciones filtradas y ordenadas para la vista general
  const getFilteredAndSortedLiquidacionesGeneral = () => {
    let filtered = liquidaciones.filter((liquidacion) => {
      const searchLower = liquidacionesSearchTerm.toLowerCase()
      const manicuristaNombre = liquidacion.manicurista?.nombre || liquidacion.manicurista?.nombres || liquidacion.manicurista?.name || ""
      
      return (
        // Información básica de la liquidación
        (liquidacion.fecha_inicio?.toLowerCase() || "").includes(searchLower) ||
        (liquidacion.fecha_final?.toLowerCase() || "").includes(searchLower) ||
        (liquidacion.valor?.toString() || "").includes(searchLower) ||
        (liquidacion.estado?.toLowerCase() || "").includes(searchLower) ||
        (liquidacion.observaciones?.toLowerCase() || "").includes(searchLower) ||
        
        // Información del manicurista
        manicuristaNombre.toLowerCase().includes(searchLower) ||
        (liquidacion.manicurista?.especialidad?.toLowerCase() || "").includes(searchLower) ||
        (liquidacion.manicurista?.email?.toLowerCase() || "").includes(searchLower) ||
        (liquidacion.manicurista?.documento?.toLowerCase() || "").includes(searchLower) ||
        (liquidacion.manicurista?.celular?.toLowerCase() || "").includes(searchLower) ||
        
        // Búsqueda por ID
        (liquidacion.id?.toString() || "").includes(searchLower) ||
        
        // Búsqueda en campos de fecha si existen
        (liquidacion.fecha_creacion?.toLowerCase() || "").includes(searchLower) ||
        (liquidacion.fecha_actualizacion?.toLowerCase() || "").includes(searchLower)
      )
    })

    // Filtrar por manicurista si está seleccionado
    if (filterManicurista) {
      filtered = filtered.filter((liquidacion) => {
        const manicuristaId = liquidacion.manicurista?.id || liquidacion.manicurista
        return manicuristaId == filterManicurista
      })
    }

    // Filtrar por fecha si está seleccionada
    if (filterFecha) {
      filtered = filtered.filter((liquidacion) => {
        return liquidacion.fecha_inicio === filterFecha || liquidacion.fecha_final === filterFecha
      })
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[liquidacionesSortConfig.key] || ""
      let bValue = b[liquidacionesSortConfig.key] || ""

      if (liquidacionesSortConfig.key === "fecha_inicio") {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      } else if (liquidacionesSortConfig.key === "manicurista") {
        aValue = a.manicurista?.nombre || a.manicurista?.nombres || a.manicurista?.name || ""
        bValue = b.manicurista?.nombre || b.manicurista?.nombres || b.manicurista?.name || ""
      }

      if (aValue < bValue) {
        return liquidacionesSortConfig.direction === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return liquidacionesSortConfig.direction === "asc" ? 1 : -1
      }
      return 0
    })

    return sorted
  }

  const getFilteredAndSortedLiquidaciones = () => {
    if (!selectedManicurista) return []

    const liquidacionesDeManicurista = liquidacionesManicurista[selectedManicurista.id] || []
    console.log(`Liquidaciones para manicurista ${selectedManicurista.id}:`, liquidacionesDeManicurista)

    const filtered = liquidacionesDeManicurista.filter((liquidacion) => {
      const searchLower = liquidacionesSearchTerm.toLowerCase()
      return (
        // Información básica de la liquidación
        (liquidacion.fecha_inicio?.toLowerCase() || "").includes(searchLower) ||
        (liquidacion.fecha_final?.toLowerCase() || "").includes(searchLower) ||
        (liquidacion.valor?.toString() || "").includes(searchLower) ||
        (liquidacion.estado?.toLowerCase() || "").includes(searchLower) ||
        (liquidacion.observaciones?.toLowerCase() || "").includes(searchLower) ||
        
        // Búsqueda por ID
        (liquidacion.id?.toString() || "").includes(searchLower) ||
        
        // Búsqueda en campos de fecha si existen
        (liquidacion.fecha_creacion?.toLowerCase() || "").includes(searchLower) ||
        (liquidacion.fecha_actualizacion?.toLowerCase() || "").includes(searchLower)
      )
    })

    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[liquidacionesSortConfig.key] || ""
      let bValue = b[liquidacionesSortConfig.key] || ""

      if (liquidacionesSortConfig.key === "fecha_inicio") {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      }

      if (aValue < bValue) {
        return liquidacionesSortConfig.direction === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return liquidacionesSortConfig.direction === "asc" ? 1 : -1
      }
      return 0
    })

    return sorted
  }

  const getCurrentPageLiquidaciones = () => {
    const filtered = getFilteredAndSortedLiquidaciones()
    const indexOfLastItem = liquidacionesCurrentPage * liquidacionesItemsPerPage
    const indexOfFirstItem = indexOfLastItem - liquidacionesItemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  const getCurrentPageLiquidacionesGeneral = () => {
    const filtered = getFilteredAndSortedLiquidacionesGeneral()
    const indexOfLastItem = liquidacionesCurrentPage * liquidacionesItemsPerPage
    const indexOfFirstItem = indexOfLastItem - liquidacionesItemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  const totalLiquidacionesPages = Math.ceil(getFilteredAndSortedLiquidaciones().length / liquidacionesItemsPerPage)
  const totalLiquidacionesPagesGeneral = Math.ceil(getFilteredAndSortedLiquidacionesGeneral().length / liquidacionesItemsPerPage)

  const paginateLiquidaciones = (pageNumber) => setLiquidacionesCurrentPage(pageNumber)
  const paginateLiquidacionesGeneral = (pageNumber) => setLiquidacionesCurrentPage(pageNumber)

  const handleSelectManicurista = (manicurista) => {
    setSelectedManicurista(manicurista)
    setCurrentView("create")
    resetForm()
  }

  // Funciones para manejo de selección múltiple
  const handleToggleManicuristaSelection = (manicurista) => {
    setSelectedManicuristas(prev => {
      const isSelected = prev.some(m => m.id === manicurista.id)
      if (isSelected) {
        return prev.filter(m => m.id !== manicurista.id)
      } else {
        return [...prev, manicurista]
      }
    })
  }

  const handleSelectAllManicuristas = () => {
    const currentPageManicuristas = filteredAndPaginatedManicuristas()
    const allSelected = currentPageManicuristas.every(manicurista => 
      selectedManicuristas.some(selected => selected.id === manicurista.id)
    )
    
    if (allSelected) {
      // Deseleccionar todas las de la página actual
      setSelectedManicuristas(prev => 
        prev.filter(selected => 
          !currentPageManicuristas.some(current => current.id === selected.id)
        )
      )
    } else {
      // Seleccionar todas las de la página actual
      setSelectedManicuristas(prev => {
        const newSelections = currentPageManicuristas.filter(manicurista => 
          !prev.some(selected => selected.id === manicurista.id)
        )
        return [...prev, ...newSelections]
      })
    }
  }

  const handleCreateGlobalLiquidaciones = () => {
    if (selectedManicuristas.length === 0) {
      showNotification("Seleccione al menos una manicurista para liquidaciones globales", "warning")
      return
    }
    setCurrentView("globalLiquidaciones")
    resetForm()
  }

  // Función para obtener el lunes de la semana actual
  const getMondayOfWeek = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Ajustar para que domingo sea 0
    return new Date(d.setDate(diff))
  }

  // Función para obtener el domingo de la semana actual
  const getSundayOfWeek = (date) => {
    const monday = getMondayOfWeek(date)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return sunday
  }

  // Función para formatear fecha en formato YYYY-MM-DD
  const formatDateToISO = (date) => {
    return date.toISOString().split('T')[0]
  }

  const resetForm = () => {
    const today = new Date()
    const monday = getMondayOfWeek(today)
    const sunday = getSundayOfWeek(today)

    setFormData({
      fecha_inicio: formatDateToISO(monday),
      fecha_final: formatDateToISO(sunday),
      valor: 0,
      bonificacion: "", // Cambiado de 0 a string vacío
      observaciones: "", // Mantenemos pero será removido del formulario
    })
    setFormErrors({})
    setGeneralError("")
    setCitasCalculadas(null)
    setCitasCurrentPage(1) // Reset paginación de citas
  }

  const calcularCitasCompletadas = async () => {
    if (!selectedManicurista || !formData.fecha_inicio || !formData.fecha_final) {
      showNotification("Seleccione manicurista y fechas para calcular", "warning")
      return
    }

    setCalculandoCitas(true)
    try {
      const resultado = await liquidacionesService.calcularCitasCompletadas(
        selectedManicurista.id,
        formData.fecha_inicio,
        formData.fecha_final,
      )

      setCitasCalculadas(resultado)

      // Verificar si hay servicios completados
      const cantidadServicios = resultado.resumen_citas?.cantidad_citas || 0
      
      if (cantidadServicios === 0) {
        showNotification("No se encontraron servicios completados en el período seleccionado", "warning")
        // Limpiar el valor si no hay servicios
        setFormData((prev) => ({
          ...prev,
          valor: 0,
        }))
      } else {
        // Redondear el valor sugerido a 2 decimales
        const valorSugerido = Math.round(Number(resultado.valor_sugerido_liquidacion || 0) * 100) / 100

        setFormData((prev) => ({
          ...prev,
          valor: valorSugerido,
        }))

        showNotification(`${cantidadServicios} servicios calculados exitosamente`, "success")
      }
    } catch (error) {
      console.error("Error calculando citas:", error)
      showNotification("Error al calcular citas completadas", "error")
    } finally {
      setCalculandoCitas(false)
    }
  }

  // Función para calcular liquidaciones globales
  const calcularLiquidacionesGlobales = async () => {
    if (!formData.fecha_inicio || !formData.fecha_final) {
      showNotification("Seleccione fechas para calcular", "warning")
      return
    }

    setCalculandoGlobales(true)
    try {
      const liquidacionesCalculadas = await Promise.all(
        selectedManicuristas.map(async (manicurista) => {
          try {
            const resultado = await liquidacionesService.calcularCitasCompletadas(
              manicurista.id,
              formData.fecha_inicio,
              formData.fecha_final,
            )
            
            return {
              manicurista,
              valor: Math.round(Number(resultado.valor_sugerido_liquidacion || 0) * 100) / 100,
              bonificacion: 0,
              citasCalculadas: resultado,
              total_a_pagar: Math.round(Number(resultado.valor_sugerido_liquidacion || 0) * 100) / 100
            }
          } catch (error) {
            console.error(`Error calculando liquidación para ${manicurista.nombre}:`, error)
            return {
              manicurista,
              valor: 0,
              bonificacion: 0,
              citasCalculadas: null,
              total_a_pagar: 0,
              error: true
            }
          }
        })
      )

      // Recopilar todos los servicios de todas las manicuristas
      const todosLosServicios = []
      liquidacionesCalculadas.forEach(liquidacion => {
        if (liquidacion.citasCalculadas?.citas_detalle) {
          liquidacion.citasCalculadas.citas_detalle.forEach(cita => {
            todosLosServicios.push({
              ...cita,
              manicurista: liquidacion.manicurista,
              manicurista_nombre: liquidacion.manicurista.nombre || liquidacion.manicurista.nombres || liquidacion.manicurista.name || "Manicurista"
            })
          })
        }
      })

      setGlobalLiquidaciones(liquidacionesCalculadas)
      setServiciosGlobales(todosLosServicios)
      setServiciosCurrentPage(1) // Reset paginación
      showNotification(`Liquidaciones globales calculadas exitosamente - ${todosLosServicios.length} servicios encontrados`, "success")
    } catch (error) {
      console.error("Error calculando liquidaciones globales:", error)
      showNotification("Error al calcular liquidaciones globales", "error")
    } finally {
      setCalculandoGlobales(false)
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.fecha_inicio) errors.fecha_inicio = "Fecha de inicio es requerida"
    if (!formData.fecha_final) errors.fecha_final = "Fecha final es requerida"
    if (formData.fecha_inicio && formData.fecha_final && formData.fecha_inicio > formData.fecha_final) {
      errors.fecha_final = "La fecha final debe ser posterior a la fecha de inicio"
    }
    if (Number(formData.valor) < 0) errors.valor = "El valor no puede ser negativo"
    if (Number(formData.bonificacion) < 0) errors.bonificacion = "La bonificación no puede ser negativa"
    
    // Validar que se hayan calculado servicios
    if (!citasCalculadas || !citasCalculadas.resumen_citas || citasCalculadas.resumen_citas.cantidad_citas === 0) {
      errors.servicios = "Debe calcular servicios completados antes de crear la liquidación"
    }

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
        manicurista_id: selectedManicurista.id,
        fecha_inicio: formData.fecha_inicio,
        fecha_final: formData.fecha_final,
        valor: Math.round(Number(formData.valor) * 100) / 100, // Redondear a 2 decimales
        bonificacion: Math.round(Number(formData.bonificacion) * 100) / 100, // Redondear a 2 decimales
        observaciones: formData.observaciones,
      }

      console.log("🔄 Enviando datos:", dataToSend)

      await liquidacionesService.crearLiquidacionAutomatica(dataToSend)
      showNotification("Liquidación creada exitosamente", "success")
      
      // Debug: Log the current state before navigation
      console.log("✅ Liquidación creada, navegando a 'main'")
      console.log("Estado actual antes de navegación:", { currentView, selectedManicurista })
      
      // Primero limpiar el estado
      setSelectedManicurista(null)
      setCurrentView("main")
      
      // Debug: Log the state after navigation
      console.log("Estado después de navegación:", { currentView: "main" })
      
      // Recargar datos después de la navegación
      try {
        await fetchLiquidaciones()
        console.log("✅ Datos recargados exitosamente")
      } catch (fetchError) {
        console.error("⚠️ Error recargando datos:", fetchError)
        // No bloquear la navegación por errores en recarga
      }
    } catch (err) {
      console.error("Error al crear liquidación:", err)
      const errorMessage = err.userMessage || err.response?.data?.message || err.message || "Ha ocurrido un error"
      setGeneralError(`Error: ${errorMessage}`)
      showNotification(`Error: ${errorMessage}`, "error")
    } finally {
      setLoading(false)
    }
  }

  const handleVerDetalle = async (liquidacion) => {
    setSelectedLiquidacion(liquidacion)
    setCurrentView("detail")
    
    // Cargar detalles de las citas
    await cargarDetalleCitas(liquidacion.id)
  }

  // Función para cargar el detalle de las citas de una liquidación
  const cargarDetalleCitas = async (liquidacionId) => {
    setLoadingCitasDetalle(true)
    try {
      const detalleCitas = await liquidacionesService.obtenerDetalleCitas(liquidacionId)
      setCitasDetalle(detalleCitas.citas_detalle || [])
      setCitasDetalleCurrentPage(1) // Reset paginación
      setCitasDetalleSearchTerm("") // Reset búsqueda
    } catch (error) {
      console.error("Error cargando detalle de citas:", error)
      setCitasDetalle([])
      showNotification("Error al cargar el detalle de las citas", "error")
    } finally {
      setLoadingCitasDetalle(false)
    }
  }

  const handleVerLiquidaciones = (manicurista) => {
    setSelectedManicurista(manicurista)
    setLiquidacionesSearchTerm("")
    setLiquidacionesCurrentPage(1)
    setCurrentView("liquidaciones")
  }

  const handleUpdateLiquidacion = async () => {
    if (!selectedLiquidacion) {
      showNotification("No hay liquidación seleccionada para actualizar.", "error")
      setCurrentView("main")
      return
    }

    try {
      setLoading(true)

      await liquidacionesService.actualizarLiquidacion(selectedLiquidacion.id, editFormData)
      showNotification("Liquidación actualizada exitosamente", "success")
      setCurrentView("main")

      // Recargar datos
      await fetchLiquidaciones()
    } catch (error) {
      console.error("❌ Error actualizando liquidación:", error)
      showNotification("Error actualizando liquidación", "error")
    } finally {
      setLoading(false)
    }
  }

  // Funciones para manejo de bonificaciones en liquidaciones globales
  const handleUpdateGlobalBonificacion = (manicuristaId, bonificacion) => {
    setGlobalLiquidaciones(prev => 
      prev.map(liquidacion => {
        if (liquidacion.manicurista.id === manicuristaId) {
          const nuevaBonificacion = Math.round(Number(bonificacion) * 100) / 100
          return {
            ...liquidacion,
            bonificacion: nuevaBonificacion,
            total_a_pagar: liquidacion.valor + nuevaBonificacion
          }
        }
        return liquidacion
      })
    )
  }

  // Función para crear todas las liquidaciones globales
  const handleCreateAllGlobalLiquidaciones = async () => {
    if (globalLiquidaciones.length === 0) {
      showNotification("No hay liquidaciones calculadas para crear", "warning")
      return
    }

    // Filtrar liquidaciones que tienen servicios (valor > 0)
    const liquidacionesConServicios = globalLiquidaciones.filter(liquidacion => 
      liquidacion.valor > 0 && liquidacion.citasCalculadas?.resumen_citas?.cantidad_citas > 0
    )

    if (liquidacionesConServicios.length === 0) {
      showNotification("No hay liquidaciones con servicios para crear", "warning")
      return
    }

    if (liquidacionesConServicios.length < globalLiquidaciones.length) {
      const liquidacionesSinServicios = globalLiquidaciones.length - liquidacionesConServicios.length
      showNotification(`${liquidacionesSinServicios} liquidaciones sin servicios fueron ignoradas`, "info")
    }

    try {
      setLoading(true)
      setGeneralError("")

      const liquidacionesACrear = liquidacionesConServicios.map(liquidacion => ({
        manicurista_id: liquidacion.manicurista.id,
        fecha_inicio: formData.fecha_inicio,
        fecha_final: formData.fecha_final,
        valor: liquidacion.valor,
        bonificacion: liquidacion.bonificacion,
        observaciones: `Liquidación global - Semana del ${formatearFecha(formData.fecha_inicio)} al ${formatearFecha(formData.fecha_final)}`,
      }))

      // Crear todas las liquidaciones en paralelo
      await Promise.all(
        liquidacionesACrear.map(data => 
          liquidacionesService.crearLiquidacionAutomatica(data)
        )
      )

      showNotification(`${liquidacionesACrear.length} liquidaciones con servicios creadas exitosamente`, "success")
      
      // Limpiar estado y volver a la vista principal
      setSelectedManicuristas([])
      setGlobalLiquidaciones([])
      setServiciosGlobales([])
      setCurrentView("main")
      
      // Recargar datos
      await fetchLiquidaciones()
    } catch (error) {
      console.error("Error creando liquidaciones globales:", error)
      const errorMessage = error.userMessage || error.response?.data?.message || error.message || "Ha ocurrido un error"
      setGeneralError(`Error: ${errorMessage}`)
      showNotification(`Error: ${errorMessage}`, "error")
    } finally {
      setLoading(false)
    }
  }

  // Funciones para manejo de servicios globales
  const getFilteredAndPaginatedServicios = () => {
    const filtered = serviciosGlobales.filter(servicio => {
      const searchLower = serviciosSearchTerm.toLowerCase()
      return (
        (servicio.cliente?.toLowerCase() || "").includes(searchLower) ||
        (servicio.manicurista_nombre?.toLowerCase() || "").includes(searchLower) ||
        (servicio.fecha?.toLowerCase() || "").includes(searchLower) ||
        (servicio.hora?.toLowerCase() || "").includes(searchLower) ||
        (Array.isArray(servicio.servicios) ? servicio.servicios.join(", ").toLowerCase() : "").includes(searchLower) ||
        (servicio.precio_total?.toString() || "").includes(searchLower)
      )
    })

    const indexOfLastItem = serviciosCurrentPage * serviciosItemsPerPage
    const indexOfFirstItem = indexOfLastItem - serviciosItemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  const getFilteredServicios = () => {
    return serviciosGlobales.filter(servicio => {
      const searchLower = serviciosSearchTerm.toLowerCase()
      return (
        (servicio.cliente?.toLowerCase() || "").includes(searchLower) ||
        (servicio.manicurista_nombre?.toLowerCase() || "").includes(searchLower) ||
        (servicio.fecha?.toLowerCase() || "").includes(searchLower) ||
        (servicio.hora?.toLowerCase() || "").includes(searchLower) ||
        (Array.isArray(servicio.servicios) ? servicio.servicios.join(", ").toLowerCase() : "").includes(searchLower) ||
        (servicio.precio_total?.toString() || "").includes(searchLower)
      )
    })
  }

  const totalServiciosPages = Math.ceil(getFilteredServicios().length / serviciosItemsPerPage)

  const paginateServicios = (pageNumber) => setServiciosCurrentPage(pageNumber)

  // Funciones para manejo de citas en detalle
  const getFilteredAndPaginatedCitasDetalle = () => {
    const filtered = citasDetalle.filter(cita => {
      const searchLower = citasDetalleSearchTerm.toLowerCase()
      return (
        (cita.cliente?.nombre?.toLowerCase() || "").includes(searchLower) ||
        (cita.fecha?.toLowerCase() || "").includes(searchLower) ||
        (cita.hora?.toLowerCase() || "").includes(searchLower) ||
        (Array.isArray(cita.servicios) ? cita.servicios.map(s => s.nombre).join(", ").toLowerCase() : "").includes(searchLower) ||
        (cita.precio_total?.toString() || "").includes(searchLower)
      )
    })

    const indexOfLastItem = citasDetalleCurrentPage * citasDetalleItemsPerPage
    const indexOfFirstItem = indexOfLastItem - citasDetalleItemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  const getFilteredCitasDetalle = () => {
    return citasDetalle.filter(cita => {
      const searchLower = citasDetalleSearchTerm.toLowerCase()
      return (
        (cita.cliente?.nombre?.toLowerCase() || "").includes(searchLower) ||
        (cita.fecha?.toLowerCase() || "").includes(searchLower) ||
        (cita.hora?.toLowerCase() || "").includes(searchLower) ||
        (Array.isArray(cita.servicios) ? cita.servicios.map(s => s.nombre).join(", ").toLowerCase() : "").includes(searchLower) ||
        (cita.precio_total?.toString() || "").includes(searchLower)
      )
    })
  }

  const totalCitasDetallePages = Math.ceil(getFilteredCitasDetalle().length / citasDetalleItemsPerPage)

  const paginateCitasDetalle = (pageNumber) => setCitasDetalleCurrentPage(pageNumber)

  // VISTA PRINCIPAL DE LIQUIDACIONES (Lista General)
  const renderMainLiquidacionesView = () => (
    <div className="admin-container liquidaciones-main">
      <div className="admin-content-wrapper liquidaciones-main-wrapper">
        <div className="admin-header">
          <h1 className="admin-title">
            {isManicurista ? "Mis Liquidaciones" : "Gestión de Liquidaciones"}
          </h1>
          <PermissionButton
            modulo="liquidaciones"
            accion="crear"
            className="admin-button primary"
            onClick={handleCreateLiquidacion}
            hidden={true}
          >
            <FaFileInvoiceDollar /> Nueva Liquidación
          </PermissionButton>
        </div>

        <div className="admin-filters">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar liquidaciones..."
              value={liquidacionesSearchTerm}
              onChange={(e) => {
                setLiquidacionesSearchTerm(e.target.value)
                setLiquidacionesCurrentPage(1)
              }}
              className="search-input"
            />
          </div>

          {/* Filtro de manicuristas removido según solicitud */}

          <div className="filter-group">
            <input
              type="date"
              value={filterFecha}
              onChange={(e) => {
                setFilterFecha(e.target.value)
                setLiquidacionesCurrentPage(1)
              }}
              className="filter-date"
              placeholder="Filtrar por fecha"
            />
          </div>

          <div className="items-per-page">
            <span>Mostrar:</span>
            <select
              value={liquidacionesItemsPerPage}
              onChange={(e) => {
                setLiquidacionesItemsPerPage(Number(e.target.value))
                setLiquidacionesCurrentPage(1)
              }}
              className="items-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Cargando liquidaciones...</p>
          </div>
        ) : error ? (
          <div className="admin-message error">
            <p>{error}</p>
            <button className="admin-button secondary" onClick={fetchLiquidaciones}>
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <div className="liquidaciones-module-main-table-container table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th onClick={() => handleLiquidacionesSort("fecha_inicio")}>
                      Período {renderLiquidacionesSortIndicator("fecha_inicio")}
                    </th>
                    <th onClick={() => handleLiquidacionesSort("manicurista")}>
                      Manicurista {renderLiquidacionesSortIndicator("manicurista")}
                    </th>
                    <th onClick={() => handleLiquidacionesSort("valor")}>
                      Valor {renderLiquidacionesSortIndicator("valor")}
                    </th>
                    <th>Servicios</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAndSortedLiquidacionesGeneral().length > 0 ? (
                    getCurrentPageLiquidacionesGeneral().map((liquidacion) => (
                      <tr key={liquidacion.id}>
                        <td>
                          <div className="liquidaciones-module-service-info">
                            <div className="liquidaciones-module-service-name">
                              {formatearFecha(liquidacion.fecha_inicio)} - {formatearFecha(liquidacion.fecha_final)}
                            </div>
                            <div className="liquidaciones-module-service-description">
                              {liquidacion.fecha_creacion
                                ? `Creada: ${new Date(liquidacion.fecha_creacion).toLocaleDateString("es-CO")}`
                                : "Fecha no disponible"}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="liquidaciones-module-service-info">
                            <div className="liquidaciones-module-service-name">
                              {liquidacion.manicurista?.nombre || liquidacion.manicurista?.nombres || liquidacion.manicurista?.name || "Manicurista"}
                            </div>
                            <div className="liquidaciones-module-service-description">
                              ID: {liquidacion.manicurista?.id || liquidacion.manicurista}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="liquidaciones-module-service-info">
                            <div className="liquidaciones-module-service-name">
                              {formatPrice(liquidacion.total_a_pagar || 0)}
                            </div>
                            <div className="liquidaciones-module-service-description">
                              Base: {formatPrice(liquidacion.valor || 0)} + Bonif:{" "}
                              {formatPrice(liquidacion.bonificacion || 0)}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="liquidaciones-module-service-info">
                            <div className="liquidaciones-module-service-name">
                              {liquidacion.cantidad_servicios_completados || 0} servicios
                            </div>
                            <div className="liquidaciones-module-service-description">
                              Total: {formatPrice(liquidacion.total_servicios_completados || 0)}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <PermissionButton
                              modulo="liquidaciones"
                              accion="ver_detalles"
                              className="action-button view"
                              onClick={() => handleVerDetalle(liquidacion)}
                              title="Ver detalles"
                              hidden={true}
                            >
                              <FaEye />
                            </PermissionButton>
                            <PermissionButton
                              modulo="liquidaciones"
                              accion="editar"
                              className="action-button edit"
                              onClick={() => handleEditLiquidacion(liquidacion)}
                              title="Editar liquidación"
                              hidden={true}
                            >
                              <FaEdit />
                            </PermissionButton>
                            <button
                              className="action-button success"
                              onClick={() => handleGeneratePDF(liquidacion)}
                              title="Generar PDF"
                              disabled={generatingPDF}
                            >
                              {generatingPDF ? (
                                <div className="spinner-small"></div>
                              ) : (
                                <FaFilePdf />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="liquidaciones-module-no-data">
                        No se encontraron liquidaciones.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalLiquidacionesPagesGeneral > 1 && (
              <div className="pagination">
                <button
                  className="pagination-button"
                  onClick={() => paginateLiquidacionesGeneral(1)}
                  disabled={liquidacionesCurrentPage === 1}
                >
                  &laquo;
                </button>
                <button
                  className="pagination-button"
                  onClick={() => paginateLiquidacionesGeneral(liquidacionesCurrentPage - 1)}
                  disabled={liquidacionesCurrentPage === 1}
                >
                  &lt;
                </button>

                <div className="pagination-info">
                  Página {liquidacionesCurrentPage} de {totalLiquidacionesPagesGeneral}
                </div>

                <button
                  className="pagination-button"
                  onClick={() => paginateLiquidacionesGeneral(liquidacionesCurrentPage + 1)}
                  disabled={liquidacionesCurrentPage === totalLiquidacionesPagesGeneral}
                >
                  &gt;
                </button>
                <button
                  className="pagination-button"
                  onClick={() => paginateLiquidacionesGeneral(totalLiquidacionesPagesGeneral)}
                  disabled={liquidacionesCurrentPage === totalLiquidacionesPagesGeneral}
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

  // VISTA DE FORMULARIO (Nueva Liquidación)
  const renderFormView = () => (
    <div className="liquidaciones-module">
      <div className="liquidaciones-module-admin-container">
        <div className="liquidaciones-module-form-header">
          <div className="liquidaciones-module-form-header-left">
            <button
              className="liquidaciones-module-admin-button secondary"
              onClick={() => {
                setCurrentView("main")
                setSelectedManicurista(null)
              }}
            >
              <FaArrowLeft /> Volver
            </button>
          </div>
          <h1 className="liquidaciones-module-form-title">Nueva Liquidación - {selectedManicurista?.nombre}</h1>
          <div className="liquidaciones-module-form-header-right">
            <PermissionButton
              modulo="liquidaciones"
              accion="crear"
              className="liquidaciones-module-admin-button primary"
              onClick={handleSubmit}
              disabled={loading}
              hidden={true}
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <FaSave /> Crear Liquidación
                </>
              )}
            </PermissionButton>
          </div>
        </div>

        {generalError && <div className="liquidaciones-module-general-error">{generalError}</div>}

        <div className="liquidaciones-module-form-content-compact">
          {/* Sección de Período */}
          <div className="liquidaciones-module-form-section-compact">
            <h3 className="liquidaciones-module-global-week-title">
              <FaCalendarAlt className="liquidaciones-module-form-icon" /> Período de Liquidación (Semana)
            </h3>
            
            <div className="liquidaciones-module-week-selector">
              <div className="liquidaciones-module-week-info">
                <span className="liquidaciones-module-week-label">Semana seleccionada:</span>
                <span className="liquidaciones-module-week-dates">
                  {formatearFecha(formData.fecha_inicio)} - {formatearFecha(formData.fecha_final)}
                </span>
              </div>
              
              <div className="liquidaciones-module-week-navigation">
                <button
                  type="button"
                  className="liquidaciones-module-week-nav-btn"
                  onClick={() => {
                    const currentStart = new Date(formData.fecha_inicio)
                    const previousMonday = new Date(currentStart)
                    previousMonday.setDate(currentStart.getDate() - 7)
                    const previousSunday = new Date(previousMonday)
                    previousSunday.setDate(previousMonday.getDate() + 6)
                    
                    setFormData(prev => ({
                      ...prev,
                      fecha_inicio: formatDateToISO(previousMonday),
                      fecha_final: formatDateToISO(previousSunday)
                    }))
                  }}
                >
                  ← Semana Anterior
                </button>
                
                <button
                  type="button"
                  className="liquidaciones-module-week-nav-btn"
                  onClick={() => {
                    const currentStart = new Date(formData.fecha_inicio)
                    const nextMonday = new Date(currentStart)
                    nextMonday.setDate(currentStart.getDate() + 7)
                    const nextSunday = new Date(nextMonday)
                    nextSunday.setDate(nextMonday.getDate() + 6)
                    
                    setFormData(prev => ({
                      ...prev,
                      fecha_inicio: formatDateToISO(nextMonday),
                      fecha_final: formatDateToISO(nextSunday)
                    }))
                  }}
                >
                  Semana Siguiente →
                </button>
              </div>
              
              <div className="liquidaciones-module-week-calendar">
                <div className="liquidaciones-module-calendar-header">
                  <span>L</span>
                  <span>M</span>
                  <span>M</span>
                  <span>J</span>
                  <span>V</span>
                  <span>S</span>
                  <span>D</span>
                </div>
                <div className="liquidaciones-module-calendar-week">
                  {(() => {
                    const startDate = new Date(formData.fecha_inicio)
                    const days = []
                    for (let i = 0; i < 7; i++) {
                      const currentDate = new Date(startDate)
                      currentDate.setDate(startDate.getDate() + i)
                      const isSelected = currentDate.toISOString().split('T')[0] >= formData.fecha_inicio && 
                                       currentDate.toISOString().split('T')[0] <= formData.fecha_final
                      days.push(
                        <div 
                          key={i} 
                          className={`liquidaciones-module-calendar-day ${isSelected ? 'selected' : ''}`}
                        >
                          {currentDate.getDate()}
                        </div>
                      )
                    }
                    return days
                  })()}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="liquidaciones-module-admin-button primary"
              onClick={calcularCitasCompletadas}
              disabled={calculandoCitas || !formData.fecha_inicio || !formData.fecha_final}
            >
              {calculandoCitas ? (
                <>
                  <div className="spinner-small"></div>
                  Calculando...
                </>
              ) : (
                <>
                  <FaCalculator /> Calcular Servicios Completados
                </>
              )}
            </button>
          </div>

          {/* Sección de Resultados del Cálculo */}
          {citasCalculadas && (
            <div className="liquidaciones-module-form-section-compact">
              <h3>
                <FaCheckCircle className="liquidaciones-module-form-icon" /> Resumen de Servicios Completados
              </h3>
              <div className="liquidaciones-module-resumen-citas">
                <div className="liquidaciones-module-resumen-item">
                  <span>Total de Servicios Completados:</span>
                  <span className="liquidaciones-module-resumen-value">
                    {citasCalculadas.resumen_citas?.cantidad_citas || 0}
                  </span>
                </div>
                <div className="liquidaciones-module-resumen-item">
                  <span>Valor Total de Servicios:</span>
                  <span className="liquidaciones-module-resumen-value">
                    {formatPrice(citasCalculadas.resumen_citas?.total_citas_completadas || 0)}
                  </span>
                </div>
                <div className="liquidaciones-module-resumen-item destacado">
                  <span>Comisión 50%:</span>
                  <span className="liquidaciones-module-resumen-value">
                    {formatPrice(citasCalculadas.resumen_citas?.comision_50_porciento || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Valores */}
          <div className="liquidaciones-module-form-section-compact">
            <h3>
              <FaMoneyBillWave className="liquidaciones-module-form-icon" /> Valores de Liquidación
            </h3>
            <div className="liquidaciones-module-form-group">
              <label className="liquidaciones-module-form-group-label">Valor Base:</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.valor}
                readOnly // Campo de solo lectura
                className={`liquidaciones-module-form-group-input ${formErrors.valor ? "error" : ""}`}
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
              <small className="liquidaciones-module-form-help-text">Este valor se calcula automáticamente</small>
              {formErrors.valor && <div className="liquidaciones-module-error-text">{formErrors.valor}</div>}
            </div>

            <div className="liquidaciones-module-form-group">
              <label className="liquidaciones-module-form-group-label">Bonificación:</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.bonificacion}
                onChange={(e) => {
                  const value = e.target.value === "" ? "" : Math.round(Number(e.target.value) * 100) / 100
                  setFormData((prev) => ({ ...prev, bonificacion: value }))
                }}
                className={`liquidaciones-module-form-group-input ${formErrors.bonificacion ? "error" : ""}`}
                placeholder="Ingrese bonificación (opcional)"
              />
              {formErrors.bonificacion && (
                <div className="liquidaciones-module-error-text">{formErrors.bonificacion}</div>
              )}
            </div>

            {/* Error de servicios */}
            {formErrors.servicios && (
              <div className="liquidaciones-module-error-message">
                <div className="liquidaciones-module-error-text">{formErrors.servicios}</div>
              </div>
            )}

            <div className="liquidaciones-module-total-section">
              <div className="liquidaciones-module-total-row">
                <span>Subtotal (Sin 50%):</span>
                <span className="liquidaciones-module-total-value">
                  {formatPrice((citasCalculadas?.resumen_citas?.total_citas_completadas || 0) + Number(formData.bonificacion || 0))}
                </span>
              </div>
              <div className="liquidaciones-module-total-row destacado">
                <span>Total a Pagar:</span>
                <span className="liquidaciones-module-total-value">
                  {formatPrice(Number(formData.valor) + Number(formData.bonificacion || 0))}
                </span>
              </div>
            </div>
          </div>



          {/* Detalle de Citas (si están calculadas) - Tabla con paginación */}
          {citasCalculadas?.citas_detalle && citasCalculadas.citas_detalle.length > 0 && (
            <div className="liquidaciones-module-form-section-compact full-width-section">
              <h3>
                <FaClock className="liquidaciones-module-form-icon" /> Detalle de Servicios Completados
              </h3>
              
              {/* Tabla de servicios */}
              <div className="liquidaciones-module-citas-table-container">
                <table className="liquidaciones-module-citas-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Cliente</th>
                      <th>Servicios</th>
                      <th>Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citasCalculadas.citas_detalle
                      .slice((citasCurrentPage - 1) * citasItemsPerPage, citasCurrentPage * citasItemsPerPage)
                      .map((cita, index) => (
                        <tr key={index}>
                          <td>{formatearFecha(cita.fecha)}</td>
                          <td>{cita.hora}</td>
                          <td>{cita.cliente}</td>
                          <td>{Array.isArray(cita.servicios) ? cita.servicios.join(", ") : "Servicio"}</td>
                          <td>{formatPrice(cita.precio_total)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                
                {/* Paginación para servicios */}
                {citasCalculadas.citas_detalle.length > citasItemsPerPage && (
                  <div className="liquidaciones-module-citas-pagination">
                    <button
                      className="liquidaciones-module-pagination-button"
                      onClick={() => setCitasCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={citasCurrentPage === 1}
                    >
                      &lt; Anterior
                    </button>
                    
                    <span className="liquidaciones-module-pagination-info">
                      Página {citasCurrentPage} de {Math.ceil(citasCalculadas.citas_detalle.length / citasItemsPerPage)}
                    </span>
                    
                    <button
                      className="liquidaciones-module-pagination-button"
                      onClick={() => setCitasCurrentPage(prev => Math.min(Math.ceil(citasCalculadas.citas_detalle.length / citasItemsPerPage), prev + 1))}
                      disabled={citasCurrentPage >= Math.ceil(citasCalculadas.citas_detalle.length / citasItemsPerPage)}
                    >
                      Siguiente &gt;
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // VISTA DE DETALLE
  const renderDetailView = () => (
    <div className="liquidaciones-module">
      <div className="liquidaciones-module-admin-container">
        <div className="liquidaciones-module-form-header">
          <div className="liquidaciones-module-form-header-left">
            <button
              className="liquidaciones-module-admin-button secondary"
              onClick={() => setCurrentView("main")}
            >
              <FaArrowLeft /> Volver
            </button>
          </div>
          <h1 className="liquidaciones-module-form-title">Detalle de Liquidación</h1>
          <div className="liquidaciones-module-form-header-right"></div>
        </div>

        <div className="liquidaciones-module-detail-view-grid">
          {/* Información de la Liquidación */}
          <div className="liquidaciones-module-detail-section">
            <h3>
              <FaFileInvoiceDollar className="liquidaciones-module-form-icon" /> Información de la Liquidación
            </h3>
            <div className="liquidaciones-module-detail-info-grid">
              <div className="liquidaciones-module-detail-info-item">
                <span className="liquidaciones-module-detail-label">Manicurista:</span>
                                 <span className="liquidaciones-module-detail-value">
                   {(() => {
                     const manicurista = selectedLiquidacion?.manicurista;
                     if (typeof manicurista === 'object' && manicurista !== null) {
                       return manicurista.nombre || manicurista.nombres || manicurista.name || "No disponible";
                     }
                     return manicurista || "No disponible";
                   })()}
                 </span>
              </div>
              <div className="liquidaciones-module-detail-info-item">
                <span className="liquidaciones-module-detail-label">Período:</span>
                <span className="liquidaciones-module-detail-value">
                  {formatearFecha(selectedLiquidacion?.fecha_inicio)} -{" "}
                  {formatearFecha(selectedLiquidacion?.fecha_final)}
                </span>
              </div>
              <div className="liquidaciones-module-detail-info-item">
                <span className="liquidaciones-module-detail-label">Fecha de Creación:</span>
                <span className="liquidaciones-module-detail-value">
                  {selectedLiquidacion?.fecha_creacion
                    ? new Date(selectedLiquidacion.fecha_creacion).toLocaleDateString("es-CO")
                    : "No disponible"}
                </span>
              </div>
            </div>
          </div>

          {/* Valores */}
          <div className="liquidaciones-module-detail-section">
            <h3>
              <FaMoneyBillWave className="liquidaciones-module-form-icon" /> Valores
            </h3>
            <div className="liquidaciones-module-detail-info-grid">
              <div className="liquidaciones-module-detail-info-item">
                <span className="liquidaciones-module-detail-label">Valor Base:</span>
                <span className="liquidaciones-module-detail-value">
                  {formatPrice(selectedLiquidacion?.valor || 0)}
                </span>
              </div>
              <div className="liquidaciones-module-detail-info-item">
                <span className="liquidaciones-module-detail-label">Bonificación:</span>
                <span className="liquidaciones-module-detail-value">
                  {formatPrice(selectedLiquidacion?.bonificacion || 0)}
                </span>
              </div>
              <div className="liquidaciones-module-detail-info-item">
                <span className="liquidaciones-module-detail-label">Total a Pagar:</span>
                <span className="liquidaciones-module-detail-value total-destacado">
                  {formatPrice(selectedLiquidacion?.total_a_pagar || 0)}
                </span>
              </div>
              <div className="liquidaciones-module-detail-info-item">
                <span className="liquidaciones-module-detail-label">Servicios Completados:</span>
                <span className="liquidaciones-module-detail-value">
                  {selectedLiquidacion?.cantidad_servicios_completados || 0}
                </span>
              </div>
              <div className="liquidaciones-module-detail-info-item">
                <span className="liquidaciones-module-detail-label">Total Servicios:</span>
                <span className="liquidaciones-module-detail-value">
                  {formatPrice(selectedLiquidacion?.total_servicios_completados || 0)}
                </span>
              </div>
            </div>
          </div>

                     {/* Observaciones */}
           {selectedLiquidacion?.observaciones && (
             <div className="liquidaciones-module-detail-section" style={{ gridColumn: "1 / -1" }}>
               <h3>
                 <FaStickyNote className="liquidaciones-module-form-icon" /> Observaciones
               </h3>
               <div className="liquidaciones-module-observaciones-detalle-content">
                 <p>{selectedLiquidacion.observaciones}</p>
               </div>
             </div>
           )}

           {/* Tabla de Servicios Detallados */}
           <div className="liquidaciones-module-detail-section" style={{ gridColumn: "1 / -1" }}>
             <h3>
               <FaClipboardList className="liquidaciones-module-form-icon" /> 
               Detalle de Servicios Completados ({citasDetalle.length} servicios)
             </h3>
             
             {loadingCitasDetalle ? (
               <div className="liquidaciones-module-loading-container">
                 <div className="liquidaciones-module-spinner"></div>
                 <p>Cargando detalles de servicios...</p>
               </div>
             ) : citasDetalle.length > 0 ? (
               <>
                 {/* Filtros para servicios detalle */}
                 <div className="liquidaciones-module-servicios-filters">
                   <div className="liquidaciones-module-search-container">
                     <FaSearch className="liquidaciones-module-search-icon" />
                     <input
                       type="text"
                       placeholder="Buscar servicios por cliente, fecha, hora..."
                       value={citasDetalleSearchTerm}
                       onChange={(e) => {
                         setCitasDetalleSearchTerm(e.target.value)
                         setCitasDetalleCurrentPage(1)
                       }}
                       className="liquidaciones-module-search-input"
                     />
                   </div>

                   <div className="liquidaciones-module-items-per-page">
                     <span>Mostrar:</span>
                     <select
                       value={citasDetalleItemsPerPage}
                       onChange={(e) => {
                         setCitasDetalleItemsPerPage(Number(e.target.value))
                         setCitasDetalleCurrentPage(1)
                       }}
                       className="liquidaciones-module-items-select"
                     >
                       <option value={5}>5</option>
                       <option value={10}>10</option>
                       <option value={20}>20</option>
                       <option value={50}>50</option>
                     </select>
                   </div>
                 </div>

                 {/* Tabla de servicios detalle */}
                 <div className="liquidaciones-module-table-container">
                   <table className="liquidaciones-module-admin-table liquidaciones-module-servicios-table">
                     <thead>
                       <tr>
                         <th>Fecha</th>
                         <th>Hora</th>
                         <th>Cliente</th>
                         <th>Servicios</th>
                         <th>Precio</th>
                       </tr>
                     </thead>
                     <tbody>
                       {getFilteredAndPaginatedCitasDetalle().length > 0 ? (
                         getFilteredAndPaginatedCitasDetalle().map((cita, index) => (
                           <tr key={cita.id || index}>
                             <td>
                               <div className="liquidaciones-module-service-info">
                                 <div className="liquidaciones-module-service-name">
                                   {formatearFecha(cita.fecha)}
                                 </div>
                               </div>
                             </td>
                             <td>
                               <div className="liquidaciones-module-service-info">
                                 <div className="liquidaciones-module-service-name">
                                   {cita.hora}
                                 </div>
                               </div>
                             </td>
                             <td>
                               <div className="liquidaciones-module-service-info">
                                 <div className="liquidaciones-module-service-name">
                                   {cita.cliente?.nombre || "Cliente"}
                                 </div>
                                 {cita.cliente?.documento && (
                                   <div className="liquidaciones-module-service-description">
                                     Doc: {cita.cliente.documento}
                                   </div>
                                 )}
                               </div>
                             </td>
                             <td>
                               <div className="liquidaciones-module-service-info">
                                 <div className="liquidaciones-module-service-name">
                                   {Array.isArray(cita.servicios) 
                                     ? cita.servicios.map(s => s.nombre).join(", ") 
                                     : "Servicio"}
                                 </div>
                                 {Array.isArray(cita.servicios) && cita.servicios.length > 1 && (
                                   <div className="liquidaciones-module-service-description">
                                     {cita.servicios.length} servicios
                                   </div>
                                 )}
                               </div>
                             </td>
                             <td>
                               <div className="liquidaciones-module-service-info">
                                 <div className="liquidaciones-module-service-name">
                                   {formatPrice(cita.precio_total)}
                                 </div>
                               </div>
                             </td>
                           </tr>
                         ))
                       ) : (
                         <tr>
                           <td colSpan="5" className="liquidaciones-module-no-data">
                             {citasDetalleSearchTerm ? "No se encontraron servicios que coincidan con la búsqueda." : "No hay servicios para mostrar."}
                           </td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                 </div>

                 {/* Paginación de servicios detalle */}
                 {totalCitasDetallePages > 1 && (
                   <div className="liquidaciones-module-pagination">
                     <button
                       className="liquidaciones-module-pagination-button"
                       onClick={() => paginateCitasDetalle(1)}
                       disabled={citasDetalleCurrentPage === 1}
                     >
                       &laquo;
                     </button>
                     <button
                       className="liquidaciones-module-pagination-button"
                       onClick={() => paginateCitasDetalle(citasDetalleCurrentPage - 1)}
                       disabled={citasDetalleCurrentPage === 1}
                     >
                       &lt;
                     </button>

                     <div className="liquidaciones-module-pagination-info">
                       Página {citasDetalleCurrentPage} de {totalCitasDetallePages}
                     </div>

                     <button
                       className="liquidaciones-module-pagination-button"
                       onClick={() => paginateCitasDetalle(citasDetalleCurrentPage + 1)}
                       disabled={citasDetalleCurrentPage === totalCitasDetallePages}
                     >
                       &gt;
                     </button>
                     <button
                       className="liquidaciones-module-pagination-button"
                       onClick={() => paginateCitasDetalle(totalCitasDetallePages)}
                       disabled={citasDetalleCurrentPage === totalCitasDetallePages}
                     >
                       &raquo;
                     </button>
                   </div>
                 )}

                 {/* Resumen de servicios detalle */}
                 <div className="liquidaciones-module-total-section">
                   <div className="liquidaciones-module-total-row">
                     <span>Total de Servicios:</span>
                     <span className="liquidaciones-module-total-value">
                       {getFilteredCitasDetalle().length} servicios
                     </span>
                   </div>
                   <div className="liquidaciones-module-total-row">
                     <span>Valor Total de Servicios:</span>
                     <span className="liquidaciones-module-total-value">
                       {formatPrice(getFilteredCitasDetalle().reduce((sum, cita) => sum + (cita.precio_total || 0), 0))}
                     </span>
                   </div>
                 </div>
               </>
             ) : (
               <div className="liquidaciones-module-no-servicios">
                 <p>No se encontraron servicios completados para esta liquidación.</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  )

  // VISTA DE EDICIÓN
  const renderEditView = () => {
    if (!selectedLiquidacion) {
      setCurrentView("main")
      showNotification("No se pudo cargar la liquidación para edición. Intente de nuevo.", "error")
      return null
    }

    return (
      <div className="liquidaciones-module">
        <div className="liquidaciones-module-admin-container">
          <div className="liquidaciones-module-form-header">
            <div className="liquidaciones-module-form-header-left">
              <button
                className="liquidaciones-module-admin-button secondary"
                onClick={() => setCurrentView("main")}
              >
                <FaArrowLeft /> Volver
              </button>
            </div>
            <h1 className="liquidaciones-module-form-title">Editar Liquidación</h1>
            <div className="liquidaciones-module-form-header-right">
              <button
                className="liquidaciones-module-admin-button primary"
                onClick={handleUpdateLiquidacion}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
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

          <div className="liquidaciones-module-detail-view-grid">
            {/* Información de la Liquidación */}
            <div className="liquidaciones-module-detail-section">
              <h3>
                <FaFileInvoiceDollar className="liquidaciones-module-form-icon" /> Información de la Liquidación
              </h3>
              <div className="liquidaciones-module-detail-info-grid">
                <div className="liquidaciones-module-detail-info-item">
                  <span className="liquidaciones-module-detail-label">Manicurista:</span>
                  <span className="liquidaciones-module-detail-value">
                    {selectedLiquidacion?.manicurista?.nombre || "No disponible"}
                  </span>
                </div>
                <div className="liquidaciones-module-detail-info-item">
                  <span className="liquidaciones-module-detail-label">Período:</span>
                  <span className="liquidaciones-module-detail-value">
                    {formatearFecha(selectedLiquidacion?.fecha_inicio)} -{" "}
                    {formatearFecha(selectedLiquidacion?.fecha_final)}
                  </span>
                </div>
                <div className="liquidaciones-module-detail-info-item">
                  <span className="liquidaciones-module-detail-label">Servicios Completados:</span>
                  <span className="liquidaciones-module-detail-value">
                    {selectedLiquidacion?.cantidad_servicios_completados || 0}
                  </span>
                </div>
                <div className="liquidaciones-module-detail-info-item">
                  <span className="liquidaciones-module-detail-label">Total Servicios:</span>
                  <span className="liquidaciones-module-detail-value">
                    {formatPrice(selectedLiquidacion?.total_servicios_completados || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Edición de Valores */}
            <div className="liquidaciones-module-detail-section">
              <h3>
                <FaEdit className="liquidaciones-module-form-icon" /> Editar Liquidación
              </h3>
              <div className="liquidaciones-module-form-group">
                <label className="liquidaciones-module-form-group-label">Valor Base:</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.valor}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, valor: Number(e.target.value) }))}
                  className="liquidaciones-module-form-group-input"
                />
              </div>

              <div className="liquidaciones-module-form-group">
                <label className="liquidaciones-module-form-group-label">Bonificación:</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.bonificacion}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, bonificacion: Number(e.target.value) }))}
                  className="liquidaciones-module-form-group-input"
                />
              </div>

              <div className="liquidaciones-module-form-group">
                <label className="liquidaciones-module-form-group-label">Observaciones:</label>
                <textarea
                  value={editFormData.observaciones}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, observaciones: e.target.value }))}
                  className="liquidaciones-module-form-group-textarea"
                  rows="4"
                  placeholder="Observaciones adicionales..."
                />
              </div>

              <div className="liquidaciones-module-total-section">
                <div className="liquidaciones-module-total-row">
                  <span>Total a Pagar:</span>
                  <span className="liquidaciones-module-total-value">
                    {formatPrice(Number(editFormData.valor) + Number(editFormData.bonificacion))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // VISTA DE LIQUIDACIONES
  const renderLiquidacionesView = () => (
    <div className="liquidaciones-module">
      <div className="liquidaciones-module-admin-container">
        <Toaster />

        <div className="liquidaciones-module-admin-content-wrapper">
          <div className="liquidaciones-module-admin-header">
            <h1 className="liquidaciones-module-admin-title">Liquidaciones de {selectedManicurista?.nombre}</h1>
            <button
              className="liquidaciones-module-admin-button secondary"
              onClick={() => setCurrentView("manicuristas")}
            >
              <FaArrowLeft /> Volver
            </button>
          </div>

          <div className="liquidaciones-module-admin-filters">
            <div className="liquidaciones-module-search-container">
              <FaSearch className="liquidaciones-module-search-icon" />
              <input
                type="text"
                placeholder="Buscar liquidaciones..."
                value={liquidacionesSearchTerm}
                onChange={(e) => setLiquidacionesSearchTerm(e.target.value)}
                className="liquidaciones-module-search-input"
              />
            </div>

            <div className="liquidaciones-module-items-per-page">
              <span>Mostrar:</span>
              <select
                value={liquidacionesItemsPerPage}
                onChange={(e) => setLiquidacionesItemsPerPage(Number(e.target.value))}
                className="liquidaciones-module-items-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="liquidaciones-module-loading-container">
              <div className="liquidaciones-module-spinner"></div>
              <p>Cargando liquidaciones...</p>
            </div>
          ) : (
            <div className="liquidaciones-module-table-container">
              <table className="liquidaciones-module-admin-table">
                <thead>
                  <tr>
                    <th onClick={() => handleLiquidacionesSort("fecha_inicio")}>
                      Período {renderLiquidacionesSortIndicator("fecha_inicio")}
                    </th>
                    <th onClick={() => handleLiquidacionesSort("valor")}>
                      Valor {renderLiquidacionesSortIndicator("valor")}
                    </th>
                    <th>Servicios</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentPageLiquidaciones().length > 0 ? (
                    getCurrentPageLiquidaciones().map((liquidacion) => (
                      <tr key={liquidacion.id}>
                        <td>
                          <div className="liquidaciones-module-service-info">
                            <div className="liquidaciones-module-service-name">
                              {formatearFecha(liquidacion.fecha_inicio)} - {formatearFecha(liquidacion.fecha_final)}
                            </div>
                            <div className="liquidaciones-module-service-description">
                              {liquidacion.fecha_creacion
                                ? `Creada: ${new Date(liquidacion.fecha_creacion).toLocaleDateString("es-CO")}`
                                : "Fecha no disponible"}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="liquidaciones-module-service-info">
                            <div className="liquidaciones-module-service-name">
                              {formatPrice(liquidacion.total_a_pagar || 0)}
                            </div>
                            <div className="liquidaciones-module-service-description">
                              Base: {formatPrice(liquidacion.valor || 0)} + Bonif:{" "}
                              {formatPrice(liquidacion.bonificacion || 0)}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="liquidaciones-module-service-info">
                            <div className="liquidaciones-module-service-name">
                              {liquidacion.cantidad_servicios_completados || 0} servicios
                            </div>
                            <div className="liquidaciones-module-service-description">
                              Total: {formatPrice(liquidacion.total_servicios_completados || 0)}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <PermissionButton
                              modulo="liquidaciones"
                              accion="ver_detalles"
                              className="action-button view"
                              onClick={() => handleVerDetalle(liquidacion)}
                              title="Ver detalles"
                              hidden={true}
                            >
                              <FaEye />
                            </PermissionButton>
                            <PermissionButton
                              modulo="liquidaciones"
                              accion="editar"
                              className="action-button edit"
                              onClick={() => handleEditLiquidacion(liquidacion)}
                              title="Editar liquidación"
                              hidden={true}
                            >
                              <FaEdit />
                            </PermissionButton>
                            <button
                              className="action-button success"
                              onClick={() => handleGeneratePDF(liquidacion)}
                              title="Generar PDF"
                              disabled={generatingPDF}
                            >
                              {generatingPDF ? (
                                <div className="spinner-small"></div>
                              ) : (
                                <FaFilePdf />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="liquidaciones-module-no-data">
                        No se encontraron liquidaciones para esta manicurista.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalLiquidacionesPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-button"
                onClick={() => paginateLiquidaciones(1)}
                disabled={liquidacionesCurrentPage === 1}
              >
                &laquo;
              </button>
              <button
                className="pagination-button"
                onClick={() => paginateLiquidaciones(liquidacionesCurrentPage - 1)}
                disabled={liquidacionesCurrentPage === 1}
              >
                &lt;
              </button>

              <div className="pagination-info">
                Página {liquidacionesCurrentPage} de {totalLiquidacionesPages}
              </div>

              <button
                className="pagination-button"
                onClick={() => paginateLiquidaciones(liquidacionesCurrentPage + 1)}
                disabled={liquidacionesCurrentPage === totalLiquidacionesPages}
              >
                &gt;
              </button>
              <button
                className="pagination-button"
                onClick={() => paginateLiquidaciones(totalLiquidacionesPages)}
                disabled={liquidacionesCurrentPage === totalLiquidacionesPages}
              >
                &raquo;
              </button>
            </div>
        )}
      </div>
    </div>
  )

  // VISTA DE SELECCIÓN DE MANICURISTA PARA NUEVA LIQUIDACIÓN
  const renderSelectManicuristaView = () => (
    <div className="liquidaciones-module">
      <div className="liquidaciones-module-admin-container">
        <div className="liquidaciones-module-admin-content-wrapper">
          <div className="liquidaciones-module-admin-header">
            <h1 className="liquidaciones-module-admin-title">Seleccionar Manicurista</h1>
            <div className="liquidaciones-module-header-actions">
              {selectedManicuristas.length > 0 && (
                <button
                  className="liquidaciones-module-admin-button success"
                  onClick={handleCreateGlobalLiquidaciones}
                >
                  <FaFileInvoiceDollar /> Liquidaciones Globales ({selectedManicuristas.length})
                </button>
              )}
              <button
                className="liquidaciones-module-admin-button secondary"
                onClick={() => {
                  setCurrentView("main")
                  setSelectedManicuristas([])
                }}
              >
                <FaArrowLeft /> Volver
              </button>
            </div>
          </div>

          <div className="liquidaciones-module-admin-filters">
            <div className="liquidaciones-module-search-container">
              <FaSearch className="liquidaciones-module-search-icon" />
              <input
                type="text"
                placeholder="Buscar manicuristas..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="liquidaciones-module-search-input"
              />
            </div>

            <div className="liquidaciones-module-selection-controls">
              <button
                className="liquidaciones-module-admin-button secondary"
                onClick={handleSelectAllManicuristas}
              >
                {filteredAndPaginatedManicuristas().every(manicurista => 
                  selectedManicuristas.some(selected => selected.id === manicurista.id)
                ) ? "Deseleccionar Todo" : "Seleccionar Todo"}
              </button>
              {selectedManicuristas.length > 0 && (
                <span className="liquidaciones-module-selection-count">
                  {selectedManicuristas.length} seleccionadas
                </span>
              )}
            </div>

            <div className="liquidaciones-module-items-per-page">
              <span>Mostrar:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="liquidaciones-module-items-select"
              >
                <option value={8}>8</option>
                <option value={16}>16</option>
                <option value={24}>24</option>
                <option value={32}>32</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="liquidaciones-module-loading-container">
            <div className="liquidaciones-module-spinner"></div>
            <p>Cargando manicuristas...</p>
          </div>
        ) : error ? (
          <div className="liquidaciones-module-error-container">
            <p>{error}</p>
            <button className="liquidaciones-module-admin-button secondary" onClick={fetchManicuristas}>
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <div className="liquidaciones-module-manicuristas-grid">
              {filteredAndPaginatedManicuristas().map((manicurista) => {
                const isSelected = selectedManicuristas.some(selected => selected.id === manicurista.id)
                return (
                  <div key={manicurista.id} className={`liquidaciones-module-manicurista-card ${isSelected ? 'selected' : ''}`}>
                    <div className="liquidaciones-module-card-border"></div>
                    <div className="liquidaciones-module-manicurista-content">
                      <div className="liquidaciones-module-manicurista-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleManicuristaSelection(manicurista)}
                          className="liquidaciones-module-checkbox-input"
                        />
                      </div>
                      <div className="liquidaciones-module-manicurista-avatar">
                        <FaUserMd />
                      </div>
                      <h3 className="liquidaciones-module-manicurista-nombre">
                        {manicurista.nombre || manicurista.nombres || manicurista.name || "Manicurista"}
                      </h3>
                      <p className="liquidaciones-module-manicurista-especialidad">Especialista en manicure</p>

                      <div className="liquidaciones-module-manicurista-actions">
                        <PermissionButton
                          modulo="liquidaciones"
                          accion="crear"
                          className="liquidaciones-module-btn-nueva-liquidacion"
                          onClick={() => handleSelectManicurista(manicurista)}
                          hidden={true}
                        >
                          <FaFileInvoiceDollar /> Crear Liquidación
                        </PermissionButton>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="liquidaciones-module-pagination">
                <button
                  className="liquidaciones-module-pagination-button"
                  onClick={() => paginate(1)}
                  disabled={currentPage === 1}
                >
                  &laquo;
                </button>
                <button
                  className="liquidaciones-module-pagination-button"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>

                <div className="liquidaciones-module-pagination-info">
                  Página {currentPage} de {totalPages}
                </div>

                <button
                  className="liquidaciones-module-pagination-button"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </button>
                <button
                  className="liquidaciones-module-pagination-button"
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

  // VISTA DE LIQUIDACIONES GLOBALES
  const renderGlobalLiquidacionesView = () => (
    <div className="liquidaciones-module">
      <div className="liquidaciones-module-admin-container">
        <div className="liquidaciones-module-form-header">
          <div className="liquidaciones-module-form-header-left">
            <button
              className="liquidaciones-module-admin-button secondary"
              onClick={() => {
                setCurrentView("selectManicurista")
                setGlobalLiquidaciones([])
              }}
            >
              <FaArrowLeft /> Volver
            </button>
          </div>
          <h1 className="liquidaciones-module-form-title">
            Liquidaciones Globales - {selectedManicuristas.length} Manicuristas
          </h1>
          <div className="liquidaciones-module-form-header-right">
            <PermissionButton
              modulo="liquidaciones"
              accion="crear"
              className="liquidaciones-module-admin-button primary"
              onClick={handleCreateAllGlobalLiquidaciones}
              disabled={loading || globalLiquidaciones.length === 0}
              hidden={true}
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Creando...
                </>
              ) : (
                <>
                  <FaSave /> Crear Todas las Liquidaciones
                </>
              )}
            </PermissionButton>
          </div>
        </div>

        {generalError && <div className="liquidaciones-module-general-error">{generalError}</div>}

        <div className="liquidaciones-module-form-content-compact">
          {/* Sección de Período - Reutilizando la misma lógica */}
          <div className="liquidaciones-module-form-section-compact">
            <h3>
              <FaCalendarAlt className="liquidaciones-module-form-icon" /> Período de Liquidación (Semana)
            </h3>
            
            <div className="liquidaciones-module-global-week-selector">
              <div className="liquidaciones-module-global-week-info">
                <span className="liquidaciones-module-week-label">Semana seleccionada:</span>
                <span className="liquidaciones-module-week-dates">
                  {formatearFecha(formData.fecha_inicio)} - {formatearFecha(formData.fecha_final)}
                </span>
              </div>
              
              <div className="liquidaciones-module-global-week-navigation">
                <button
                  type="button"
                  className="liquidaciones-module-week-nav-btn"
                  onClick={() => {
                    const currentStart = new Date(formData.fecha_inicio)
                    const previousMonday = new Date(currentStart)
                    previousMonday.setDate(currentStart.getDate() - 7)
                    const previousSunday = new Date(previousMonday)
                    previousSunday.setDate(previousMonday.getDate() + 6)
                    
                    setFormData(prev => ({
                      ...prev,
                      fecha_inicio: formatDateToISO(previousMonday),
                      fecha_final: formatDateToISO(previousSunday)
                    }))
                  }}
                >
                  ← Semana Anterior
                </button>
                
                <button
                  type="button"
                  className="liquidaciones-module-week-nav-btn"
                  onClick={() => {
                    const currentStart = new Date(formData.fecha_inicio)
                    const nextMonday = new Date(currentStart)
                    nextMonday.setDate(currentStart.getDate() + 7)
                    const nextSunday = new Date(nextMonday)
                    nextSunday.setDate(nextMonday.getDate() + 6)
                    
                    setFormData(prev => ({
                      ...prev,
                      fecha_inicio: formatDateToISO(nextMonday),
                      fecha_final: formatDateToISO(nextSunday)
                    }))
                  }}
                >
                  Semana Siguiente →
                </button>
              </div>
              
              <div className="liquidaciones-module-global-week-calendar">
                <div className="liquidaciones-module-calendar-header">
                  <span>L</span>
                  <span>M</span>
                  <span>M</span>
                  <span>J</span>
                  <span>V</span>
                  <span>S</span>
                  <span>D</span>
                </div>
                <div className="liquidaciones-module-calendar-week">
                  {(() => {
                    const startDate = new Date(formData.fecha_inicio)
                    const days = []
                    for (let i = 0; i < 7; i++) {
                      const currentDate = new Date(startDate)
                      currentDate.setDate(startDate.getDate() + i)
                      const isSelected = currentDate.toISOString().split('T')[0] >= formData.fecha_inicio && 
                                       currentDate.toISOString().split('T')[0] <= formData.fecha_final
                      days.push(
                        <div 
                          key={i} 
                          className={`liquidaciones-module-global-calendar-day ${isSelected ? 'selected' : ''}`}
                        >
                          {currentDate.getDate()}
                        </div>
                      )
                    }
                    return days
                  })()}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="liquidaciones-module-admin-button primary liquidaciones-module-global-calculate-btn"
              onClick={calcularLiquidacionesGlobales}
              disabled={calculandoGlobales || !formData.fecha_inicio || !formData.fecha_final}
            >
              {calculandoGlobales ? (
                <>
                  <div className="spinner-small"></div>
                  Calculando...
                </>
              ) : (
                <>
                  <FaCalculator /> Calcular Liquidaciones Globales
                </>
              )}
            </button>
          </div>

          {/* Tabla de Liquidaciones Globales */}
          {globalLiquidaciones.length > 0 && (
            <div className="liquidaciones-module-form-section-compact full-width-section">
              <h3>
                <FaClipboardList className="liquidaciones-module-form-icon" /> Resumen de Liquidaciones
              </h3>
              
              <div className="liquidaciones-module-table-container">
                <table className="liquidaciones-module-admin-table">
                  <thead>
                    <tr>
                      <th>Manicurista</th>
                      <th>Valor Calculado</th>
                      <th>Bonificación</th>
                      <th>Total a Pagar</th>
                      <th>Servicios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalLiquidaciones.map((liquidacion, index) => (
                      <tr key={liquidacion.manicurista.id}>
                        <td>
                          <div className="liquidaciones-module-service-info">
                            <div className="liquidaciones-module-service-name">
                              {liquidacion.manicurista.nombre || liquidacion.manicurista.nombres || liquidacion.manicurista.name || "Manicurista"}
                            </div>
                            <div className="liquidaciones-module-service-description">
                              ID: {liquidacion.manicurista.id}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="liquidaciones-module-service-info">
                            <div className="liquidaciones-module-service-name">
                              {formatPrice(liquidacion.valor)}
                            </div>
                            <div className="liquidaciones-module-service-description">
                              {liquidacion.citasCalculadas?.resumen_citas?.cantidad_citas || 0} citas
                            </div>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={liquidacion.bonificacion}
                            onChange={(e) => handleUpdateGlobalBonificacion(liquidacion.manicurista.id, e.target.value)}
                            className="liquidaciones-module-form-group-input"
                            placeholder="0.00"
                            style={{ width: '120px' }}
                          />
                        </td>
                        <td>
                          <div className="liquidaciones-module-service-info">
                            <div className="liquidaciones-module-service-name">
                              {formatPrice(liquidacion.total_a_pagar)}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="liquidaciones-module-service-info">
                            <div className="liquidaciones-module-service-name">
                              {liquidacion.citasCalculadas?.resumen_citas?.cantidad_citas || 0}
                            </div>
                            <div className="liquidaciones-module-service-description">
                              {formatPrice(liquidacion.citasCalculadas?.resumen_citas?.total_citas_completadas || 0)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumen Total */}
              <div className="liquidaciones-module-total-section">
                <div className="liquidaciones-module-total-row">
                  <span>Total General a Pagar:</span>
                  <span className="liquidaciones-module-total-value">
                    {formatPrice(globalLiquidaciones.reduce((sum, liquidacion) => sum + liquidacion.total_a_pagar, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Servicios Detallados */}
          {serviciosGlobales.length > 0 && (
            <div className="liquidaciones-module-form-section-compact full-width-section">
              <h3>
                <FaClipboardList className="liquidaciones-module-form-icon" /> 
                Detalle de Servicios Completados ({serviciosGlobales.length} servicios)
              </h3>
              
              {/* Filtros para servicios */}
              <div className="liquidaciones-module-servicios-filters">
                <div className="liquidaciones-module-search-container">
                  <FaSearch className="liquidaciones-module-search-icon" />
                  <input
                    type="text"
                    placeholder="Buscar servicios por cliente, manicurista, fecha..."
                    value={serviciosSearchTerm}
                    onChange={(e) => {
                      setServiciosSearchTerm(e.target.value)
                      setServiciosCurrentPage(1)
                    }}
                    className="liquidaciones-module-search-input"
                  />
                </div>

                <div className="liquidaciones-module-items-per-page">
                  <span>Mostrar:</span>
                  <select
                    value={serviciosItemsPerPage}
                    onChange={(e) => {
                      setServiciosItemsPerPage(Number(e.target.value))
                      setServiciosCurrentPage(1)
                    }}
                    className="liquidaciones-module-items-select"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Tabla de servicios */}
              <div className="liquidaciones-module-table-container">
                <table className="liquidaciones-module-admin-table liquidaciones-module-servicios-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Cliente</th>
                      <th>Manicurista</th>
                      <th>Servicios</th>
                      <th>Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredAndPaginatedServicios().length > 0 ? (
                      getFilteredAndPaginatedServicios().map((servicio, index) => (
                        <tr key={index}>
                          <td>
                            <div className="liquidaciones-module-service-info">
                              <div className="liquidaciones-module-service-name">
                                {formatearFecha(servicio.fecha)}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="liquidaciones-module-service-info">
                              <div className="liquidaciones-module-service-name">
                                {servicio.hora}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="liquidaciones-module-service-info">
                              <div className="liquidaciones-module-service-name">
                                {servicio.cliente}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="liquidaciones-module-service-info">
                              <div className="liquidaciones-module-service-name">
                                {servicio.manicurista_nombre}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="liquidaciones-module-service-info">
                              <div className="liquidaciones-module-service-name">
                                {Array.isArray(servicio.servicios) ? servicio.servicios.join(", ") : "Servicio"}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="liquidaciones-module-service-info">
                              <div className="liquidaciones-module-service-name">
                                {formatPrice(servicio.precio_total)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="liquidaciones-module-no-data">
                          {serviciosSearchTerm ? "No se encontraron servicios que coincidan con la búsqueda." : "No hay servicios para mostrar."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación de servicios */}
              {totalServiciosPages > 1 && (
                <div className="liquidaciones-module-pagination">
                  <button
                    className="liquidaciones-module-pagination-button"
                    onClick={() => paginateServicios(1)}
                    disabled={serviciosCurrentPage === 1}
                  >
                    &laquo;
                  </button>
                  <button
                    className="liquidaciones-module-pagination-button"
                    onClick={() => paginateServicios(serviciosCurrentPage - 1)}
                    disabled={serviciosCurrentPage === 1}
                  >
                    &lt;
                  </button>

                  <div className="liquidaciones-module-pagination-info">
                    Página {serviciosCurrentPage} de {totalServiciosPages}
                  </div>

                  <button
                    className="liquidaciones-module-pagination-button"
                    onClick={() => paginateServicios(serviciosCurrentPage + 1)}
                    disabled={serviciosCurrentPage === totalServiciosPages}
                  >
                    &gt;
                  </button>
                  <button
                    className="liquidaciones-module-pagination-button"
                    onClick={() => paginateServicios(totalServiciosPages)}
                    disabled={serviciosCurrentPage === totalServiciosPages}
                  >
                    &raquo;
                  </button>
                </div>
              )}

              {/* Resumen de servicios */}
              <div className="liquidaciones-module-total-section">
                <div className="liquidaciones-module-total-row">
                  <span>Total de Servicios:</span>
                  <span className="liquidaciones-module-total-value">
                    {getFilteredServicios().length} servicios
                  </span>
                </div>
                <div className="liquidaciones-module-total-row">
                  <span>Valor Total de Servicios:</span>
                  <span className="liquidaciones-module-total-value">
                    {formatPrice(getFilteredServicios().reduce((sum, servicio) => sum + (servicio.precio_total || 0), 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Toaster />
      {currentView === "manicuristas" && renderManicuristasView()}
      {currentView === "selectManicurista" && renderSelectManicuristaView()}
      {currentView === "create" && renderFormView()}
      {currentView === "detail" && renderDetailView()}
      {currentView === "edit" && renderEditView()}
      {currentView === "liquidaciones" && renderLiquidacionesView()}
      {currentView === "globalLiquidaciones" && renderGlobalLiquidacionesView()}
      {currentView === "main" && renderMainLiquidacionesView()}
      {!currentView && renderMainLiquidacionesView()}
    </>
  )
}

export default Liquidaciones