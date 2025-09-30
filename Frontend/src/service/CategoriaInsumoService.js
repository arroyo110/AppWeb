import axios from "axios" // Importar axios para un manejo de errores consistente

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
          errorMessage = `Errores de validación: ${fieldErrors}`
        } else {
          errorMessage = `Error del servidor (${error.response.status}): ${error.response.statusText}`
        }
      }
    }
  } else if (error.request) {
    errorMessage = "Error de conexión. Verifique su conexión a internet y que el servidor esté funcionando."
  } else {
    errorMessage = `Error de configuración: ${error.message}`
  }
  return errorMessage
}

/**
 * Servicio para gestionar las operaciones de API relacionadas con Categorías de Insumos
 */
class CategoriaInsumoService {
  constructor() {
    // URL base de la API
    this.API_URL = "https://appweb-rxph.onrender.com/api/categoria-insumos/"
  }

  /**
   * Obtiene todas las categorías de insumos
   * @returns {Promise} Promesa con los datos de las categorías
   */
  async getCategorias() {
    try {
      const response = await axios.get(this.API_URL)
      return response.data
    } catch (error) {
      console.error("Error al obtener categorías:", error)
      throw new Error(parseAxiosError(error))
    }
  }

  /**
   * Obtiene una categoría de insumo por su ID
   * @param {number} id - ID de la categoría
   * @returns {Promise} Promesa con los datos de la categoría
   */
  async getCategoriaById(id) {
    try {
      const response = await axios.get(`${this.API_URL}${id}/`)
      return response.data
    } catch (error) {
      console.error(`Error al obtener categoría con ID ${id}:`, error)
      throw new Error(parseAxiosError(error))
    }
  }

  /**
   * Crea una nueva categoría de insumo
   * @param {Object} categoria - Datos de la categoría a crear
   * @returns {Promise} Promesa con los datos de la categoría creada
   */
  async createCategoria(categoria) {
    try {
      const response = await axios.post(this.API_URL, categoria)
      return response.data
    } catch (error) {
      console.error("Error al crear categoría:", error)
      throw new Error(parseAxiosError(error))
    }
  }

  /**
   * Actualiza una categoría de insumo existente
   * @param {number} id - ID de la categoría a actualizar
   * @param {Object} categoria - Datos actualizados de la categoría
   * @returns {Promise} Promesa con los datos de la categoría actualizada
   */
  async updateCategoria(id, categoria) {
    try {
      const response = await axios.put(`${this.API_URL}${id}/`, categoria)
      return response.data
    } catch (error) {
      console.error(`Error al actualizar categoría con ID ${id}:`, error)
      throw new Error(parseAxiosError(error))
    }
  }

  /**
   * Actualiza parcialmente una categoría de insumo
   * @param {number} id - ID de la categoría a actualizar
   * @param {Object} cambios - Campos a actualizar
   * @returns {Promise} Promesa con los datos de la categoría actualizada
   */
  async patchCategoria(id, cambios) {
    try {
      const response = await axios.patch(`${this.API_URL}${id}/`, cambios)
      return response.data
    } catch (error) {
      console.error(`Error al actualizar parcialmente categoría con ID ${id}:`, error)
      throw new Error(parseAxiosError(error))
    }
  }

  /**
   * Verifica si una categoría de insumo puede ser eliminada (no tiene insumos asociados)
   * @param {number} categoriaId - ID de la categoría
   * @returns {Promise<Object>} Promesa con el resultado de la verificación
   */
  async checkCategoriaCanBeDeleted(categoriaId) {
    try {
      console.log(`🔍 Verificando si la categoría ${categoriaId} puede ser eliminada`)
      const response = await axios.get(`${this.API_URL}${categoriaId}/check_insumos/`)
      console.log("✅ Respuesta de verificación:", response.data)
      return response.data
    } catch (error) {
      console.error("Error al verificar categoría:", error)
      // Re-lanzar el error parseado para que el llamador lo maneje
      throw new Error(parseAxiosError(error))
    }
  }

  /**
   * Elimina una categoría de insumo
   * @param {number} id - ID de la categoría a eliminar
   * @returns {Promise} Promesa que se resuelve cuando la categoría es eliminada
   */
  async deleteCategoria(id) {
    try {
      console.log(`🗑️ Eliminando categoría con ID: ${id}`)
      console.log(`📍 URL completa: ${this.API_URL}${id}/`)

      // Verificar que el ID sea válido
      if (!id || id === "undefined" || id === "null" || id === undefined || id === null) {
        throw new Error("ID de categoría inválido o no proporcionado")
      }

      // Convertir ID a número si es string
      const numericId = typeof id === "string" ? Number.parseInt(id, 10) : id
      if (isNaN(numericId)) {
        throw new Error("ID de categoría debe ser un número válido")
      }

      // NUEVA VALIDACIÓN: Verificar si la categoría puede ser eliminada
      console.log(`🔍 Verificando si la categoría puede ser eliminada...`)
      try {
        const checkResult = await this.checkCategoriaCanBeDeleted(numericId)
        console.log(`📊 Resultado de verificación:`, checkResult)

        if (!checkResult.puede_eliminar) {
          const info = checkResult.insumos_info
          const categoriaNombre = checkResult.categoria_nombre || "esta categoría"
          // Lanzar un error con un mensaje específico para el frontend
          throw new Error(
            `No se puede eliminar la categoría '${categoriaNombre}' porque tiene ${info.total} insumo(s) asociado(s). ` +
              "Primero debe reasignar o eliminar los insumos que tienen esta categoría.",
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
        console.log("⚠️ No se pudo verificar insumos asociados, el backend manejará la validación final:", checkError)
      }

      console.log(`🔄 Enviando petición DELETE a: ${this.API_URL}${numericId}/`)

      const response = await axios.delete(`${this.API_URL}${numericId}/`, {
        timeout: 10000, // 10 segundos de timeout
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("✅ Respuesta de eliminación exitosa:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      })

      // Manejar diferentes tipos de respuesta exitosa
      let message = "Categoría eliminada correctamente"
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
      console.error("❌ Error completo al eliminar categoría:", error)
      // Re-lanzar el error parseado para que el llamador lo maneje
      throw new Error(parseAxiosError(error))
    }
  }

  /**
   * Cambia el estado de una categoría (activo/inactivo)
   * @param {number} id - ID de la categoría
   * @param {string} nuevoEstado - Nuevo estado ('activo' o 'inactivo')
   * @returns {Promise} Promesa con los datos de la categoría actualizada
   */
  async cambiarEstado(id, nuevoEstado) {
    try {
      // Usar PATCH para cambiar solo el estado
      const data = { estado: nuevoEstado }
      const response = await axios.patch(`${this.API_URL}${id}/cambiar_estado/`, data)
      return response.data
    } catch (error) {
      console.error(`Error al cambiar estado de categoría con ID ${id}:`, error)
      throw new Error(parseAxiosError(error))
    }
  }
}

export default new CategoriaInsumoService()
