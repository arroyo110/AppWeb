# Wine Spa Frontend - Despliegue en Vercel

## 🚀 Despliegue en Vercel

### 1. **Crear cuenta en Vercel:**
- Ve a [https://vercel.com](https://vercel.com)
- Crea una cuenta o inicia sesión
- Conecta tu cuenta de GitHub

### 2. **Importar proyecto:**
- Haz clic en **"New Project"**
- Selecciona el repositorio `AppWeb`
- Configura el proyecto:
  - **Framework Preset:** Vite
  - **Root Directory:** Frontend
  - **Build Command:** `npm run build`
  - **Output Directory:** `dist`

### 3. **Variables de entorno en Vercel:**
Agrega estas variables en **Environment Variables**:

```
VITE_API_URL=https://appweb-rxph.onrender.com/api
VITE_PUBLIC_BUILDER_KEY=06b560e57c4c4b90ab7e61ce76ed586c
```

### 4. **Desplegar:**
- Haz clic en **"Deploy"**
- Vercel construirá y desplegará tu aplicación automáticamente

### 5. **URLs de tu aplicación:**
Una vez desplegado, tu frontend estará disponible en:
- **Frontend:** `https://tu-app.vercel.app`
- **Backend API:** `https://appweb-rxph.onrender.com/api`

## 🔧 Configuración técnica

### **Build Command:**
```bash
npm run build
```

### **Output Directory:**
```
dist
```

### **Framework:**
```
Vite + React
```

## 📱 Funcionalidades

- ✅ Sistema de autenticación JWT
- ✅ Gestión de usuarios y roles
- ✅ Dashboard administrativo
- ✅ Gestión de citas y servicios
- ✅ Sistema de compras e insumos
- ✅ Responsive design

## 🔗 Conexión con Backend

El frontend se conecta automáticamente con el backend desplegado en Render:
- **API Base:** `https://appweb-rxph.onrender.com/api`
- **Autenticación:** JWT tokens
- **CORS:** Configurado para permitir peticiones desde Vercel
