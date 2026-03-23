import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EventService from '../services/EventService';
import { getWeatherData } from '../services/api';

// --- CONFIGURACIÓN DE SIMBOLOGÍA TÁCTICA ---
const planeIcon = L.divIcon({
    className: 'tactic-icon-plane',
    html: `<svg width="30" height="30" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 5 L90 85 L50 70 L10 85 Z" fill="#0044ff" stroke="#ffffff" stroke-width="4"/>
            <path d="M20 50 L80 50" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
           </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

const heloIcon = L.divIcon({
    className: 'tactic-icon-helo',
    html: `<svg width="30" height="30" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="30" fill="#0044ff" stroke="#ffffff" stroke-width="4"/>
            <path d="M10 50 L90 50 M50 10 L50 90" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
            <circle cx="50" cy="50" r="5" fill="#ffffff"/>
           </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

// --- COMPONENTE INTERNO: PANEL DE CONTROL METEOROLÓGICO ---
const MeteorologiaPanelInterno = ({ capasMet, setCapasMet, mapBase, setMapBase }) => {
    const [datos, setDatos] = useState([]);
    const [filtro, setFiltro] = useState('');
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);

    const fetchMeteorologia = async () => {
        setLoading(true);
        try {
            const response = await getWeatherData();
            const data = response?.data || response;
            if (Array.isArray(data)) {
                setDatos([...data].sort((a, b) => a.icaoId.localeCompare(b.icaoId)));
                setLastUpdate(new Date().toLocaleTimeString());
            }
        } catch (err) {
            console.error("❌ Error OPMET:", err);
        } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchMeteorologia();
        const interval = setInterval(fetchMeteorologia, 900000);
        return () => clearInterval(interval);
    }, []);

    const toggleCapa = (capa) => setCapasMet(prev => ({ ...prev, [capa]: !prev[capa] }));

    const getFlightCategoryColor = (cat) => {
        const colors = { 'VFR': '#2ecc71', 'MVFR': '#3498db', 'IFR': '#e74c3c', 'LIFR': '#9b59b6' };
        return colors[cat] || '#7f8c8d';
    };

    const datosFiltrados = datos.filter(d => 
        d.icaoId?.includes(filtro.toUpperCase()) || d.name?.toUpperCase().includes(filtro.toUpperCase())
    );

    return (
        <div style={{...panelStyles.container, left: visible ? '0' : '-380px'}}>
            <button onClick={() => setVisible(!visible)} style={panelStyles.tab}>
                <div style={panelStyles.tabIcon}>{visible ? '◀' : '🌤️'}</div>
                <div style={panelStyles.tabText}>{visible ? '' : 'MET'}</div>
            </button>
            
            <div style={panelStyles.content}>
                <div style={panelStyles.headerContainer}>
                    <h3 style={panelStyles.title}>CONTROL TÁCTICO MET</h3>
                    {loading ? <span className="loader-mini"></span> : <span style={panelStyles.updateTime}>{lastUpdate}</span>}
                </div>

                <div style={panelStyles.section}>
                    <span style={panelStyles.sectionTitle}>MAPA BASE</span>
                    <div style={panelStyles.baseMapContainer}>
                        <button onClick={() => setMapBase('topo')} style={{...panelStyles.btnBase, backgroundColor: mapBase === 'topo' ? '#f39c12' : '#222'}}>FÍSICO</button>
                        <button onClick={() => setMapBase('sat')} style={{...panelStyles.btnBase, backgroundColor: mapBase === 'sat' ? '#f39c12' : '#222'}}>SATELITAL</button>
                    </div>
                </div>

                <div style={panelStyles.section}>
                    <span style={panelStyles.sectionTitle}>CAPAS DINÁMICAS</span>
                    <div style={panelStyles.layersContainer}>
                        {Object.keys(capasMet).map(capa => (
                            <div key={capa} style={panelStyles.layerRow} onClick={() => toggleCapa(capa)}>
                                <span style={{textTransform: 'uppercase', fontSize: '0.65rem'}}>{capa}</span>
                                <div style={{...panelStyles.switch, backgroundColor: capasMet[capa] ? '#f39c12' : '#444'}}>
                                    <div style={{...panelStyles.switchKnob, left: capasMet[capa] ? '18px' : '2px'}} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={panelStyles.searchBox}>
                    <input type="text" placeholder="BUSCAR OACI..." value={filtro} onChange={(e) => setFiltro(e.target.value)} style={panelStyles.searchInput}/>
                </div>

                <div className="meteorologia-scroll" style={panelStyles.scrollArea}>
                    {datosFiltrados.map(d => (
                        <div key={d.icaoId} style={panelStyles.card}>
                            <div style={panelStyles.cardHeader}>
                                <strong style={{color: '#f39c12'}}>{d.icaoId}</strong>
                                <div style={{...panelStyles.catBadge, backgroundColor: getFlightCategoryColor(d.fltCat)}}>{d.fltCat || 'N/A'}</div>
                            </div>
                            <div style={panelStyles.detailsGrid}>
                                <div><span style={{color: '#555'}}>T:</span> {d.temp || '--'}°</div>
                                <div><span style={{color: '#555'}}>W:</span> {d.wspd || '0'}kt</div>
                                <div><span style={{color: '#555'}}>V:</span> {d.visib || '-'}</div>
                            </div>
                            <div style={panelStyles.metarText}>{d.rawOb}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
const OperacionesMapa = () => {
    const [misiones, setMisiones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mapView, setMapView] = useState({ center: [-34.528, -58.641], zoom: 5 });
    
    // Estados unificados de control
    const [capasMet, setCapasMet] = useState({ nubes: false, viento: false, radar: true });
    const [mapBase, setMapBase] = useState('topo');

    const OWM_KEY = import.meta.env.VITE_OWM_KEY || '3c37f51c0830baa0dabe3848ba5d4bbf';

    const cargarSituacionTactica = async () => {
        try {
            const data = await EventService.getActiveOperations();
            if (Array.isArray(data)) {
                setMisiones(data.filter(m => m.isRealTime && m.ubicacion?.lat && m.ubicacion?.lng));
            }
        } catch (err) { console.error("❌ Error Táctico:", err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        cargarSituacionTactica();
        const interval = setInterval(cargarSituacionTactica, 15000);
        return () => clearInterval(interval);
    }, []);

    const getIcon = (mision) => {
        const t = (mision.aeronave || "").toUpperCase();
        const esAvion = ['C-212', 'C-208', 'C-550', 'DA-62', 'DHC-6', 'CESSNA', 'AVION', 'B-200'].some(mod => t.includes(mod));
        return esAvion ? planeIcon : heloIcon;
    };

    if (loading) return (
        <div style={styles.loadingScreen}>
            <div className="radar-loader"></div>
            <p>📡 SINCRONIZANDO SISTEMA TÁCTICO...</p>
        </div>
    );

    return (
        <div style={styles.mapWrapper}>
            <MeteorologiaPanelInterno 
                capasMet={capasMet} setCapasMet={setCapasMet} 
                mapBase={mapBase} setMapBase={setMapBase} 
            />

            <div style={styles.header}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '3px' }}>MONITOR DE OPERACIONES</div>
                <div style={styles.subHeader}>AVIACIÓN DE EJÉRCITO ARGENTINO</div>
            </div>

            <MapContainer center={mapView.center} zoom={mapView.zoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer 
                    url={mapBase === 'sat' 
                        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} 
                    zIndex={1} 
                />

                {capasMet.nubes && <TileLayer url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`} opacity={0.5} zIndex={5} />}
                {capasMet.viento && <TileLayer url={`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`} opacity={0.4} zIndex={6} />}
                {capasMet.radar && <TileLayer url="https://tilecache.rainviewer.com/v2/radar/nowcast_1/256/{z}/{x}/{y}/1/1_1.png" opacity={0.7} zIndex={10} />}

                {misiones.map((m) => (
                    <Marker key={m._id} position={[parseFloat(m.ubicacion.lat), parseFloat(m.ubicacion.lng)]} icon={getIcon(m)}>
                        <Tooltip direction="right" offset={[15, 0]} permanent className="label-tactica-custom">
                            <div style={styles.labelBoxDark}>{m.matricula || "S/M"}</div>
                        </Tooltip>
                        <Popup>
                            <div style={styles.popupContainer}>
                                <div style={styles.popupHeader}>{m.aeronave} - {m.matricula}</div>
                                <div style={styles.popupBody}>
                                    <strong>OP:</strong> {m.title}<br/>
                                    <strong>LOC:</strong> {m.ubicacion.nombre}<br/>
                                    <hr style={{margin: '8px 0', borderColor: '#444'}}/>
                                    <center style={{color: '#f39c12', fontSize: '0.65rem'}}>SISTEMA C2AE</center>
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
                .leaflet-popup-content-wrapper { padding: 0; background: #1a1a1a; color: white; border: 1px solid #f39c12; border-radius: 4px; }
                .leaflet-popup-content { margin: 0; width: 220px !important; }
                .meteorologia-scroll::-webkit-scrollbar { width: 4px; }
                .meteorologia-scroll::-webkit-scrollbar-thumb { background: #f39c12; }
                .loader-mini { width: 12px; height: 12px; border: 2px solid #f39c12; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite; display: inline-block; }
            `}</style>
        </div>
    );
};

// --- ESTILOS ---
const styles = {
    mapWrapper: { width: '100%', height: '100%', position: 'relative', backgroundColor: '#000' },
    loadingScreen: { backgroundColor: '#050505', color: '#f39c12', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' },
    header: { position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(10, 10, 10, 0.9)', color: '#f39c12', padding: '8px 20px', border: '1px solid #f39c12', textAlign: 'center', borderRadius: '4px' },
    subHeader: { fontSize: '0.6rem', color: '#bdc3c7', marginTop: '3px', borderTop: '1px solid #333', paddingTop: '3px' },
    labelBoxDark: { background: 'rgba(0, 15, 30, 0.9)', color: '#00ffff', border: '1px solid #00ffff', padding: '1px 6px', borderRadius: '2px', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace' },
    popupContainer: { fontFamily: 'monospace' },
    popupHeader: { background: '#f39c12', color: 'black', padding: '6px', fontWeight: 'bold', textAlign: 'center', fontSize: '0.8rem' },
    popupBody: { padding: '10px', fontSize: '0.75rem', background: '#1a1a1a' }
};

const panelStyles = {
    container: { position: 'absolute', top: '100px', height: 'calc(100vh - 150px)', width: '350px', backgroundColor: 'rgba(5, 5, 5, 0.95)', borderRight: '2px solid #f39c12', zIndex: 2000, transition: '0.4s', display: 'flex', color: 'white' },
    tab: { position: 'absolute', right: '-40px', top: '20px', width: '40px', height: '80px', backgroundColor: '#f39c12', border: 'none', cursor: 'pointer', borderRadius: '0 6px 6px 0' },
    tabIcon: { fontSize: '1.1rem', color: '#000' },
    tabText: { fontSize: '0.55rem', fontWeight: 'bold', color: '#000', writingMode: 'vertical-rl', textAlign: 'center' },
    content: { padding: '15px', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    headerContainer: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
    title: { fontSize: '0.8rem', color: '#f39c12', margin: 0 },
    section: { marginBottom: '15px', borderBottom: '1px solid #222', paddingBottom: '10px' },
    sectionTitle: { fontSize: '0.6rem', color: '#666', fontWeight: 'bold', display: 'block', marginBottom: '5px' },
    baseMapContainer: { display: 'flex', gap: '8px' },
    btnBase: { flex: 1, color: 'white', border: 'none', padding: '5px', borderRadius: '3px', fontSize: '0.65rem', cursor: 'pointer' },
    layersContainer: { display: 'flex', gap: '15px' },
    layerRow: { cursor: 'pointer', textAlign: 'center' },
    switch: { width: '34px', height: '17px', borderRadius: '10px', position: 'relative', marginTop: '4px' },
    switchKnob: { width: '13px', height: '13px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', transition: '0.2s' },
    searchBox: { marginBottom: '10px' },
    searchInput: { width: '100%', background: '#111', border: '1px solid #333', color: '#f39c12', padding: '6px', fontSize: '0.7rem', borderRadius: '3px' },
    scrollArea: { flex: 1, overflowY: 'auto' },
    card: { background: '#0a0a0a', padding: '10px', marginBottom: '8px', borderLeft: '3px solid #333' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' },
    catBadge: { fontSize: '0.6rem', padding: '1px 5px', borderRadius: '2px', color: 'white' },
    detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '0.65rem', marginBottom: '5px' },
    metarText: { fontSize: '0.6rem', color: '#999', fontFamily: 'monospace' },
    updateTime: { fontSize: '0.6rem', color: '#444' }
};

export default OperacionesMapa;