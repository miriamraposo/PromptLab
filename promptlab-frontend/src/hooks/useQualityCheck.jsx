import { useState } from 'react';
import { supabase } from '../supabaseClient';

export function useQualityCheck() {
    const [isChecking, setIsChecking] = useState(false);
    const [qualityResult, setQualityResult] = useState(null);

    const runQualityCheck = async (datasetId) => {
        if (!datasetId) return;

        setIsChecking(true);
        setQualityResult(null);

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error(sessionError?.message || "Necesitas iniciar sesión.");
            }
            const accessToken = session.access_token;

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/check-quality`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            const resultData = await response.json();

            if (!response.ok) {
                throw new Error(resultData.error || 'Ocurrió un error en el servidor.');
            }
            
            setQualityResult(resultData);

        } catch (error) {
            console.error("Error en el chequeo de calidad:", error);
            setQualityResult({ success: false, message: error.message });
        } finally {
            setIsChecking(false);
        }
    };

    const resetQualityResult = () => {
        setQualityResult(null);
    };

    return { 
        isChecking, 
        qualityResult, 
        runQualityCheck, 
        resetQualityResult 
    };
}