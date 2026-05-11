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
    const [auth, setAuth] = useState(!!localStorage.getItem('token'));
    const [role, setRole] = useState(localStorage.getItem('role') || 'user');
    const [view, setView] = useState('calendar'); 
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleStatusChange = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

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

    // --- REGLAS DE ACCESO ---
    const esAdmin = role === 'admin';
    const puedeVerTripulantes = esAdmin;
    const puedeVerPlaneamiento = esAdmin;
    const puedeVerUsuarios = esAdmin;

    // --- LÓGICA DE CONTENEDOR DINÁMICO ---
    const esVistaFull = view === 'mapa' || view === 'estado' || view === 'tripulantes' || view === 'planeamiento' || view === 'admin' || view === 'stats';

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
            
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
                            
                            {puedeVerUsuarios && (
                                <button 
                                    onClick={() => setView('admin')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'admin' ? '#2c3e50' : '#4a69bd'}}
                                >⚙️ Usuarios</button>
                            )}

                            {puedeVerTripulantes && (
                                <button 
                                    onClick={() => setView('tripulantes')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'tripulantes' ? '#2980b9' : '#4a69bd'}}
                                >👥 Personal</button>
                            )}

                            {puedeVerPlaneamiento && (
                                <button 
                                    onClick={() => setView('planeamiento')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'planeamiento' ? '#8e44ad' : '#4a69bd'}}
                                >🗺️ Planeamiento</button>
                            )}

                            <button 
                                onClick={() => setView('mapa')} 
                                style={{...styles.btnNav, backgroundColor: view === 'mapa' ? '#d35400' : '#4a69bd'}}
                            >📍 Mapa</button>

                            <button 
                                onClick={() => setView('despacho')} 
                                style={{...styles.btnNav, backgroundColor: view === 'despacho' ? '#e67e22' : '#4a69bd'}}
                            >⚡ Op en Desarrollo</button>

                            <button 
                                onClick={() => setView('estado')} 
                                style={{...styles.btnNav, backgroundColor: view === 'estado' ? '#2c3e50' : '#4a69bd'}}
                            >🚁 Estado Aeronaves</button>

                            <button 
                                onClick={() => setView('material')} 
                                style={{...styles.btnNav, backgroundColor: view === 'material' ? '#27ae60' : '#4a69bd'}}
                            >🔧 Oficina Tecnica</button>

                            <button 
                                onClick={() => setView('stats')} 
                                style={{...styles.btnNav, backgroundColor: view === 'stats' ? '#007bff' : '#4a69bd'}}
                            >📊 Stats</button>

                            <button 
                                onClick={() => setView('operaciones')} 
                                style={{...styles.btnNav, backgroundColor: view === 'operaciones' ? '#60a3bc' : '#4a69bd'}}
                            >📝 Carga</button>

                            <button onClick={handleLogout} style={styles.btnLogout}>Salir</button>
                        </>
                    ) : (
                        <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Acceso Restringido</span>
                    )}
                </div>
            </nav>

            {/* CONTENIDO PRINCIPAL */}
            <main style={esVistaFull ? styles.containerFull : styles.container}>
                {!auth ? (
                    <Login setAuth={setAuth} />
                ) : (
                    (() => {
                        if (view === 'tripulantes' && puedeVerTripulantes) return <Tripulantes />;
                        if (view === 'planeamiento' && puedeVerPlaneamiento) return <PlaneamientoMapa />;
                        if (view === 'admin' && esAdmin) return <AdminPanel />;
                        if (view === 'stats') return <Estadisticas />;
                        if (view === 'mapa') return <OperacionesMapa />;
                        if (view === 'despacho') return <CargaTactica />;
                        if (view === 'operaciones') return <Operaciones />; 
                        if (view === 'estado') return <EstadoAeronaves />;
                        if (view === 'material') return <Material />;
                        return <CalendarPage />;
                    })()
                )}
            </main>

            {/* FOOTER - Solo visible en vistas que no son Full */}
            {!esVistaFull && (
                <footer style={styles.footer}>
                    <div>© 2026 Aviación de Ejército - Comando y Control</div>
                </footer>
            )}
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
    containerFull: { 
        width: '100vw', 
        height: 'calc(100vh - 65px)',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        display: 'block' 
    },
    footer: { textAlign: 'center', padding: '10px', color: '#7f8c8d', fontSize: '0.6rem', borderTop: '1px solid #ddd', backgroundColor: '#f8f9fa' }
};

export default App;