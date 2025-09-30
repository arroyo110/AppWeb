# 🔐 PERMISOS DEL SISTEMA - NOMBRES CORRECTOS

## 📋 **PERMISOS DISPONIBLES EN EL SISTEMA**

Basándome en la configuración de la API, estos son los **15 permisos** que se pueden asignar a los roles:

### **Columna 1:**
- ✅ **Dashboard** - Acceso al panel principal
- ✅ **Roles** - Gestión de roles y permisos
- ❌ **Usuarios** - Gestión de usuarios del sistema
- ❌ **Categoria Insumos** - Gestión de categorías de insumos
- ❌ **Compras** - Control de compras e inventario

### **Columna 2:**
- ✅ **Insumos** - Gestión de productos/insumos
- ✅ **Proveedores** - Control de proveedores
- ❌ **Abastecimientos** - Control de abastecimientos
- ❌ **Liquidaciones** - Gestión de liquidaciones de personal
- ❌ **Manicuristas** - Administración de manicuristas

### **Columna 3:**
- ✅ **Novedades** - Gestión de novedades
- ❌ **Servicios** - Catálogo de servicios
- ❌ **Citas** - Gestión de citas
- ❌ **Clientes** - Administración de clientes
- ❌ **Venta Servicios** - Control de ventas

## 🎯 **MApeo de Rutas a Permisos**

```javascript
getRutasPermisos() {
    return {
        '/dashboard': 'Dashboard',
        '/usuarios': 'Usuarios',
        '/roles': 'Roles',
        '/abastecimientos': 'Abastecimientos',
        '/abastecimiento': 'Abastecimientos',
        '/categoria-insumos': 'Categoria Insumos',
        '/citas': 'Citas',
        '/clientes': 'Clientes',
        '/compras': 'Compras',
        '/compra-insumo': 'Compras',
        '/insumos': 'Insumos',
        '/insumo-abastecimiento': 'Abastecimientos',
        '/liquidaciones': 'Liquidaciones',
        '/liquidacion': 'Liquidaciones',
        '/manicuristas': 'Manicuristas',
        '/novedades': 'Novedades',
        '/proveedores': 'Proveedores',
        '/servicios': 'Servicios',
        '/venta-servicios': 'Venta Servicios',
        '/ventas-servicio': 'Venta Servicios'
    };
}
```

## 🔧 **CÓMO FUNCIONA LA VERIFICACIÓN**

### **1. Verificación de Permisos por Ruta**

```javascript
// Cuando un usuario intenta acceder a una ruta
const permisoRequerido = rutasPermisos['/usuarios']; // Retorna 'Usuarios'
const tieneAcceso = await permisosService.usuarioTienePermiso('Usuarios');
```

### **2. Verificación en el Sidebar**

```javascript
// El sidebar verifica si puede mostrar cada elemento
const puedeVerUsuarios = await permisosService.puedeVerElementoMenu('/usuarios');
// Esto verifica si el usuario tiene el permiso 'Usuarios'
```

### **3. Verificación de Acceso a Páginas**

```javascript
// Antes de mostrar una página, se verifica el permiso
const puedeAcceder = await permisosService.puedeAccederARuta('/usuarios');
// Esto verifica si el usuario tiene el permiso 'Usuarios'
```

## 🎨 **EJEMPLOS DE USO EN COMPONENTES**

### **Ejemplo 1: Botón Condicional**

```jsx
import { usePermisos } from '../hooks/usePermisos';

const MiComponente = () => {
    const { tienePermiso } = usePermisos();

    return (
        <div>
            <h1>Gestión de Usuarios</h1>
            
            {/* Botón solo visible si tiene el permiso 'Usuarios' */}
            {tienePermiso('Usuarios') && (
                <button className="btn btn-primary">
                    Crear Nuevo Usuario
                </button>
            )}
        </div>
    );
};
```

### **Ejemplo 2: Sidebar Dinámico**

```jsx
const { puedeVerElementoMenu } = usePermisos();

// Solo mostrar el menú de usuarios si tiene el permiso 'Usuarios'
{puedeVerElementoMenu('/usuarios') && (
    <li className="sidebar-menu-item">
        <Link to="/usuarios">Usuarios</Link>
    </li>
)}
```

### **Ejemplo 3: Verificación de Acceso**

