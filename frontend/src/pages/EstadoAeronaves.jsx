import React, { useEffect, useState } from 'react';
import { getAircrafts, updateAircraftStatus } from '../services/api';

const EstadoAeronaves = () => {
    const [aircrafts, setAircrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Aeronave seleccionada y copia editable para el modal
    const [selectedNote, setSelectedNote] = useState(null);
    const [formData, setFormData] = useState(null);

    // ==========================================
    // 🛡️ CONTROL DE ACCESOS Y ROLES
    // ==========================================
    const rawRole = localStorage.getItem('role') || localStorage.getItem('rol') || 'user';
    const roleUpper = String(rawRole).trim().toUpperCase().replace(/[\s_]/g, '');
    const userElemento = localStorage.getItem('elemento')?.trim().toUpperCase() || "";

    // Verificar si es Mando Estratégico para filtrado global
    const esAdminPorContenido = roleUpper.includes('ADMIN');
    const esMandoPorLista = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleUpper);
    const isMandoEstrategico = esAdminPorContenido || esMandoPorLista || userElemento === 'COMANDO';

    // 🔒 PERMISO DE EDICIÓN EXCLUSIVO: Únicamente Oficina Técnica
    const puedeEditar = ['OFICINATECNICA', 'OFICINA_TECNICA'].includes(roleUpper);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 300000); // 5 min
        return () => clearInterval(interval);
    }, [userElemento]);

    const fetchData = async () => {
        try {
            const respuestaApi = await getAircrafts();
            
            let unparsedData = [];
            if (Array.isArray(respuestaApi)) {
                unparsedData = respuestaApi;
            } else if (respuestaApi && Array.isArray(respuestaApi.data)) {
                unparsedData = respuestaApi.data;
            } else if (respuestaApi && respuestaApi.data && Array.isArray(respuestaApi.data.data)) {
                unparsedData = respuestaApi.data.data;
            }
            
            let filtrados = isMandoEstrategico 
                ? unparsedData 
                : unparsedData.filter(a => 
                    a.unidad && 
                    userElemento && 
                    String(a.unidad).trim().toUpperCase() === userElemento
                );
            
            filtrados = filtrados.filter(a => a.estadoOperativo === 'E/S' || a.estadoOperativo === 'F/S');
            
            setAircrafts(filtrados);
            setLoading(false);
        } catch (error) {
            console.error("Error AE: Fallo al obtener estado de flota", error);
            setLoading(false);
        }
    };

    // 🛠️ EXTRAER HORAS REMANENTES DEL PLANEADOR
    const obtenerHorasRemanentesPlaneador = (air) => {
        if (!air?.compPlaneador || air.compPlaneador.length === 0) return 0;
        const disp = air.compPlaneador[0]?.disponibilidades?.[0]?.valor;
        return disp !== undefined && disp !== '' ? Number(disp) : 0;
    };

    // 📖 ABRIR MODAL
    const handleOpenModal = (air) => {
        setSelectedNote(air);
        setFormData(JSON.parse(JSON.stringify(air)));
    };

    // 🔒 CERRAR MODAL
    const handleCloseModal = () => {
        setSelectedNote(null);
        setFormData(null);
    };

    // ✏️ MANEJADOR DE CAMBIOS EN FORMULARIO
    const handleChangeForm = (field, value) => {
        if (!puedeEditar) return;
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // ✏️ EDICIÓN DE DISPONIBILIDAD DEL COMPONENTE PRINCIPAL (PLANEADOR)
    const handleCompPlaneadorDispChange = (val) => {
        if (!puedeEditar) return;
        setFormData(prev => {
            const copyComp = [...(prev.compPlaneador || [])];
            if (copyComp.length === 0) {
                copyComp.push({ disponibilidades: [{ valor: val, unidad: 'H' }] });
            } else {
                copyComp[0] = {
                    ...copyComp[0],
                    disponibilidades: [{ valor: val, unidad: 'H' }]
                };
            }
            return { ...prev, compPlaneador: copyComp };
        });
    };

    // 💾 GUARDAR CAMBIOS (SOLO OFICINA TÉCNICA)
    const handleSaveChanges = async () => {
        if (!puedeEditar || !formData) return;
        setSaving(true);
        try {
            await updateAircraftStatus(formData._id, formData);
            await fetchData();
            handleCloseModal();
        } catch (err) {
            console.error("Error al guardar aeronave:", err);
            alert("Ocurrió un error al intentar guardar las modificaciones.");
        } finally {
            setSaving(false);
        }
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
                        <p>No hay aeronaves registradas bajo su jurisdicción ({userElemento}) con estado E/S o F/S.</p>
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
                                                            onClick={() => handleOpenModal(air)}
                                                            style={{
                                                                ...styles.btnNote,
                                                                background: '#3498db',
                                                                color: 'white'
                                                            }}
                                                        >
                                                            👁️ {puedeEditar ? 'Editar' : 'Ver'}
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

            {/* ==========================================
                🪟 POPUP MODAL: DETALLES Y EDICIÓN
            ========================================== */}
            {selectedNote && formData && (
                <div style={styles.modalOverlay} onClick={handleCloseModal}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h4 style={{margin: 0}}>Ficha Técnica - {formData.matricula} ({formData.sda})</h4>
                                <span style={{fontSize: '0.75rem', opacity: 0.9}}>Nº Serie: {formData.nroSerie || 'S/N'} | Unidad: {formData.unidad}</span>
                            </div>
                            <button style={styles.btnClose} onClick={handleCloseModal}>&times;</button>
                        </div>

                        <div style={styles.modalBody}>
                            
                            {/* ESTADO OPERATIVO */}
                            <div style={styles.infoSection}>
                                <h5 style={styles.sectionTitle}>🔴 Estado Operativo</h5>
                                {puedeEditar ? (
                                    <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                                        <label style={{fontSize: '0.85rem', fontWeight: 'bold'}}>Estado:</label>
                                        <select 
                                            value={formData.estadoOperativo} 
                                            onChange={(e) => handleChangeForm('estadoOperativo', e.target.value)}
                                            style={styles.selectInput}
                                        >
                                            <option value="E/S">E/S (En Servicio)</option>
                                            <option value="F/S">F/S (Fuera de Servicio)</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div style={styles.infoGrid}>
                                        <div><strong>Estado Actual:</strong> {formData.estadoOperativo}</div>
                                    </div>
                                )}
                            </div>

                            {/* TRACKING DE HORAS DE PLANEADOR */}
                            <div style={styles.infoSection}>
                                <h5 style={styles.sectionTitle}>⏳ Tracking de Horas y Planeador</h5>
                                <div style={styles.infoGrid}>
                                    <div><strong>Totales Iniciales:</strong> {formData.inicioAeHs || 0} hs</div>
                                    
                                    <div>
                                        <strong>TG Planeador Actual: </strong>
                                        {puedeEditar ? (
                                            <input 
                                                type="number"
                                                value={formData.tgPlaneadorActual ?? 0}
                                                onChange={(e) => handleChangeForm('tgPlaneadorActual', e.target.value)}
                                                style={styles.numberInput}
                                            />
                                        ) : (
                                            `${formData.tgPlaneadorActual || 0} hs`
                                        )}
                                    </div>

                                    <div><strong>Aterrizajes (Landings):</strong> {formData.tgPlaneadorLandings || 0}</div>

                                    <div>
                                        <strong>Hs Remanentes Disp.: </strong>
                                        {puedeEditar ? (
                                            <input 
                                                type="number"
                                                value={formData.compPlaneador?.[0]?.disponibilidades?.[0]?.valor ?? ''}
                                                onChange={(e) => handleCompPlaneadorDispChange(e.target.value)}
                                                style={{...styles.numberInput, borderColor: '#3498db', fontWeight: 'bold'}}
                                                placeholder="0"
                                            />
                                        ) : (
                                            <span style={{fontWeight: 'bold', color: obtenerHorasRemanentesPlaneador(formData) <= 10 ? '#e74c3c' : '#2c3e50'}}>
                                                {obtenerHorasRemanentesPlaneador(formData)} hs
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* PLANTA MOTRIZ (MOTORES Y HÉLICES) */}
                            <div style={styles.infoSection}>
                                <h5 style={styles.sectionTitle}>⚙️ Planta Motriz y Componentes</h5>
                                
                                {formData.motores && formData.motores.length > 0 ? (
                                    formData.motores.map((m, i) => (
                                        <div key={i} style={styles.subInfoBox}>
                                            <strong style={{color: '#1b3a57'}}>{m.nombre || `Motor Nº ${i+1}`}:</strong>
                                            {m.componentes && m.componentes.length > 0 ? (
                                                m.componentes.map((c, ci) => (
                                                    <div key={ci} style={{fontSize: '0.8rem', marginTop: '4px'}}>
                                                        • Comp: <b>{c.componente || 'N/D'}</b> | P/N: {c.pn || 'S/P'} | S/N: {c.sn || 'S/S'} | Disp: <b>{c.disponibilidades?.[0]?.valor || 0} {c.disponibilidades?.[0]?.unidad || 'H'}</b>
                                                    </div>
                                                ))
                                            ) : (
                                                <span style={{fontSize: '0.8rem'}}> Sin componentes sub-registrados.</span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div style={styles.subInfo}>
                                        <strong>Motor 1:</strong> S/N: {formData.motorSn || 'N/D'} | TSN: {formData.motorTsn || 0} hs | CSN/CSO: {formData.motorCsnCso || 0}<br/>
                                        {formData.motor2Sn && <><strong>Motor 2:</strong> S/N: {formData.motor2Sn} | TSN: {formData.motor2Tsn || 0} hs | CSN/CSO: {formData.motor2CsnCso || 0}</>}
                                    </div>
                                )}

                                {formData.helices && formData.helices.length > 0 ? (
                                    formData.helices.map((h, i) => (
                                        <div key={i} style={{...styles.subInfoBox, marginTop: '8px'}}>
                                            <strong style={{color: '#1b3a57'}}>{h.nombre || `Hélice Nº ${i+1}`}:</strong>
                                            {h.componentes && h.componentes.length > 0 ? (
                                                h.componentes.map((c, ci) => (
                                                    <div key={ci} style={{fontSize: '0.8rem', marginTop: '4px'}}>
                                                        • Comp: <b>{c.componente || 'N/D'}</b> | P/N: {c.pn || 'S/P'} | S/N: {c.sn || 'S/S'} | Disp: <b>{c.disponibilidades?.[0]?.valor || 0} {c.disponibilidades?.[0]?.unidad || 'H'}</b>
                                                    </div>
                                                ))
                                            ) : (
                                                <span style={{fontSize: '0.8rem'}}> Sin componentes sub-registrados.</span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div style={styles.subInfo}>
                                        {formData.helice1Sn && <div><strong>Hélice 1:</strong> S/N: {formData.helice1Sn} | TSN: {formData.helice1Tsn || 0} hs</div>}
                                        {formData.helice2Sn && <div><strong>Hélice 2:</strong> S/N: {formData.helice2Sn} | TSN: {formData.helice2Tsn || 0} hs</div>}
                                    </div>
                                )}
                            </div>

                            {/* VENCIMIENTOS DE LEY Y AVIÓNICA */}
                            <div style={styles.infoSection}>
                                <h5 style={styles.sectionTitle}>📅 Vencimientos de Ley / Aviónica</h5>
                                <div style={styles.infoGrid}>
                                    <div><strong>Seguro:</strong> {formatDate(formData.vencimientoSeguro)}</div>
                                    <div><strong>Habilitación Aviónica:</strong> {formatDate(formData.vencimientoAvionica)}</div>
                                    <div style={{color: '#856404'}}><strong>ELT:</strong> {formatDate(formData.vencimientoElt)}</div>
                                    <div style={{color: '#856404'}}><strong>Sistema Pitot (91.411):</strong> {formatDate(formData.vencimientoPitot)}</div>
                                    <div style={{color: '#856404'}}><strong>Transponder (91.413):</strong> {formatDate(formData.vencimientoTransponder)}</div>
                                </div>
                            </div>

                            {/* OBSERVACIONES EMERGENTES / POPUP */}
                            <div style={styles.infoSection}>
                                <h5 style={styles.sectionTitle}>📝 Observaciones Emergentes (Popup)</h5>
                                {puedeEditar ? (
                                    <textarea 
                                        rows={3}
                                        value={formData.observacionesPopup || ''}
                                        onChange={(e) => handleChangeForm('observacionesPopup', e.target.value)}
                                        style={styles.textArea}
                                        placeholder="Ingrese novedades o notas de inspección críticas..."
                                    />
                                ) : (
                                    formData.observacionesPopup ? (
                                        <div style={styles.noteBox}>{formData.observacionesPopup}</div>
                                    ) : (
                                        <div style={styles.emptyNote}>Sin novedades ni observaciones críticas registradas.</div>
                                    )
                                )}
                            </div>

                        </div>

                        <div style={styles.modalFooter}>
                            {puedeEditar && (
                                <button 
                                    style={{...styles.btnPrimary, backgroundColor: '#27ae60', marginRight: '10px'}} 
                                    onClick={handleSaveChanges}
                                    disabled={saving}
                                >
                                    {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                                </button>
                            )}
                            <button style={styles.btnSecondary} onClick={handleCloseModal}>
                                {puedeEditar ? 'Cancelar' : 'Cerrar'}
                            </button>
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
    modal: { background: 'white', width: '90%', maxWidth: '650px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
    modalHeader: { background: '#1b3a57', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalBody: { padding: '20px', maxHeight: '70vh', overflowY: 'auto' },
    infoSection: { marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' },
    sectionTitle: { margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1b3a57', borderLeft: '3px solid #3498db', paddingLeft: '8px' },
    infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' },
    subInfo: { fontSize: '0.8rem', color: '#666', padding: '2px 0' },
    subInfoBox: { background: '#f8fafd', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e1e8ed', fontSize: '0.85rem' },
    noteBox: { background: '#fdf3f3', padding: '12px', borderRadius: '8px', border: '1px solid #f8d7da', fontSize: '0.85rem', whiteSpace: 'pre-wrap' },
    emptyNote: { fontSize: '0.85rem', color: '#999', fontStyle: 'italic' },
    modalFooter: { padding: '15px 20px', textAlign: 'right', background: '#f8f9fa' },
    btnPrimary: { background: '#1b3a57', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
    btnSecondary: { background: '#7f8c8d', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
    btnClose: { background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' },
    numberInput: { width: '90px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' },
    selectInput: { padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem', fontWeight: 'bold' },
    textArea: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical' }
};

export default EstadoAeronaves;