"use client"

import { useState, useEffect, useCallback } from "react"
import AbastecimientosService from "../../service/AbastecimientosService"
import PermissionButton from "../../components/PermissionButton"
import PermissionWrapper from "../../components/PermissionWrapper"
import {
  FaPlus,
  FaTrash,
  FaSearch,
  FaEye,
  FaTimes,
  FaCalendarAlt,
  FaUser,
  FaBoxOpen,
  FaExclamationTriangle,
  FaUserCheck,
  FaArrowLeft,
  FaSave,
  FaChevronLeft,
  FaChevronRight,
  FaWarehouse,
  FaMinus,
  FaListAlt,
  FaSort, // Import for sorting
  FaSortUp, // Import for sorting
  FaSortDown, // Import for sorting
} from "react-icons/fa"
import toast, { Toaster } from "react-hot-toast"
import "../../styles/modals/AbastecimientosModal.css"
import CategoriaInsumoService from "../../service/CategoriaInsumoService" // Import CategoriaInsumoService

const Abastecimientos = () => {
  const [abastecimientos, setAbastecimientos] = useState([])
  const [manicuristas, setManicuristas] = useState([])
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Estados para controlar las vistas
  const [currentView, setCurrentView] = useState("list") // list, create, view, detail
  const [selectedManicurista, setSelectedManicurista] = useState(null)
  const [selectedAbastecimiento, setSelectedAbastecimiento] = useState(null)

  const [formData, setFormData] = useState({
    fecha: "",
    cantidad: "",
    manicurista: "",
  })
  const [formErrors, setFormErrors] = useState({})
  const [generalError, setGeneralError] = useState("")

  // Estados para la tabla de insumos en el formulario
  const [insumosAbastecimiento, setInsumosAbastecimiento] = useState([])
  const [insumoSeleccionado, setInsumoSeleccionado] = useState("") // Stores ID of selected insumo for form
  const [cantidadInsumo, setCantidadInsumo] = useState("")

  // Estados para paginación de insumos
  const [insumosCurrentPage, setInsumosCurrentPage] = useState(1)
  const [insumosPerPage] = useState(5)

  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState({
    key: "nombres",
    direction: "asc",
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(4)

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [abastecimientoToDelete, setAbastecimientoToDelete] = useState(null)

  const [actionTimeouts, setActionTimeouts] = useState(new Set())

  // NEW STATES for insumo selection modal
  const [showInsumoModal, setShowInsumoModal] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [busquedaInsumo, setBusquedaInsumo] = useState("")
  const [categorias, setCategorias] = useState([])

  // NEW STATES for abastecimientos table sorting
  const [abastecimientosSortConfig, setAbastecimientosSortConfig] = useState({
    key: "fecha",
    direction: "desc",
  })

  // Función para calcular la cantidad total automáticamente
  const calcularCantidadTotal = useCallback(() => {
    return insumosAbastecimiento.reduce((total, insumo) => {
      const cantidad = Number.parseInt(insumo.cantidad) || 0
      return total + cantidad
    }, 0)
  }, [insumosAbastecimiento])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [abastecimientosData, manicuristasData, insumosData, categoriasData] = await Promise.all([
          AbastecimientosService.getAbastecimientos(),
          AbastecimientosService.getManicuristas(),
          AbastecimientosService.getInsumos(),
          CategoriaInsumoService.getCategorias(), // Fetch categories
        ])

        console.log("Abastecimientos cargados:", abastecimientosData)
        console.log("Manicuristas cargadas:", manicuristasData)
        console.log("Insumos cargados:", insumosData)
        console.log("Categorías cargadas:", categoriasData)

        setAbastecimientos(abastecimientosData)
        setManicuristas(manicuristasData)
        setInsumos(insumosData)
        setCategorias(
          Array.isArray(categoriasData) && categoriasData.length > 0
            ? categoriasData
            : [{ id: 0, nombre: "Sin categoría" }],
        )
        setError(null)
      } catch (err) {
        showNotification("Error al cargar los datos. Por favor, intente nuevamente.", "error")
        console.error("Error al cargar datos:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Actualizar cantidad total cuando cambien los insumos
  useEffect(() => {
    const cantidadTotal = calcularCantidadTotal()
    setFormData((prev) => ({
      ...prev,
      cantidad: cantidadTotal.toString(),
    }))
  }, [insumosAbastecimiento, calcularCantidadTotal])

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

  const fetchAbastecimientos = async () => {
    try {
      setLoading(true)
      const abastecimientosData = await AbastecimientosService.getAbastecimientos()
      setAbastecimientos(abastecimientosData)
      setError(null)
    } catch (err) {
      showNotification("Error al cargar los abastecimientos.", "error")
      console.error("Error al cargar abastecimientos:", err)
    } finally {
      setLoading(false)
    }
  }

  // Funciones de navegación
  const handleBackToList = () => {
    setCurrentView("list")
    setSelectedManicurista(null)
    setSelectedAbastecimiento(null)
    resetForm()
  }

  const handleCreateNew = (manicurista = null) => {
    resetForm()
    setSelectedManicurista(manicurista)
    setFormData({
      fecha: new Date().toISOString().split("T")[0],
      cantidad: "",
      manicurista: manicurista ? manicurista.id : "",
    })
    setCurrentView("create")
  }

  const handleViewDetails = (manicurista) => {
    // Obtener todos los abastecimientos de la manicurista
    const abastecimientosManicurista = abastecimientos.filter((abastecimiento) => {
      const abastecimientoManicuristaId =
        typeof abastecimiento.manicurista === "object" ? abastecimiento.manicurista.id : abastecimiento.manicurista
      return abastecimientoManicuristaId === manicurista.id
    })

    // Ordenar por fecha (más recientes primero)
    const ordenados = abastecimientosManicurista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

    setSelectedManicurista(manicurista)
    setAbastecimientos(ordenados) // This state is used by renderDetailsView
    setCurrentView("view")
  }

  // ✅ NUEVA FUNCIÓN: Ver detalle de un abastecimiento específico
  const handleViewAbastecimientoDetail = (abastecimiento) => {
    setSelectedAbastecimiento(abastecimiento)
    setCurrentView("detail")
  }

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split("T")[0],
      cantidad: "",
      manicurista: "",
    })
    setInsumosAbastecimiento([])
    setInsumosCurrentPage(1)
    setFormErrors({})
    setGeneralError("")
    setInsumoSeleccionado("")
    setCantidadInsumo("")
    setFiltroCategoria("") // Reset filter
    setBusquedaInsumo("") // Reset search
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
    validateField(name, value)
  }

  // Validar fechas (igual que en Compras)
  const validarFecha = (fecha) => {
    const fechaSeleccionada = new Date(fecha)
    const hoy = new Date()
    const hace7Dias = new Date()
    hace7Dias.setDate(hoy.getDate() - 7)
    return fechaSeleccionada >= hace7Dias && fechaSeleccionada <= hoy
  }

  const validateField = useCallback(
    (fieldName, value) => {
      const errors = { ...formErrors }

      switch (fieldName) {
        case "fecha":
          if (!value) {
            errors.fecha = "La fecha es requerida"
          } else if (!validarFecha(value)) {
            errors.fecha = "La fecha debe estar entre hoy y máximo 7 días atrás"
          } else {
            delete errors.fecha
          }
          break

        case "manicurista":
          if (!value) {
            errors.manicurista = "La manicurista es requerida"
          } else {
            // Verificar que la manicurista esté activa
            const manicuristaSeleccionada = manicuristas.find((m) => m.id === Number.parseInt(value))
            if (manicuristaSeleccionada && manicuristaSeleccionada.estado?.toLowerCase() !== "activo") {
              errors.manicurista = "La manicurista seleccionada no está activa"
            } else {
              delete errors.manicurista
            }
          }
          break

        default:
          break
      }

      setFormErrors(errors)
      return Object.keys(errors).length === 0
    },
    [formErrors, manicuristas],
  )

  // ✅ CORREGIDO: Agregar insumo con validaciones de stock mínimo
  const agregarInsumo = () => {
    if (!insumoSeleccionado || !cantidadInsumo) {
      setGeneralError("Debe seleccionar un insumo y cantidad")
      showNotification("Debe seleccionar un insumo y cantidad", "error")
      return
    }

    const cantidad = Number.parseInt(cantidadInsumo)
    if (cantidad <= 0) {
      setGeneralError("La cantidad debe ser mayor a 0")
      showNotification("La cantidad debe ser mayor a 0", "error")
      return
    }

    const insumo = insumos.find((i) => i.id === Number.parseInt(insumoSeleccionado))
    if (!insumo) {
      setGeneralError("Insumo no encontrado")
      showNotification("Insumo no encontrado", "error")
      return
    }

    // ✅ VALIDACIÓN: Stock mínimo de 5 unidades
    if (insumo.cantidad < 5) {
      setGeneralError(
        `No se puede abastecer ${insumo.nombre}. Stock insuficiente (${insumo.cantidad} unidades). Mínimo requerido: 5 unidades.`,
      )
      showNotification(`Stock insuficiente para ${insumo.nombre}. Mínimo: 5 unidades`, "warning")
      return
    }

    // ✅ VALIDACIÓN: No se puede tomar más de lo disponible
    if (cantidad > insumo.cantidad) {
      setGeneralError(
        `No se pueden tomar ${cantidad} unidades de ${insumo.nombre}. Solo hay ${insumo.cantidad} disponibles.`,
      )
      showNotification(`Stock insuficiente. Solo hay ${insumo.cantidad} unidades disponibles`, "warning")
      return
    }

    // ✅ VALIDACIÓN: Después del abastecimiento debe quedar al menos 5 unidades
    const stockRestante = insumo.cantidad - cantidad
    if (stockRestante < 5) {
      setGeneralError(
        `Después del abastecimiento quedarían ${stockRestante} unidades de ${insumo.nombre}. Debe quedar un mínimo de 5 unidades.`,
      )
      showNotification(`Debe quedar un mínimo de 5 unidades en stock`, "warning")
      return
    }

    if (cantidad > 1000) {
      setGeneralError("La cantidad no puede ser mayor a 1000 unidades")
      showNotification("La cantidad no puede ser mayor a 1000 unidades", "error")
      return
    }

    const insumoExistente = insumosAbastecimiento.find((i) => i.insumo_id === insumo.id)
    if (insumoExistente) {
      setGeneralError("Este insumo ya está agregado al abastecimiento")
      showNotification("Este insumo ya está agregado al abastecimiento", "error")
      return
    }

    const nuevoInsumo = {
      insumo_id: insumo.id,
      nombre: insumo.nombre,
      cantidad: cantidad,
      stock_actual: insumo.cantidad || 0,
    }

    setInsumosAbastecimiento([...insumosAbastecimiento, nuevoInsumo])
    setInsumoSeleccionado("")
    setCantidadInsumo("")
    setGeneralError("")

    const totalInsumos = insumosAbastecimiento.length + 1
    const totalPaginas = Math.ceil(totalInsumos / insumosPerPage)
    setInsumosCurrentPage(totalPaginas)

    showNotification(`✅ ${insumo.nombre} agregado correctamente`, "success")
  }

  // ✅ CORREGIDO: Editar insumo con validaciones de stock
  const editarInsumo = (index, campo, valor) => {
    const nuevosInsumos = [...insumosAbastecimiento]

    if (campo === "cantidad") {
      const cantidad = Number.parseInt(valor) || 0
      const insumo = nuevosInsumos[index]
      const insumoOriginal = insumos.find((i) => i.id === insumo.insumo_id)

      if (cantidad < 0) {
        showNotification("La cantidad no puede ser negativa", "warning")
        return
      }

      if (cantidad > 1000) {
        showNotification("La cantidad no puede ser mayor a 1000 unidades", "warning")
        return
      }

      // ✅ VALIDACIÓN: No se puede tomar más de lo disponible
      if (cantidad > insumoOriginal.cantidad) {
        showNotification(`Solo hay ${insumoOriginal.cantidad} unidades disponibles de ${insumo.nombre}`, "warning")
        return
      }

      // ✅ VALIDACIÓN: Debe quedar mínimo 5 unidades
      const stockRestante = insumoOriginal.cantidad - cantidad
      if (stockRestante < 5) {
        showNotification(`Debe quedar un mínimo de 5 unidades en stock. Quedarían: ${stockRestante}`, "warning")
        return
      }

      nuevosInsumos[index][campo] = cantidad
    } else {
      nuevosInsumos[index][campo] = valor
    }

    setInsumosAbastecimiento(nuevosInsumos)
  }

  // Eliminar insumo del abastecimiento
  const eliminarInsumo = (index) => {
    const nuevosInsumos = [...insumosAbastecimiento]
    const insumoEliminado = nuevosInsumos[index]
    nuevosInsumos.splice(index, 1)
    setInsumosAbastecimiento(nuevosInsumos)
    showNotification(`${insumoEliminado.nombre} eliminado del abastecimiento`, "success")
  }

  // Obtener insumos para la página actual
  const getCurrentPageInsumos = () => {
    const indexOfLastInsumo = insumosCurrentPage * insumosPerPage
    const indexOfFirstInsumo = indexOfLastInsumo - insumosPerPage
    return insumosAbastecimiento.slice(indexOfFirstInsumo, indexOfFirstInsumo + insumosPerPage)
  }

  const insumosTotalPages = Math.ceil(insumosAbastecimiento.length / insumosPerPage)

  const paginateInsumos = (pageNumber, e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setInsumosCurrentPage(pageNumber)
  }

  const validateForm = useCallback(() => {
    const fields = ["fecha", "manicurista"]
    let isValid = true
    const newErrors = {}

    fields.forEach((field) => {
      if (!validateField(field, formData[field])) {
        isValid = false
        newErrors[field] = formErrors[field]
      }
    })

    if (!insumosAbastecimiento || insumosAbastecimiento.length === 0) {
      newErrors.insumos = "Debe agregar al menos un insumo"
      isValid = false
      // setGeneralError("Debe agregar al menos un insumo al abastecimiento") // Removed
      showNotification("Debe agregar al menos un insumo al abastecimiento", "error")
    } else {
      // Validar que todos los insumos tengan cantidad válida
      const insumosInvalidos = insumosAbastecimiento.filter((insumo) => !insumo.cantidad || insumo.cantidad <= 0)
      if (insumosInvalidos.length > 0) {
        newErrors.insumos = "Todos los insumos deben tener una cantidad válida mayor a 0"
        isValid = false
        // setGeneralError("Todos los insumos deben tener una cantidad válida mayor a 0") // Removed
        showNotification("Todos los insumos deben tener una cantidad válida mayor a 0", "error")
      }

      // ✅ VALIDACIÓN: Verificar stock disponible para todos los insumos
      const insumosConStockInsuficiente = insumosAbastecimiento.filter((insumo) => {
        const insumoOriginal = insumos.find((i) => i.id === insumo.insumo_id)
        return insumo.cantidad > insumoOriginal.cantidad || insumoOriginal.cantidad - insumo.cantidad < 5
      })

      if (insumosConStockInsuficiente.length > 0) {
        newErrors.insumos = "Algunos insumos no tienen stock suficiente o no cumplen el mínimo de 5 unidades"
        isValid = false
        // setGeneralError("Algunos insumos no tienen stock suficiente o no cumplen el mínimo de 5 unidades") // Removed
        showNotification("Algunos insumos no tienen stock suficiente o no cumplen el mínimo de 5 unidades", "error")
      }

      // Validar límites de cantidad
      const insumosExcesivos = insumosAbastecimiento.filter((insumo) => insumo.cantidad > 1000)
      if (insumosExcesivos.length > 0) {
        newErrors.insumos = "Ningún insumo puede tener más de 1000 unidades"
        isValid = false
        // setGeneralError("Ningún insumo puede tener más de 1000 unidades") // Removed
        showNotification("Ningún insumo puede tener más de 1000 unidades", "error")
      }

      // Validar que el total no sea excesivo
      const cantidadTotal = calcularCantidadTotal()
      if (cantidadTotal > 5000) {
        newErrors.insumos = "La cantidad total del abastecimiento no puede exceder 5000 unidades"
        isValid = false
        // setGeneralError("La cantidad total del abastecimiento no puede exceder 5000 unidades") // Removed
        showNotification("La cantidad total del abastecimiento no puede exceder 5000 unidades", "error")
      }
    }

    setFormErrors(newErrors)
    return isValid
  }, [formData, validateField, formErrors, insumosAbastecimiento, calcularCantidadTotal, insumos])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setGeneralError("") // Keep this to clear any previous general error state

      const formDataToSend = {
        ...formData,
        cantidad: calcularCantidadTotal(),
        manicurista: Number.parseInt(formData.manicurista),
        insumos: insumosAbastecimiento.map((insumo) => ({
          insumo: Number.parseInt(insumo.insumo_id),
          cantidad: Number.parseInt(insumo.cantidad),
        })),
      }

      console.log("📦 Enviando datos para crear abastecimiento:", formDataToSend)
      const newAbastecimiento = await AbastecimientosService.createAbastecimiento(formDataToSend)
      console.log("✅ Abastecimiento creado:", newAbastecimiento)

      const totalInsumos = insumosAbastecimiento.length
      showNotification(
        `✅ Abastecimiento creado exitosamente. Se descontaron insumos de ${totalInsumos} producto${totalInsumos > 1 ? "s" : ""} del inventario.`,
        "success",
      )

      await Promise.all([fetchAbastecimientos(), fetchInsumos()])

      handleBackToList()
    } catch (err) {
      console.error("❌ Error al procesar el formulario:", err)

      let errorMessage = "Ha ocurrido un error"
      if (err.response?.data) {
        const errorData = err.response.data
        if (typeof errorData === "string") {
          errorMessage = errorData
        } else if (typeof errorData === "object") {
          const errorMessages = []
          Object.entries(errorData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              errorMessages.push(`${value.join(", ")}`)
            } else if (typeof value === "string") {
              errorMessages.push(`${value}`)
            }
          })
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join("; ")
          } else if (errorData.detail) {
            errorMessage = errorData.detail
          } else if (errorData.message) {
            errorMessage = errorData.message
          } else if (errorData.error) {
            errorMessage = errorData.error
          }
        }
      } else if (err.message) {
        errorMessage = err.message
      }

      setGeneralError(`${errorMessage}`) // Keep this to clear the error state if needed, but it won't be displayed
      showNotification(errorMessage, "error")
    } finally {
      setLoading(false)
    }
  }

  // Agregar función para recargar insumos
  const fetchInsumos = async () => {
    try {
      const insumosData = await AbastecimientosService.getInsumos()
      setInsumos(insumosData)
      console.log("✅ Insumos recargados después del abastecimiento")
    } catch (err) {
      console.error("Error al recargar insumos:", err)
    }
  }

  const confirmDelete = (abastecimiento) => {
    setAbastecimientoToDelete(abastecimiento)
    setShowConfirmDialog(true)
  }

  const handleDelete = async () => {
    if (!abastecimientoToDelete) return

    try {
      setLoading(true)
      console.log("🗑️ Intentando eliminar abastecimiento:", abastecimientoToDelete)

      const result = await AbastecimientosService.deleteAbastecimiento(abastecimientoToDelete.id)
      console.log("✅ Abastecimiento eliminado exitosamente:", result)

      setAbastecimientos((prev) => prev.filter((item) => item.id !== abastecimientoToDelete.id))

      showNotification(result.message || "¡Abastecimiento eliminado exitosamente!", "success")

      setTimeout(() => {
        fetchAbastecimientos()
      }, 1000)
    } catch (err) {
      console.error("❌ Error al eliminar abastecimiento:", err)
      showNotification(err.message || "Error al eliminar el abastecimiento", "error")
    } finally {
      setLoading(false)
      setShowConfirmDialog(false)
      setAbastecimientoToDelete(null)
    }
  }

  // Handle sort for manicuristas list
  const handleSort = (key) => {
    let direction = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  // Handle sort for abastecimientos table
  const handleAbastecimientosSort = (key) => {
    let direction = "asc"
    if (abastecimientosSortConfig.key === key && abastecimientosSortConfig.direction === "asc") {
      direction = "desc"
    }
    setAbastecimientosSortConfig({ key, direction })
  }

  const renderAbastecimientosSortIndicator = (key) => {
    if (abastecimientosSortConfig.key !== key) {
      return <FaSort className="sort-icon" />
    }
    return abastecimientosSortConfig.direction === "asc" ? (
      <FaSortUp className="sort-icon active" />
    ) : (
      <FaSortDown className="sort-icon active" />
    )
  }

  const getAbastecimientosPorManicurista = (manicuristaId) => {
    return abastecimientos.filter((abastecimiento) => {
      const abastecimientoManicuristaId =
        typeof abastecimiento.manicurista === "object" ? abastecimiento.manicurista.id : abastecimiento.manicurista
      return abastecimientoManicuristaId === manicuristaId
    })
  }

  const filteredAndSortedManicuristas = () => {
    const filtered = manicuristas.filter((manicurista) => {
      const searchLower = searchTerm.toLowerCase()
      const nombreCompleto = `${manicurista.nombres} ${manicurista.apellidos}`.toLowerCase()
      
      // Obtener el estado como texto
      const estadoTexto = manicurista.activo ? "activo" : "inactivo"
      
      // Obtener el género como texto
      const generoTexto = manicurista.genero === "M" ? "masculino" : 
                         manicurista.genero === "F" ? "femenino" : 
                         manicurista.genero === "NB" ? "no binario" : 
                         manicurista.genero === "O" ? "otro" : 
                         manicurista.genero === "N" ? "prefiero no decirlo" : ""
      
      const matchesSearch =
        // Campos básicos
        nombreCompleto.includes(searchLower) ||
        (manicurista.nombres?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.apellidos?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.telefono?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.celular?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.email?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.correo?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.documento?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.numero_documento?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.direccion?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.especialidad?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.observaciones?.toLowerCase() || "").includes(searchLower) ||
        
        // Género y estado
        generoTexto.includes(searchLower) ||
        estadoTexto.includes(searchLower) ||
        
        // Búsqueda por ID
        (manicurista.id?.toString() || "").includes(searchLower) ||
        
        // Búsqueda en campos de fecha si existen
        (manicurista.fecha_creacion?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.fecha_actualizacion?.toLowerCase() || "").includes(searchLower) ||
        (manicurista.fecha_nacimiento?.toLowerCase() || "").includes(searchLower)

      return matchesSearch
    })

    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue

      if (sortConfig.key === "nombres") {
        aValue = `${a.nombres} ${a.apellidos}`
        bValue = `${b.nombres} ${b.apellidos}`
      } else {
        aValue = a[sortConfig.key] || ""
        bValue = b[sortConfig.key] || ""
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1
      }
      return 0
    })

    return sorted
  }

  const getCurrentPageItems = () => {
    const filtered = filteredAndSortedManicuristas()
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  const totalPages = Math.ceil(filteredAndSortedManicuristas().length / itemsPerPage)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  const getInsumoNombre = (insumo) => {
    if (typeof insumo === "object") {
      return insumo.nombre
    }
    const insumoObj = insumos.find((i) => i.id === Number.parseInt(insumo, 10))
    return insumoObj ? insumoObj.nombre : "Sin nombre"
  }

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Obtener fechas límite (igual que en Compras)
  const getFechaLimites = () => {
    const hoy = new Date()
    const hace7Dias = new Date()
    hace7Dias.setDate(hoy.getDate() - 7)

    return {
      min: hace7Dias.toISOString().split("T")[0],
      max: hoy.toISOString().split("T")[0], // Máximo hoy (no futuras)
    }
  }

  const fechaLimites = getFechaLimites()

  // ✅ FUNCIÓN AUXILIAR: Obtener indicador de stock
  const getStockIndicator = (cantidad) => {
    if (cantidad < 5) return "danger"
    if (cantidad < 15) return "warning"
    return "normal"
  }

  // NEW: Filtered insumos for the modal
  const getFilteredInsumos = () => {
    const filtered = insumos.filter((insumo) => {
      let insumoCategoria = null

      if (typeof insumo.categoria_insumo === "object" && insumo.categoria_insumo !== null) {
        insumoCategoria = insumo.categoria_insumo.id
      } else if (typeof insumo.categoria_insumo === "number") {
        insumoCategoria = insumo.categoria_insumo
      }

      const matchesCategory =
        !filtroCategoria ||
        filtroCategoria === "0" ||
        insumoCategoria === Number.parseInt(filtroCategoria) ||
        insumoCategoria === filtroCategoria

      const matchesSearch = !busquedaInsumo || insumo.nombre.toLowerCase().includes(busquedaInsumo.toLowerCase())

      // Only show insumos not already added to the current abastecimiento
      const notInAbastecimiento = !insumosAbastecimiento.find((ia) => ia.insumo_id === insumo.id)

      return matchesCategory && matchesSearch && notInAbastecimiento
    })
    return filtered
  }

  // Renderizar vista de lista
  const renderListView = () => (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Gestión de Abastecimiento</h1>
      </div>

      <div className="admin-filters">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="items-per-page">
          <span>Mostrar:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="items-select"
          >
            <option value={4}>4</option>
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={16}>16</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando manicuristas...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>{error}</p>
          <button className="admin-button secondary" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="manicuristas-grid-simple">
            {getCurrentPageItems().length > 0 ? (
              getCurrentPageItems().map((manicurista) => {
                const abastecimientosManicurista = getAbastecimientosPorManicurista(manicurista.id)

                return (
                  <div key={manicurista.id} className="manicurista-card-simple">
                    <div className="card-avatar">
                      <FaUser className="avatar-icon" />
                    </div>

                    <div className="card-info">
                      <h3 className="manicurista-name">
                        {manicurista.nombres} {manicurista.apellidos}
                      </h3>
                      <div className="manicurista-sub">{manicurista.especialidad || "Especialista en manicure"}</div>
                      <div className={`estado-badge ${manicurista.estado?.toLowerCase()}`}>
                        <FaUserCheck className="estado-icon" />
                        {manicurista.estado}
                      </div>
                    </div>

                    <div className="card-actions-simple">
                      <PermissionWrapper modulo="abastecimientos" accion="crear">
                        <button
                          className="action-button primary"
                          onClick={() => handleCreateNew(manicurista)}
                          title="Crear nuevo abastecimiento"
                        >
                          <FaBoxOpen /> Abastecer
                        </button>
                      </PermissionWrapper>
                      <PermissionWrapper modulo="abastecimientos" accion="ver_detalles">
                        <button
                          className="action-button view"
                          onClick={() => handleViewDetails(manicurista)}
                          title="Ver abastecimientos"
                        >
                          <FaListAlt /> Ver Abastecimientos
                        </button>
                      </PermissionWrapper>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="no-manicuristas">
                <FaExclamationTriangle className="warning-icon-large" />
                <h3>No se encontraron manicuristas</h3>
                <p>No hay manicuristas que coincidan con los criterios de búsqueda.</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="pagination-button" onClick={() => paginate(1)} disabled={currentPage === 1}>
                &laquo;
              </button>
              <button
                className="pagination-button"
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                &lt;
              </button>

              <div className="pagination-info">
                Página {currentPage} de {totalPages}
              </div>

              <button
                className="pagination-button"
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                &gt;
              </button>
              <button
                className="pagination-button"
                onClick={() => paginate(totalPages)}
                disabled={currentPage === totalPages}
              >
                &raquo;
              </button>
            </div>
          )}
        </>
      )}
    </>
  )

  // ✅ MEJORADO: Renderizar vista de crear/editar con proporciones ajustadas
  const renderFormView = () => (
    <div className="abastecimiento-form-container">
      <div className="form-header">
        <div className="form-header-left">
          <button className="admin-button secondary" onClick={handleBackToList}>
            <FaArrowLeft /> Volver a la Lista
          </button>
        </div>
        <h1 className="form-title">
          {selectedManicurista
            ? `Abastecer a ${selectedManicurista.nombres} ${selectedManicurista.apellidos}`
            : "Crear Nuevo Abastecimiento"}
        </h1>
        <div className="form-header-right">
          <button
            className="admin-button primary"
            onClick={handleSubmit}
            disabled={loading || insumosAbastecimiento.length === 0}
          >
            {loading ? (
              <>
                <div className="spinner-small"></div>
                Guardando...
              </>
            ) : (
              <>
                <FaSave /> Crear Abastecimiento
              </>
            )}
          </button>
        </div>
      </div>
      {/* {generalError && <div className="general-error">{generalError}</div>} */} {/* Removed this line */}
      {/* ✅ AJUSTADO: Cambiar proporciones - menos espacio para info, más para tabla */}
      <div className="form-content-adjusted">
        {/* ✅ Lado izquierdo más pequeño - Campos del formulario */}
        <div className="form-left-small">
          <div className="form-section">
            <h3>Información del Abastecimiento</h3>
            <div className="form-grid-compact">
              <div className="form-group">
                <label htmlFor="fecha">
                  <FaCalendarAlt className="form-icon" /> Fecha
                </label>
                <input
                  type="date"
                  id="fecha"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleInputChange}
                  className={formErrors.fecha ? "error" : ""}
                  required
                  min={fechaLimites.min}
                  max={fechaLimites.max}
                />
                {formErrors.fecha && <div className="error-text">{formErrors.fecha}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="manicurista">
                  <FaUser className="form-icon" /> Manicurista
                </label>
                <select
                  id="manicurista"
                  name="manicurista"
                  value={formData.manicurista}
                  onChange={handleInputChange}
                  required
                  disabled={selectedManicurista}
                >
                  <option value="">Seleccione una manicurista</option>
                  {manicuristas.map((manicurista) => (
                    <option key={manicurista.id} value={manicurista.id}>
                      {manicurista.nombres} {manicurista.apellidos}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resumen del abastecimiento */}
            {insumosAbastecimiento.length > 0 && (
              <div className="abastecimiento-summary-compact">
                <h4>Resumen</h4>
                <div className="summary-item">
                  <span>Insumos:</span>
                  <span>{insumosAbastecimiento.length}</span>
                </div>
                <div className="summary-item total">
                  <span>Total a descontar:</span>
                  <span className="cantidad-total">{calcularCantidadTotal()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ✅ Lado derecho más grande - Agregar insumos */}
        <div className="form-right-large">
          <div className="insumos-section">
            <h3>
              <FaBoxOpen className="form-icon" /> Insumos del Abastecimiento
            </h3>

            {/* Agregar insumo - NEW SELECTION METHOD */}
            <div className="add-insumo-form">
              <h4>Agregar Insumo</h4>

              <div className="insumo-selector-compact">
                <button type="button" className="open-insumo-modal-btn" onClick={() => setShowInsumoModal(true)}>
                  <FaBoxOpen /> Seleccionar Insumo
                </button>

                {insumoSeleccionado && (
                  <div className="selected-insumo-preview">
                    <span className="selected-label">Seleccionado:</span>
                    <span className="selected-name">
                      {insumos.find((i) => i.id === Number.parseInt(insumoSeleccionado))?.nombre}
                    </span>
                  </div>
                )}
              </div>

              {insumoSeleccionado && (
                <div className="insumo-inputs-compact">
                  <div className="input-group">
                    <label>Cantidad a tomar</label>
                    <input
                      type="number"
                      value={cantidadInsumo}
                      onChange={(e) => setCantidadInsumo(e.target.value)}
                      min="1"
                      max={
                        insumoSeleccionado
                          ? Math.max(
                              0,
                              (insumos.find((i) => i.id === Number.parseInt(insumoSeleccionado))?.cantidad || 0) - 5,
                            )
                          : 1000
                      }
                      className="form-control"
                      placeholder="Cantidad"
                    />
                    {insumoSeleccionado && cantidadInsumo && (
                      <div className="validation-success">
                        ✅ Quedarán{" "}
                        {(insumos.find((i) => i.id === Number.parseInt(insumoSeleccionado))?.cantidad || 0) -
                          Number.parseInt(cantidadInsumo || 0)}{" "}
                        unidades
                      </div>
                    )}
                  </div>

                  <div className="input-group">
                    <button type="button" className="admin-button primary full-width" onClick={agregarInsumo}>
                      <FaMinus /> Tomar Insumo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ✅ MEJORADA: Tabla de insumos más grande */}
            {insumosAbastecimiento.length > 0 && (
              <div className="insumos-table-container-large">
                <table className="insumos-table-wide">
                  <thead>
                    <tr>
                      <th style={{ width: "30%" }}>Insumo</th>
                      <th style={{ width: "15%" }}>Stock Actual</th>
                      <th style={{ width: "20%" }}>Cantidad a Tomar</th>
                      <th style={{ width: "15%" }}>Stock Restante</th>
                      <th style={{ width: "20%" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentPageInsumos().map((item, index) => {
                      const realIndex = (insumosCurrentPage - 1) * insumosPerPage + index
                      const insumoOriginal = insumos.find((i) => i.id === item.insumo_id)
                      const stockActual = insumoOriginal?.cantidad || 0
                      // ✅ CORREGIDO: Restar en lugar de sumar
                      const stockRestante = stockActual - item.cantidad
                      const stockIndicator = getStockIndicator(stockRestante)

                      return (
                        <tr key={realIndex}>
                          <td>
                            <div className="insumo-name-cell">
                              <FaBoxOpen className="insumo-icon" />
                              <span>{item.nombre}</span>
                            </div>
                          </td>
                          <td>
                            <span className="stock-info">
                              <FaWarehouse className="stock-icon" />
                              {stockActual}
                            </span>
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => editarInsumo(realIndex, "cantidad", e.target.value)}
                              min="1"
                              max={Math.max(0, stockActual - 5)}
                              className="table-input-wide"
                            />
                          </td>
                          <td>
                            <span className={`stock-indicator ${stockIndicator}`}>
                              {stockIndicator === "danger" ? "⚠️" : stockIndicator === "warning" ? "⚠️" : "✅"}
                              {stockRestante}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="action-button delete"
                              onClick={() => eliminarInsumo(realIndex)}
                              title="Eliminar insumo"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="total-row">
                      <td colSpan="2">
                        <strong>Total a Descontar:</strong>
                      </td>
                      <td className="cantidad-total">
                        <strong>{calcularCantidadTotal()}</strong>
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>

                {/* Paginación para insumos */}
                {insumosTotalPages > 1 && (
                  <div className="insumos-pagination">
                    <button
                      type="button"
                      className="insumos-pagination-button"
                      onClick={(e) => paginateInsumos(1, e)}
                      disabled={insumosCurrentPage === 1}
                    >
                      &laquo;
                    </button>
                    <button
                      type="button"
                      className="insumos-pagination-button"
                      onClick={(e) => paginateInsumos(insumosCurrentPage - 1, e)}
                      disabled={insumosCurrentPage === 1}
                    >
                      <FaChevronLeft />
                    </button>

                    {Array.from({ length: insumosTotalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={`insumos-pagination-button ${page === insumosCurrentPage ? "active" : ""}`}
                        onClick={(e) => paginateInsumos(page, e)}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="insumos-pagination-button"
                      onClick={(e) => paginateInsumos(insumosCurrentPage + 1, e)}
                      disabled={insumosCurrentPage === insumosTotalPages}
                    >
                      <FaChevronRight />
                    </button>
                    <button
                      type="button"
                      className="insumos-pagination-button"
                      onClick={(e) => paginateInsumos(insumosTotalPages, e)}
                      disabled={insumosCurrentPage === insumosTotalPages}
                    >
                      &raquo;
                    </button>

                    <div className="insumos-pagination-info">
                      Página {insumosCurrentPage} de {insumosTotalPages} ({insumosAbastecimiento.length} insumos)
                    </div>
                  </div>
                )}
              </div>
            )}

            {insumosAbastecimiento.length === 0 && (
              <div className="no-insumos">
                <FaBoxOpen className="no-insumos-icon" />
                <p>No hay insumos agregados al abastecimiento</p>
                <p>Agregue al menos un insumo para continuar</p>
                <div className="validation-warning">⚠️ Solo se muestran insumos con stock ≥ 5 unidades</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // ✅ MEJORADA: Vista de detalles con acción de detalle y sin eliminar
  const renderDetailsView = () => (
    <div className="details-container">
      <div className="admin-header">
        {" "}
        {/* Changed to admin-header for consistent styling */}
        <h1 className="admin-title">
          Abastecimientos de {selectedManicurista?.nombres} {selectedManicurista?.apellidos}
        </h1>
        <button className="admin-button secondary" onClick={() => setCurrentView("list")}>
          <FaArrowLeft /> Volver
        </button>
      </div>

      {abastecimientos.length > 0 ? (
        <div className="details-table-container">
          <div className="details-summary">
            <div className="summary-cards">
              <div className="summary-card">
                <div className="card-icon">
                  <FaBoxOpen />
                </div>
                <div className="card-content">
                  <h3>{abastecimientos.length}</h3>
                  <p>Total Abastecimientos</p>
                </div>
              </div>
              <div className="summary-card">
                <div className="card-icon">
                  <FaCalendarAlt />
                </div>
                <div className="card-content">
                  <h3>{abastecimientos.length > 0 ? formatearFecha(abastecimientos[0].fecha) : "N/A"}</h3>
                  <p>Último Abastecimiento</p>
                </div>
              </div>
              <div className="summary-card">
                <div className="card-icon">
                  <FaMinus />
                </div>
                <div className="card-content">
                  <h3>{abastecimientos.reduce((total, abastecimiento) => total + abastecimiento.cantidad, 0)}</h3>
                  <p>Insumos Tomados</p>
                </div>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th onClick={() => handleAbastecimientosSort("id")}>ID {renderAbastecimientosSortIndicator("id")}</th>
                  <th onClick={() => handleAbastecimientosSort("fecha")}>
                    Fecha {renderAbastecimientosSortIndicator("fecha")}
                  </th>
                  <th onClick={() => handleAbastecimientosSort("cantidad")}>
                    Cantidad Total {renderAbastecimientosSortIndicator("cantidad")}
                  </th>
                  <th>Insumos Abastecidos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {abastecimientos.length > 0 ? (
                  abastecimientos.map((abastecimiento) => (
                    <tr key={abastecimiento.id}>
                      <td>#{abastecimiento.id}</td>
                      <td>
                        <div className="service-info">
                          {" "}
                          {/* Using service-info for consistent styling */}
                          <div className="service-name">
                            {new Date(abastecimiento.fecha).toLocaleDateString("es-CO", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                          <div className="service-description">{abastecimiento.fecha}</div>
                        </div>
                      </td>
                      <td>
                        <span className="cantidad-badge">
                          <FaMinus /> {abastecimiento.cantidad}
                        </span>
                      </td>
                      <td>
                        <div className="insumos-detail">
                          {abastecimiento.insumos?.length > 0 ? (
                            <div className="insumos-list">
                              {abastecimiento.insumos.slice(0, 3).map((item, index) => (
                                <div key={index} className="insumo-item">
                                  <span className="insumo-name">
                                    <FaBoxOpen className="insumo-icon" />
                                    {getInsumoNombre(item.insumo)}
                                  </span>
                                  <span className="insumo-cantidad">
                                    <FaMinus /> {item.cantidad}
                                  </span>
                                </div>
                              ))}
                              {abastecimiento.insumos.length > 3 && (
                                <div className="more-insumos">+{abastecimiento.insumos.length - 3} más...</div>
                              )}
                            </div>
                          ) : (
                            <span className="no-insumos">Sin insumos</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {/* ✅ NUEVA ACCIÓN: Ver detalle de insumos */}
                          <button
                            className="action-button view" // Using 'view' class for consistent styling
                            onClick={() => handleViewAbastecimientoDetail(abastecimiento)}
                            title="Ver detalle de insumos"
                          >
                            <FaListAlt />
                          </button>
                          {/* ✅ ELIMINADA: Acción de eliminar */}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">
                      No se encontraron abastecimientos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="no-details">
          <FaExclamationTriangle className="warning-icon-large" />
          <h3>Sin abastecimientos registrados</h3>
          <p>
            {selectedManicurista?.nombres} {selectedManicurista?.apellidos} no tiene abastecimientos registrados.
          </p>
          <PermissionWrapper modulo="abastecimientos" accion="crear">
            <button
              className="admin-button primary"
              onClick={() => handleCreateNew(selectedManicurista)}
            >
              <FaPlus /> Crear Primer Abastecimiento
            </button>
          </PermissionWrapper>
        </div>
      )}
    </div>
  )

  // ✅ NUEVA VISTA: Detalle específico de un abastecimiento
  const renderAbastecimientoDetailView = () => (
    <div className="details-container">
      <div className="form-header">
        <button className="back-button" onClick={() => setCurrentView("view")}>
          <FaArrowLeft /> Volver a Abastecimientos
        </button>
        <h2>
          <FaListAlt /> Detalle del Abastecimiento #{selectedAbastecimiento?.id}
        </h2>
      </div>

      <div className="abastecimiento-detail-container">
        <div className="detail-summary">
          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-icon">
                <FaCalendarAlt />
              </div>
              <div className="card-content">
                <h3>{formatearFecha(selectedAbastecimiento?.fecha)}</h3>
                <p>Fecha del Abastecimiento</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="card-icon">
                <FaUser />
              </div>
              <div className="card-content">
                <h3>
                  {selectedManicurista?.nombres} {selectedManicurista?.apellidos}
                </h3>
                <p>Manicurista</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="card-icon">
                <FaMinus />
              </div>
              <div className="card-content">
                <h3>{selectedAbastecimiento?.cantidad}</h3>
                <p>Total Descontado</p>
              </div>
            </div>
          </div>
        </div>

        <div className="insumos-detail-table">
          <h3>
            <FaBoxOpen /> Insumos Abastecidos
          </h3>
          {selectedAbastecimiento?.insumos?.length > 0 ? (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Cantidad Tomada</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAbastecimiento.insumos.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <div className="insumo-name-cell">
                          <FaBoxOpen className="insumo-icon" />
                          <span>{getInsumoNombre(item.insumo)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="cantidad-badge-detail">
                          <FaMinus /> {item.cantidad} unidades
                        </span>
                      </td>
                      <td>
                        <span className="status-badge success">✅ Descontado</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td>
                      <strong>Total de Insumos:</strong>
                    </td>
                    <td>
                      <strong className="cantidad-total">
                        <FaMinus /> {selectedAbastecimiento.cantidad} unidades
                      </strong>
                    </td>
                    <td>
                      <span className="status-badge success">✅ Completado</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="no-details">
              <FaExclamationTriangle className="warning-icon-large" />
              <h3>Sin insumos registrados</h3>
              <p>Este abastecimiento no tiene insumos asociados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="abastecimientos-module">
      <div className="admin-container">
        <Toaster />

        {currentView === "list" && renderListView()}
        {currentView === "create" && renderFormView()}
        {currentView === "view" && renderDetailsView()}
        {currentView === "detail" && renderAbastecimientoDetailView()}

        {/* Modal para seleccionar insumos - NEW */}
        {showInsumoModal && (
          <div className="modal-overlay">
            <div className="modal-container insumo-modal">
              <div className="modal-header">
                <h2>Seleccionar Insumo</h2>
                <button className="modal-close" onClick={() => setShowInsumoModal(false)}>
                  &times;
                </button>
              </div>

              <div className="modal-content">
                {/* Filtros compactos */}
                <div className="modal-filters">
                  <div className="filter-row">
                    <div className="search-group">
                      <FaSearch className="search-icon" />
                      <input
                        type="text"
                        value={busquedaInsumo}
                        onChange={(e) => setBusquedaInsumo(e.target.value)}
                        placeholder="Buscar insumo..."
                        className="search-input"
                      />
                    </div>

                    <select
                      value={filtroCategoria}
                      onChange={(e) => setFiltroCategoria(e.target.value)}
                      className="category-select"
                    >
                      <option value="">Todas las categorías</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Lista de insumos */}
                <div className="insumos-modal-list">
                  {getFilteredInsumos().map((insumo) => (
                    <div
                      key={insumo.id}
                      className={`insumo-modal-item ${insumoSeleccionado === insumo.id.toString() ? "selected" : ""} ${insumo.cantidad < 5 ? "low-stock" : ""}`}
                      onClick={() => {
                        setInsumoSeleccionado(insumo.id.toString())
                        setShowInsumoModal(false)
                      }}
                    >
                      <div className="insumo-info">
                        <h5>{insumo.nombre}</h5>
                        <span className="category-name">
                          {(() => {
                            if (typeof insumo.categoria_insumo === "object" && insumo.categoria_insumo !== null) {
                              return insumo.categoria_insumo.nombre
                            } else {
                              return (
                                categorias.find((c) => c.id === insumo.categoria_insumo)?.nombre ||
                                `Cat ID: ${insumo.categoria_insumo}` ||
                                "Sin categoría"
                              )
                            }
                          })()}
                        </span>
                      </div>
                      <div className="stock-info">
                        <FaWarehouse />
                        <span>Stock: {insumo.cantidad}</span>
                        {insumo.cantidad < 5 && <span className="low-stock-indicator">⚠️ Bajo Stock</span>}
                      </div>
                    </div>
                  ))}

                  {getFilteredInsumos().length === 0 && (
                    <div className="no-results">
                      <FaBoxOpen />
                      <p>No se encontraron insumos</p>
                      <small>Revisa los filtros para más información</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showConfirmDialog && (
          <div className="modal-overlay">
            <div className="modal-container confirm-dialog">
              <div className="modal-header">
                <h2>Confirmar Eliminación</h2>
                <button className="modal-close" onClick={() => setShowConfirmDialog(false)}>
                  &times;
                </button>
              </div>

              <div className="confirm-content">
                <p>
                  ¿Está seguro que desea eliminar el abastecimiento <strong>#{abastecimientoToDelete?.id}</strong>?
                </p>
                <p className="warning-text">Esta acción no se puede deshacer y podría afectar el inventario.</p>
              </div>

              <div className="form-actions">
                <button className="admin-button secondary" onClick={() => setShowConfirmDialog(false)}>
                  <FaTimes /> Cancelar
                </button>
                <button className="admin-button danger" onClick={handleDelete} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner-small"></div>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <FaTrash /> Eliminar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Abastecimientos
