#!/usr/bin/env python
"""
Script para crear un usuario administrador
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'winespa.settings')
django.setup()

from api.usuarios.models import Usuario
from api.roles.models import Rol

def crear_usuario_administrador():
    """Crea un usuario administrador con las credenciales especificadas"""
    
    correo = "satelitetv0003@gmail.com"
    password = "Ha123456@"
    
    try:
        # Verificar si el usuario ya existe
        if Usuario.objects.filter(correo_electronico=correo).exists():
            print(f"❌ El usuario con correo {correo} ya existe.")
            return False
        
        # Buscar o crear el rol de administrador
        rol_admin, created = Rol.objects.get_or_create(
            nombre='Administrador',
            defaults={
                'estado': 'activo',
                'descripcion': 'Rol de administrador con todos los permisos'
            }
        )
        
        if created:
            print(f"✅ Rol 'Administrador' creado exitosamente.")
        else:
            print(f"✅ Rol 'Administrador' ya existe.")
        
        # Crear el usuario administrador
        usuario = Usuario.objects.create_superuser(
            correo_electronico=correo,
            password=password,
            nombre="Administrador",
            tipo_documento="CC",
            documento="12345678",
            celular="3001234567",
            rol=rol_admin,
            is_staff=True,
            is_superuser=True,
            is_active=True
        )
        
        print(f"✅ Usuario administrador creado exitosamente:")
        print(f"   📧 Correo: {correo}")
        print(f"   🔑 Contraseña: {password}")
        print(f"   👤 Nombre: {usuario.nombre}")
        print(f"   🎭 Rol: {usuario.rol.nombre}")
        print(f"   🆔 ID: {usuario.id}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error al crear el usuario administrador: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Creando usuario administrador...")
    success = crear_usuario_administrador()
    
    if success:
        print("\n🎉 ¡Usuario administrador creado exitosamente!")
        print("📝 Puedes acceder al panel de administración en: http://localhost:8000/admin/")
    else:
        print("\n💥 Error al crear el usuario administrador.")
        sys.exit(1)
