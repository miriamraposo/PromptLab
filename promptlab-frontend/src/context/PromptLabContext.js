// src/context/PromptLabContext.js
import React, { createContext, useState, useContext } from 'react';

// 1. Creamos el contexto
const PromptLabContext = createContext();

// 2. Creamos un "Hook" personalizado para usar el contexto fácilmente
export const usePromptLab = () => useContext(PromptLabContext);

// 3. Creamos el Proveedor que contendrá la lógica y los datos
export const PromptLabProvider = ({ children }) => {
    const [sessionHistory, setSessionHistory] = useState([]);
    const [historyOpen, setHistoryOpen] = useState(false);

    const openHistoryModal = () => setHistoryOpen(true);
    const closeHistoryModal = () => setHistoryOpen(false);

    // Los valores que queremos compartir con toda la app
    const value = {
        sessionHistory,
        setSessionHistory,
        historyOpen,
        openHistoryModal,
        closeHistoryModal
    };

    return (
        <PromptLabContext.Provider value={value}>
            {children}
        </PromptLabContext.Provider>
    );
};