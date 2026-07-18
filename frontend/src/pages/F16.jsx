import React, { useState } from 'react';

const F16Page = () => {
    const sdaList = ["UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "B206B3"];
    const unidadesList = ["Aviación de Ejército 601", "Aviación de Ejército 602", "Sección de Aviación de Ejército 2", "Sección de Aviación de Ejército 3"];

    // ESTADO DE NAVEGACIÓN Y TRASLADOS (SIN CONECTAR)
    const [busquedaForm, setBusquedaForm] = useState('');
    const [unidadNavegacion, setUnidadNavegacion] = useState(unidadesList[0]);
    const [unidadDestinoTraslado, setUnidadDestinoTraslado] = useState('');

    // CABECERA AMPLIADA CON VENCIMIENTOS Y OBSERVACIONES
    const [cabecera, setCabecera] = useState({
        sda: sdaList[0],
        matricula: '',
        nroSerie: '',
        inicioAeFecha: '',
        inicioAeHs: '',
        tgPlaneadorActual: '',
        motorSn: '',
        motorTsn: '',
        motorCsnCso: '',
        // Nuevos campos solicitados:
        vencimientoElt: '',
        vencimientoPitot: '',
        vencimientoTransponder: '',
        vencimientoSeguro: '',
        vencimientoAvionica: '',
        observacionesPopup: ''
    });

    const [componentes, setComponentes] = useState([
        {
            nro: 1,
            ata: '', pn: '', componente: '', sn: '',
            limiteTipo: 'TBO', 
            limites: [{ valor: '', unidad: 'H' }],
            instaladoFecha: '', instaladoHoras: '', instaladoTsnCsn: '', 
            tgInstalacion: '', estadoTipo: 'TSO', estadoActual: '',
            disponibilidades: [{ valor: '', unidad: 'H' }, { valor: '', unidad: 'H' }]
        }
    ]);

    const handleCabeceraChange = (field, val) => {
        setCabecera(prev => ({
            ...prev,
            [field]: field.includes('Hs') || field.includes('Actual') || field.includes('Tsn') || field.includes('CsnCso') ? (val === '' ? '' : Number(val)) : val
        }));
    };

    const handleComponenteChange = (index, field, val) => {
        const nuevos = [...componentes];
        nuevos[index][field] = val;
        setComponentes(nuevos);
    };

    const handleSubFieldChange = (compIndex, arrayField, subIndex, subSubField, val) => {
        const nuevos = [...componentes];
        nuevos[compIndex][arrayField][subIndex][subSubField] = val;
        setComponentes(nuevos);
    };

    const agregarSubLimite = (compIndex) => {
        const nuevos = [...componentes];
        if (nuevos[compIndex].limites.length >= 2) return alert("Máximo 2 límites por componente.");
        nuevos[compIndex].limites.push({ valor: '', unidad: 'H' });
        setComponentes(nuevos);
    };

    const quitarSubLimite = (compIndex) => {
        const nuevos = [...componentes];
        if (nuevos[compIndex].limites.length <= 1) return;
        nuevos[compIndex].limites.pop();
        setComponentes(nuevos);
    };

    const agregarFila = () => {
        setComponentes(prev => [
            ...prev,
            {
                nro: prev.length + 1,
                ata: '', pn: '', componente: '', sn: '',
                limiteTipo: 'TBO', 
                limites: [{ valor: '', unidad: 'H' }],
                instaladoFecha: '', instaladoHoras: '', instaladoTsnCsn: '',
                tgInstalacion: '', estadoTipo: 'TSO', estadoActual: '',
                disponibilidades: [{ valor: '', unidad: 'H' }, { valor: '', unidad: 'H' }]
            }
        ]);
    };

    const removerFila = (index) => {
        if (componentes.length === 1) return alert("Debe haber al menos una fila en la tabla.");
        setComponentes(componentes.filter((_, idx) => idx !== index).map((c, idx) => ({ ...c, nro: idx + 1 })));
    };

    const handleAbrirPopupObs = () => {
        alert(`Novedades / Observaciones actuales:\n\n${cabecera.observacionesPopup || "Sin novedades registradas."}`);
    };

    return (
        <div style={styles.container}>
            <div style={styles.mainHeader}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>SISTEMA DE GESTIÓN F-16 - HISTORIAL METRICIAL COMPACTO</h2>
            </div>

            {/* SECCIÓN SUPERIOR: CONTROL DE BÚSQUEDA, PERMISOS NAVEGACIÓN Y TRASLADOS */}
            <div style={styles.cardAdminPanel}>
                <div style={styles.adminGrid}>
                    <div style={styles.fieldAdmin}>
                        <label style={styles.labelAdmin}>🔍 BUSCADOR DE FORMULARIOS F-16 (Matrícula o S/N)</label>
                        <input type="text" value={busquedaForm} onChange={e => setBusquedaForm(e.target.value)} style={styles.inputAdmin} placeholder="Escriba matrícula a buscar..." />
                    </div>
                    <div style={styles.fieldAdmin}>
                        <label style={styles.labelAdmin}>🛡️ NAVEGACIÓN ENTRE UNIDADES (Permisos Superiores)</label>
                        <select value={unidadNavegacion} onChange={e => setUnidadNavegacion(e.target.value)} style={{...styles.inputAdmin, backgroundColor: '#f0f4f8'}}>
                            {unidadesList.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    <div style={styles.fieldAdmin}>
                        <label style={styles.labelAdmin}>✈️ TRANSFERIR FORMULARIO ACTUAL A OTRA UNIDAD</label>
                        <div style={{ display: 'flex', gap: '2px' }}>
                            <select value={unidadDestinoTraslado} onChange={e => setUnidadDestinoTraslado(e.target.value)} style={{...styles.inputAdmin, flex: 1, backgroundColor: '#fff0f0'}}>
                                <option value="">-- Seleccionar Unidad Destino --</option>
                                {unidadesList.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            <button type="button" onClick={() => alert("Función de transferencia lista para desarrollo.")} style={styles.btnTransfer}>Transferir</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CABECERA - DATOS DE LA AERONAVE Y TIEMPOS */}
            <div style={styles.cardCabecera}>
                <div style={styles.headerGrid}>
                    <div style={styles.block}>
                        <div style={styles.blockTitle}>DATOS DE LA AERONAVE</div>
                        <div style={styles.formRow}>
                            <div style={styles.field}><label style={styles.label}>SdA</label>
                                <select value={cabecera.sda} onChange={e => handleCabeceraChange('sda', e.target.value)} style={styles.input}>{sdaList.map(s => <option key={s} value={s}>{s}</option>)}</select>
                            </div>
                            <div style={styles.field}><label style={styles.label}>Matrícula</label><input type="text" value={cabecera.matricula} onChange={e => handleCabeceraChange('matricula', e.target.value)} style={styles.input} placeholder="Ej: AE-XXX" /></div>
                            <div style={styles.field}><label style={styles.label}>Nro Serie</label><input type="text" value={cabecera.nroSerie} onChange={e => handleCabeceraChange('nroSerie', e.target.value)} style={styles.input} placeholder="N/S" /></div>
                        </div>
                    </div>
                    <div style={styles.block}>
                        <div style={styles.blockTitle}>TIEMPOS E HISTORIAL</div>
                        <div style={styles.formRow}>
                            <div style={styles.field}><label style={styles.label}>Inicio AE (Fecha)</label><input type="date" value={cabecera.inicioAeFecha} onChange={e => handleCabeceraChange('inicioAeFecha', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>Inicio AE (Hs)</label><input type="number" value={cabecera.inicioAeHs} onChange={e => handleCabeceraChange('inicioAeHs', e.target.value)} style={styles.input} placeholder="0.0" /></div>
                            <div style={styles.field}><label style={styles.label}>TG Planeador Actual</label><input type="number" value={cabecera.tgPlaneadorActual} onChange={e => handleCabeceraChange('tgPlaneadorActual', e.target.value)} style={{...styles.input, backgroundColor: '#fff9db', fontWeight: 'bold'}} placeholder="0.0" /></div>
                        </div>
                    </div>
                    <div style={styles.block}>
                        <div style={styles.blockTitle}>GRUPO MOTOPROPULSOR</div>
                        <div style={styles.formRow}>
                            <div style={styles.field}><label style={styles.label}>Motor S/N</label><input type="text" value={cabecera.motorSn} onChange={e => handleCabeceraChange('motorSn', e.target.value)} style={styles.input} placeholder="S/N Motor" /></div>
                            <div style={styles.field}><label style={styles.label}>TSN</label><input type="number" value={cabecera.motorTsn} onChange={e => handleCabeceraChange('motorTsn', e.target.value)} style={styles.input} placeholder="0.0" /></div>
                            <div style={styles.field}><label style={styles.label}>CSN/CSO</label><input type="number" value={cabecera.motorCsnCso} onChange={e => handleCabeceraChange('motorCsnCso', e.target.value)} style={styles.input} placeholder="0" /></div>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '10px 0' }} />

                {/* NUEVO RENGLÓN ALARGADO: VENCIMIENTOS LEGALES Y POP UP */}
                <div style={styles.headerGrid}>
                    <div style={{...styles.block, flex: 3}}>
                        <div style={styles.blockTitle}>REQUISITOS LEGALES & VENCIMIENTOS HABILITACIONES</div>
                        <div style={styles.formRow}>
                            <div style={styles.field}><label style={styles.label}>RAAC 91.207 (ELT)</label><input type="date" value={cabecera.vencimientoElt} onChange={e => handleCabeceraChange('vencimientoElt', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>RAAC 91.411 (Pitot)</label><input type="date" value={cabecera.vencimientoPitot} onChange={e => handleCabeceraChange('vencimientoPitot', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>RAAC 91.413 (Xponder)</label><input type="date" value={cabecera.vencimientoTransponder} onChange={e => handleCabeceraChange('vencimientoTransponder', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>Venc. Seguro</label><input type="date" value={cabecera.vencimientoSeguro} onChange={e => handleCabeceraChange('vencimientoSeguro', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>Venc. Aviónica</label><input type="date" value={cabecera.vencimientoAvionica} onChange={e => handleCabeceraChange('vencimientoAvionica', e.target.value)} style={styles.input} /></div>
                        </div>
                    </div>
                    <div style={{...styles.block, flex: 1, borderRight: 'none'}}>
                        <div style={styles.blockTitle}>OBSERVACIONES / NOVEDADES</div>
                        <div style={{ display: 'flex', gap: '4px', height: '100%', alignItems: 'flex-end' }}>
                            <input type="text" value={cabecera.observacionesPopup} onChange={e => handleCabeceraChange('observacionesPopup', e.target.value)} style={{...styles.input, flex: 1}} placeholder="Escribir novedad rápida..." />
                            <button type="button" onClick={handleAbrirPopupObs} style={styles.btnMiniPopupTrigger}>👁️ Ver</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLA PRINCIPAL */}
            <div style={styles.cardTable}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1b3a57' }}>CONTROL DE COMPONENTES DEL PLANEADOR</div>
                    <button onClick={agregarFila} style={styles.btnSecundario}>➕ Añadir Fila</button>
                </div>

                <div style={styles.tableResponsive}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.thRow}>
                                <th rowSpan="2" style={styles.th}>Nro</th>
                                <th rowSpan="2" style={styles.th}>ATA</th>
                                <th rowSpan="2" style={styles.th}>P/N</th>
                                <th rowSpan="2" style={styles.th}>Componente</th>
                                <th rowSpan="2" style={styles.th}>S/N</th>
                                <th rowSpan="2" style={{...styles.th, minWidth: '150px' }}>Límites</th>
                                <th colSpan="3" style={styles.thGroup}>Instalado con</th>
                                <th colSpan="2" style={styles.thGroup}>TG Planeador</th>
                                <th colSpan="2" style={styles.thGroup}>Estado Componente</th>
                                <th rowSpan="2" style={{...styles.th, minWidth: '130px'}}>Disp</th>
                                <th rowSpan="2" style={styles.th}>Baja</th>
                            </tr>
                            <tr style={styles.thRow}>
                                <th style={{...styles.thSub, width: '60px', backgroundColor: '#f2f2f2'}}>Fab/UI</th>
                                <th style={styles.thSub}>Tiempos/Ciclos</th>
                                <th style={styles.thSub}>TSN/CSN</th>
                                <th style={styles.thSub}>a Instal</th>
                                <th style={styles.thSub}>Retiro/OH</th>
                                <th style={styles.thSub}>Tipo</th>
                                <th style={styles.thSub}>Valor Act.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {componentes.map((comp, compIndex) => {
                                const limiteHoras = Number(comp.limites[0]?.valor) || 0;
                                const tgInstal = Number(comp.tgInstalacion) || 0;
                                const retiroOhCalculado = tgInstal > 0 || limiteHoras > 0 ? (tgInstal + limiteHoras).toFixed(1) : '-';

                                return (
                                    <tr key={comp.nro} style={styles.tr}>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold', border: '1px solid #ccc' }}>{comp.nro}</td>
                                        <td style={styles.td}><input type="text" value={comp.ata} onChange={e => handleComponenteChange(compIndex, 'ata', e.target.value)} style={styles.inputFlat} placeholder="62-99" /></td>
                                        <td style={styles.td}><input type="text" value={comp.pn} onChange={e => handleComponenteChange(compIndex, 'pn', e.target.value)} style={{...styles.inputFlat, width: '90px'}} placeholder="P/N" /></td>
                                        <td style={styles.td}><input type="text" value={comp.componente} onChange={e => handleComponenteChange(compIndex, 'componente', e.target.value)} style={{...styles.inputFlat, width: '130px'}} placeholder="Descripción" /></td>
                                        <td style={styles.td}><input type="text" value={comp.sn} onChange={e => handleComponenteChange(compIndex, 'sn', e.target.value)} style={styles.inputFlat} placeholder="S/N" /></td>
                                        
                                        {/* CELDAS LÍMITES */}
                                        <td style={styles.td}>
                                            <div style={styles.cellContainerVertical}>
                                                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                                                    <select value={comp.limiteTipo} onChange={e => handleComponenteChange(compIndex, 'limiteTipo', e.target.value)} style={styles.selectFlatType}>
                                                        <option value="TBO">TBO</option>
                                                        <option value="LL">LL</option>
                                                    </select>
                                                    <button type="button" onClick={() => agregarSubLimite(compIndex)} style={styles.btnMiniPlus}>+</button>
                                                    {comp.limites.length > 1 && <button type="button" onClick={() => quitarSubLimite(compIndex)} style={styles.btnMiniMinus}>-</button>}
                                                </div>
                                                <div style={styles.stackContainer}>
                                                    {comp.limites.map((lim, subIndex) => (
                                                        <div key={subIndex} style={styles.rowStack}>
                                                            <input type="text" value={lim.valor} onChange={e => handleSubFieldChange(compIndex, 'limites', subIndex, 'valor', e.target.value)} style={styles.inputStack} placeholder="Valor" />
                                                            <select value={lim.unidad} onChange={e => handleSubFieldChange(compIndex, 'limites', subIndex, 'unidad', e.target.value)} style={styles.selectStackUnit}>
                                                                <option value="H">H</option>
                                                                <option value="M">M</option>
                                                                <option value="C">C</option>
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* Fab/UI */}
                                        <td style={{...styles.td, backgroundColor: '#f9f9f9'}}>
                                            <input type="text" value={comp.instaladoFecha} onChange={e => handleComponenteChange(compIndex, 'instaladoFecha', e.target.value)} style={styles.inputFlatMin} placeholder="M-A" />
                                        </td>

                                        {/* Tiempos de instalación */}
                                        <td style={styles.td}><input type="number" value={comp.instaladoHoras} onChange={e => handleComponenteChange(compIndex, 'instaladoHoras', e.target.value)} style={styles.inputFlatNum} placeholder="0.0" /></td>
                                        <td style={styles.td}><input type="number" value={comp.instaladoTsnCsn} onChange={e => handleComponenteChange(compIndex, 'instaladoTsnCsn', e.target.value)} style={styles.inputFlatNum} placeholder="0.0" /></td>
                                        
                                        {/* TG Planeador */}
                                        <td style={styles.td}><input type="number" value={comp.tgInstalacion} onChange={e => handleComponenteChange(compIndex, 'tgInstalacion', e.target.value)} style={styles.inputFlatNum} placeholder="0.0" /></td>
                                        <td style={styles.tdCalculated}>{retiroOhCalculado}</td>

                                        {/* Estado Componente */}
                                        <td style={styles.td}>
                                            <select value={comp.estadoTipo} onChange={e => handleComponenteChange(compIndex, 'estadoTipo', e.target.value)} style={styles.selectFlat}>
                                                <option value="TSO">TSO</option>
                                                <option value="TSHMI">TSHMI</option>
                                                <option value="TSN">TSN</option>
                                            </select>
                                        </td>
                                        <td style={styles.td}><input type="number" value={comp.estadoActual} onChange={e => handleComponenteChange(compIndex, 'estadoActual', e.target.value)} style={styles.inputFlatNum} placeholder="0.0" /></td>

                                        {/* CELDAS DISPONIBILIDAD */}
                                        <td style={{...styles.td, backgroundColor: '#f4fbf7'}}>
                                            <div style={styles.stackContainer}>
                                                {comp.disponibilidades.map((disp, subIndex) => (
                                                    <div key={subIndex} style={styles.rowStack}>
                                                        <input type="number" value={disp.valor} onChange={e => handleSubFieldChange(compIndex, 'disponibilidades', subIndex, 'valor', e.target.value)} style={{...styles.inputStack, backgroundColor: '#e8f8f5'}} placeholder="0.0" />
                                                        <select value={disp.unidad} onChange={e => handleSubFieldChange(compIndex, 'disponibilidades', subIndex, 'unidad', e.target.value)} style={styles.selectStackUnit}>
                                                            <option value="H">H</option>
                                                            <option value="M">M</option>
                                                            <option value="C">C</option>
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>

                                        <td style={{ textAlign: 'center', border: '1px solid #ccc' }}>
                                            <button onClick={() => removerFila(compIndex)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ESTILOS DE LA ARQUITECTURA DEL SISTEMA
const styles = {
    container: { padding: '10px', backgroundColor: '#fafafa', minHeight: '100vh', fontFamily: 'monospace' },
    mainHeader: { backgroundColor: '#2c3e50', color: 'white', padding: '10px', borderRadius: '4px', marginBottom: '10px' },
    
    // Panel de Administración Superior
    cardAdminPanel: { backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px', marginBottom: '10px', border: '1px solid #ced4da' },
    adminGrid: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    fieldAdmin: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: '280px' },
    labelAdmin: { fontSize: '0.7rem', fontWeight: 'bold', color: '#495057', marginBottom: '4px' },
    inputAdmin: { padding: '5px', border: '1px solid #adb5bd', fontSize: '0.75rem', outline: 'none' },
    btnTransfer: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '0 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' },

    cardCabecera: { backgroundColor: 'white', padding: '10px', borderRadius: '4px', marginBottom: '10px', border: '1px solid #ccc' },
    headerGrid: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
    block: { flex: 1, minWidth: '250px', borderRight: '1px solid #eee', paddingRight: '10px' },
    blockTitle: { fontWeight: 'bold', fontSize: '0.75rem', marginBottom: '5px', color: '#555' },
    formRow: { display: 'flex', gap: '5px' },
    field: { display: 'flex', flexDirection: 'column', flex: 1 },
    label: { fontSize: '0.65rem', color: '#666', marginBottom: '2px' },
    input: { padding: '4px', border: '1px solid #999', fontSize: '0.75rem', outline: 'none' },
    
    btnMiniPopupTrigger: { padding: '4px 8px', fontSize: '0.7rem', backgroundColor: '#6c757d', color: 'white', border: 'none', cursor: 'pointer' },

    cardTable: { backgroundColor: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' },
    tableResponsive: { width: '100%', overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
    thRow: { backgroundColor: '#eaeaea' },
    th: { border: '1px solid #aaa', padding: '5px', fontWeight: 'bold', textAlign: 'center', color: '#111' },
    thGroup: { border: '1px solid #aaa', padding: '4px', fontSize: '0.7rem', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ddd' },
    thSub: { border: '1px solid #aaa', padding: '4px', textAlign: 'center', fontSize: '0.65rem', backgroundColor: '#e5e5e5' },
    td: { border: '1px solid #ccc', padding: '4px', verticalAlign: 'middle' },
    tdCalculated: { border: '1px solid #ccc', padding: '4px', textAlign: 'right', fontWeight: 'bold', backgroundColor: '#f0f0f0', verticalAlign: 'middle' },
    inputFlat: { width: '65px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', outline: 'none' },
    inputFlatNum: { width: '55px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', textAlign: 'right', outline: 'none' },
    inputFlatMin: { width: '50px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', textAlign: 'center', outline: 'none' },
    selectFlat: { padding: '2px', border: '1px solid #bbb', fontSize: '0.7rem' },
    selectFlatType: { padding: '2px', border: '1px solid #bbb', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: '#e6f2ff' },
    cellContainerVertical: { display: 'flex', flexDirection: 'column', width: '100%' },
    stackContainer: { display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' },
    rowStack: { display: 'flex', alignItems: 'center', gap: '2px', width: '100%' },
    inputStack: { flex: 1, minWidth: '55px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', outline: 'none' },
    selectStackUnit: { padding: '2px', border: '1px solid #bbb', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: '#fff2cc' },
    btnMiniPlus: { padding: '1px 5px', fontSize: '0.65rem', backgroundColor: '#2ec4b6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
    btnMiniMinus: { padding: '1px 5px', fontSize: '0.65rem', backgroundColor: '#e71d36', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
    btnSecundario: { backgroundColor: '#27ae60', color: 'white', border: '1px solid #219653', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }
};

export default F16Page;