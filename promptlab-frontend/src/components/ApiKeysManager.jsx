// src/components/ApiKeysManager.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import ApiKeyInput from "./ApiKeyInput";

// Lista centralizada de proveedores (fácil de extender)
const PROVIDERS = [
  { provider: "google", displayName: "Google Gemini" },
  { provider: "openai", displayName: "OpenAI" },
  { provider: "anthropic", displayName: "Anthropic Claude" },
  { provider: "aws", displayName: "AWS Bedrock" },
  { provider: "azure", displayName: "Azure OpenAI" },
  { provider: "cohere", displayName: "Cohere" },
  { provider: "mistral", displayName: "Mistral AI" },
  { provider: "huggingface", displayName: "Hugging Face" },
];

export default function ApiKeysManager() {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "success" });

    // --- FUNCIÓN DE CARGA CORREGIDA ---
    const fetchKeys = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/keys`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            setKeys(result.data || []);
        } catch (err) {
            setError("No se pudieron cargar las claves.");
        } finally {
            setLoading(false);
        }
    };
    
    // useEffect ahora llama a la nueva función
    useEffect(() => {
        fetchKeys();
    }, []);

    // --- FUNCIÓN DE GUARDADO CORREGIDA ---
    const handleSaveKey = async (provider, apiKey) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/keys`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ provider, api_key: apiKey })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            setSnackbar({ open: true, message: result.message, type: "success" });
            fetchKeys(); // Volvemos a cargar las claves para mostrar la info actualizada
        } catch (err) {
            setSnackbar({ open: true, message: err.message, type: "error" });
            // Lanzamos el error para que el componente hijo pueda manejarlo
            throw err;
        }
    };

    // --- FUNCIÓN DE BORRADO CORREGIDA ---
    const handleDeleteKey = async (provider) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/keys/${provider}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Error desconocido al eliminar.');

            setSnackbar({ open: true, message: result.message, type: "success" });
            fetchKeys(); // Volvemos a cargar las claves
        } catch (err) {
            setSnackbar({ open: true, message: err.message, type: "error" });
        }
    };
    

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Cargando claves...
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, height: "100%",border: '2px solid',
        borderColor: 'primary.main', }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Gestión de Claves de API
      </Typography>
       <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
         Puedes usar esta aplicación sin necesidad de configurar tus claves: 
          con un <strong>límite mensual gratuito</strong>.  
          <br /><br />
          Si deseas un uso <strong>sin límites</strong> ingresa tus claves de API.
       </Typography>
      

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {PROVIDERS.map((p) => (
        <ApiKeyInput
          key={p.provider}
          provider={p.provider}
          displayName={p.displayName}
          savedKey={keys.find((k) => k.provider === p.provider)}
          onSave={handleSaveKey}
          onDelete={handleDeleteKey}
        />
      ))}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.type}>{snackbar.message}</Alert>
      </Snackbar>
    </Paper>
  );
}
