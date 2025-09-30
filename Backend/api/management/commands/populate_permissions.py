from django.core.management.base import BaseCommand
from api.roles.models import Modulo, Accion, Permiso, Rol


class Command(BaseCommand):
    help = 'Poblar la base de datos con módulos, acciones y permisos iniciales'

    def handle(self, *args, **options):
        self.stdout.write('Iniciando población de permisos...')
        
        # Crear módulos
        modulos_data = [
            {'nombre': 'usuarios', 'descripcion': 'Gestión de usuarios del sistema'},
            {'nombre': 'clientes', 'descripcion': 'Gestión de clientes'},
            {'nombre': 'manicuristas', 'descripcion': 'Gestión de manicuristas'},
            {'nombre': 'roles', 'descripcion': 'Gestión de roles y permisos'},
            {'nombre': 'citas', 'descripcion': 'Gestión de citas'},
            {'nombre': 'servicios', 'descripcion': 'Gestión de servicios'},
            {'nombre': 'insumos', 'descripcion': 'Gestión de insumos'},
            {'nombre': 'categoria_insumos', 'descripcion': 'Gestión de categorías de insumos'},
            {'nombre': 'compras', 'descripcion': 'Gestión de compras'},
            {'nombre': 'proveedores', 'descripcion': 'Gestión de proveedores'},
            {'nombre': 'abastecimientos', 'descripcion': 'Gestión de abastecimientos'},
            {'nombre': 'venta_servicios', 'descripcion': 'Gestión de venta de servicios'},
            {'nombre': 'liquidaciones', 'descripcion': 'Gestión de liquidaciones'},
            {'nombre': 'novedades', 'descripcion': 'Gestión de novedades'},
        ]
        
        for modulo_data in modulos_data:
            modulo, created = Modulo.objects.get_or_create(
                nombre=modulo_data['nombre'],
                defaults=modulo_data
            )
            if created:
                self.stdout.write(f'Creado módulo: {modulo.nombre}')
            else:
                self.stdout.write(f'Módulo ya existe: {modulo.nombre}')
        
        # Crear acciones
        acciones_data = [
            {'nombre': 'crear', 'descripcion': 'Crear nuevos registros'},
            {'nombre': 'listar', 'descripcion': 'Ver listado de registros'},
            {'nombre': 'ver_detalles', 'descripcion': 'Ver detalles de un registro específico'},
            {'nombre': 'eliminar', 'descripcion': 'Eliminar registros'},
            {'nombre': 'editar', 'descripcion': 'Editar registros existentes'},
        ]
        
        for accion_data in acciones_data:
            accion, created = Accion.objects.get_or_create(
                nombre=accion_data['nombre'],
                defaults=accion_data
            )
            if created:
                self.stdout.write(f'Creada acción: {accion.nombre}')
            else:
                self.stdout.write(f'Acción ya existe: {accion.nombre}')
        
        # Crear permisos para cada módulo y acción
        modulos = Modulo.objects.all()
        acciones = Accion.objects.all()
        
        for modulo in modulos:
            for accion in acciones:
                nombre_permiso = f"{modulo.nombre}_{accion.nombre}"
                descripcion = f"Permite {accion.descripcion.lower()} en el módulo {modulo.nombre}"
                
                try:
                    permiso, created = Permiso.objects.get_or_create(
                        modulo=modulo,
                        accion=accion,
                        defaults={
                            'nombre': nombre_permiso,
                            'descripcion': descripcion
                        }
                    )
                    if created:
                        self.stdout.write(f'Creado permiso: {permiso.nombre}')
                    else:
                        self.stdout.write(f'Permiso ya existe: {permiso.nombre}')
                except Exception as e:
                    self.stdout.write(f'Error creando permiso {nombre_permiso}: {str(e)}')
        
        # Crear roles básicos
        roles_data = [
            {
                'nombre': 'administrador',
                'permisos': 'todos'  # Todos los permisos
            },
            {
                'nombre': 'manicurista',
                'permisos': [
                    'clientes_listar', 'clientes_ver_detalles', 'clientes_crear',
                    'citas_listar', 'citas_ver_detalles', 'citas_crear', 'citas_editar',
                    'servicios_listar', 'servicios_ver_detalles',
                    'venta_servicios_listar', 'venta_servicios_ver_detalles', 'venta_servicios_crear'
                ]
            },
            {
                'nombre': 'cliente',
                'permisos': [
                    'citas_listar', 'citas_ver_detalles', 'citas_crear',
                    'servicios_listar', 'servicios_ver_detalles'
                ]
            }
        ]
        
        for rol_data in roles_data:
            rol, created = Rol.objects.get_or_create(
                nombre=rol_data['nombre']
            )
            
            if created:
                self.stdout.write(f'Creado rol: {rol.nombre}')
                
                # Asignar permisos al rol
                if rol_data['permisos'] == 'todos':
                    # Administrador tiene todos los permisos
                    todos_permisos = Permiso.objects.all()
                    rol.permisos.set(todos_permisos)
                    self.stdout.write(f'Asignados todos los permisos al rol: {rol.nombre}')
                else:
                    # Asignar permisos específicos
                    permisos_rol = Permiso.objects.filter(nombre__in=rol_data['permisos'])
                    rol.permisos.set(permisos_rol)
                    self.stdout.write(f'Asignados {permisos_rol.count()} permisos al rol: {rol.nombre}')
            else:
                self.stdout.write(f'Rol ya existe: {rol.nombre}')
        
        self.stdout.write(
            self.style.SUCCESS('Población de permisos completada exitosamente!')
        )
