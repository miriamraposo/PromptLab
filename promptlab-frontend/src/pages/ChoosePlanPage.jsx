// src/pages/ChoosePlanPage.jsx (VERSIÓN CORREGIDA Y FUNCIONAL)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // ✅ Importa el cliente único
import { Box, Button, Typography, CircularProgress } from '@mui/material';

// ⚠️ REEMPLAZA ESTO con tu ID de precio de Stripe para el plan Pro
const STRIPE_PRO_PRICE_ID = 'price_xxxxxxxxxxxxxx'; 

export default function ChoosePlanPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleSelectPlan = async (plan) => {
        setIsLoading(true);
        setSelectedPlan(plan);
        setErrorMsg('');
    
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No se pudo obtener el usuario. Por favor, vuelve a iniciar sesión.');

            if (plan === 'free') {
                // Lógica para el plan gratuito:
                // La regla es "si no hay suscripción, es free".
                // Por lo tanto, no necesitamos hacer nada en la base de datos aquí.
                // Simplemente lo enviamos al dashboard.
              
                navigate('/dashboard');

            } else if (plan === 'pro') {
                const response = await fetch('http://localhost:3001/api/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        planId: STRIPE_PRO_PRICE_ID,
                        userId: user.id,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Error del servidor: ${response.status}`);
                }

                const session = await response.json();
                if (session.url) {
                    window.location.href = session.url; // Stripe ahora envía una URL completa
                } else {
                    throw new Error('No se pudo crear la sesión de pago.');
                }
            }
        } catch (error) {
            console.error('Error al seleccionar el plan:', error);
            setErrorMsg(error.message || 'Ocurrió un error inesperado.');
        } finally {
            setIsLoading(false);
        }
    };

 
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <Typography variant="h3" gutterBottom>Elige tu Plan</Typography>
            
            <Box sx={{ display: 'flex', gap: 4, mt: 4 }}>
                <Button 
                    variant="outlined" 
                    onClick={() => handleSelectPlan('free')}
                    disabled={isLoading && selectedPlan === 'free'}
                >
                    {isLoading && selectedPlan === 'free' ? <CircularProgress size={24} /> : 'Plan Gratuito'}
                </Button>
                <Button 
                    variant="contained" 
                    onClick={() => handleSelectPlan('pro')}
                    disabled={isLoading && selectedPlan === 'pro'}
                >
                    {isLoading && selectedPlan === 'pro' ? <CircularProgress size={24} /> : 'Plan Pro'}
                </Button>
            </Box>
            
            {errorMsg && (
                <Typography color="error" sx={{ mt: 2 }}>
                    {errorMsg}
                </Typography>
            )}
        </Box>
    );
}
