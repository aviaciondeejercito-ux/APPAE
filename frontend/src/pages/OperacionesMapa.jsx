import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getWeatherData, getEvents } from '../services/api';

const { BaseLayer } = LayersControl;

/** WIDGET DE EVOLUCIÓN NOCTURNA */
const NightEvolutionWidget = ({ astronomyData }) => {
    if (!astronomyData) return null;

    const moonrise = astronomyData.moonrise || "--:--";
    const moonset = astronomyData.moonset || "--:--";
    const phase = astronomyData.moon_phase || "S/D";
    const illumination = astronomyData.moon_illumination || "0";

    const calculateCulmination = (rise, set) => {
        if (rise === "--:--" || set === "--:--") return "S/D";
        try {
            const parseTime = (t) => {
                const [time, modifier] = t.split(' ');
                let [hours, minutes] = time.split(':');
                if (hours === '12') hours = '00';
                if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
                return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
            };
            const rMin = parseTime(rise);
            let sMin = parseTime(set);
            if (sMin < rMin) sMin += 1440; 
            const midMin = rMin + (sMin - rMin) / 2;
            const h = Math.floor((midMin % 1440) / 60);
            const m = Math.floor(midMin % 60);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} HS`;
        } catch (e) { return "S/D"; }
    };

    const culmination = calculateCulmination(moonrise, moonset);

    return (
        <div style={styles.nightWidget}>
            <div style={styles.nightTitle}>PLANIFICACIÓN LUNAR</div>
            <div style={styles.moonPhaseRow}>
                <span>Fase: {phase}</span>
                <span style={{color: '#f1c40f'}}>{illumination}% Ilum.</span>
            </div>
            <div style={styles.arcContainer}>
                <div style={styles.moonArc}></div>
                <div style={{...styles.arcPoint, left: '0%', bottom: '-5px'}}>
                    <div style={styles.pointLabel}>SALIDA</div>
                    <div style={styles.pointTime}>{moonrise}</div>
                </div>
                <div style={{...styles.arcPoint, left: '50%', top: '-15px', transform: 'translateX(-50%)'}}>
                    <div style={{...styles.pointLabel, color: '#f39c12'}}>CÚSPIDE</div>
                    <div style={styles.pointTime}>{culmination}</div>
                </div>
                <div style={{...styles.arcPoint, right: '0%', bottom: '-5px'}}>
                    <div style={styles.pointLabel}>OCASO</div>
                    <div style={styles.pointTime}>{moonset}</div>
                </div>
            </div>
        </div>
    );
};

/** SIMBOLOGÍA TÁCTICA REAL */
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

const AERODROMOS_LIST = ["SADP", "SADO", "SABE", "SADF", "SACO", "SASA", "SAMR", "SAME", "SARP", "SAWG", "SAVC", "SAOR", "SAZY", "SAZR", "SAHZ", "SAZS", "SAZB", "SAZA", "SAZF", "SAAP", "SANT", "SARF", "SAAV", "SANE", "SANU"];

const MetarWidget = ({ selectedStation, setSelectedStation, astronomyData, setAstronomyData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [weatherData, setWeatherData] = useState({ metar: null, taf: null });
    const [loading, setLoading] = useState(false);

    const fetchWeatherData = async (icao) => {
        if (!icao) return;
        setLoading(true);
        try {
            const response = await getWeatherData(icao);
            if (response.data) {
                setAstronomyData(response.data.astronomy || null);
                setWeatherData({
                    metar: response.data.raw || "SIN DATOS",
                    taf: response.data.taf || "NO DISPONIBLE"
                });
            }
        } catch (err) {
            setWeatherData({ metar: "ERROR DE CONEXIÓN", taf: null });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeatherData(selectedStation);
    }, [selectedStation]);

    const filteredStations = AERODROMOS_LIST.filter(s => s.includes(searchTerm.toUpperCase()));

    return (
        <div style={styles.metarBox}>
            <div style={styles.metarHeader}>SISTEMA METEOROLÓGICO C2AE</div>
            <input 
                type="text" 
                placeholder="Buscar OACI..." 
                style={styles.metarSearch}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            />
            <div style={styles.stationList}>
                {filteredStations.map(icao => (
                    <button 
                        key={icao} 
                        onClick={() => setSelectedStation(icao)}
                        style={{
                            ...styles.stationBtn,
                            backgroundColor: selectedStation === icao ? '#f39c12' : '#222',
                            color: selectedStation === icao ? 'black' : '#ccc'
                        }}
                    >
                        {icao}
                    </button>
                ))}
            </div>
            <hr style={{borderColor: '#333', margin: '10px 0'}} />
            {loading ? (
                <div style={{color: '#f39c12', fontSize: '11px', textAlign: 'center', padding: '10px'}}>📡 SOLICITANDO DATOS OACI...</div>
            ) : (
                <div style={styles.weatherResults}>
                    <div style={{color: '#00ffff', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #333'}}>{selectedStation}</div>
                    <div style={styles.metarSection}>
                        <span style={styles.metarLabel}>METAR (REAL-TIME):</span>
                        <div style={styles.metarRaw}>{weatherData.metar}</div>
                    </div>
                    <div style={styles.metarSection}>
                        <span style={{...styles.metarLabel, color: '#3498db'}}>TAF (PRONÓSTICO):</span>
                        <div style={{...styles.metarRaw, borderColor: '#3498db', fontSize: '10px'}}>{weatherData.taf}</div>
                    </div>
                    <NightEvolutionWidget astronomyData={astronomyData} />
                </div>
            )}
        </div>
    );
};

const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]);
    const [showMetar, setShowMetar] = useState(false);
    const [selectedStation, setSelectedStation] = useState('SADP');
    const [astronomyData, setAstronomyData] = useState(null);

    const fetchMisiones = async () => {
        try {
            const data = await getEvents();
            // Solo proyectamos lo marcado como operativo y tiempo real en CargaTactica
            const activas = data.filter(ev => ev.etapa === 'operativo' && ev.isRealTime === true);
            setMisiones(activas);
        } catch (error) {
            console.error("Error en radar:", error);
        }
    };

    useEffect(() => {
        fetchMisiones();
        const timer = setInterval(fetchMisiones, 10000); // Refresco cada 10 seg
        return () => clearInterval(timer);
    }, []);

    return (
        <div style={styles.mapWrapper}>
            <div style={{ ...styles.metarContainer, transform: showMetar ? 'translateX(0)' : 'translateX(-302px)' }}>
                <div style={styles.metarContent}>
                    <MetarWidget 
                        selectedStation={selectedStation} 
                        setSelectedStation={setSelectedStation} 
                        astronomyData={astronomyData}
                        setAstronomyData={setAstronomyData}
                    />
                </div>
                <button onClick={() => setShowMetar(!showMetar)} style={styles.toggleBtn}>
                    {showMetar ? '◀' : '☁️'}
                </button>
            </div>

            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '3px' }}>MONITOR DE OPERACIONES</div>
                <div style={styles.subHeader}>AVIACIÓN DE EJÉRCITO ARGENTINO - LIVE RADAR</div>
            </div>

            <MapContainer 
                center={[-34.528, -58.641]} zoom={5} 
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                zoomControl={false}
            >
                <LayersControl position="topright">
                    <BaseLayer checked name="🌑 Modo Oscuro">
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    </BaseLayer>
                    <BaseLayer name="🗺️ Político">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </BaseLayer>
                </LayersControl>

                {misiones.map((m) => (
                    <Marker 
                        key={m._id} 
                        position={[m.ubicacion.lat, m.ubicacion.lng]} 
                        icon={crearIconoTactico(m.tipoIcono || 'ala_rotativa')}
                    >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                            <span style={{color: '#f39c12', fontWeight: 'bold'}}>{m.matricula}</span>
                        </Tooltip>
                        <Popup>
                            <div style={{padding: '10px', minWidth: '180px'}}>
                                <div style={{color: '#f39c12', fontWeight: 'bold', borderBottom: '1px solid #444', marginBottom: '5px'}}>
                                    {m.aeronave} - {m.matricula}
                                </div>
                                <div style={{fontSize: '11px', color: '#fff', marginBottom: '5px'}}><strong>MISIÓN:</strong> {m.title}</div>
                                <div style={{fontSize: '10px', color: '#bdc3c7', whiteSpace: 'pre-wrap'}}>
                                    <strong>A BORDO:</strong><br/>{m.notasMarginales}
                                </div>
                                <div style={{fontSize: '9px', marginTop: '8px', color: '#27ae60', textAlign: 'right'}}>
                                    ACTUALIZADO: {new Date(m.updatedAt).toLocaleTimeString()}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <style>{`
                .label-tactica-custom { background: transparent !important; border: none !important; box-shadow: none !important; }
                .leaflet-popup-content-wrapper { padding: 0; background: #1a1a1a; color: white; border: 1px solid #f39c12; border-radius: 4px; overflow: hidden; }
                .leaflet-popup-tip { background: #f39c12; }
                .leaflet-control-layers { background: #1a1a1a !important; color: white !important; border: 1px solid #333 !important; font-family: monospace; }
            `}</style>
        </div>
    );
};

const styles = {
    mapWrapper: { width: '100%', height: 'calc(100vh - 60px)', position: 'relative', backgroundColor: '#050505', overflow: 'hidden' },
    metarContainer: { position: 'absolute', top: '80px', left: '0', zIndex: 2000, display: 'flex', alignItems: 'flex-start', transition: 'transform 0.4s ease' },
    metarContent: { background: 'rgba(10, 10, 10, 0.95)', border: '1px solid #f39c12', borderLeft: 'none', borderRadius: '0 4px 4px 0', padding: '12px', width: '300px', maxHeight: '85vh', overflowY: 'auto' },
    metarBox: { fontFamily: 'monospace' },
    metarHeader: { color: '#f39c12', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' },
    metarSearch: { width: '100%', background: '#222', border: '1px solid #444', color: 'white', padding: '6px', fontSize: '12px', marginBottom: '10px', borderRadius: '4px', outline: 'none' },
    stationList: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', maxHeight: '100px', overflowY: 'auto', marginBottom: '10px' },
    stationBtn: { border: 'none', padding: '4px 2px', fontSize: '10px', cursor: 'pointer', borderRadius: '2px', fontWeight: 'bold' },
    weatherResults: { textAlign: 'left' },
    metarSection: { marginBottom: '12px' },
    metarLabel: { color: '#f39c12', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '3px' },
    metarRaw: { color: '#ecf0f1', fontSize: '11px', lineHeight: '1.3', background: '#111', padding: '6px', borderRadius: '4px', border: '1px solid #333', whiteSpace: 'pre-wrap' },
    toggleBtn: { background: '#f39c12', border: 'none', color: 'black', padding: '15px 10px', cursor: 'pointer', borderRadius: '0 4px 4px 0', fontWeight: 'bold' },
    header: { position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(10, 10, 10, 0.9)', color: '#f39c12', padding: '10px 25px', border: '1px solid #f39c12', textAlign: 'center', borderRadius: '4px' },
    subHeader: { fontSize: '0.65rem', color: '#bdc3c7', marginTop: '4px', borderTop: '1px solid #444', paddingTop: '4px' },
    nightWidget: { marginTop: '15px', padding: '10px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '4px' },
    nightTitle: { color: '#f39c12', fontSize: '10px', fontWeight: 'bold', textAlign: 'center', marginBottom: '8px' },
    moonPhaseRow: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#ccc', marginBottom: '15px' },
    arcContainer: { position: 'relative', height: '40px', borderBottom: '1px dashed #444', marginBottom: '20px', marginTop: '10px' },
    moonArc: { position: 'absolute', top: '0', left: '10%', right: '10%', bottom: '-1px', border: '1.5px solid #444', borderBottom: 'none', borderRadius: '50% 50% 0 0' },
    arcPoint: { position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    pointLabel: { fontSize: '8px', color: '#7f8c8d', fontWeight: 'bold' },
    pointTime: { fontSize: '10px', color: '#fff', fontWeight: 'bold' }
};

export default OperacionesMapa;