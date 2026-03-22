import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EventService from '../services/EventService';

// Configuración del icono del Helicóptero
const heloIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3715/3715761.png', // Icono de helicóptero táctico
    iconSize: [35, 35],
    iconAnchor: [17, 17],
    popupAnchor: [0, -15],
});

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

    if (loading) return <div style={styles.loader}>CARGANDO SITUACIÓN TÁCTICA...</div>;

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
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; Aviación de Ejército'
                />
                <ZoomControl position="bottomright" />

                {misiones.map((mision) => (
                    <Marker 
                        key={mision._id} 
                        position={[mision.ubicacion.lat, mision.ubicacion.lng]}
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

                                {/* AQUÍ ESTÁ LO QUE ME PEDISTE: INFO CRÍTICA */}
                                <div style={styles.novedadesBox}>
                                    <strong>📋 INFO MARGINAL (TRIP/CARGA/COMB):</strong>
                                    <p style={styles.novedadesText}>
                                        {mision.notasMarginales || "Sin información marginal reportada."}
                                    </p>
                                </div>

                                <div style={styles.footerPopup}>
                                    Actualizado: {new Date(mision.start).toLocaleTimeString()} hs
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
    mapWrapper: { position: 'relative', width: '100%', height: 'calc(100vh - 100px)' },
    map: { width: '100%', height: '100%' },
    loader: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', fontWeight: 'bold', color: '#1b3a57' },
    overlayTitle: {
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, backgroundColor: 'rgba(27, 58, 87, 0.9)', color: 'white',
        padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)', border: '1px solid #f39c12'
    },
    popup: { fontFamily: 'sans-serif', padding: '5px' },
    popTitle: { margin: '0 0 5px 0', color: '#1b3a57', fontSize: '1.1rem' },
    badge: { 
        display: 'inline-block', backgroundColor: '#f39c12', color: 'white', 
        padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' 
    },
    hr: { margin: '10px 0', border: '0', borderTop: '1px solid #eee' },
    infoSection: { fontSize: '0.85rem', marginBottom: '10px' },
    novedadesBox: { 
        backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '6px', 
        borderLeft: '4px solid #1e3799', marginTop: '10px' 
    },
    novedadesText: { margin: '5px 0 0 0', fontSize: '0.9rem', fontStyle: 'italic', color: '#333', whiteSpace: 'pre-line' },
    footerPopup: { marginTop: '10px', fontSize: '0.7rem', color: '#888', textAlign: 'right' }
};

export default OperacionesMapa;