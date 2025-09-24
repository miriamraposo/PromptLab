// src/pages/WorkspacePage.jsx (VERSIÓN FINAL, LIMPIA Y CORRECTA)
  
  import React, { useState, useEffect, useCallback} from 'react';
  
  import { Box, CircularProgress, Alert, Typography, Button, Paper } from '@mui/material';
  import AddIcon from '@mui/icons-material/Add';
  import { supabase } from '../supabaseClient';
  
  import DatasetList from '../components/dashboard/DatasetList';
  import DatasetPropertiesPanel from '../components/dashboard/DatasetPropertiesPanel';
  import RenameDatasetModal from '../components/dashboard/RenameDatasetModal';
  import ConfirmDeleteDatasetModal from '../components/dashboard/ConfirmDeleteDatasetModal';
  import UploadDatasetModal from '../components/dashboard/UploadDatasetModal';
  import { useParams, useNavigate } from 'react-router-dom';
  import { PaginaConAsistente } from '../layouts/PaginaConAsistente';
  import ImageIcon from '@mui/icons-material/Image'; 
  import UploadImagesModal from '../components/dashboard/UploadImagesModal'; 
  import { useTheme } from '@mui/material/styles';

  export default function WorkspacePage() {
      const { projectId } = useParams();
      const navigate = useNavigate();
      const theme = useTheme()
      // --- Estados ---
     
      const [project, setProject] = useState(null);
      const [datasets, setDatasets] = useState([]);
      const [activeDataset, setActiveDataset] = useState(null);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);
      const [isUploadModalOpen, setUploadModalOpen] = useState(false);
      const [isRenameModalOpen, setRenameModalOpen] = useState(false);
      const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
      const [isUploadImagesModalOpen, setUploadImagesModalOpen] = useState(false);
      const [isLoading, setIsLoading] = useState(true);


      const authenticatedFetchWithRetries = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      // Intenta hacer la petición
      const response = await authenticatedFetch(url);
      // Si tiene éxito, devuelve el resultado
      return response;
    } catch (error) {
      console.warn(`Intento ${i + 1} de fetch falló para ${url}. Error: ${error.message}`);
      // Si es el último intento, lanza el error para que se muestre al usuario
      if (i === retries - 1) {
        throw error;
      }
      // Espera 2 segundos antes de reintentar
      await new Promise(res => setTimeout(res, 2000));
    }
  }
};

