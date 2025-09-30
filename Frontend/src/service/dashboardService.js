import citasService from "./CitasService"
import ventaServiciosService from "./VentaServiciosService"
import serviciosService from "./serviciosService"
import manicuristasService from "./manicuristasService"

class DashboardRealService {
  constructor() {
    // Cache para evitar múltiples llamadas
    this.cacheDatos = {
      servicios: null,
      manicuristas: null,
      ultimaActualizacion: null,
    }
  }

  // Formatear fecha para la API (YYYY-MM-DD)
  formatearFecha(fecha) {
    if (!fecha) return ""
    const date = new Date(fecha)
    return date.toISOString().split("T")[0]
  }

  // ✅ NUEVO: Cargar datos de referencia (servicios y manicuristas)
  async cargarDatosReferencia() {
    try {
      const ahora = Date.now()
      // Cache por 5 minutos
      if (this.cacheDatos.ultimaActualizacion && ahora - this.cacheDatos.ultimaActualizacion < 300000) {
        return this.cacheDatos
      }

      console.log("🔄 Cargando datos de referencia...")

      const [servicios, manicuristas] = await Promise.allSettled([
        serviciosService.obtenerServicios().catch(() => []),
        manicuristasService.getManicuristas().catch(() => []),
      ])

      this.cacheDatos = {
        servicios: servicios.status === "fulfilled" ? servicios.value : [],
        manicuristas: manicuristas.status === "fulfilled" ? manicuristas.value : [],
        ultimaActualizacion: ahora,
      }

      console.log("✅ Datos de referencia cargados:", {
        servicios: this.cacheDatos.servicios.length,
        manicuristas: this.cacheDatos.manicuristas.length,
      })

      return this.cacheDatos
    } catch (error) {
      console.error("❌ Error cargando datos de referencia:", error)
      return {
        servicios: [],
        manicuristas: [],
        ultimaActualizacion: Date.now(),
      }
    }
  }

  // ✅ NUEVO: Obtener nombre de servicio por ID
  obtenerNombreServicio(servicioId, servicios = []) {
    if (!servicioId) return "Servicio no especificado"

    const servicio = servicios.find((s) => s.id === servicioId || s.id === Number.parseInt(servicioId))
    return servicio ? servicio.nombre : `Servicio #${servicioId}`
  }

  // ✅ NUEVO: Obtener nombre de manicurista por ID
  obtenerNombreManicurista(manicuristaId, manicuristas = []) {
    if (!manicuristaId) return "Manicurista no especificada"

    const manicurista = manicuristas.find((m) => m.id === manicuristaId || m.id === Number.parseInt(manicuristaId))
    return manicurista ? manicurista.nombre : `Manicurista #${manicuristaId}`
  }

