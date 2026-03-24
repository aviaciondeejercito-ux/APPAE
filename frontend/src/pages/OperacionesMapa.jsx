import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-terminator'; 
import 'leaflet/dist/leaflet.css';
import { getActiveOperations, getWeatherData, EventService } from '../services/api';
import NightEvolutionWidget from '../components/NightEvolutionWidget';

const { BaseLayer, Overlay } = LayersControl;

/** * SIMBOLOGÍA TÁCTICA AE - ESTÁNDAR DE SEGURIDAD */
const planeIcon = L.divIcon({
    className: 'tactic-icon-plane',
    html: `<svg width="26" height="26" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 10 L90 85 L10 85 Z" fill="#0044ff" stroke="#ffffff" stroke-width="6"/>
           </svg>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
});

const heloIcon = L.divIcon({
    className: 'tactic-icon-helo',
    html: `<svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <line x1="10" y1="50" x2="90" y2="50" stroke="#0044ff" stroke-width="15" stroke-linecap="square"/>
            <line x1="50" y1="10" x2="50" y2="90" stroke="#0044ff" stroke-width="15" stroke-linecap="square"/>
            <line x1="10" y1="50" x2="90" y2="50" stroke="#ffffff" stroke-width="4" stroke-linecap="square"/>
            <line x1="50" y1="10" x2="50" y2="90" stroke="#ffffff" stroke-width="4" stroke-linecap="square"/>
           </svg>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
});

const AERODROMOS_LIST = [
    "SAZR", "SAHZ", "SAZS", "SAVC", "SAZB", "SACO", "SAZA", "SAZF", "SADP", "SAAR", 
    "SAME", "SACA", "SARE", "SAAP", "SANT", "SAWU", "SAST", "SARF", "SAZN", "SAAV", 
    "SAOC", "SANE", "SACE", "SADO", "SABE", "SAVM", "SAWD", "SAVE", "SAVT", "SATM", 
    "SARP", "SAWG", "SADF", "SAZM", "SAWE", "SAZY", "SASA", "SANU", "SATU", "SAEM", 
    "SARS", "SRDR", "SAAI", "SATR", "SASJ", "SAWL"
];

const TerminatorLayer = ({ time, moonFraction }) => {
    const map = useMap();
    useEffect(() => {
        if (typeof L.terminator === 'function') {
            // Lógica de opacidad dinámica: A más luna (1.0), menos opacidad de sombra (0.3 min)
            // A menos luna (0.0), más opacidad de sombra (0.7 max)
            const dynamicOpacity = 0.7 - (moonFraction * 0.4);

            const tLayer = L.terminator({
                time: time,
                fillColor: '#000',
                fillOpacity: dynamicOpacity,
                color: '#2c3e50',
                weight: 1
            });
            tLayer.addTo(map);
            return () => {
                if (map.hasLayer(tLayer)) {
                    map.removeLayer(tLayer);
                }
            };
        }
    }, [map, time, moonFraction]);
    return null;
};

