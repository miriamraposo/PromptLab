// src/components/dashboard/ResultsModal.jsx

import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button,  Accordion, AccordionSummary, AccordionDetails ,
  Typography, Box, Paper, Divider, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,TextField, 
  CircularProgress,
} from '@mui/material';
import FeatureImportanceChart from './FeatureImportanceChart'; // Asegúrate que la ruta sea correcta
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // <-- Y ESTE
import ConfusionMatrixChart from './ConfusionMatrixChart'; 
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import PredictionScatterPlot from './PredictionScatterPlot'; 




// --- COMPONENTE REUTILIZABLE PARA MÉTRICAS (Este estaba perfecto) ---
function MetricDisplay({ title, value, subtitle }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', height: '100%' }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
        {title}
      </Typography>
      <Typography variant="h4" component="p" fontWeight="bold" sx={{ my: 1 }}>
        {value ?? '—'} 
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ minHeight: '3em' }}>
        {subtitle}
      </Typography>
    </Paper>
  );
}

// --- COMPONENTE PRINCIPAL (VERSIÓN CORREGIDA Y COMPLETA) ---
export default function ResultsModal({ open, onClose, results, problemType, initialProjectName, initialModelName, onSave, targetColumn }) {
  console.log("DATOS RECIBIDOS POR EL MODAL:", results);

  // --- CAMBIO 2: Usar useState y useEffect como funciones ---
  const [isSaving, setIsSaving] = useState(false);
  const [projectName, setProjectName] = useState(initialProjectName || '');
  const [modelName, setModelName] = useState(initialModelName || '');
  const accuracy = results.classification_report?.accuracy; 
  const reportData = results.classification_report || {};
  const classLabels = Object.keys(reportData).filter(
    key => !['accuracy', 'macro avg', 'weighted avg'].includes(key)
  );
  // --------------------------------------------------------

  if (!results) return null; 

  // Sincroniza los nombres si las props iniciales cambian
  useEffect(() => {
    setProjectName(initialProjectName || '');
    setModelName(initialModelName || '');
  }, [initialProjectName, initialModelName]);


  // === NUEVA FUNCIÓN para manejar el click en Guardar ===
  const handleSaveClick = async () => {
    setIsSaving(true);
    const success = await onSave(projectName, modelName);
    // Si la función onSave (que vive en el padre) devuelve true,
    // significa que se guardó y podemos cerrar. Si no, nos quedamos
    // en el modal para que el usuario corrija (ej. un nombre duplicado).
    if (success) {
      onClose(); // Cierra el modal
    }
    setIsSaving(false);
  };
  

  // --- RENDERIZADO PARA CLASIFICACIÓN ---
const renderClassificationResults = () => (
    <Grid container spacing={2} sx={{ mb: 4 }}>
      <Grid item xs={12} md={6}>
        <MetricDisplay 
          title="Precisión General"
          value={accuracy ? `${(accuracy * 100).toFixed(1)}%` : 'N/A'}
          subtitle="Porcentaje de aciertos totales sobre datos de prueba."
        />
      </Grid>
      <Grid item xs={12} md={6}>
          <MetricDisplay 
            title="Fiabilidad del Modelo (CV)"
            value={results.cv_mean_score ? `${(results.cv_mean_score * 100).toFixed(1)}%` : 'N/A'}
            subtitle="Rendimiento promedio al validar el modelo."
          />
      </Grid>
    </Grid>
  );


  

   const renderRegressionResults = () => {
  return (
    <Grid container spacing={2}>
      {/* --- TARJETA DE CALIDAD DEL MODELO (R²) --- */}
      <Grid item xs={12} md={6}>
        <MetricDisplay 
          title="Calidad del Modelo (R²)"
          value={results.r2_score?.toFixed(3)}
          subtitle={
            <Typography variant="body2" sx={{ fontSize: '0.80rem', lineHeight: 1.3 }}>
              Mide qué tan bien se ajustan las predicciones. <br />
              <b>Valores cercanos a 1 indican un mejor desempeño del modelo.</b> <br />
              <b>Un valor negativo indica un mal ajuste.</b>
            </Typography>
          }
        />
      </Grid>

      {/* --- TARJETA DE MARGEN DE ERROR (RMSE) --- */}
      <Grid item xs={12} md={6}>
        <MetricDisplay 
          title="Error Promedio de Predicción"
          value={results.rmse?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
         subtitle={
  <Typography variant="body2" sx={{ fontSize: '0.80rem', lineHeight: 1.3 }}>
    En promedio, las predicciones de <b>"{targetColumn}"</b> se desvían por este valor. <br/>
    <b>Valores cercanos a 0 indican un mejor desempeño del modelo.</b>
  </Typography>
}
        />
      </Grid>
    </Grid>
  );
};



  const renderFeatureExplanation = () => {
    if (!results.feature_importance_chart_data || Object.keys(results.feature_importance_chart_data).length === 0) {
        return null;
    }

    const topFeatures = Object.entries(results.feature_importance_chart_data)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5); // Tomamos las 5 más importantes

    return (
      <Box sx={{ mb: 2 }}> {/* Añadimos margen inferior para separar del gráfico */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            El modelo prioriza estas características para hacer sus predicciones, en orden de importancia:
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Variable</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Importancia</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topFeatures.map(([name, score], index) => (
                <TableRow key={name}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell component="th" scope="row">
                    {name.replace('num__', '').replace('cat__', '')}
                  </TableCell>
                  <TableCell align="right">{score.toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
};



// --- NUEVA FUNCIÓN AUXILIAR 2: Matriz de Confusión ---
const renderConfusionMatrix = () => {
  if (!results.confusion_matrix || !results.confusion_matrix_labels) return null;

  return (
    <Box sx={{ mt: 4 }}>
      <Accordion sx={{ bgcolor: '#BBDEFB', boxShadow: 3 }}> {/* fondo azul claro y sombra */}
  <AccordionSummary
    expandIcon={<ExpandMoreIcon sx={{ color: '#0D47A1' }} />}
    sx={{ bgcolor: '#64B5F6', px: 2 }}  // fondo un poco más oscuro que el detalle
  >
    <Typography
      sx={{
        fontSize: '1.4rem',
        fontWeight: 900,
        color: '#000000',
      }}
    >
      Análisis de Aciertos y Errores (Avanzado)
    </Typography>
  </AccordionSummary>

  <AccordionDetails sx={{ bgcolor: '#E3F2FD', p: 2 }}>
    <Box sx={{ height: 350 }}>
      <ConfusionMatrixChart 
        data={results.confusion_matrix} 
        labels={results.confusion_matrix_labels}
      />
    </Box>

    <Typography
      sx={{
        mt: 2,
        fontSize: '1.25rem',
        fontWeight: 800,
        color: '#000000',
        lineHeight: 1.6,
      }}
    >
      Este gráfico muestra en qué acertó y en qué se equivocó el modelo. 
      Lee el eje "Valor Real" y compáralo con la "Predicción del Modelo". 
      Los números más altos en la diagonal (de arriba izquierda a abajo derecha) son aciertos.
    </Typography>
  </AccordionDetails>
</Accordion>
    </Box>
  );
};

   const renderFeatureImportanceTable = () => {
    if (!results.feature_importance_chart_data || Object.keys(results.feature_importance_chart_data).length === 0) {
        return null;
    }

    // Convertimos el objeto a un array, lo ordenamos, PERO NO LO CORTAMOS
    const allFeatures = Object.entries(results.feature_importance_chart_data)
      .sort(([, a], [, b]) => b - a); // Ordena de mayor a menor importancia

    return (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}> {/* Añadimos maxHeight para scroll */}
          <Table stickyHeader size="small"> {/* stickyHeader para que los títulos se queden fijos al hacer scroll */}
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Variable</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Importancia</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allFeatures.map(([name, score], index) => (
                <TableRow key={name}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell component="th" scope="row">
                    {/* Limpiamos los prefijos para que sea más legible */}
                    {name.replace('num__', '').replace('cat__', '')}
                  </TableCell>
                  <TableCell align="right">{score.toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
    );
};



return (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle fontWeight="bold">
      ¡Entrenamiento Exitoso! - Resultados del Modelo de{" "}
      {problemType === "classification" ? "Clasificación" : "Regresión"}
    </DialogTitle>

    <Divider />

    <DialogContent>
      {/* --- SECCIÓN 1: Cards de Métricas --- */}
      <Typography variant="h6" gutterBottom>
        {results.model_name}
      </Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {problemType === "clasificacion"
          ? renderClassificationResults()
          : renderRegressionResults()}
      </Grid>

      {/* --- SECCIÓN 2: ACORDEONES UNIFORMES --- */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
        
        {/* === CLASIFICACIÓN === */}
        {problemType === "clasificacion" && (
          <>
            {/* 1. Rendimiento por Categoría */}
            <Accordion sx={{ bgcolor: "primary.light" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}>
                <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                  Rendimiento por Categoría
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: "bold" }}>Categoría</TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>Precisión</TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>Recall</TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>F1-Score</TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>Nº Casos</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {classLabels.map(label => {
                        const metrics = reportData[label];
                        return (
                          <TableRow key={label}>
                            <TableCell component="th" scope="row">{label}</TableCell>
                            <TableCell align="right">{(metrics.precision * 100).toFixed(1)}%</TableCell>
                            <TableCell align="right">{(metrics.recall * 100).toFixed(1)}%</TableCell>
                            <TableCell align="right">{(metrics["f1-score"] * 100).toFixed(1)}%</TableCell>
                            <TableCell align="right">{metrics.support}</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow sx={{ "& td, & th": { borderTop: "2px solid rgba(224, 224, 224, 1)" } }}>
                        <TableCell component="th" scope="row" sx={{ fontWeight: "bold" }}>Promedio Ponderado</TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>{(reportData["weighted avg"]?.precision * 100).toFixed(1)}%</TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>{(reportData["weighted avg"]?.recall * 100).toFixed(1)}%</TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>{(reportData["weighted avg"]?.["f1-score"] * 100).toFixed(1)}%</TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>{reportData["weighted avg"]?.support}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>

            {/* 2. Factores Más Influyentes */}
            {results.feature_importance_chart_data && (
   <Accordion sx={{ bgcolor: "primary.light" }}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
       <Typography variant="subtitle1" fontWeight={700} color="text.primary">actores Más Influyentes</Typography>
    </AccordionSummary>
    <AccordionDetails>
      {/* 1. La nueva tabla de resumen */}
      {renderFeatureExplanation()}

      {/* 2. El gráfico detallado */}
      <Paper variant="outlined" sx={{ height: 400, p: 1 }}>
        <FeatureImportanceChart data={results.feature_importance_chart_data} />
      </Paper>
    </AccordionDetails>
  </Accordion>
)}

            {/* 3. Matriz de Confusión */}
            {results.confusion_matrix && (
              <Accordion sx={{ bgcolor: "primary.light" }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    Análisis de Aciertos y Errores Avanzados
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ height: 350 }}>
                    <ConfusionMatrixChart 
                      data={results.confusion_matrix} 
                      labels={results.confusion_matrix_labels}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Este gráfico muestra en qué acertó y en qué se equivocó el modelo. Los números más altos en la diagonal son aciertos.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}
          </>
        )}

       {/* === REGRESIÓN === */}
        {problemType === "regresion" && (
          <>
            {results.feature_importance_chart_data && (
              <Accordion sx={{ bgcolor: "primary.light" }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                   <Typography variant="subtitle1" fontWeight={700} color="text.primary">Factores Más Influyentes</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {/* ¡AQUÍ ESTÁ EL CAMBIO! Llamamos a nuestra nueva función de tabla */}
                  {renderFeatureImportanceTable()}
                </AccordionDetails>
              </Accordion>
            )}

            {results.scatter_plot_data && (
              <Accordion sx={{ bgcolor: "primary.light" }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                   <Typography variant="subtitle1" fontWeight={700} color="text.primary">Análisis de Predicciones</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ height: 400 }}>
                    <PredictionScatterPlot data={results.scatter_plot_data} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Este gráfico compara los valores reales con los predichos. Una predicción perfecta se alinearía con la línea punteada.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}
          </>
        )}

        {/* === GUARDAR MODELO / INFORMACIÓN === */}
        <Accordion sx={{ bgcolor: "primary.light" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              Guardar Modelo / Información
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre del Proyecto"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre Descriptivo del Modelo"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  variant="outlined"
                  placeholder="Ej: LightGBM con SMOTE"
                  size="small"
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={onClose} color="inherit">
                Descartar
              </Button>
              <Button
                onClick={handleSaveClick}
                variant="contained"
                size="large"
                disabled={isSaving}
                startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{
                  bgcolor: '#1976d2',
                  color: '#ffffff',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#115293' },
                  boxShadow: 3,
                }}
              >
                {isSaving ? "Guardando..." : "Guardar Modelo"}
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

      </Box>
    </DialogContent>
  </Dialog>
);
}











 