
  // src/pages/DataPrepPage.jsx (VERSIÓN FINAL, LIMPIA Y FUNCIONAL)
import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Box, Typography, Paper, CircularProgress, Alert, Button, Dialog,
    DialogTitle, DialogContent, DialogActions, FormGroup, FormControlLabel,
    Checkbox, TextField,Divider,DialogContentText,Select, Tooltip
} from '@mui/material';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'; // O el icono que prefieras
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '../supabaseClient';
import DiagnosticCard from '../components/dashboard/DiagnosticCard';
import { TablePreview, TextPreview } from '../components/dashboard/DataPreviews';
import ColumnInspector from '../components/dashboard/ColumnInspector'; 
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; 
import CreateColumnModal from '../components/dashboard/CreateColumnModal';
import { useNotification } from '../context/NotificationContext'; 
import DuplicateColumnModal from '../components/dashboard/DuplicateColumnModal';
import ContentCopyIcon from '@mui/icons-material/ContentCopy'; 
import { useQualityCheck } from '../hooks/useQualityCheck'; 
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ScienceIcon from '@mui/icons-material/Science';
import { PaginaConAsistente } from '../layouts/PaginaConAsistente';
import DataToolbar from '../components/dashboard/DataToolbar';

const LazyDatasetVisualizer = React.lazy(() => import('../components/DatasetVisualizer'));

// --- COMPONENTE 1: MODAL PARA RENOMBRAR ---
const RenameColumnsDialog = ({ open, onClose, columns, onSave }) => {
    const [renames, setRenames] = useState({});
    
    useEffect(() => {
        if (open) setRenames({}); // Limpiar al abrir
    }, [open]);

    const handleRenameChange = (oldName, newName) => {
        setRenames(prev => ({ ...prev, [oldName]: newName.trim() }));
    };


    const handleSaveChanges = () => {
        // Filtramos para enviar solo los campos que realmente se cambiaron
        const renameMap = Object.entries(renames)
            .filter(([oldName, newName]) => newName && newName !== oldName)
            .reduce((acc, [oldName, newName]) => ({ ...acc, [oldName]: newName }), {});

        if (Object.keys(renameMap).length > 0) {
            onSave(renameMap);
        }
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Renombrar Columnas</DialogTitle>
            <DialogContent dividers>
                {columns.map(col => (
                    <Box key={col} sx={{ display: 'flex', alignItems: 'center', my: 1.5 }}>
                        <Typography sx={{ minWidth: '150px', mr: 2, flexShrink: 0 }}>{col}</Typography>
                        <TextField
                            fullWidth
                            variant="outlined"
                            size="small"
                            placeholder="Nuevo nombre..."
                            onChange={(e) => handleRenameChange(col, e.target.value)}
                        />
                    </Box>
                ))}
            </DialogContent>
            <DialogActions>
                <Box display="flex" justifyContent="space-between" gap={2}>
                  <Button
                  sx={{ width: 180 }} 
                  onClick={onClose} 
                  variant="contained" 
                  color="secondary" 
                  size="medium"
                  >
                  Cancelar
                  </Button>
                  <Button 
                   sx={{ width: 180,ml: 26 }} 
                  onClick={handleSaveChanges} 
                  variant="contained" 
                   color="primary" 
                   size="medium"
                 
                  >
                  Guardar Cambios
                 </Button>
               </Box>

            </DialogActions>
        </Dialog>
    );
};

