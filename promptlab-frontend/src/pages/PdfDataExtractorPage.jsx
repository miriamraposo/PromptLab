import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Box, Typography, Paper, Grid, Button, CircularProgress, TextField ,Alert,Tooltip,  Dialog, DialogTitle, DialogContent, DialogActions  } from '@mui/material';
import { supabase } from '../supabaseClient'; // Asegúrate que la ruta sea correcta
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ScienceIcon from '@mui/icons-material/Science';
import OnlinePredictionIcon from '@mui/icons-material/OnlinePrediction';
import SaveAsIcon from '@mui/icons-material/SaveAs';

// --- CORRECCIÓN 1: Importamos los componentes correctos y eliminamos los que no se usan ---
import PdfVisualizer from '../components/pdf/PdfVisualizer';
import CatalogItemEditor from '../components/pdf/CatalogItemEditor'; // Usaremos este
import ActionWidget from '../components/pdf/ActionWidget';
import UploadImagesModal from '../components/dashboard/UploadImagesModal';
import InteractiveDocumentEditor from './InteractiveDocumentEditor';
import PdfActionIa from  '../components/pdf/PdfActionIa'; 

export default function PdfDataExtractorPage() {
    const { projectId, datasetId } = useParams();
    const [pdfData, setPdfData] = useState(null); // Almacenará todos los datos del PDF (páginas, análisis, etc.)
   

    // --- Estados (sin cambios, ya estaban bien) ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [originalAnalysisData, setOriginalAnalysisData] = useState(null);
    const [selectedPageIndex, setSelectedPageIndex] = useState(0);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [imagesForModal, setImagesForModal] = useState([]);
    const [datosTabularesExtraidos, setDatosTabularesExtraidos] = useState([]);
    
    const navigate = useNavigate();
    const location = useLocation(); //
    const hasChanges = JSON.stringify(analysisData) !== JSON.stringify(originalAnalysisData);
    const [editedData, setEditedData] = useState(null);
    const [editingElement, setEditingElement] = useState(null); 
    const [isIaMode, setIsIaMode] = useState(false); 
    const [isSavingDataset, setIsSavingDataset] = useState(false);
    const [showNextStepsModal, setShowNextStepsModal] = useState(false);
    const [newTabularDatasetId, setNewTabularDatasetId] = useState(null);
    const [datasetName, setDatasetName] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    

// =====================================================
// Paso 1: función para abrir el modal
// =====================================================
const handleOpenSaveModal = () => {
    // Nombre por defecto basado en el PDF
    setDatasetName(`${analysisData.filename.replace('.pdf', '')} (Tabular)`);
    setShowSaveModal(true); 
};

// =====================================================
// Paso 2: función que confirma y guarda el dataset
// =====================================================
const handleConfirmSaveDataset = async () => {
    setIsSavingDataset(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");
        const token = session.access_token;

        // Recopilar todos los items de todas las páginas
        const allItems = analysisData.pages.flatMap(page => 
            page.analysis?.extracted_items || []
        );

        if (allItems.length === 0) {
            throw new Error("No hay datos extraídos para guardar.");
        }

        // Llamada al backend
        const url = `${import.meta.env.VITE_API_URL}/api/datasets/from-analysis`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                projectId: projectId,
                name: datasetName,   // <--- ahora usamos el nombre del modal
                data: allItems
            })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "No se pudo guardar el dataset.");

        // Guardamos el ID del nuevo dataset y abrimos el modal de pasos siguientes
        setNewTabularDatasetId(result.new_dataset.dataset_id);
        setShowNextStepsModal(true); 
        setShowSaveModal(false);

    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        setIsSavingDataset(false);
    }
};

  
    // --- useEffect de Carga (Sin cambios, ya estaba perfecto) ---
    useEffect(() => {
        const fetchAndAnalyzePdf = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");
                const token = session.access_token;

                const downloadUrl = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/download`;
                const analyzeUrl = `${import.meta.env.VITE_API_URL}/api/pdf/extract-structured-data`;

                const fileResponse = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!fileResponse.ok) throw new Error(`Error al descargar PDF: ${fileResponse.status}`);
                
                const pdfBlob = await fileResponse.blob();
                const pdfFile = new File([pdfBlob], "document.pdf", { type: "application/pdf" });
                
                const formData = new FormData();
                formData.append('pdf_file', pdfFile);
                 
                const analysisResponse = await fetch(analyzeUrl, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                if (!analysisResponse.ok) throw new Error(`Error del servidor de análisis: ${analysisResponse.status}`);
                
                const result = await analysisResponse.json();
                if (!result.success) throw new Error(result.error || "El análisis del PDF falló.");
                 
                setAnalysisData(result.pdf_analysis);
                setAnalysisData(result.pdf_analysis);
                setOriginalAnalysisData(result.pdf_analysis);
            } catch (err) {
                 console.error("Error en fetchAndAnalyzePdf:", err); // <-- LOG DE DEBUG
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (datasetId) fetchAndAnalyzePdf();
    }, [datasetId]);



    const handleOpenEditModal = (element) => {
    setEditingElement(element);
};

const handleSaveElementChange = async (newText) => {
    if (!editingElement) return;

    // Llama a la API para guardar el cambio de este elemento específico
    await apiClient.put(`/api/documents/${datasetId}/element/${editingElement.id}`, {
        newText: newText
    });
    
    // Cierra el modal y actualiza los datos en la UI para ver el cambio
    setEditingElement(null);
    // ...aquí iría la lógica para recargar o actualizar los datos del documento...
};


    const handleSaveText = async () => {
    // ... lógica para mostrar 'Guardando...' ...
    try {
        await apiClient.put(`/api/datasets/${datasetId}/full-text`, {
            textContent: textContent 
        });
        alert('¡Documento guardado!');
        // Actualiza el texto original para que el botón "Guardar" se deshabilite
        setOriginalText(textContent); 
    } catch (error) {
        alert('Error al guardar el documento.');
    }
    // ...
};
    const handleTextChange = (event) => {
    setTextContent(event.target.value);
};

    // --- CORRECCIÓN 2: Arreglamos handleSave para que use la URL y el token correctos ---
    const handleSave = async () => {
        if (!hasChanges) return;
        setIsSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            const token = session.access_token;
            
            const url = `${import.meta.env.VITE_API_URL}/api/save-analysis`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    dataset_id: datasetId,
                    name: `Análisis de ${analysisData.filename}`,
                    pages: analysisData.pages
                })
            });
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error || "El guardado falló.");

            setOriginalAnalysisData(analysisData);
            alert("¡Guardado con éxito!");
        } catch (error) {
            alert(`Error al guardar: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // --- CORRECCIÓN 3: Eliminamos handleFieldChange y nos quedamos solo con la de 'items' ---
    const handleItemFieldChange = (itemId, fieldKey, newValue) => {
    // 'itemId' que recibimos es en realidad el índice del array del producto.
    const itemIndex = itemId;

    const updatedData = JSON.parse(JSON.stringify(analysisData));
    const pageToUpdate = updatedData.pages[selectedPageIndex];

    // --- LA CORRECCIÓN MÁGICA ---
    // Verificamos si la página y la lista de items existen
    if (pageToUpdate && pageToUpdate.analysis && pageToUpdate.analysis.extracted_items) {
        
        // Accedemos al item directamente por su índice en el array. ¡Mucho más seguro!
        const itemToUpdate = pageToUpdate.analysis.extracted_items[itemIndex];

        if (itemToUpdate) {
            // Actualizamos la propiedad del objeto con el nuevo valor
            itemToUpdate[fieldKey] = newValue;
            
            // ¡Ahora sí! Actualizamos el estado con los datos modificados
            setAnalysisData(updatedData);
        } else {
            console.error(`Error: No se pudo encontrar el item en el índice ${itemIndex}`);
        }
    }
};

    // --- CORRECCIÓN 4: Arreglamos handleExtractImages (URL y token) ---
    const handleExtractImages = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            const token = session.access_token;

            const downloadUrl = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/download`;
            const extractUrl = `${import.meta.env.VITE_API_URL}/api/pdf/extract-images`;
            
            const fileResponse = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!fileResponse.ok) throw new Error("No se pudo descargar el PDF para la extracción.");

            const pdfBlob = await fileResponse.blob();
            const pdfFile = new File([pdfBlob], "document.pdf", { type: "application/pdf" });
            const formData = new FormData();
            formData.append('pdf_file', pdfFile);

            const extractionResponse = await fetch(extractUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const result = await extractionResponse.json();
            if (!result.success) throw new Error(result.error);

            setImagesForModal(result.images);
            setIsUploadModalOpen(true);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };
    
    const handleExportToCsv = () => {
    // 1. Verificación inicial de que hay datos para procesar
    if (!analysisData || !analysisData.pages || analysisData.pages.length === 0) {
        alert("No hay datos analizados para exportar.");
        return;
    }

    // 2. Recopilar todos los 'items' de todas las páginas en un solo array
    const allItems = analysisData.pages.flatMap(page => 
        page.analysis && page.analysis.extracted_items ? page.analysis.extracted_items : []
    );

    if (allItems.length === 0) {
        alert("No se encontraron productos o items para exportar.");
        return;
    }

    // 3. Crear una lista de todas las columnas posibles (headers) dinámicamente
    // Usamos un Set para asegurarnos de que cada nombre de columna sea único
    const headersSet = new Set();
    allItems.forEach(item => {
        Object.keys(item).forEach(key => {
            if (key !== 'item_id') { // Excluimos claves internas
                headersSet.add(key);
            }
        });
    });
    const headers = Array.from(headersSet);

    // 4. Función para escapar caracteres especiales para CSV
    const escapeCsvCell = (cell) => {
        if (cell === null || cell === undefined) {
            return '';
        }
        const cellStr = String(cell);
        // Si la celda contiene comas, comillas dobles o saltos de línea, la envolvemos en comillas
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            // Reemplazamos las comillas dobles internas con dos comillas dobles
            return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
    };

    // 5. Construir el contenido del archivo CSV
    // Primero, la fila de encabezados
    let csvContent = headers.map(escapeCsvCell).join(',') + '\n';

    // Luego, cada item como una fila
    allItems.forEach(item => {
        const row = headers.map(header => {
            return escapeCsvCell(item[header]); // Usamos el header para obtener el valor correcto
        });
        csvContent += row.join(',') + '\n';
    });

    // 6. Crear y descargar el archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const filename = analysisData.filename ? `${analysisData.filename.replace('.pdf', '')}_extracted.csv` : 'extracted_data.csv';
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
    
    const handleUploadComplete = () => {
       
    };

  if (loading) {
  return (
    // ESTE BOX DEFINE EL TAMAÑO Y CENTRA EL CONTENIDO, POR ESO FUNCIONA
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        // Ocupa toda la altura disponible dentro de tu layout del dashboard
        height: 'calc(100vh - 72px - 16px)', // (72px del header + 16px de padding aprox.)
        width: '100%' 
      }}
    >
      <CircularProgress size={60} />
      <Typography sx={{ mt: 2, color: 'text.secondary' }}>
        Tu asistente IA está extrayendo los datos del PDF...
      </Typography>
    </Box>
  );
}

if (error) {
  return (
    <Box sx={{ p: 4, height: 'calc(100vh - 72px - 16px)' }}>
      <Alert severity="error">{error}</Alert>
    </Box>
  );
}

// Esta guarda es importante para prevenir el crash de `analysisData.pages`
if (!analysisData) {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography>No se encontraron datos para mostrar o el análisis no produjo resultados.</Typography>
    </Box>
  );
}
   return (
       <>
  <Box
      sx={{
          height: '100vh',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 1,
          pt: 'calc(72px + 1px)',                // bordes redondeados
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)', // sombra ligera
  
      }}
  >
    {/* --- CABECERA --- */}
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 4,
        py: 2,
        background: "linear-gradient(135deg, #26717a, #44a1a0)",
        borderRadius: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        mb: 3,
        flexWrap: "wrap",
        gap: 2,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* --- TÍTULO DINÁMICO --- */}
       <Typography variant="h6" fontWeight="bold" color="#ffffff">
          {isIaMode
            ? "🤖 Asistente de IA para Documentos"
            : `📄 Extracción de Datos: ${analysisData?.filename}`
          }
        </Typography>
        
      {/* --- BOTONES DE ACCIÓN --- */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        {isIaMode ? (
          <Button
            variant="contained"
             onClick={() => setIsIaMode(false)} 
            sx={{
              background: "linear-gradient(180deg, #002f4b, #005f73)",
              color: "#fff",
              "&:hover": { background: "#004d66" },
            }}
          >
            Volver a Extracción
          </Button>
        ) : (
          <>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              sx={{
                background: "linear-gradient(180deg, #002f4b, #005f73)",
                 color: "#fff !important", 
                "&:hover": { background: "#004d66" },
              }}
            >
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>

            <Tooltip title="Finaliza la extracción y guarda los datos como un nuevo archivo tabular.">
               <span> {/* El Tooltip a veces necesita un span para funcionar con botones deshabilitados */}
               <Button
                    variant="contained"
                    color="success"
                   // ANTES: onClick={handleSaveAsDataset}
                     onClick={handleOpenSaveModal} // <-- AHORA: Llama a la función que abre el modal
                     disabled={isSavingDataset} // Puedes usar este estado para el botón principal también
                    >
                  Guardar Dataset Tabular
              </Button>
              </span>
            </Tooltip>

            <Tooltip title="Editar todo el contenido del documento como texto plano">
              <Button
                variant="contained"
                color="secondary"
                startIcon={<TextFieldsIcon />}
                onClick={() => navigate(
                `/project/${projectId}/document/${datasetId}`,
              { 
            // --- 👇 ¡ESTA ES LA "MIGA DE PAN"! 👇 ---
                state: { 
                from: location.pathname, // Le estás diciendo: "Vienes de esta URL exacta"
                datasetType: 'pdf'
              } 
              }
             )}
                sx={{
                  background: "linear-gradient(180deg, #6a0572, #ab83a1)",
                  color: "#fff",
                  "&:hover": { background: "#842f8f" },
                }}
              >
                Editor de Texto
              </Button>
            </Tooltip>

             <Tooltip title="Chatea con la IA para resumir, extraer o generar contenido del documento">
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<ScienceIcon />} // Un icono más apropiado
                  onClick={() => setIsIaMode(true)}
                  sx={{
                    background: "linear-gradient(180deg, #6a0572, #ab83a1)",
                    color: "#fff",
                    "&:hover": { background: "#842f8f" },
                  }}
                >
                  Asistente IA
                </Button>
              </Tooltip>

            <Tooltip title="Usar el contenido del documento en el Laboratorio de Prompts">
              <Button
                variant="contained"
                startIcon={<ScienceIcon />}
                onClick={() =>
                  navigate(`/project/${projectId}/dataset/${datasetId}/promptlab`)
                }
                sx={{
                  background: "linear-gradient(180deg, #00416a, #007991)",
                  color: "#fff",
                  "&:hover": { background: "#005f73" },
                }}
              >
                PromptLab
              </Button>
            </Tooltip>

            <Tooltip title="Generar predicciones (facturas, catálogos, etc.)">
              <span>
                <Button
                  variant="contained"
                  startIcon={<OnlinePredictionIcon />}
                  onClick={() =>
                    navigate(`/project/${projectId}/predict/${datasetId}`)
                  }
                  disabled={!datosTabularesExtraidos}
                 sx={{
                  background: "linear-gradient(180deg, #00416a, #007991)",
                  color: "#fff",
                  "&:hover": { background: "#005f73" },
                }}
                >
                  Predicciones
                </Button>
              </span>
            </Tooltip>
          </>
        )}
      </Box>
    </Box>

     {/* --- CONTENIDO PRINCIPAL --- */}
      {isIaMode ? (
        <PdfActionIa analysisData={analysisData} />
      ) : (
        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            gap: 3,
            p: 1,
            overflow: "hidden", // evita doble scrollbar
          }}
        >
          {/* --- COLUMNA IZQUIERDA (VISOR) --- */}
          <Box
            sx={{
              flex: "0 0 60%",
              overflowY: "auto",
              p: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <PdfVisualizer
              pages={analysisData.pages}
              selectedPageIndex={selectedPageIndex}
              onPageChange={setSelectedPageIndex}
            />
          </Box>

          {/* --- PANEL DERECHO --- */}
          <Box
            sx={{
              flex: "1 1 40%",
              overflowY: "auto",
              p: 1,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <CatalogItemEditor
                items={
                  analysisData.pages[selectedPageIndex]?.analysis.extracted_items
                }
                onFieldChange={handleItemFieldChange}
              />
              <ActionWidget
                onExtractImages={handleExtractImages}
                onExportToCsv={handleExportToCsv}
              />
            </Box>
          </Box>
        </Box>
      )}
   
      {/* --- MODAL SUBIDA DE IMÁGENES --- */}
      <UploadImagesModal
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        projectId={projectId}
        onUploadComplete={handleUploadComplete}
        initialFiles={imagesForModal}
      />
    </Box>
    
     {/* --- AQUÍ, AL FINAL, VAN LOS DOS MODALES --- */}
            {/* Modal para pedir el nombre */}
            <Dialog open={showSaveModal} onClose={() => setShowSaveModal(false)}>
              <DialogTitle>Guardar Como Dataset Tabular</DialogTitle>
              <DialogContent>
                <Typography variant="body2" gutterBottom>
                  Ingresa un nombre para tu nuevo dataset:
                </Typography>
                <TextField
                  autoFocus
                  fullWidth
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  margin="dense"
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowSaveModal(false)} disabled={isSavingDataset}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmSaveDataset} 
                  disabled={isSavingDataset || !datasetName.trim()}
                  variant="contained"
                >
                  {isSavingDataset ? <CircularProgress size={24} color="inherit" /> : "Confirmar y Guardar"}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Modal para los siguientes pasos */}
            <Dialog open={showNextStepsModal} onClose={() => setShowNextStepsModal(false)}>
              <DialogTitle>¡Éxito! Dataset Guardado</DialogTitle>
              <DialogContent>
                <Typography>
                  Tu nuevo dataset tabular ha sido creado. ¿Qué quieres hacer ahora?
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => navigate(`/project/${projectId}/dataprep/${newTabularDatasetId}`)}>
                  Limpiar y Analizar
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => navigate(`/project/${projectId}/predict/${newTabularDatasetId}`)}
                >
                  Ir a Predicciones
                </Button>
              </DialogActions>
            </Dialog>
        </>
    );
}