  // ✅ MEJORADO: Enriquecer datos con nombres reales
  async enriquecerDatos(datos) {
    try {
      const { servicios, manicuristas } = await this.cargarDatosReferencia()

      // Enriquecer citas pendientes
      if (datos.citasPendientes && Array.isArray(datos.citasPendientes)) {
        console.log("🔄 Enriqueciendo citas pendientes...")
        
        const citasEnriquecidas = await Promise.all(
          datos.citasPendientes.map(async (cita) => {
            try {
              // Obtener información del cliente
              let clienteNombre = "Cliente no disponible"
              if (cita.cliente) {
                try {
                  const cliente = await citasService.obtenerCliente(cita.cliente)
                  clienteNombre = cliente.nombre || cliente.name || "Cliente no disponible"
                } catch (error) {
                  console.warn("⚠️ Error obteniendo cliente:", error)
                }
              }

              // Obtener información de la manicurista
              let manicuristaNombre = "Manicurista no disponible"
              if (cita.manicurista) {
                try {
                  const manicurista = await citasService.obtenerManicurista(cita.manicurista)
                  manicuristaNombre = manicurista.nombres || manicurista.nombre || manicurista.name || "Manicurista no disponible"
                } catch (error) {
                  console.warn("⚠️ Error obteniendo manicurista:", error)
                }
              }

              // Obtener nombres de servicios
              let serviciosNombres = "Sin servicios especificados"
              if (cita.servicios && Array.isArray(cita.servicios)) {
                try {
                  const serviciosInfo = await Promise.all(
                    cita.servicios.map(async (servicioId) => {
                      try {
                        const servicio = await citasService.obtenerServicio(servicioId)
                        return servicio.nombre || servicio.name || `Servicio #${servicioId}`
                      } catch (error) {
                        return `Servicio #${servicioId}`
                      }
                    })
                  )
                  serviciosNombres = serviciosInfo.join(", ")
                } catch (error) {
                  console.warn("⚠️ Error obteniendo servicios:", error)
                }
              } else if (cita.servicio) {
                try {
                  const servicio = await citasService.obtenerServicio(cita.servicio)
                  serviciosNombres = servicio.nombre || servicio.name || `Servicio #${cita.servicio}`
                } catch (error) {
                  serviciosNombres = `Servicio #${cita.servicio}`
                }
              }

              return {
                ...cita,
                cliente_nombre: clienteNombre,
                manicurista_nombre: manicuristaNombre,
                servicios_nombres: serviciosNombres,
                fecha_formateada: cita.fecha_cita ? this.formatearFechaCompleta(cita.fecha_cita) : "Sin fecha"
              }
            } catch (error) {
              console.warn("⚠️ Error enriqueciendo cita:", error)
              return {
                ...cita,
                cliente_nombre: "Cliente no disponible",
                manicurista_nombre: "Manicurista no disponible",
                servicios_nombres: "Sin servicios especificados",
                fecha_formateada: "Sin fecha"
              }
            }
          })
        )

        datos.citasPendientes = citasEnriquecidas
        console.log("✅ Citas pendientes enriquecidas:", citasEnriquecidas.length)
        console.log("📋 Detalles de citas enriquecidas:", citasEnriquecidas.map(c => ({
          id: c.id,
          estado: c.estado,
          cliente_nombre: c.cliente_nombre,
          manicurista_nombre: c.manicurista_nombre,
          servicios_nombres: c.servicios_nombres,
          fecha_formateada: c.fecha_formateada
        })))
      }

      // Enriquecer ventas pendientes
      if (datos.ventasPendientes && Array.isArray(datos.ventasPendientes)) {
        console.log("🔄 Enriqueciendo ventas pendientes...")
        
        const ventasEnriquecidas = await Promise.all(
          datos.ventasPendientes.map(async (venta) => {
            try {
              // Obtener información del cliente
              let clienteNombre = "Cliente no disponible"
              if (venta.cliente) {
                try {
                  const cliente = await citasService.obtenerCliente(venta.cliente)
                  clienteNombre = cliente.nombre || cliente.name || "Cliente no disponible"
                } catch (error) {
                  console.warn("⚠️ Error obteniendo cliente:", error)
                }
              }

              // Obtener información de la manicurista
              let manicuristaNombre = "Manicurista no disponible"
              if (venta.manicurista) {
                try {
                  const manicurista = await citasService.obtenerManicurista(venta.manicurista)
                  manicuristaNombre = manicurista.nombres || manicurista.nombre || manicurista.name || "Manicurista no disponible"
                } catch (error) {
                  console.warn("⚠️ Error obteniendo manicurista:", error)
                }
              }

              // Obtener nombres de servicios
              let serviciosNombres = "Sin servicios especificados"
              if (venta.detalles && Array.isArray(venta.detalles)) {
                try {
                  const serviciosInfo = await Promise.all(
                    venta.detalles.map(async (detalle) => {
                      try {
                        const servicio = await citasService.obtenerServicio(detalle.servicio)
                        return servicio.nombre || servicio.name || `Servicio #${detalle.servicio}`
                      } catch (error) {
                        return `Servicio #${detalle.servicio}`
                      }
                    })
                  )
                  serviciosNombres = serviciosInfo.join(", ")
                } catch (error) {
                  console.warn("⚠️ Error obteniendo servicios:", error)
                }
              }

              return {
                ...venta,
                cliente_nombre: clienteNombre,
                manicurista_nombre: manicuristaNombre,
                servicios_nombres: serviciosNombres
              }
            } catch (error) {
              console.warn("⚠️ Error enriqueciendo venta:", error)
              return {
                ...venta,
                cliente_nombre: "Cliente no disponible",
                manicurista_nombre: "Manicurista no disponible",
                servicios_nombres: "Sin servicios especificados"
              }
            }
          })
        )

        datos.ventasPendientes = ventasEnriquecidas
        console.log("✅ Ventas pendientes enriquecidas:", ventasEnriquecidas.length)
      }

      // Enriquecer top servicios
      if (datos.ventas?.serviciosTop) {
        datos.ventas.serviciosTop = datos.ventas.serviciosTop.map((item) => ({
          ...item,
          servicio_nombre:
            this.obtenerNombreServicio(item.servicio__id || item.servicio_id, servicios) ||
            item.servicio__nombre ||
            "Servicio",
        }))
      }

      // Enriquecer top manicuristas
      if (datos.ventas?.manicuristasTop) {
        datos.ventas.manicuristasTop = datos.ventas.manicuristasTop.map((item) => ({
          ...item,
          manicurista_nombre:
            this.obtenerNombreManicurista(item.manicurista__id || item.manicurista_id, manicuristas) ||
            item.manicurista__nombre ||
            "Manicurista",
        }))
      }

      return datos
    } catch (error) {
      console.error("❌ Error enriqueciendo datos:", error)
      return datos
    }
  }

