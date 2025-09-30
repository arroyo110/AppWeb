import axios from "axios"

// URLs base
const ABASTECIMIENTOS_URL = "http://127.0.0.1:8000/api/abastecimientos/"
const MANICURISTAS_URL = "http://127.0.0.1:8000/api/manicuristas/"
const INSUMOS_URL = "http://127.0.0.1:8000/api/insumos/"

// Función para manejar diferentes formatos de respuesta de API
const extractDataFromResponse = (res) => {
  if (!res.data) return []

  if (Array.isArray(res.data)) return res.data

  // Si es un objeto, buscamos propiedades comunes que contengan la lista
  if (typeof res.data === "object") {
    if (Array.isArray(res.data.results)) return res.data.results
    if (Array.isArray(res.data.data)) return res.data.data
    if (Array.isArray(res.data.abastecimientos)) return res.data.abastecimientos
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

// ===== FUNCIONES PARA ABASTECIMIENTOS =====

// Obtener todos los abastecimientos
export const getAbastecimientos = async () => {
  try {
    const res = await axios.get(ABASTECIMIENTOS_URL)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener abastecimientos:", error)
    throw error
  }
}

// Obtener un abastecimiento específico
export const getAbastecimiento = async (id) => {
  try {
    const res = await axios.get(`${ABASTECIMIENTOS_URL}${id}/`)
    return res.data
  } catch (error) {
    console.error("Error al obtener abastecimiento:", error)
    throw error
  }
}

// ✅ CORREGIDO: Crear abastecimiento con lógica de RESTA de stock
export const createAbastecimiento = async (data) => {
  try {
    console.log("📦 Datos que se envían al crear abastecimiento:", data)

    // Validar datos requeridos
    if (!data.fecha || !data.cantidad || !data.manicurista) {
      throw new Error("Faltan campos requeridos: fecha, cantidad y manicurista")
    }

    // Validar que tenga al menos un insumo
    if (!data.insumos || data.insumos.length === 0) {
      throw new Error("Debe agregar al menos un insumo al abastecimiento")
    }

    // Validar que todos los insumos tengan cantidad
    const insumosInvalidos = data.insumos.filter((insumo) => !insumo.insumo || !insumo.cantidad || insumo.cantidad <= 0)
    if (insumosInvalidos.length > 0) {
      throw new Error("Todos los insumos deben tener una cantidad válida mayor a 0")
    }

    // ✅ VALIDACIÓN PREVIA: Verificar stock disponible antes de crear
    console.log("🔍 Verificando stock disponible...")
    for (const insumoItem of data.insumos) {
      try {
        const insumoActual = await axios.get(`${INSUMOS_URL}${insumoItem.insumo}/`)
        const stockActual = insumoActual.data.cantidad || 0

        // Validar stock mínimo
        if (stockActual < 5) {
          throw new Error(
            `❌ Stock insuficiente para el insumo ID ${insumoItem.insumo}. Stock actual: ${stockActual}, mínimo requerido: 5`,
          )
        }

        // Validar que no se tome más de lo disponible
        if (insumoItem.cantidad > stockActual) {
          throw new Error(
            `❌ No se pueden tomar ${insumoItem.cantidad} unidades del insumo ID ${insumoItem.insumo}. Solo hay ${stockActual} disponibles`,
          )
        }

        // Validar que quede stock mínimo después del abastecimiento
        const stockRestante = stockActual - insumoItem.cantidad
        if (stockRestante < 5) {
          throw new Error(
            `❌ Después del abastecimiento quedarían ${stockRestante} unidades del insumo ID ${insumoItem.insumo}. Debe quedar un mínimo de 5`,
          )
        }

        console.log(`✅ Stock validado para insumo ${insumoItem.insumo}: ${stockActual} -> ${stockRestante}`)
      } catch (stockError) {
        console.error(`❌ Error al validar stock del insumo ${insumoItem.insumo}:`, stockError)
        throw stockError
      }
    }

    // Crear el abastecimiento
    const res = await axios.post(ABASTECIMIENTOS_URL, data)
    console.log("✅ Abastecimiento creado:", res.data)

    // ✅ CORREGIDO: Descontar stock de insumos usando la acción 'ajustar_stock'
    console.log("📦 Descontando stock de insumos del inventario usando ajustar_stock...")
    for (const insumoItem of data.insumos) {
      try {
        // Usar la acción ajustar_stock con una cantidad negativa para descontar
        await axios.patch(`${INSUMOS_URL}${insumoItem.insumo}/ajustar_stock/`, {
          cantidad: -insumoItem.cantidad, // Enviar cantidad negativa para descontar
        })

        console.log(`✅ Stock descontado para insumo ${insumoItem.insumo} (se descontaron ${insumoItem.cantidad})`)
      } catch (stockError) {
        console.warn(`⚠️ Error al descontar stock del insumo ${insumoItem.insumo} con ajustar_stock:`, stockError)
        // No fallar todo el proceso si hay error en actualización de stock
        // (El abastecimiento ya se creó, esto es una operación secundaria)
      }
    }

    return res.data
  } catch (error) {
    console.error("❌ Error al crear abastecimiento:", error)
    throw error
  }
}

// Actualizar un abastecimiento existente
export const updateAbastecimiento = async (id, data) => {
  try {
    console.log("📦 Datos que se envían al actualizar abastecimiento:", data)

    // Validar datos requeridos
    if (!data.fecha || !data.cantidad || !data.manicurista) {
      throw new Error("Faltan campos requeridos: fecha, cantidad y manicurista")
    }

    // Validar que tenga al menos un insumo
    if (!data.insumos || data.insumos.length === 0) {
      throw new Error("Debe agregar al menos un insumo al abastecimiento")
    }

    const res = await axios.put(`${ABASTECIMIENTOS_URL}${id}/`, data)
    console.log("✅ Respuesta del servidor:", res.data)
    return res.data
  } catch (error) {
    console.error("❌ Error al actualizar abastecimiento:", error)

    if (error.response) {
      console.error("Detalles del error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      })
    }

    throw error
  }
}

// Eliminar un abastecimiento
export const deleteAbastecimiento = async (id) => {
  try {
    console.log(`🗑️ Eliminando abastecimiento con ID: ${id}`)

    if (!id || id === "undefined" || id === "null") {
      throw new Error("ID de abastecimiento inválido")
    }

    const response = await axios.delete(`${ABASTECIMIENTOS_URL}${id}/`, {
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("✅ Abastecimiento eliminado exitosamente")

    return {
      success: true,
      data: response.data,
      message: "Abastecimiento eliminado correctamente",
      status: response.status,
    }
  } catch (error) {
    console.error("❌ Error al eliminar abastecimiento:", error)

    let errorMessage = "Error desconocido al eliminar el abastecimiento"
    const statusCode = error.response?.status

    if (error.response) {
      switch (statusCode) {
        case 404:
          errorMessage = "El abastecimiento no existe o ya fue eliminado"
          break
        case 400:
          errorMessage = "Solicitud inválida. Verifique que el abastecimiento no tenga dependencias."
          break
        case 403:
          errorMessage = "No tienes permisos para eliminar este abastecimiento"
          break
        case 409:
          errorMessage = "No se puede eliminar el abastecimiento porque está siendo utilizado en otros registros"
          break
        case 500:
          errorMessage = "Error interno del servidor. Contacte al administrador."
          break
        default:
          if (error.response.data) {
            if (typeof error.response.data === "string") {
              errorMessage = error.response.data
            } else if (error.response.data.error || error.response.data.message || error.response.data.detail) {
              errorMessage = error.response.data.error || error.response.data.message || error.response.data.detail
            }
          }
      }
    } else if (error.request) {
      errorMessage = "No se pudo conectar con el servidor. Verifique su conexión."
    } else {
      errorMessage = error.message
    }

    const enhancedError = new Error(errorMessage)
    enhancedError.response = error.response
    enhancedError.statusCode = statusCode
    throw enhancedError
  }
}

// Obtener abastecimientos por manicurista
export const getAbastecimientosPorManicurista = async (manicuristaId) => {
  try {
    const res = await axios.get(`${ABASTECIMIENTOS_URL}por_manicurista/?manicurista_id=${manicuristaId}`)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener abastecimientos por manicurista:", error)
    throw error
  }
}

// Obtener abastecimientos por período
export const getAbastecimientosPorPeriodo = async (fechaInicio, fechaFin) => {
  try {
    const res = await axios.get(`${ABASTECIMIENTOS_URL}por_periodo/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener abastecimientos por período:", error)
    throw error
  }
}

// Filtrar abastecimientos
export const filtrarAbastecimientos = async (filtros) => {
  try {
    const params = new URLSearchParams()

    if (filtros.fecha) params.append("fecha", filtros.fecha)
    if (filtros.manicurista) params.append("manicurista", filtros.manicurista)
    if (filtros.search) params.append("search", filtros.search)
    if (filtros.ordering) params.append("ordering", filtros.ordering)

    const url = params.toString() ? `${ABASTECIMIENTOS_URL}?${params.toString()}` : ABASTECIMIENTOS_URL
    const res = await axios.get(url)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al filtrar abastecimientos:", error)
    throw error
  }
}

// ===== FUNCIONES AUXILIARES =====

// Obtener manicuristas activos
export const getManicuristas = async () => {
  try {
    const res = await axios.get(`${MANICURISTAS_URL}activos/`)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener manicuristas:", error)
    throw error
  }
}

// Obtener insumos activos
export const getInsumos = async () => {
  try {
    const res = await axios.get(`${INSUMOS_URL}activos/`)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener insumos:", error)
    throw error
  }
}

// Objeto por defecto con todas las funciones
const AbastecimientosService = {
  getAbastecimientos,
  getAbastecimiento,
  createAbastecimiento,
  updateAbastecimiento,
  deleteAbastecimiento,
  getAbastecimientosPorManicurista,
  getAbastecimientosPorPeriodo,
  filtrarAbastecimientos,
  getManicuristas,
  getInsumos,
}

export default AbastecimientosService
