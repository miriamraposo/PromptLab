import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 

import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel, Button, CircularProgress, 
  Alert, Paper, Grid, Chip,FormControlLabel, Checkbox, Switch, TextField, Snackbar, 
} from '@mui/material';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import FindInPageIcon from '@mui/icons-material/FindInPage'; // Icono de diagnóstico
import FunctionsIcon from '@mui/icons-material/Functions';     // Icono de regresión (Sigma)
import CategoryIcon from '@mui/icons-material/Category';      // Icono de clasificación
import FactCheckIcon from '@mui/icons-material/FactCheck'; // Para el título del paso 2
import TagIcon from '@mui/icons-material/Tag'; // Para variables numéricas (#)
import TextFieldsIcon from '@mui/icons-material/TextFields'; 
import Tooltip from "@mui/material/Tooltip";
import { PaginaConAsistente } from '../layouts/PaginaConAsistente';
import ResultsModal from '../components/dashboard/ResultsModal'; 

export default function ModelBuilderPage() {
  const { datasetId } = useParams();

  // === ESTADOS ===
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [allColumns, setAllColumns] = useState([]);
  
  // Estados para la configuración del modelo
  const [targetColumn, setTargetColumn] = useState('');
  const [targetAnalysis, setTargetAnalysis] = useState(null); // <-- NUEVO ESTADO para los datos de la tarjeta
  const [problemType, setProblemType] = useState(null);
  const [categoricalFeatures, setCategoricalFeatures] = useState([]);
  const [encodingStrategies, setEncodingStrategies] = useState({});
  const [featureImportance, setFeatureImportance] = useState({});
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [modelName, setModelName] = useState('');
  const [useSmote, setUseSmote] = useState(false);
  const [isConfigFinalized, setIsConfigFinalized] = useState(false);
  const [trainingResults, setTrainingResults] = useState(null);
  const [useCv, setUseCv] = useState(true);
  const [projectName, setProjectName] = useState('Mi Primer Proyecto'); // Valor por defecto
  const [modelDisplayName, setModelDisplayName] = useState(''); // El usuario debe rellenarlo
  const [predefinedOrdinalColumns, setPredefinedOrdinalColumns] = useState([]); 
  // Este estado guardará la configuración del entrenamiento que generó los resultados en el modal
  const [lastTrainingConfig, setLastTrainingConfig] = useState(null); 

  // === EFECTO INICIAL ===
  useEffect(() => {
    const fetchInitialColumns = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/columns`,
          {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          }
        );
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Error al cargar las columnas.');
        }
        setAllColumns(data.columns || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialColumns();
  }, [datasetId]);
    

  const handleTargetColumnSelect = async (selectedColumn) => {
    setTargetColumn(selectedColumn);
    setLoading(true);
    setError(null);
    setTargetAnalysis(null); // Reseteamos el análisis previo

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no válida.");

      // Llamamos a nuestro endpoint inteligente
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/analyze-problem`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_column: selectedColumn }),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error en el análisis de la columna.');
      }
      
      // GUARDAMOS LOS DATOS para la tarjeta, pero NO pasamos de paso.
      setTargetAnalysis(result.data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProblemTypeSelect = async (selectedProblemType) => {
    setProblemType(selectedProblemType);
    setLoading(true);
    setError(null);

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");
        
        const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/prepare-features`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    target_column: targetColumn, 
                    problem_type: selectedProblemType 
                }),
            }
        );
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Error al preparar las características.');
        }

        setCategoricalFeatures(result.data.categorical_features || []);
        setPredefinedOrdinalColumns(result.data.predefined_ordinal_columns || []);
        setFeatureImportance(result.data.feature_importance || {});
        setSelectedFeatures(Object.keys(result.data.feature_importance || {}));
        
        const defaultStrategies = {};
        const predefinedCols = result.data.predefined_ordinal_columns || [];
        (result.data.categorical_features || []).forEach(feature => {
            if (predefinedCols.includes(feature.name)) {
                defaultStrategies[feature.name] = 'ordinal';
            } else if (feature.unique_count > 50) {
                defaultStrategies[feature.name] = 'descartar';
            } else {
                defaultStrategies[feature.name] = 'one-hot';
            }
        });
        setEncodingStrategies(defaultStrategies);
        
        setModelName('Random Forest');
        setCurrentStep(2);

    } catch(err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
};

  const handleFeatureSelectionChange = (columnName, isChecked) => {
    if (isChecked) {
      setSelectedFeatures(prev => [...prev, columnName]);
    } else {
      setSelectedFeatures(prev => prev.filter(f => f !== columnName));
    }
  };

  const handleStrategyChange = (columnName, newStrategy) => {
    setEncodingStrategies(prevStrategies => ({
      ...prevStrategies,
      [columnName]: newStrategy,
    }));

    if (newStrategy === 'descartar') {
      setSelectedFeatures(prevFeatures => prevFeatures.filter(f => f !== columnName));
    }
  };
      
  const handleResetConfiguration = () => {
  // 1. Volvemos al primer paso
  setCurrentStep(1);

  // 2. Limpiamos TODOS los estados relacionados con la configuración anterior
  setTargetColumn('');
  setProblemType(null);
  setCategoricalFeatures([]);
  setEncodingStrategies({});
  setFeatureImportance({});
  setSelectedFeatures([]);
  setModelName('');
  setUseSmote(false);
  setIsConfigFinalized(false);
  setTrainingResults(null); // También limpiamos los resultados si los hubiera
  setError(null); // Y los errores
};
   
  // === FUNCIÓN DE ENTRENAMIENTO (CORREGIDA) ===
  const handleExperiment = async () => {
    if (!targetColumn || selectedFeatures.length === 0 || !modelName) {
      setError("Error: Asegúrate de haber completado todos los pasos y seleccionado un modelo.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no válida.");
      
      const finalEncodingStrategies = {};
      selectedFeatures.forEach(feature => {
        const strategy = encodingStrategies[feature];
        if (strategy) {
          finalEncodingStrategies[feature] = strategy;
        }
      });

      // Este es el payload que usaremos para entrenar Y para guardar más tarde
      const payload = {
        target_col: targetColumn,
        model_name: modelName,
        encoding_strategies: finalEncodingStrategies,
        use_smote: useSmote,
        use_cv: useCv,
        problem_type: problemType, 
      };
      
       setLastTrainingConfig(payload); 
        
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/train-model`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          // Para la simulación, añadimos nombres temporales que no se guardarán permanentemente
          body: JSON.stringify({
            ...payload,
            is_experiment_only: true, // Le decimos al backend que NO guarde
            project_name: "experimento_temporal",
            model_display_name: `temp_${Date.now()}`
          }),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ocurrió un error durante el entrenamiento.');
      }
      
      setTrainingResults(result.results); 
      setIsConfigFinalized(false);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // === NUEVA FUNCIÓN: Se llamará desde el Modal para guardar de verdad ===
  const handleSaveModel = async (finalProjectName, finalModelDisplayName) => {
    if (!lastTrainingConfig) {
      alert("Error: No hay una configuración de entrenamiento para guardar.");
      return false; // Devuelve false para que el modal sepa que no debe cerrar
    }
    if (!finalProjectName.trim() || !finalModelDisplayName.trim()) {
      alert("Por favor, asigna un nombre al proyecto y al modelo.");
      return false; 
    }

    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no válida.");
      
      const finalPayload = {
        ...lastTrainingConfig,
        project_name: finalProjectName,
        model_display_name: finalModelDisplayName,
        problem_type: problemType, 
      };

      

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/train-model`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(finalPayload),
        }
      );

      const result = await response.json();

      // --- UNA ÚNICA Y MEJORADA COMPROBACIÓN DE ERRORES ---
      if (!response.ok || !result.success) {
            // response.status === 409 es el código que nos envía el backend mejorado
            if (response.status === 409) {
                // Si es un error de duplicado, usamos el mensaje claro de la API
                alert(`Error: ${result.error}`); 
            } else {
                // Para cualquier otro error, usamos un mensaje genérico
                // Usamos 'throw' para que el error sea capturado por el bloque 'catch'
                throw new Error(result.error || 'Ocurrió un error al guardar el modelo.');
            }
            return false; // Indicamos al modal que no se cierre
      }
      
      // Si llegamos aquí, todo fue exitoso
      alert(`¡Modelo "${finalModelDisplayName}" guardado con éxito!`);
      setTrainingResults(null); // Cierra el modal
      return true; // Éxito

    } catch (err) {
      // El bloque catch ahora maneja los errores genéricos de forma centralizada
      alert(`Error al guardar: ${err.message}`);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
};
    
    const getImportanceChipColor = (score) => {
  if (score > 0.1) return "success"; // Muy importante
  if (score > 0.05) return "primary"; // Importancia media
  return "default"; // Menos importante
};




    // === RENDER ===
  return (
    <PaginaConAsistente nombreModulo="predicciones">
  <Box
    sx={{
      height: '100vh',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      pt: `calc(72px + 0px)`,
      px: 3,
      pb: 3,
     background: 'linear-gradient(180deg, #e3f2fd )', // azul pastel a blanco
    }}
  >
    {/* Encabezado */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexShrink: 0 }}>
      <Typography variant="h5" component="h2" fontWeight="bold"   sx={{ color: 'black' }} >
        Configuración del Modelo Predictivo
      </Typography>
    </Box>

    <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden' }}>
      {/* Panel principal */}
      <Paper sx={{ flex: 2, p: 4, overflowY: 'auto',background: "linear-gradient(135deg, #26717a, #44a1a0)", }}>
        {loading && !trainingResults && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}

        {/* === PASO 1: SELECCIÓN Y DIAGNÓSTICO (NUEVO DISEÑO) === */}
          {currentStep === 1 && !loading && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color:"white" }}>
                Paso 1: Seleccionar la columna a  predecir (Objetivo)
              </Typography>
              <FormControl
               fullWidth
               size="small"
               sx={{
                '& .MuiInputLabel-root': { fontSize: 13 ,color:"white"},       // Label más pequeño
                '& .MuiSelect-select': { padding: '6px 8px', fontSize: 13, color:"white" } // Reduce altura y texto
                 }}
              >
              <InputLabel>Columna Objetivo</InputLabel>
               <Select
                value={targetColumn}
                label="Columna Objetivo"
                onChange={(e) => handleTargetColumnSelect(e.target.value)}
                >
              {allColumns.map((col) => (
              <MenuItem key={col.name} value={col.name}>{col.name}</MenuItem>
              ))}
               </Select>
             </FormControl>
              {/* LA TARJETA DE DIAGNÓSTICO INTERACTIVO (Aparece cuando hay análisis) */}
              {targetAnalysis && (
                <Paper 
                elevation={3} 
                sx={{ 
                mt: 5, 
                p: 1, 
                borderTop: 5, 
                borderColor: 'primary.main', 
                backgroundColor: '#e3f2fd',
                }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                   <FindInPageIcon color="primary" sx={{ mr: 1.5, fontSize: '2rem' }} />
                   <Typography 
                        variant="h5" 
                        component="h3" 
                        fontWeight="bold"
                        sx={{ color: '#222' }}   // 👈 fuerza el color (gris oscuro)
                        >
                        Análisis de "{targetAnalysis.target_column}"
                    </Typography>
                  </Box>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
  <Grid size={{ xs: 6 }}>
    
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 3, 
        textAlign: 'center', 
        borderRadius: 2,                     // bordes más redondeados
        borderColor: 'primary.light',        // borde más suave
        boxShadow: 2,                        // sombra ligera
        bgcolor: 'background.paper',         // fondo claro
        transition: 'transform 0.2s',        // animación sutil al hover
        '&:hover': { transform: 'scale(1.03)' }, 
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Tipo de Dato Detectado
      </Typography>
      <Chip 
        label={targetAnalysis.dtype_real.toUpperCase()} 
        color={targetAnalysis.dtype_real === 'numeric' ? 'info' : 'success'} 
        sx={{ mt: 1, fontWeight: 'bold', letterSpacing: 0.5 }} // espaciado para más estilo
      />
    </Paper>
  </Grid>
  <Grid size={{ xs: 6 }}>
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 3, 
        textAlign: 'center', 
        borderRadius: 2, 
        borderColor: 'secondary.light', 
        boxShadow: 2,
        bgcolor: 'background.paper',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'scale(1.03)' }, 
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Valores Únicos
      </Typography>
      <Typography variant="h6" fontWeight="bold" sx={{ mt: 2, letterSpacing: 0.5, color: 'primary.main' }}>
        {targetAnalysis.unique_count.toLocaleString()}
      </Typography>
    </Paper>
  </Grid>
</Grid>

                  <Box 
                  sx={{ 
                    textAlign: 'center', 
                    mt: 0, 
                    mb: 3, 
                    p: 0, 
                     borderRadius: 2, 
                     bgcolor: (theme) => theme.palette.mode === 'dark' 
                     ? 'rgba(255,255,255,0.05)' 
                      : 'rgba(0,0,0,0.03)' 
                     }}
                    >
                 <Typography variant="h6" sx={{ mb: 1, fontWeight: 500,color: '#222'  }}>
                 Con base en este análisis, ¿qué tipo de problema desea resolver?
                  </Typography>

                <Typography>
                  <Box component="span" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                   Categórica
                  </Box> → Clasificación <br />
                     <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                   Numérica
                  </Box> → Regresión
                 </Typography>

                   </Box>


                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
                  <Button
                  variant="contained"
                 color="primary"
                 size="large"
                   startIcon={<FunctionsIcon />}
                   onClick={() => handleProblemTypeSelect('regresion')}
                  sx={{ flex: 1, flexDirection: 'column', py: 2 }}
                      >
                  <Typography fontWeight="bold">Regresión</Typography>
                  <Typography variant="caption" sx={{ textTransform: 'none' }}>
                       Predecir un número
                 </Typography>
                </Button>

                 <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  startIcon={<CategoryIcon />}
                   onClick={() => handleProblemTypeSelect('clasificacion')}
                  sx={{ flex: 1, flexDirection: 'column', py: 2 }}
                   >
                  <Typography fontWeight="bold">Clasificación</Typography>
                  <Typography variant="caption" sx={{ textTransform: 'none' }}>
                    Predecir una categoría
                  </Typography>
                  </Button>
                </Box>
                </Paper>
              )}
            </Box>
          )}

      {currentStep === 2 && ( 
        <Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
     
                     <Button 
                       variant="outlined" 
                      size="small"
                      onClick={handleResetConfiguration}
                      sx={{
                      backgroundColor: '#1976d2', // azul intenso
                      color: 'white',
                      '&:hover': { backgroundColor: '#115293' },
                      }}
                    >
                       Cambiar Columna Objetivo
                     </Button>
          </Box>
                     {/* --- FIN DEL CÓDIGO AÑADIDO --- */}
          
                     <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography fontWeight="bold">
                            Análisis Detectado: {problemType === 'clasificacion' ? 'CLASIFICACIÓN' : 'REGRESIÓN'}
                        </Typography>
                     </Alert>

  {/* === PASO 2: TÍTULO CON ICONO === */}
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
  <FactCheckIcon color="primary" />
  <Typography variant="h6" sx={{ color: '#fff'}}>
   Paso 2: Selección y Preparación de Características
  </Typography>
</Box>

{/* === LISTA DE CARACTERÍSTICAS MEJORADA === */}
<Box > 
  {Object.entries(featureImportance)
    // Ordenamos por importancia de mayor a menor
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .map(([colName, score]) => {
      
      const categoricalInfo = categoricalFeatures.find(f => f.name === colName);
      const isCategorical = !!categoricalInfo;
      const isSelected = selectedFeatures.includes(colName);
      const isPredefinedOrdinal = predefinedOrdinalColumns.includes(colName);


      return (
          <Paper 
            key={colName} 
            elevation={2}
              sx={{ 
              p: 2, 
              mb: 2, 
              opacity: isSelected ? 1 : 0.6, 
    // 👇 Usa los colores del tema para el fondo
              backgroundColor: isSelected ? 'background.paper' : 'action.hover',
              borderLeft: '4px solid',
              borderColor: isSelected ? 'primary.main' : 'divider',
              transition: 'all 0.3s ease-in-out',
  }}
>
  {/* --- Fila Superior: Selección e Importancia --- */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <FormControlLabel
      control={
        <Checkbox
          checked={isSelected}
          onChange={(e) => handleFeatureSelectionChange(colName, e.target.checked)}
        />
      }
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isCategorical 
            // 👇 Usa el color de acción para los íconos
            ? <TextFieldsIcon fontSize="small" color="action" /> 
            : <TagIcon fontSize="small" color="action" />
          }
          {/* Typography sin color usará text.primary por defecto */}
          <Typography fontWeight="bold">{colName}</Typography>
        </Box>
      }
      sx={{ flexGrow: 1 }}
    />
    <Chip 
      label={`Importancia: ${score.toFixed(3)}`}
      color={getImportanceChipColor(score)}
      size="small"
      variant="outlined"
    />
  </Box>

          {/* --- Sección Inferior: Configuración Categórica (solo si está seleccionada) --- */}
          {isCategorical && isSelected && (
            <Box sx={{ pt: 1.5, mt: 1.5, borderTop: '1px solid', borderColor: 'primary' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Diagnóstico: Contiene <b>{categoricalInfo.unique_count}</b> valores únicos.
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Estrategia de Codificación</InputLabel>
                <Select
                      value={encodingStrategies[colName] || (isPredefinedOrdinal ? 'ordinal' : 'one-hot')}
                      label="Estrategia de Preparación"
                      onChange={(e) => handleStrategyChange(colName, e.target.value)}
                 >
          {isPredefinedOrdinal ? (
            // --- Menú para columnas con orden predefinido (ej. 'talla') ---
            [
                <MenuItem key="ord-pre" value="ordinal">
                     <Tooltip title="Usa el orden lógico predefinido para esta columna (ej. 'bajo' < 'medio' < 'alto'). ¡Muy recomendado!" placement="right" arrow>
                     <MenuItem value="ordinal">
                     Ordinal (Orden Predefinido)
                    </MenuItem>
                 </Tooltip>
                </MenuItem>,
                <MenuItem key="ohe" value="one-hot">
                    <Tooltip 
                        title="Ignora el orden y crea una columna para cada categoría. Menos eficiente para esta variable." 
                        placement="right" 
                        arrow
                        >
                         <MenuItem value="one-hot">
                         Convertir en Múltiples Columnas (One-Hot)
                        </MenuItem>
                     </Tooltip>
                </MenuItem>,
                <MenuItem key="desc" value="descartar">
                    <Tooltip 
                      title="El modelo ignorará por completo esta columna." 
                      placement="right" 
                      arrow
                      >
                      <MenuItem value="descartar">
                        No Usar esta Columna
                  </MenuItem>
                      </Tooltip>
                </MenuItem>
            ]
        ) : (
            // --- Menú para columnas categóricas normales (ej. 'país') ---
            [
                <MenuItem key="ohe" value="one-hot">
                    <Tooltip title="Ideal para variables con pocas categorías (ej. 'Sí'/'No'). Crea una nueva columna para cada categoría." placement="right" arrow>
                        <Typography variant="inherit">Convertir en Múltiples Columnas (One-Hot)</Typography>
                    </Tooltip>
                </MenuItem>,
                <MenuItem key="ord-auto" value="ordinal">
                    <Tooltip title="Ideal para variables con muchas categorías (ej. Países). Reemplaza el texto por un número único." placement="right" arrow>
                        <Typography variant="inherit">Convertir a Números (Etiquetado)</Typography>
                    </Tooltip>
                </MenuItem>,
                <MenuItem key="desc" value="descartar">
                    <Tooltip title="El modelo ignorará por completo esta columna." placement="right" arrow>
                        <Typography variant="inherit">No Usar esta Columna</Typography>
                    </Tooltip>
                </MenuItem>
            ]
        )}
    </Select>
              </FormControl>
            </Box>
          )}
        </Paper>
      );
    })}
</Box>

<Button 
  variant="contained" 
  size="large" // Botón más grande y notable
  onClick={() => setIsConfigFinalized(true)} 
  sx={{ mt: 2 }} // Menos margen superior
>
  Finalizar Configuración y Entrenar
</Button>
</Box>
)} 
            
      </Paper>

      {/* Panel lateral */}
      <Paper   sx={{
              flex: 1,
              p: 3,
              overflowY: 'auto',
              borderColor: 'blue', 
              borderRadius: 2,
              boxShadow: 3,
              background: 'linear-gradient(180deg, #002f4b, #005f73)',
             }}>
       <Typography 
           variant="h6" 
           fontWeight="bold" 
           gutterBottom 
           sx={{ color: '#fff' }}
           >
          Panel de Control
         </Typography>
        {/* === AÑADIMOS LOS CAMPOS PARA EL NOMBRE === */}
           {currentStep > 1 && (
            <Box  sx={{ p: 1 }}>
             <Paper variant="outlined" sx={{ p: 4 }}>
            <TextField
             fullWidth
             size="small"
             label="Nombre del Proyecto"
             value={projectName}
             onChange={(e) => setProjectName(e.target.value)}
             variant="outlined"
             placeholder="Agrupa varios modelos bajo un mismo experimento."
             sx={{ mb: 2}}
           />
            <TextField
             fullWidth
             size="small"
             label="Nombre Descriptivo del Modelo"
             value={modelDisplayName}
             onChange={(e) => setModelDisplayName(e.target.value)}
             variant="outlined"
             placeholder="Nombre único para este entrenamiento específico."
             InputLabelProps={{ shrink: true }}   // 👈 fuerza a mostrar el label arriba
            />
         </Paper>
        </Box>
        )}

        {currentStep > 1 && (
          <Box>
            {/* Selección de Modelo */}
            <FormControl fullWidth sx={{ mt: 3 }}>
        <InputLabel
         id="model-select-label"
         sx={{ 
         color: '#fff', 
          fontWeight: 'bold', 
          fontSize: '1.5rem',   // como un h6 aprox
          mb: 1                 // como gutterBottom
         }}
          >
          Algoritmo del Modelo
          </InputLabel>


       <Select
         labelId="model-select-label"
         value={modelName}
         onChange={(e) => setModelName(e.target.value)}
         sx={{
          mt:3,
          color: '#fff',                // texto seleccionado en blanco
         '.MuiSvgIcon-root': { color: '#fff' }, // ícono de flecha en blanco
         '.MuiOutlinedInput-notchedOutline': {
           borderColor: '#fff',        // borde blanco
           },
          '&:hover .MuiOutlinedInput-notchedOutline': {
           borderColor: '#90caf9',     // borde azul suave al hover (opcional)
          },
         }}
          >
        {problemType === 'classification'
      ? [
          <MenuItem key="rf-c" value="Random Forest" sx={{ color: '#000' }}>
            Random Forest
          </MenuItem>,
          <MenuItem key="xgb-c" value="XGBoost" sx={{ color: '#000' }}>
            XGBoost
          </MenuItem>,
          <MenuItem key="lgbm-c" value="LightGBM" sx={{ color: '#000' }}>
            LightGBM
          </MenuItem>,
        ]
      : [
          <MenuItem key="rf-r" value="Random Forest" sx={{ color: '#000' }}>
            Random Forest
          </MenuItem>,
          <MenuItem key="xgb-r" value="XGBoost" sx={{ color: '#000' }}>
            XGBoost
          </MenuItem>,
          <MenuItem key="lgbm-r" value="LightGBM" sx={{ color: '#000' }}>
            LightGBM
          </MenuItem>,
        ]}
  </Select>
</FormControl>


            {/* Opciones Avanzadas */}
            <Typography
  sx={{
    color: '#fff' ,
    mt: 3,
    mb: 1,
    fontSize: '1.1rem',  // un poco más grande que body1
    fontWeight: 600,     // seminegrita, entre normal y h6
  }}
>
  Opciones Avanzadas
</Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <FormControlLabel
  disabled // Esto deshabilita el control completo
  control={<Checkbox checked={true} />} // Un checkbox marcado es más claro
  label={
    <Box>
      <Typography>Validación Cruzada</Typography>
      <Typography variant="caption" color="text.secondary">
        (Siempre activa para una evaluación robusta)
      </Typography>
    </Box>
  }
/>
              {problemType === 'clasificacion' && (
                <FormControlLabel
                  control={
                    <Switch checked={useSmote} onChange={(e) => setUseSmote(e.target.checked)} />
                  }
                  label={
                    <Box>
                      <Typography>Balancear Clases (SMOTE) ⚠️</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Útil para clases desbalanceadas. Usar con precaución.
                      </Typography>
                    </Box>
                  }
                  sx={{ mt: 3 }}
                />
              )}
            </Paper>
          </Box>
        )}

        <Button
  sx={{
    mt: 5,
    color: '#fff !important',            // fuerza texto blanco
    '& .MuiButton-startIcon': {
      color: '#fff !important',          // ícono blanco
    },
  }}
  variant="contained"
  color="primary"
  size="large"
  fullWidth
  startIcon={
    loading && isConfigFinalized ? (
      <CircularProgress size={24} color="inherit" />
    ) : (
      <ModelTrainingIcon />
    )
  }
  onClick={handleExperiment} 
  disabled={!isConfigFinalized || loading}
>
  {loading && isConfigFinalized ? 'Experimentando...' : 'Experimentar'}
</Button>

      </Paper>
      {/* --- RENDERIZADO CONDICIONAL DEL MODAL --- */}
       {trainingResults && (
       <ResultsModal
        targetColumn={targetColumn}
        open={!!trainingResults}
        onClose={() => setTrainingResults(null)} // Función para cerrar el modal
        results={trainingResults}
        problemType={problemType}
        initialProjectName={projectName}
        initialModelName={modelDisplayName}
        onSave={handleSaveModel} 
         />
        )}
      
    </Box>
  </Box>
  </PaginaConAsistente>
);
 }