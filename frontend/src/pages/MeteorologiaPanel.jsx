import React, { useState, useEffect } from 'react';

// Estaciones principales de Aviación de Ejército y apoyo
const ESTACIONES_DEFAULT = ['SADE', 'SADP', 'SACO', 'SAEZ', 'SAZG', 'SAZY', 'SARC'];

const MeteorologiaPanel = () => {
    const [datos, setDatos] = useState([]);
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tabActiva, setTabActiva] = useState('MET'); // 'MET' o 'NOTAM'

    const fetchMeteorologia = async () => {
        setLoading(true);
        try {
            const ids = ESTACIONES_DEFAULT.join(',');
            // API de Aviation Weather (NOAA)
            const url = `https://www.aviationweather.gov/api/data/metar?ids=${ids}&format=json&taf=true`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data && Array.isArray(data)) {
                setDatos(data);
            }
        } catch (err) {
            console.error("Error al obtener datos meteorológicos:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMeteorologia();
        const interval = setInterval(fetchMeteorologia, 900000); // Actualiza cada 15 min
        return () => clearInterval(interval);
    }, []);

    const getFlightCategoryColor = (cat) => {
        switch (cat) {
            case 'VFR': return '#2ecc71';  // Verde
            case 'MVFR': return '#3498db'; // Azul
            case 'IFR': return '#e74c3c';  // Rojo
            case 'LIFR': return '#9b59b6'; // Púrpura
            default: return '#f39c12';     // Naranja (Desconocido)
        }
    };

    return (
        <div style={{...styles.container, left: visible ? '0' : '-380px'}}>
            {/* PESTAÑA DE APERTURA (LADO DERECHO DEL PANEL IZQUIERDO) */}
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
                    {loading && <span className="loader-mini"></span>}
                </div>

                <div style={styles.scrollArea}>
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
                        )) : <div style={styles.emptyMsg}>Sincronizando con NOAA...</div>
                    ) : (
                        /* Sección de NOTAMs (Simulados para estructura) */
                        ESTACIONES_DEFAULT.map(icao => (
                            <div key={icao} style={{...styles.card, borderLeft: '3px solid #e74c3c'}}>
                                <div style={{...styles.cardHeader, color: '#e74c3c', fontSize: '0.8rem', fontWeight: 'bold'}}>
                                    NOTAMs {icao}
                                </div>
                                <div style={styles.notamContent}>
                                    A{Math.floor(Math.random()*9000)}/26 NOTAMN... RWY 17/35 CLSD DUE MAINT. CHECK PIREP.
                                </div>
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
                
                /* Scrollbar Táctico */
                .meteorologia-scroll::-webkit-scrollbar { width: 4px; }
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
        justifyContent: 'center', 
        boxShadow: '2px 0 5px rgba(0,0,0,0.3)' 
    },
    tabIcon: { fontSize: '1.2rem', color: '#000' },
    tabText: { fontSize: '0.6rem', fontWeight: 'bold', marginTop: '5px', color: '#000' },
    content: { padding: '15px', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    headerContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #333' },
    tabSelector: { display: 'flex', gap: '15px' },
    tabBtn: { background: 'none', border: 'none', padding: '10px 0', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', transition: '0.3s', fontFamily: 'monospace' },
    scrollArea: { flex: 1, overflowY: 'auto', paddingRight: '8px' },
    card: { marginBottom: '12px', backgroundColor: '#0f0f0f', padding: '12px', borderRadius: '4px', border: '1px solid #222' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    catBadge: { color: 'white', padding: '2px 8px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.7rem', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' },
    detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', marginBottom: '10px', backgroundColor: '#000', padding: '8px', borderRadius: '3px', border: '1px solid #1a1a1a' },
    detailItem: { fontSize: '0.65rem', color: '#fff', fontFamily: 'monospace' },
    detailLabel: { color: '#555', marginRight: '2px' },
    metarText: { color: '#bdc3c7', fontSize: '0.7rem', fontFamily: 'monospace', lineHeight: '1.4', padding: '8px', backgroundColor: 'rgba(243, 156, 18, 0.03)', borderRadius: '3px', borderLeft: '2px solid #f39c12' },
    tafText: { marginTop: '8px', color: '#ecf0f1', fontSize: '0.68rem', fontFamily: 'monospace', borderTop: '1px solid #222', paddingTop: '8px', lineHeight: '1.4' },
    notamContent: { color: '#bdc3c7', fontSize: '0.7rem', fontFamily: 'monospace', marginTop: '5px', lineHeight: '1.3' },
    emptyMsg: { textAlign: 'center', marginTop: '30px', color: '#555', fontSize: '0.8rem', fontFamily: 'monospace' },
    footer: { fontSize: '0.5rem', color: '#444', textAlign: 'center', marginTop: '10px', borderTop: '1px solid #222', paddingTop: '8px', letterSpacing: '1px', fontWeight: 'bold' }
};

export default MeteorologiaPanel;