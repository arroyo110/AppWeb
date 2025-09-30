"use client"

import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/authContext"
import { usePermisos } from "../hooks/usePermisos"
import logoImage from "../assets/logo.jpg"
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Users,
  ShieldCheck,
  ShoppingCart,
  Scissors,
  CreditCard,
  Package,
  Tag,
  Store,
  Truck,
  Calendar,
  UserCircle,
  Bell,
  Briefcase,
  Clock,
  LogOut,
  User,
  Shield,
} from "lucide-react"
import "../styles/Sidebar.css"
import "../styles/modals/ManicuristasModal.css"

const Sidebar = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { puedeVerElementoMenu, esCliente } = usePermisos()
  const [isOpen, setIsOpen] = useState(() => {
    // Recuperar estado del localStorage o usar default basado en screen size
    try {
      const saved = localStorage.getItem("sidebarOpen")
      return saved === "true" ? true : window.innerWidth >= 768
    } catch (e) {
      return window.innerWidth >= 768
    }
  })
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openSubmenus, setOpenSubmenus] = useState({
    compras: false,
    servicios: false,
    ventaServicios: false,
    configuraciones: false,
  })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Routes where sidebar should not be shown
  const excludedRoutes = ["/login", "/", "/register", "/registerForm", "/recuperar-contrasena"]

  // Check if current route should have sidebar
  const shouldShowSidebar = !excludedRoutes.includes(location.pathname)

  // Handle window resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)

      // Solo cambiamos el estado del sidebar automáticamente si es la primera carga
      if (!localStorage.getItem("sidebarOpen")) {
        setIsOpen(!mobile)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }, [location.pathname, isMobile])

  // Guardar el estado del sidebar en localStorage
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("sidebarOpen", isOpen.toString())
    }
  }, [isOpen, isMobile])

  // Don't show sidebar on excluded routes
  if (!shouldShowSidebar) {
    return <div className="admin-container">{children}</div>
  }

  const toggleSubmenu = (submenu) => {
    if (!isOpen && !isMobile) return // Don't allow submenu toggle when sidebar is collapsed

    setOpenSubmenus((prev) => ({
      ...prev,
      [submenu]: !prev[submenu],
    }))
  }

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen)
    } else {
      // Close all submenus when collapsing sidebar
      if (isOpen) {
        setOpenSubmenus({
          compras: false,
          servicios: false,
          ventaServicios: false,
          configuraciones: false,
        })
      }
      setIsOpen(!isOpen)
    }
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  // Obtener el rol del usuario
  const userRole = user?.rol || "Usuario"
  
  // Obtener el nombre del panel según el rol
  const getPanelName = () => {
    const role = userRole?.toLowerCase()
    switch (role) {
      case 'administrador':
        return 'Panel Administrativo'
      case 'manicurista':
        return 'Panel Manicurista'
      case 'ayudante':
        return 'Panel de Ayudante'
      case 'cliente':
        return 'Panel de Cliente'
      default:
        return 'Panel de Usuario'
    }
  }
  
  const sidebarClass = isMobile ? `sidebar ${mobileOpen ? "mobile-open" : ""}` : `sidebar ${isOpen ? "expanded" : ""}`

  return (
    <div className="layout-with-sidebar">
      {/* Sidebar */}
      <div className={sidebarClass} id="main-sidebar">
        <div className="sidebar-header">
          {isOpen ? (
            <>
              <div className="flex flex-col items-center w-full mb-2">
                <div className="flex items-center justify-center w-16 h-16 rounded-full overflow-hidden bg-white shadow-lg border-2 border-[#e83e8c]/20 mb-2">
                  <img
                    src={logoImage || "/placeholder.svg"}
                    alt="WineSpa Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="sidebar-logo">WineSpa</div>
                <div className="text-xs text-[#6c757d] mt-1 user-info">{getPanelName()}</div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center w-12 h-12 rounded-full overflow-hidden bg-white shadow-lg border-2 border-[#e83e8c]/20">
              <img src={logoImage || "/placeholder.svg"} alt="WineSpa Logo" className="w-full h-full object-cover" />
            </div>
          )}
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            <ChevronRight className={isOpen ? "rotate-180" : ""} />
          </button>
        </div>

        <div className="sidebar-content">
          <ul className="sidebar-menu">
            {/* Dashboard - Visible para todos los usuarios autenticados */}
            {puedeVerElementoMenu('/dashboard') && (
              <li className="sidebar-menu-item">
                <Link
                  to={user?.rol?.toLowerCase() === 'manicurista' ? "/dashboard-manicurista" : "/dashboard"}
                  className={`sidebar-menu-button ${(location.pathname === "/dashboard" || location.pathname === "/dashboard-manicurista") ? "active" : ""}`}
                >
                  <LayoutDashboard className="sidebar-menu-icon" />
                  <span className="sidebar-menu-label">Dashboard</span>
                </Link>
              </li>
            )}

            {/* Compras Submenu - Solo visible si tiene permisos para alguno de sus submenús */}
            {(puedeVerElementoMenu('/categoria-insumos') || puedeVerElementoMenu('/insumos') || puedeVerElementoMenu('/proveedores') || puedeVerElementoMenu('/compras')) && (
              <li className="sidebar-menu-item">
                <button
                  className={`sidebar-menu-button ${["/categoria-insumos", "/compras", "/insumos", "/proveedores"].includes(location.pathname) ? "active" : ""}`}
                  onClick={() => toggleSubmenu("compras")}
                >
                  <ShoppingCart className="sidebar-menu-icon" />
                  <span className="sidebar-menu-label">Compras</span>
                  <ChevronDown className={`sidebar-submenu-toggle ${openSubmenus.compras ? "open" : ""}`} />
                </button>

                <ul className={`sidebar-submenu ${openSubmenus.compras && isOpen ? "open" : ""}`}>
                  {puedeVerElementoMenu('/categoria-insumos') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/categoria-insumos"
                        className={`sidebar-submenu-button ${location.pathname === "/categoria-insumos" ? "active" : ""}`}
                      >
                        <Tag className="sidebar-submenu-icon" />
                        <span>Categoria Insumos</span>
                      </Link>
                    </li>
                  )}
                  {puedeVerElementoMenu('/insumos') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/insumos"
                        className={`sidebar-submenu-button ${location.pathname === "/insumos" ? "active" : ""}`}
                      >
                        <Package className="sidebar-submenu-icon" />
                        <span>Insumos</span>
                      </Link>
                    </li>
                  )}
                  {puedeVerElementoMenu('/proveedores') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/proveedores"
                        className={`sidebar-submenu-button ${location.pathname === "/proveedores" ? "active" : ""}`}
                      >
                        <Store className="sidebar-submenu-icon" />
                        <span>Proveedores</span>
                      </Link>
                    </li>
                  )}
                  {puedeVerElementoMenu('/compras') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/compras"
                        className={`sidebar-submenu-button ${location.pathname === "/compras" ? "active" : ""}`}
                      >
                        <ShoppingCart className="sidebar-submenu-icon" />
                        <span>Compras</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </li>
            )}

            {/* Servicios Submenu - Solo visible si tiene permisos para alguno de sus submenús */}
            {(puedeVerElementoMenu('/manicuristas') || puedeVerElementoMenu('/novedades') || puedeVerElementoMenu('/liquidacion') || puedeVerElementoMenu('/servicios') || puedeVerElementoMenu('/abastecimiento')) && (
              <li className="sidebar-menu-item">
                <button
                  className={`sidebar-menu-button ${["/abastecimiento", "/liquidacion", "/manicuristas", "/novedades", "/servicios"].includes(location.pathname) ? "active" : ""}`}
                  onClick={() => toggleSubmenu("servicios")}
                >
                  <Scissors className="sidebar-menu-icon" />
                  <span className="sidebar-menu-label">Servicios</span>
                  <ChevronDown className={`sidebar-submenu-toggle ${openSubmenus.servicios ? "open" : ""}`} />
                </button>

                <ul className={`sidebar-submenu ${openSubmenus.servicios && isOpen ? "open" : ""}`}>
                  {puedeVerElementoMenu('/manicuristas') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/manicuristas"
                        className={`sidebar-submenu-button ${location.pathname === "/manicuristas" ? "active" : ""}`}
                      >
                        <UserCircle className="sidebar-submenu-icon" />
                        <span>Manicuristas</span>
                      </Link>
                    </li>
                  )}
                  {puedeVerElementoMenu('/novedades') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/novedades"
                        className={`sidebar-submenu-button ${location.pathname === "/novedades" ? "active" : ""}`}
                      >
                        <Bell className="sidebar-submenu-icon" />
                        <span>Novedades</span>
                      </Link>
                    </li>
                  )}
                  {puedeVerElementoMenu('/liquidacion') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/liquidacion"
                        className={`sidebar-submenu-button ${location.pathname === "/liquidacion" ? "active" : ""}`}
                      >
                        <CreditCard className="sidebar-submenu-icon" />
                        <span>Liquidaciones</span>
                      </Link>
                    </li>
                  )}
                  {puedeVerElementoMenu('/servicios') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/servicios"
                        className={`sidebar-submenu-button ${location.pathname === "/servicios" ? "active" : ""}`}
                      >
                        <Briefcase className="sidebar-submenu-icon" />
                        <span>Servicios</span>
                      </Link>
                    </li>
                  )}
                  {puedeVerElementoMenu('/abastecimiento') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/abastecimiento"
                        className={`sidebar-submenu-button ${location.pathname === "/abastecimiento" ? "active" : ""}`}
                      >
                        <Truck className="sidebar-submenu-icon" />
                        <span>Abastecimientos</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </li>
            )}

            {/* Venta Servicios Submenu - Solo visible si tiene permisos para alguno de sus submenús */}
            {(puedeVerElementoMenu('/clientes') || puedeVerElementoMenu('/citas') || puedeVerElementoMenu('/venta-servicios')) && (
              <li className="sidebar-menu-item">
                <button
                  className={`sidebar-menu-button ${["/citas", "/clientes", "/ventas-servicio"].includes(location.pathname) ? "active" : ""}`}
                  onClick={() => toggleSubmenu("ventaServicios")}
                >
                  <CreditCard className="sidebar-menu-icon" />
                  <span className="sidebar-menu-label">Venta Servicios</span>
                  <ChevronDown className={`sidebar-submenu-toggle ${openSubmenus.ventaServicios ? "open" : ""}`} />
                </button>

                <ul className={`sidebar-submenu ${openSubmenus.ventaServicios && isOpen ? "open" : ""}`}>
                  {puedeVerElementoMenu('/clientes') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/clientes"
                        className={`sidebar-submenu-button ${location.pathname === "/clientes" ? "active" : ""}`}
                      >
                        <Users className="sidebar-submenu-icon" />
                        <span>Clientes</span>
                      </Link>
                    </li>
                  )}
                  {puedeVerElementoMenu('/citas') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/citas"
                        className={`sidebar-submenu-button ${location.pathname === "/citas" ? "active" : ""}`}
                      >
                        <Calendar className="sidebar-submenu-icon" />
                        <span>Citas</span>
                      </Link>
                    </li>
                  )}
                  {puedeVerElementoMenu('/venta-servicios') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/ventas-servicio"
                        className={`sidebar-submenu-button ${location.pathname === "/ventas-servicio" ? "active" : ""}`}
                      >
                        <Clock className="sidebar-submenu-icon" />
                        <span>Venta Servicios</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </li>
            )}

            {/* Seguridad (antes Configuraciones) - Solo visible si tiene permisos */}
            {(puedeVerElementoMenu('/roles') || puedeVerElementoMenu('/usuarios')) && (
              <li className="sidebar-menu-item">
                <button
                  className={`sidebar-menu-button ${["/roles", "/usuarios"].includes(location.pathname) ? "active" : ""}`}
                  onClick={() => toggleSubmenu("configuraciones")}
                >
                  <Shield className="sidebar-menu-icon" />
                  <span className="sidebar-menu-label">Seguridad</span>
                  <ChevronDown className={`sidebar-submenu-toggle ${openSubmenus.configuraciones ? "open" : ""}`} />
                </button>

                <ul className={`sidebar-submenu ${openSubmenus.configuraciones && isOpen ? "open" : ""}`}>
                  {puedeVerElementoMenu('/roles') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/roles"
                        className={`sidebar-submenu-button ${location.pathname === "/roles" ? "active" : ""}`}
                      >
                        <ShieldCheck className="sidebar-submenu-icon" />
                        <span>Roles</span>
                      </Link>
                    </li>
                  )}
                  {puedeVerElementoMenu('/usuarios') && (
                    <li className="sidebar-submenu-item">
                      <Link
                        to="/usuarios"
                        className={`sidebar-submenu-button ${location.pathname === "/usuarios" ? "active" : ""}`}
                      >
                        <Users className="sidebar-submenu-icon" />
                        <span>Usuarios</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </li>
            )}
          </ul>

          {/* User Profile Section - Bottom */}
          <div className="user-profile-bottom" onClick={() => navigate('/perfil')} style={{ cursor: 'pointer' }}>
            <div className="user-profile-content-bottom">
              <div className="user-avatar-bottom">
                <User className="user-avatar-icon-bottom" />
              </div>
              <div className="user-details-bottom">
                <div className="user-name-bottom">{user?.nombre || user?.username || "Usuario"}</div>
                <div className="user-role-bottom">
                  <Shield className="user-role-icon-bottom" />
                  <span>{userRole}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logout Button - Always visible at bottom */}
          <div className="logout-container">
            <ul className="sidebar-menu">
              <li className="sidebar-menu-item">
                <button className="sidebar-menu-button logout-button" onClick={handleLogout}>
                  <LogOut className="sidebar-menu-icon" />
                  <span className="sidebar-menu-label">Cerrar Sesión</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-container confirm-dialog">
            <div className="modal-header">
              <h2>Confirmar Cierre de Sesión</h2>
              <button className="modal-close" onClick={() => setShowLogoutConfirm(false)}>&times;</button>
            </div>
            <div className="confirm-content">
              <p>¿Estás seguro de que deseas cerrar sesión?</p>
            </div>
            <div className="form-actions">
              <button className="admin-button secondary" onClick={() => setShowLogoutConfirm(false)}>Cancelar</button>
              <button
                className="admin-button danger"
                onClick={() => {
                  setShowLogoutConfirm(false)
                  const role = (user?.rol || "").toLowerCase()
                  navigate("/", { replace: true })
                  setTimeout(() => logout(), 0)
                }}
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {isMobile && (
        <div className={`sidebar-overlay ${mobileOpen ? "visible" : ""}`} onClick={() => setMobileOpen(false)} />
      )}

      {/* Main Content */}
      <main className={`main-content ${isOpen ? "sidebar-expanded" : ""}`}>
        <div className="admin-container">{children}</div>
      </main>
    </div>
  )
}

export default Sidebar