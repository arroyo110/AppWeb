"use client"

import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import logoImage from "../assets/logo.jpg"
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  ShoppingCart,
  Scissors,
  CreditCard,
  ChevronDown,
  ChevronRight,
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

const SidebarMenu = ({ isOpen = true, toggleSidebar, isMobile = false, mobileOpen = false, setMobileOpen }) => {
  const location = useLocation()
  const { logout, currentUser } = useAuth()
  const [openSubmenus, setOpenSubmenus] = useState({
    compras: false,
    servicios: false,
    ventaServicios: false,
  })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Guardar el estado del sidebar en localStorage
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("sidebarOpen", isOpen.toString())
    }
  }, [isOpen, isMobile])

  const toggleSubmenu = (submenu) => {
    if (!isOpen && !isMobile) return // Don't allow submenu toggle when sidebar is collapsed

    setOpenSubmenus((prev) => ({
      ...prev,
      [submenu]: !prev[submenu],
    }))
  }

  // Handle toggle sidebar
  const handleToggleSidebar = (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (isMobile) {
      setMobileOpen && setMobileOpen(!mobileOpen)
    } else {
      // Close all submenus when collapsing sidebar
      if (isOpen) {
        setOpenSubmenus({
          compras: false,
          servicios: false,
          ventaServicios: false,
        })
      }
      toggleSidebar && toggleSidebar()
    }
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const sidebarClass = isMobile ? `sidebar ${mobileOpen ? "mobile-open" : ""}` : `sidebar ${isOpen ? "expanded" : ""}`

  // Obtener el rol del usuario
  const userRole = currentUser?.rol || "Usuario"

  return (
    <div className={sidebarClass} id="main-sidebar">
      <div className="sidebar-header">
        {isOpen ? (
          <>
            <div className="flex flex-col items-center w-full mb-2">
              <div className="flex items-center justify-center w-16 h-16 rounded-full overflow-hidden bg-white shadow-lg border-2 border-[#e83e8c]/20 mb-2">
                <img src={logoImage || "/placeholder.svg"} alt="WineSpa Logo" className="w-full h-full object-cover" />
              </div>
              <div className="sidebar-logo">WineSpa</div>
              <div className="text-xs text-[#6c757d] mt-1 user-info">Panel Administrativo</div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center w-12 h-12 rounded-full overflow-hidden bg-white shadow-lg border-2 border-[#e83e8c]/20">
            <img src={logoImage || "/placeholder.svg"} alt="WineSpa Logo" className="w-full h-full object-cover" />
          </div>
        )}
        <button className="sidebar-toggle" onClick={handleToggleSidebar}>
          <ChevronRight className={isOpen ? "rotate-180" : ""} />
        </button>
      </div>

      <div className="sidebar-content">
        <ul className="sidebar-menu">
          {/* Dashboard */}
          <li className="sidebar-menu-item">
            <Link
              to="/dashboard"
              className={`sidebar-menu-button ${location.pathname === "/dashboard" ? "active" : ""}`}
            >
              <LayoutDashboard className="sidebar-menu-icon" />
              <span className="sidebar-menu-label">Dashboard</span>
            </Link>
          </li>

          {/* Roles */}
          <li className="sidebar-menu-item">
            <Link to="/roles" className={`sidebar-menu-button ${location.pathname === "/roles" ? "active" : ""}`}>
              <ShieldCheck className="sidebar-menu-icon" />
              <span className="sidebar-menu-label">Roles</span>
            </Link>
          </li>

          {/* Usuarios */}
          <li className="sidebar-menu-item">
            <Link to="/usuarios" className={`sidebar-menu-button ${location.pathname === "/usuarios" ? "active" : ""}`}>
              <Users className="sidebar-menu-icon" />
              <span className="sidebar-menu-label">Usuarios</span>
            </Link>
          </li>

          {/* Compras Submenu */}
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
              <li className="sidebar-submenu-item">
                <Link
                  to="/categoria-insumos"
                  className={`sidebar-submenu-button ${location.pathname === "/categoria-insumos" ? "active" : ""}`}
                >
                  <Tag className="sidebar-submenu-icon" />
                  <span>Categoria Insumos</span>
                </Link>
              </li>
              <li className="sidebar-submenu-item">
                <Link
                  to="/compras"
                  className={`sidebar-submenu-button ${location.pathname === "/compras" ? "active" : ""}`}
                >
                  <ShoppingCart className="sidebar-submenu-icon" />
                  <span>Compras</span>
                </Link>
              </li>
              <li className="sidebar-submenu-item">
                <Link
                  to="/insumos"
                  className={`sidebar-submenu-button ${location.pathname === "/insumos" ? "active" : ""}`}
                >
                  <Package className="sidebar-submenu-icon" />
                  <span>Insumos</span>
                </Link>
              </li>
              <li className="sidebar-submenu-item">
                <Link
                  to="/proveedores"
                  className={`sidebar-submenu-button ${location.pathname === "/proveedores" ? "active" : ""}`}
                >
                  <Store className="sidebar-submenu-icon" />
                  <span>Proveedores</span>
                </Link>
              </li>
            </ul>
          </li>

          {/* Servicios Submenu */}
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
              <li className="sidebar-submenu-item">
                <Link
                  to="/abastecimiento"
                  className={`sidebar-submenu-button ${location.pathname === "/abastecimiento" ? "active" : ""}`}
                >
                  <Truck className="sidebar-submenu-icon" />
                  <span>Abastecimientos</span>
                </Link>
              </li>
              <li className="sidebar-submenu-item">
                <Link
                  to="/liquidacion"
                  className={`sidebar-submenu-button ${location.pathname === "/liquidacion" ? "active" : ""}`}
                >
                  <CreditCard className="sidebar-submenu-icon" />
                  <span>Liquidaciones</span>
                </Link>
              </li>
              <li className="sidebar-submenu-item">
                <Link
                  to="/manicuristas"
                  className={`sidebar-submenu-button ${location.pathname === "/manicuristas" ? "active" : ""}`}
                >
                  <UserCircle className="sidebar-submenu-icon" />
                  <span>Manicuristas</span>
                </Link>
              </li>
              <li className="sidebar-submenu-item">
                <Link
                  to="/novedades"
                  className={`sidebar-submenu-button ${location.pathname === "/novedades" ? "active" : ""}`}
                >
                  <Bell className="sidebar-submenu-icon" />
                  <span>Novedades</span>
                </Link>
              </li>
              <li className="sidebar-submenu-item">
                <Link
                  to="/servicios"
                  className={`sidebar-submenu-button ${location.pathname === "/servicios" ? "active" : ""}`}
                >
                  <Briefcase className="sidebar-submenu-icon" />
                  <span>Servicios</span>
                </Link>
              </li>
            </ul>
          </li>

          {/* Venta Servicios Submenu */}
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
              <li className="sidebar-submenu-item">
                <Link
                  to="/citas"
                  className={`sidebar-submenu-button ${location.pathname === "/citas" ? "active" : ""}`}
                >
                  <Calendar className="sidebar-submenu-icon" />
                  <span>Citas</span>
                </Link>
              </li>
              <li className="sidebar-submenu-item">
                <Link
                  to="/clientes"
                  className={`sidebar-submenu-button ${location.pathname === "/clientes" ? "active" : ""}`}
                >
                  <Users className="sidebar-submenu-icon" />
                  <span>Clientes</span>
                </Link>
              </li>
              <li className="sidebar-submenu-item">
                <Link
                  to="/ventas-servicio"
                  className={`sidebar-submenu-button ${location.pathname === "/ventas-servicio" ? "active" : ""}`}
                >
                  <Clock className="sidebar-submenu-icon" />
                  <span>Venta Servicios</span>
                </Link>
              </li>
            </ul>
          </li>
        </ul>

        {/* User Profile Section - Bottom */}
        <div className="user-profile-bottom">
          <div className="user-profile-content-bottom">
            <div className="user-avatar-bottom">
              <User className="user-avatar-icon-bottom" />
            </div>
            <div className="user-details-bottom">
              <div className="user-name-bottom">{currentUser?.nombre || currentUser?.username || "Usuario"}</div>
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
                  window.location.replace("/")
                  setTimeout(() => logout(), 0)
                }}
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SidebarMenu
