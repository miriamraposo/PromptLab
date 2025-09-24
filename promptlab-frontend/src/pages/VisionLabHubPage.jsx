// En src/pages/VisionLabHubPage.jsx

import React, { useState, useEffect, useMemo } from 'react'; 
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'; 
import { Box, Typography, Paper, Grid, Button, Icon, Skeleton } from '@mui/material';

// Importa los iconos que vamos a usar
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GroupsIcon from '@mui/icons-material/Groups'; // Icono para Clustering
import RuleIcon from '@mui/icons-material/Rule'; // Icono para Evaluación
import ScienceIcon from '@mui/icons-material/Science'; // Icono para Predicción
import { supabase } from '../supabaseClient'; // Necesitamos esto para la lógica del modelo real

// --- Componente Reutilizable para las Tarjetas de Acción ---
const ActionCard = ({ icon, title, description, buttonText, onClick, disabled = false }) => (
     <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <Paper 
            elevation={3}
            sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6
                }
            }}
        >
            <Box sx={{ flexGrow: 1, mb: 3 }}>
  <Typography 
    variant="body2" 
    color="text.secondary" 
    sx={{ whiteSpace: "pre-line" }}
  >
    {description}
  </Typography>
</Box>
            <Button 
                variant="contained" 
                onClick={onClick}
                disabled={disabled}
                sx={{ mt: 'auto' }} // Alinea el botón abajo
            >
                {buttonText}
            </Button>
        </Paper>
    </Grid>
);

// --- Componente Principal de la Página ---
export default function VisionLabHubPage() {
    const { projectId, datasetId } = useParams();
    
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [dataset, setDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    // Leemos el ID del clustering de la URL. Si no hay, será 'null'.
    const clusterResultId = searchParams.get('clusterResultId');

    // para poder mostrar su nombre en la cabecera.
    useEffect(() => {
        const fetchDatasetDetails = async () => {
            setLoading(true);
            
            try {
               
             
               
                await new Promise(resolve => setTimeout(resolve, 500)); 
                setDataset({ id: datasetId, name: `Análisis de Imágenes (${datasetId.substring(0, 8)}...)` });
             

            } catch (error) {
                console.error("Error al cargar los detalles del dataset:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDatasetDetails();
    }, [datasetId]);

    // --- Lógica de Navegación ---
    const handleNavigation = (path, isExternalModule = false) => {
    if (isExternalModule) {
        // Para el botón que necesita ir a un módulo diferente y pasar el ID como parámetro
        navigate(`${path}?datasetId=${datasetId}`);
    } else {
        // Para los botones de Etiquetado y Clustering que usan rutas completas
        navigate(path);
    }
};
    
    const actionCardsData = useMemo(() => {
        // Creamos la ruta base para el explorador
        let explorerPath = `/project/${projectId}/vision-lab/${datasetId}/explorer`;

        // Si hemos recibido un modelo de clustering...
        if (clusterResultId) {
            // ...le añadimos el ID a la ruta del explorador.
            explorerPath += `?clusterResultId=${clusterResultId}`;
        }

        return [
            {
                icon: <GroupsIcon sx={{ fontSize: 40 }} />,
                title: "Opción A: Agrupamiento Automático (Clustering)",
                description: "Usa esta opción si tus imágenes NO tienen etiquetas. La IA encontrará patrones y agrupará las imágenes similares automáticamente.",
                buttonText: "Iniciar un Nuevo Clustering",
                onClick: () => navigate(`/project/${projectId}/vision-lab/${datasetId}/clustering`),
            },
            {
                icon: <ImageSearchIcon sx={{ fontSize: 40 }} />,
                title: "Opción B: Etiquetado Manual y Entrenamiento",
                description: "Usa esta opción para visualizar tus imágenes o los grupos de un clustering guardado, asignarles etiquetas y entrenar un modelo.",
                buttonText: "Ir al Etiquetado / Entrenamiento",
                // ¡El onClick ahora usa la ruta dinámica que construimos!
                onClick: () => navigate(explorerPath),
            },
        ];
    // Las dependencias aseguran que esto se recalcule si cambia algún ID
    }, [projectId, datasetId, clusterResultId, navigate]);


    return (
    // Contenedor principal de la página, ocupa todo el espacio
     <Box sx={{ p: 2, flexGrow: 1, mt: "72px" }}>
        
        {/* --- CABECERA (Inspirada en tu otro diseño) --- */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            background: "linear-gradient(135deg, #26717a, #44a1a0)",
            borderRadius: 2,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            mb: 4, // Margen inferior para separar de las tarjetas
            color: '#ffffff'
          }}
        >
          <Box>
              <Typography variant="h5" fontWeight="bold">
                Laboratorio de Visión
              </Typography>
              {loading ? (
                    <Skeleton width="250px" sx={{ bgcolor: 'grey.700' }} />
                ) : (
                    <Typography variant="body1">
                        Dataset: <strong>{dataset?.name || datasetId}</strong>
                    </Typography>
              )}
          </Box>
        </Box>

        {/* --- GRID DE TARJETAS (Ahora centrado y responsivo) --- */}
        <Grid container spacing={6} justifyContent="center">
            {actionCardsData.map((card, index) => (
                <ActionCard
                    key={index}
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                    buttonText={card.buttonText}
                    onClick={card.onClick}
                    disabled={card.disabled}
                />
            ))}
        </Grid>
    </Box>
);
}
