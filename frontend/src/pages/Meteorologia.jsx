import React, { useState, useEffect } from 'react';
import EventService from '../services/EventService'; 

/** 1. LISTA DE AERODROMOS (CONSTANTE) */
const AERODROMOS_LIST = [
    "SADP", "SADO", "SABE", "SADF", "SACO", "SASA", "SAMR", "SAME", 
    "SARP", "SAWG", "SAVC", "SAOR", "SAZY", "SAZR", "SAHZ", "SAZS", 
    "SAZB", "SAZA", "SAZF", "SAAP", "SANT", "SARF", "SAAV", "SANE", "SANU"
];

/** 2. HELPER: ICONOS DE FASE LUNAR */
const getMoonIcon = (phase) => {
    const p = phase?.toLowerCase() || '';
    if (p.includes('new')) return '🌑';
    if (p.includes('waxing crescent')) return '🌒';
    if (p.includes('first quarter')) return '🌓';
    if (p.includes('waxing gibbous')) return '🌔';
    if (p.includes('full')) return '🌕';
    if (p.includes('waning gibbous')) return '🌖';
    if (p.includes('last quarter')) return '🌗';
    if (p.includes('waning crescent')) return '🌘';
    return '🌙';
};

/** 3. WIDGET DE EVOLUCIÓN NOCTURNA (NVG PLANNING) */
const NightEvolutionWidget = ({ astronomyData }) => {
    if (!astronomyData) return <div style={styles.waitingData}>ESPERANDO DATOS ASTRONÓMICOS...</div>;

    const moonrise = astronomyData.moonrise || "--:--";
    const moonset = astronomyData.moonset || "--:--";
    const phase = astronomyData.moon_phase || "S/D";
    const illumination = astronomyData.moon_illumination || "0";

    const calculateCulmination = (rise, set) => {
        if (rise === "--:--" || set === "--:--" || !rise || !set) return "S/D";
        try {
            const parseTime = (t) => {
                const parts = t.split(' ');
                if (parts.length < 2) {
                    const [h, m] = t.split(':');
                    return parseInt(h, 10) * 60 + parseInt(m, 10);
                }
                const [time, modifier] = parts;
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
            <div style={styles.nightTitle}>PLANIFICACIÓN LUNAR (NVG)</div>
            <div style={styles.moonCard}>
                <div style={styles.moonMainInfo}>
                    <span style={styles.moonEmoji}>{getMoonIcon(phase)}</span>
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                        <span style={styles.moonPhaseText}>{phase.toUpperCase()}</span>
                        <span style={styles.moonIllumText}>{illumination}% ILUMINACIÓN</span>
                    </div>
                </div>
            </div>
            
            <div style={styles.arcContainer}>
                <div style={styles.moonArcGradient}></div>
                <div style={{...styles.arcPoint, left: '0%', bottom: '-12px'}}>
                    <div style={styles.pointLabel}>SALIDA</div>
                    <div style={styles.pointTime}>{moonrise}</div>
                </div>
                <div style={{...styles.arcPoint, left: '50%', top: '-18px', transform: 'translateX(-50%)'}}>
                    <div style={{...styles.pointLabel, color: '#f39c12', textShadow: '0 0 5px rgba(243, 156, 18, 0.5)'}}>CÚSPIDE</div>
                    <div style={styles.pointTime}>{culmination}</div>
                    <div style={styles.cuspIndicator}></div>
                </div>
                <div style={{...styles.arcPoint, right: '0%', bottom: '-12px'}}>
                    <div style={styles.pointLabel}>OCASO</div>
                    <div style={styles.pointTime}>{moonset}</div>
                </div>
            </div>
        </div>
    );
};

/** 4. WIDGET METEOROLÓGICO PRINCIPAL (METAR/TAF) */
const MetarWidget = ({ selectedStation, setSelectedStation, astronomyData, setAstronomyData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [weatherData, setWeatherData] = useState({ metar: null, taf: null });
    const [loading, setLoading] = useState(false);

    const fetchWeatherData = async (icao) => {
        if (!icao) return;
        setLoading(true);
        try {
            const response = await EventService.getWeatherData(icao);
            const info = response.data?.data || response.data;
            
            if (info) {
                setAstronomyData(info.astronomy || null);
                setWeatherData({
                    metar: info.raw || info.metar || "SIN DATOS METAR",
                    taf: info.taf || "TAF NO DISPONIBLE"
                });
            }
        } catch (err) {
            console.error("Error meteorológico:", err);
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
            <div style={styles.searchWrapper}>
                <input 
                    type="text" 
                    placeholder="BUSCAR OACI (E.G. SADP)..." 
                    style={styles.metarSearch}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                />
                <span style={styles.searchIcon}>🔍</span>
            </div>
            
            <div style={styles.stationList}>
                {filteredStations.map(icao => (
                    <button 
                        key={icao} 
                        onClick={() => setSelectedStation(icao)}
                        style={{
                            ...styles.stationBtn,
                            backgroundColor: selectedStation === icao ? '#f39c12' : '#1a1a1a',
                            color: selectedStation === icao ? '#000' : '#888',
                            borderColor: selectedStation === icao ? '#fff' : '#333'
                        }}
                    >
                        {icao}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={styles.loaderBox}>📡 ESCANEANDO FRECUENCIAS OACI...</div>
            ) : (
                <div style={styles.weatherResults}>
                    <div style={styles.stationBadge}>
                        <span style={styles.dotActive}></span> {selectedStation} | OPERACIONAL
                    </div>
                    
                    <div style={styles.metarSection}>
                        <div style={styles.metarLabelWrapper}>
                            <span style={styles.metarLabel}>METAR REAL-TIME</span>
                            <span style={styles.liveTag}>LIVE</span>
                        </div>
                        <div style={styles.metarRaw}>{weatherData.metar}</div>
                    </div>

                    <div style={styles.metarSection}>
                        <span style={{...styles.metarLabel, color: '#3498db'}}>TAF (FORECAST)</span>
                        <div style={{...styles.metarRaw, borderLeft: '3px solid #3498db'}}>{weatherData.taf}</div>
                    </div>
                    
                    <NightEvolutionWidget astronomyData={astronomyData} />
                </div>
            )}
        </div>
    );
};

/** 5. ESTILOS COMPLETOS DEL WIDGET */
const styles = {
    metarBox: { fontFamily: "'JetBrains Mono', monospace, sans-serif" },
    metarHeader: { color: '#f39c12', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center', letterSpacing: '1px' },
    searchWrapper: { position: 'relative', marginBottom: '15px' },
    metarSearch: { width: '100%', background: '#0a0a0a', border: '1px solid #333', color: '#fff', padding: '8px 12px', fontSize: '11px', borderRadius: '4px', outline: 'none', borderLeft: '3px solid #f39c12' },
    searchIcon: { position: 'absolute', right: '10px', top: '7px', fontSize: '12px', opacity: 0.5 },
    stationList: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', maxHeight: '120px', overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' },
    stationBtn: { border: '1px solid', padding: '6px 0', fontSize: '9px', cursor: 'pointer', borderRadius: '3px', fontWeight: 'bold', transition: 'all 0.2s' },
    loaderBox: { color: '#f39c12', fontSize: '10px', textAlign: 'center', padding: '20px', border: '1px dashed #f39c12', borderRadius: '4px' },
    weatherResults: { textAlign: 'left' },
    stationBadge: { background: '#222', color: '#00ffff', fontSize: '11px', fontWeight: 'bold', padding: '6px 10px', borderRadius: '4px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #333' },
    dotActive: { width: '8px', height: '8px', background: '#27ae60', borderRadius: '50%', boxShadow: '0 0 5px #27ae60' },
    metarSection: { marginBottom: '15px' },
    metarLabelWrapper: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' },
    metarLabel: { color: '#f39c12', fontSize: '10px', fontWeight: 'bold' },
    liveTag: { background: '#c0392b', color: 'white', fontSize: '8px', padding: '2px 5px', borderRadius: '2px', fontWeight: 'bold' },
    metarRaw: { color: '#ecf0f1', fontSize: '11px', lineHeight: '1.4', background: '#050505', padding: '10px', borderRadius: '4px', border: '1px solid #1a1a1a', whiteSpace: 'pre-wrap', borderLeft: '3px solid #f39c12', boxShadow: 'inset 0 0 10px rgba(0,0,0,1)' },
    waitingData: { color: '#7f8c8d', fontSize: '10px', textAlign: 'center', marginTop: '10px' },
    nightWidget: { marginTop: '20px', padding: '15px', background: '#080808', border: '1px solid #222', borderRadius: '6px' },
    nightTitle: { color: '#f39c12', fontSize: '10px', fontWeight: 'bold', textAlign: 'center', marginBottom: '12px', letterSpacing: '1.5px' },
    moonCard: { background: '#111', padding: '10px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #1a1a1a' },
    moonMainInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
    moonEmoji: { fontSize: '24px', filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.3))' },
    moonPhaseText: { color: '#fff', fontSize: '11px', fontWeight: 'bold' },
    moonIllumText: { color: '#f1c40f', fontSize: '9px', fontWeight: 'bold' },
    arcContainer: { position: 'relative', height: '45px', borderBottom: '1px solid #333', marginBottom: '15px' },
    moonArcGradient: { position: 'absolute', top: '0', left: '10%', right: '10%', bottom: '-1px', border: '2px solid #333', borderBottom: 'none', borderRadius: '100px 100px 0 0', opacity: 0.5 },
    arcPoint: { position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    pointLabel: { fontSize: '8px', color: '#555', fontWeight: 'bold', marginBottom: '2px' },
    pointTime: { fontSize: '10px', color: '#fff', fontWeight: 'bold' },
    cuspIndicator: { width: '4px', height: '4px', background: '#f39c12', borderRadius: '50%', marginTop: '2px', boxShadow: '0 0 8px #f39c12' }
};

export default MetarWidget;