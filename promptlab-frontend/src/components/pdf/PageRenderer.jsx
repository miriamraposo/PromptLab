// En src/components/pdf/PageRenderer.jsx

import React from 'react';
import { Box, Paper } from '@mui/material';
import { useMemo } from 'react'; // <
// Componente "tonto" para renderizar UNA página


export default function PageRenderer({ pageData, onElementSelect }) { // <-- Simplificamos los props
    

     const groupedElements = useMemo(() => {
        // 1. Guarda de seguridad inicial
        if (!pageData?.elements || !Array.isArray(pageData.elements)) {
            return [];
        }

        const textElements = pageData.elements.filter(el => el.type === 'text' && el.bbox); // <-- Solo procesar los que tienen bbox
        const otherElements = pageData.elements.filter(el => el.type !== 'text');
        
        const lines = {};

        // 2. Agrupar spans en líneas por su coordenada Y
        textElements.forEach(el => {
            const y_coordinate = Math.round(el.bbox[1]);
            if (!lines[y_coordinate]) {
                lines[y_coordinate] = [];
            }
            lines[y_coordinate].push(el);
        });

        // 3. Convertir las líneas agrupadas en elementos únicos
        const groupedTextLines = Object.values(lines).map(lineSpans => {
            // Guarda de seguridad: si una línea está vacía por alguna razón, la saltamos.
            if (!lineSpans || lineSpans.length === 0) return null;

            // Ordenar los spans en la línea de izquierda a derecha
            lineSpans.sort((a, b) => a.bbox[0] - b.bbox[0]);

            const lineContent = lineSpans.map(span => span.content).join(' ');
            
            // Calcular el Bbox que engloba toda la línea
            const x0 = lineSpans[0].bbox[0];
            const y0 = Math.min(...lineSpans.map(s => s.bbox[1])); // Tomar el 'top' más alto
            const x1 = lineSpans[lineSpans.length - 1].bbox[2];
            const y1 = Math.max(...lineSpans.map(s => s.bbox[3])); // Tomar el 'bottom' más bajo
            
            // --- CORRECCIÓN DEL ERROR DE ÁMBITO ---
            // Usamos la coordenada Y del primer span como ID de la línea
            const lineId = Math.round(lineSpans[0].bbox[1]);

            return {
                id: `line-${lineId}`,
                type: 'text_line',
                content: lineContent,
                bbox: [x0, y0, x1, y1],
                originalSpans: lineSpans 
            };
        }).filter(Boolean); // <-- Elimina cualquier elemento nulo que se haya generado

        // 4. Devolver la lista combinada final
        return [...otherElements, ...groupedTextLines];

    }, [pageData]);

    const apiUrl = import.meta.env.VITE_API_URL;

   

    return (
        
        <Paper 
            elevation={3} 
            sx={{ 
                position: 'relative', 
                width: pageData.width, 
                height: pageData.height, 
                mx: 'auto'
            }}
        >
            {groupedElements.map(element => {
                
                // --- 👇 ¡AQUÍ ESTÁ LA LÍNEA QUE FALTABA! 👇 ---
                // Definimos el estilo para cada elemento en cada iteración.
                const style = {
                    position: 'absolute',
                    left: element.bbox[0],
                    top: element.bbox[1],
                    width: element.bbox[2] - element.bbox[0],
                    height: element.bbox[3] - element.bbox[1],
                    // Puedes añadir más estilos comunes aquí si quieres
                };

                // Ahora tienes un nuevo tipo 'text_line'
                if (element.type === 'text_line') {
                    // Ya no usamos <textarea>. Usamos un <Box> que se comporta como un botón.
                    return (
                        <Box
                            key={element.id}
                            onClick={() => onElementSelect(element.content)} // <-- Llama al padre con el TEXTO
                            sx={{
                                ...style,
                                cursor: 'pointer',
                                padding: '2px 4px', // Un poco de espacio para que no se vea apretado
                                borderRadius: '3px',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '15px', // Un tamaño de letra base legible
                                color: '#333',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 150, 255, 0.15)',
                                    boxShadow: '0 0 0 1px rgba(0, 150, 255, 0.5)'
                                }
                            }}
                        >
                            {element.content}
                        </Box>
                    );
                }

                if (element.type === 'image') {
                    const imageUrl = `${apiUrl}/api/pdf/image/${element.doc_id}/${element.xref}`;
                    return (
                        <Box
                            key={element.id}
                            component="img"
                            src={imageUrl}
                            sx={{
                                ...style,
                                objectFit: 'cover'
                                // Podemos añadirle interactividad a las imágenes después
                            }}
                        />
                    );
                }
                return null;
            })}
        </Paper>
    );
}