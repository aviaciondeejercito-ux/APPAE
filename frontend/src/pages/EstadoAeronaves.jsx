import React, { useEffect, useState } from 'react';
import { getAircrafts } from '../services/api';

const EstadoAeronaves = () => {
    const [aircrafts, setAircrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState(null); 
    
    // NORMALIZACIÓN SINCRO JOKER - REDUNDANCIA ABSOLUTA
    const rawRole = localStorage.getItem('role') || 'user';
    
    // Limpiamos espacios, guiones y pasamos a Mayúsculas y Minúsculas para doble chequeo
    const roleUpper = String(rawRole).trim().toUpperCase().replace(/[\s_]/g, '');
    const roleLower = String(rawRole).trim().toLowerCase().replace(/[\s_]/g, '');
    
    const userElemento = localStorage.getItem('elemento')?.trim().toUpperCase() || "";

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 300000); // Refresco cada 5 min
        return () => clearInterval(interval);
    }, [userElemento]);

    const fetchData = async () => {
        try {
            const respuestaApi = await getAircrafts();
            
            // 🛡️ NORMALIZACIÓN DE RESPUESTA: Soportamos Axios, Fetch nativo o Array directo
            let unparsedData = [];
            if (Array.isArray(respuestaApi)) {
                unparsedData = respuestaApi;
            } else if (respuestaApi && Array.isArray(respuestaApi.data)) {
                unparsedData = respuestaApi.data;
            } else if (respuestaApi && respuestaApi.data && Array.isArray(respuestaApi.data.data)) {
                unparsedData = respuestaApi.data.data;
            }
            
            // VERIFICACIÓN MULTI-CAPA (Redundancia estricta para ADMIN/admin/Admin/ADMINISTRADOR)
            const esAdminPorContenido = roleUpper.includes('ADMIN') || roleLower.includes('admin');
            const esMandoPorLista = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleUpper) || 
                                    ['admin', 'boss', 'director', 'oto'].includes(roleLower);
            
            const isMandoPorRol = esAdminPorContenido || esMandoPorLista;
            
            // REGRESIÓN DE SEGURIDAD / LIBERACIÓN INSTITUCIONAL
            const isMandoEstrategico = isMandoPorRol || userElemento === 'COMANDO';

            // 1. Filtrado Inicial por Jurisdicción de Unidad
            let filtrados = isMandoEstrategico 
                ? unparsedData 
                : unparsedData.filter(a => 
                    a.unidad && 
                    userElemento && 
                    String(a.unidad).trim().toUpperCase() === userElemento
                );
            
            // 2. FILTRO EXCLUSIVO: Solo mostrar si el estado es estrictamente E/S o F/S
            filtrados = filtrados.filter(a => a.estadoOperativo === 'E/S' || a.estadoOperativo === 'F/S');
            
            setAircrafts(filtrados);
            setLoading(false);
        } catch (error) {
            console.error("Error AE: Fallo al obtener estado de flota", error);
            setLoading(false);
        }
    };

    // 🛠️ FUNCIÓN AUXILIAR: Extrae las horas de disponibilidad del planeador principal (TBO/Inspección)
    const obtenerHorasRemanentesPlaneador = (air) => {
        if (!air?.compPlaneador || air.compPlaneador.length === 0) return 0;
        const disp = air.compPlaneador[0].disponibilidades?.[0]?.valor;
        return disp ? Number(disp) : 0;
    };

    const unidades = [...new Set(aircrafts.filter(a => a.unidad).map(a => String(a.unidad).trim().toUpperCase()))].sort();

    const formatDate = (date) => {
        if (!date) return "N/D";
        return new Date(date).toLocaleDateString('es-AR');
    };

    if (loading) return <div style={styles.loader}>Cargando Estado de Situación AE...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h2 style={styles.mainTitle}>📊 Monitor de Estado de Aeronaves</h2>
                <div style={styles.statusRow}>
                    <div style={styles.summaryItem}>
                        <span style={{...styles.dot, backgroundColor: '#2ecc71'}}></span> 
                        Total E/S: {aircrafts.filter(a => a.estadoOperativo === 'E/S').length}
                    </div>
                    <div style={styles.summaryItem}>
                        <span style={{...styles.dot, backgroundColor: '#e74c3c'}}></span> 
                        Total F/S: {aircrafts.filter(a => a.estadoOperativo === 'F/S').length}
                    </div>
                    <div style={styles.summaryItem}>
                        <span style={{...styles.dot, backgroundColor: '#f1c40f'}}></span> 
                        Críticos {"<"}10hs: {aircrafts.filter(a => obtenerHorasRemanentesPlaneador(a) <= 10).length}
                    </div>
                </div>
            </header>

            <div style={styles.grid}>
                {unidades.length === 0 ? (
                    <div style={styles.noData}>
                        <p>No hay aeronaves registradas bajo su jurisdicción o elemento operativo ({userElemento}) con estado E/S o F/S.</p>
                    </div>
                ) : (
                    unidades.map(unidad => (
                        <div key={unidad} style={styles.unitCard}>
                            <div style={styles.unitHeader}>
                                <div>
                                    <h3 style={styles.unitName}>{unidad}</h3>
                                    <div style={{fontSize: '0.7rem', opacity: 0.8, letterSpacing: '1px'}}>ELEMENTO OPERATIVO</div>
                                </div>
                                <div style={styles.badgeCount}>
                                    {aircrafts.filter(a => String(a.unidad).trim().toUpperCase() === unidad && a.estadoOperativo === 'E/S').length} DISPONIBLES
                                </div>
                            </div>
                            
                            <div style={styles.tableWrapper}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>SdA</th>
                                            <th style={styles.th}>Matrícula</th>
                                            <th style={styles.th}>Estado</th>
                                            <th style={styles.th}>Hs Rem.</th>
                                            <th style={styles.th}>Detalles</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {aircrafts.filter(a => String(a.unidad).trim().toUpperCase() === unidad).map(air => {
                                            const hsRemanentes = obtenerHorasRemanentesPlaneador(air);
                                            return (
                                                <tr key={air._id} style={{
                                                    ...styles.tr,
                                                    backgroundColor: air.estadoOperativo === 'F/S' ? '#fff5f5' : 'transparent',
                                                    borderLeft: hsRemanentes <= 10 ? '4px solid #e74c3c' : 'none'
                                                }}>
                                                    <td style={styles.td}>{air.sda || "S/D"}</td>
                                                    <td style={{...styles.td, fontWeight: 'bold'}}>{air.matricula || "S/M"}</td>
                                                    <td style={styles.td}>
                                                        <span style={{
                                                            ...styles.statusBadge,
                                                            backgroundColor: air.estadoOperativo === 'E/S' ? '#2ecc71' : '#e74c3c'
                                                        }}>
                                                            {air.estadoOperativo || "N/A"}
                                                        </span>
                                                    </td>
                                                    <td style={{
                                                        ...styles.td, 
                                                        color: hsRemanentes <= 10 ? '#e74c3c' : '#2c3e50',
                                                        fontWeight: hsRemanentes <= 10 ? 'bold' : 'normal'
                                                    }}>
                                                        {hsRemanentes} {hsRemanentes <= 10 && '⚠️'}
                                                    </td>
                                                    <td style={styles.td}>
                                                        <button 
                                                            onClick={() => setSelectedNote(air)}
                                                            style={{
                                                                ...styles.btnNote,
                                                                background: '#3498db',
                                                                color: 'white'
                                                            }}
                                                        >
                                                            👁️ Ver
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedNote && (
                <div style={styles.modalOverlay} onClick={() => setSelectedNote(null)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h4 style={{margin: 0}}>Ficha Técnica - {selectedNote.matricula}</h4>
                            <button style={styles.btnClose} onClick={() => setSelectedNote(null)}>&times;</button>
                        </div>
                        <div style={styles.modalBody}>
                            
                            <div style={styles.infoSection}>
                                <h5 style={styles.sectionTitle}>⏳ Tracking de Horas</h5>
                                <div style={styles.infoGrid}>
                                    <div><strong>Totales Iniciales:</strong> {selectedNote.inicioAeHs || 0} hs</div>
                                    <div><strong>Tiempo General Planeador:</strong> {selectedNote.tgPlaneadorActual || 0} hs</div>
                                    <div><strong>Remanentes Plan.:</strong> {obtenerHorasRemanentesPlaneador(selectedNote)} hs</div>
                                </div>
                            </div>

                            <div style={styles.infoSection}>
                                <h5 style={styles.sectionTitle}>⚙️ Planta Motriz y Palas</h5>
                                {selectedNote.motores?.map((m, i) => (
                                    <div key={i} style={styles.subInfo}>
                                        <strong>{m.nombre || `Motor ${i+1}`}:</strong> 
                                        {m.componentes?.[0] 
                                            ? ` Componente: ${m.componentes[0].componentes || 'N/D'} | S/N: ${m.componentes[0].sn || 'S/S'} | Disp: ${m.componentes[0].disponibilidades?.[0]?.valor || 0} hs`
                                            : ' Sin componentes mapeados.'}
                                    </div>
                                ))}
                                {selectedNote.helices?.map((h, i) => (
                                    <div key={i} style={styles.subInfo}>
                                        <strong>{h.nombre || `Hélice ${i+1}`}:</strong> 
                                        {h.componentes?.[0] 
                                            ? ` Componente: ${h.componentes[0].componentes || 'N/D'} | S/N: ${h.componentes[0].sn || 'S/S'} | Disp: ${h.componentes[0].disponibilidades?.[0]?.valor || 0} hs`
                                            : ' Sin componentes mapeados.'}
                                    </div>
                                ))}
                            </div>

                            <div style={styles.infoSection}>
                                <h5 style={styles.sectionTitle}>📅 Vencimientos de Ley / Aviónica</h5>
                                <div style={styles.infoGrid}>
                                    <div><strong>Seguro:</strong> {formatDate(selectedNote.vencimientoSeguro)}</div>
                                    <div><strong>Habilitación Aviónica:</strong> {formatDate(selectedNote.vencimientoAvionica)}</div>
                                    <div style={{color: '#856404'}}><strong>Vencimiento ELT:</strong> {formatDate(selectedNote.vencimientoElt)}</div>
                                    <div style={{color: '#856404'}}><strong>Sistema Pitot (91.411):</strong> {formatDate(selectedNote.vencimientoPitot)}</div>
                                    <div style={{color: '#856404'}}><strong>Transponder (91.413):</strong> {formatDate(selectedNote.vencimientoTransponder)}</div>
                                </div>
                            </div>

                            <div style={styles.infoSection}>
                                <h5 style={styles.sectionTitle}>📝 Observaciones Emergentes</h5>
                                {selectedNote.observacionesPopup ? (
                                    <div style={styles.noteBox}>{selectedNote.observacionesPopup}</div>
                                ) : (
                                    <div style={styles.emptyNote}>Sin novedades ni observaciones críticas registradas en popup.</div>
                                )}
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button style={styles.btnPrimary} onClick={() => setSelectedNote(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { padding: '30px', maxWidth: '1600px', margin: '0 auto', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
    header: { marginBottom: '40px', textAlign: 'center' },
    mainTitle: { color: '#1b3a57', marginBottom: '10px', fontSize: '1.8rem', letterSpacing: '-0.5px' },
    statusRow: { display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.9rem', color: '#555' },
    summaryItem: { display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 18px', borderRadius: '20px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
    dot: { width: '10px', height: '10px', borderRadius: '50%' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '25px' },
    unitCard: { background: 'white', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #eef2f6' },
    unitHeader: { background: '#1b3a57', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' },
    unitName: { margin: 0, fontSize: '1.1rem', fontWeight: 'bold', textTransform: 'uppercase' },
    badgeCount: { fontSize: '0.75rem', background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.3)' },
    tableWrapper: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
    th: { textAlign: 'left', padding: '15px 20px', background: '#f8fafd', color: '#7f8c8d', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '2px solid #edf2f7' },
    td: { padding: '15px 20px', borderBottom: '1px solid #f1f4f8', color: '#2c3e50' },
    tr: { transition: '0.2s' },
    statusBadge: { padding: '4px 10px', borderRadius: '6px', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-block', minWidth: '40px', textAlign: 'center' },
    loader: { textAlign: 'center', marginTop: '100px', color: '#1b3a57', fontSize: '1.2rem', fontWeight: 'bold' },
    noData: { textAlign: 'center', gridColumn: '1 / -1', opacity: 0.6, marginTop: '50px', padding: '60px', background: '#f9f9f9', borderRadius: '15px', border: '2px dashed #ccc' },
    btnNote: { padding: '5px 12px', border: 'none', borderRadius: '5px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(3px)' },
    modal: { background: 'white', width: '90%', maxWidth: '600px', borderRadius: '12px', overflow: 'hidden' },
    modalHeader: { background: '#1b3a57', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalBody: { padding: '20px', maxHeight: '70vh', overflowY: 'auto' },
    infoSection: { marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
    sectionTitle: { margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1b3a57', borderLeft: '3px solid #3498db', paddingLeft: '8px' },
    infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' },
    subInfo: { fontSize: '0.8rem', color: '#666', padding: '2px 0' },
    noteBox: { background: '#fdf3f3', padding: '12px', borderRadius: '8px', border: '1px solid #f8d7da', fontSize: '0.85rem', whiteSpace: 'pre-wrap' },
    emptyNote: { fontSize: '0.85rem', color: '#999', fontStyle: 'italic' },
    modalFooter: { padding: '15px 20px', textAlign: 'right', background: '#f8f9fa' },
    btnPrimary: { background: '#1b3a57', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
    btnClose: { background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }
};

export default EstadoAeronaves;