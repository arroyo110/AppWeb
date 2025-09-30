import axios from "axios"

// URLs base actualizadas según la estructura del backend
const USUARIOS_URL = "http://127.0.0.1:8000/api/usuarios/"
const ROLES_URL = "http://127.0.0.1:8000/api/roles/roles/"

// Función para manejar diferentes formatos de respuesta de API
const extractDataFromResponse = (res) => {
  if (!res.data) return []

  if (Array.isArray(res.data)) return res.data

  // Si es un objeto, buscamos propiedades comunes que contengan la lista
  if (typeof res.data === "object") {
    if (Array.isArray(res.data.results)) return res.data.results
    if (Array.isArray(res.data.data)) return res.data.data
    if (Array.isArray(res.data.usuarios)) return res.data.usuarios
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

// Obtener todos los usuarios - FILTRADO MEJORADO
export const getUsuarios = async () => {
  try {
    console.log("🔄 Obteniendo usuarios desde:", USUARIOS_URL)
    const res = await axios.get(USUARIOS_URL)
    console.log("✅ Respuesta de getUsuarios:", res.data)
    const usuarios = extractDataFromResponse(res)

    console.log("🔍 Usuarios antes del filtrado:", usuarios)
    console.log("📊 Total usuarios recibidos:", usuarios.length)

    // Filtrar usuarios excluyendo específicamente Cliente y Manicurista
    const usuariosFiltrados = usuarios.filter((usuario) => {
      // Obtener el nombre del rol de diferentes maneras posibles
      let rolNombre = null

      if (typeof usuario.rol === "object" && usuario.rol !== null) {
        rolNombre = usuario.rol.nombre
      } else if (typeof usuario.rol === "string") {
        rolNombre = usuario.rol
      } else if (typeof usuario.rol === "number") {
        // Si es un ID numérico, no podemos filtrar aquí sin los datos del rol
        // Mejor incluir el usuario y que el componente maneje el filtrado
        console.log(`⚠️ Usuario ${usuario.nombre} tiene rol como ID numérico: ${usuario.rol}`)
        return true
      }

      if (!rolNombre) {
        console.log(`⚠️ Usuario ${usuario.nombre} no tiene rol definido`)
        return true // Incluir usuarios sin rol para que se puedan ver
      }

      const rolNombreLower = rolNombre.toLowerCase().trim()

      // EXCLUIR específicamente estos roles que tienen sus propias secciones
      const rolesExcluidos = ["cliente", "manicurista"]
      const debeExcluir = rolesExcluidos.includes(rolNombreLower)

      console.log(`🔍 Usuario: ${usuario.nombre}`)
      console.log(`   - Rol original: "${rolNombre}"`)
      console.log(`   - Rol normalizado: "${rolNombreLower}"`)
      console.log(`   - ¿Excluir?: ${debeExcluir}`)
      console.log(`   - ¿Incluir?: ${!debeExcluir}`)

      return !debeExcluir
    })

    console.log("🔍 Usuarios después del filtrado:", usuariosFiltrados)
    console.log("📊 Total usuarios filtrados:", usuariosFiltrados.length)

    // Log detallado de usuarios incluidos
    usuariosFiltrados.forEach((usuario) => {
      const rolNombre = typeof usuario.rol === "object" ? usuario.rol?.nombre : usuario.rol
      console.log(`✅ Usuario incluido: ${usuario.nombre} - Rol: ${rolNombre}`)
    })

    return usuariosFiltrados
  } catch (error) {
    console.error("❌ Error al obtener usuarios:", error)
    throw error
  }
}

// Obtener usuarios con detalles completos
export const getUsuariosDetallado = async () => {
  try {
    const res = await axios.get(`${USUARIOS_URL}detallado/`)
    const usuarios = extractDataFromResponse(res)

    // Aplicar el mismo filtrado mejorado
    const usuariosFiltrados = usuarios.filter((usuario) => {
      let rolNombre = null

      if (typeof usuario.rol === "object" && usuario.rol !== null) {
        rolNombre = usuario.rol.nombre
      } else if (typeof usuario.rol === "string") {
        rolNombre = usuario.rol
      } else if (typeof usuario.rol === "number") {
        return true
      }

      if (!rolNombre) return true

      const rolNombreLower = rolNombre.toLowerCase().trim()
      const rolesExcluidos = ["cliente", "manicurista"]
      return !rolesExcluidos.includes(rolNombreLower)
    })

    return usuariosFiltrados
  } catch (error) {
    console.error("Error al obtener usuarios detallados:", error)
    throw error
  }
}

// Obtener solo usuarios activos
export const getUsuariosActivos = async () => {
  try {
    const res = await axios.get(`${USUARIOS_URL}activos/`)
    const usuarios = extractDataFromResponse(res)

    // Aplicar el mismo filtrado mejorado
    const usuariosFiltrados = usuarios.filter((usuario) => {
      let rolNombre = null

      if (typeof usuario.rol === "object" && usuario.rol !== null) {
        rolNombre = usuario.rol.nombre
      } else if (typeof usuario.rol === "string") {
        rolNombre = usuario.rol
      } else if (typeof usuario.rol === "number") {
        return true
      }

      if (!rolNombre) return true

      const rolNombreLower = rolNombre.toLowerCase().trim()
      const rolesExcluidos = ["cliente", "manicurista"]
      return !rolesExcluidos.includes(rolNombreLower)
    })

    return usuariosFiltrados
  } catch (error) {
    console.error("Error al obtener usuarios activos:", error)
    throw error
  }
}

// Crear un nuevo usuario
export const createUsuario = async (data) => {
  try {
    console.log("📦 Datos que se envían al crear usuario:", data)

    // Preparar los datos para el backend - asegurarnos que rol sea un ID numérico
    const userData = {
      ...data,
      rol: data.rol ? Number.parseInt(data.rol, 10) : null, // Convertir a número si existe
    }

    // Verificar si hay campos requeridos faltantes
    const requiredFields = ["nombre", "documento", "celular", "correo_electronico", "rol"]
    const missingFields = requiredFields.filter((field) => !userData[field])

    if (missingFields.length > 0) {
      console.warn(`Campos requeridos faltantes: ${missingFields.join(", ")}`)
    }

    // Imprimir los datos exactos que se enviarán al servidor para depuración
    console.log("Datos formateados para enviar:", JSON.stringify(userData, null, 2))

    const res = await axios.post(USUARIOS_URL, userData)
    console.log("✅ Respuesta del servidor:", res.data)
    return res.data
  } catch (error) {
    console.error("❌ Error al crear usuario:", error)

    // Mostrar detalles específicos del error para depuración
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

// Actualizar un usuario existente
export const updateUsuario = async (id, data) => {
  try {
    console.log("📦 Datos que se envían al actualizar usuario:", data)

    // Preparar los datos para el backend
    const userData = {
      ...data,
      rol: data.rol ? Number.parseInt(data.rol, 10) : null, // Convertir a número si existe
    }

    // Eliminamos la contraseña si está vacía o undefined para evitar errores en la API
    if (!userData.password || userData.password === "") {
      delete userData.password
      console.log("Contraseña eliminada del objeto de datos por estar vacía")
    }

    // Imprimir los datos exactos que se enviarán al servidor para depuración
    console.log("Datos formateados para enviar:", JSON.stringify(userData, null, 2))

    const response = await axios.put(`${USUARIOS_URL}${id}/`, userData)
    console.log("✅ Respuesta del servidor:", response.data)
    return response.data
  } catch (error) {
    console.error("❌ Error al actualizar usuario:", error)

    // Mostrar detalles específicos del error para depuración
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

// Eliminar un usuario - VERSIÓN CORREGIDA CON LOGS DETALLADOS
export const deleteUsuario = async (id) => {
  try {
    console.log(`🗑️ === INICIANDO ELIMINACIÓN DE USUARIO ===`)
    console.log(`🗑️ ID recibido:`, id, `(tipo: ${typeof id})`)

    // Verificar que el ID sea válido
    if (!id || id === "undefined" || id === "null" || id === undefined || id === null) {
      const error = new Error("ID de usuario inválido o no proporcionado")
      console.error("❌", error.message)
      throw error
    }

    // Convertir ID a número si es string
    const numericId = typeof id === "string" ? Number.parseInt(id, 10) : id
    if (isNaN(numericId)) {
      const error = new Error("ID de usuario debe ser un número válido")
      console.error("❌", error.message)
      throw error
    }

    const deleteUrl = `${USUARIOS_URL}${numericId}/`
    console.log(`🔄 URL de eliminación:`, deleteUrl)
    console.log(`🔄 Enviando petición DELETE...`)

    // Configuración detallada de la petición
    const requestConfig = {
      method: "DELETE",
      url: deleteUrl,
      timeout: 30000, // 30 segundos de timeout
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      validateStatus: (status) => {
        console.log(`📊 Status recibido: ${status}`)
        // Considerar exitosos los códigos 200, 204 (No Content) y 404 (ya eliminado)
        return (status >= 200 && status < 300) || status === 404
      },
    }

    console.log(`📤 Configuración de petición:`, {
      method: requestConfig.method,
      url: requestConfig.url,
      timeout: requestConfig.timeout,
      headers: requestConfig.headers,
    })

    const response = await axios(requestConfig)

    console.log("✅ === RESPUESTA EXITOSA ===")
    console.log("📊 Status:", response.status)
    console.log("📊 Status Text:", response.statusText)
    console.log("📄 Data:", response.data)
    console.log("📋 Headers:", response.headers)

    // Tanto 200, 204 como 404 se consideran éxito
    if (response.status === 404) {
      console.log("⚠️ Usuario ya no existe en el servidor (404)")
    }

    return {
      success: true,
      message: response.data?.mensaje || response.data?.message || "Usuario eliminado exitosamente",
      status: response.status,
      data: response.data,
    }
  } catch (error) {
    console.error("❌ === ERROR EN ELIMINACIÓN ===")
    console.error("❌ Error completo:", error)
    console.error("❌ Mensaje:", error.message)

    if (error.response) {
      console.error("📄 Response data:", error.response.data)
      console.error("📊 Response status:", error.response.status)
      console.error("📊 Response statusText:", error.response.statusText)
      console.error("📋 Response headers:", error.response.headers)

      const status = error.response.status
      const data = error.response.data

      // Si es 404, considerarlo como éxito (ya eliminado)
      if (status === 404) {
        console.log("✅ Usuario ya eliminado (404), considerando como éxito")
        return {
          success: true,
          message: "Usuario eliminado exitosamente",
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

      console.error("📢 Error final a mostrar:", errorMessage)
      const customError = new Error(errorMessage)
      customError.response = error.response
      customError.status = status
      throw customError
    } else if (error.request) {
      console.error("❌ Error de red - Request:", error.request)
      console.error("❌ No se recibió respuesta del servidor")
      throw new Error("Error de conexión. Verifique su conexión a internet y que el servidor esté funcionando.")
    } else {
      console.error("❌ Error de configuración:", error.message)
      throw new Error(`Error de configuración: ${error.message}`)
    }
  }
}

// Obtener un usuario específico
export const getUsuario = async (id) => {
  try {
    const res = await axios.get(`${USUARIOS_URL}${id}/`)
    return res.data
  } catch (error) {
    console.error("Error al obtener usuario:", error)
    throw error
  }
}

// Obtener todos los roles
export const getRoles = async () => {
  try {
    console.log("🔄 Obteniendo roles desde:", ROLES_URL)
    const res = await axios.get(ROLES_URL)
    console.log("✅ Respuesta de getRoles:", res.data)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("❌ Error al obtener roles:", error)
    throw error
  }
}

// Activar un usuario
export const activarUsuario = async (id) => {
  try {
    console.log(`🔄 Activando usuario con ID: ${id}`)
    // Usar PATCH como está configurado en el backend
    const res = await axios.patch(`${USUARIOS_URL}${id}/activar/`)
    console.log("✅ Usuario activado exitosamente")
    return res.data
  } catch (error) {
    console.error("❌ Error al activar usuario:", error)
    throw error
  }
}

// Desactivar un usuario
export const desactivarUsuario = async (id) => {
  try {
    console.log(`🔄 Desactivando usuario con ID: ${id}`)
    // Usar PATCH como está configurado en el backend
    const res = await axios.patch(`${USUARIOS_URL}${id}/desactivar/`)
    console.log("✅ Usuario desactivado exitosamente")
    return res.data
  } catch (error) {
    console.error("❌ Error al desactivar usuario:", error)
    throw error
  }
}

// Obtener usuarios por rol
export const getUsuariosByRol = async (rolId) => {
  try {
    const res = await axios.get(`${USUARIOS_URL}por-rol/?rol_id=${rolId}`)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener usuarios por rol:", error)
    throw error
  }
}

// Cambiar contraseña de un usuario
export const cambiarPassword = async (id, nuevaPassword) => {
  try {
    console.log(`🔄 Cambiando contraseña para usuario con ID: ${id}`)
    const res = await axios.post(`${USUARIOS_URL}${id}/cambiar-password/`, {
      nueva_password: nuevaPassword,
    })
    console.log("✅ Contraseña cambiada exitosamente")
    return res.data
  } catch (error) {
    console.error("❌ Error al cambiar contraseña:", error)
    throw error
  }
}

// FUNCIONES para contraseña temporal
// Login de usuario
export const loginUsuario = async (data) => {
  try {
    console.log("📦 Datos de login:", data)
    const res = await axios.post(`${USUARIOS_URL}login/`, data)
    console.log("Respuesta de login:", res.data)
    return res.data
  } catch (error) {
    console.error("Error en login de usuario:", error)

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

// Cambiar contraseña de usuario
export const cambiarContraseñaUsuario = async (id, data) => {
  try {
    console.log("📦 Datos para cambiar contraseña:", data)
    const res = await axios.post(`${USUARIOS_URL}${id}/cambiar-contraseña/`, data)
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

// Crear cliente a partir de usuario (función específica para el componente Usuarios)
export const createClienteFromUser = async (userId) => {
  try {
    console.log(`🔄 Creando cliente a partir del usuario con ID: ${userId}`)
    const res = await axios.post(`${USUARIOS_URL}${userId}/crear-cliente/`)
    console.log("✅ Cliente creado exitosamente")
    return res.data
  } catch (error) {
    console.error("❌ Error al crear cliente:", error)
    throw error
  }
}

// Verificar si un usuario puede ser eliminado
export const checkUsuarioCanBeDeleted = async (usuarioId) => {
  try {
    console.log(`🔍 Verificando si el usuario ${usuarioId} puede ser eliminado`)
    const res = await axios.get(`${USUARIOS_URL}${usuarioId}/verificar_eliminacion/`)
    console.log("✅ Respuesta de verificación de eliminación:", res.data)
    return res.data
  } catch (error) {
    console.error("Error al verificar eliminación del usuario:", error)
    // Si el endpoint no existe o hay un error de conexión,
    // asumimos que el backend manejará la validación al intentar eliminar.
    return {
      puede_eliminar: true, // Asumimos que sí para no bloquear la llamada a deleteUsuario
      citas_info: { total: 0 },
      error_message: error.response?.data?.error || error.message,
    }
  }
}

// Verificar si un usuario puede cambiar estado
export const checkUsuarioCanChangeEstado = async (usuarioId) => {
  try {
    console.log(`🔍 Verificando si el usuario ${usuarioId} puede cambiar estado`)
    const res = await axios.get(`${USUARIOS_URL}${usuarioId}/verificar_cambio_estado/`)
    console.log("✅ Respuesta de verificación de cambio de estado:", res.data)
    return res.data
  } catch (error) {
    console.error("Error al verificar cambio de estado del usuario:", error)
    // Si el endpoint no existe o hay un error de conexión,
    // asumimos que el backend manejará la validación al intentar cambiar estado.
    return {
      puede_cambiar_estado: true, // Asumimos que sí para no bloquear la llamada
      citas_info: { total: 0 },
      error_message: error.response?.data?.error || error.message,
    }
  }
}

export default {
  getUsuarios,
  getUsuariosDetallado,
  getUsuariosActivos,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  getUsuario,
  getRoles,
  activarUsuario,
  desactivarUsuario,
  getUsuariosByRol,
  cambiarPassword,
  createClienteFromUser,
  // Funciones de contraseña temporal
  loginUsuario,
  cambiarContraseñaUsuario,
  // Funciones de validación
  checkUsuarioCanBeDeleted,
  checkUsuarioCanChangeEstado,
}
