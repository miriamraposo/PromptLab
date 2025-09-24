// /src/api/projectApi.js (VERSIÓN FINAL Y COMPLETA)

import axios from 'axios';
import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/api';

// --- CREAMOS UNA INSTANCIA DE AXIOS CON INTERCEPTOR ---
const apiClient = axios.create({
    baseURL: API_URL,
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
           
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.error("No se pudo refrescar la sesión.", refreshError);
                supabase.auth.signOut();
                window.location.href = '/auth';
                return Promise.reject(error);
            }
           
            const { data: { session } } = await supabase.auth.getSession();
            originalRequest.headers['Authorization'] = `Bearer ${session.access_token}`;
            return apiClient(originalRequest);
        }
        return Promise.reject(error);
    }
);

// --- Función auxiliar para obtener los encabezados ---
const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No hay sesión de usuario activa.');
    return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
    };
};

// --- FUNCIONES DE LA API (ACTUALIZADAS PARA USAR `apiClient`) ---

export const fetchProjects = async () => {
    try {
        const headers = await getAuthHeaders();
        const response = await apiClient.get('/projects', { headers });
        return response.data;
    } catch (error) {
        return { success: false, error: error.response?.data?.error || "Error de conexión." };
    }
};

export const createProject = async (projectName) => {
    try {
        const headers = await getAuthHeaders();
        const body = { project_name: projectName };
        const response = await apiClient.post('/projects', body, { headers });
        return response.data;
    } catch (error) {
        return { success: false, error: error.response?.data?.error || "No se pudo crear el proyecto." };
    }
};

export const deleteProject = async (projectId) => {
    try {
        const headers = await getAuthHeaders();
        const response = await apiClient.delete(`/projects/${projectId}`, { headers });
        return response.data;
    } catch (error) {
        return { success: false, error: error.response?.data?.error || "No se pudo eliminar el proyecto." };
    }
};

export const renameProject = async (projectId, newName) => {
    try {
        const headers = await getAuthHeaders();
        const body = { new_name: newName };
        const response = await apiClient.put(`/projects/${projectId}`, body, { headers });
        return response.data;
    } catch (error) {
        return { success: false, error: error.response?.data?.error || "No se pudo renombrar el proyecto." };
    }
};

export const uploadDataset = async (projectId, file, datasetName) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No hay sesión de usuario activa.');
        
        const formData = new FormData();
        formData.append('file', file);
        if (datasetName) {
            formData.append('dataset_name', datasetName);
        }

        const response = await apiClient.post(
            `/projects/${projectId}/datasets/upload`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    // axios se encarga del 'Content-Type' para FormData
                }
            }
        );
        return response.data;
    } catch (error) {
        return { success: false, error: error.response?.data?.error || "No se pudo subir el archivo." };
    }
};