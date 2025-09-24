// src/context/UserContext.jsx 

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    // Estado de autenticación central
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Solo para la autenticación inicial

    // Estado de datos adicionales del perfil
    const [profile, setProfile] = useState(null);
    const [isPro, setIsPro] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false); // Un loading separado para los datos
    const [error, setError] = useState(null);

    // --- EFECTO #1: MANEJAR LA AUTENTICACIÓN ---
    // Este efecto se encarga ÚNICAMENTE de saber si el usuario está logueado o no.
    useEffect(() => {
        const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false); // ¡CLAVE! Se pone en false aquí, inmediatamente.
            }
        );

        return () => {
            authListener.unsubscribe();
        };
    }, []);

    // --- EFECTO #2: CARGAR DATOS DEL PERFIL ---
    // Este efecto se ejecuta cada vez que el 'user' cambia.
    useEffect(() => {
        // Si hay un usuario, buscamos sus datos.
        if (user) {
            setLoadingProfile(true); // Iniciamos la carga de datos del perfil
            setError(null);

            const fetchProfileData = async () => {
                try {
                    // Obtener perfil
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    if (profileError && profileError.code !== 'PGRST116') throw profileError;
                    setProfile(profileData || null);

                    // Obtener suscripción
                    const { data: subData, error: subError } = await supabase
                        .from('subscriptions')
                        .select('plan_id, status')
                        .eq('user_id', user.id)
                        .in('status', ['active', 'trialing'])
                        .maybeSingle();
                    if (subError) throw subError;

                    setIsPro(!!(subData && subData.plan_id?.toLowerCase().includes('pro')));
                    
                } catch (err) {
                    console.error('Error al obtener datos de usuario:', err.message);
                    setError(err.message);
                } finally {
                    setLoadingProfile(false); // Terminamos la carga de datos del perfil
                }
            };

            fetchProfileData();
        } else {
            // Si no hay usuario, limpiamos los datos del perfil.
            setProfile(null);
            setIsPro(false);
        }
    }, [user]); // <-- Se dispara cuando 'user' cambia

    const value = { 
        user, 
        session, 
        loading, // El loading principal para las rutas
        profile, 
        isPro, 
        loadingProfile, // El loading secundario para UI
        error 
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

// Tu hook personalizado sigue siendo perfecto
export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser debe usarse dentro de un UserProvider');
    }
    return context;
};