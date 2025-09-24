// src/pages/HomePage.jsx

// ✅ TODAS LAS IMPORTACIONES JUNTAS AL PRINCIPIO
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import promptLabLogo from '@/assets/promptLabLogo.png';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';


export default function HomePage() {
    const features = [
        ['Procesamiento automatizado de datos y texto', 'Automatizá la preparación de tus datos ahorrando tiempo.'],
        ['Análisis predictivos', 'Obtené insights clave sin necesidad de programar.'],
        ['Tipos de Modelos de IA', 'Explorá distintos modelos, sin complicaciones técnicas.'],
        ['Generación de prompts', 'Creá prompts efectivos sin ser experta/o.'],
        ['Biblioteca de prompts', 'Inspirate con ejemplos listos para usar.'],
    ];
  


    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(to left, #2193b0, #6dd5ed)',

            }}
        >
            <Box

                sx={{
                    display: 'flex',
                    position: 'relative',
                    width: '1200px',
                    height: '600px',
                    backgroundColor: '#2193b0',
                    borderRadius: '20px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                    overflow: 'hidden',
                    flexDirection: 'row-reverse', // 🔥 ESTO INVIERTE LAS COLUMNAS
                    border: '1px solid rgba(255,255,255,0.3)',



                }}
            >

                {/* === COLUMNA IZQUIERDA (CORREGIDA) === */}
                <Box
                    sx={{
                        width: '50%',
                        backgroundColor: '#ffffff',
                        color: '#6dd5ed',
                        p: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        // 👇 --- CAMBIOS PRINCIPALES AQUÍ --- 👇
                        justifyContent: 'center', // Empuja los grupos de contenido a los extremos
                        alignItems: 'center', // Centra todo horizontalmente
                    }}
                >
                    {/* Grupo superior: Título y subtítulo */}
                    <Box sx={{ width: '100%' }}> {/* Contenedor para alinear el texto */}

                        {/* 3. ESLOGAN (TAGLINE): También es independiente. */}
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 'bold',
                                color: '#6dd5ed',
                                fontSize: '1.3rem', // por ejemplo: apenas más chico que el h5 típico


                            }}
                        >
                            Plataforma integral para acelerar tus proyectos de IA
                        </Typography>

                        {/* Subtítulo / Tagline */}
                        <Typography
                            variant="h5"
                            sx={{
                                mt: 2,
                                opacity: 0.8,
                                fontWeight: 'bold',
                                fontSize: { xs: '1rem', md: '1.15rem' },
                            }}
                        >
                            Accesible, intuitiva y modular
                        </Typography>


                        <Box sx={{ mt: 7, width: '100%' }}>
                            <Box
                                component="ul"
                                sx={{
                                    listStyle: 'none',
                                    p: 0,
                                    m: 0,
                                    width: '100%',
                                }}
                            >
                                {features.map(([title, content], index) => (
                                    <Box
                                        component="li"
                                        key={index}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 1.5,
                                            mb: 1, // menos espacio entre ítems
                                        }}
                                    >
                                        <ArrowForwardIosIcon
                                            sx={{
                                                color: '#6dd5ed',
                                                mt: '2px',
                                                fontSize: '0.85rem', // más pequeño el ícono
                                                flexShrink: 0,
                                            }}
                                        />
                                        <Box>
                                            <Typography
                                                component="span"
                                                sx={{
                                                    fontWeight: 'bold',
                                                    color: '#2193b0',
                                                    fontSize: '0.8rem', // más chico
                                                    display: 'block',
                                                    lineHeight: 1.2,
                                                }}
                                            >
                                                {title}
                                            </Typography>
                                            <Typography
                                                component="span"
                                                sx={{
                                                    color: '#555',
                                                    fontSize: '0.7rem', // más chico
                                                    display: 'block',
                                                    lineHeight: 1.2,
                                                    mt: 0.5,
                                                }}
                                            >
                                                {content}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                    </Box>

                    {/* Grupo inferior: Botones */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            mt: 9, // aumentamos margen superior
                        }}
                    >
                        <Button
                            variant="contained"
                            component={RouterLink}
                            to="/auth?view=register" // ✅ AHORA CON QUERY

                            sx={{ backgroundColor: '#6dd5ed', color: '#fff', width: '200px' }} // Ancho fijo para consistencia
                        >
                            Registrarse
                        </Button>
                        <Button
                            variant="outlined"
                            component={RouterLink}
                            to="/auth?view=login" // ✅ AHORA CON QUERY
                            sx={{ borderColor: '#6dd5ed', color: '#2193b0', width: '200px' }} // Ancho fijo para consistencia
                        >
                            Iniciar Sesión
                        </Button>
                    </Box>
                </Box>

                {/* === COLUMNA DERECHA (LOGO) === */}
                <Box
                    sx={{
                        width: '%',
                        backgroundColor: '#6dd5ed',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',   // pega arriba el contenido
                        alignItems: 'flex-start',       // pega a la izquierda
                        p: 6,
                    }}
                >
                    {/* Nombre arriba del logo */}
                    <Typography
                        variant="h2"
                        sx={{
                            mt: 5,
                            fontStyle: 'italic',
                            fontWeight: 'bold',
                            color: '#fff',
                        }}
                    >
                        PromptLab

                    </Typography>

                    {/* Logo */}
                    <Box
                        component="img"
                        src={promptLabLogo}
                        alt="Logo de PromptLab"
                        className="logo" // 👈 agregá esto
                        sx={{
                            width: '500px',
                            height: 'auto',
                            animation: 'logo-spin infinite 20s linear',
                            maxWidth: '100%',
                            mt: 10,               // margen arriba 0
                            mb: 2,               // margen abajo pequeño
                            alignSelf: 'flex-start', // ¡es flex-start, no “lefth”!
                        }}
                    />


                </Box>

            </Box>
        </Box>
    );
}



