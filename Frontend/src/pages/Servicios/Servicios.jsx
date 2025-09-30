"use client"

import { useState, useEffect } from "react"
import toast, { Toaster } from "react-hot-toast"
import {
  // Acciones principales
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaTimes,
  FaCheck,
  FaMinus,
  FaPlus as FaPlusSmall,
  
  // Búsqueda y filtros
  FaSearch,
  FaFilter,
  FaSort,
  FaSortUp,
  FaSortDown,
  
  // Iconos de formulario
  FaServicestack,
  FaMoneyBillWave,
  FaClock,
  FaImage,
  FaInfoCircle,
  
  // Iconos de estado y alertas
  FaExclamationTriangle,
  FaExclamationCircle,
} from "react-icons/fa"
import serviciosService from "../../service/serviciosService"
import PermissionButton from "../../components/PermissionButton"
import PermissionWrapper from "../../components/PermissionWrapper"
import "../../styles/Admin.css"
import "../../styles/modals/ServiciosModal.css"

// Función utilitaria para manejar errores de API de forma amigable
const handleApiError = (error) => {
  const errorMessages = {
    // Errores de validación comunes
    documento: "Ya existe un usuario con este número de documento",
    numero_documento: "Ya existe un usuario con este número de documento",
    correo_electronico: "Ya existe un usuario con este correo electrónico",
    correo: "Ya existe un usuario con este correo electrónico",
    email: "Ya existe un usuario con este correo electrónico",
    celular: "Ya existe un usuario con este número de celular",
    telefono: "Ya existe un usuario con este número de teléfono",
    nombre: "El nombre ingresado no es válido o ya existe",
    nombres: "El nombre ingresado no es válido",
    precio: "El precio debe ser mayor a $999",
    duracion: "La duración debe estar entre 5 minutos y 6 horas",
    imagen: "Error con la imagen. Verifique el formato y tamaño",
    descripcion: "La descripción debe tener entre 10 y 500 caracteres",

    // Errores de servidor comunes
    detail: "Error en el servidor",
    non_field_errors: "Error de validación",
    permission_denied: "No tiene permisos para realizar esta acción",
    authentication_failed: "Error de autenticación",
    not_found: "Recurso no encontrado",
    method_not_allowed: "Operación no permitida",
    server_error: "Error interno del servidor",
  }

  if (error.response?.data) {
    const errorData = error.response.data

    if (typeof errorData === "string") {
      return errorData
    }

    if (typeof errorData === "object") {
      const friendlyErrors = []

      Object.entries(errorData).forEach(([key, value]) => {
        const friendlyMessage = errorMessages[key] || `Error en ${key}`

        if (Array.isArray(value)) {
          friendlyErrors.push(friendlyMessage)
        } else if (typeof value === "string") {
          friendlyErrors.push(friendlyMessage)
        }
      })

      if (friendlyErrors.length === 1) {
        return friendlyErrors[0]
      } else if (friendlyErrors.length > 1) {
        return `Se encontraron errores:\n• ${friendlyErrors.join("\n• ")}`
      }
    }
  }

  // Errores de red o conexión
  if (error.code === "NETWORK_ERROR" || !error.response) {
    return "Error de conexión. Verifique su conexión a internet."
  }

  // Error por defecto
  return "Ha ocurrido un error inesperado. Intente nuevamente."
}

