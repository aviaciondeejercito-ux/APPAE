import React, { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css'; 

import CalendarPage from './pages/CalendarPage';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Estadisticas from './pages/Estadisticas';
import Operaciones from './pages/Operaciones'; 
import EstadoAeronaves from './pages/EstadoAeronaves';
import Material from './pages/Material'; 
import OperacionesMapa from './pages/OperacionesMapa';
import CargaTactica from './pages/CargaTactica';

/**
 * COMPONENTE PRINCIPAL - SISTEMA GESTIÓN AE
 * Estándar de Seguridad: SINCRO JOKER (Frontend Core)
 */
function App() {
    // 1. ESTADOS DE AUTENTICACIÓN Y NAVEGACIÓN
    const [auth, setAuth] = useState(!!localStorage.getItem('token'));
    const [role, setRole] = useState(localStorage.getItem('role'));
    const [view, setView] = useState('calendar'); 
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // ESTADOS DE CONEXIÓN
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(localStorage.getItem('lastSync') || '---');

    // Escucha cambios de tamaño de pantalla
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // FUNCIÓN PARA SINCRONIZAR EVENTOS GUARDADOS OFFLINE
    const syncOfflineEvents = async () => {
        const pending = JSON.parse(localStorage.getItem('pending_events') || '[]');
        if (pending.length === 0) return;

        setIsSyncing(true);
        console.log(`Sincronizando ${pending.length} eventos pendientes...`);
        
        let currentPending = [...pending];

        for (const event of pending) {
            try {
                // Se eliminan campos temporales antes de enviar al servidor
                const { id_temp, offline, ...eventToSync } = event;

                const res = await fetch('https://sistema-ae-backend.onrender.com/api/operaciones', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(eventToSync)
                });

                if (res.ok) {
                    // Filtrar el que se acaba de sincronizar con éxito
                    currentPending = currentPending.filter(e => e.id_temp !== event.id_temp);
                    localStorage.setItem('pending_events', JSON.stringify(currentPending));
                }
            } catch (err) {
                console.error("Error sincronizando evento, se mantiene en cola", err);
            }
        }
        
        setIsSyncing(false);
        const now = new Date().toLocaleString('es-AR', { 
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' 
        });
        setLastSync(now);
        localStorage.setItem('lastSync', now);
    };

    // GESTIÓN DE ESTADO ONLINE/OFFLINE Y ÚLTIMA CONEXIÓN
    useEffect(() => {
        const handleStatusChange = () => {
            const online = navigator.onLine;
            setIsOnline(online);
            if (online) {
                syncOfflineEvents();
            }
        };

        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);

        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    // 2. EFECTO DE SINCRONIZACIÓN DE SEGURIDAD
    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedRole = localStorage.getItem('role');
        if (token) {
            setAuth(true);
            setRole(savedRole);
        }
    }, [auth]);

    // 3. GESTIÓN DE CIERRE DE SESIÓN
    const handleLogout = () => {
        localStorage.clear();
        setAuth(false);
        setRole(null);
        setView('calendar');
    };

    const puedeGestionarMaterial = role === 'admin' || role === 'OFICINA_TECNICA';
    const puedeCargarOperaciones = role === 'admin' || role === 'user' || role === 'OFICINA_TECNICA' || role === 'BOSS';
    const puedeVerStats = role === 'admin' || role === 'BOSS' || role === 'DIRECTOR';
    const puedeVerMapa = role === 'admin' || role === 'BOSS' || role === 'DIRECTOR' || role === 'OTO' || role === 'user';

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
            
            {/* HEADER INSTITUCIONAL */}
            <nav style={{
                ...styles.navbar,
                flexDirection: isMobile ? 'column' : 'row',
                padding: isMobile ? '10px' : '0 30px',
                height: isMobile ? 'auto' : '65px'
            }}>
                <div 
                    style={styles.logo} 
                    onClick={() => setView('calendar')}
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

                            {puedeVerMapa && (
                                <button 
                                    onClick={() => setView('mapa')}
                                    style={{
                                        ...styles.btnNav,
                                        backgroundColor: view === 'mapa' ? '#d35400' : '#4a69bd',
                                        border: view === 'mapa' ? '2px solid white' : 'none'
                                    }}
                                >
                                    📍 Mapa 
                                </button>
                            )}

                            {(role === 'admin' || role === 'OTO' || role === 'user') && (
                                <button 
                                    onClick={() => setView('despacho')}
                                    style={{
                                        ...styles.btnNav,
                                        backgroundColor: view === 'despacho' ? '#e67e22' : '#4a69bd',
                                        border: view === 'despacho' ? '2px solid white' : 'none'
                                    }}
                                >
                                    ⚡ Vuelos
                                </button>
                            )}

                            <button 
                                onClick={() => setView('estado')}
                                style={{
                                    ...styles.btnNav,
                                    backgroundColor: view === 'estado' ? '#2c3e50' : '#4a69bd',
                                    border: view === 'estado' ? '2px solid white' : 'none'
                                }}
                            >
                                🚁 Estado Material
                            </button>

                            {puedeGestionarMaterial && (
                                <button 
                                    onClick={() => setView('material')}
                                    style={{
                                        ...styles.btnNav,
                                        backgroundColor: view === 'material' ? '#8e44ad' : '#4a69bd',
                                        border: view === 'material' ? '2px solid white' : 'none'
                                    }}
                                >
                                    🛠️ Material
                                </button>
                            )}

                            {puedeVerStats && (
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
                            )}

                            {puedeCargarOperaciones && (
                                <button 
                                    onClick={() => setView('operaciones')}
                                    style={{
                                        ...styles.btnNav,
                                        backgroundColor: view === 'operaciones' ? '#60a3bc' : '#4a69bd',
                                        border: view === 'operaciones' ? '2px solid white' : 'none'
                                    }}
                                >
                                    📝 Carga
                                </button>
                            )}

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

            {/* ÁREA DE CONTENIDO DINÁMICO */}
            <main style={(view === 'mapa' || view === 'stats' || view === 'material' || view === 'estado' || view === 'despacho') ? styles.containerFull : styles.container}>
                {!auth ? (
                    <Login setAuth={setAuth} />
                ) : (
                    (() => {
                        if (view === 'admin' && role === 'admin') return <AdminPanel />;
                        if (view === 'stats' && puedeVerStats) return <Estadisticas />;
                        if (view === 'mapa' && puedeVerMapa) return (
                            <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#000' }}>
                                <OperacionesMapa />
                            </div>
                        );
                        if (view === 'despacho' && puedeCargarOperaciones) return <CargaTactica />;
                        if (view === 'operaciones' && puedeCargarOperaciones) return <Operaciones />; 
                        if (view === 'estado') return <EstadoAeronaves />;
                        if (view === 'material' && puedeGestionarMaterial) return <Material />;
                        return <CalendarPage />;
                    })()
                )}
            </main>

            {/* FOOTER - INCLUYE INDICADOR DE CONEXIÓN */}
            <footer style={styles.footer}>
                <div style={styles.statusRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            backgroundColor: isSyncing ? '#3498db' : (isOnline ? '#2ecc71' : '#e74c3c'),
                            boxShadow: isSyncing ? '0 0 4px #3498db' : (isOnline ? '0 0 4px #2ecc71' : '0 0 4px #e74c3c')
                        }} />
                        <span>{isSyncing ? 'SINCRONIZANDO...' : (isOnline ? 'CONECTADO' : 'MODO OFFLINE')}</span>
                    </div>
                    <span>SINCRO: {lastSync}</span>
                </div>
                <div>© 2026 Aviación de Ejército - Sistema de Comando y Control</div>
            </footer>
        </div>
    );
}

const styles = {
    navbar: { backgroundColor: '#1b3a57', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 3000, transition: 'all 0.3s ease' },
    logo: { fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.5px' },
    navActions: { display: 'flex', alignItems: 'center', gap: '6px' },
    userInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
    btnNav: { color: 'white', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '0.75rem', transition: '0.2s' },
    btnLogout: { backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' },
    container: { maxWidth: '1400px', margin: '15px auto', padding: '0 15px', flex: 1 },
    containerFull: { width: '100%', margin: '0', padding: '0', flex: 1, position: 'relative', overflow: 'hidden', height: 'calc(100vh - 65px)' },
    footer: { textAlign: 'center', padding: '10px', color: '#7f8c8d', fontSize: '0.65rem', borderTop: '1px solid #ddd', backgroundColor: '#f8f9fa' },
    statusRow: { display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }
};

export default App;