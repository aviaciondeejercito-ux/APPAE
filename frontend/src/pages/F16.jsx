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
            limiteTipo: 'TBO', 
            limiteHoras: 2400,  
            limiteCal: '2028-11-01', 
            instaladoFecha: '2021-11-01', 
            instaladoHoras: 0.0,
            instaladoTsnCsn: 2400.0,
            tgInstalacion: 2935.7,
            estadoTipo: 'TSO', 
            estadoActual: 1094.4,
            dispHoras: 1305.6, 
            dispCal: 1200.0, 
            estadoUnidad: 'H' 
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

    const agregarFila = () => {
        setComponentes(prev => [
            ...prev,
            {
                nro: prev.length + 1,
                ata: '', pn: '', componente: '', sn: '',
                limiteTipo: 'TBO', limiteHoras: 0, limiteCal: '',
                instaladoFecha: '', instaladoHoras: 0, instaladoTsnCsn: 0,
                tgInstalacion: 0, estadoTipo: 'TSO', estadoActual: 0,
                dispHoras: 0, dispCal: 0, estadoUnidad: 'H'
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
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>SISTEMA DE GESTIÓN F-16 - HISTORIAL DE COMPONENTES</h2>
            </div>

            {/* FORMULARIO DE ENCABEZADO */}
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

            {/* TABLA FLANA - INDEPENDIENTE POR COLUMNA */}
            <div style={styles.cardTable}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1b3a57' }}>TABLA DE COMPONENTES DEL PLANEADOR</div>
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
                                <th colSpan="3" style={styles.thGroup}>Límites de Control</th>
                                <th style={{...styles.thGroup, backgroundColor: '#f2f2f2'}}>FUI</th>
                                <th colSpan="2" style={styles.thGroup}>Instalado con</th>
                                <th colSpan="2" style={styles.thGroup}>TG Planeador</th>
                                <th colSpan="2" style={styles.thGroup}>Estado Componente</th>
                                <th colSpan="3" style={styles.thGroup}>Disponibilidad</th>
                                <th rowSpan="2" style={styles.th}>Acción</th>
                            </tr>
                            <tr style={styles.thRow}>
                                {/* Límites */}
                                <th style={styles.thSub}>Tipo</th>
                                <th style={styles.thSub}>Lím. Horas</th>
                                <th style={styles.thSub}>Lím. Calend.</th>
                                {/* Fab/UI */}
                                <th style={{...styles.thSub, backgroundColor: '#f2f2f2'}}>Fab/UI</th>
                                {/* Instalado Con */}
                                <th style={styles.thSub}>Hs (TSO)</th>
                                <th style={styles.thSub}>TSN/CSN</th>
                                {/* TG Planeador */}
                                <th style={styles.thSub}>a Instal</th>
                                <th style={styles.thSub}>Retiro/OH</th>
                                {/* Estado Componente */}
                                <th style={styles.thSub}>Tipo</th>
                                <th style={styles.thSub}>Valor Act.</th>
                                {/* Disponibilidad */}
                                <th style={styles.thSub}>Disp 1</th>
                                <th style={styles.thSub}>Disp 2</th>
                                <th style={styles.thSub}>Unidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {componentes.map((comp, index) => {
                                const limiteHoras = Number(comp.limiteHoras) || 0;
                                const tgInstal = Number(comp.tgInstalacion) || 0;
                                const retiroOhCalculado = tgInstal + limiteHoras;

                                return (
                                    <tr key={comp.nro} style={styles.tr}>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold', border: '1px solid #ccc' }}>{comp.nro}</td>
                                        <td style={styles.td}><input type="text" value={comp.ata} onChange={e => handleComponenteChange(index, 'ata', e.target.value)} style={styles.inputFlat} placeholder="62-99" /></td>
                                        <td style={styles.td}><input type="text" value={comp.pn} onChange={e => handleComponenteChange(index, 'pn', e.target.value)} style={{...styles.inputFlat, width: '100px'}} placeholder="P/N" /></td>
                                        <td style={styles.td}><input type="text" value={comp.componente} onChange={e => handleComponenteChange(index, 'componente', e.target.value)} style={{...styles.inputFlat, width: '140px'}} placeholder="Descripción" /></td>
                                        <td style={styles.td}><input type="text" value={comp.sn} onChange={e => handleComponenteChange(index, 'sn', e.target.value)} style={styles.inputFlat} placeholder="S/N" /></td>
                                        
                                        {/* Límites (Columnas Desglosadas) */}
                                        <td style={styles.td}>
                                            <select value={comp.limiteTipo} onChange={e => handleComponenteChange(index, 'limiteTipo', e.target.value)} style={styles.selectFlat}>
                                                <option value="TBO">TBO</option>
                                                <option value="LL">LL</option>
                                            </select>
                                        </td>
                                        <td style={styles.td}><input type="number" value={comp.limiteHoras} onChange={e => handleComponenteChange(index, 'limiteHoras', e.target.value)} style={styles.inputFlatNum} /></td>
                                        <td style={styles.td}><input type="text" value={comp.limiteCal} onChange={e => handleComponenteChange(index, 'limiteCal', e.target.value)} style={styles.inputFlat} placeholder="AAAA-MM-DD" /></td>
                                        
                                        {/* Fab/UI (Compacto/Pequeño) */}
                                        <td style={{...styles.td, backgroundColor: '#f9f9f9'}}>
                                            <input type="text" value={comp.instaladoFecha} onChange={e => handleComponenteChange(index, 'instaladoFecha', e.target.value)} style={{...styles.inputFlat, width: '65px', textAlign: 'center'}} placeholder="-X-" />
                                        </td>

                                        {/* Instalado Con */}
                                        <td style={styles.td}><input type="number" value={comp.instaladoHoras} onChange={e => handleComponenteChange(index, 'instaladoHoras', e.target.value)} style={styles.inputFlatNum} /></td>
                                        <td style={styles.td}><input type="number" value={comp.instaladoTsnCsn} onChange={e => handleComponenteChange(index, 'instaladoTsnCsn', e.target.value)} style={styles.inputFlatNum} /></td>
                                        
                                        {/* TG Planeador */}
                                        <td style={styles.td}><input type="number" value={comp.tgInstalacion} onChange={e => handleComponenteChange(index, 'tgInstalacion', e.target.value)} style={styles.inputFlatNum} /></td>
                                        <td style={styles.tdCalculated}>{retiroOhCalculado.toFixed(1)}</td>

                                        {/* Estado Componente */}
                                        <td style={styles.td}>
                                            <select value={comp.estadoTipo} onChange={e => handleComponenteChange(index, 'estadoTipo', e.target.value)} style={styles.selectFlat}>
                                                <option value="TSO">TSO</option>
                                                <option value="TSHMI">TSHMI</option>
                                                <option value="TSN">TSN</option>
                                            </select>
                                        </td>
                                        <td style={styles.td}><input type="number" value={comp.estadoActual} onChange={e => handleComponenteChange(index, 'estadoActual', e.target.value)} style={styles.inputFlatNum} /></td>

                                        {/* Disponibilidades */}
                                        <td style={styles.td}><input type="number" value={comp.dispHoras} onChange={e => handleComponenteChange(index, 'dispHoras', e.target.value)} style={{...styles.inputFlatNum, backgroundColor: '#e8f8f5'}} /></td>
                                        <td style={styles.td}><input type="number" value={comp.dispCal} onChange={e => handleComponenteChange(index, 'dispCal', e.target.value)} style={{...styles.inputFlatNum, backgroundColor: '#e8f8f5'}} /></td>
                                        <td style={styles.td}>
                                            <select value={comp.estadoUnidad} onChange={e => handleComponenteChange(index, 'estadoUnidad', e.target.value)} style={styles.selectFlatUnit}>
                                                <option value="H">H</option>
                                                <option value="C">C</option>
                                                <option value="M">M</option>
                                            </select>
                                        </td>

                                        <td style={{ textAlign: 'center', border: '1px solid #ccc' }}>
                                            <button onClick={() => removerFila(index)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
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

// 🏛️ ESTILOS MATRICIALES (ESTILO EXCEL / CONTROLADOR INDUSTRIAL)
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
    
    td: { border: '1px solid #ccc', padding: '3px' },
    tdCalculated: { border: '1px solid #ccc', padding: '3px', textAlign: 'right', fontWeight: 'bold', backgroundColor: '#f0f0f0' },
    
    // Inputs planos sin bordes redondeados ni sombras, estilo celda pura de datos
    inputFlat: { width: '70px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', outline: 'none' },
    inputFlatNum: { width: '60px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', textAlign: 'right', outline: 'none' },
    selectFlat: { padding: '2px', border: '1px solid #bbb', fontSize: '0.7rem', fontWeight: 'bold' },
    selectFlatUnit: { padding: '2px', border: '1px solid #bbb', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: '#fff2cc' },
    
    btnSecundario: { backgroundColor: '#27ae60', color: 'white', border: '1px solid #219653', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }
};

export default F16Page;