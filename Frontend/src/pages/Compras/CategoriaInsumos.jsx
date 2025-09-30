"use client"

import { useState, useEffect } from "react"
import CategoriaInsumoService from "../../service/CategoriaInsumoService"
import PermissionButton from "../../components/PermissionButton"
import PermissionWrapper from "../../components/PermissionWrapper"
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaEye,
  FaTimes,
  FaCheck,
  FaTag,
  FaExclamationTriangle,
  FaExclamationCircle, // Añadido para consistencia con Roles.jsx
} from "react-icons/fa"
import "../../styles/modals/CategoriaInsumosModal.css"
import toast, { Toaster } from "react-hot-toast"

const CategoriaInsumos = () => {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [categoriaToDelete, setCategoriaToDelete] = useState(null)

  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Estado para el formulario
  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
    estado: "activo",
    created_at: "",
    updated_at: "",
  })

  // Estado para errores de validación
  const [validationErrors, setValidationErrors] = useState({})

  // Estado para modo del modal (create, edit, view)
  const [modalMode, setModalMode] = useState("create")

  // Agregar estado para controlar acciones duplicadas
  const [actionTimeouts, setActionTimeouts] = useState(new Set())

  // Cargar categorías al montar el componente
  useEffect(() => {
    fetchCategorias()
  }, [])

  // Normalizar texto para comparar ignorando tildes/acentos y mayúsculas
  const normalizeText = (str) =>
    (str || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()

  // Función para obtener todas las categorías
  const fetchCategorias = async () => {
    try {
      setLoading(true)
      const data = await CategoriaInsumoService.getCategorias()
      setCategorias(data)
      setError(null)
    } catch (err) {
      showNotification(err.message || "Error al cargar las categorías", "error")
      console.error("Error al cargar categorías:", err)
    } finally {
      setLoading(false)
    }
  }

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
        })
        break
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

  // Manejar cambios en el formulario con validaciones mejoradas
  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === "nombre") {
      // Prevenir que se escriban más de 20 caracteres
      if (value.length > 20) {
        return // No actualizar el estado si excede 20 caracteres
      }

      // Prevenir que se escriban números
      if (/\d/.test(value)) {
        setValidationErrors({
          ...validationErrors,
          nombre: "El nombre no debe contener números",
        })
        return // No actualizar el estado si contiene números
      }

      // Validar longitud mínima
      if (value.length > 0 && value.length < 3) {
        setValidationErrors({
          ...validationErrors,
          nombre: "El nombre debe tener al menos 3 caracteres",
        })
      } else {
        // Validación en tiempo real de nombre duplicado (cliente)
        const exists = categorias.some(
          (c) => normalizeText(c.nombre) === normalizeText(value) && c.id !== formData.id,
        )

        if (exists) {
          setValidationErrors({
            ...validationErrors,
            nombre: "Ya existe una categoría con este nombre",
          })
        } else {
          // Eliminar el error si ya no existe
          const newErrors = { ...validationErrors }
          delete newErrors[name]
          setValidationErrors(newErrors)
        }
      }
    }

    setFormData({
      ...formData,
      [name]: value,
    })
  }

  // Validar el formulario con validaciones completas
  const validateForm = () => {
    const errors = {}

    if (!formData.nombre.trim()) {
      errors.nombre = "El nombre es obligatorio"
    } else if (formData.nombre.trim().length < 3) {
      errors.nombre = "El nombre debe tener al menos 3 caracteres"
    } else if (formData.nombre.trim().length > 20) {
      errors.nombre = "El nombre no puede tener más de 20 caracteres"
    } else if (/\d/.test(formData.nombre)) {
      errors.nombre = "El nombre no debe contener números"
    } else {
      // Validación final de unicidad contra la lista cargada (ignorando tildes)
      const exists = categorias.some(
        (c) => normalizeText(c.nombre) === normalizeText(formData.nombre) && c.id !== formData.id,
      )
      if (exists) {
        errors.nombre = "Ya existe una categoría con este nombre"
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Abrir modal para crear nueva categoría
  const handleOpenCreateModal = () => {
    resetForm()
    setModalMode("create")
    setShowModal(true)
  }

  // Abrir modal para editar categoría
  const handleOpenEditModal = (categoria) => {
    setFormData({
      id: categoria.id,
      nombre: categoria.nombre,
      estado: categoria.estado,
      created_at: categoria.created_at,
      updated_at: categoria.updated_at,
    })
    setModalMode("edit")
    setShowModal(true)
  }

  // Abrir modal para ver detalles
  const handleOpenViewModal = (categoria) => {
    setFormData({
      id: categoria.id,
      nombre: categoria.nombre,
      estado: categoria.estado,
      created_at: categoria.created_at,
      updated_at: categoria.updated_at,
    })
    setModalMode("view")
    setShowModal(true)
  }

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false)
    resetForm()
  }

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      showNotification("Por favor, corrige los errores en el formulario", "error")
      return
    }

    try {
      setLoading(true)

      const categoriaData = {
        nombre: formData.nombre.trim(),
      }

      let data
      if (modalMode === "edit") {
        data = await CategoriaInsumoService.updateCategoria(formData.id, categoriaData)
        showNotification("Categoría actualizada correctamente", "success")
      } else if (modalMode === "create") {
        data = await CategoriaInsumoService.createCategoria(categoriaData)
        showNotification("Categoría creada correctamente", "success")
      }

      // Actualizar la lista de categorías
      await fetchCategorias()

      // Cerrar el modal y resetear el formulario
      handleCloseModal()
    } catch (err) {
      // Manejo de errores más detallado para el formulario
      let errorMessage = err.message || "Error al guardar la categoría"
      // Si hay errores de validación específicos del campo 'nombre'
      if (err.response?.data?.nombre) {
        setValidationErrors({
          ...validationErrors,
          nombre: Array.isArray(err.response.data.nombre) ? err.response.data.nombre[0] : err.response.data.nombre,
        })
        errorMessage = Array.isArray(err.response.data.nombre) ? err.response.data.nombre[0] : err.response.data.nombre
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      }
      showNotification(errorMessage, "error")
      console.error("Error al guardar categoría:", err)
    } finally {
      setLoading(false)
    }
  }

  // Función para cambiar el estado de una categoría
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setLoading(true)

      const newStatus = currentStatus === "activo" ? "inactivo" : "activo"

      // Si vamos a inactivar, validar dependencias (insumos activos)
      if (newStatus === "inactivo") {
        try {
          const check = await CategoriaInsumoService.checkCategoriaCanBeDeleted(id)
          const info = check?.insumos_info || {}
          const activos = Number(info.activos ?? info.total ?? 0)
          if (activos > 0) {
            showNotification(
              `No se puede inactivar: hay ${activos} insumo(s) asociado(s) activo(s).`,
              "warning",
            )
            return
          }
        } catch (preErr) {
          showNotification(
            "No fue posible verificar dependencias. Intente nuevamente o contacte al administrador.",
            "error",
          )
          return
        }
      }

      await CategoriaInsumoService.cambiarEstado(id, newStatus)

      // Mostrar mensaje de éxito
      showNotification(`Categoría ${newStatus === "activo" ? "activada" : "desactivada"} correctamente`, "success")

      // Actualizar la lista de categorías
      await fetchCategorias()
    } catch (err) {
      showNotification(err.message || "Error al cambiar el estado", "error")
      console.error("Error al cambiar estado de categoría:", err)
    } finally {
      setLoading(false)
    }
  }

  // Confirmar eliminación de categoría
  const confirmDelete = (categoria) => {
    // Pre-chequeo antes de abrir el diálogo: bloquear si tiene insumos asociados
    CategoriaInsumoService.checkCategoriaCanBeDeleted(categoria.id)
      .then((check) => {
        if (!check?.puede_eliminar) {
          const info = check?.insumos_info || {}
          const total = Number(info.total || 0)
          showNotification(
            `No se puede eliminar la categoría '${check?.categoria_nombre || categoria.nombre}' porque tiene ${total} insumo(s) asociado(s).`,
            "error",
          )
          return
        }
        setCategoriaToDelete(categoria)
        setShowConfirmDialog(true)
      })
      .catch(() => {
        showNotification(
          "No fue posible verificar si la categoría tiene insumos asociados. Intente nuevamente.",
          "error",
        )
      })
  }

  // Función para eliminar una categoría
  const handleDelete = async () => {
    if (!categoriaToDelete) return

    try {
      setLoading(true)
      console.log("Intentando eliminar categoría con ID:", categoriaToDelete.id)

      const result = await CategoriaInsumoService.deleteCategoria(categoriaToDelete.id)

      // Actualizar la lista de categorías localmente
      setCategorias(categorias.filter((categoria) => categoria.id !== categoriaToDelete.id))

      // Mostrar mensaje de éxito
      showNotification(result.message || "Categoría eliminada correctamente", "success")
    } catch (err) {
      console.error("❌ Error completo al eliminar:", err)

      // Manejo de errores más específico, similar a Roles.jsx
      let errorMessage = "Error desconocido al eliminar la categoría"

      // Si el error viene de la validación del servicio (con insumos asociados)
      if (err.message && err.message.includes("No se puede eliminar la categoría")) {
        errorMessage = err.message
      } else if (err.response) {
        // Errores de respuesta de Axios
        console.error("Respuesta del servidor:", {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers,
        })

        switch (err.response.status) {
          case 404:
            errorMessage = "La categoría no existe o ya fue eliminada."
            // Opcionalmente, actualiza la lista para reflejar el cambio si ya fue eliminada en el servidor
            setCategorias((prevCategorias) => prevCategorias.filter((cat) => cat.id !== categoriaToDelete.id))
            break
          case 400:
            // Este es el caso más importante - categoría con insumos asociados
            if (err.response.data?.error) {
              errorMessage = err.response.data.error
            } else if (err.response.data?.detail) {
              errorMessage = err.response.data.detail
            } else {
              errorMessage = "No se puede eliminar la categoría porque tiene insumos asociados."
            }
            break
          case 403:
            errorMessage = "No tienes permisos para eliminar esta categoría."
            break
          case 409:
            errorMessage = "No se puede eliminar la categoría porque está siendo utilizada en otros registros."
            break
          case 500:
            errorMessage = "Error interno del servidor. Contacte al administrador."
            break
          default:
            if (err.response.data) {
              if (typeof err.response.data === "string") {
                errorMessage = err.response.data
              } else if (err.response.data.error) {
                errorMessage = err.response.data.error
              } else if (err.response.data.message) {
                errorMessage = err.response.data.message
              } else if (err.response.data.detail) {
                errorMessage = err.response.data.detail
              }
            }
        }
      } else if (err.request) {
        console.error("No se recibió respuesta del servidor:", err.request)
        errorMessage = "No se pudo conectar con el servidor. Verifique su conexión."
      } else {
        console.error(err.message)
        errorMessage = err.message
      }

      showNotification(errorMessage, "error")
    } finally {
      setLoading(false)
      setShowConfirmDialog(false)
      setCategoriaToDelete(null)
    }
  }

  // Resetear el formulario
  const resetForm = () => {
    setFormData({
      id: null,
      nombre: "",
      estado: "activo",
      created_at: "",
      updated_at: "",
    })
    setModalMode("create")
    setValidationErrors({})
  }

  // Filtrar categorías según término de búsqueda (por nombre o estado, ignorando tildes)
  const filteredCategorias = categorias.filter((categoria) => {
    const term = normalizeText(searchTerm)
    if (!term) return true
    const nombre = normalizeText(categoria.nombre)
    const estado = normalizeText(categoria.estado) // "activo" | "inactivo"
    // Si el usuario busca exactamente un estado, compara por igualdad estricta
    if (term === "activo" || term === "inactivo") {
      return estado === term
    }
    // De lo contrario, búsqueda por nombre (y dejamos que coincida también por estado de forma no estricta)
    return nombre.includes(term) || estado.includes(term)
  })

  // Lógica para paginación
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredCategorias.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredCategorias.length / itemsPerPage)

  // Cambiar página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
  }

  return (
    <div className="admin-container">
      {/* Toaster para las notificaciones */}
      <Toaster />
      <div className="admin-header">
        <h1 className="admin-title">Gestión de Categorías de Insumos</h1>
        <PermissionButton
          modulo="categoria_insumos"
          accion="crear"
          className="admin-button primary"
          onClick={handleOpenCreateModal}
          hidden={true}
        >
          <FaPlus /> Crear Categoría
        </PermissionButton>
      </div>

      {/* Filtros y búsqueda */}
      <div className="admin-filters">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar categoría..."
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

      {/* Tabla de categorías */}
      {loading && !categorias.length ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando categorías...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>{error}</p>
          <button className="admin-button secondary" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="no-data">
                      No hay categorías registradas
                    </td>
                  </tr>
                ) : (
                  currentItems.map((categoria) => (
                    <tr key={categoria.id}>
                      <td>{categoria.nombre}</td>
                      <td>
                        <div className="status-toggle">
                          <span className={`status-badge ${categoria.estado === "activo" ? "active" : "inactive"}`}>
                            {categoria.estado === "activo" ? "Activo" : "Inactivo"}
                          </span>
                          <PermissionWrapper
                            modulo="categoria_insumos"
                            accion="editar"
                          >
                            <button
                              className={`toggle-button ${categoria.estado === "activo" ? "active" : "inactive"}`}
                              onClick={() => handleToggleStatus(categoria.id, categoria.estado)}
                              title={categoria.estado === "activo" ? "Desactivar" : "Activar"}
                            >
                              {categoria.estado === "activo" ? <FaTimes /> : <FaCheck />}
                            </button>
                          </PermissionWrapper>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <PermissionButton
                            modulo="categoria_insumos"
                            accion="ver_detalles"
                            className="action-button view"
                            onClick={() => handleOpenViewModal(categoria)}
                            title="Ver detalles"
                            hidden={true}
                          >
                            <FaEye />
                          </PermissionButton>
                          <PermissionButton
                            modulo="categoria_insumos"
                            accion="editar"
                            className="action-button edit"
                            onClick={() => handleOpenEditModal(categoria)}
                            title="Editar categoría"
                            hidden={true}
                          >
                            <FaEdit />
                          </PermissionButton>
                          <PermissionButton
                            modulo="categoria_insumos"
                            accion="eliminar"
                            className="action-button delete"
                            onClick={() => confirmDelete(categoria)}
                            title="Eliminar categoría"
                            hidden={true}
                          >
                            <FaTrash />
                          </PermissionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="pagination-button" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
                &laquo;
              </button>
              <button
                className="pagination-button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                &lt;
              </button>

              <div className="pagination-info">
                Página {currentPage} de {totalPages}
              </div>

              <button
                className="pagination-button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                &gt;
              </button>
              <button
                className="pagination-button"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                &raquo;
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal unificado para crear/editar/ver categoría */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container categoria-insumos-modal">
            <div className="modal-header">
              <h2>
                {modalMode === "create" && "Crear Categoría"}
                {modalMode === "edit" && "Editar Categoría"}
                {modalMode === "view" && "Detalles de la Categoría"}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nombre">
                    <FaTag className="form-icon" /> Nombre
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className={validationErrors.nombre ? "error" : ""}
                    placeholder="Nombre de la categoría"
                    required={modalMode !== "view"}
                    disabled={modalMode === "view"}
                    maxLength={20}
                  />
                  {validationErrors.nombre && (
                    <div className="error-text">
                      <FaExclamationCircle />
                      {validationErrors.nombre}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="admin-button secondary" onClick={handleCloseModal}>
                  {modalMode === "view" ? "Cerrar" : "Cancelar"}
                </button>
                {modalMode !== "view" && (
                  <button type="submit" className="admin-button primary" disabled={loading || !!validationErrors.nombre || !formData.nombre || formData.nombre.trim().length < 3}>
                    {loading ? (
                      <>
                        <div className="spinner-small"></div>
                        Guardando...
                      </>
                    ) : (
                      <>{modalMode === "edit" ? "Actualizar" : "Guardar"}</>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diálogo de confirmación para eliminar */}
      {showConfirmDialog && (
        <div className="modal-overlay">
          <div className="modal-container confirm-dialog">
            <div className="modal-header">
              <h2>Confirmar Eliminación</h2>
              <button className="modal-close" onClick={() => setShowConfirmDialog(false)}>
                &times;
              </button>
            </div>

            <div className="confirm-content">
              <div className="warning-icon">
                <FaExclamationTriangle />
              </div>
              <p>
                ¿Está seguro que desea eliminar la categoría <strong>{categoriaToDelete?.nombre}</strong>?
              </p>
              <p className="warning-text">Esta acción no se puede deshacer.</p>
            </div>

            <div className="form-actions">
              <button className="admin-button secondary" onClick={() => setShowConfirmDialog(false)} disabled={loading}>
                <FaTimes /> Cancelar
              </button>
              <button className="admin-button danger" onClick={handleDelete} disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <FaTrash /> Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoriaInsumos
