//src/context/SelectionContext

import React, { createContext, useState, useContext, useCallback } from 'react';

const SelectionContext = createContext();

export function SelectionProvider({ children }) {
  const [selection, setSelection] = useState({
    selectedProjectId: null,
    selectedDatasetId: null,
    selectedDatasetName: null, // para mostrar nombres en la UI
    selectedDatasetType: null,
    isDatasetReadyForPrediction: false
  });

  // Función para limpiar la selección
  const clearSelection = useCallback(() => {
    setSelection({
      selectedProjectId: null,
      selectedDatasetId: null,
      selectedDatasetName: null,
      selectedDatasetType: null,
      isDatasetReadyForPrediction: false
    });
  }, []);

  const value = { selection, setSelection, clearSelection };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

// Hook para usar el contexto fácilmente
export function useSelection() {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error('useSelection debe usarse dentro de un SelectionProvider');
  }
  return context;
}
