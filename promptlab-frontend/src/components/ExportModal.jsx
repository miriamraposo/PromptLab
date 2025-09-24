// src/components/ExportModal.jsx
import React, { useState, useEffect } from 'react';
import { useSelection } from '../../context/SelectionContext';
import { useNotification } from '../../context/NotificationContext';
import { supabase } from '../supabaseClient';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';

import { SiPowerbi } from 'react-icons/si';
import { FcGoogle } from 'react-icons/fc';
import { MdEmail } from 'react-icons/md';
import { FaShareAlt } from 'react-icons/fa';
import ConnectionPrompt from './ConnectionPrompt'; 

// Configuración de destinos con URLs de n8n
const destinations = [
  { value: 'power_bi', label: 'Power BI', icon: <SiPowerbi size={20} />, url: `${import.meta.env.VITE_N8N_URL}/powerbi` },
  { value: 'drive', label: 'Google Drive', icon: <FcGoogle size={20} />, url: `${import.meta.env.VITE_N8N_URL}/drive` },
  { value: 'email', label: 'Email', icon: <MdEmail size={20} />, url: `${import.meta.env.VITE_N8N_URL}/email` },
  { value: 'social', label: 'Redes Sociales', icon: <FaShareAlt size={20} />, url: `${import.meta.env.VITE_N8N_URL}/social` },
];

export default function ExportModal({ onClose }) {
  const { selection } = useSelection();
  const { showNotification } = useNotification();
  const donationUrl = import.meta.env.VITE_DONATION_URL || "https://www.buymeacoffee.com/tuusuario";

  const [destination, setDestination] = useState('power_bi');
  const [destinationOptions, setDestinationOptions] = useState({
    power_bi: {},
    drive: {},
    email: {},
    social: {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState({}); // true/false por destino

  // Verificar conexiones activas desde n8n
  useEffect(() => {
    const fetchIntegrationStatus = async () => {
      try {
        const statusObj = {};
        for (const dest of destinations) {
          // Aquí podrías hacer una llamada a tu backend/n8n para chequear si el token/credencial existe
          // Por ejemplo: const res = await fetch(`${dest.url}/status`);
          // statusObj[dest.value] = res.ok;
          statusObj[dest.value] = true; // temporal: suponemos conectado
        }
        setIntegrationStatus(statusObj);
      } catch (err) {
        console.error("Error fetching integration status:", err);
      }
    };
    fetchIntegrationStatus();
  }, []);

  const handleDestinationChange = (event, newDestination) => {
    if (newDestination !== null) setDestination(newDestination);
  };

  const handleOptionChange = (e) => {
    const { name, value } = e.target;
    setDestinationOptions((prev) => ({
      ...prev,
      [destination]: { ...prev[destination], [name]: value },
    }));
  };

  const validateOptions = () => {
    const opts = destinationOptions[destination] || {};
    switch (destination) {
      case 'power_bi':
        if (!opts.datasetId) return "El ID del Conjunto de Datos es requerido.";
        if (!opts.tableName) return "El Nombre de la Tabla es requerido.";
        return true;
      case 'drive':
        if (!opts.folderId) return "Debes indicar el ID de la carpeta en Google Drive.";
        return true;
      case 'email':
        if (!opts.to) return "El destinatario es requerido.";
        if (!/\S+@\S+\.\S+/.test(opts.to)) return "Por favor, introduce un email válido.";
        return true;
      case 'social':
        if (!opts.platform) return "La plataforma es requerida.";
        if (!opts.message) return "El mensaje de la publicación no puede estar vacío.";
        return true;
      default:
        return "Selecciona un destino válido antes de exportar.";
    }
  };

  const exportDataset = async (datasetId, exportConfig) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no válida. Por favor, inicia sesión de nuevo.");

      const downloadUrl = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/download`;
      const fileResponse = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!fileResponse.ok) throw new Error("No se pudo descargar el dataset.");
      const fileBlob = await fileResponse.blob();

      let filename = 'dataset-exportado.bin';
      const contentDisposition = fileResponse.headers.get('content-disposition');
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match?.[1]) filename = match[1];
      }

      const formData = new FormData();
      formData.append('file', fileBlob, filename);
      formData.append('exportConfig', JSON.stringify(exportConfig));

      const exportUrl = `${import.meta.env.VITE_API_URL}/api/v1/export`;
      const exportResponse = await fetch(exportUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const result = await exportResponse.json();
      if (!exportResponse.ok) throw new Error(result.error || "Error en exportación");
      return result;
    } catch (err) {
      console.error("Error en exportDataset:", err);
      throw err;
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const validation = validateOptions();
      if (validation !== true) {
        showNotification(validation, "warning");
        return;
      }

      const exportConfig = {
        targets: [{ destination, options: destinationOptions[destination] }],
      };

      await exportDataset(selection.selectedDatasetId, exportConfig);

      onClose();
      showNotification("¡Proceso de exportación iniciado con éxito!", "success");

      // Donación discreta
      setTimeout(() => {
        showNotification(
          "¿Te gustó esta funcionalidad? Invitame un café ☕",
          "info",
          {
            autoHideDuration: 10000,
            action: (
              <Button
                size="small"
                color="inherit"
                onClick={() => window.open(donationUrl, "_blank")}
              >
                Donar
              </Button>
            ),
          }
        );
      }, 1500);

    } catch (error) {
      showNotification(error?.message || "Error al iniciar la exportación", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const renderOptionsForm = () => {
    const currentDest = destinations.find(d => d.value === destination);

    if (!integrationStatus[destination]) {
      return <ConnectionPrompt serviceName={currentDest.label} connectionUrl={currentDest.url} />;
    }

    switch (destination) {
      case 'power_bi':
        return (
          <>
            <TextField name="datasetId" label="ID del Conjunto de Datos en Power BI" onChange={handleOptionChange} fullWidth margin="normal" />
            <TextField name="tableName" label="Nombre de la Tabla" onChange={handleOptionChange} fullWidth margin="normal" />
          </>
        );
      case 'drive':
        return (
          <TextField name="folderId" label="ID de la Carpeta en Google Drive" onChange={handleOptionChange} fullWidth margin="normal" />
        );
      case 'email':
        return (
          <>
            <TextField name="to" label="Destinatario (email)" type="email" onChange={handleOptionChange} fullWidth margin="normal" />
            <TextField name="subject" label="Asunto" onChange={handleOptionChange} fullWidth margin="normal" />
          </>
        );
      case 'social':
        return (
          <>
            <TextField name="platform" label="Plataforma (ej: Instagram, LinkedIn, Facebook, TikTok)" onChange={handleOptionChange} fullWidth margin="normal" />
            <TextField name="message" label="Mensaje de la Publicación" onChange={handleOptionChange} fullWidth margin="normal" multiline rows={3} />
          </>
        );
      default:
        return <Typography>Selecciona un destino.</Typography>;
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Exportar "{selection.selectedDatasetName || 'Dataset'}"</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>1. Elige un destino</Typography>
        <ToggleButtonGroup
          value={destination}
          exclusive
          onChange={handleDestinationChange}
          fullWidth
          sx={{ gap: 1, flexWrap: 'wrap' }}
        >
          {destinations.map((dest) => (
            <ToggleButton key={dest.value} value={dest.value} sx={{ textTransform: 'none', px: 2, py: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {dest.icon}
                {dest.label}
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Box mt={3}>
          <Typography gutterBottom>2. Completa las opciones</Typography>
          {renderOptionsForm()}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>Cancelar</Button>
        <Button onClick={handleExport} variant="contained" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : 'Iniciar Exportación'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
