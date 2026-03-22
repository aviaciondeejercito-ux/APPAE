import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EventService from '../services/EventService';

// --- CONFIGURACIÓN DE SIMBOLOGÍA TÁCTICA PURA (SVG) ---

// Triángulo Azul - Aviones
const planeIcon = L.divIcon({
    className: 'tactic-icon-plane',
    html: `<svg width="26" height="26" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,5 95,90 5,90" fill="#0044ff" stroke="#ffffff" stroke-width="6"/>
           </svg>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
});

// Cruz Azul - Helicópteros
const heloIcon = L.divIcon({
    className: 'tactic-icon-helo',
    html: `<svg width="26" height="26" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect x="40" y="0" width="20" height="100" fill="#0044ff" stroke="#ffffff" stroke-width="4"/>
            <rect x="0" y="40" width="100" height="20" fill="#0044ff" stroke="#ffffff" stroke-width="4"/>
           </svg>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
});

const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(true);

    const cargarSituacionTactica = async () => {
        try {
            const data = await EventService.getActiveOperations(); 
            if (data && Array.isArray(data)) {
                const validas = data.filter(m => m.isRealTime && m.ubicacion?.lat && m.ubicacion?.lng);
                setMisiones(validas);
            }
        } catch (err) {
            console.error("Error en monitor táctico:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarSituacionTactica();
        const interval = setInterval(cargarSituacionTactica, 15000);
        return () => clearInterval(interval);
    }, []);

    const getIcon = (title) => {
        const t = title.toUpperCase();
        const esAvion = 
            t.includes('C-212') || t.includes('C-208') || t.includes('C-550') || 
            t.includes('DA-62') || t.includes('DHC-6') || t.includes('C-182') || 
            t.includes('CESSNA') || t.includes('T-20')  || t.includes('MERLIN') ||
            t.includes('AVION');
        
        return esAvion ? planeIcon : heloIcon;
    };

    if (loading) return (
        <div style={styles.loadingScreen}>
            <div className="radar-loader"></div>
            <p style={{marginTop: '20px', letterSpacing: '3px'}}>📡 SINCRONIZANDO REDAR TÁCTICO...</p>
        </div>
    );

    return (
        <div style={styles.mapWrapper}>
            
            {/* Header */}
            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '4px' }}>MONITOR DE OPERACIONES</div>
                <div style={{ fontSize: '0.65rem', color: '#bdc3c7', marginTop: '4px' }}>AVIACIÓN DE EJÉRCITO</div>
            </div>

            {/* Toggle Vista */}
            <button onClick={() => setDarkMode(!darkMode)} style={styles.mapToggle}>
                {darkMode ? '🛰️ VISTA ESTÁNDAR' : '🕶️ VISTA TÁCTICA'}
            </button>

            {/* Contador */}
            <div style={styles.counter}>
                <span style={{color: '#f39c12', fontWeight: 'bold'}}>MEDIOS:</span> {misiones.length}
            </div>

            <MapContainer 
                center={[-34.528, -58.641]} 
                zoom={5} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer 
                    url={darkMode 
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    } 
                    attribution='&copy; AE'
                />
                
                {misiones.map((m) => (
                    <Marker 
                        key={m._id} 
                        position={[parseFloat(m.ubicacion.lat), parseFloat(m.ubicacion.lng)]} 
                        icon={getIcon(m.title)}
                    >
                        {/* Etiqueta solo matrícula, sin fondo */}
                        <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="label-tactica">
                            <span style={darkMode ? styles.textMatriculaDark : styles.textMatriculaLight}>
                                {m.title.split('-')[0].trim()}
                            </span>
                        </Tooltip>

                        <Popup>
                            <div style={styles.popupContainer}>
                                <div style={styles.popupHeader}>{m.title}</div>
                                <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                                    <strong>UNIDAD:</strong> {m.elemento}<br/>
                                    <strong>UBICACIÓN:</strong> {m.ubicacion.nombre}
                                </div>
                                <div style={styles.popupMarginal}>
                                    {m.notasMarginales || "SIN NOVEDAD"}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* CSS para limpiar Tooltips de Leaflet */}
            <style>{`
                .leaflet-tooltip.label-tactica {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                .leaflet-tooltip-top.label-tactica::before {
                    display: none !important;
                }
            `}</style>
        </div>
    );
};

const styles = {
    mapWrapper: { width: '100%', height: 'calc(100vh - 60px)', position: 'relative', backgroundColor: '#000' },
    loadingScreen: { backgroundColor: '#0a0a0a', color: '#f39c12', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' },
    header: { position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(20, 20, 20, 0.9)', color: '#f39c12', padding: '10px 25px', borderRadius: '2px', border: '1px solid #f39c12', textAlign: 'center' },
    mapToggle: { position: 'absolute', top: '15px', right: '15px', zIndex: 1000, background: '#f39c12', color: '#000', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', fontFamily: 'monospace' },
    counter: { position: 'absolute', bottom: '20px', left: '15px', zIndex: 1000, background: 'rgba(0,0,0,0.85)', color: 'white', padding: '8px 12px', borderRadius: '2px', fontSize: '0.8rem', borderLeft: '4px solid #f39c12', fontFamily: 'monospace' },
    textMatriculaDark: { color: '#00ff00', fontWeight: 'bold', fontSize: '0.9rem', textShadow: '2px 2px 3px #000', fontFamily: 'monospace' },
    textMatriculaLight: { color: '#000', fontWeight: 'bold', fontSize: '0.9rem', textShadow: '1px 1px 2px #fff', fontFamily: 'monospace' },
    popupContainer: { minWidth: '180px', fontFamily: 'monospace' },
    popupHeader: { background: '#f39c12', color: 'black', padding: '4px', fontWeight: 'bold', textAlign: 'center' },
    popupMarginal: { background: '#2f3542', color: '#ffffff', padding: '8px', fontSize: '0.75rem' }
};

export default OperacionesMapa;