// RUTA: src/components/analysis/InteractiveTools.jsx (VERSIÓN FINAL CON 3 PESTAÑAS)

import React, { useState } from 'react';
import { Paper, Box, Tabs, Tab, Typography } from '@mui/material'; // Añadimos Typography
import ScienceIcon from '@mui/icons-material/Science';
import BackupTableIcon from '@mui/icons-material/BackupTable';
import RuleFolderIcon from '@mui/icons-material/RuleFolder'; // Nuevo icono para la tercera pestaña

import SensitivityAnalysis from './SensitivityAnalysis';
import BatchPrediction from './BatchPrediction';
import EvaluateModel from './EvaluateModel'; 


// Componente helper (sin cambios)
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index} // Oculta el panel si no está activo
      id={`tabpanel-${index}`} // Un ID único para el panel
      aria-labelledby={`tab-${index}`} // Se vincula al ID de la Tab
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}> {/* Un poco de padding para el contenido */}
          {children}
        </Box>
      )}
    </div>
  );
}

// =================== ¡AQUÍ ESTÁ EL CAMBIO 1! ===================
export default function InteractiveTools({ model, projectId }) { 
// =============================================================
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',background: "linear-gradient(135deg, #26717a, #44a1a0)",   }}>
      
      <Box sx={{ borderBottom: 1, flexShrink: 0, px: 3, background:'white'  }}>
       <Tabs
  value={activeTab}
  onChange={handleTabChange}
  aria-label="interactive tools tabs"
>
  <Tab 
    icon={<ScienceIcon />} 
    iconPosition="start" 
    label="Análisis de Sensibilidad" 
    aria-controls="tabpanel-0"
    id="tab-0" 
  />
  <Tab 
    icon={<BackupTableIcon />} 
    iconPosition="start" 
    label="Predicción por Lotes" 
    aria-controls="tabpanel-1"
    id="tab-1"
  />
  <Tab 
    icon={<RuleFolderIcon />}
    iconPosition="start"
    label="Evaluar el Rendimiento"
    aria-controls="tabpanel-2"
    id="tab-2"
  />
</Tabs>

      </Box>

      {/* Pestaña 1: Análisis de Sensibilidad */}
      <TabPanel value={activeTab} index={0}>
        <SensitivityAnalysis model={model} />
      </TabPanel>
      
      {/* Pestaña 2: Predicción por Lotes */}
      <TabPanel value={activeTab} index={1}>
        {/* =================== ¡AQUÍ ESTÁ EL CAMBIO 2! =================== */}
        {/* Ahora la prop projectId se pasa correctamente */}
        <BatchPrediction model={model} projectId={projectId} />
        {/* ============================================================= */}
      </TabPanel>

      {/* Pestaña 3: Probar con otro Dataset (Placeholder) */}
      <TabPanel value={activeTab} index={2}>
        <EvaluateModel model={model} projectId={projectId} />
      </TabPanel>
      
    </Paper>
  );
}