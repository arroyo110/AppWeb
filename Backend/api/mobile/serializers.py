from rest_framework import serializers
from api.usuarios.models import Usuario
from api.clientes.models import Cliente
from api.manicuristas.models import Manicurista
from api.citas.models import Cita
from api.servicios.models import Servicio
from api.ventaservicios.models import VentaServicio
from api.liquidaciones.models import Liquidacion
from api.novedades.models import Novedad
from api.abastecimientos.models import Abastecimiento
from api.insumos.models import Insumo
from api.compras.models import Compra
from api.proveedores.models import Proveedor


class UsuarioMobileSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil - Usuario"""
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True)
    
    class Meta:
        model = Usuario
        fields = [
            'id', 'nombre', 'correo_electronico', 'celular', 
            'direccion', 'rol_nombre', 'is_active', 'debe_cambiar_contraseña'
        ]


class ClienteMobileSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil - Cliente"""
    usuario = UsuarioMobileSerializer(read_only=True)
    
    class Meta:
        model = Cliente
        fields = [
            'id', 'nombre', 'documento', 'celular', 'correo_electronico',
            'direccion', 'genero', 'estado', 'usuario', 'debe_cambiar_contraseña'
        ]


class ManicuristaMobileSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil - Manicurista"""
    usuario = UsuarioMobileSerializer(read_only=True)
    
    class Meta:
        model = Manicurista
        fields = [
            'id', 'nombre', 'numero_documento', 'celular', 'correo',
            'direccion', 'especialidad', 'estado', 'usuario', 'debe_cambiar_contraseña'
        ]


class ServicioMobileSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil - Servicio"""
    
    class Meta:
        model = Servicio
        fields = [
            'id', 'nombre', 'descripcion', 'precio', 'duracion_minutos',
            'estado', 'categoria'
        ]


class CitaMobileSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil - Cita"""
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)
    manicurista_nombre = serializers.CharField(source='manicurista.nombre', read_only=True)
    servicio_nombre = serializers.CharField(source='servicio.nombre', read_only=True)
    servicio_precio = serializers.DecimalField(source='servicio.precio', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = Cita
        fields = [
            'id', 'fecha_hora', 'estado', 'observaciones', 'precio_total',
            'cliente_nombre', 'manicurista_nombre', 'servicio_nombre', 'servicio_precio',
            'cliente', 'manicurista', 'servicio'
        ]


class VentaServicioMobileSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil - Venta Servicio"""
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)
    manicurista_nombre = serializers.CharField(source='manicurista.nombre', read_only=True)
    servicio_nombre = serializers.CharField(source='servicio.nombre', read_only=True)
    
    class Meta:
        model = VentaServicio
        fields = [
            'id', 'fecha_venta', 'precio_total', 'metodo_pago', 'estado',
            'cliente_nombre', 'manicurista_nombre', 'servicio_nombre',
            'cliente', 'manicurista', 'servicio'
        ]


class LiquidacionMobileSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil - Liquidación"""
    manicurista_nombre = serializers.CharField(source='manicurista.nombre', read_only=True)
    
    class Meta:
        model = Liquidacion
        fields = [
            'id', 'fecha_liquidacion', 'total_servicios', 'comision_porcentaje',
            'comision_valor', 'total_liquidacion', 'estado', 'manicurista_nombre',
            'manicurista'
        ]


class NovedadMobileSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil - Novedad"""
    
    class Meta:
        model = Novedad
        fields = [
            'id', 'titulo', 'descripcion', 'fecha_publicacion', 'estado',
            'imagen_url', 'tipo'
        ]


class InsumoMobileSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil - Insumo"""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    
    class Meta:
        model = Insumo
        fields = [
            'id', 'nombre', 'descripcion', 'precio_unitario', 'stock_actual',
            'stock_minimo', 'unidad_medida', 'estado', 'categoria_nombre', 'categoria'
        ]


class AbastecimientoMobileSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil - Abastecimiento"""
    insumo_nombre = serializers.CharField(source='insumo.nombre', read_only=True)
    
    class Meta:
        model = Abastecimiento
        fields = [
            'id', 'fecha_abastecimiento', 'cantidad', 'precio_unitario',
            'precio_total', 'estado', 'insumo_nombre', 'insumo'
        ]


class CompraMobileSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil - Compra"""
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    
    class Meta:
        model = Compra
        fields = [
            'id', 'fecha_compra', 'total_compra', 'metodo_pago', 'estado',
            'proveedor_nombre', 'proveedor'
        ]


class ProveedorMobileSerializer(serializers.ModelSerializer):
    """Serializer optimizado para móvil - Proveedor"""
    
    class Meta:
        model = Proveedor
        fields = [
            'id', 'nombre', 'contacto', 'telefono', 'correo_electronico',
            'direccion', 'estado'
        ]


# Serializers para respuestas combinadas
class DashboardMobileSerializer(serializers.Serializer):
    """Serializer para datos del dashboard móvil"""
    total_citas_hoy = serializers.IntegerField()
    total_ventas_hoy = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_clientes = serializers.IntegerField()
    total_manicuristas = serializers.IntegerField()
    citas_pendientes = serializers.IntegerField()
    servicios_populares = serializers.ListField()
    novedades_recientes = NovedadMobileSerializer(many=True)


class PerfilUsuarioMobileSerializer(serializers.Serializer):
    """Serializer para perfil de usuario móvil"""
    usuario = UsuarioMobileSerializer()
    perfil_especifico = serializers.DictField()
    estadisticas = serializers.DictField()
