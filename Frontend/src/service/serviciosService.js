import axios from "axios"
import apiClient, { apiConfig } from "./apiConfig"

const API_BASE_URL = (apiConfig?.baseURL || "https://appweb-rxph.onrender.com/api/").replace(/\/$/, "")
const SERVICIOS_API_URL = `${API_BASE_URL}/servicios/`

// 🔐 Instancia autenticada para operaciones protegidas
const authAxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/`,
  timeout: 30000, // 30 segundos timeout
})

authAxiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 🌐 Instancia pública sin token (para Home)
const publicAxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/`,
  timeout: 30000,
})

/* ══════════════════════════════════════
   🚀 GET - Lista de servicios (público o protegido)
   ══════════════════════════════════════ */
const getServicios = async (page = 1, search = "", filters = {}) => {
  try {
    const params = {
      page,
      ...(search && { search }),
      ...filters,
    }

    const response = await authAxiosInstance.get(SERVICIOS_API_URL, { params })

    if (response.data?.results) return response.data
    if (Array.isArray(response.data)) return { results: response.data, count: response.data.length }
    return { results: [], count: 0 }
  } catch (error) {
    console.error("Error al obtener servicios:", error.response?.data || error.message)
    throw error
  }
}

// 🌐 Versión pública para el Home
const obtenerServicios = async (filtros = {}) => {
  try {
    const response = await publicAxiosInstance.get(SERVICIOS_API_URL, {
      params: filtros,
    })

    if (Array.isArray(response.data?.results)) return response.data.results
    if (Array.isArray(response.data)) return response.data
    if (Array.isArray(response.data?.servicios)) return response.data.servicios
    return []
  } catch (error) {
    console.error("Error al obtener servicios (público):", error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   🧾 GET - Servicio individual
   ══════════════════════════════════════ */
const getServicio = async (id) => {
  try {
    const response = await authAxiosInstance.get(`${SERVICIOS_API_URL}${id}/`)
    return response.data
  } catch (error) {
    console.error(`Error al obtener el servicio ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   📦 POST - Crear servicio (con imagen)
   ══════════════════════════════════════ */
const createServicio = async (formData) => {
  try {
    const response = await authAxiosInstance.post(SERVICIOS_API_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return response.data
  } catch (error) {
    console.error("Error al crear servicio:", error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   ✏️ PUT - Actualizar servicio completo
   ══════════════════════════════════════ */
const updateServicio = async (id, formData) => {
  try {
    const response = await authAxiosInstance.put(`${SERVICIOS_API_URL}${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data
  } catch (error) {
    console.error(`Error al actualizar el servicio ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   🔁 PATCH - Actualización parcial
   ══════════════════════════════════════ */
const patchServicio = async (id, partialData) => {
  try {
    const formData = new FormData()
    for (const key in partialData) {
      if (partialData[key] !== null && partialData[key] !== undefined) {
        formData.append(key, partialData[key])
      }
    }

    const response = await authAxiosInstance.patch(`${SERVICIOS_API_URL}${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    return response.data
  } catch (error) {
    console.error(`Error al actualizar parcialmente el servicio ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   ❌ DELETE - Eliminar
   ══════════════════════════════════════ */
const deleteServicio = async (id) => {
  try {
    await authAxiosInstance.delete(`${SERVICIOS_API_URL}${id}/`)
  } catch (error) {
    console.error(`Error al eliminar el servicio ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   ✅ PATCH - Cambiar estado
   ══════════════════════════════════════ */
const toggleServicioEstado = async (id) => {
  try {
    const response = await authAxiosInstance.patch(`${SERVICIOS_API_URL}${id}/cambiar_estado/`)
    return response.data
  } catch (error) {
    console.error(`Error al cambiar el estado del servicio ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   📊 GET - Estadísticas de servicios
   ══════════════════════════════════════ */
const getEstadisticasServicios = async () => {
  try {
    const response = await authAxiosInstance.get(`${SERVICIOS_API_URL}estadisticas/`)
    return response.data
  } catch (error) {
    console.error("Error al obtener estadísticas:", error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   🏆 GET - Servicios más vendidos
   ══════════════════════════════════════ */
const getTopServicios = async (limit = 5) => {
  try {
    const response = await authAxiosInstance.get(`${SERVICIOS_API_URL}top_vendidos/`, {
      params: { limit },
    })
    return response.data
  } catch (error) {
    console.error("Error al obtener top servicios:", error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   🔍 GET - Servicios filtrados
   ══════════════════════════════════════ */
const getServiciosFiltrados = async (filtros) => {
  try {
    const response = await authAxiosInstance.get(SERVICIOS_API_URL, {
      params: filtros,
    })
    return response.data
  } catch (error) {
    console.error("Error al obtener servicios filtrados:", error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   🔍 GET - Verificar si servicio puede ser eliminado
   ══════════════════════════════════════ */
const checkServicioCanBeDeleted = async (id) => {
  try {
    const response = await authAxiosInstance.get(`${SERVICIOS_API_URL}${id}/verificar_eliminacion/`)
    return response.data
  } catch (error) {
    console.error(`Error verificando si servicio ${id} puede ser eliminado:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   🔍 GET - Verificar si servicio puede cambiar estado
   ══════════════════════════════════════ */
const checkServicioCanChangeEstado = async (id) => {
  try {
    const response = await authAxiosInstance.get(`${SERVICIOS_API_URL}${id}/verificar_cambio_estado/`)
    return response.data
  } catch (error) {
    console.error(`Error verificando si servicio ${id} puede cambiar estado:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   ✨ Exportación
   ══════════════════════════════════════ */
const serviciosService = {
  getServicios,
  getServicio,
  createServicio,
  updateServicio,
  patchServicio,
  deleteServicio,
  toggleServicioEstado,
  obtenerServicios, // ← para el Home
  getEstadisticasServicios,
  getTopServicios,
  getServiciosFiltrados,
  checkServicioCanBeDeleted,
  checkServicioCanChangeEstado,
}

export default serviciosService
