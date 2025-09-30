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

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.