const Servicios = () => {
  // Estados para manejar los datos
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Estados para el formulario UNIFICADO
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState("create") // create, edit, view
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    duracion: 30, // Cambiar a número
    imagen: null,
    estado: "activo",
  })
  const [formErrors, setFormErrors] = useState({})

  // Estados para el selector de duración
  const [durationHours, setDurationHours] = useState(0)
  const [durationMinutes, setDurationMinutes] = useState(30)

  // Estados para filtrado y ordenamiento
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState("")
  const [sortConfig, setSortConfig] = useState({
    key: "nombre",
    direction: "asc",
  })

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [, setTotalItems] = useState(0)

  // Estados para confirmaciones
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [servicioToDelete, setServicioToDelete] = useState(null)

  // Estado para preview de imagen
  const [imagePreview, setImagePreview] = useState(null)

  // Agregar estado para controlar acciones duplicadas
  const [actionTimeouts, setActionTimeouts] = useState(new Set())

  // Función para actualizar duración total
  const updateTotalDuration = (hours, minutes) => {
    const total = hours * 60 + minutes
    setFormData((prev) => ({ ...prev, duracion: total }))
  }

  // Función para convertir minutos a horas y minutos
  const minutesToHoursAndMinutes = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return { hours, minutes }
  }

  // Función para formatear duración
  const formatDuration = (totalMinutes) => {
    const { hours, minutes } = minutesToHoursAndMinutes(totalMinutes)
    if (hours === 0) return `${minutes}min`
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes}min`
  }

  // Función mejorada para mostrar notificaciones con react-hot-toast
  const showNotification = (message, type = "success") => {
    const notificationKey = `${message}-${type}`

    // Evitar notificaciones duplicadas
    if (actionTimeouts.has(notificationKey)) {
      return
    }

    // Marcar como activa
    setActionTimeouts((prev) => new Set([...prev, notificationKey]))

    // Mostrar notificación según el tipo
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
          iconTheme: {
            primary: "#fff",
            secondary: "#10b981",
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
          iconTheme: {
            primary: "#fff",
            secondary: "#ef4444",
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
          duration: 4000,
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

    // Liberar después de 2 segundos
    setTimeout(() => {
      setActionTimeouts((prev) => {
        const newSet = new Set(prev)
        newSet.delete(notificationKey)
        return newSet
      })
    }, 2000)
  }

  // Cargar datos iniciales
  const fetchServicios = async () => {
    try {
      setLoading(true)
      const serviciosData = await serviciosService.getServicios(currentPage, searchTerm)
      console.log("Servicios cargados:", serviciosData)

      if (serviciosData.results) {
        setServicios(serviciosData.results)
        setTotalItems(serviciosData.count || serviciosData.results.length)
      } else if (Array.isArray(serviciosData)) {
        setServicios(serviciosData)
        setTotalItems(serviciosData.length)
      } else {
        setServicios([])
        setTotalItems(0)
      }

      setError(null)
    } catch (err) {
      setError("Error al cargar los servicios. Por favor, intente nuevamente.")
      console.error("Error al cargar servicios:", err)
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos cuando cambie la página o término de búsqueda
  useEffect(() => {
    fetchServicios()
  }, [currentPage, searchTerm])

  // Agregar función para actualizar servicio en el estado local
  const updateServicioInState = (updatedServicio) => {
    setServicios((prevServicios) => {
      return prevServicios.map((servicio) => {
        if (servicio.id === updatedServicio.id) {
          return {
            ...servicio,
            ...updatedServicio,
          }
        }
        return servicio
      })
    })
  }

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target

    if (type === "file") {
      const file = files[0]
      setFormData({
        ...formData,
        [name]: file,
      })

      // Crear preview de la imagen
      if (file) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setImagePreview(reader.result)
        }
        reader.readAsDataURL(file)
      } else {
        setImagePreview(null)
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }

    // Validar el campo cuando cambia (solo si no está en modo view)
    if (formMode !== "view") {
      validateField(name, type === "file" ? files[0] : value)
    }
  }

  // Manejar cambios en duración con botones
  const handleDurationChange = (type, operation) => {
    if (formMode === "view") return

    let newHours = durationHours
    let newMinutes = durationMinutes

    if (type === "hours") {
      if (operation === "increment" && newHours < 6) {
        newHours += 1
      } else if (operation === "decrement" && newHours > 0) {
        newHours -= 1
      }
    } else if (type === "minutes") {
      if (operation === "increment") {
        newMinutes += 15
        if (newMinutes >= 60) {
          newMinutes = 0
          if (newHours < 6) newHours += 1
        }
      } else if (operation === "decrement") {
        newMinutes -= 15
        if (newMinutes < 0) {
          newMinutes = 45
          if (newHours > 0) newHours -= 1
        }
      }
    }

    // Validar límites totales
    const totalMinutes = newHours * 60 + newMinutes
    if (totalMinutes < 5) {
      newHours = 0
      newMinutes = 5
    } else if (totalMinutes > 360) {
      newHours = 6
      newMinutes = 0
    }

    setDurationHours(newHours)
    setDurationMinutes(newMinutes)
    updateTotalDuration(newHours, newMinutes)
  }

  // Validar campo individual - MEJORADO CON VALIDACIONES EN TIEMPO REAL
  const validateField = (fieldName, value) => {
    const errors = { ...formErrors }

    switch (fieldName) {
      case "nombre":
        if (!value || !value.trim()) {
          errors.nombre = "El nombre es requerido"
        } else if (value.trim().length < 3) {
          errors.nombre = "El nombre debe tener al menos 3 caracteres"
        } else if (value.trim().length > 100) {
          errors.nombre = "El nombre no puede exceder los 100 caracteres"
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s0-9.,()-]+$/.test(value.trim())) {
          errors.nombre = "El nombre contiene caracteres no válidos"
        } else {
          delete errors.nombre
        }
        break

      case "descripcion":
        if (!value || !value.trim()) {
          errors.descripcion = "La descripción es requerida"
        } else if (value.trim().length < 10) {
          errors.descripcion = "La descripción debe tener al menos 10 caracteres"
        } else if (value.trim().length > 500) {
          errors.descripcion = "La descripción no puede exceder los 500 caracteres"
        } else {
          delete errors.descripcion
        }
        break

      case "precio":
        if (!value || value === "") {
          errors.precio = "El precio es requerido"
        } else if (isNaN(value) || Number.parseFloat(value) <= 999) {
          errors.precio = "El precio debe ser un número mayor a $999"
        } else if (Number.parseFloat(value) > 1000000) {
          errors.precio = "El precio no puede exceder $1,000,000"
        } else {
          delete errors.precio
        }
        break

      case "duracion":
        const duracionNum = typeof value === "number" ? value : Number.parseInt(value)
        if (!duracionNum || duracionNum < 5) {
          errors.duracion = "La duración mínima es 5 minutos"
        } else if (duracionNum > 360) {
          errors.duracion = "La duración máxima es 6 horas (360 minutos)"
        } else {
          delete errors.duracion
        }
        break

      case "imagen":
        if (formMode === "create" && !value) {
          errors.imagen = "La imagen es requerida"
        } else if (value) {
          if (value.size > 5 * 1024 * 1024) {
            errors.imagen = "La imagen no puede exceder 5MB"
          } else if (!value.type.startsWith("image/")) {
            errors.imagen = "Solo se permiten archivos de imagen (JPG, PNG, GIF, etc.)"
          } else if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(value.type)) {
            errors.imagen = "Formato de imagen no válido. Use JPG, PNG, GIF o WebP"
          } else {
            delete errors.imagen
          }
        } else {
          delete errors.imagen
        }
        break

      default:
        break
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Validar formulario completo - MEJORADO
  const validateForm = () => {
    if (formMode === "view") return true // No validar en modo vista

    const fields = ["nombre", "descripcion", "precio", "duracion"]

    if (formMode === "create") {
      fields.push("imagen")
    }

    let isValid = true
    const newErrors = {}

    fields.forEach((field) => {
      if (!validateField(field, formData[field])) {
        isValid = false
        if (formErrors[field]) {
          newErrors[field] = formErrors[field]
        }
      }
    })

    // Validación adicional: verificar que todos los campos requeridos estén llenos
    if (!formData.nombre?.trim()) {
      newErrors.nombre = "El nombre es requerido"
      isValid = false
    }
    if (!formData.descripcion?.trim()) {
      newErrors.descripcion = "La descripción es requerida"
      isValid = false
    }
    if (!formData.precio || formData.precio === "") {
      newErrors.precio = "El precio es requerido"
      isValid = false
    }
    if (!formData.duracion || formData.duracion < 5) {
      newErrors.duracion = "La duración es requerida"
      isValid = false
    }
    if (formMode === "create" && !formData.imagen) {
      newErrors.imagen = "La imagen es requerida"
      isValid = false
    }

    setFormErrors(newErrors)
    return isValid
  }

  // Abrir formulario para crear servicio
  const handleOpenCreateForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      duracion: 30, // Valor por defecto
      imagen: null,
      estado: "activo",
    })
    setDurationHours(0)
    setDurationMinutes(30)
    setFormErrors({})
    setImagePreview(null)
    setFormMode("create")
    setShowForm(true)
  }

  // Abrir formulario para editar servicio
  const handleOpenEditForm = (servicio) => {
    const { hours, minutes } = minutesToHoursAndMinutes(servicio.duracion || 30)

    setFormData({
      id: servicio.id,
      nombre: servicio.nombre || "",
      descripcion: servicio.descripcion || "",
      precio: servicio.precio || "",
      duracion: servicio.duracion || 30,
      imagen: null, // No cargar la imagen existente en el input
    })
    setDurationHours(hours)
    setDurationMinutes(minutes)
    setFormErrors({})
    setImagePreview(servicio.imagen || null) // Mostrar imagen actual como preview
    setFormMode("edit")
    setShowForm(true)
  }

  // Abrir vista de detalles - AHORA USA EL MISMO MODAL
  const handleOpenDetails = (servicio) => {
    const { hours, minutes } = minutesToHoursAndMinutes(servicio.duracion || 0)

    setFormData({
      id: servicio.id,
      nombre: servicio.nombre || "",
      descripcion: servicio.descripcion || "",
      precio: servicio.precio || "",
      duracion: servicio.duracion || 0,
      imagen: servicio.imagen || null,
    })
    setDurationHours(hours)
    setDurationMinutes(minutes)
    setFormErrors({})
    setImagePreview(servicio.imagen || null)
    setFormMode("view")
    setShowForm(true)
  }

  // Manejar envío del formulario - MEJORADO
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formMode === "view") {
      setShowForm(false)
      return
    }

    if (!validateForm()) {
      showNotification("Por favor, corrija los errores en el formulario", "error")
      return
    }

    try {
      setLoading(true)

      // Crear FormData para enviar archivos
      const formDataToSend = new FormData()
      formDataToSend.append("nombre", formData.nombre.trim())
      formDataToSend.append("descripcion", formData.descripcion.trim())
      formDataToSend.append("precio", formData.precio)
      formDataToSend.append("duracion", formData.duracion)
      // Solo agregar imagen si se seleccionó una nueva
      if (formData.imagen) {
        formDataToSend.append("imagen", formData.imagen)
      }

      if (formMode === "edit") {
        console.log("Actualizando servicio...")
        const updatedServicio = await serviciosService.updateServicio(formData.id, formDataToSend)
        console.log("Servicio actualizado:", updatedServicio)
        showNotification("¡Servicio actualizado exitosamente!", "success")

        // Actualizar el servicio en el estado local en lugar de recargar todo
        updateServicioInState(updatedServicio)
      } else if (formMode === "create") {
        console.log("Creando servicio...")
        await serviciosService.createServicio(formDataToSend)
        showNotification("¡Servicio creado exitosamente!", "success")

        // Solo recargar cuando se crea un nuevo servicio
        await fetchServicios()
      }

      setShowForm(false)
    } catch (err) {
      console.error("Error al procesar el formulario:", err)

      const errorMessage = handleApiError(err)

      setFormErrors({ general: errorMessage })
      showNotification(errorMessage, "error")
    } finally {
      setLoading(false)
    }
  }

  // Confirmar eliminación - SIMPLIFICADO
  const confirmDelete = (servicio) => {
    setServicioToDelete(servicio)
    setShowConfirmDialog(true)
  }

  // Eliminar servicio - CON MANEJO MEJORADO DE ERRORES DEL BACKEND
  const handleDelete = async () => {
    if (!servicioToDelete) return

    try {
      setLoading(true)
      await serviciosService.deleteServicio(servicioToDelete.id)

      showNotification("¡Servicio eliminado exitosamente!", "success")
      await fetchServicios()
    } catch (err) {
      console.error("Error al eliminar servicio:", err)
      
      // Manejar errores específicos del backend
      let errorMessage = "Ha ocurrido un error"
      
      if (err.response?.data) {
        const errorData = err.response.data
        
        // El backend devuelve un objeto con estructura específica
        if (errorData.error && errorData.detalle) {
          errorMessage = `${errorData.error}: ${errorData.detalle}`
        } else if (errorData.detalle) {
          errorMessage = errorData.detalle
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (typeof errorData === "string") {
          errorMessage = errorData
        } else if (typeof errorData === "object") {
          // Buscar mensajes de error en el objeto
          const errorMessages = []
          Object.entries(errorData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              errorMessages.push(...value)
            } else if (typeof value === "string") {
              errorMessages.push(value)
            }
          })
          
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join("; ")
          }
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      // Mostrar error en rojo (tipo "error")
      showNotification(errorMessage, "error")
    } finally {
      setLoading(false)
      setShowConfirmDialog(false)
      setServicioToDelete(null)
    }
  }

  // Cambiar estado del servicio - CON VALIDACIÓN DE ASOCIACIONES
  const handleToggleEstado = async (servicio) => {
    // Evitar múltiples clicks rápidos
    const toggleKey = `toggle-${servicio.id}`
    if (actionTimeouts.has(toggleKey)) {
      return
    }

    try {
      // Marcar como en proceso
      setActionTimeouts((prev) => new Set([...prev, toggleKey]))

      // NO VALIDAR CAMBIO DE ESTADO - Se permite cambiar estado libremente

      // Actualizar el estado localmente INMEDIATAMENTE para mejor UX
      const nuevoEstado = servicio.estado === "activo" ? "inactivo" : "activo"
      updateServicioInState({
        ...servicio,
        estado: nuevoEstado,
      })

      // Llamar al servicio para actualizar en el servidor
      await serviciosService.toggleServicioEstado(servicio.id)

      showNotification(`¡Servicio ${nuevoEstado === "activo" ? "activado" : "desactivado"} exitosamente!`, "success")

      // NO RECARGAR LA TABLA - ya se actualizó localmente
    } catch (err) {
      console.error("Error al cambiar estado del servicio:", err)

      // Si hay error, revertir el cambio local
      updateServicioInState(servicio)

      showNotification(
        `Error: ${err.response?.data?.message || err.response?.data?.detail || err.message || "Ha ocurrido un error"}`,
        "error",
      )
    } finally {
      // Liberar después de 1 segundo
      setTimeout(() => {
        setActionTimeouts((prev) => {
          const newSet = new Set(prev)
          newSet.delete(toggleKey)
          return newSet
        })
      }, 1000)
    }
  }

  // Ordenar servicios
  const handleSort = (key) => {
    let direction = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  // Filtrar y ordenar servicios - MEJORADO COMO EN OTROS MÓDULOS
  const filteredAndSortedServicios = () => {
    const filtered = servicios.filter((servicio) => {
      const searchLower = searchTerm.toLowerCase()
      
      // Obtener el estado como texto
      const estadoTexto = servicio.estado === "activo" ? "activo" : "inactivo"
      
      // Si el usuario escribe exactamente "activo" o "inactivo", filtrar por estado exacto
      if (searchLower === 'activo' || searchLower === 'inactivo') {
        return estadoTexto === searchLower
      }
      
      const matchesSearch = 
        // Campos básicos
        (servicio.nombre?.toLowerCase() || "").includes(searchLower) ||
        (servicio.descripcion?.toLowerCase() || "").includes(searchLower) ||
        (servicio.precio?.toString() || "").includes(searchLower) ||
        (servicio.duracion?.toString() || "").includes(searchLower) ||
        (servicio.observaciones?.toLowerCase() || "").includes(searchLower) ||
        
        // Estado
        estadoTexto.includes(searchLower) ||
        
        // Búsqueda por ID
        (servicio.id?.toString() || "").includes(searchLower) ||
        
        // Búsqueda en campos de fecha si existen
        (servicio.fecha_creacion?.toLowerCase() || "").includes(searchLower) ||
        (servicio.fecha_actualizacion?.toLowerCase() || "").includes(searchLower)

      const matchesFilter = !filterEstado || servicio.estado === filterEstado

      return matchesSearch && matchesFilter
    })

    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key] || ""
      const bValue = b[sortConfig.key] || ""

      if (sortConfig.key === "precio" || sortConfig.key === "duracion") {
        const aNum = Number.parseFloat(aValue) || 0
        const bNum = Number.parseFloat(bValue) || 0
        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum
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

  // Obtener servicios para la página actual
  const getCurrentPageItems = () => {
    const filtered = filteredAndSortedServicios()
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  // Calcular número total de páginas
  const totalPages = Math.ceil(filteredAndSortedServicios().length / itemsPerPage)

  // Cambiar de página
  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  // Renderizar indicador de ordenamiento
  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) {
      return <FaSort className="sort-icon" />
    }
    return sortConfig.direction === "asc" ? (
      <FaSortUp className="sort-icon active" />
    ) : (
      <FaSortDown className="sort-icon active" />
    )
  }

  // Formatear precio
  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="admin-container">
      {/* Toaster para las notificaciones */}
      <Toaster />

      {/* Contenedor unificado para header, filtros y tabla */}
      <div className="admin-content-wrapper">
        <div className="admin-header">
          <h1 className="admin-title">Gestión de Servicios</h1>
          <PermissionButton
            modulo="servicios"
            accion="crear"
            className="admin-button primary"
            onClick={handleOpenCreateForm}
            hidden={true}
          >
            <FaPlus /> Nuevo Servicio
          </PermissionButton>
        </div>

        {/* Filtros y búsqueda */}
        <div className="admin-filters">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar servicios por nombre, descripción, precio, duración, estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Filtro de estados */}
          <div className="filter-container">
            <FaFilter className="filter-icon" />
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>

          <div className="items-per-page">
            <span>Mostrar:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="items-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Tabla de servicios - SIN COLUMNA DE IMAGEN */}
        {loading && !showForm ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Cargando servicios...</p>
          </div>
        ) : error ? (
          <div className="admin-message error">
            <p>{error}</p>
            <button className="admin-button secondary" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("nombre")}>Nombre {renderSortIndicator("nombre")}</th>
                  <th onClick={() => handleSort("precio")}>Precio {renderSortIndicator("precio")}</th>
                  <th onClick={() => handleSort("duracion")}>Duración {renderSortIndicator("duracion")}</th>
                  <th onClick={() => handleSort("estado")}>Estado {renderSortIndicator("estado")}</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageItems().length > 0 ? (
                  getCurrentPageItems().map((servicio) => (
                    <tr key={servicio.id}>
                      <td>
                        <div className="service-info">
                          <div className="service-name">{servicio.nombre}</div>
                        </div>
                      </td>
                      <td className="price-cell">{formatPrice(servicio.precio)}</td>
                      <td>{formatDuration(servicio.duracion)}</td>
                      <td>
                        <div className="status-toggle">
                          <span className={`status-badge ${servicio.estado}`}>
                            {servicio.estado === "activo" ? "Activo" : "Inactivo"}
                          </span>
                          <PermissionWrapper
                            modulo="servicios"
                            accion="editar"
                          >
                            <button
                              className={`toggle-button ${servicio.estado}`}
                              onClick={() => handleToggleEstado(servicio)}
                              title={servicio.estado === "activo" ? "Desactivar" : "Activar"}
                            >
                              {servicio.estado === "activo" ? <FaTimes /> : <FaCheck />}
                            </button>
                          </PermissionWrapper>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <PermissionButton
                            modulo="servicios"
                            accion="ver_detalles"
                            className="action-button view"
                            onClick={() => handleOpenDetails(servicio)}
                            title="Ver detalles"
                            hidden={true}
                          >
                            <FaEye />
                          </PermissionButton>
                          <PermissionButton
                            modulo="servicios"
                            accion="editar"
                            className="action-button edit"
                            onClick={() => handleOpenEditForm(servicio)}
                            title="Editar servicio"
                            hidden={true}
                          >
                            <FaEdit />
                          </PermissionButton>
                          <PermissionButton
                            modulo="servicios"
                            accion="eliminar"
                            className="action-button delete"
                            onClick={() => confirmDelete(servicio)}
                            title="Eliminar servicio"
                            hidden={true}
                          >
                            <FaTrash />
                          </PermissionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">
                      No se encontraron servicios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="pagination-button" onClick={() => paginate(1)} disabled={currentPage === 1}>
            &laquo;
          </button>
          <button className="pagination-button" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
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

      {/* MODAL UNIFICADO para crear/editar/ver */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-container">
            <div className="modal-header">
              <h2>
                <FaServicestack className="form-icon" />
                {formMode === "create" && "Crear Nuevo Servicio"}
                {formMode === "edit" && "Editar Servicio"}
                {formMode === "view" && "Detalles del Servicio"}
              </h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="admin-form">
              {/* Error general */}
              {formErrors.general && (
                <div className="admin-message error">
                  <FaExclamationCircle /> {formErrors.general}
                </div>
              )}

              {/* Mostrar imagen en modo view */}
              {formMode === "view" && imagePreview && (
                <div className="image-preview" style={{ marginBottom: "1rem" }}>
                  <img src={imagePreview || "/placeholder.svg"} alt={formData.nombre} className="preview-image" />
                </div>
              )}

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="nombre">
                    <FaServicestack className="form-icon" /> Nombre del Servicio
                    {formMode !== "view" && <span className="required-asterisk">*</span>}
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className={formErrors.nombre ? "error" : ""}
                    placeholder="Ingrese el nombre del servicio"
                    required={formMode !== "view"}
                    disabled={formMode === "view"}
                    maxLength={100}
                  />
                  {formErrors.nombre && (
                    <div className="error-text">
                      <FaExclamationCircle /> {formErrors.nombre}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="precio">
                    <FaMoneyBillWave className="form-icon" /> Precio
                    {formMode !== "view" && <span className="required-asterisk">*</span>}
                  </label>
                  <input
                    type="number"
                    id="precio"
                    name="precio"
                    value={formData.precio}
                    onChange={handleInputChange}
                    className={formErrors.precio ? "error" : ""}
                    placeholder="Ingrese el precio"
                    required={formMode !== "view"}
                    disabled={formMode === "view"}
                    min="1"
                    max="999999999"
                    step="1"
                  />
                  {formErrors.precio && (
                    <div className="error-text">
                      <FaExclamationCircle /> {formErrors.precio}
                    </div>
                  )}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="duracion">
                    <FaClock className="form-icon" /> Duración
                    {formMode !== "view" && <span className="required-asterisk">*</span>}
                  </label>
                  <div
                    className={`duration-stepper ${formErrors.duracion ? "error" : ""} ${formMode === "view" ? "disabled" : ""}`}
                  >
                    <div className="duration-controls">
                      <div className="duration-section">
                        <div className="duration-label">Horas</div>
                        <div className="duration-input-group">
                          <button
                            type="button"
                            className="duration-button"
                            onClick={() => handleDurationChange("hours", "decrement")}
                            disabled={formMode === "view" || durationHours <= 0}
                          >
                            <FaMinus />
                          </button>
                          <div className="duration-display">{durationHours}</div>
                          <button
                            type="button"
                            className="duration-button"
                            onClick={() => handleDurationChange("hours", "increment")}
                            disabled={formMode === "view" || durationHours >= 6}
                          >
                            <FaPlusSmall />
                          </button>
                        </div>
                      </div>

                      <div className="duration-section">
                        <div className="duration-label">Minutos</div>
                        <div className="duration-input-group">
                          <button
                            type="button"
                            className="duration-button"
                            onClick={() => handleDurationChange("minutes", "decrement")}
                            disabled={formMode === "view" || (durationHours === 0 && durationMinutes <= 5)}
                          >
                            <FaMinus />
                          </button>
                          <div className="duration-display">{durationMinutes}</div>
                          <button
                            type="button"
                            className="duration-button"
                            onClick={() => handleDurationChange("minutes", "increment")}
                            disabled={formMode === "view" || (durationHours === 6 && durationMinutes >= 0)}
                          >
                            <FaPlusSmall />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="duration-total">
                      <div className="duration-total-label">Total</div>
                      <div className="duration-total-value">{formatDuration(formData.duracion)}</div>
                    </div>
                  </div>
                  {formErrors.duracion && (
                    <div className="error-text">
                      <FaExclamationCircle /> {formErrors.duracion}
                    </div>
                  )}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="descripcion">
                    <FaInfoCircle className="form-icon" /> Descripción
                    {formMode !== "view" && <span className="required-asterisk">*</span>}
                  </label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    className={formErrors.descripcion ? "error" : ""}
                    placeholder="Ingrese la descripción detallada del servicio"
                    required={formMode !== "view"}
                    disabled={formMode === "view"}
                    rows="3"
                    maxLength={500}
                  />
                  {formMode !== "view" && (
                    <div className="character-count">{formData.descripcion.length}/500 caracteres</div>
                  )}
                  {formErrors.descripcion && (
                    <div className="error-text">
                      <FaExclamationCircle /> {formErrors.descripcion}
                    </div>
                  )}
                </div>

                {/* Campo imagen - SOLO EN CREAR Y EDITAR */}
                {formMode !== "view" && (
                  <div className="form-group full-width">
                    <label htmlFor="imagen">
                      <FaImage className="form-icon" /> Imagen del Servicio
                      {formMode === "create" && <span className="required-asterisk">*</span>}
                    </label>
                    <input
                      type="file"
                      id="imagen"
                      name="imagen"
                      onChange={handleInputChange}
                      className={formErrors.imagen ? "error" : ""}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      required={formMode === "create"}
                    />
                    <div className="file-info">Formatos permitidos: JPG, PNG, GIF, WebP. Tamaño máximo: 5MB</div>
                    {formErrors.imagen && (
                      <div className="error-text">
                        <FaExclamationCircle /> {formErrors.imagen}
                      </div>
                    )}

                    {/* Preview de imagen */}
                    {imagePreview && (
                      <div className="image-preview">
                        <img src={imagePreview || "/placeholder.svg"} alt="Preview" className="preview-image" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="admin-button secondary" onClick={() => setShowForm(false)}>
                  <FaTimes /> {formMode === "view" ? "Cerrar" : "Cancelar"}
                </button>
                {formMode !== "view" && (
                  <button type="submit" className="admin-button primary" disabled={loading}>
                    {loading ? (
                      <>
                        <div className="spinner-small"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <FaCheck />
                        {formMode === "create" && "Crear Servicio"}
                        {formMode === "edit" && "Guardar Cambios"}
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diálogo de confirmación */}
      {showConfirmDialog && (
        <div className="modal-overlay">
          <div className="modal-container confirm-dialog">
            <div className="modal-header">
              <h2>
                <FaExclamationTriangle className="form-icon" />
                Confirmar Eliminación
              </h2>
              <button className="modal-close" onClick={() => setShowConfirmDialog(false)}>
                &times;
              </button>
            </div>

            <div className="confirm-content">
              <p>
                ¿Está seguro que desea eliminar el servicio <strong>"{servicioToDelete?.nombre}"</strong>?
              </p>
              <p className="warning-text">
                <FaExclamationTriangle /> Esta acción no se puede deshacer.
              </p>
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
                    <FaTrash /> Eliminar Servicio
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Servicios
