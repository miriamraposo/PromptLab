# ARCHIVO: supabase_client.py
# RESPONSABILIDAD: Ser el único punto de acceso a la base de datos de Supabase.

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
supabase_connection: Client = None


def get_supabase_client() -> Client:
    """Devuelve la instancia global del cliente de Supabase, creándola si es necesario."""
    global supabase_connection
    if supabase_connection is None:
        url = os.getenv("SUPABASE_URL")
        # Usamos la service key para operaciones de escritura
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise ValueError(
                "Configuración de Supabase incompleta. Revisa SUPABASE_URL y SUPABASE_SERVICE_KEY en .env")
        print("🔌 Creando conexión a Supabase...")
        supabase_connection = create_client(url, key)
        print("✅ Conexión a Supabase establecida.")
    return supabase_connection
