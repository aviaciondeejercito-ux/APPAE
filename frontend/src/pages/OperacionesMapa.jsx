import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, LayersControl, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EventService from '../services/EventService'; 

const { BaseLayer } = LayersControl;

/** SIMBOLOGÍA TÁCTICA */
const crearIconoTactico = (tipo) => {
    const tipoNormalizado = tipo?.toLowerCase().trim();
    const color = tipoNormalizado === 'ala_fija' ? '#3498db' : '#e67e22';
    
    const svg = tipoNormalizado === 'ala_fija' 
        ? `<polygon points="50,15 90,85 50,70 10,85" fill="${color}" stroke="white" stroke-width="5"/>`
        : `<circle cx="50" cy="50" r="35" fill="${color}" stroke="white" stroke-width="5"/><line x1="10" y1="50" x2="90" y2="50" stroke="white" stroke-width="8"/><line x1="50" y1="10" x2="50" y2="90" stroke="white" stroke-width="8"/>`;

    return L.divIcon({
        className: 'label-tactica-custom',
        html: `<svg width="30" height="30" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    });
};

const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]);

    const fetchMisiones = async () => {
        try {
            const data = await EventService.getActiveOperations();
            const role = localStorage.getItem('role');
            const userElemento = localStorage.getItem('elemento')?.toUpperCase(); 
            
            const dataArray = Array.isArray(data) ? data : data.data || [];
            
            const activas = dataArray.filter(ev => {
                const isAdmin = ['admin', 'BOSS', 'DIRECTOR', 'OTO'].includes(role);
                const perteneceUnidad = ev.elemento?.toUpperCase() === userElemento;
                return isAdmin || perteneceUnidad;
            });

            setMisiones(activas);
        } catch (error) {
            console.error("Error en radar:", error);
        }
    };

    useEffect(() => {
        fetchMisiones();
        const timer = setInterval(fetchMisiones, 10000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div style={styles.mapWrapper}>
            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '3px' }}>MONITOR DE OPERACIONES</div>
                <div style={styles.subHeader}>AVIACIÓN DE EJÉRCITO ARGENTINO - LIVE RADAR</div>
            </div>

            <MapContainer center={[-34.528, -58.641]} zoom={5} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
                <LayersControl position="topright">
                    <BaseLayer checked name="🌑 Modo Oscuro"><TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" /></BaseLayer>
                    <BaseLayer name="📡 Satelital (Esri)"><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" /></BaseLayer>
                    <BaseLayer name="🗺️ Político"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /></BaseLayer>
                </LayersControl>

                {misiones.map((m) => {
                    const ori = m.origen || {};
                    const des = m.destino || {};
                    
                    const latOri = parseFloat(ori.lat);
                    const lngOri = parseFloat(ori.lng);
                    const latDes = parseFloat(des.lat);
                    const lngDes = parseFloat(des.lng);

                    const tieneOrigenValido = !isNaN(latOri) && !isNaN(lngOri);
                    const tieneDestinoValido = !isNaN(latDes) && !isNaN(lngDes);

                    if (!tieneOrigenValido) return null;

                    const actualPos = tieneDestinoValido 
                        ? [(latOri + latDes) / 2, (lngOri + lngDes) / 2]
                        : [latOri, lngOri];

                    const iconoARenderizar = m.tipoIcono || m.misionDetalle?.tipoIcono || 'ala_rotativa';

                    return (
                        <React.Fragment key={m._id?.$oid || m._id}>
                            {tieneDestinoValido && (
                                <>
                                    <Polyline 
                                        positions={[[latOri, lngOri], [latDes, lngDes]]} 
                                        pathOptions={{ color: '#00d4ff', weight: 8, opacity: 0.15 }} 
                                    />
                                    <Polyline 
                                        positions={[[latOri, lngOri], [latDes, lngDes]]} 
                                        pathOptions={{ color: '#00d4ff', weight: 1.5, opacity: 0.6, dashArray: '5, 10' }} 
                                    />
                                </>
                            )}
                            
                            <Marker position={actualPos} icon={crearIconoTactico(iconoARenderizar)}>
                                <Tooltip direction="top" offset={[0, -15]} opacity={1} permanent className="custom-tooltip-radar">
                                    <div style={styles.tooltipContent}>
                                        <span style={styles.tooltipText}>{m.matricula || 'S/M'}</span>
                                        <span style={styles.tooltipIcon}>{tieneDestinoValido ? '✈️' : '📍'}</span>
                                    </div>
                                </Tooltip>
                                <Popup>
                                    <div style={styles.popupContainer}>
                                        <div style={styles.popupHeader}>{m.title}</div>
                                        <div style={styles.popupBody}>
                                            <div style={styles.popupRow}>
                                                <span style={styles.popupLabel}>MATRÍCULA:</span> 
                                                <span style={styles.popupValue}>{m.matricula || '---'}</span>
                                            </div>
                                            <div style={styles.popupRow}>
                                                <span style={styles.popupLabel}>SDA:</span> 
                                                <span style={styles.popupValue}>{m.aeronave || '---'}</span>
                                            </div>
                                            <div style={styles.popupRow}>
                                                <span style={styles.popupLabel}>ELEMENTO:</span> 
                                                <span style={styles.popupValue}>{m.elemento || '---'}</span>
                                            </div>
                                            <div style={styles.popupRow}>
                                                <span style={styles.popupLabel}>RUTA:</span> 
                                                <span style={styles.popupValue}>
                                                    {ori.nombre || '---'} {tieneDestinoValido ? `➔ ${des.nombre || '---'}` : '(EN PLATAFORMA)'}
                                                </span>
                                            </div>
                                            {m.notasMarginales && (
                                                <div style={styles.popupNoteBox}>
                                                    <div style={styles.popupLabelNote}>NOTAS ADICIONALES:</div>
                                                    {m.notasMarginales}
                                                </div>
                                            )}
                                        </div>
                                        <div style={styles.popupFooter}>
                                            ACTUALIZADO: {m.updatedAt ? new Date(m.updatedAt).toLocaleTimeString() : '---'}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        </React.Fragment>
                    );
                })}
            </MapContainer>

            <style>{`
                .label-tactica-custom { background: transparent !important; border: none !important; }
                
                /* Estilo mejorado para el Tooltip (Matrícula) */
                .custom-tooltip-radar {
                    background: rgba(0, 20, 30, 0.85) !important;
                    border: 1px solid #00d4ff !important;
                    border-radius: 3px !important;
                    padding: 2px 6px !important;
                    box-shadow: 0 0 10px rgba(0, 212, 255, 0.4) !important;
                }
                .custom-tooltip-radar::before { border-top-color: #00d4ff !important; }

                .leaflet-popup-content-wrapper { padding: 0 !important; background: #111 !important; border: 1px solid #00d4ff; border-radius: 4px; overflow: hidden; }
                .leaflet-popup-tip { background: #00d4ff; }
                .leaflet-control-layers { background: #1a1a1a !important; color: white !important; border: 1px solid #333 !important; }
                .leaflet-popup-content { margin: 0 !important; width: auto !important; }
            `}</style>
        </div>
    );
};

const styles = {
    mapWrapper: { width: '100%', height: 'calc(100vh - 60px)', position: 'relative', backgroundColor: '#050505', overflow: 'hidden' },
    header: { position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(10, 10, 10, 0.95)', color: '#00d4ff', padding: '12px 30px', border: '1px solid #00d4ff', textAlign: 'center', borderRadius: '4px', boxShadow: '0 0 20px rgba(0,0,0,0.8)' },
    subHeader: { fontSize: '0.65rem', color: '#bdc3c7', marginTop: '4px', borderTop: '1px solid #333', paddingTop: '4px', letterSpacing: '1px' },
    
    // Estilos internos del Tooltip
    tooltipContent: { display: 'flex', alignItems: 'center', gap: '5px', pointerEvents: 'none' },
    tooltipText: { color: '#00f2ff', fontWeight: 'bold', fontSize: '11px', fontFamily: 'monospace', textShadow: '0 0 5px rgba(0, 242, 255, 0.5)' },
    tooltipIcon: { fontSize: '10px' },

    popupContainer: { padding: '12px', minWidth: '240px', backgroundColor: '#111', color: '#fff', fontFamily: 'monospace' },
    popupHeader: { color: '#00d4ff', fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid #333', marginBottom: '10px', paddingBottom: '5px', letterSpacing: '1px' },
    popupBody: { display: 'flex', flexDirection: 'column', gap: '4px' },
    popupRow: { display: 'flex', justifyContent: 'space-between', fontSize: '11px' },
    popupLabel: { color: '#888', fontWeight: 'bold' },
    popupValue: { color: '#fff', textAlign: 'right' },
    popupNoteBox: { background: '#1a1a1a', padding: '8px', borderRadius: '4px', marginTop: '10px', borderLeft: '3px solid #00d4ff', fontSize: '10px', color: '#ccc' },
    popupLabelNote: { color: '#00d4ff', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' },
    popupFooter: { fontSize: '9px', marginTop: '12px', color: '#555', textAlign: 'right', borderTop: '1px solid #222', paddingTop: '5px' }
};

export default OperacionesMapa;