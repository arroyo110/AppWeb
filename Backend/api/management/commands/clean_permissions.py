from django.core.management.base import BaseCommand
from api.roles.models import Permiso, Rol, RolHasPermiso, Modulo, Accion


class Command(BaseCommand):
    help = 'Limpiar permisos existentes para implementar el nuevo sistema'

    def handle(self, *args, **options):
        self.stdout.write('Iniciando limpieza completa de permisos...')
        
        # Eliminar todas las relaciones rol-permiso
        self.stdout.write('Eliminando relaciones rol-permiso...')
        RolHasPermiso.objects.all().delete()
        
        # Eliminar todos los permisos existentes
        self.stdout.write('Eliminando permisos existentes...')
        Permiso.objects.all().delete()
        
        # Eliminar todas las acciones
        self.stdout.write('Eliminando acciones...')
        Accion.objects.all().delete()
        
        # Eliminar todos los módulos
        self.stdout.write('Eliminando módulos...')
        Modulo.objects.all().delete()
        
        # Eliminar roles existentes (excepto administrador si existe)
        self.stdout.write('Eliminando roles existentes...')
        try:
            roles_a_eliminar = Rol.objects.exclude(nombre__iexact='administrador')
            for rol in roles_a_eliminar:
                self.stdout.write(f'Eliminando rol: {rol.nombre}')
                rol.delete()
        except Exception as e:
            self.stdout.write(f'Error eliminando roles: {str(e)}')
        
        self.stdout.write(
            self.style.SUCCESS('Limpieza completa de permisos completada exitosamente!')
        )
