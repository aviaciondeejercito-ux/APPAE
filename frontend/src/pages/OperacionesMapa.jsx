import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EventService from '../services/EventService';

// Fix de iconos para Leaflet en Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// --- ICONOS TÁCTICOS AMPLIADOS (50px) ---
const heloIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3715/3715761.png',
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -20],
});

const planeIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png', 
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -20],
});

const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]); 
    const [loading, setLoading] = useState(true);

    const cargarSituacionTactica = async () => {
        try {
            const data = await EventService.getActiveOperations(); 
            if (data && Array.isArray(data)) {
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
        cargarSituacionTactica();
        const interval = setInterval(cargarSituacionTactica, 30000); 
        return () => clearInterval(interval);
    }, []);

    // Lógica de detección de tipo de aeronave para asignar icono
    const getIcon = (title) => {
        const t = title.toUpperCase();
        // Lista de aeronaves de ala fija (Aviones) del Ejército
        const esAvion = t.includes('C-182') || 
                        t.includes('T-20') || 
                        t.includes('CESSNA') || 
                        t.includes('CARAVAN') || 
                        t.includes('C-212') || 
                        t.includes('DA-42') || 
                        t.includes('AVION');
        
        return esAvion ? planeIcon : heloIcon;
    };

    if (loading) return (
        <div style={styles.loadingScreen}>
            <div className="radar-loader"></div>
            <p style={{marginTop: '20px', letterSpacing: '3px'}}>📡 SINCRONIZANDO OPERACIONES...</p>
        </div>
    );

    return (
        <div style={styles.mapWrapper}>
            
            {/* Header del Sistema */}
            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.4rem', letterSpacing: '4px' }}> OPERACIONES EN DESARROLLO</div>
                <div style={{ fontSize: '0.7rem', color: '#bdc3c7', marginTop: '4px' }}>DIRECCION DE AVIACIÓN DE EJERCITO - SITUACIÓN REAL</div>
            </div>

            {/* Contador de Medios en el aire */}
            <div style={styles.counter}>
                <span style={{color: '#f39c12', fontWeight: 'bold'}}>MEDIOS ACTIVOS:</span> {misiones.length}
            </div>

            <MapContainer 
                center={[-38.4161, -63.6167]} 
                zoom={5} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
            >
                <TileLayer 
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                    attribution='&copy; Aviación de Ejército'
                />
                
                {misiones.map((m) => (
                    <Marker 
                        key={m._id} 
                        position={[parseFloat(m.ubicacion.lat), parseFloat(m.ubicacion.lng)]} 
                        icon={getIcon(m.title)}
                    >
                        {/* Etiqueta flotante permanente con el indicativo */}
                        <Tooltip direction="bottom" offset={[0, 20]} opacity={1} permanent>
                            <span style={styles.tooltipLabel}>{m.title.split('-')[0]}</span>
                        </Tooltip>

                        <Popup>
                            <div style={styles.popupContainer}>
                                <div style={styles.popupHeader}>
                                    {m.title}
                                </div>
                                <div style={{ fontSize: '0.9rem', marginBottom: '10px' }}>
                                    <strong>UIP:</strong> {m.elemento}<br/>
                                    <strong>POS:</strong> {parseFloat(m.ubicacion.lat).toFixed(4)}, {parseFloat(m.ubicacion.lng).toFixed(4)}
                                </div>
                                
                                <div style={styles.popupMarginal}>
                                    <strong style={{color: '#f39c12'}}>DATOS DE MISIÓN:</strong><br/>
                                    {m.notasMarginales || "SIN REGISTRO ADICIONAL"}
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
    mapWrapper: { width: '100%', height: 'calc(100vh - 80px)', position: 'relative', backgroundColor: '#000' },
    loadingScreen: {
        padding: '40px', backgroundColor: '#121212', color: '#f39c12', 
        height: '100vh', textAlign: 'center', display: 'flex', 
        flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
    },
    header: {
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, background: 'rgba(10, 10, 10, 0.9)', color: '#f39c12', 
        padding: '12px 30px', borderRadius: '4px', border: '2px solid #f39c12',
        textAlign: 'center', boxShadow: '0 0 20px rgba(243, 156, 18, 0.4)'
    },
    counter: {
        position: 'absolute', bottom: '30px', left: '20px',
        zIndex: 1000, background: 'rgba(0,0,0,0.8)', color: 'white', 
        padding: '10px 15px', borderRadius: '4px', fontSize: '0.9rem', 
        borderLeft: '5px solid #f39c12', boxShadow: '5px 5px 15px rgba(0,0,0,0.5)'
    },
    tooltipLabel: {
        backgroundColor: '#1e272e', color: '#f39c12', padding: '2px 6px', 
        borderRadius: '3px', fontWeight: 'bold', fontSize: '0.75rem', border: '1px solid #f39c12'
    },
    popupContainer: { minWidth: '220px', fontFamily: 'monospace' },
    popupHeader: { 
        background: '#f39c12', color: 'black', padding: '5px', 
        fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' 
    },
    popupMarginal: {
        background: '#1e272e', color: '#00ff00', padding: '10px', 
        borderRadius: '3px', fontSize: '0.8rem', border: '1px solid #2f3542'
    }
};

export default OperacionesMapa;