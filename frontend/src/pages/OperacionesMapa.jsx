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

// --- ICONOS REALISTAS (SILUETAS TÉCNICAS) ---
const heloIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1000/1000854.png', // Silueta real de helicóptero de transporte/ataque
    iconSize: [45, 45],
    iconAnchor: [22, 22],
    popupAnchor: [0, -20],
});

const planeIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3211/3211501.png', // Silueta real de avión de transporte/misión
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -20],
});

const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(true); // Estado para el modo de mapa

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

    const getIcon = (title) => {
        const t = title.toUpperCase();
        
        // Lógica de detección según tu lista de aeronaves
        const esAvion = 
            t.includes('C-212') || t.includes('C-208') || t.includes('C-550') || 
            t.includes('DA-62') || t.includes('DHC-6') || t.includes('C-182') || 
            t.includes('CESSNA') || t.includes('T-20')  || t.includes('MERLIN') ||
            t.includes('AVION');
        
        return esAvion ? planeIcon : heloIcon;
    };

    if (loading) return (
        <div style={styles.loadingScreen}>
            <div className="radar-loader"></div>
            <p style={{marginTop: '20px', letterSpacing: '3px'}}>📡 SINCRONIZANDO REDAR TÁCTICO...</p>
        </div>
    );

    return (
        <div style={styles.mapWrapper}>
            
            {/* Header del Sistema */}
            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '4px' }}>MONITOR DE OPERACIONES</div>
                <div style={{ fontSize: '0.65rem', color: '#bdc3c7', marginTop: '4px' }}>SISTEMA DE GESTIÓN AE - TIEMPO REAL</div>
            </div>

            {/* Selector de Modo de Mapa */}
            <button 
                onClick={() => setDarkMode(!darkMode)} 
                style={styles.mapToggle}
            >
                {darkMode ? '🛰️ VISTA ESTÁNDAR' : '🕶️ VISTA TÁCTICA'}
            </button>

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
                    url={darkMode 
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    } 
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
                            <span style={darkMode ? styles.tooltipLabelDark : styles.tooltipLabelLight}>
                                {m.title.split('-')[0].trim()}
                            </span>
                        </Tooltip>

                        <Popup>
                            <div style={styles.popupContainer}>
                                <div style={styles.popupHeader}>
                                    {m.title}
                                </div>
                                <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
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
        zIndex: 1000, background: 'rgba(20, 20, 20, 0.9)', color: '#f39c12', 
        padding: '10px 25px', borderRadius: '2px', border: '1px solid #f39c12',
        textAlign: 'center', backdropFilter: 'blur(5px)'
    },
    mapToggle: {
        position: 'absolute', top: '15px', right: '15px', zIndex: 1000,
        background: '#f39c12', color: '#000', border: 'none', padding: '10px 15px',
        borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)', fontFamily: 'monospace'
    },
    counter: {
        position: 'absolute', bottom: '20px', left: '15px',
        zIndex: 1000, background: 'rgba(0,0,0,0.85)', color: 'white', 
        padding: '8px 12px', borderRadius: '2px', fontSize: '0.8rem', 
        borderLeft: '4px solid #f39c12', fontFamily: 'monospace'
    },
    tooltipLabelDark: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)', color: '#00ff00', padding: '3px 8px', 
        borderRadius: '2px', fontWeight: 'bold', fontSize: '0.8rem', 
        border: '1px solid #00ff00', fontFamily: 'monospace'
    },
    tooltipLabelLight: {
        backgroundColor: 'white', color: '#2c3e50', padding: '3px 8px', 
        borderRadius: '2px', fontWeight: 'bold', fontSize: '0.8rem', 
        border: '1px solid #2c3e50', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)'
    },
    popupContainer: { minWidth: '200px', fontFamily: 'monospace' },
    popupHeader: { 
        background: '#f39c12', color: 'black', padding: '4px', 
        fontWeight: 'bold', marginBottom: '8px', textAlign: 'center', fontSize: '0.9rem'
    },
    popupMarginal: {
        background: '#2f3542', color: '#ffffff', padding: '8px', 
        borderRadius: '2px', fontSize: '0.75rem'
    }
};

export default OperacionesMapa;