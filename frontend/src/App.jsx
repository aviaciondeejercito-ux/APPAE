import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css'; 

// IMPORTANTE: Comunicación centralizada con el backend
import { EventService } from './services/api'; 

import CalendarPage from './pages/CalendarPage';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Estadisticas from './pages/Estadisticas';
import Operaciones from './pages/Operaciones'; 
import EstadoAeronaves from './pages/EstadoAeronaves';
import OperacionesMapa from './pages/OperacionesMapa';
import CargaTactica from './pages/CargaTactica';
import PlaneamientoMapa from './pages/PlaneamientoMapa';
import Tripulantes from './pages/Tripulantes'; 
import Vuelos from './pages/Vuelos';
import EbmPage from './pages/EbmPage'; 
import AlertasWidget from './components/AlertasWidget'; 
import F13Page from './pages/F13'; 
import DashboardNovedades from './components/DashboardNovedades'; 
import F16Page from './pages/F16';
import ProgramaMantenimiento from './pages/ProgramaMantenimiento';

// ==========================================
// 🔻 SUBCOMPONENTE DE DROPDOWN PARA EL NAVBAR
// ==========================================
const NavDropdown = ({ title, activeViews = [], currentView, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Cierra el menú al hacer clic fuera del componente
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isChildActive = activeViews.includes(currentView);

    return (
        <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                style={{
                    ...styles.btnNav,
                    backgroundColor: isChildActive ? '#1e3799' : '#4a69bd',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                }}
            >
                <span>{title}</span>
                <span style={{ fontSize: '0.6rem', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }}>▼</span>
            </button>

            {isOpen && (
                <div 
                    style={styles.dropdownMenu} 
                    onClick={() => setIsOpen(false)} // Cierra al hacer clic en un ítem
                >
                    {children}
                </div>
            )}
        </div>
    );
};

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
    const puedeVerPlaneamiento = esAdmin || esUser || esOperaciones || esLogistico || esPersonal;
    const puedeVerMapa = esAdmin || esBoss || esDirector || esOTO || esUser || esOperaciones || esLogistico || esJefe || esPersonal;
    const puedeVerEstadoAeronaves = esAdmin || esBoss || esDirector || esOTO || esOfTecnica || esUser || esOperaciones || esLogistico || esJefe || esPersonal;
    const puedeVerCarga = esAdmin || esBoss || esDirector || esOTO || esOfTecnica || esUser || esOperaciones || esLogistico || esJefe || esPersonal;
    const puedeVerStats = esAdmin || esBoss || esDirector || esOTO;
    const puedeVerOpEnDesarrollo = esAdmin || esOTO;
    const puedeVerEbm = esAdmin || esOperaciones || esJefe;
    const puedeVerF13 = esAdmin || esOfTecnica || esUser;
    const puedeVerReportes = esAdmin || esOfTecnica || esBoss || esDirector || esJefe || esOTO;
    const puedeVerAlertas = !esOTO && !esDirector && !esBoss;
    const puedeVerF16 = esAdmin || esOfTecnica; 
    const puedeVerProgMantenimiento = esAdmin || esOfTecnica;

    // Evaluaciones para mostrar menús completos solo si tiene permiso al menos de 1 ítem interno
    const puedeVerGrupoOperaciones = puedeVerTripulantes || puedeVerEbm || puedeVerVuelos;
    const puedeVerGrupoOfTecnica = puedeVerF13 || puedeVerF16 || puedeVerProgMantenimiento;
    const puedeVerGrupoOTO = puedeVerStats || puedeVerOpEnDesarrollo;

    // --- LÓGICA DE CONTENEDOR DINÁMICO ---
    const esVistaFull = ['mapa', 'estado', 'tripulantes', 'planeamiento', 'admin', 'stats', 'despacho', 'vuelos', 'ebm', 'f13', 'reportes', 'f16', 'progMantenimiento'].includes(view);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
            
            {/* NAVBAR TÁCTICA CON GRUPOS DESPLEGABLES */}
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
                            {/* 1. GRUPO: CALENDARIO (Calendario + Carga) */}
                            <NavDropdown title="📅 Calendario" activeViews={['calendar', 'operaciones']} currentView={view}>
                                <button 
                                    onClick={() => setView('calendar')} 
                                    style={{...styles.dropdownItem, backgroundColor: view === 'calendar' ? 'rgba(255,255,255,0.1)' : 'transparent'}}
                                >
                                    📅 Calendario General
                                </button>
                                {puedeVerCarga && (
                                    <button 
                                        onClick={() => setView('operaciones')} 
                                        style={{...styles.dropdownItem, backgroundColor: view === 'operaciones' ? 'rgba(255,255,255,0.1)' : 'transparent'}}
                                    >
                                        📝 Carga
                                    </button>
                                )}
                            </NavDropdown>

                            {/* 2. GRUPO: OPERACIONES (Personal + EBM + Vuelos) */}
                            {puedeVerGrupoOperaciones && (
                                <NavDropdown title="⚔️ Operaciones" activeViews={['tripulantes', 'ebm', 'vuelos']} currentView={view}>
                                    {puedeVerTripulantes && (
                                        <button 
                                            onClick={() => setView('tripulantes')} 
                                            style={{...styles.dropdownItem, backgroundColor: view === 'tripulantes' ? 'rgba(255,255,255,0.1)' : 'transparent'}}
                                        >
                                            👥 Personal
                                        </button>
                                    )}
                                    {puedeVerEbm && (
                                        <button 
                                            onClick={() => setView('ebm')} 
                                            style={{...styles.dropdownItem, backgroundColor: view === 'ebm' ? 'rgba(255,255,255,0.1)' : 'transparent'}}
                                        >
                                            🎯 EBM
                                        </button>
                                    )}
                                    {puedeVerVuelos && (
                                        <button 
                                            onClick={() => setView('vuelos')} 
                                            style={{...styles.dropdownItem, backgroundColor: view === 'vuelos' ? 'rgba(255,255,255,0.1)' : 'transparent'}}
                                        >
                                            ✈️ Vuelos
                                        </button>
                                    )}
                                </NavDropdown>
                            )}

                            {/* 3. GRUPO: OFICINA TÉCNICA (F-13 + F-16 + Prog. Manto) */}
                            {puedeVerGrupoOfTecnica && (
                                <NavDropdown title="🛠️ Oficina Técnica" activeViews={['f13', 'f16', 'progMantenimiento']} currentView={view}>
                                    {puedeVerF13 && (
                                        <button 
                                            onClick={() => setView('f13')} 
                                            style={{...styles.dropdownItem, backgroundColor: view === 'f13' ? 'rgba(255,255,255,0.1)' : 'transparent'}}
                                        >
                                            📋 Formulario F-13
                                        </button>
                                    )}
                                    {puedeVerF16 && (
                                        <button 
                                            onClick={() => setView('f16')} 
                                            style={{...styles.dropdownItem, backgroundColor: view === 'f16' ? 'rgba(255,255,255,0.1)' : 'transparent'}}
                                        >
                                            📋 Formulario F-16
                                        </button>
                                    )}
                                    {puedeVerProgMantenimiento && (
                                        <button 
                                            onClick={() => setView('progMantenimiento')} 
                                            style={{...styles.dropdownItem, backgroundColor: view === 'progMantenimiento' ? 'rgba(255,255,255,0.1)' : 'transparent'}}
                                        >
                                            🛠️ Programa Mantenimiento
                                        </button>
                                    )}
                                </NavDropdown>
                            )}

                            {/* 4. GRUPO: OTO (Stats + Op en Desarrollo) */}
                            {puedeVerGrupoOTO && (
                                <NavDropdown title="🎯 OTO" activeViews={['stats', 'despacho']} currentView={view}>
                                    {puedeVerStats && (
                                        <button 
                                            onClick={() => setView('stats')} 
                                            style={{...styles.dropdownItem, backgroundColor: view === 'stats' ? 'rgba(255,255,255,0.1)' : 'transparent'}}
                                        >
                                            📊 Stats
                                        </button>
                                    )}
                                    {puedeVerOpEnDesarrollo && (
                                        <button 
                                            onClick={() => setView('despacho')} 
                                            style={{...styles.dropdownItem, backgroundColor: view === 'despacho' ? 'rgba(255,255,255,0.1)' : 'transparent'}}
                                        >
                                            ⚡ Op en Desarrollo
                                        </button>
                                    )}
                                </NavDropdown>
                            )}

                            {/* --- BOTONES DIRECTOS (SUELTOS) --- */}
                            {puedeVerEstadoAeronaves && (
                                <button 
                                    onClick={() => setView('estado')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'estado' ? '#1e3799' : '#4a69bd'}}
                                >🦅 Estado Aeronaves</button>
                            )}

                            {puedeVerPlaneamiento && (
                                <button 
                                    onClick={() => setView('planeamiento')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'planeamiento' ? '#1e3799' : '#4a69bd'}}
                                >🗺️ Planeamiento</button>
                            )}

                            {puedeVerMapa && (
                                <button 
                                    onClick={() => setView('mapa')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'mapa' ? '#1e3799' : '#4a69bd'}}
                                >📍 Mapa</button>
                            )}

                            {puedeVerReportes && (
                                <button 
                                    onClick={() => setView('reportes')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'reportes' ? '#1e3799' : '#4a69bd'}}
                                >📊 Reportes</button>
                            )}

                            {puedeVerUsuarios && (
                                <button 
                                    onClick={() => setView('admin')} 
                                    style={{...styles.btnNav, backgroundColor: view === 'admin' ? '#2c3e50' : '#4a69bd'}}
                                >⚙️ Usuarios</button>
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
                {auth && puedeVerAlertas && <AlertasWidget />}

                {!auth ? (
                    <Login setAuth={setAuth} />
                ) : (
                    (() => {
                        switch(view) {
                            case 'tripulantes': return puedeVerTripulantes ? <Tripulantes /> : <CalendarPage />;
                            case 'ebm': return puedeVerEbm ? <EbmPage /> : <CalendarPage />;
                            case 'vuelos': return puedeVerVuelos ? <Vuelos /> : <CalendarPage />;
                            case 'f13': return puedeVerF13 ? <F13Page /> : <CalendarPage />;
                            case 'reportes': return puedeVerReportes ? <DashboardNovedades /> : <CalendarPage />; 
                            case 'planeamiento': return puedeVerPlaneamiento ? <PlaneamientoMapa /> : <CalendarPage />;
                            case 'admin': return esAdmin ? <AdminPanel /> : <CalendarPage />;
                            case 'stats': return puedeVerStats ? <Estadisticas /> : <CalendarPage />;
                            case 'mapa': return puedeVerMapa ? <OperacionesMapa /> : <CalendarPage />;
                            case 'despacho': return puedeVerOpEnDesarrollo ? <CargaTactica /> : <CalendarPage />;
                            case 'operaciones': return puedeVerCarga ? <Operaciones /> : <CalendarPage />;
                            case 'estado': return puedeVerEstadoAeronaves ? <EstadoAeronaves /> : <CalendarPage />;
                            case 'f16': return puedeVerF16 ? <F16Page /> : <CalendarPage />;
                            case 'progMantenimiento': return puedeVerProgMantenimiento ? <ProgramaMantenimiento /> : <CalendarPage />;
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
    navActions: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' },
    btnNav: { color: 'white', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '0.75rem', transition: '0.2s ease' },
    btnLogout: { backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' },
    dropdownMenu: {
        position: 'absolute',
        top: '120%',
        left: 0,
        backgroundColor: '#1b3a57',
        minWidth: '180px',
        boxShadow: '0px 8px 16px rgba(0,0,0,0.3)',
        borderRadius: '6px',
        padding: '6px 0',
        zIndex: 4000,
        border: '1px solid rgba(255, 255, 255, 0.15)',
        display: 'flex',
        flexDirection: 'column'
    },
    dropdownItem: {
        background: 'transparent',
        border: 'none',
        color: 'white',
        padding: '10px 16px',
        textAlign: 'left',
        fontSize: '0.75rem',
        fontWeight: '600',
        cursor: 'pointer',
        width: '100%',
        transition: 'background 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
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