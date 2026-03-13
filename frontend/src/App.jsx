import React, { useState, useEffect } from 'react';
import CalendarPage from './pages/CalendarPage';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel'; // Importamos el nuevo panel

function App() {
    // Estado de autenticación basado en el token
    const [auth, setAuth] = useState(!!localStorage.getItem('token'));
    // Estado para alternar entre Calendario y Panel de Admin
    const [view, setView] = useState('calendar'); 
    const role = localStorage.getItem('role');

    useEffect(() => {
        const token = localStorage.getItem('token');
        setAuth(!!token);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        setAuth(false);
        window.location.href = '/';
    };

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
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setView('calendar')}>
                    SISTEMA GESTIÓN AE
                </div>
                
                <div>
                    {auth ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            {/* BOTÓN DE ADMIN: Solo visible para el rol admin */}
                            {role === 'admin' && (
                                <button 
                                    onClick={() => setView(view === 'calendar' ? 'admin' : 'calendar')}
                                    style={{
                                        backgroundColor: '#f0ad4e',
                                        color: 'white',
                                        border: 'none',
                                        padding: '5px 12px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {view === 'calendar' ? '⚙️ Panel Admin' : '📅 Ver Calendario'}
                                </button>
                            )}

                            <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                Rol: {role || 'Usuario'}
                            </span>
                            <button 
                                onClick={handleLogout}
                                style={{
                                    backgroundColor: '#d9534f',
                                    color: 'white',
                                    border: 'none',
                                    padding: '5px 12px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Cerrar Sesión
                            </button>
                        </div>
                    ) : (
                        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Acceso Restringido</span>
                    )}
                </div>
            </nav>

            {/* Contenido Principal con Lógica de Navegación y Seguridad */}
            <main style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 15px' }}>
                {auth ? (
                    // Si es admin y seleccionó el panel, lo muestra. Si no, muestra calendario.
                    view === 'admin' && role === 'admin' ? (
                        <AdminPanel />
                    ) : (
                        <CalendarPage />
                    )
                ) : (
                    <Login setAuth={setAuth} />
                )}
            </main>

            <footer style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '0.8rem' }}>
                © 2026 Aviación de Ejército - Sistema de Control de Actividades
            </footer>
        </div>
    );
}

export default App;