```jsx
const { puedeAccederARuta } = usePermisos();

// Verificar si puede acceder a la página de usuarios
if (puedeAccederARuta('/usuarios')) {
    console.log('Usuario tiene permiso para acceder a Usuarios');
} else {
    console.log('Usuario NO tiene permiso para acceder a Usuarios');
}
```

## 🔒 **PERMISOS POR TIPO DE USUARIO**

### **Administrador**
- ✅ **Acceso completo** a todos los 15 permisos
- ✅ **Puede ver** todos los módulos del sidebar
- ✅ **Puede acceder** a todas las páginas del sistema

### **Cliente**
- ✅ **Solo puede ver** módulos específicos:
  - Dashboard
  - Clientes
  - Citas
  - Servicios
  - Venta Servicios
- ❌ **No puede acceder** a módulos administrativos

### **Manicurista (y otros roles)**
- ✅ **Acceso basado** en permisos específicos asignados
- ✅ **Solo ve** los módulos para los que tiene permisos
- ✅ **Navegación personalizada** según sus permisos

## 📱 **VERIFICACIÓN EN TIEMPO REAL**

### **Hook usePermisos**

```javascript
const { 
    permisos,           // Lista de permisos del usuario (ej: ['Dashboard', 'Roles', 'Insumos'])
    rutasPermitidas,    // Rutas a las que puede acceder
    puedeVerElementoMenu, // Función para verificar elementos del menú
    tienePermiso        // Función para verificar permisos específicos
} = usePermisos();
```

### **Verificación de Permisos**

```javascript
// Verificar si tiene un permiso específico
const puedeGestionarUsuarios = tienePermiso('Usuarios');
const puedeGestionarRoles = tienePermiso('Roles');
const puedeGestionarInsumos = tienePermiso('Insumos');
```

## 🎯 **CONFIGURACIÓN EN LA API**

### **Backend (Django)**
- Los permisos se crean con los nombres exactos mostrados en la imagen
- Se asignan a roles a través de la tabla `RolHasPermiso`
- El middleware verifica los permisos en cada request

### **Frontend (React)**
- El hook `usePermisos` obtiene los permisos del usuario
- El servicio `permisosService` mapea rutas a permisos
- El sidebar se adapta dinámicamente según los permisos

## 🔍 **DEBUGGING Y VERIFICACIÓN**

### **Verificar Permisos en Consola**

```javascript
// En la consola del navegador
const permisos = await permisosService.obtenerRutasPermitidas();
console.log('Rutas permitidas:', permisos);

const tienePermiso = await permisosService.usuarioTienePermiso('Usuarios');
console.log('Tiene permiso Usuarios:', tienePermiso);
```

### **Verificar Estado del Hook**

```jsx
const { permisos, rutasPermitidas, loading, error } = usePermisos();

useEffect(() => {
    console.log('Permisos cargados:', permisos);
    console.log('Rutas permitidas:', rutasPermitidas);
}, [permisos, rutasPermitidas]);
```

## 📋 **CHECKLIST DE VERIFICACIÓN**

### **Para Verificar que Funciona:**

1. **Login con usuario que tenga permisos específicos**
   - Verificar que solo ve los módulos permitidos en el sidebar
   - Verificar que puede acceder solo a las páginas permitidas

2. **Verificar Sidebar Dinámico**
   - Solo deben aparecer elementos para los que tiene permisos
   - Los administradores deben ver todo

3. **Verificar Navegación**
   - Usuarios no deben poder acceder a páginas sin permisos
   - Redirección automática debe funcionar correctamente

4. **Verificar Dashboard**
   - Debe mostrar los permisos correctos del usuario
   - Debe mostrar las rutas permitidas correctas

## 🎉 **RESULTADO FINAL**

Con esta configuración:

- ✅ **Los permisos coinciden exactamente** con los nombres de la API
- ✅ **El sidebar se adapta dinámicamente** según los permisos reales
- ✅ **La verificación de acceso** funciona correctamente
- ✅ **La experiencia del usuario** es completamente personalizada
- ✅ **El sistema es seguro** y solo permite acceso a funcionalidades permitidas

Los usuarios ahora verán exactamente los módulos para los que tienen permisos, y el sistema verificará correctamente el acceso basándose en los nombres reales de los permisos configurados en la API.
