import React, { useState } from 'react';

const F16Page = () => {
    const sdaList = ["UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "B206B3"];

    const [cabecera, setCabecera] = useState({
        sda: 'B206B3',
        matricula: 'AE-365',
        nroSerie: '4550',
        inicioAeFecha: '2012-02-01',
        inicioAeHs: 885.7,
        tgPlaneadorActual: 4030.1,
        motorSn: 'CAE-271029',
        motorTsn: 2409.4,
        motorCsnCso: 1573
    });

    const [componentes, setComponentes] = useState([
        {
            nro: 1,
            ata: '62-99',
            pn: '206-011-100-107',
            componente: 'M/R HUB ASSEMBLY',
            sn: 'HB-1809',
            
            // Estructura de Límites Apilados
            limiteTipo: 'TBO', 
            limites: [
                { valor: '2400', unidad: 'H' }, // Renglón 1
                { valor: '2028-11', unidad: 'M' } // Renglón 2 (Opcional)
            ],

            instaladoFecha: 'Nov-21',  // Fab/UI Ultra chico
            instaladoHoras: 0.0,
            instaladoTsnCsn: 2400.0,
            tgInstalacion: 2935.7,
            
            estadoTipo: 'TSO', 
            estadoActual: 1094.4,
            
            // Estructura de Disponibilidad Apilada con selectores independientes
            disponibilidades: [
                { valor: '1305.6', unidad: 'H' }, // Renglón 1
                { valor: '1200.0', unidad: 'M' }  // Renglón 2
            ]
        }
    ]);

    const handleCabeceraChange = (field, val) => {
        setCabecera(prev => ({
            ...prev,
            [field]: field.includes('Hs') || field.includes('Actual') || field.includes('Tsn') || field.includes('CsnCso') ? Number(val) || 0 : val
        }));
    };

    const handleComponenteChange = (index, field, val) => {
        const nuevos = [...componentes];
        nuevos[index][field] = val;
        setComponentes(nuevos);
    };

    // Manejo específico para los sub-arreglos apilados (Límites y Dispos)
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
                instaladoFecha: '', instaladoHoras: 0, instaladoTsnCsn: 0,
                tgInstalacion: 0, estadoTipo: 'TSO', estadoActual: 0,
                disponibilidades: [{ valor: '', unidad: 'H' }, { valor: '', unidad: 'H' }]
            }
        ]);
    };

    const removerFila = (index) => {
        if (componentes.length === 1) return;
        setComponentes(componentes.filter((_, idx) => idx !== index).map((c, idx) => ({ ...c, nro: idx + 1 })));
    };

    return (
        <div style={styles.container}>
            <div style={styles.mainHeader}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>SISTEMA DE GESTIÓN F-16 - HISTORIAL METRICIAL COMPACTO</h2>
            </div>

            {/* CABECERA */}
            <div style={styles.cardCabecera}>
                <div style={styles.headerGrid}>
                    <div style={styles.block}>
                        <div style={styles.blockTitle}>DATOS DE LA AERONAVE</div>
                        <div style={styles.formRow}>
                            <div style={styles.field}><label style={styles.label}>SdA</label>
                                <select value={cabecera.sda} onChange={e => handleCabeceraChange('sda', e.target.value)} style={styles.input}>{sdaList.map(s => <option key={s} value={s}>{s}</option>)}</select>
                            </div>
                            <div style={styles.field}><label style={styles.label}>Matrícula</label><input type="text" value={cabecera.matricula} onChange={e => handleCabeceraChange('matricula', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>Nro Serie</label><input type="text" value={cabecera.nroSerie} onChange={e => handleCabeceraChange('nroSerie', e.target.value)} style={styles.input} /></div>
                        </div>
                    </div>
                    <div style={styles.block}>
                        <div style={styles.blockTitle}>TIEMPOS E HISTORIAL</div>
                        <div style={styles.formRow}>
                            <div style={styles.field}><label style={styles.label}>Inicio AE (Fecha)</label><input type="date" value={cabecera.inicioAeFecha} onChange={e => handleCabeceraChange('inicioAeFecha', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>Inicio AE (Hs)</label><input type="number" value={cabecera.inicioAeHs} onChange={e => handleCabeceraChange('inicioAeHs', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>TG Planeador Actual</label><input type="number" value={cabecera.tgPlaneadorActual} onChange={e => handleCabeceraChange('tgPlaneadorActual', e.target.value)} style={{...styles.input, backgroundColor: '#fff9db', fontWeight: 'bold'}} /></div>
                        </div>
                    </div>
                    <div style={styles.block}>
                        <div style={styles.blockTitle}>GRUPO MOTOPROPULSOR</div>
                        <div style={styles.formRow}>
                            <div style={styles.field}><label style={styles.label}>Motor S/N</label><input type="text" value={cabecera.motorSn} onChange={e => handleCabeceraChange('motorSn', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>TSN</label><input type="number" value={cabecera.motorTsn} onChange={e => handleCabeceraChange('motorTsn', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>CSN/CSO</label><input type="number" value={cabecera.motorCsnCso} onChange={e => handleCabeceraChange('motorCsnCso', e.target.value)} style={styles.input} /></div>
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
                                // Cálculo automático base usando el primer límite numérico que encuentre
                                const limiteHoras = Number(comp.limites[0]?.valor) || 0;
                                const tgInstal = Number(comp.tgInstalacion) || 0;
                                const retiroOhCalculado = tgInstal + limiteHoras;

                                return (
                                    <tr key={comp.nro} style={styles.tr}>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold', border: '1px solid #ccc' }}>{comp.nro}</td>
                                        <td style={styles.td}><input type="text" value={comp.ata} onChange={e => handleComponenteChange(compIndex, 'ata', e.target.value)} style={styles.inputFlat} placeholder="62-99" /></td>
                                        <td style={styles.td}><input type="text" value={comp.pn} onChange={e => handleComponenteChange(compIndex, 'pn', e.target.value)} style={{...styles.inputFlat, width: '90px'}} placeholder="P/N" /></td>
                                        <td style={styles.td}><input type="text" value={comp.componente} onChange={e => handleComponenteChange(compIndex, 'componente', e.target.value)} style={{...styles.inputFlat, width: '130px'}} placeholder="Descripción" /></td>
                                        <td style={styles.td}><input type="text" value={comp.sn} onChange={e => handleComponenteChange(compIndex, 'sn', e.target.value)} style={styles.inputFlat} placeholder="S/N" /></td>
                                        
                                        {/* CELDA LÍMITES: Selector Tipo + Renglones Apilados con Unidades Propias */}
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
                                        
                                        {/* Fab/UI (Ultra reducido) */}
                                        <td style={{...styles.td, backgroundColor: '#f9f9f9'}}>
                                            <input type="text" value={comp.instaladoFecha} onChange={e => handleComponenteChange(compIndex, 'instaladoFecha', e.target.value)} style={styles.inputFlatMin} placeholder="Nov-21" />
                                        </td>

                                        {/* Tiempos de instalación */}
                                        <td style={styles.td}><input type="number" value={comp.instaladoHoras} onChange={e => handleComponenteChange(compIndex, 'instaladoHoras', e.target.value)} style={styles.inputFlatNum} /></td>
                                        <td style={styles.td}><input type="number" value={comp.instaladoTsnCsn} onChange={e => handleComponenteChange(compIndex, 'instaladoTsnCsn', e.target.value)} style={styles.inputFlatNum} /></td>
                                        
                                        {/* TG Planeador */}
                                        <td style={styles.td}><input type="number" value={comp.tgInstalacion} onChange={e => handleComponenteChange(compIndex, 'tgInstalacion', e.target.value)} style={styles.inputFlatNum} /></td>
                                        <td style={styles.tdCalculated}>{retiroOhCalculado.toFixed(1)}</td>

                                        {/* Estado Componente */}
                                        <td style={styles.td}>
                                            <select value={comp.estadoTipo} onChange={e => handleComponenteChange(compIndex, 'estadoTipo', e.target.value)} style={styles.selectFlat}>
                                                <option value="TSO">TSO</option>
                                                <option value="TSHMI">TSHMI</option>
                                                <option value="TSN">TSN</option>
                                            </select>
                                        </td>
                                        <td style={styles.td}><input type="number" value={comp.estadoActual} onChange={e => handleComponenteChange(compIndex, 'estadoActual', e.target.value)} style={styles.inputFlatNum} /></td>

                                        {/* CELDA DISPONIBILIDAD: Doble renglón apilado estricto con selectores H, M, C independientes */}
                                        <td style={{...styles.td, backgroundColor: '#f4fbf7'}}>
                                            <div style={styles.stackContainer}>
                                                {comp.disponibilidades.map((disp, subIndex) => (
                                                    <div key={subIndex} style={styles.rowStack}>
                                                        <input type="number" value={disp.valor} onChange={e => handleSubFieldChange(compIndex, 'disponibilidades', subIndex, 'valor', e.target.value)} style={{...styles.inputStack, backgroundColor: '#e8f8f5'}} placeholder={`Disp ${subIndex + 1}`} />
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

// ESTILOS MATRICIALES ROBÚSTICOS SIN SUPERPOSICIÓN
const styles = {
    container: { padding: '10px', backgroundColor: '#fafafa', minHeight: '100vh', fontFamily: 'monospace' },
    mainHeader: { backgroundColor: '#2c3e50', color: 'white', padding: '10px', borderRadius: '4px', marginBottom: '10px' },
    cardCabecera: { backgroundColor: 'white', padding: '10px', borderRadius: '4px', marginBottom: '10px', border: '1px solid #ccc' },
    headerGrid: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
    block: { flex: 1, minWidth: '250px', borderRight: '1px solid #eee', paddingRight: '10px' },
    blockTitle: { fontWeight: 'bold', fontSize: '0.75rem', marginBottom: '5px', color: '#555' },
    formRow: { display: 'flex', gap: '5px' },
    field: { display: 'flex', flexDirection: 'column', flex: 1 },
    label: { fontSize: '0.65rem', color: '#666', marginBottom: '2px' },
    input: { padding: '4px', border: '1px solid #999', fontSize: '0.75rem', outline: 'none' },
    
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
    
    // Contenedores Estructurales para las Celdas de Doble Renglón Interno (Flex)
    cellContainerVertical: { display: 'flex', flexDirection: 'column', width: '100%' },
    stackContainer: { display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' },
    rowStack: { display: 'flex', alignItems: 'center', gap: '2px', width: '100%' },
    inputStack: { flex: 1, minWidth: '55px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', outline: 'none' },
    selectStackUnit: { padding: '2px', border: '1px solid #bbb', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: '#fff2cc' },
    
    // Botones de control micro
    btnMiniPlus: { padding: '1px 5px', fontSize: '0.65rem', backgroundColor: '#2ec4b6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
    btnMiniMinus: { padding: '1px 5px', fontSize: '0.65rem', backgroundColor: '#e71d36', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
    btnSecundario: { backgroundColor: '#27ae60', color: 'white', border: '1px solid #219653', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }
};

export default F16Page;