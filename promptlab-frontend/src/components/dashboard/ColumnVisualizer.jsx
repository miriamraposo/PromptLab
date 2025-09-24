


import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import {
  Box,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

// Componente interno para mostrar un gráfico
const PlotlyChart = ({ plotSpec }) => {
  if (!plotSpec || !plotSpec.data || !plotSpec.layout) {
    return <Alert severity="warning">La especificación del gráfico está incompleta.</Alert>;
  }

  return (
    <Plot
      data={plotSpec.data}
      layout={{ ...plotSpec.layout, autosize: true }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler={true}
      config={{ responsive: true }}
    />
  );
};

const ColumnVisualizer = ({ analysisType, columnName }) => {
  const { datasetId } = useParams();

  const [modalOpen, setModalOpen] = useState(false);
  const [plotConfig, setPlotConfig] = useState(null); // { plot_type, params }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plotSpec, setPlotSpec] = useState(null);

  // Función para precargar gráfico al hacer hover (preload)
  const preloadChart = (type, params) => {
    setPlotConfig({ plot_type: type, params });
  };

  useEffect(() => {
    if (!plotConfig) return;

    const fetchChart = async () => {
      setLoading(true);
      setError(null);
      setPlotSpec(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error('Sesión no válida.');

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/visualize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(plotConfig),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || `Error del servidor (${response.status})`);
        }

        // Parseamos la especificación del gráfico recibida
        setPlotSpec(JSON.parse(result.plot_spec));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
  }, [plotConfig, datasetId]);

  const handleOpenModal = (type, params = {}) => {
    setPlotConfig({ plot_type: type, params });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setPlotConfig(null);
    setPlotSpec(null);
    setError(null);
  };

  // Define qué gráficos mostrar según el tipo de análisis
  const getChartOptions = () => {
    switch (analysisType) {
      case 'numeric':
        return [
          { label: 'Histograma', type: 'histogram', params: { x: columnName, title: `Distribución de ${columnName}` } },
          { label: 'Box Plot', type: 'boxplot', params: { y: columnName, title: `Diagrama de Caja de ${columnName}` } },
          { label: 'Gráfico de Violín', type: 'violin', params: { y: columnName, title: `Distribución de Violín de ${columnName}` } },
        ];
      case 'categorical':
        return [
          { label: 'Gráfico de Barras', type: 'bar', params: { x: columnName, title: `Frecuencia en ${columnName}` } },
          { label: 'Gráfico Circular', type: 'pie', params: { x: columnName, title: `Proporción en ${columnName}` } },
        ];
      default:
        return [];
    }
  };

  const chartOptions = getChartOptions();

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="body1" gutterBottom>
        Opciones de Visualización
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Selecciona un tipo de gráfico para explorar la columna '{columnName}'.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {chartOptions.length > 0 ? (
          chartOptions.map(opt => (
            <Button
    key={opt.type}
    variant="contained"
    fullWidth // Aprovechamos para añadir esto que discutimos
    
    // --- INICIO DE LA MODIFICACIÓN ---
    // Eliminamos el onMouseEnter.
    // El onClick ahora hace las DOS cosas: configurar y abrir.
    onClick={() => handleOpenModal(opt.type, opt.params)} 
    // --- FIN DE LA MODIFICACIÓN ---
>
    {opt.label}
</Button>
          ))
        ) : (
          <Chip label="No hay visualizaciones sugeridas para este tipo de dato." color="default" />
        )}
      </Box>

      <Dialog open={modalOpen} onClose={handleCloseModal} fullWidth maxWidth="lg">
        <DialogTitle>Visualización: {plotConfig?.params.title || 'Gráfico'}</DialogTitle>
        <DialogContent sx={{ height: '70vh' }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Generando gráfico...</Typography>
            </Box>
          )}
          {error && <Alert severity="error">Error: {error}</Alert>}
          {plotSpec && <PlotlyChart plotSpec={plotSpec} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ColumnVisualizer;


