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

// --- ICONOS TÁCTICOS SIMPLIFICADOS (Siluetas Limpias) ---
const heloIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/575/575453.png', // Silueta simple de helicóptero
    iconSize: [45, 45],
    iconAnchor: [22, 22],
    popupAnchor: [0, -20],
});

const planeIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/619/619043.png', // Silueta simple de avión
    iconSize: [45, 45],
    iconAnchor: [22, 22],
    popupAnchor: [0, -20],
});

const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]); 
    const [loading, setLoading] = useState(true);

    const cargarSituacionTactica = async () => {
        try {
            const data = await EventService.getActiveOperations(); 
            if (data && Array.isArray(data)) {
                // Solo mostrar los que tienen bandera de tiempo real y coordenadas válidas
                const validas = data.filter(m => m.isRealTime && m.ubicacion?.lat && m.ubicacion?.lng);
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
        const interval = setInterval(cargarSituacionTactica, 15000); // Actualización cada 15 seg
        return () => clearInterval(interval);
    }, []);

    // Lógica de detección precisa basada en tu lista
    const getIcon = (title) => {
        const t = title.toUpperCase();
        
        // Definición de Ala Fija (Aviones) según tu lista y estándar
        const esAvion = 
            t.includes('C-212') || 
            t.includes('C-208') || 
            t.includes('C-550') || 
            t.includes('DA-62') || 
            t.includes('DHC-6') || 
            t.includes('C-182') || 
            t.includes('CESSNA') || 
            t.includes('T-20')  || 
            t.includes('MERLIN') ||
            t.includes('AVION');
        
        // Si no es avión, por defecto es helicóptero (UH, BELL, AS, AB, LAMA, 407)
        return esAvion ? planeIcon : heloIcon;
    };

    if (loading) return (
        <div style={styles.loadingScreen}>
            <div className="radar-loader"></div>
            <p style={{marginTop: '20px', letterSpacing: '3px'}}>📡 SINCRONIZANDO RADAR TÁCTICO...</p>
        </div>
    );

    return (
        <div style={styles.mapWrapper}>
            
            {/* Header del Sistema */}
            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '4px' }}>MONITOR DE OPERACIONES</div>
                <div style={{ fontSize: '0.65rem', color: '#bdc3c7', marginTop: '4px' }}>SISTEMA DE GESTIÓN AE - TIEMPO REAL</div>
            </div>

            {/* Contador de Medios */}
            <div style={styles.counter}>
                <span style={{color: '#f39c12', fontWeight: 'bold'}}>MEDIOS EN VUELO:</span> {misiones.length}
            </div>

            <MapContainer 
                center={[-34.528, -58.641]} // Centrado inicial en Campo de Mayo
                zoom={5} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false} // Limpieza visual
            >
                <TileLayer 
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Mapa oscuro más táctico
                    attribution='&copy; Aviación de Ejército'
                />
                
                {misiones.map((m) => (
                    <Marker 
                        key={m._id} 
                        position={[parseFloat(m.ubicacion.lat), parseFloat(m.ubicacion.lng)]} 
                        icon={getIcon(m.title)}
                    >
                        {/* Etiqueta con el indicativo (Matrícula) */}
                        <Tooltip direction="right" offset={[15, 0]} opacity={0.9} permanent>
                            <span style={styles.tooltipLabel}>
                                {m.title.split('-')[0].trim()}
                            </span>
                        </Tooltip>

                        <Popup>
                            <div style={styles.popupContainer}>
                                <div style={styles.popupHeader}>
                                    {m.title}
                                </div>
                                <div style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#ecf0f1' }}>
                                    <strong>UNIDAD:</strong> {m.elemento}<br/>
                                    <strong>UBICACIÓN:</strong> {m.ubicacion.nombre}<br/>
                                    <strong>COORD:</strong> {parseFloat(m.ubicacion.lat).toFixed(4)}, {parseFloat(m.ubicacion.lng).toFixed(4)}
                                </div>
                                
                                <div style={styles.popupMarginal}>
                                    <strong style={{color: '#f39c12', fontSize: '0.7rem'}}>SITUACIÓN:</strong><br/>
                                    {m.notasMarginales || "SIN NOVEDAD"}
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
    mapWrapper: { width: '100%', height: 'calc(100vh - 60px)', position: 'relative', backgroundColor: '#000' },
    loadingScreen: {
        backgroundColor: '#0a0a0a', color: '#f39c12', 
        height: '100vh', textAlign: 'center', display: 'flex', 
        flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        fontFamily: 'monospace'
    },
    header: {
        position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, background: 'rgba(20, 20, 20, 0.85)', color: '#f39c12', 
        padding: '10px 25px', borderRadius: '2px', border: '1px solid #f39c12',
        textAlign: 'center', backdropFilter: 'blur(5px)'
    },
    counter: {
        position: 'absolute', top: '15px', left: '15px',
        zIndex: 1000, background: 'rgba(0,0,0,0.8)', color: 'white', 
        padding: '8px 12px', borderRadius: '2px', fontSize: '0.8rem', 
        borderLeft: '4px solid #f39c12', fontFamily: 'monospace'
    },
    tooltipLabel: {
        backgroundColor: 'rgba(26, 26, 26, 0.9)', color: '#00ff00', padding: '3px 8px', 
        borderRadius: '2px', fontWeight: 'bold', fontSize: '0.8rem', 
        border: '1px solid #00ff00', fontFamily: 'monospace', textShadow: '0 0 5px rgba(0,255,0,0.5)'
    },
    popupContainer: { minWidth: '200px', fontFamily: 'monospace', backgroundColor: '#1e272e' },
    popupHeader: { 
        background: '#f39c12', color: 'black', padding: '4px', 
        fontWeight: 'bold', marginBottom: '8px', textAlign: 'center', fontSize: '0.9rem'
    },
    popupMarginal: {
        background: '#000', color: '#00ff00', padding: '8px', 
        borderRadius: '2px', fontSize: '0.75rem', border: '1px solid #333'
    }
};

export default OperacionesMapa;