# AppWeb - Sistema de Gestión

Este repositorio contiene el sistema completo de gestión con backend Django y frontend.

## Estructura del Proyecto

```
AppWeb/
├── Backend/          # API Django REST Framework
├── Frontend/         # Aplicación frontend
└── README.md         # Este archivo
```

## Backend (Django)

### Características
- Django REST Framework
- Autenticación JWT
- Múltiples módulos: usuarios, citas, servicios, inventario, etc.
- Base de datos SQLite (desarrollo)

### Instalación y Configuración

1. **Crear entorno virtual:**
```bash
cd Backend
python -m venv venv
venv\Scripts\activate  # Windows
```

2. **Instalar dependencias:**
```bash
pip install -r requirements.txt
```

3. **Ejecutar migraciones:**
```bash
python manage.py migrate
```

4. **Crear superusuario:**
```bash
python manage.py createsuperuser
```

5. **Ejecutar servidor:**
```bash
python manage.py runserver
```

El servidor estará disponible en: `http://localhost:8000`

### Módulos Disponibles

- **Autenticación**: Login, registro, recuperación de contraseña
- **Usuarios**: Gestión de usuarios y roles
- **Citas**: Sistema de citas y disponibilidad
- **Servicios**: Catálogo de servicios
- **Inventario**: Gestión de insumos y proveedores
- **Ventas**: Sistema de ventas y liquidaciones
- **Clientes**: Gestión de clientes
- **Manicuristas**: Gestión de empleados

## Frontend

[Descripción del frontend - agregar según corresponda]

## API Endpoints

### Autenticación
- `POST /api/auth/login/` - Iniciar sesión
- `POST /api/auth/register/` - Registro de usuario
- `POST /api/auth/refresh/` - Renovar token

### Usuarios
- `GET /api/usuarios/` - Listar usuarios
- `POST /api/usuarios/` - Crear usuario
- `GET /api/usuarios/{id}/` - Obtener usuario
- `PUT /api/usuarios/{id}/` - Actualizar usuario
- `DELETE /api/usuarios/{id}/` - Eliminar usuario

[Agregar más endpoints según sea necesario]

## Tecnologías Utilizadas

### Backend
- Python 3.x
- Django 5.2
- Django REST Framework
- JWT Authentication
- SQLite/PostgreSQL
- Pillow (manejo de imágenes)

### Frontend
[Agregar tecnologías del frontend]

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Despliegue en Render

### Configuración de Supabase

1. **Crear proyecto en Supabase:**
   - Ve a [https://supabase.com](https://supabase.com)
   - Crea un nuevo proyecto
   - Obtén las credenciales de conexión

2. **Configurar variables de entorno:**
   - Copia `env.example` a `.env`
   - Configura las variables de Supabase:
     ```env
     DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
     SUPABASE_URL=your-supabase-project-url
     SUPABASE_ANON_KEY=your-supabase-anon-key
     ```

### Despliegue en Render

1. **Conectar repositorio:**
   - Ve a [https://render.com](https://render.com)
   - Conecta tu cuenta de GitHub
   - Selecciona el repositorio `AppWeb`

2. **Configurar servicio web:**
   - **Build Command:** `pip install -r Backend/requirements.txt && cd Backend && python manage.py collectstatic --noinput && python manage.py migrate`
   - **Start Command:** `cd Backend && gunicorn winespa.wsgi:application`
   - **Environment:** Python 3

3. **Variables de entorno en Render:**
   ```
   SECRET_KEY=tu-secret-key-aqui
   DEBUG=False
   ALLOWED_HOSTS=tu-app.onrender.com
   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   EMAIL_HOST_USER=tu-email@gmail.com
   EMAIL_HOST_PASSWORD=tu-app-password
   ```

4. **Desplegar:**
   - Haz clic en "Deploy"
   - Render construirá y desplegará tu aplicación

### URLs de la API

Una vez desplegado, tu API estará disponible en:
- **API Base:** `https://tu-app.onrender.com/api/`
- **Admin:** `https://tu-app.onrender.com/admin/`
- **Documentación:** `https://tu-app.onrender.com/api/schema/`

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.
