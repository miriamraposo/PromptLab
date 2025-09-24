// src/App.jsx
import React, { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useUser } from './context/UserContext';

// --- CONTEXTOS ---
import { NotificationProvider } from './context/NotificationContext';
import { SelectionProvider } from './context/SelectionContext'; // <-- importar tu provider

// --- PÁGINAS ---
import HomePage from './pages/HomePage';
import LoginRegisterPage from './pages/LoginRegisterPage';
import ChoosePlanPage from './pages/ChoosePlanPage';
import DashboardPage from './pages/DashboardPage';
import WorkspacePage from './pages/WorkspacePage';
import NotFoundPage from './pages/NotFoundPage';
import DataPrepPage from './pages/DataPrepPage';

import DocumentPage from './pages/DocumentPage';
import ModelBuilderPage from './pages/ModelBuilderPage'; 
import MyModelsPage from './pages/MyModelsPage'; 
import ModelAnalysisPage from './pages/ModelAnalysisPage'; // Importa la página
// --- LAYOUTS Y COMPONENTES ---
import Layout from './layouts/Layout';
import ActiveSelectionManager from './layout/ActiveSelectionManager';
import LoadingScreen from './components/LoadingScreen';
import PromptLabPage from './pages/PromptLabPage'; // Importa el nuevo 
import PromptHistoryPage from './pages/PromptHistoryPage';
import PromptDetailPage from './pages/PromptDetailPage';
import BatchResultPage from './pages/BatchResultPage';
import PromptExplorerPage from './pages/PromptExplorerPage';
import AccountPage from './pages/AccountPage'; 
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import GaleriaPage from './pages/GaleriaPage'
import EstudioCreativoPage from './pages/EstudioCreativoPage'; 
import VisionLabHubPage from './pages/VisionLabHubPage';
import VisionExplorerPage from './pages/VisionExplorerPage';
import ClusteringPage from './pages/ClusteringPage'; 
import ClusteringTabularesPage from './pages/ClusteringTabularesPage'; 
import EvaluateVisionModelPage from './pages/EvaluateVisionModelPage';
import PredictVisionBatchPage from './pages/PredictVisionBatchPage';
import PdfDataExtractorPage from './pages/PdfDataExtractorPage'; 
import PredictClusterPage   from './pages/PredictClusterPage';
import LaboratorioVisionPage from './pages/LaboratorioVisionPage';
import Integraciones from './pages/Integraciones';


// --- PROTECCIÓN DE RUTAS ---
function ProtectedRoute({ children }) {
  const { user, loading } = useUser();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth?view=login" replace />;
  return children;
}

export default function App() {
  return (
    <NotificationProvider>
      <SelectionProvider>
        <ActiveSelectionManager /> 
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<LoginRegisterPage />} />

            {/* Rutas Protegidas */}
            <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
              <Route path="elegir-plan" element={<ChoosePlanPage />} />

              {/* === INICIO DE LA SECCIÓN CON LAYOUT === */}
              <Route element={<Layout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="project/:projectId" element={<WorkspacePage />} />
                <Route path="project/:projectId/dataprep/:datasetId" element={<DataPrepPage />} />
                
                <Route path="project/:projectId/document/:datasetId" element={<DocumentPage />} />
                <Route path="project/:projectId/predict/:datasetId" element={<ModelBuilderPage />} />
                <Route path="/project/:projectId/clustering-tabulares/:datasetId" element={<ClusteringTabularesPage />} />
               
                <Route path="models" element={<MyModelsPage />} />
                <Route path="models/:modelId/analyze" element={<ModelAnalysisPage />} />
                <Route path="/project/:projectId/dataset/:datasetId/promptlab" element={<PromptLabPage />} />
                <Route path="/historial-prompts" element={<PromptHistoryPage />} />
                <Route path="/historial-prompts/:promptId" element={<PromptDetailPage />} /> 
                 <Route path="promptlab/batch-results" element={<BatchResultPage />} />
                <Route path="explorador-prompts" element={<PromptExplorerPage />} />
                <Route path="/cuenta" element={<AccountPage />} />
                 <Route path="/update-password" element={<UpdatePasswordPage />} />
                <Route path="/galeria" element={<GaleriaPage />} />
                <Route path="/estudio-creativo" element={<EstudioCreativoPage />} />
                <Route path="/laboratorio-vision" element={<LaboratorioVisionPage />} /> 
                
                <Route path="/project/:projectId/vision-lab/:datasetId" element={<VisionLabHubPage />} />
                <Route path="/project/:projectId/vision-lab/:datasetId/explorer" element={<VisionExplorerPage />} />
               <Route path="/project/:projectId/vision-lab/:datasetId/clustering" element={<ClusteringPage />} />
               <Route path="/models/vision/:modelId/evaluate" element={<EvaluateVisionModelPage/>} />
               <Route path="/models/vision/:modelId/predict" element={<PredictVisionBatchPage />} />
                <Route path="/project/:projectId/pdf-explorer/:datasetId/explorer" element={<VisionExplorerPage />} />                
               <Route path="/project/:projectId/pdf-extractor/:datasetId" element={<PdfDataExtractorPage />} />
               <Route path="/models/clustering/:modelId/predict" element={<PredictClusterPage />} />
               <Route path="/integraciones" element={<Integraciones />} />
              </Route>
            </Route>
            
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </SelectionProvider>
    </NotificationProvider>
  );
}