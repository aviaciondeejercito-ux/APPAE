import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-terminator'; 
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import { getActiveOperations, getWeatherData, EventService } from '../services/api';
import NightEvolutionWidget from '../components/NightEvolutionWidget';

const { BaseLayer, Overlay } = LayersControl;

// Configuración de Socket.io (URL de producción o local según corresponda)
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

/** * SIMBOLOGÍA TÁCTICA AE - ESTÁNDAR DE SEGURIDAD SINCRO JOKER */
const crearIconoTactico = (tipo) => {
    // Azul para ala fija, Naranja para ala rotativa (estándar operativo)
    const color = tipo === 'ala_fija' ? '#3498db' : '#e67e22';
    
    const svg = tipo === 'ala_fija' 
        ? `<polygon points="50,15 90,85 50,70 10,85" fill="${color}" stroke="white" stroke-width="5"/>`
        : `<circle cx="50" cy="50" r="35" fill="${color}" stroke="white" stroke-width="5"/><line x1="10" y1="50" x2="90" y2="50" stroke="white" stroke-width="8"/><line x1="50" y1="10" x2="50" y2="90" stroke="white" stroke-width="8"/>`;

    return L.divIcon({
        className: 'custom-tactic-icon',
        html: `<svg width="30" height="30" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    });
};

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
            const weatherResponse = await getWeatherData(icao);
            if (weatherResponse.data && weatherResponse.data.astronomy) {
                setAstronomyData(weatherResponse.data.astronomy);
                setWeatherData({
                    metar: weatherResponse.data.raw,
                    taf: weatherResponse.data.taf
                });
            } else {
                const astroResponse = await EventService.getAstronomyData();
                setWeatherData({
                    metar: weatherResponse.data?.raw || weatherResponse.raw || "SIN DATOS",
                    taf: weatherResponse.data?.taf || weatherResponse.taf || null
                });
                if (astroResponse && astroResponse.success) {
                    setAstronomyData(astroResponse.data || astroResponse);
                }
            }
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

    const cargarSituacionTactica = useCallback(async () => {
        try {
            const data = await getActiveOperations();
            if (data && Array.isArray(data)) {
                const procesadas = data.map(m => ({
                    ...m,
                    ubicacion: {
                        ...m.ubicacion,
                        lat: parseFloat(m.ubicacion?.lat),
                        lng: parseFloat(m.ubicacion?.lng)
                    }
                })).filter(m => !isNaN(m.ubicacion.lat) && !isNaN(m.ubicacion.lng));
                setMisiones(procesadas);
            }
        } catch (err) { 
            console.error("❌ Error en Sincronización Táctica:", err); 
        } finally { 
            setLoading(false); 
        }
    }, []);

    useEffect(() => {
        cargarSituacionTactica();

        // 📡 CANAL DE TIEMPO REAL - SINCRO JOKER
        socket.on('operationUpdated', (newOp) => {
            setMisiones(prev => {
                const index = prev.findIndex(m => m._id === newOp._id);
                const processedOp = {
                    ...newOp,
                    ubicacion: {
                        ...newOp.ubicacion,
                        lat: parseFloat(newOp.ubicacion?.lat),
                        lng: parseFloat(newOp.ubicacion?.lng)
                    }
                };
                if (index !== -1) {
                    const updated = [...prev];
                    updated[index] = processedOp;
                    return updated;
                }
                return [...prev, processedOp];
            });
        });

        const intervalTerminator = setInterval(() => setTerminatorTime(new Date()), 60000);
        
        return () => {
            socket.off('operationUpdated');
            clearInterval(intervalTerminator);
        };
    }, [cargarSituacionTactica]);

    const getTacticIcon = (m) => {
        if (m.tipoIcono) return crearIconoTactico(m.tipoIcono);
        const sda = (m.aeronave || "").toUpperCase();
        const alaFijaModelos = ['C-212', 'C-208', 'DA-62', 'B-200', 'C-550', 'T-202', 'CESSNA', 'DIAMOND', 'BEECH', 'LEARJET'];
        const esAlaFija = alaFijaModelos.some(tipo => sda.includes(tipo));
        return esAlaFija ? crearIconoTactico('ala_fija') : crearIconoTactico('ala_rotativa');
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
                </LayersControl>

                {misiones.map((m) => (
                    <Marker 
                        key={m._id} 
                        position={[m.ubicacion.lat, m.ubicacion.lng]} 
                        icon={getTacticIcon(m)}
                    >
                        <Tooltip permanent direction="top" offset={[0, -10]} className="label-tactica-custom">
                            <div style={styles.labelBoxDark}>
                                {(m.matricula || m.aeronave || 'S/M').toUpperCase()}
                            </div>
                        </Tooltip>
                        <Popup>
                            <div style={styles.popupHeader}>{m.title.toUpperCase()}</div>
                            <div style={styles.popupBody}>
                                <p><strong>UNIDAD:</strong> {m.elemento.toUpperCase()}</p>
                                <p><strong>AERONAVE:</strong> {m.aeronave.toUpperCase()} ({m.matricula.toUpperCase()})</p>
                                <p><strong>POSICIÓN:</strong> {m.ubicacion.nombre.toUpperCase()}</p>
                                <p><strong>ESTADO:</strong> {m.status?.toUpperCase().replace('_', ' ') || 'EN CURSO'}</p>
                                <hr style={{borderColor: '#333'}} />
                                <div style={styles.popNotesContainer}>
                                    <strong style={{fontSize: '0.65rem', color: '#f39c12'}}>INFORMACIÓN MARGINAL:</strong>
                                    <p style={styles.popNotesText}>
                                        {m.notasMarginales ? m.notasMarginales.toUpperCase() : 'SIN NOVEDAD'}
                                    </p>
                                </div>
                                <div style={styles.popFooter}>
                                    ACTUALIZADO: {new Date(m.updatedAt).toLocaleTimeString()}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <style>{`
                .label-tactica-custom { background: transparent !important; border: none !important; box-shadow: none !important; }
                .radar-loader { width: 50px; height: 50px; border: 3px solid #f39c12; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .leaflet-popup-content-wrapper { padding: 0; background: #1a1a1a; color: white; border: 1px solid #f39c12; border-radius: 4px; overflow: hidden; }
                .leaflet-popup-content { margin: 0; width: 220px !important; }
                .leaflet-control-layers { background: #1a1a1a !important; color: white !important; border: 1px solid #333 !important; font-family: monospace; }
            `}</style>
        </div>
    );
};

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
    popupBody: { padding: '12px', fontSize: '0.8rem', background: '#1a1a1a', borderTop: '1px solid #333' },
    popNotesContainer: { marginTop: '5px', padding: '8px', backgroundColor: '#000', borderRadius: '4px', borderLeft: '2px solid #f39c12' },
    popNotesText: { fontSize: '0.7rem', color: '#ecf0f1', whiteSpace: 'pre-wrap', margin: '5px 0 0 0', fontFamily: 'monospace' },
    popFooter: { marginTop: '10px', fontSize: '0.6rem', color: '#7f8c8d', textAlign: 'right' }
};

export default OperacionesMapa;