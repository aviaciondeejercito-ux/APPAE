import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EventService from '../services/EventService';

// --- FIX PARA ICONOS EN AMBIENTES BUILD (VITE/RENDER) ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Icono personalizado para el helicóptero
const heloIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3715/3715761.png',
    iconSize: [35, 35],
    iconAnchor: [17, 17],
    popupAnchor: [0, -15],
});
// -------------------------------------------------------

const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMisiones();
        // Actualización automática cada 2 minutos para el Boss
        const interval = setInterval(fetchMisiones, 120000);
        return () => clearInterval(interval);
    }, []);

    const fetchMisiones = async () => {
        try {
            const data = await EventService.getEvents();
            // Filtramos solo las que tienen coordenadas geográficas
            const conUbicacion = data.filter(ev => ev.ubicacion && ev.ubicacion.lat && ev.ubicacion.lng);
            setMisiones(conUbicacion);
            setLoading(false);
        } catch (error) {
            console.error("Error cargando mapa:", error);
            setLoading(false);
        }
    };

    if (loading) return (
        <div style={styles.loader}>
            <div style={{textAlign: 'center'}}>
                <h2>🦅</h2>
                <p>CARGANDO SITUACIÓN TÁCTICA...</p>
            </div>
        </div>
    );

    return (
        <div style={styles.mapWrapper}>
            <div style={styles.overlayTitle}>
                🦅 MONITOR TÁCTICO DE OPERACIONES - AVIACIÓN DE EJÉRCITO
            </div>
            
            <MapContainer 
                center={[-38.416097, -63.616672]} 
                zoom={5} 
                style={styles.map}
                zoomControl={false}
                scrollWheelZoom={true}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; Aviación de Ejército'
                />
                <ZoomControl position="bottomright" />

                {misiones.map((mision) => (
                    <Marker 
                        key={mision._id} 
                        position={[parseFloat(mision.ubicacion.lat), parseFloat(mision.ubicacion.lng)]}
                        icon={heloIcon}
                    >
                        <Popup minWidth={250}>
                            <div style={styles.popup}>
                                <h3 style={styles.popTitle}>{mision.title}</h3>
                                <div style={styles.badge}>{mision.elemento}</div>
                                
                                <hr style={styles.hr} />
                                
                                <div style={styles.infoSection}>
                                    <strong>📍 UBICACIÓN:</strong> {mision.ubicacion.nombre}
                                </div>

                                {/* INFO CRÍTICA SOLICITADA */}
                                <div style={styles.novedadesBox}>
                                    <strong>📋 INFO MARGINAL (TRIP/CARGA/COMB):</strong>
                                    <p style={styles.novedadesText}>
                                        {mision.notasMarginales || "Sin información marginal reportada."}
                                    </p>
                                </div>

                                <div style={styles.footerPopup}>
                                    Inicio: {new Date(mision.start).toLocaleString()}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

const styles = {
    mapWrapper: { 
        position: 'relative', 
        width: '100%', 
        height: 'calc(100vh - 80px)', // Ajustado para que no desborde el footer
        backgroundColor: '#e5e3df' 
    },
    map: { width: '100%', height: '100%' },
    loader: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', fontWeight: 'bold', color: '#1b3a57', fontFamily: 'sans-serif' },
    overlayTitle: {
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, backgroundColor: 'rgba(27, 58, 87, 0.9)', color: 'white',
        padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem',
        boxShadow: '0 4px 15px rgba(0,0,0,0.4)', border: '1px solid #f39c12',
        pointerEvents: 'none', textAlign: 'center', width: 'auto', whiteSpace: 'nowrap'
    },
    popup: { fontFamily: 'sans-serif', padding: '5px' },
    popTitle: { margin: '0 0 5px 0', color: '#1b3a57', fontSize: '1.1rem', fontWeight: 'bold' },
    badge: { 
        display: 'inline-block', backgroundColor: '#f39c12', color: 'white', 
        padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' 
    },
    hr: { margin: '10px 0', border: '0', borderTop: '1px solid #eee' },
    infoSection: { fontSize: '0.85rem', marginBottom: '10px', color: '#444' },
    novedadesBox: { 
        backgroundColor: '#f0f4f8', padding: '12px', borderRadius: '6px', 
        borderLeft: '4px solid #1e3799', marginTop: '10px' 
    },
    novedadesText: { margin: '5px 0 0 0', fontSize: '0.9rem', fontStyle: 'italic', color: '#2c3e50', whiteSpace: 'pre-line', lineHeight: '1.4' },
    footerPopup: { marginTop: '10px', fontSize: '0.7rem', color: '#999', textAlign: 'right' }
};

export default OperacionesMapa;