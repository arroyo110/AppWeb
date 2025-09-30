import axios from "axios"

const API_URL = "https://appweb-rxph.onrender.com/api/clientes/"

// Configurar interceptor para manejar errores globalmente
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Error en la petición:", error)

    // Mejorar el manejo de errores
    if (error.response) {
      console.error("Datos del error:", error.response.data)
      console.error("Status:", error.response.status)
    } else if (error.request) {
      console.error("No se recibió respuesta:", error.request)
    } else {
      console.error("Error de configuración:", error.message)
    }

    return Promise.reject(error)
  },
)

class ClienteService {
  async getClientes() {
    try {
      const response = await axios.get(API_URL)
      console.log("Respuesta getClientes:", response)
      return response.data
    } catch (error) {
      console.error("Error en getClientes:", error)
      throw this.handleError(error)
    }
  }

  async getClienteById(id) {
    try {
      const response = await axios.get(`${API_URL}${id}/`)
      console.log(`Respuesta getClienteById(${id}):`, response)
      return response.data
    } catch (error) {
      console.error(`Error en getClienteById(${id}):`, error)
      throw this.handleError(error)
    }
  }

  async createCliente(cliente) {
    console.log("Datos enviados a createCliente:", cliente)

    // Validar datos antes de enviar - SIN PASSWORD (se genera automáticamente)
    const requiredFields = [
      "nombre",
      "tipo_documento",
      "documento",
      "celular",
      "correo_electronico",
      "direccion",
      "genero", // ✅ AGREGADO: genero es requerido
      // NO incluimos password - se genera automáticamente en el backend
    ]
    const missingFields = requiredFields.filter((field) => !cliente[field])

    if (missingFields.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missingFields.join(", ")}`)
    }

    // Preparar datos para envío - SIN PASSWORD
    const clienteData = {
      nombre: cliente.nombre.trim(),
      tipo_documento: cliente.tipo_documento,
      documento: cliente.documento.trim(),
      celular: cliente.celular.trim(),
      correo_electronico: cliente.correo_electronico.trim(),
      direccion: cliente.direccion.trim(),
      genero: cliente.genero, // ✅ AGREGADO: Campo genero
      estado: cliente.estado !== undefined ? cliente.estado : true, // ✅ AGREGADO: Campo estado
      // NO enviamos password - el backend lo genera automáticamente
    }

    console.log("Datos que se enviarán al servidor:", clienteData) // Para debug

    try {
      const response = await axios.post(API_URL, clienteData, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      console.log("Respuesta createCliente:", response)
      return response.data
    } catch (error) {
      console.error("Error en createCliente:", error)
      throw this.handleError(error)
    }
  }

  async updateCliente(id, cliente) {
    console.log(`Datos enviados a updateCliente(${id}):`, cliente)

    // Preparar datos para actualización
    const clienteData = {
      nombre: cliente.nombre?.trim(),
      tipo_documento: cliente.tipo_documento,
      documento: cliente.documento?.trim(),
      celular: cliente.celular?.trim(),
      correo_electronico: cliente.correo_electronico?.trim(),
      direccion: cliente.direccion?.trim(),
      genero: cliente.genero, // ✅ AGREGADO: Campo genero también en actualización
      estado: cliente.estado,
    }

    console.log("Datos que se enviarán al servidor para actualizar:", clienteData) // Para debug

    try {
      const response = await axios.put(`${API_URL}${id}/`, clienteData)
      console.log(`Respuesta updateCliente(${id}):`, response)
      return response.data
    } catch (error) {
      console.error(`Error en updateCliente(${id}):`, error)
      throw this.handleError(error)
    }
  }

  async deleteCliente(id) {
    try {
      console.log(`🗑️ Eliminando cliente con ID: ${id}`)

      // Verificar que el ID sea válido
      if (!id || id === "undefined" || id === "null" || id === undefined || id === null) {
        throw new Error("ID de cliente inválido o no proporcionado")
      }

      // Convertir ID a número si es string
      const numericId = typeof id === "string" ? Number.parseInt(id, 10) : id
      if (isNaN(numericId)) {
        throw new Error("ID de cliente debe ser un número válido")
      }

      const deleteUrl = `${API_URL}${numericId}/`
      console.log(`🔄 Enviando petición DELETE a: ${deleteUrl}`)

      const response = await axios({
        method: "DELETE",
        url: deleteUrl,
        timeout: 30000, // 30 segundos de timeout
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        validateStatus: (status) => {
          // Considerar exitosos los códigos 200, 204 (No Content) y 404 (ya eliminado)
          return (status >= 200 && status < 300) || status === 404
        },
      })

      console.log("✅ Respuesta de eliminación:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      })

      // Tanto 200, 204 como 404 se consideran éxito
      if (response.status === 404) {
        console.log("⚠️ Cliente ya no existe en el servidor")
      }

      return {
        success: true,
        message: response.data?.message || "Cliente eliminado exitosamente",
        status: response.status,
        data: response.data,
      }
    } catch (error) {
      console.error(`Error en deleteCliente(${id}):`, error)
      throw this.handleError(error)
    }
  }

  async activarCliente(id) {
    try {
      const response = await axios.patch(`${API_URL}${id}/activar/`)
      console.log(`Respuesta activarCliente(${id}):`, response)
      return response.data
    } catch (error) {
      console.error(`Error en activarCliente(${id}):`, error)
      throw this.handleError(error)
    }
  }

  async desactivarCliente(id) {
    try {
      const response = await axios.patch(`${API_URL}${id}/desactivar/`)
      console.log(`Respuesta desactivarCliente(${id}):`, response)
      return response.data
    } catch (error) {
      console.error(`Error en desactivarCliente(${id}):`, error)
      throw this.handleError(error)
    }
  }

  // ========== NUEVAS FUNCIONES DE AUTENTICACIÓN ==========

  // Login de cliente
  async loginCliente(data) {
    try {
      console.log("📦 Datos de login:", data)
      const res = await axios.post(`${API_URL}login/`, data)
      console.log("Respuesta de login:", res.data)
      return res.data
    } catch (error) {
      console.error("Error en login de cliente:", error)

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

  // Cambiar contraseña de cliente
  async cambiarContraseñaCliente(id, data) {
    try {
      console.log("📦 Datos para cambiar contraseña:", data)
      const res = await axios.post(`${API_URL}${id}/cambiar_contraseña/`, data)
      console.log("Respuesta de cambio de contraseña:", res.data)
      return res.data
    } catch (error) {
      console.error("Error al cambiar contraseña:", error)

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

  // Resetear contraseña de cliente (solo admin)
  async resetearContraseñaCliente(id) {
    try {
      const res = await axios.post(`${API_URL}${id}/resetear_contraseña/`)
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

  // Obtener clientes activos
  async getClientesActivos() {
    try {
      const res = await axios.get(`${API_URL}activos/`)
      return res.data
    } catch (error) {
      console.error("Error al obtener clientes activos:", error)

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

  // Buscar cliente por documento
  async buscarClientePorDocumento(documento) {
    try {
      const res = await axios.get(`${API_URL}by_documento/?documento=${documento}`)
      return res.data
    } catch (error) {
      console.error("Error al buscar cliente por documento:", error)

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

  // Buscar clientes
  async buscarClientes(query) {
    try {
      const res = await axios.get(`${API_URL}search/?q=${query}`)
      return res.data
    } catch (error) {
      console.error("Error al buscar clientes:", error)

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

  // Verificar si un cliente puede ser eliminado (igual que en Servicios)
  async checkClienteCanBeDeleted(id) {
    try {
      const response = await axios.get(`${API_URL}${id}/verificar_eliminacion/`)
      return response.data
    } catch (error) {
      console.error(`Error verificando si cliente ${id} puede ser eliminado:`, error.response?.data || error.message)
      throw error
    }
  }

  // Verificar si un cliente puede cambiar estado (igual que en Servicios)
  async checkClienteCanChangeEstado(id) {
    try {
      const response = await axios.get(`${API_URL}${id}/verificar_cambio_estado/`)
      return response.data
    } catch (error) {
      console.error(`Error verificando si cliente ${id} puede cambiar estado:`, error.response?.data || error.message)
      throw error
    }
  }

  // Método para manejar errores de manera consistente
  handleError(error) {
    if (error.response) {
      // El servidor respondió con un código de error
      const { data, status } = error.response

      if (data && typeof data === "object") {
        // Extraer mensajes de error específicos
        if (data.error) {
          return new Error(data.error)
        }

        if (data.message) {
          return new Error(data.message)
        }

        // Manejar errores de validación
        const errorMessages = []
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            errorMessages.push(`${key}: ${value.join(", ")}`)
          } else if (typeof value === "string") {
            errorMessages.push(`${key}: ${value}`)
          }
        })

        if (errorMessages.length > 0) {
          return new Error(errorMessages.join("; "))
        }
      }

      return new Error(`Error ${status}: ${data?.detail || data?.message || "Error del servidor"}`)
    } else if (error.request) {
      // No se recibió respuesta
      return new Error("No se pudo conectar con el servidor. Verifique su conexión.")
    } else {
      // Error de configuración
      return new Error(error.message || "Error desconocido")
    }
  }
}

export default new ClienteService()

// Exportar funciones individuales para compatibilidad
export const loginCliente = (data) => new ClienteService().loginCliente(data)
export const cambiarContraseñaCliente = (id, data) => new ClienteService().cambiarContraseñaCliente(id, data)
export const resetearContraseñaCliente = (id) => new ClienteService().resetearContraseñaCliente(id)
export const getClientesActivos = () => new ClienteService().getClientesActivos()
export const buscarClientePorDocumento = (documento) => new ClienteService().buscarClientePorDocumento(documento)
export const buscarClientes = (query) => new ClienteService().buscarClientes(query)
export const checkClienteCanBeDeleted = (id) => new ClienteService().checkClienteCanBeDeleted(id)
export const checkClienteCanChangeEstado = (id) => new ClienteService().checkClienteCanChangeEstado(id)
