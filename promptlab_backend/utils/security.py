# utils/security.py

import os
from cryptography.fernet import Fernet

# Esta clave se usará para encriptar y desencriptar. DEBE ser secreta.
# La cargaremos desde las variables de entorno.
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    raise ValueError("No se ha configurado la ENCRYPTION_KEY en el archivo .env")

# Creamos una "suite" de cifrado con nuestra clave
fernet = Fernet(ENCRYPTION_KEY.encode())

def encrypt_text(text: str) -> str:
    """Encripta un texto y lo devuelve como un string."""
    if not text:
        return ""
    encrypted_text = fernet.encrypt(text.encode())
    return encrypted_text.decode()

def decrypt_text(encrypted_text: str) -> str:
    """Desencripta un texto y lo devuelve como un string."""
    if not encrypted_text:
        return ""
    try:
        decrypted_text = fernet.decrypt(encrypted_text.encode())
        return decrypted_text.decode()
    except Exception:
        # Si la clave es inválida o está corrupta, devuelve una cadena vacía
        return ""