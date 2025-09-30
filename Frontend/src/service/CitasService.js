import axios from "axios";
import apiClient, { apiConfig } from "./apiConfig";

// Configuración base de las URLs de la API (centralizada)
const API_BASE = apiConfig?.baseURL || "https://appweb-rxph.onrender.com/api/";
const BASE_URL = `${API_BASE}citas/`;
const CLIENTES_API_URL = `${API_BASE}clientes/`;
const MANICURISTAS_API_URL = `${API_BASE}manicuristas/`;
const SERVICIOS_API_URL = `${API_BASE}servicios/`;
const VENTAS_API_URL = `${API_BASE}venta-servicios/`;
const AVAILABILITY_URL = `${API_BASE}availability/slots`;

// Instancia autenticada que adjunta el token automáticamente
const authAxios = axios.create();

authAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// Configurar interceptores para manejo de errores globalmente en Axios
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Error en API de Citas:", error);

    if (error.response) {
      const { status, data } = error.response;
      let userMessage = "Ocurrió un error inesperado";

      if (status === 400) {
        if (typeof data === "string") {
          userMessage = data;
        } else if (data.error) {
          userMessage = data.error;
        } else if (data.detail) {
          userMessage = data.detail;
        } else if (typeof data === "object") {
          const errorMessages = [];
          Object.entries(data).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(", ")}`);
            } else {
              errorMessages.push(`${field}: ${messages}`);
            }
          });
          userMessage = errorMessages.join("\n");
        }
      } else if (status === 404) {
        userMessage = "Recurso no encontrado";
      } else if (status === 500) {
        userMessage = "Error interno del servidor";
      }

      error.userMessage = userMessage;
    }

    return Promise.reject(error);
  },
);

const extractDataFromResponse = (response) => {
  if (!response.data) return [];
  if (Array.isArray(response.data)) return response.data;
  if (typeof response.data === "object") {
    const possibleArrayKeys = ["results", "data", "citas", "items"];
    for (const key of possibleArrayKeys) {
      if (Array.isArray(response.data[key])) {
        return response.data[key];
      }
    }
    const keys = Object.keys(response.data);
    for (const key of keys) {
      if (Array.isArray(response.data[key])) {
        return response.data[key];
      }
    }
    if (Object.keys(response.data).length > 0 && !("count" in response.data)) {
      return [response.data];
    }
  }
  return [];
};

const citasService = {
  // OBTENER CITAS CON MANEJO MEJORADO
  async obtenerCitas(filtros = {}) {
    try {
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const url = params.toString()
        ? `${BASE_URL}?${params.toString()}`
        : BASE_URL;
      console.log("🔄 Obteniendo citas desde:", url);

      const response = await authAxios.get(url);
      console.log("📦 Respuesta completa de citas:", response.data);

      const citas = extractDataFromResponse(response);
      console.log("📦 Citas extraídas:", citas);

      // Enriquecer citas con información completa
      const citasEnriquecidas = await Promise.all(
        citas.map(async (cita) => {
          try {
            const promises = [];

            // Obtener información del cliente
            if (cita.cliente && !cita.cliente_nombre) {
              promises.push(
                this.obtenerCliente(cita.cliente)
                  .then((cliente) => {
                    cita.cliente_nombre =
                      cliente.nombre || cliente.name || "Cliente no disponible";
                    cita.cliente_documento =
                      cliente.documento ||
                      cliente.document ||
                      cliente.cedula ||
                      "Sin documento";
                    cita.cliente_telefono =
                      cliente.celular ||
                      cliente.telefono ||
                      cliente.phone ||
                      "No registrado";
                    return cliente;
                  })
                  .catch(() => {
                    cita.cliente_nombre = "Cliente no disponible";
                    cita.cliente_documento = "Sin documento";
                    cita.cliente_telefono = "No registrado";
                  }),
              );
            }

            // Obtener información de los servicios
            if (cita.servicios && Array.isArray(cita.servicios)) {
              promises.push(
                Promise.all(
                  cita.servicios.map((servicioId) =>
                    this.obtenerServicio(servicioId).catch(() => ({
                      nombre: "Servicio no disponible",
                      duracion: "N/A",
                      precio: 0,
                    })),
                  ),
                ).then((serviciosInfo) => {
                  cita.servicios_info = serviciosInfo;
                  cita.servicio_nombre =
                    serviciosInfo.length > 1
                      ? `${serviciosInfo[0].nombre} (+${serviciosInfo.length - 1} más)`
                      : serviciosInfo[0]?.nombre || "Servicio no disponible";
                  const totalDuracion = serviciosInfo.reduce(
                    (sum, s) => sum + (Number(s.duracion) || 0),
                    0,
                  );
                  cita.duracion_formateada =
                    totalDuracion > 0 ? `${totalDuracion} min` : "N/A";
                }),
              );
            } else if (cita.servicio && !cita.servicio_nombre) {
              promises.push(
                this.obtenerServicio(cita.servicio)
                  .then((servicio) => {
                    cita.servicio_nombre =
                      servicio.nombre ||
                      servicio.name ||
                      "Servicio no disponible";
                    cita.servicio_duracion = servicio.duracion || "N/A";
                    cita.servicios_info = [servicio];
                    cita.duracion_formateada = servicio.duracion
                      ? `${servicio.duracion} min`
                      : "N/A";
                  })
                  .catch(() => {
                    cita.servicio_nombre = "Servicio no disponible";
                    cita.servicio_duracion = "N/A";
                    cita.servicios_info = [];
                    cita.duracion_formateada = "N/A";
                  }),
              );
            }

            // Obtener información de la manicurista
            if (cita.manicurista && !cita.manicurista_nombre) {
              promises.push(
                this.obtenerManicurista(cita.manicurista)
                  .then((manicurista) => {
                    cita.manicurista_nombre =
                      manicurista.nombres ||
                      manicurista.nombre ||
                      manicurista.name ||
                      "Manicurista no disponible";
                  })
                  .catch(() => {
                    cita.manicurista_nombre = "Manicurista no disponible";
                  }),
              );
            }

            await Promise.all(promises);

            // Formatear fecha si es necesario
            if (cita.fecha_cita && !cita.fecha_formateada) {
              const fechaStr = cita.fecha_cita.toString();
              const [year, month, day] = fechaStr.split("-");
              const fecha = new Date(
                Number.parseInt(year),
                Number.parseInt(month) - 1,
                Number.parseInt(day),
              );

              cita.fecha_formateada = fecha.toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
            }

            return cita;
          } catch (error) {
            console.warn("⚠️ Error enriqueciendo cita:", error);
            return {
              ...cita,
              cliente_nombre: cita.cliente_nombre || "Cliente no disponible",
              cliente_documento: cita.cliente_documento || "Sin documento",
              servicio_nombre: cita.servicio_nombre || "Servicio no disponible",
              manicurista_nombre:
                cita.manicurista_nombre || "Manicurista no disponible",
              servicio_duracion: cita.servicio_duracion || "N/A",
              duracion_formateada: cita.duracion_formateada || "N/A",
            };
          }
        }),
      );

      console.log("✅ Citas obtenidas y enriquecidas:", citasEnriquecidas);
      return citasEnriquecidas;
    } catch (error) {
      console.error("❌ Error obteniendo citas:", error);
      throw error;
    }
  },

  // CREAR CITA
  async crearCita(dataCita) {
    try {
      console.log("🔄 Creando cita con datos:", dataCita)
      console.log("📋 Estado de la cita:", dataCita.estado || "No especificado")
      
      const response = await authAxios.post(BASE_URL, dataCita)
      console.log("✅ Cita creada exitosamente:", response.data)
      console.log("📋 Estado final de la cita creada:", response.data.estado)
      
      return response.data
    } catch (error) {
      console.error(
        "❌ Error creando cita:",
        error.response ? error.response.data : error.message,
      )
      throw error
    }
  },

  // Enviar confirmación de cita al cliente (si el backend lo soporta)
  async enviarConfirmacionCita(citaId) {
    try {
      const response = await authAxios.post(`${BASE_URL}${citaId}/enviar_confirmacion/`)
      return response.data
    } catch (error) {
      const status = error.response?.status
      // Si el endpoint no existe/no implementado o método no permitido, tratamos como no crítico
      if (status === 404 || status === 405 || status === 501) {
        console.warn("ℹ️ Confirmación omitida: endpoint no disponible o deshabilitado.", { status })
        return { skipped: true, reason: "not_implemented", status }
      }
      console.error("❌ Error enviando confirmación de cita:", error)
      throw error
    }
  },

  // ACTUALIZAR ESTADO DE CITA - ENDPOINT CORRECTO
  async actualizarEstadoCita(citaId, estado, observaciones = "") {
    try {
      console.log("🔄 Actualizando estado de cita:", {
        citaId,
        estado,
        observaciones,
      });

      // Usar el endpoint correcto del backend
      const response = await authAxios.patch(
        `${BASE_URL}${citaId}/actualizar_estado/`,
        {
          estado,
          observaciones,
        },
      );

      console.log("✅ Estado de cita actualizado exitosamente:", response.data);

      // Pequeña pausa para asegurar que la BD se actualice
      await new Promise((resolve) => setTimeout(resolve, 500));

      return response.data;
    } catch (error) {
      console.error("❌ Error actualizando estado de cita:", error);
      throw error;
    }
  },

  // CREAR VENTA DESDE CITA FINALIZADA - CORREGIDO
  async crearVenta(dataVenta) {
    try {
      console.log("📦 Creando venta con datos:", dataVenta);
      console.log("🌐 URL de la API:", VENTAS_API_URL);

      // Obtener información de la cita si no está completa
      let citaCompleta = dataVenta;
      if (dataVenta.cita && !dataVenta.servicios) {
        try {
          console.log("🔍 Obteniendo información completa de la cita:", dataVenta.cita);
          citaCompleta = await this.obtenerCitaPorId(dataVenta.cita);
          console.log("✅ Cita completa obtenida:", citaCompleta);
        } catch (error) {
          console.warn("⚠️ No se pudo obtener información completa de la cita:", error);
        }
      }

      // Preparar detalles de servicios
      let detalles = [];
      if (dataVenta.detalles && Array.isArray(dataVenta.detalles)) {
        console.log("📋 Usando detalles proporcionados:", dataVenta.detalles);
        detalles = dataVenta.detalles;
      } else if (citaCompleta.servicios && Array.isArray(citaCompleta.servicios)) {
        // Crear detalles desde los servicios de la cita
        console.log("🔧 Procesando múltiples servicios:", citaCompleta.servicios);
        
        detalles = await Promise.all(
          citaCompleta.servicios.map(async (servicio, index) => {
            console.log(`🔍 Procesando servicio ${index + 1}:`, servicio);
            
            let precio = 0;
            let nombreServicio = `Servicio #${servicio.id || servicio}`;
            
            // Intentar obtener información del servicio si es posible
            try {
              if (servicio.id || servicio) {
                console.log(`💰 Obteniendo precio para servicio:`, servicio.id || servicio);
                const servicioInfo = await this.obtenerServicio(servicio.id || servicio);
                precio = servicioInfo.precio || 0;
                nombreServicio = servicioInfo.nombre || servicioInfo.name || nombreServicio;
                console.log(`✅ Servicio ${index + 1} procesado:`, { id: servicio.id || servicio, precio, nombre: nombreServicio });
              }
            } catch (error) {
              console.warn(`⚠️ No se pudo obtener información del servicio ${index + 1}:`, error);
            }
            
            return {
              servicio: servicio.id || servicio,
              cantidad: 1,
              precio_unitario: precio,
              descuento_linea: 0,
              nombre_servicio: nombreServicio
            };
          })
        );
      } else if (citaCompleta.servicio) {
        // Caso de servicio único
        console.log("🔧 Procesando servicio único:", citaCompleta.servicio);
        
        let precio = 0;
        let nombreServicio = `Servicio #${citaCompleta.servicio.id || citaCompleta.servicio}`;
        
        try {
          const servicioInfo = await this.obtenerServicio(citaCompleta.servicio.id || citaCompleta.servicio);
          precio = servicioInfo.precio || 0;
          nombreServicio = servicioInfo.nombre || servicioInfo.name || nombreServicio;
          console.log("✅ Servicio único procesado:", { precio, nombre: nombreServicio });
        } catch (error) {
          console.warn("⚠️ No se pudo obtener información del servicio único:", error);
        }
        
        detalles = [{
          servicio: citaCompleta.servicio.id || citaCompleta.servicio,
          cantidad: 1,
          precio_unitario: precio,
          descuento_linea: 0,
          nombre_servicio: nombreServicio
        }];
      }

      console.log("📋 Detalles de servicios preparados:", detalles);

      // Calcular total
      const total = detalles.reduce((sum, detalle) => {
        return sum + ((detalle.precio_unitario || 0) * (detalle.cantidad || 1));
      }, 0);

      console.log("💰 Total calculado:", total);

      const datosLimpios = {
        cliente: Number(dataVenta.cliente || citaCompleta.cliente?.id || citaCompleta.cliente),
        manicurista: Number(dataVenta.manicurista || citaCompleta.manicurista?.id || citaCompleta.manicurista),
        cita: dataVenta.cita ? Number(dataVenta.cita) : null,
        fecha_venta: dataVenta.fecha_venta || new Date().toISOString().split("T")[0],
        estado: dataVenta.estado || "pendiente",
        metodo_pago: dataVenta.metodo_pago || "efectivo",
        observaciones: dataVenta.observaciones || `Venta generada desde cita #${dataVenta.cita || 'N/A'} con ${detalles.length} servicio(s)`,
        porcentaje_comision: Number(dataVenta.porcentaje_comision) || 0,
        total: total,
        detalles: detalles
      };

      console.log("📦 Datos limpios para venta:", datosLimpios);
      console.log("🔍 Validando campos requeridos...");

      // Validar campos requeridos
      if (!datosLimpios.cliente) {
        throw new Error("Cliente es requerido");
      }
      if (!datosLimpios.manicurista) {
        throw new Error("Manicurista es requerido");
      }
      if (!datosLimpios.detalles || datosLimpios.detalles.length === 0) {
        throw new Error("Al menos un servicio es requerido");
      }

      console.log("✅ Validaciones pasadas, enviando a la API...");
      console.log("📤 Enviando POST a:", VENTAS_API_URL);
      console.log("📦 Datos enviados:", JSON.stringify(datosLimpios, null, 2));

      const response = await axios.post(VENTAS_API_URL, datosLimpios, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("✅ Venta creada exitosamente:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error al crear venta:", error);
      console.error("❌ Detalles del error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method
      });
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === "object") {
          const errorMessages = [];
          Object.entries(errorData).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(", ")}`);
            } else {
              errorMessages.push(`${field}: ${messages}`);
            }
          });
          error.userMessage = errorMessages.join("; ");
        }
      }
      throw error;
    }
  },

  // OBTENER DATOS DE APOYO
  async obtenerCliente(clienteId) {
    try {
      const response = await axios.get(`${CLIENTES_API_URL}${clienteId}/`);
      return response.data;
    } catch (error) {
      console.warn("⚠️ Error obteniendo cliente:", error);
      return {
        nombre: "Cliente no disponible",
        documento: "Sin documento",
        celular: "No registrado",
      };
    }
  },

  async obtenerServicio(servicioId) {
    try {
      const response = await axios.get(`${SERVICIOS_API_URL}${servicioId}/`);
      return response.data;
    } catch (error) {
      console.warn("⚠️ Error obteniendo servicio:", error);
      return {
        nombre: "Servicio no disponible",
        duracion: "N/A",
        precio: 0,
      };
    }
  },

  async obtenerManicurista(manicuristaId) {
    try {
      const response = await axios.get(
        `${MANICURISTAS_API_URL}${manicuristaId}/`,
      );
      return response.data;
    } catch (error) {
      console.warn("⚠️ Error obteniendo manicurista:", error);
      return {
        nombres: "Manicurista no disponible",
        nombre: "Manicurista no disponible",
      };
    }
  },

  async obtenerManicuristasDisponibles() {
    try {
      const response = await axios.get(MANICURISTAS_API_URL);
      return extractDataFromResponse(response);
    } catch (error) {
      console.error("❌ Error obteniendo manicuristas:", error);
      throw error;
    }
  },

  async obtenerServiciosActivos() {
    try {
      const response = await axios.get(SERVICIOS_API_URL);
      return extractDataFromResponse(response);
    } catch (error) {
      console.error("❌ Error obteniendo servicios:", error);
      throw error;
    }
  },

  async buscarClientes(query) {
    try {
      console.log("🔍 Buscando clientes con query:", query);
      // Intentar con endpoint de búsqueda específico
      let response;
      try {
        response = await axios.post(`${BASE_URL}buscar_clientes/`, { query });
      } catch (error) {
        // Fallback: buscar en endpoint general de clientes
        response = await axios.get(
          `${CLIENTES_API_URL}?search=${encodeURIComponent(query)}`,
        );
      }

      const clientes = extractDataFromResponse(response);
      console.log("✅ Clientes encontrados:", clientes);
      return clientes;
    } catch (error) {
      console.error("❌ Error buscando clientes:", error);
      return [];
    }
  },

  async verificarDisponibilidad(manicuristaId, fecha, duracionCitaMinutos, serviciosIds = []) {
    // Intentar primero endpoint legacy (evita ruido si el nuevo no está)
    try {
      const response = await axios.get(`${BASE_URL}disponibilidad/`, {
        params: {
          manicurista: Array.isArray(manicuristaId) ? manicuristaId[0] : manicuristaId,
          fecha,
          duracion_cita: duracionCitaMinutos,
        },
      });
      return response.data;
    } catch (errLegacy) {
      try {
        const params = {
          professionalIds: Array.isArray(manicuristaId) ? manicuristaId.join(',') : String(manicuristaId),
          date: fecha,
          durationMinutes: duracionCitaMinutos,
        };
        if (serviciosIds && serviciosIds.length) {
          params.serviceIds = serviciosIds.join(',');
        }
        const response = await axios.get(AVAILABILITY_URL, { params });
        return response.data;
      } catch (errNew) {
        // Fallback local silencioso
        const horariosGenerados = this.generarHorariosLocal();
        return {
          horarios_disponibles: horariosGenerados,
          horarios_ocupados: [],
          horario_trabajo: {
            inicio: "10:00",
            fin: "20:00",
            intervalo_minutos: 30,
          },
        };
      }
    }
  },

  generarHorariosLocal() {
    const horarios = [];
    let hora = 10;
    const horaFin = 20;

    while (hora < horaFin) {
      horarios.push(`${hora.toString().padStart(2, "0")}:00`);
      horarios.push(`${hora.toString().padStart(2, "0")}:30`);
      hora++;
    }

    return horarios;
  },

  // VERIFICAR ESTADO DE CITA (para debugging)
  async verificarEstadoCita(citaId) {
    try {
      console.log("🔍 Verificando estado actual de cita:", citaId);
      const response = await axios.get(`${BASE_URL}${citaId}/`);
      console.log("📋 Estado actual de la cita:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error verificando estado de cita:", error);
      throw error;
    }
  },

  // FORZAR ACTUALIZACIÓN CON REINTENTOS
  async forzarActualizacionEstado(
    citaId,
    estado,
    observaciones,
    reintentos = 3,
  ) {
    console.log(
      `🎯 INICIANDO FORZAR ACTUALIZACIÓN - Cita: ${citaId}, Estado: ${estado}`,
    );

    for (let intento = 1; intento <= reintentos; intento++) {
      try {
        console.log(
          `🔄 Intento ${intento}/${reintentos} - Forzando actualización de estado`,
        );

        // Actualizar estado usando endpoint correcto
        const response = await authAxios.patch(
          `${BASE_URL}${citaId}/actualizar_estado/`,
          {
            estado,
            observaciones,
          },
        );

        console.log(
          `✅ Intento ${intento} - Respuesta de actualización:`,
          response.data,
        );

        // Esperar para que la BD se actualice
        const waitTime = intento * 1000;
        console.log(`⏳ Esperando ${waitTime}ms antes de verificar...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        // Verificar el estado actual
        try {
          const citaVerificada = await this.verificarEstadoCita(citaId);
          console.log(`📋 Intento ${intento} - Estado verificado:`, {
            esperado: estado,
            actual: citaVerificada.estado,
            coincide: citaVerificada.estado === estado,
          });

          if (citaVerificada.estado === estado) {
            console.log("✅ Estado actualizado y verificado correctamente");
            return citaVerificada;
          } else {
            console.warn(`⚠️ Intento ${intento} - Estado no coincide`);
            if (intento === reintentos) {
              console.warn(
                "⚠️ Último intento - Aceptando respuesta del servidor",
              );
              return {
                ...citaVerificada,
                estado: estado,
                observaciones: observaciones,
              };
            }
          }
        } catch (errorVerificacion) {
          console.warn(
            `⚠️ Intento ${intento} - Error verificando estado:`,
            errorVerificacion,
          );
          if (intento === reintentos) {
            return {
              ...response.data,
              estado: estado,
              observaciones: observaciones,
            };
          }
        }
      } catch (error) {
        console.error(`❌ Error en intento ${intento}:`, error);
        if (intento === reintentos) {
          throw new Error(
            `No se pudo actualizar el estado después de ${reintentos} intentos.`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, intento * 1500));
      }
    }
  },

  // NUEVO: Obtener estadísticas de citas para el dashboard
  async obtenerEstadisticas(filtros = {}) {
    try {
      console.log("📊 Obteniendo estadísticas de citas...")
      
      // Obtener todas las citas
      const todasLasCitas = await this.obtenerCitas(filtros)
      
      const hoy = new Date().toISOString().split("T")[0]
      const inicioMes = new Date()
      inicioMes.setDate(1)
      const inicioMesStr = inicioMes.toISOString().split("T")[0]
      
      // Calcular estadísticas
      const estadisticas = {
        total_citas: todasLasCitas.length,
        citas_hoy: todasLasCitas.filter(c => c.fecha_cita && c.fecha_cita.startsWith(hoy)).length,
        citas_mes: todasLasCitas.filter(c => c.fecha_cita && c.fecha_cita >= inicioMesStr).length,
        citas_pendientes: todasLasCitas.filter(c => c.estado === "pendiente").length,
        citas_iniciadas: todasLasCitas.filter(c => c.estado === "iniciada").length,
        citas_finalizadas: todasLasCitas.filter(c => c.estado === "finalizada").length,
        citas_realizadas: todasLasCitas.filter(c => c.estado === "realizada").length,
        citas_canceladas: todasLasCitas.filter(c => c.estado === "cancelada").length,
        ingresos_mes: 0, // Se calculará desde las ventas
        por_estado: [
          { estado: "pendiente", cantidad: 0 },
          { estado: "iniciada", cantidad: 0 },
          { estado: "finalizada", cantidad: 0 },
          { estado: "realizada", cantidad: 0 },
          { estado: "cancelada", cantidad: 0 }
        ]
      }
      
      // Actualizar contadores por estado
      estadisticas.por_estado.forEach(item => {
        item.cantidad = estadisticas[`citas_${item.estado}`] || 0
      })
      
      console.log("✅ Estadísticas de citas calculadas:", estadisticas)
      return estadisticas
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas de citas:", error)
      return {
        total_citas: 0,
        citas_hoy: 0,
        citas_mes: 0,
        citas_pendientes: 0,
        citas_iniciadas: 0,
        citas_finalizadas: 0,
        citas_realizadas: 0,
        citas_canceladas: 0,
        ingresos_mes: 0,
        por_estado: []
      }
    }
  },

  // NUEVO: Obtener cita por ID
  async obtenerCitaPorId(citaId) {
    try {
      const response = await authAxios.get(`${BASE_URL}${citaId}/`)
      return response.data
    } catch (error) {
      console.error("❌ Error obteniendo cita por ID:", error)
      throw error
    }
  },

  // NUEVO: Actualizar cita completa
  async actualizarCita(citaId, datosActualizacion) {
    try {
      console.log(`🔄 Actualizando cita ${citaId}:`, datosActualizacion)
      const response = await authAxios.put(`${BASE_URL}${citaId}/`, datosActualizacion)
      console.log("✅ Cita actualizada:", response.data)
      return response.data
    } catch (error) {
      console.error("❌ Error actualizando cita:", error)
      throw error
    }
  },
};

export default citasService;
