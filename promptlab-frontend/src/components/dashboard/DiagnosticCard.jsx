
// src/components/dashboard/DiagnosticCard.jsx (VERSIÓN CORREGIDA Y ORDENADA)

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Divider, Button, Stack, Alert, Paper } from '@mui/material'; // <-- Añadí Paper que faltaba en tu import original
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// --- PASO 1: DEFINIR TODOS LOS COMPONENTES AYUDANTES EN EL NIVEL SUPERIOR ---

const StatLine = ({ label, value, unit = '' }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
        <Typography variant="body2" color="text.secondary">{label}:</Typography>
        <Typography variant="body1" fontWeight="bold">
            {value}
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>{unit}</Typography>
        </Typography>
    </Box>
);
StatLine.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    unit: PropTypes.string,
};


// ✅ ¡CORREGIDO! DiagnosticStat ahora está afuera, en el nivel superior.
function DiagnosticStat({ label, value, detail }) {
    return (
        <Box 
            sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                py: 1,               
                   
            }}
        >
            <Typography variant="body2" color="text.secondary">
                {label}
            </Typography>
            <Box textAlign="right">
                <Typography variant="body2" component="p" fontWeight="bold">
                    {value}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                    {detail}
                </Typography>
            </Box>
        </Box>
    );
}

const TabularDiagnostics = ({ data, onClean }) => {
      
    const summary = data?.summary;
    if (!summary) return <Typography variant="caption" color="text.secondary">Esperando datos...</Typography>;
      
    const {
        duplicates = { count: 0, percentage: "0.00" },
        nanValues = { totalCount: 0, percentage: "0.00" },
        totalRows = 'N/A',
        totalColumns = 'N/A'
    } = summary;
    
    const nanPercentageNum = parseFloat(nanValues.percentage);
    const isClean = duplicates.count === 0 && nanValues.totalCount === 0;
    
    const handleClean = (action) => onClean({ action });

    if (isClean) {
        return (
  <Box sx={{ textAlign: 'center', p: 1.5 }}>
    <CheckCircleOutlineIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
    <Typography variant="h6" gutterBottom>
      ¡Dataset Limpio!
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      No se detectaron duplicados ni valores faltantes.
    </Typography>
    <Alert severity="warning" variant="outlined">
       Se recomienda inspeccionar las columnas para detectar valores fuera de rango (outliers) o datos erróneos.
    </Alert>
  </Box>
);
    }
    
    // ✅ Ahora el return de TabularDiagnostics usa la función DiagnosticStat que está definida fuera.
    return (
    <Stack spacing={1}>
        <Box // <--- ESTE BOX EXTERNO ES EL PROBLEMA
            sx={{
                height: 'auto',
                maxHeight: '90vh',
                overflowY: 'visible',
                overflow: 'visible',
                pr: 1,                    
            }}
        >
           
    </Box>
    
            <Box>
               <Typography variant="body1"  color="error.main" sx={{ fontWeight: 'bold' }}>
                    Problemas Detectados
                </Typography>
                <Stack spacing={0} 
                 sx={{
                 mt: 1,
                 border: '1px solid red',
                 borderRadius: 1, // para bordes redondeados opcional
                 p: 1, // un poco de padding para que el contenido no quede pegado al borde
                 }}>
                    {duplicates.count > 0 && (
                       <Paper variant="outlined" sx={{ px: 1, py: 0, mt: 0 }}>
                            <DiagnosticStat label="Registros Duplicados" value={duplicates.count} />
                            <DiagnosticStat label="Porcentaje Duplicados del total de Registros" value={duplicates.percentage} />
                            <Alert severity="info" sx={{ fontSize: '0.8rem', mt: 0 }}>
                                Se recomienda eliminar duplicados para evitar sesgos.
                            </Alert>
                        </Paper>
                    )}
                    {nanValues.totalCount > 0 && (
                         <Paper variant="outlined" sx={{ px: 1, py: 0, mt: 0}}>
                            <DiagnosticStat label="Valores Faltantes (NaN)" value={nanValues.totalCount} />
                            <DiagnosticStat label="Porcentajes Valores (NaN)" value={nanValues.percentage} />

                            <Alert severity={nanPercentageNum > 5 ? 'warning' : 'info'} sx={{ fontSize: '0.8rem', mt: 0 }}>
                                {nanPercentageNum > 5 ? (
                                   <span><strong></strong> Posible impacto en la calidad del análisis.</span>
                                ) : ( "Se sugiere eliminar, el impacto en el análisis es mínimo." )}
                            </Alert>
                        </Paper>
                    )}
                </Stack>
            </Box>
            {(duplicates.count > 0 || nanValues.totalCount > 0) && (
                <Box>
                    <Stack spacing={1.1} sx={{ mt: 1 }}>
                        {duplicates.count > 0 && (
                            <Button fullWidth size="small" variant="contained"  color="primary" onClick={() => handleClean('general_delete_duplicates')}>
                                Eliminar {duplicates.count} Duplicados
                            </Button>
                        )}
                        {nanValues.totalCount > 0 && (
                            <Button fullWidth size="small" variant="contained"  color="primary" onClick={() => handleClean('general_delete_rows_with_nulls')}>
                                Eliminar Filas con Valores Nulos
                            </Button>
                            
                        )}
                    </Stack>
                    
                </Box>
            )}
        </Stack>
        
    );
};
TabularDiagnostics.propTypes = {
    data: PropTypes.object,
    onClean: PropTypes.func,
};


// --- PASO 2: EL COMPONENTE PRINCIPAL QUE SE EXPORTA ---
export default function DiagnosticCard({ data, fileType, onClean }) {
    if (!data || !fileType) {
        return <Typography color="text.secondary">Cargando diagnóstico...</Typography>;
    }

    const renderDiagnostics = () => {
        switch (fileType) {
            case 'tabular':
            case 'csv':
            case 'xlsx':
            case 'parquet':
                return <TabularDiagnostics data={data} onClean={onClean} />;
            default:
                return <Alert severity="info">El diagnóstico avanzado solo está disponible para archivos tabulares.</Alert>;
        }
    };

    return (
        <Box>
            {renderDiagnostics()}
        </Box>
    );
}
DiagnosticCard.propTypes = {
    data: PropTypes.object,
    fileType: PropTypes.string,
    onClean: PropTypes.func,
};