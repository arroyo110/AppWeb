import axios from "axios"

// URL base para apuntar a los endpoints correctos
const ROLES_URL = "https://appweb-rxph.onrender.com/api/roles/roles/"
const PERMISOS_URL = "https://appweb-rxph.onrender.com/api/roles/permisos/"
const ROLES_PERMISOS_URL = "https://appweb-rxph.onrender.com/api/roles/roles-permisos/"

// Función para manejar diferentes formatos de respuesta de API
const extractDataFromResponse = (res) => {
  if (!res.data) return []

  if (Array.isArray(res.data)) return res.data

  // Si es un objeto, buscamos propiedades comunes que contengan la lista
  if (typeof res.data === "object") {
    if (Array.isArray(res.data.results)) return res.data.results
    if (Array.isArray(res.data.data)) return res.data.data
    if (Array.isArray(res.data.roles)) return res.data.roles
    if (Array.isArray(res.data.permisos)) return res.data.permisos
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

// Helper function to parse Axios errors into a single string message
const parseAxiosError = (error) => {
  let errorMessage = "Ocurrió un error desconocido."

  if (error.response) {
    const errorData = error.response.data
    if (typeof errorData === "string") {
      errorMessage = errorData
    } else if (errorData && typeof errorData === "object") {
      // Prioritize custom 'error' field from backend
      if (errorData.error) {
        errorMessage = errorData.error
      } else if (errorData.detail) {
        errorMessage = errorData.detail
      } else if (errorData.message) {
        errorMessage = errorData.message
      } else {
        // Aggregate field-specific errors
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

// Verificar si un rol puede ser eliminado (no tiene usuarios asociados)
export const checkRolCanBeDeleted = async (rolId) => {
  try {
    console.log(`🔍 Verificando si el rol ${rolId} puede ser eliminado`)
    const res = await axios.get(`${ROLES_URL}${rolId}/check_usuarios/`)
    console.log("✅ Respuesta de verificación:", res.data)
    return res.data
  } catch (error) {
    console.error("Error al verificar rol:", error)
    // Si el endpoint no existe o hay un error de conexión,
    // asumimos que el backend manejará la validación al intentar eliminar.
    // Devolvemos un estado que no bloquee el intento de eliminación,
    // pero el error del backend será capturado por deleteRol.
    return {
      puede_eliminar: true, // Asumimos que sí para no bloquear la llamada a deleteRol
      usuarios_info: { total: 0 },
      es_admin: false,
      error_message: parseAxiosError(error), // Usar el helper para el mensaje de error
    }
  }
}

// Verificar si un rol puede cambiar estado (no tiene usuarios asociados)
export const checkRolCanChangeEstado = async (rolId) => {
  try {
    console.log(`🔍 Verificando si el rol ${rolId} puede cambiar estado`)
    const res = await axios.get(`${ROLES_URL}${rolId}/verificar_cambio_estado/`)
    console.log("✅ Respuesta de verificación de cambio de estado:", res.data)
    return res.data
  } catch (error) {
    console.error("Error al verificar cambio de estado del rol:", error)
    // Si el endpoint no existe o hay un error de conexión,
    // asumimos que el backend manejará la validación al intentar cambiar estado.
    return {
      puede_cambiar_estado: true, // Asumimos que sí para no bloquear la llamada
      usuarios_info: { total: 0 },
      error_message: parseAxiosError(error),
    }
  }
}

// Modificar la función getRoles para intentar obtener roles con detalles
export const getRoles = async () => {
  try {
    // Primero intentamos obtener la lista detallada que incluye permisos
    try {
      const res = await axios.get(`${ROLES_URL}list_detail/`)
      const roles = extractDataFromResponse(res)
      if (roles.length > 0) {
        return roles
      }
    } catch (err) {
      console.log("No se pudo obtener la lista detallada de roles:", err)
    }

    // Si no funciona, obtenemos la lista básica
    const res = await axios.get(ROLES_URL)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener roles:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Obtener un rol específico
export const getRol = async (id) => {
  try {
    const res = await axios.get(`${ROLES_URL}${id}/`)
    return res.data
  } catch (error) {
    console.error("Error al obtener rol:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Crear un nuevo rol
export const createRol = async (data) => {
  try {
    console.log("📦 Datos que se envían al crear rol:", data)

    const res = await axios.post(ROLES_URL, data)
    console.log("✅ Respuesta del servidor:", res.data)
    return res.data
  } catch (error) {
    console.error("❌ Error al crear rol:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Actualizar un rol existente
export const updateRol = async (id, data) => {
  try {
    console.log("📦 Datos que se envían al actualizar rol:", data)

    // Crear una copia de los datos para manipularlos
    const dataToSend = { ...data }

    // Si tenemos permisos_ids, asegurarnos de que sea un array
    if (dataToSend.permisos_ids) {
      // Asegurarnos de que los IDs sean números
      dataToSend.permisos_ids = dataToSend.permisos_ids.map((id) =>
        typeof id === "string" ? Number.parseInt(id, 10) : id,
      )
    }

    console.log("Datos formateados para enviar:", JSON.stringify(dataToSend, null, 2))
    const res = await axios.put(`${ROLES_URL}${id}/`, dataToSend)
    console.log("✅ Respuesta del servidor:", res.data)
    return res.data
  } catch (error) {
    console.error("❌ Error al actualizar rol:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Eliminar un rol - MEJORADO CON VALIDACIÓN DE USUARIOS ASOCIADOS
export const deleteRol = async (id) => {
  try {
    console.log(`🗑️ Eliminando rol con ID: ${id}`)
    console.log(`📍 URL completa: ${ROLES_URL}${id}/`)

    // Verificar que el ID sea válido
    if (!id || id === "undefined" || id === "null" || id === undefined || id === null) {
      throw new Error("ID de rol inválido o no proporcionado")
    }

    // Convertir ID a número si es string
    const numericId = typeof id === "string" ? Number.parseInt(id, 10) : id
    if (isNaN(numericId)) {
      throw new Error("ID de rol debe ser un número válido")
    }

    // NUEVA VALIDACIÓN: Verificar si el rol puede ser eliminado
    console.log(`🔍 Verificando si el rol puede ser eliminado...`)
    try {
      const checkResult = await checkRolCanBeDeleted(numericId)
      console.log(`📊 Resultado de verificación:`, checkResult)

      if (checkResult.es_admin) {
        throw new Error("No se puede eliminar el rol Administrador")
      }

      if (!checkResult.puede_eliminar) {
        const info = checkResult.usuarios_info
        const rolNombre = checkResult.rol_nombre || "este rol"
        // Mensaje de error SIMPLIFICADO: solo la cantidad total
        throw new Error(
          `No se puede eliminar el rol '${rolNombre}' porque tiene ${info.total} usuario(s) asociado(s). ` +
            "Primero debe reasignar o eliminar los usuarios que tienen este rol.",
        )
      }
    } catch (checkError) {
      // Si es un error de validación que ya contiene el mensaje personalizado, re-lanzarlo
      if (checkError.message.includes("No se puede eliminar") || checkError.message.includes("Administrador")) {
        throw checkError
      }
      // Si es un error de conexión o cualquier otro error en la verificación,
      // loguearlo y continuar con el intento de eliminación, dejando que el backend
      // maneje la validación final.
      console.log("⚠️ No se pudo verificar usuarios asociados, el backend manejará la validación final:", checkError)
    }

    console.log(`🔄 Enviando petición DELETE a: ${ROLES_URL}${numericId}/`)

    const response = await axios.delete(`${ROLES_URL}${numericId}/`, {
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
    let message = "Rol eliminado correctamente"
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
    console.error("❌ Error completo al eliminar rol:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Activar un rol
export const activarRol = async (id) => {
  try {
    // Usar el endpoint específico con validaciones
    const res = await axios.patch(`${ROLES_URL}${id}/cambiar_estado/`)
    return res.data
  } catch (error) {
    console.error("Error al activar rol:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Desactivar un rol
export const desactivarRol = async (id) => {
  try {
    // Usar el endpoint específico con validaciones
    const res = await axios.patch(`${ROLES_URL}${id}/cambiar_estado/`)
    return res.data
  } catch (error) {
    console.error("Error al desactivar rol:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Obtener todos los permisos
export const getPermisos = async () => {
  try {
    const res = await axios.get(PERMISOS_URL)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener permisos:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Obtener un permiso específico
export const getPermiso = async (id) => {
  try {
    const res = await axios.get(`${PERMISOS_URL}${id}/`)
    return res.data
  } catch (error) {
    console.error("Error al obtener permiso:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Mejorar la función getRolPermisos para ser más robusta
export const getRolPermisos = async (rolId) => {
  try {
    // Primero intentamos el endpoint específico de detalle
    try {
      const res = await axios.get(`${ROLES_URL}${rolId}/`)
      if (res.data && res.data.permisos) {
        return res.data.permisos
      }
    } catch (err) {
      console.log("Intentando obtener detalles del rol alternativo:", err)
    }

    // Si no funciona, probamos con el endpoint list_detail
    try {
      const res = await axios.get(`${ROLES_URL}list_detail/`)
      const roles = extractDataFromResponse(res)
      const rol = roles.find((r) => r.id === rolId || r.id === Number(rolId))
      if (rol && rol.permisos) {
        return rol.permisos
      }
    } catch (err) {
      console.log("Intentando obtener lista de roles detallada:", err)
    }

    // Como última opción, consultamos la relación roles-permisos
    try {
      const res = await axios.get(`${ROLES_PERMISOS_URL}by_rol/?rol_id=${rolId}`)
      const relaciones = extractDataFromResponse(res)

      // Si tenemos relaciones, obtenemos los detalles de cada permiso
      if (relaciones && relaciones.length > 0) {
        const permisosPromises = relaciones.map((rel) => {
          const permisoId = rel.permiso || rel.permiso_id
          return getPermiso(permisoId)
        })
        return await Promise.all(permisosPromises)
      }
    } catch (err) {
      console.log("Error al obtener relaciones rol-permiso:", err)
    }

    return []
  } catch (error) {
    console.error("Error al obtener permisos del rol:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Asignar un permiso a un rol
export const assignPermiso = async (rolId, permisoId) => {
  try {
    const res = await axios.post(`${ROLES_URL}${rolId}/add_permiso/`, {
      permiso_id: permisoId,
    })
    return res.data
  } catch (error) {
    console.error("Error al asignar permiso:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Eliminar un permiso de un rol
export const removePermiso = async (rolId, permisoId) => {
  try {
    const res = await axios.post(`${ROLES_URL}${rolId}/remove_permiso/`, {
      permiso_id: permisoId,
    })
    return res.data
  } catch (error) {
    console.error("Error al eliminar permiso:", error)
    throw new Error(parseAxiosError(error))
  }
}

// Añadir una nueva función para asignar permisos de manera individual
export const assignPermisosToRol = async (rolId, permisosIds) => {
  try {
    console.log(`Asignando permisos ${permisosIds} al rol ${rolId}`)

    // Primero obtenemos el rol actual para preservar sus datos
    const rol = await getRol(rolId)

    // Preparamos los datos para actualizar
    const dataToUpdate = {
      id: rolId,
      nombre: rol.nombre,
      estado: rol.estado,
      permisos_ids: permisosIds,
    }

    // Actualizamos el rol con los nuevos permisos
    return await updateRol(rolId, dataToUpdate)
  } catch (error) {
    console.error("Error al asignar permisos al rol:", error)

    // Si falla el método principal, intentamos con el endpoint específico
    try {
      console.log("Intentando método alternativo de asignación de permisos")
      const promises = permisosIds.map((permisoId) => assignPermiso(rolId, permisoId))
      await Promise.all(promises)
      return { success: true, message: "Permisos asignados correctamente" }
    } catch (secondError) {
      console.error("Error en método alternativo:", secondError)
      throw new Error(parseAxiosError(secondError))
    }
  }
}

export default {
  getRoles,
  getRol,
  createRol,
  updateRol,
  deleteRol,
  activarRol,
  desactivarRol,
  getPermisos,
  getPermiso,
  getRolPermisos,
  assignPermiso,
  removePermiso,
  assignPermisosToRol,
  checkRolCanBeDeleted,
  checkRolCanChangeEstado,
}
