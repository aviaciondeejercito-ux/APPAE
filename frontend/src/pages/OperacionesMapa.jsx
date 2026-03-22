import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EventService from '../services/EventService';

// Fix de iconos para Leaflet en Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Icono táctico para Aeronaves
const heloIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3715/3715761.png',
    iconSize: [35, 35],
    iconAnchor: [17, 17],
    popupAnchor: [0, -15],
});

const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]); 
    const [loading, setLoading] = useState(true);

    // Función de carga separada para permitir el auto-refresco
    const cargarSituacionTactica = async () => {
        try {
            // Cambiamos getEvents por la ruta específica del mapa táctico
            const data = await EventService.getActiveOperations(); 
            if (data && Array.isArray(data)) {
                // Filtramos solo las que tienen coordenadas válidas para evitar errores en el render
                const validas = data.filter(m => m.ubicacion?.lat && m.ubicacion?.lng);
                setMisiones(validas);
            }
        } catch (err) {
            console.error("Error en monitor táctico:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Carga inicial
        cargarSituacionTactica();

        // Configuración de refresco automático cada 30 segundos
        const interval = setInterval(() => {
            cargarSituacionTactica();
        }, 30000); 

        return () => clearInterval(interval); // Limpieza al salir del componente
    }, []);

    if (loading) return (
        <div style={{
            padding: '40px', 
            backgroundColor: '#121212', 
            color: '#f39c12', 
            height: '100vh', 
            textAlign: 'center'
        }}>
            📡 CONECTANDO CON CENTRO DE OPERACIONES...
        </div>
    );

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 80px)', position: 'relative' }}>
            {/* Header del Monitor */}
            <div style={{
                position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)',
                zIndex: 1000, background: 'rgba(20, 20, 20, 0.85)', color: '#f39c12', 
                padding: '10px 25px', borderRadius: '8px', border: '1px solid #f39c12',
                textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
            }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '2px' }}>🦅 MONITOR TÁCTICO</div>
                <div style={{ fontSize: '0.65rem', color: '#bdc3c7' }}>SITUACIÓN EN TIEMPO REAL - AVIACIÓN DE EJÉRCITO</div>
            </div>

            {/* Contador de Medios */}
            <div style={{
                position: 'absolute', bottom: '25px', right: '15px',
                zIndex: 1000, background: 'rgba(0,0,0,0.7)', color: 'white', 
                padding: '8px 12px', borderRadius: '4px', fontSize: '0.8rem', borderLeft: '4px solid #d35400'
            }}>
                MEDIOS EN VUELO: {misiones.length}
            </div>

            <MapContainer 
                center={[-38.4161, -63.6167]} // Centrado general en Argentina
                zoom={5} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false} // Lo quitamos para ponerlo en una posición más cómoda si quisieras
            >
                <TileLayer 
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                    attribution='&copy; Aviación de Ejército Argentina'
                />
                
                {misiones.map((m) => (
                    <Marker 
                        key={m._id} 
                        position={[parseFloat(m.ubicacion.lat), parseFloat(m.ubicacion.lng)]} 
                        icon={heloIcon}
                    >
                        <Popup>
                            <div style={{ minWidth: '200px' }}>
                                <div style={{ color: '#d35400', fontWeight: 'bold', borderBottom: '1px solid #ccc', marginBottom: '5px' }}>
                                    {m.title}
                                </div>
                                <div style={{ fontSize: '0.85rem' }}>
                                    <strong>UNIDAD:</strong> {m.elemento}<br/>
                                    <strong>ESTADO:</strong> <span style={{color: 'green'}}>EN CURSO</span>
                                </div>
                                
                                <div style={{
                                    marginTop: '10px', 
                                    background: '#2c3e50', 
                                    color: 'white', 
                                    padding: '8px', 
                                    borderRadius: '4px',
                                    fontSize: '0.75rem'
                                }}>
                                    <strong style={{color: '#f39c12'}}>INFO MARGINAL:</strong><br/>
                                    {m.notasMarginales || "SIN DATOS ADICIONALES"}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default OperacionesMapa;