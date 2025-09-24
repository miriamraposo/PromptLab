import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Paper, Typography, Divider, Button, Stack, CircularProgress,  Grid ,Dialog, DialogTitle, IconButton, Tooltip, DialogContent, DialogContentText, DialogActions } from '@mui/material'; // <-- MODIFICA ESTA LÍNEA
import FactCheckIcon from '@mui/icons-material/FactCheck'; 
import EditIcon from '@mui/icons-material/Edit';
import GrainIcon from '@mui/icons-material/Grain';
import DeleteIcon from '@mui/icons-material/Delete';
import AnalyticsIcon from '@mui/icons-material/Analytics'; 
import AdsClickIcon from '@mui/icons-material/AdsClick';
import { supabase } from '../../supabaseClient';
import OnlinePredictionIcon from '@mui/icons-material/OnlinePrediction';
import RefreshIcon from '@mui/icons-material/Refresh'; 
import { useQualityCheck } from "../../hooks/useQualityCheck"; 
import ScienceIcon from '@mui/icons-material/Science';
import TableViewIcon from '@mui/icons-material/TableView';
import TextFieldsIcon from '@mui/icons-material/TextFields';





// Componente MetadataDisplay (sin cambios)
function MetadataDisplay({ type, metadata }) {
    if (!metadata || Object.keys(metadata).length === 0) {
        return <Typography variant="body2" color="inherit">No hay datos detallados para este archivo.</Typography>;
    }
    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };
    const renderDetail = (label, value) => (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" color="inherit">{label}:</Typography>
            <Typography variant="body2" fontWeight="500" sx={{ textAlign: 'right' }}>{value ?? 'N/A'}</Typography>
        </Box>
    );
    switch (type?.toLowerCase()) {
        case 'tabular':
        case 'csv':
        case 'xlsx':
        case 'parquet':
        case 'vision_analysis': // <-- ¡AÑADIDO!
            return (
                <>
                    {renderDetail("Filas", metadata.rows)}
                    {renderDetail("Columnas", metadata.columns)}
                    {renderDetail("Tamaño", formatSize(metadata.sizeBytes))}
                </>
            );
        case 'text':
        case 'pdf':
        case 'docx':
        case 'md':
             return (
                <>
                    {renderDetail("Caracteres", metadata.length)}
                    {renderDetail("Tamaño", formatSize(metadata.sizeBytes))}
                </>
            );
        default:
            return <>{renderDetail("Tamaño", formatSize(metadata.sizeBytes))}</>;
    }
}
MetadataDisplay.propTypes = { type: PropTypes.string, metadata: PropTypes.object };


