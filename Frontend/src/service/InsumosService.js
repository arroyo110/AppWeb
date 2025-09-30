import axios from "axios"

// URLs base actualizadas según la estructura del backend
const INSUMOS_URL = "http://127.0.0.1:8000/api/insumos/"
const CATEGORIAS_URL = "http://127.0.0.1:8000/api/categoria-insumos/"

/**
 * Helper function to parse Axios errors into a single string message
 */
const parseAxiosError = (error) => {
  let errorMessage = "Ocurrió un error desconocido."

  if (error.response) {
    const errorData = error.response.data
    if (typeof errorData === "string") {
      errorMessage = errorData
    } else if (errorData && typeof errorData === "object") {
      // Priorizar campos de error específicos del backend
      if (errorData.error) {
        errorMessage = errorData.error
      } else if (errorData.detail) {
        errorMessage = errorData.detail
      } else if (errorData.message) {
        errorMessage = errorData.message
      } else {
        // Agrupar errores de validación por campo
        const fieldErrors = Object.entries(errorData)
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return `${key}: ${value.join(", ")}`
            }
            return `${key}: ${value}`
          })
          .join("; ")
        if (fieldErrors) {
          errorMessage = fieldErrors
        } else {
          errorMessage = `Error del servidor (${error.response.status}): ${error.response.statusText}`
        }
      }
    }
  } else if (error.request) {
    errorMessage = "Error de conexión. Verifique su conexión a internet y que el servidor esté funcionando."
  } else {
    errorMessage = `${error.message}`
  }
  return errorMessage
}

