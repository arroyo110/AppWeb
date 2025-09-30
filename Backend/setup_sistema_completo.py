#!/usr/bin/env python
"""
Script completo para configurar el sistema de permisos y usuarios
Basado en la estructura real del frontend
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'winespa.settings')
django.setup()

from api.roles.models import Modulo, Accion, Permiso, Rol, RolHasPermiso
from api.usuarios.models import Usuario
from api.manicuristas.models import Manicurista

def crear_modulos():
    """Crear todos los módulos del sistema basados en el frontend"""
    print("=== CREANDO MÓDULOS ===")
    
    modulos_data = [
        # Dashboard
        {'nombre': 'dashboard', 'descripcion': 'Panel principal del sistema'},
        
        # Compras
        {'nombre': 'categoria_insumos', 'descripcion': 'Gestión de categorías de insumos'},
        {'nombre': 'insumos', 'descripcion': 'Gestión de insumos'},
        {'nombre': 'proveedores', 'descripcion': 'Gestión de proveedores'},
        {'nombre': 'compras', 'descripcion': 'Gestión de compras'},
        
        # Servicios
        {'nombre': 'manicuristas', 'descripcion': 'Gestión de manicuristas'},
        {'nombre': 'novedades', 'descripcion': 'Gestión de novedades'},
        {'nombre': 'liquidaciones', 'descripcion': 'Gestión de liquidaciones'},
        {'nombre': 'servicios', 'descripcion': 'Gestión de servicios'},
        {'nombre': 'abastecimientos', 'descripcion': 'Gestión de abastecimientos'},
        
        # Venta Servicios
        {'nombre': 'clientes', 'descripcion': 'Gestión de clientes'},
        {'nombre': 'citas', 'descripcion': 'Gestión de citas'},
        {'nombre': 'venta_servicios', 'descripcion': 'Gestión de venta de servicios'},
        
        # Configuraciones
        {'nombre': 'roles', 'descripcion': 'Gestión de roles y permisos'},
        {'nombre': 'usuarios', 'descripcion': 'Gestión de usuarios del sistema'},
    ]
    
    modulos_creados = []
    for modulo_data in modulos_data:
        modulo, created = Modulo.objects.get_or_create(
            nombre=modulo_data['nombre'],
            defaults=modulo_data
        )
        modulos_creados.append(modulo)
        if created:
            print(f"✓ Módulo '{modulo.nombre}' creado")
        else:
            print(f"- Módulo '{modulo.nombre}' ya existe")
    
    return modulos_creados

def crear_acciones():
    """Crear las acciones del sistema basadas en el frontend"""
    print("\n=== CREANDO ACCIONES ===")
    
    acciones_data = [
        {'nombre': 'crear', 'descripcion': 'Crear registros'},
        {'nombre': 'editar', 'descripcion': 'Editar registros'},
        {'nombre': 'eliminar', 'descripcion': 'Eliminar registros'},
        {'nombre': 'listar', 'descripcion': 'Listar registros'},
        {'nombre': 'ver_detalles', 'descripcion': 'Ver detalles de registros'},
    ]
    
    # Limpiar acciones existentes
    Accion.objects.all().delete()
    print("Acciones existentes eliminadas")
    
    acciones_creadas = []
    for accion_data in acciones_data:
        accion = Accion.objects.create(**accion_data)
        acciones_creadas.append(accion)
        print(f"✓ Acción '{accion.nombre}' creada")
    
    return acciones_creadas

def crear_permisos(modulos, acciones):
    """Crear permisos específicos para cada módulo según su funcionalidad"""
    print("\n=== CREANDO PERMISOS ===")
    
    # Limpiar permisos existentes
    Permiso.objects.all().delete()
    print("Permisos existentes eliminados")
    
    # Definir qué acciones tiene cada módulo
    modulos_acciones = {
        'dashboard': ['listar'],  # Dashboard solo para ver
        'categoria_insumos': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
        'insumos': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
        'proveedores': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
        'compras': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
        'manicuristas': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
        'novedades': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
        'liquidaciones': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
        'servicios': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
        'abastecimientos': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
        'clientes': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
        'citas': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
        'venta_servicios': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
        'roles': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
        'usuarios': ['crear', 'editar', 'eliminar', 'listar', 'ver_detalles'],
    }
    
    permisos_creados = []
    for modulo in modulos:
        acciones_modulo = modulos_acciones.get(modulo.nombre, ['listar'])  # Por defecto solo listar
        
        for accion_nombre in acciones_modulo:
            try:
                accion = Accion.objects.get(nombre=accion_nombre)
                nombre_permiso = f"{modulo.nombre}_{accion.nombre}"
                descripcion = f"{accion.descripcion} en {modulo.descripcion}"
                
                permiso = Permiso.objects.create(
                    modulo=modulo,
                    accion=accion,
                    nombre=nombre_permiso,
                    descripcion=descripcion
                )
                permisos_creados.append(permiso)
                print(f"✓ Permiso '{permiso.nombre}' creado")
            except Accion.DoesNotExist:
                print(f"⚠ Acción '{accion_nombre}' no encontrada para módulo '{modulo.nombre}'")
    
    return permisos_creados

def crear_roles():
    """Crear los roles del sistema"""
    print("\n=== CREANDO ROLES ===")
    
    roles_data = [
        {'nombre': 'Administrador', 'descripcion': 'Acceso completo al sistema'},
        {'nombre': 'Manicurista', 'descripcion': 'Acceso a funciones de manicurista'},
        {'nombre': 'Ayudante', 'descripcion': 'Acceso limitado para ayudantes'},
        {'nombre': 'Cliente', 'descripcion': 'Acceso básico para clientes'},
    ]
    
    roles_creados = []
    for rol_data in roles_data:
        rol, created = Rol.objects.get_or_create(
            nombre=rol_data['nombre'],
            defaults={'estado': 'activo'}
        )
        roles_creados.append(rol)
        if created:
            print(f"✓ Rol '{rol.nombre}' creado")
        else:
            print(f"- Rol '{rol.nombre}' ya existe")
    
    return roles_creados

def asignar_permisos_a_roles(roles, permisos):
    """Asignar permisos a los roles según sus funciones"""
    print("\n=== ASIGNANDO PERMISOS A ROLES ===")
    
    # Limpiar asignaciones existentes
    RolHasPermiso.objects.all().delete()
    print("Asignaciones de permisos existentes eliminadas")
    
    # Mapeo de roles y sus permisos específicos
    roles_permisos = {
        'Administrador': 'todos',  # Todos los permisos
        'Manicurista': [
            # Dashboard
            'dashboard_listar',
            # Citas
            'citas_crear', 'citas_editar', 'citas_eliminar', 'citas_listar', 'citas_ver_detalles',
            # Clientes
            'clientes_crear', 'clientes_editar', 'clientes_eliminar', 'clientes_listar', 'clientes_ver_detalles',
            # Servicios
            'servicios_listar', 'servicios_ver_detalles',
            # Venta Servicios
            'venta_servicios_crear', 'venta_servicios_editar', 'venta_servicios_listar', 'venta_servicios_ver_detalles',
            # Liquidaciones
            'liquidaciones_listar', 'liquidaciones_ver_detalles',
        ],
        'Ayudante': [
            # Dashboard
            'dashboard_listar',
            # Citas
            'citas_listar', 'citas_ver_detalles',
            # Clientes
            'clientes_listar', 'clientes_ver_detalles',
            # Servicios
            'servicios_listar', 'servicios_ver_detalles',
        ],
        'Cliente': [
            # Dashboard
            'dashboard_listar',
            # Citas
            'citas_crear', 'citas_listar', 'citas_ver_detalles',
            # Servicios
            'servicios_listar', 'servicios_ver_detalles',
        ]
    }
    
    for rol in roles:
        if rol.nombre == 'Administrador':
            # Administrador tiene todos los permisos
            for permiso in permisos:
                RolHasPermiso.objects.create(rol=rol, permiso=permiso)
            print(f"✓ Todos los permisos asignados al rol '{rol.nombre}'")
        else:
            # Otros roles tienen permisos específicos
            permisos_rol = roles_permisos.get(rol.nombre, [])
            permisos_asignados = 0
            
            for permiso_nombre in permisos_rol:
                try:
                    permiso = Permiso.objects.get(nombre=permiso_nombre)
                    RolHasPermiso.objects.create(rol=rol, permiso=permiso)
                    permisos_asignados += 1
                except Permiso.DoesNotExist:
                    print(f"⚠ Permiso '{permiso_nombre}' no encontrado para rol '{rol.nombre}'")
            
            print(f"✓ {permisos_asignados} permisos asignados al rol '{rol.nombre}'")

def crear_administrador():
    """Crear usuario administrador"""
    print("\n=== CREANDO ADMINISTRADOR ===")
    
    # Buscar rol administrador
    try:
        rol_admin = Rol.objects.get(nombre='Administrador')
    except Rol.DoesNotExist:
        print("❌ Error: Rol 'Administrador' no encontrado")
        return None
    
    # Crear o actualizar administrador
    admin_data = {
        'nombre': 'Sebastian Arroyo',
        'tipo_documento': 'CC',
        'documento': '12345678',
        'celular': '3001234567',
        'correo_electronico': 'arroyosebas1693@outlook.com',
        'rol': rol_admin,
        'is_staff': True,
        'is_superuser': True,
        'is_active': True,
    }
    
    try:
        admin = Usuario.objects.get(correo_electronico=admin_data['correo_electronico'])
        # Actualizar datos existentes
        for key, value in admin_data.items():
            setattr(admin, key, value)
        admin.set_password('nuXXu887@')
        admin.save()
        print(f"✓ Administrador actualizado: {admin.nombre}")
    except Usuario.DoesNotExist:
        admin = Usuario.objects.create_user(
            password='nuXXu887@',
            **admin_data
        )
        print(f"✓ Administrador creado: {admin.nombre}")
    
    return admin

def crear_manicurista():
    """Crear manicurista"""
    print("\n=== CREANDO MANICURISTA ===")
    
    # Buscar rol manicurista
    try:
        rol_manicurista = Rol.objects.get(nombre='Manicurista')
    except Rol.DoesNotExist:
        print("❌ Error: Rol 'Manicurista' no encontrado")
        return None
    
    # Crear usuario manicurista
    manicurista_data = {
        'nombre': 'Sebastian Arroyo Manicurista',
        'tipo_documento': 'CC',
        'documento': '87654321',
        'celular': '3007654321',
        'correo_electronico': 'arroyosebitas1693@gmail.com',
        'rol': rol_manicurista,
        'is_staff': False,
        'is_superuser': False,
        'is_active': True,
    }
    
    try:
        usuario_manicurista = Usuario.objects.get(correo_electronico=manicurista_data['correo_electronico'])
        # Actualizar datos existentes
        for key, value in manicurista_data.items():
            setattr(usuario_manicurista, key, value)
        usuario_manicurista.set_password('nuXXu887@')
        usuario_manicurista.save()
        print(f"✓ Usuario manicurista actualizado: {usuario_manicurista.nombre}")
    except Usuario.DoesNotExist:
        usuario_manicurista = Usuario.objects.create_user(
            password='nuXXu887@',
            **manicurista_data
        )
        print(f"✓ Usuario manicurista creado: {usuario_manicurista.nombre}")
    
    # Crear registro de manicurista
    manicurista_data_profile = {
        'nombre': 'Sebastian Arroyo Manicurista',
        'tipo_documento': 'CC',
        'numero_documento': '87654321',
        'celular': '3007654321',
        'correo': 'arroyosebitas1693@gmail.com',
        'especialidad': 'Manicure Clásica',
        'direccion': 'Calle 123 #45-67',
        'estado': 'activo',
        'disponible': True,
        'usuario': usuario_manicurista,
    }
    
    try:
        manicurista = Manicurista.objects.get(correo=manicurista_data_profile['correo'])
        # Actualizar datos existentes
        for key, value in manicurista_data_profile.items():
            setattr(manicurista, key, value)
        manicurista.save()
        print(f"✓ Perfil de manicurista actualizado: {manicurista.nombre}")
    except Manicurista.DoesNotExist:
        manicurista = Manicurista.objects.create(**manicurista_data_profile)
        print(f"✓ Perfil de manicurista creado: {manicurista.nombre}")
    
    return manicurista

def verificar_sistema():
    """Verificar que todo esté configurado correctamente"""
    print("\n=== VERIFICACIÓN DEL SISTEMA ===")
    
    print(f"📊 Módulos: {Modulo.objects.count()}")
    print(f"📊 Acciones: {Accion.objects.count()}")
    print(f"📊 Permisos: {Permiso.objects.count()}")
    print(f"📊 Roles: {Rol.objects.count()}")
    print(f"📊 Usuarios: {Usuario.objects.count()}")
    print(f"📊 Manicuristas: {Manicurista.objects.count()}")
    
    print("\n🔧 Acciones configuradas:")
    for accion in Accion.objects.all():
        print(f"  - {accion.nombre}: {accion.descripcion}")
    
    print("\n📋 Módulos configurados:")
    for modulo in Modulo.objects.all():
        print(f"  - {modulo.nombre}: {modulo.descripcion}")
    
    print("\n👥 Roles y permisos:")
    for rol in Rol.objects.all():
        print(f"  - {rol.nombre}: {rol.permisos.count()} permisos")
    
    print("\n👤 Usuarios creados:")
    for usuario in Usuario.objects.all():
        print(f"  - {usuario.nombre} ({usuario.correo_electronico}) - Rol: {usuario.rol.nombre}")

def main():
    """Función principal"""
    print("🚀 CONFIGURACIÓN COMPLETA DEL SISTEMA")
    print("Basado en la estructura real del frontend")
    print("=" * 60)
    
    try:
        # 1. Crear módulos
        modulos = crear_modulos()
        
        # 2. Crear acciones
        acciones = crear_acciones()
        
        # 3. Crear permisos
        permisos = crear_permisos(modulos, acciones)
        
        # 4. Crear roles
        roles = crear_roles()
        
        # 5. Asignar permisos a roles
        asignar_permisos_a_roles(roles, permisos)
        
        # 6. Crear administrador
        admin = crear_administrador()
        
        # 7. Crear manicurista
        manicurista = crear_manicurista()
        
        # 8. Verificar sistema
        verificar_sistema()
        
        print("\n" + "=" * 60)
        print("✅ CONFIGURACIÓN COMPLETADA EXITOSAMENTE")
        print("=" * 60)
        print(f"📊 Resumen:")
        print(f"   - Módulos: {len(modulos)}")
        print(f"   - Acciones: {len(acciones)}")
        print(f"   - Permisos: {len(permisos)}")
        print(f"   - Roles: {len(roles)}")
        print(f"   - Administrador: {admin.nombre if admin else 'No creado'}")
        print(f"   - Manicurista: {manicurista.nombre if manicurista else 'No creado'}")
        print("\n🔑 Credenciales:")
        print(f"   - Admin: arroyosebas1693@outlook.com / nuXXu887@")
        print(f"   - Manicurista: arroyosebitas1693@gmail.com / nuXXu887@")
        print("\n📝 Notas:")
        print("   - Dashboard solo tiene permiso 'listar'")
        print("   - Módulos basados en la estructura real del frontend")
        print("   - Acciones: crear, editar, eliminar, listar, ver_detalles")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
