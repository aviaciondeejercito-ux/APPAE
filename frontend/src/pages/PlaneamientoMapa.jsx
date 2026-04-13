import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configuración de iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const { BaseLayer } = LayersControl;

// --- Utilidades Matemáticas ---
const calcularRumbo = (lat1, lon1, lat2, lon2) => {
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
    const x = Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
              Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLon);
    let rumbo = Math.atan2(y, x) * (180 / Math.PI);
    return (rumbo + 360) % 360;
};

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
        click(e) { addWaypoint(e.latlng); },
    });
    return null;
};

const PlaneamientoMapa = () => {
    const [waypoints, setWaypoints] = useState([]);

    // Función para obtener elevación desde API (Open-Elevation soporta CORS)
    const fetchElevacion = async (lat, lng, id) => {
        try {
            const res = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`);
            const data = await res.json();
            if (data.results && data.results[0].elevation !== null) {
                const elevFeet = Math.round(data.results[0].elevation * 3.28084);
                actualizarDato(id, 'elevTerreno', elevFeet.toString());
            }
        } catch (error) {
            console.error("Error obteniendo elevación:", error);
            actualizarDato(id, 'elevTerreno', "Err");
        }
    };

    const addWaypoint = (latlng) => {
        const newId = Date.now();
        const newWp = {
            id: newId,
            nombre: `WP ${waypoints.length + 1}`,
            latlng: latlng,
            altitud: "500", // Altitud de vuelo por defecto
            elevTerreno: "...", // Elevación del terreno automática
            consumo: "0"
        };
        setWaypoints(prev => [...prev, newWp]);
        fetchElevacion(latlng.lat, latlng.lng, newId);
    };

    const eliminarPunto = (id) => {
        setWaypoints(waypoints.filter(wp => wp.id !== id));
    };

    const actualizarDato = (id, campo, valor) => {
        setWaypoints(prev => prev.map(wp => wp.id === id ? { ...wp, [campo]: valor } : wp));
    };

    const handleDrag = (id, e) => {
        const newLatLng = e.target.getLatLng();
        setWaypoints(prev => prev.map(wp => wp.id === id ? { ...wp, latlng: newLatLng, elevTerreno: "..." } : wp));
        fetchElevacion(newLatLng.lat, newLatLng.lng, id);
    };

    const stats = useMemo(() => {
        let distTotal = 0;
        let combustibleTotal = 0;
        for (let i = 0; i < waypoints.length; i++) {
            if (i < waypoints.length - 1) {
                distTotal += waypoints[i].latlng.distanceTo(waypoints[i + 1].latlng);
            }
            combustibleTotal += parseFloat(waypoints[i].consumo || 0);
        }
        return {
            distNM: (distTotal / 1000) * 0.539957,
            fuel: combustibleTotal
        };
    }, [waypoints]);

    return (
        <div style={styles.container}>
            {/* PANEL LATERAL */}
            <div style={styles.sidebar}>
                <div style={styles.sidebarTitle}>NAVEGACIÓN TÁCTICA</div>
                
                <div style={styles.statsContainer}>
                    <div style={styles.statBox}>
                        <span style={styles.statLabel}>DISTANCIA TOTAL</span>
                        <span style={styles.statValue}>{stats.distNM.toFixed(1)} NM</span>
                    </div>
                    <div style={styles.statBox}>
                        <span style={styles.statLabel}>FUEL ACUMULADO</span>
                        <span style={{...styles.statValue, color: '#ffcc00'}}>{stats.fuel.toFixed(1)}</span>
                    </div>
                </div>

                <div style={styles.waypointsList}>
                    {waypoints.map((wp, index) => {
                        let rumboSig = null;
                        if (index < waypoints.length - 1) {
                            rumboSig = calcularRumbo(
                                wp.latlng.lat, wp.latlng.lng,
                                waypoints[index + 1].latlng.lat, waypoints[index + 1].latlng.lng
                            );
                        }

                        return (
                            <div key={wp.id} style={styles.waypointItem}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <input 
                                        type="text" 
                                        value={wp.nombre} 
                                        onChange={(e) => actualizarDato(wp.id, 'nombre', e.target.value)}
                                        style={styles.nameInput}
                                    />
                                    <button onClick={() => eliminarPunto(wp.id)} style={styles.btnDelete}>X</button>
                                </div>
                                <div style={styles.gmsText}>{decimalToGMS(wp.latlng.lat, true)} | {decimalToGMS(wp.latlng.lng, false)}</div>
                                
                                <div style={styles.dataGrid}>
                                    <div style={styles.inputGroup}>
                                        <label style={styles.miniLabel}>ALT VUELO</label>
                                        <input 
                                            type="text" 
                                            value={wp.altitud} 
                                            onChange={(e) => actualizarDato(wp.id, 'altitud', e.target.value)}
                                            style={styles.miniInput}
                                        />
                                    </div>
                                    <div style={styles.inputGroup}>
                                        <label style={styles.miniLabel}>ELEV TERR</label>
                                        <div style={styles.elevDisplay}>{wp.elevTerreno}</div>
                                    </div>
                                    <div style={styles.inputGroup}>
                                        <label style={styles.miniLabel}>FUEL</label>
                                        <input 
                                            type="number" 
                                            value={wp.consumo} 
                                            onChange={(e) => actualizarDato(wp.id, 'consumo', e.target.value)}
                                            style={{...styles.miniInput, color: '#ffcc00', width: '45px'}}
                                        />
                                    </div>
                                    {rumboSig !== null && (
                                        <div style={styles.rumboTag}>
                                            <span style={styles.miniLabel}>RUMBO</span>
                                            <span style={styles.rumboValue}>{Math.round(rumboSig)}°</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MAPA */}
            <div style={styles.mapWrapper}>
                <div style={styles.header}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '2px' }}>PLANEAMIENTO DE MISIÓN</div>
                    <div style={{ fontSize: '0.6rem', color: '#bdc3c7' }}>SISTEMA DE CARTOGRAFÍA OPERATIVA</div>
                </div>

                <MapContainer 
                    center={[-34.528, -58.641]} 
                    zoom={10} 
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                    zoomControl={false}
                >
                    <MapEvents addWaypoint={addWaypoint} />
                    <LayersControl position="topright">
                        
                        <BaseLayer checked name="⛰️ Relieve">
                            <TileLayer 
                                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
                                attribution='Map data: &copy; OSM, SRTM | Map style: &copy; OpenTopoMap' 
                            />
                        </BaseLayer>

                        <BaseLayer name="🏔️ Satelital">
                            <TileLayer 
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                                attribution='Esri' 
                            />
                        </BaseLayer>

                        <BaseLayer name="🌑 Modo Oscuro">
                            <TileLayer 
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                                attribution='&copy; CARTO' 
                            />
                        </BaseLayer>

                    </LayersControl>

                    {waypoints.map((wp) => (
                        <Marker 
                            key={wp.id} 
                            position={wp.latlng}
                            draggable={true}
                            eventHandlers={{ dragend: (e) => handleDrag(wp.id, e) }}
                        >
                            <Popup>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                    <strong style={{color: '#00d4ff'}}>{wp.nombre}</strong><br/>
                                    ALT VUELO: {wp.altitud} FT<br/>
                                    ELEV TERR: {wp.elevTerreno} FT
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {waypoints.length > 1 && (
                        <Polyline positions={waypoints.map(wp => wp.latlng)} color="#00d4ff" weight={3} dashArray="10, 5" />
                    )}
                </MapContainer>
            </div>

            <style>{`
                .leaflet-control-layers { background: #1a1a1a !important; color: white !important; border: 1px solid #333 !important; font-family: monospace; }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            `}</style>
        </div>
    );
};

const styles = {
    container: { display: 'flex', width: '100%', height: '100vh', backgroundColor: '#050505' },
    sidebar: { width: '360px', background: '#0a0a0a', borderRight: '1px solid #333', padding: '15px', overflowY: 'auto', zIndex: 2000, fontFamily: 'monospace', color: '#bdc3c7' },
    sidebarTitle: { color: '#00d4ff', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '15px', borderBottom: '1px solid #00d4ff', paddingBottom: '8px', textAlign: 'center' },
    statsContainer: { display: 'flex', gap: '8px', marginBottom: '20px' },
    statBox: { flex: 1, background: '#111', padding: '8px', borderRadius: '4px', border: '1px solid #222', textAlign: 'center' },
    statLabel: { fontSize: '0.55rem', color: '#00d4ff', display: 'block', marginBottom: '4px' },
    statValue: { fontSize: '1rem', fontWeight: 'bold', color: '#fff' },
    waypointsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    waypointItem: { background: '#161616', padding: '12px', borderRadius: '4px', borderLeft: '4px solid #00d4ff' },
    nameInput: { background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#00d4ff', fontWeight: 'bold', fontSize: '0.9rem', width: '70%', outline: 'none' },
    gmsText: { fontSize: '0.6rem', color: '#666', margin: '6px 0' },
    dataGrid: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px', gap: '8px' },
    inputGroup: { display: 'flex', flexDirection: 'column' },
    miniLabel: { fontSize: '0.45rem', color: '#00d4ff', marginBottom: '2px', textTransform: 'uppercase' },
    miniInput: { background: '#000', border: '1px solid #333', color: '#fff', fontSize: '0.75rem', width: '55px', padding: '3px', textAlign: 'center', outline: 'none' },
    elevDisplay: { background: '#222', color: '#00ff00', fontSize: '0.75rem', width: '55px', padding: '4px', textAlign: 'center', borderRadius: '2px', border: '1px solid #333' },
    rumboTag: { textAlign: 'right' },
    rumboValue: { fontSize: '0.9rem', fontWeight: 'bold', color: '#00ff00', display: 'block' },
    btnDelete: { background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontWeight: 'bold', padding: '0 5px' },
    mapWrapper: { flex: 1, position: 'relative' },
    header: { position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(10, 10, 10, 0.9)', color: '#00d4ff', padding: '10px 25px', border: '1px solid #333', borderRadius: '4px', fontFamily: 'monospace', textAlign: 'center' }
};

export default PlaneamientoMapa;