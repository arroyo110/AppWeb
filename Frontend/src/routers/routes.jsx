import { Routes, Route } from "react-router-dom"
import AdminLayout from "../components/AdminLayout"
import ProtectedRoute from "../components/ProtectedRoute"
import Login from "../pages/InicioSesion/Login"
import Usuarios from "../pages/Usuarios"
import Home from "../pages/Home"
import RecuperarContrasena from "../pages/InicioSesion/RecuperarContrasena"
import RegisterForm from "../pages/InicioSesion/RegisterForm"
import Register from "../pages/InicioSesion/Register"
import Clientes from "../pages/VentaServicios/Clientes"
import Insumos from "../pages/Compras/Insumos"
import CategoriaInsumos from "../pages/Compras/CategoriaInsumos"
import Roles from "../pages/Roles"
import Proveedores from "../pages/Compras/Proveedores"
import Manicuristas from "../pages/Servicios/Manicuristas"
import Dashboard from "../pages/Dashboard"
import DashboardManicurista from "../pages/DashboardManicurista"
import Servicios from "../pages/Servicios/Servicios"
import Compras from "../pages/Compras/Compras"
import Novedades from "../pages/Servicios/Novedades"
import Liquidaciones from "../pages/Servicios/Liquidaciones"
import Abastecimientos from "../pages/Servicios/Abastecimientos"
import Citas from "../pages/VentaServicios/Citas"
// (revert) vistas independientes de citas
import VentaServicios from "../pages/VentaServicios/VentaServicios"
import ReservarCita from "../pages/VentaServicios/ReservarCita"
import Perfil from "../pages/Perfil"


export function MyRoutes() {
  return (
    <Routes>
      {/* Public routes - no sidebar, but with admin styles if needed */}
      <Route
        path="/"
        element={
          <AdminLayout>
            <Home />
          </AdminLayout>
        }
      />
      <Route
        path="/login"
        element={
          <AdminLayout>
            <Login />
          </AdminLayout>
        }
      />
      <Route
        path="/recuperar-contrasena"
        element={
          <AdminLayout>
            <RecuperarContrasena />
          </AdminLayout>
        }
      />
      <Route
        path="/register"
        element={
          <AdminLayout>
            <Register />
          </AdminLayout>
        }
      />
      <Route
        path="/registerForm"
        element={
          <AdminLayout>
            <RegisterForm />
          </AdminLayout>
        }
      />

      {/* Protected routes - with sidebar */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard-manicurista"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <DashboardManicurista />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Perfil />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute requiredPermission="usuarios_listar">
            <AdminLayout>
              <Usuarios />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute requiredPermission="roles_listar">
            <AdminLayout>
              <Roles />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/categoria-insumos"
        element={
          <ProtectedRoute requiredPermission="categoria_insumos_listar">
            <AdminLayout>
              <CategoriaInsumos />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/insumos"
        element={
          <ProtectedRoute requiredPermission="insumos_listar">
            <AdminLayout>
              <Insumos />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/proveedores"
        element={
          <ProtectedRoute requiredPermission="proveedores_listar">
            <AdminLayout>
              <Proveedores />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/compras"
        element={
          <ProtectedRoute requiredPermission="compras_listar">
            <AdminLayout>
              <Compras />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manicuristas"
        element={
          <ProtectedRoute requiredPermission="manicuristas_listar">
            <AdminLayout>
              <Manicuristas />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/novedades"
        element={
          <ProtectedRoute requiredPermission="novedades_listar">
            <AdminLayout>
              <Novedades />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/liquidaciones"
        element={
          <ProtectedRoute requiredPermission="liquidaciones_listar">
            <AdminLayout>
              <Liquidaciones />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/liquidacion"
        element={
          <ProtectedRoute requiredPermission="liquidaciones_listar">
            <AdminLayout>
              <Liquidaciones />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/servicios"
        element={
          <ProtectedRoute requiredPermission="servicios_listar">
            <AdminLayout>
              <Servicios />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/abastecimientos"
        element={
          <ProtectedRoute requiredPermission="abastecimientos_listar">
            <AdminLayout>
              <Abastecimientos />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/abastecimiento"
        element={
          <ProtectedRoute requiredPermission="abastecimientos_listar">
            <AdminLayout>
              <Abastecimientos />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/citas"
        element={
          <ProtectedRoute requiredPermission="citas_listar">
            <AdminLayout>
              <Citas />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/citas/:id"
        element={
          <ProtectedRoute requiredPermission="citas_listar">
            <AdminLayout>
              <Citas />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/citas/crear"
        element={
          <ProtectedRoute requiredPermission="citas_crear">
            <AdminLayout>
              <Citas mode="create" />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      {/* rutas de crear/detalle de citas revertidas temporalmente */}
      <Route
        path="/citas-legacy"
        element={
          <ProtectedRoute requiredPermission="citas_listar">
            <AdminLayout>
              <Citas />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute requiredPermission="clientes_listar">
            <AdminLayout>
              <Clientes />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/venta-servicios"
        element={
          <ProtectedRoute requiredPermission="venta_servicios_listar">
            <AdminLayout>
              <VentaServicios />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ventas-servicio"
        element={
          <ProtectedRoute requiredPermission="venta_servicios_listar">
            <AdminLayout>
              <VentaServicios />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Ruta para reservar citas - accesible para usuarios autenticados */}
      <Route
        path="/reservar-cita"
        element={
          <ProtectedRoute>
            <ReservarCita />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
