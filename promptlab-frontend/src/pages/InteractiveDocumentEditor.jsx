

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom'; 
import { Box, Paper, CircularProgress, Alert, Button, Typography ,Tooltip} from '@mui/material';
import { supabase } from '../supabaseClient'; // Ajusta la ruta
import PageRenderer from '../components/pdf/PageRenderer'; // <-- El componente que vamos a crear
import GalleryModal from '../components/pdf/GalleryModal'



export default function InteractiveDocumentEditor({ datasetId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- ESTADOS PARA MANEJAR EL DOCUMENTO ---
    const [docId, setDocId] = useState(null); // El ID que nos devuelve el POST
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageData, setPageData] = useState(null); // Los elementos de la página actual
    
    // --- ESTADOS PARA MODALES Y ACCIONES ---
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [targetImageId, setTargetImageId] = useState(null);
    const { projectId } = useParams(); // Ahora tenemos el projectId desde la URL
    const navigate = useNavigate();      // Ahora tenemos la función de navegación
    
    
    const handleSelectAndNavigate = (textContent) => {
        if (!textContent) return;

        
        
        // Navegamos al DocumentEditor, pasando el texto en el 'state'
        navigate(`/project/${projectId}/document/${datasetId}`, {
            state: {
                initialTextContent: textContent // Tu DocumentEditor ya sabe leer esto
            }
        });
    };

    // --- FASE 1: SUBIR EL PDF Y OBTENER EL doc_id ---
    useEffect(() => {
        const uploadAndInitialize = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Obtener token
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");

                // 2. Descargar el PDF original desde nuestro storage
                const downloadUrl = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/download`;
                const fileResponse = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
                if (!fileResponse.ok) throw new Error("No se pudo descargar el PDF.");
                
                const pdfBlob = await fileResponse.blob();
                const pdfFile = new File([pdfBlob], "document.pdf");

                // 3. Subirlo al nuevo endpoint /reconstruct con POST
                const formData = new FormData();
                formData.append('pdf_file', pdfFile);

                const reconstructUrl = `${import.meta.env.VITE_API_URL}/api/pdf/reconstruct`;
                const reconstructResponse = await fetch(reconstructUrl, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                    body: formData,
                });
                const result = await reconstructResponse.json();
                if (!result.success) throw new Error(result.error);

                // 4. Guardar los datos clave del documento
                setDocId(result.doc_id);
                setTotalPages(result.pages);
                
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        uploadAndInitialize();
    }, [datasetId]);

    // --- FASE 2: CARGAR LA PÁGINA ACTUAL CADA VEZ QUE CAMBIA ---
    useEffect(() => {
        // No hacer nada si aún no tenemos el doc_id
        if (!docId) return;

        const loadPageData = async () => {
            setLoading(true); // O un spinner más sutil para el cambio de página
            try {
                // 1. Obtener token
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");

                // 2. Llamar a /reconstruct con GET para obtener los elementos de la página
                const pageUrl = `${import.meta.env.VITE_API_URL}/api/pdf/reconstruct?doc_id=${docId}&page=${currentPage}`;
                const response = await fetch(pageUrl, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error);

                setPageData(result);
                
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadPageData();
    }, [docId, currentPage]); // Se ejecuta cuando tenemos un docId y cuando cambiamos de página

    // --- LÓGICA DE ACCIONES ---
    const handleElementUpdate = (elementId, newContent) => {
        // Actualiza el contenido de un elemento de texto en el estado 'pageData'
        setPageData(currentData => {
            const newElements = currentData.elements.map(el => 
                el.id === elementId ? { ...el, content: newContent } : el
            );
            return { ...currentData, elements: newElements };
        });
    };
    
    const handleImageReplace = (imageId) => {
        // Abre el modal de la galería para reemplazar una imagen
        setTargetImageId(imageId);
        setIsGalleryOpen(true);
    };

    const handleImageSelectFromGallery = (newImageUrl) => {
        // Cuando se elige una imagen de la galería, actualiza el elemento
        // Aquí, en lugar de base64, ¡simplemente cambiamos la URL!
        setPageData(currentData => {
            const newElements = currentData.elements.map(el => 
                el.id === targetImageId ? { ...el, new_url: newImageUrl } : el
            );
            return { ...currentData, elements: newElements };
        });
        setIsGalleryOpen(false);
    };

    // --- RENDERIZADO ---
    if (loading && !pageData) return <CircularProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!pageData) return null; // Aún no se ha cargado nada

    return (
        <Box>
            {/* Aquí podrías tener una barra de herramientas */}
            
            <PageRenderer 
                pageData={pageData}
                onElementSelect={handleSelectAndNavigate} // <-- ¡Conectamos la nueva función!
            />
            
            
            {/* Controles de paginación */}
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                <Button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
                <Typography sx={{ mx: 2 }}>Página {currentPage} de {totalPages}</Typography>
                <Button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</Button>
            </Box>

            <GalleryModal 
                open={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onImageSelect={handleImageSelectFromGallery}
            />
        </Box>
    );
}
