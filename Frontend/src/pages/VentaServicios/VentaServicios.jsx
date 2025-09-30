"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  FaPlus,
  FaSearch,
  FaServicestack,
  FaStickyNote,
  FaArrowLeft,
  FaSave,
  FaEye,
  FaEdit,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaTimes,
  FaCheck,
  FaUser,
  FaUserMd,
  FaClipboardList,
} from "react-icons/fa"
import ventaServiciosService from "../../service/VentaServiciosService.js"
import citasService from "../../service/CitasService.js" // Necesario para obtener manicuristas y buscar clientes
import PermissionButton from "../../components/PermissionButton"
import PermissionWrapper from "../../components/PermissionWrapper"
import toast, { Toaster } from "react-hot-toast"
import "../../styles/VentaServicios.css" // Importar el CSS específico para Ventas
import "../../styles/modals/CitasModal.css" // Reutilizar estilos de servicios de Nueva Cita

const VentaServicios = () => {
  const navigate = useNavigate()

  // Estados principales
  const [currentView, setCurrentView] = useState("list") // Cambiado a lista directa
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedVenta, setSelectedVenta] = useState(null)

  // Estados para filtros y paginación (solo para la tabla de ventas)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [sortConfig, setSortConfig] = useState({
    key: "fecha_venta",
    direction: "desc",
  })

  // Estados para datos de apoyo
  const [clientes, setClientes] = useState([])
  const [manicuristas, setManicuristas] = useState([])
  const [servicios, setServicios] = useState([])
  const [metodosPago, setMetodosPago] = useState([])

  // Estados del formulario
  const [formData, setFormData] = useState({
    cliente: "",
    manicurista: "",
    detalles: [{ servicio: "", cantidad: 1, precio_unitario: 0, descuento_linea: 0 }],
    fecha_venta: new Date().toISOString().split("T")[0],
    estado: "pendiente",
    metodo_pago: "efectivo",
    observaciones: "",
    porcentaje_comision: 0,
    citas: [],
    cita: null,
  })
  const [formErrors, setFormErrors] = useState({})
  const [generalError, setGeneralError] = useState("")
  const [citaIdInput, setCitaIdInput] = useState("")

  // Estados para búsqueda de cliente
  const [busquedaCliente, setBusquedaCliente] = useState("")
  const [mostrarResultadosClientes, setMostrarResultadosClientes] = useState(false)

  // Estados para modales
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [newMetodoPago, setNewMetodoPago] = useState("")
  const [statusChangeObservaciones, setStatusChangeObservaciones] = useState("")
  const [showAddServiceModal, setShowAddServiceModal] = useState(false)

  const fetchVentas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("🔄 Cargando todas las ventas...")
      const data = await ventaServiciosService.obtenerVentas()
      console.log("✅ Ventas cargadas:", data)
      setVentas(data)
    } catch (err) {
      setError("Error al cargar las ventas.")
      console.error("❌ Error en fetchVentas:", err)
      toast.error("Error al cargar las ventas")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSupportData = useCallback(async () => {
    try {
      setLoading(true)
      const [manicuristasData, serviciosData, metodosPagoData] = await Promise.all([
        citasService.obtenerManicuristasDisponibles(),
        citasService.obtenerServiciosActivos(),
        ventaServiciosService.obtenerMetodosPagoDisponibles(),
      ])

      setManicuristas(manicuristasData)
      setServicios(serviciosData)
      setMetodosPago(metodosPagoData)
    } catch (err) {
      console.error("Error al cargar datos de apoyo:", err)
      toast.error("Error al cargar datos de apoyo.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVentas()
    fetchSupportData()
  }, [fetchVentas, fetchSupportData])

  const handleSort = (key) => {
    let direction = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) {
      return <FaSort className="ventas-sort-icon" />
    }
    return sortConfig.direction === "asc" ? (
      <FaSortUp className="ventas-sort-icon active" />
    ) : (
      <FaSortDown className="ventas-sort-icon active" />
    )
  }

  const getFilteredAndSortedVentas = () => {
    const filtered = ventas.filter((venta) => {
      const searchLower = searchTerm.toLowerCase()
      const clienteNombre = venta.cliente_info?.nombre?.toLowerCase() || ""
      const manicuristaNombre = venta.manicurista_info?.nombres?.toLowerCase() || ""
      const servicioNombres =
        venta.detalles?.map((d) => d.servicio_info?.nombre?.toLowerCase()).join(" ") ||
        venta.servicio_info?.nombre?.toLowerCase() ||
        ""
      const estado = venta.estado?.toLowerCase() || ""
      const metodoPago = venta.metodo_pago?.toLowerCase() || ""

      return (
        // Información del cliente
        clienteNombre.includes(searchLower) ||
        (venta.cliente_info?.documento?.toLowerCase() || "").includes(searchLower) ||
        (venta.cliente_info?.celular?.toLowerCase() || "").includes(searchLower) ||
        (venta.cliente_info?.correo_electronico?.toLowerCase() || "").includes(searchLower) ||
        
        // Información del manicurista
        manicuristaNombre.includes(searchLower) ||
        (venta.manicurista_info?.especialidad?.toLowerCase() || "").includes(searchLower) ||
        (venta.manicurista_info?.email?.toLowerCase() || "").includes(searchLower) ||
        (venta.manicurista_info?.documento?.toLowerCase() || "").includes(searchLower) ||
        
        // Servicios
        servicioNombres.includes(searchLower) ||
        
        // Información de la venta
        estado.includes(searchLower) ||
        metodoPago.includes(searchLower) ||
        (venta.total?.toString() || "").includes(searchLower) ||
        (venta.fecha_venta?.toLowerCase() || "").includes(searchLower) ||
        (venta.observaciones?.toLowerCase() || "").includes(searchLower) ||
        
        // Búsqueda por ID
        (venta.id?.toString() || "").includes(searchLower) ||
        
        // Búsqueda en campos de fecha si existen
        (venta.fecha_creacion?.toLowerCase() || "").includes(searchLower) ||
        (venta.fecha_actualizacion?.toLowerCase() || "").includes(searchLower)
      )
    })

    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key]
      let bValue = b[sortConfig.key]

      if (sortConfig.key === "fecha_venta") {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      } else if (sortConfig.key === "cliente_info") {
        aValue = a.cliente_info?.nombre || ""
        bValue = b.cliente_info?.nombre || ""
      } else if (sortConfig.key === "manicurista_info") {
        aValue = a.manicurista_info?.nombres || ""
        bValue = b.manicurista_info?.nombres || ""
      } else if (sortConfig.key === "total") {
        aValue = Number.parseFloat(a.total)
        bValue = Number.parseFloat(b.total)
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

  const getCurrentPageVentas = () => {
    const filtered = getFilteredAndSortedVentas()
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    return filtered.slice(indexOfFirstItem, indexOfLastItem)
  }

  const totalPages = Math.ceil(getFilteredAndSortedVentas().length / itemsPerPage)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleDetalleChange = (index, field, value) => {
    const newDetalles = [...formData.detalles]
    newDetalles[index] = {
      ...newDetalles[index],
      [field]: value,
    }

    // If service is changed, update precio_unitario
    if (field === "servicio") {
      const selectedService = servicios.find((s) => s.id === Number(value))
      if (selectedService) {
        newDetalles[index].precio_unitario = selectedService.precio
      } else {
        newDetalles[index].precio_unitario = 0 // Reset if no service selected
      }
    }
    setFormData((prev) => ({ ...prev, detalles: newDetalles }))
  }

  const handleRemoveDetalle = (index) => {
    const newDetalles = formData.detalles.filter((_, i) => i !== index)
    setFormData((prev) => ({ ...prev, detalles: newDetalles }))
  }

  const addDetalle = () => {
    setFormData((prev) => ({
      ...prev,
      detalles: [...prev.detalles, { servicio: "", cantidad: 1, precio_unitario: 0, descuento_linea: 0 }],
    }))
  }

  const removeDetalle = (index) => {
    setFormData((prev) => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== index),
    }))
  }

  const buscarClientes = async (query) => {
    if (query.length < 2) {
      setClientes([])
      setMostrarResultadosClientes(false)
      return
    }
    try {
      const clientesData = await citasService.buscarClientes(query)
      setClientes(clientesData)
      setMostrarResultadosClientes(clientesData.length > 0)
    } catch (error) {
      console.error("Error buscando clientes:", error)
      toast.error("Error buscando clientes.")
    }
  }

  const seleccionarCliente = (cliente) => {
    setFormData((prev) => ({ ...prev, cliente: cliente.id }))
    setBusquedaCliente(`${cliente.nombre} - ${cliente.documento}`)
    setMostrarResultadosClientes(false)
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.cliente) errors.cliente = "Cliente es requerido."
    if (!formData.manicurista) errors.manicurista = "Manicurista es requerida."
    if (!formData.detalles || formData.detalles.length === 0) {
      errors.detalles = "Debe agregar al menos un servicio."
    } else {
      formData.detalles.forEach((detalle, index) => {
        if (!detalle.servicio) errors[`detalle_servicio_${index}`] = "Servicio es requerido."
        if (detalle.cantidad <= 0) errors[`detalle_cantidad_${index}`] = "Cantidad debe ser mayor a 0."
        if (detalle.precio_unitario < 0) errors[`detalle_precio_${index}`] = "Precio unitario no puede ser negativo."
        if (detalle.descuento_linea < 0) errors[`detalle_descuento_${index}`] = "Descuento no puede ser negativo."
      })
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error("Por favor corrija los errores en el formulario.")
      return
    }

    setLoading(true)
    setGeneralError("")
    try {
      let response
      if (currentView === "create") {
        response = await ventaServiciosService.crearVenta(formData)
        toast.success("Venta creada exitosamente!")
      } else if (currentView === "edit" && selectedVenta) {
        response = await ventaServiciosService.actualizarVenta(selectedVenta.id, formData)
        toast.success("Venta actualizada exitosamente!")
      }
      console.log("Respuesta de la operación:", response)
      setCurrentView("list") // Volver a la lista general de ventas
      fetchVentas() // Recargar ventas
    } catch (err) {
      console.error("Error al guardar venta:", err)
      const errorMessage = err.userMessage || err.response?.data?.message || err.message || "Error desconocido"
      setGeneralError(`Error: ${errorMessage}`)
      toast.error(`Error al guardar venta: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVenta = () => {
    setCurrentView("create")
    setSelectedVenta(null)
    setFormData({
      cliente: "",
      manicurista: "", // Sin pre-selección
      detalles: [{ servicio: "", cantidad: 1, precio_unitario: 0, descuento_linea: 0 }],
      fecha_venta: new Date().toISOString().split("T")[0],
      estado: "pendiente",
      metodo_pago: "efectivo",
      observaciones: "",
      porcentaje_comision: 0,
      citas: [],
      cita: null,
    })
    setBusquedaCliente("")
    setFormErrors({})
    setGeneralError("")
  }

  const handleViewDetails = async (venta) => {
    setLoading(true)
    try {
      const fullVenta = await ventaServiciosService.obtenerVenta(venta.id)
      setSelectedVenta(fullVenta)
      setCurrentView("detail")
    } catch (err) {
      console.error("Error al cargar detalles de venta:", err)
      toast.error("Error al cargar detalles de venta.")
    } finally {
      setLoading(false)
    }
  }

  const handleEditVenta = async (venta) => {
    setLoading(true)
    try {
      const fullVenta = await ventaServiciosService.obtenerVenta(venta.id)
      console.log("🔍 Venta completa cargada:", fullVenta)
      console.log("🔍 Cliente info:", fullVenta.cliente_info)
      console.log("🔍 Manicurista info:", fullVenta.manicurista_info)
      console.log("🔍 Detalles:", fullVenta.detalles)
      setSelectedVenta(fullVenta)

      const mappedDetalles =
        fullVenta.detalles?.map((d) => ({
          servicio: d.servicio,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          descuento_linea: d.descuento_linea,
          // Marcar como de cita si este detalle de servicio coincide con el servicio de la cita vinculada
          // Y si la venta tiene una cita principal asociada
          isFromCita: fullVenta.cita && d.servicio === fullVenta.cita_info?.servicio,
        })) || []

      console.log("🔍 Detalles mapeados:", mappedDetalles)

      setFormData({
        cliente: fullVenta.cliente,
        manicurista: fullVenta.manicurista,
        detalles:
          mappedDetalles.length > 0
            ? mappedDetalles
            : [{ servicio: "", cantidad: 1, precio_unitario: 0, descuento_linea: 0 }], // Asegurar al menos un detalle
        fecha_venta: ventaServiciosService.formatearFecha(fullVenta.fecha_venta),
        estado: fullVenta.estado,
        metodo_pago: fullVenta.metodo_pago,
        observaciones: fullVenta.observaciones || "",
        porcentaje_comision: fullVenta.porcentaje_comision || 0,
        citas: fullVenta.citas_ids || [],
        cita: fullVenta.cita || null,
      })

      // Cargar información del cliente
      if (fullVenta.cliente_info) {
        setBusquedaCliente(`${fullVenta.cliente_info.nombre} - ${fullVenta.cliente_info.documento}`)
      } else {
        // Fallback: intentar cargar desde el servicio
        try {
          const clienteInfo = await citasService.obtenerCliente(fullVenta.cliente)
          if (clienteInfo) {
            setBusquedaCliente(`${clienteInfo.nombre} - ${clienteInfo.documento}`)
          } else {
            setBusquedaCliente("Cliente no encontrado")
          }
        } catch (error) {
          console.error("Error cargando cliente:", error)
          setBusquedaCliente("Cliente no encontrado")
        }
      }

      setCurrentView("edit")
    } catch (err) {
      console.error("Error al cargar venta para edición:", err)
      toast.error("Error al cargar venta para edición.")
    } finally {
      setLoading(false)
    }
  }

  // Vincular servicios desde una cita por ID (precarga servicios de la cita y permite agregar extras)
  const vincularCitaPorId = async () => {
    const citaId = Number(citaIdInput)
    if (!citaId) return
    try {
      const citaFull = await citasService.obtenerCitaPorId(citaId)
      let detallesFromCita = []
      if (Array.isArray(citaFull.servicios) && citaFull.servicios.length > 0) {
        detallesFromCita = citaFull.servicios.map((servId) => {
          const servicioInfo = servicios.find((s) => s.id === (servId.id || servId))
          return {
            servicio: servId.id || servId,
            cantidad: 1,
            precio_unitario: servicioInfo ? servicioInfo.precio : 0,
            descuento_linea: 0,
            isFromCita: true,
          }
        })
      } else if (citaFull.servicio) {
        const servicioInfo = servicios.find((s) => s.id === (citaFull.servicio.id || citaFull.servicio))
        detallesFromCita = [
          {
            servicio: citaFull.servicio.id || citaFull.servicio,
            cantidad: 1,
            precio_unitario: servicioInfo ? servicioInfo.precio : 0,
            descuento_linea: 0,
            isFromCita: true,
          },
        ]
      }

      setFormData((prev) => ({
        ...prev,
        cita: citaFull.id,
        cliente: prev.cliente || citaFull.cliente || prev.cliente,
        manicurista: prev.manicurista || citaFull.manicurista || prev.manicurista,
        detalles: detallesFromCita.length > 0 ? detallesFromCita : prev.detalles,
      }))
      toast.success(`Cita #${citaFull.id} vinculada`)
    } catch (err) {
      console.error("Error vinculando cita:", err)
      toast.error(err.userMessage || "No se pudo vincular la cita")
    }
  }

  const handleChangeStatusClick = (venta) => {
    setSelectedVenta(venta)
    setNewStatus(venta.estado)
    setNewMetodoPago(venta.metodo_pago || "")
    setStatusChangeObservaciones(venta.observaciones || "")
    setShowChangeStatusModal(true)
  }

  const handleConfirmStatusChange = async () => {
    if (!selectedVenta) return

    setLoading(true)
    try {
      const validation = await ventaServiciosService.validarCambioEstado(selectedVenta, newStatus, newMetodoPago)
      if (!validation.valida) {
        toast.error(validation.error)
        setLoading(false)
        return
      }

      await ventaServiciosService.actualizarEstadoVenta(
        selectedVenta.id,
        newStatus,
        newMetodoPago,
        statusChangeObservaciones,
      )
      toast.success("Estado de venta actualizado exitosamente!")
      setShowChangeStatusModal(false)
      fetchVentas()
    } catch (err) {
      console.error("Error al cambiar estado de venta:", err)
      const errorMessage = err.userMessage || err.response?.data?.message || err.message || "Error desconocido"
      toast.error(`Error al cambiar estado: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const getEstadoColorClass = (estado) => {
    switch (estado) {
      case "pendiente":
        return "status-badge pendiente"
      case "pagada":
        return "status-badge pagada"
      case "cancelada":
        return "status-badge cancelada"
      default:
        return "status-badge"
    }
  }

  const calcularTotalVenta = () => {
    return formData.detalles.reduce((total, detalle) => {
      const precio = Number(detalle.precio_unitario) || 0
      const cantidad = Number(detalle.cantidad) || 0
      const descuento = Number(detalle.descuento_linea) || 0
      return total + (precio * cantidad - descuento)
    }, 0)
  }

  // Subtotal e IVA (19%) para resumen
  const calcularSubtotalVenta = () => {
    return formData.detalles.reduce((total, detalle) => {
      const precio = Number(detalle.precio_unitario) || 0
      const cantidad = Number(detalle.cantidad) || 0
      const descuento = Number(detalle.descuento_linea) || 0
      return total + (precio * cantidad - descuento)
    }, 0)
  }

  const calcularIvaVenta = (subtotal) => {
    const IVA_RATE = 0.19
    return Math.max(0, Math.round(subtotal * IVA_RATE * 100) / 100)
  }

  const calcularComisionManicurista = () => {
    const total = calcularTotalVenta()
    // Asumiendo que el porcentaje de comisión se define en la manicurista o en la venta
    // Por ahora, usaremos un valor fijo o el que venga en formData si existe
    const porcentaje = Number(formData.porcentaje_comision) || 0
    return (total * porcentaje) / 100
  }

  // Agregar/Quitar servicios extra como en "Nueva Cita"
  const toggleExtraService = (servicio) => {
    setFormData((prev) => {
      const idx = prev.detalles.findIndex(
        (d) => !d.isFromCita && Number(d.servicio) === Number(servicio.id),
      )
      const next = [...prev.detalles]
      if (idx >= 0) {
        next.splice(idx, 1)
      } else {
        next.push({
          servicio: servicio.id,
          cantidad: 1,
          precio_unitario: servicio.precio || 0,
          descuento_linea: 0,
        })
      }
      return { ...prev, detalles: next }
    })
  }

  // VISTA PRINCIPAL DE TABLA DE VENTAS
  const renderMainView = () => (
    <div className="admin-content-wrapper">
      <div className="admin-header">
        <h2>Venta de Servicios</h2>
      </div>
      
      <div className="admin-filters">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar ventas por cliente, manicurista, servicio o estado..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
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

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando ventas...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("fecha_venta")}>Fecha {renderSortIndicator("fecha_venta")}</th>
                <th onClick={() => handleSort("cliente_info")}>Cliente {renderSortIndicator("cliente_info")}</th>
                <th onClick={() => handleSort("manicurista_info")}>
                  Manicurista {renderSortIndicator("manicurista_info")}
                </th>
                <th>Servicios</th>
                <th onClick={() => handleSort("total")}>Total {renderSortIndicator("total")}</th>
                <th onClick={() => handleSort("estado")}>Estado {renderSortIndicator("estado")}</th>
                <th>Método Pago</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentPageVentas().length > 0 ? (
                getCurrentPageVentas().map((venta) => (
                  <tr key={venta.id}>
                    <td>
                      <div className="service-info">
                        <div className="service-name">
                          {ventaServiciosService.formatearFecha(venta.fecha_venta)}
                        </div>
                        <div className="service-description">
                          {ventaServiciosService.formatearHora(venta.hora_para_mostrar)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="service-info">
                        <div className="service-name">{venta.cliente_info?.nombre}</div>
                        <div className="service-description">{venta.cliente_info?.documento}</div>
                      </div>
                    </td>
                    <td>{venta.manicurista_info?.nombres}</td>
                    <td>
                      {(() => {
                        console.log("🔍 Venta en tabla:", venta.id, venta.detalles, venta.servicio_info, venta.servicio_nombre)
                        
                        // Intentar mostrar servicios desde detalles
                        if (venta.detalles && venta.detalles.length > 0) {
                          return (
                            <ul>
                              {venta.detalles.map((detalle, idx) => {
                                // Buscar el servicio en la lista de servicios disponibles
                                const servicio = servicios.find(s => Number(s.id) === Number(detalle.servicio))
                                console.log("🔍 Detalle:", detalle, "Servicio encontrado:", servicio)
                                return (
                                  <li key={idx}>
                                    {servicio?.nombre || detalle.servicio_info?.nombre || `Servicio #${detalle.servicio}`} (x{detalle.cantidad})
                                  </li>
                                )
                              })}
                            </ul>
                          )
                        }
                        
                        // Fallback: intentar desde servicio_info
                        if (venta.servicio_info?.nombre) {
                          return venta.servicio_info.nombre
                        }
                        
                        // Fallback: intentar desde servicio_nombre
                        if (venta.servicio_nombre) {
                          return venta.servicio_nombre
                        }
                        
                        // Último fallback
                        return "Sin servicios"
                      })()}
                    </td>
                    <td>{ventaServiciosService.formatearDinero(venta.total)}</td>
                    <td>
                      <span className={getEstadoColorClass(venta.estado)}>
                        {ventaServiciosService.obtenerTextoEstado(venta.estado)}
                      </span>
                    </td>
                    <td>{ventaServiciosService.obtenerTextoMetodoPago(venta.metodo_pago)}</td>
                    <td>
                      <div className="action-buttons">
                        <PermissionButton
                          modulo="venta_servicios"
                          accion="ver_detalles"
                          className="action-button view"
                          onClick={() => handleViewDetails(venta)}
                          title="Ver detalles"
                          hidden={true}
                        >
                          <FaEye />
                        </PermissionButton>
                        {venta.estado === "pendiente" && (
                          <PermissionButton
                            modulo="venta_servicios"
                            accion="editar"
                            className="action-button edit"
                            onClick={() => handleEditVenta(venta)}
                            title="Editar venta"
                            hidden={true}
                          >
                            <FaEdit />
                          </PermissionButton>
                        )}
                        {venta.estado === "pendiente" && (
                          <PermissionButton
                            modulo="venta_servicios"
                            accion="editar"
                            className="action-button success"
                            onClick={() => handleChangeStatusClick(venta)}
                            title="Cambiar estado"
                            hidden={true}
                          >
                            <FaCheck />
                          </PermissionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">
                    No se encontraron ventas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
    </div>
  )


  // VISTA DE FORMULARIO (CREAR/EDITAR)
  const renderFormView = () => (
    <div className="ventas-module">
      <div className="ventas-admin-container">
        <div className="ventas-form-header">
          <div className="ventas-form-header-left">
            <button className="ventas-admin-button secondary" onClick={() => setCurrentView("list")}>
              <FaArrowLeft /> Volver
            </button>
          </div>
          <h1 className="ventas-form-title">{currentView === "create" ? "Nueva Venta" : "Editar Venta"}</h1>
          <div className="ventas-form-header-right">
            <button className="ventas-admin-button primary" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <div className="ventas-spinner-small"></div>
                  {currentView === "create" ? "Creando..." : "Actualizando..."}
                </>
              ) : (
                <>
                  <FaSave /> {currentView === "create" ? "Crear Venta" : "Actualizar Venta"}
                </>
              )}
            </button>
          </div>
        </div>

        {generalError && <div className="ventas-general-error">{generalError}</div>}

        <div className="ventas-form-content-compact">
          {/* Cuadro 1: Información General */}
          <div className="ventas-form-section-compact">
            <h3>
              <FaMoneyBillWave className="ventas-form-icon" /> Información General
            </h3>
            <div className="ventas-form-group">
              <label className="ventas-form-label">Cliente:</label>
              {currentView === "create" ? (
                <div className="cliente-search-section">
                  <FaSearch className="cliente-search-icon" />
                  <input
                    type="text"
                    value={busquedaCliente}
                    onChange={(e) => {
                      setBusquedaCliente(e.target.value)
                      setFormData((prev) => ({ ...prev, cliente: "" }))
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
                    <div className="cliente-results-dropdown">
                      {clientes.length > 0 ? (
                        clientes.map((cliente) => (
                          <div key={cliente.id} className="cliente-item" onClick={() => seleccionarCliente(cliente)}>
                            <div className="cliente-item-nombre">{cliente.nombre}</div>
                            <div className="cliente-item-info">
                              <span>📄 {cliente.documento}</span> | <span>📞 {cliente.celular}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-cliente-results">No se encontraron clientes</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={busquedaCliente || selectedVenta?.cliente_info?.nombre || "Cliente no encontrado"}
                  className="ventas-form-control"
                  disabled
                />
              )}
              {formErrors.cliente && <div className="ventas-error-text">{formErrors.cliente}</div>}
            </div>

            <div className="ventas-form-group">
              <label className="ventas-form-label">Cédula Cliente:</label>
              <input
                type="text"
                value={
                  currentView === "create"
                    ? clientes.find((c) => c.id === formData.cliente)?.documento || ""
                    : selectedVenta?.cliente_info?.documento || ""
                }
                className="ventas-form-control"
                disabled
              />
            </div>

            <div className="ventas-form-group">
              <label className="ventas-form-label">Manicurista:</label>
              <select
                name="manicurista"
                value={formData.manicurista}
                onChange={handleInputChange}
                className={`ventas-form-control ${formErrors.manicurista ? "error" : ""}`}
                disabled={currentView === "edit"} // Deshabilitar en edición
              >
                <option value="">Seleccione una manicurista</option>
                {manicuristas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombres} {m.apellidos}
                  </option>
                ))}
              </select>
              {formErrors.manicurista && <div className="ventas-error-text">{formErrors.manicurista}</div>}
            </div>

            <div className="ventas-form-group">
              <label className="ventas-form-label">Fecha de Venta:</label>
              <input
                type="date"
                name="fecha_venta"
                value={formData.fecha_venta}
                onChange={handleInputChange}
                className="ventas-form-control"
                disabled={currentView === "edit"} // Deshabilitar en edición
              />
            </div>
          </div>

          {/* Cuadro 2: Estado y Método de Pago */}
          <div className="ventas-form-section-compact">
            <h3>
              <FaEdit className="ventas-form-icon" /> Estado y Pago
            </h3>
            <div className="ventas-form-group">
              <label className="ventas-form-label">Estado:</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleInputChange}
                className="ventas-form-control"
                disabled={currentView === "edit"} // Deshabilitar en edición, se cambia con el modal
              >
                <option value="pendiente">Pendiente</option>
                <option value="pagada">Pagada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            <div className="ventas-form-group">
              <label className="ventas-form-label">Método de Pago:</label>
              <select
                name="metodo_pago"
                value={formData.metodo_pago}
                onChange={handleInputChange}
                className="ventas-form-control"
                disabled={currentView === "edit"} // Deshabilitar en edición, se cambia con el modal
              >
                {metodosPago.map((mp) => (
                  <option key={mp.value} value={mp.value}>
                    {mp.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Se elimina el campo Porcentaje Comisión Manicurista (%) de la interfaz */}
          </div>

          {/* Cuadro 3: Detalles de Servicios */}
          <div className="ventas-form-section-compact" style={{ gridColumn: "1 / -1" }}>
            <h3>
              <FaServicestack className="ventas-form-icon" /> Detalles de Servicios
            </h3>
            
            {/* Vincular cita (opcional) - solo en modo crear */}
            {currentView === "create" && (
              <div className="ventas-form-group">
                <label className="ventas-form-label">Vincular Cita (ID):</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="number"
                    value={citaIdInput}
                    onChange={(e) => setCitaIdInput(e.target.value)}
                    className="ventas-form-control"
                    placeholder="Ingrese ID de cita"
                    min="1"
                  />
                  <button type="button" className="ventas-admin-button secondary" onClick={vincularCitaPorId}>
                    <FaCalendarAlt /> Vincular
                  </button>
                </div>
              </div>
            )}

            {/* Servicios relacionados a la cita (tabla como en crear citas) */}
            <div className="ventas-form-group">
              <label className="ventas-form-label">Servicios de la cita:</label>
              {(() => {
                const citaDetalles = formData.detalles.filter((d) => d.isFromCita)
                console.log("🔍 Detalles de cita filtrados:", citaDetalles)
                console.log("🔍 Todos los detalles:", formData.detalles)
                if (citaDetalles.length === 0) {
                  return <span style={{ color: "#6c757d" }}>Sin servicios aún</span>
                }
                return (
                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Servicio</th>
                          <th>Manicurista</th>
                          <th>Precio</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {citaDetalles.map((d, i) => {
                          const serv = servicios.find((s) => Number(s.id) === Number(d.servicio))
                          const subtotal = (Number(d.cantidad) || 0) * (Number(d.precio_unitario) || 0)
                          return (
                            <tr key={`${d.servicio}-${i}`}>
                              <td>{serv?.nombre || `Servicio #${d.servicio}`}</td>
                              <td>{selectedVenta?.manicurista_info?.nombres || "N/A"}</td>
                              <td>{ventaServiciosService.formatearDinero(d.precio_unitario)}</td>
                              <td>{ventaServiciosService.formatearDinero(subtotal)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>

            {/* Agregar servicios - solo en modo edición */}
            {currentView === "edit" && (
              <div className="ventas-form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <label className="ventas-form-label">Agregar Servicios:</label>
                  <button
                    type="button"
                    className="ventas-admin-button primary"
                    onClick={() => setShowAddServiceModal(true)}
                  >
                    <FaPlus /> Agregar Servicio
                  </button>
                </div>
              </div>
            )}

            {/* Agregar otro servicio: solo si la cita tiene exactamente 1 servicio */}
            {(() => {
              const citaCount = formData.detalles.filter((d) => d.isFromCita).length
              if (citaCount === 1) {
                return (
                  <div className="ventas-form-group">
                    <label className="ventas-form-label">Agregar otro servicio:</label>
                    <div className="citas-module-servicios-grid-compact">
                      {servicios.map((s) => {
                        const isSelected = formData.detalles.some(
                          (d) => !d.isFromCita && Number(d.servicio) === Number(s.id),
                        )
                        return (
                          <div
                            key={s.id}
                            className={`citas-module-servicio-card-compact ${isSelected ? "selected" : ""}`}
                            onClick={() => toggleExtraService(s)}
                          >
                            <div className="citas-module-servicio-nombre-compact">{s.nombre}</div>
                            <div className="citas-module-servicio-precio-compact">
                              {ventaServiciosService.formatearDinero(s.precio)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }
              return null
            })(            )}

            {/* Tabla de servicios agregados - solo en modo edición */}
            {currentView === "edit" && formData.detalles.filter((d) => !d.isFromCita).length > 0 && (
              <div className="ventas-form-group">
                <label className="ventas-form-label">Servicios Agregados:</label>
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th>Manicurista</th>
                        <th>Precio</th>
                        <th>Subtotal</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.detalles
                        .filter((d) => !d.isFromCita)
                        .map((detalle, index) => {
                          const servicio = servicios.find((s) => Number(s.id) === Number(detalle.servicio))
                          const subtotal = (Number(detalle.cantidad) || 0) * (Number(detalle.precio_unitario) || 0)
                          return (
                            <tr key={index}>
                              <td>{servicio?.nombre || `Servicio #${detalle.servicio}`}</td>
                              <td>{selectedVenta?.manicurista_info?.nombres || "N/A"}</td>
                              <td>{ventaServiciosService.formatearDinero(detalle.precio_unitario)}</td>
                              <td>{ventaServiciosService.formatearDinero(subtotal)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="ventas-admin-button danger"
                                  onClick={() => handleRemoveDetalle(index)}
                                >
                                  <FaTimes />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Observaciones y Resumen */}
          <div className="ventas-form-section-compact" style={{ gridColumn: "1 / -1" }}>
            <h3>
              <FaStickyNote className="ventas-form-icon" /> Observaciones
            </h3>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleInputChange}
              placeholder="Observaciones adicionales..."
              className="ventas-form-textarea"
              rows="3"
            />

            <div className="resumen-venta-compact">
              <h4>Resumen de Venta</h4>
              <div className="resumen-items">
                {formData.detalles.map((detalle, index) => {
                  const servicio = servicios.find((s) => s.id === Number(detalle.servicio))
                  const subtotalDetalle =
                    (Number(detalle.precio_unitario) || 0) * (Number(detalle.cantidad) || 0) -
                    (Number(detalle.descuento_linea) || 0)
                  return (
                    <div key={index} className="resumen-item">
                      <span>
                        {servicio?.nombre} (x{detalle.cantidad})
                      </span>
                      <span>{ventaServiciosService.formatearDinero(subtotalDetalle)}</span>
                    </div>
                  )
                })}
              </div>
              {(() => {
                const subtotal = calcularSubtotalVenta()
                const iva = calcularIvaVenta(subtotal)
                const total = subtotal + iva
                return (
                  <>
                    <div className="resumen-total" style={{ borderTop: "none", paddingTop: 0 }}>
                      <span>Subtotal:</span>
                      <span>{ventaServiciosService.formatearDinero(subtotal)}</span>
                    </div>
                    <div className="resumen-total" style={{ borderTop: "none", paddingTop: 0 }}>
                      <span>IVA (19%):</span>
                      <span>{ventaServiciosService.formatearDinero(iva)}</span>
                    </div>
                    <div className="resumen-total">
                      <span>Total:</span>
                      <span>{ventaServiciosService.formatearDinero(total)}</span>
                    </div>
                    <div className="resumen-total" style={{ borderTop: "none", paddingTop: "5px" }}>
                      <span>Comisión Manicurista:</span>
                      <span>{ventaServiciosService.formatearDinero(calcularComisionManicurista())}</span>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // VISTA DE DETALLE
  const renderDetailView = () => (
    <div className="ventas-module">
      <div className="ventas-admin-container">
        <div className="ventas-form-header">
          <div className="ventas-form-header-left">
            <button className="ventas-admin-button secondary" onClick={() => setCurrentView("list")}>
              <FaArrowLeft /> Volver
            </button>
          </div>
          <h1 className="ventas-form-title">Detalle de Venta #{selectedVenta?.id}</h1>
          <div className="ventas-form-header-right"></div>
        </div>

        <div className="ventas-form-content-compact">
          {/* Cuadro 1: Información General */}
          <div className="ventas-form-section-compact">
            <h3>
              <FaMoneyBillWave className="ventas-form-icon" /> Información General
            </h3>
            <div className="ventas-detail-info-grid">
              <div className="ventas-detail-info-row">
                <span className="ventas-detail-label">Cliente:</span>
                <span className="ventas-detail-value">{selectedVenta?.cliente_info?.nombre}</span>
              </div>
              <div className="ventas-detail-info-row">
                <span className="ventas-detail-label">Documento:</span>
                <span className="ventas-detail-value">{selectedVenta?.cliente_info?.documento}</span>
              </div>
              <div className="ventas-detail-info-row">
                <span className="ventas-detail-label">Manicurista:</span>
                <span className="ventas-detail-value">{selectedVenta?.manicurista_info?.nombres}</span>
              </div>
              <div className="ventas-detail-info-row">
                <span className="ventas-detail-label">Fecha Venta:</span>
                <span className="ventas-detail-value">
                  {ventaServiciosService.formatearFecha(selectedVenta?.fecha_venta)}
                </span>
              </div>
              <div className="ventas-detail-info-row">
                <span className="ventas-detail-label">Estado:</span>
                <span className={getEstadoColorClass(selectedVenta?.estado)}>
                  {ventaServiciosService.obtenerTextoEstado(selectedVenta?.estado)}
                </span>
              </div>
              <div className="ventas-detail-info-row">
                <span className="ventas-detail-label">Método Pago:</span>
                <span className="ventas-detail-value">
                  {ventaServiciosService.obtenerTextoMetodoPago(selectedVenta?.metodo_pago)}
                </span>
              </div>
              {selectedVenta?.fecha_pago && (
                <div className="ventas-detail-info-row">
                  <span className="ventas-detail-label">Fecha Pago:</span>
                  <span className="ventas-detail-value">
                    {ventaServiciosService.formatearFecha(selectedVenta?.fecha_pago)}
                  </span>
                </div>
              )}
              <div className="ventas-detail-info-row">
                <span className="ventas-detail-label">Comisión Manicurista:</span>
                <span className="ventas-detail-value">
                  {ventaServiciosService.formatearDinero(selectedVenta?.comision_manicurista)} (
                  {selectedVenta?.porcentaje_comision}%)
                </span>
              </div>
            </div>
          </div>

          {/* Cuadro 2: Detalles de Servicios */}
          <div className="ventas-form-section-compact">
            <h3>
              <FaServicestack className="ventas-form-icon" /> Detalles de Servicios
            </h3>
            <div className="servicios-detalle-grid">
              {selectedVenta?.detalles && selectedVenta.detalles.length > 0 ? (
                selectedVenta.detalles.map((detalle, index) => (
                  <div key={index} className="servicio-detalle-card">
                    <div className="servicio-detalle-nombre">{detalle.servicio_info?.nombre}</div>
                    <div className="servicio-detalle-precio">
                      {ventaServiciosService.formatearDinero(detalle.precio_unitario)} x {detalle.cantidad}
                    </div>
                    {detalle.descuento_linea > 0 && (
                      <div className="servicio-detalle-duracion">
                        Desc: {ventaServiciosService.formatearDinero(detalle.descuento_linea)}
                      </div>
                    )}
                    <div className="servicio-detalle-duracion">
                      Subtotal: {ventaServiciosService.formatearDinero(detalle.subtotal)}
                    </div>
                  </div>
                ))
              ) : (
                <p>No hay detalles de servicios.</p>
              )}
            </div>
            <div className="total-detalle-section">
              <div className="total-detalle-row">
                <span className="total-detalle-label">Total Venta:</span>
                <span className="total-detalle-value">
                  {ventaServiciosService.formatearDinero(selectedVenta?.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Cuadro 3: Observaciones */}
          {selectedVenta?.observaciones && (
            <div className="ventas-form-section-compact" style={{ gridColumn: "1 / -1" }}>
              <h3>
                <FaStickyNote className="ventas-form-icon" /> Observaciones
              </h3>
              <div className="ventas-observaciones-content">
                <p>{selectedVenta.observaciones}</p>
              </div>
            </div>
          )}

          {/* Citas Asociadas (Opcional, si hay) */}
          {selectedVenta?.citas_info && selectedVenta.citas_info.length > 0 && (
            <div className="ventas-form-section-compact" style={{ gridColumn: "1 / -1" }}>
              <h3>
                <FaCalendarAlt className="ventas-form-icon" /> Citas Asociadas
              </h3>
              <div className="servicios-detalle-grid">
                {selectedVenta.citas_info.map((cita, index) => (
                  <div key={index} className="servicio-detalle-card">
                    <div className="servicio-detalle-nombre">Cita #{cita.id}</div>
                    <div className="servicio-detalle-precio">
                      {ventaServiciosService.formatearFecha(cita.fecha_cita)} - {cita.hora_cita}
                    </div>
                    <div className="servicio-detalle-duracion">
                      {cita.cliente_nombre} ({cita.manicurista_nombre})
                    </div>
                    <div className="servicio-detalle-duracion">Estado: {cita.estado}</div>
                  </div>
                ))}
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
      {currentView === "list" && renderMainView()}
      {(currentView === "create" || currentView === "edit") && renderFormView()}
      {currentView === "detail" && renderDetailView()}

      {/* Modal para agregar servicios - UI igual al de Citas */}
      {showAddServiceModal && (
        <div className="citas-module-modal-overlay" onClick={() => setShowAddServiceModal(false)}>
          <div className="citas-module-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="citas-module-modal-header">
              <h3>
                <FaServicestack className="citas-module-modal-icon" /> Agregar Servicio
              </h3>
              <button className="citas-module-modal-close" onClick={() => setShowAddServiceModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="citas-module-modal-body">
              <div className="citas-module-servicios-grid-compact">
                {servicios.map((s) => {
                  const isSelected = formData.detalles.some(
                    (d) => !d.isFromCita && Number(d.servicio) === Number(s.id),
                  )
                  return (
                    <div
                      key={s.id}
                      className={`citas-module-servicio-card-compact ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        if (!isSelected) {
                          // Agregar servicio a la venta
                          const nuevoDetalle = {
                            servicio: Number(s.id),
                            cantidad: 1,
                            precio_unitario: s.precio,
                            descuento_linea: 0,
                            isFromCita: false
                          }
                          setFormData(prev => ({
                            ...prev,
                            detalles: [...prev.detalles, nuevoDetalle]
                          }))
                          setShowAddServiceModal(false)
                        }
                      }}
                    >
                      <div className="citas-module-servicio-nombre-compact">{s.nombre}</div>
                      <div className="citas-module-servicio-precio-compact">
                        {ventaServiciosService.formatearDinero(s.precio)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cambiar estado */}
      {showChangeStatusModal && selectedVenta && (
        <div className="citas-module-modal-overlay" onClick={() => setShowChangeStatusModal(false)}>
          <div className="citas-module-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="citas-module-modal-header ventas-rosa-header">
              <h3>
                <FaEdit className="citas-module-modal-icon" /> Cambiar Estado de Venta #{selectedVenta.id}
              </h3>
              <button className="citas-module-modal-close" onClick={() => setShowChangeStatusModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="citas-module-modal-body">
              <div className="status-change-info">
                <div className="venta-info">
                  <div className="user-icon">
                    <FaUser />
                  </div>
                  <div>
                    <h3>{selectedVenta.cliente_info?.nombre}</h3>
                    <p>
                      {ventaServiciosService.formatearFecha(selectedVenta.fecha_venta)} -{" "}
                      {ventaServiciosService.formatearHora(selectedVenta.hora_para_mostrar)}
                    </p>
                  </div>
                </div>
                <div className="status-change-arrow">→</div>
                <div className="new-status">
                  <span className={`status-current ${getEstadoColorClass(selectedVenta.estado)}`}>
                    {ventaServiciosService.obtenerTextoEstado(selectedVenta.estado)}
                  </span>
                  <span className={`status-new ${getEstadoColorClass(newStatus)}`}>
                    {ventaServiciosService.obtenerTextoEstado(newStatus)}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="ventas-form-label">Nuevo Estado:</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="form-control">
                  <option value="pendiente" disabled={selectedVenta.estado !== "pendiente"}>
                    Pendiente
                  </option>
                  <option value="pagada" disabled={selectedVenta.estado !== "pendiente"}>
                    Pagada
                  </option>
                  <option value="cancelada" disabled={selectedVenta.estado !== "pendiente"}>
                    Cancelada
                  </option>
                </select>
              </div>

              {newStatus === "pagada" && (
                <div className="metodo-pago-section">
                  <label className="ventas-form-label">Método de Pago:</label>
                  <select
                    value={newMetodoPago}
                    onChange={(e) => setNewMetodoPago(e.target.value)}
                    className="form-control"
                  >
                    <option value="">Seleccione método de pago</option>
                    {metodosPago.map((mp) => (
                      <option key={mp.value} value={mp.value}>
                        {mp.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="ventas-form-label">Observaciones:</label>
                <textarea
                  value={statusChangeObservaciones}
                  onChange={(e) => setStatusChangeObservaciones(e.target.value)}
                  className="form-control"
                  rows="3"
                />
              </div>
            </div>
            <div className="citas-module-modal-footer">
              <button className="citas-module-admin-button secondary" onClick={() => setShowChangeStatusModal(false)}>
                Cancelar
              </button>
              <button
                className="citas-module-admin-button primary"
                onClick={handleConfirmStatusChange}
                disabled={loading || (newStatus === "pagada" && !newMetodoPago)}
              >
                {loading ? (
                  <>
                    <div className="citas-module-spinner-small"></div>
                    Guardando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default VentaServicios
