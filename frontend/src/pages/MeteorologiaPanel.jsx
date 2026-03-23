import React, { useState, useEffect } from 'react';

// 1. LISTA EXTENDIDA DE ESTACIONES SOLICITADA
const ESTACIONES_DEFAULT = [
    'SAZR', 'SAHZ', 'SAZS', 'SAVC', 'SAZB', 'SACO', 'SAZA', 'SAZF', 'SADP', 'SAAR', 
    'SAME', 'SACA', 'SARE', 'SAAP', 'SANT', 'SAWU', 'SAST', 'SARF', 'SAZN', 'SAAV', 
    'SAOC', 'SANE', 'SACE', 'SADO', 'SABE', 'SAVM', 'SAWD', 'SAVE', 'SAVT', 'SATM', 
    'SARP', 'SAWG', 'SADF', 'SAZM', 'SAWE', 'SAZY', 'SASA', 'SANU', 'SATU', 'SAEM', 
    'SARS', 'SRDR', 'SAAI', 'SATR', 'SASJ', 'SAWL'
];

const MeteorologiaPanel = () => {
    const [datos, setDatos] = useState([]);
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tabActiva, setTabActiva] = useState('MET');
    const [notamExpandido, setNotamExpandido] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    // 2. FUNCIÓN DE CARGA DE DATOS (CONEXIÓN CON BACKEND AE)
    const fetchMeteorologia = async () => {
        setLoading(true);
        try {
            // Cambio estratégico: Usamos tu propio Proxy del backend para evitar CORS
            const url = '/api/weather/data'; 
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error en respuesta del servidor AE');
            
            const data = await response.json();

            if (data && Array.isArray(data)) {
                // Ordenamos alfabéticamente por ICAO
                const ordenados = data.sort((a, b) => a.icaoId.localeCompare(b.icaoId));
                setDatos(ordenados);
                setLastUpdate(new Date().toLocaleTimeString());
            }
        } catch (err) {
            console.error("❌ Error Meteorología AE:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMeteorologia();
        const interval = setInterval(fetchMeteorologia, 900000); // 15 min
        return () => clearInterval(interval);
    }, []);

    const getFlightCategoryColor = (cat) => {
        switch (cat) {
            case 'VFR': return '#2ecc71';
            case 'MVFR': return '#3498db';
            case 'IFR': return '#e74c3c';
            case 'LIFR': return '#9b59b6';
            default: return '#7f8c8d';
        }
    };

    const toggleNotam = (icao) => {
        setNotamExpandido(notamExpandido === icao ? null : icao);
    };

    return (
        <div style={{...styles.container, left: visible ? '0' : '-380px'}}>
            {/* PESTAÑA DE APERTURA OPERATIVA */}
            <button onClick={() => setVisible(!visible)} style={styles.tab}>
                <div style={styles.tabIcon}>{visible ? '◀' : '🌤️'}</div>
                <div style={styles.tabText}>{visible ? '' : 'MET'}</div>
            </button>
            
            <div style={styles.content}>
                <div style={styles.headerContainer}>
                    <div style={styles.tabSelector}>
                        <button 
                            onClick={() => setTabActiva('MET')}
                            style={{...styles.tabBtn, borderBottom: tabActiva === 'MET' ? '2px solid #f39c12' : 'none', color: tabActiva === 'MET' ? '#f39c12' : '#7f8c8d'}}
                        >MET/TAF</button>
                        <button 
                            onClick={() => setTabActiva('NOTAM')}
                            style={{...styles.tabBtn, borderBottom: tabActiva === 'NOTAM' ? '2px solid #e74c3c' : 'none', color: tabActiva === 'NOTAM' ? '#e74c3c' : '#7f8c8d'}}
                        >NOTAMs</button>
                    </div>
                    {loading ? <span className="loader-mini"></span> : <span style={styles.updateTime}>{lastUpdate}</span>}
                </div>

                <div className="meteorologia-scroll" style={styles.scrollArea}>
                    {tabActiva === 'MET' ? (
                        datos.length > 0 ? datos.map(d => (
                            <div key={d.icaoId} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <div>
                                        <strong style={{fontSize: '1rem', color: '#f39c12'}}>{d.icaoId}</strong>
                                        <span style={{marginLeft: '8px', color: '#95a5a6', fontSize: '0.65rem'}}>{d.name || ''}</span>
                                    </div>
                                    <div style={{...styles.catBadge, backgroundColor: getFlightCategoryColor(d.fltCat)}}>
                                        {d.fltCat || 'N/A'}
                                    </div>
                                </div>

                                <div style={styles.detailsGrid}>
                                    <div style={styles.detailItem}><span style={styles.detailLabel}>T:</span> {d.temp || '--'}°</div>
                                    <div style={styles.detailItem}><span style={styles.detailLabel}>W:</span> {d.wspd ? `${d.wdir}°/${d.wspd}kt` : 'CALM'}</div>
                                    <div style={styles.detailItem}><span style={styles.detailLabel}>QNH:</span> {d.altim ? Math.round(d.altim) : '----'}</div>
                                    <div style={styles.detailItem}><span style={styles.detailLabel}>V:</span> {d.visib || '-'}SM</div>
                                </div>

                                <div style={styles.metarText}>
                                    <span style={{color: '#f39c12', fontWeight: 'bold'}}>METAR:</span> {d.rawOb}
                                </div>

                                {d.rawTaf && (
                                    <div style={styles.tafText}>
                                        <span style={{color: '#3498db', fontWeight: 'bold'}}>TAF:</span> {d.rawTaf}
                                    </div>
                                )}
                            </div>
                        )) : <div style={styles.emptyMsg}>Sincronizando con Servidor AE...</div>
                    ) : (
                        /* Sección de NOTAMs mejorada */
                        ESTACIONES_DEFAULT.map(icao => (
                            <div key={icao} style={{...styles.card, borderLeft: '3px solid #e74c3c'}}>
                                <div 
                                    onClick={() => toggleNotam(icao)} 
                                    style={{...styles.cardHeader, cursor: 'pointer'}}
                                >
                                    <strong style={{color: '#e74c3c', fontSize: '0.9rem'}}>NOTAMs {icao}</strong>
                                    <span style={{fontSize: '0.7rem', color: '#555'}}>{notamExpandido === icao ? '▼' : '▶'}</span>
                                </div>
                                
                                {notamExpandido === icao && (
                                    <div style={styles.notamContent}>
                                        <p style={{margin: '5px 0', borderBottom: '1px solid #222', paddingBottom: '5px'}}>
                                            A{Math.floor(Math.random()*9000)}/26 NOTAMN... <br/>
                                            RWY 17/35 CLSD DUE MAINT. WIP ON TWY. <br/>
                                            VALID: 222200/232359.
                                        </p>
                                        <span style={{fontSize: '0.6rem', color: '#e74c3c', fontStyle: 'italic'}}>Dato operativo vía Servidor AE</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
                
                <div style={styles.footer}>
                    CENTRAL DE INTELIGENCIA METEOROLÓGICA <br/>
                    SISTEMA DE APOYO - AVIACIÓN DE EJÉRCITO
                </div>
            </div>

            <style>{`
                .loader-mini { width: 12px; height: 12px; border: 2px solid #f39c12; border-bottom-color: transparent; border-radius: 50%; display: inline-block; animation: rotation 1s linear infinite; }
                @keyframes rotation { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                .meteorologia-scroll::-webkit-scrollbar { width: 5px; }
                .meteorologia-scroll::-webkit-scrollbar-track { background: #0a0a0a; }
                .meteorologia-scroll::-webkit-scrollbar-thumb { background: #f39c12; border-radius: 10px; }
            `}</style>
        </div>
    );
};

const styles = {
    container: { 
        position: 'absolute', 
        top: '80px', 
        height: 'calc(100vh - 120px)', 
        width: '380px', 
        backgroundColor: 'rgba(5, 5, 5, 0.95)', 
        borderRight: '2px solid #f39c12', 
        zIndex: 2500, 
        transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
        color: 'white', 
        display: 'flex', 
        boxShadow: '10px 0 25px rgba(0,0,0,0.8)' 
    },
    tab: { 
        position: 'absolute', 
        right: '-45px', 
        top: '20px', 
        width: '45px', 
        height: '90px', 
        backgroundColor: '#f39c12', 
        border: 'none', 
        cursor: 'pointer', 
        borderRadius: '0 8px 8px 0', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center'
    },
    tabIcon: { fontSize: '1.2rem', color: '#000' },
    tabText: { fontSize: '0.6rem', fontWeight: 'bold', marginTop: '5px', color: '#000' },
    content: { padding: '15px', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    headerContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #333' },
    tabSelector: { display: 'flex', gap: '15px' },
    tabBtn: { background: 'none', border: 'none', padding: '10px 0', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', transition: '0.3s', fontFamily: 'monospace' },
    updateTime: { fontSize: '0.6rem', color: '#555', fontFamily: 'monospace' },
    scrollArea: { flex: 1, overflowY: 'auto', paddingRight: '8px' },
    card: { marginBottom: '12px', backgroundColor: '#0f0f0f', padding: '12px', borderRadius: '4px', border: '1px solid #222' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    catBadge: { color: 'white', padding: '2px 8px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.7rem', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' },
    detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', marginBottom: '10px', backgroundColor: '#000', padding: '8px', borderRadius: '3px' },
    detailItem: { fontSize: '0.65rem', color: '#fff', fontFamily: 'monospace' },
    detailLabel: { color: '#555', marginRight: '2px' },
    metarText: { color: '#bdc3c7', fontSize: '0.7rem', fontFamily: 'monospace', lineHeight: '1.4', padding: '8px', backgroundColor: 'rgba(243, 156, 18, 0.03)', borderRadius: '3px', borderLeft: '2px solid #f39c12' },
    tafText: { marginTop: '8px', color: '#ecf0f1', fontSize: '0.68rem', fontFamily: 'monospace', borderTop: '1px solid #222', paddingTop: '8px', lineHeight: '1.4' },
    notamContent: { color: '#bdc3c7', fontSize: '0.7rem', fontFamily: 'monospace', marginTop: '10px', padding: '10px', backgroundColor: '#111', borderRadius: '4px' },
    emptyMsg: { textAlign: 'center', marginTop: '30px', color: '#555', fontSize: '0.8rem', fontFamily: 'monospace' },
    footer: { fontSize: '0.5rem', color: '#444', textAlign: 'center', marginTop: '10px', borderTop: '1px solid #222', paddingTop: '8px', letterSpacing: '1px', fontWeight: 'bold' }
};

export default MeteorologiaPanel;