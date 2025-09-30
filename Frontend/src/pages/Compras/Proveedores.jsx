"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  cambiarEstado,
} from "../../service/ProveedoresService"
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
  FaUserTie,
  FaBuilding,
  FaIdCard,
  FaUser,
  FaMapMarkerAlt,
  FaEnvelope,
  FaMobile,
  FaExclamationTriangle,
} from "react-icons/fa"
import "../../styles/Admin.css"
import "../../styles/modals/ProveedoresModal.css"
import toast, { Toaster } from "react-hot-toast"

const Proveedores = () => {
  // Estados para manejar los datos
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Estados para el formulario
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState("create") // create, edit, view
  const [formData, setFormData] = useState({
    tipo_persona: "natural",
    tipo_documento: "CC",
    documento: "",
    nombre_empresa: "",
    nit: "",
    nombre: "",
    direccion: "",
    correo_electronico: "",
    celular: "",
    estado: "activo",
  })
  const [formErrors, setFormErrors] = useState({})
  const [generalError, setGeneralError] = useState("")

  // Estados para filtrado y ordenamiento
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTipoPersona, setFilterTipoPersona] = useState("") // Este estado no se usa en el JSX actual, pero se mantiene
  const [sortConfig, setSortConfig] = useState({
    key: "nombre",
    direction: "asc",
  })

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Estados para confirmaciones
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [proveedorToDelete, setProveedorToDelete] = useState(null)

  // Agregar estado para controlar acciones duplicadas
  const [actionTimeouts, setActionTimeouts] = useState(new Set())

  // Helpers de normalización
  const normalizeText = (str) =>
    (str || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()

  const normalizeDocString = (str) => (str || "").toString().replace(/[\.\-\s]/g, "").trim()

  // Helpers de normalización y extracción de documento/NIT
  const normalizeTipoPersona = (tipo) => {
    const val = (tipo ?? "").toString().toLowerCase().trim()
    if (!val) return "natural"
    if (val.includes("jur")) return "juridica"
    if (["j", "empresa", "company", "2"].includes(val)) return "juridica"
    return "natural"
  }

  const resolveTipoDocumento = (prov) => {
    const raw = prov?.tipo_documento ?? prov?.tipoDoc ?? prov?.documentType ?? prov?.tipoDocumento ?? "CC"
    return String(raw).toUpperCase()
  }

  const resolveDocumentoValor = (prov, opts = {}) => {
    const { includeNitFallbackForNatural = false } = opts
    const posiblesClaves = [
      "documento",
      "cedula",
      "numero_documento",
      "num_documento",
      "nro_documento",
      "dni",
      "doc",
      "id_number",
      "idNumber",
      "identificacion",
      "identification",
    ]
    // Si algunos registros de natural guardaron el doc en nit, usarlo como último fallback
    if (includeNitFallbackForNatural) {
      posiblesClaves.push("nit")
    }
    for (const key of posiblesClaves) {
      const v = prov?.[key]
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v)
    }
    return ""
  }

  // Función para obtener el documento del proveedor
  const getDocumentoProveedor = (proveedor) => {
    const tipo = normalizeTipoPersona(proveedor?.tipo_persona)
    if (tipo === "natural") {
      const documento = resolveDocumentoValor(proveedor, { includeNitFallbackForNatural: true }) || "N/A"
      const tipoDoc = resolveTipoDocumento(proveedor) || "CC"
      return `${tipoDoc}: ${documento}`
    }
    const nitMostrar = proveedor?.nit || resolveDocumentoValor(proveedor) || "N/A"
    return `NIT: ${nitMostrar}`
  }

  // Cargar datos iniciales
  const fetchProveedores = async () => {
    try {
      setLoading(true)
      const proveedoresData = await getProveedores()
      console.log("Proveedores cargados:", proveedoresData)
      setProveedores(proveedoresData)
      setError(null)
    } catch (err) {
      showNotification(err.message || "Error al cargar los proveedores. Por favor, intente nuevamente.", "error")
      console.error("Error al cargar proveedores:", err)
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos iniciales al montar el componente
  useEffect(() => {
    fetchProveedores()
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
    const nextValue = ["nombre", "nombre_empresa", "direccion"].includes(name)
      ? value.replace(/\s+/g, " ").trimStart()
      : name === "correo_electronico"
      ? value.trimStart()
      : value
    const snapshot = {
      ...formData,
      [name]: type === "checkbox" ? checked : nextValue,
    }
    setFormData(snapshot)

    // Validar el campo cuando cambia
    validateField(name, type === "checkbox" ? checked : nextValue, snapshot)

    // Si cambia el tipo de documento, revalidar el número con el nuevo tipo
    if (name === "tipo_documento") {
      validateField("documento", snapshot.documento, snapshot)
    }

    // Si cambia el tipo de persona, revalidar campos asociados
    if (name === "tipo_persona") {
      if (snapshot.tipo_persona === "natural") {
        // Revalidar y limpiar errores de campos de jurídica
        validateField("documento", snapshot.documento, snapshot)
        setFormErrors((prev) => {
          const next = { ...prev }
          delete next["nit"]
          delete next["nombre_empresa"]
          return next
        })
      } else {
        // Jurídica: revalidar NIT y nombre_empresa y limpiar error de documento
        validateField("nit", snapshot.nit, snapshot)
        validateField("nombre_empresa", snapshot.nombre_empresa, snapshot)
        setFormErrors((prev) => {
          const next = { ...prev }
          delete next["documento"]
          return next
        })
      }
    }
  }

  // Validar un campo específico
  const validateField = useCallback(
    (fieldName, value, snapshotForm = formData) => {
      const errors = { ...formErrors }

      switch (fieldName) {
        case "correo_electronico":
          if (!value.trim()) {
            errors.correo_electronico = "El correo electrónico es requerido"
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.correo_electronico = "Correo electrónico inválido"
          } else if (value.length > 100) {
            errors.correo_electronico = "El correo no puede exceder los 100 caracteres"
          } else {
            // Validar duplicados de correo
            const existingProveedor = proveedores.find(
              (p) => p.correo_electronico?.toLowerCase() === value.toLowerCase(),
            )
            if (existingProveedor) {
              errors.correo_electronico = "Ya existe un proveedor con este correo electrónico"
            } else {
              delete errors.correo_electronico
            }
          }
          break

        case "celular":
          if (!value.trim()) {
            errors.celular = "El celular es requerido"
          } else if (!/^[3][0-9]{9}$/.test(value)) {
            errors.celular = "Celular inválido (debe comenzar con 3 y tener 10 dígitos)"
          } else {
            // Validar duplicados de celular
            const existingProveedor = proveedores.find((p) => p.celular === value)
            if (existingProveedor) {
              errors.celular = "Ya existe un proveedor con este número de celular"
            } else {
              delete errors.celular
            }
          }
          break

        case "nombre":
          if (!value.trim()) {
            errors.nombre = "El nombre es requerido"
          } else if (value.trim().length < 3) {
            errors.nombre = "El nombre debe tener al menos 3 caracteres"
          } else if (value.trim().length > 100) {
            errors.nombre = "El nombre no puede exceder los 100 caracteres"
          } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s]+$/.test(value.trim())) {
            errors.nombre = "Nombre inválido (letras/números/espacios y tildes)"
          } else {
            // Validar duplicados de nombre
            const norm = normalizeText(value)
            const existingProveedor = proveedores.find((p) => normalizeText(p.nombre) === norm)
            if (existingProveedor) {
              errors.nombre = "Ya existe un proveedor con este nombre"
            } else {
              delete errors.nombre
            }
          }
          break

        case "nombre_empresa":
          if (snapshotForm.tipo_persona === "juridica") {
            if (!value.trim()) {
              errors.nombre_empresa = "El nombre de la empresa es requerido"
            } else if (value.trim().length < 3) {
              errors.nombre_empresa = "El nombre debe tener al menos 3 caracteres"
            } else if (value.trim().length > 100) {
              errors.nombre_empresa = "El nombre no puede exceder los 100 caracteres"
            } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s]+$/.test(value.trim())) {
              errors.nombre_empresa = "Nombre empresa inválido (letras/números/espacios y tildes)"
            } else {
              // Validar duplicados de nombre de empresa
              const norm = normalizeText(value)
              const existingProveedor = proveedores.find((p) => normalizeText(p.nombre_empresa) === norm)
              if (existingProveedor) {
                errors.nombre_empresa = "Ya existe un proveedor con este nombre de empresa"
              } else {
                delete errors.nombre_empresa
              }
            }
          } else {
            delete errors.nombre_empresa
          }
          break

        case "documento": {
          if (snapshotForm.tipo_persona === "natural") {
            const tipo_documento = snapshotForm.tipo_documento
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
                  // Cédula de Extranjería (CO): números largos, 7 a 10 dígitos
                  isValid = /^\d{7,10}$/.test(value)
                  if (!isValid) errors.documento = "CE inválida (solo números, 7-10 dígitos)"
                  break

                case "PP":
                  // Pasaporte: formatos comunes (no estándar único)
                  // - 9 dígitos (US)
                  // - Letra + 7-8 dígitos (ES/CO ejemplos: X1234567, AF1234567)
                  // - 9 alfanuméricos (MX) o rango general 7-10 alfanuméricos
                  isValid =
                    /^\d{9}$/.test(value) ||
                    /^[A-Za-z][0-9]{7,8}$/.test(value) ||
                    /^[A-Za-z0-9]{9}$/.test(value) ||
                    /^[A-Za-z0-9]{7,10}$/.test(value)
                  if (!isValid)
                    errors.documento =
                      "Pasaporte inválido (7-10 alfanuméricos; ej: AF1234567, 123456789, X1234567)"
                  break
                default:
                  isValid = false // En caso de tipo de documento no reconocido
                  errors.documento = "Tipo de documento no reconocido."
              }

              if (isValid) {
                // Validar duplicados de documento
                const normDoc = normalizeDocString(value)
                const existingProveedor = proveedores.find(
                  (p) => normalizeDocString(p.documento || p.cedula) === normDoc,
                )
                if (existingProveedor) {
                  errors.documento = "Ya existe un proveedor con este documento"
                } else {
                  delete errors.documento
                }
              }
            }
          } else {
            delete errors.documento
          }
          break
        }

        case "nit":
          if (snapshotForm.tipo_persona === "juridica") {
            if (!value.trim()) {
              errors.nit = "El NIT es requerido"
            } else if (!/^[0-9\.\-]{6,20}$/.test(value)) {
              errors.nit = "NIT inválido (números y opcional . o -)"
            } else {
              // Validar duplicados de NIT
              const normNit = normalizeDocString(value)
              const existingProveedor = proveedores.find((p) => normalizeDocString(p.nit) === normNit)
              if (existingProveedor) {
                errors.nit = "Ya existe un proveedor con este NIT"
              } else {
                delete errors.nit
              }
            }
          } else {
            delete errors.nit
          }
          break

        case "direccion":
          if (!value.trim()) {
            errors.direccion = "La dirección es requerida"
          } else if (value.trim().length < 5) {
            errors.direccion = "La dirección debe tener al menos 5 caracteres"
          } else if (value.length > 200) {
            errors.direccion = "La dirección no puede exceder los 200 caracteres"
          } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s#\-.,°]+$/.test(value)) {
            errors.direccion = "La dirección contiene caracteres no válidos"
          } else {
            delete errors.direccion
          }
          break

        default:
          break
      }

      setFormErrors(errors)
      return Object.keys(errors).length === 0
    },
    [proveedores],
  )

  // Validar formulario completo
  const validateForm = useCallback(() => {
    const fields = ["nombre", "celular", "correo_electronico", "direccion"]

    if (formData.tipo_persona === "natural") {
      fields.push("documento")
    } else {
      fields.push("nombre_empresa", "nit")
    }

    let isValid = true
    const newErrors = {}

    fields.forEach((field) => {
      // Validar cada campo directamente
      const value = formData[field]
      let hasError = false

      switch (field) {
        case "correo_electronico":
          if (!value.trim()) {
            newErrors.correo_electronico = "El correo electrónico es requerido"
            hasError = true
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            newErrors.correo_electronico = "Correo electrónico inválido"
            hasError = true
          } else if (value.length > 100) {
            newErrors.correo_electronico = "El correo no puede exceder los 100 caracteres"
            hasError = true
          }
          break

        case "celular":
          if (!value.trim()) {
            newErrors.celular = "El celular es requerido"
            hasError = true
          } else if (!/^[3][0-9]{9}$/.test(value)) {
            newErrors.celular = "Celular inválido (debe comenzar con 3 y tener 10 dígitos)"
            hasError = true
          }
          break

        case "nombre":
          if (!value.trim()) {
            newErrors.nombre = "El nombre es requerido"
            hasError = true
          } else if (value.trim().length < 3) {
            newErrors.nombre = "El nombre debe tener al menos 3 caracteres"
            hasError = true
          } else if (value.length > 100) {
            newErrors.nombre = "El nombre no puede exceder los 100 caracteres"
            hasError = true
          }
          break

        case "direccion":
          if (!value.trim()) {
            newErrors.direccion = "La dirección es requerida"
            hasError = true
          } else if (value.trim().length < 5) {
            newErrors.direccion = "La dirección debe tener al menos 5 caracteres"
            hasError = true
          } else if (value.length > 200) {
            newErrors.direccion = "La dirección no puede exceder los 200 caracteres"
            hasError = true
          }
          break

        case "documento":
          if (!value.trim()) {
            newErrors.documento = "El documento es requerido"
            hasError = true
          } else if (!/^[0-9]{6,15}$/.test(value)) {
            newErrors.documento = "Documento inválido (solo números, 6-15 dígitos)"
            hasError = true
          }
          break

        case "nombre_empresa":
          if (!value.trim()) {
            newErrors.nombre_empresa = "El nombre de la empresa es requerido"
            hasError = true
          } else if (value.trim().length < 3) {
            newErrors.nombre_empresa = "El nombre debe tener al menos 3 caracteres"
            hasError = true
          } else if (value.length > 100) {
            newErrors.nombre_empresa = "El nombre no puede exceder los 100 caracteres"
            hasError = true
          }
          break

        case "nit":
          if (!value.trim()) {
            newErrors.nit = "El NIT es requerido"
            hasError = true
          } else if (!/^[0-9]{6,15}$/.test(value)) {
            newErrors.nit = "NIT inválido (solo números, 6-15 dígitos)"
            hasError = true
          }
          break
      }

      if (hasError) {
        isValid = false
      }
    })

    setFormErrors(newErrors)
    return isValid
  }, [formData])

  // Abrir formulario para crear proveedor
  const handleOpenCreateForm = () => {
    setFormData({
      tipo_persona: "natural",
      tipo_documento: "CC",
      documento: "",
      nombre_empresa: "",
      nit: "",
      nombre: "",
      direccion: "",
      correo_electronico: "",
      celular: "",
      estado: "activo",
    })
    setFormErrors({})
    setGeneralError("")
    setFormMode("create")
    setShowForm(true)
  }

  // Abrir formulario para editar proveedor
  const handleOpenEditForm = (proveedor) => {
    console.log("Proveedor a editar:", proveedor)

    // Determinar el documento correcto según el tipo de persona
    let documento = ""
    let nitValue = ""
    const tipoNormalizado = normalizeTipoPersona(proveedor?.tipo_persona)

    if (tipoNormalizado === "natural") {
      documento = resolveDocumentoValor(proveedor, { includeNitFallbackForNatural: true })
      nitValue = "" // Para persona natural no usamos NIT
    } else {
      documento = "" // No hay campo documento para jurídica
      nitValue = proveedor?.nit || resolveDocumentoValor(proveedor) || ""
    }

    console.log("Documento extraído:", documento)
    console.log("NIT extraído:", nitValue)

    setFormData({
      id: proveedor.id,
      tipo_persona: tipoNormalizado || "natural",
      tipo_documento: resolveTipoDocumento(proveedor) || "CC",
      documento: documento,
      nombre_empresa: proveedor.nombre_empresa || "",
      nit: nitValue,
      nombre: proveedor.nombre || "",
      direccion: proveedor.direccion || "",
      correo_electronico: proveedor.correo_electronico || "",
      celular: proveedor.celular || "",
      estado: proveedor.estado || "activo",
    })
    setFormErrors({})
    setGeneralError("")
    setFormMode("edit")
    setShowForm(true)
  }

  // Abrir vista de detalles
  const handleOpenDetails = (proveedor) => {
    // Determinar el documento correcto según el tipo de persona
    let documento = ""
    let nitValue = ""
    const tipoNormalizado = normalizeTipoPersona(proveedor?.tipo_persona)

    if (tipoNormalizado === "natural") {
      documento = resolveDocumentoValor(proveedor, { includeNitFallbackForNatural: true }) || "N/A"
      nitValue = "" // Para persona natural no mostramos NIT
    } else {
      documento = "N/A" // No aplica documento para jurídica
      nitValue = proveedor?.nit || resolveDocumentoValor(proveedor) || "N/A"
    }

    setFormData({
      id: proveedor.id,
      tipo_persona: tipoNormalizado || "natural",
      tipo_documento: resolveTipoDocumento(proveedor) || "CC",
      documento: documento,
      nombre_empresa: proveedor.nombre_empresa || "",
      nit: nitValue,
      nombre: proveedor.nombre || "",
      direccion: proveedor.direccion || "",
      correo_electronico: proveedor.correo_electronico || "",
      celular: proveedor.celular || "",
      estado: proveedor.estado || "activo",
    })
    setFormErrors({})
    setGeneralError("")
    setFormMode("view")
    setShowForm(true)
  }

  // Actualizar proveedor en el estado local
  const updateProveedorInState = (updatedProveedor) => {
    setProveedores((prevProveedores) => {
      return prevProveedores.map((proveedor) => {
        if (proveedor.id === updatedProveedor.id) {
          return {
            ...proveedor,
            ...updatedProveedor,
          }
        }
        return proveedor
      })
    })
  }

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validar formulario
    if (!validateForm()) {
      showNotification("Por favor, corrige los errores en el formulario.", "error")
      return
    }

    try {
      setLoading(true)
      setGeneralError("")

      // Crear una copia del formData para manipulación
      const formDataToSend = { ...formData }
      // Normalizaciones finales
      formDataToSend.nombre = (formDataToSend.nombre || "").replace(/\s+/g, " ").trim()
      formDataToSend.nombre_empresa = (formDataToSend.nombre_empresa || "").replace(/\s+/g, " ").trim()
      formDataToSend.correo_electronico = (formDataToSend.correo_electronico || "").toLowerCase().trim()
      if (formDataToSend.tipo_persona === "juridica") {
        formDataToSend.nit = normalizeDocString(formDataToSend.nit)
      } else {
        formDataToSend.documento = normalizeDocString(formDataToSend.documento)
      }

      // Mapear campos según el tipo de persona para compatibilidad con el backend
      if (formDataToSend.tipo_persona === "natural") {
        // Para persona natural, mapear documento a cedula si el backend lo espera así
        formDataToSend.cedula = formDataToSend.documento
        // Asegurar que los campos de jurídica tengan valores por defecto si no se usan
        if (!formDataToSend.nombre_empresa) formDataToSend.nombre_empresa = formDataToSend.nombre
        if (!formDataToSend.nit) formDataToSend.nit = formDataToSend.documento // Usar documento como NIT si no hay NIT
      } else {
        // Para persona jurídica, asegurar que la cédula tenga un valor por defecto si no se usa
        if (!formDataToSend.cedula) formDataToSend.cedula = formDataToSend.nit // Usar NIT como cédula si no hay cédula
      }

      if (formMode === "create") {
        console.log("Enviando datos para crear proveedor:", formDataToSend)
        const newProveedor = await createProveedor(formDataToSend)
        console.log("Proveedor creado:", newProveedor)
        showNotification("¡Proveedor creado exitosamente!", "success")

        // Recargar la lista de proveedores para asegurar datos actualizados
        await fetchProveedores()
      } else if (formMode === "edit") {
        console.log("Enviando datos para actualizar proveedor:", formDataToSend)
        const updatedProveedor = await updateProveedor(formDataToSend.id, formDataToSend)
        console.log("Proveedor actualizado:", updatedProveedor)
        showNotification("¡Proveedor actualizado exitosamente!", "success")

        // Actualizar el proveedor en el estado local
        updateProveedorInState(updatedProveedor)
      }

      // Cerrar el formulario
      setShowForm(false)
    } catch (err) {
      console.error("Error al procesar el formulario:", err)

      // Extraer mensaje de error detallado
      let errorMessage = err.message || "Ha ocurrido un error"

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
      showNotification(errorMessage, "error") // Mostrar notificación también
    } finally {
      setLoading(false)
    }
  }

  // Confirmar eliminacin de proveedor
  const confirmDelete = (proveedor) => {
    setProveedorToDelete(proveedor)
    setShowConfirmDialog(true)
  }

  // Eliminar proveedor
  const handleDelete = async () => {
    if (!proveedorToDelete) return

    try {
      setLoading(true)
      console.log("🗑️ Intentando eliminar proveedor:", proveedorToDelete)

      // Verificar que el proveedor tenga un ID válido
      if (!proveedorToDelete.id || proveedorToDelete.id === "undefined" || proveedorToDelete.id === "null") {
        showNotification("Error: ID de proveedor inválido", "error")
        return
      }

      const result = await deleteProveedor(proveedorToDelete.id)
      console.log("✅ Proveedor eliminado exitosamente:", result)

      // Actualizar la lista de proveedores localmente
      setProveedores((prevProveedores) => prevProveedores.filter((proveedor) => proveedor.id !== proveedorToDelete.id))

      showNotification(result.message || "¡Proveedor eliminado exitosamente!", "success")

      // Recargar la lista completa para asegurar consistencia
      setTimeout(() => {
        fetchProveedores()
      }, 1000)
    } catch (err) {
      console.error("❌ Error detallado al eliminar proveedor:", err)

      let errorMessage = "Error desconocido al eliminar el proveedor"

      // Si el error viene de la validación del servicio (con compras asociadas)
      if (err.message && err.message.includes("No se puede eliminar el proveedor")) {
        errorMessage = err.message
      } else if (err.response) {
        switch (err.response.status) {
          case 404:
            errorMessage = "El proveedor no existe o ya fue eliminado."
            // Actualizar la lista para reflejar el cambio
            setProveedores((prevProveedores) =>
              prevProveedores.filter((proveedor) => proveedor.id !== proveedorToDelete.id),
            )
            break
          case 400:
            // Este es el caso más importante - proveedor con compras asociadas
            if (err.response.data?.error) {
              errorMessage = err.response.data.error
            } else if (err.response.data?.detail) {
              errorMessage = err.response.data.detail
            } else {
              errorMessage = "No se puede eliminar el proveedor porque tiene compras asociadas."
            }
            break
          case 403:
            errorMessage = "No tienes permisos para eliminar este proveedor."
            break
          case 409:
            errorMessage = "No se puede eliminar el proveedor porque está siendo utilizado en otros registros."
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
        errorMessage = "No se pudo conectar con el servidor. Verifique su conexión."
      } else {
        errorMessage = err.message
      }

      showNotification(errorMessage, "error")
    } finally {
      setLoading(false)
      setShowConfirmDialog(false)
      setProveedorToDelete(null)
    }
  }

  // Activar/Desactivar proveedor
  const handleToggleActive = async (proveedor) => {
    // Evitar múltiples clicks rápidos
    const toggleKey = `toggle-${proveedor.id}`
    if (actionTimeouts.has(toggleKey)) {
      return
    }

    try {
      setLoading(true)
      setActionTimeouts((prev) => new Set([...prev, toggleKey])) // Marcar como en proceso

      // Si se va a desactivar, verificar compras asociadas como bloqueo preventivo
      if (proveedor.estado === "activo") {
        try {
          const check = await (await import("../../service/ProveedoresService")).checkProveedorCanBeDeleted(
            proveedor.id,
          )
          const compras = Number(check?.compras_info?.total || 0)
          if (compras > 0) {
            showNotification(
              `No se puede inactivar: el proveedor tiene ${compras} compra(s) asociada(s).`,
              "warning",
            )
            return
          }
        } catch (err) {
          showNotification("No fue posible verificar compras asociadas. Intenta nuevamente.", "error")
          return
        }
      }

      await cambiarEstado(proveedor.id)

      // Actualizar el proveedor en el estado local
      updateProveedorInState({
        ...proveedor,
        estado: proveedor.estado === "activo" ? "inactivo" : "activo",
      })

      showNotification(
        `¡Proveedor ${proveedor.estado === "activo" ? "desactivado" : "activado"} exitosamente!`,
        "success",
      )
    } catch (err) {
      console.error("Error al cambiar estado del proveedor:", err)
      showNotification(err.message || "Ha ocurrido un error al cambiar el estado", "error")
    } finally {
      setLoading(false)
      setTimeout(() => {
        // Liberar después de 1 segundo
        setActionTimeouts((prev) => {
          const newSet = new Set(prev)
          newSet.delete(toggleKey)
          return newSet
        })
      }, 1000)
    }
  }

  // Ordenar proveedores
  const handleSort = (key) => {
    let direction = "asc"

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }

    setSortConfig({ key, direction })
  }

  // Filtrar y ordenar proveedores (sin filtro de tipo de persona)
  const filteredAndSortedProveedores = () => {
    // Filtrar por término de búsqueda - BUSCAR EN TODOS LOS CAMPOS
    const filtered = proveedores.filter((proveedor) => {
      const raw = searchTerm.toLowerCase()
      const searchLower = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      
      // Obtener el estado como texto
      const estadoTexto = proveedor.estado === "activo" ? "activo" : "inactivo"
      
      // Obtener el tipo de persona como texto (normalizado)
      const tipoPersonaTexto = normalizeTipoPersona(proveedor?.tipo_persona)
      
      // Si el usuario escribe exactamente "activo" o "inactivo", filtrar por estado exacto
      if (searchLower === 'activo' || searchLower === 'inactivo') {
        return estadoTexto === searchLower
      }

      // Si escribe exactamente "natural" o "juridica", filtrar por tipo de persona exacto
      if (searchLower === 'natural' || searchLower === 'juridica') {
        return tipoPersonaTexto === searchLower
      }

      return (
        // Campos básicos
        (proveedor.nombre?.toLowerCase() || "").includes(searchLower) ||
        (proveedor.nombre_empresa?.toLowerCase() || "").includes(searchLower) ||
        (proveedor.nit?.toLowerCase() || "").includes(searchLower) ||
        (proveedor.cedula?.toLowerCase() || "").includes(searchLower) ||
        (proveedor.documento?.toLowerCase() || "").includes(searchLower) ||
        (proveedor.correo_electronico?.toLowerCase() || "").includes(searchLower) ||
        (proveedor.celular?.toLowerCase() || "").includes(searchLower) ||
        (proveedor.direccion?.toLowerCase() || "").includes(searchLower) ||
        
        // Tipo de documento y persona
        (proveedor.tipo_documento?.toLowerCase() || "").includes(searchLower) ||
        tipoPersonaTexto.includes(searchLower) ||
        
        // Estado
        estadoTexto.includes(searchLower) ||
        
        // Búsqueda por ID
        (proveedor.id?.toString() || "").includes(searchLower) ||
        
        // Búsqueda combinada de tipo documento + documento
        `${proveedor.tipo_documento || ""} ${proveedor.documento || ""}`.toLowerCase().includes(searchLower) ||
        
        // Búsqueda en campos de fecha si existen
        (proveedor.fecha_creacion?.toLowerCase() || "").includes(searchLower) ||
        (proveedor.fecha_actualizacion?.toLowerCase() || "").includes(searchLower)
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

  // Obtener proveedores para la página actual
  const getCurrentPageItems = () => {
    const filtered = filteredAndSortedProveedores()
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  // Calcular número total de páginas
  const totalPages = Math.ceil(filteredAndSortedProveedores().length / itemsPerPage)

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

  // Formatear tipo de persona para mostrar (no se usa directamente en el JSX actual, pero es útil)
  const getTipoPersonaText = (tipo) => {
    return tipo === "natural" ? "Persona Natural" : "Persona Jurídica"
  }

  return (
    <div className="admin-container">
      {/* Toaster para las notificaciones */}
      <Toaster />
      <div className="admin-header">
        <h1 className="admin-title">Gestión de Proveedores</h1>
        <PermissionButton
          modulo="proveedores"
          accion="crear"
          className="admin-button primary"
          onClick={handleOpenCreateForm}
          hidden={true}
        >
          <FaPlus /> Nuevo Proveedor
        </PermissionButton>
      </div>

      {/* Filtros y búsqueda - SIN FILTRO DE TIPO */}
      <div className="admin-filters">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar proveedores..."
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

      {/* Tabla de proveedores */}
      {loading && !showForm ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando proveedores...</p>
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
                  <th onClick={() => handleSort("tipo_persona")}>Tipo {renderSortIndicator("tipo_persona")}</th>
                  <th onClick={() => handleSort("nombre")}>Nombre {renderSortIndicator("nombre")}</th>
                  <th onClick={() => handleSort("nombre_empresa")}>
                    Empresa/Documento {renderSortIndicator("nombre_empresa")}
                  </th>
                  <th onClick={() => handleSort("correo_electronico")}>
                    Correo {renderSortIndicator("correo_electronico")}
                  </th>
                  <th onClick={() => handleSort("celular")}>Celular {renderSortIndicator("celular")}</th>
                  <th onClick={() => handleSort("estado")}>Estado {renderSortIndicator("estado")}</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageItems().length > 0 ? (
                  getCurrentPageItems().map((proveedor) => (
                    <tr key={proveedor.id}>
                      <td>
                        <span
                          className={`status-badge ${normalizeTipoPersona(proveedor?.tipo_persona) === "natural" ? "active" : "inactive"}`}
                        >
                          {normalizeTipoPersona(proveedor?.tipo_persona) === "natural" ? "Natural" : "Jurídica"}
                        </span>
                      </td>
                      <td>{proveedor.nombre || "Sin nombre"}</td>
                      <td>
                        {normalizeTipoPersona(proveedor?.tipo_persona) === "natural" ? (
                          <span>{getDocumentoProveedor(proveedor)}</span>
                        ) : (
                          <span>
                            {proveedor.nombre_empresa || "Sin empresa"}
                            <br />
                            <small>NIT: {proveedor.nit || resolveDocumentoValor(proveedor) || "N/A"}</small>
                          </span>
                        )}
                      </td>
                      <td>{proveedor.correo_electronico || "Sin correo"}</td>
                      <td>{proveedor.celular || "Sin celular"}</td>
                      <td>
                        <div className="status-toggle">
                          <span className={`status-badge ${proveedor.estado === "activo" ? "active" : "inactive"}`}>
                            {proveedor.estado === "activo" ? "Activo" : "Inactivo"}
                          </span>
                          <PermissionWrapper
                            modulo="proveedores"
                            accion="editar"
                          >
                            <button
                              className={`toggle-button ${proveedor.estado === "activo" ? "active" : "inactive"}`}
                              onClick={() => handleToggleActive(proveedor)}
                              title={proveedor.estado === "activo" ? "Desactivar" : "Activar"}
                            >
                              {proveedor.estado === "activo" ? <FaTimes /> : <FaCheck />}
                            </button>
                          </PermissionWrapper>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <PermissionButton
                            modulo="proveedores"
                            accion="ver_detalles"
                            className="action-button view"
                            onClick={() => handleOpenDetails(proveedor)}
                            title="Ver detalles"
                            hidden={true}
                          >
                            <FaEye />
                          </PermissionButton>
                          <PermissionButton
                            modulo="proveedores"
                            accion="editar"
                            className="action-button edit"
                            onClick={() => handleOpenEditForm(proveedor)}
                            title="Editar proveedor"
                            hidden={true}
                          >
                            <FaEdit />
                          </PermissionButton>
                          <PermissionButton
                            modulo="proveedores"
                            accion="eliminar"
                            className="action-button delete"
                            onClick={() => confirmDelete(proveedor)}
                            title="Eliminar proveedor"
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
                    <td colSpan="7" className="no-data">
                      No se encontraron proveedores
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

      {/* Modal unificado para crear/editar/ver proveedor */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>
                {formMode === "create" && "Crear Nuevo Proveedor"}
                {formMode === "edit" && "Editar Proveedor"}
                {formMode === "view" && "Detalles del Proveedor"}
              </h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                &times;
              </button>
            </div>


            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="tipo_persona">
                    <FaUserTie className="form-icon" /> Tipo de Persona
                  </label>
                  <select
                    id="tipo_persona"
                    name="tipo_persona"
                    value={formData.tipo_persona}
                    onChange={handleInputChange}
                    className={formErrors.tipo_persona ? "error" : ""}
                    disabled={formMode === "view"}
                  >
                    <option value="natural">Persona Natural</option>
                    <option value="juridica">Persona Jurídica</option>
                  </select>
                  {formErrors.tipo_persona && <div className="error-text">{formErrors.tipo_persona}</div>}
                </div>

                {formData.tipo_persona === "natural" && (
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
                        disabled={formMode === "view"}
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
                        placeholder={
                          formData.tipo_documento === "CC"
                            ? "Ej: 1234567890"
                            : formData.tipo_documento === "TI"
                            ? "Ej: 0123456789"
                            : formData.tipo_documento === "CE"
                            ? "Ej: A12345B6"
                            : "Ej: AB123456"
                        }
                        required={formMode !== "view"}
                        maxLength={15}
                        disabled={formMode === "view"}
                        onKeyDown={(e) => {
                          if (formMode === "view") return
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
                    {/* Texto de ayuda removido según solicitud */}
                    {formErrors.documento && <div className="error-text">{formErrors.documento}</div>}
                  </div>
                )}

                {formData.tipo_persona === "juridica" && (
                  <>
                    <div className="form-group">
                      <label htmlFor="nombre_empresa">
                        <FaBuilding className="form-icon" /> Nombre Empresa
                      </label>
                      <input
                        type="text"
                        id="nombre_empresa"
                        name="nombre_empresa"
                        value={formData.nombre_empresa}
                        onChange={handleInputChange}
                        className={formErrors.nombre_empresa ? "error" : ""}
                        required={formMode !== "view"}
                        maxLength={100}
                        placeholder="Nombre de la empresa"
                        disabled={formMode === "view"}
                      />
                      {formErrors.nombre_empresa && <div className="error-text">{formErrors.nombre_empresa}</div>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="nit">
                        <FaIdCard className="form-icon" /> NIT
                      </label>
                      <input
                        type="text"
                        id="nit"
                        name="nit"
                        value={formData.nit}
                        onChange={handleInputChange}
                        className={formErrors.nit ? "error" : ""}
                        required={formMode !== "view"}
                      maxLength={20}
                      placeholder="Ej: 900.123.456-7"
                        disabled={formMode === "view"}
                        onKeyDown={(e) => {
                          if (formMode === "view") return
                        const isAllowed = /^\d$/.test(e.key) || [".", "-"].includes(e.key)
                          const isControl = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)
                        if (!isAllowed && !isControl) {
                            e.preventDefault()
                          }
                        }}
                      />
                      {formErrors.nit && <div className="error-text">{formErrors.nit}</div>}
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="nombre">
                    <FaUser className="form-icon" />{" "}
                    {formData.tipo_persona === "juridica" ? "Nombre Representante" : "Nombre Completo"}
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
                    placeholder="Nombre completo"
                    disabled={formMode === "view"}
                    onKeyDown={(e) => {
                      if (formMode === "view") return
                      const isLetter = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]$/.test(e.key)
                      const isControl = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)
                      if (!isLetter && !isControl) {
                        e.preventDefault()
                      }
                    }}
                  />
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
                    className={formErrors.direccion ? "error" : ""}
                    required={formMode !== "view"}
                    maxLength={200}
                    placeholder="Dirección completa"
                    disabled={formMode === "view"}
                  />
                  {formErrors.direccion && <div className="error-text">{formErrors.direccion}</div>}
                </div>

                <div className="form-group">
                  <label htmlFor="correo_electronico">
                    <FaEnvelope className="form-icon" />{" "}
                    {formData.tipo_persona === "juridica" ? "Correo Representante" : "Correo Electrónico"}
                  </label>
                  <input
                    type="email"
                    id="correo_electronico"
                    name="correo_electronico"
                    value={formData.correo_electronico}
                    onChange={handleInputChange}
                    className={formErrors.correo_electronico ? "error" : ""}
                    required={formMode !== "view"}
                    maxLength={100}
                    placeholder="correo@ejemplo.com"
                    disabled={formMode === "view"}
                  />
                  {formErrors.correo_electronico && <div className="error-text">{formErrors.correo_electronico}</div>}
                </div>

                <div className="form-group">
                  <label htmlFor="celular">
                    <FaMobile className="form-icon" /> Celular
                  </label>
                  <input
                    type="text"
                    id="celular"
                    name="celular"
                    value={formData.celular}
                    onChange={handleInputChange}
                    className={formErrors.celular ? "error" : ""}
                    required={formMode !== "view"}
                    maxLength={10}
                    placeholder="3001234567"
                    disabled={formMode === "view"}
                    onKeyDown={(e) => {
                      if (formMode === "view") return
                      const isNumber = /^\d$/.test(e.key)
                      const isControl = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)
                      if (!isNumber && !isControl) {
                        e.preventDefault()
                      }
                    }}
                  />
                  {formErrors.celular && <div className="error-text">{formErrors.celular}</div>}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="admin-button secondary" onClick={() => setShowForm(false)}>
                  {formMode === "view" ? "Cerrar" : "Cancelar"}
                </button>
                {formMode !== "view" && (
                  <button
                    type="submit"
                    className="admin-button primary"
                    disabled={
                      loading ||
                      Object.keys(formErrors).length > 0 ||
                      !formData.correo_electronico ||
                      (formData.tipo_persona === "natural"
                        ? !formData.documento
                        : !formData.nombre_empresa || !formData.nit)
                    }
                  >
                    {loading ? (
                      <>
                        <div className="spinner-small"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        {formMode === "create" && "Crear Proveedor"}
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
                ¿Está seguro que desea eliminar el proveedor{" "}
                <strong>
                  {proveedorToDelete?.tipo_persona === "juridica"
                    ? proveedorToDelete?.nombre_empresa
                    : proveedorToDelete?.nombre}
                </strong>
                ?
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

export default Proveedores
