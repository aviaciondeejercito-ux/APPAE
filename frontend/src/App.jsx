import React, { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css'; 

// IMPORTANTE: Ruta corregida para Render (./ en lugar de ../)
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

// Mantenemos el import pero no lo usaremos en el render por ahora
// import Tripulantes from './pages/Tripulantes'; 

function App() {
    const [auth, setAuth] = useState(!!localStorage.getItem('token'));
    const [role, setRole] = useState(localStorage.getItem('role'));
    const [view, setView] = useState('calendar'); 
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(localStorage.getItem('lastSync') || '---');

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // GESTIÓN DE ESTADO ONLINE/OFFLINE
    useEffect(() => {
        const handleStatusChange = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        setAuth(false);
        setRole(null);
        setView('calendar');
    };

    // REGLAS DE ACCESO (Personal desactivado temporalmente)
    const puedeGestionarMaterial = role === 'admin' || role === 'OFICINA_TECNICA';
    const puedeCargarOperaciones = role === 'admin' || role === 'user' || role === 'OFICINA_TECNICA' || role === 'BOSS';
    const puedeVerStats = role === 'admin' || role === 'BOSS' || role === 'DIRECTOR';
    const puedeVerMapa = role === 'admin' || role === 'BOSS' || role === 'DIRECTOR' || role === 'OTO' || role === 'user';
    const puedeVerVuelos = role === 'admin' || role === 'OTO';

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
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
                            <button onClick={() => setView('calendar')} style={styles.btnNav}>📅 Calendario</button>
                            
                            {/* BOTÓN PERSONAL OCULTO HASTA ESTABILIZAR */}
                            
                            {puedeVerMapa && (
                                <button onClick={() => setView('mapa')} style={{...styles.btnNav, backgroundColor: '#d35400'}}>📍 Mapa</button>
                            )}

                            {puedeVerVuelos && (
                                <button onClick={() => setView('despacho')} style={{...styles.btnNav, backgroundColor: '#e67e22'}}>⚡ Vuelos</button>
                            )}

                            <button onClick={() => setView('estado')} style={{...styles.btnNav, backgroundColor: '#2c3e50'}}>🚁 Material</button>

                            {puedeVerStats && (
                                <button onClick={() => setView('stats')} style={{...styles.btnNav, backgroundColor: '#007bff'}}>📊 Stats</button>
                            )}

                            {puedeCargarOperaciones && (
                                <button onClick={() => setView('operaciones')} style={{...styles.btnNav, backgroundColor: '#60a3bc'}}>📝 Carga</button>
                            )}

                            <button onClick={handleLogout} style={styles.btnLogout}>Salir</button>
                        </>
                    ) : (
                        <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Acceso Restringido</span>
                    )}
                </div>
            </nav>

            <main style={(view === 'mapa' || view === 'stats' || view === 'material' || view === 'estado') ? styles.containerFull : styles.container}>
                {!auth ? (
                    <Login setAuth={setAuth} />
                ) : (
                    (() => {
                        if (view === 'admin' && role === 'admin') return <AdminPanel />;
                        if (view === 'stats' && puedeVerStats) return <Estadisticas />;
                        if (view === 'mapa' && puedeVerMapa) return <OperacionesMapa />;
                        if (view === 'despacho' && puedeVerVuelos) return <CargaTactica />;
                        if (view === 'operaciones' && puedeCargarOperaciones) return <Operaciones />; 
                        if (view === 'estado') return <EstadoAeronaves />;
                        if (view === 'material' && puedeGestionarMaterial) return <Material />;
                        return <CalendarPage />;
                    })()
                )}
            </main>

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
    navActions: { display: 'flex', alignItems: 'center', gap: '6px' },
    btnNav: { color: 'white', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '0.75rem', backgroundColor: '#4a69bd' },
    btnLogout: { backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' },
    container: { maxWidth: '1400px', margin: '15px auto', padding: '0 15px', flex: 1 },
    containerFull: { width: '100%', flex: 1, position: 'relative', overflow: 'hidden' },
    footer: { textAlign: 'center', padding: '10px', color: '#7f8c8d', fontSize: '0.65rem', borderTop: '1px solid #ddd', backgroundColor: '#f8f9fa' },
    statusRow: { display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '4px', fontWeight: 'bold' }
};

export default App;