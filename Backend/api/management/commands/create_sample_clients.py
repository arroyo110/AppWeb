from django.core.management.base import BaseCommand
from api.clientes.models import Cliente
from api.usuarios.models import Usuario
from api.roles.models import Rol
from django.contrib.auth.hashers import make_password
import random


class Command(BaseCommand):
    help = 'Crea registros de clientes de ejemplo'

    def handle(self, *args, **options):
        # Datos de clientes de ejemplo
        clientes_data = [
            {
                'tipo_documento': 'CC',
                'documento': '12345678',
                'nombre': 'María González',
                'celular': '+573001234567',
                'correo_electronico': 'maria.gonzalez@email.com',
                'direccion': 'Calle 123 #45-67, Bogotá',
                'genero': 'F'
            },
            {
                'tipo_documento': 'CC',
                'documento': '87654321',
                'nombre': 'Carlos Rodríguez',
                'celular': '+573007654321',
                'correo_electronico': 'carlos.rodriguez@email.com',
                'direccion': 'Carrera 78 #12-34, Medellín',
                'genero': 'M'
            },
            {
                'tipo_documento': 'CE',
                'documento': 'AB123456',
                'nombre': 'Ana Martínez',
                'celular': '+573001112223',
                'correo_electronico': 'ana.martinez@email.com',
                'direccion': 'Avenida 5 #23-45, Cali',
                'genero': 'F'
            },
            {
                'tipo_documento': 'CC',
                'documento': '11223344',
                'nombre': 'Luis Pérez',
                'celular': '+573004445556',
                'correo_electronico': 'luis.perez@email.com',
                'direccion': 'Calle 90 #67-89, Barranquilla',
                'genero': 'M'
            },
            {
                'tipo_documento': 'TI',
                'documento': '98765432',
                'nombre': 'Sofia Herrera',
                'celular': '+573007778889',
                'correo_electronico': 'sofia.herrera@email.com',
                'direccion': 'Carrera 15 #34-56, Bucaramanga',
                'genero': 'F'
            },
            {
                'tipo_documento': 'CC',
                'documento': '55667788',
                'nombre': 'Diego Silva',
                'celular': '+573009990001',
                'correo_electronico': 'diego.silva@email.com',
                'direccion': 'Avenida 30 #12-34, Pereira',
                'genero': 'M'
            },
            {
                'tipo_documento': 'CE',
                'documento': 'CD789012',
                'nombre': 'Valentina López',
                'celular': '+573002223334',
                'correo_electronico': 'valentina.lopez@email.com',
                'direccion': 'Calle 45 #78-90, Manizales',
                'genero': 'F'
            },
            {
                'tipo_documento': 'CC',
                'documento': '99887766',
                'nombre': 'Andrés Morales',
                'celular': '+573005556667',
                'correo_electronico': 'andres.morales@email.com',
                'direccion': 'Carrera 50 #23-45, Ibagué',
                'genero': 'M'
            }
        ]

        # Asegurar que existe el rol de cliente
        rol_cliente, created = Rol.objects.get_or_create(
            nombre='Cliente',
            defaults={'estado': 'activo'}
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Rol "Cliente" creado con ID: {rol_cliente.id}')
            )

        clientes_creados = 0
        
        for cliente_data in clientes_data:
            # Verificar si el cliente ya existe
            if Cliente.objects.filter(documento=cliente_data['documento']).exists():
                self.stdout.write(
                    self.style.WARNING(f'Cliente con documento {cliente_data["documento"]} ya existe, saltando...')
                )
                continue
            
            try:
                # Crear el cliente
                cliente = Cliente.objects.create(
                    tipo_documento=cliente_data['tipo_documento'],
                    documento=cliente_data['documento'],
                    nombre=cliente_data['nombre'],
                    celular=cliente_data['celular'],
                    correo_electronico=cliente_data['correo_electronico'],
                    direccion=cliente_data['direccion'],
                    genero=cliente_data['genero'],
                    estado=True
                )
                
                # Generar contraseña temporal
                contraseña_temporal = cliente.generar_contraseña_temporal()
                cliente.save()
                
                # Crear usuario relacionado
                cliente.crear_usuario_relacionado()
                
                clientes_creados += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Cliente creado: {cliente.nombre} (Documento: {cliente.documento}) - '
                        f'Contraseña temporal: {contraseña_temporal}'
                    )
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error creando cliente {cliente_data["nombre"]}: {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\nSe crearon {clientes_creados} clientes de ejemplo exitosamente.')
        )
