from supabase import create_client, Client
import pandas as pd
from dotenv import load_dotenv
import os

# Cargar variables de entorno desde archivo .env
load_dotenv()


SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Crear cliente Supabase
supabase: Client = create_client(url, key)

# Ruta del archivo en el bucket
bucket_name = "proyectos-usuarios"
file_path = "dc5405fb-f3ae-4326-a2fd-942ee139fb8b/42f2dd49-4fcd-4adf-8d43-3cd34eb89393/DupliNan/DupliNan.parquet"

# Descargar el archivo parquet
response = supabase.storage.from_(bucket_name).download(file_path)

# Guardar localmente
with open("DupliNan.parquet", "wb") as f:
    f.write(response.read())

print("Archivo descargado como DupliNan.parquet")

# Leer el parquet para hacer chequeos
df = pd.read_parquet("DupliNan.parquet")
print("Cantidad de nulos en 'PRODUCTLINE':", df["PRODUCTLINE"].isna().sum())
