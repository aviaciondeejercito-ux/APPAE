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

const SincronizadorBus = ({ onMove }) => {
    useMapEvents({
        move: (e) => onMove(e.target.getCenter(), e.target.getZoom()),
        zoomend: (e) => onMove(e.target.getCenter(), e.target.getZoom()),
    });
    return null;
};

const OperacionesMapa = ({ capasMet, setCapasMet }) => {
    const [misiones, setMisiones] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [modoMapa, setModoMapa] = useState('satelite');
    const [mapView, setMapView] = useState({ center: [-34.528, -58.641], zoom: 5 });

    // Tu API Key de OpenWeatherMap
    const OWM_KEY = import.meta.env.VITE_OWM_KEY || '3c37f51c0830baa0dabe3848ba5d4bbf';

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
            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '4px' }}>MONITOR DE OPERACIONES</div>
                <div style={{ fontSize: '0.65rem', color: '#bdc3c7', marginTop: '4px' }}>AVIACIÓN DE EJÉRCITO</div>
            </div>

            {/* SELECTOR DE MODO Y METEO RÁPIDA */}
            <div style={styles.selectorModo}>
                <button onClick={() => setModoMapa('satelite')} style={{...styles.btnModo, color: modoMapa === 'satelite' ? '#f39c12' : '#fff'}}>🛰️ SAT</button>
                <button onClick={() => setModoMapa('fisico')} style={{...styles.btnModo, color: modoMapa === 'fisico' ? '#f39c12' : '#fff'}}>🗺️ MAP</button>
                <div style={{width: '1px', background: '#444', margin: '0 5px'}}></div>
                
                {/* Botones de Capas Meteorológicas */}
                <button onClick={() => setCapasMet(prev => ({...prev, radar: !prev.radar}))} style={{...styles.btnModo, color: capasMet.radar ? '#00ffff' : '#888'}}>🌧️ RADAR</button>
                <button onClick={() => setCapasMet(prev => ({...prev, nubes: !prev.nubes}))} style={{...styles.btnModo, color: capasMet.nubes ? '#00ffff' : '#888'}}>☁️ NUBES</button>
                <button onClick={() => setCapasMet(prev => ({...prev, viento: !prev.viento}))} style={{...styles.btnModo, color: capasMet.viento ? '#00ffff' : '#888'}}>💨 VIENTO</button>
            </div>

            <MapContainer center={mapView.center} zoom={mapView.zoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                {modoMapa === 'satelite' ? (
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="ESRI Satellite" zIndex={1} />
                ) : (
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap" zIndex={1} />
                )}

                {/* --- CAPAS METEOROLÓGICAS --- */}
                {capasMet.nubes && (
                    <TileLayer url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`} opacity={0.4} zIndex={5} />
                )}
                
                {capasMet.viento && (
                    <TileLayer url={`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`} opacity={0.4} zIndex={6} />
                )}

                {capasMet.radar && (
                    <TileLayer url="https://tilecache.rainviewer.com/v2/radar/nowcast_1/256/{z}/{x}/{y}/1/1_1.png" opacity={0.7} zIndex={10} />
                )}

                <SincronizadorBus onMove={(c, z) => setMapView({center: c, zoom: z})} />
                
                {misiones.map((m) => (
                    <Marker key={m._id} position={[parseFloat(m.ubicacion.lat), parseFloat(m.ubicacion.lng)]} icon={getIcon(m)}>
                        <Tooltip direction="right" offset={[15, 0]} permanent className="label-tactica-custom">
                            <div style={styles.labelBoxDark}>{m.matricula || "S/M"}</div>
                        </Tooltip>
                        <Popup>
                            <div style={styles.popupContainer}>
                                <div style={styles.popupHeader}>{m.aeronave} {m.matricula}</div>
                                <div style={{ fontSize: '0.85rem', padding: '10px', color: '#ecf0f1', background: '#2c3e50' }}>
                                    <strong>MISIÓN:</strong> {m.title}<br/>
                                    <strong>POSICIÓN:</strong> {m.ubicacion.nombre}<br/>
                                    <hr style={{borderColor: '#7f8c8d', margin: '8px 0'}}/>
                                    <small style={{color: '#f39c12'}}>SISTEMA DE SEGUIMIENTO AE</small>
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
    mapWrapper: { width: '100%', height: '100%', position: 'relative', backgroundColor: '#000' },
    loadingScreen: { backgroundColor: '#0a0a0a', color: '#f39c12', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' },
    header: { position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(20, 20, 20, 0.9)', color: '#f39c12', padding: '10px 25px', border: '1px solid #f39c12', textAlign: 'center', pointerEvents: 'none', borderRadius: '2px' },
    selectorModo: {
        position: 'absolute', top: '15px', right: '15px', zIndex: 1000,
        display: 'flex', gap: '5px', background: 'rgba(0,0,0,0.85)', padding: '5px', borderRadius: '4px', border: '1px solid #444'
    },
    btnModo: { background: 'transparent', border: 'none', padding: '8px 10px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '0.7rem' },
    labelBoxDark: { background: 'rgba(0, 20, 40, 0.85)', color: '#00ffff', border: '1px solid #00ffff', padding: '2px 6px', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace', textShadow: '0 0 5px #00ffff' },
    popupContainer: { minWidth: '200px', fontFamily: 'monospace' },
    popupHeader: { background: '#f39c12', color: 'black', padding: '8px', fontWeight: 'bold', textAlign: 'center' }
};

export default OperacionesMapa;