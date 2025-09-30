"use client"

import { useState, useEffect, useMemo } from "react"
import toast, { Toaster } from "react-hot-toast"
import {
  FaPlus,
  FaEye,
  FaFilePdf,
  FaBan,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaTimes,
  FaCalendarAlt,
  FaBuilding,
  FaTrash,
  FaBoxOpen,
  FaExclamationTriangle,
  FaCheck,
  FaWarehouse,
  FaChevronLeft,
  FaChevronRight,
  FaArrowLeft,
  FaSave,
} from "react-icons/fa"
import comprasService from "../../service/comprasService"
import proveedoresService from "../../service/ProveedoresService"
import insumosService from "../../service/InsumosService"
import { generateCompraPDF, generateCompraPDFSimple, checkAutoTableAvailability } from "../../components/pdfGenerator"
import PermissionWrapper from "../../components/PermissionWrapper"
import PermissionButton from "../../components/PermissionButton"
import "../../styles/modals/ComprasModal.css"
// Add this import at the top with other imports
import CategoriaInsumoService from "../../service/CategoriaInsumoService"

const Compras = () => {
  // Estados para manejar los datos
  const [compras, setCompras] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Estados para controlar las vistas
  const [currentView, setCurrentView] = useState("list") // list, create, view
  const [selectedCompra, setSelectedCompra] = useState(null)

  // Estados para el formulario
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    proveedor: "",
    codigo_factura: "",
    observaciones: "",
    estado: "finalizada",
  })
  const [formErrors, setFormErrors] = useState({})
  const [generalError, setGeneralError] = useState("")

  // Estados para la tabla de insumos en el formulario
  const [insumosCompra, setInsumosCompra] = useState([])
  const [insumoSeleccionado, setInsumoSeleccionado] = useState("")
  const [cantidadInsumo, setCantidadInsumo] = useState("")
  const [precioInsumo, setPrecioInsumo] = useState("")
  // Errores en tiempo real por cada detalle
  const [detallesErrors, setDetallesErrors] = useState([]) // [{ cantidad?: string, precio?: string }]

  // Estados para paginación de insumos
  const [insumosCurrentPage, setInsumosCurrentPage] = useState(1)
  const [insumosPerPage] = useState(5)

  // Estados para filtrado y ordenamiento
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState("")
  const [filterProveedor, setFilterProveedor] = useState("")
  const [sortConfig, setSortConfig] = useState({
    key: "fecha",
    direction: "desc",
  })

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [totalItems, setTotalItems] = useState(0)

  // Estados para mensajes y confirmaciones
  const [actionTimeouts, setActionTimeouts] = useState(new Set())
  const [compraToAnular, setCompraToAnular] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState("")
  const [errorMotivoAnulacion, setErrorMotivoAnulacion] = useState("")

  // Add these new states after the existing states
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [busquedaInsumo, setBusquedaInsumo] = useState("")
  const [categorias, setCategorias] = useState([])

  // Add this new states after the existing states
  const [showInsumoModal, setShowInsumoModal] = useState(false)

  // UI: proveedor dropdown estilo buscador
  const [showProveedorDropdown, setShowProveedorDropdown] = useState(false)
  const [proveedorSearchTerm, setProveedorSearchTerm] = useState("")

  // Función para mostrar notificaciones
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

    setTimeout(() => {
      setActionTimeouts((prev) => {
        const newSet = new Set(prev)
        newSet.delete(notificationKey)
        return newSet
      })
    }, 2000)
  }

  // Cargar datos iniciales
  const fetchCompras = async () => {
    try {
      setLoading(true)
      const comprasData = await comprasService.getCompras()

      if (comprasData.results) {
        setCompras(comprasData.results)
        setTotalItems(comprasData.results.length)
      } else if (Array.isArray(comprasData)) {
        setCompras(comprasData)
        setTotalItems(comprasData.length)
      } else {
        setCompras([])
        setTotalItems(0)
      }

      setError(null)
    } catch (err) {
      setError("Error al cargar las compras. Por favor, intente nuevamente.")
      console.error("Error al cargar compras:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProveedores = async () => {
    try {
      const proveedoresData = await proveedoresService.getProveedores()
      setProveedores(Array.isArray(proveedoresData) ? proveedoresData : [])
    } catch (err) {
      console.error("Error al cargar proveedores:", err)
    }
  }

  const fetchInsumos = async () => {
    try {
      const insumosData = await insumosService.getInsumosActivos()
      setInsumos(Array.isArray(insumosData) ? insumosData : [])
    } catch (err) {
      console.error("Error al cargar insumos:", err)
      setInsumos([])
    }
  }

  const fetchCategorias = async () => {
    try {
      const categoriasData = await CategoriaInsumoService.getCategorias()
      if (Array.isArray(categoriasData) && categoriasData.length > 0) {
        setCategorias(categoriasData)
      } else {
        setCategorias([{ id: 0, nombre: "Sin categoría" }])
      }
    } catch (err) {
      console.error("Error al cargar categorías:", err)
      setCategorias([{ id: 0, nombre: "Sin categoría" }])
    }
  }

  useEffect(() => {
    fetchCompras()
    fetchProveedores()
    fetchInsumos()
    fetchCategorias()
  }, [])

  // Sincronizar texto del proveedor con selección
  useEffect(() => {
    if (!formData.proveedor) {
      setProveedorSearchTerm("")
      return
    }
    const p = proveedores.find((x) => String(x.id) === String(formData.proveedor))
    if (p) {
      const nombre = p.tipo_persona === "juridica" ? p.nombre_empresa : p.nombre
      setProveedorSearchTerm(nombre)
    }
  }, [formData.proveedor, proveedores])

  // Cerrar dropdowns al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showProveedorDropdown && !e.target.closest("#proveedor-select-container")) {
        setShowProveedorDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showProveedorDropdown])

  // Funciones de navegación
  const handleBackToList = () => {
    setCurrentView("list")
    setSelectedCompra(null)
    resetForm()
  }

  const handleCreateNew = () => {
    resetForm()
    setCurrentView("create")
  }

  const handleViewDetails = async (compra) => {
    try {
      const compraCompleta = await comprasService.getCompra(compra.id)
      setSelectedCompra(compraCompleta)

      // Obtener información completa del proveedor
      if (compraCompleta.proveedor) {
        try {
          const proveedorCompleto = await proveedoresService.getProveedor(compraCompleta.proveedor)
          setSelectedCompra({
            ...compraCompleta,
            proveedor_info: proveedorCompleto,
          })
        } catch (err) {
          console.error("Error al cargar proveedor:", err)
        }
      }

      // Transformar los detalles
      let detallesFormateados = []
      if (compraCompleta.detalles && compraCompleta.detalles.length > 0) {
        detallesFormateados = compraCompleta.detalles.map((detalle) => ({
          insumo_id: detalle.insumo,
          nombre: detalle.insumo_nombre,
          cantidad: detalle.cantidad,
          precio: detalle.precio_unitario,
          subtotal: detalle.subtotal,
        }))
      }

      setInsumosCompra(detallesFormateados)
      setInsumosCurrentPage(1)
      setCurrentView("view")
    } catch (err) {
      showNotification("Error al cargar los detalles de la compra", "error")
    }
  }

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split("T")[0],
      proveedor: "",
      codigo_factura: "",
      observaciones: "",
      estado: "finalizada",
    })
    setInsumosCompra([])
    setDetallesErrors([])
    setInsumosCurrentPage(1)
    setFormErrors({})
    setGeneralError("")
    setInsumoSeleccionado("")
    setCantidadInsumo("")
    setPrecioInsumo("")
    setFiltroCategoria("")
    setBusquedaInsumo("")
  }

  // Calcular subtotal de la compra
  const calcularSubtotal = () => {
    return insumosCompra.reduce((total, item) => {
      return total + Number.parseFloat(item.precio || 0) * Number.parseInt(item.cantidad || 0)
    }, 0)
  }

  // Calcular IVA (19%)
  const calcularIVA = () => {
    const subtotal = calcularSubtotal()
    return subtotal * 0.19
  }

  // Calcular total de la compra (subtotal + IVA)
  const calcularTotal = () => {
    const subtotal = calcularSubtotal()
    const iva = calcularIVA()
    return subtotal + iva
  }

  // Validar fechas
  const validarFecha = (fecha) => {
    const fechaSeleccionada = new Date(fecha)
    const hoy = new Date()
    const hace7Dias = new Date()
    hace7Dias.setDate(hoy.getDate() - 7)
    return fechaSeleccionada >= hace7Dias && fechaSeleccionada <= hoy
  }

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
    validateField(name, value)
  }

  // Validar campo individual
  const validateField = (fieldName, value) => {
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

      case "proveedor":
        if (!value) {
          errors.proveedor = "El proveedor es requerido"
        } else {
          delete errors.proveedor
        }
        break

      case "codigo_factura":
        if (value && value.trim() !== "") {
          if (value.length < 3) {
            errors.codigo_factura = "El código de factura debe tener al menos 3 caracteres"
          } else if (value.length > 50) {
            errors.codigo_factura = "El código de factura no puede exceder 50 caracteres"
          } else {
            delete errors.codigo_factura
          }
        } else {
          delete errors.codigo_factura
        }
        break

      default:
        break
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Agregar insumo a la compra
  const agregarInsumo = () => {
    if (!insumoSeleccionado || !cantidadInsumo || !precioInsumo) {
      setGeneralError("Debe seleccionar un insumo, cantidad y precio")
      return
    }

    // Validar cantidad mínima
    const cantidad = Number.parseInt(cantidadInsumo)
    if (cantidad < 1) {
      setGeneralError("La cantidad debe ser mayor a 0. Mínimo: 1 unidad")
      return
    }

    // Validar precio mínimo
    const precio = Number.parseFloat(precioInsumo)
    if (precio < 1) {
      setGeneralError("El precio debe ser mayor a 0. Mínimo: $1")
      return
    }

    const insumo = insumos.find((i) => i.id === Number.parseInt(insumoSeleccionado))
    if (!insumo) {
      setGeneralError("Insumo no encontrado")
      return
    }

    const insumoExistente = insumosCompra.find((i) => i.insumo_id === insumo.id)
    if (insumoExistente) {
      setGeneralError("Este insumo ya está agregado a la compra")
      return
    }

    const nuevoInsumo = {
      insumo_id: insumo.id,
      nombre: insumo.nombre,
      cantidad: cantidad,
      precio: precio,
      subtotal: precio * cantidad,
      stock_actual: insumo.cantidad,
    }

    setInsumosCompra([...insumosCompra, nuevoInsumo])
    setInsumoSeleccionado("")
    setCantidadInsumo("")
    setPrecioInsumo("")
    setGeneralError("")

    const totalInsumos = insumosCompra.length + 1
    const totalPaginas = Math.ceil(totalInsumos / insumosPerPage)
    setInsumosCurrentPage(totalPaginas)
  }

  // Eliminar insumo de la compra
  const eliminarInsumo = (index) => {
    const nuevosInsumos = insumosCompra.filter((_, i) => i !== index)
    setInsumosCompra(nuevosInsumos)

    const totalPaginas = Math.ceil(nuevosInsumos.length / insumosPerPage)
    if (insumosCurrentPage > totalPaginas && totalPaginas > 0) {
      setInsumosCurrentPage(totalPaginas)
    }
  }

  // Editar insumo en la compra
  const editarInsumo = (index, campo, valor) => {
    const nuevosInsumos = [...insumosCompra]

    if (campo === "cantidad") {
      const cantidad = Number.parseInt(valor) || 1 // Mínimo 1 si es inválido
      if (cantidad < 1) {
        // No permitir valores menores a 1
        // set error
        setDetallesErrors((prev) => {
          const next = [...prev]
          next[index] = { ...(next[index] || {}), cantidad: "Cantidad debe ser al menos 1" }
          return next
        })
        return
      }
      nuevosInsumos[index][campo] = cantidad
      // limpiar error
      setDetallesErrors((prev) => {
        const next = [...prev]
        if (next[index]) next[index] = { ...next[index], cantidad: "" }
        return next
      })
    } else if (campo === "precio") {
      const precio = Number.parseFloat(valor) || 1 // Mínimo 1 si es inválido
      if (precio < 1) {
        // No permitir precios menores a 1
        setDetallesErrors((prev) => {
          const next = [...prev]
          next[index] = { ...(next[index] || {}), precio: "Precio debe ser al menos $1" }
          return next
        })
        return
      }
      nuevosInsumos[index][campo] = precio
      // limpiar error
      setDetallesErrors((prev) => {
        const next = [...prev]
        if (next[index]) next[index] = { ...next[index], precio: "" }
        return next
      })
    } else {
      nuevosInsumos[index][campo] = valor
    }

    if (campo === "cantidad" || campo === "precio") {
      const cantidad = Number.parseInt(nuevosInsumos[index].cantidad) || 1
      const precio = Number.parseFloat(nuevosInsumos[index].precio) || 1
      nuevosInsumos[index].subtotal = precio * cantidad
    }

    setInsumosCompra(nuevosInsumos)
  }

  // Mantener largo de errores sincronizado con insumosCompra
  useEffect(() => {
    setDetallesErrors((prev) => {
      const next = [...prev]
      if (next.length < insumosCompra.length) {
        while (next.length < insumosCompra.length) next.push({})
      } else if (next.length > insumosCompra.length) {
        next.length = insumosCompra.length
      }
      return next
    })
  }, [insumosCompra])

  const hasDetalleErrors = useMemo(() => {
    return detallesErrors.some((e) => e && ((e.cantidad && e.cantidad.length > 0) || (e.precio && e.precio.length > 0)))
  }, [detallesErrors])

  // Obtener insumos para la página actual
  const getCurrentPageInsumos = () => {
    const indexOfLastInsumo = insumosCurrentPage * insumosPerPage
    const indexOfFirstInsumo = indexOfLastInsumo - insumosPerPage
    return insumosCompra.slice(indexOfFirstInsumo, indexOfLastInsumo)
  }

  const insumosTotalPages = Math.ceil(insumosCompra.length / insumosPerPage)

  const paginateInsumos = (pageNumber, e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setInsumosCurrentPage(pageNumber)
  }

  // Validar formulario completo
  const validateForm = () => {
    const fields = ["fecha", "proveedor"]
    let isValid = true

    fields.forEach((field) => {
      if (!validateField(field, formData[field])) {
        isValid = false
      }
    })

    // Validar código de factura solo si tiene valor
    if (formData.codigo_factura && formData.codigo_factura.trim() !== "") {
      if (!validateField("codigo_factura", formData.codigo_factura)) {
        isValid = false
      }
    }

    if (insumosCompra.length === 0) {
      setGeneralError("Debe agregar al menos un insumo a la compra")
      isValid = false
    }

    return isValid
  }

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setGeneralError("")

      const compraData = {
        proveedor: formData.proveedor,
        codigo_factura: formData.codigo_factura,
        estado: formData.estado,
        observaciones: formData.observaciones,
        detalles: insumosCompra.map((item) => ({
          insumo_id: item.insumo_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
        })),
      }

      await comprasService.createCompra(compraData)

      const totalInsumos = insumosCompra.length
      showNotification(
        `Compra creada exitosamente. Se ha actualizado el stock de ${totalInsumos} insumo${totalInsumos > 1 ? "s" : ""}.`,
        "success",
      )

      await fetchCompras()
      handleBackToList()
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
            }
          })
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join("; ")
          }
        }
      }

      setGeneralError(`Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Confirmar anulación
  const confirmAnular = (compra) => {
    setCompraToAnular(compra)
    setMotivoAnulacion("")
    setErrorMotivoAnulacion("")
  }

  // Anular compra
  const handleAnular = async () => {
    if (!compraToAnular) return

    // Validar que se haya ingresado un motivo
    if (!motivoAnulacion.trim()) {
      setErrorMotivoAnulacion("El motivo de anulación es requerido")
      return
    }

    if (motivoAnulacion.trim().length < 10) {
      setErrorMotivoAnulacion("El motivo debe tener al menos 10 caracteres")
      return
    }

    try {
      setLoading(true)

      // Enviar el motivo junto con la anulación
      console.log("Valor de motivoAnulacion antes de enviar:", motivoAnulacion)
      console.log("Valor de motivoAnulacion.trim() antes de enviar:", motivoAnulacion.trim())
      await comprasService.anularCompra(compraToAnular.id, {
        motivo_anulacion: motivoAnulacion.trim(),
      })

      showNotification("Compra anulada exitosamente. El stock de los insumos ha sido revertido.", "success")
      await fetchCompras()
    } catch (err) {
      console.error("Error al anular compra:", err)
      showNotification(
        `Error al anular: ${err.response?.data?.message || err.message || "Ha ocurrido un error"}`,
        "error",
      )
    } finally {
      setLoading(false)
      setCompraToAnular(null)
      setMotivoAnulacion("")
      setErrorMotivoAnulacion("")
    }
  }

  // Generar PDF
  const handleGenerarPDF = async (compra) => {
    try {
      showNotification("Generando PDF...", "info")

      const compraCompleta = await comprasService.getCompra(compra.id)
      const autoTableDisponible = checkAutoTableAvailability()

      let pdfGenerado = false

      if (autoTableDisponible) {
        console.log("Usando generador PDF avanzado con autoTable")
        pdfGenerado = generateCompraPDF(compraCompleta)
      } else {
        console.log("autoTable no disponible, usando generador PDF simple")
        pdfGenerado = generateCompraPDFSimple(compraCompleta)
      }

      if (pdfGenerado) {
        showNotification("PDF generado exitosamente", "success")
      } else {
        showNotification("Error al generar el PDF", "error")
      }
    } catch (err) {
      console.error("Error al generar PDF:", err)
      showNotification(`Error al generar el PDF: ${err.message || "Error desconocido"}`, "error")
    }
  }

  // Ordenar compras
  const handleSort = (key) => {
    let direction = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  // Filtrar y ordenar compras
  const filteredAndSortedCompras = () => {
    const filtered = compras.filter((compra) => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        (compra.proveedor_nombre?.toLowerCase() || "").includes(searchLower) ||
        (compra.codigo_factura?.toLowerCase() || "").includes(searchLower) ||
        (compra.observaciones?.toLowerCase() || "").includes(searchLower) ||
        (compra.fecha?.toLowerCase() || "").includes(searchLower) ||
        (compra.total?.toString() || "").includes(searchLower) ||
        (compra.estado?.toLowerCase() || "").includes(searchLower) ||
        (compra.id?.toString() || "").includes(searchLower)

      return matchesSearch
    })

    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key] || ""
      const bValue = b[sortConfig.key] || ""

      if (sortConfig.key === "total") {
        const aNum = Number.parseFloat(aValue) || 0
        const bNum = Number.parseFloat(bValue) || 0
        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum
      }

      if (sortConfig.key === "fecha") {
        const aDate = new Date(aValue)
        const bDate = new Date(bValue)
        return sortConfig.direction === "asc" ? aDate - bDate : bDate - aDate
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

  // Obtener compras para la página actual
  const getCurrentPageItems = () => {
    const filtered = filteredAndSortedCompras()
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  const totalPages = Math.ceil(filteredAndSortedCompras().length / itemsPerPage)

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber)
  }

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

  // Formatear fecha
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("es-CO")
  }

  // Obtener fechas límite
  const getFechaLimites = () => {
    const hoy = new Date()
    const hace7Dias = new Date()
    hace7Dias.setDate(hoy.getDate() - 7)

    return {
      min: hace7Dias.toISOString().split("T")[0],
      max: hoy.toISOString().split("T")[0],
    }
  }

  const fechaLimites = getFechaLimites()

  // Resetear página cuando cambien los filtros
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleFilterEstadoChange = (e) => {
    setFilterEstado(e.target.value)
    setCurrentPage(1)
  }

  const handleFilterProveedorChange = (e) => {
    setFilterProveedor(e.target.value)
    setCurrentPage(1)
  }

  const getFilteredInsumos = () => {
    const filtered = insumos.filter((insumo) => {
      // El campo correcto es categoria_insumo (puede ser ID o objeto completo)
      let insumoCategoria = null

      if (typeof insumo.categoria_insumo === "object" && insumo.categoria_insumo !== null) {
        // Si es un objeto completo (InsumoDetailSerializer)
        insumoCategoria = insumo.categoria_insumo.id
      } else if (typeof insumo.categoria_insumo === "number") {
        // Si es solo el ID (InsumoSerializer)
        insumoCategoria = insumo.categoria_insumo
      }

      // Filtro por categoría
      const matchesCategory =
        !filtroCategoria ||
        filtroCategoria === "0" ||
        insumoCategoria === Number.parseInt(filtroCategoria) ||
        insumoCategoria === filtroCategoria

      // Filtro por búsqueda
      const matchesSearch = !busquedaInsumo || insumo.nombre.toLowerCase().includes(busquedaInsumo.toLowerCase())

      // No debe estar ya en la compra
      const notInCompra = !insumosCompra.find((ic) => ic.insumo_id === insumo.id)

      return matchesCategory && matchesSearch && notInCompra
    })

    return filtered
  }

  // Renderizar motivo de anulación
  const renderMotivoAnulacion = () => {
    if (!selectedCompra || selectedCompra.estado !== "anulada" || !selectedCompra.motivo_anulacion) {
      return null
    }

    return (
      <div className="motivo-anulacion-display">
        <div className="form-group full-width">
          {" "}
          {/* Usar full-width para que ocupe todo el ancho */}
          <label>
            <FaExclamationTriangle className="form-icon" />
            Motivo de Anulación
          </label>
          <textarea className="motivo-anulacion-content" value={selectedCompra.motivo_anulacion} readOnly rows="4" />
        </div>
      </div>
    )
  }

  // Renderizar vista de lista
  const renderListView = () => (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Gestión de Compras</h1>
        <PermissionButton
          modulo="compras"
          accion="crear"
          className="admin-button primary"
          onClick={handleCreateNew}
          hidden={true}
        >
          <FaPlus /> Nueva Compra
        </PermissionButton>
      </div>

      {/* Filtros y búsqueda */}
      <div className="admin-filters">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar compras..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        <div className="items-per-page">
          <span>Mostrar:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
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

      {/* Tabla de compras */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando compras...</p>
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
                  <th onClick={() => handleSort("fecha")}>Fecha {renderSortIndicator("fecha")}</th>
                  <th>Código Factura</th>
                  <th onClick={() => handleSort("total")}>Total {renderSortIndicator("total")}</th>
                  <th onClick={() => handleSort("proveedor_nombre")}>
                    Proveedor {renderSortIndicator("proveedor_nombre")}
                  </th>
                  <th onClick={() => handleSort("estado")}>Estado {renderSortIndicator("estado")}</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageItems().length > 0 ? (
                  getCurrentPageItems().map((compra) => (
                    <tr key={compra.id}>
                      <td>{formatDate(compra.fecha)}</td>
                      <td>{compra.codigo_factura || "Sin código"}</td>
                      <td className="price-total-cell">{formatPrice(compra.total)}</td>
                      <td>{compra.proveedor_nombre || "Sin proveedor"}</td>
                      <td>
                        <span className={`status-badge ${compra.estado}`}>
                          {compra.estado === "finalizada" ? "Finalizada" : "Anulada"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <PermissionButton
                            modulo="compras"
                            accion="ver_detalles"
                            className="action-button view"
                            onClick={() => handleViewDetails(compra)}
                            title="Ver detalles"
                            hidden={true}
                          >
                            <FaEye />
                          </PermissionButton>
                          <PermissionWrapper
                            modulo="compras"
                            accion="ver_detalles"
                          >
                            <button
                              className="action-button pdf"
                              onClick={() => handleGenerarPDF(compra)}
                              title="Generar PDF"
                            >
                              <FaFilePdf />
                            </button>
                          </PermissionWrapper>
                          {compra.estado === "finalizada" && (
                            <PermissionWrapper
                              modulo="compras"
                              accion="eliminar"
                            >
                              <button
                                className="action-button delete"
                                onClick={() => confirmAnular(compra)}
                                title="Anular compra"
                              >
                                <FaBan />
                              </button>
                            </PermissionWrapper>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">
                      No se encontraron compras
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
    </>
  )

  // Renderizar vista de crear/editar
  const renderFormView = () => (
    <div className="compra-form-container">
      <div className="form-header">
        <div className="form-header-left">
          <button className="admin-button secondary" onClick={handleBackToList}>
            <FaArrowLeft /> Volver a la Lista
          </button>
        </div>
        <h1 className="form-title">{currentView === "create" ? "Crear Nueva Compra" : "Detalles de la Compra"}</h1>
        <div className="form-header-right">
          {currentView === "create" && (
            <button
              className="admin-button primary"
              onClick={handleSubmit}
              disabled={loading || insumosCompra.length === 0}
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <FaSave /> Crear Compra
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {generalError && <div className="general-error">{generalError}</div>}

      <div className="form-content">
        {/* Lado izquierdo - Campos del formulario */}
        <div className="form-left">
          <div className="form-section">
            <h3>Información de la Compra</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="fecha">
                  <FaCalendarAlt className="form-icon" /> Fecha de Compra
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
                  disabled={currentView === "view"}
                />
                {formErrors.fecha && <div className="error-text">{formErrors.fecha}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="codigo_factura">
                  <FaFilePdf className="form-icon" /> Código de Factura
                </label>
                {currentView === "view" ? (
                  <div className="readonly-field">
                    {selectedCompra?.codigo_factura || "Sin código de factura"}
                  </div>
                ) : (
                  <input
                    type="text"
                    id="codigo_factura"
                    name="codigo_factura"
                    value={formData.codigo_factura}
                    onChange={handleInputChange}
                    className={formErrors.codigo_factura ? "error" : ""}
                    placeholder="Ej: FAC-2024-001 (opcional)"
                    maxLength={50}
                    disabled={currentView === "view"}
                  />
                )}
                {formErrors.codigo_factura && <div className="error-text">{formErrors.codigo_factura}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="proveedor">
                  <FaBuilding className="form-icon" /> Proveedor
                </label>
                {currentView === "view" ? (
                  <div className="readonly-field">
                    {selectedCompra?.proveedor_info
                      ? selectedCompra.proveedor_info.tipo_persona === "juridica"
                        ? selectedCompra.proveedor_info.nombre_empresa
                        : selectedCompra.proveedor_info.nombre
                      : selectedCompra?.proveedor_nombre || "Proveedor no encontrado"}
                  </div>
                ) : (
                  <div id="proveedor-select-container" className="searchable-select-container">
                    <input
                      id="proveedor"
                      type="text"
                      value={proveedorSearchTerm}
                      placeholder="Seleccionar proveedor"
                      onFocus={() => setShowProveedorDropdown(true)}
                      onChange={(e) => {
                        setProveedorSearchTerm(e.target.value)
                        setShowProveedorDropdown(true)
                      }}
                      className={`searchable-input ${formErrors.proveedor ? "error" : ""}`}
                      autoComplete="off"
                    />
                    {showProveedorDropdown && (
                      <div className="searchable-dropdown">
                        {proveedores
                          .filter((p) => {
                            const nombre = p.tipo_persona === "juridica" ? p.nombre_empresa : p.nombre
                            return nombre.toLowerCase().includes((proveedorSearchTerm || "").toLowerCase())
                          })
                          .map((p) => {
                            const label = p.tipo_persona === "juridica" ? p.nombre_empresa : p.nombre
                            return (
                              <div
                                key={p.id}
                                className="searchable-option"
                                onClick={() => {
                                  setFormData((f) => ({ ...f, proveedor: p.id }))
                                  setProveedorSearchTerm(label)
                                  setShowProveedorDropdown(false)
                                  validateField("proveedor", String(p.id))
                                }}
                              >
                                <div className="option-name">{label}</div>
                              </div>
                            )
                          })}
                        {proveedores.filter((p) => {
                          const nombre = p.tipo_persona === "juridica" ? p.nombre_empresa : p.nombre
                          return nombre.toLowerCase().includes((proveedorSearchTerm || "").toLowerCase())
                        }).length === 0 && (
                          <div className="searchable-option no-results">Sin resultados</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {formErrors.proveedor && <div className="error-text">{formErrors.proveedor}</div>}
              </div>

              <div className="form-group full-width">
                <label htmlFor="observaciones">Observaciones</label>
                <textarea
                  id="observaciones"
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Observaciones adicionales (opcional)"
                  disabled={currentView === "view"}
                />
              </div>
            </div>

            {/* Mostrar motivo de anulación si existe */}
            {renderMotivoAnulacion()}
          </div>
        </div>

        {/* Lado derecho - Agregar insumos */}
        <div className={`form-right ${insumosCompra.length > 5 ? 'scrollable' : ''}`}>
          <div className="insumos-section">
            <h3>
              <FaBoxOpen className="form-icon" /> Insumos de la Compra
            </h3>

            {/* Agregar insumo */}
            {currentView === "create" && (
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
                      <label>Cantidad</label>
                      <input
                        type="number"
                        value={cantidadInsumo}
                        onChange={(e) => {
                          const value = e.target.value
                          // Solo permitir números positivos
                          if (value === "" || (Number.parseInt(value) >= 1 && Number.parseInt(value) <= 9999)) {
                            setCantidadInsumo(value)
                          }
                        }}
                        onBlur={(e) => {
                          // Al perder el foco, asegurar que sea al menos 1
                          const value = Number.parseInt(e.target.value)
                          if (!value || value < 1) {
                            setCantidadInsumo("1")
                          }
                        }}
                        min="1"
                        max="9999"
                        className="form-control"
                        placeholder="Cantidad (mín. 1)"
                      />
                    </div>

                    <div className="input-group">
                      <label>Precio Unitario</label>
                      <input
                        type="number"
                        value={precioInsumo}
                        onChange={(e) => {
                          const value = e.target.value
                          // Solo permitir números positivos mayores a 0
                          if (
                            value === "" ||
                            (Number.parseFloat(value) >= 1 && Number.parseFloat(value) <= 999999)
                          ) {
                            setPrecioInsumo(value)
                          }
                        }}
                        onBlur={(e) => {
                          // Al perder el foco, asegurar que sea al menos 1
                          const value = Number.parseFloat(e.target.value)
                          if (!value || value < 1) {
                            setPrecioInsumo("1")
                          }
                        }}
                        min="1"
                        max="999999"
                        step="0.01"
                        className="form-control"
                        placeholder="Precio (mín. $1)"
                      />
                    </div>

                    <div className="input-group">
                      <button type="button" className="admin-button primary" onClick={agregarInsumo}>
                        <FaPlus /> Agregar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tabla de insumos */}
            {(currentView === "view" ? (selectedCompra?.detalles?.length > 0) : (insumosCompra.length > 0)) && (
              <div className="insumos-table-container">
                <table className="insumos-table">
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      {currentView === "create" && <th>Stock Actual</th>}
                      <th>Cantidad</th>
                      <th>Precio Unit.</th>
                      <th>Subtotal</th>
                      {currentView === "create" && <th>Nuevo Stock</th>}
                      {currentView === "create" && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {currentView === "view"
                      ? (selectedCompra?.detalles || []).map((det, index) => (
                          <tr key={`view-${index}`}>
                            <td>{det.insumo_nombre || det.nombre || "Insumo"}</td>
                            <td>{det.cantidad}</td>
                            <td>{formatPrice(det.precio_unitario)}</td>
                            <td className="price-cell">{formatPrice(det.subtotal || ((Number(det.precio_unitario)||0) * (Number(det.cantidad)||0)))}</td>
                          </tr>
                        ))
                      : getCurrentPageInsumos().map((item, index) => {
                      const realIndex = (insumosCurrentPage - 1) * insumosPerPage + index
                      const insumoOriginal = insumos.find((i) => i.id === item.insumo_id)
                      const stockActual = insumoOriginal?.cantidad || 0
                      const nuevoStock = stockActual + item.cantidad

                      return (
                        <tr key={realIndex}>
                          <td>{item.nombre}</td>
                          {currentView === "create" && (
                            <td>
                              <span className="stock-info">
                                <FaWarehouse className="stock-icon" />
                                {stockActual}
                              </span>
                            </td>
                          )}
                          <td>
                            {currentView === "create" ? (
                              <input
                                type="number"
                                value={item.cantidad}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === "" || (Number.parseInt(value) >= 1 && Number.parseInt(value) <= 9999)) {
                                    editarInsumo(realIndex, "cantidad", value)
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = Number.parseInt(e.target.value)
                                  if (!value || value < 1) {
                                    editarInsumo(realIndex, "cantidad", "1")
                                  }
                                }}
                                min="1"
                                max="9999"
                                className="table-input"
                                placeholder="Mín. 1"
                              />
                            ) : (
                              item.cantidad
                            )}
                          </td>
                          <td>
                            {currentView === "create" ? (
                              <input
                                type="number"
                                value={item.precio}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (
                                    value === "" ||
                                    (Number.parseFloat(value) >= 0.01 && Number.parseFloat(value) <= 999999)
                                  ) {
                                    editarInsumo(realIndex, "precio", value)
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = Number.parseFloat(e.target.value)
                                  if (!value || value < 1) {
                                    editarInsumo(realIndex, "precio", "1")
                                  }
                                }}
                                min="1"
                                max="999999"
                                step="0.01"
                                className="table-input"
                                placeholder="Mín. $1"
                              />
                            ) : (
                              formatPrice(item.precio)
                            )}
                          </td>
                          <td className="price-cell">{formatPrice(item.subtotal)}</td>
                          {currentView === "create" && (
                            <td>
                              <span className="new-stock">
                                <FaCheck className="check-icon" />
                                {nuevoStock}
                              </span>
                            </td>
                          )}
                          {currentView === "create" && (
                            <td>
                              <button
                                type="button"
                                className="action-button delete small"
                                onClick={() => eliminarInsumo(realIndex)}
                                title="Eliminar insumo"
                              >
                                <FaTrash />
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="subtotal-row">
                      <td colSpan={currentView === "create" ? "5" : "3"}>
                        <strong>Subtotal:</strong>
                      </td>
                      <td className="price-cell">
                        <strong>{formatPrice(calcularSubtotal())}</strong>
                      </td>
                      {currentView === "create" && <td colSpan="2"></td>}
                    </tr>
                    <tr className="iva-row">
                      <td colSpan={currentView === "create" ? "5" : "3"}>
                        <strong>IVA (19%):</strong>
                      </td>
                      <td className="price-cell">
                        <strong>{formatPrice(calcularIVA())}</strong>
                      </td>
                      {currentView === "create" && <td colSpan="2"></td>}
                    </tr>
                    <tr className="total-row">
                      <td colSpan={currentView === "create" ? "5" : "3"}>
                        <strong>Total de la Compra:</strong>
                      </td>
                      <td className="price-cell">
                        <strong>{formatPrice(calcularTotal())}</strong>
                      </td>
                      {currentView === "create" && <td colSpan="2"></td>}
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
                      Página {insumosCurrentPage} de {insumosTotalPages} ({insumosCompra.length} insumos)
                    </div>
                  </div>
                )}
              </div>
            )}

            {insumosCompra.length === 0 && (
              <div className="no-insumos">
                <FaBoxOpen className="no-insumos-icon" />
                <p>No hay insumos agregados a la compra</p>
                {currentView === "create" && <p>Agregue al menos un insumo para continuar</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="compras-module">
      <div className="admin-container">
        <Toaster />

        {currentView === "list" && renderListView()}
        {(currentView === "create" || currentView === "view") && renderFormView()}

        {/* Modal para seleccionar insumos */}
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
                      className={`insumo-modal-item ${insumoSeleccionado === insumo.id.toString() ? "selected" : ""}`}
                      onClick={() => {
                        setInsumoSeleccionado(insumo.id.toString())
                        setShowInsumoModal(false)
                      }}
                    >
                      <div className="insumo-info">
                        <h5>{insumo.nombre}</h5>
                        <span className="category-name">
                          {(() => {
                            // Manejar tanto objeto completo como ID
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

        {/* Diálogo de confirmación */}
        {compraToAnular && (
          <div className="modal-overlay">
            <div className="modal-container confirm-dialog">
              <div className="modal-header">
                <h2>Confirmar Anulación de Compra</h2>
                <button
                  className="modal-close"
                  onClick={() => {
                    setCompraToAnular(null)
                    setMotivoAnulacion("")
                    setErrorMotivoAnulacion("")
                  }}
                >
                  &times;
                </button>
              </div>

              <div className="confirm-content">
                <FaExclamationTriangle className="warning-icon" />
                <p>
                  ¿Está seguro que desea anular la compra del <strong>{formatDate(compraToAnular?.fecha)}</strong> por{" "}
                  <strong>{formatPrice(compraToAnular?.total)}</strong>?
                </p>
                <p className="warning-text">Esta acción revertirá el stock de los insumos y no se puede deshacer.</p>

                <div className="motivo-anulacion-section">
                  <label htmlFor="motivoAnulacion" className="motivo-label">
                    <FaExclamationTriangle className="form-icon" />
                    Motivo de Anulación *
                  </label>
                  <textarea
                    id="motivoAnulacion"
                    value={motivoAnulacion}
                    onChange={(e) => {
                      setMotivoAnulacion(e.target.value)
                      if (e.target.value.trim().length >= 10) {
                        setErrorMotivoAnulacion("")
                      }
                    }}
                    className={`motivo-textarea ${errorMotivoAnulacion ? "error" : ""}`}
                    placeholder="Ingrese el motivo de anulación de esta compra (mínimo 10 caracteres)"
                    rows="4"
                    maxLength="500"
                  />
                  {errorMotivoAnulacion && <div className="error-text">{errorMotivoAnulacion}</div>}
                  <div className="character-count">{motivoAnulacion.length}/500 caracteres</div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  className="admin-button secondary"
                  onClick={() => {
                    setCompraToAnular(null)
                    setMotivoAnulacion("")
                    setErrorMotivoAnulacion("")
                  }}
                >
                  <FaTimes /> Cancelar
                </button>
                <button
                  className="admin-button danger"
                  onClick={handleAnular}
                  disabled={loading || !motivoAnulacion.trim() || motivoAnulacion.trim().length < 10}
                >
                  {loading ? (
                    <>
                      <div className="spinner-small"></div>
                      Anulando...
                    </>
                  ) : (
                    <>
                      <FaBan /> Anular Compra
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

export default Compras
