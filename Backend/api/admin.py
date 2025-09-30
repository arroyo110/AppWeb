from django.contrib import admin
from api.roles.models import Modulo, Accion, Permiso, Rol, RolHasPermiso

# Register your models here.

@admin.register(Modulo)
class ModuloAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'descripcion', 'estado', 'created_at']
    list_filter = ['estado', 'created_at']
    search_fields = ['nombre', 'descripcion']
    ordering = ['nombre']


@admin.register(Accion)
class AccionAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'descripcion', 'estado', 'created_at']
    list_filter = ['estado', 'created_at']
    search_fields = ['nombre', 'descripcion']
    ordering = ['nombre']


@admin.register(Permiso)
class PermisoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'modulo', 'accion', 'estado', 'created_at']
    list_filter = ['estado', 'modulo', 'accion', 'created_at']
    search_fields = ['nombre', 'descripcion', 'modulo__nombre', 'accion__nombre']
    ordering = ['modulo__nombre', 'accion__nombre']


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'estado', 'created_at']
    list_filter = ['estado', 'created_at']
    search_fields = ['nombre']
    ordering = ['nombre']


@admin.register(RolHasPermiso)
class RolHasPermisoAdmin(admin.ModelAdmin):
    list_display = ['rol', 'permiso', 'created_at']
    list_filter = ['rol', 'permiso', 'created_at']
    search_fields = ['rol__nombre', 'permiso__nombre']
    ordering = ['rol__nombre', 'permiso__nombre']
