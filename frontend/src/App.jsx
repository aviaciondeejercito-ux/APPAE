import React, { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css'; 

// IMPORTANTE: Ruta relativa para entorno de despliegue
import { EventService } from './services/api'; 

import CalendarPage from './pages/CalendarPage';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Estadisticas from './pages/Estadisticas';
import Operaciones from './pages/Operaciones'; 
import EstadoAeronaves from './pages/EstadoAeronaves';
import Material from './pages/Material'; 
import OperacionesMapa from './pages/OperacionesMapa';
import CargaTactica from './pages/CargaTactica';
import PlaneamientoMapa from './pages/PlaneamientoMapa';
import Tripulantes from './pages/Tripulantes'; 

function App() {
    // Sincronizamos estados con localStorage de entrada
    const [auth, setAuth] = useState(!!localStorage.getItem('token'));
    const [role, setRole] = useState(localStorage.getItem('role') || 'user');
    const [view, setView] = useState('calendar'); 
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Escucha cambios de tamaño de pantalla
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Gestión de estado de conexión
    useEffect(() => {
        const handleStatusChange = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    // Actualiza el rol cuando cambia la autenticación
    useEffect(() => {
        if (auth) {
            setRole(localStorage.getItem('role') || 'user');
        }
    }, [auth]);

    const handleLogout = () => {
        localStorage.clear();
        setAuth(false);
        setRole(null);
        setView('calendar');
    };

    // --- ACCESO TOTAL TEMPORAL ---
    // Seteamos todas las reglas en true para que cualquier usuario logueado vea todo
    const puedeVerMapa = true; 
    const puedeVerStats = true; 
    const puedeCargarOperaciones = true; 
    const puedeVerTripulantes = true; 
    const puedeGestionarMaterial = true; 
    const puedeVerVuelos = true;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
            
            {/* NAVBAR */}
            <nav style={{
                ...styles.navbar,
                flexDirection: isMobile ? 'column' : 'row',
                padding: isMobile ? '10px' : '0 30px',
                height: isMobile ? 'auto' : '65px'
            }}>
                <div style={styles.logo} onClick={() => setView('calendar')}>
                    {isMobile ? '🦅 GESTIÓN AE' : '🦅 OPERACIONES AVIACION DE EJERCITO'}
                </div>
                
                <div style={styles.navActions}>
                    {auth ? (
                        <>
                            <button 
                                onClick={() => setView('calendar')} 
                                style={{...styles.btnNav, backgroundColor: view === 'calendar' ? '#1e3799' : '#4a69bd'}}
                            >📅 Calendario</button>
                            
                            {puedeVerTripulantes && (
                                <button 
                                    onClick={() => setView('tripulantes')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'tripulantes' ? '#2980b9' : '#4a69bd'}}
                                >👥 Personal</button>
                            )}

                            {puedeVerMapa && (
                                <button 
                                    onClick={() => setView('mapa')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'mapa' ? '#d35400' : '#4a69bd'}}
                                >📍 Mapa</button>
                            )}

                            {puedeVerVuelos && (
                                <button 
                                    onClick={() => setView('despacho')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'despacho' ? '#e67e22' : '#4a69bd'}}
                                >⚡ Vuelos</button>
                            )}

                            <button 
                                onClick={() => setView('estado')} 
                                style={{...styles.btnNav, backgroundColor: view === 'estado' ? '#2c3e50' : '#4a69bd'}}
                            >🚁 Material</button>

                            {puedeVerStats && (
                                <button 
                                    onClick={() => setView('stats')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'stats' ? '#007bff' : '#4a69bd'}}
                                >📊 Stats</button>
                            )}

                            {puedeCargarOperaciones && (
                                <button 
                                    onClick={() => setView('operaciones')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'operaciones' ? '#60a3bc' : '#4a69bd'}}
                                >📝 Carga</button>
                            )}

                            <button onClick={handleLogout} style={styles.btnLogout}>Salir</button>
                        </>
                    ) : (
                        <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Acceso Restringido</span>
                    )}
                </div>
            </nav>

            {/* CONTENIDO PRINCIPAL */}
            <main style={(view === 'mapa' || view === 'estado' || view === 'tripulantes' || view === 'stats' || view === 'despacho') ? styles.containerFull : styles.container}>
                {!auth ? (
                    <Login setAuth={setAuth} />
                ) : (
                    (() => {
                        if (view === 'admin') return <AdminPanel />;
                        if (view === 'stats') return <Estadisticas />;
                        if (view === 'tripulantes') return <Tripulantes />;
                        if (view === 'mapa') return <OperacionesMapa />;
                        if (view === 'despacho') return <CargaTactica />;
                        if (view === 'operaciones') return <Operaciones />; 
                        if (view === 'estado') return <EstadoAeronaves />;
                        if (view === 'material') return <Material />;
                        return <CalendarPage />;
                    })()
                )}
            </main>

            {/* FOOTER */}
            <footer style={styles.footer}>
                <div style={styles.statusRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{
                            width: '8px', height: '8px', borderRadius: '50%', 
                            backgroundColor: isOnline ? '#2ecc71' : '#e74c3c'
                        }} />
                        <span>{isOnline ? 'CONECTADO' : 'MODO OFFLINE'}</span>
                    </div>
                </div>
                <div>© 2026 Aviación de Ejército - Sistema de Comando y Control</div>
            </footer>
        </div>
    );
}

const styles = {
    navbar: { backgroundColor: '#1b3a57', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 3000 },
    logo: { fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' },
    navActions: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' },
    btnNav: { color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '0.7rem', transition: '0.3s' },
    btnLogout: { backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' },
    container: { maxWidth: '1400px', margin: '15px auto', padding: '0 15px', flex: 1 },
    containerFull: { width: '100%', flex: 1, position: 'relative', overflow: 'hidden', height: 'calc(100vh - 65px)' },
    footer: { textAlign: 'center', padding: '10px', color: '#7f8c8d', fontSize: '0.6rem', borderTop: '1px solid #ddd', backgroundColor: '#f8f9fa' },
    statusRow: { display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '4px', fontWeight: 'bold' }
};

export default App;