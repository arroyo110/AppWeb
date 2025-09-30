# 🚀 Wine Spa - Frontend con Sistema de Autenticación Unificado

## 📋 **DESCRIPCIÓN DEL PROYECTO**

Este es el frontend de la aplicación Wine Spa, un sistema de gestión para un spa que incluye:
- Gestión de usuarios y roles
- Gestión de clientes y citas
- Gestión de servicios y manicuristas
- Sistema de compras e insumos
- Dashboard administrativo

## 🔐 **SISTEMA DE AUTENTICACIÓN UNIFICADO**

### **Características Principales:**
- ✅ **Sistema unificado**: Un solo endpoint para login de todos los tipos de usuario
- ✅ **JWT funcional**: Tokens de acceso y refresh automáticos
- ✅ **Roles reconocidos**: Cliente, Manicurista, Admin
- ✅ **Contraseñas temporales**: Generación automática al registrar
- ✅ **Recuperación de contraseña**: Sistema completo por email
- ✅ **Protección de rutas**: Componente que verifica autenticación y roles

### **Flujo de Autenticación:**
1. **Registro**: Usuario se registra → Se genera contraseña temporal → Se envía por email
2. **Login**: Usuario inicia sesión → Se valida credenciales → Se obtienen tokens JWT
3. **Cambio de contraseña**: Si es primera vez → Debe cambiar contraseña temporal
4. **Acceso**: Se redirige según el rol del usuario

## 🛠️ **TECNOLOGÍAS UTILIZADAS**

- **React 19** - Framework principal
- **React Router DOM** - Enrutamiento
- **JWT Decode** - Manejo de tokens JWT
- **Axios** - Cliente HTTP con interceptores automáticos
- **CSS Modules** - Estilos modulares
- **React Icons** - Iconografía

## 🚀 **INSTALACIÓN Y CONFIGURACIÓN**

### **1. Instalar dependencias:**
```bash
npm install
```

### **2. Dependencias adicionales:**
```bash
npm install jwt-decode
```

### **3. Configurar backend:**
Asegúrate de que tu backend esté ejecutándose en `http://localhost:8000` con los endpoints:
- `POST /api/auth/login/` - Login unificado
- `POST /api/auth/registro/` - Registro unificado
- `POST /api/auth/refresh/` - Refresh de token
- `POST /api/auth/solicitar-codigo/` - Recuperación de contraseña
- `POST /api/auth/confirmar-codigo/` - Confirmar código de recuperación
- `POST /api/auth/cambiar-contraseña/` - Cambiar contraseña temporal

### **4. Ejecutar en desarrollo:**
```bash
npm run dev
```

## 📁 **ESTRUCTURA DEL PROYECTO**

```
src/
├── components/           # Componentes reutilizables
│   ├── AdminLayout.jsx  # Layout principal con sidebar
│   ├── ProtectedRoute.jsx # Protección de rutas
│   └── Sidebar.jsx      # Menú lateral
├── context/             # Contextos de React
│   └── authContext.jsx  # Contexto de autenticación unificado
├── pages/               # Páginas de la aplicación
│   ├── InicioSesion/    # Páginas de autenticación
│   │   ├── Login.jsx    # Login unificado
│   │   ├── Register.jsx # Registro
│   │   └── CambiarContraseña.jsx # Cambio de contraseña
│   ├── Dashboard.jsx    # Dashboard principal
│   ├── Home.jsx         # Página de inicio
│   └── ...              # Otras páginas del sistema
├── routers/             # Configuración de rutas
│   └── routes.jsx       # Rutas con protección
├── service/             # Servicios de API
│   └── apiConfig.js     # Configuración de axios
└── styles/              # Estilos CSS
```

## 🔧 **CONFIGURACIÓN DE AUTENTICACIÓN**

### **AuthContext:**
El contexto de autenticación maneja:
- Estado del usuario autenticado
- Tokens JWT (access y refresh)
- Funciones de login, registro y logout
- Refresh automático de tokens
- Manejo de errores de autenticación

### **ProtectedRoute:**
Componente que protege las rutas:
- Verifica si el usuario está autenticado
- Valida roles específicos si se requieren
- Redirige a login si no hay autenticación
- Redirige a cambio de contraseña si es necesario

### **Interceptores de Axios:**
- Agregan automáticamente el token a las peticiones
- Manejan errores 401 con refresh automático
- Redirigen al login si el refresh falla

## 📱 **PÁGINAS PRINCIPALES**

### **Públicas:**
- `/` - Página de inicio
- `/login` - Login unificado
- `/register` - Registro de usuarios
- `/recuperar-contrasena` - Recuperación de contraseña

### **Protegidas:**
- `/dashboard` - Dashboard principal
- `/usuarios` - Gestión de usuarios (solo admin)
- `/roles` - Gestión de roles (solo admin)
- `/clientes` - Gestión de clientes
- `/manicuristas` - Gestión de manicuristas
- `/servicios` - Gestión de servicios
- `/citas` - Gestión de citas
- `/compras` - Gestión de compras
- `/insumos` - Gestión de insumos

## 🔄 **FLUJO DE USUARIO**

### **1. Registro:**
```
Usuario llena formulario → Se envía a /api/auth/registro/ → 
Se genera contraseña temporal → Se envía por email → 
Usuario puede hacer login
```

### **2. Login:**
```
Usuario ingresa credenciales → Se valida en /api/auth/login/ → 
Si debe cambiar contraseña → Se redirige a /cambiar-contraseña → 
Si no → Se redirige según rol
```

### **3. Navegación:**
```
Cliente → / (página de inicio)
Manicurista → /manicurista/dashboard
Admin → /admin/dashboard o /dashboard
```

## 🚨 **MANEJO DE ERRORES**

- **Errores de validación**: Se muestran en los formularios
- **Errores de autenticación**: Se redirige al login
- **Errores de autorización**: Se redirige según el rol
- **Errores de red**: Se muestran mensajes informativos

## 🔒 **SEGURIDAD**

- **Tokens JWT**: Expiración automática y refresh
- **Protección de rutas**: Verificación de autenticación y roles
- **Interceptores**: Manejo automático de tokens expirados
- **Validación**: Validación tanto en frontend como backend

## 📝 **NOTAS IMPORTANTES**

1. **Backend requerido**: Este frontend requiere el backend con sistema de autenticación unificado
2. **Puerto 8000**: Asegúrate de que el backend esté en el puerto correcto
3. **CORS**: El backend debe permitir peticiones desde el frontend
4. **Tokens**: Los tokens se almacenan en localStorage (considera usar httpOnly cookies en producción)

## 🐛 **SOLUCIÓN DE PROBLEMAS**

### **Error de conexión:**
- Verifica que el backend esté ejecutándose
- Confirma la URL en `apiConfig.js`

### **Error de autenticación:**
- Verifica que los endpoints del backend estén correctos
- Confirma que el formato de datos sea el esperado

### **Error de rutas:**
- Verifica que todas las importaciones estén correctas
- Confirma que los componentes existan

## 📞 **SOPORTE**

Para soporte técnico o preguntas sobre la implementación, revisa:
1. La guía de implementación del backend
2. Los logs de la consola del navegador
3. Los logs del backend

---

**¡El sistema está listo para funcionar con el backend unificado! 🎉**
