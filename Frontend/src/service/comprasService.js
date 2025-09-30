import axios from "axios"

const API_BASE_URL = "https://appweb-rxph.onrender.com/api"
const COMPRAS_API_URL = `${API_BASE_URL}/compras/`

// Instancia autenticada para operaciones protegidas
const authAxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

authAxiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

/* ══════════════════════════════════════
   🚀 GET - Lista de compras
   ══════════════════════════════════════ */
const getCompras = async (page = 1, search = "", filters = {}) => {
  try {
    const params = {
      page,
      ...(search && { search }),
      ...filters,
    }

    const response = await authAxiosInstance.get(COMPRAS_API_URL, { params })

    if (response.data?.results) return response.data
    if (Array.isArray(response.data)) return { results: response.data, count: response.data.length }
    return { results: [], count: 0 }
  } catch (error) {
    console.error("Error al obtener compras:", error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   🧾 GET - Compra individual
   ══════════════════════════════════════ */
const getCompra = async (id) => {
  try {
    const response = await authAxiosInstance.get(`${COMPRAS_API_URL}${id}/`)
    return response.data
  } catch (error) {
    console.error(`Error al obtener la compra ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   📦 POST - Crear compra
   ══════════════════════════════════════ */
const createCompra = async (compraData) => {
  try {
    const response = await authAxiosInstance.post(COMPRAS_API_URL, compraData, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    return response.data
  } catch (error) {
    console.error("Error al crear compra:", error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   ✏️ PUT - Actualizar compra
   ══════════════════════════════════════ */
const updateCompra = async (id, compraData) => {
  try {
    const response = await authAxiosInstance.put(`${COMPRAS_API_URL}${id}/`, compraData, {
      headers: { "Content-Type": "application/json" },
    })
    return response.data
  } catch (error) {
    console.error(`Error al actualizar la compra ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   ❌ DELETE - Eliminar compra
   ══════════════════════════════════════ */
const deleteCompra = async (id) => {
  try {
    await authAxiosInstance.delete(`${COMPRAS_API_URL}${id}/`)
  } catch (error) {
    console.error(`Error al eliminar la compra ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   🚫 PATCH - Anular compra
   ══════════════════════════════════════ */
const anularCompra = async (id, data) => {
  // <-- Acepta el argumento 'data'
  try {
    console.log("Enviando PATCH a:", `${COMPRAS_API_URL}${id}/anular/`)
    console.log("Con datos:", data) // Verifica que 'data' contenga { motivo_anulacion: "..." }
    const response = await authAxiosInstance.patch(`${COMPRAS_API_URL}${id}/anular/`, data) // <-- Pasa 'data' aquí
    console.log("Respuesta de anulación:", response.data)
    return response.data
  } catch (error) {
    console.error(`Error al anular la compra ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   ✅ PATCH - Finalizar compra
   ══════════════════════════════════════ */
const finalizarCompra = async (id) => {
  try {
    const response = await authAxiosInstance.patch(`${COMPRAS_API_URL}${id}/finalizar/`)
    console.log("Respuesta de finalización:", response.data)
    return response.data
  } catch (error) {
    console.error(`Error al finalizar la compra ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   📊 GET - Estadísticas de compras
   ══════════════════════════════════════ */
const getEstadisticasCompras = async () => {
  try {
    const response = await authAxiosInstance.get(`${COMPRAS_API_URL}estadisticas/`)
    return response.data
  } catch (error) {
    console.error("Error al obtener estadísticas:", error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   🔍 GET - Compras por proveedor
   ══════════════════════════════════════ */
const getComprasPorProveedor = async (proveedorId) => {
  try {
    const response = await authAxiosInstance.get(`${COMPRAS_API_URL}por_proveedor/`, {
      params: { proveedor_id: proveedorId },
    })
    return response.data
  } catch (error) {
    console.error("Error al obtener compras por proveedor:", error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   📊 GET - Movimientos de stock
   ══════════════════════════════════════ */
const getMovimientosStock = async (id) => {
  try {
    const response = await authAxiosInstance.get(`${COMPRAS_API_URL}${id}/movimientos_stock/`)
    return response.data
  } catch (error) {
    console.error(`Error al obtener movimientos de stock de la compra ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   📄 GET - Generar PDF de compra
   ══════════════════════════════════════ */
const generarPDFCompra = async (id) => {
  try {
    const response = await authAxiosInstance.get(`${COMPRAS_API_URL}${id}/pdf/`, {
      responseType: "blob",
    })
    return response.data
  } catch (error) {
    console.error(`Error al generar PDF de la compra ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/* ══════════════════════════════════════
   ✨ Exportación
   ══════════════════════════════════════ */
const comprasService = {
  getCompras,
  getCompra,
  createCompra,
  updateCompra,
  deleteCompra,
  anularCompra,
  finalizarCompra,
  getEstadisticasCompras,
  getComprasPorProveedor,
  getMovimientosStock,
  generarPDFCompra,
}

export default comprasService
