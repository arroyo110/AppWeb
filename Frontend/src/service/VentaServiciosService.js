import axios from "axios"
import apiClient, { apiConfig } from "./apiConfig"

// URL base para el endpoint de venta servicios
const API_BASE_URL = `${(apiConfig?.baseURL || "https://appweb-rxph.onrender.com/api/")}venta-servicios/`

// Configurar interceptores para manejo de errores
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Error en API de Ventas:", error)

    // Crear mensaje de error más amigable
    if (error.response) {
      const { status, data } = error.response
      let userMessage = "Ocurrió un error inesperado"

      if (status === 400) {
        if (typeof data === "string") {
          userMessage = data
        } else if (data.error) {
          userMessage = data.error
        } else if (data.detail) {
          userMessage = data.detail
        } else if (typeof data === "object") {
          // Extraer mensajes de validación
          const errorMessages = []
          Object.entries(data).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(", ")}`)
            } else {
              errorMessages.push(`${field}: ${messages}`)
            }
          })
          userMessage = errorMessages.join("\n")
        }
      } else if (status === 404) {
        userMessage = "Recurso no encontrado"
      } else if (status === 500) {
        userMessage = "Error interno del servidor"
      }

      error.userMessage = userMessage
    }

    return Promise.reject(error)
  },
)

// Función para extraer datos de respuesta
const extractDataFromResponse = (res) => {
  if (!res.data) return []

  if (Array.isArray(res.data)) return res.data

  // Si es un objeto, buscamos propiedades comunes que contengan la lista
  if (typeof res.data === "object") {
    if (Array.isArray(res.data.results)) return res.data.results
    if (Array.isArray(res.data.data)) return res.data.data
    if (Array.isArray(res.data.ventas)) return res.data.ventas
    if (Array.isArray(res.data.items)) return res.data.items

    // Buscar un array en las propiedades
    const keys = Object.keys(res.data)
    for (const key of keys) {
      if (Array.isArray(res.data[key])) return res.data[key]
    }

    // Convertir a array si es un objeto
    if (Object.keys(res.data).length > 0 && !("count" in res.data) && !("next" in res.data)) {
      return Object.values(res.data)
    }
  }

  return []
}

class VentaServiciosService {
  // Obtener todas las ventas con filtros opcionales
  async obtenerVentas(filtros = {}) {
    try {
      const params = {}

      if (filtros.estado) params.estado = filtros.estado
      if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde
      if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta
      if (filtros.manicurista) params.manicurista = filtros.manicurista
      if (filtros.cliente) params.cliente = filtros.cliente
      if (filtros.metodo_pago) params.metodo_pago = filtros.metodo_pago

      const response = await axios.get(API_BASE_URL, { params })
      console.log("Respuesta obtenerVentas:", response)
      return extractDataFromResponse(response)
    } catch (error) {
      console.error("Error al obtener ventas:", error)
      throw error
    }
  }

  // Obtener una venta específica por ID
  async obtenerVenta(id) {
    try {
      const response = await axios.get(`${API_BASE_URL}${id}/`)
      console.log(`Respuesta obtenerVenta(${id}):`, response)
      return response.data
    } catch (error) {
      console.error("Error al obtener venta:", error)
      throw error
    }
  }

  // FUNCIÓN CORREGIDA PARA CREAR VENTA CON MEJOR MANEJO DE CITAS FINALIZADAS
  async crearVenta(dataVenta) {
    try {
      console.log("📦 Datos que se envían al crear venta:", dataVenta)

      // Validar y limpiar datos antes de enviar
      const datosLimpios = {
        cliente: Number(dataVenta.cliente),
        manicurista: Number(dataVenta.manicurista),
        cita: dataVenta.cita ? Number(dataVenta.cita) : null,
        fecha_venta: dataVenta.fecha_venta || new Date().toISOString().split("T")[0],
        estado: dataVenta.estado || "pendiente",
        metodo_pago: dataVenta.metodo_pago || "efectivo", // Método de pago por defecto
        observaciones: dataVenta.observaciones || "",
        porcentaje_comision: Number(dataVenta.porcentaje_comision) || 0,
        detalles: Array.isArray(dataVenta.detalles)
          ? dataVenta.detalles
              .filter((d) => d && d.servicio)
              .map((d) => ({
                servicio: Number(d.servicio),
                cantidad: Number(d.cantidad) || 1,
                precio_unitario: Number(d.precio_unitario) || 0,
                descuento_linea: Number(d.descuento_linea) || 0,
              }))
          : []
      }

      // Calcular total desde los detalles para evitar desajustes
      const totalCalculado = datosLimpios.detalles.reduce((acc, d) => acc + (Number(d.precio_unitario) * Number(d.cantidad) - Number(d.descuento_linea || 0)), 0)
      datosLimpios.total = Number(totalCalculado.toFixed(2))

      // Validar campos requeridos
      const requiredFields = ["cliente", "manicurista", "detalles"]
      const missingFields = requiredFields.filter((field) => {
        if (field === "detalles") {
          return !datosLimpios.detalles || datosLimpios.detalles.length === 0
        }
        return !datosLimpios[field]
      })

      if (missingFields.length > 0) {
        console.warn(`Campos requeridos faltantes: ${missingFields.join(", ")}`)
        throw new Error(`Campos requeridos faltantes: ${missingFields.join(", ")}`)
      }

      // Validar método de pago
      const metodosPermitidos = ["efectivo", "transferencia"]
      if (datosLimpios.metodo_pago && !metodosPermitidos.includes(datosLimpios.metodo_pago)) {
        console.warn(`Método de pago no válido: ${datosLimpios.metodo_pago}. Usando 'efectivo' por defecto.`)
        datosLimpios.metodo_pago = "efectivo"
      }

      console.log("📦 Datos limpios para enviar:", datosLimpios)

      const response = await axios.post(API_BASE_URL, datosLimpios, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      console.log("✅ Venta creada:", response.data)
      return response.data
    } catch (error) {
      console.error("❌ Error al crear venta:", error)

      // Mejorar el mensaje de error
      if (error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === "object") {
          const errorMessages = []
          Object.entries(errorData).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              const parts = messages.map((m) => (typeof m === 'object' ? JSON.stringify(m) : String(m)))
              errorMessages.push(`${field}: ${parts.join(", ")}`)
            } else if (typeof messages === 'object') {
              errorMessages.push(`${field}: ${JSON.stringify(messages)}`)
            } else {
              errorMessages.push(`${field}: ${messages}`)
            }
          })
          error.userMessage = errorMessages.join("; ")
        }
      }

      throw error
    }
  }

  // Actualizar venta existente con múltiples citas y detalles
  async actualizarVenta(id, dataVenta) {
    try {
      console.log("📦 Datos que se envían al actualizar venta:", dataVenta)

      // Limpiar y mapear detalles para asegurar que los IDs se envíen si existen
      const datosLimpios = {
        ...dataVenta,
        detalles: Array.isArray(dataVenta.detalles)
          ? dataVenta.detalles
              .filter((d) => d && d.servicio)
              .map((d) => ({
                ...(d.id && { id: d.id }), // Incluir ID si existe (para detalles existentes)
                servicio: Number(d.servicio),
                cantidad: Number(d.cantidad) || 1,
                precio_unitario: Number(d.precio_unitario) || 0,
                descuento_linea: Number(d.descuento_linea) || 0,
              }))
          : [],
      }

      // Calcular total coherente
      const totalCalculado = datosLimpios.detalles.reduce((acc, d) => acc + (Number(d.precio_unitario) * Number(d.cantidad) - Number(d.descuento_linea || 0)), 0)
      datosLimpios.total = Number(totalCalculado.toFixed(2))

      const response = await axios.put(`${API_BASE_URL}${id}/`, datosLimpios, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      console.log("✅ Venta actualizada:", response.data)
      return response.data
    } catch (error) {
      console.error("❌ Error al actualizar venta:", error)
      if (error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'object') {
          const errorMessages = []
          Object.entries(errorData).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              const parts = messages.map((m) => (typeof m === 'object' ? JSON.stringify(m) : String(m)))
              errorMessages.push(`${field}: ${parts.join(", ")}`)
            } else if (typeof messages === 'object') {
              errorMessages.push(`${field}: ${JSON.stringify(messages)}`)
            } else {
              errorMessages.push(`${field}: ${messages}`)
            }
          })
          error.userMessage = errorMessages.join('; ')
        }
      }
      throw error
    }
  }

  // MEJORADO: Actualizar estado de venta como en citas
  async actualizarEstadoVenta(id, estado, metodoPago = "", observaciones = "") {
    try {
      console.log(`📦 Actualizando estado de venta ${id} a ${estado}`)

      // Validar que si se marca como pagada, debe tener método de pago
      if (estado === "pagada" && !metodoPago) {
        throw new Error("Debe seleccionar un método de pago para marcar como pagada")
      }

      // Validar métodos de pago permitidos
      const metodosPermitidos = ["efectivo", "transferencia"]
      if (metodoPago && !metodosPermitidos.includes(metodoPago)) {
        throw new Error("Método de pago no válido. Solo se permite efectivo o transferencia")
      }

      const response = await axios.patch(
        `${API_BASE_URL}${id}/actualizar_estado/`,
        {
          estado,
          metodo_pago: metodoPago,
          observaciones,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
      console.log("✅ Estado de venta actualizado exitosamente:", response.data)
      return response.data
    } catch (error) {
      console.error("❌ Error al actualizar estado:", error)
      throw error
    }
  }

  // NUEVO: Validar venta antes de cambiar estado
  async validarCambioEstado(venta, nuevoEstado, metodoPago = "") {
    try {
      // Validar transiciones válidas
      const transicionesValidas = {
        pendiente: ["pagada", "cancelada"],
        pagada: [],
        cancelada: [],
      }

      if (!transicionesValidas[venta.estado]?.includes(nuevoEstado)) {
        throw new Error(`No se puede cambiar de '${venta.estado}' a '${nuevoEstado}'`)
      }

      // Si se marca como pagada, validar método de pago
      if (nuevoEstado === "pagada") {
        if (!metodoPago) {
          throw new Error("Debe seleccionar un método de pago")
        }

        const metodosPermitidos = ["efectivo", "transferencia"]
        if (!metodosPermitidos.includes(metodoPago)) {
          // Corregido: usar metodoPago, no metodosPermitidos
          throw new Error("Método de pago no válido")
        }
      }

      return { valida: true }
    } catch (error) {
      return { valida: false, error: error.message }
    }
  }

  // NUEVO: Obtener métodos de pago disponibles
  async obtenerMetodosPagoDisponibles() {
    try {
      const response = await axios.get(`${API_BASE_URL}metodos_pago_disponibles/`)
      return response.data.metodos
    } catch (error) {
      console.error("Error al obtener métodos de pago:", error)
      // Fallback a los métodos permitidos
      return [
        { value: "efectivo", label: "Efectivo" },
        { value: "transferencia", label: "Transferencia" },
      ]
    }
  }

  // Formatear fecha para la API (YYYY-MM-DD)
  formatearFecha(fecha) {
    if (!fecha) return ""
    const date = new Date(fecha)
    return date.toISOString().split("T")[0]
  }

  // MEJORADO: Formatear fecha y hora por separado
  formatearFechaHora(fechaHora) {
    if (!fechaHora) return { fecha: "", hora: "" }

    const date = new Date(fechaHora)
    return {
      fecha: date.toISOString().split("T")[0],
      hora: date.toTimeString().split(" ")[0].substring(0, 5), // HH:MM
    }
  }

  // Formatear dinero para mostrar
  formatearDinero(cantidad) {
    if (!cantidad) return "$0"
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cantidad)
  }

  // Obtener color del badge según el estado
  obtenerColorEstado(estado) {
    const colores = {
      pendiente: "warning",
      pagada: "success",
      cancelada: "danger",
    }
    return colores[estado] || "secondary"
  }

  // Obtener texto del estado en español
  obtenerTextoEstado(estado) {
    const textos = {
      pendiente: "Pendiente",
      pagada: "Pagada",
      cancelada: "Cancelada",
    }
    return textos[estado] || estado
  }

  // MEJORADO: Solo métodos permitidos
  obtenerTextoMetodoPago(metodo) {
    const textos = {
      efectivo: "Efectivo",
      transferencia: "Transferencia",
    }
    return textos[metodo] || metodo
  }

  // Calcular subtotal
  calcularSubtotal(precioUnitario, cantidad) {
    return (precioUnitario || 0) * (cantidad || 1)
  }

  // Calcular total con descuento
  calcularTotal(precioUnitario, cantidad, descuento) {
    const subtotal = this.calcularSubtotal(precioUnitario, cantidad)
    return subtotal - (descuento || 0)
  }

  // NUEVO: Utilidades para fechas como en citas
  formatearFechaCompleta(fecha) {
    if (!fecha) return ""
    return new Date(fecha).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    })
  }

  formatearHora(hora) {
    if (!hora) return ""
    const [hours, minutes] = hora.split(":")
    const h = Number.parseInt(hours)
    const ampm = h >= 12 ? "PM" : "AM"
    const hour12 = h % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  // NUEVO: Obtener estadísticas de ventas para el dashboard
  async obtenerEstadisticas(filtros = {}) {
    try {
      console.log("📊 Obteniendo estadísticas de ventas...")
      
      // Obtener todas las ventas
      const todasLasVentas = await this.obtenerVentas(filtros)
      
      const hoy = new Date().toISOString().split("T")[0]
      const inicioMes = new Date()
      inicioMes.setDate(1)
      const inicioMesStr = inicioMes.toISOString().split("T")[0]
      
      // Calcular estadísticas
      const ventasPagadas = todasLasVentas.filter(v => v.estado === "pagada")
      const ventasPendientes = todasLasVentas.filter(v => v.estado === "pendiente")
      const ventasCanceladas = todasLasVentas.filter(v => v.estado === "cancelada")
      
      // Ingresos de hoy (solo pagadas)
      const ingresosHoy = ventasPagadas
        .filter(v => {
          const fechaComparar = v.fecha_pago || v.fecha_venta
          return fechaComparar && fechaComparar.startsWith(hoy)
        })
        .reduce((sum, v) => sum + (Number.parseFloat(v.total) || 0), 0)
      
      // Ingresos del mes (solo pagadas)
      const ingresosMes = ventasPagadas
        .filter(v => {
          const fechaComparar = v.fecha_pago || v.fecha_venta
          return fechaComparar && fechaComparar >= inicioMesStr
        })
        .reduce((sum, v) => sum + (Number.parseFloat(v.total) || 0), 0)
      
      // Ventas de hoy (todas)
      const ventasHoy = todasLasVentas.filter(v => v.fecha_venta && v.fecha_venta.startsWith(hoy)).length
      
      // Ventas del mes (todas)
      const ventasMes = todasLasVentas.filter(v => v.fecha_venta && v.fecha_venta >= inicioMesStr).length
      
      // Calcular top servicios
      const serviciosCount = {}
      const serviciosIngresos = {}
      
      todasLasVentas.forEach(venta => {
        if (venta.detalles && Array.isArray(venta.detalles)) {
          venta.detalles.forEach(detalle => {
            const servicioId = detalle.servicio
            if (!serviciosCount[servicioId]) {
              serviciosCount[servicioId] = 0
              serviciosIngresos[servicioId] = 0
            }
            serviciosCount[servicioId] += detalle.cantidad || 1
            if (venta.estado === "pagada") {
              serviciosIngresos[servicioId] += (detalle.precio_unitario || 0) * (detalle.cantidad || 1)
            }
          })
        }
      })
      
      const serviciosTop = Object.entries(serviciosCount)
        .map(([servicioId, cantidad]) => ({
          servicio__id: servicioId,
          servicio__nombre: `Servicio #${servicioId}`,
          total_vendido: cantidad,
          ingresos: serviciosIngresos[servicioId] || 0
        }))
        .sort((a, b) => b.total_vendido - a.total_vendido)
        .slice(0, 5)
      
      // Calcular top manicuristas
      const manicuristasCount = {}
      const manicuristasIngresos = {}
      
      todasLasVentas.forEach(venta => {
        const manicuristaId = venta.manicurista
        if (!manicuristasCount[manicuristaId]) {
          manicuristasCount[manicuristaId] = 0
          manicuristasIngresos[manicuristaId] = 0
        }
        manicuristasCount[manicuristaId] += 1
        if (venta.estado === "pagada") {
          manicuristasIngresos[manicuristaId] += Number.parseFloat(venta.total) || 0
        }
      })
      
      const manicuristasTop = Object.entries(manicuristasCount)
        .map(([manicuristaId, cantidad]) => ({
          manicurista__id: manicuristaId,
          manicurista__nombre: `Manicurista #${manicuristaId}`,
          total_ventas: cantidad,
          total_ingresos: manicuristasIngresos[manicuristaId] || 0
        }))
        .sort((a, b) => b.total_ventas - a.total_ventas)
        .slice(0, 5)
      
      const estadisticas = {
        total_ventas: todasLasVentas.length,
        ventas_hoy: ventasHoy,
        ventas_mes: ventasMes,
        ventas_pendientes: ventasPendientes.length,
        ventas_pagadas: ventasPagadas.length,
        ventas_canceladas: ventasCanceladas.length,
        ingresos_hoy: ingresosHoy,
        ingresos_mes: ingresosMes,
        por_estado: [
          { estado: "pendiente", cantidad: ventasPendientes.length },
          { estado: "pagada", cantidad: ventasPagadas.length },
          { estado: "cancelada", cantidad: ventasCanceladas.length }
        ],
        por_metodo_pago: [],
        servicios_top: serviciosTop,
        manicuristas_top: manicuristasTop
      }
      
      console.log("✅ Estadísticas de ventas calculadas:", estadisticas)
      return estadisticas
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas de ventas:", error)
      return {
        total_ventas: 0,
        ventas_hoy: 0,
        ventas_mes: 0,
        ventas_pendientes: 0,
        ventas_pagadas: 0,
        ventas_canceladas: 0,
        ingresos_hoy: 0,
        ingresos_mes: 0,
        por_estado: [],
        por_metodo_pago: [],
        servicios_top: [],
        manicuristas_top: []
      }
    }
  }

  // NUEVO: Obtener reporte de comisiones
  async obtenerReporteComisiones(fechaDesde = null, fechaHasta = null) {
    try {
      console.log("📊 Obteniendo reporte de comisiones...")
      
      const filtros = {}
      if (fechaDesde) filtros.fecha_desde = this.formatearFecha(fechaDesde)
      if (fechaHasta) filtros.fecha_hasta = this.formatearFecha(fechaHasta)
      
      const ventas = await this.obtenerVentas(filtros)
      
      // Filtrar solo ventas pagadas
      const ventasPagadas = ventas.filter(v => v.estado === "pagada")
      
      // Calcular comisiones por manicurista
      const comisionesPorManicurista = {}
      
      ventasPagadas.forEach(venta => {
        const manicuristaId = venta.manicurista
        const porcentajeComision = venta.porcentaje_comision || 0
        const totalVenta = Number.parseFloat(venta.total) || 0
        const comision = (totalVenta * porcentajeComision) / 100
        
        if (!comisionesPorManicurista[manicuristaId]) {
          comisionesPorManicurista[manicuristaId] = {
            manicurista_id: manicuristaId,
            total_ventas: 0,
            total_ingresos: 0,
            total_comisiones: 0,
            porcentaje_promedio: 0
          }
        }
        
        comisionesPorManicurista[manicuristaId].total_ventas += 1
        comisionesPorManicurista[manicuristaId].total_ingresos += totalVenta
        comisionesPorManicurista[manicuristaId].total_comisiones += comision
      })
      
      // Calcular porcentaje promedio por manicurista
      Object.values(comisionesPorManicurista).forEach(comision => {
        if (comision.total_ventas > 0) {
          comision.porcentaje_promedio = comision.total_comisiones / comision.total_ventas
        }
      })
      
      const reporte = Object.values(comisionesPorManicurista)
        .sort((a, b) => b.total_comisiones - a.total_comisiones)
      
      console.log("✅ Reporte de comisiones generado:", reporte)
      return reporte
    } catch (error) {
      console.error("❌ Error obteniendo reporte de comisiones:", error)
      return []
    }
  }
}

// Exportar una instancia del servicio
const ventaServiciosService = new VentaServiciosService()
export default ventaServiciosService
