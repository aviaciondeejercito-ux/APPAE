import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet';
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

// Componente para capturar el movimiento del mapa y sincronizar la "filmina"
const SincronizadorBus = ({ onMove }) => {
    useMapEvents({
        move: (e) => onMove(e.target.getCenter(), e.target.getZoom()),
        zoomend: (e) => onMove(e.target.getCenter(), e.target.getZoom()),
    });
    return null;
};

const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [modoMapa, setModoMapa] = useState('satelite'); // 'satelite' o 'fisico'
    
    // Estado de la cámara unificado
    const [mapView, setMapView] = useState({
        center: [-34.528, -58.641],
        zoom: 5
    });

    const cargarSituacionTactica = async () => {
        try {
            const data = await EventService.getActiveOperations(); 
            if (data && Array.isArray(data)) {
                const validas = data.filter(m => m.isRealTime && m.ubicacion?.lat && m.ubicacion?.lng);
                setMisiones(validas);
            }
        } catch (err) {
            console.error("❌ Error en monitor táctico:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarSituacionTactica();
        const interval = setInterval(cargarSituacionTactica, 15000);
        return () => clearInterval(interval);
    }, []);

    const getIcon = (mision) => {
        const t = (mision.aeronave || mision.title || "").toUpperCase();
        const esAvion = t.includes('C-212') || t.includes('C-208') || t.includes('C-550') || 
                        t.includes('DA-62') || t.includes('DHC-6') || t.includes('C-182') || 
                        t.includes('CESSNA') || t.includes('T-20')  || t.includes('MERLIN') ||
                        t.includes('AVION');
        return esAvion ? planeIcon : heloIcon;
    };

    if (loading) return (
        <div style={styles.loadingScreen}>
            <div className="radar-loader"></div>
            <p style={{marginTop: '20px', letterSpacing: '3px'}}>📡 SINCRONIZANDO SISTEMA TÁCTICO...</p>
        </div>
    );

    return (
        <div style={styles.mapWrapper}>
            
            {/* TITULO SUPERIOR */}
            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '4px' }}>MONITOR DE OPERACIONES</div>
                <div style={{ fontSize: '0.65rem', color: '#bdc3c7', marginTop: '4px' }}>AVIACIÓN DE EJÉRCITO</div>
            </div>

            {/* SELECTOR DE MODO (Sin Windy externo para evitar errores de seguridad) */}
            <div style={styles.selectorModo}>
                <button 
                    onClick={() => setModoMapa('satelite')} 
                    style={{...styles.btnModo, borderBottom: modoMapa === 'satelite' ? '3px solid #f39c12' : 'none'}}
                >
                    🛰️ VISTA SATELITAL
                </button>
                <button 
                    onClick={() => setModoMapa('fisico')} 
                    style={{...styles.btnModo, borderBottom: modoMapa === 'fisico' ? '3px solid #f39c12' : 'none'}}
                >
                    🗺️ FÍSICO/POLÍTICO
                </button>
            </div>

            {/* --- CAPA ÚNICA INTERACTIVA --- */}
            {/* Ahora usamos un solo MapContainer para que el movimiento sea fluido y natural */}
            <MapContainer 
                center={mapView.center} 
                zoom={mapView.zoom} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                {/* Lógica de cambio de capas base */}
                {modoMapa === 'satelite' ? (
                    <>
                        {/* Satélite ESRI de alta resolución */}
                        <TileLayer 
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                            attribution="ESRI Satellite"
                            zIndex={1}
                        />
                        {/* Capa de nubes meteorológicas (NASA GIBS) - Actualizada a hoy */}
                        <TileLayer 
                            url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Reference_Labels_15m/default/2026-03-22/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png"
                            opacity={0.6}
                            zIndex={2}
                        />
                    </>
                ) : (
                    <>
                        {/* Mapa Político/Relieve */}
                        <TileLayer 
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                            attribution="OpenStreetMap"
                        />
                        <TileLayer 
                            url="https://stamen-tiles.a.ssl.fastly.net/terrain-labels/{z}/{x}/{y}.jpg"
                            opacity={0.5}
                        />
                    </>
                )}

                {/* Sincronizador para recordar posición si cambias de pestaña */}
                <SincronizadorBus onMove={(c, z) => setMapView({center: c, zoom: z})} />
                
                {/* --- MARCADORES TÁCTICOS (Siempre visibles y flotantes) --- */}
                {misiones.map((m) => (
                    <Marker 
                        key={m._id} 
                        position={[parseFloat(m.ubicacion.lat), parseFloat(m.ubicacion.lng)]} 
                        icon={getIcon(m)}
                    >
                        <Tooltip 
                            direction="right" 
                            offset={[15, 0]} 
                            permanent 
                            className="label-tactica-custom"
                        >
                            <div style={styles.labelBoxDark}>
                                {m.matricula || (m.title && m.title.split(' ')[0])}
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
                                    <hr style={{borderColor: '#7f8c8d', margin: '8px 0'}}/>
                                    <small style={{color: '#f39c12'}}>OPERACIÓN EN CURSO</small>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <style>{`
                .label-tactica-custom { background: transparent !important; border: none !important; box-shadow: none !important; }
                .radar-loader { width: 50px; height: 50px; border: 3px solid rgba(243, 156, 18, 0.3); border-radius: 50%; border-top-color: #f39c12; animation: spin 1s ease-in-out infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .leaflet-popup-content-wrapper { padding: 0; overflow: hidden; background: #2c3e50; border-radius: 4px; }
                .leaflet-popup-content { margin: 0; width: 220px !important; }
                .leaflet-container { background: #000 !important; }
            `}</style>
        </div>
    );
};

const styles = {
    mapWrapper: { width: '100%', height: 'calc(100vh - 60px)', position: 'relative', backgroundColor: '#000' },
    loadingScreen: { backgroundColor: '#0a0a0a', color: '#f39c12', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' },
    header: { position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(20, 20, 20, 0.9)', color: '#f39c12', padding: '10px 25px', border: '1px solid #f39c12', textAlign: 'center', pointerEvents: 'none', borderRadius: '2px' },
    
    selectorModo: {
        position: 'absolute', top: '15px', right: '15px', zIndex: 1000,
        display: 'flex', gap: '5px', background: 'rgba(0,0,0,0.8)', padding: '5px', borderRadius: '4px', border: '1px solid #444'
    },
    btnModo: {
        background: 'transparent', color: '#fff', border: 'none', padding: '8px 12px', 
        cursor: 'pointer', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '0.7rem'
    },
    
    labelBoxDark: {
        background: 'rgba(0, 20, 40, 0.85)', color: '#00ffff', border: '1px solid #00ffff',
        padding: '2px 6px', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace', textShadow: '0 0 5px #00ffff'
    },
    popupContainer: { minWidth: '200px', fontFamily: 'monospace' },
    popupHeader: { background: '#f39c12', color: 'black', padding: '8px', fontWeight: 'bold', textAlign: 'center' }
};

export default OperacionesMapa;