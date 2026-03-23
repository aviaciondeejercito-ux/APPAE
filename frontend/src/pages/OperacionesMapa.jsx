import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EventService from '../services/EventService';

const { BaseLayer } = LayersControl;

// --- CONFIGURACIÓN DE SIMBOLOGÍA TÁCTICA ---
const planeIcon = L.divIcon({
    className: 'tactic-icon-plane',
    html: `<svg width="30" height="30" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 5 L90 85 L50 70 L10 85 Z" fill="#0044ff" stroke="#ffffff" stroke-width="4"/>
            <path d="M20 50 L80 50" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
           </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

const heloIcon = L.divIcon({
    className: 'tactic-icon-helo',
    html: `<svg width="30" height="30" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="30" fill="#0044ff" stroke="#ffffff" stroke-width="4"/>
            <path d="M10 50 L90 50 M50 10 L50 90" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
            <circle cx="50" cy="50" r="5" fill="#ffffff"/>
           </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mapView] = useState({ center: [-34.528, -58.641], zoom: 5 });

    const cargarSituacionTactica = async () => {
        try {
            const data = await EventService.getActiveOperations();
            if (Array.isArray(data)) {
                // Filtramos solo misiones con coordenadas válidas
                setMisiones(data.filter(m => m.isRealTime && m.ubicacion?.lat && m.ubicacion?.lng));
            }
        } catch (err) { 
            console.error("❌ Error en Sincronización Táctica:", err); 
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
        const t = (mision.aeronave || "").toUpperCase();
        const esAvion = ['C-212', 'C-208', 'C-550', 'DA-62', 'DHC-6', 'CESSNA', 'AVION', 'B-200', 'T-202'].some(mod => t.includes(mod));
        return esAvion ? planeIcon : heloIcon;
    };

    if (loading) return (
        <div style={styles.loadingScreen}>
            <div className="radar-loader"></div>
            <p style={{marginTop: '20px'}}>📡 INICIALIZANDO MAPA TÁCTICO...</p>
        </div>
    );

    return (
        <div style={styles.mapWrapper}>
            {/* HEADER FIJO */}
            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '3px' }}>MONITOR DE OPERACIONES</div>
                <div style={styles.subHeader}>AVIACIÓN DE EJÉRCITO ARGENTINO</div>
            </div>

            <MapContainer 
                center={mapView.center} 
                zoom={mapView.zoom} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
            >
                <LayersControl position="topright">
                    {/* 1. MODO POLÍTICO (Estándar) */}
                    <BaseLayer checked name="🗺️ Mapa Político">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </BaseLayer>

                    {/* 2. MODO FÍSICO (Topográfico) */}
                    <BaseLayer name="⛰️ Mapa Físico">
                        <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />
                    </BaseLayer>

                    {/* 3. MODO SATELITAL */}
                    <BaseLayer name="🛰️ Satelital">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                    </BaseLayer>

                    {/* 4. MODO OSCURO (Noche/Táctico) */}
                    <BaseLayer name="🌑 Modo Oscuro">
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    </BaseLayer>
                </LayersControl>

                {/* RENDERIZADO DE ICONOS TÁCTICOS */}
                {misiones.map((m) => (
                    <Marker 
                        key={m._id} 
                        position={[parseFloat(m.ubicacion.lat), parseFloat(m.ubicacion.lng)]} 
                        icon={getIcon(m)}
                    >
                        <Tooltip direction="right" offset={[15, 0]} permanent className="label-tactica-custom">
                            <div style={styles.labelBoxDark}>{m.matricula || "S/M"}</div>
                        </Tooltip>
                        
                        <Popup>
                            <div style={styles.popupContainer}>
                                <div style={styles.popupHeader}>{m.aeronave} - {m.matricula}</div>
                                <div style={styles.popupBody}>
                                    <strong>MISIÓN:</strong> {m.title}<br/>
                                    <strong>UBICACIÓN:</strong> {m.ubicacion.nombre}<br/>
                                    <hr style={{margin: '8px 0', borderColor: '#444'}}/>
                                    <center style={{color: '#f39c12', fontSize: '0.65rem'}}>SISTEMA C2AE</center>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* ESTILOS CSS INYECTADOS */}
            <style>{`
                .label-tactica-custom { background: transparent !important; border: none !important; box-shadow: none !important; }
                .radar-loader { width: 50px; height: 50px; border: 3px solid #f39c12; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .leaflet-popup-content-wrapper { padding: 0; background: #1a1a1a; color: white; border: 1px solid #f39c12; border-radius: 4px; overflow: hidden; }
                .leaflet-popup-content { margin: 0; width: 220px !important; }
                .leaflet-popup-tip { background: #1a1a1a; border: 1px solid #f39c12; }
                .leaflet-control-layers { background: #1a1a1a !important; color: white !important; border: 1px solid #f39c12 !important; }
            `}</style>
        </div>
    );
};

const styles = {
    mapWrapper: { width: '100%', height: '100%', position: 'relative', backgroundColor: '#050505' },
    loadingScreen: { backgroundColor: '#050505', color: '#f39c12', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' },
    header: { position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(10, 10, 10, 0.9)', color: '#f39c12', padding: '8px 20px', border: '1px solid #f39c12', textAlign: 'center', borderRadius: '4px', pointerEvents: 'none' },
    subHeader: { fontSize: '0.6rem', color: '#bdc3c7', marginTop: '3px', borderTop: '1px solid #333', paddingTop: '3px' },
    labelBoxDark: { background: 'rgba(0, 15, 30, 0.9)', color: '#00ffff', border: '1px solid #00ffff', padding: '1px 6px', borderRadius: '2px', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace' },
    popupContainer: { fontFamily: 'monospace' },
    popupHeader: { background: '#f39c12', color: 'black', padding: '6px', fontWeight: 'bold', textAlign: 'center', fontSize: '0.8rem' },
    popupBody: { padding: '10px', fontSize: '0.75rem', background: '#1a1a1a' }
};

export default OperacionesMapa;