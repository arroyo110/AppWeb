"use client"

import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../../context/authContext"
import { FaEye, FaEyeSlash, FaSpa } from "react-icons/fa"
import { toast } from "react-hot-toast"

const RegisterForm = () => {
  const navigate = useNavigate()
  const { register } = useAuth()

  // Estado para los campos del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    tipo_documento: "CC",
    documento: "",
    celular: "",
    correo_electronico: "",
    direccion: "",
    password: "",
    confirmPassword: "",
  })

  // Estado para errores de validación
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Estado para mensaje de error general (ya no se usa, se usa toast)
  // const [generalError, setGeneralError] = useState("")

  // Estado para indicar si el formulario está enviándose
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado para mostrar/ocultar contraseñas
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Estados para dirección
  const [tipoVia, setTipoVia] = useState("")
  const [numeroPrincipal, setNumeroPrincipal] = useState("")
  const [numeroSecundario, setNumeroSecundario] = useState("")
  const [complemento, setComplemento] = useState("")

  // Validación en tiempo real
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      validateField()
    }
  }, [formData])

  // Manejar cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    setTouched({
      ...touched,
      [name]: true,
    })
  }

  // Manejar cuando un campo pierde el foco
  const handleBlur = (e) => {
    const { name } = e.target
    setTouched({
      ...touched,
      [name]: true,
    })
    validateField(name)
  }

  const actualizarDireccion = () => {
    const direccionCompleta = `${tipoVia} ${numeroPrincipal} #${numeroSecundario}-${complemento}`.trim()

    setFormData((prev) => ({
      ...prev,
      direccion: direccionCompleta,
    }))

    setTouched((prev) => ({ ...prev, direccion: true }))
    validateField("direccion")
  }

  // Efecto para actualizar la dirección cuando cambian los componentes
  useEffect(() => {
    if (tipoVia || numeroPrincipal || numeroSecundario || complemento) {
      actualizarDireccion()
    }
  }, [tipoVia, numeroPrincipal, numeroSecundario, complemento])

  // Validar un campo específico o todos los campos
  const validateField = (fieldName = null) => {
    const newErrors = { ...errors }

    const validateSingleField = (name) => {
      switch (name) {
        case "nombre":
          if (!formData.nombre.trim()) {
            newErrors.nombre = "El nombre completo es requerido"
          } else if (formData.nombre.trim().length < 3) {
            newErrors.nombre = "El nombre debe tener al menos 3 caracteres"
          } else if (formData.nombre.trim().length > 50) {
            newErrors.nombre = "El nombre no puede tener más de 50 caracteres"
          } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.nombre)) {
            newErrors.nombre = "El nombre solo puede contener letras y espacios"
          } else {
            delete newErrors.nombre
          }
          break

        case "documento": {
          const { documento, tipo_documento } = formData
          if (!documento.trim()) {
            newErrors.documento = "El número de documento es requerido"
          } else {
            let isValid = false

            switch (tipo_documento) {
              case "CC":
                if (documento.length < 6) {
                  newErrors.documento = "La cédula debe tener al menos 6 dígitos"
                } else if (documento.length > 10) {
                  newErrors.documento = "La cédula no puede tener más de 10 dígitos"
                } else if (!/^\d+$/.test(documento)) {
                  newErrors.documento = "La cédula solo puede contener números"
                } else {
                  isValid = true
                }
                break

              case "TI":
                if (documento.length < 6) {
                  newErrors.documento = "La TI debe tener al menos 6 dígitos"
                } else if (documento.length > 10) {
                  newErrors.documento = "La TI no puede tener más de 10 dígitos"
                } else if (!documento.startsWith("1") && !documento.startsWith("0")) {
                  newErrors.documento = "La TI debe iniciar con 1 o 0"
                } else if (!/^\d+$/.test(documento)) {
                  newErrors.documento = "La TI solo puede contener números"
                } else {
                  isValid = true
                }
                break

              case "CE":
                if (documento.length < 6) {
                  newErrors.documento = "La CE debe tener al menos 6 caracteres"
                } else if (documento.length > 15) {
                  newErrors.documento = "La CE no puede tener más de 15 caracteres"
                } else if (!/^[a-zA-Z0-9]+$/.test(documento)) {
                  newErrors.documento = "La CE solo puede contener letras y números"
                } else {
                  isValid = true
                }
                break

              case "PP":
                if (documento.length < 8) {
                  newErrors.documento = "El pasaporte debe tener al menos 8 caracteres"
                } else if (documento.length > 12) {
                  newErrors.documento = "El pasaporte no puede tener más de 12 caracteres"
                } else if (!/^[a-zA-Z0-9]+$/.test(documento)) {
                  newErrors.documento = "El pasaporte solo puede contener letras y números"
                } else {
                  isValid = true
                }
                break

              default:
                newErrors.documento = "Tipo de documento no reconocido"
                break
            }

            if (isValid) delete newErrors.documento
          }
          break
        }

        case "celular":
          if (!formData.celular.trim()) {
            newErrors.celular = "El número de celular es requerido"
          } else if (formData.celular.length < 10) {
            newErrors.celular = "El celular debe tener exactamente 10 dígitos"
          } else if (formData.celular.length > 10) {
            newErrors.celular = "El celular no puede tener más de 10 dígitos"
          } else if (!formData.celular.startsWith("3")) {
            newErrors.celular = "El celular debe iniciar con 3"
          } else if (!/^[3][0-9]{9}$/.test(formData.celular)) {
            newErrors.celular = "Formato de celular inválido"
          } else {
            delete newErrors.celular
          }
          break

        case "correo_electronico": {
          const value = formData.correo_electronico

          if (!value.trim()) {
            newErrors.correo_electronico = "El correo electrónico es requerido"
          } else if (value.length >= 50) {
            newErrors.correo_electronico = "El correo no puede tener más de 50 caracteres"
          } else if (!value.includes("@")) {
            newErrors.correo_electronico = "El correo debe contener el símbolo @"
          } else if (!value.includes(".")) {
            newErrors.correo_electronico = "El correo debe contener un punto (.)"
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            newErrors.correo_electronico = "Formato de correo electrónico inválido"
          } else {
            delete newErrors.correo_electronico
          }
          break
        }

        case "direccion":
          if (!tipoVia) {
            newErrors.direccion = "Debe seleccionar el tipo de vía"
          } else if (!numeroPrincipal) {
            newErrors.direccion = "Debe ingresar el número principal"
          } else if (!numeroSecundario) {
            newErrors.direccion = "Debe ingresar el número secundario"
          } else if (!complemento) {
            newErrors.direccion = "Debe ingresar el complemento"
          } else if (!/^[a-zA-Z0-9]{1,6}$/.test(numeroPrincipal)) {
            newErrors.direccion = "Número principal inválido (1-6 caracteres alfanuméricos)"
          } else if (!/^[a-zA-Z0-9]{1,6}$/.test(numeroSecundario)) {
            newErrors.direccion = "Número secundario inválido (1-6 caracteres alfanuméricos)"
          } else if (!/^[a-zA-Z0-9]{1,6}$/.test(complemento)) {
            newErrors.direccion = "Complemento inválido (1-6 caracteres alfanuméricos)"
          } else {
            delete newErrors.direccion
          }
          break

        case "password":
          if (!formData.password) {
            newErrors.password = "La contraseña es requerida"
          } else if (formData.password.length < 6) {
            newErrors.password = "La contraseña debe tener al menos 6 caracteres"
          } else if (!/(?=.*[A-Z])/.test(formData.password)) {
            newErrors.password = "La contraseña debe incluir al menos una mayúscula"
          } else if (!/(?=.*\d)/.test(formData.password)) {
            newErrors.password = "La contraseña debe incluir al menos un número"
          } else if (!/(?=.*[!@#$%^&*])/.test(formData.password)) {
            newErrors.password = "La contraseña debe incluir al menos un símbolo (!@#$%^&*)"
          } else {
            delete newErrors.password
          }

          // Si cambia la contraseña, verificar confirmación
          if (touched.confirmPassword && formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Las contraseñas no coinciden"
          } else if (touched.confirmPassword) {
            delete newErrors.confirmPassword
          }
          break

        case "confirmPassword":
          if (!formData.confirmPassword) {
            newErrors.confirmPassword = "Debe confirmar la contraseña"
          } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Las contraseñas no coinciden"
          } else {
            delete newErrors.confirmPassword
          }
          break

        default:
          break
      }
    }

    if (fieldName) {
      validateSingleField(fieldName)
    } else {
      // Validar todos los campos que han sido tocados
      Object.keys(touched).forEach(validateSingleField)
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Validar el formulario completo
  const validateForm = () => {
    const newErrors = {}

    // Validación del nombre
    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre completo es requerido"
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = "El nombre debe tener al menos 3 caracteres"
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.nombre)) {
      newErrors.nombre = "El nombre solo puede contener letras y espacios"
    }

    // Validación del documento
    if (!formData.documento.trim()) {
      newErrors.documento = "El número de documento es requerido"
    } else if (formData.documento.length < 6) {
      newErrors.documento = "El documento debe tener al menos 6 caracteres"
    }

    // Validación del celular
    if (!formData.celular.trim()) {
      newErrors.celular = "El número de celular es requerido"
    } else if (formData.celular.length !== 10) {
      newErrors.celular = "El celular debe tener exactamente 10 dígitos"
    } else if (!formData.celular.startsWith("3")) {
      newErrors.celular = "El celular debe iniciar con 3"
    }

    // Validación del correo
    if (!formData.correo_electronico.trim()) {
      newErrors.correo_electronico = "El correo electrónico es requerido"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo_electronico)) {
      newErrors.correo_electronico = "Formato de correo electrónico inválido"
    }

    // Validación de la dirección
    if (!formData.direccion.trim()) {
      newErrors.direccion = "La dirección completa es requerida"
    }

    // Validación de la contraseña
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida"
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres"
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = "La contraseña debe incluir al menos una mayúscula"
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = "La contraseña debe incluir al menos un número"
    } else if (!/(?=.*[!@#$%^&*])/.test(formData.password)) {
      newErrors.password = "La contraseña debe incluir al menos un símbolo"
    }

    // Validación de confirmación de contraseña
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Debe confirmar la contraseña"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden"
    }

    setErrors(newErrors)
    setTouched({
      nombre: true,
      documento: true,
      celular: true,
      correo_electronico: true,
      direccion: true,
      password: true,
      confirmPassword: true,
    })

    return Object.keys(newErrors).length === 0
  }

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validar formulario
    if (!validateForm()) {
      return
    }

    // Preparar datos para enviar
    const userData = {
      nombre: formData.nombre,
      tipo_documento: formData.tipo_documento,
      documento: formData.documento,
      celular: formData.celular,
      correo_electronico: formData.correo_electronico,
      direccion: formData.direccion,
      password: formData.password, // Incluir la contraseña del usuario
      tipo_usuario: "cliente", // Por defecto se registra como cliente
    }

    setIsSubmitting(true)

    try {
      // Llamar a la función de registro del contexto de autenticación
      const result = await register(userData)

      if (result.success) {
        // Mostrar mensaje de éxito
        toast.success('¡Usuario registrado exitosamente! Bienvenido a WineSpa');
        
        // Navegar a la página principal después del registro exitoso
        // El usuario ya estará autenticado automáticamente
        navigate("/")
      } else {
        // Mostrar errores específicos del backend
        if (result.error) {
          // Si el error contiene múltiples líneas (errores de validación)
          if (result.error.includes('•')) {
            const errorLines = result.error.split('\n').filter(line => line.trim());
            errorLines.forEach(line => {
              if (line.startsWith('•')) {
                toast.error(line.substring(1).trim());
              }
            });
          } else {
            toast.error(result.error);
          }
        } else {
          toast.error("Error al registrar el usuario. Inténtalo nuevamente.");
        }
      }
    } catch (error) {
      console.error("Error en registro:", error)

      // Manejar errores específicos de campos
      if (error.errors) {
        setErrors(error.errors)
        toast.error("Por favor corrige los errores en el formulario")
      } else {
        // Mostrar mensaje de error general
        toast.error(error.message || "Error al registrar el usuario. Inténtalo nuevamente.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Alternar visibilidad de la contraseña
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Alternar visibilidad de la confirmación de contraseña
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  // Verificar la fortaleza de la contraseña
  const getPasswordStrength = () => {
    let strength = 0

    if (!formData.password) return 0
    if (formData.password.length >= 6) strength += 1
    if (formData.password.length >= 8) strength += 1
    if (/[A-Z]/.test(formData.password)) strength += 1
    if (/[a-z]/.test(formData.password)) strength += 1
    if (/\d/.test(formData.password)) strength += 1
    if (/[!@#$%^&*]/.test(formData.password)) strength += 1

    return Math.min(strength, 5)
  }

  // Obtener el color según la fortaleza de la contraseña
  const getPasswordStrengthColor = () => {
    const strength = getPasswordStrength()
    if (strength <= 1) return "#e74c3c" // Rojo - Muy débil
    if (strength === 2) return "#e67e22" // Naranja - Débil
    if (strength === 3) return "#f1c40f" // Amarillo - Media
    if (strength === 4) return "#2ecc71" // Verde claro - Fuerte
    if (strength === 5) return "#27ae60" // Verde oscuro - Muy fuerte
    return "#e0e0e0" // Gris por defecto
  }

  return (
    <form className="register-form-container" onSubmit={handleSubmit}>

      {/* Nombre completo */}
      <div className="register-form-group">
        <label htmlFor="nombre">Nombre completo</label>
        <div className="register-input-container">
          <input
            type="text"
            id="nombre"
            name="nombre"
            maxLength={50}
            value={formData.nombre}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`register-input ${touched.nombre && errors.nombre ? "register-error-input" : ""}`}
            placeholder="Nombre completo"
          />
        </div>
        {touched.nombre && errors.nombre && <span className="register-error-text">{errors.nombre}</span>}
      </div>

      {/* Documento */}
      <div className="register-form-group">
        <label htmlFor="documento">Documento</label>
        <div className="register-input-group">
          <select
            id="tipo_documento"
            name="tipo_documento"
            value={formData.tipo_documento}
            onChange={handleChange}
            className="register-select"
          >
            <option value="CC">CC</option>
            <option value="CE">CE</option>
            <option value="TI">TI</option>
            <option value="PP">PP</option>
          </select>
          <div className="register-input-container register-input-flex">
            <input
              type="text"
              id="documento"
              name="documento"
              maxLength={15}
              value={formData.documento}
              onChange={(e) => {
                // Solo permitir números y letras (alfanumérico)
                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "")
                setFormData({
                  ...formData,
                  documento: value,
                })
                setTouched({
                  ...touched,
                  documento: true,
                })
              }}
              onBlur={handleBlur}
              className={`register-input ${touched.documento && errors.documento ? "register-error-input" : ""}`}
              placeholder="Número"
            />
          </div>
        </div>
        {touched.documento && errors.documento && <span className="register-error-text">{errors.documento}</span>}
      </div>

      {/* Celular */}
      <div className="register-form-group">
        <label htmlFor="celular">Número celular</label>
        <div className="register-input-container">
          <input
            type="text"
            id="celular"
            name="celular"
            maxLength={10}
            value={formData.celular}
            onChange={(e) => {
              // Solo permitir números
              const value = e.target.value.replace(/\D/g, "")
              setFormData({
                ...formData,
                celular: value,
              })
              setTouched({
                ...touched,
                celular: true,
              })
            }}
            onBlur={handleBlur}
            className={`register-input ${touched.celular && errors.celular ? "register-error-input" : ""}`}
            placeholder="3001234567"
          />
        </div>
        {touched.celular && errors.celular && <span className="register-error-text">{errors.celular}</span>}
      </div>

      {/* Correo */}
      <div className="register-form-group">
        <label htmlFor="correo_electronico">Correo electrónico</label>
        <div className="register-input-container">
          <input
            type="email"
            id="correo_electronico"
            name="correo_electronico"
            maxLength={50}
            value={formData.correo_electronico}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`register-input ${touched.correo_electronico && errors.correo_electronico ? "register-error-input" : ""}`}
            placeholder="correo@ejemplo.com"
          />
        </div>
        {touched.correo_electronico && errors.correo_electronico && (
          <span className="register-error-text">{errors.correo_electronico}</span>
        )}
      </div>

      {/* Dirección */}
      <div className="register-form-group register-direccion">
        <label htmlFor="direccion">Dirección</label>
        <div className="register-direccion-horizontal">
          <select value={tipoVia} onChange={(e) => setTipoVia(e.target.value)} className="register-select" required>
            <option value="">Tipo</option>
            <option value="Calle">Calle</option>
            <option value="Carrera">Carrera</option>
            <option value="Avenida">Avenida</option>
            <option value="Transversal">Transversal</option>
            <option value="Diagonal">Diagonal</option>
          </select>

          <input
            type="text"
            value={numeroPrincipal}
            onChange={(e) => setNumeroPrincipal(e.target.value)}
            placeholder="Ej: 34B"
            maxLength={6}
            className="register-input"
          />

          <span className="register-direccion-separador">#</span>

          <input
            type="text"
            value={numeroSecundario}
            onChange={(e) => setNumeroSecundario(e.target.value)}
            placeholder="Ej: 23"
            maxLength={6}
            className="register-input"
          />

          <span className="register-direccion-separador">-</span>

          <input
            type="text"
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
            placeholder="Ej: 45A"
            maxLength={6}
            className="register-input"
          />
        </div>

        <input
          type="text"
          value={`${tipoVia} ${numeroPrincipal} #${numeroSecundario}-${complemento}`}
          className="register-direccion-preview"
          disabled
        />

        {touched.direccion && errors.direccion && <span className="register-error-text">{errors.direccion}</span>}
      </div>

      {/* Contraseña */}
      <div className="register-form-group">
        <label htmlFor="password">Contraseña</label>
        <div className="register-password-container">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            value={formData.password}
            maxLength={100}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`register-input ${touched.password && errors.password ? "register-error-input" : ""}`}
            placeholder="Contraseña"
          />
          <button type="button" className="register-toggle-password" onClick={togglePasswordVisibility} tabIndex="-1">
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        {/* Indicador de seguridad de contraseña */}
        {formData.password && (
          <div className="register-password-strength">
            <div className="register-strength-meter">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`register-strength-segment ${getPasswordStrength() >= level ? "active" : ""}`}
                  style={{
                    "--strength-color": getPasswordStrengthColor(),
                    backgroundColor: getPasswordStrength() >= level ? getPasswordStrengthColor() : "#e0e0e0",
                  }}
                />
              ))}
            </div>
            <span className="register-strength-text" style={{ color: getPasswordStrengthColor() }}>
              {getPasswordStrength() === 0 && "Muy débil"}
              {getPasswordStrength() === 1 && "Muy débil"}
              {getPasswordStrength() === 2 && "Débil"}
              {getPasswordStrength() === 3 && "Media"}
              {getPasswordStrength() === 4 && "Fuerte"}
              {getPasswordStrength() === 5 && "Muy fuerte"}
            </span>
          </div>
        )}

        {touched.password && errors.password && <span className="register-error-text">{errors.password}</span>}
      </div>

      {/* Confirmar contraseña */}
      <div className="register-form-group">
        <label htmlFor="confirmPassword">Confirmar contraseña</label>
        <div className="register-password-container">
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            maxLength={100}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`register-input ${touched.confirmPassword && errors.confirmPassword ? "register-error-input" : ""}`}
            placeholder="Confirmar contraseña"
          />
          <button
            type="button"
            className="register-toggle-password"
            onClick={toggleConfirmPasswordVisibility}
            tabIndex="-1"
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        {touched.confirmPassword && errors.confirmPassword && (
          <span className="register-error-text">{errors.confirmPassword}</span>
        )}
      </div>

      {/* Botón de registro */}
      <div className="register-button-container">
        <button type="submit" disabled={isSubmitting} className="register-button">
          {isSubmitting ? (
            <div className="register-spinner-container">
              <div className="register-spinner"></div>
              <span>Procesando...</span>
            </div>
          ) : (
            <>
              <span>Registrarse</span>
              <FaSpa />
            </>
          )}
        </button>
      </div>

      {/* Enlace a login */}
      <div className="register-login-link">
        <p>
          ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </form>
  )
}

export default RegisterForm
