import axios from "axios"

// URL base para proveedores
const PROVEEDORES_URL = "http://127.0.0.1:8000/api/proveedores/"

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
    errorMessage = `Error: ${error.message}`
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
    if (Array.isArray(res.data.proveedores)) return res.data.proveedores
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

// Obtener todos los proveedores
export const getProveedores = async () => {
  try {
    const res = await axios.get(PROVEEDORES_URL)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener proveedores:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Obtener solo proveedores activos
export const getProveedoresActivos = async () => {
  try {
    const res = await axios.get(`${PROVEEDORES_URL}activos/`)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener proveedores activos:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Crear un nuevo proveedor
export const createProveedor = async (data) => {
  try {
    console.log("📦 Datos que se envían al crear proveedor:", data)

    // Preparar los datos para el backend
    const proveedorData = {
      ...data,
      estado: "activo", // Siempre activo al crear
    }

    // Verificar si hay campos requeridos faltantes (esto es más una validación de frontend)
    const requiredFields = ["nombre", "correo_electronico", "celular", "direccion"]

    if (data.tipo_persona === "natural") {
      requiredFields.push("documento")
    } else {
      requiredFields.push("nombre_empresa", "nit")
    }

    const missingFields = requiredFields.filter((field) => !proveedorData[field])

    if (missingFields.length > 0) {
      console.warn(`Campos requeridos faltantes: ${missingFields.join(", ")}`)
    }

    // Imprimir los datos exactos que se enviarán al servidor para depuración
    console.log("Datos formateados para enviar:", JSON.stringify(proveedorData, null, 2))

    const res = await axios.post(PROVEEDORES_URL, proveedorData)
    console.log("✅ Respuesta del servidor:", res.data)
    return res.data
  } catch (error) {
    console.error("❌ Error al crear proveedor:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Actualizar un proveedor existente
export const updateProveedor = async (id, data) => {
  try {
    console.log("📦 Datos que se envían al actualizar proveedor:", data)

    // Preparar los datos para el backend
    const proveedorData = { ...data }

    // Imprimir los datos exactos que se enviarán al servidor para depuración
    console.log("Datos formateados para enviar:", JSON.stringify(proveedorData, null, 2))

    const response = await axios.put(`${PROVEEDORES_URL}${id}/`, proveedorData)
    console.log("✅ Respuesta del servidor:", response.data)
    return response.data
  } catch (error) {
    console.error("❌ Error al actualizar proveedor:", error)
    throw new Error(parseAxiosError(error))
  }
}

/**
 * Verifica si un proveedor puede ser eliminado (no tiene compras asociadas)
 * @param {number} proveedorId - ID del proveedor
 * @returns {Promise<Object>} Promesa con el resultado de la verificación
 */
export const checkProveedorCanBeDeleted = async (proveedorId) => {
  try {
    console.log(`🔍 Verificando si el proveedor ${proveedorId} puede ser eliminado`)
    const response = await axios.get(`${PROVEEDORES_URL}${proveedorId}/check_compras/`)
    console.log("✅ Respuesta de verificación:", response.data)
    return response.data
  } catch (error) {
    console.error("Error al verificar proveedor:", error)
    throw new Error(parseAxiosError(error)) // Re-lanzar error parseado
  }
}

// Eliminar un proveedor - MEJORADO CON VALIDACIÓN DE COMPRAS ASOCIADAS
export const deleteProveedor = async (id) => {
  try {
    console.log(`🗑️ Eliminando proveedor con ID: ${id}`)
    console.log(`📍 URL completa: ${PROVEEDORES_URL}${id}/`)

    // Verificar que el ID sea válido
    if (!id || id === "undefined" || id === "null" || id === undefined || id === null) {
      throw new Error("ID de proveedor inválido o no proporcionado")
    }

    // Convertir ID a número si es string
    const numericId = typeof id === "string" ? Number.parseInt(id, 10) : id
    if (isNaN(numericId)) {
      throw new Error("ID de proveedor debe ser un número válido")
    }

    // NUEVA VALIDACIÓN: Verificar si el proveedor puede ser eliminado
    console.log(`🔍 Verificando si el proveedor puede ser eliminado...`)
    try {
      const checkResult = await checkProveedorCanBeDeleted(numericId)
      console.log(`📊 Resultado de verificación:`, checkResult)

      if (!checkResult.puede_eliminar) {
        const info = checkResult.compras_info
        const proveedorNombre = checkResult.proveedor_nombre || "este proveedor"
        // Lanzar un error con un mensaje específico para el frontend
        throw new Error(
          `No se puede eliminar el proveedor '${proveedorNombre}' porque tiene ${info.total} compra(s) asociada(s). ` +
            "",
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
      console.log("⚠️ No se pudo verificar compras asociadas, el backend manejará la validación final:", checkError)
    }

    console.log(`🔄 Enviando petición DELETE a: ${PROVEEDORES_URL}${numericId}/`)

    const response = await axios.delete(`${PROVEEDORES_URL}${numericId}/`, {
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
    let message = "Proveedor eliminado correctamente"
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
    console.error("❌ Error completo al eliminar proveedor:", error)
    throw new Error(parseAxiosError(error)) // Usar el helper para el mensaje de error
  }
}

// Obtener un proveedor específico
export const getProveedor = async (id) => {
  try {
    const res = await axios.get(`${PROVEEDORES_URL}${id}/`)
    return res.data
  } catch (error) {
    console.error("Error al obtener proveedor:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Activar un proveedor
export const activarProveedor = async (id) => {
  try {
    console.log(`🔄 Activando proveedor con ID: ${id}`)
    const res = await axios.patch(`${PROVEEDORES_URL}${id}/activar/`)
    console.log("✅ Proveedor activado exitosamente")
    return res.data
  } catch (error) {
    console.error("❌ Error al activar proveedor:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Desactivar un proveedor
export const desactivarProveedor = async (id) => {
  try {
    console.log(`🔄 Desactivando proveedor con ID: ${id}`)
    const res = await axios.patch(`${PROVEEDORES_URL}${id}/desactivar/`)
    console.log("✅ Proveedor desactivado exitosamente")
    return res.data
  } catch (error) {
    console.error("❌ Error al desactivar proveedor:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Cambiar estado de un proveedor (alternar activo/inactivo)
export const cambiarEstado = async (id) => {
  try {
    console.log(`🔄 Cambiando estado del proveedor con ID: ${id}`)
    const res = await axios.patch(`${PROVEEDORES_URL}${id}/cambiar_estado/`)
    console.log("✅ Estado del proveedor cambiado exitosamente")
    return res.data
  } catch (error) {
    console.error("❌ Error al cambiar estado del proveedor:", error)
    throw new Error(parseAxiosError(error))
  }
}

export default {
  getProveedores,
  getProveedoresActivos,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  getProveedor,
  activarProveedor,
  desactivarProveedor,
  cambiarEstado,
  checkProveedorCanBeDeleted, // Exportar la nueva función
}
