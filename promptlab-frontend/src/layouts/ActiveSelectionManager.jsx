// src/layout/ActiveSelectionManager.jsx (VERSIÓN FINAL)

import { useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { useSelection } from '../context/SelectionContext'; // <<< RUTA CORREGIDA

// Lista de patrones de URL que consideramos "exportables"
const EXPORTABLE_ROUTES = [
  '/project/:projectId/dataprep/:datasetId',
  '/project/:projectId/document/:datasetId',
  '/project/:projectId/predict/:datasetId',
  '/project/:projectId/clustering-tabulares/:datasetId',
  '/project/:projectId/dataset/:datasetId/promptlab',
  '/project/:projectId/vision-lab/:datasetId',
  '/project/:projectId/vision-lab/:datasetId/explorer',
  '/project/:projectId/vision-lab/:datasetId/clustering',
  '/project/:projectId/pdf-explorer/:datasetId/explorer',
  '/project/:projectId/pdf-extractor/:datasetId',
];

function ActiveSelectionManager() {
  const { setSelection, clearSelection } = useSelection();
  const location = useLocation();

  useEffect(() => {
    let matchFound = false;

    for (const pattern of EXPORTABLE_ROUTES) {
      const match = matchPath(pattern, location.pathname);

      if (match) {
        const { projectId, datasetId } = match.params;

        setSelection(prev => ({
            ...prev,
            selectedProjectId: projectId,
            selectedDatasetId: datasetId,
        }));
        
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      clearSelection();
    }
  }, [location.pathname, setSelection, clearSelection]);

  return null;
}

export default ActiveSelectionManager;