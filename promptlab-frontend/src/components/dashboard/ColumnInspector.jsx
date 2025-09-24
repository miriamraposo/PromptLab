
// src/components/ColumnInspector.jsx (VERSIÓN FINAL CON UI DE DIAGNÓSTICO)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Stack,
} from '@mui/material';
import { Tooltip, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { supabase } from '../../supabaseClient';
import { FixedSizeList as List } from 'react-window';

// Componentes personalizados
import UniqueValuesModal from './UniqueValuesModal'; 
import StatisticsModal from './StatisticsModal';
import NumericCleaner from './NumericCleaner';
import CategoricalCleaner from './CategoricalCleaner';
import DateTimeCleaner from './DateTimeCleaner';
import ColumnVisualizer from './ColumnVisualizer'; 


// Iconos
import TagIcon from '@mui/icons-material/Tag';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import EventIcon from '@mui/icons-material/Event';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import FlareIcon from '@mui/icons-material/Flare';
import ScienceIcon from '@mui/icons-material/Science';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'; // Icono para editar

// Pequeño componente de ayuda para no repetir código
const StatItem = ({ label, value }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
        <Typography variant="body2" color="text.secondary">{label}:</Typography>
        <Typography variant="body2" fontWeight="bold">{String(value)}</Typography>
    </Box>
);

// --- FUNCIÓN DE AYUDA MODIFICADA ---
const generateStatsPreview = (analysis_type, statistics, advanced_analysis) => {
    // Si no hay datos, devuelve un array vacío
    if (!statistics || Object.keys(statistics).length === 0) {
        return [];
    }

    const preview = [];

    // --- Si es una columna NUMÉRICA ---
    if (analysis_type === 'numeric') {
        // (La lógica para numéricas se queda como estaba)
        if (statistics.skew !== undefined) {
            let skew_label = "Simétrica";
            if (statistics.skew > 1) skew_label = "Asimétrica positiva";
            if (statistics.skew < -1) skew_label = "Asimétrica negativa";
            preview.push({ label: "Distribución", value: skew_label });
        }
        if (statistics.std !== undefined && statistics.mean !== undefined && statistics.mean !== 0) {
            const coeff_variation = (statistics.std / Math.abs(statistics.mean)) * 100;
            let dispersion_label = "Baja";
            if (coeff_variation > 30) dispersion_label = "Moderada";
            if (coeff_variation > 60) dispersion_label = "Alta";
            preview.push({ label: "Dispersión de Datos", value: dispersion_label });
        }
    }
    
    // --- Si es una columna CATEGÓRICA (LÓGICA MEJORADA) ---
    if (analysis_type === 'categorical') {
        // 1. Interpretación de la Dominancia (como ya la tenías)
        if (statistics.count > 0 && statistics.freq) {
            const dominance = ((statistics.freq / statistics.count) * 100);
            let dominance_label = "Baja";
            if (dominance > 50) dominance_label = "Moderada";
            if (dominance > 80) dominance_label = "Alta (Desbalance)";
            preview.push({ label: "Dominancia del Top 1", value: `${dominance.toFixed(1)}% (${dominance_label})` });
        }

        // 2. ¡NUEVA INTERPRETACIÓN DE VALORES POCO FRECUENTES!
        // Usamos los datos de advanced_analysis que ya recibimos
        if (advanced_analysis && advanced_analysis.rare_values_count !== undefined && statistics.unique > 0) {
            const rare_percentage = ((advanced_analysis.rare_values_count / statistics.unique) * 100);
            let rare_label = "Bajo";
            if (rare_percentage > 60) {rare_label = "Alto (Cola Larga)";
            } else if (rare_percentage > 30) {rare_label = "Moderado";
            }
             preview.push({ label: "Valores Poco Frecuentes", value: `${advanced_analysis.rare_values_count} (${rare_label})` });
        }
    }

    return preview.slice(0, 3); // Devolvemos las interpretaciones más importantes
};

  export default function ColumnInspector({ columnName, onApplyAction,initialData = null, onEditAsText }) {
    
    // --- HOOKS Y ESTADOS --- (Esto se queda igual)
    const { datasetId, projectId } = useParams(); // <--projectId ahora se obtiene aquí
    const navigate = useNavigate(); // <-- useNavigate ahora se llama aquí
    
    const [inspectorState, setInspectorState] = useState({ loading: true, error: null, data: null });
    const [activeTab, setActiveTab] = useState(0);
    const [isUniqueValuesExpanded, setUniqueValuesExpanded] = useState(false);
    const [isOutliersExpanded, setOutliersExpanded] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isStatsModalOpen, setStatsModalOpen] = useState(false);
   
    const [isLoadingLab, setIsLoadingLab] = useState(false);

    // --- FUNCIONES DEL COMPONENTE ---
    // <-- La función se declara ahora aquí, en el nivel superior.
    const handleUseColumnInLab = async () => {
        if (!columnName) return;

        setIsLoadingLab(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/column/${encodeURIComponent(columnName)}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || "No se pudo obtener el contenido de la columna.");
            }

            navigate(`/project/${projectId}/dataset/${datasetId}/promptlab`, {
                state: { context: result.textContent }
            });

        } catch (error) {
            // showNotification(`Error: ${error.message}`, 'error');
            console.error("Error al preparar la columna para el laboratorio:", error);
        } finally {
            setIsLoadingLab(false);
        }
    };

    useEffect(() => {
        // 1. MUEVE LA FUNCIÓN DE FETCH AQUÍ ARRIBA
        //    (Le cambiamos el nombre porque ya no hace polling)
        const fetchColumnDetails = async () => {
            setInspectorState({ loading: true, error: null, data: null });
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");
                
                const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/column-details?column=${encodeURIComponent(columnName)}`;
                const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
                const result = await response.json();
                
                if (!response.ok || !result.success) {
                    throw new Error(result.error || `Error del servidor (${response.status})`);
                }

                // Simplemente actualizamos el estado con los datos recibidos.
                setInspectorState({ loading: false, error: null, data: result.data });
            
            } catch (err) {
                setInspectorState({ loading: false, error: err.message, data: null });
            }
        };

        // 2. LÓGICA DE DECISIÓN CLARA Y SIMPLE

        // CASO A: El padre nos da los datos directamente (después de una limpieza).
        if (initialData) {
          
            setInspectorState({ loading: false, error: null, data: initialData });
            setActiveTab(0); // Reseteamos la pestaña
            return; // ¡Importante! Salimos para no hacer fetch.
        }
        
        // CASO B: No tenemos datos del padre, así que buscamos por nuestra cuenta.
        if (columnName) {
          
            setActiveTab(0); // Reseteamos la pestaña
            fetchColumnDetails(); // Llamamos a nuestra función de fetch simple.
        } else {
            // CASO C: No hay columna seleccionada.
            setInspectorState({ loading: false, error: null, data: null });
        }

    }, [columnName, datasetId, initialData]); 
    

    // --- LÓGICA DE RENDERIZADO ---
    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    if (!columnName) {
        return (
            <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Typography color="text.secondary">Selecciona una columna para ver sus detalles.</Typography>
                
            </Paper>
        );
    }

    if (inspectorState.loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    if (inspectorState.error) return <Alert severity="error">Error: {inspectorState.error}</Alert>;
    if (!inspectorState.data) return <Typography sx={{p: 2}}>No hay datos de inspección disponibles.</Typography>;

    // LÍNEA CORREGIDA Y SEGURA
   
        const { 
        analysis_type, 
        detected_type,
        statistics = {}, 
        outliers = {},
        null_count = 0 
    } = inspectorState.data;

    // Asignación segura para las claves que pueden no existir
    const advanced_analysis = inspectorState.data.advanced_analysis || {};
    const unique_values = inspectorState.data.unique_values || [];
    // 'total_unique_count' no parece usarse, pero lo dejamos por si acaso
    const total_unique_count = inspectorState.data.total_unique_count || 0;

    // --- EL RESTO DE TU LÓGICA ANTES DEL RETURN ---
    const numericColumns = inspectorState.data?.numeric_columns || [];
    const statsPreview = generateStatsPreview(analysis_type, statistics, advanced_analysis);
    const outlierTooltipText = "Los outliers se calculan dinámicamente. Al limpiar outliers, la distribución de los datos cambia, lo que puede hacer que nuevos valores se consideren outliers.\nPuede repetir la operación si es necesario.";

        
    return (
          <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
           {/* === INICIO DEL NUEVO ENCABEZADO ENRIQUECIDO === */}
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}> {/* <--- CAMBIO: Aumentado el margen inferior (mb) para más aire */}
           {/* Icono dinámico según el tipo de dato */}
           <Paper
               variant="outlined"
               sx={{
               p: 0.5,
               borderRadius: '50%',
               backgroundColor: 'action.hover',
               display: 'inline-flex'
            }}
            >
              {analysis_type === 'numeric' && <TagIcon color="primary" />}
              {analysis_type === 'categorical' && <TextFieldsIcon color="secondary" />}
              {analysis_type === 'datetime' && <EventIcon color="success" />} 
            </Paper>
  
          
        {/* Título y subtítulo */}
        <Box>
          <Typography variant="h6" component="h4" fontWeight="bold">
            {columnName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            Columna de tipo: {analysis_type}
          </Typography>
        </Box>
      </Box>
  
      {/* Estadísticas clave de un vistazo */}
      <Paper variant="outlined" sx={{ display: 'flex', justifyContent: 'space-around', p: 1, mb: 1, backgroundColor: 'action.hover' }}> {/* <--- CAMBIO: Aumentado padding (p) y margen inferior (mb) */}
  
        {/* ---> AÑADE ESTE NUEVO BLOQUE <--- */}
      {analysis_type === 'datetime' && (
          <Box textAlign="center">
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <WarningIcon fontSize="small" sx={{ mr: 0.5, color: null_count > 0 ? 'warning.main' : 'inherit' }} />
                  Valores Nulos
              </Typography>
              <Typography fontWeight="bold" color={null_count > 0 ? 'warning.main' : 'inherit'}>
                  {null_count}
              </Typography>
          </Box>
      )}
      {/* ---> FIN DEL BLOQUE AÑADIDO <--- */}
        
      {analysis_type === 'numeric' && statistics && (
          <>
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon fontSize="small" sx={{ mr: 0.5, color: inspectorState.data.null_count > 0 ? 'warning.main' : 'inherit' }} />
                Valores Nulos
              </Typography>
              <Typography fontWeight="bold" color={null_count > 0 ? 'warning.main' : 'inherit'}>
                {null_count}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <FlareIcon fontSize="small" sx={{ mr: 0.5, color: outliers?.count > 0 ? 'error.main' : 'inherit' }} />
                Outliers (IQR)
                  <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{outlierTooltipText}</span>}>
                    <IconButton size="small" sx={{ ml: 0.5 }}>
                    <InfoIcon fontSize="inherit" />
                   </IconButton>
                 </Tooltip>
              </Typography>
              <Typography fontWeight="bold" color={outliers?.count > 0 ? 'error.main' : 'inherit'}>
                {outliers?.count || 0}
              </Typography>
            </Box>
          </>
        )}
        {analysis_type === 'categorical' && statistics && (
          <>
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon fontSize="small" sx={{ mr: 0.5, color: inspectorState.data.null_count > 0 ? 'warning.main' : 'inherit' }} />
                Valores Nulos
              </Typography>
              <Typography fontWeight="bold" color={inspectorState.data.null_count > 0 ? 'warning.main' : 'inherit'}>
                {inspectorState.data.null_count || 0}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">Valores Únicos</Typography>
              <Typography fontWeight="bold">{statistics.unique || 'N/A'}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">Dominancia Top</Typography>
              <Typography
                fontWeight="bold"
                color={statistics.freq / statistics.count > 0.7 ? 'warning.main' : 'inherit'}
              >
                {statistics.count > 0
                  ? `${((statistics.freq / statistics.count) * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </Typography>
            </Box>
          </>
        )}
      </Paper>
  
      <Box sx={{ borderBottom: 1.5, borderColor: 'divider',mt:1 }}>
       <Tabs value={activeTab} onChange={handleTabChange} aria-label="inspector tabs">
    <Tab 
        label="Diagnóstico" 
        sx={{
            // Estilo cuando la pestaña NO está seleccionada
            color: 'text.secondary', // Un gris sutil para las inactivas
            fontWeight: 'normal',
             fontSize: '0.9rem',
            // Estilo cuando el ratón pasa por encima (sea activa o no)
            '&:hover': {
                color: 'primary.main', // Se pone azul al pasar el ratón
                opacity: 0.9
            },

            // --- ¡LA MAGIA! Estilo cuando la pestaña ESTÁ seleccionada ---
            '&.Mui-selected': {
                color: 'primary.main', // Usa el azul fuerte del tema
                fontWeight: 'bold'   // La ponemos en negrita para que destaque más
            }
        }} 
    />
    <Tab 
        label="Procesamiento" 
        sx={{
            color: 'text.secondary',
            fontSize: '0.9rem',
            fontWeight: 'normal',
            '&:hover': {
                color: 'primary.main',
                opacity: 0.9
            },
            '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 'bold'
            }
        }} 
    />
    <Tab 
        label="Visualizaciones" 
        sx={{
            color: 'text.secondary',
             fontSize: '0.9rem',
            fontWeight: 'normal',
            '&:hover': {
                color: 'primary.main',
                opacity: 0.9
            },
            '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 'bold'
            }
        }} 
    />
</Tabs>
      </Box>
  
      {/* --- CAMBIO CLAVE PARA LA DISTRIBUCIÓN --- */}
      {/* Convertimos este Box en un contenedor flex para espaciar los acordeones con 'gap' */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {activeTab === 0 && (
          <Box>
            {/* === Acordeón para Estadísticas === */}
            {/* <--- CAMBIO: quitamos mb:2 porque ahora lo maneja el 'gap' del padre */}
              <Accordion elevation={0} variant="outlined">
      <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  mb: 2,
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiAccordionSummary-expandIconWrapper': {
                    color: 'primary.contrastText',
                  },
                  borderRadius: 1, // Redondeamos un poco los bordes
                  
                }}
              >
          <Typography>Estadísticas</Typography>
      </AccordionSummary>
      <AccordionDetails>
          {/* --- NUEVA VISTA PREVIA INTERPRETADA --- */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
              Resumen interpretado:
          </Typography>
          
          {statsPreview.length > 0 ? (
              statsPreview.map(item => (
                  <StatItem key={item.label} label={item.label} value={item.value} />
              ))
          ) : (
              <Typography variant="caption" color="text.secondary">No hay resumen disponible.</Typography>
          )}
  
          {/* --- EL BOTÓN PARA VER EL DETALLE COMPLETO SE MANTIENE --- */}
          <Button 
              variant="contained" 
              size="small"
              fullWidth
              onClick={() => setStatsModalOpen(true)}
              sx={{ mt: 2 }}
          >
              Ver Todas las Métricas
          </Button>
      </AccordionDetails>
  </Accordion>
  
            {/* === Acordeón para Numéricas: Outliers === */}
            {analysis_type === 'numeric' && outliers && (
              <Accordion
                expanded={isOutliersExpanded}
                onChange={() => setOutliersExpanded(!isOutliersExpanded)}
                elevation={0}
                variant="outlined"
              >
                <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiAccordionSummary-expandIconWrapper': {
                    color: 'primary.contrastText',
                  },
                  borderRadius: 1, // Redondeamos un poco los bordes
                  
                }}
              >
                  <Typography variant="subtitle1" fontWeight="medium">Análisis de Outliers</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <StatItem label="Cantidad de Outliers" value={outliers.count} />
                  <StatItem label="Porcentaje" value={`${outliers.percentage}%`} />
                </AccordionDetails>
              </Accordion>
            )}
  
           {analysis_type === 'categorical' && (

    // Usamos un <Paper> para mantener el estilo de "tarjeta"
    // sx={{ mt: 1 }} le da un pequeño espacio para separarlo del acordeón de arriba
    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>

        {/* El título, ahora visible permanentemente */}
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            Valores Únicos
        </Typography>

        {/* La descripción, siempre visible */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Analiza la frecuencia y distribución de todas las categorías 
        </Typography>
        
        {/* El botón, siempre visible y ocupando todo el ancho */}
        <Button 
            variant="contained" 
            fullWidth
            onClick={() => setModalOpen(true)} // Asegúrate de que este onClick sea el correcto
        >
            Explorar todos los valores únicos 
        </Button>

    </Paper>
            )}
          </Box>
        )}
  
        {/* --- CONTENIDO DE LA PESTAÑA 1: PROCESAMIENTO --- */}
  
              
              {activeTab === 1 && (
                  <Box sx={{ p: 1 }}>
                      {/* Caso 1: La columna es NUMÉRICA */}
                      {analysis_type === 'numeric' && (
                          <NumericCleaner 
                              columnName={columnName}
                              null_count={null_count}
                              outliers_count={outliers?.count || 0}
                              onApplyAction={onApplyAction}
                          />
                      )}
  
                      {/* Caso 2: La columna es CATEGÓRICA */}
                      {analysis_type === 'categorical' && (
                          <CategoricalCleaner 
                              columnName={columnName}
                              null_count={null_count}
                              advanced_analysis={advanced_analysis}
                              onApplyAction={onApplyAction}
                              statistics={statistics}
                              unique_values={unique_values}
                          />
                      )}
  
                      {/* Caso 3: La columna es de FECHA */}
                      {analysis_type === 'datetime' && (
                          <DateTimeCleaner
                              columnName={columnName}
                              detectedType={detected_type}
                              onApplyAction={onApplyAction}
                          />
                      )}
                  </Box>
              )}
  
               {/* Pestaña 2: Visualización (CON LA LÓGICA INTELIGENTE) */}
                 
            {activeTab === 2 && (
                <ColumnVisualizer 
                    analysisType={analysis_type} // Le pasamos el tipo de análisis
                    columnName={columnName}     // Le pasamos el nombre de la columna
                />
            )}
          </Box> {/* <-- Cierre del contenedor principal del contenido de las pestañas */}
          
           <Box sx={{ flexShrink: 0, pt: 2, mt: 'auto', borderTop: 1, borderColor: 'divider' }}>
        {/* Usamos un Stack para alinear los dos botones horizontalmente */}
        <Stack direction="row" spacing={1.5}>
            
            {/* --- TU BOTÓN EXISTENTE --- */}
            <Button
                fullWidth
                variant="contained"
                color="secondary"
                startIcon={isLoadingLab ? <CircularProgress size={20} color="inherit" /> : <ScienceIcon />}
                onClick={handleUseColumnInLab}
                disabled={isLoadingLab}
            >
                Ir a PromptLab
            </Button>
            
            {/* --- ¡EL NUEVO BOTÓN! --- */}
            <Button
        fullWidth
        variant="outlined"
        color="secondary"
        startIcon={<DriveFileRenameOutlineIcon />}
        onClick={() => onEditAsText(columnName)} // <-- Llama a la función del padre
        disabled={isLoadingLab}
    >
        Editar columna{/* Texto más preciso */}
    </Button>

        </Stack>
    </Box>
  
          {/* === MODALES (Esto está perfecto, al final y fuera del contenedor con scroll) === */}
          <UniqueValuesModal
              open={isModalOpen}
              onClose={() => setModalOpen(false)}
              columnName={columnName}
              uniqueValues={unique_values}
          />
          <StatisticsModal
              open={isStatsModalOpen}
              onClose={() => setStatsModalOpen(false)}
              columnName={columnName}
              statistics={statistics}          
          />
  
      </Paper>
  );
  }