export default function DatasetPropertiesPanel({ dataset, onRename, onDelete, onRefresh}) {
    const [parsedMetadata, setParsedMetadata] = useState(null);
    const navigate = useNavigate();
    const { projectId } = useParams();
    const [isCheckingQuality, setIsCheckingQuality] = useState(false);
    const { isChecking, qualityResult, runQualityCheck, resetQualityResult } = useQualityCheck();
    const TABULAR_TYPES = ['tabular', 'csv', 'xlsx', 'parquet'];
    const isTabular = TABULAR_TYPES.includes(dataset?.datasetType?.toLowerCase());
    const isVisionAnalysis = dataset?.datasetType?.toLowerCase() === 'vision_analysis';
    const isPdf = dataset?.datasetType?.toLowerCase() === 'pdf';


    const handleCheck = () => {
        runQualityCheck(dataset?.datasetId);
    };

    const handleCloseModal = () => {
        resetQualityResult();
    };
    
    
  const handlePdfNavigation = (target) => {
    if (!projectId || !dataset?.datasetId) return;

    const { datasetId, datasetType } = dataset;

    if (target === 'vision_lab') {
    
          const targetUrl = `/project/${projectId}/pdf-extractor/${datasetId}`;
        
        // El resto se queda igual.
        navigate(targetUrl);

    } else if (target === 'document_viewer') {
        const targetPath = `/project/${projectId}/document/${datasetId}`;
        navigate(targetPath, { state: { datasetType: datasetType } });
    }
};

    const navigateToClusteringTabulares = () => {
        if (!projectId || !dataset?.datasetId) {
            console.error("Faltan projectId o datasetId para navegar a clustering.");
            return;
        }
        // Usamos la ruta que definimos en App.jsx
        const targetUrl = `/project/${projectId}/clustering-tabulares/${dataset.datasetId}`;
      
        navigate(targetUrl);
    };

    const handleNavigateToPromptLab = () => {
    if (!dataset?.datasetId || !projectId) return;

    // Simplemente navegamos a la página. PromptLabPage se encargará
    // de llamar al backend para obtener el contenido del archivo.
    navigate(`/project/${projectId}/dataset/${dataset.datasetId}/promptlab`);
};

    const navigateToPredictiveModule = () => {
       if (!projectId || !dataset?.datasetId) return; // chequeo simple
          navigate(`/project/${projectId}/predict/${dataset.datasetId}`);
    };

     const navigateToVisionLab = () => {
    // 1. Verificación inicial (igual que en tu función)
    if (!dataset || !projectId) {
        console.error("Intento de navegación a Vision Lab sin dataset o projectId.");
        return;
    }

    // 2. Desestructuración segura de las propiedades del dataset (igual que en tu función)
    const { datasetId, datasetType } = dataset;

    // 3. Verificaciones de las propiedades extraídas (igual que en tu función)
    if (!datasetId) {
        console.error("Error: No se puede navegar a Vision Lab porque datasetId no está definido.", dataset);
        return;
    }

    if (!datasetType) {
        console.error("Error: No se puede navegar a Vision Lab porque datasetType no está definido.", dataset);
        // Opcional: Notificar al usuario que el tipo de archivo es desconocido.
        alert("El tipo de archivo no está definido, no se puede abrir en Vision Lab.");
        return;
    }

    // 4. Si todas las verificaciones pasan, construimos la URL y navegamos.
    const targetUrl = `/project/${projectId}/vision-lab/${datasetId}?datasetType=${datasetType}`;
    
    
    navigate(targetUrl);
};


    useEffect(() => {
        if (!dataset || !dataset.metadata) {
            setParsedMetadata(null); return;
        }
        if (typeof dataset.metadata === 'string') {
            try { setParsedMetadata(JSON.parse(dataset.metadata)); } 
            catch (e) { console.error("Error parsing metadata JSON:", e); setParsedMetadata(null); }
        } else { setParsedMetadata(dataset.metadata); }
    }, [dataset]);

    const handleNavigateToAnalysis = () => {
        if (!dataset || !projectId) return;

        const { datasetId, datasetType } = dataset; 
    
        if (!datasetId) {
            console.error("Error: datasetId no definido.", dataset);
            return;
        }

        let targetPath = '';

        switch (datasetType?.toLowerCase()) {
            
            case 'tabular':
            case 'csv':
            case 'xlsx':
            case 'parquet':
                targetPath = `/project/${projectId}/dataprep/${datasetId}`;
                break;
           case 'pdf':
           case 'text':
           case 'md':
           case 'docx':
                targetPath = `/project/${projectId}/document/${datasetId}`;
                navigate(targetPath, { state: { datasetType: datasetType } });
                return; // <-- AGREGA ESTA LÍNEA
            // El break ya no es necesario si tienes un return, pero puedes dejarlo.
                break;
            default:
                alert(`El tipo de archivo '${datasetType}' no tiene una vista de análisis definida.`);
                return;
        }
      
        navigate(targetPath);
    };

   
    if (!dataset || Object.keys(dataset).length === 0) {
        return (
            <Paper 
                variant="outlined"
                sx={{
                    height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', p: 1, borderColor: 'primary',
                    backgroundColor: 'transparent',
                }}
            >
                <AdsClickIcon color="primary" sx={{ fontSize: '3rem', mb: 2 }} />
                <Typography variant="h6" color="primary" fontWeight="500">
                    Panel de Detalles
                </Typography>
                <Typography color="primary" textAlign="center" sx={{ maxWidth: '300px', mt: 0.5 }}>
                    Selecciona un archivo para consultar sus propiedades y acciones disponibles.
                </Typography>
            </Paper>
        );
    }
  

    return (
        <Paper variant="outlined" sx={{ height: '100%',  width: '100%',p: 3, display: 'flex', flexDirection: 'column', background: '#002f4b', borderColor: '#2196f3', borderWidth: 1, borderStyle: 'solid' }}>
              <Box
  sx={{
    mb: 1,
    p: 1,
    borderRadius: 1.5,
    background: "linear-gradient(135deg, #26717a, #44a1a0)",
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    borderLeft: '3px solid #26717a',
    display: "flex",
    justifyContent: "center",  // centra horizontalmente
    alignItems: "center"       // centra verticalmente
  }}
>
                <Typography
    variant="subtitle1"
    fontWeight="bold"
    sx={{
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontSize: '0.95rem',
    }}
  >
                  Detalles del Archivo
                </Typography>
              </Box>
                <Box sx={{ p: 1, mt: 1, borderRadius: 1, bgcolor: '#44a1a0', color : '#fff'  }}>
                    <MetadataDisplay type={dataset.datasetType} metadata={parsedMetadata} />
                </Box>
                <Box
  sx={{
    flexShrink: 0,
    pt: 1,
    mt: 1,
    borderRadius: 2,
    p: 0,
  }}
>
  <Divider sx={{ mb: 2 }} />

  <Box
    sx={{
      mb: 1,
      p: 1,
      borderRadius: 1.5,
      background: "linear-gradient(135deg, #26717a, #44a1a0)",
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      borderLeft: '3px solid #26717a',
      display: "flex",
      justifyContent: "center",   // centra horizontalmente
      alignItems: "center",       // centra verticalmente
    }}
  >
    <Typography
      variant="subtitle1"
      fontWeight="bold"
      sx={{
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontSize: '0.95rem',
      }}
    >
      Acciones
    </Typography>
  </Box>
{/* 1. Un ÚNICO Grid container para TODOS los botones.
       El 'spacing' ahora controla el espacio horizontal Y vertical de manera uniforme. */}
<Box sx={{ display: 'flex',borderRadius: 1.5, flexDirection: 'column', gap: 2, p: 2,background: "linear-gradient(135deg, #26717a, #44a1a0)", }}>
 

<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}
>
  {/* ===== FILA 1: Diagnóstico + Procesar & Editar ===== */}
 <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <Button 
      fullWidth
      size="medium"
      variant="contained"
      color="secondary"
      sx={{
        border: "2px solid #ffffff",
        color: "#ffffff",
        backgroundColor: "#031a27ff",
        "& .MuiSvgIcon-root": { color: "#ffffff" },
        "&:hover": { backgroundColor: "#052235", borderColor: "#ffffff" },
        "&.Mui-disabled": {
          backgroundColor: "rgba(0,0,0,0.2)",
          color: "rgba(255,255,255,0.3)",
          borderColor: "rgba(255,255,255,0.3)"
        }
      }}
      startIcon={<FactCheckIcon />}
      onClick={handleCheck}
      disabled={!isTabular}
    >
      Diagnóstico
    </Button>

    <Button 
      fullWidth
      variant="contained"
      size="medium"
      color="secondary"
      sx={{
        border: "2px solid #ffffff",
        color: "#ffffff",
        backgroundColor: "#031a27ff",
        "& .MuiSvgIcon-root": { color: "#ffffff" },
        "&:hover": { backgroundColor: "#052235", borderColor: "#ffffff" },
        "&.Mui-disabled": {
          backgroundColor: "rgba(0,0,0,0.2)",
          color: "rgba(255,255,255,0.3)",
          borderColor: "rgba(255,255,255,0.3)"
        }
      }}
      startIcon={<AnalyticsIcon />}
      onClick={handleNavigateToAnalysis}
      disabled={isVisionAnalysis}
    >
      Procesar & Editar Tabulares o Texto
    </Button>
  </Box>

  {/* ===== FILA 2: Predicciones + Segmentación ===== */}
  <Box sx={{ display: "flex", gap: 2 }}>
    <Button 
      fullWidth 
      size="medium" 
      variant="contained"
      sx={{
        backgroundColor: "#005f73",
        border: "2px solid #ffffff",
        color: "#ffffff",
        "&.Mui-disabled": {
          backgroundColor: "rgba(0,0,0,0.2)",
          color: "rgba(255,255,255,0.3)",
          borderColor: "rgba(255,255,255,0.3)"
        }
      }}
      startIcon={<OnlinePredictionIcon />}
      onClick={navigateToPredictiveModule}
      disabled={!isTabular}
    >
      Predicciones
    </Button>

    <Button
      fullWidth
      size="medium"
      variant="contained"
      sx={{
        backgroundColor: "#005f73",
        border: "2px solid #ffffff",
        color: "#ffffff",
        "&.Mui-disabled": {
          backgroundColor: "rgba(0,0,0,0.2)",
          color: "rgba(255,255,255,0.3)",
          borderColor: "rgba(255,255,255,0.3)"
        }
      }}
      startIcon={<GrainIcon />}
      onClick={navigateToClusteringTabulares}
      disabled={!isTabular}
    >
      Segmentación
    </Button>
  </Box>

  {dataset?.datasetType?.toLowerCase() !== "vision_analysis" && (
  <Button 
    fullWidth 
    size="medium" 
    variant="contained"
    sx={{
      backgroundColor: "#005f73",
      border: "2px solid #ffffff",
      color: "#ffffff",
      "&:hover": { backgroundColor: "#013845" }
    }}
    startIcon={<ScienceIcon />}
    onClick={handleNavigateToPromptLab}
  >
    PromptLab
  </Button>
  )}

  

{/* Condición: Solo muestra esta fila si el dataset es de tipo 'pdf' */}
{dataset?.datasetType?.toLowerCase() === 'pdf' && (
    <Box sx={{ display: "flex", gap: 2}}>

        {/* Botón 1: ANÁLISIS (PDF Extractor) */}
        <Tooltip title="Extraer datos estructurados. Ideal para facturas y tablas en PDFs.">
            <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<TableViewIcon />}
                onClick={() => {
                    if (!dataset?.datasetId) return;
                    navigate(`/project/${projectId}/pdf-extractor/${dataset.datasetId}`);
                }}
            >
                Análisis (PDF)
            </Button>
        </Tooltip>
     </Box>
)}


  {/* ===== FILA 5: Vision Analysis (si aplica) ===== */}
  {dataset?.datasetType?.toLowerCase() === "vision_analysis" && (
    <Box sx={{ mt: 3 }}>
      <Button
        fullWidth
        size="medium"
        variant="contained"
        sx={{
          border: "2px solid #ffffff",
          color: "#ffffff",
          backgroundColor: "#2e7d32",
          "& .MuiSvgIcon-root": { color: "#ffffff" },
          "&:hover": { backgroundColor: "#1b5e20", borderColor: "#ffffff" },
        }}
        startIcon={<ScienceIcon />}
        onClick={navigateToVisionLab}
      >
        VisiónLab
      </Button>
    </Box>
  )}
