"use client";

import { useState, useEffect } from "react";
import {
  FaUserPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaEye,
  FaFilter,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaIdCard,
  FaPhone,
  FaEnvelope,
  FaTimes,
  FaCheck,
  FaUser,
  FaMapMarkerAlt,
  FaKey,
  FaExclamationTriangle,
  FaQuestionCircle,
} from "react-icons/fa";
import {
  getManicuristas,
  createManicurista,
  updateManicurista,
  deleteManicurista,
  cambiarEstadoManicurista,
  tieneCitasActivas,
  checkAsociacionesManicurista,
} from "../../service/manicuristasService";
import toast, { Toaster } from "react-hot-toast";
import PermissionWrapper from "../../components/PermissionWrapper";
import "../../styles/modals/ManicuristasModal.css";

const Manicuristas = () => {
  // Estados para manejar los datos
  const [manicuristas, setManicuristas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para el formulario
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [formMode, setFormMode] = useState("create"); // create, edit, view
  const [formData, setFormData] = useState({
    nombre: "",
    tipo_documento: "CC",
    numero_documento: "",
    celular: "",
    correo: "",
    direccion: "",
    estado: "activo",
  });

  const [formErrors, setFormErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  // Estados para filtrado y ordenamiento
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "nombres",
    direction: "asc",
  });

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Estados para mensajes y confirmaciones
  const [message, setMessage] = useState({ text: "", type: "" });
  const [actionTimeouts, setActionTimeouts] = useState(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSecondConfirm, setShowSecondConfirm] = useState(false);
  const [manicuristaToDelete, setManicuristaToDelete] = useState(null);

  // Función para mostrar notificaciones con react-hot-toast
  const showNotification = (message, type = "success") => {
    const notificationKey = `${message}-${type}`;

    // Evitar notificaciones duplicadas
    if (actionTimeouts.has(notificationKey)) {
      return;
    }

    // Marcar como activa
    setActionTimeouts((prev) => new Set([...prev, notificationKey]));

    // Mostrar notificación según el tipo
    switch (type) {
      case "success":
        toast.success(message, {
          duration: 4000,
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
        });
        break;
      case "error":
        toast.error(message, {
          duration: 5000,
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
        });
        break;
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
        });
        break;
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
        });
        break;
      default:
        toast(message);
    }

    // Liberar después de 2 segundos
    setTimeout(() => {
      setActionTimeouts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationKey);
        return newSet;
      });
    }, 2000);
  };

  // Cargar datos iniciales
  const fetchManicuristas = async () => {
    try {
      setLoading(true);
      const manicuristasData = await getManicuristas();
      console.log("Manicuristas cargadas:", manicuristasData);
      setManicuristas(manicuristasData);
      setError(null);
    } catch (err) {
      setError(
        "Error al cargar las manicuristas. Por favor, intente nuevamente.",
      );
      console.error("Error al cargar manicuristas:", err);
      showNotification("Error al cargar las manicuristas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManicuristas();
  }, []);

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    const updatedFormData = {
      ...formData,
      [name]: newValue,
    };

    setFormData(updatedFormData);

    // Validar el campo cuando cambia
    validateFieldWithData(name, newValue, updatedFormData);

    // Si cambió el tipo de documento, re-validar el número de documento
    if (name === "tipo_documento" && updatedFormData.numero_documento) {
      validateFieldWithData(
        "numero_documento",
        updatedFormData.numero_documento,
        updatedFormData,
      );
    }
  };

  // Validar un campo específico con datos actualizados
  const validateFieldWithData = (
    fieldName,
    value,
    currentFormData = formData,
  ) => {
    const errors = { ...formErrors };

    switch (fieldName) {
      case "nombre":
        if (!value || !value.trim()) {
          errors.nombre = "El nombre completo es requerido";
        } else if (value.trim().length < 10) {
          errors.nombre = "El nombre debe tener al menos 10 caracteres";
        } else if (value.trim().length > 50) {
          errors.nombre = "El nombre no puede exceder los 50 caracteres";
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{10,50}$/.test(value)) {
          errors.nombre =
            "Nombre inválido (solo letras y espacios, 10-50 caracteres)";
        } else {
          delete errors.nombre;
        }
        break;

      case "numero_documento": {
        const tipoDocumento = currentFormData.tipo_documento;
        const documentoValue =
          fieldName === "numero_documento"
            ? value
            : currentFormData.numero_documento;

        if (!documentoValue || !documentoValue.trim()) {
          errors.numero_documento = "El documento es requerido";
        } else {
          let isValid = false;

          switch (tipoDocumento) {
            case "CC":
              isValid = /^\d{6,11}$/.test(documentoValue);
              if (!isValid)
                errors.numero_documento = "Cédula inválida (6-11 dígitos)";
              break;

            case "TI":
              isValid = /^(1|0)\d{5,10}$/.test(documentoValue);
              if (!isValid)
                errors.numero_documento =
                  "TI inválida (inicia en 1 o 0, 6-11 dígitos)";
              break;

            case "CE":
              isValid = /^[a-zA-Z0-9]{6,15}$/.test(documentoValue);
              if (!isValid)
                errors.numero_documento =
                  "CE inválida (6-15 caracteres alfanuméricos)";
              break;

            case "PP":
              isValid = /^[a-zA-Z0-9]{8,12}$/.test(documentoValue);
              if (!isValid)
                errors.numero_documento =
                  "Pasaporte inválido (8-12 caracteres alfanuméricos)";
              break;
          }

          if (isValid) {
            delete errors.numero_documento;
          }
        }
        break;
      }

      case "celular":
        if (!value || !value.trim()) {
          errors.celular = "El celular es requerido";
        } else if (!/^[3][0-9]{9}$/.test(value)) {
          errors.celular =
            "Celular inválido (debe comenzar con 3 y tener 10 dígitos)";
        } else {
          delete errors.celular;
        }
        break;

      case "correo":
        if (!value || !value.trim()) {
          errors.correo = "El correo electrónico es requerido";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.correo = "Correo electrónico inválido";
        } else if (value.length > 100) {
          errors.correo = "El correo no puede exceder los 100 caracteres";
        } else {
          delete errors.correo;
        }
        break;

      case "direccion":
        if (!value || !value.trim()) {
          errors.direccion = "La dirección es requerida";
        } else if (value.length < 10) {
          errors.direccion = "La dirección debe tener al menos 10 caracteres";
        } else if (value.length > 200) {
          errors.direccion = "La dirección no puede exceder los 200 caracteres";
        } else if (!/^[a-zA-Z0-9\s.#,\-°]{10,200}$/.test(value)) {
          errors.direccion =
            "Formato de dirección inválido. Use caracteres alfanuméricos, #, -, °, . y ,";
        } else {
          delete errors.direccion;
        }
        break;

      default:
        break;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validar un campo específico (wrapper para compatibilidad)
  const validateField = (fieldName, value) => {
    return validateFieldWithData(fieldName, value, formData);
  };

  // Validar formulario completo
  const validateForm = () => {
    const fields = [
      "nombre",
      "numero_documento",
      "celular",
      "correo",
      "direccion",
    ];
    let isValid = true;
    const newErrors = {};

    fields.forEach((field) => {
      if (!validateFieldWithData(field, formData[field], formData)) {
        isValid = false;
        if (formErrors[field]) {
          newErrors[field] = formErrors[field];
        }
      }
    });

    setFormErrors(newErrors);
    return isValid;
  };

  // Abrir formulario para crear manicurista
  const handleOpenCreateForm = () => {
    setFormData({
      nombre: "",
      tipo_documento: "CC",
      numero_documento: "",
      celular: "",
      correo: "",
      direccion: "",
      estado: "activo",
    });
    setFormErrors({});
    setGeneralError("");
    setFormMode("create");
    setShowForm(true);
    setShowDetails(false);
  };

  // Abrir formulario para editar manicurista
  const handleOpenEditForm = (manicurista) => {
    setFormData({
      id: manicurista.id,
      nombre:
        `${manicurista.nombres || ""} ${manicurista.apellidos || ""}`.trim(),
      tipo_documento: manicurista.tipo_documento || "CC",
      numero_documento: manicurista.numero_documento || "",
      celular: manicurista.celular || "",
      correo: manicurista.correo || "",
      direccion: manicurista.direccion || "",
      estado: manicurista.estado || "activo",
    });
    setFormErrors({});
    setGeneralError("");
    setFormMode("edit");
    setShowForm(true);
    setShowDetails(false);
  };

  // Abrir vista de detalles
  const handleOpenDetails = (manicurista) => {
    setFormData({
      id: manicurista.id,
      nombre:
        `${manicurista.nombres || ""} ${manicurista.apellidos || ""}`.trim(),
      tipo_documento: manicurista.tipo_documento || "CC",
      numero_documento: manicurista.numero_documento || "",
      celular: manicurista.celular || "",
      correo: manicurista.correo || "",
      direccion: manicurista.direccion || "",
      estado: manicurista.estado || "activo",
    });
    setFormMode("view");
    setShowDetails(true);
    setShowForm(false);
  };

  // Manejar envío del formulario principal
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showNotification(
        "Por favor corrija los errores en el formulario",
        "error",
      );
      return;
    }

    try {
      setLoading(true);
      setGeneralError("");

      if (formMode === "create") {
        console.log("Enviando datos para crear manicurista:", formData);
        const newManicurista = await createManicurista(formData);
        console.log("Manicurista creada:", newManicurista);

        showNotification(
          "Manicurista creada exitosamente. Se ha enviado un correo con las credenciales de acceso y el enlace para cambiar la contraseña.",
          "success",
        );

        await fetchManicuristas();
      } else if (formMode === "edit") {
        console.log("Enviando datos para actualizar manicurista:", formData);
        const updatedManicurista = await updateManicurista(
          formData.id,
          formData,
        );
        console.log("Manicurista actualizada:", updatedManicurista);

        showNotification("Manicurista actualizada exitosamente", "success");

        await fetchManicuristas();
      }

      setShowForm(false);
    } catch (err) {
      console.error("Error al procesar el formulario:", err);
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
          }
        }
      }

      showNotification(`Error: ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Confirmar eliminación de manicurista
  const confirmDelete = async (manicurista) => {
    try {
      const info = await checkAsociacionesManicurista(manicurista.id)
      const t = info?.totales || {}
      const citas = t.citas_activas || 0
      const novedades = t.novedades_vigentes || 0
      const liquidaciones = t.liquidaciones_pendientes || 0
      const ventas = t.ventas_asociadas || 0
      if (citas || novedades || liquidaciones || ventas) {
        const nombre = `${manicurista.nombres || ""} ${manicurista.apellidos || ""}`.trim() || manicurista.nombre || "la manicurista"
        showNotification(`No se puede eliminar la manicurista '${nombre}' porque tiene ${citas} cita(s), ${novedades} novedad(es), ${liquidaciones} liquidación(es) y ${ventas} venta(s) asociada(s).`, "warning")
        return
      }
    } catch (_) {
      // Si falla verificación, continuamos a confirmación
    }
    setManicuristaToDelete(manicurista)
    setShowConfirmDialog(true)
  };

  // Eliminar manicurista
  const handleDelete = async () => {
    if (!manicuristaToDelete) return;

    try {
      setLoading(true);
      const result = await deleteManicurista(manicuristaToDelete.id);

      // Actualizar la lista de manicuristas localmente
      setManicuristas(
        manicuristas.filter((m) => m.id !== manicuristaToDelete.id),
      );

      // Mostrar el mensaje del servidor si está disponible
      const message =
        result.data?.message ||
        result.message ||
        "¡Manicurista eliminada exitosamente!";
      showNotification(message, "success");
    } catch (err) {
      console.error("Error al eliminar manicurista:", err);
      showNotification(
        `Error al eliminar: ${err.response?.data?.message || err.message || "Ha ocurrido un error"}`,
        "error",
      );
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
      setShowSecondConfirm(false);
      setManicuristaToDelete(null);
    }
  };

  // Cambiar estado de manicurista
  const handleToggleEstado = async (manicurista) => {
    try {
      // Solo validar si se va a inactivar
      if (manicurista.estado === "activo") {
        try {
        const tieneCitas = await tieneCitasActivas(manicurista.id);
        if (tieneCitas) {
          showNotification(
            "No se puede inactivar la manicurista porque tiene citas asociadas.",
            "error"
          );
          return;
          }
        } catch (e) {
          // Si el endpoint no existe o responde 404/400, dejamos que el backend principal valide en cambiar_estado
          const status = e?.response?.status;
          if (status && status !== 404 && status !== 400) {
            // Otros errores de red sí se notifican
            showNotification("Error verificando citas de la manicurista", "error");
            return;
          }
        }
      }
      
      // Actualizar estado local inmediatamente para mejor UX
      const nuevoEstado = manicurista.estado === "activo" ? "inactivo" : "activo";
      setManicuristas(
        manicuristas.map((m) =>
          m.id === manicurista.id
            ? { ...m, estado: nuevoEstado }
            : m,
        ),
      );
      
      // Llamar al backend
      try {
        const data = await cambiarEstadoManicurista(manicurista.id);
        // Backend devuelve 200 con alerta cuando no se puede inactivar
        if (data && data.totales) {
          const { citas_activas = 0, novedades_vigentes = 0, liquidaciones_pendientes = 0 } = data.totales || {}
          if (citas_activas || novedades_vigentes || liquidaciones_pendientes) {
            // Revertir UI
            setManicuristas(
              manicuristas.map((m) =>
                m.id === manicurista.id ? { ...m, estado: manicurista.estado } : m,
              ),
            );
            const msg = data.mensaje || `No se puede desactivar: ${citas_activas} cita(s), ${novedades_vigentes} novedad(es), ${liquidaciones_pendientes} liquidación(es).`
            showNotification(msg, "warning")
            return
          }
        }
      } catch (err) {
        // Revertir cambio local si backend rechaza
        setManicuristas(
          manicuristas.map((m) =>
            m.id === manicurista.id ? { ...m, estado: manicurista.estado } : m,
          ),
        );
        const payload = err?.response?.data
        const totals = payload?.totales
        if (totals) {
          const { citas_activas = 0, novedades_vigentes = 0, liquidaciones_pendientes = 0 } = totals
          const msg = payload?.mensaje || `No se puede desactivar: ${citas_activas} cita(s), ${novedades_vigentes} novedad(es), ${liquidaciones_pendientes} liquidación(es).`
          showNotification(msg, "warning")
        } else {
          const serverMsg = payload?.error || payload?.message
          showNotification(serverMsg || "No se pudo cambiar el estado.", "error")
        }
        return
      }
      
      showNotification(
        `Manicurista ${nuevoEstado === "inactivo" ? "desactivada" : "activada"} exitosamente`,
        "success",
      );
    } catch (err) {
      // Error inesperado
      setManicuristas(
        manicuristas.map((m) =>
          m.id === manicurista.id ? { ...m, estado: manicurista.estado } : m,
        ),
      );
      const serverMsg = err?.response?.data?.error || err?.response?.data?.message;
      showNotification(serverMsg || (err?.message || "Ha ocurrido un error"), "error");
    }
  };

  // Ordenar manicuristas
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Filtrar y ordenar manicuristas 
  const filteredAndSortedManicuristas = () => {
    const filtered = manicuristas.filter((manicurista) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
      (manicurista.nombre?.toLowerCase() || "").includes(searchLower) ||
      (manicurista.nombres?.toLowerCase() || "").includes(searchLower) ||
      (manicurista.apellidos?.toLowerCase() || "").includes(searchLower) ||
      (manicurista.tipo_documento?.toLowerCase() || "").includes(searchLower) ||
      (manicurista.numero_documento?.toLowerCase() || "").includes(searchLower) ||
      (manicurista.celular?.toLowerCase() || "").includes(searchLower) ||
      (manicurista.correo?.toLowerCase() || "").includes(searchLower) ||
      (manicurista.direccion?.toLowerCase() || "").includes(searchLower) ||
      (
        searchLower === "activo" || searchLower === "inactivo"
        ? (manicurista.estado?.toLowerCase() || "") === searchLower
        : (manicurista.estado?.toLowerCase() || "").includes(searchLower)
      ) ||
      ((manicurista.disponible ? "disponible" : "no disponible").includes(searchLower));

    return matchesSearch;
  });

  // Aquí seguiría tu lógica de ordenamiento (sort)


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

  // Obtener elementos de la página actual
  const getCurrentPageItems = () => {
    const filtered = filteredAndSortedManicuristas();
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filtered.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Calcular número total de páginas
  const totalPages = Math.ceil(
    filteredAndSortedManicuristas().length / itemsPerPage,
  );

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

  // Mostrar ayuda de dirección
  const mostrarAyudaDireccion = () => {
    toast(
      "Ejemplos válidos:\n• Calle 123 # 45-67\n• Carrera 7 # 8-9 Apto 101\n• Av. Circunvalar # 10-20 Torre B",
      {
        duration: 6000,
        position: "top-center",
        icon: "ℹ️",
        style: {
          background: "#3b82f6",
          color: "#fff",
          fontWeight: "500",
          whiteSpace: "pre-line",
        },
      },
    );
  };

  return (
    <div className="admin-container">
      <Toaster />

      <div className="admin-header">
        <h1 className="admin-title">Gestión de Manicuristas</h1>
        <div style={{ display: "flex", gap: "1rem" }}>
          <PermissionWrapper
            modulo="manicuristas"
            accion="crear"
          >
            <button
              className="admin-button primary"
              onClick={handleOpenCreateForm}
            >
              <FaUserPlus /> Nueva Manicurista
            </button>
          </PermissionWrapper>
        </div>
      </div>

      {/* Mensaje de notificación */}
      {message.text && (
        <div className={`admin-message ${message.type}`}>{message.text}</div>
      )}

      {/* Filtros y búsqueda */}
      <div className="admin-filters">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar manicuristas..."
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

      {/* Tabla de manicuristas */}
      {loading && !showForm && !showDetails ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando manicuristas...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>{error}</p>
          <button
            className="admin-button secondary"
            onClick={fetchManicuristas}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("nombres")}>
                    Nombre {renderSortIndicator("nombres")}
                  </th>
                  <th onClick={() => handleSort("numero_documento")}>
                    Documento {renderSortIndicator("numero_documento")}
                  </th>
                  <th onClick={() => handleSort("correo")}>
                    Correo {renderSortIndicator("correo")}
                  </th>
                  <th onClick={() => handleSort("estado")}>
                    Estado {renderSortIndicator("estado")}
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageItems().length > 0 ? (
                  getCurrentPageItems().map((manicurista) => (
                    <tr key={manicurista.id}>
                      <td>
                        {manicurista.nombres} {manicurista.apellidos}
                      </td>
                      <td>
                        {manicurista.tipo_documento}:{" "}
                        {manicurista.numero_documento}
                      </td>
                      <td>{manicurista.correo}</td>
                      <td>
                        <div className="status-toggle">
                          <span
                            className={`status-badge ${manicurista.estado === "activo" ? "active" : "inactive"}`}
                          >
                            {manicurista.estado === "activo"
                              ? "Activo"
                              : "Inactivo"}
                          </span>
                          <PermissionWrapper
                            modulo="manicuristas"
                            accion="editar"
                          >
                            <button
                              className={`toggle-button ${manicurista.estado === "activo" ? "active" : "inactive"}`}
                              onClick={() => handleToggleEstado(manicurista)}
                              title={
                                manicurista.estado === "activo"
                                  ? "Desactivar"
                                  : "Activar"
                              }
                            >
                              {manicurista.estado === "activo" ? (
                                <FaTimes />
                              ) : (
                                <FaCheck />
                              )}
                            </button>
                          </PermissionWrapper>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <PermissionWrapper
                            modulo="manicuristas"
                            accion="ver_detalles"
                          >
                            <button
                              className="action-button view"
                              onClick={() => handleOpenDetails(manicurista)}
                              title="Ver detalles"
                            >
                              <FaEye />
                            </button>
                          </PermissionWrapper>
                          <PermissionWrapper
                            modulo="manicuristas"
                            accion="editar"
                          >
                            <button
                              className="action-button edit"
                              onClick={() => handleOpenEditForm(manicurista)}
                              title="Editar manicurista"
                            >
                              <FaEdit />
                            </button>
                          </PermissionWrapper>
                          <PermissionWrapper
                            modulo="manicuristas"
                            accion="eliminar"
                          >
                            <button
                              className="action-button delete"
                              onClick={() => confirmDelete(manicurista)}
                              title="Eliminar manicurista"
                            >
                              <FaTrash />
                            </button>
                          </PermissionWrapper>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">
                      No se encontraron manicuristas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
        </>
      )}

      {/* Formulario modal unificado */}
      {(showForm || showDetails) && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>
                {formMode === "create" && "Crear Nueva Manicurista"}
                {formMode === "edit" && "Editar Manicurista"}
                {formMode === "view" && "Detalles de la Manicurista"}
              </h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowForm(false);
                  setShowDetails(false);
                }}
              >
                &times;
              </button>
            </div>

            {generalError && (
              <div className="general-error">{generalError}</div>
            )}

            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="numero_documento">
                    <FaIdCard className="form-icon" /> Documento
                  </label>
                  <div className="documento-combined">
                    <select
                      id="tipo_documento"
                      name="tipo_documento"
                      value={formData.tipo_documento}
                      onChange={handleInputChange}
                      className="tipo-documento-select"
                      disabled={formMode === "view"}
                    >
                      <option value="CC">CC</option>
                      <option value="TI">TI</option>
                      <option value="CE">CE</option>
                      <option value="PP">PP</option>
                    </select>
                    <input
                      type="text"
                      id="numero_documento"
                      name="numero_documento"
                      value={formData.numero_documento}
                      onChange={handleInputChange}
                      className={`numero-documento-input ${formErrors.numero_documento ? "error" : ""}`}
                      placeholder="Número"
                      required={formMode !== "view"}
                      maxLength={15}
                      disabled={formMode === "view"}
                      onKeyDown={(e) => {
                        if (formMode === "view") return;
                        const tipo = formData.tipo_documento;
                        const isControl = [
                          "Backspace",
                          "Delete",
                          "ArrowLeft",
                          "ArrowRight",
                          "Tab",
                        ].includes(e.key);

                        if (isControl) return;

                        if (tipo === "CC" || tipo === "TI") {
                          if (!/^\d$/.test(e.key)) {
                            e.preventDefault();
                          }
                        } else if (tipo === "CE" || tipo === "PP") {
                          if (!/^[a-zA-Z0-9]$/.test(e.key)) {
                            e.preventDefault();
                          }
                        }
                      }}
                    />
                  </div>
                  {formErrors.numero_documento && (
                    <div className="error-text">
                      {formErrors.numero_documento}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="nombre">
                    <FaUser className="form-icon" /> Nombre Completo
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className={formErrors.nombre ? "error" : ""}
                    placeholder="Ej: María González López"
                    required={formMode !== "view"}
                    maxLength={50}
                    disabled={formMode === "view"}
                    onKeyDown={(e) => {
                      if (formMode === "view") return;
                      const isLetter = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]$/.test(e.key);
                      const isControl = [
                        "Backspace",
                        "Delete",
                        "ArrowLeft",
                        "ArrowRight",
                        "Tab",
                      ].includes(e.key);
                      if (!isLetter && !isControl) {
                        e.preventDefault();
                      }
                    }}
                  />
                  <div
                    className={`character-count ${formData.nombre.length > 40 ? "warning" : ""} ${formData.nombre.length > 50 ? "danger" : ""}`}
                  ></div>
                  {formErrors.nombre && (
                    <div className="error-text">{formErrors.nombre}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="celular">
                    <FaPhone className="form-icon" /> Celular
                  </label>
                  <input
                    type="text"
                    id="celular"
                    name="celular"
                    value={formData.celular}
                    onChange={handleInputChange}
                    className={formErrors.celular ? "error" : ""}
                    placeholder="Ej: 3001234567"
                    required={formMode !== "view"}
                    maxLength={10}
                    disabled={formMode === "view"}
                    onKeyDown={(e) => {
                      if (formMode === "view") return;
                      const isNumber = /^\d$/.test(e.key);
                      const isControl = [
                        "Backspace",
                        "Delete",
                        "ArrowLeft",
                        "ArrowRight",
                        "Tab",
                      ].includes(e.key);
                      if (!isNumber && !isControl) {
                        e.preventDefault();
                      }
                    }}
                  />
                  {formErrors.celular && (
                    <div className="error-text">{formErrors.celular}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="correo">
                    <FaEnvelope className="form-icon" /> Correo electrónico
                  </label>
                  <input
                    type="email"
                    id="correo"
                    name="correo"
                    value={formData.correo}
                    onChange={handleInputChange}
                    className={formErrors.correo ? "error" : ""}
                    placeholder="Ej: manicurista@ejemplo.com"
                    required={formMode !== "view"}
                    maxLength={100}
                    disabled={formMode === "view"}
                  />
                  <div
                    className={`character-count ${formData.correo.length > 80 ? "warning" : ""} ${formData.correo.length > 100 ? "danger" : ""}`}
                  ></div>
                  {formErrors.correo && (
                    <div className="error-text">{formErrors.correo}</div>
                  )}
                </div>

                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label htmlFor="direccion">
                    <FaMapMarkerAlt className="form-icon" /> Dirección
                  </label>
                  <input
                    type="text"
                    id="direccion"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    className={formErrors.direccion ? "error" : ""}
                    placeholder="Ej: Calle 123 #45-67"
                    required={formMode !== "view"}
                    maxLength={200}
                    disabled={formMode === "view"}
                  />
                  <div
                    className={`character-count ${formData.direccion.length > 160 ? "warning" : ""} ${formData.direccion.length > 200 ? "danger" : ""}`}
                  ></div>
                  {formErrors.direccion && (
                    <div className="error-text">{formErrors.direccion}</div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                {formMode !== "view" && (
                  <button
                    type="button"
                    className="admin-button secondary"
                    onClick={() => {
                      setShowForm(false);
                      setShowDetails(false);
                    }}
                  >
                    Cancelar
                  </button>
                )}
                {formMode !== "view" && (
                  <button
                    type="submit"
                    className="admin-button primary"
                    disabled={
                      loading ||
                      !!formErrors.nombre ||
                      !!formErrors.numero_documento ||
                      !!formErrors.celular ||
                      !!formErrors.correo ||
                      !!formErrors.direccion ||
                      !formData.nombre ||
                      !formData.numero_documento ||
                      !formData.celular ||
                      !formData.correo ||
                      !formData.direccion
                    }
                  >
                    {loading ? (
                      <>
                        <div className="spinner-small"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        {formMode === "create" && "Crear Manicurista"}
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

      {/* Diálogo de confirmación de eliminación */}
      {showConfirmDialog && (
        <div className="modal-overlay">
          <div className="modal-container confirm-dialog">
            <div className="modal-header">
              <h2>Confirmar Eliminación</h2>
              <button
                className="modal-close"
                onClick={() => setShowConfirmDialog(false)}
              >
                &times;
              </button>
            </div>

            <div className="confirm-content">
              <div className="warning-icon">
                <FaExclamationTriangle />
              </div>
              <p>
                ¿Está seguro que desea eliminar a la manicurista{" "}
                <strong>
                  {manicuristaToDelete?.nombres}{" "}
                  {manicuristaToDelete?.apellidos}
                </strong>
                ?
              </p>
            </div>

            <div className="form-actions">
              <button
                className="admin-button secondary"
                onClick={() => setShowConfirmDialog(false)}
              >
                <FaTimes /> Cancelar
              </button>
              <button
                className="admin-button danger"
                onClick={() => setShowSecondConfirm(true)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <FaTrash /> Eliminar Manicurista
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Segunda confirmación de eliminación (Sí/No) */}
      {showSecondConfirm && (
        <div className="modal-overlay">
          <div className="modal-container confirm-dialog">
            <div className="modal-header">
              <h2>Confirmación adicional</h2>
              <button
                className="modal-close"
                onClick={() => setShowSecondConfirm(false)}
              >
                &times;
              </button>
            </div>

            <div className="confirm-content">
              <div className="warning-icon">
                <FaQuestionCircle />
              </div>
              <p>¿Estás seguro de eliminarla?</p>
            </div>

            <div className="form-actions">
              <button
                className="admin-button secondary"
                onClick={() => setShowSecondConfirm(false)}
              >
                No
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
                  <>Sí</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manicuristas;
