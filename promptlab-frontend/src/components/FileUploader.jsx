import React from 'react';

function FileUploader({ onFileUpload }) {
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // --- Validación de extensión ---
        const allowedExtensions = ['.xlsx', '.csv'];
        const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
            alert('❌ Solo se permiten archivos .xlsx o .csv sin macros.');
            event.target.value = null; // Limpia el input
            return;
        }

        onFileUpload(file);
    };

    return (
        <div>
            <h2>Sube un archivo</h2>
            <input
                type="file"
                onChange={handleFileChange}
                accept=".xlsx,.csv" // Esto bloquea archivos no permitidos en el selector de archivos
            />
        </div>
    );
}

export default FileUploader;
