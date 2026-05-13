import React, { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css'; 

// IMPORTANTE: Comunicación centralizada con el backend
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
import Vuelos from './pages/Vuelos';
import EbmPage from './pages/EbmPage'; 

function App() {
    const [auth, setAuth] = useState(!!localStorage.getItem('token'));
    const [role, setRole] = useState(localStorage.getItem('role') || localStorage.getItem('rol') || 'user');
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

    // SINCRO JOKER: Sincronización de sesión y normalización de rol
    useEffect(() => {
        if (auth) {
            const rawRole = localStorage.getItem('role') || localStorage.getItem('rol') || 'user';
            const normalized = rawRole.toUpperCase().replace(/[\s_-]/g, '');
            setRole(normalized);
        }
    }, [auth]);

    const handleLogout = () => {
        localStorage.clear();
        setAuth(false);
        setRole(null);
        setView('calendar');
    };

    // --- REGLAS DE ACCESO (RBAC) BASADAS EN ROL NORMALIZADO ---
    const roleBase = role?.toUpperCase() || '';

    const esAdmin = roleBase === 'ADMIN';
    const esOfTecnica = roleBase === 'OFICINATECNICA';
    const esBoss = roleBase === 'BOSS';
    const esDirector = roleBase === 'DIRECTOR';
    const esOTO = roleBase === 'OTO' || roleBase === 'OTOAE';
    const esUser = roleBase === 'USER';
    const esOperaciones = roleBase === 'OPERACIONES';
    const esLogistico = roleBase === 'LOGISTICO';
    const esJefe = roleBase === 'JEFE';
    const esPersonal = roleBase === 'PERSONAL';

    // --- CONFIGURACIÓN DE VISIBILIDAD DE MÓDULOS ---
    const puedeVerUsuarios = esAdmin;
    const puedeVerTripulantes = esAdmin || esOperaciones || esJefe || esPersonal; 
    const puedeVerVuelos = esAdmin || esOperaciones; 
    const puedeVerPlaneamiento = esAdmin || esUser || esOperaciones || esLogistico || esJefe || esPersonal;
    const puedeVerMapa = esAdmin || esBoss || esDirector || esOTO || esUser || esOperaciones || esLogistico || esJefe || esPersonal;
    const puedeVerEstadoAeronaves = esAdmin || esBoss || esDirector || esOTO || esOfTecnica || esUser || esOperaciones || esLogistico || esJefe || esPersonal;
    const puedeVerCarga = esAdmin || esBoss || esDirector || esOTO || esOfTecnica || esUser || esOperaciones || esLogistico || esJefe || esPersonal;
    const puedeVerOficinaTecnica = esAdmin || esOfTecnica;
    const puedeVerStats = esAdmin || esBoss || esDirector || esOTO;
    const puedeVerOpEnDesarrollo = esAdmin || esOTO;
    const puedeVerEbm = esAdmin || esBoss || esDirector || esOperaciones || esOTO;

    // --- LÓGICA DE CONTENEDOR DINÁMICO ---
    const esVistaFull = ['mapa', 'estado', 'tripulantes', 'planeamiento', 'admin', 'stats', 'despacho', 'vuelos', 'material', 'ebm'].includes(view);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
            
            {/* NAVBAR TÁCTICA */}
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

                            {puedeVerEbm && (
                                <button 
                                    onClick={() => setView('ebm')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'ebm' ? '#d63031' : '#4a69bd'}}
                                >🎯 EBM</button>
                            )}

                            {puedeVerVuelos && (
                                <button 
                                    onClick={() => setView('vuelos')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'vuelos' ? '#1b3a57' : '#4a69bd'}}
                                >✈️ Vuelos</button>
                            )}

                            {puedeVerPlaneamiento && (
                                <button 
                                    onClick={() => setView('planeamiento')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'planeamiento' ? '#8e44ad' : '#4a69bd'}}
                                >🗺️ Planeamiento</button>
                            )}

                            {puedeVerMapa && (
                                <button 
                                    onClick={() => setView('mapa')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'mapa' ? '#d35400' : '#4a69bd'}}
                                >📍 Mapa</button>
                            )}

                            {puedeVerOpEnDesarrollo && (
                                <button 
                                    onClick={() => setView('despacho')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'despacho' ? '#e67e22' : '#4a69bd'}}
                                >⚡ Op en Desarrollo</button>
                            )}

                            {puedeVerEstadoAeronaves && (
                                <button 
                                    onClick={() => setView('estado')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'estado' ? '#2c3e50' : '#4a69bd'}}
                                >🚁 Estado Aeronaves</button>
                            )}

                            {puedeVerOficinaTecnica && (
                                <button 
                                    onClick={() => setView('material')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'material' ? '#27ae60' : '#4a69bd'}}
                                >🔧 Oficina Técnica</button>
                            )}

                            {puedeVerStats && (
                                <button 
                                    onClick={() => setView('stats')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'stats' ? '#007bff' : '#4a69bd'}}
                                >📊 Stats</button>
                            )}

                            {puedeVerCarga && (
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

            {/* CONTENIDO PRINCIPAL DINÁMICO */}
            <main style={esVistaFull ? styles.containerFull : styles.container}>
                {!auth ? (
                    <Login setAuth={setAuth} />
                ) : (
                    (() => {
                        switch(view) {
                            case 'tripulantes': return puedeVerTripulantes ? <Tripulantes /> : <CalendarPage />;
                            case 'ebm': return puedeVerEbm ? <EbmPage /> : <CalendarPage />;
                            case 'vuelos': return puedeVerVuelos ? <Vuelos /> : <CalendarPage />;
                            case 'planeamiento': return puedeVerPlaneamiento ? <PlaneamientoMapa /> : <CalendarPage />;
                            case 'admin': return esAdmin ? <AdminPanel /> : <CalendarPage />;
                            case 'stats': return puedeVerStats ? <Estadisticas /> : <CalendarPage />;
                            case 'mapa': return puedeVerMapa ? <OperacionesMapa /> : <CalendarPage />;
                            case 'despacho': return puedeVerOpEnDesarrollo ? <CargaTactica /> : <CalendarPage />;
                            case 'operaciones': return puedeVerCarga ? <Operaciones /> : <CalendarPage />;
                            case 'estado': return puedeVerEstadoAeronaves ? <EstadoAeronaves /> : <CalendarPage />;
                            case 'material': return puedeVerOficinaTecnica ? <Material /> : <CalendarPage />;
                            default: return <CalendarPage />;
                        }
                    })()
                )}
            </main>

            {/* FOOTER */}
            {!esVistaFull && (
                <footer style={styles.footer}>
                    <div>© 2026 Aviación de Ejército - Sistema Operativo</div>
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
        width: '100%', 
        flex: 1, 
        position: 'relative', 
        overflowY: 'auto', 
        height: 'calc(100vh - 65px)',
        display: 'block',
        margin: 0,
        padding: 0
    },
    footer: { textAlign: 'center', padding: '10px', color: '#7f8c8d', fontSize: '0.6rem', borderTop: '1px solid #ddd', backgroundColor: '#f8f9fa' }
};

export default App;