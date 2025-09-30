from django.core.mail import send_mail
from django.conf import settings
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import socket

def enviar_correo(destinatario, asunto, mensaje):
    """Envía un correo electrónico con timeout configurado"""
    try:
        # Configurar timeout para evitar worker timeout
        socket.setdefaulttimeout(30)
        
        send_mail(
            subject=asunto,
            message=mensaje,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[destinatario],
            fail_silently=False,
            timeout=30,  # 30 segundos timeout
        )
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Error de autenticación SMTP: {e}")
        print("🔧 Verifica las credenciales de email en las variables de entorno")
        return False
    except smtplib.SMTPConnectError as e:
        print(f"❌ Error de conexión SMTP: {e}")
        print("🔧 Verifica la configuración del servidor SMTP")
        return False
    except socket.timeout as e:
        print(f"❌ Timeout al enviar correo: {e}")
        print("🔧 El servidor SMTP está tardando demasiado en responder")
        return False
    except Exception as e:
        print(f"❌ Error inesperado al enviar correo: {e}")
        return False