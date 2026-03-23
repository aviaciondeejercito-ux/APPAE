import React, { useState, useEffect } from 'react';
import { getWeatherData } from '../services/api';

/**
 * PANEL METEOROLÓGICO OPERATIVO - AVIACIÓN DE EJÉRCITO
 * Incluye Control de Capas Meteorológicas y Selectores de Mapa Base.
 */
const MeteorologiaPanel = ({ capasMet, setCapasMet, mapBase, setMapBase }) => {
    const [datos, setDatos] = useState([]);
    const [filtro, setFiltro] = useState('');
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);

    // FUNCIÓN DE CARGA DE DATOS OPMET
    const fetchMeteorologia = async () => {
        setLoading(true);
        try {
            const response = await getWeatherData();
            const data = response && response.data ? response.data : response;

            if (data && Array.isArray(data)) {
                const ordenados = [...data].sort((a, b) => a.icaoId.localeCompare(b.icaoId));
                setDatos(ordenados);
                setLastUpdate(new Date().toLocaleTimeString());
            }
        } catch (err) {
            console.error("❌ Error Meteorología AE:", err);
            setDatos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMeteorologia();
        const interval = setInterval(fetchMeteorologia, 900000); 
        return () => clearInterval(interval);
    }, []);

    const datosFiltrados = Array.isArray(datos) ? datos.filter(d => 
        (d.icaoId && d.icaoId.toUpperCase().includes(filtro.toUpperCase())) || 
        (d.name && d.name.toUpperCase().includes(filtro.toUpperCase()))
    ) : [];

    const getFlightCategoryColor = (cat) => {
        switch (cat) {
            case 'VFR': return '#2ecc71';
            case 'MVFR': return '#3498db';
            case 'IFR': return '#e74c3c';
            case 'LIFR': return '#9b59b6';
            default: return '#7f8c8d';
        }
    };

    // Manejador para los switches de capas
    const toggleCapa = (capa) => {
        setCapasMet(prev => ({ ...prev, [capa]: !prev[capa] }));
    };

    return (
        <div style={{...styles.container, left: visible ? '0' : '-380px'}}>
            <button onClick={() => setVisible(!visible)} style={styles.tab}>
                <div style={styles.tabIcon}>{visible ? '◀' : '🌤️'}</div>
                <div style={styles.tabText}>{visible ? '' : 'MET'}</div>
            </button>
            
            <div style={styles.content}>
                <div style={styles.headerContainer}>
                    <h3 style={styles.title}>CENTRO DE CONTROL TÁCTICO</h3>
                    {loading ? <span className="loader-mini"></span> : <span style={styles.updateTime}>{lastUpdate}</span>}
                </div>

                {/* --- SECCIÓN 1: SELECTOR DE MAPA BASE --- */}
                <div style={styles.section}>
                    <span style={styles.sectionTitle}>VISTA DE MAPA</span>
                    <div style={styles.baseMapContainer}>
                        <button 
                            onClick={() => setMapBase('topo')} 
                            style={{...styles.btnBase, backgroundColor: mapBase === 'topo' ? '#f39c12' : '#222'}}
                        >
                            Físico-Político
                        </button>
                        <button 
                            onClick={() => setMapBase('sat')} 
                            style={{...styles.btnBase, backgroundColor: mapBase === 'sat' ? '#f39c12' : '#222'}}
                        >
                            Satelital
                        </button>
                    </div>
                </div>

                {/* --- SECCIÓN 2: CAPAS METEOROLÓGICAS --- */}
                <div style={styles.section}>
                    <span style={styles.sectionTitle}>CAPAS DINÁMICAS (RAINVIER)</span>
                    <div style={styles.layersContainer}>
                        {Object.keys(capasMet).map(capa => (
                            <div key={capa} style={styles.layerRow} onClick={() => toggleCapa(capa)}>
                                <span style={{textTransform: 'uppercase', fontSize: '0.7rem'}}>{capa}</span>
                                <div style={{...styles.switch, backgroundColor: capasMet[capa] ? '#f39c12' : '#444'}}>
                                    <div style={{...styles.switchKnob, left: capasMet[capa] ? '18px' : '2px'}} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- SECCIÓN 3: OPMET (METAR/TAF) --- */}
                <div style={styles.searchBox}>
                    <input 
                        type="text" 
                        placeholder="BUSCAR OACI (EJ: SABE)..." 
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value.toUpperCase())}
                        style={styles.searchInput}
                    />
                    {filtro && <button onClick={() => setFiltro('')} style={styles.clearBtn}>X</button>}
                </div>

                <div className="meteorologia-scroll" style={styles.scrollArea}>
                    {datosFiltrados.length > 0 ? datosFiltrados.map(d => (
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

                            <div style={styles.metarContainer}>
                                <span style={styles.labelMetar}>METAR:</span>
                                <div style={styles.metarText}>{d.rawOb}</div>
                            </div>

                            {d.rawTaf && (
                                <div style={styles.tafContainer}>
                                    <span style={styles.labelTaf}>TAF:</span>
                                    <div style={styles.tafText}>{d.rawTaf}</div>
                                </div>
                            )}
                        </div>
                    )) : (
                        <div style={styles.emptyMsg}>
                            {loading ? 'SINCRONIZANDO RED OPMET...' : 'NO SE ENCONTRARON ESTACIONES.'}
                        </div>
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
    container: { position: 'absolute', top: '80px', height: 'calc(100vh - 120px)', width: '380px', backgroundColor: 'rgba(5, 5, 5, 0.98)', borderRight: '2px solid #f39c12', zIndex: 2500, transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1)', color: 'white', display: 'flex', boxShadow: '10px 0 25px rgba(0,0,0,0.8)' },
    tab: { position: 'absolute', right: '-45px', top: '20px', width: '45px', height: '90px', backgroundColor: '#f39c12', border: 'none', cursor: 'pointer', borderRadius: '0 8px 8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '5px 0 10px rgba(0,0,0,0.3)' },
    tabIcon: { fontSize: '1.2rem', color: '#000' },
    tabText: { fontSize: '0.6rem', fontWeight: 'bold', marginTop: '5px', color: '#000' },
    content: { padding: '15px', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    headerContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    title: { fontSize: '0.85rem', color: '#f39c12', fontFamily: 'monospace', margin: 0 },
    section: { marginBottom: '15px', borderBottom: '1px solid #222', paddingBottom: '10px' },
    sectionTitle: { fontSize: '0.6rem', color: '#777', fontWeight: 'bold', display: 'block', marginBottom: '8px' },
    baseMapContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
    btnBase: { color: 'white', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', transition: '0.3s' },
    layersContainer: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
    layerRow: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' },
    switch: { width: '35px', height: '18px', borderRadius: '10px', position: 'relative', transition: '0.3s' },
    switchKnob: { width: '14px', height: '14px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', transition: '0.3s' },
    updateTime: { fontSize: '0.6rem', color: '#555', fontFamily: 'monospace' },
    searchBox: { position: 'relative', marginBottom: '15px', display: 'flex' },
    searchInput: { width: '100%', backgroundColor: '#111', border: '1px solid #333', padding: '8px 12px', color: '#f39c12', fontSize: '0.75rem', fontFamily: 'monospace', borderRadius: '4px', outline: 'none' },
    clearBtn: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.7rem' },
    scrollArea: { flex: 1, overflowY: 'auto', paddingRight: '8px' },
    card: { marginBottom: '15px', backgroundColor: '#0a0a0a', padding: '12px', borderRadius: '4px', border: '1px solid #1a1a1a', borderLeft: '4px solid #333' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    catBadge: { color: 'white', padding: '2px 8px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.7rem', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' },
    detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', marginBottom: '10px', backgroundColor: '#000', padding: '8px', borderRadius: '3px', border: '1px solid #111' },
    detailItem: { fontSize: '0.65rem', color: '#fff', fontFamily: 'monospace' },
    detailLabel: { color: '#555', marginRight: '2px' },
    metarContainer: { marginBottom: '8px' },
    labelMetar: { fontSize: '0.6rem', color: '#f39c12', fontWeight: 'bold', display: 'block', marginBottom: '3px' },
    metarText: { color: '#bdc3c7', fontSize: '0.7rem', fontFamily: 'monospace', lineHeight: '1.4', padding: '8px', backgroundColor: 'rgba(243, 156, 18, 0.05)', borderRadius: '3px' },
    tafContainer: { marginTop: '10px', borderTop: '1px solid #222', paddingTop: '8px' },
    labelTaf: { fontSize: '0.6rem', color: '#3498db', fontWeight: 'bold', display: 'block', marginBottom: '3px' },
    tafText: { color: '#ecf0f1', fontSize: '0.68rem', fontFamily: 'monospace', lineHeight: '1.4' },
    emptyMsg: { textAlign: 'center', marginTop: '30px', color: '#444', fontSize: '0.75rem', fontFamily: 'monospace' },
    footer: { fontSize: '0.5rem', color: '#444', textAlign: 'center', marginTop: '10px', borderTop: '1px solid #222', paddingTop: '8px', letterSpacing: '1px', fontWeight: 'bold' }
};

export default MeteorologiaPanel;