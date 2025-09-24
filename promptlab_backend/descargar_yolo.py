from ultralytics import YOLO

    # Esta línea comprueba si 'yolov8n.pt' existe.
    # Si no existe, lo descargará automáticamente a la carpeta actual.
model = YOLO('yolov8n.pt')

print("¡Listo! El archivo 'yolov8n.pt' ha sido descargado en esta carpeta.")