import axios from "axios"

// URL base para el endpoint de novedades
const BASE_URL = "https://appweb-rxph.onrender.com/api/novedades/"

// Función para manejar diferentes formatos de respuesta de API
const extractDataFromResponse = (res) => {
  if (!res.data) return []

  // Si la respuesta es un objeto con una clave 'results' (DRF paginación)
  if (res.data.results && Array.isArray(res.data.results)) {
    return res.data.results
  }
  // Si la respuesta es un objeto con una clave 'data' o 'novedades' o 'items'
  if (Array.isArray(res.data.data)) return res.data.data
  if (Array.isArray(res.data.novedades)) return res.data.novedades
  if (Array.isArray(res.data.items)) return res.data.items

  // Si la respuesta es directamente un array
  if (Array.isArray(res.data)) return res.data

  // Si es un objeto que no tiene las estructuras anteriores,
  // y no es un objeto de paginación (sin 'count' o 'next'),
  // asumimos que es un objeto simple y lo devolvemos en un array.
  if (
    typeof res.data === "object" &&
    Object.keys(res.data).length > 0 &&
    !("count" in res.data) &&
    !("next" in res.data)
  ) {
    return [res.data]
  }

  return []
}


// Crear una nueva novedad
export const createNovedad = async (data) => {
  if (!(data instanceof FormData)) {
  const required = ["fecha", "estado", "manicurista"];
  const missing = required.filter((f) => !data[f]);
  if (missing.length > 0) {
    throw new Error(`Campos requeridos faltantes: ${missing.join(", ")}`);
  }
}
  try {
    let formData;

    if (data instanceof FormData) {
      // ya viene armado desde el componente
      formData = data;
    } else {
      // armarlo desde objeto plano
      formData = new FormData();
      formData.append("fecha", data.fecha);
      formData.append("estado", data.estado);
      formData.append("manicurista", data.manicurista);

      if (data.tipo_ausencia) formData.append("tipo_ausencia", data.tipo_ausencia);
      if (data.hora_entrada) formData.append("hora_entrada", data.hora_entrada);
      if (data.hora_salida) formData.append("hora_salida", data.hora_salida);
      if (data.hora_inicio_ausencia) formData.append("hora_inicio_ausencia", data.hora_inicio_ausencia);
      if (data.hora_fin_ausencia) formData.append("hora_fin_ausencia", data.hora_fin_ausencia);
      if (data.motivo) formData.append("motivo", data.motivo);
      if (data.estado === "vacaciones" && data.dias) formData.append("dias", data.dias);
      if (data.estado === "incapacidad" && data.archivo_soporte) formData.append("archivo_soporte", data.archivo_soporte);
      if (data.estado === "horario" && data.turno) formData.append("turno", data.turno);
    }

    console.log("📤 Datos enviados a backend (FormData):");
    for (let [k, v] of formData.entries()) {
      console.log(" ->", k, v);
    }

    const res = await axios.post(BASE_URL, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  } catch (error) {
    console.error("❌ Error al crear novedad:", error);
    throw error;
  }
};


// Anular una novedad (reemplaza el delete)
export const anularNovedad = async (id, motivo_anulacion) => {
  try {
    console.log(`🚫 Anulando novedad con ID: ${id}`)

    // Verificar que el ID sea válido
    if (!id || id === "undefined" || id === "null" || id === undefined || id === null) {
      throw new Error("ID de novedad inválido o no proporcionado")
    }

    if (!motivo_anulacion || motivo_anulacion.trim() === "") {
      throw new Error("El motivo de anulación es requerido")
    }

    // Convertir ID a número si es string
    const numericId = typeof id === "string" ? Number.parseInt(id, 10) : id
    if (isNaN(numericId)) {
      throw new Error("ID de novedad debe ser un número válido")
    }

    // Endpoint correcto en backend: PATCH /<id>/anular/
    const anularUrl = `${BASE_URL}${numericId}/anular/`
    console.log(`🔄 Enviando petición PATCH a: ${anularUrl}`)

    const response = await axios({
      method: "PATCH",
      url: anularUrl,
      data: {
        motivo_anulacion: motivo_anulacion.trim(),
      },
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("✅ Respuesta de anulación:", {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    })

    // 🔹 Importante: el backend devuelve la novedad actualizada en `response.data.data`
    return {
      success: true,
      message: response.data?.message || "Novedad anulada exitosamente",
      status: response.status,
      data: response.data?.data, // ← aquí viene la novedad ya con estado = "anulada"
    }
  } catch (error) {
    console.error(`Error al anular novedad(${id}):`, error)

    if (error.response) {
      const status = error.response.status
      const data = error.response.data

      // Crear un error más descriptivo
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


// Obtener una novedad específica
// Obtener una novedad específica por ID
export const getNovedadById = async (id) => {
  if (!id) {
    console.error("❌ getNovedadById llamado sin id");
    throw new Error("El id de la novedad es requerido");
  }

  try {
    const res = await axios.get(`${BASE_URL}${id}/`);
    return res.data;
  } catch (error) {
    console.error("Error al obtener novedad:", error);

    if (error.response) {
      console.error("Detalles del error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }

    throw error;
  }
};


// Obtener novedades por manicurista (este endpoint no existe en el backend, se usa getNovedadesConFiltros)
// Mantengo la función pero la redirijo a la función con filtros
export const getNovedadesByManicurista = async (manicuristaId) => {
  console.warn("getNovedadesByManicurista está obsoleto. Usando getNovedadesConFiltros.")
  return getNovedadesConFiltros({ manicurista: manicuristaId })
}

// Obtener novedades por fecha (este endpoint no existe en el backend, se usa getNovedadesConFiltros)
// Mantengo la función pero la redirijo a la función con filtros
export const getNovedadesByFecha = async (fecha) => {
  console.warn("getNovedadesByFecha está obsoleto. Usando getNovedadesConFiltros.")
  return getNovedadesConFiltros({ fecha_inicio: fecha, fecha_fin: fecha })
}

// Obtener novedades con filtros
export const getNovedadesConFiltros = async (filtros = {}) => {
  try {
    const params = new URLSearchParams()

    if (filtros.estado) {
      params.append("estado", filtros.estado)
    }

    if (filtros.manicurista) {
      params.append("manicurista", filtros.manicurista)
    }

    if (filtros.fecha_inicio) {
      params.append("fecha_inicio", filtros.fecha_inicio)
    }

    if (filtros.fecha_fin) {
      params.append("fecha_fin", filtros.fecha_fin)
    }

    const url = params.toString() ? `${BASE_URL}?${params.toString()}` : BASE_URL
    const res = await axios.get(url)
    return extractDataFromResponse(res)
  } catch (error) {
    console.error("Error al obtener novedades con filtros:", error)

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

// Obtener estadísticas de novedades
export const getEstadisticasNovedades = async () => {
  try {
    const res = await axios.get(`${BASE_URL}estadisticas/`)
    return res.data
  } catch (error) {
    console.error("Error al obtener estadísticas de novedades:", error)

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

// Verificar disponibilidad de horarios para citas
export const verificarDisponibilidadCitas = async (manicuristaId, fecha) => {
  try {
    const res = await axios.get(`${BASE_URL}disponibilidad_citas/`, {
      params: {
        manicurista: manicuristaId,
        fecha: fecha,
      },
    })
    return res.data
  } catch (error) {
    console.error("Error al verificar disponibilidad:", error)
    if (error.response) {
      console.error("Detalles del error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      })
      throw new Error(error.response.data.error || "Error al verificar disponibilidad.")
    }
    throw error
  }
}

// Actualizar novedad
export const updateNovedad = async (id, data) => {
  try {
    let formData;

    if (data instanceof FormData) {
      formData = data;
    } else {
      formData = new FormData();
      formData.append("fecha", data.fecha);
      formData.append("estado", data.estado);
      formData.append("manicurista", data.manicurista);

      if (data.tipo_ausencia) formData.append("tipo_ausencia", data.tipo_ausencia);
      if (data.hora_entrada) formData.append("hora_entrada", data.hora_entrada);
      if (data.hora_salida) formData.append("hora_salida", data.hora_salida);
      if (data.hora_inicio_ausencia) formData.append("hora_inicio_ausencia", data.hora_inicio_ausencia);
      if (data.hora_fin_ausencia) formData.append("hora_fin_ausencia", data.hora_fin_ausencia);
      if (data.motivo) formData.append("motivo", data.motivo);
      if (data.estado === "vacaciones" && data.dias) formData.append("dias", data.dias);
      if (data.estado === "incapacidad" && data.archivo_soporte) formData.append("archivo_soporte", data.archivo_soporte);
      if (data.estado === "horario" && data.turno) formData.append("turno", data.turno);
    }

    console.log("📤 Datos enviados a backend (FormData):");
    for (let [k, v] of formData.entries()) {
      console.log(" ->", k, v);
    }

    const res = await axios.put(`${BASE_URL}${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  } catch (error) {
    console.error(`❌ Error al actualizar novedad ${id}:`, error);
    throw error;
  }
};

export const getNovedades = async () => {
  const res = await axios.get(BASE_URL);
  return extractDataFromResponse(res);
};

export const getNovedadesPorManicurista = async (manicuristaId, fechaDesde, fechaHasta) => {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        manicurista: manicuristaId,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta
      }
    })
    return extractDataFromResponse(response)
  } catch (error) {
    console.error("❌ Error obteniendo novedades por manicurista:", error)
    throw error
  }
}



export default {
  createNovedad,
  anularNovedad,
  getNovedadById,
  getNovedadesByManicurista, // Mantener por compatibilidad, pero redirige
  getNovedadesByFecha, // Mantener por compatibilidad, pero redirige
  getNovedadesConFiltros,
  getEstadisticasNovedades,
  verificarDisponibilidadCitas,
  updateNovedad,
  getNovedades,
  getNovedadesPorManicurista,
}
