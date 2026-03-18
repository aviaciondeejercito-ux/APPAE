import React, { useState, useEffect } from 'react';
import CalendarPage from './pages/CalendarPage';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Estadisticas from './pages/Estadisticas'; // Importamos la nueva página

function App() {
    // 1. Estados de Autenticación y Navegación
    const [auth, setAuth] = useState(!!localStorage.getItem('token'));
    const [role, setRole] = useState(localStorage.getItem('role'));
    const [view, setView] = useState('calendar'); 

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
            <nav style={styles.navbar}>
                <div 
                    style={styles.logo} 
                    onClick={() => setView('calendar')}
                    title="Volver al Monitor Principal"
                >
                    🦅 SISTEMA GESTIÓN AE
                </div>
                
                <div style={styles.navActions}>
                    {auth ? (
                        <>
                            {/* BOTÓN ESTADÍSTICAS: Accesible para todos los usuarios logueados */}
                            <button 
                                onClick={() => setView('stats')}
                                style={{
                                    ...styles.btnNav,
                                    backgroundColor: view === 'stats' ? '#007bff' : '#4a69bd',
                                    border: view === 'stats' ? '2px solid white' : 'none'
                                }}
                            >
                                📊 Estadísticas
                            </button>

                            {/* ACCESO A PANEL ADMIN: Solo si el rol es estrictamente 'admin' */}
                            {role === 'admin' && (
                                <button 
                                    onClick={() => setView(view === 'admin' ? 'calendar' : 'admin')}
                                    style={{
                                        ...styles.btnNav,
                                        backgroundColor: view === 'admin' ? '#5cb85c' : '#f0ad4e'
                                    }}
                                >
                                    {view === 'admin' ? '📅 Volver al Monitor' : '⚙️ Gestión de Usuarios'}
                                </button>
                            )}

                            <div style={styles.userInfo}>
                                <span style={styles.roleBadge}>
                                    {role ? role.toUpperCase() : 'USUARIO'}
                                </span>
                                <button onClick={handleLogout} style={styles.btnLogout}>
                                    Cerrar Sesión
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
                        return <CalendarPage />;
                    })()
                )}
            </main>

            <footer style={styles.footer}>
                © 2026 Aviación de Ejército - Sistema de Control de Actividades Operativas
            </footer>
        </div>
    );
}

// ESTILOS DEL CONTENEDOR RAÍZ
const styles = {
    navbar: {
        backgroundColor: '#1b3a57',
        color: 'white',
        padding: '12px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
    },
    logo: { fontSize: '1.3rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px' },
    navActions: { display: 'flex', alignItems: 'center', gap: '15px' },
    userInfo: { display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '20px' },
    roleBadge: { 
        fontSize: '0.7rem', 
        backgroundColor: 'rgba(255,255,255,0.15)', 
        padding: '4px 10px', 
        borderRadius: '4px',
        fontWeight: 'bold'
    },
    btnNav: {
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.85rem',
        transition: '0.3s'
    },
    btnLogout: {
        backgroundColor: 'transparent',
        color: '#ff9999',
        border: '1px solid #ff9999',
        padding: '6px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        transition: '0.3s'
    },
    container: { 
        maxWidth: '1400px', 
        margin: '20px auto', 
        padding: '0 20px',
        minHeight: 'calc(100vh - 160px)' 
    },
    // Contenedor especial para estadísticas (ocupa todo el ancho para el Looker)
    containerStats: {
        width: '100%',
        margin: '0',
        padding: '0',
        minHeight: 'calc(100vh - 160px)'
    },
    footer: { 
        textAlign: 'center', 
        padding: '25px', 
        color: '#888', 
        fontSize: '0.75rem',
        borderTop: '1px solid #ddd',
        marginTop: '40px'
    }
};

export default App;