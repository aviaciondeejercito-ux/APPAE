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

    // Adaptamos el mock de datos a la nueva estructura de doble celda e indicadores
    const [componentes, setComponentes] = useState([
        {
            nro: 1,
            ata: '62-99',
            pn: '206-011-100-107',
            componente: 'M/R HUB ASSEMBLY',
            sn: 'HB-1809',
            limiteTipo: 'TBO', // TBO o LL
            limiteHoras: 2400,  // Casillero Superior
            limiteCal: '2028-11-01', // Casillero Inferior (Calendario)
            instaladoFecha: '2021-11-01', // Fab/UI Compacto
            instaladoHoras: 0.0,
            instaladoTsnCsn: 2400.0,
            tgInstalacion: 2935.7,
            estadoTipo: 'TSO', // TSO, TSHMI, TSN
            estadoActual: 1094.4,
            dispSuperior: 1305.6, // Disponible Arriba
            dispInferior: 1200.0, // Disponible Abajo
            estadoUnidad: 'H' // H, C, M
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
                dispSuperior: 0, dispInferior: 0, estadoUnidad: 'H'
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
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>📋 Ficha Historial de Planeador y Componentes (F-16)</h2>
            </div>

            {/* CABECERA (Se mantiene idéntica) */}
            <div style={styles.cardCabecera}>
                <div style={styles.headerGrid}>
                    <div style={styles.block}>
                        <h4 style={styles.blockTitle}>Aeronave</h4>
                        <div style={styles.formRow}>
                            <div style={styles.field}><label style={styles.label}>SdA</label>
                                <select value={cabecera.sda} onChange={e => handleCabeceraChange('sda', e.target.value)} style={styles.input}>{sdaList.map(s => <option key={s} value={s}>{s}</option>)}</select>
                            </div>
                            <div style={styles.field}><label style={styles.label}>Matrícula</label><input type="text" value={cabecera.matricula} onChange={e => handleCabeceraChange('matricula', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>Nro Serie</label><input type="text" value={cabecera.nroSerie} onChange={e => handleCabeceraChange('nroSerie', e.target.value)} style={styles.input} /></div>
                        </div>
                    </div>
                    <div style={styles.block}>
                        <h4 style={styles.blockTitle}>Historial Planeador</h4>
                        <div style={styles.formRow}>
                            <div style={styles.field}><label style={styles.label}>Inicio AE</label><input type="date" value={cabecera.inicioAeFecha} onChange={e => handleCabeceraChange('inicioAeFecha', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>Hs Iniciales</label><input type="number" value={cabecera.inicioAeHs} onChange={e => handleCabeceraChange('inicioAeHs', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={{...styles.label, color: '#e67e22'}}>TG Plan Actual</label><input type="number" value={cabecera.tgPlaneadorActual} onChange={e => handleCabeceraChange('tgPlaneadorActual', e.target.value)} style={{...styles.input, backgroundColor: '#fdf6e2', fontWeight: 'bold'}} /></div>
                        </div>
                    </div>
                    <div style={styles.block}>
                        <h4 style={styles.blockTitle}>Planta Motriz</h4>
                        <div style={styles.formRow}>
                            <div style={styles.field}><label style={styles.label}>S/N</label><input type="text" value={cabecera.motorSn} onChange={e => handleCabeceraChange('motorSn', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>TSN</label><input type="number" value={cabecera.motorTsn} onChange={e => handleCabeceraChange('motorTsn', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>CSN/CSO</label><input type="number" value={cabecera.motorCsnCso} onChange={e => handleCabeceraChange('motorCsnCso', e.target.value)} style={styles.input} /></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLA MEJORADA ULTRA-FIEL A LA IMAGEN */}
            <div style={styles.cardTable}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1b3a57' }}>⚙️ Control de Componentes</h3>
                    <button onClick={agregarFila} style={styles.btnSecundario}>➕ Agregar Item</button>
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
                                <th rowSpan="2" style={{...styles.th, minWidth: '120px'}}>Límites</th>
                                <th colSpan="3" style={styles.thGroup}>Instalado Con</th>
                                <th colSpan="2" style={styles.thGroup}>TG Planeador</th>
                                <th colSpan="2" style={styles.thGroup}>Estado de Componente</th>
                                <th rowSpan="2" style={styles.th}></th>
                            </tr>
                            <tr style={styles.thRow}>
                                <th style={{...styles.thSub, width: '70px', backgroundColor: '#f5f5f5'}}>Fab/UI</th>
                                <th style={styles.thSub}>Tiempos/Ciclos</th>
                                <th style={styles.thSub}>TSN/CSN</th>
                                <th style={styles.thSub}>a Instal</th>
                                <th style={styles.thSub}>Retiro/OH</th>
                                <th style={styles.thSub}>Tiempos/Ciclos</th>
                                <th style={{...styles.thSub, minWidth: '90px'}}>Disp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {componentes.map((comp, index) => (
                                <tr key={comp.nro} style={styles.tr}>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{comp.nro}</td>
                                    <td><input type="text" value={comp.ata} onChange={e => handleComponenteChange(index, 'ata', e.target.value)} style={styles.inputTableCompact} placeholder="62-99" /></td>
                                    <td><input type="text" value={comp.pn} onChange={e => handleComponenteChange(index, 'pn', e.target.value)} style={{...styles.inputTableCompact, width: '110px'}} placeholder="P/N" /></td>
                                    <td><input type="text" value={comp.componente} onChange={e => handleComponenteChange(index, 'componente', e.target.value)} style={{...styles.inputTableCompact, width: '150px'}} placeholder="Descripción" /></td>
                                    <td><input type="text" value={comp.sn} onChange={e => handleComponenteChange(index, 'sn', e.target.value)} style={styles.inputTableCompact} placeholder="S/N" /></td>
                                    
                                    {/* CELDA LÍMITES: Selector + Doble fila interna */}
                                    <td>
                                        <div style={styles.cellFlex}>
                                            <select value={comp.limiteTipo} onChange={e => handleComponenteChange(index, 'limiteTipo', e.target.value)} style={styles.selectInline}>
                                                <option value="TBO">TBO</option>
                                                <option value="LL">LL</option>
                                            </select>
                                            <div style={styles.doubleStack}>
                                                <input type="number" placeholder="Horas" value={comp.limiteHoras} onChange={e => handleComponenteChange(index, 'limiteHoras', e.target.value)} style={styles.inputStack} />
                                                <input type="text" placeholder="Calendario" value={comp.limiteCal} onChange={e => handleComponenteChange(index, 'limiteCal', e.target.value)} style={styles.inputStack} />
                                            </div>
                                        </div>
                                    </td>

                                    {/* CELDA FAB/UI: Ultra reducida */}
                                    <td style={{backgroundColor: '#fafafa'}}>
                                        <input type="text" value={comp.instaladoFecha} onChange={e => handleComponenteChange(index, 'instaladoFecha', e.target.value)} style={styles.inputTableMin} placeholder="Nov-21" />
                                    </td>

                                    <td><input type="number" value={comp.instaladoHoras} onChange={e => handleComponenteChange(index, 'instaladoHoras', e.target.value)} style={styles.inputTableCompact} /></td>
                                    <td><input type="number" value={comp.instaladoTsnCsn} onChange={e => handleComponenteChange(index, 'instaladoTsnCsn', e.target.value)} style={styles.inputTableCompact} /></td>
                                    <td><input type="number" value={comp.tgInstalacion} onChange={e => handleComponenteChange(index, 'tgInstalacion', e.target.value)} style={styles.inputTableCompact} /></td>
                                    <td style={{textAlign: 'center', fontWeight: '500'}}>{(Number(comp.tgInstalacion) + Number(comp.limiteHoras)).toFixed(1)}</td>

                                    {/* CELDA ESTADO COMPONENTE: Selector Tipo + Campo numérico */}
                                    <td>
                                        <div style={styles.cellFlex}>
                                            <select value={comp.estadoTipo} onChange={e => handleComponenteChange(index, 'estadoTipo', e.target.value)} style={styles.selectInline}>
                                                <option value="TSO">TSO</option>
                                                <option value="TSHMI">TSHMI</option>
                                                <option value="TSN">TSN</option>
                                            </select>
                                            <input type="number" value={comp.estadoActual} onChange={e => handleComponenteChange(index, 'estadoActual', e.target.value)} style={{...styles.inputTableCompact, width: '60px'}} />
                                        </div>
                                    </td>

                                    {/* CELDA DISPONIBILIDAD: Doble renglón + Selector final H, C, M */}
                                    <td>
                                        <div style={styles.cellFlex}>
                                            <div style={styles.doubleStack}>
                                                <input type="number" placeholder="Disp 1" value={comp.dispSuperior} onChange={e => handleComponenteChange(index, 'dispSuperior', e.target.value)} style={{...styles.inputStack, backgroundColor: '#e2f0d9'}} />
                                                <input type="number" placeholder="Disp 2" value={comp.dispInferior} onChange={e => handleComponenteChange(index, 'dispInferior', e.target.value)} style={{...styles.inputStack, backgroundColor: '#e2f0d9'}} />
                                            </div>
                                            <select value={comp.estadoUnidad} onChange={e => handleComponenteChange(index, 'estadoUnidad', e.target.value)} style={styles.selectUnit}>
                                                <option value="H">H</option>
                                                <option value="C">C</option>
                                                <option value="M">M</option>
                                            </select>
                                        </div>
                                    </td>

                                    <td style={{ textAlign: 'center' }}><button onClick={() => removerFila(index)} style={{background:'none', border:'none', cursor:'pointer'}}>🗑️</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '15px', backgroundColor: '#f4f6f9', minHeight: '100vh' },
    mainHeader: { backgroundColor: '#1b3a57', color: 'white', padding: '12px 20px', borderRadius: '6px', marginBottom: '15px' },
    cardCabecera: { backgroundColor: 'white', padding: '15px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #dee2e6' },
    headerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' },
    block: { borderRight: '1px solid #eee', paddingRight: '10px' },
    blockTitle: { margin: '0 0 8px 0', fontSize: '0.8rem', color: '#1b3a57', borderBottom: '2px solid #3498db', paddingBottom: '2px' },
    formRow: { display: 'flex', gap: '8px' },
    field: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
    label: { fontSize: '0.65rem', fontWeight: 'bold', color: '#7f8c8d' },
    input: { padding: '6px', borderRadius: '4px', border: '1px solid #bdc3c7', fontSize: '0.75rem' },
    cardTable: { backgroundColor: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6' },
    tableResponsive: { width: '100%', overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
    thRow: { backgroundColor: '#f8f9fa' },
    th: { border: '1px solid #dee2e6', padding: '6px', color: '#1b3a57', fontWeight: 'bold', fontSize: '0.7rem' },
    thGroup: { border: '1px solid #dee2e6', padding: '4px', backgroundColor: '#e9ecef', fontSize: '0.7rem', fontWeight: 'bold', textAlign: 'center' },
    thSub: { border: '1px solid #dee2e6', padding: '4px', textAlign: 'center', fontSize: '0.65rem' },
    tr: { borderBottom: '1px solid #dee2e6' },
    
    // Controles inline compactos estilo Excel
    inputTableCompact: { padding: '4px', borderRadius: '3px', border: '1px solid #ccc', fontSize: '0.75rem', width: '75px', outline: 'none' },
    inputTableMin: { padding: '4px', borderRadius: '3px', border: '1px solid #ccc', fontSize: '0.7rem', width: '55px', textAlign: 'center', outline: 'none' },
    
    // Maquetación estructural de Doble Renglón Interno
    cellFlex: { display: 'flex', alignItems: 'center', gap: '4px' },
    selectInline: { padding: '4px 2px', borderRadius: '3px', border: '1px solid #bbb', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: '#f0f0f0' },
    selectUnit: { padding: '8px 2px', borderRadius: '3px', border: '1px solid #bbb', fontSize: '0.75rem', fontWeight: 'bold' },
    doubleStack: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
    inputStack: { padding: '2px 4px', borderRadius: '2px', border: '1px solid #ddd', fontSize: '0.7rem', width: '100%', minWidth: '65px', outline: 'none' },
    
    btnSecundario: { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }
};

export default F16Page;