// Función para manejar diferentes formatos de respuesta de API
const extractDataFromResponse = (res) => {
  if (!res.data) return []

  if (Array.isArray(res.data)) return res.data

  // Si es un objeto, buscamos propiedades comunes que contengan la lista
  if (typeof res.data === "object") {
    if (Array.isArray(res.data.results)) return res.data.results
    if (Array.isArray(res.data.data)) return res.data.data
    if (Array.isArray(res.data.insumos)) return res.data.insumos
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

// ===== FUNCIONES PARA INSUMOS =====

// Obtener todos los insumos
export const getInsumos = async () => {
  try {
    const res = await axios.get(INSUMOS_URL)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener insumos:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Obtener solo insumos activos
export const getInsumosActivos = async () => {
  try {
    const res = await axios.get(`${INSUMOS_URL}activos/`)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener insumos activos:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Obtener un insumo específico
export const getInsumo = async (id) => {
  try {
    const res = await axios.get(`${INSUMOS_URL}${id}/`)
    return res.data
  } catch (error) {
    console.error("Error al obtener insumo:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Crear un nuevo insumo
export const createInsumo = async (data) => {
  try {
    console.log("📦 Datos que se envían al crear insumo:", data)

    const res = await axios.post(INSUMOS_URL, data)
    console.log("✅ Respuesta del servidor:", res.data)
    return res.data
  } catch (error) {
    console.error("❌ Error al crear insumo:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Actualizar un insumo existente
export const updateInsumo = async (id, data) => {
  try {
    console.log("📦 Datos que se envían al actualizar insumo:", data)

    const res = await axios.put(`${INSUMOS_URL}${id}/`, data)
    console.log("✅ Respuesta del servidor:", res.data)
    return res.data
  } catch (error) {
    console.error("❌ Error al actualizar insumo:", error)
    throw new Error(parseAxiosError(error))
  }
}

/**
 * Verifica si un insumo puede ser eliminado (no tiene compras o abastecimientos asociados)
 * @param {number} insumoId - ID del insumo
 * @returns {Promise<Object>} Promesa con el resultado de la verificación
 */
export const checkInsumoCanBeDeleted = async (insumoId) => {
  try {
    console.log(`🔍 Verificando si el insumo ${insumoId} puede ser eliminado`)
    const response = await axios.get(`${INSUMOS_URL}${insumoId}/check_associations/`)
    console.log("✅ Respuesta de verificación:", response.data)
    return response.data
  } catch (error) {
    console.error("Error al verificar insumo:", error)
    throw new Error(parseAxiosError(error)) // Re-lanzar error parseado
  }
}

// Eliminar un insumo - MEJORADO CON VALIDACIÓN DE ASOCIACIONES
export const deleteInsumo = async (id) => {
  try {
    console.log(`🗑️ Eliminando insumo con ID: ${id}`)
    console.log(`📍 URL completa: ${INSUMOS_URL}${id}/`)

    // Verificar que el ID sea válido
    if (!id || id === "undefined" || id === "null" || id === undefined || id === null) {
      throw new Error("ID de insumo inválido o no proporcionado")
    }

    // Convertir ID a número si es string
    const numericId = typeof id === "string" ? Number.parseInt(id, 10) : id
    if (isNaN(numericId)) {
      throw new Error("ID de insumo debe ser un número válido")
    }

    // NUEVA VALIDACIÓN: Verificar si el insumo puede ser eliminado
    console.log(`🔍 Verificando si el insumo puede ser eliminado...`)
    try {
      const checkResult = await checkInsumoCanBeDeleted(numericId)
      console.log(`📊 Resultado de verificación:`, checkResult)

      if (!checkResult.puede_eliminar) {
        const insumoNombre = checkResult.insumo_nombre || "este insumo"
        const totalAssociations = checkResult.total_asociaciones
        let messageDetail = ""
        if (checkResult.compras_info.total > 0 && checkResult.abastecimientos_info.total > 0) {
          messageDetail = `Tiene ${checkResult.compras_info.total} compra(s) y ${checkResult.abastecimientos_info.total} abastecimiento(s) asociado(s).`
        } else if (checkResult.compras_info.total > 0) {
          messageDetail = `Tiene ${checkResult.compras_info.total} compra(s) asociada(s).`
        } else if (checkResult.abastecimientos_info.total > 0) {
          messageDetail = `Tiene ${checkResult.abastecimientos_info.total} abastecimiento(s) asociado(s).`
        }

        // Lanzar un error con un mensaje específico para el frontend
        throw new Error(
          `No se puede eliminar el insumo '${insumoNombre}' porque ${messageDetail} `,
        )
      }
    } catch (checkError) {
      // Si es un error de validación que ya contiene el mensaje personalizado, re-lanzarlo
      if (checkError.message.includes("No se puede eliminar")) {
        throw checkError
      }
      // Si es un error de conexión o cualquier otro error en la verificación,
      // loguearlo y continuar con el intento de eliminación, dejando que el backend
      // maneje la validación final.
      console.log("⚠️ No se pudo verificar asociaciones, el backend manejará la validación final:", checkError)
    }

    console.log(`🔄 Enviando petición DELETE a: ${INSUMOS_URL}${numericId}/`)

    const response = await axios.delete(`${INSUMOS_URL}${numericId}/`, {
      timeout: 15000, // 15 segundos de timeout
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("✅ Respuesta de eliminación exitosa:", {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    })

    // Manejar diferentes tipos de respuesta exitosa
    let message = "Insumo eliminado correctamente"
    if (response.data) {
      if (typeof response.data === "string") {
        message = response.data
      } else if (response.data.mensaje || response.data.message) {
        message = response.data.mensaje || response.data.message
      }
    }

    return {
      success: true,
      data: response.data,
      message: message,
      status: response.status,
    }
  } catch (error) {
    console.error("❌ Error completo al eliminar insumo:", error)
    throw new Error(parseAxiosError(error)) // Usar el helper para el mensaje de error
  }
}

// Cambiar estado de un insumo (activar/desactivar)
export const cambiarEstado = async (id) => {
  try {
    console.log(`🔄 Cambiando estado del insumo con ID: ${id}`)

    // Primero obtenemos el insumo actual para conocer su estado
    const insumoActual = await getInsumo(id)
    const nuevoEstado = insumoActual.estado === "activo" ? "inactivo" : "activo"

    // Usar PATCH para cambiar solo el estado
    const data = { estado: nuevoEstado }
    const res = await axios.patch(`${INSUMOS_URL}${id}/`, data)

    console.log("✅ Estado del insumo cambiado exitosamente")
    return res.data
  } catch (error) {
    console.error("❌ Error al cambiar estado del insumo:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Activar un insumo
export const activarInsumo = async (id) => {
  try {
    const data = { estado: "activo" }
    const res = await axios.patch(`${INSUMOS_URL}${id}/`, data)
    return res.data
  } catch (error) {
    console.error("Error al activar insumo:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Desactivar un insumo
export const desactivarInsumo = async (id) => {
  try {
    const data = { estado: "inactivo" }
    const res = await axios.patch(`${INSUMOS_URL}${id}/`, data)
    return res.data
  } catch (error) {
    console.error("Error al desactivar insumo:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Obtener insumos con bajo stock
export const getInsumosBajoStock = async () => {
  try {
    const res = await axios.get(`${INSUMOS_URL}bajo-stock/`)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener insumos con bajo stock:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Obtener insumos por categoría
export const getInsumosByCategoria = async (categoriaId) => {
  try {
    const res = await axios.get(`${INSUMOS_URL}por-categoria/?categoria_id=${categoriaId}`)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener insumos por categoría:", error)
    throw new Error(parseAxiosError(error))
  }
}

// ===== FUNCIONES PARA CATEGORÍAS =====

// Obtener todas las categorías
export const getCategorias = async () => {
  try {
    const res = await axios.get(CATEGORIAS_URL)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener categorías:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Obtener solo categorías activas
export const getCategoriasActivas = async () => {
  try {
    const res = await axios.get(`${CATEGORIAS_URL}activas/`)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener categorías activas:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Obtener una categoría específica
export const getCategoria = async (id) => {
  try {
    const res = await axios.get(`${CATEGORIAS_URL}${id}/`)
    return res.data
  } catch (error) {
    console.error("Error al obtener categoría:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Crear una nueva categoría
export const createCategoria = async (data) => {
  try {
    console.log("📦 Datos que se envían al crear categoría:", data)
    const res = await axios.post(CATEGORIAS_URL, data)
    console.log("✅ Respuesta del servidor:", res.data)
    return res.data
  } catch (error) {
    console.error("❌ Error al crear categoría:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Actualizar una categoría existente
export const updateCategoria = async (id, data) => {
  try {
    console.log("📦 Datos que se envían al actualizar categoría:", data)
    const res = await axios.put(`${CATEGORIAS_URL}${id}/`, data)
    console.log("✅ Respuesta del servidor:", res.data)
    return res.data
  } catch (error) {
    console.error("❌ Error al actualizar categoría:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Eliminar una categoría
export const deleteCategoria = async (id) => {
  try {
    console.log(`🗑️ Eliminando categoría con ID: ${id}`)
    const response = await axios.delete(`${CATEGORIAS_URL}${id}/`)
    console.log("✅ Categoría eliminada exitosamente")
    return response.data
  } catch (error) {
    console.error("❌ Error al eliminar categoría:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Cambiar estado de una categoría
export const cambiarEstadoCategoria = async (id, nuevoEstado) => {
  try {
    const data = { estado: nuevoEstado }
    const res = await axios.patch(`${CATEGORIAS_URL}${id}/`, data)
    return res.data
  } catch (error) {
    console.error("Error al cambiar estado de categoría:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Objeto por defecto con todas las funciones
const InsumosService = {
  // Funciones de insumos
  getInsumos,
  getInsumosActivos,
  getInsumo,
  createInsumo,
  updateInsumo,
  deleteInsumo,
  cambiarEstado,
  activarInsumo,
  desactivarInsumo,
  getInsumosBajoStock,
  getInsumosByCategoria,
  checkInsumoCanBeDeleted, // Exportar la nueva función

  // Funciones de categorías
  getCategorias,
  getCategoriasActivas,
  getCategoria,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  cambiarEstadoCategoria,
}

export default InsumosService
