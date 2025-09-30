Aquí tienes el README actualizado, explicando qué se hizo y qué archivos deben actualizarse según las nuevas funcionalidades [[memory:8635949]].

```markdown
# Frontend — Funcionalidades implementadas y próximos pasos de integración

Este documento resume lo que ya está implementado en el frontend y qué debes actualizar en tu proyecto para alinear los archivos con las nuevas funcionalidades.

## ✅ Funcionalidades implementadas

- ✅ Sistema de disponibilidades en tiempo real
- ✅ Citas con múltiples manicuristas y servicios
- ✅ Gestión completa de todos los módulos
- ✅ Sistema de novedades conectado con citas

---

## 1) Sistema de disponibilidades en tiempo real

**Qué se hizo**
- Suscripción a cambios de agenda por profesional/servicio vía WebSocket/SSE.
- Rehidratación de estado y reconexión automática.
- UI reactiva con slots actualizados en vivo.

**Qué debes actualizar**
- Variables de entorno:
  - `VITE_API_BASE_URL`
  - `VITE_WS_URL`
- Cliente de sockets en `src/api/realtime.ts` (o equivalente).
- Store/estado en `src/store/availability.ts` para manejar:
  - conexión, eventos `availability:update`, y limpieza al desmontar.
- Componentes de UI:
  - `src/features/availability/AvailabilityCalendar.tsx`
  - `src/features/availability/ProfessionalAvailability.tsx`

---

## 2) Citas con múltiples manicuristas y servicios

**Qué se hizo**
- Búsqueda de slots multi-recurso (servicio + manicurista).
- Validación de conflictos y cálculo de duración total.
- Resumen de la cita con desglose de precio/tiempo.

**Qué debes actualizar**
- Endpoints en `src/api/appointments.ts`:
  - `POST /appointments` con payload múltiple.
  - `GET /availability/slots?serviceIds=&professionalIds=&...`
- Form de creación/edición en:
  - `src/features/appointments/AppointmentForm.tsx`
  - `src/features/appointments/AppointmentSummary.tsx`
- Estado derivado en `src/store/appointments.ts`:
  - selección múltiple, validaciones y reglas de negocio.
- Rutas:
  - `src/routes.tsx` o `src/app/router.tsx` para vistas de agenda y checkout.

---

## 3) Gestión completa de todos los módulos

**Qué se hizo**
- CRUD unificado para usuarios, servicios, profesionales, recursos y horarios.
- Roles y permisos a nivel de UI.

**Qué debes actualizar**
- API de catálogo en `src/api/admin/*.ts`:
  - `services.ts`, `professionals.ts`, `resources.ts`, `schedules.ts`, `users.ts`
- Páginas y tablas en:
  - `src/features/admin/services/*`
  - `src/features/admin/professionals/*`
  - `src/features/admin/resources/*`
  - `src/features/admin/schedules/*`
  - `src/features/admin/users/*`
- Guardas/Permisos:
  - `src/auth/guards.tsx` y `src/auth/usePermissions.ts`
- Menú/Sidebar:
  - `src/components/layout/Sidebar.tsx` para entradas de navegación.

---

## 4) Sistema de novedades conectado con citas

**Qué se hizo**
- Feed de eventos vinculado a reservas y disponibilidad.
- Notificaciones en vivo y filtros por entidad (cita, profesional, servicio).

**Qué debes actualizar**
- Endpoints en `src/api/updates.ts`:
  - `GET /updates?entityType=&entityId=`
  - Socket evento `updates:new`
- Store en `src/store/updates.ts`:
  - colección paginada, filtros y normalización.
- UI de feed:
  - `src/features/updates/UpdatesFeed.tsx`
  - `src/features/updates/UpdateItem.tsx`
- Integración con citas:
  - Escuchar eventos de creación/cambio/cancelación y refrescar feed.

---

## Archivos a revisar/crear

- `src/api/http.ts` (interceptores, headers, reintentos)
- `src/api/realtime.ts` (WebSocket/SSE con backoff)
- `src/api/appointments.ts`, `src/api/updates.ts`, `src/api/admin/*.ts`
- `src/store/*` (availability, appointments, updates, auth/permissions)
- `src/features/availability/*`, `src/features/appointments/*`, `src/features/admin/*`, `src/features/updates/*`
- `src/routes.tsx` o `src/app/router.tsx`
- `src/components/ui/*` (tabla, modal, dropdown, skeletons)

---

## Variables de entorno

Crea/actualiza `.env`:
- `VITE_API_BASE_URL=https://tu-backend/api`
- `VITE_WS_URL=wss://tu-backend/ws`
- Opcional:
  - `VITE_FEATURE_LIVE_AVAILABILITY=true`
  - `VITE_FEATURE_NEWS_FEED=true`

---

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run preview` — vista previa local

---

## Comprobación rápida

- Disponibilidades se actualizan en vivo al cambiar agenda.
- Crear cita con múltiples servicios/manicuristas calcula duración/precio correctamente.
- CRUDs de administración funcionan y respetan permisos.
- El feed de novedades refleja cambios de citas al instante.
```

¿Quieres que lo guarde como `README.md` en tu proyecto de frontend? Si me compartes la ruta del frontend, lo creo y dejo los directorios base (`src/api`, `src/store`, `src/features/...`) si faltan.