import React, { useState, useEffect } from 'react';
import CalendarPage from './pages/CalendarPage';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Estadisticas from './pages/Estadisticas';
import Operaciones from './pages/Operaciones'; 
import EstadoAeronaves from './pages/EstadoAeronaves';
import Material from './pages/Material'; 
import OperacionesMapa from './pages/OperacionesMapa';
import CargaTactica from './pages/CargaTactica'; // <--- NUEVO COMPONENTE

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
        localStorage.clear();
        setAuth(false);
        setRole(null);
        setView('calendar');
    };

    /**
     * LÓGICA DE PERMISOS UNIFICADA
     */
    const puedeGestionarMaterial = role === 'admin' || role === 'S4' || role === 'S4_UNIDAD';
    const puedeCargarOperaciones = role === 'admin' || role === 'user' || role === 'S4' || role === 'S4_UNIDAD' || role === 'boss';
    const puedeVerStats = role === 'admin' || role === 'boss';
    const puedeVerMapa = role === 'admin' || role === 'boss';

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
                    {isMobile ? '🦅 GESTIÓN AE' : '🦅 OPERACIONES AVIACION DE EJERCITO'}
                </div>
                
                <div style={{
                    ...styles.navActions,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    marginTop: isMobile ? '10px' : '0'
                }}>
                    {auth ? (
                        <>
                            {/* BOTÓN MONITOR */}
                            <button 
                                onClick={() => setView('calendar')}
                                style={{
                                    ...styles.btnNav,
                                    backgroundColor: view === 'calendar' ? '#1e3799' : '#4a69bd',
                                    border: view === 'calendar' ? '2px solid white' : 'none'
                                }}
                            >
                                📅 Calendario
                            </button>

                            {/* BOTÓN MAPA TÁCTICO */}
                            {puedeVerMapa && (
                                <button 
                                    onClick={() => setView('mapa')}
                                    style={{
                                        ...styles.btnNav,
                                        backgroundColor: view === 'mapa' ? '#d35400' : '#4a69bd',
                                        border: view === 'mapa' ? '2px solid white' : 'none'
                                    }}
                                >
                                    📍 Operaciones en Desarrollo
                                </button>
                            )}

                            {/* BOTÓN DESPACHO TÁCTICO (NUEVO FORMULARIO) */}
                            {puedeCargarOperaciones && (
                                <button 
                                    onClick={() => setView('despacho')}
                                    style={{
                                        ...styles.btnNav,
                                        backgroundColor: view === 'despacho' ? '#e67e22' : '#4a69bd',
                                        border: view === 'despacho' ? '2px solid white' : 'none'
                                    }}
                                >
                                    ⚡ Carga/Actualizacion de Vuelos
                                </button>
                            )}

                            {/* BOTÓN ESTADO GENERAL */}
                            <button 
                                onClick={() => setView('estado')}
                                style={{
                                    ...styles.btnNav,
                                    backgroundColor: view === 'estado' ? '#2c3e50' : '#4a69bd',
                                    border: view === 'estado' ? '2px solid white' : 'none'
                                }}
                            >
                                🚁 Estado del Material
                            </button>

                            {/* BOTÓN GESTIÓN MATERIAL */}
                            {puedeGestionarMaterial && (
                                <button 
                                    onClick={() => setView('material')}
                                    style={{
                                        ...styles.btnNav,
                                        backgroundColor: view === 'material' ? '#8e44ad' : '#4a69bd',
                                        border: view === 'material' ? '2px solid white' : 'none'
                                    }}
                                >
                                    🛠️ Carga del Material
                                </button>
                            )}

                            {/* BOTÓN ESTADÍSTICAS */}
                            {puedeVerStats && (
                                <button 
                                    onClick={() => setView('stats')}
                                    style={{
                                        ...styles.btnNav,
                                        backgroundColor: view === 'stats' ? '#007bff' : '#4a69bd',
                                        border: view === 'stats' ? '2px solid white' : 'none'
                                    }}
                                >
                                    📊 Estadisticas
                                </button>
                            )}

                            {/* BOTÓN CARGA ADMINISTRATIVA (FORMULARIO ORIGINAL) */}
                            {puedeCargarOperaciones && (
                                <button 
                                    onClick={() => setView('operaciones')}
                                    style={{
                                        ...styles.btnNav,
                                        backgroundColor: view === 'operaciones' ? '#60a3bc' : '#4a69bd',
                                        border: view === 'operaciones' ? '2px solid white' : 'none'
                                    }}
                                >
                                    📝 Cargar en Calendario
                                </button>
                            )}

                            {/* ACCESO A PANEL ADMIN */}
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

            {/* ÁREA DE CONTENIDO */}
            <main style={(view === 'stats' || view === 'material' || view === 'estado' || view === 'mapa' || view === 'despacho') ? styles.containerStats : styles.container}>
                {!auth ? (
                    <Login setAuth={setAuth} />
                ) : (
                    (() => {
                        if (view === 'admin' && role === 'admin') return <AdminPanel />;
                        if (view === 'stats' && puedeVerStats) return <Estadisticas />;
                        if (view === 'mapa' && puedeVerMapa) return <OperacionesMapa />;
                        if (view === 'despacho' && puedeCargarOperaciones) return <CargaTactica />;
                        if (view === 'operaciones') return <Operaciones />; 
                        if (view === 'estado') return <EstadoAeronaves />;
                        if (view === 'material' && puedeGestionarMaterial) return <Material />;
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