// --- COMPONENTE 2: MODAL PARA ELIMINAR ---
const DeleteColumnsDialog = ({ open, onClose, columns, onSave }) => {
    const [columnsToDrop, setColumnsToDrop] = useState(new Set());

    useEffect(() => {
        if (open) setColumnsToDrop(new Set()); // Limpiar al abrir
    }, [open]);

    const handleToggleDrop = (column) => {
        setColumnsToDrop(prev => {
            const newSet = new Set(prev);
            if (newSet.has(column)) newSet.delete(column);
            else newSet.add(column);
            return newSet;
        });
    };
    
    const handleSaveChanges = () => {
        const columnsArray = Array.from(columnsToDrop);
        if (columnsArray.length > 0) {
            onSave(columnsArray);
        }
        onClose();
    };

    return (
          <Dialog
             open={open}
             onClose={onClose}
             fullWidth
             maxWidth="sm"           // mismo maxWidth en ambos
     
>
            <DialogTitle>Eliminar Columnas</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Marque las columnas que desea eliminar 
                </Typography>
                <FormGroup>
                    {columns.map(col => (
                        <FormControlLabel
                            key={col}
                            control={<Checkbox checked={columnsToDrop.has(col)} onChange={() => handleToggleDrop(col)} />}
                            label={col}
                        />
                    ))}
                </FormGroup>
            </DialogContent>
            <DialogActions>
                <Box display="flex" justifyContent="space-between" gap={2}>
                  <Button
                   sx={{ width: 180 }} 
                  onClick={onClose} 
                  variant="contained" 
                  color="secondary" 
                  size="medium"
                  >
                  Cancelar
                  </Button>
                  <Button 
                   sx={{ width: 180,ml: 26 }} 
                  onClick={handleSaveChanges} 
                  variant="contained" 
                   color="primary" 
                   size="medium"
                 
                  >
                  Guardar Cambios
                 </Button>
               </Box>
           </DialogActions>
        </Dialog>
    );
};

 // --- COMPONENTE PRINCIPAL DE LA PÁGINA (VERSIÓN LIMPIA SIN updateStateWithNewData) ---
 export default function DataPrepPage() {
    
     const { projectId, datasetId } = useParams();
     const navigate = useNavigate();
     const { showNotification } = useNotification(); // ¡Así de fácil!
     
     // --- ESTADOS ---
     const [loadState, setLoadState] = useState({ loading: true, error: null, data: null });
     const [selectedColumn, setSelectedColumn] = useState(null);
     const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
     const [isRenameModalOpen, setRenameModalOpen] = useState(false);
     const [storagePath, setStoragePath] = useState(null); // CORRECTO: Estado para la ruta
     const [isEditMode, setIsEditMode] = useState(false); // ¿Estamos en modo edición?
     const [textContent, setTextContent] = useState('');    // El texto que se está editando
     const [mode, setMode] = useState('diagnostics'); // Modos: 'diagnostics', 'inspector'
     const [columnKey, setColumnKey] = useState(0);
     const [overrideInspectorData, setOverrideInspectorData] = useState(null);
     const [tableKey, setTableKey] = useState(0);
     const deleteButtonRef = useRef(null);
     const renameButtonRef = useRef(null);
     const [isCreateColumnModalOpen, setCreateColumnModalOpen] = useState(false);
     const [createModalKey, setCreateModalKey] = useState(0);
     const [isDuplicateModalOpen, setDuplicateModalOpen] = useState(false);
     const [columnToDuplicate, setColumnToDuplicate] = useState(null); 
     const { isChecking, qualityResult, runQualityCheck, resetQualityResult } = useQualityCheck();
     const [enrichmentColumn, setEnrichmentColumn] = useState(''); 
     const [searchTerm, setSearchTerm] = useState(''); // Para el texto de búsqueda
     const [filteredData, setFilteredData] = useState(null); // Para guardar los datos filtrados   
     const handleRecheckQuality = () => {
        runQualityCheck(datasetId); // Usas el datasetId de la página actual
    };

    const handleCloseModal = () => {
        resetQualityResult();
    };

     useEffect(() => {
     // Si no hay datasetId, no hagas nada.
     if (!datasetId) {
        
         return; 
     }
 
     const fetchAllData = async () => {
         // Reiniciamos todo al empezar una nueva carga
         setLoadState({ loading: true, error: null, data: null });
         setStoragePath(null); 
 
         try {
             // Hacemos UNA SOLA LLAMADA a nuestro backend, que ya nos da todo
             const { data: { session } } = await supabase.auth.getSession();
             if (!session) throw new Error("Sesión no válida.");
             
             const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/diagnose`;
             const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
             
             if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(`Error del servidor (${response.status}): ${errorText}`);
             }
             
             const result = await response.json();
 
             // Si la llamada fue exitosa, actualizamos los estados directamente
             if (result.success && result.data) {
                
                 
                 // Normalizamos el nombre de la preview por si acaso
                 const dataWithPreview = { ...result.data };
                 if (dataWithPreview.preview) {
                     dataWithPreview.previewData = dataWithPreview.preview;
                     delete dataWithPreview.preview;
                 }
 
                 setLoadState({ loading: false, error: null, data: dataWithPreview });
                 
                 // Guardamos la storage_path que ahora viene en la respuesta
                 if (dataWithPreview.storage_path) {
                     setStoragePath(dataWithPreview.storage_path);
                 } else {
                     console.warn("Advertencia: El backend no devolvió la 'storage_path'.");
                 }
             } else {
                 throw new Error(result.error || "La respuesta del backend no fue exitosa.");
             }
 
         } catch (err) {
             console.error("💥 ERROR CRÍTICO durante la carga de datos:", err.message);
             setLoadState({ loading: false, error: err.message, data: null });
         }
     };
 
     fetchAllData();
 
    }, [datasetId]);

    useEffect(() => {
        // Si el modal de eliminar se acaba de cerrar...
        if (isDeleteModalOpen === false) {
            // ...devuelve el foco a su botón.
            deleteButtonRef.current?.focus();
        }
    }, [isDeleteModalOpen]); // Se ejecuta solo cuando `isDeleteModalOpen` cambia

    // Este useEffect vigila el modal de RENOMBRAR
    useEffect(() => {
        // Si el modal de renombrar se acaba de cerrar...
        if (isRenameModalOpen === false) {
            // ...devuelve el foco a su botón.
            renameButtonRef.current?.focus();
        }
    }, [isRenameModalOpen]);
    
 
   const handleSaveChangesEdition = async () => {
    
    setLoadState(prevState => ({ ...prevState, loading: true }));

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/save-text-content`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ textContent: textContent })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error en el servidor al guardar");

        // --- LÓGICA DE ÉXITO SIMPLIFICADA ---
        
        // 1. Muestra la notificación de éxito.
        showNotification("¡Cambios guardados con éxito! Refrescando datos...", "success");

        // 2. Espera un segundo y recarga la página.
        // No hacemos NADA MÁS. Dejamos que la recarga haga todo el trabajo.
        setTimeout(() => {
          window.location.reload();
        }, 1000); 

    } catch (error) {
        console.error("💥 ERROR al guardar los cambios:", error.message);
        // Si hay un error, SÍ que tenemos que quitar el loader para que el usuario
        // pueda intentar de nuevo sin tener que recargar.
        setLoadState(prevState => ({ ...prevState, loading: false, error: error.message }));
        showNotification(error.message, "error"); 
    }
};
 const handleEnterEditMode = async () => {
     if (isEditMode) return;
     
 
     try {
         const { data: { session } } = await supabase.auth.getSession();
         if (!session) throw new Error("Sesión no válida.");
 
         // Nuestro endpoint de backend se encarga de todo:
         // comprobar si hay texto, si no, convertirlo.
         const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/get-text-content`;
         
         const response = await fetch(url, {
             headers: { 'Authorization': `Bearer ${session.access_token}` }
         });
         
         const result = await response.json();
         if (!result.success) throw new Error(result.error);
         
         setTextContent(result.textContent);
         setIsEditMode(true);
 
     } catch (error) {
         console.error("Error al entrar en modo edición:", error.message);
         alert(`No se pudo cargar el editor: ${error.message}`);
     }
 };
 
     const handleColumnEdit = async (payload) => {
         setLoadState(prevState => ({ ...prevState, loading: true, error: null }));
         try {
             const { data: { session } } = await supabase.auth.getSession();
             if (!session) throw new Error("Sesión no válida.");
 
             const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/edit-columns`, {
                 method: 'POST',
                 headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                 body: JSON.stringify(payload)
             });
             const result = await response.json();
 
             if (!result.success) throw new Error(result.error || "Error inesperado.");
             
             // Actualizar el estado directamente con los datos nuevos
             const mergedData = { ...loadState.data, ...result.data };
             if (mergedData.preview) {
                 mergedData.previewData = mergedData.preview;
                 delete mergedData.preview;
             }
 
             setLoadState({ loading: false, error: null, data: mergedData });
             setTableKey(prevKey => prevKey + 1);
 
         } catch (err) {
             console.error(`Error durante la acción ${payload.action}:`, err);
             setLoadState(prevState => ({ ...prevState, loading: false, error: err.message }));
         }
     };
     
      const handleDuplicateColumn = async (newColumnName) => {
            if (!columnToDuplicate) { // <-- CAMBIA selectedColumn POR columnToDuplicate
            showNotification("No hay una columna seleccionada para duplicar.", "error");
            return;
        }

        setLoadState(prevState => ({ ...prevState, loading: true }));

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const payload = {
                columna_original: columnToDuplicate, // <-- CAMBIA ESTO TAMBIÉN
                nuevo_nombre_columna: newColumnName
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/columns/duplicate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || "Error inesperado del servidor.");

            // ¡ÉXITO! Actualizamos el estado con la respuesta completa del backend.
            setLoadState({
                loading: false,
                error: null,
                data: {
                    ...loadState.data,
                    diagnostics: result.data.diagnostics,
                    previewData: result.data.previewData,
                }
            });

            // Actualizamos la tabla, mostramos notificación y cerramos el modal.
            setTableKey(prevKey => prevKey + 1);
            showNotification(result.message, "success");
            setDuplicateModalOpen(false);
            setColumnToDuplicate(null); //

        } catch (err) {
            setLoadState(prevState => ({ ...prevState, loading: false, error: err.message }));
            showNotification(err.message, "error");
        }
    };

 const handleCleanAction = (actionPayload) => {
    (async () => {
        setLoadState(prevState => ({ ...prevState, loading: true }));
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/clean`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(actionPayload)
            });

            const result = await response.json();

            // Lanza error si el backend falló
            if (!result.success) throw new Error(result.error || "Error inesperado en la limpieza.");

            // --- ¡LA ACTUALIZACIÓN ATÓMICA Y CORRECTA ESTÁ AQUÍ! ---
            setLoadState(prevState => ({
                loading: false, // Quitamos el loader
                error: null,    // Limpiamos errores previos
                data: {
                    ...prevState.data, // Mantenemos datos del padre que no cambian
                    diagnostics: result.data.diagnostics, // REEMPLAZAMOS con la nueva verdad
                    previewData: result.data.previewData, // REEMPLAZAMOS con la nueva verdad
                }
            }));

            // --- LÓGICA POST-ACCIÓN PARA EVITAR FANTASMAS ---

            // 1. Forzamos el refresco de la tabla (esto ya lo tenías y es perfecto)
            setTableKey(prevKey => prevKey + 1);

            // 2. Si se eliminó una columna, deseleccionamos para que no quede un fantasma
            if (actionPayload.action === 'general_drop_columns') {
                setSelectedColumn(null);
                setOverrideInspectorData(null);
                setMode('diagnostics'); // Volvemos al modo diagnóstico general
            }
            
        } catch (err) {
            setLoadState(prevState => ({ ...prevState, loading: false, error: err.message }));
            // Aquí deberías tener una notificación al usuario del error
        }
    })();
};

    const handleSelectColumn = (columnName) => {
         setMode('inspector'); // Cambia al modo inspector
         setSelectedColumn(columnName);
         setOverrideInspectorData(null); // MUY IMPORTANTE: Resetea los datos para que el inspector sepa que debe buscar por su cuenta.
};

   const handleColumnCleanAction = async (payload) => {
          // 1. Mostramos el loader general.
                setLoadState(prevState => ({ ...prevState, loading: true }));
          
          try {
              // 2. Hacemos la llamada a la API.
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw new Error("Sesión no válida.");
              
              const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/columns/clean`, {
                  method: 'POST',
                  headers: {
                      'Authorization': `Bearer ${session.access_token}`,
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(payload)
              });
              
              const result = await response.json();
              if (!result.success) throw new Error(result.error || "Error inesperado del servidor.");
      
              // 3. Mostramos la notificación de éxito.
              showNotification(result.message || "Acción aplicada con éxito", "success");
              
              // 4. ACTUALIZACIÓN ATÓMICA Y ÚNICA DEL ESTADO.
              //    Ponemos loading en false y actualizamos TODOS los datos de una vez.
              setLoadState({
                  loading: false, // ¡Quitamos el loader aquí!
                  error: null,
                  data: {
                      ...loadState.data,
                      diagnostics: result.data.diagnostics,
                      previewData: result.data.previewData,
                  }
              });
              
              // 5. LE PASAMOS LOS DATOS FRESCOS AL HIJO.
              //    Guardamos los datos específicos de la columna en nuestro estado de "override".
              setOverrideInspectorData(result.data.updatedColumnDetails);
              setTableKey(prevKey => prevKey + 1);
              setCreateColumnModalOpen(false);
              
      
          } catch (err) {
              // En caso de error, quitamos el loader y mostramos el mensaje.
              setLoadState(prevState => ({ ...prevState, loading: false, error: err.message }));
              showNotification(err.message, "error");
          }
      };
 
   const renderRightPanel = () => {

    const columnDetailsForInspector = 
    overrideInspectorData || 
    (loadState.data?.diagnostics?.columnDetails?.[selectedColumn] || null);
        
     // La lógica del modo edición de texto tiene la máxima prioridad
     if (isEditMode) {
         return (
             <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                 <Typography variant="h6" component="h2" fontWeight="bold">Acciones de Edición</Typography>
                 <Button variant="contained" color="primary" onClick={handleSaveChangesEdition}>Guardar Cambios</Button>
                 <Button variant="outlined" color="secondary" onClick={() => setIsEditMode(false)}>Descartar y Volver</Button>
             </Paper>
         );
     }
 
     // ===> ¡LÓGICA NUEVA BASADA EN EL MODO! <===
     switch (mode) {
         case 'inspector':
         
             return (
                    <ColumnInspector 
                    key={columnKey} 
                    columnName={selectedColumn}
                    onApplyAction={handleColumnCleanAction}
                    initialData={overrideInspectorData} 
                    onEditAsText={handleNavigateToDocumentEditor}// <-- ¡AQUÍ PASAS LA NUEVA FUNCIÓN!
                />
         );
 
         case 'diagnostics':
         default:
            
             return (
                 <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderColor: 'divider' }}>
                     <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                         <Typography variant="h6" component="h1" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
                             Diagnóstico y Acciones Rápidas
                         </Typography>
                     </Box>
                     <Box sx={{ flexGrow: 1, p: 1, overflowY: 'auto' }}>
                         <DiagnosticCard
                             data={loadState.data?.diagnostics}
                             fileType={loadState.data?.fileType}
                             onClean={handleCleanAction}
                         />
                     </Box>
                 </Paper>
             );
     }
 };
 
    const renderPreview = () => {

          if (mode === 'global_visualization') {
            return (
                <Suspense fallback={<CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />}>
                    <LazyDatasetVisualizer 
                        columns={columnsWithTypes} // Esta es la variable que ya calculas con useMemo
                    />
                </Suspense>
            );
        }
        // --- FIN DEL NUEVO BLOQUE LÓGICO ---

     // Si estamos en modo edición, mostramos el editor de texto
     if (isEditMode) {
         return (
             <TextField
                 multiline
                 fullWidth
                 value={textContent}
                 onChange={(e) => setTextContent(e.target.value)}
                 sx={{ 
                     height: '100%',
                     '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                     '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.9rem', p: 2 }
                 }}
             />
         );
     }
 
     // Si está cargando y no hay datos
     if (loadState.loading && !loadState.data) {
         return (
             <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                 <CircularProgress />
             </Box>
         );
     }
 
     // Si hay un error
     if (loadState.error) {
         return <Alert severity="error">{loadState.error}</Alert>;
     }
 
     // Si no hay datos de vista previa
     if (!loadState.data || !loadState.data.previewData) {
         return <Typography sx={{ p: 2 }}>No hay datos de vista previa disponibles.</Typography>;
     }
 
     // Vista previa normal con datos
     const { previewData, diagnostics } = loadState.data;
     return (     
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 1. Añadimos el nuevo Toolbar aquí, justo encima de la tabla */}
            <DataToolbar
                searchTerm={searchTerm}
                onSearchChange={(e) => setSearchTerm(e.target.value)}
                onApplySearch={handleSearch}
                onClearSearch={() => {
                    setSearchTerm('');
                    setFilteredData(null);
                }}
            />

            {/* 2. La tabla ahora ocupa el espacio restante y es desplazable */}
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                <TablePreview
                    key={tableKey} 
                    // Y aquí, pasamos los datos filtrados o los originales
                    data={filteredData || previewData}
                    problematicColumns={diagnostics?.columnDetails || []}
                    selectedColumn={selectedColumn}
                    onColumnSelect={handleSelectColumn}
                />
            </Box>
        </Box>
    );

 };

    const handleCreateColumn = async (payload) => {
    setLoadState(prevState => ({ ...prevState, loading: true }));
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");
        
        // 1. Llamamos a nuestro nuevo endpoint /columns/create
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/columns/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload) 
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error inesperado del servidor.");

        // 2. Lógica de actualización SIMPLE Y SEGURA.
        //    Como el backend siempre nos da los datos correctos, esto es directo.
        setLoadState(prevState => ({
            loading: false,
            error: null,
            data: {
                ...prevState.data, // Mantenemos fileType, etc.
                diagnostics: result.data.diagnostics, // <<-- Leemos la clave correcta
                previewData: result.data.previewData, // <<-- Leemos la clave correcta
            }
        }));

        // 3. Efectos secundarios
        setTableKey(prevKey => prevKey + 1);
        showNotification(result.message, "success");
        setCreateColumnModalOpen(false); // Cerramos el modal
        
    } catch (err) {
        setLoadState(prevState => ({ ...prevState, loading: false, error: err.message }));
        showNotification(err.message, "error");
    }
};
    const handleNavigateToPromptLab = async () => {
    // Si NO hay un filtro activo, simplemente navega como antes.
    if (!filteredData) {
        
        navigate(`/project/${projectId}/dataset/${datasetId}/promptlab`);
        return; // Termina la ejecución aquí
    }

    // --- LÓGICA NUEVA: SI SÍ HAY UN FILTRO ACTIVO ---
   
    
    if (filteredData.length === 0) {
        showNotification("Tu filtro no produjo resultados. No hay nada que llevar al laboratorio.", "warning");
        return;
    }

    setLoadState(prevState => ({ ...prevState, loading: true }));

    try {
        // Convertimos los datos FILTRADOS a texto CSV
        const header = Object.keys(filteredData[0]).join(',');
        const rows = filteredData.map(row => Object.values(row).join(','));
        const csvContent = [header, ...rows].join('\n');

        // Reutilizamos el endpoint para guardar este CSV filtrado como "contenido editado"
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/save-text-content`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ textContent: csvContent })
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        // ¡ÉXITO! Ahora navegamos. El laboratorio leerá nuestra selección.
        navigate(`/project/${projectId}/dataset/${datasetId}/promptlab`);

    } catch (err) {
        showNotification(err.message, "error");
    } finally {
        setLoadState(prevState => ({ ...prevState, loading: false }));
    }
};

  const { columnsWithTypes, numericColumnsForModal } = React.useMemo(() => {
    // El punto de partida es la fuente original de datos.
    const infoArray = loadState.data?.diagnostics?.columns_info;

    // Si la fuente no es un array, devolvemos un estado seguro (listas vacías).
    if (!Array.isArray(infoArray)) {
        return { columnsWithTypes: [], numericColumnsForModal: [] };
    }

    // 1. Calculamos la lista completa para el visualizador.
    const allColumns = infoArray.map(detail => ({ name: detail.name, type: detail.type }));

    // 2. Usando esa lista recién creada, filtramos para obtener las numéricas del modal.
    const numericColumns = allColumns.filter(column => {
        if (!column || typeof column.type !== 'string') {
            return false;
        }
        const typeLowerCase = column.type.toLowerCase();
        return typeLowerCase.includes('int') || typeLowerCase.includes('float');
    });

    // Devolvemos ambas listas a la vez. O se calculan bien las dos, o ninguna.
    return {
        columnsWithTypes: allColumns,
        numericColumnsForModal: numericColumns
    };

}, [loadState.data?.diagnostics?.columns_info]); // La dependencia es ÚNICA y es la fuente original.

    const handleEnrichDataset = async () => {
    if (!enrichmentColumn) {
        showNotification("Por favor, selecciona una columna que contenga URLs de imágenes.", "warning");
        return;
    }

    // 1. Activar el estado de carga
    setLoadState(prevState => ({ ...prevState, loading: true, error: null }));
    
    try {
        // 2. Obtener la sesión y llamar al backend
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/enrich-with-image-urls`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ column_name: enrichmentColumn })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error en el servidor al enriquecer el dataset");

        // --- LÓGICA DE ÉXITO ---
        
        // 3. Mostrar notificación de éxito
        showNotification(result.message || "¡Dataset enriquecido creado con éxito!", "success");

        // 4. Redirigir al nuevo dataset
        const newDatasetId = result.new_dataset.dataset_id;
        navigate(`/project/${projectId}/dataprep/${newDatasetId}`);

    } catch (error) {
        // --- LÓGICA DE ERROR ---
        console.error("💥 ERROR al enriquecer el dataset:", error.message);
        setLoadState(prevState => ({ ...prevState, loading: false, error: error.message }));
        showNotification(error.message, "error"); 
    }
};

    const handleSearch = () => {
        if (!searchTerm) {
            setFilteredData(null); // Si la búsqueda está vacía, mostramos todos los datos
            return;
        }

        // Usamos los datos originales (loadState.data.previewData) como fuente de verdad
        const originalData = loadState.data?.previewData || [];
        
        const results = originalData.filter(row => 
            // Buscamos en TODAS las columnas (o solo en 'descripcion_ia' si prefieres)
            Object.values(row).some(value =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );

        setFilteredData(results);
    };

    const handleNavigateToDocumentEditor = async (columnName) => {
    if (!columnName) return;

    // Puedes crear un nuevo estado de carga o reutilizar uno existente
    setLoadState(prevState => ({ ...prevState, loading: true }));

    try {
        // 1. Obtenemos la sesión y el contenido de la columna (esto es igual)
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

        // --- ¡AQUÍ ESTÁ LA MAGIA! ---
        // 2. En lugar de cambiar de modo, NAVEGAMOS a la DocumentPage.
        //    Asegúrate de que la ruta sea la correcta para tu aplicación.
        navigate(`/project/${projectId}/document/${datasetId}`, {
            state: { initialTextContent: result.textContent }
        });

    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
        console.error("Error al enviar la columna al editor de documentos:", error);
    } finally {
        setLoadState(prevState => ({ ...prevState, loading: false }));
    }
};

     const isAnalysisLocked = loadState.loading || isEditMode;
     const columns = loadState.data?.previewData?.[0] ? Object.keys(loadState.data.previewData[0]) : [];
     const isTabular = loadState.data?.fileType && ['csv', 'xlsx', 'parquet', 'tabular'].includes(loadState.data.fileType);

   

  return (
     <PaginaConAsistente nombreModulo="categoricas_numericas">
    <Box
    sx={{
        height: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        pt: 'calc(72px + 1px)', background: "linear-gradient(135deg, #26717a, #44a1a0)",                // bordes redondeados
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)', // sombra ligera

    }}
>
        {/* --- Cabecera de la Página --- */}
        <Paper 
        elevation={0}
         sx={{ 
        border: '2px solid',
        borderColor: 'primary.main', // azul fuerte del tema MUI
        borderRadius: 2,
        display: 'flex',
        justifyContent: 'space-between', // Mantenemos esto para separar título y botones
        alignItems: 'center',
        p: 1, 
        background: ' #005f73',
        flexWrap: 'wrap', 
        gap: 1, // Añadimos un gap para el espaciado en caso de que se envuelvan
        
    }}
>
    
    {/*  Envolvemos todo en un Box con display: 'flex' */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2,  flexWrap: 'nowrap',minWidth: '50px', justifyContent: 'flex-end'   }}> 
    {isTabular && (
        <>  
            {mode === 'diagnostics' ? (
                <>
                    {/* --- GRUPO 1: ACCIONES BÁSICAS --- */}
                    <Button variant="contained" size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate(`/project/${projectId}`)}
                     color="secondary"
                        sx={{
                        border: "2px solid #ffffff",
                        color: "#ffffff",
                        "& .MuiSvgIcon-root": { color: "#ffffff" },
                        "&:hover": {
                         backgroundColor: "rgba(255,255,255,0.1)",
                         borderColor: "#ffffff",
                         },
                         }}>
                        Volver 
                    </Button>
                    <Tooltip title="Vuelve a ejecutar el análisis de calidad sobre el dataset actual">
                        <Button   
                             color="secondary"
                             sx={{
                             border: "2px solid #ffffff",
                             color: "#ffffff",
                            "& .MuiSvgIcon-root": { color: "#ffffff" },
                            "&:hover": {
                             backgroundColor: "rgba(255,255,255,0.1)",
                             borderColor: "#ffffff",
                           },
                          }}
                            variant="contained" 
                            size="small"
                            startIcon={isChecking ? <CircularProgress size={20} /> : <FactCheckIcon />}
                            onClick={handleRecheckQuality}
                            disabled={isChecking}
                        >
                            {isChecking ? 'Diagnosticando...' : 'Verificacion'}
                        </Button>
                    </Tooltip>
                    
                    <Divider orientation="vertical" flexItem />

                    {/* --- GRUPO 2: MODOS DE ANÁLISIS --- */}
                    <Tooltip title="Cambia al modo de inspección para ver y limpiar columnas individuales">
                        <Button variant="contained" size="small" onClick={() => setMode('inspector')} disabled={isAnalysisLocked}
                              sx={{
                              border: "2px solid #ffffff",
                              color: "#ffffff",
                               backgroundColor: "#031a27ff",   // 👈 acá el color base
                              "& .MuiSvgIcon-root": { color: "#ffffff" },
                              "&:hover": {
                               backgroundColor: "#052235",  // 👈 un tono distinto si querés diferenciar hover
                               borderColor: "#ffffff",
                              },
                             }}>
                            Inspeccionar Columnas
                        </Button>
                    </Tooltip>
                    <Tooltip title="Genera visualizaciones interactivas de tus datos">
                        <Button variant="contained" size="small" onClick={() => setMode('global_visualization')} disabled={isAnalysisLocked}
                              sx={{
                              border: "2px solid #ffffff",
                              color: "#ffffff",
                              backgroundColor: "#031a27ff",   // 👈 acá el color base
                              "& .MuiSvgIcon-root": { color: "#ffffff" },
                              "&:hover": {
                               backgroundColor: "#052235",  // 👈 un tono distinto si querés diferenciar hover
                               borderColor: "#ffffff",
                               },
                             }}>
                            Visualizacion
                        </Button>
                    </Tooltip>
                    <Tooltip title="Abre un editor de texto para modificar el contenido del archivo directamente">
                        <Button variant="contained" size="small" onClick={handleEnterEditMode} disabled={!storagePath || isEditMode}
                          sx={{
                          border: "2px solid #ffffff",
                          color: "#ffffff",
                          backgroundColor: "#031a27ff",   // 👈 acá el color base
                          "& .MuiSvgIcon-root": { color: "#ffffff" },
                          "&:hover": {
                           backgroundColor: "#052235",  // 👈 un tono distinto si querés diferenciar hover
                           borderColor: "#ffffff",
                          },
                          }}>
                            Edición 
                        </Button>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem />

                    {/* --- GRUPO 3: HERRAMIENTAS DE IA --- */}
                    <Tooltip title="Experimenta con modelos de lenguaje usando los datos de tu dataset">
                        <Button
                            variant="contained"
                              sx={{
                              border: "2px solid #ffffff",
                              color: "#ffffff",
                              backgroundColor: "#031a27ff",   // 👈 acá el color base
                            "& .MuiSvgIcon-root": { color: "#ffffff" },
                            "&:hover": {
                              backgroundColor: "#052235",  // 👈 un tono distinto si querés diferenciar hover
                              borderColor: "#ffffff",
                               },
                            }}
                            size="small"
                            onClick={handleNavigateToPromptLab}
                            startIcon={<ScienceIcon />}
                        >
                            PromptLab
                        </Button>
                    </Tooltip>
                     <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 'auto', alignSelf: 'stretch' }} />
                    {/* El nuevo bloque, ahora con mejor estilo y un Tooltip */}
                    <Tooltip title="Analiza imágenes desde una columna de URLs y añade los resultados como nuevas columnas">
                        <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.5, borderColor: 'primary.main' }}>
                            <Select native value={enrichmentColumn} onChange={(e) => setEnrichmentColumn(e.target.value)} size="small" disabled={isAnalysisLocked} sx={{ border: 'none', '&:before': { border: 'none' }, '&:after': { border: 'none' }, '& .MuiSelect-select': { pb: '2px' }}}>
                                <option value="">Columna con URLs...</option>
                                {columns.map(col => <option key={col} value={col}>{col}</option>)}
                            </Select>
                            <Button variant="contained" color="primary" onClick={handleEnrichDataset} disabled={!enrichmentColumn || isAnalysisLocked} startIcon={<AutoAwesomeIcon />} size="small">
                                Enriquecer
                            </Button>
                        </Paper>
                    </Tooltip>
                            </>
                            
                        ) : (
                            <>
                                {/* --- BOTONES DEL MODO INSPECTOR (ACCIONES DE COLUMNA) --- */}
                                {/* 1. Selector de Columna */}
                               <Box 
  sx={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', // separa los dos grupos
    gap: 7,
    flexWrap: 'nowrap',
    width: '100%'
  }}