const MetarWidget = ({ selectedStation, setSelectedStation, astronomyData, setAstronomyData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [weatherData, setWeatherData] = useState({ metar: null, taf: null });
    const [loading, setLoading] = useState(false);

    const fetchWeatherData = async (icao) => {
        if (!icao) return;
        setLoading(true);
        try {
            const [weatherResponse, astroResponse] = await Promise.all([
                getWeatherData(icao),
                EventService.getAstronomyData()
            ]);
            setWeatherData({
                metar: weatherResponse.data.raw,
                taf: weatherResponse.data.taf
            });
            if (astroResponse.success) setAstronomyData(astroResponse.data);
        } catch (err) {
            console.error("❌ Error en Red AE:", err);
            setWeatherData({ metar: "ERROR DE CONEXIÓN", taf: null });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeatherData(selectedStation);
    }, [selectedStation]);

    const filteredStations = AERODROMOS_LIST.filter(s => 
        s.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                <div style={{color: '#f39c12', fontSize: '11px', textAlign: 'center', padding: '10px'}}>
                    📡 SOLICITANDO DATOS OACI...
                </div>
            ) : (
                <div style={styles.weatherResults}>
                    <div style={{color: '#00ffff', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #333'}}>{selectedStation}</div>
                    <div style={styles.metarSection}>
                        <span style={styles.metarLabel}>METAR (REAL-TIME):</span>
                        <div style={styles.metarRaw}>{weatherData.metar || "No disponible"}</div>
                    </div>
                    <div style={styles.metarSection}>
                        <span style={{...styles.metarLabel, color: '#3498db'}}>TAF (PRONÓSTICO):</span>
                        <div style={{...styles.metarRaw, borderColor: '#3498db', fontSize: '10px'}}>
                            {weatherData.taf || "No disponible"}
                        </div>
                    </div>
                    <NightEvolutionWidget astronomyData={astronomyData} />
                </div>
            )}
        </div>
    );
};

const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showMetar, setShowMetar] = useState(false);
    const [selectedStation, setSelectedStation] = useState('SADP');
    const [astronomyData, setAstronomyData] = useState(null);
    const [terminatorTime, setTerminatorTime] = useState(new Date());
    const [mapView] = useState({ center: [-34.528, -58.641], zoom: 5 });

    const cargarSituacionTactica = async () => {
        try {
            const data = await getActiveOperations();
            if (data && Array.isArray(data)) setMisiones(data);
        } catch (err) { 
            console.error("❌ Error en Sincronización Táctica:", err); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => {
        cargarSituacionTactica();
        const intervalMisiones = setInterval(cargarSituacionTactica, 15000);
        const intervalTerminator = setInterval(() => setTerminatorTime(new Date()), 60000);
        return () => {
            clearInterval(intervalMisiones);
            clearInterval(intervalTerminator);
        };
    }, []);

    const getTacticIcon = (m) => {
        if (m.tipoIcono === 'ala_fija') return planeIcon;
        if (m.tipoIcono === 'ala_rotativa') return heloIcon;
        const sda = m.aeronave?.toUpperCase() || "";
        return (sda.includes('C-212') || sda.includes('C-208') || sda.includes('DA-62') || sda.includes('B-200')) ? planeIcon : heloIcon;
    };

    if (loading) return (
        <div style={styles.loadingScreen}>
            <div className="radar-loader"></div>
            <p style={{marginTop: '20px'}}>📡 ACCEDIENDO A RED TÁCTICA...</p>
        </div>
    );

    return (
        <div style={styles.mapWrapper}>
            <div style={{
                ...styles.metarContainer,
                transform: showMetar ? 'translateX(0)' : 'translateX(-302px)' 
            }}>
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
                <div style={styles.subHeader}>AVIACIÓN DE EJÉRCITO ARGENTINO</div>
            </div>

            <MapContainer 
                center={mapView.center} zoom={mapView.zoom} 
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
                    <BaseLayer name="🛰️ Satelital">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                    </BaseLayer>
                    
                    <Overlay checked name="🌘 Sombra Nocturna">
                        <TerminatorLayer 
                            time={terminatorTime} 
                            moonFraction={astronomyData?.moon_fraction || 0} 
                        />
                    </Overlay>

                    <Overlay checked name="👁️ Visibilidad (VFR/IFR)">
                        <LayerGroup /> 
                    </Overlay>
                </LayersControl>

                {misiones.map((m) => (
                    m.ubicacion?.lat !== undefined && m.ubicacion?.lng !== undefined && (
                        <Marker key={m._id} position={[m.ubicacion.lat, m.ubicacion.lng]} icon={getTacticIcon(m)}>
                            <Tooltip permanent direction="top" offset={[0, -10]} className="label-tactica-custom">
                                <div style={styles.labelBoxDark}>{m.aeronave} {m.matricula}</div>
                            </Tooltip>
                            <Popup>
                                <div style={styles.popupHeader}>{m.title}</div>
                                <div style={styles.popupBody}>
                                    <p><strong>UNIDAD:</strong> {m.elemento}</p>
                                    <p><strong>POSICIÓN:</strong> {m.ubicacion.nombre}</p>
                                    <p><strong>ESTADO:</strong> {m.status?.toUpperCase().replace('_', ' ') || 'EN CURSO'}</p>
                                    <hr style={{borderColor: '#333'}} />
                                    <p style={{fontSize: '0.7rem', color: '#f39c12'}}>{m.notasMarginales}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>

            <style>{`
                .label-tactica-custom { background: transparent !important; border: none !important; box-shadow: none !important; }
                .radar-loader { width: 50px; height: 50px; border: 3px solid #f39c12; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .leaflet-popup-content-wrapper { padding: 0; background: #1a1a1a; color: white; border: 1px solid #f39c12; border-radius: 4px; overflow: hidden; }
                .leaflet-popup-content { margin: 0; width: 220px !important; }
                .leaflet-control-layers { background: #1a1a1a !important; color: white !important; border: 1px solid #333 !important; font-family: monospace; }
                .leaflet-popup-tip { background: #f39c12; }
            `}</style>
        </div>
    );
};

const LayerGroup = () => null;

const styles = {
    mapWrapper: { width: '100%', height: 'calc(100vh - 60px)', position: 'relative', backgroundColor: '#050505', overflow: 'hidden' },
    metarContainer: { position: 'absolute', top: '80px', left: '0', zIndex: 2000, display: 'flex', alignItems: 'flex-start', transition: 'transform 0.4s ease' },
    metarContent: { background: 'rgba(10, 10, 10, 0.95)', border: '1px solid #f39c12', borderLeft: 'none', borderRadius: '0 4px 4px 0', padding: '12px', width: '300px', maxHeight: '80vh', overflowY: 'auto' },
    metarBox: { fontFamily: 'monospace' },
    metarHeader: { color: '#f39c12', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' },
    metarSearch: { width: '100%', background: '#222', border: '1px solid #444', color: 'white', padding: '6px', fontSize: '12px', marginBottom: '10px', borderRadius: '4px', outline: 'none' },
    stationList: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', maxHeight: '120px', overflowY: 'auto', marginBottom: '10px', paddingRight: '5px' },
    stationBtn: { border: 'none', padding: '4px 2px', fontSize: '10px', cursor: 'pointer', borderRadius: '2px', fontWeight: 'bold' },
    weatherResults: { textAlign: 'left' },
    metarSection: { marginBottom: '12px' },
    metarLabel: { color: '#f39c12', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '3px' },
    metarRaw: { color: '#ecf0f1', fontSize: '11px', lineHeight: '1.3', background: '#111', padding: '6px', borderRadius: '4px', border: '1px solid #333', whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
    toggleBtn: { background: '#f39c12', border: 'none', color: 'black', padding: '15px 10px', cursor: 'pointer', borderRadius: '0 4px 4px 0', fontWeight: 'bold' },
    loadingScreen: { backgroundColor: '#050505', color: '#f39c12', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' },
    header: { position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(10, 10, 10, 0.9)', color: '#f39c12', padding: '10px 25px', border: '1px solid #f39c12', textAlign: 'center', borderRadius: '4px' },
    subHeader: { fontSize: '0.65rem', color: '#bdc3c7', marginTop: '4px', borderTop: '1px solid #444', paddingTop: '4px' },
    labelBoxDark: { background: 'rgba(0, 15, 30, 0.9)', color: '#00ffff', border: '1px solid #00ffff', padding: '2px 8px', borderRadius: '2px', fontSize: '0.8rem', fontWeight: 'bold', fontFamily: 'monospace' },
    popupHeader: { background: '#f39c12', color: 'black', padding: '8px', fontWeight: 'bold', textAlign: 'center', fontSize: '0.85rem' },
    popupBody: { padding: '12px', fontSize: '0.8rem', background: '#1a1a1a', borderTop: '1px solid #333' }
};

export default OperacionesMapa;