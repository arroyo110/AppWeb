"use client"

import { useState, useEffect, useCallback } from "react"
import InsumosService from "../../service/InsumosService"
import PermissionButton from "../../components/PermissionButton"
import PermissionWrapper from "../../components/PermissionWrapper"
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaEye,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaTimes,
  FaCheck,
  FaTag,
  FaBoxOpen,
  FaWarehouse,
  FaExclamationTriangle, // Importar para el diálogo de confirmación
} from "react-icons/fa"
import "../../styles/Admin.css"
import "../../styles/modals/InsumosModal.css"
import toast, { Toaster } from "react-hot-toast"

const Insumos = () => {
  // Estados para manejar los datos
  const [insumos, setInsumos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Estados para el formulario
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [formMode, setFormMode] = useState("create") // create, edit, view
  const [formData, setFormData] = useState({
    nombre: "",
    cantidad: "0", // Siempre inicializar en 0
    estado: "activo",
    categoria_insumo: "",
  })
  const [formErrors, setFormErrors] = useState({})
  const [generalError, setGeneralError] = useState("")

  // Estados para filtrado y ordenamiento
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategoria, setFilterCategoria] = useState("") // Este estado no se usa en el JSX actual, pero se mantiene
  const [sortConfig, setSortConfig] = useState({
    key: "nombre",
    direction: "asc",
  })

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Estados para confirmaciones
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [insumoToDelete, setInsumoToDelete] = useState(null)

  // Agregar estado para controlar acciones duplicadas
  const [actionTimeouts, setActionTimeouts] = useState(new Set())

  // Normalizador para comparar ignorando tildes/mayúsculas y colapsando espacios
  const normalizeText = (str) =>
    (str || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()

  // Cargar datos iniciales
  const fetchInsumos = async () => {
    try {
      setLoading(true)
      const insumosData = await InsumosService.getInsumos()
      console.log("Insumos cargados:", insumosData)
      setInsumos(insumosData)
      setError(null)
    } catch (err) {
      showNotification(err.message || "Error al cargar los insumos. Por favor, intente nuevamente.", "error")
      console.error("Error al cargar insumos:", err)
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [insumosData, categoriasData] = await Promise.all([
          InsumosService.getInsumos(),
          InsumosService.getCategorias(),
        ])
        console.log("Insumos cargados:", insumosData)
        console.log("Categorías cargadas:", categoriasData)
        setInsumos(insumosData)
        setCategorias(categoriasData)
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

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    // Limpieza especial para nombre: colapsar espacios y trim al vuelo
    const nextValue = name === "nombre" ? value.replace(/\s+/g, " ").trimStart() : value

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : nextValue,
    })

    // Validar el campo cuando cambia
    validateField(name, type === "checkbox" ? checked : value)
  }

  // Validar un campo específico
  const validateField = useCallback(
    (fieldName, value) => {
      const errors = { ...formErrors }

      switch (fieldName) {
        case "nombre":
          if (!value.trim()) {
            errors.nombre = "El nombre es requerido"
          } else if (value.trim().length < 3) {
            errors.nombre = "El nombre debe tener al menos 3 caracteres"
          } else if (value.trim().length > 100) {
            errors.nombre = "El nombre no puede exceder los 100 caracteres"
          } else if (!/^[A-Za-zÁÉÍÓÚÜÑñáéíóúü\s]+$/.test(value.trim())) {
            errors.nombre = "Solo se permiten letras, espacios y tildes"
          } else {
            // Validación del lado del cliente para nombres duplicados (ignorar tildes/espacios)
            const normValue = normalizeText(value)
            const existingInsumo = insumos.find((i) => normalizeText(i.nombre) === normValue && i.id !== formData.id)
            if (existingInsumo) {
              errors.nombre = "Ya existe un insumo con este nombre."
            } else {
              delete errors.nombre
            }
          }
          break

        case "categoria_insumo":
          if (!value) {
            errors.categoria_insumo = "La categoría es requerida"
          } else {
            delete errors.categoria_insumo
          }
          break

        default:
          break
      }

      setFormErrors(errors)
      return Object.keys(errors).length === 0
    },
    [formErrors, insumos, formData.id],
  )

  // Validar formulario completo
  const validateForm = useCallback(() => {
    const fields = ["nombre", "categoria_insumo"]

    let isValid = true
    const newErrors = {}

    fields.forEach((field) => {
      if (!validateField(field, formData[field])) {
        isValid = false
        newErrors[field] = formErrors[field]
      }
    })

    setFormErrors(newErrors)
    return isValid
  }, [formData, validateField, formErrors])

  // Abrir formulario para crear insumo
  const handleOpenCreateForm = () => {
    setFormData({
      nombre: "",
      cantidad: "0", // Siempre inicializar en 0
      estado: "activo",
      categoria_insumo: "", // Forzar a seleccionar explícitamente una categoría
    })
    setFormErrors({})
    setGeneralError("")
    setFormMode("create")
    setShowForm(true)
    setShowDetails(false)
  }

  // Abrir formulario para editar insumo
  const handleOpenEditForm = (insumo) => {
    // Extraer el ID de la categoría correctamente
    const categoriaId =
      typeof insumo.categoria_insumo === "object" ? insumo.categoria_insumo.id : insumo.categoria_insumo

    // Advertir si la categoría está inactiva
    const catObj = categorias.find((c) => c.id === Number.parseInt(categoriaId, 10))
    if (catObj && catObj.estado !== "activo") {
      showNotification(
        `Advertencia: la categoría '${catObj.nombre}' está inactiva. Puedes cambiarla antes de guardar.`,
        "warning",
      )
    }

    setFormData({
      id: insumo.id,
      nombre: insumo.nombre || "",
      cantidad: insumo.cantidad ? insumo.cantidad.toString() : "0",
      estado: insumo.estado || "activo",
      categoria_insumo: categoriaId,
    })
    setFormErrors({})
    setGeneralError("")
    setFormMode("edit")
    setShowForm(true)
    setShowDetails(false)
  }

  // Abrir vista de detalles
  const handleOpenDetails = (insumo) => {
    const categoriaId =
      typeof insumo.categoria_insumo === "object" ? insumo.categoria_insumo.id : insumo.categoria_insumo

    setFormData({
      id: insumo.id,
      nombre: insumo.nombre || "",
      cantidad: insumo.cantidad ? insumo.cantidad.toString() : "0",
      estado: insumo.estado || "activo",
      categoria_insumo: categoriaId,
    })
    setFormErrors({})
    setGeneralError("")
    setFormMode("view")
    setShowForm(true)
    setShowDetails(false)
  }

  // Actualizar insumo en el estado local
  const updateInsumoInState = (updatedInsumo) => {
    setInsumos((prevInsumos) => {
      return prevInsumos.map((insumo) => {
        if (insumo.id === updatedInsumo.id) {
          // Buscar el objeto de categoría completo basado en el ID
          const categoriaObj = categorias.find((c) => {
            const categoriaId =
              typeof updatedInsumo.categoria_insumo === "object"
                ? updatedInsumo.categoria_insumo.id
                : updatedInsumo.categoria_insumo
            return c.id === Number.parseInt(categoriaId, 10)
          })

          return {
            ...insumo,
            ...updatedInsumo,
            categoria_insumo: categoriaObj || insumo.categoria_insumo,
          }
        }
        return insumo
      })
    })
  }

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validar formulario
    if (!validateForm()) {
      // Mostrar todos los errores de validación en un solo toast
      const errorMessages = Object.values(formErrors).join("; ")
      if (errorMessages) {
        showNotification(errorMessages, "error")
      } else {
        showNotification("Por favor, corrige los errores en el formulario.", "error")
      }
      return
    }

    try {
      setLoading(true)
      setGeneralError("")

      // Crear una copia del formData para manipulación
      const formDataToSend = { ...formData }

      // Para crear: forzar cantidad a 0
      if (formMode === "create") {
        formDataToSend.cantidad = 0
      } else {
        // Para editar: no enviar cantidad (se maneja desde compras)
        delete formDataToSend.cantidad
      }

      // Normalizar nombre antes de enviar (trim/colapso espacios)
      formDataToSend.nombre = (formDataToSend.nombre || "").replace(/\s+/g, " ").trim()

      formDataToSend.categoria_insumo = Number.parseInt(formDataToSend.categoria_insumo)

      if (formMode === "create") {
        console.log("Enviando datos para crear insumo:", formDataToSend)
        const newInsumo = await InsumosService.createInsumo(formDataToSend)
        console.log("Insumo creado:", newInsumo)
        showNotification("¡Insumo creado exitosamente!", "success")

        // Recargar la lista de insumos para asegurar datos actualizados
        await fetchInsumos()
      } else if (formMode === "edit") {
        console.log("Enviando datos para actualizar insumo:", formDataToSend)
        const updatedInsumo = await InsumosService.updateInsumo(formDataToSend.id, formDataToSend)
        console.log("Insumo actualizado:", updatedInsumo)
        showNotification("¡Insumo actualizado exitosamente!", "success")

        // Actualizar el insumo en el estado local
        updateInsumoInState(updatedInsumo)
      }

      // Cerrar el formulario
      setShowForm(false)
    } catch (err) {
      console.error("Error al procesar el formulario:", err)

      // Extraer mensaje de error detallado
      let errorMessage = "Ha ocurrido un error"

      if (err.response?.data) {
        const errorData = err.response.data

        if (typeof errorData === "string") {
          errorMessage = errorData
        } else if (typeof errorData === "object") {
          const errorMessages = []

          Object.entries(errorData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              errorMessages.push(`${value.join(", ")}`) // Eliminar el prefijo del campo
            } else if (typeof value === "string") {
              errorMessages.push(`${value}`) // Eliminar el prefijo del campo
            }
          })

          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join("; ")
          } else if (errorData.message || errorData.detail) {
            errorMessage = errorData.message || errorData.detail
          }
        }
      } else if (err.message) {
        errorMessage = err.message
      }

      setGeneralError(`Error: ${errorMessage}`) // Mantener el error general para el modal si es necesario
      showNotification(errorMessage, "error") // Mostrar notificación también
    } finally {
      setLoading(false)
    }
  }

  // Confirmar eliminación de insumo con pre-chequeo de asociaciones
  const confirmDelete = async (insumo) => {
    try {
      const check = await InsumosService.checkInsumoCanBeDeleted(insumo.id)
      if (!check?.puede_eliminar) {
        const compras = Number(check?.compras_info?.total || 0)
        const abastecimientos = Number(check?.abastecimientos_info?.total || 0)
        const total = compras + abastecimientos
        const detalle = compras > 0 && abastecimientos > 0
          ? `${compras} compra(s) y ${abastecimientos} abastecimiento(s)`
          : compras > 0
            ? `${compras} compra(s)`
            : `${abastecimientos} abastecimiento(s)`
        showNotification(
          `No se puede eliminar el insumo '${check?.insumo_nombre || insumo.nombre}' porque tiene ${detalle} asociado(s).`,
          "error",
        )
        return
      }
    } catch (err) {
      showNotification("No fue posible verificar asociaciones del insumo. Intente nuevamente.", "error")
      return
    }

    setInsumoToDelete(insumo)
    setShowConfirmDialog(true)
  }

  // Eliminar insumo
  const handleDelete = async () => {
    if (!insumoToDelete) return

    try {
      setLoading(true)
      console.log("🗑️ Intentando eliminar insumo:", insumoToDelete)

      // Verificar que el insumo tenga un ID válido
      if (!insumoToDelete.id || insumoToDelete.id === "undefined" || insumoToDelete.id === "null") {
        showNotification("Error: ID de insumo inválido", "error")
        return
      }

      const result = await InsumosService.deleteInsumo(insumoToDelete.id)
      console.log("✅ Insumo eliminado exitosamente:", result)

      // Actualizar la lista de insumos localmente
      setInsumos((prevInsumos) => prevInsumos.filter((insumo) => insumo.id !== insumoToDelete.id))

      showNotification(result.message || "¡Insumo eliminado exitosamente!", "success")

      // Recargar la lista completa para asegurar consistencia
      setTimeout(() => {
        fetchInsumos()
      }, 1000)
    } catch (err) {
      console.error("❌ Error detallado al eliminar insumo:", err)

      // Manejo de errores más detallado
      let errorMessage = "Error desconocido al eliminar el insumo"

      // Si el error viene de la validación del servicio (con asociaciones)
      if (err.message && err.message.includes("No se puede eliminar el insumo")) {
        errorMessage = err.message
      } else if (err.response) {
        console.error("Respuesta del servidor:", {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers,
        })

        switch (err.response.status) {
          case 404:
            errorMessage = "El insumo no existe o ya fue eliminado."
            // Actualizar la lista para reflejar el cambio
            setInsumos((prevInsumos) => prevInsumos.filter((insumo) => insumo.id !== insumoToDelete.id))
            break
          case 400:
            errorMessage =
              err.response.data?.error ||
              err.response.data?.message ||
              err.response.data?.detail ||
              "Solicitud inválida. Verifique que el insumo no tenga dependencias."
            break
          case 403:
            errorMessage = "No tienes permisos para eliminar este insumo."
            break
          case 409:
            errorMessage = "No se puede eliminar el insumo porque está siendo utilizado en otros registros."
            break
          case 500:
            errorMessage = "Error interno del servidor. Contacte al administrador."
            break
          default:
            if (err.response.data) {
              if (typeof err.response.data === "string") {
                errorMessage = err.response.data
              } else if (err.response.data.error) {
                errorMessage = err.response.data.error
              } else if (err.response.data.message) {
                errorMessage = err.response.data.message
              } else if (err.response.data.detail) {
                errorMessage = err.response.data.detail
              }
            }
        }
      } else if (err.request) {
        console.error("No se recibió respuesta del servidor:", err.request)
        errorMessage = "No se pudo conectar con el servidor. Verifique su conexión."
      } else {
        console.error(err.message)
        errorMessage = err.message
      }

      showNotification(errorMessage, "error")
    } finally {
      setLoading(false)
      setShowConfirmDialog(false)
      setInsumoToDelete(null)
    }
  }

  // Activar/Desactivar insumo
  const handleToggleActive = async (insumo) => {
    try {
      setLoading(true)
      // Si se va a desactivar, validar asociaciones como en Categoría de Insumos
      if (insumo.estado === "activo") {
        try {
          const check = await InsumosService.checkInsumoCanBeDeleted(insumo.id)
          const compras = Number(check?.compras_info?.total || 0)
          const abastecimientos = Number(check?.abastecimientos_info?.total || 0)
          const total = compras + abastecimientos
          if (total > 0) {
            showNotification(
              `No se puede inactivar: el insumo está asociado a ${compras} compra(s) y ${abastecimientos} abastecimiento(s).`,
              "warning",
            )
            return
          }
        } catch (preErr) {
          showNotification(
            "No fue posible verificar asociaciones del insumo. Intente nuevamente o contacte al administrador.",
            "error",
          )
          return
        }
      }

      await InsumosService.cambiarEstado(insumo.id)

      // Actualizar el insumo en el estado local
      updateInsumoInState({
        ...insumo,
        estado: insumo.estado === "activo" ? "inactivo" : "activo",
      })

      showNotification(`¡Insumo ${insumo.estado === "activo" ? "desactivado" : "activado"} exitosamente!`, "success")
    } catch (err) {
      console.error("Error al cambiar estado del insumo:", err)
      showNotification(
        `Error: ${err.response?.data?.message || err.response?.data?.detail || err.message || "Ha ocurrido un error"}`,
        "error",
      )
    } finally {
      setLoading(false)
    }
  }

  // Ordenar insumos
  const handleSort = (key) => {
    let direction = "asc"

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }

    setSortConfig({ key, direction })
  }

  // Obtener nombre de categoría por ID
  const getCategoriaName = (categoria) => {
    if (!categoria) return "Sin categoría"

    // Si categoria es un objeto con propiedad nombre
    if (typeof categoria === "object" && categoria.nombre) {
      return categoria.nombre
    }

    // Si es un ID, buscar en el array de categorías
    const categoriaObj = categorias.find((cat) => cat.id === Number.parseInt(categoria, 10))
    return categoriaObj ? categoriaObj.nombre : "Sin categoría"
  }

  // Filtrar y ordenar insumos
  const filteredAndSortedInsumos = () => {
    // Filtrar por término de búsqueda - BUSCAR EN TODOS LOS CAMPOS
    const filtered = insumos.filter((insumo) => {
      const raw = searchTerm.toLowerCase()
      const searchLower = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      
      // Obtener el nombre de la categoría para búsqueda
      const categoriaNombre = getCategoriaName(insumo.categoria_insumo)?.toLowerCase() || ""
      
      // Obtener el estado como texto
      const estadoTexto = insumo.estado === "activo" ? "activo" : "inactivo"

      // Si el usuario escribe exactamente "activo" o "inactivo", filtrar por igualdad estricta de estado
      if (searchLower === 'activo' || searchLower === 'inactivo') {
        return estadoTexto === searchLower
      }
      
      return (
        // Campos básicos
        (insumo.nombre?.toLowerCase() || "").includes(searchLower) ||
        (insumo.cantidad?.toString() || "").includes(searchLower) ||
        (insumo.estado?.toLowerCase() || "").includes(searchLower) ||
        
        // Categoría y estado
        categoriaNombre.includes(searchLower) ||
        estadoTexto.includes(searchLower) ||
        
        // Búsqueda por ID
        (insumo.id?.toString() || "").includes(searchLower) ||
        
        // Búsqueda en campos de fecha si existen
        (insumo.fecha_creacion?.toLowerCase() || "").includes(searchLower) ||
        (insumo.fecha_actualizacion?.toLowerCase() || "").includes(searchLower) ||
        
        // Búsqueda en descripción si existe
        (insumo.descripcion?.toLowerCase() || "").includes(searchLower)
      )
    })

    // Ordenar
    const sorted = [...filtered].sort((a, b) => {
      // Caso especial para ordenar por categoría
      if (sortConfig.key === "categoria_insumo") {
        const categoriaA = getCategoriaName(a.categoria_insumo)
        const categoriaB = getCategoriaName(b.categoria_insumo)

        if (categoriaA < categoriaB) {
          return sortConfig.direction === "asc" ? -1 : 1
        }
        if (categoriaA > categoriaB) {
          return sortConfig.direction === "asc" ? 1 : -1
        }
        return 0
      }

      // Ordenamiento para otros campos
      const aValue = a[sortConfig.key] || ""
      const bValue = b[sortConfig.key] || ""

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

  // Obtener insumos para la página actual
  const getCurrentPageItems = () => {
    const filtered = filteredAndSortedInsumos()
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  // Calcular número total de páginas
  const totalPages = Math.ceil(filteredAndSortedInsumos().length / itemsPerPage)

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


  return (
    <div className="admin-container">
      {/* Toaster para las notificaciones */}
      <Toaster />
      <div className="admin-header">
        <h1 className="admin-title">Gestión de Insumos</h1>
        <PermissionButton
          modulo="insumos"
          accion="crear"
          className="admin-button primary"
          onClick={handleOpenCreateForm}
          hidden={true}
        >
          <FaPlus /> Nuevo Insumo
        </PermissionButton>
      </div>

      {/* Filtros y búsqueda */}
      <div className="admin-filters">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar insumos..."
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
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Tabla de insumos */}
      {loading && !showForm && !showDetails ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando insumos...</p>
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
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("nombre")}>Nombre {renderSortIndicator("nombre")}</th>
                  <th onClick={() => handleSort("cantidad")}>Cantidad {renderSortIndicator("cantidad")}</th>
                  <th onClick={() => handleSort("categoria_insumo")}>
                    Categoría {renderSortIndicator("categoria_insumo")}
                  </th>
                  <th onClick={() => handleSort("estado")}>Estado {renderSortIndicator("estado")}</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageItems().length > 0 ? (
                  getCurrentPageItems().map((insumo) => (
                    <tr key={insumo.id}>
                      <td>{insumo.nombre || "Sin nombre"}</td>
                      <td>{insumo.cantidad}</td>
                      <td>{getCategoriaName(insumo.categoria_insumo)}</td>
                      <td>
                        <div className="status-toggle">
                          <span className={`status-badge ${insumo.estado === "activo" ? "active" : "inactive"}`}>
                            {insumo.estado === "activo" ? "Activo" : "Inactivo"}
                          </span>
                          <PermissionWrapper
                            modulo="insumos"
                            accion="editar"
                          >
                            <button
                              className={`toggle-button ${insumo.estado === "activo" ? "active" : "inactive"}`}
                              onClick={() => handleToggleActive(insumo)}
                              title={insumo.estado === "activo" ? "Desactivar" : "Activar"}
                            >
                              {insumo.estado === "activo" ? <FaTimes /> : <FaCheck />}
                            </button>
                          </PermissionWrapper>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <PermissionButton
                            modulo="insumos"
                            accion="ver_detalles"
                            className="action-button view"
                            onClick={() => handleOpenDetails(insumo)}
                            title="Ver detalles"
                            hidden={true}
                          >
                            <FaEye />
                          </PermissionButton>
                          <PermissionButton
                            modulo="insumos"
                            accion="editar"
                            className="action-button edit"
                            onClick={() => handleOpenEditForm(insumo)}
                            title="Editar insumo"
                            hidden={true}
                          >
                            <FaEdit />
                          </PermissionButton>
                          <PermissionButton
                            modulo="insumos"
                            accion="eliminar"
                            className="action-button delete"
                            onClick={() => confirmDelete(insumo)}
                            title="Eliminar insumo"
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
                      No se encontraron insumos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
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

      {/* Formulario modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>
                {formMode === "create" && "Crear Nuevo Insumo"}
                {formMode === "edit" && "Editar Insumo"}
                {formMode === "view" && "Detalles del Insumo"}
              </h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                &times;
              </button>
            </div>

            {/* Mostrar error general si existe */}
            {generalError && <div className="general-error">{generalError}</div>}

            <form onSubmit={handleSubmit} className="admin-form">
              <div className={`form-grid ${formMode === "view" ? "form-grid-view" : "form-grid-edit"}`}>
                <div className="form-group">
                  <label htmlFor="nombre">
                    <FaBoxOpen className="form-icon" /> Nombre
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className={formErrors.nombre ? "error" : ""}
                    required={formMode !== "view"}
                    maxLength={100}
                    placeholder="Nombre del insumo"
                    disabled={formMode === "view"}
                  />
                  {formErrors.nombre && <div className="error-text">{formErrors.nombre}</div>}
                </div>

                {/* Solo mostrar cantidad en modo vista */}
                {formMode === "view" && (
                  <div className="form-group">
                    <label htmlFor="cantidad">
                      <FaWarehouse className="form-icon" /> Cantidad
                    </label>
                    <input
                      type="text"
                      id="cantidad"
                      name="cantidad"
                      value={formData.cantidad}
                      className="numeric-input"
                      disabled={true}
                    />
                  </div>
                )}

                <div className="form-group" style={formMode === "view" ? { gridColumn: '1 / -1' } : undefined}>
                  <label htmlFor="categoria_insumo">
                    <FaTag className="form-icon" /> Categoría
                  </label>
                  <select
                    id="categoria_insumo"
                    name="categoria_insumo"
                    value={formData.categoria_insumo}
                    onChange={handleInputChange}
                    className={formErrors.categoria_insumo ? "error" : ""}
                    required={formMode !== "view"}
                    disabled={formMode === "view"}
                  >
                    <option value="">Seleccione una categoría</option>
                    {categorias
                      .filter((categoria) => categoria.estado === "activo")
                      .sort((a,b)=> a.nombre.localeCompare(b.nombre, 'es', { sensitivity:'base' }))
                      .map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nombre}
                        </option>
                      ))}
                  </select>
                  {formErrors.categoria_insumo && <div className="error-text">{formErrors.categoria_insumo}</div>}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="admin-button secondary" onClick={() => setShowForm(false)}>
                  {formMode === "view" ? "Cerrar" : "Cancelar"}
                </button>
                {formMode !== "view" && (
                  <button type="submit" className="admin-button primary" disabled={loading || !!formErrors.nombre || !!formErrors.categoria_insumo || !formData.nombre || !formData.categoria_insumo}>
                    {loading ? (
                      <>
                        <div className="spinner-small"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        {formMode === "create" && "Crear Insumo"}
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
              <h2>Confirmar Eliminación</h2>
              <button className="modal-close" onClick={() => setShowConfirmDialog(false)}>
                &times;
              </button>
            </div>

            <div className="confirm-content">
              <div className="warning-icon">
                <FaExclamationTriangle />
              </div>
              <p>
                ¿Está seguro que desea eliminar el insumo <strong>{insumoToDelete?.nombre}</strong>?
              </p>
              <p className="warning-text">Esta acción no se puede deshacer.</p>
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
  )
}

export default Insumos
