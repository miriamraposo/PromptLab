// RUTA: src/components/analysis/SensitivityAnalysis.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    Box, Typography, FormControl, InputLabel, Select, MenuItem, Button, TextField, 
    CircularProgress, Alert, Paper, Slider, Grid, Card, CardContent, Stack,
    CardActions, Divider, Avatar
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import FunctionsIcon from '@mui/icons-material/Functions';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';


const SummaryCard = ({ title, value, icon, color, explanation }) => (
   <Grid size={{ xs: 12,  md: 6 }} >
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,           // bordes redondeados
        boxShadow: 3,              // sombra inicial
        transition: '0.3s',        // transición suave
        "&:hover": {
          boxShadow: 6,            // sombra más intensa al pasar el mouse
          transform: 'translateY(-4px)', // efecto flotante
        },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.dark` }}>
          {icon}
        </Avatar>
        <Box>
          <Typography color="text.secondary" variant="body2">{title}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {typeof value === 'number' ? value.toFixed(4) : '...'}
          </Typography>
        </Box>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, flexGrow: 1 }}>
        {explanation}
      </Typography>
    </Paper>
  </Grid>
);



export default function SensitivityAnalysis({ model }) {
    // --- LÓGICA (SIN CAMBIOS) ---
    const [featureToVary, setFeatureToVary] = useState('');
    const [baseDataPoint, setBaseDataPoint] = useState({});
    const [simulationRange, setSimulationRange] = useState([50, 150]);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const numericFeatures = useMemo(() => model.features.filter(f => f.type === 'numeric'), [model.features]);
    const otherFeatures = useMemo(() => model.features.filter(f => f.name !== featureToVary), [model.features, featureToVary]);
    const [rangeError, setRangeError] = useState('');
    // ===========================================================================
    // === SOLUCIÓN 1: CÁLCULO DE ESTADÍSTICAS EN EL FRONTEND                  ===
    // ===========================================================================
    // Usamos useMemo para calcular las estadísticas solo cuando chartData cambia.
    // Esto soluciona el problema de 'NaN' y los datos vacíos.

    const handleRangeChange = (type, value) => {
    // Convertimos el valor del input (que es un string) a un número
    const numericValue = value === '' ? '' : parseFloat(value);

    if (type === 'start') {
        setSimulationRange([numericValue, simulationRange[1]]);
    } else { // 'end'
        setSimulationRange([simulationRange[0], numericValue]);
    }
};

    const summaryStats = useMemo(() => {
        if (!chartData?.sensitivity_results || chartData.sensitivity_results.length === 0) {
            return { min: null, max: null, avg: null, impact: null };
        }
        const predictions = chartData.sensitivity_results.map(d => d.prediction);
        const min = Math.min(...predictions);
        const max = Math.max(...predictions);
        const avg = predictions.reduce((sum, val) => sum + val, 0) / predictions.length;
        const impact = max - min;
        return { min, max, avg, impact };
    }, [chartData]);


    useEffect(() => {
        const initialValues = {};
        model.features.forEach(feature => {
            initialValues[feature.name] = feature.type === 'numeric' ? 0 : feature.options?.[0] || '';
        });
        setBaseDataPoint(initialValues);
        
        setFeatureToVary('');
        setChartData(null);
        setError(null);
    }, [model.id, model.features]);


    useEffect(() => {
    const [start, end] = simulationRange;
    // Si ambos campos tienen un número y el inicio es mayor o igual al final...
    if (typeof start === 'number' && typeof end === 'number' && start >= end) {
        setRangeError('El mínimo debe ser menor que el máximo.');
    } else {
        setRangeError(''); // Si es válido, limpiamos el error
    }
}, [simulationRange]);


    const handleFeatureToVaryChange = (event) => {
        setFeatureToVary(event.target.value);
        setChartData(null);
        setError(null);
    };

    const handleBaseDataChange = (featureName, value) => {
        setBaseDataPoint(prev => ({ ...prev, [featureName]: value }));
    };

    const handleRunAnalysis = async () => {
        setLoading(true); setError(null); setChartData(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No estás autenticado.");

            const cleanedBaseDataPoint = {};
            for (const key in baseDataPoint) {
                cleanedBaseDataPoint[key.trim()] = baseDataPoint[key];
            }

            const payload = {
                feature_to_vary: featureToVary.trim(),
                variation_range: { start: simulationRange[0], end: simulationRange[1], steps: 30 },
                base_data_point: cleanedBaseDataPoint
            };
            
           

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${model.id}/sensitivity`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Ocurrió un error en el análisis.');
            setChartData(result.data);

        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };


    
 

  return (
   <Box
    sx={{
      display: 'flex', 
      flexDirection: { xs: 'column', md: 'row' }, // columna en móvil, fila en desktop
      gap: 5, // espacio entre las columnas
    }}
  >
    {/* === COLUMNA IZQUIERDA: CONTROLES --- CON BOX === */}
    <Box
      sx={{
        width: { xs: '100%', md: '33%' }, 
        minWidth: 0,
      }}
    >
  <Stack spacing={2} sx={{ height: '100%' }}>
    <Box sx={{ p: 5 }}>
      <Typography variant="h6" sx={{ fontSize: '1.1rem', color: 'white' }}>
        Simulador Interactivo
      </Typography>
      <Typography variant="body1" sx={{ mb: 1, color: 'white', mt: 3 }}>
        Selecciona una característica,
        establece un escenario inicial
        y simula los resultados.
      </Typography>
    </Box>

    <Paper
      elevation={2}
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'primary.main',
        boxShadow: 3,
        transition: '0.3s',
        backgroundColor: 'background.paper',
        "&:hover": {
          boxShadow: 6,
          transform: "translateY(-2px)",
        },
      }}
    >
      <Typography
        variant="subtitle1"
        color="text.primary"
        sx={{ fontWeight: 'bold', mb: 1.5 }}
      >
        Paso 1: Selección de la característica a simular
      </Typography>
      <FormControl fullWidth size="small">
        <InputLabel>Característica Numérica</InputLabel>
        <Select
          value={featureToVary}
          label="Característica Numérica"
          onChange={handleFeatureToVaryChange}
        >
          {numericFeatures.map(feature => (
            <MenuItem key={feature.name} value={feature.name}>
              {feature.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>

    {featureToVary && (
      <>
        <Paper
          elevation={2}
          sx={{
            p: 2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'primary.main',
            boxShadow: 3,
            transition: '0.3s',
            backgroundColor: 'background.paper',
            "&:hover": {
              boxShadow: 6,
              transform: "translateY(-2px)",
            },
          }}
        >
          <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 'bold', mb: 1.5 }}>
            Paso 2: Escenario Base
          </Typography>
          <Box sx={{ maxHeight: 300, overflowY: 'auto', pr: 1 }}>
            {otherFeatures.map(feature => (
              <Box key={feature.name} sx={{ mb: 2 }}>
                {feature.options ? (
                  <FormControl fullWidth size="small">
                    <InputLabel>{feature.name}</InputLabel>
                    <Select
                      label={feature.name}
                      value={baseDataPoint[feature.name] || ""}
                      onChange={(e) => handleBaseDataChange(feature.name, e.target.value)}
                    >
                      {feature.options.map(option => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    fullWidth
                    type="number"
                    label={feature.name}
                    size="small"
                    value={baseDataPoint[feature.name] || ""}
                    onChange={(e) => handleBaseDataChange(feature.name, e.target.value)}
                  />
                )}
              </Box>
            ))}
          </Box>
        </Paper>

        <Card elevation={2} sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 2, flexShrink: 0, p: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 'bold', mb: 2 }}>
              Paso 3: Definir el Rango de Simulación
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Introducir los valores mínimo y máximo para <strong>{featureToVary}</strong>:
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                type="number"
                label="Valor Mínimo"
                size="small"
                value={simulationRange[0]}
                onChange={(e) => handleRangeChange('start', e.target.value)}
                error={!!rangeError}
                helperText={rangeError}
              />
              <TextField
                fullWidth
                type="number"
                label="Valor Máximo"
                size="small"
                value={simulationRange[1]}
                onChange={(e) => handleRangeChange('end', e.target.value)}
                error={!!rangeError}
              />
            </Box>
          </CardContent>

          <Divider />

          <CardActions sx={{ justifyContent: 'center', p: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ScienceIcon />}
              onClick={handleRunAnalysis}
              disabled={
                loading ||
                !featureToVary ||
                !!rangeError ||
                simulationRange.includes('')
              }
            >
              {loading ? "Analizando..." : "Ejecutar Simulación"}
            </Button>
          </CardActions>
        </Card>
      </>
    )}
  </Stack>
</Box>

           {/* === COLUMNA DERECHA: RESULTADOS --- CON BOX === */}
<Box
  sx={{
    width: { xs: '100%', md: '67%' }, // equivalente a xs=12 y md=7
    minWidth: 0,
  }}
>
  <Paper
    sx={{
      p: 5,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      overflowX: 'auto',
      borderRadius: 3,
    }}
  >
    <Typography
      variant="h6"
      sx={{
        fontSize: '1.1rem',
        mb: 3,
        mt: 2,
        textAlign: 'center',
      }}
    >
      Resultado de la Simulación
    </Typography>

    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

    {loading ? (
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Realizando simulación...</Typography>
      </Box>
    ) : chartData ? (
      <Stack spacing={3}>
        <Alert severity="info" icon={<ScienceIcon fontSize="inherit" />} sx={{ mb: 2, textAlign: 'center' }}>
          <Typography variant="body2" component="span" sx={{ display: 'block' }}>
            Este gráfico muestra cómo cambia la <strong>predicción</strong> al modificarse los valores
            de la columna seleccionada:
          </Typography>
          <Typography variant="body2" component="span" sx={{ display: 'block' }}>
            <strong>{chartData.feature_analyzed}</strong>.
          </Typography>
        </Alert>

        <Box sx={{ flexGrow: 1, minHeight: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.sensitivity_results} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="feature_value" name={chartData.feature_analyzed} />
              <YAxis />
              <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(4) : value} />
              <Legend />
              <Line type="monotone" dataKey="prediction" name="Predicción" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        <Box>
          <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1rem' }}>Resumen</Typography>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ flex: '1 1 100%', maxWidth: { sm: 'calc(50% - 8px)' } }}>
              <SummaryCard
                title="Predicción Mínima"
                value={summaryStats.min}
                icon={<ArrowDownwardIcon />}
                color="error"
                explanation={<>Es el resultado más bajo que <br /> se obtuvo al variar "{chartData.feature_analyzed}".</>}
              />
            </Box>

            <Box sx={{ flex: '1 1 100%', maxWidth: { sm: 'calc(50% - 8px)' } }}>
              <SummaryCard
                title="Predicción Máxima"
                value={summaryStats.max}
                icon={<ArrowUpwardIcon />}
                color="success"
                className="bg-white shadow-md hover:shadow-xl rounded-2xl p-4 transition-all duration-300"
                explanation={<>Es el valor más alto que alcanzó <br /> la predicción durante la simulación.</>}
              />
            </Box>

            <Box sx={{ flex: '1 1 100%', maxWidth: { sm: 'calc(50% - 8px)' } }}>
              <SummaryCard
                title="Predicción Promedio"
                value={summaryStats.avg}
                icon={<FunctionsIcon />}
                color="info"
                className="bg-white shadow-md hover:shadow-xl rounded-2xl p-4 transition-all duration-300"
                explanation={<>Representa el valor central o el más<br /> probable de todos los resultados.</>}
              />
            </Box>

            <Box sx={{ flex: '1 1 100%', maxWidth: { sm: 'calc(50% - 8px)' } }}>
              <SummaryCard
                title="Impacto de la Variable"
                value={summaryStats.impact}
                icon={<CompareArrowsIcon />}
                color="warning"
                explanation={<> Un valor alto significa que esta <br /> variable es muy influyente.</>}
              />
            </Box>
          </Box>
        </Box>
      </Stack>
    ) : (
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 3,
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          backgroundColor: 'grey.50',
        }}
      >
        <Typography color="body1">
          Una vez ejecutada la simulación, los resultados se presentaran en este panel <br />
          para ser analizados fácilmente.
        </Typography>
      </Box>
    )}
  </Paper>
  </Box>

  </Box>
);
}