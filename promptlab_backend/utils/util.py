# ===================== RESPALDO =====================

def crear_respaldo_df(df, nombre='respaldo'):
    copia = df.copy(deep=True)
    print(
        f"[INFO] Se creó una copia de respaldo del DataFrame llamada '{nombre}'.")
    return copia

# Exportar archivos despues de la limpieza


def exportar_df(df, nombre_archivo, formato='csv'):
    """
    Exporta un DataFrame a un archivo CSV o Excel.

    Parámetros:
    - df: DataFrame a exportar
    - nombre_archivo: nombre del archivo sin extensión
    - formato: 'csv' o 'excel'

    Retorna:
    - Ruta del archivo guardado, o None si hubo error
    """
    try:
        if formato == 'csv':
            ruta = f"{nombre_archivo}.csv"
            df.to_csv(ruta, index=False)
        elif formato == 'excel':
            ruta = f"{nombre_archivo}.xlsx"
            df.to_excel(ruta, index=False)
        else:
            raise ValueError("Formato no válido. Usa 'csv' o 'excel'.")

        print(f"✅ Archivo exportado como: {ruta}")
        return ruta

    except Exception as e:
        print(f"❌ Error al exportar: {e}")
        return None