// Luego, en tu useEffect, usa esta nueva función
  const fetchProjectData = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            // Tu función authenticatedFetchWithRetries es genial, la mantenemos
            const [projectResult, datasetsResult] = await Promise.all([
                authenticatedFetchWithRetries(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`),
                authenticatedFetchWithRetries(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/datasets`)
            ]);
            
            if (!projectResult.success) throw new Error(projectResult.error || 'Proyecto no encontrado.');
            
            const newDatasets = datasetsResult.success ? (datasetsResult.data || []) : [];
            setProject(projectResult.data);
            setDatasets(newDatasets);
            setActiveDataset(null);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [projectId]); // La función se "reconstruirá" solo si projectId cambia

    // --- PASO 2: El useEffect ahora es mucho más simple. Solo llama a la función ---
    useEffect(() => {
        fetchProjectData();
    }, [fetchProjectData]); // Se ejecuta al cargar la página y si fetchProjectData cambia

    // --- PASO 3: handleUploadComplete ahora puede llamar a la función que SÍ existe ---
    const handleUploadComplete = () => {
        
        // Ahora esto funciona porque fetchProjectData existe en el scope del componente
        fetchProjectData(); 
    };
  
      // --- Handlers de acciones (simplificados) ---
      const refreshData = fetchProjectData; 
      const handleRename = () => setRenameModalOpen(true);
      const handleDelete = () => setDeleteModalOpen(true);
      const handleSelectDataset = (dataset) => {
      // La única responsabilidad de esta función es actualizar el dataset activo.
      setActiveDataset(dataset);
  };
  
      const renameDatasetConfirmed = async (newName) => {
      if (!activeDataset || !projectId) return;
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/datasets/${activeDataset.datasetId}`, {
              method: 'PATCH',
              headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ dataset_name: newName })
          });
  
          const result = await response.json();
  
          if (!result.success) {
              throw new Error(result.error || "Falló la actualización en el servidor.");
          }
  
          // --- ¡LA MAGIA OCURRE AQUÍ! ---
          // Actualiza el estado local sin recargar la página
          const updatedDataset = result.data; // El dataset con el nombre ya cambiado
          setDatasets(currentDatasets => 
              currentDatasets.map(d => 
                  d.datasetId === updatedDataset.datasetId ? updatedDataset : d
              )
          );
          setActiveDataset(updatedDataset); // Actualiza el dataset activo
          setRenameModalOpen(false); // Cierra el modal
  
      } catch (error) {
          console.error("Error al renombrar:", error);
          // Aquí podrías mostrar una notificación de error al usuario
      }
  };
  
  
      const deleteDatasetConfirmed = async () => {
      if (!activeDataset || !projectId) return;
  
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/datasets/${activeDataset.datasetId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
  
          // 1. Verificamos que el backend respondió correctamente
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Falló la eliminación en el servidor.");
          }
  
          // --- 2. ¡LA MAGIA OCURRE AQUÍ! ---
          // Guardamos el ID del dataset que vamos a borrar
          const deletedDatasetId = activeDataset.datasetId;
  
          // Actualizamos la lista de datasets, quitando el que fue eliminado
          setDatasets(currentDatasets =>
              currentDatasets.filter(d => d.datasetId !== deletedDatasetId)
          );
  
          // Limpiamos el dataset activo, porque ya no existe.
          // Esto hará que el panel de propiedades muestre el mensaje de "Selecciona un archivo".
          setActiveDataset(null);
  
          // 3. Cerramos el modal de confirmación
          setDeleteModalOpen(false);
  
          // NO MÁS REFRESH! La página se actualiza sola gracias a React.
  
      } catch (error) {
          console.error("Error al eliminar:", error);
          // Opcional: mostrar un alert o una notificación al usuario
          alert(`Error al eliminar el archivo: ${error.message}`);
      }
  };
    
    const authenticatedFetch = async (url) => {
    // 1. Obtiene la sesión FRESCA justo antes de la llamada
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
        throw new Error(sessionError?.message || "Sesión no válida o expirada.");
    }
    
    // 2. Realiza el fetch con el token fresco
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    // 3. Maneja errores de red y devuelve la respuesta
    if (!response.ok) {
        // Intenta obtener un mensaje de error más detallado del backend
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorBody.error || `Error en la petición: ${response.statusText}`);
    }
    
    return response.json(); // Devuelve los datos ya parseados como JSON
};
     

  if (loading) {
  return (
    <PaginaConAsistente nombreModulo="general">
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          // Ajustamos la altura para que ocupe el espacio dentro de tu layout
          height: 'calc(100vh - 60px - 24px)', // 60px del header, 24px de padding aprox.
          width: '100%' 
        }}
      >
        <CircularProgress size={60} />
        <Typography sx={{ mt: 2 }}>
          Cargando datos del proyecto...
        </Typography>
      </Box>
    </PaginaConAsistente>
  );
}

if (error) {
  return (
    <PaginaConAsistente nombreModulo="general">
      <Box sx={{ p: 4, height: 'calc(100vh - 60px - 24px)' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    </PaginaConAsistente>
  );
}
        
        
  return (
         <PaginaConAsistente nombreModulo="general">
          <Box sx={{ height: '100vh', boxSizing: 'border-box', display: 'flex',  backgroundColor: theme.palette.mode === 'dark' ? '#393b3dff' : 'primary',
           flexDirection: 'column', pt: `calc(60px + 0px)`, px: 2, pb: 3, }}>
              {/* Encabezado */}
          <Box
  sx={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',          // centra verticalmente
    px: 4,                          // padding horizontal más compacto
    py: 2,                          // padding vertical más compacto
    background: "linear-gradient(135deg, #26717a, #44a1a0)",
    borderRadius: 2,                // bordes redondeados
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)', // sombra ligera
    mb: 1,                          // margen inferior para separar del contenido
    flexWrap: 'wrap',               // para que sea responsivo
    gap: 2,                         // espacio entre elementos si se apilan
  }}
>
  {/* Título */}
  <Typography
    variant="h6"
    fontWeight="bold"
    color="#ffffff"
  >
    Proyecto: {project?.projectName || '...'}
  </Typography>

  {/* Botones de acción */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <Button
      variant="contained"
      startIcon={<ImageIcon />}
      size="medium"
      onClick={() => setUploadImagesModalOpen(true)}
     sx={{
        background: 'linear-gradient(180deg, #002f4b, #005f73)',
        borderColor: '#00e5ff',
        color: "#fff",
        '&:hover': {
          borderColor: '#00e5ff',
          backgroundColor: 'rgba(0,229,255,0.1)',
        },
      }}
    >
      Crear desde Imágenes
    </Button>

    <Button
      variant="contained"
      startIcon={<AddIcon />}
      size="medium"
      onClick={() => setUploadModalOpen(true)}
      sx={{
        background: 'linear-gradient(180deg, #002f4b, #005f73)',
        borderColor: '#00e5ff',
        color: "#fff",
        '&:hover': {
          borderColor: '#00e5ff',
          backgroundColor: 'rgba(0,229,255,0.1)',
        },
      }}
    >
      Importar archivos
    </Button>
  </Box>
</Box>
              {/* Layout */}
              <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden', }}>
                    <Box sx={{ flex: '2 1 0', minWidth: 0, height: '100%' }}>
                    <DatasetList datasets={datasets} activeDataset={activeDataset} onSelectDataset={handleSelectDataset} />
                  </Box>
                   <Box 
                        sx={{
                       flex: '1 1 0',
                       minWidth: 0,
                       height: '100%',
                       background: 'linear-gradient(180deg, #002f4b 0%, #004d66 100%)',
                       color: '#ffffff',           // texto blanco para contraste
                                      // padding interno
                       borderRadius: 2,   
                       border: '2px solid #ffffff',         // opcional, bordes suaves
                       overflowY: 'auto',          // scroll si hay mucho contenido
                       display: 'flex',          // 👈 importante
                       flexDirection: 'column', 
                       }}
                       >
                      <DatasetPropertiesPanel dataset={activeDataset} onRename={handleRename} onDelete={handleDelete} onRefresh={refreshData} />
                  </Box>
              </Box>
  
              {/* Modales */}
              <UploadDatasetModal open={isUploadModalOpen} onClose={() => setUploadModalOpen(false)}  onDatasetUploaded={refreshData} projectId={projectId} />
              {activeDataset && (
                  <>
                      <RenameDatasetModal open={isRenameModalOpen} onClose={() => setRenameModalOpen(false)} onRenameConfirmed={renameDatasetConfirmed} dataset={activeDataset} />
                      <ConfirmDeleteDatasetModal open={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} onDeleteConfirmed={deleteDatasetConfirmed} dataset={activeDataset} />
                  </>
                  
              )}
              <UploadImagesModal 
                open={isUploadImagesModalOpen} 
                onClose={() => setUploadImagesModalOpen(false)} 
                projectId={projectId} 
                  onUploadComplete={handleUploadComplete}
                />
               </Box>
               </PaginaConAsistente>
      );
  }
  