</Box>


  {/* Botones 5 y 6 en fila */}
  <Box sx={{ display: 'flex', gap: 2 }}>
    <Button 
    
            sx={{
              border: "2px solid #ffffff",
              color: "#ffffff",
              "& .MuiSvgIcon-root": { color: "#ffffff" },
              "&:hover": {
                backgroundColor: " #26717a",
                borderColor: "#ffffff",
              },
            }}
      fullWidth 
      size="medium" 
      variant="outlined" 
      startIcon={<EditIcon />}
      onClick={onRename}
    >
      Renombrar
    </Button>
    <Button 
      fullWidth 
      size="medium" 
      variant="outlined" 
       color="secondary"
            sx={{
              border: "2px solid #ffffff",
              color: "#ffffff",
              "& .MuiSvgIcon-root": { color: "#ffffff" },
              "&:hover": {
                backgroundColor: " #26717a",
                borderColor: "#ffffff",
              },
            }}
      startIcon={<DeleteIcon />}
      onClick={onDelete}
    >
      Eliminar
    </Button>
  </Box>
</Box>

            </Box>

             {/* --- INICIO: PEGAR ESTE BLOQUE JSX AL FINAL --- */}
               <Dialog open={!!qualityResult} onClose={handleCloseModal}>
                <DialogTitle>Resultado del Diagnóstico</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {qualityResult?.success ?
                            "¡Excelente! El dataset cumple con los criterios de calidad necesarios para continuar con el análisis." :
                            `${qualityResult?.message || "Recomendamos limpiarlo antes de continuar."}`
                        }
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Cerrar</Button>
                    {qualityResult?.success ? (
                        <Button onClick={navigateToPredictiveModule} variant="contained">
                            Ir al Módulo Predictivo
                        </Button>
                    ) : (
                        <Button onClick={handleNavigateToAnalysis} variant="contained">
                            Ir a Analizar y Procesar Archivo
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
            {/* --- FIN: PEGAR ESTE BLOQUE JSX AL FINAL --- */}
        </Paper>
    );
}

DatasetPropertiesPanel.propTypes = {
    dataset: PropTypes.shape({
        datasetId: PropTypes.string,
        datasetName: PropTypes.string,
        datasetType: PropTypes.string,
        metadata: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    }),
    onRename: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onRefresh: PropTypes.func,
};