"use client";
import { useState, useEffect, useRef } from "react";
import {
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaWhatsapp,
  FaUser,
  FaCalendarAlt,
  FaImages,
  FaHandSparkles,
  FaSignOutAlt,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaArrowRight,
  FaPlay,
} from "react-icons/fa";
import "../styles/Home.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import serviciosService from "../service/serviciosService";

const Home = () => {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("");
  const [scrollY, setScrollY] = useState(0);
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const containerRef = useRef(null);

  // Efecto para cargar los servicios desde la API
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      
      try {
        // Cargar servicios activos desde la API
        const data = await serviciosService.obtenerServicios({ estado: "activo" });
        console.log("✅ Servicios cargados desde API:", data);

        // Mapear los datos de la API al formato que espera el componente
        const serviciosMapeados = data.map((servicio) => ({
          id: servicio.id,
          nombre: servicio.nombre,
          descripcion: servicio.descripcion,
          precio: Number.parseFloat(servicio.precio),
          duracion: servicio.duracion,
          imagen: servicio.imagen || "/placeholder.svg?height=200&width=300",
          estado: servicio.estado,
        }));

        setServices(serviciosMapeados);
      } catch (error) {
        console.error("Error al cargar servicios:", error);
        // En caso de error, usar datos de ejemplo
        setServices([
          {
            id: 1,
            nombre: "Manicura Básica",
            descripcion: "Limado, pulido y esmaltado de uñas con tratamiento hidratante.",
            precio: 25000,
            duracion: 45,
            imagen: "/placeholder.svg?height=200&width=300",
          },
          {
            id: 2,
            nombre: "Pedicura Spa",
            descripcion: "Tratamiento completo para pies con exfoliación, masaje y esmaltado.",
            precio: 35000,
            duracion: 60,
            imagen: "/placeholder.svg?height=200&width=300",
          },
          {
            id: 3,
            nombre: "Uñas Acrílicas",
            descripcion: "Aplicación de uñas acrílicas con diseño a elección.",
            precio: 45000,
            duracion: 90,
            imagen: "/placeholder.svg?height=200&width=300",
          },
          {
            id: 4,
            nombre: "Nail Art Premium",
            descripcion: "Diseños exclusivos y personalizados para tus uñas.",
            precio: 30000,
            duracion: 75,
            imagen: "/placeholder.svg?height=200&width=300",
          },
        ]);
      }
      
      setIsLoading(false);
    };

    fetchServices();

    // Detectar la sección activa al hacer scroll
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setScrollY(scrollTop);

      // 👉 Lógica mejorada de sección activa
      const sections = document.querySelectorAll("section[id]");
      const navbarHeight = 100;
      const scrollPosition = scrollTop + navbarHeight + 50;

      let currentSection = "";
      
      sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;

        if (
          scrollPosition >= sectionTop &&
          scrollPosition < sectionTop + sectionHeight
        ) {
          currentSection = section.id;
        }
      });

      // Si estamos en el top, no mostrar ninguna sección activa
      if (scrollTop < 100) {
        setActiveSection("");
      } else {
        setActiveSection(currentSection);
      }

      // 👉 Lógica del navbar
      const navbar = document.querySelector(".navbar");
      if (navbar) {
        if (scrollTop > 50) {
          navbar.classList.add("navbar-scrolled");
        } else {
          navbar.classList.remove("navbar-scrolled");
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Función para formatear precio en pesos colombianos 💰
  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Función para formatear duración ⏱️
  const formatDuration = (minutes) => {
    if (!minutes) return "";
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}min`
        : `${hours}h`;
    }
  };

  // Función para navegar a las secciones
  const scrollToSection = (sectionId) => {
    console.log(`Intentando hacer scroll a la sección: ${sectionId}`);
    
    const section = document.getElementById(sectionId);
    console.log("Sección encontrada:", section);
    
    if (section) {
      console.log(`Usando scrollIntoView para la sección: ${sectionId}`);
      
      // Usar scrollIntoView en lugar de window.scrollTo
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest"
      });
      
      // Actualizar la sección activa inmediatamente
      setActiveSection(sectionId);
      console.log(`Sección activa actualizada a: ${sectionId}`);
    } else {
      console.error(`No se encontró la sección con ID: ${sectionId}`);
    }
  };


  const irAIniciarSesion = () => {
    navigate("/login");
  };

  const handleLogout = async () => {
    try {
      await logout();
      // No es necesario navegar, ya que estamos en la página de inicio
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Funciones para el carrusel de servicios
  const nextService = () => {
    setCurrentServiceIndex((prev) => (prev + 1) % services.length);
  };

  const prevService = () => {
    setCurrentServiceIndex((prev) => (prev - 1 + services.length) % services.length);
  };

  const goToService = (index) => {
    setCurrentServiceIndex(index);
  };

  return (
    <div className="home-container">
      {/* Navbar */}
      <nav className={`navbar ${scrollY > 50 ? "navbar-scrolled" : ""}`}>
        <div className="logo-container">
          <div className="logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="logo-text">Wine</span>
            <span className="logo-accent">Spa</span>
          </div>
        </div>
        <div className="nav-links">
          <ul>
            <li className={activeSection === "galeria" ? "active" : ""}>
              <button 
                className="nav-link-btn"
                onClick={(e) => {
                  e.preventDefault();
                  console.log("Botón Galería clickeado");
                  scrollToSection("galeria");
                }}
              >
                <FaImages className="nav-icon" />
                <span>Galería</span>
              </button>
            </li>
            <li className={activeSection === "servicios" ? "active" : ""}>
              <button 
                className="nav-link-btn"
                onClick={(e) => {
                  e.preventDefault();
                  console.log("Botón Servicios clickeado");
                  scrollToSection("servicios");
                }}
              >
                <FaHandSparkles className="nav-icon" />
                <span>Servicios</span>
              </button>
            </li>
          </ul>
        </div>
        <div className="nav-actions">
          {console.log("Usuario en Home:", user)}
          {user ? (
            <div className="user-actions">
              <button className="profile-btn" onClick={() => {
                console.log("Navegando a perfil desde navbar");
                navigate("/perfil");
              }}>
                <FaUser className="profile-icon" />
                <span>Mi Perfil</span>
              </button>
              <button className="login-btn" onClick={handleLogout}>
                <FaSignOutAlt className="logout-icon" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={irAIniciarSesion}>
              <FaUser className="login-icon" />
              <span>Iniciar Sesión</span>
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-overlay"></div>
          <img src="../../Principal.jpg" alt="Wine Nails Spa" className="hero-bg-image" />
        </div>
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="title-main">Wine Nails Spa</span>
              <span className="title-sub">Belleza y Elegancia para tus Manos</span>
            </h1>
            <p className="hero-description">
              Descubre el arte de la belleza en un ambiente de lujo y relajación. 
              Nuestros expertos te brindan los mejores tratamientos para realzar tu belleza natural.
            </p>
            <div className="hero-actions">
              <button
                className="cta-primary"
                onClick={() => {
                  console.log("Navegando a /reservar-cita desde hero");
                  navigate("/reservar-cita");
                }}
              >
                <FaCalendarAlt className="btn-icon" />
                <span>Reservar Cita</span>
                <FaArrowRight className="btn-arrow" />
              </button>
              <button
                className="cta-secondary"
                onClick={() => scrollToSection("servicios")}
              >
                <FaPlay className="btn-icon" />
                <span>Ver Servicios</span>
              </button>
            </div>
          </div>
        </div>
      </section>


      {/* Galería Section */}
      <section id="galeria" className="galeria-section">
        <div className="section-header">
          <h2 className="section-title">Nuestra Galería de Diseños</h2>
          <p className="section-subtitle">
            Inspírate con nuestros trabajos más destacados
          </p>
        </div>
        <div className="galeria-grid">
          <div className="galeria-item featured">
            <img src="../../galeria1.jpg" alt="Diseño Floral" />
            <div className="galeria-overlay">
              <div className="overlay-content">
                <h3>Diseño Floral</h3>
                <p>Inspiración natural y elegante</p>
                <button className="overlay-btn">Ver Detalles</button>
              </div>
            </div>
          </div>
          <div className="galeria-item">
            <img src="../../galeria2.jpg" alt="Estilo Minimalista" />
            <div className="galeria-overlay">
              <div className="overlay-content">
                <h3>Estilo Minimalista</h3>
                <p>Simplicidad y elegancia</p>
              </div>
            </div>
          </div>
          <div className="galeria-item">
            <img src="../../galeria3.jpg" alt="Glitter Elegante" />
            <div className="galeria-overlay">
              <div className="overlay-content">
                <h3>Glitter Elegante</h3>
                <p>Brillo y sofisticación</p>
              </div>
            </div>
          </div>
          <div className="galeria-item">
            <img src="../../galeria4.jpg" alt="Diseño Geométrico" />
            <div className="galeria-overlay">
              <div className="overlay-content">
                <h3>Diseño Geométrico</h3>
                <p>Líneas y formas modernas</p>
              </div>
            </div>
          </div>
          <div className="galeria-item">
            <img src="../../galeria5.jpg" alt="Estilo Francés" />
            <div className="galeria-overlay">
              <div className="overlay-content">
                <h3>Estilo Francés</h3>
                <p>Clásico y atemporal</p>
              </div>
            </div>
          </div>
          <div className="galeria-item">
            <img src="../../galeria6.jpg" alt="Diseño Abstracto" />
            <div className="galeria-overlay">
              <div className="overlay-content">
                <h3>Diseño Abstracto</h3>
                <p>Arte en tus uñas</p>
              </div>
            </div>
          </div>
          <div className="galeria-item">
            <img src="../../galeria7.jpg" alt="Diseño Especial" />
            <div className="galeria-overlay">
              <div className="overlay-content">
                <h3>Diseño Especial</h3>
                <p>Creatividad única</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios Section */}
      <section id="servicios" className="servicios-section">
        <div className="section-header">
          <h2 className="section-title">Nuestros Servicios</h2>
        </div>
        <div className="servicios-container">
          {isLoading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Cargando servicios...</p>
            </div>
          ) : services.length > 0 ? (
            <div className="servicios-carrusel">
              <button className="carrusel-btn prev-btn" onClick={prevService}>
                <FaArrowRight className="btn-icon" />
              </button>
              
              <div className="servicio-card-container">
                <div className="servicio-card">
                  <div className="servicio-image">
                    <img
                      src={services[currentServiceIndex].imagen || "/placeholder.svg"}
                      alt={services[currentServiceIndex].nombre}
                      onError={(e) => {
                        e.target.src = "/placeholder.svg?height=200&width=300";
                      }}
                    />
                  </div>
                  <div className="servicio-content">
                    <div className="servicio-header">
                      <h3 className="servicio-title">{services[currentServiceIndex].nombre}</h3>
                      <div className="servicio-price">
                        {formatPrice(services[currentServiceIndex].precio)}
                      </div>
                    </div>
                    <p className="servicio-descripcion">{services[currentServiceIndex].descripcion}</p>
                    <div className="servicio-features">
                      {services[currentServiceIndex].duracion && (
                        <div className="feature">
                          <FaClock className="feature-icon" />
                          <span>{formatDuration(services[currentServiceIndex].duracion)}</span>
                        </div>
                      )}
                    </div>
                    <div className="servicio-actions">
                      <button
                        className="reservar-btn"
                        onClick={() => {
                          console.log("Navegando a /reservar-cita desde servicio");
                          navigate("/reservar-cita");
                        }}
                      >
                        <FaCalendarAlt className="btn-icon" />
                        <span>Reservar Ahora</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <button className="carrusel-btn next-btn" onClick={nextService}>
                <FaArrowRight className="btn-icon" />
              </button>
              
            </div>
          ) : (
            <div className="no-services">
              <p>No hay servicios disponibles en este momento.</p>
            </div>
          )}
        </div>
      </section>


      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-main">
            <div className="footer-logo">
              <div className="logo">
                <span className="logo-text">Wine</span>
                <span className="logo-accent">Spa</span>
              </div>
              <p className="footer-slogan">
                Belleza y elegancia para tus manos. Tu spa de confianza para 
                tratamientos premium de uñas y cuidado personal.
              </p>
              <div className="footer-social">
                <h4>Síguenos</h4>
                <div className="social-icons">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon instagram"
                  >
                    <FaInstagram />
                  </a>
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon facebook"
                  >
                    <FaFacebook />
                  </a>
                  <a
                    href="https://tiktok.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon tiktok"
                  >
                    <FaTiktok />
                  </a>
                </div>
              </div>
            </div>
            <div className="footer-sections">
              <div className="footer-section">
                <h3>Horarios</h3>
                <div className="footer-info">
                  <div className="info-item">
                    <FaClock className="info-icon" />
                    <div>
                      <p><strong>Lunes - Viernes</strong></p>
                      <p>9:00 AM - 8:00 PM</p>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaClock className="info-icon" />
                    <div>
                      <p><strong>Sábado</strong></p>
                      <p>10:00 AM - 6:00 PM</p>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaClock className="info-icon" />
                    <div>
                      <p><strong>Domingo</strong></p>
                      <p>Cerrado</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="footer-section">
                <h3>Contacto</h3>
                <div className="footer-info">
                  <div className="info-item">
                    <FaMapMarkerAlt className="info-icon" />
                    <div>
                      <p><strong>Dirección</strong></p>
                      <p>Av. Principal #123, Ciudad</p>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaPhone className="info-icon" />
                    <div>
                      <p><strong>Teléfono</strong></p>
                      <p>(123) 456-7890</p>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaEnvelope className="info-icon" />
                    <div>
                      <p><strong>Email</strong></p>
                      <p>info@winespa.com</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="footer-section">
                <h3>Servicios</h3>
                <ul className="footer-links">
                  <li><a href="#servicios">Manicura Premium</a></li>
                  <li><a href="#servicios">Pedicura Spa</a></li>
                  <li><a href="#servicios">Uñas Acrílicas</a></li>
                  <li><a href="#servicios">Nail Art</a></li>
                  <li><a href="#galeria">Diseños Personalizados</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p>
              &copy; {new Date().getFullYear()} Wine Nails Spa. Todos los derechos reservados.
            </p>
            <div className="footer-bottom-links">
              <a href="#privacy">Política de Privacidad</a>
              <a href="#terms">Términos de Servicio</a>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Button */}
      <a
        href="https://wa.me/573197072921"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-btn"
        style={{ bottom: `${Math.min(20 + scrollY * 0.05, 100)}px` }}
      >
        <div className="whatsapp-icon">
          <FaWhatsapp />
        </div>
        <div className="whatsapp-content">
          <span className="whatsapp-text">¡Chatea con nosotros!</span>
          <span className="whatsapp-subtext">Reserva tu cita</span>
        </div>
        <div className="whatsapp-pulse"></div>
      </a>
    </div>
  );
};

export default Home;
