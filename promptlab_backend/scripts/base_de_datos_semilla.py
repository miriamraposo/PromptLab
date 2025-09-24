# ARCHIVO: base_de_datos_semilla.py (VERSIÓN DE DEPURACIÓN)
# PROPÓSITO: Llenar la tabla 'prompts_sugeridos' con datos iniciales.

print("--- 1. Script base_de_datos_semilla.py ha comenzado a ejecutarse. ---")

# Importamos las herramientas que necesitamos
try:
    import pandas as pd
    from supabase_client import get_supabase_client
    from datasets import load_dataset  # La importación

    print("--- 2. Todas las librerías han sido importadas con éxito. ---")
except ImportError as e:
    print(
        f"--- ❌ ERROR DE IMPORTACIÓN: No se pudo importar una librería. Detalle: {e} ---")
    # Si ves este error, el problema sigue siendo el entorno.
    exit()  # Detenemos la ejecución si no podemos importar.


def sembrar_base_de_datos():
    """
    Función principal para descargar prompts y guardarlos en Supabase.
    """
    print("--- 3. Entrando en la función sembrar_base_de_datos(). ---")

    # --- Paso A: Conectarse a la base de datos ---
    try:
        supabase = get_supabase_client()
        print("--- 4. Conexión a Supabase establecida correctamente. ---")
    except Exception as e:
        print(f"--- ❌ Error fatal al conectar con Supabase: {e} ---")
        return

    # --- Paso B: Cargar el dataset de Hugging Face ---
    try:
        print("--- 5. Intentando cargar el dataset 'fka/awesome-chatgpt-prompts'...")
        # Aquí usamos la función que importamos arriba.
        dataset = load_dataset("fka/awesome-chatgpt-prompts", split='train')
        df_prompts = dataset.to_pandas()
        print(
            f"--- 6. Dataset cargado con éxito. Se encontraron {len(df_prompts)} prompts. ---")
    except NameError:
        print("--- ❌ ERROR CRÍTICO: El nombre 'load_dataset' no está definido. Esto significa que la línea 'from datasets import load_dataset' no se ejecutó o está ausente. Revisa el código. ---")
        return
    except Exception as e:
        print(f"--- ❌ Error inesperado al cargar el dataset: {e} ---")
        return

    # --- Paso C: Preparar los datos para nuestra tabla ---
    print("--- 7. Preparando registros para la inserción... ---")
    registros_para_insertar = [{'prompt_texto': row['prompt'],
                                'categoria': row['act']} for _, row in df_prompts.iterrows()]

    # --- Paso D: Insertar los datos en Supabase ---
    try:
        print("--- 8. Vaciando la tabla 'prompts_sugeridos' para evitar duplicados... ---")
        supabase.table('prompts_sugeridos').delete().neq('id', 0).execute()

        print(
            f"--- 9. Insertando {len(registros_para_insertar)} registros... ---")
        response = supabase.table('prompts_sugeridos').insert(
            registros_para_insertar).execute()

        if response.data:
            print(
                f"--- 10. ¡Éxito! Se insertaron {len(response.data)} registros. ---")
        else:
            print(
                f"--- ❌ Error durante la inserción en Supabase: {response.error} ---")
    except Exception as e:
        print(f"--- ❌ Error al interactuar con la tabla en Supabase: {e} ---")

    print("\n--- 🎉 Proceso de siembra completado. ---")


# Esta línea llama a la función principal para que todo se ejecute.
if __name__ == "__main__":
    sembrar_base_de_datos()
