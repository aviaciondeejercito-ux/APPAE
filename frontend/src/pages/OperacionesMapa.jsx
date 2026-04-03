import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, LayersControl, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EventService from '../services/EventService'; 

const { BaseLayer } = LayersControl;

/** SIMBOLOGÍA TÁCTICA */
const crearIconoTactico = (tipo) => {
    const color = tipo === 'ala_fija' ? '#3498db' : '#e67e22';
    const svg = tipo === 'ala_fija' 
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
            const data = await EventService.getEvents();
            const role = localStorage.getItem('role');
            const userElemento = localStorage.getItem('elemento'); 
            
            const dataArray = Array.isArray(data) ? data : data.data || [];
            
            const activas = dataArray.filter(ev => {
                const isRealTime = ev.misionDetalle?.isRealTime === true || ev.isRealTime === true;
                const esOperativo = isRealTime && ev.etapa === 'operativo';
                
                if (['admin', 'BOSS', 'DIRECTOR', 'OTO'].includes(role)) {
                    return esOperativo;
                }
                return esOperativo && ev.elemento === userElemento;
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
                    const salidaPos = [m.ubicacion?.salida?.lat || -34.6, m.ubicacion?.salida?.lng || -58.4];
                    const llegadaPos = [m.ubicacion?.llegada?.lat || -34.6, m.ubicacion?.llegada?.lng || -58.4];
                    const actualPos = [m.ubicacion?.lat || salidaPos[0], m.ubicacion?.lng || salidaPos[1]];
                    
                    const isMoving = m.ubicacion?.lat !== m.ubicacion?.salida?.lat;

                    return (
                        <React.Fragment key={m._id}>
                            <Polyline 
                                positions={[salidaPos, llegadaPos]} 
                                pathOptions={{ color: '#f39c12', weight: 1, dashArray: '10, 10', opacity: 0.3 }} 
                            />
                            
                            <Marker position={actualPos} icon={crearIconoTactico(m.tipoIcono || 'ala_rotativa')}>
                                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                                    <span style={{color: isMoving ? '#3498db' : '#f39c12', fontWeight: 'bold'}}>
                                        {m.matricula} {isMoving ? '✈️' : ''}
                                    </span>
                                </Tooltip>
                                <Popup>
                                    <div style={{padding: '10px', minWidth: '220px', backgroundColor: '#1a1a1a', color: 'white'}}>
                                        <div style={{color: '#f39c12', fontWeight: 'bold', borderBottom: '1px solid #f39c12', marginBottom: '8px', paddingBottom: '4px'}}>{m.aeronave} | {m.matricula}</div>
                                        <div style={styles.popupRow}><strong style={{color: '#bdc3c7'}}>ESTADO:</strong> {isMoving ? "EN TRAYECTO" : "EN POSICIÓN"}</div>
                                        <div style={styles.popupRow}><strong style={{color: '#bdc3c7'}}>OPERACIÓN:</strong> {m.title}</div>
                                        <div style={styles.popupRow}><strong style={{color: '#bdc3c7'}}>UNIDAD:</strong> {m.elemento}</div>
                                        <div style={styles.popupRow}><strong style={{color: '#bdc3c7'}}>RUTA:</strong> {m.ubicacion?.salida?.nombre} ➔ {m.ubicacion?.llegada?.nombre}</div>
                                        <div style={styles.popupNoteBox}><strong style={{color: '#f39c12', fontSize: '9px'}}>NOTAS MARGINALES:</strong><br/>{m.notasMarginales || "SIN NOVEDAD"}</div>
                                        <div style={{fontSize: '9px', marginTop: '10px', color: '#27ae60', textAlign: 'right', borderTop: '1px solid #333', paddingTop: '4px'}}>ACTUALIZADO: {m.updatedAt ? new Date(m.updatedAt).toLocaleTimeString() : 'N/A'}</div>
                                    </div>
                                </Popup>
                            </Marker>
                        </React.Fragment>
                    );
                })}
            </MapContainer>

            <style>{`
                .label-tactica-custom { background: transparent !important; border: none !important; }
                .leaflet-popup-content-wrapper { padding: 0 !important; background: #1a1a1a !important; color: white !important; border: 1px solid #f39c12; border-radius: 4px; overflow: hidden; }
                .leaflet-popup-tip { background: #f39c12; }
                .leaflet-control-layers { background: #1a1a1a !important; color: white !important; border: 1px solid #333 !important; font-family: monospace; }
                .leaflet-popup-content { margin: 0 !important; width: auto !important; }
            `}</style>
        </div>
    );
};

const styles = {
    mapWrapper: { width: '100%', height: 'calc(100vh - 60px)', position: 'relative', backgroundColor: '#050505', overflow: 'hidden' },
    header: { position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(10, 10, 10, 0.95)', color: '#f39c12', padding: '12px 30px', border: '1px solid #f39c12', textAlign: 'center', borderRadius: '4px', boxShadow: '0 0 20px rgba(0,0,0,0.8)' },
    subHeader: { fontSize: '0.65rem', color: '#bdc3c7', marginTop: '4px', borderTop: '1px solid #333', paddingTop: '4px', letterSpacing: '1px' },
    popupRow: { fontSize: '11px', marginBottom: '5px' },
    popupNoteBox: { fontSize: '10px', color: '#ecf0f1', background: '#222', padding: '10px', borderRadius: '4px', marginTop: '8px', whiteSpace: 'pre-wrap', borderLeft: '3px solid #f39c12' }
};

export default OperacionesMapa;