>
  {/* Grupo izquierdo */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    <Button 
      sx={{   ml: 2,
              border: "2px solid #ffffff",
    color: "#ffffff",
    backgroundColor: "#031a27ff",   // 👈 acá el color base
    "& .MuiSvgIcon-root": { color: "#ffffff" },
    "&:hover": {
      backgroundColor: "#052235",  // 👈 un tono distinto si querés diferenciar hover
      borderColor: "#ffffff",
              },
            }}
      variant="contained" 
      size="small" 
      
      disabled={isAnalysisLocked} 
      onClick={() => { 
        setMode('diagnostics'); 
        setSelectedColumn(null); 
      }}
    >
      Volver a Diagnóstico
    </Button>

     <Button   
      variant="contained"
      size="small" 
        sx={{ 
              border: "2px solid #ffffff",
    color: "#ffffff",
    backgroundColor: "#031a27ff",   // 👈 acá el color base
    "& .MuiSvgIcon-root": { color: "#ffffff" },
    "&:hover": {
      backgroundColor: "#052235",  // 👈 un tono distinto si querés diferenciar hover
      borderColor: "#ffffff",
              },
            }}
      startIcon={isChecking ? <CircularProgress size={20} /> : <FactCheckIcon />}
      onClick={handleRecheckQuality}
      disabled={isChecking}
    >
      {isChecking ? 'Diagnosticando' : 'Verificar Archivo'}
    </Button>
  </Box>
    <Divider orientation="vertical" flexItem sx={{ mx: 2, height: 'auto', alignSelf: 'stretch' }} />
  {/* Grupo derecho */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    <Button 
      ref={deleteButtonRef}  
      variant="contained" 
      size="small" 
      color="secondary" 
      startIcon={<DeleteIcon />} 
      onClick={() => setDeleteModalOpen(true)} 
      disabled={isAnalysisLocked || columns.length === 0}
    >
      Eliminar Columna
    </Button>

    <Button 
      ref={renameButtonRef} 
      variant="contained" 
      color="secondary" 
      size="small" 
      startIcon={<DriveFileRenameOutlineIcon />} 
      onClick={() => setRenameModalOpen(true)} 
      disabled={isAnalysisLocked || columns.length === 0}
    >
      Renombrar Columna
    </Button>

    <Button 
      color="secondary"
      variant="contained" 
      size="small" 
      startIcon={<AddCircleOutlineIcon />}
      onClick={() => {
        setCreateColumnModalOpen(true);
        setCreateModalKey(prev => prev + 1);
      }}
      disabled={isAnalysisLocked}
    >
      Crear Columnas
    </Button>

    <Button
      variant="contained"
      size="small"
      color="secondary"
      startIcon={<ContentCopyIcon />}
      onClick={() => {
        if (selectedColumn) {
          setColumnToDuplicate(selectedColumn);
          setDuplicateModalOpen(true);
        } else {
          showNotification("Por favor, seleccione una columna de la tabla para duplicar.", "warning");
        }
      }}
      disabled={isAnalysisLocked || !selectedColumn}
    >
      Duplicar Columna
    </Button>
  </Box>
</Box>
                               
                            </>
                        )}
                    </>
                )}
            </Box>
        </Paper>
        {/* --- Contenido Principal (Paneles Izquierdo y Derecho) --- */}
        <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden'  }}>
            
            {/* Panel Izquierdo: Vista Previa */}
            <Box sx={{ flex: '2 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Paper sx={{ flexGrow: 1, overflow: 'auto', position: 'relative', border: '1px solid', borderColor: ' #2193b0' }}>
                    {loadState.loading && loadState.data && (
                        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                            <CircularProgress color="primary" />
                        </Box>
                    )}
                    {renderPreview()}
                </Paper>
            </Box>

            {/* Panel Derecho: Dinámico */}
            <Box sx={{ 
               flex: '1 1 0', 
                minWidth: 0, 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 1,
                border: '1px solid #2193b0',
                overflow: 'hidden'
            }}>
               {renderRightPanel()}
            </Box>
        </Box>

        {/* Diálogos modales */}
        {isTabular && columns.length > 0 && (
            <>
                <RenameColumnsDialog
                    open={isRenameModalOpen}
                    onClose={() => setRenameModalOpen(false)}
                    columns={columns}
                    onSave={(renameMap) => handleColumnEdit({ action: 'rename_columns', params: { rename_map: renameMap } })}
                />
                <DeleteColumnsDialog
                    open={isDeleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    columns={columns}
                    onSave={(columnsToDrop) => handleColumnEdit({ action: 'drop_columns', params: { columns: columnsToDrop } })}
                />
            </>

            
        )}

{/* Modal de creación de columna */}
    <CreateColumnModal
      key={createModalKey}
      open={isCreateColumnModalOpen}
      onClose={() => setCreateColumnModalOpen(false)}
      numericColumns={numericColumnsForModal}
      onSave={handleCreateColumn}
    />

    {columnToDuplicate && (
                <DuplicateColumnModal
                    open={isDuplicateModalOpen}
                    onClose={() => {
                        setDuplicateModalOpen(false);
                        setColumnToDuplicate(null); // Limpiamos al cerrar
                    }}
                    onSave={handleDuplicateColumn}
                    originalColumnName={columnToDuplicate}
                />                
            )}

            
    {/* 👇 AQUÍ VA EL DIÁLOGO, FUERA DE LA OTRA CONDICIÓN 👇 */}
    <Dialog open={!!qualityResult} onClose={handleCloseModal}>
        <DialogTitle>Resultado del Diagnóstico</DialogTitle>
        <DialogContent>
            <DialogContentText>
                {qualityResult?.message || "Diagnóstico completado con éxito."}
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseModal}>Cerrar</Button>
        </DialogActions>
    </Dialog>
    
  </Box> 
  </PaginaConAsistente>
);
}
    
  