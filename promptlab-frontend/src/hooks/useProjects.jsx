// src/hooks/useProjects.jsx

 // ✨ CORRECCIÓN 5: Comentamos este useEffect para que no interfiera
    import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useSnackbar } from 'notistack';
import { Button } from '@mui/material'; // Importante para la acción de "Deshacer"

export function useProjects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isRenameModalOpen, setRenameModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const [activeProject, setActiveProject] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const drawerWidth = 240;

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Error al cargar proyectos.');
            setProjects(result.data || []);
        } catch (err) { // ESTA ESTABA CORRECTA
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        if (location.pathname === '/dashboard') {
            setActiveProject(null);
            setMenuAnchorEl(null);
        }
        window.scrollTo(0, 0);
    }, [location.pathname]);

    const filteredProjects = (projects || []).filter(p =>
        p && typeof p.projectName === 'string' &&
        p.projectName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleMenuOpen = (event, project) => {
        event.stopPropagation();
        setMenuAnchorEl(event.currentTarget);
        setActiveProject(project);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleRename = () => {
        setRenameModalOpen(true);
        handleMenuClose();
    };

    const handleDelete = () => {
        setDeleteModalOpen(true);
        handleMenuClose();
    };

    const confirmDeleteAndNotify = () => {
        if (!activeProject) return;
        const projectToDelete = activeProject;
        const previousProjects = [...projects];

        setDeleteModalOpen(false);
        setProjects(currentProjects => currentProjects.filter(p => p.id !== projectToDelete.id));
        setActiveProject(null);

        const undoAction = snackbarId => (
            <Button size="small" sx={{ color: 'white' }} onClick={() => {
                setProjects(previousProjects);
                closeSnackbar(snackbarId);
            }}>
                DESHACER
            </Button>
        );

        enqueueSnackbar(`Proyecto "${projectToDelete.projectName}" eliminado.`, {
            variant: 'info', autoHideDuration: 5000, action: undoAction,
            anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
            sx: { marginLeft: `${drawerWidth / 2}px` },
            onClose: (event, reason) => {
                if (reason === 'timeout') {
                    (async () => {
                        try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) throw new Error("Sesión no válida.");
                            await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectToDelete.id}`, {
                                method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` },
                            });
                        } catch (err) { // <-- ¡CORRECCIÓN AQUÍ! SE ELIMINÓ EL "=>"
                            enqueueSnackbar(`Error al eliminar: ${err.message}`, { variant: 'error' });
                            setProjects(previousProjects); // Restaurar proyectos si la eliminación falla en el backend
                        }
                    })();
                }
            }
        });
    };

    return {
        projects,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        filteredProjects,
        modals: {
            create: { open: isCreateModalOpen, setOpen: setCreateModalOpen },
            rename: { open: isRenameModalOpen, setOpen: setRenameModalOpen },
            delete: { open: isDeleteModalOpen, setOpen: setDeleteModalOpen },
        },
        menu: {
            anchorEl: menuAnchorEl,
            activeProject,
            handleMenuOpen,
            handleMenuClose,
        },
        actions: {
            handleRename,
            handleDelete,
            confirmDeleteAndNotify,
        },
        fetchProjects,
        // 👇 AÑADE LA FUNCIÓN QUE FALTABA AQUÍ 👇
        setActiveProject, 
    };
}





