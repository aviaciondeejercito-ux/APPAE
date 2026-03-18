import React, { useState, useEffect } from 'react';
import CalendarPage from './pages/CalendarPage';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Estadisticas from './pages/Estadisticas';

function App() {
    // 1. Estados de Autenticación y Navegación
    const [auth, setAuth] = useState(!!localStorage.getItem('token'));
    const [role, setRole] = useState(localStorage.getItem('role'));
    const [view, setView] = useState('calendar'); 
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Escucha cambios de tamaño de pantalla para ajuste dinámico
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 2. Efecto de sincronización de seguridad
    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedRole = localStorage.getItem('role');
        if (token) {
            setAuth(true);
            setRole(savedRole);
        }
    }, [auth]);

    // 3. Gestión de Cierre de Sesión Seguro
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
        setAuth(false);
        setRole(null);
        setView('calendar');
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif' }}>
            
            {/* HEADER INSTITUCIONAL - BARRA DE MANDO */}
            <nav style={{
                ...styles.navbar,
                flexDirection: isMobile ? 'column' : 'row',
                padding: isMobile ? '10px' : '12px 40px',
                height: isMobile ? 'auto' : '60px'
            }}>
                <div 
                    style={styles.logo} 
                    onClick={() => setView('calendar')}
                    title="Volver al Monitor Principal"
                >
                    {isMobile ? '🦅 GESTIÓN AE' : '🦅 SISTEMA GESTIÓN AE'}
                </div>
                
                <div style={{
                    ...styles.navActions,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    marginTop: isMobile ? '10px' : '0'
                }}>
                    {auth ? (
                        <>
                            {/* BOTÓN MONITOR: Para volver siempre al calendario */}
                            <button 
                                onClick={() => setView('calendar')}
                                style={{
                                    ...styles.btnNav,
                                    backgroundColor: view === 'calendar' ? '#1e3799' : '#4a69bd',
                                    border: view === 'calendar' ? '2px solid white' : 'none'
                                }}
                            >
                                📅 Monitor
                            </button>

                            {/* BOTÓN ESTADÍSTICAS: Accesible para todos */}
                            <button 
                                onClick={() => setView('stats')}
                                style={{
                                    ...styles.btnNav,
                                    backgroundColor: view === 'stats' ? '#007bff' : '#4a69bd',
                                    border: view === 'stats' ? '2px solid white' : 'none'
                                }}
                            >
                                📊 Stats
                            </button>

                            {/* BOTÓN OPERACIONES: Solo para Admin y User (donde moveremos la carga) */}
                            {(role === 'admin' || role === 'user') && (
                                <button 
                                    onClick={() => setView('operaciones')}
                                    style={{
                                        ...styles.btnNav,
                                        backgroundColor: view === 'operaciones' ? '#60a3bc' : '#4a69bd',
                                        border: view === 'operaciones' ? '2px solid white' : 'none'
                                    }}
                                >
                                    📝 Cargar
                                </button>
                            )}

                            {/* ACCESO A PANEL ADMIN: Gestión de usuarios */}
                            {role === 'admin' && (
                                <button 
                                    onClick={() => setView('admin')}
                                    style={{
                                        ...styles.btnNav,
                                        backgroundColor: view === 'admin' ? '#5cb85c' : '#f0ad4e'
                                    }}
                                >
                                    ⚙️ Usuarios
                                </button>
                            )}

                            <div style={{
                                ...styles.userInfo,
                                borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.2)',
                                paddingLeft: isMobile ? '0' : '20px'
                            }}>
                                <button onClick={handleLogout} style={styles.btnLogout}>
                                    Salir
                                </button>
                            </div>
                        </>
                    ) : (
                        <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Acceso Restringido</span>
                    )}
                </div>
            </nav>

            {/* ÁREA DE OPERACIONES (Contenido Principal) */}
            <main style={view === 'stats' ? styles.containerStats : styles.container}>
                {!auth ? (
                    <Login setAuth={setAuth} />
                ) : (
                    // Lógica de ruteo interno dinámico
                    (() => {
                        if (view === 'admin' && role === 'admin') return <AdminPanel />;
                        if (view === 'stats') return <Estadisticas />;
                        if (view === 'operaciones') return <div style={{padding: '20px', textAlign: 'center'}}><h2>Pestaña de Carga (Próximo paso)</h2><p>Aquí moveremos los formularios del Calendario.</p></div>;
                        return <CalendarPage />;
                    })()
                )}
            </main>

            <footer style={styles.footer}>
                © 2026 Aviación de Ejército - Sistema Operativo
            </footer>
        </div>
    );
}

const styles = {
    navbar: {
        backgroundColor: '#1b3a57',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease'
    },
    logo: { fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px' },
    navActions: { display: 'flex', alignItems: 'center', gap: '8px' },
    userInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
    btnNav: {
        color: 'white',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.8rem',
        transition: '0.3s'
    },
    btnLogout: {
        backgroundColor: 'transparent',
        color: '#ff9999',
        border: '1px solid #ff9999',
        padding: '4px 10px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.75rem',
        fontWeight: 'bold'
    },
    container: { 
        maxWidth: '1400px', 
        margin: '10px auto', 
        padding: '0 10px',
        minHeight: 'calc(100vh - 160px)' 
    },
    containerStats: {
        width: '100%',
        margin: '0',
        padding: '0',
        minHeight: 'calc(100vh - 160px)'
    },
    footer: { 
        textAlign: 'center', 
        padding: '15px', 
        color: '#888', 
        fontSize: '0.7rem',
        borderTop: '1px solid #ddd',
        marginTop: '20px'
    }
};

export default App;