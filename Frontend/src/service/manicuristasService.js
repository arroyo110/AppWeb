import axios from "axios"

// URL base para el endpoint de manicuristas
const BASE_URL = "https://appweb-rxph.onrender.com/api/manicuristas/"

// Función para manejar diferentes formatos de respuesta de API
const extractDataFromResponse = (res) => {
  if (!res.data) return []

  if (Array.isArray(res.data)) return res.data

  // Si es un objeto, buscamos propiedades comunes que contengan la lista
  if (typeof res.data === "object") {
    if (Array.isArray(res.data.results)) return res.data.results
    if (Array.isArray(res.data.data)) return res.data.data
    if (Array.isArray(res.data.manicuristas)) return res.data.manicuristas
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

// Obtener todas las manicuristas
export const getManicuristas = async (estado = null) => {
  try {
    let url = BASE_URL;
    if (estado) {
      url += `?estado=${estado}`;
    }
    const res = await axios.get(url);
    return extractDataFromResponse(res);
  } catch (error) {
    console.error("Error al obtener manicuristas:", error);
    
    if (error.response) {
      console.error("Detalles del error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }
    throw error;
  }
}


// Crear una nueva manicurista
export const createManicurista = async (data) => {
  try {
    console.log("📦 Datos que se envían al crear manicurista:", data)

    // Preparar los datos para el backend - SIMPLIFICADO
    const manicuristaData = {
      nombre: data.nombre, // CAMBIADO: enviar nombre completo directamente
      tipo_documento: data.tipo_documento,
      numero_documento: data.numero_documento,
      celular: data.celular,
      correo: data.correo,
      direccion: data.direccion,
      estado: data.estado || "activo",
      disponible: data.disponible !== undefined ? data.disponible : true,
    }

    // Verificar si hay campos requeridos faltantes
    const requiredFields = ["nombre", "numero_documento", "celular", "correo", "direccion"]
    const missingFields = requiredFields.filter((field) => !manicuristaData[field])

    if (missingFields.length > 0) {
      console.warn(`Campos requeridos faltantes: ${missingFields.join(", ")}`)
      throw new Error(`Campos requeridos faltantes: ${missingFields.join(", ")}`)
    }

    // Validar formato de celular (debe comenzar con 3 y tener 10 dígitos)
    if (!/^[3][0-9]{9}$/.test(manicuristaData.celular)) {
      throw new Error("El celular debe comenzar con 3 y tener 10 dígitos")
    }

    // Validar formato de correo
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manicuristaData.correo)) {
      throw new Error("El formato del correo electrónico es inválido")
    }

    console.log("Datos formateados para enviar:", JSON.stringify(manicuristaData, null, 2))

    const res = await axios.post(BASE_URL, manicuristaData)
    console.log("Respuesta del servidor:", res.data)
    return res.data
  } catch (error) {
    console.error("❌ Error al crear manicurista:", error)

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

// Actualizar una manicurista existente
export const updateManicurista = async (id, data) => {
  try {
    console.log("📦 Datos que se envían al actualizar manicurista:", data)

    const manicuristaData = {
      nombre: data.nombre, // CAMBIADO: enviar nombre completo directamente
      tipo_documento: data.tipo_documento,
      numero_documento: data.numero_documento,
      celular: data.celular,
      correo: data.correo,
      direccion: data.direccion,
      estado: data.estado,
      disponible: data.disponible,
    }

    console.log("Datos formateados para enviar:", JSON.stringify(manicuristaData, null, 2))

    const response = await axios.put(`${BASE_URL}${id}/`, manicuristaData)
    console.log("Respuesta del servidor:", response.data)
    return response.data
  } catch (error) {
    console.error("❌ Error al actualizar manicurista:", error)

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

// Eliminar una manicurista
export const deleteManicurista = async (id) => {
  try {
    console.log(`🗑️ Eliminando manicurista con ID: ${id}`)

    // Verificar que el ID sea válido
    if (!id || id === "undefined" || id === "null" || id === undefined || id === null) {
      throw new Error("ID de manicurista inválido o no proporcionado")
    }

    // Convertir ID a número si es string
    const numericId = typeof id === "string" ? Number.parseInt(id, 10) : id
    if (isNaN(numericId)) {
      throw new Error("ID de manicurista debe ser un número válido")
    }

    const deleteUrl = `${BASE_URL}${numericId}/?confirm=ELIMINAR`
    console.log(`🔄 Enviando petición DELETE a: ${deleteUrl}`)

    // El backend puede exigir confirm=ELIMINAR
    const response = await axios({
      method: "DELETE",
      url: deleteUrl,
      timeout: 30000,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      // Algunos backends aceptan body en DELETE para confirmación
      data: { confirm: "ELIMINAR" },
      validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
    })

    console.log("✅ Respuesta de eliminación:", {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    })

    // Tanto 200, 204 como 404 se consideran éxito
    if (response.status === 404) {
      console.log("⚠️ Manicurista ya no existe en el servidor")
    }

    return {
      success: true,
      message: response.data?.message || "Manicurista eliminada exitosamente",
      status: response.status,
      data: response.data,
    }
  } catch (error) {
    console.error(`Error al eliminar manicurista(${id}):`, error)

    if (error.response) {
      const status = error.response.status
      const data = error.response.data

      // Si es 404, considerarlo como éxito (ya eliminado)
      if (status === 404) {
        console.log("✅ Manicurista ya eliminada (404), considerando como éxito")
        return {
          success: true,
          message: "Manicurista eliminada exitosamente",
          status: 404,
          data: null,
        }
      }

      // Crear un error más descriptivo para otros códigos
      let errorMessage = `Error del servidor (${status})`

      if (typeof data === "string") {
        errorMessage = data
      } else if (data && typeof data === "object") {
        errorMessage = data.detail || data.message || data.error || errorMessage
      }

      const customError = new Error(errorMessage)
      customError.response = error.response
      customError.status = status
      throw customError
    } else if (error.request) {
      console.error("❌ Error de red - no se recibió respuesta del servidor")
      throw new Error("Error de conexión. Verifique su conexión a internet y que el servidor esté funcionando.")
    } else {
      console.error("❌ Error de configuración:", error.message)
      throw new Error(`Error de configuración: ${error.message}`)
    }
  }
}

// Consultar asociaciones antes de eliminar
export const checkAsociacionesManicurista = async (id) => {
  try {
    const res = await axios.get(`${BASE_URL}${id}/check_associations/`)
    return res.data
  } catch (error) {
    console.error("Error verificando asociaciones de manicurista:", error)
    // Si no existe el endpoint, asumir que puede eliminar
    return { puede_eliminar: true, totales: {} }
  }
}

// Obtener una manicurista específica
export const getManicurista = async (id) => {
  try {
    const res = await axios.get(`${BASE_URL}${id}/`)
    return res.data
  } catch (error) {
    console.error("Error al obtener manicurista:", error)

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

// Login de manicurista
export const loginManicurista = async (data) => {
  try {
    console.log("📦 Datos de login:", data)
    const res = await axios.post(`${BASE_URL}login/`, data)
    console.log("✅ Respuesta de login:", res.data)

    return {
      success: true,
      data: res.data, // aquí estará el manicurista, access, refresh
    }
  } catch (error) {
    console.error("❌ Error en login de manicurista:", error)

    let errorMessage = "Error en el login de manicurista"
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}


// Cambiar contraseña de manicurista
export const cambiarContraseñaManicurista = async (id, data) => {
  try {
    const { contraseña_temporal, nueva_contraseña, confirmar_contraseña } = data;

    console.log("📦 Datos para cambiar contraseña:", { contraseña_temporal, nueva_contraseña, confirmar_contraseña  });
    
    const res = await axios.post(`${BASE_URL}${id}/cambiar-password/`, {
      contraseña_temporal,
      nueva_contraseña,
      confirmar_contraseña
    });
    
    console.log("Respuesta de cambio de contraseña:", res.data);
    return res.data;

  } catch (error) {
    console.error("Error al cambiar contraseña:", error);

    if (error.response) {
      console.error("Detalles del error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
      // Lanzar mensaje claro para el frontend
      throw new Error(error.response.data.error || "No se pudo cambiar la contraseña");
    }

    throw error;
  }
}

// Resetear contraseña de manicurista (solo admin)
export const resetearContraseñaManicurista = async (id) => {
  try {
    const res = await axios.post(`${BASE_URL}${id}/resetear_contraseña/`)
    console.log("Respuesta de reseteo de contraseña:", res.data)
    return res.data
  } catch (error) {
    console.error("Error al resetear contraseña:", error)

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

// Obtener manicuristas activos
export const getManicuristasActivos = async () => {
  try {
    const res = await axios.get(`${BASE_URL}activos/`)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener manicuristas activos:", error)

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

// Obtener manicuristas disponibles
export const getManicuristasDisponibles = async () => {
  try {
    const res = await axios.get(`${BASE_URL}disponibles/`)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener manicuristas disponibles:", error)

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

// Cambiar estado de manicurista (activo/inactivo)
export const cambiarEstadoManicurista = async (id) => {
  try {
    const res = await axios.patch(`${BASE_URL}${id}/cambiar_estado/`)
    console.log("Respuesta de cambio de estado:", res.data)
    return res.data
  } catch (error) {
    console.error("Error al cambiar estado:", error)

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

// Cambiar disponibilidad de manicurista
export const cambiarDisponibilidadManicurista = async (id) => {
  try {
    const res = await axios.patch(`${BASE_URL}${id}/cambiar_disponibilidad/`)
    console.log("Respuesta de cambio de disponibilidad:", res.data)
    return res.data
  } catch (error) {
    console.error("Error al cambiar disponibilidad:", error)

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

// Obtener estadísticas de una manicurista
export const getEstadisticasManicurista = async (id) => {
  try {
    const res = await axios.get(`${BASE_URL}${id}/estadisticas/`)
    return res.data
  } catch (error) {
    console.error("Error al obtener estadísticas:", error)

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

// Obtener manicuristas con filtros
export const getManicuristasConFiltros = async (filtros = {}) => {
  try {
    const params = new URLSearchParams()

    if (filtros.estado) {
      params.append("estado", filtros.estado)
    }

    if (filtros.disponible !== undefined) {
      params.append("disponible", filtros.disponible)
    }

    const url = params.toString() ? `${BASE_URL}?${params.toString()}` : BASE_URL
    const res = await axios.get(url)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener manicuristas con filtros:", error)

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

// Verificar si una manicurista tiene citas activas
export const tieneCitasActivas = async (manicuristaId) => {
  try {
    const res = await axios.get(`${BASE_URL}${manicuristaId}/tiene_citas_activas/`)
    return res.data.tiene_citas || false
  } catch (error) {
    console.error("Error al verificar citas activas:", error)
    
    if (error.response) {
      console.error("Detalles del error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      })
    }
    
    // Si hay error, asumir que no tiene citas para no bloquear la operación
    return false
  }
}

export default {
  getManicuristas,
  createManicurista,
  updateManicurista,
  deleteManicurista,
  getManicurista,
  loginManicurista,
  cambiarContraseñaManicurista,
  resetearContraseñaManicurista,
  getManicuristasActivos,
  getManicuristasDisponibles,
  cambiarEstadoManicurista,
  cambiarDisponibilidadManicurista,
  getEstadisticasManicurista,
  getManicuristasConFiltros,
  tieneCitasActivas,
}