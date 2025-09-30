"use client"

import { useState, useEffect } from "react"
import {
  FaUserPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaEye,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaIdCard,
  FaPhone,
  FaEnvelope,
  FaTimes,
  FaUser,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaCheck,
} from "react-icons/fa"
import ClienteService from "../../service/clientesService"
import PermissionButton from "../../components/PermissionButton"
import PermissionWrapper from "../../components/PermissionWrapper"
import "../../styles/modals/ClientesModal.css"
import toast, { Toaster } from "react-hot-toast"

const Clientes = () => {
  // Estados para manejar los datos
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Estados para el formulario
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [formMode, setFormMode] = useState("create") // create, edit, view
  const [formData, setFormData] = useState({
    nombre: "",
    tipo_documento: "CC",
    documento: "",
    direccion: "",
    genero: "M",
    celular: "",
    correo_electronico: "",
    // NO incluimos password en el estado inicial
    estado: true,
  })
  const [formErrors, setFormErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")

  // Estados para filtrado y ordenamiento
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState({
    key: "nombre",
    direction: "asc",
  })

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Estados para confirmaciones
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [clienteToDelete, setClienteToDelete] = useState(null)

  // Estado para controlar acciones duplicadas
  const [actionTimeouts, setActionTimeouts] = useState(new Set())

  // Función para mostrar notificaciones con react-hot-toast
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
  const fetchClientes = async () => {
    setLoading(true)
    try {
      const data = await ClienteService.getClientes()
      console.log("Clientes cargados:", data)
      setClientes(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      console.error("Error al cargar clientes:", err)
      setError("Error al cargar los clientes. Por favor, intente nuevamente.")
      setClientes([])
      showNotification("Error al cargar los clientes", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  // Función para manejar confirmación de contraseña
  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value)
    validateField("confirmPassword", e.target.value)
  }

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === "checkbox" ? checked : value
    const updatedFormData = {
      ...formData,
      [name]: newValue,
    }
    setFormData(updatedFormData)
    // Validar el campo cuando cambia
    validateFieldWithData(name, newValue, updatedFormData)
    // Si cambió el tipo de documento, re-validar el número de documento
    if (name === "tipo_documento" && updatedFormData.documento) {
      validateFieldWithData("documento", updatedFormData.documento, updatedFormData)
    }
  }

  // Validar un campo específico con datos actualizados (mejorado)
  const validateFieldWithData = (fieldName, value, currentFormData = formData) => {
    const errors = { ...formErrors }
    switch (fieldName) {
      case "nombre":
        if (!value || !value.trim()) {
          errors.nombre = "El nombre es requerido"
        } else if (value.trim().length < 10) {
          errors.nombre = "El nombre debe tener al menos 10 caracteres"
        } else if (value.trim().length > 100) {
          errors.nombre = "El nombre no puede exceder los 100 caracteres"
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{10,100}$/.test(value.trim())) {
          errors.nombre = "Nombre inválido (solo letras y espacios, 10-100 caracteres)"
        } else {
          delete errors.nombre
        }
        break
      case "documento": {
        const tipoDocumento = currentFormData.tipo_documento
        const documentoValue = fieldName === "documento" ? value : currentFormData.documento
        if (!documentoValue || !documentoValue.trim()) {
          errors.documento = "El documento es requerido"
        } else {
          let isValid = false
          const documentoTrimmed = documentoValue.trim()
          switch (tipoDocumento) {
            case "CC":
              isValid = /^\d{6,11}$/.test(documentoTrimmed)
              if (!isValid) errors.documento = "Cédula inválida (6-11 dígitos)"
              break
            case "TI":
              isValid = /^(1|0)\d{5,10}$/.test(documentoTrimmed)
              if (!isValid) errors.documento = "TI inválida (inicia en 1 o 0, 6-11 dígitos)"
              break
            case "CE":
              isValid = /^[a-zA-Z0-9]{6,15}$/.test(documentoTrimmed)
              if (!isValid) errors.documento = "CE inválida (6-15 caracteres alfanuméricos)"
              break
            case "PP":
              isValid = /^[a-zA-Z0-9]{8,12}$/.test(documentoTrimmed)
              if (!isValid) errors.documento = "Pasaporte inválido (8-12 caracteres alfanuméricos)"
              break
          }
          if (isValid) {
            delete errors.documento
          }
        }
        break
      }
      case "celular":
        if (!value || !value.trim()) {
          errors.celular = "El celular es requerido"
        } else if (!/^[3][0-9]{9}$/.test(value.trim())) {
          errors.celular = "Celular inválido (debe comenzar con 3 y tener 10 dígitos)"
        } else {
          delete errors.celular
        }
        break
      case "correo_electronico":
        if (!value || !value.trim()) {
          errors.correo_electronico = "El correo electrónico es requerido"
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          errors.correo_electronico = "Correo electrónico inválido"
        } else if (value.trim().length > 100) {
          errors.correo_electronico = "El correo no puede exceder los 100 caracteres"
        } else {
          delete errors.correo_electronico
        }
        break
      case "direccion":
        if (!value || !value.trim()) {
          errors.direccion = "La dirección es requerida"
        } else if (value.trim().length < 10) {
          errors.direccion = "La dirección debe tener al menos 10 caracteres"
        } else if (value.trim().length > 200) {
          errors.direccion = "La dirección no puede exceder los 200 caracteres"
        } else if (!/^[a-zA-Z0-9\s.#,\-°]{10,200}$/.test(value.trim())) {
          errors.direccion = "Formato de dirección inválido. Use caracteres alfanuméricos, #, -, °, . y ,"
        } else {
          delete errors.direccion
        }
        break
      case "genero":
        if (!value) {
          errors.genero = "El género es requerido"
        } else {
          delete errors.genero
        }
        break
      // REMOVIDO: Validaciones de password ya que no se usa en crear
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Validar un campo específico (wrapper para compatibilidad)
  const validateField = (fieldName, value) => {
    return validateFieldWithData(fieldName, value, formData)
  }

  // Validar formulario completo
  const validateForm = () => {
    const fields = ["nombre", "documento", "celular", "correo_electronico", "direccion", "genero"]
    // NO validamos password en modo crear ya que se genera automáticamente

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
    setFormErrors(newErrors)
    return isValid
  }

  // Abrir formulario para crear cliente
  const handleOpenCreateForm = () => {
    setFormData({
      nombre: "",
      tipo_documento: "CC",
      documento: "",
      direccion: "",
      celular: "",
      correo_electronico: "",
      // NO incluimos password
      genero: "M",
      estado: true,
    })
    setConfirmPassword("")
    setFormErrors({})
    setFormMode("create")
    setShowForm(true)
    setShowDetails(false)
    setShowPassword(false)
  }

  // Abrir formulario para editar cliente
  const handleOpenEditForm = (cliente) => {
    setFormData({
      id: cliente.id,
      nombre: cliente.nombre || "",
      tipo_documento: cliente.tipo_documento || "CC",
      documento: cliente.documento || "",
      direccion: cliente.direccion || "",
      celular: cliente.celular || "",
      correo_electronico: cliente.correo_electronico || "",
      genero: cliente.genero || "M",
      estado: cliente.estado !== undefined ? cliente.estado : true,
    })
    setConfirmPassword("")
    setFormErrors({})
    setFormMode("edit")
    setShowForm(true)
    setShowDetails(false)
  }

  // Abrir vista de detalles
  const handleOpenDetails = (cliente) => {
    setFormData({
      id: cliente.id,
      nombre: cliente.nombre || "",
      tipo_documento: cliente.tipo_documento || "CC",
      documento: cliente.documento || "",
      direccion: cliente.direccion || "",
      celular: cliente.celular || "",
      correo_electronico: cliente.correo_electronico || "",
      genero: cliente.genero || "M",
      estado: cliente.estado !== undefined ? cliente.estado : true,
    })
    setFormMode("view")
    setShowDetails(true)
    setShowForm(false)
  }

  // Actualizar cliente en el estado local
  const updateClienteInState = (updatedCliente) => {
    setClientes((prevClientes) => {
      return prevClientes.map((cliente) => {
        if (cliente.id === updatedCliente.id) {
          return {
            ...cliente,
            ...updatedCliente,
          }
        }
        return cliente
      })
    })
  }

  // Alternar visibilidad de la contraseña
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Activar/Desactivar cliente con validaciones (igual que en Servicios)
  const handleToggleActive = async (cliente) => {
    const toggleKey = `toggle-${cliente.id}`
    if (actionTimeouts.has(toggleKey)) {
      return
    }
    try {
      setActionTimeouts((prev) => new Set([...prev, toggleKey]))
      
      // NO VALIDAR CAMBIO DE ESTADO - Se permite cambiar estado libremente
      
      let updatedCliente
      if (cliente.estado) {
        updatedCliente = await ClienteService.desactivarCliente(cliente.id)
      } else {
        updatedCliente = await ClienteService.activarCliente(cliente.id)
      }
      // Actualizar el cliente en el estado local
      updateClienteInState({
        ...cliente,
        estado: !cliente.estado,
      })
      showNotification(`¡Cliente ${cliente.estado ? "desactivado" : "activado"} exitosamente!`, "success")
    } catch (err) {
      console.error("Error al cambiar estado del cliente:", err)
      updateClienteInState(cliente)
      showNotification(
        `Error: ${err.response?.data?.message || err.response?.data?.detail || err.message || "Ha ocurrido un error"}`,
        "error",
      )
    } finally {
      setTimeout(() => {
        setActionTimeouts((prev) => {
          const newSet = new Set(prev)
          newSet.delete(toggleKey)
          return newSet
        })
      }, 1000)
    }
  }

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault()
    // Validar formulario
    if (!validateForm()) {
      showNotification("Por favor corrija los errores en el formulario", "error")
      return
    }
    try {
      setLoading(true)
      if (formMode === "create") {
        console.log("Enviando datos para crear cliente:", formData)
        const newCliente = await ClienteService.createCliente(formData)
        console.log("Cliente creado:", newCliente)
        // Mostrar mensaje personalizado si se generó contraseña temporal
        if (newCliente.mensaje) {
          showNotification(newCliente.mensaje, "success")
        } else {
          showNotification("¡Cliente creado exitosamente!", "success")
        }
        setShowForm(false)
        await fetchClientes()
      } else if (formMode === "edit") {
        console.log("Enviando datos para actualizar cliente:", formData)
        const updatedCliente = await ClienteService.updateCliente(formData.id, formData)
        console.log("Cliente actualizado:", updatedCliente)
        showNotification("¡Cliente actualizado exitosamente!", "success")
        setShowForm(false)
        updateClienteInState(updatedCliente)
      }
    } catch (err) {
      console.error("Error al procesar el formulario:", err)
      showNotification(`Error: ${err.message || "Ha ocurrido un error inesperado"}`, "error")
    } finally {
      setLoading(false)
    }
  }

  // Confirmar eliminación de cliente con validaciones (igual que en Servicios)
  const confirmDelete = async (cliente) => {
    try {
      const clienteService = new ClienteService()
      const checkResult = await clienteService.checkClienteCanBeDeleted(cliente.id)
      if (!checkResult.puede_eliminar) {
        const clienteNombre = checkResult.cliente_nombre || cliente.nombre || "este cliente"
        const citas = checkResult.citas_info?.total || 0
        let messageDetail = ""
        if (citas > 0) {
          messageDetail = `Este cliente tiene ${citas} cita(s) registrada(s) en el sistema. Para poder eliminarlo, primero debe eliminar todas sus citas asociadas.`
        }
        showNotification(
          `❌ No se puede eliminar el cliente '${clienteNombre}'\n\n${messageDetail}`,
          "error"
        )
        return
      }
    } catch (checkError) {
      if (checkError.message && checkError.message.includes("No se puede eliminar")) {
        showNotification(checkError.message, "error")
        return
      }
      console.warn("⚠️ No se pudo verificar asociaciones, continuando con confirmación:", checkError)
    }
    setClienteToDelete(cliente)
    setShowConfirmDialog(true)
  }

  // Eliminar cliente con manejo mejorado de errores (igual que en Servicios)
  const handleDelete = async () => {
    if (!clienteToDelete) return
    try {
      setLoading(true)
      await ClienteService.deleteCliente(clienteToDelete.id)
      showNotification("¡Cliente eliminado exitosamente!", "success")
      await fetchClientes()
    } catch (err) {
      console.error("Error al eliminar cliente:", err)
      let errorMessage = "Ha ocurrido un error"
      let solucion = ""
      
      if (err.response?.data) {
        const errorData = err.response.data
        if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.detalle) {
          errorMessage = errorData.detalle
        } else if (typeof errorData === "string") {
          errorMessage = errorData
        } else if (typeof errorData === "object") {
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
      
      showNotification(errorMessage + solucion, "error")
    } finally {
      setLoading(false)
      setShowConfirmDialog(false)
      setClienteToDelete(null)
    }
  }

  // Ordenar clientes
  const handleSort = (key) => {
    let direction = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  // Filtrar y ordenar clientes
  const filteredAndSortedClientes = () => {
    // Filtrar por término de búsqueda - BUSCAR EN TODOS LOS CAMPOS
    const filtered = clientes.filter((cliente) => {
      const searchLower = searchTerm.toLowerCase()
      
      // Obtener el estado como texto
      const estadoTexto = cliente.estado ? "activo" : "inactivo"
      
      // Obtener el género como texto
      const generoTexto = cliente.genero === "M" ? "masculino" : 
                         cliente.genero === "F" ? "femenino" : 
                         cliente.genero === "NB" ? "no binario" : 
                         cliente.genero === "O" ? "otro" : 
                         cliente.genero === "N" ? "prefiero no decirlo" : ""
      
      return (
        // Campos básicos
        (cliente.nombre?.toLowerCase() || "").includes(searchLower) ||
        (cliente.correo_electronico?.toLowerCase() || "").includes(searchLower) ||
        (cliente.documento?.toLowerCase() || "").includes(searchLower) ||
        (cliente.tipo_documento?.toLowerCase() || "").includes(searchLower) ||
        (cliente.celular?.toLowerCase() || "").includes(searchLower) ||
        (cliente.direccion?.toLowerCase() || "").includes(searchLower) ||
        
        // Género y estado
        generoTexto.includes(searchLower) ||
        estadoTexto.includes(searchLower) ||
        
        // Búsqueda por ID
        (cliente.id?.toString() || "").includes(searchLower) ||
        
        // Búsqueda combinada de tipo documento + documento
        `${cliente.tipo_documento || ""} ${cliente.documento || ""}`.toLowerCase().includes(searchLower) ||
        
        // Búsqueda en campos de fecha si existen
        (cliente.fecha_creacion?.toLowerCase() || "").includes(searchLower) ||
        (cliente.fecha_actualizacion?.toLowerCase() || "").includes(searchLower)
      )
    })

    // Ordenar
    const sorted = [...filtered].sort((a, b) => {
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

  // Obtener clientes para la página actual
  const getCurrentPageItems = () => {
    const filtered = filteredAndSortedClientes()
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  // Calcular número total de páginas
  const totalPages = Math.ceil(filteredAndSortedClientes().length / itemsPerPage)

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

  // Mostrar ayuda de dirección
  const mostrarAyudaDireccion = () => {
    toast("Ejemplos válidos:\n• Calle 123 # 45-67\n• Carrera 7 # 8-9 Apto 101\n• Av. Circunvalar # 10-20 Torre B", {
      duration: 6000,
      position: "top-center",
      icon: "ℹ️",
      style: {
        background: "#3b82f6",
        color: "#fff",
        fontWeight: "500",
        whiteSpace: "pre-line",
      },
    })
  }

  return (
    <div className="admin-container">
      {/* Toaster para las notificaciones */}
      <Toaster />
      <div className="admin-header">
        <h1 className="admin-title">Gestión de Clientes</h1>
        <PermissionButton
          modulo="clientes"
          accion="crear"
          className="admin-button primary"
          onClick={handleOpenCreateForm}
          hidden={true}
        >
          <FaUserPlus /> Nuevo Cliente
        </PermissionButton>
      </div>
      {/* Filtros y búsqueda */}
      <div className="admin-filters">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar clientes..."
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
      {/* Tabla de clientes */}
      {loading && !showForm && !showDetails ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando clientes...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>{error}</p>
          <button className="admin-button secondary" onClick={fetchClientes}>
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
                  <th onClick={() => handleSort("documento")}>Documento {renderSortIndicator("documento")}</th>
                  <th onClick={() => handleSort("celular")}>Celular {renderSortIndicator("celular")}</th>
                  <th onClick={() => handleSort("correo_electronico")}>
                    Correo {renderSortIndicator("correo_electronico")}
                  </th>
                  <th onClick={() => handleSort("estado")}>Estado {renderSortIndicator("estado")}</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageItems().length > 0 ? (
                  getCurrentPageItems().map((cliente) => (
                    <tr key={cliente.id}>
                      <td>{cliente.nombre || "Sin nombre"}</td>
                      <td>
                        {cliente.tipo_documento} - {cliente.documento || "Sin documento"}
                      </td>
                      <td>{cliente.celular || "Sin celular"}</td>
                      <td>{cliente.correo_electronico || "Sin correo"}</td>
                      <td>
                        <div className="status-toggle">
                          <span className={`status-badge ${cliente.estado ? "active" : "inactive"}`}>
                            {cliente.estado ? "Activo" : "Inactivo"}
                          </span>
                          <PermissionWrapper
                            modulo="clientes"
                            accion="editar"
                          >
                            <button
                              className={`toggle-button ${cliente.estado ? "active" : "inactive"}`}
                              onClick={() => handleToggleActive(cliente)}
                              title={cliente.estado ? "Desactivar" : "Activar"}
                            >
                              {cliente.estado ? <FaTimes /> : <FaCheck />}
                            </button>
                          </PermissionWrapper>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <PermissionButton
                            modulo="clientes"
                            accion="ver_detalles"
                            className="action-button view"
                            onClick={() => handleOpenDetails(cliente)}
                            title="Ver detalles"
                            hidden={true}
                          >
                            <FaEye />
                          </PermissionButton>
                          <PermissionButton
                            modulo="clientes"
                            accion="editar"
                            className="action-button edit"
                            onClick={() => handleOpenEditForm(cliente)}
                            title="Editar cliente"
                            hidden={true}
                          >
                            <FaEdit />
                          </PermissionButton>
                          <PermissionButton
                            modulo="clientes"
                            accion="eliminar"
                            className="action-button delete"
                            onClick={() => confirmDelete(cliente)}
                            title="Eliminar cliente"
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
                    <td colSpan="6" className="no-data">
                      No se encontraron clientes
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
                {formMode === "create" && "Crear Nuevo Cliente"}
                {formMode === "edit" && "Editar Cliente"}
              </h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-grid">
                {/* Documento - PRIMERO */}
                <div className="form-group">
                  <label htmlFor="documento">
                    <FaIdCard className="form-icon" /> Documento
                  </label>
                  <div className="documento-combined">
                    <select
                      id="tipo_documento"
                      name="tipo_documento"
                      value={formData.tipo_documento}
                      onChange={handleInputChange}
                      className="tipo-documento-select"
                    >
                      <option value="CC">CC</option>
                      <option value="TI">TI</option>
                      <option value="CE">CE</option>
                      <option value="PP">PP</option>
                    </select>
                    <input
                      type="text"
                      id="documento"
                      name="documento"
                      value={formData.documento}
                      onChange={handleInputChange}
                      className={`numero-documento-input ${formErrors.documento ? "error" : ""}`}
                      placeholder="Número"
                      required
                      maxLength={15}
                      onKeyDown={(e) => {
                        const tipo = formData.tipo_documento
                        const isControl = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)
                        if (isControl) return
                        if (tipo === "CC" || tipo === "TI") {
                          if (!/^\d$/.test(e.key)) {
                            e.preventDefault()
                          }
                        } else if (tipo === "CE" || tipo === "PP") {
                          if (!/^[a-zA-Z0-9]$/.test(e.key)) {
                            e.preventDefault()
                          }
                        }
                      }}
                    />
                  </div>
                  {formErrors.documento && <div className="error-text">{formErrors.documento}</div>}
                </div>
                {/* Nombre Completo - SEGUNDO */}
                <div className="form-group">
                  <label htmlFor="nombre">
                    <FaUser className="form-icon" /> Nombre Completo
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className={formErrors.nombre ? "error" : ""}
                    placeholder="Ej: Juan Pérez García"
                    required
                    maxLength={100}
                    onKeyDown={(e) => {
                      const isLetter = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]$/.test(e.key)
                      const isControl = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)
                      if (!isLetter && !isControl) {
                        e.preventDefault()
                      }
                    }}
                  />
                  <div
                    className={`character-count ${formData.nombre.length > 80 ? "warning" : ""} ${formData.nombre.length > 100 ? "danger" : ""}`}
                  ></div>
                  {formErrors.nombre && <div className="error-text">{formErrors.nombre}</div>}
                </div>
                {/* Género - TERCERO */}
                <div className="form-group">
                  <label htmlFor="genero">
                    <FaUser className="form-icon" /> Género
                  </label>
                  <select
                    id="genero"
                    name="genero"
                    value={formData.genero}
                    onChange={handleInputChange}
                    className={formErrors.genero ? "error" : ""}
                    required
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="NB">No binario</option>
                    <option value="O">Otro</option>
                    <option value="N">Prefiero no decirlo</option>
                  </select>
                  {formErrors.genero && <div className="error-text">{formErrors.genero}</div>}
                </div>
                {/* Celular - CUARTO */}
                <div className="form-group">
                  <label htmlFor="celular">
                    <FaPhone className="form-icon" /> Celular
                  </label>
                  <input
                    type="text"
                    id="celular"
                    name="celular"
                    value={formData.celular}
                    onChange={handleInputChange}
                    className={formErrors.celular ? "error" : ""}
                    placeholder="Ej: 3001234567"
                    required
                    maxLength={10}
                    onKeyDown={(e) => {
                      const isNumber = /^\d$/.test(e.key)
                      const isControl = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)
                      if (!isNumber && !isControl) {
                        e.preventDefault()
                      }
                    }}
                  />
                  {formErrors.celular && <div className="error-text">{formErrors.celular}</div>}
                </div>
                {/* Correo electrónico - QUINTO */}
                <div className="form-group">
                  <label htmlFor="correo_electronico">
                    <FaEnvelope className="form-icon" /> Correo electrónico
                  </label>
                  <input
                    type="email"
                    id="correo_electronico"
                    name="correo_electronico"
                    value={formData.correo_electronico}
                    onChange={handleInputChange}
                    className={formErrors.correo_electronico ? "error" : ""}
                    placeholder="Ej: cliente@ejemplo.com"
                    required
                    maxLength={100}
                  />
                  <div
                    className={`character-count ${formData.correo_electronico.length > 80 ? "warning" : ""} ${formData.correo_electronico.length > 100 ? "danger" : ""}`}
                  ></div>
                  {formErrors.correo_electronico && <div className="error-text">{formErrors.correo_electronico}</div>}
                </div>
                {/* Dirección - SEXTO */}
                <div className="form-group">
                  <label htmlFor="direccion">
                    <FaMapMarkerAlt className="form-icon" /> Dirección
                  </label>
                  <input
                    type="text"
                    id="direccion"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    className={formErrors.direccion ? "error" : ""}
                    placeholder="Ej: Calle 123 #45-67"
                    required
                    maxLength={200}
                  />
                  <div
                    className={`character-count ${formData.direccion.length > 160 ? "warning" : ""} ${formData.direccion.length > 200 ? "danger" : ""}`}
                  ></div>
                  {formErrors.direccion && <div className="error-text">{formErrors.direccion}</div>}
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="admin-button secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="admin-button primary" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner-small"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      {formMode === "create" && "Crear Cliente"}
                      {formMode === "edit" && "Guardar Cambios"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Vista de detalles */}
      {showDetails && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Detalles del Cliente</h2>
              <button className="modal-close" onClick={() => setShowDetails(false)}>
                &times;
              </button>
            </div>
            <form className="admin-form">
              <div className="form-grid">
                {/* Documento - PRIMERO */}
                <div className="form-group">
                  <label htmlFor="documento">
                    <FaIdCard className="form-icon" /> Documento
                  </label>
                  <div className="documento-combined">
                    <select
                      id="tipo_documento"
                      name="tipo_documento"
                      value={formData.tipo_documento}
                      disabled
                      className="tipo-documento-select"
                    >
                      <option value="CC">CC</option>
                      <option value="TI">TI</option>
                      <option value="CE">CE</option>
                      <option value="PP">PP</option>
                    </select>
                    <input
                      type="text"
                      id="documento"
                      name="documento"
                      value={formData.documento}
                      disabled
                      className="numero-documento-input"
                      placeholder="Número"
                    />
                  </div>
                </div>
                {/* Nombre - SEGUNDO */}
                <div className="form-group">
                  <label htmlFor="nombre">
                    <FaUser className="form-icon" /> Nombre
                  </label>
                  <input type="text" id="nombre" name="nombre" value={formData.nombre} disabled />
                </div>
                {/* Género - TERCERO */}
                <div className="form-group">
                  <label htmlFor="genero">
                    <FaUser className="form-icon" /> Género
                  </label>
                  <input
                    type="text"
                    id="genero"
                    name="genero"
                    value={
                      formData.genero === "M"
                        ? "Masculino"
                        : formData.genero === "F"
                          ? "Femenino"
                          : formData.genero === "NB"
                            ? "No binario"
                            : formData.genero === "O"
                              ? "Otro"
                              : formData.genero === "N"
                                ? "Prefiero no decirlo"
                                : "No especificado"
                    }
                    disabled
                  />
                </div>
                {/* Celular - CUARTO */}
                <div className="form-group">
                  <label htmlFor="celular">
                    <FaPhone className="form-icon" /> Celular
                  </label>
                  <input type="text" id="celular" name="celular" value={formData.celular} disabled />
                </div>
                {/* Correo electrónico - QUINTO */}
                <div className="form-group">
                  <label htmlFor="correo_electronico">
                    <FaEnvelope className="form-icon" /> Correo electrónico
                  </label>
                  <input
                    type="email"
                    id="correo_electronico"
                    name="correo_electronico"
                    value={formData.correo_electronico}
                    disabled
                  />
                </div>
                {/* Dirección - SEXTO */}
                <div className="form-group">
                  <label htmlFor="direccion">
                    <FaMapMarkerAlt className="form-icon" /> Dirección
                  </label>
                  <input type="text" id="direccion" name="direccion" value={formData.direccion} disabled />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="admin-button secondary" onClick={() => setShowDetails(false)}>
                  Cerrar
                </button>
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
                ¿Está seguro que desea eliminar al cliente <strong>{clienteToDelete?.nombre}</strong>?
              </p>
              <div className="warning-details">
                <p className="warning-text">
                  <strong>⚠️ ATENCIÓN:</strong> Esta acción también eliminará el cliente del sistema.
                </p>
                <p className="warning-text">Esta acción no se puede deshacer.</p>
              </div>
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
                    <FaTrash /> Eliminar Cliente
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

export default Clientes
