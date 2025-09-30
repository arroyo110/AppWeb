import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaEye,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaTimes,
  FaCheck,
  FaUserTag,
  FaShieldAlt,
  FaExclamationTriangle,
  FaExclamationCircle,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import {
  getRoles,
  createRol,
  updateRol,
  deleteRol,
  activarRol,
  desactivarRol,
  getPermisos,
  getRolPermisos,
  checkRolCanChangeEstado,
} from "../service/RolesService";
import PermissionWrapper from "../components/PermissionWrapper";
import permisosService from "../service/permisosService";
import "../styles/Admin.css";
import "../styles/modals/RolesModal.css";

const Roles = () => {
  // Estados para manejar los datos
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [permisosPorModulos, setPermisosPorModulos] = useState({});
  const [modulos, setModulos] = useState([]);
  const [acciones, setAcciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para el formulario
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState("create"); // create, edit, view
  const [formData, setFormData] = useState({
    nombre: "",
    estado: "activo",
    permisos_ids: [],
  });
  const [formErrors, setFormErrors] = useState({});

  // Estados para filtrado y ordenamiento
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "nombre",
    direction: "asc",
  });

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Estados para confirmaciones
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [rolToDelete, setRolToDelete] = useState(null);
  const [currentRolForPermisos, setCurrentRolForPermisos] = useState(null);
  const [selectedPermisos, setSelectedPermisos] = useState([]);
  const [availablePermisos, setAvailablePermisos] = useState([]);
  const [permisoSearchTerm, setPermisoSearchTerm] = useState("");

  // Estado para almacenar el conteo de permisos por rol
  const [permisosCountByRol, setPermisosCountByRol] = useState({});

  // Agregar estado para controlar acciones duplicadas
  const [actionTimeouts, setActionTimeouts] = useState(new Set());

    // Función mejorada para mostrar notificaciones con react-hot-toast
  const showNotification = (message, type = "success") => {
    const notificationKey = `${message}-${type}`

    // Evitar notificaciones duplicadas
    if (actionTimeouts.has(notificationKey)) {
      return
    }

    // Marcar como activa
    setActionTimeouts((prev) => new Set([...prev, notificationKey]))

    // Mostrar notificación según el tipo
    switch (type) {
      case "success":
        toast.success(message, {
          duration: 2000, // Reducido a 2 segundos
          position: "top-right",
          style: {
            background: "#10b981",
            color: "#fff",
            fontWeight: "500",
          },
          iconTheme: {
            primary: "#fff",
            secondary: "#10b981",
          },
        })
        break
      case "error":
        toast.error(message, {
          duration: 2000, // Reducido a 3 segundos
          position: "top-right",
          style: {
            background: "#ef4444",
            color: "#fff",
            fontWeight: "500",
          },
          iconTheme: {
            primary: "#fff",
            secondary: "#ef4444",
          },
        })
        break
      case "warning":
        toast(message, {
          duration: 4000,
          position: "top-right",
          icon: "⚠️",
          style: {
            background: "#f59e0b",
            color: "#fff",
            fontWeight: "500",
          },
        })
        break
      case "info":
        toast(message, {
          duration: 4000,
          position: "top-right",
          icon: "ℹ️",
          style: {
            background: "#3b82f6",
            color: "#fff",
            fontWeight: "500",
          },
        })
        break
      default:
        toast(message)
    }

    // Liberar después de 2 segundos (esto es para el control de duplicados, no la duración del toast)
    setTimeout(() => {
      setActionTimeouts((prev) => {
        const newSet = new Set(prev)
        newSet.delete(notificationKey)
        return newSet
      })
    }, 2000)
  }

  // Verificar si un rol es Admin
  const isAdminRole = (rol) => {
    return rol.nombre?.toLowerCase() === "administrador";
  };

  // Cargar datos iniciales
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const rolesData = await getRoles();
      console.log("Roles cargados:", rolesData);
      setRoles(rolesData);

      // Cargar el conteo de permisos para cada rol
      await loadPermisosCount(rolesData);
      setError(null);
    } catch (err) {
      setError("Error al cargar los roles. Por favor, intente nuevamente.");
      console.error("Error al cargar roles:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar el conteo de permisos para cada rol
  const loadPermisosCount = async (rolesData) => {
    try {
      const countMap = {};

      // Para cada rol, obtener sus permisos y guardar el conteo
      for (const rol of rolesData) {
        try {
          const rolPermisos = await getRolPermisos(rol.id);
          countMap[rol.id] = rolPermisos.length;
        } catch (error) {
          console.error(
            `Error al obtener permisos para el rol ${rol.id}:`,
            error,
          );
          countMap[rol.id] = 0;
        }
      }

      console.log("Conteo de permisos por rol:", countMap);
      setPermisosCountByRol(countMap);
    } catch (error) {
      console.error("Error al cargar conteo de permisos:", error);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [rolesData, permisosData, permisosPorModulosData] = await Promise.all([
          getRoles(),
          getPermisos(),
          permisosService.obtenerPermisosPorModulos(),
        ]);

        console.log("Roles cargados:", rolesData);
        console.log("Permisos cargados:", permisosData);
        console.log("Permisos por módulos:", permisosPorModulosData);

        setRoles(rolesData);
        setPermisos(permisosData);
        setPermisosPorModulos(permisosPorModulosData);

        // Cargar el conteo de permisos para cada rol
        await loadPermisosCount(rolesData);
        setError(null);
      } catch (err) {
        setError("Error al cargar los datos. Por favor, intente nuevamente.");
        console.error("Error al cargar datos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Aplicar límites de caracteres según el campo
    let processedValue = value;
    if (name === "nombre" && value.length > 50) {
      processedValue = value.slice(0, 50);
    }

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : processedValue,
    });

    // Validar el campo cuando cambia
    validateField(name, type === "checkbox" ? checked : processedValue);
  };

  // Manejar cambios en la selección de permisos (ahora también por click en el item)
  const handlePermisoToggle = (permisoId) => {
    if (formMode === "view") return; // No permitir cambios en modo vista

    setSelectedPermisos((prev) => {
      if (prev.includes(permisoId)) {
        return prev.filter((id) => id !== permisoId);
      } else {
        return [...prev, permisoId];
      }
    });
  };

  // Manejar cambios en la selección de permisos por módulo y acción
  const handlePermisoModuloToggle = (modulo, accion) => {
    if (formMode === "view") return; // No permitir cambios en modo vista

    const permiso = permisosPorModulos[modulo]?.acciones[accion];
    if (!permiso) return;

    setSelectedPermisos((prev) => {
      if (prev.includes(permiso.id)) {
        return prev.filter((id) => id !== permiso.id);
      } else {
        return [...prev, permiso.id];
      }
    });
  };

  // Seleccionar todos los permisos de un módulo
  const handleSelectAllModulo = (modulo) => {
    if (formMode === "view") return;

    const moduloData = permisosPorModulos[modulo];
    if (!moduloData) return;

    const permisosModulo = Object.values(moduloData.acciones).map(p => p.id);
    setSelectedPermisos((prev) => {
      const nuevosPermisos = [...prev];
      permisosModulo.forEach(permisoId => {
        if (!nuevosPermisos.includes(permisoId)) {
          nuevosPermisos.push(permisoId);
        }
      });
      return nuevosPermisos;
    });
  };

  // Deseleccionar todos los permisos de un módulo
  const handleDeselectAllModulo = (modulo) => {
    if (formMode === "view") return;

    const moduloData = permisosPorModulos[modulo];
    if (!moduloData) return;

    const permisosModulo = Object.values(moduloData.acciones).map(p => p.id);
    setSelectedPermisos((prev) => {
      return prev.filter(id => !permisosModulo.includes(id));
    });
  };

  // Verificar si todos los permisos de un módulo están seleccionados
  const isModuloFullySelected = (modulo) => {
    const moduloData = permisosPorModulos[modulo];
    if (!moduloData) return false;

    const permisosModulo = Object.values(moduloData.acciones).map(p => p.id);
    return permisosModulo.every(id => selectedPermisos.includes(id));
  };

  // Verificar si algunos permisos de un módulo están seleccionados
  const isModuloPartiallySelected = (modulo) => {
    const moduloData = permisosPorModulos[modulo];
    if (!moduloData) return false;

    const permisosModulo = Object.values(moduloData.acciones).map(p => p.id);
    return permisosModulo.some(id => selectedPermisos.includes(id));
  };

  // Seleccionar todos los permisos
  const handleSelectAllPermisos = () => {
    if (formMode === "view") return;

    const filteredPermisos = availablePermisos.filter((permiso) =>
      permiso.nombre.toLowerCase().includes(permisoSearchTerm.toLowerCase()),
    );
    const allIds = filteredPermisos.map((p) => p.id);
    setSelectedPermisos(allIds);
  };

  // Deseleccionar todos los permisos
  const handleDeselectAllPermisos = () => {
    if (formMode === "view") return;
    setSelectedPermisos([]);
  };

  // Validar un campo específico
  const validateField = (fieldName, value) => {
    const errors = { ...formErrors };

    switch (fieldName) {
      case "nombre":
        if (!value.trim()) {
          errors.nombre = "El nombre es requerido";
        } else if (value.trim().length < 3) {
          errors.nombre = "El nombre debe tener al menos 3 caracteres";
        } else if (value.trim().length > 50) {
          errors.nombre = "El nombre no puede exceder los 50 caracteres";
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,50}$/.test(value)) {
          errors.nombre = "El nombre solo puede contener letras y espacios";
        } else {
          delete errors.nombre;
        }
        break;
      default:
        break;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validar formulario completo
  const validateForm = () => {
    const fields = ["nombre"];
    let isValid = true;
    const newErrors = {};

    fields.forEach((field) => {
      if (!validateField(field, formData[field])) {
        isValid = false;
        newErrors[field] = formErrors[field];
      }
    });

    setFormErrors(newErrors);
    return isValid;
  };

  // Abrir formulario para crear rol
  const handleOpenCreateForm = () => {
    setFormData({
      nombre: "",
      estado: "activo",
      permisos_ids: [],
    });
    setFormErrors({});
    setSelectedPermisos([]);
    setAvailablePermisos(permisos);
    setPermisoSearchTerm("");
    setFormMode("create");
    setShowForm(true);
  };

  // Abrir formulario para editar rol
  const handleOpenEditForm = async (rol) => {
    // Verificar si es el rol Admin
    if (isAdminRole(rol)) {
      showNotification("No se puede editar el rol Admin", "error");
      return;
    }

    try {
      setLoading(true);

      // Obtener los permisos actuales del rol
      const rolPermisos = await getRolPermisos(rol.id);
      const permisosIds = rolPermisos.map((p) => p.id);

      setFormData({
        id: rol.id,
        nombre: rol.nombre || "",
        estado: rol.estado || "activo",
        permisos_ids: permisosIds,
      });

      // Establecer los permisos seleccionados
      setSelectedPermisos(permisosIds);

      // Asegurarse de que tenemos todos los permisos disponibles
      let allPermisos = permisos;
      if (permisos.length === 0) {
        try {
          allPermisos = await getPermisos();
          setPermisos(allPermisos);
        } catch (error) {
          console.error("Error al obtener todos los permisos:", error);
        }
      }

      setAvailablePermisos(allPermisos);
      setCurrentRolForPermisos(rol);
      setPermisoSearchTerm("");
      setFormErrors({});
      setFormMode("edit");
      setShowForm(true);
    } catch (err) {
      console.error("Error al preparar edición del rol:", err);
      showNotification(
        "Error al cargar los datos del rol para editar",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // Abrir vista de detalles (reutilizando el modal de edición)
  const handleOpenDetails = async (rol) => {
    try {
      setLoading(true);

      // Obtener los permisos asociados al rol
      const rolPermisos = await getRolPermisos(rol.id);
      const permisosIds = rolPermisos.map((p) => p.id);

      setFormData({
        id: rol.id,
        nombre: rol.nombre || "",
        estado: rol.estado || "activo",
        permisos_ids: permisosIds,
      });

      // Establecer los permisos seleccionados
      setSelectedPermisos(permisosIds);

      // Asegurarse de que tenemos todos los permisos disponibles
      let allPermisos = permisos;
      if (permisos.length === 0) {
        try {
          allPermisos = await getPermisos();
          setPermisos(allPermisos);
        } catch (error) {
          console.error("Error al obtener todos los permisos:", error);
        }
      }

      setAvailablePermisos(allPermisos);
      setCurrentRolForPermisos(rol);
      setPermisoSearchTerm("");
      setFormErrors({});
      setFormMode("view");
      setShowForm(true);
    } catch (err) {
      console.error("Error al cargar detalles del rol:", err);
      showNotification("Error al cargar los detalles del rol", "error");
    } finally {
      setLoading(false);
    }
  };

  // Actualizar rol en el estado local
  const updateRolInState = (updatedRol) => {
    setRoles((prevRoles) => {
      return prevRoles.map((rol) => {
        if (rol.id === updatedRol.id) {
          return {
            ...rol,
            ...updatedRol,
          };
        }
        return rol;
      });
    });
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar formulario
    if (!validateForm()) {
      return; // Los errores ya se muestran en el formulario
    }

    try {
      setLoading(true);

      // Crear una copia del formData para manipulación
      const formDataToSend = { ...formData };

      // Si estamos en modo edición, incluir los permisos seleccionados
      if (formMode === "edit") {
        formDataToSend.permisos_ids = selectedPermisos;
      }

      if (formMode === "create") {
        console.log("Enviando datos para crear rol:", formDataToSend);
        const newRol = await createRol(formDataToSend);
        console.log("Rol creado:", newRol);

        showNotification("¡Rol creado exitosamente!", "success");

        // Recargar la lista de roles para asegurar datos actualizados
        await fetchRoles();
      } else if (formMode === "edit") {
        console.log("Enviando datos para actualizar rol:", formDataToSend);
        const updatedRol = await updateRol(formDataToSend.id, formDataToSend);
        console.log("Rol actualizado:", updatedRol);

        showNotification("¡Rol actualizado exitosamente!", "success");

        // Actualizar el rol en el estado local
        updateRolInState(updatedRol);

        // Actualizar el conteo de permisos para este rol
        if (formDataToSend.permisos_ids) {
          setPermisosCountByRol((prev) => ({
            ...prev,
            [formDataToSend.id]: formDataToSend.permisos_ids.length,
          }));
        }
      }

      // Cerrar el formulario
      setShowForm(false);
    } catch (err) {
      console.error("Error al procesar el formulario:", err);

      // Extraer mensaje de error detallado
      let errorMessage = "Ha ocurrido un error";

      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === "string") {
          errorMessage = errorData;
        } else if (typeof errorData === "object") {
          const errorMessages = [];
          Object.entries(errorData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              errorMessages.push(`${key}: ${value.join(", ")}`);
            } else if (typeof value === "string") {
              errorMessages.push(`${key}: ${value}`);
            }
          });
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join("; ");
          } else if (errorData.message || errorData.detail) {
            errorMessage = errorData.message || errorData.detail;
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Mostrar error en el modal
      setFormErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Confirmar eliminación de rol
  const confirmDelete = (rol) => {
    // Verificar si es el rol Admin
    if (isAdminRole(rol)) {
      showNotification("No se puede eliminar el rol Admin", "error");
      return;
    }

    setRolToDelete(rol);
    setShowConfirmDialog(true);
  };

  // Eliminar rol - MEJORADO CON MEJOR MANEJO DE ERRORES
  // Eliminar rol - MEJORADO CON VALIDACIÓN DE USUARIOS ASOCIADOS
const handleDelete = async () => {
  if (!rolToDelete) return;

  try {
    setLoading(true);
    console.log("🗑️ Intentando eliminar rol:", rolToDelete);

    // Verificar que el rol no sea Admin antes de eliminar
    if (isAdminRole(rolToDelete)) {
      showNotification("No se puede eliminar el rol Admin", "error");
      return;
    }

    // Verificar que el ID del rol sea válido
    if (
      !rolToDelete.id ||
      rolToDelete.id === "undefined" ||
      rolToDelete.id === "null"
    ) {
      showNotification("Error: ID de rol inválido", "error");
      return;
    }

    const result = await deleteRol(rolToDelete.id);
    console.log("✅ Rol eliminado exitosamente:", result);

    // Actualizar la lista de roles localmente
    setRoles((prevRoles) =>
      prevRoles.filter((rol) => rol.id !== rolToDelete.id)
    );

    // Eliminar el conteo de permisos para este rol
    setPermisosCountByRol((prev) => {
      const newCount = { ...prev };
      delete newCount[rolToDelete.id];
      return newCount;
    });

    showNotification(
      result.message || "¡Rol eliminado exitosamente!",
      "success"
    );

    // Recargar la lista completa para asegurar consistencia
    setTimeout(() => {
      fetchRoles();
    }, 1000);
  } catch (err) {
    console.error("❌ Error detallado al eliminar rol:", err);

    // Manejo de errores más detallado
    let errorMessage = "Error desconocido al eliminar el rol";

    // Si es un error de validación de usuarios asociados
    if (err.message && err.message.includes("No se puede eliminar el rol")) {
      errorMessage = err.message;
    } else if (err.response) {
      console.error("Respuesta del servidor:", {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data,
        headers: err.response.headers,
      });

      switch (err.response.status) {
        case 404:
          errorMessage = "El rol no existe o ya fue eliminado";
          // Actualizar la lista para reflejar el cambio
          setRoles((prevRoles) =>
            prevRoles.filter((rol) => rol.id !== rolToDelete.id)
          );
          break;
        case 400:
          // Este es el caso más importante - rol con usuarios asociados
          if (err.response.data?.error) {
            errorMessage = err.response.data.error;
          } else {
            errorMessage =
              err.response.data?.message ||
              "No se puede eliminar el rol porque tiene usuarios asociados";
          }
          break;
        case 403:
          errorMessage = "No tienes permisos para eliminar este rol";
          break;
        case 409:
          errorMessage =
            "No se puede eliminar el rol porque tiene usuarios o dependencias asociadas";
          break;
        case 500:
          errorMessage =
            "Error interno del servidor. Contacte al administrador.";
          break;
        default:
          if (err.response.data) {
            if (typeof err.response.data === "string") {
              errorMessage = err.response.data;
            } else if (err.response.data.error) {
              errorMessage = err.response.data.error;
            } else if (err.response.data.message) {
              errorMessage = err.response.data.message;
            } else if (err.response.data.detail) {
              errorMessage = err.response.data.detail;
            }
          }
      }
    } else if (err.request) {
      console.error("No se recibió respuesta del servidor:", err.request);
      errorMessage =
        "No se pudo conectar con el servidor. Verifique su conexión.";
    } else {
      console.error("Error de configuración:", err.message);
      errorMessage = err.message;
    }

    showNotification(errorMessage, "error");
  } finally {
    setLoading(false);
    setShowConfirmDialog(false);
    setRolToDelete(null);
  }
};

  // Activar/Desactivar rol (con protección contra múltiples clicks y validaciones)
  const handleToggleActive = async (rol) => {
    // Verificar si es el rol Admin
    if (isAdminRole(rol)) {
      showNotification("No se puede cambiar el estado del rol Admin", "error");
      return;
    }

    // Evitar múltiples clicks rápidos
    const toggleKey = `toggle-${rol.id}`;
    if (actionTimeouts.has(toggleKey)) {
      return;
    }

    try {
      // Marcar como en proceso
      setActionTimeouts((prev) => new Set([...prev, toggleKey]));

      // Verificar si el rol puede cambiar estado
      const checkResult = await checkRolCanChangeEstado(rol.id);
      if (!checkResult.puede_cambiar_estado) {
        const rolNombre = checkResult.rol_nombre || rol.nombre || "este rol";
        const usuarios = checkResult.usuarios_info?.total || 0;
        let messageDetail = "";
        if (usuarios > 0) {
          messageDetail = `Este rol tiene ${usuarios} usuario(s) asociado(s). Para poder cambiar su estado, primero debe reasignar o eliminar los usuarios que tienen este rol.`;
        }
        showNotification(
          `❌ No se puede cambiar el estado del rol '${rolNombre}'\n\n${messageDetail}`,
          "error"
        );
        return;
      }

      let updatedRol;
      if (rol.estado === "activo") {
        updatedRol = await desactivarRol(rol.id);
      } else {
        updatedRol = await activarRol(rol.id);
      }

      // Actualizar el rol en el estado local inmediatamente
      updateRolInState({
        ...rol,
        estado: rol.estado === "activo" ? "inactivo" : "activo",
      });

      showNotification(
        `¡Rol ${rol.estado === "activo" ? "desactivado" : "activado"} exitosamente!`,
        "success",
      );
    } catch (err) {
      console.error("Error al cambiar estado del rol:", err);
      let errorMessage = "Ha ocurrido un error";
      
      if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detalle) {
          errorMessage = errorData.detalle;
        } else if (typeof errorData === "string") {
          errorMessage = errorData;
        } else if (typeof errorData === "object") {
          const errorMessages = [];
          Object.entries(errorData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              errorMessages.push(...value);
            } else if (typeof value === "string") {
              errorMessages.push(value);
            }
          });
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join("; ");
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      showNotification(errorMessage, "error");
    } finally {
      // Liberar después de 1 segundo
      setTimeout(() => {
        setActionTimeouts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(toggleKey);
          return newSet;
        });
      }, 1000);
    }
  };

  // Ordenar roles
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  };

  // Filtrar y ordenar roles
  const filteredAndSortedRoles = () => {
    // Filtrar por término de búsqueda
    let filtered = roles.filter((rol) => {
      const searchLower = searchTerm.toLowerCase();
      return (rol.nombre?.toLowerCase() || "").includes(searchLower);
    });

    // Ordenar
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key] || "";
      const bValue = b[sortConfig.key] || "";

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  };

  // Obtener roles para la página actual
  const getCurrentPageItems = () => {
    const filtered = filteredAndSortedRoles();
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filtered.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Calcular número total de páginas
  const totalPages = Math.ceil(filteredAndSortedRoles().length / itemsPerPage);

  // Cambiar de página
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Renderizar indicador de ordenamiento
  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) {
      return <FaSort className="sort-icon" />;
    }
    return sortConfig.direction === "asc" ? (
      <FaSortUp className="sort-icon active" />
    ) : (
      <FaSortDown className="sort-icon active" />
    );
  };

  // Filtrar permisos disponibles según el término de búsqueda
  const filteredPermisos = availablePermisos.filter((permiso) =>
    permiso.nombre.toLowerCase().includes(permisoSearchTerm.toLowerCase()),
  );

  return (
    <div className="admin-container">
      {/* Toaster para las notificaciones */}
      <Toaster />

      {/* Contenedor unificado para header, filtros y tabla */}
      <div className="admin-content-wrapper">
        <div className="admin-header">
          <h1 className="admin-title">Gestión de Roles</h1>
          <PermissionWrapper
            modulo="roles"
            accion="crear"
          >
            <button
              className="admin-button primary"
              onClick={handleOpenCreateForm}
            >
              <FaPlus />
              Nuevo Rol
            </button>
          </PermissionWrapper>
        </div>

        {/* Filtros y búsqueda */}
        <div className="admin-filters">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="items-per-page">
            <span>Mostrar:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="items-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Tabla de roles */}
        {loading && !showForm ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Cargando roles...</p>
          </div>
        ) : error ? (
          <div className="admin-message error">
            <p>{error}</p>
            <button
              className="admin-button secondary"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("nombre")}>
                    Nombre {renderSortIndicator("nombre")}
                  </th>
                  <th onClick={() => handleSort("estado")}>
                    Estado {renderSortIndicator("estado")}
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageItems().length > 0 ? (
                  getCurrentPageItems().map((rol) => (
                    <tr key={rol.id}>
                      <td>
                        <div className="rol-info">
                          <span className="rol-name">
                            {rol.nombre || "Sin nombre"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="status-toggle">
                          <span
                            className={`status-badge ${rol.estado === "activo" ? "active" : "inactive"}`}
                          >
                            {rol.estado === "activo" ? "Activo" : "Inactivo"}
                          </span>
                          {!isAdminRole(rol) && (
                            <PermissionWrapper
                              modulo="roles"
                              accion="editar"
                            >
                              <button
                                className={`toggle-button ${
                                  rol.estado === "activo" ? "active" : "inactive"
                                }`}
                                onClick={() => handleToggleActive(rol)}
                                title={
                                  rol.estado === "activo"
                                    ? "Desactivar"
                                    : "Activar"
                                }
                              >
                                {rol.estado === "activo" ? (
                                  <FaTimes />
                                ) : (
                                  <FaCheck />
                                )}
                              </button>
                            </PermissionWrapper>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <PermissionWrapper
                            modulo="roles"
                            accion="ver_detalles"
                          >
                            <button
                              className="action-button view"
                              onClick={() => handleOpenDetails(rol)}
                              title="Ver detalles"
                            >
                              <FaEye />
                            </button>
                          </PermissionWrapper>
                          {!isAdminRole(rol) && (
                            <PermissionWrapper
                              modulo="roles"
                              accion="editar"
                            >
                              <button
                                className="action-button edit"
                                onClick={() => handleOpenEditForm(rol)}
                                title="Editar rol"
                              >
                                <FaEdit />
                              </button>
                            </PermissionWrapper>
                          )}
                          {!isAdminRole(rol) && (
                            <PermissionWrapper
                              modulo="roles"
                              accion="eliminar"
                            >
                              <button
                                className="action-button delete"
                                onClick={() => confirmDelete(rol)}
                                title="Eliminar rol"
                              >
                                <FaTrash />
                              </button>
                            </PermissionWrapper>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="no-data">
                      No se encontraron roles
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-button"
            onClick={() => paginate(1)}
            disabled={currentPage === 1}
          >
            &laquo;
          </button>
          <button
            className="pagination-button"
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &lt;
          </button>
          <div className="pagination-info">
            Página {currentPage} de {totalPages}
          </div>
          <button
            className="pagination-button"
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
          <button
            className="pagination-button"
            onClick={() => paginate(totalPages)}
            disabled={currentPage === totalPages}
          >
            &raquo;
          </button>
        </div>
      )}

      {/* Formulario modal unificado para crear/editar/ver */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className="modal-container roles-modal">
            <div className="modal-header">
              <h2>
                <FaUserTag className="form-icon" />
                {formMode === "create" && "Crear Nuevo Rol"}
                {formMode === "edit" && "Editar Rol"}
                {formMode === "view" && "Detalles del Rol"}
              </h2>
              <button
                className="modal-close"
                onClick={() => setShowForm(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="admin-form">
              {/* Error general */}
              {formErrors.general && (
                <div className="admin-message error">
                  <FaExclamationCircle />
                  {formErrors.general}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nombre">
                    <FaUserTag className="form-icon" />
                    Nombre del Rol
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className={formErrors.nombre ? "error" : ""}
                    placeholder="Ingrese el nombre del rol"
                    maxLength={50}
                    required
                    disabled={formMode === "view"}
                  />
                  {formErrors.nombre && (
                    <div className="error-text">
                      <FaExclamationCircle />
                      {formErrors.nombre}
                    </div>
                  )}
                </div>
              </div>

              {/* Sección de permisos (para crear, editar y vista) */}
              <div className="form-row">
                <div className="form-group">
                  <label className="permisos-label">
                    <FaShieldAlt className="form-icon" />
                    {formMode === "view"
                      ? "Permisos Asignados"
                      : "Gestión de Permisos"}
                  </label>
                  <div className="permisos-container">
                    {formMode !== "view" && (
                      <div className="permisos-header">
                        <div className="permisos-actions">
                          <button
                            type="button"
                            className="admin-button secondary small"
                            onClick={handleSelectAllPermisos}
                          >
                            <FaCheckCircle />
                            Seleccionar todos
                          </button>
                          <button
                            type="button"
                            className="admin-button secondary small"
                            onClick={handleDeselectAllPermisos}
                          >
                            <FaTimesCircle />
                            Deseleccionar todos
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="permisos-modulos-container">
                      {Object.keys(permisosPorModulos).length > 0 ? (
                        Object.entries(permisosPorModulos).map(([moduloNombre, moduloData]) => (
                          <div key={moduloNombre} className="modulo-container">
                            <div className="modulo-header">
                              <div className="modulo-title">
                                <h4 className="modulo-name">
                                  {moduloNombre.charAt(0).toUpperCase() + moduloNombre.slice(1).replace('_', ' ')}
                                </h4>
                                <span className="modulo-count">
                                  {Object.keys(moduloData.acciones).length} acciones
                                </span>
                              </div>
                              {formMode !== "view" && (
                                <div className="modulo-actions">
                                  <button
                                    type="button"
                                    className="modulo-action-btn"
                                    onClick={() => handleSelectAllModulo(moduloNombre)}
                                    title="Seleccionar todo el módulo"
                                  >
                                    <FaCheckCircle />
                                  </button>
                                  <button
                                    type="button"
                                    className="modulo-action-btn"
                                    onClick={() => handleDeselectAllModulo(moduloNombre)}
                                    title="Deseleccionar todo el módulo"
                                  >
                                    <FaTimesCircle />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="acciones-grid">
                              {Object.entries(moduloData.acciones).map(([accionNombre, accionData]) => (
                                <div
                                  key={accionData.id}
                                  className={`accion-item ${
                                    formMode !== "view" ? "clickable" : ""
                                  } ${selectedPermisos.includes(accionData.id) ? "selected" : ""}`}
                                  onClick={() => handlePermisoModuloToggle(moduloNombre, accionNombre)}
                                >
                                  <div className="accion-content">
                                    <span className="accion-name">
                                      {accionNombre === 'ver_detalles' ? 'Ver' : accionNombre.charAt(0).toUpperCase() + accionNombre.slice(1).replace('_', ' ')}
                                    </span>
                                    <span className="accion-description">
                                      {accionData.descripcion || `${moduloNombre} - ${accionNombre}`}
                                    </span>
                                  </div>
                                  <div className="accion-checkbox">
                                    <input
                                      type="checkbox"
                                      className="permission-checkbox"
                                      checked={selectedPermisos.includes(accionData.id)}
                                      onChange={() => handlePermisoModuloToggle(moduloNombre, accionNombre)}
                                      disabled={formMode === "view"}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-permisos-message">
                          <FaExclamationTriangle />
                          No se encontraron permisos
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="admin-button secondary"
                  onClick={() => setShowForm(false)}
                >
                  <FaTimes />
                  {formMode === "view" ? "Cerrar" : "Cancelar"}
                </button>
                {formMode !== "view" && (
                  <button
                    type="submit"
                    className="admin-button primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="spinner-small"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <FaCheck />
                        {formMode === "create" && "Crear Rol"}
                        {formMode === "edit" && "Guardar Cambios"}
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diálogo de confirmación */}
      {showConfirmDialog && (
        <div className="modal-overlay">
          <div className="modal-container confirm-dialog">
            <div className="modal-header">
              <h2>
                <FaExclamationTriangle className="form-icon" />
                Confirmar Eliminación
              </h2>
              <button
                className="modal-close"
                onClick={() => setShowConfirmDialog(false)}
              >
                &times;
              </button>
            </div>
            <div className="confirm-content">
              <p>
                ¿Está seguro que desea eliminar el rol{" "}
                <strong>"{rolToDelete?.nombre}"</strong>?
              </p>
              <p className="warning-text">
                <FaExclamationTriangle />
                Esta acción no se puede deshacer y eliminará todos los permisos
                asociados.
              </p>
            </div>
            <div className="form-actions">
              <button
                className="admin-button secondary"
                onClick={() => setShowConfirmDialog(false)}
              >
                <FaTimes />
                Cancelar
              </button>
              <button
                className="admin-button danger"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <FaTrash />
                    Eliminar Rol
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;