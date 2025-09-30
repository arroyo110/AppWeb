from django.core.management.base import BaseCommand
from api.roles.models import Rol, Permiso


class Command(BaseCommand):
    help = 'Asignar todos los permisos al rol administrador'

    def handle(self, *args, **options):
        self.stdout.write('Asignando todos los permisos al administrador...')
        
        try:
            # Buscar el rol administrador
            admin_rol = Rol.objects.get(nombre__iexact='administrador')
            self.stdout.write(f'Rol administrador encontrado: {admin_rol.nombre}')
            
            # Obtener todos los permisos
            todos_permisos = Permiso.objects.all()
            self.stdout.write(f'Total de permisos disponibles: {todos_permisos.count()}')
            
            # Asignar todos los permisos al administrador
            admin_rol.permisos.set(todos_permisos)
            
            # Verificar cuántos permisos se asignaron
            permisos_asignados = admin_rol.permisos.count()
            self.stdout.write(f'Permisos asignados al administrador: {permisos_asignados}')
            
            self.stdout.write(
                self.style.SUCCESS('Todos los permisos han sido asignados al administrador exitosamente!')
            )
            
        except Rol.DoesNotExist:
            self.stdout.write(
                self.style.ERROR('No se encontró el rol administrador')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error asignando permisos: {str(e)}')
            )
