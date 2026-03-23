import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EventService from '../services/EventService';

// --- CONFIGURACIÓN DE SIMBOLOGÍA TÁCTICA ---
const planeIcon = L.divIcon({
    className: 'tactic-icon-plane',
    html: `<svg width="26" height="26" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,5 95,90 5,90" fill="#0044ff" stroke="#ffffff" stroke-width="6"/>
           </svg>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
});

const heloIcon = L.divIcon({
    className: 'tactic-icon-helo',
    html: `<svg width="26" height="26" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect x="40" y="0" width="20" height="100" fill="#0044ff" stroke="#ffffff" stroke-width="6"/>
            <rect x="0" y="40" width="100" height="20" fill="#0044ff" stroke="#ffffff" stroke-width="6"/>
           </svg>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
});

const OperacionesMapa = ({ capasMet, setCapasMet }) => {
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

    const toggleCapa = (capa) => {
        setCapasMet({ ...capasMet, [capa]: !capasMet[capa] });
    };

    const getIcon = (mision) => {
        const t = (mision.aeronave || mision.title).toUpperCase();
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
            <p style={{marginTop: '20px', letterSpacing: '3px'}}>📡 SINCRONIZANDO RADAR TÁCTICO...</p>
        </div>
    );

    return (
        <div style={styles.mapWrapper}>
            
            {/* TITULO SUPERIOR */}
            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '4px' }}>MONITOR DE OPERACIONES</div>
                <div style={{ fontSize: '0.65rem', color: '#bdc3c7', marginTop: '4px' }}>AVIACIÓN DE EJÉRCITO</div>
            </div>

            {/* BOTÓN VISTA TÁCTICA / SATELITE */}
            <button onClick={() => setDarkMode(!darkMode)} style={styles.mapToggle}>
                {darkMode ? '🛰️ VISTA SATELITAL' : '🕶️ VISTA TÁCTICA'}
            </button>

            {/* SELECTOR DE CAPAS MET (DERECHA) */}
            <div style={styles.selectorMet}>
                <div style={styles.selectorTitle}>METEOROLOGÍA</div>
                <label style={styles.checkLabel}>
                    <input type="checkbox" checked={capasMet.radar} onChange={() => toggleCapa('radar')} />
                    <span>📡 Radar Lluvia</span>
                </label>
                <label style={styles.checkLabel}>
                    <input type="checkbox" checked={capasMet.nubes} onChange={() => toggleCapa('nubes')} />
                    <span>☁️ Nubosidad</span>
                </label>
                <label style={styles.checkLabel}>
                    <input type="checkbox" checked={capasMet.viento} onChange={() => toggleCapa('viento')} />
                    <span>💨 Viento</span>
                </label>
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
                        : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    } 
                />

                {/* --- CAPAS METEOROLÓGICAS --- */}
                {/* Radar: Rainviewer es más estable para Argentina */}
                {capasMet.radar && (
                    <TileLayer 
                        url="https://tilecache.rainviewer.com/v2/radar/default/256/{z}/{x}/{y}/2/1_1.png"
                        opacity={0.65}
                        zIndex={100}
                    />
                )}

                {/* Nubes: OpenWeatherMap */}
                {capasMet.nubes && (
                    <TileLayer 
                        url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=40561571216d649d682df7b0a793139b`} 
                        opacity={0.5}
                        zIndex={90}
                    />
                )}

                {/* Viento: OpenWeatherMap */}
                {capasMet.viento && (
                    <TileLayer 
                        url={`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=40561571216d649d682df7b0a793139b`} 
                        opacity={0.4}
                        zIndex={80}
                    />
                )}
                
                {/* --- MARCADORES TÁCTICOS --- */}
                {misiones.map((m) => (
                    <Marker 
                        key={m._id} 
                        position={[parseFloat(m.ubicacion.lat), parseFloat(m.ubicacion.lng)]} 
                        icon={getIcon(m)}
                    >
                        <Tooltip 
                            direction="right" 
                            offset={[15, 0]} 
                            opacity={1} 
                            permanent 
                            className="label-tactica-custom"
                        >
                            <div style={darkMode ? styles.labelBoxDark : styles.labelBoxLight}>
                                {m.matricula || m.title.split(' ')[0]}
                            </div>
                        </Tooltip>

                        <Popup>
                            <div style={styles.popupContainer}>
                                <div style={styles.popupHeader}>
                                    {m.aeronave ? `${m.aeronave} ${m.matricula}` : m.title}
                                </div>
                                <div style={{ fontSize: '0.85rem', padding: '10px', color: '#ecf0f1', background: '#2c3e50' }}>
                                    <strong>MISIÓN:</strong> {m.title}<br/>
                                    <strong>UNIDAD:</strong> {m.elemento}<br/>
                                    <strong>UBICACIÓN:</strong> {m.ubicacion.nombre}<br/>
                                    <hr style={{borderColor: '#7f8c8d', margin: '8px 0'}}/>
                                    <small style={{color: '#f39c12'}}>REPORTE EN TIEMPO REAL</small>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <style>{`
                .leaflet-tooltip.label-tactica-custom {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                .leaflet-tooltip-right.label-tactica-custom::before {
                    display: none !important;
                }
                .radar-loader {
                    width: 50px;
                    height: 50px;
                    border: 3px solid rgba(243, 156, 18, 0.3);
                    border-radius: 50%;
                    border-top-color: #f39c12;
                    animation: spin 1s ease-in-out infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .leaflet-popup-content-wrapper {
                    padding: 0;
                    overflow: hidden;
                    background: #2c3e50;
                }
                .leaflet-popup-content {
                    margin: 0;
                    width: 220px !important;
                }
                .leaflet-popup-tip {
                    background: #2c3e50;
                }
            `}</style>
        </div>
    );
};

const styles = {
    mapWrapper: { width: '100%', height: 'calc(100vh - 60px)', position: 'relative', backgroundColor: '#000' },
    loadingScreen: { backgroundColor: '#0a0a0a', color: '#f39c12', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' },
    header: { position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(20, 20, 20, 0.9)', color: '#f39c12', padding: '10px 25px', border: '1px solid #f39c12', textAlign: 'center', pointerEvents: 'none' },
    mapToggle: { position: 'absolute', top: '15px', right: '15px', zIndex: 1000, background: '#f39c12', color: '#000', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '0.7rem' },
    
    selectorMet: {
        position: 'absolute', top: '70px', right: '15px', zIndex: 1000,
        backgroundColor: 'rgba(10, 10, 10, 0.9)', padding: '12px', borderRadius: '6px',
        border: '1px solid #f39c12', color: 'white', display: 'flex', flexDirection: 'column', gap: '8px'
    },
    selectorTitle: { fontSize: '0.65rem', color: '#f39c12', fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '5px', marginBottom: '5px' },
    checkLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'monospace' },

    labelBoxDark: {
        background: 'rgba(0, 20, 40, 0.85)',
        color: '#00ffff',
        border: '1px solid #00ffff',
        padding: '2px 6px',
        borderRadius: '3px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        whiteSpace: 'nowrap'
    },
    labelBoxLight: {
        background: 'rgba(255, 255, 255, 0.9)',
        color: '#0044ff',
        border: '1px solid #0044ff',
        padding: '2px 6px',
        borderRadius: '3px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        boxShadow: '1px 1px 3px rgba(0,0,0,0.2)'
    },
    
    popupContainer: { minWidth: '200px', fontFamily: 'monospace' },
    popupHeader: { background: '#f39c12', color: 'black', padding: '8px', fontWeight: 'bold', textAlign: 'center', letterSpacing: '1px' }
};

export default OperacionesMapa;