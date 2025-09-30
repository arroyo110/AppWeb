import { useLocation } from "react-router-dom"
import Sidebar from "./Sidebar"
import "../styles/Admin.css"

const AdminLayout = ({ children, withSidebar = true }) => {
  const location = useLocation()

  // Routes that should never have sidebar
  const noSidebarRoutes = ["/login", "/", "/register", "/registerForm", "/recuperar-contrasena/", "/perfil"]

  const shouldShowSidebar = withSidebar && !noSidebarRoutes.includes(location.pathname)

  if (shouldShowSidebar) {
    return <Sidebar>{children}</Sidebar>
  }

  return <div className="admin-container">{children}</div>
}

export default AdminLayout