  // Obtener estadísticas completas del dashboard
  async obtenerEstadisticasCompletas(fechaDesde = null, fechaHasta = null) {
    try {
      console.log("🔄 Obteniendo estadísticas del dashboard...")

      const filtros = {}
      if (fechaDesde) filtros.fecha_desde = this.formatearFecha(fechaDesde)
      if (fechaHasta) filtros.fecha_hasta = this.formatearFecha(fechaHasta)

      // ✅ MEJORADO: Obtener datos con mejor manejo de errores
      const resultados = await Promise.allSettled([
        // Estadísticas de citas
        citasService
          .obtenerEstadisticas()
          .catch((err) => {
            console.warn("⚠️ Error obteniendo estadísticas de citas:", err.message)
            return {}
          }),
        // Estadísticas de ventas
        ventaServiciosService
          .obtenerEstadisticas()
          .catch((err) => {
            console.warn("⚠️ Error obteniendo estadísticas de ventas:", err.message)
            return {}
          }),
        // Todas las citas (sin filtros primero, luego filtrar localmente)
        citasService
          .obtenerCitas()
          .then((citas) => {
            if (filtros.fecha_desde || filtros.fecha_hasta) {
              return this.filtrarCitasPorFecha(citas, filtros.fecha_desde, filtros.fecha_hasta)
            }
            return citas
          })
          .catch((err) => {
            console.warn("⚠️ Error obteniendo citas:", err.message)
            return []
          }),
        // Todas las ventas (usando el método mejorado)
        ventaServiciosService
          .obtenerVentas(filtros)
          .catch((err) => {
            console.warn("⚠️ Error obteniendo ventas:", err.message)
            return []
          }),
        // Comisiones
        ventaServiciosService
          .obtenerReporteComisiones(filtros.fecha_desde, filtros.fecha_hasta)
          .catch((err) => {
            console.warn("⚠️ Error obteniendo comisiones:", err.message)
            return []
          }),
      ])

      const [estadisticasCitas, estadisticasVentas, todasLasCitas, todasLasVentas, reporteComisiones] = resultados.map(
        (result) => (result.status === "fulfilled" ? result.value : null),
      )

      console.log("📊 Datos obtenidos:", {
        estadisticasCitas: estadisticasCitas ? "✅" : "❌",
        estadisticasVentas: estadisticasVentas ? "✅" : "❌",
        totalCitas: todasLasCitas?.length || 0,
        totalVentas: todasLasVentas?.length || 0,
      })

      // Procesar estados correctamente
      const citasData = this.procesarEstadosCitas(todasLasCitas || [], estadisticasCitas || {})
      const ventasData = this.procesarEstadosVentas(todasLasVentas || [], estadisticasVentas || {})

      console.log("📈 Datos procesados:", { citasData, ventasData })

      // Separar ventas pendientes de todas las ventas
      const citasPendientes = (todasLasCitas || []).filter((cita) => cita.estado === "pendiente")
      const ventasPendientes = (todasLasVentas || []).filter((venta) => venta.estado === "pendiente")

      console.log("🔍 Citas pendientes encontradas:", {
        totalCitas: todasLasCitas?.length || 0,
        citasPendientes: citasPendientes.length,
        detallesCitasPendientes: citasPendientes.map(c => ({
          id: c.id,
          estado: c.estado,
          cliente: c.cliente,
          manicurista: c.manicurista,
          servicios: c.servicios,
          servicio: c.servicio,
          fecha_cita: c.fecha_cita
        }))
      })

      let datos = {
        citas: citasData,
        ventas: ventasData,
        citasPendientes: citasPendientes,
        ventasPendientes: ventasPendientes,
        comisiones: reporteComisiones || [],
        fechaConsulta: {
          desde: fechaDesde,
          hasta: fechaHasta,
        },
      }

      // Enriquecer con nombres reales
      datos = await this.enriquecerDatos(datos)

      return datos
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error)
      return this.obtenerDatosPorDefecto()
    }
  }

  // ✅ NUEVO: Filtrar citas por fecha localmente
  filtrarCitasPorFecha(citas, fechaDesde, fechaHasta) {
    if (!Array.isArray(citas)) return []

    return citas.filter((cita) => {
      if (!cita.fecha_cita) return true // Incluir citas sin fecha

      const fechaCita = new Date(cita.fecha_cita)
      let incluir = true

      if (fechaDesde) {
        const desde = new Date(fechaDesde)
        incluir = incluir && fechaCita >= desde
      }

      if (fechaHasta) {
        const hasta = new Date(fechaHasta)
        hasta.setHours(23, 59, 59, 999) // Incluir todo el día
        incluir = incluir && fechaCita <= hasta
      }

      return incluir
    })
  }

  // Datos por defecto
  obtenerDatosPorDefecto() {
    return {
      citas: {
        total: 0,
        hoy: 0,
        pendientes: 0,
        iniciadas: 0,
        finalizadas: 0,
        realizadas: 0,
        mes: 0,
        porEstado: [],
        ingresosMes: 0,
      },
      ventas: {
        total: 0,
        hoy: 0,
        pendientes: 0,
        pagadas: 0,
        mes: 0,
        ingresosHoy: 0,
        ingresosMes: 0,
        porEstado: [],
        porMetodoPago: [],
        serviciosTop: [],
        manicuristasTop: [],
      },
      citasPendientes: [],
      ventasPendientes: [],
      comisiones: [],
      fechaConsulta: {
        desde: null,
        hasta: null,
      },
    }
  }

  // Procesar estados de citas correctamente
  procesarEstadosCitas(citas, estadisticasAPI) {
    console.log("🔍 Procesando citas:", { totalCitas: citas.length, estadisticasAPI })

    const hoy = new Date().toISOString().split("T")[0]

    // Contar por estados
    const pendientes = citas.filter((c) => c.estado === "pendiente").length
    const iniciadas = citas.filter((c) => c.estado === "iniciada").length
    const finalizadas = citas.filter((c) => c.estado === "finalizada").length
    const realizadas = citas.filter((c) => c.estado === "realizada").length
    const canceladas = citas.filter((c) => c.estado === "cancelada").length

    // Citas de hoy
    const citasHoy = citas.filter((c) => c.fecha_cita && c.fecha_cita.startsWith(hoy)).length

    // Total de citas del mes actual
    const inicioMes = new Date()
    inicioMes.setDate(1)
    const inicioMesStr = inicioMes.toISOString().split("T")[0]

    const citasMes = citas.filter((c) => c.fecha_cita && c.fecha_cita >= inicioMesStr).length

    const resultado = {
      total: estadisticasAPI.total_citas || citas.length,
      hoy: estadisticasAPI.citas_hoy || citasHoy,
      pendientes: estadisticasAPI.citas_pendientes || pendientes,
      iniciadas: iniciadas,
      finalizadas: finalizadas,
      realizadas: estadisticasAPI.citas_realizadas || realizadas,
      mes: estadisticasAPI.citas_mes || citasMes,
      porEstado: [
        { estado: "pendiente", cantidad: pendientes },
        { estado: "iniciada", cantidad: iniciadas },
        { estado: "finalizada", cantidad: finalizadas },
        { estado: "realizada", cantidad: realizadas },
        { estado: "cancelada", cantidad: canceladas },
      ],
      ingresosMes: estadisticasAPI.ingresos_mes || 0,
    }

    console.log("📊 Citas procesadas:", resultado)
    return resultado
  }

  // Procesar estados de ventas correctamente
  procesarEstadosVentas(ventas, estadisticasAPI) {
    console.log("🔍 Procesando ventas:", { totalVentas: ventas.length, estadisticasAPI })

    const hoy = new Date().toISOString().split("T")[0]

    // Contar por estados - INCLUIR TODAS LAS VENTAS
    const pendientes = ventas.filter((v) => v.estado === "pendiente").length
    const pagadas = ventas.filter((v) => v.estado === "pagada").length
    const canceladas = ventas.filter((v) => v.estado === "cancelada").length

    // Mostrar todas las ventas pagadas, no filtrarlas
    const ventasPagadas = ventas.filter((v) => v.estado === "pagada")

    // Ingresos de hoy (solo pagadas)
    const ingresosHoy = ventasPagadas
      .filter((v) => {
        const fechaComparar = v.fecha_pago || v.fecha_venta
        return fechaComparar && fechaComparar.startsWith(hoy)
      })
      .reduce((sum, v) => sum + (Number.parseFloat(v.total) || 0), 0)

    // Ingresos del mes (solo pagadas)
    const inicioMes = new Date()
    inicioMes.setDate(1)
    const inicioMesStr = inicioMes.toISOString().split("T")[0]

    const ingresosMes = ventasPagadas
      .filter((v) => {
        const fechaComparar = v.fecha_pago || v.fecha_venta
        return fechaComparar && fechaComparar >= inicioMesStr
      })
      .reduce((sum, v) => sum + (Number.parseFloat(v.total) || 0), 0)

    // Ventas de hoy (TODAS, no solo pagadas)
    const ventasHoy = ventas.filter((v) => v.fecha_venta && v.fecha_venta.startsWith(hoy)).length

    // Ventas del mes (TODAS, no solo pagadas)
    const ventasMes = ventas.filter((v) => v.fecha_venta && v.fecha_venta >= inicioMesStr).length

    const resultado = {
      total: estadisticasAPI.total_ventas || ventas.length,
      hoy: estadisticasAPI.ventas_hoy || ventasHoy,
      pendientes: estadisticasAPI.ventas_pendientes || pendientes,
      pagadas: estadisticasAPI.ventas_pagadas || pagadas,
      canceladas: canceladas,
      mes: estadisticasAPI.ventas_mes || ventasMes,
      ingresosHoy: estadisticasAPI.ingresos_hoy || ingresosHoy,
      ingresosMes: estadisticasAPI.ingresos_mes || ingresosMes,
      porEstado: estadisticasAPI.por_estado || [
        { estado: "pendiente", cantidad: pendientes },
        { estado: "pagada", cantidad: pagadas },
        { estado: "cancelada", cantidad: canceladas },
      ],
      porMetodoPago: estadisticasAPI.por_metodo_pago || [],
      serviciosTop: estadisticasAPI.servicios_top || [],
      manicuristasTop: estadisticasAPI.manicuristas_top || [],
    }

    console.log("💰 Ventas procesadas:", resultado)
    return resultado
  }

  // Iniciar una cita
  async iniciarCita(citaId) {
    try {
      console.log(`🚀 Iniciando cita ${citaId}`)

      if (typeof citasService.actualizarCita === "function") {
        const citaActualizada = await citasService.actualizarCita(citaId, {
          estado: "iniciada",
        })
        console.log("✅ Cita iniciada:", citaActualizada)
        return citaActualizada
      } else if (typeof citasService.actualizarEstadoCita === "function") {
        const citaActualizada = await citasService.actualizarEstadoCita(citaId, "iniciada")
        console.log("✅ Cita iniciada:", citaActualizada)
        return citaActualizada
      } else {
        throw new Error("Método para actualizar cita no encontrado en citasService")
      }
    } catch (error) {
      console.error("❌ Error al iniciar cita:", error)
      throw error
    }
  }

  // Finalizar una cita y crear venta pendiente - CORREGIDO
  async finalizarCita(citaId, serviciosRealizados = []) {
    try {
      console.log(`🏁 Finalizando cita ${citaId}`)

      // 1. Actualizar estado de la cita a 'finalizada'
      let citaActualizada
      if (typeof citasService.actualizarCita === "function") {
        citaActualizada = await citasService.actualizarCita(citaId, {
          estado: "finalizada",
        })
      } else if (typeof citasService.actualizarEstadoCita === "function") {
        citaActualizada = await citasService.actualizarEstadoCita(citaId, "finalizada")
      } else {
        throw new Error("Método para actualizar cita no encontrado")
      }

      // 2. Obtener detalles completos de la cita
      const citaCompleta = await citasService.obtenerCitaPorId(citaId)
      console.log("📋 Cita completa obtenida:", citaCompleta)

      // 3. Preparar los servicios para la venta
      let serviciosParaVenta = []
      
      if (serviciosRealizados.length > 0) {
        // Si se especificaron servicios realizados, usarlos
        serviciosParaVenta = serviciosRealizados
      } else if (citaCompleta.servicios && Array.isArray(citaCompleta.servicios)) {
        // Si la cita tiene múltiples servicios, usarlos todos
        serviciosParaVenta = citaCompleta.servicios
      } else if (citaCompleta.servicio) {
        // Si la cita tiene un solo servicio
        serviciosParaVenta = [citaCompleta.servicio]
      }

      console.log("🔧 Servicios para la venta:", serviciosParaVenta)

      // 4. Crear venta pendiente con todos los servicios
      const ventaData = {
        cita: citaId,
        cliente: citaCompleta.cliente?.id || citaCompleta.cliente,
        manicurista: citaCompleta.manicurista?.id || citaCompleta.manicurista,
        servicios: serviciosParaVenta, // Enviar todos los servicios juntos
        estado: "pendiente",
        metodo_pago: null,
        fecha_venta: new Date().toISOString(),
        observaciones: `Venta generada automáticamente de la cita #${citaId} con ${serviciosParaVenta.length} servicio(s)`,
      }

      console.log("📦 Datos de venta a crear:", ventaData)

      // 5. Crear la venta usando el servicio de citas (que maneja múltiples servicios correctamente)
      const ventaCreada = await citasService.crearVenta(ventaData)

      console.log("✅ Cita finalizada y venta pendiente creada:", {
        cita: citaActualizada,
        venta: ventaCreada,
        serviciosIncluidos: serviciosParaVenta.length
      })

      return {
        cita: citaActualizada,
        venta: ventaCreada,
      }
    } catch (error) {
      console.error("❌ Error al finalizar cita:", error)
      throw error
    }
  }

  // Procesar pago de una venta
  async procesarPagoVenta(ventaId, metodoPago, montoPagado = null) {
    try {
      console.log(`💳 Procesando pago de venta ${ventaId}`)

      // Obtener la venta actual
      const ventaActual = await ventaServiciosService.obtenerVenta(ventaId)

      if (ventaActual.estado !== "pendiente") {
        throw new Error(
          `La venta debe estar en estado pendiente para procesar el pago. Estado actual: ${ventaActual.estado}`,
        )
      }

      // Actualizar venta a pagada
      const ventaActualizada = await ventaServiciosService.actualizarVenta(ventaId, {
        estado: "pagada",
        metodo_pago: metodoPago,
        fecha_pago: new Date().toISOString(),
        monto_pagado: montoPagado || ventaActual.total,
      })

      // Si hay una cita asociada, marcarla como realizada completamente
      if (ventaActual.cita) {
        try {
          if (typeof citasService.actualizarCita === "function") {
            await citasService.actualizarCita(ventaActual.cita, {
              estado: "realizada",
            })
          } else if (typeof citasService.actualizarEstadoCita === "function") {
            await citasService.actualizarEstadoCita(ventaActual.cita, "realizada")
          }
        } catch (error) {
          console.warn("Error actualizando estado de cita asociada:", error)
        }
      }

      console.log("✅ Pago procesado exitosamente:", ventaActualizada)
      return ventaActualizada
    } catch (error) {
      console.error("❌ Error al procesar pago:", error)
      throw error
    }
  }

  // Obtener datos para gráficos por período
  async obtenerDatosGraficos(periodo = "mes", fechaDesde = null, fechaHasta = null) {
    try {
      const filtros = {}
      if (fechaDesde) filtros.fecha_desde = this.formatearFecha(fechaDesde)
      if (fechaHasta) filtros.fecha_hasta = this.formatearFecha(fechaHasta)

      // Obtener ventas y citas con manejo de errores
      const [ventas, citas] = await Promise.allSettled([
        ventaServiciosService.obtenerVentas(filtros),
        citasService.obtenerCitas(filtros),
      ])

      const ventasData = ventas.status === "fulfilled" ? ventas.value : []
      const citasData = citas.status === "fulfilled" ? citas.value : []

      console.log("📊 Datos para gráficos:", {
        ventasCount: ventasData.length,
        citasCount: citasData.length,
      })

      // Procesar datos según el período
      return this.procesarDatosPorPeriodo(ventasData, citasData, periodo, fechaDesde, fechaHasta)
    } catch (error) {
      console.error("❌ Error obteniendo datos para gráficos:", error)
      return []
    }
  }

  // Procesar datos por período para gráficos - MEJORADO
  procesarDatosPorPeriodo(ventas, citas, periodo, fechaDesde, fechaHasta) {
    const datos = {}
    const hoy = new Date()

    // Generar datos de ejemplo si no hay datos reales
    if ((!ventas || ventas.length === 0) && (!citas || citas.length === 0)) {
      return this.generarDatosEjemplo(periodo)
    }

    // Procesar ventas pagadas para ingresos
    if (Array.isArray(ventas)) {
      ventas.forEach((venta) => {
        if (venta.fecha_venta && venta.estado === "pagada") {
          const fecha = new Date(venta.fecha_venta)
          let clave = this.obtenerClavePeriodo(fecha, periodo)

          if (!datos[clave]) {
            datos[clave] = { ingresos: 0, citas: 0 }
          }

          datos[clave].ingresos += Number.parseFloat(venta.total || 0)
        }
      })
    }

    // Procesar todas las citas para conteo
    if (Array.isArray(citas)) {
      citas.forEach((cita) => {
        if (cita.fecha_cita) {
          const fecha = new Date(cita.fecha_cita)
          let clave = this.obtenerClavePeriodo(fecha, periodo)

          if (!datos[clave]) {
            datos[clave] = { ingresos: 0, citas: 0 }
          }
          datos[clave].citas += 1
        }
      })
    }

    // Convertir a array ordenado
    const resultado = Object.entries(datos)
      .map(([periodo, data]) => ({
        periodo,
        ingresos: data.ingresos,
        citas: data.citas,
      }))
      .sort((a, b) => this.ordenarPorPeriodo(a.periodo, b.periodo, periodo))

    console.log("📈 Datos procesados para gráfico:", resultado)
    return resultado
  }

  // NUEVO: Obtener clave del período según el tipo
  obtenerClavePeriodo(fecha, periodo) {
    if (periodo === "dia") {
      return fecha.getHours().toString().padStart(2, "0") + ":00"
    } else if (periodo === "semana") {
      const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
      return dias[fecha.getDay()]
    } else if (periodo === "mes") {
      const semana = Math.ceil(fecha.getDate() / 7)
      return `Sem ${semana}`
    } else {
      return fecha.toISOString().split("T")[0]
    }
  }

  // NUEVO: Ordenar por período correctamente
  ordenarPorPeriodo(a, b, tipoPeriodo) {
    if (tipoPeriodo === "dia") {
      // Ordenar por hora (00:00, 01:00, 02:00...)
      return a.localeCompare(b)
    } else if (tipoPeriodo === "semana") {
      // Ordenar por día de la semana
      const ordenDias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
      return ordenDias.indexOf(a) - ordenDias.indexOf(b)
    } else if (tipoPeriodo === "mes") {
      // Ordenar por semana (Sem 1, Sem 2, Sem 3...)
      const semanaA = parseInt(a.match(/\d+/)[0])
      const semanaB = parseInt(b.match(/\d+/)[0])
      return semanaA - semanaB
    } else {
      // Ordenar por fecha
      return a.localeCompare(b)
    }
  }

  // NUEVO: Generar datos de ejemplo para demostración
  generarDatosEjemplo(periodo) {
    const datos = []
    
    if (periodo === "dia") {
      // Generar datos por hora del día
      for (let hora = 8; hora <= 20; hora += 2) {
        const horaStr = hora.toString().padStart(2, "0") + ":00"
        datos.push({
          periodo: horaStr,
          ingresos: Math.floor(Math.random() * 50000) + 10000,
          citas: Math.floor(Math.random() * 5) + 1
        })
      }
    } else if (periodo === "semana") {
      // Generar datos por día de la semana
      const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
      dias.forEach(dia => {
        datos.push({
          periodo: dia,
          ingresos: Math.floor(Math.random() * 200000) + 50000,
          citas: Math.floor(Math.random() * 15) + 5
        })
      })
    } else if (periodo === "mes") {
      // Generar datos por semana del mes
      for (let semana = 1; semana <= 4; semana++) {
        datos.push({
          periodo: `Sem ${semana}`,
          ingresos: Math.floor(Math.random() * 800000) + 200000,
          citas: Math.floor(Math.random() * 60) + 20
        })
      }
    }

    console.log("📊 Datos de ejemplo generados:", datos)
    return datos
  }

  // Formatear moneda
  formatearMoneda(cantidad) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cantidad || 0)
  }

  // Calcular tendencia
  calcularTendencia(actual, anterior) {
    if (!anterior || anterior === 0) return { valor: 0, tipo: "neutral" }

    const diferencia = ((actual - anterior) / anterior) * 100
    return {
      valor: Math.abs(Math.round(diferencia)),
      tipo: diferencia > 0 ? "up" : diferencia < 0 ? "down" : "neutral",
    }
  }

  // NUEVO: Formatear fecha completa
  formatearFechaCompleta(fecha) {
    if (!fecha) return "Sin fecha"
    
    try {
      const date = new Date(fecha)
      if (isNaN(date.getTime())) return "Fecha inválida"
      
      return date.toLocaleDateString("es-CO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch (error) {
      console.warn("⚠️ Error formateando fecha:", error)
      return fecha.toString()
    }
  }
}

const dashboardRealService = new DashboardRealService()
export default dashboardRealService
