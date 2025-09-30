import axios from "axios"

// Configuración base de las URLs de la API
const BASE_URL = "http://127.0.0.1:8000/api/liquidaciones/"
const MANICURISTAS_API_URL = "http://127.0.0.1:8000/api/manicuristas/"

// Configurar interceptores para manejo de errores globalmente en Axios
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Error en API de Liquidaciones:", error)

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

const extractDataFromResponse = (response) => {
  if (!response.data) return []
  if (Array.isArray(response.data)) return response.data
  if (typeof response.data === "object") {
    const possibleArrayKeys = ["results", "data", "liquidaciones", "items"]
    for (const key of possibleArrayKeys) {
      if (Array.isArray(response.data[key])) {
        return response.data[key]
      }
    }
    const keys = Object.keys(response.data)
    for (const key of keys) {
      if (Array.isArray(response.data[key])) {
        return response.data[key]
      }
    }
    if (Object.keys(response.data).length > 0 && !("count" in response.data)) {
      return [response.data]
    }
  }
  return []
}

const liquidacionesService = {
  // OBTENER LIQUIDACIONES CON MANEJO MEJORADO
  async obtenerLiquidaciones(filtros = {}) {
    try {
      const params = new URLSearchParams()
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const url = params.toString() ? `${BASE_URL}?${params.toString()}` : BASE_URL
      console.log("🔄 Obteniendo liquidaciones desde:", url)

      const response = await axios.get(url)
      console.log("📦 Respuesta completa de liquidaciones:", response.data)

      const liquidaciones = extractDataFromResponse(response)
      console.log("📦 Liquidaciones extraídas:", liquidaciones)

      // Enriquecer liquidaciones con información completa
      const liquidacionesEnriquecidas = await Promise.all(
        liquidaciones.map(async (liquidacion) => {
          try {
            // Obtener información de la manicurista si no está completa
            if (liquidacion.manicurista && typeof liquidacion.manicurista === "number") {
              try {
                const manicurista = await this.obtenerManicurista(liquidacion.manicurista)
                liquidacion.manicurista = {
                  id: liquidacion.manicurista,
                  nombre: manicurista.nombre || manicurista.nombres || "Manicurista no disponible",
                  ...manicurista,
                }
              } catch (error) {
                console.warn("⚠️ Error obteniendo manicurista:", error)
                liquidacion.manicurista = {
                  id: liquidacion.manicurista,
                  nombre: "Manicurista no disponible",
                }
              }
            }

            return liquidacion
          } catch (error) {
            console.warn("⚠️ Error enriqueciendo liquidación:", error)
            return liquidacion
          }
        }),
      )

      console.log("✅ Liquidaciones obtenidas y enriquecidas:", liquidacionesEnriquecidas)
      return liquidacionesEnriquecidas
    } catch (error) {
      console.error("❌ Error obteniendo liquidaciones:", error)
      throw error
    }
  },

  // CALCULAR CITAS COMPLETADAS
  async calcularCitasCompletadas(manicuristaId, fechaInicio, fechaFinal) {
    try {
      console.log("🔄 Calculando citas completadas:", {
        manicuristaId,
        fechaInicio,
        fechaFinal,
      })

      const response = await axios.post(`${BASE_URL}calcular_citas_completadas/`, {
        manicurista_id: manicuristaId,
        fecha_inicio: fechaInicio,
        fecha_final: fechaFinal,
      })

      console.log("✅ Citas calculadas exitosamente:", response.data)
      return response.data
    } catch (error) {
      console.error("❌ Error calculando citas completadas:", error)
      throw error
    }
  },

  // CREAR LIQUIDACIÓN AUTOMÁTICA
  async crearLiquidacionAutomatica(dataLiquidacion) {
    try {
      console.log("🔄 Creando liquidación automática con datos:", dataLiquidacion)

      // Asegurar que los valores numéricos estén redondeados a 2 decimales
      const dataToSend = {
        ...dataLiquidacion,
        valor: Math.round(Number(dataLiquidacion.valor) * 100) / 100,
        bonificacion: Math.round(Number(dataLiquidacion.bonificacion) * 100) / 100,
      }

      console.log("🔄 Datos procesados para envío:", dataToSend)

      const response = await axios.post(`${BASE_URL}crear_liquidacion_automatica/`, dataToSend)
      console.log("✅ Liquidación creada exitosamente:", response.data)
      return response.data
    } catch (error) {
      console.error("❌ Error creando liquidación:", error.response ? error.response.data : error.message)
      throw error
    }
  },

  // CREAR LIQUIDACIÓN MANUAL
  async crearLiquidacion(dataLiquidacion) {
    try {
      console.log("🔄 Creando liquidación con datos:", dataLiquidacion)
      const response = await axios.post(BASE_URL, dataLiquidacion)
      console.log("✅ Liquidación creada exitosamente:", response.data)
      return response.data
    } catch (error) {
      console.error("❌ Error creando liquidación:", error.response ? error.response.data : error.message)
      throw error
    }
  },

  // ACTUALIZAR LIQUIDACIÓN
  async actualizarLiquidacion(liquidacionId, dataLiquidacion) {
    try {
      console.log("🔄 Actualizando liquidación:", {
        liquidacionId,
        dataLiquidacion,
      })

      const response = await axios.patch(`${BASE_URL}${liquidacionId}/`, dataLiquidacion)

      console.log("✅ Liquidación actualizada exitosamente:", response.data)
      return response.data
    } catch (error) {
      console.error("❌ Error actualizando liquidación:", error)
      throw error
    }
  },

  // MARCAR COMO PAGADA
  async marcarComoPagada(liquidacionId) {
    try {
      console.log("🔄 Marcando liquidación como pagada:", liquidacionId)

      const response = await axios.patch(`${BASE_URL}${liquidacionId}/marcar_como_pagada/`)

      console.log("✅ Liquidación marcada como pagada:", response.data)
      return response.data
    } catch (error) {
      console.error("❌ Error marcando como pagada:", error)
      throw error
    }
  },

  // OBTENER DETALLE DE CITAS DE UNA LIQUIDACIÓN
  async obtenerDetalleCitas(liquidacionId) {
    try {
      console.log("🔄 Obteniendo detalle de citas para liquidación:", liquidacionId)

      const response = await axios.get(`${BASE_URL}${liquidacionId}/detalle_citas/`)

      console.log("✅ Detalle de citas obtenido:", response.data)
      return response.data
    } catch (error) {
      console.error("❌ Error obteniendo detalle de citas:", error)
      throw error
    }
  },

  // RECALCULAR CITAS COMPLETADAS DE UNA LIQUIDACIÓN
  async recalcularCitasCompletadas(liquidacionId) {
    try {
      console.log("🔄 Recalculando citas completadas para liquidación:", liquidacionId)

      const response = await axios.post(`${BASE_URL}${liquidacionId}/recalcular_citas_completadas/`)

      console.log("✅ Citas recalculadas exitosamente:", response.data)
      return response.data
    } catch (error) {
      console.error("❌ Error recalculando citas:", error)
      throw error
    }
  },

  // OBTENER LIQUIDACIONES POR MANICURISTA
  async obtenerLiquidacionesPorManicurista(manicuristaId) {
    try {
      const response = await axios.get(`${BASE_URL}por_manicurista/?id=${manicuristaId}`)
      return extractDataFromResponse(response)
    } catch (error) {
      console.error("❌ Error obteniendo liquidaciones por manicurista:", error)
      throw error
    }
  },

  // OBTENER LIQUIDACIONES PENDIENTES
  async obtenerLiquidacionesPendientes() {
    try {
      const response = await axios.get(`${BASE_URL}pendientes/`)
      return extractDataFromResponse(response)
    } catch (error) {
      console.error("❌ Error obteniendo liquidaciones pendientes:", error)
      throw error
    }
  },

  // OBTENER ESTADÍSTICAS GENERALES
  async obtenerEstadisticasGenerales() {
    try {
      const response = await axios.get(`${BASE_URL}estadisticas_generales/`)
      return response.data
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error)
      throw error
    }
  },

  // OBTENER DATOS DE APOYO
  async obtenerManicurista(manicuristaId) {
    try {
      const response = await axios.get(`${MANICURISTAS_API_URL}${manicuristaId}/`)
      return response.data
    } catch (error) {
      console.warn("⚠️ Error obteniendo manicurista:", error)
      return {
        nombres: "Manicurista no disponible",
        nombre: "Manicurista no disponible",
      }
    }
  },

  async obtenerManicuristasDisponibles() {
    try {
      const response = await axios.get(MANICURISTAS_API_URL)
      return extractDataFromResponse(response)
    } catch (error) {
      console.error("❌ Error obteniendo manicuristas:", error)
      throw error
    }
  },

  // ELIMINAR LIQUIDACIÓN
  async eliminarLiquidacion(liquidacionId) {
    try {
      console.log("🔄 Eliminando liquidación:", liquidacionId)
      const response = await axios.delete(`${BASE_URL}${liquidacionId}/`)
      console.log("✅ Liquidación eliminada exitosamente")
      return response.data
    } catch (error) {
      console.error("❌ Error eliminando liquidación:", error)
      throw error
    }
  },

  // OBTENER LIQUIDACIÓN POR ID
  async obtenerLiquidacion(liquidacionId) {
    try {
      const response = await axios.get(`${BASE_URL}${liquidacionId}/`)
      return response.data
    } catch (error) {
      console.error("❌ Error obteniendo liquidación:", error)
      throw error
    }
  },
}

export default liquidacionesService
