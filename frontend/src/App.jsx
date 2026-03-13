import React from 'react';
import CalendarPage from './pages/CalendarPage';

function App() {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'Arial, sans-serif' }}>
            {/* Header Institucional */}
            <nav style={{ 
                backgroundColor: '#1b3a57', 
                color: 'white', 
                padding: '15px 30px', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    SISTEMA GESTIÓN AE
                </div>
                <div>
                    {/* Aquí irán los botones de Login más adelante */}
                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Modo Visualización</span>
                </div>
            </nav>

            {/* Contenido Principal */}
            <main style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 15px' }}>
                <CalendarPage />
            </main>

            <footer style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '0.8rem' }}>
                © 2026 Aviación de Ejército - Sistema de Control de Actividades
            </footer>
        </div>
    );
}

export default App;