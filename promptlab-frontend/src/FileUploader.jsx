import React from 'react';

function FileUploader({ onFileUpload }) {
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            onFileUpload(file);
        }
    };

    return (
        <div>
            <h2>Sube tu archivo</h2>
            <input type="file" onChange={handleFileChange} />
        </div>
    );
}

export default FileUploader;