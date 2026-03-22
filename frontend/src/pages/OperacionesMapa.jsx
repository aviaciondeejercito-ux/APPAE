import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EventService from '../services/EventService';

// Fix de iconos para Leaflet en Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const heloIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3715/3715761.png',
    iconSize: [35, 35],
    iconAnchor: [17, 17],
    popupAnchor: [0, -15],
});

const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]); // Hook inicializado correctamente
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await EventService.getEvents();
                if (data && Array.isArray(data)) {
                    const validas = data.filter(m => m.ubicacion?.lat && m.ubicacion?.lng);
                    setMisiones(validas);
                }
            } catch (err) {
                console.error("Error en mapa:", err);
            } finally {
                setLoading(false);
            }
        };
        cargarDatos();
    }, []);

    if (loading) return <div style={{padding: '20px'}}>Cargando situación táctica...</div>;

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 80px)', position: 'relative' }}>
            <div style={{
                position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
                zIndex: 1000, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px', borderRadius: '5px'
            }}>
                🦅 MONITOR TÁCTICO
            </div>

            <MapContainer center={[-34.6037, -58.3816]} zoom={5} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {misiones.map((m) => (
                    <Marker key={m._id} position={[parseFloat(m.ubicacion.lat), parseFloat(m.ubicacion.lng)]} icon={heloIcon}>
                        <Popup>
                            <strong>{m.title}</strong><br/>
                            <em>{m.elemento}</em>
                            <div style={{marginTop: '10px', background: '#f0f0f0', padding: '5px'}}>
                                <strong>INFO CRÍTICA:</strong><br/>
                                {m.notasMarginales || "Sin datos de Carga/Trip/Comb."}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default OperacionesMapa;