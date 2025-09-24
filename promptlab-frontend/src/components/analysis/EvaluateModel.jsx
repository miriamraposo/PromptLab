

            // RUTA: src/components/analysis/EvaluateModel.jsx
            
            import React, { useState, useMemo,useRef  } from 'react';
            import { supabase } from '../../supabaseClient';
            import { 
                Box, Typography, Button, CircularProgress, Alert, Paper, Stack, 
                Divider, Grid, Chip
            } from '@mui/material';
            import DatasetSelectorModal from './DatasetSelectorModal';
            import FindInPageIcon from '@mui/icons-material/FindInPage';
            import AnalyticsIcon from '@mui/icons-material/Analytics';
            import InfoIcon from '@mui/icons-material/Info';
            
            
            // ¡Importamos nuestros nuevos componentes!
            import ConfusionMatrix from './ConfusionMatrix';
            import ClassificationReportChart from './ClassificationReportChart';
            import RegressionScatterPlot from './RegressionScatterPlot'; 
            import ErrorHistogram from './charts/ErrorHistogram';
            import ErrorBoxPlot from './charts/boxplot';
            
            const MetricCard = ({ title, value, explanation }) => (
              <Grid item xs={12} sm={6} md={4}>
                <Paper
                  elevation={4} // sombra
                  sx={{
                    p: 3,
                    borderRadius: 3, // bordes redondeados
                    height: '100%',
                    boxShadow: 3, // sombra extra
                    transition: '0.3s',
                    '&:hover': {
                      boxShadow: 6, // sombra más intensa al pasar el mouse
                      transform: 'translateY(-2px)', // efecto sutil de levantamiento
                    },
                  }}
                >
                  <Typography color="text.secondary" gutterBottom>
                    {title}
                  </Typography>
                  <Typography
                    variant="h4"
                    component="div"
                    sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}
                  >
                    {value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {explanation}
                  </Typography>
                </Paper>
              </Grid>
            );
            
            
            
            export default function EvaluateModel({ model, projectId }) {
                const [selectedDataset, setSelectedDataset] = useState(null);
                const [isModalOpen, setModalOpen] = useState(false);
                const [evaluationResult, setEvaluationResult] = useState(null);
                const [loading, setLoading] = useState(false);
                const [error, setError] = useState(null);
                const evaluateButtonRef = useRef(null)
                const requiredFeatures = useMemo(() => {
    // Se asegura de que `model.features` sea un array antes de intentar mapearlo.
    // Esto evita errores si `model` o `model.features` fueran `undefined` por un instante.
    if (!Array.isArray(model?.features)) {
        return "No se pudieron determinar las características.";
    }
    return model.features.map(f => f.name).join(', ');
}, [model?.features]);
                const handleEvaluate = async () => {
                    if (!selectedDataset) {
                        setError("Por favor, selecciona un dataset primero.");
                        return;
                    }
                    setLoading(true);
                    setError(null);
                    setEvaluationResult(null);
            
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) throw new Error("No estás autenticado.");
            
                        const payload = { dataset_id: selectedDataset.datasetId };
            
                        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${model.id}/evaluate`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${session.access_token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(payload),
                        });
            
                        const result = await response.json();
                        if (!response.ok || !result.success) {
                            throw new Error(result.error || 'Ocurrió un error durante la evaluación.');
                        }
            
                        
                        setEvaluationResult(result.data);
            
                    } catch (err) {
                        setError(err.message);
                    } finally {
                        setLoading(false);
                    }
                };
            
                const handleDatasetSelected = (dataset) => {
                    setSelectedDataset(dataset);
                    setEvaluationResult(null);
                    setError(null);
                };
            
                const scatterData = evaluationResult?.metrics?.scatter_plot_data;
                const errorHistogramData = evaluationResult?.metrics?.error_histogram_data; 
            
                return (
                <>
                    {/* =================================================================== */}
                    {/* === ESTE ES EL ÚNICO CONTENEDOR PRINCIPAL === */}
                    {/* Le ponemos un gap: 2 para un espaciado agradable y consistente */}
                    {/* =================================================================== */}
                    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2,  }}>
                        
                        {/* Título Principal (opcional, si lo quieres fuera, debe estar fuera del Paper también) */}
                        <Typography variant="h6" component="h6" fontWeight="bold">
                            Evaluación del modelo entrenado con un nuevo conjunto de datos
                        </Typography>
                        
                        {/* --- SECCIÓN DE GUÍA PARA EL USUARIO (AHORA DENTRO DEL PAPER PRINCIPAL) --- */}
                        {/* Usamos tu nuevo y mejorado diseño, pero quitamos el margen inferior (mb) */}
                        <Paper
                           elevation={2}
                           sx={{
                               p: 2, // Un poco más de padding interno
                               borderRadius: 2,
                               background: 'rgba(33, 150, 243, 0.08)', 
                               borderLeft: '4px solid #2196f3',
                           }}
                        >
                            <Box>

<Typography variant="h6" gutterBottom sx={{ fontSize: "1.1rem" }}>
  ¿Por qué es importante evaluar el modelo?
</Typography>


<Typography variant="body2" component="div" sx={{ mb: 2 }}>
  Imagina que tu modelo es como un estudiante. El entrenamiento fue su período de estudio; 
  ahora, esta etapa es su <strong>examen final</strong>.
  <br />
  Al probarlo con datos que nunca ha visto, podemos medir qué tan bien aprendió en realidad 
  y descubrir sus fortalezas y debilidades.
  <br /> <br />
  De esta forma, la evaluación nos permite:
</Typography>
       <Typography variant="body2" component="div">
  <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
    <li><strong>Ganar Confianza:</strong> Saber si el modelo es fiable para tomar decisiones importantes.</li>
    <li><strong>Descubrir Puntos Ciegos:</strong> Entender en qué tipo de situaciones el modelo acierta y en cuáles se equivoca.</li>
    <li><strong>Simular el Mundo Real:</strong> Comprobar su rendimiento antes de aplicarlo a problemas futuros.</li>
  </ul>
</Typography>
    </Box>
    <Divider sx={{ my: 1.5 }} />
    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
        Instrucciones:
    </Typography>
    <Typography variant="caption" sx={{ display: 'block' }}>
        Para realizar la evaluación, selecciona un dataset que el modelo no haya usado durante su entrenamiento.
    </Typography>
    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
        <strong>Importante:</strong> Este dataset <strong>debe incluir</strong> la columna objetivo (`{model.targetColumn}`) para que la herramienta pueda comparar las predicciones del modelo con los resultados correctos y calcular su rendimiento.
    </Typography>
                            <Divider sx={{ my: 1.5, mx: '36px' }} />
                            <Typography variant="caption" sx={{ display: 'block', pl: '36px' }}>
                                 <strong>Características requeridas:</strong> {requiredFeatures}.<br/>
                                 <strong>Columna objetivo requerida:</strong> {model.targetColumn}.
                            </Typography>
                          
                        </Paper>
            
                            {/* --- SECCIÓN DE SELECCIÓN --- */}
                            <Paper variant="outlined" sx={{ p: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1}}>
                                <Typography sx={{ color: selectedDataset ? 'text.primary' : 'text.secondary' }}>
                                    {selectedDataset ? `Dataset de evaluación: ${selectedDataset.name}` : 'Ningún dataset seleccionado.'}
                                </Typography>
                                  <Button
                                   variant="contained"
                                     startIcon={<FindInPageIcon />}
                                     onClick={() => setModalOpen(true)}
                                     sx={{
                                     borderColor: '#1976d2',  // opcional: borde azul
                                    '&:hover': {
                                     backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                     borderColor: '#115293',
                                     },
                                       }}
                                    >
                                         Seleccionar Dataset
                                   </Button>
                            </Paper>
                            
                            {/* --- SECCIÓN DE EJECUCIÓN --- */}
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Button
                                    variant="contained"
                                    ref={evaluateButtonRef}
                                    size="large"
                                    onClick={handleEvaluate}
                                    disabled={!selectedDataset || loading}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon />}
                                >
                                    {loading ? "Evaluando Modelo..." : "Evaluar Rendimiento"}
                                </Button>
                            </Box>
            
                            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                            
                             {/* ========================================================== */}
                            {/* === ¡NUEVA SECCIÓN DE RESULTADOS CON LÓGICA CONDICIONAL! === */}
                            {/* ========================================================== */}
                            {evaluationResult && (
                                <Box  sx={{ p: 0 }}>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Dashboard de Rendimiento del Modelo</Typography>
                                    
                                    {/* --- RENDERIZADO CONDICIONAL --- */}
                                    {evaluationResult.problem_type === 'clasificacion' ? (
                                        
                                        // =============================
                                        // === DASHBOARD CLASIFICACIÓN ===
                                        // =============================
                                        <>
<Box sx={{ mt: 5 }}>
  <Typography variant="h6" gutterBottom>
    Métricas de Error
  </Typography>
  {/* CAMBIO: Cada card ocupa 3 columnas (4 cards * 3 = 12) */}
</Box>
 <Box sx={{ mt: 5 }}>   
  <Grid
  container
  spacing={4} // un poco más de espacio
  sx={{ mb: 4, alignItems: "stretch" }}
  justifyContent="space-evenly" // 👈 distribuye las cards
>


  <Grid item xs={12} sm={6} md={4}>
    <MetricCard 
      title="Precisión General (Accuracy)"
      value={`${(evaluationResult.metrics.accuracy * 100).toFixed(1)}%`}
      explanation={
        <>
          De 100 casos del nuevo dataset, el
          modelo acertó <br />esta cantidad.
        </>
      }
    />
  </Grid>

  {evaluationResult.metrics.classification_report['macro avg']?.precision && (
    <Grid item xs={12} sm={6} md={4}>
      <MetricCard 
        title="Confianza Promedio (Precision)"
        value={`${(evaluationResult.metrics.classification_report['macro avg'].precision * 100).toFixed(1)}%`}
        explanation={
          <>
            En promedio, cuando el modelo hace una predicción,<br />
            este es su nivel de confianza de que sea correcta.
          </>
        }
      />
    </Grid>
  )}

  {evaluationResult.metrics.classification_report['macro avg']?.recall && (
    <Grid item xs={12} sm={6} md={4}>
      <MetricCard 
        title="Alcance Promedio (Recall)"
        value={`${(evaluationResult.metrics.classification_report['macro avg'].recall * 100).toFixed(1)}%`}
        explanation={
          <>
            De todos los resultados posibles,
            el modelo fue capaz  <br />de 'encontrar' este porcentaje.
          </>
        }
      />
    </Grid>
  )}
</Grid>  
</Box>

 <Box sx={{ mt: 5 }}>  
                       <Box sx={{ mt: 5 }}>
                        <Typography variant="h6" gutterBottom>
                         Visualizacion
                        </Typography>
                        </Box>  

<Grid container spacing={4} sx={{ mt: 4 }}> {/* CAMBIO 1: Spacing reducido a 4 y margen superior (mt) ajustado */}
    
    {/* Contenedor para la Matriz de Confusión */}
    <Grid  xs={12} md={6}> {/* CAMBIO 2: Añadida la propiedad "item" y ajustado el breakpoint a "md" */}
        <ConfusionMatrix 
            data={evaluationResult.metrics.confusion_matrix} 
            labels={evaluationResult.metrics.confusion_matrix_labels} 
        />
    </Grid>

    {/* Contenedor para el Gráfico de Rendimiento */}
    <Grid xs={12} md={6}> {/* CAMBIO 2: Añadida la propiedad "item" y ajustado el breakpoint a "md" */}
        <ClassificationReportChart 
            report={evaluationResult.metrics.classification_report} 
            labels={evaluationResult.metrics.confusion_matrix_labels} 
        />
    </Grid>

</Grid>
</Box>
          </>
      ) : (
              
        
                        // ===========================================
                        // === DASHBOARD REGRESIÓN (¡CORREGIDO!) ===
                        // ===========================================
                        <>
  <Box sx={{ mt: 5 }}>
  <Typography variant="h6" gutterBottom>
    Métricas de Error
  </Typography>
  {/* CAMBIO: Cada card ocupa 3 columnas (4 cards * 3 = 12) */}
</Box>
 <Box sx={{ mt: 5 }}>                   
  <Grid
    container
    spacing={5}
    sx={{
      mb: 4,
      justifyContent: "center", // centra las filas
    }}
  >
    <Grid xs={12} sm={6} md={3}>
      <Paper
        elevation={4}
        sx={{
          p: 3,
          borderRadius: 3,
          height: 200,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "center",
          boxShadow: 3,
          transition: "0.3s",
        }}
      >
        <Typography variant="h6">Coeficiente (R²)</Typography>
        <Typography variant="h4">{evaluationResult.metrics.r2_score?.toFixed(3)}</Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
          Un valor cercano a 1{'\n'}significa que el modelo ajusta{'\n'} bien los datos.
        </Typography>
      </Paper>
    </Grid>

    <Grid  xs={12} sm={6} md={3}>
      <Paper
        elevation={4}
        sx={{
          p: 3,
          borderRadius: 3,
          height: 200,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "center",
          boxShadow: 3,
          transition: "0.3s",
        }}
      >
        <Typography variant="h6">Error (RMSE)</Typography>
        <Typography variant="h4">{evaluationResult.metrics.rmse?.toFixed(3)}</Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
          Representa el error promedio{'\n'}Un valor más bajo es mejor.
        </Typography>
      </Paper>
    </Grid>

    <Grid  xs={12} sm={6} md={3}>
      <Paper
        elevation={4}
        sx={{
          p: 3,
          borderRadius: 3,
          height: 200,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "center",
          boxShadow: 3,
          transition: "0.3s",
        }}
      >
        <Typography variant="h6">Error Absoluto (MAE)</Typography>
        <Typography variant="h4">{evaluationResult.metrics.mae?.toFixed(3)}</Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
          Promedio de los errores absolutos{'\n'}entre predicciones y reales.
        </Typography>
      </Paper>
    </Grid>

    <Grid  xs={12} sm={6} md={3}>
      <Paper
        elevation={4}
        sx={{
          p: 3,
          borderRadius: 3,
          height: 200,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "center",
          boxShadow: 3,
          transition: "0.3s",
        }}
      >
        <Typography variant="h6">Error Porcentual (MAPE)</Typography>
        <Typography variant="h4">
          {evaluationResult.metrics.mape !== null
            ? `${evaluationResult.metrics.mape.toFixed(2)} %`
            : "N/A"}
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
          Mide el error promedio en porcentaje{'\n'}'N/A' si los valores reales son cero.
        </Typography>
      </Paper>
    </Grid>
  </Grid>
  </Box>   

      {/* SECCIÓN DE GRÁFICOS CORREGIDA */}

                    <Box sx={{ mt: 5 }}>  
                       <Box sx={{ mt: 5 }}>
                        <Typography variant="h6" gutterBottom>
                         Visualizacion
                        </Typography>
                        </Box>  
                    <Grid container spacing={3} sx={{ mt: 2 }}>
                        {/* Gráfico de Dispersión */}
                        <Grid  xs={12} lg={4}>
                            {scatterData ? (
                                <RegressionScatterPlot actual={scatterData.actual} predicted={scatterData.predicted} />
                            ) : (
                                <Alert severity='warning'>No hay datos para el gráfico de dispersión.</Alert>
                            )}
                        </Grid>

                        {/* Histograma de Errores */}
                        <Grid xs={12} lg={4}>
                            {errorHistogramData ? (
                                <ErrorHistogram errors={errorHistogramData} />
                            ) : (
                                <Alert severity='warning'>No hay datos para el histograma.</Alert>
                            )}
                        </Grid>

                        {/* Box Plot de Errores */}
                        <Grid  xs={12} lg={4}>
                            {errorHistogramData ? (
                                <ErrorBoxPlot errors={errorHistogramData} />
                            ) : (
                                <Alert severity='warning'>No hay datos para el box plot.</Alert>
                            )}
                        </Grid>
                    </Grid>
                     </Box>   
                </>
            )}
        </Box>
    )}
</Paper> 

<DatasetSelectorModal
    open={isModalOpen}
    onClose={() => setModalOpen(false)}
    onDatasetSelect={handleDatasetSelected}
/>
</>
);
 }
            