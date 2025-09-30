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
  FaUserTag,
  FaTimes,
  FaCheck,
  FaUser,
  FaMapMarkerAlt,
  FaEyeSlash,
  FaExclamationTriangle,
} from "react-icons/fa"
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  activarUsuario,
  desactivarUsuario,
  getRoles,
  checkUsuarioCanBeDeleted,
  checkUsuarioCanChangeEstado,
} from "../service/usuariosService"
import PermissionButton from "../components/PermissionButton"
import PermissionWrapper from "../components/PermissionWrapper"
import "../styles/Admin.css"
import axios from "axios"
import "../styles/modals/UsuariosModal.css"
import toast, { Toaster } from "react-hot-toast"

const Usuarios = () => {
  // Estados para manejar los datos
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Estados para el formulario
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [formMode, setFormMode] = useState("create")
  const [formData, setFormData] = useState({
    nombre: "",
    tipo_documento: "CC",
    documento: "",
    direccion: "",
    celular: "",
    correo_electronico: "",
    password: "",
    rol: "",
    is_active: true,
    generar_contraseña_temporal: false,
  })
  const [formErrors, setFormErrors] = useState({})
  const [generalError, setGeneralError] = useState("")

  // Estados para filtrado y ordenamiento
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState({
    key: "nombre",
    direction: "asc",
  })

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Estados para mensajes y confirmaciones
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)

  // Añadir un nuevo estado para controlar la visibilidad de la contraseña
  const [showPassword, setShowPassword] = useState(false)

  // Estado para confirmar la contraseña
  const [confirmPassword, setConfirmPassword] = useState("")

  // Agregar estado para controlar acciones duplicadas
  const [actionTimeouts, setActionTimeouts] = useState(new Set())

  // FUNCIÓN PARA FILTRAR USUARIOS - EXCLUIR SOLO CLIENTE Y MANICURISTA
  const filtrarUsuariosPermitidos = (usuariosArray, rolesArray) => {
    const usuariosFiltrados = usuariosArray.filter((usuario) => {
      // Obtener el nombre del rol
      let rolNombre = null

      if (typeof usuario.rol === "object" && usuario.rol !== null) {
        rolNombre = usuario.rol.nombre
      } else if (typeof usuario.rol === "string") {
        rolNombre = usuario.rol
      } else if (typeof usuario.rol === "number") {
        // Buscar el rol por ID en el array de roles
        const rolEncontrado = rolesArray.find((r) => r.id === usuario.rol)
        rolNombre = rolEncontrado ? rolEncontrado.nombre : null
      }

      if (!rolNombre) {
        return false
      }

      const rolNormalizado = rolNombre.toLowerCase().trim()

      // EXCLUIR solo estos roles específicos
      const rolesExcluidos = ["cliente", "manicurista"]
      return !rolesExcluidos.includes(rolNormalizado)
    })

    return usuariosFiltrados
  }

  // Función para manejar el cambio en el campo de confirmación de contraseña
  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value)
    validateField("confirmPassword", e.target.value)
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

  // Cargar datos iniciales - CORREGIDO
  const fetchUsuarios = async () => {
    try {
      setLoading(true)
      console.log("🔄 Iniciando carga de usuarios...")

      const usuariosData = await getUsuarios()
      console.log("✅ Usuarios recibidos del servicio:", usuariosData)

      // Aplicar filtrado específico para solo Administrador y Auxiliar
      const usuariosFiltrados = filtrarUsuariosPermitidos(usuariosData, roles)

      setUsuarios(usuariosFiltrados)
      setError(null)
    } catch (err) {
      setError("Error al cargar los usuarios. Por favor, intente nuevamente.")
      console.error("❌ Error al cargar usuarios:", err)
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos iniciales - CORREGIDO
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        console.log("🚀 Iniciando carga inicial de datos...")

        // Primero cargar roles, luego usuarios
        const rolesData = await getRoles()
        console.log("✅ Roles cargados:", rolesData)
        setRoles(rolesData)

        const usuariosData = await getUsuarios()
        console.log("✅ Usuarios cargados:", usuariosData)

        // Aplicar filtrado específico usando los roles cargados
        const usuariosFiltrados = filtrarUsuariosPermitidos(usuariosData, rolesData)

        setUsuarios(usuariosFiltrados)
        setError(null)
      } catch (err) {
        setError("Error al cargar los datos. Por favor, intente nuevamente.")
        console.error("❌ Error al cargar datos:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })

    // Validar el campo cuando cambia
    validateField(name, type === "checkbox" ? checked : value)
  }

  // Modificar la función validateField para corregir la visualización de errores de contraseña
  const validateField = (fieldName, value) => {
    const errors = { ...formErrors }

    switch (fieldName) {
      case "nombre":
        if (!value.trim()) {
          errors.nombre = "El nombre es requerido"
        } else if (value.trim().length < 3) {
          errors.nombre = "El nombre debe tener al menos 3 caracteres"
        } else if (value.trim().length > 50) {
          errors.nombre = "El nombre no puede exceder los 50 caracteres"
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,50}$/.test(value)) {
          errors.nombre = "Nombre inválido (solo letras y espacios)"
        } else {
          delete errors.nombre
        }
        break

      case "documento": {
        const { tipo_documento } = formData
        if (!value.trim()) {
          errors.documento = "El documento es requerido"
        } else {
          let isValid = false

          switch (tipo_documento) {
            case "CC":
              isValid = /^\d{6,10}$/.test(value)
              if (!isValid) errors.documento = "Cédula inválida (6-10 dígitos)"
              break

            case "TI":
              isValid = /^(1|0)\d{5,9}$/.test(value)
              if (!isValid) errors.documento = "TI inválida (inicia en 1 o 0, 6-10 dígitos)"
              break

            case "CE":
              isValid = /^[a-zA-Z0-9]{6,15}$/.test(value)
              if (!isValid) errors.documento = "CE inválida (6-15 caracteres alfanuméricos)"
              break

            case "PP":
              isValid = /^[a-zA-Z0-9]{8,12}$/.test(value)
              if (!isValid) errors.documento = "Pasaporte inválido (8-12 caracteres alfanuméricos)"
              break
          }

          if (isValid) delete errors.documento
        }
        break
      }

      case "celular":
        if (!value.trim()) {
          errors.celular = "El celular es requerido"
        } else if (!/^[3][0-9]{9}$/.test(value)) {
          errors.celular = "Celular inválido (debe comenzar con 3 y tener 10 dígitos)"
        } else {
          delete errors.celular
        }
        break

      case "correo_electronico":
        if (!value.trim()) {
          errors.correo_electronico = "El correo electrónico es requerido"
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.correo_electronico = "Correo electrónico inválido"
        } else if (value.length > 100) {
          errors.correo_electronico = "El correo no puede exceder los 100 caracteres"
        } else {
          delete errors.correo_electronico
        }
        break

      case "direccion":
        if (value && value.length > 100) {
          errors.direccion = "La dirección no puede exceder los 100 caracteres"
        } else {
          delete errors.direccion
        }
        break

      case "password":
        // Solo validar contraseña en modo editar si se proporciona
        if (formMode === "edit" && value) {
          if (value.length < 6) {
            errors.password = "La contraseña debe tener al menos 6 caracteres"
          } else if (value.length > 20) {
            errors.password = "La contraseña no puede exceder los 20 caracteres"
          } else if (!/(?=.*[A-Z])/.test(value)) {
            errors.password = "La contraseña debe incluir al menos una mayúscula"
          } else if (!/(?=.*\d)/.test(value)) {
            errors.password = "La contraseña debe incluir al menos un número"
          } else if (!/(?=.*[!@#$%^&*])/.test(value)) {
            errors.password = "La contraseña debe incluir al menos un símbolo (!@#$%^&*)"
          } else {
            delete errors.password
          }
        } else {
          // En modo crear o si no se proporciona contraseña en editar, no hay error
          delete errors.password
        }
        break

      case "confirmPassword":
        // Solo validar confirmación en modo editar si se proporciona contraseña
        if (formMode === "edit" && formData.password) {
          if (!value) {
            errors.confirmPassword = "La confirmación de contraseña es requerida"
          } else if (value !== formData.password) {
            errors.confirmPassword = "Las contraseñas no coinciden"
          } else {
            delete errors.confirmPassword
          }
        } else {
          // En modo crear, no validar confirmación
          delete errors.confirmPassword
        }
        break

      case "rol":
        if (!value) {
          errors.rol = "El rol es requerido"
        } else {
          delete errors.rol
        }
        break

      default:
        break
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Validar formulario completo
  const validateForm = () => {
    const fields = ["nombre", "documento", "celular", "correo_electronico", "rol"]

    // Solo validar contraseña en modo editar si se proporciona
    if (formMode === "edit" && formData.password) {
      fields.push("password")
      fields.push("confirmPassword")
    }

    let isValid = true
    const newErrors = {}

    fields.forEach((field) => {
      if (field === "confirmPassword") {
        if (!validateField(field, confirmPassword)) {
          isValid = false
          newErrors[field] = formErrors[field]
        }
      } else if (!validateField(field, formData[field])) {
        isValid = false
        newErrors[field] = formErrors[field]
      }
    })

    setFormErrors(newErrors)
    return isValid
  }

  // Obtener roles permitidos (Administrador, Auxiliar, Ayudante y roles similares)
  const getRolesPermitidos = () => {
    return roles.filter((rol) => {
      const rolNombre = rol.nombre.toLowerCase().trim()
      // Incluir administrador, auxiliar, ayudante y cualquier rol que no sea cliente o manicurista
      const rolesExcluidos = ["cliente", "manicurista"]
      return !rolesExcluidos.includes(rolNombre)
    })
  }

  // Abrir formulario para crear usuario - CORREGIDO
  const handleOpenCreateForm = () => {
    const rolesPermitidos = getRolesPermitidos()

    setFormData({
      nombre: "",
      tipo_documento: "CC",
      documento: "",
      direccion: "",
      celular: "",
      correo_electronico: "",
      password: "",
      rol: rolesPermitidos.length > 0 ? rolesPermitidos[0].id : "",
      is_active: true,
    })
    setConfirmPassword("")
    setFormErrors({})
    setGeneralError("")
    setFormMode("create")
    setShowForm(true)
    setShowDetails(false)
  }

  // Abrir formulario para editar usuario
  const handleOpenEditForm = (usuario) => {
    // Verificar si es administrador
    if (isUserAdmin(usuario)) {
      showNotification("No se puede editar un usuario administrador", "error")
      return
    }

    // Extraer el ID del rol correctamente
    const rolId = usuario.rol?.id || usuario.rol || ""

    setFormData({
      id: usuario.id,
      nombre: usuario.nombre || "",
      tipo_documento: usuario.tipo_documento || "CC",
      documento: usuario.documento || "",
      direccion: usuario.direccion || "",
      celular: usuario.celular || "",
      correo_electronico: usuario.correo_electronico || "",
      password: "", // Dejamos la contraseña vacía en edición
      rol: rolId,
      is_active: usuario.is_active,
    })
    setConfirmPassword("")
    setFormErrors({})
    setGeneralError("")
    setFormMode("edit")
    setShowForm(true)
    setShowDetails(false)
  }

  // Abrir vista de detalles
  const handleOpenDetails = (usuario) => {
    // Extraer el ID del rol correctamente
    const rolId = usuario.rol?.id || usuario.rol || ""

    setFormData({
      id: usuario.id,
      nombre: usuario.nombre || "",
      tipo_documento: usuario.tipo_documento || "CC",
      documento: usuario.documento || "",
      direccion: usuario.direccion || "",
      celular: usuario.celular || "",
      correo_electronico: usuario.correo_electronico || "",
      rol: rolId,
      is_active: usuario.is_active,
    })
    setFormMode("view")
    setShowDetails(true)
    setShowForm(false)
  }

  // Actualizar usuario en el estado local
  const updateUsuarioInState = (updatedUsuario) => {
    setUsuarios((prevUsuarios) => {
      return prevUsuarios.map((usuario) => {
        if (usuario.id === updatedUsuario.id) {
          // Buscar el objeto de rol completo basado en el ID del rol actualizado
          const rolObj = roles.find((r) => {
            // El ID del rol puede venir como número o string
            const rolId = typeof updatedUsuario.rol === "object" ? updatedUsuario.rol.id : updatedUsuario.rol
            return r.id === Number.parseInt(rolId, 10)
          })

          return {
            ...usuario,
            ...updatedUsuario,
            rol: rolObj || usuario.rol, // Mantener el rol anterior si no encontramos el nuevo
          }
        }
        return usuario
      })
    })
  }

  // Añadir una función para alternar la visibilidad de la contraseña
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Verificar si el rol seleccionado es "Cliente"
  const isClientRole = (rolId) => {
    const rol = roles.find((r) => r.id === Number.parseInt(rolId, 10))
    return rol && rol.nombre.toLowerCase() === "cliente"
  }

  // Verificar si el rol seleccionado es "Administrador"
  const isAdminRole = (rolId) => {
    if (!rolId) {
      return false
    }

    const rol = roles.find((r) => {
      return r.id === Number.parseInt(rolId, 10)
    })

    const isAdmin = rol && rol.nombre.toLowerCase() === "administrador"
    return isAdmin
  }

  // Add this function after the isAdminRole function (around line 280)
  const isUserAdmin = (usuario) => {
    const rolId = usuario.rol?.id || usuario.rol
    const result = isAdminRole(rolId)
    return result
  }

  // Función actualizada para crear cliente a partir de un usuario
  const createClienteFromUser = async (userData) => {
    try {
      // URL CORREGIDA - quitar la duplicación de "usuarios"
      const response = await axios.post(
        `https://appweb-rxph.onrender.com/api/usuarios/${userData.id}/crear-cliente/`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      return {
        success: true,
        cliente: response.data.cliente,
        mensaje: response.data.mensaje,
      }
    } catch (err) {
      console.error("Error al crear cliente:", err)

      // Mostrar información más detallada sobre el error
      if (err.response) {
        console.error("Detalles del error:", err.response.status, err.response.statusText)
        console.error("Datos de respuesta:", JSON.stringify(err.response.data, null, 2))

        // Intentar extraer mensajes de error específicos
        if (typeof err.response.data === "object") {
          Object.entries(err.response.data).forEach(([key, value]) => {
            console.error(`Error en campo '${key}':`, value)
          })
        }
      }

      return {
        success: false,
        error: err,
        errorDetails: err.response?.data || err.message || "Error desconocido",
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validar formulario
    if (!validateForm()) {
      return
    }

    // Verificar que el rol seleccionado sea permitido (excluir solo cliente y manicurista)
    const selectedRole = roles.find((r) => r.id === Number.parseInt(formData.rol, 10))
    if (selectedRole) {
      const rolNombre = selectedRole.nombre.toLowerCase().trim()
      const rolesExcluidos = ["cliente", "manicurista"]
      if (rolesExcluidos.includes(rolNombre)) {
        showNotification("No se pueden crear usuarios con rol Cliente o Manicurista", "error")
        return
      }
    }

    // Procesar directamente sin verificación de administrador
    await processFormSubmission()
  }

  // Función separada para procesar el envío del formulario
  const processFormSubmission = async () => {
    try {
      setLoading(true)
      setGeneralError("")

      const formDataToSend = { ...formData }

      if (formDataToSend.rol) {
        formDataToSend.rol = Number.parseInt(formDataToSend.rol, 10)
      }

      // Si se seleccionó generar contraseña temporal, no enviar password
      if (formDataToSend.generar_contraseña_temporal) {
        delete formDataToSend.password
      }

      if (formMode === "edit" && (!formDataToSend.password || formDataToSend.password === "")) {
        console.log("Eliminando contraseña vacía antes de enviar al servicio")
        delete formDataToSend.password
      }

      // Remover el campo generar_contraseña_temporal antes de enviar
      delete formDataToSend.generar_contraseña_temporal

      if (formMode === "create") {
        console.log("Enviando datos para crear usuario:", formDataToSend)
        const newUsuario = await createUsuario(formDataToSend)
        console.log("Usuario creado:", newUsuario)

        if (newUsuario.mensaje) {
          showNotification(newUsuario.mensaje, "success")
        } else {
          showNotification("¡Usuario creado exitosamente!", "success")
        }
        setShowForm(false)

        await fetchUsuarios()
      } else if (formMode === "edit") {
        console.log("Enviando datos para actualizar usuario:", formDataToSend)
        const updatedUsuario = await updateUsuario(formDataToSend.id, formDataToSend)
        console.log("Usuario actualizado:", updatedUsuario)
        showNotification("¡Usuario actualizado exitosamente!", "success")
        setShowForm(false)

        updateUsuarioInState(updatedUsuario)
      }
    } catch (err) {
      console.error("Error al procesar el formulario:", err)

      let errorMessage = "Ha ocurrido un error"

      if (err.response?.data) {
        const errorData = err.response.data

        if (typeof errorData === "string") {
          errorMessage = errorData
        } else if (typeof errorData === "object") {
          const errorMessages = []

          Object.entries(errorData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              errorMessages.push(`${key}: ${value.join(", ")}`)
            } else if (typeof value === "string") {
              errorMessages.push(`${key}: ${value}`)
            } else if (typeof value === "object") {
              errorMessages.push(`${key}: ${JSON.stringify(value)}`)
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

      setGeneralError(`Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Confirmar eliminación de usuario - FUNCIÓN CORREGIDA CON VALIDACIONES
  const confirmDelete = async (usuario) => {
    console.log("🗑️ Intentando confirmar eliminación de usuario:", usuario)
    console.log("🗑️ Roles cargados:", roles)

    // Verificar si es administrador con logs detallados
    const isAdmin = isUserAdmin(usuario)
    console.log("🗑️ ¿Es administrador?", isAdmin)

    if (isAdmin) {
      console.log("❌ Bloqueando eliminación - es administrador")
      showNotification("No se puede eliminar un usuario administrador", "error")
      return
    }

    // Verificar si el usuario puede ser eliminado
    try {
      const checkResult = await checkUsuarioCanBeDeleted(usuario.id)
      if (!checkResult.puede_eliminar) {
        const usuarioNombre = checkResult.usuario_nombre || usuario.nombre || "este usuario"
        const citas = checkResult.citas_info?.total || 0
        let messageDetail = ""
        if (citas > 0) {
          messageDetail = `Este usuario tiene ${citas} cita(s) registrada(s) en el sistema. Para poder eliminarlo, primero debe eliminar todas sus citas asociadas.`
        }
        showNotification(
          `❌ No se puede eliminar el usuario '${usuarioNombre}'\n\n${messageDetail}`,
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

    console.log("✅ Procediendo con confirmación de eliminación")
    setUserToDelete(usuario)
    setShowConfirmDialog(true)
  }

  // Eliminar usuario - FUNCIÓN CORREGIDA CON LOGS
  const handleDelete = async () => {
    if (!userToDelete) {
      console.log("❌ No hay usuario para eliminar")
      return
    }

    console.log("🗑️ Iniciando eliminación de usuario:", userToDelete)

    // Verificación adicional antes de eliminar
    if (isUserAdmin(userToDelete)) {
      console.log("❌ Bloqueando eliminación - verificación adicional falló")
      showNotification("No se puede eliminar un usuario administrador", "error")
      setShowConfirmDialog(false)
      setUserToDelete(null)
      return
    }

    try {
      console.log("🔄 Llamando a deleteUsuario con ID:", userToDelete.id)
      setLoading(true)

      const result = await deleteUsuario(userToDelete.id)
      console.log("✅ Resultado de eliminación:", result)

      // Actualizar la lista de usuarios localmente
      setUsuarios(usuarios.filter((usuario) => usuario.id !== userToDelete.id))

      showNotification("¡Usuario eliminado exitosamente!", "success")
    } catch (err) {
      console.error("❌ Error completo al eliminar usuario:", err)

      let errorMessage = "Error al eliminar usuario"

      if (err.response?.data) {
        console.error("📄 Datos de respuesta del error:", err.response.data)
        if (typeof err.response.data === "string") {
          errorMessage = err.response.data
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error
        }
      } else if (err.message) {
        errorMessage = err.message
      }

      console.error("📢 Mostrando error:", errorMessage)
      showNotification(errorMessage, "error")
    } finally {
      setLoading(false)
      setShowConfirmDialog(false)
      setUserToDelete(null)
    }
  }

  // Activar/Desactivar usuario - CON VALIDACIONES
  const handleToggleActive = async (usuario) => {
    // Evitar múltiples clicks rápidos
    const toggleKey = `toggle-${usuario.id}`
    if (actionTimeouts.has(toggleKey)) {
      return
    }

    try {
      // Marcar como en proceso
      setActionTimeouts((prev) => new Set([...prev, toggleKey]))

      // Verificar si el usuario puede cambiar estado
      const checkResult = await checkUsuarioCanChangeEstado(usuario.id)
      if (!checkResult.puede_cambiar_estado) {
        const usuarioNombre = checkResult.usuario_nombre || usuario.nombre || "este usuario"
        const citas = checkResult.citas_info?.total || 0
        let messageDetail = ""
        if (citas > 0) {
          messageDetail = `Este usuario tiene ${citas} cita(s) registrada(s) en el sistema. Para poder cambiar su estado, primero debe eliminar todas sus citas asociadas.`
        }
        showNotification(
          `❌ No se puede cambiar el estado del usuario '${usuarioNombre}'\n\n${messageDetail}`,
          "error"
        )
        return
      }

      setLoading(true)
      let updatedUsuario

      if (usuario.is_active) {
        updatedUsuario = await desactivarUsuario(usuario.id)
      } else {
        updatedUsuario = await activarUsuario(usuario.id)
      }

      // Actualizar el usuario en el estado local
      updateUsuarioInState({
        ...usuario,
        is_active: !usuario.is_active,
      })

      showNotification(`¡Usuario ${usuario.is_active ? "desactivado" : "activado"} exitosamente!`, "success")
    } catch (err) {
      console.error("Error al cambiar estado del usuario:", err)
      let errorMessage = "Ha ocurrido un error"
      
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
      
      showNotification(errorMessage, "error")
    } finally {
      setLoading(false)
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

  // Ordenar usuarios
  const handleSort = (key) => {
    let direction = "asc"

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }

    setSortConfig({ key, direction })
  }

  // Obtener nombre del rol por ID
  const getRolName = (rolId) => {
    if (!rolId) return "Sin rol"

    const rol = roles.find((r) => r.id === Number.parseInt(rolId, 10))
    return rol ? rol.nombre : "Sin rol"
  }

  // Filtrar y ordenar usuarios
  const filteredAndSortedUsuarios = () => {
    // Filtrar por término de búsqueda y estado
    const filtered = usuarios.filter((usuario) => {
      const searchLower = searchTerm.toLowerCase()
      
      // Obtener el nombre del rol para búsqueda
      const rolNombre = typeof usuario.rol === "object" ? 
        usuario.rol?.nombre?.toLowerCase() || "" : 
        getRolName(usuario.rol)?.toLowerCase() || ""
      
      // Obtener el estado como texto
      const estadoTexto = usuario.is_active ? "activo" : "inactivo"
      
      // Filtro por término de búsqueda
      const matchesSearch = searchTerm === "" || (
        // Campos básicos
        (usuario.nombre?.toLowerCase() || "").includes(searchLower) ||
        (usuario.correo_electronico?.toLowerCase() || "").includes(searchLower) ||
        (usuario.documento?.toLowerCase() || "").includes(searchLower) ||
        (usuario.tipo_documento?.toLowerCase() || "").includes(searchLower) ||
        (usuario.direccion?.toLowerCase() || "").includes(searchLower) ||
        (usuario.celular?.toLowerCase() || "").includes(searchLower) ||
        
        // Rol y estado
        rolNombre.includes(searchLower) ||
        estadoTexto.includes(searchLower) ||
        
        // Búsqueda por ID
        (usuario.id?.toString() || "").includes(searchLower) ||
        
        // Búsqueda combinada de tipo documento + documento
        `${usuario.tipo_documento || ""} ${usuario.documento || ""}`.toLowerCase().includes(searchLower)
      )
      
      return matchesSearch
    })

    // Ordenar
    const sorted = [...filtered].sort((a, b) => {
      // Caso especial para ordenar por rol (puede ser objeto o ID)
      if (sortConfig.key === "rol") {
        const rolA = typeof a.rol === "object" ? a.rol?.nombre || "" : getRolName(a.rol) || ""
        const rolB = typeof b.rol === "object" ? b.rol?.nombre || "" : getRolName(b.rol) || ""

        if (rolA < rolB) {
          return sortConfig.direction === "asc" ? -1 : 1
        }
        if (rolA > rolB) {
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

  // Obtener usuarios para la página actual
  const getCurrentPageItems = () => {
    const filtered = filteredAndSortedUsuarios()
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  // Calcular número total de páginas
  const totalPages = Math.ceil(filteredAndSortedUsuarios().length / itemsPerPage)

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


  // Renderizar el rol del usuario (maneja tanto objetos como IDs)
  const renderUserRol = (usuario) => {
    if (!usuario.rol) {
      return <span>Sin rol</span>
    }

    const rolName = typeof usuario.rol === "object" ? usuario.rol.nombre : getRolName(usuario.rol)

    return <span>{rolName}</span>
  }

  return (
    <div className="admin-container">
      {/* Toaster para las notificaciones */}
      <Toaster />
      
      
      <div className="admin-header">
        <h1 className="admin-title">Gestión de Usuarios</h1>
        <PermissionButton
          modulo="usuarios"
          accion="crear"
          className="admin-button primary"
          onClick={handleOpenCreateForm}
          hidden={true}
        >
          <FaUserPlus /> Nuevo Usuario
        </PermissionButton>
      </div>

      {/* Filtros y búsqueda */}
      <div className="admin-filters">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar usuarios..."
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

      {/* Tabla de usuarios */}
      {loading && !showForm && !showDetails ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando usuarios...</p>
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
                  <th onClick={() => handleSort("correo_electronico")}>
                    Correo {renderSortIndicator("correo_electronico")}
                  </th>
                  <th onClick={() => handleSort("rol")}>Rol {renderSortIndicator("rol")}</th>
                  <th onClick={() => handleSort("is_active")}>Estado {renderSortIndicator("is_active")}</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageItems().length > 0 ? (
                  getCurrentPageItems().map((usuario) => (
                    <tr key={usuario.id}>
                      <td>{usuario.nombre || "Sin nombre"}</td>
                      <td>{usuario.correo_electronico || "Sin correo"}</td>
                      <td>{renderUserRol(usuario)}</td>
                      <td>
                        <div className="status-toggle">
                          <span className={`status-badge ${usuario.is_active ? "active" : "inactive"}`}>
                            {usuario.is_active ? "Activo" : "Inactivo"}
                          </span>
                          <PermissionWrapper
                            modulo="usuarios"
                            accion="editar"
                          >
                            <button
                              className={`toggle-button ${usuario.is_active ? "active" : "inactive"}`}
                              onClick={() => handleToggleActive(usuario)}
                              title={usuario.is_active ? "Desactivar" : "Activar"}
                            >
                              {usuario.is_active ? <FaTimes /> : <FaCheck />}
                            </button>
                          </PermissionWrapper>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <PermissionButton
                            modulo="usuarios"
                            accion="ver_detalles"
                            className="action-button view"
                            onClick={() => handleOpenDetails(usuario)}
                            title="Ver detalles"
                            hidden={true}
                          >
                            <FaEye />
                          </PermissionButton>
                          {!isUserAdmin(usuario) && (
                            <>
                              <PermissionButton
                                modulo="usuarios"
                                accion="editar"
                                className="action-button edit"
                                onClick={() => handleOpenEditForm(usuario)}
                                title="Editar usuario"
                                hidden={true}
                              >
                                <FaEdit />
                              </PermissionButton>
                              <PermissionButton
                                modulo="usuarios"
                                accion="eliminar"
                                className="action-button delete"
                                onClick={() => {
                                  console.log("🖱️ Click en botón eliminar para usuario:", usuario)
                                  confirmDelete(usuario)
                                }}
                                title="Eliminar usuario"
                                hidden={true}
                              >
                                <FaTrash />
                              </PermissionButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">
                      No se encontraron usuarios con roles permitidos
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

      {/* Modal de confirmación de eliminación */}
      {showConfirmDialog && (
        <div className="modal-overlay">
          <div className="modal-container confirm-dialog">
            <div className="modal-header">
              <h2>Confirmar Eliminación</h2>
              <button
                className="modal-close"
                onClick={() => {
                  console.log("❌ Cancelando eliminación")
                  setShowConfirmDialog(false)
                  setUserToDelete(null)
                }}
              >
                &times;
              </button>
            </div>

            <div className="confirm-content">
              <div className="warning-icon">
                <FaExclamationTriangle />
              </div>
              <p>
                ¿Está seguro de que desea eliminar al usuario <strong>{userToDelete?.nombre}</strong>?
              </p>
              <p className="warning-text">
                Esta acción no se puede deshacer y eliminará también los registros relacionados.
              </p>
            </div>

            <div className="form-actions">
              <button
                className="admin-button secondary"
                onClick={() => {
                  console.log("❌ Cancelando eliminación")
                  setShowConfirmDialog(false)
                  setUserToDelete(null)
                }}
              >
                <FaTimes /> Cancelar
              </button>
              <button
                className="admin-button danger"
                onClick={() => {
                  console.log("✅ Confirmando eliminación")
                  handleDelete()
                }}
                disabled={loading}
              >
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

      {/* Formulario modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>
                {formMode === "create" && "Crear Nuevo Usuario"}
                {formMode === "edit" && "Editar Usuario"}
              </h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                &times;
              </button>
            </div>

            {/* Mostrar error general si existe */}
            {generalError && <div className="general-error">{generalError}</div>}

            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-grid">
                {/* PRIMER CAMPO: Documento (tipo + número) */}
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
                        // Permitir caracteres según el tipo de documento
                        const tipo = formData.tipo_documento
                        const isControl = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)

                        if (isControl) return

                        if (tipo === "CC" || tipo === "TI") {
                          // Solo números para CC y TI
                          if (!/^\d$/.test(e.key)) {
                            e.preventDefault()
                          }
                        } else if (tipo === "CE" || tipo === "PP") {
                          // Alfanumérico para CE y PP
                          if (!/^[a-zA-Z0-9]$/.test(e.key)) {
                            e.preventDefault()
                          }
                        }
                      }}
                    />
                  </div>
                  {formErrors.documento && <div className="error-text">{formErrors.documento}</div>}
                </div>

                {/* SEGUNDO CAMPO: Nombre */}
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
                    placeholder="Ej: Carlos Rodríguez Martínez"
                    required
                    maxLength={50}
                    onKeyDown={(e) => {
                      // Permitir solo letras, espacios y teclas de control
                      const isLetter = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]$/.test(e.key)
                      const isControl = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)
                      if (!isLetter && !isControl) {
                        e.preventDefault()
                      }
                    }}
                  />
                  <div
                    className={`character-count ${formData.nombre.length > 40 ? "warning" : ""} ${formData.nombre.length > 50 ? "danger" : ""}`}
                  ></div>
                  {formErrors.nombre && <div className="error-text">{formErrors.nombre}</div>}
                </div>

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
                    placeholder="Ej: Calle 123 #45-67"
                    maxLength={100}
                  />
                  <div
                    className={`character-count ${formData.direccion.length > 80 ? "warning" : ""} ${formData.direccion.length > 100 ? "danger" : ""}`}
                  ></div>
                </div>

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
                      // Permitir solo números y teclas de control
                      const isNumber = /^\d$/.test(e.key)
                      const isControl = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)
                      if (!isNumber && !isControl) {
                        e.preventDefault()
                      }
                    }}
                  />
                  {formErrors.celular && <div className="error-text">{formErrors.celular}</div>}
                </div>

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
                    placeholder="Ej: usuario@ejemplo.com"
                    required
                    maxLength={100}
                  />
                  <div
                    className={`character-count ${formData.correo_electronico.length > 80 ? "warning" : ""} ${formData.correo_electronico.length > 100 ? "danger" : ""}`}
                  ></div>
                  {formErrors.correo_electronico && <div className="error-text">{formErrors.correo_electronico}</div>}
                </div>

                <div className="form-group">
                  <label htmlFor="rol">
                    <FaUserTag className="form-icon" /> Rol
                  </label>
                  <select
                    id="rol"
                    name="rol"
                    value={formData.rol}
                    onChange={handleInputChange}
                    className={formErrors.rol ? "error" : ""}
                    required
                  >
                    <option value="">Seleccione un rol</option>
                    {getRolesPermitidos().map((rol) => (
                      <option key={rol.id} value={rol.id}>
                        {rol.nombre}
                      </option>
                    ))}
                  </select>
                  {formErrors.rol && <div className="error-text">{formErrors.rol}</div>}
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
                      {formMode === "create" && "Crear Usuario"}
                      {formMode === "edit" && "Guardar Cambios"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vista de detalles usando el mismo modal que crear/editar */}
      {showDetails && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Detalles del Usuario</h2>
              <button className="modal-close" onClick={() => setShowDetails(false)}>
                &times;
              </button>
            </div>

            <form className="admin-form">
              <div className="form-grid">
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

                <div className="form-group">
                  <label htmlFor="nombre">
                    <FaUser className="form-icon" /> Nombre
                  </label>
                  <input type="text" id="nombre" name="nombre" value={formData.nombre} disabled />
                </div>

                <div className="form-group">
                  <label htmlFor="direccion">
                    <FaMapMarkerAlt className="form-icon" /> Dirección
                  </label>
                  <input type="text" id="direccion" name="direccion" value={formData.direccion} disabled />
                </div>

                <div className="form-group">
                  <label htmlFor="celular">
                    <FaPhone className="form-icon" /> Celular
                  </label>
                  <input type="text" id="celular" name="celular" value={formData.celular} disabled />
                </div>

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

                <div className="form-group">
                  <label htmlFor="rol">
                    <FaUserTag className="form-icon" /> Rol
                  </label>
                  <input type="text" id="rol" name="rol" value={getRolName(formData.rol)} disabled />
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
    </div>
  )
}

export default Usuarios
