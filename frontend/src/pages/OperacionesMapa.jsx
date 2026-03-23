import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EventService from '../services/EventService';
import MeteorologiaPanel from './MeteorologiaPanel';

const { BaseLayer } = LayersControl;

// --- CONFIGURACIÓN DE SIMBOLOGÍA TÁCTICA REAL ---
const planeIcon = L.divIcon({
    className: 'tactic-icon-plane',
    html: `<svg width="26" height="26" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 10 L90 85 L10 85 Z" fill="#0044ff" stroke="#ffffff" stroke-width="6"/>
           </svg>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
});

// Icono circular azul con cruz blanca (Helicópteros)
const heloIcon = L.divIcon({
    className: 'tactic-icon-helo',
    html: `<svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="#0044ff" stroke="#ffffff" stroke-width="6"/>
            <path d="M50 20 L50 80 M20 50 L80 50" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
           </svg>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
});

const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showMetar, setShowMetar] = useState(true); 
    const [mapView] = useState({ center: [-34.528, -58.641], zoom: 5 });

    const cargarSituacionTactica = async () => {
        try {
            const data = await EventService.getActiveOperations();
            if (Array.isArray(data)) {
                const activas = data.filter(m => 
                    m.isRealTime && 
                    m.ubicacion?.lat != null && 
                    m.ubicacion?.lng != null
                );
                setMisiones(activas);
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
        // Lógica de distinción según modelo
        const esAvion = ['C-212', 'C-208', 'C-550', 'DA-62', 'DHC-6', 'CESSNA', 'AVION', 'B-200', 'T-202'].some(mod => t.includes(mod));
        return esAvion ? planeIcon : heloIcon;
    };

    if (loading) return (
        <div style={styles.loadingScreen}>
            <div className="radar-loader"></div>
            <p style={{marginTop: '20px'}}>📡 ACCEDIENDO A RED TÁCTICA...</p>
        </div>
    );

    return (
        <div style={styles.mapWrapper}>
            {/* 1. PANEL DE METEOROLOGÍA (Capa Superior Izquierda) */}
            <div style={{
                ...styles.metarContainer,
                transform: showMetar ? 'translateX(0)' : 'translateX(-302px)' 
            }}>
                <div style={styles.metarContent}>
                    <MeteorologiaPanel />
                </div>
                <button 
                    onClick={() => setShowMetar(!showMetar)} 
                    style={styles.toggleBtn}
                >
                    {showMetar ? '◀' : '▶'}
                </button>
            </div>

            {/* 2. HEADER CENTRAL */}
            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '3px' }}>MONITOR DE OPERACIONES</div>
                <div style={styles.subHeader}>AVIACIÓN DE EJÉRCITO ARGENTINO</div>
            </div>

            {/* 3. MAPA (Fondo) */}
            <MapContainer 
                center={mapView.center} 
                zoom={mapView.zoom} 
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                zoomControl={false}
            >
                <LayersControl position="topright">
                    <BaseLayer checked name="🌑 Modo Oscuro">
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    </BaseLayer>
                    <BaseLayer name="🛰️ Satelital">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                    </BaseLayer>
                    <BaseLayer name="🗺️ Mapa Político">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </BaseLayer>
                </LayersControl>

                {misiones.map((m) => (
                    <Marker 
                        key={m._id} 
                        position={[parseFloat(m.ubicacion.lat), parseFloat(m.ubicacion.lng)]} 
                        icon={getIcon(m)}
                    >
                        <Tooltip direction="right" offset={[15, 0]} permanent className="label-tactica-custom">
                            <div style={styles.labelBoxDark}>{m.aeronave || "N/A"}</div>
                        </Tooltip>
                        
                        <Popup>
                            <div style={styles.popupContainer}>
                                <div style={styles.popupHeader}>{m.aeronave} - {m.matricula}</div>
                                <div style={styles.popupBody}>
                                    <strong>OP:</strong> {m.title}<br/>
                                    <strong>LOC:</strong> {m.ubicacion.nombre}<br/>
                                    <hr style={{margin: '8px 0', borderColor: '#444'}}/>
                                    <center style={{color: '#f39c12', fontSize: '0.65rem'}}>SISTEMA C2AE</center>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <style>{`
                .label-tactica-custom { background: transparent !important; border: none !important; box-shadow: none !important; }
                .radar-loader { width: 50px; height: 50px; border: 3px solid #f39c12; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .leaflet-popup-content-wrapper { padding: 0; background: #1a1a1a; color: white; border: 1px solid #f39c12; border-radius: 4px; overflow: hidden; }
                .leaflet-popup-content { margin: 0; width: 200px !important; }
                .leaflet-control-layers { background: #1a1a1a !important; color: white !important; border: 1px solid #333 !important; font-family: monospace; }
            `}</style>
        </div>
    );
};

const styles = {
    mapWrapper: { 
        width: '100%', 
        height: 'calc(100vh - 60px)', 
        position: 'relative', 
        backgroundColor: '#050505',
        overflow: 'hidden'
    },
    metarContainer: {
        position: 'absolute',
        top: '100px',
        left: '0',
        zIndex: 2000, // Por encima de todo
        display: 'flex',
        alignItems: 'flex-start',
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    metarContent: {
        background: 'rgba(10, 10, 10, 0.95)',
        border: '1px solid #f39c12',
        borderLeft: 'none',
        borderRadius: '0 4px 4px 0',
        padding: '10px',
        width: '300px',
        maxHeight: '75vh',
        overflowY: 'auto',
        boxShadow: '5px 0 15px rgba(0,0,0,0.5)'
    },
    toggleBtn: {
        background: '#f39c12',
        border: 'none',
        color: 'black',
        padding: '20px 8px',
        cursor: 'pointer',
        borderRadius: '0 4px 4px 0',
        fontWeight: 'bold',
        fontSize: '14px',
        boxShadow: '2px 0 5px rgba(0,0,0,0.3)',
        marginLeft: '-1px'
    },
    loadingScreen: { backgroundColor: '#050505', color: '#f39c12', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' },
    header: { position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(10, 10, 10, 0.9)', color: '#f39c12', padding: '10px 25px', border: '1px solid #f39c12', textAlign: 'center', borderRadius: '4px', width: 'auto', minWidth: '320px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' },
    subHeader: { fontSize: '0.65rem', color: '#bdc3c7', marginTop: '4px', borderTop: '1px solid #444', paddingTop: '4px', letterSpacing: '1px' },
    labelBoxDark: { background: 'rgba(0, 15, 30, 0.9)', color: '#00ffff', border: '1px solid #00ffff', padding: '2px 8px', borderRadius: '2px', fontSize: '0.8rem', fontWeight: 'bold', fontFamily: 'monospace', textShadow: '0 0 5px #00ffff' },
    popupHeader: { background: '#f39c12', color: 'black', padding: '8px', fontWeight: 'bold', textAlign: 'center', fontSize: '0.85rem' },
    popupBody: { padding: '12px', fontSize: '0.8rem', background: '#1a1a1a', lineHeight: '1.4' }
};

export default OperacionesMapa;