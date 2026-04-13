import React, { useState } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configuración de iconos de Leaflet para evitar errores de carga
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const { BaseLayer } = LayersControl;

// --- Utilidades de Conversión ---
const decimalToGMS = (decimal, isLat) => {
    const absDecimal = Math.abs(decimal);
    const grados = Math.floor(absDecimal);
    const minutosDecimal = (absDecimal - grados) * 60;
    const minutos = Math.floor(minutosDecimal);
    const segundos = ((minutosDecimal - minutos) * 60).toFixed(1);
    const direccion = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
    return `${grados}°${minutos}'${segundos}"${direccion}`;
};

const MapEvents = ({ addWaypoint }) => {
    useMapEvents({
        click(e) {
            addWaypoint(e.latlng);
        },
    });
    return null;
};

const PlaneamientoMapa = () => {
    const [waypoints, setWaypoints] = useState([]);

    const addWaypoint = (latlng) => {
        const newWp = {
            id: Date.now(),
            nombre: `WP ${waypoints.length + 1}`,
            latlng: latlng,
            altitud: "0"
        };
        setWaypoints(prev => [...prev, newWp]);
    };

    const eliminarPunto = (id) => {
        setWaypoints(waypoints.filter(wp => wp.id !== id));
    };

    const actualizarDato = (id, campo, valor) => {
        setWaypoints(waypoints.map(wp => wp.id === id ? { ...wp, [campo]: valor } : wp));
    };

    const calcularDistanciaTotalKM = () => {
        let total = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            total += waypoints[i].latlng.distanceTo(waypoints[i + 1].latlng);
        }
        return total / 1000;
    };

    const distKM = calcularDistanciaTotalKM();
    const distNM = distKM * 0.539957;

    return (
        <div style={styles.container}>
            {/* PANEL LATERAL */}
            <div style={styles.sidebar}>
                <div style={styles.sidebarTitle}>NAVEGACIÓN TÁCTICA</div>
                
                <div style={styles.statsContainer}>
                    <div style={styles.statBox}>
                        <span style={styles.statLabel}>DISTANCIA KM</span>
                        <span style={styles.statValue}>{distKM.toFixed(2)} KM</span>
                    </div>
                    <div style={styles.statBox}>
                        <span style={styles.statLabel}>DISTANCIA NM</span>
                        <span style={styles.statValue}>{distNM.toFixed(2)} NM</span>
                    </div>
                </div>

                <div style={styles.waypointsList}>
                    {waypoints.map((wp, idx) => (
                        <div key={wp.id} style={styles.waypointItem}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <input 
                                    type="text" 
                                    value={wp.nombre} 
                                    onChange={(e) => actualizarDato(wp.id, 'nombre', e.target.value)}
                                    style={styles.nameInput}
                                    placeholder="Nombre WP"
                                />
                                <button onClick={() => eliminarPunto(wp.id)} style={styles.btnDelete}>X</button>
                            </div>
                            <div style={styles.gmsText}>{decimalToGMS(wp.latlng.lat, true)}</div>
                            <div style={styles.gmsText}>{decimalToGMS(wp.latlng.lng, false)}</div>
                            
                            <div style={styles.altInputContainer}>
                                <label style={{ fontSize: '0.65rem' }}>ALT (FT): </label>
                                <input 
                                    type="number" 
                                    value={wp.altitud} 
                                    onChange={(e) => actualizarDato(wp.id, 'altitud', e.target.value)}
                                    style={styles.altInput}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MAPA */}
            <div style={styles.mapWrapper}>
                <div style={styles.header}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '3px' }}>PLANEAMIENTO MILITAR</div>
                    <div style={styles.subHeader}>SISTEMA DE NAVEGACIÓN Y COTAS</div>
                </div>

                <MapContainer 
                    center={[-34.528, -58.641]} 
                    zoom={10} 
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                    zoomControl={false}
                >
                    <MapEvents addWaypoint={addWaypoint} />
                    <LayersControl position="topright">
                        <BaseLayer checked name="🌑 Modo Nocturno">
                            <TileLayer 
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                                attribution='&copy; CARTO' 
                            />
                        </BaseLayer>
                        
                        <BaseLayer name="🏔️ Relieve Satelital">
                            <TileLayer 
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                                attribution='Esri' 
                            />
                        </BaseLayer>

                        <BaseLayer name="🏙️ Brillo Urbano (Contrast)">
                            <TileLayer 
                                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
                                attribution='&copy; CARTO' 
                            />
                        </BaseLayer>
                        
                        <BaseLayer name="📈 Curvas de Nivel">
                            <TileLayer 
                                url="https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png" 
                                attribution='Thunderforest' 
                            />
                        </BaseLayer>
                    </LayersControl>

                    {waypoints.map((wp) => (
                        <Marker key={wp.id} position={wp.latlng}>
                            <Popup>
                                <div style={{ fontFamily: 'monospace' }}>
                                    <strong>{wp.nombre}</strong><br/>
                                    ALT: {wp.altitud} FT<br/>
                                    {decimalToGMS(wp.latlng.lat, true)}<br/>
                                    {decimalToGMS(wp.latlng.lng, false)}
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {waypoints.length > 1 && (
                        <Polyline positions={waypoints.map(wp => wp.latlng)} color="#00d4ff" weight={2} dashArray="5, 10" />
                    )}
                </MapContainer>
            </div>

            <style>{`
                .leaflet-control-layers { background: #1a1a1a !important; color: white !important; border: 1px solid #00d4ff !important; font-family: monospace; }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            `}</style>
        </div>
    );
};

const styles = {
    container: { display: 'flex', width: '100%', height: '100vh', backgroundColor: '#050505' },
    sidebar: { width: '300px', background: '#0a0a0a', borderRight: '1px solid #333', padding: '15px', overflowY: 'auto', zIndex: 2000, fontFamily: 'monospace', color: '#bdc3c7' },
    sidebarTitle: { color: '#00d4ff', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '15px', borderBottom: '1px solid #00d4ff', paddingBottom: '8px', textAlign: 'center' },
    statsContainer: { display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '15px' },
    statBox: { background: '#111', padding: '8px', borderRadius: '4px', border: '1px solid #222', display: 'flex', flexDirection: 'column' },
    statLabel: { fontSize: '0.6rem', color: '#00d4ff' },
    statValue: { fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' },
    waypointsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
    waypointItem: { background: '#1a1a1a', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #00d4ff' },
    nameInput: { background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#00d4ff', fontWeight: 'bold', fontSize: '0.85rem', width: '80%', padding: '2px', fontFamily: 'monospace', outline: 'none' },
    gmsText: { fontSize: '0.65rem', color: '#eee', marginTop: '2px' },
    altInputContainer: { marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px', borderTop: '1px solid #222', paddingTop: '5px' },
    altInput: { background: '#000', border: '1px solid #333', color: '#00d4ff', fontSize: '0.8rem', width: '80px', padding: '2px 5px', textAlign: 'right', fontFamily: 'monospace' },
    btnDelete: { background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' },
    mapWrapper: { flex: 1, position: 'relative' },
    header: { position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(10, 10, 10, 0.9)', color: '#00d4ff', padding: '10px 25px', border: '1px solid #00d4ff', textAlign: 'center', borderRadius: '4px', fontFamily: 'monospace' },
    subHeader: { fontSize: '0.6rem', color: '#bdc3c7', marginTop: '2px' }
};

export default PlaneamientoMapa;