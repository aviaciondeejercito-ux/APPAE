import React, { useState } from 'react';

const F16Page = () => {
    // 1. LISTADOS DE REFERENCIA (Sincronizados con tu sistema)
    const sdaList = ["UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "B206B3"];

    // 2. ESTADO INICIAL DEL FORMULARIO DE CABECERA
    const [cabecera, setCabecera] = useState({
        sda: 'B206B3',
        matricula: 'AE-365',
        nroSerie: '4550',
        inicioAeFecha: '2012-02-01', // Representa "Feb-12"
        inicioAeHs: 885.7,
        tgPlaneadorActual: 4030.1,
        motorSn: 'CAE-271029',
        motorTsn: 2409.4,
        motorCsnCso: 1573
    });

    // 3. ESTADO INICIAL DE LA TABLA DE COMPONENTES
    // Cargamos las dos primeras filas de tu imagen como mocks iniciales interactivos
    const [componentes, setComponentes] = useState([
        {
            nro: 1,
            ata: '62-99',
            pn: '206-011-100-107',
            componente: 'M/R HUB ASSEMBLY',
            sn: 'HB-1809',
            limitesValor: 2400,
            instaladoFecha: '2021-11-01',
            instaladoHoras: 0.0, // TSO de instalación
            instaladoTsnCsn: 2400.0,
            tgInstalacion: 2935.7
        },
        {
            nro: 2,
            ata: '62-99',
            pn: '206-011-149-105',
            componente: 'YOKE ASSEMBLY',
            sn: 'HB-2719',
            limitesValor: 2400,
            instaladoFecha: '2021-11-01',
            instaladoHoras: 0.0,
            instaladoTsnCsn: 2400.0,
            tgInstalacion: 2935.7
        }
    ]);

    // 4. CONTROLADORES DE CAMBIOS EN CABECERA
    const handleCabeceraChange = (field, val) => {
        setCabecera(prev => ({
            ...prev,
            [field]: field.includes('Hs') || field.includes('Actual') || field.includes('Tsn') || field.includes('CsnCso')
                ? Number(val) || 0
                : val
        }));
    };

    // 5. CONTROLADORES DE CAMBIOS EN TABLA DE COMPONENTES
    const handleComponenteChange = (index, field, val) => {
        const nuevosComponentes = [...componentes];
        nuevosComponentes[index][field] = field.includes('Valor') || field.includes('Horas') || field.includes('TsnCsn') || field.includes('tgInstalacion')
            ? Number(val) || 0
            : val;
        setComponentes(nuevosComponentes);
    };

    // Agregar nueva fila a la tabla
    const agregarFila = () => {
        const nuevoNro = componentes.length + 1;
        setComponentes(prev => [
            ...prev,
            {
                nro: nuevoNro,
                ata: '',
                pn: '',
                componente: '',
                sn: '',
                limitesValor: 0,
                instaladoFecha: '',
                instaladoHoras: 0,
                instaladoTsnCsn: 0,
                tgInstalacion: 0
            }
        ]);
    };

    // Quitar última fila
    const removerFila = (index) => {
        if (componentes.length === 1) return alert("Debe haber al menos un componente registrado.");
        const filtrados = componentes.filter((_, idx) => idx !== index).map((c, idx) => ({ ...c, nro: idx + 1 }));
        setComponentes(filtrados);
    };

    const handleGuardarMock = () => {
        console.log("F-16 Payload listo para el controlador:", { ...cabecera, componentes });
        alert("¡Estructura validada! Datos listos en consola. Ya podés guardar este modelo.");
    };

    return (
        <div style={styles.container}>
            {/* ENCABEZADO PRINCIPAL DE LA VISTA */}
            <div style={styles.mainHeader}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>📋 Ficha Historial de Planeador y Componentes (F-16)</h2>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#bdc3c7' }}>Inspección, control de tiempos de vida útil y trazabilidad de material aéreo.</p>
            </div>

            {/* SECCIÓN 1: PANEL DE CONTROL Y CABECERA DEL DOCUMENTO */}
            <div style={styles.cardCabecera}>
                <div style={styles.headerGrid}>
                    
                    {/* Bloque Izquierdo: Identificación */}
                    <div style={styles.block}>
                        <h4 style={styles.blockTitle}>Aeronave</h4>
                        <div style={styles.formRow}>
                            <div style={styles.field}>
                                <label style={styles.label}>Sistemas de Armas</label>
                                <select value={cabecera.sda} onChange={e => handleCabeceraChange('sda', e.target.value)} style={styles.input}>
                                    {sdaList.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Matrícula</label>
                                <input type="text" value={cabecera.matricula} onChange={e => handleCabeceraChange('matricula', e.target.value)} style={styles.input} />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Nro Serie</label>
                                <input type="text" value={cabecera.nroSerie} onChange={e => handleCabeceraChange('nroSerie', e.target.value)} style={styles.input} />
                            </div>
                        </div>
                    </div>

                    {/* Bloque Medio: Tiempos Planeador */}
                    <div style={styles.block}>
                        <h4 style={styles.blockTitle}>Historial / Tiempos Planeador</h4>
                        <div style={styles.formRow}>
                            <div style={styles.field}>
                                <label style={styles.label}>Inicio AE (Fecha)</label>
                                <input type="date" value={cabecera.inicioAeFecha} onChange={e => handleCabeceraChange('inicioAeFecha', e.target.value)} style={styles.input} />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Inicio AE (Horas Iniciales)</label>
                                <input type="number" step="0.1" value={cabecera.inicioAeHs} onChange={e => handleCabeceraChange('inicioAeHs', e.target.value)} style={styles.input} />
                            </div>
                            <div style={styles.field}>
                                <label style={{...styles.label, color: '#e67e22'}}>TG Planeador Actual</label>
                                <input type="number" step="0.1" value={cabecera.tgPlaneadorActual} onChange={e => handleCabeceraChange('tgPlaneadorActual', e.target.value)} style={{...styles.input, border: '1px solid #e67e22', backgroundColor: '#fdf6e2', fontWeight: 'bold'}} />
                            </div>
                        </div>
                    </div>

                    {/* Bloque Derecho: Planta Motriz */}
                    <div style={styles.block}>
                        <h4 style={styles.blockTitle}>Grupo Motopropulsor</h4>
                        <div style={styles.formRow}>
                            <div style={styles.field}>
                                <label style={styles.label}>Motor S/N</label>
                                <input type="text" value={cabecera.motorSn} onChange={e => handleCabeceraChange('motorSn', e.target.value)} style={styles.input} />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>TSN (hs)</label>
                                <input type="number" step="0.1" value={cabecera.motorTsn} onChange={e => handleCabeceraChange('motorTsn', e.target.value)} style={styles.input} />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>CSN / CSO</label>
                                <input type="number" value={cabecera.motorCsnCso} onChange={e => handleCabeceraChange('motorCsnCso', e.target.value)} style={styles.input} />
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* SECCIÓN 2: PLANILLA DINÁMICA DE COMPONENTES */}
            <div style={styles.cardTable}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1b3a57' }}>⚙️ Componentes del Planeador en Servicio</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={agregarFila} style={styles.btnSecundario}>➕ Agregar Item</button>
                        <button onClick={handleGuardarMock} style={styles.btnPrimario}>💾 Validar Formulario</button>
                    </div>
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
                                <th rowSpan="2" style={styles.th}>Límites (TBO)</th>
                                <th colSpan="3" style={styles.thGroup}>Instalado Con</th>
                                <th colSpan="2" style={styles.thGroup}>TG Planeador</th>
                                <th colSpan="2" style={styles.thGroup}>Estado de Componente</th>
                                <th rowSpan="2" style={styles.th}></th>
                            </tr>
                            <tr style={styles.thRow}>
                                <th style={styles.thSub}>Fecha Fab/UI</th>
                                <th style={styles.thSub}>Tiempos (TSO)</th>
                                <th style={styles.thSub}>TSN / CSN</th>
                                <th style={styles.thSub}>A Instal.</th>
                                <th style={{...styles.thSub, backgroundColor: '#e2f0d9', color: '#1e4620'}}>Retiro / OH</th>
                                <th style={styles.thSub}>TSO Actual</th>
                                <th style={{...styles.thSub, backgroundColor: '#fff2cc', color: '#7f6000'}}>Disp. (Rem)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {componentes.map((comp, index) => {
                                // 🧮 CÁLCULOS LOGICOS MATEMÁTICOS EN TIEMPO REAL
                                const limiteTbo = Number(comp.limitesValor) || 0;
                                const tgInstal = Number(comp.tgInstalacion) || 0;
                                const tsoInstalacion = Number(comp.instaladoHoras) || 0;
                                const tgActual = Number(cabecera.tgPlaneadorActual) || 0;

                                // 1. Retiro/OH = TG Instalación + TBO
                                const retiroOh = tgInstal + limiteTbo;

                                // 2. TSO Actual = TSO de instalación + (TG Planeador Actual - TG Instalación)
                                const tsoActual = tsoInstalacion + (tgActual - tgInstal);

                                // 3. Disponibilidad = Límite (TBO) - TSO Actual
                                const disp = limiteTbo - tsoActual;

                                // Alerta visual de bajo remanente (menos de 100 horas)
                                const esCritico = disp < 100;

                                return (
                                    <tr key={comp.nro} style={styles.tr}>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold', width: '30px' }}>{comp.nro}</td>
                                        <td><input type="text" value={comp.ata} onChange={e => handleComponenteChange(index, 'ata', e.target.value)} style={styles.inputTable} placeholder="62-99" /></td>
                                        <td><input type="text" value={comp.pn} onChange={e => handleComponenteChange(index, 'pn', e.target.value)} style={styles.inputTable} placeholder="P/N" /></td>
                                        <td><input type="text" value={comp.componente} onChange={e => handleComponenteChange(index, 'componente', e.target.value)} style={{...styles.inputTable, width: '160px'}} placeholder="Descripción" /></td>
                                        <td><input type="text" value={comp.sn} onChange={e => handleComponenteChange(index, 'sn', e.target.value)} style={styles.inputTable} placeholder="S/N" /></td>
                                        <td>
                                            <div style={styles.inputGroupTable}>
                                                <span style={styles.preInput}>hs</span>
                                                <input type="number" value={comp.limitesValor} onChange={e => handleComponenteChange(index, 'limitesValor', e.target.value)} style={styles.inputTableNum} />
                                            </div>
                                        </td>

                                        {/* INSTALADO CON */}
                                        <td><input type="date" value={comp.instaladoFecha} onChange={e => handleComponenteChange(index, 'instaladoFecha', e.target.value)} style={styles.inputTableDate} /></td>
                                        <td>
                                            <div style={styles.inputGroupTable}>
                                                <span style={styles.preInput}>TSO</span>
                                                <input type="number" step="0.1" value={comp.instaladoHoras} onChange={e => handleComponenteChange(index, 'instaladoHoras', e.target.value)} style={styles.inputTableNum} />
                                            </div>
                                        </td>
                                        <td><input type="number" step="0.1" value={comp.instaladoTsnCsn} onChange={e => handleComponenteChange(index, 'instaladoTsnCsn', e.target.value)} style={styles.inputTableNum} /></td>

                                        {/* TG PLANEADOR */}
                                        <td><input type="number" step="0.1" value={comp.tgInstalacion} onChange={e => handleComponenteChange(index, 'tgInstalacion', e.target.value)} style={styles.inputTableNum} /></td>
                                        <td style={styles.tdCalculated}>{retiroOh.toFixed(1)} h</td>

                                        {/* ESTADOS CALCULADOS */}
                                        <td style={styles.tdCalculated}>{tsoActual.toFixed(1)} h</td>
                                        <td style={{
                                            ...styles.tdCalculated, 
                                            backgroundColor: esCritico ? '#fadbd8' : '#d4efdf',
                                            color: esCritico ? '#c0392b' : '#27ae60',
                                            fontWeight: 'bold'
                                        }}>
                                            {disp.toFixed(1)} h
                                        </td>
                                        
                                        <td style={{ textAlign: 'center' }}>
                                            <button onClick={() => removerFila(index)} style={styles.btnDelete}>🗑️</button>
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

// 🎨 HOJA DE ESTILOS LIMPIA Y TÁCTICA
const styles = {
    container: { padding: '20px', maxWidth: '100%', margin: '0 auto', backgroundColor: '#f4f6f9', minHeight: '100vh' },
    mainHeader: { backgroundColor: '#1b3a57', color: 'white', padding: '15px 25px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    cardCabecera: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #e1e8ed' },
    headerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' },
    block: { borderRight: '1px solid #f0f2f5', paddingRight: '15px' },
    blockTitle: { margin: '0 0 12px 0', fontSize: '0.9rem', color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    formRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    field: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '90px' },
    label: { fontSize: '0.7rem', fontWeight: 'bold', color: '#7f8c8d', textTransform: 'uppercase' },
    input: { padding: '8px 10px', borderRadius: '4px', border: '1px solid #bdc3c7', fontSize: '0.8rem', outline: 'none', width: '100%' },
    
    // Tabla y Componentes
    cardTable: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e1e8ed' },
    tableResponsive: { width: '100%', overflowX: 'auto', marginTop: '10px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' },
    thRow: { backgroundColor: '#f8f9fa' },
    th: { border: '1px solid #dee2e6', padding: '8px', color: '#1b3a57', fontWeight: 'bold', textAlign: 'center', fontSize: '0.75rem' },
    thGroup: { border: '1px solid #dee2e6', padding: '6px', backgroundColor: '#e9ecef', color: '#495057', fontWeight: 'bold', textAlign: 'center', fontSize: '0.7rem', textTransform: 'uppercase' },
    thSub: { border: '1px solid #dee2e6', padding: '6px', textAlign: 'center', fontSize: '0.65rem', color: '#555' },
    tr: { borderBottom: '1px solid #dee2e6', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f8f9fa' } },
    inputTable: { padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.75rem', width: '90px', outline: 'none' },
    inputTableNum: { padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.75rem', width: '60px', outline: 'none', textAlign: 'right' },
    inputTableDate: { padding: '5px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.7rem', width: '105px', outline: 'none' },
    
    inputGroupTable: { display: 'flex', alignItems: 'center', gap: '2px' },
    preInput: { fontSize: '0.6rem', color: '#7f8c8d', fontWeight: 'bold' },
    tdCalculated: { padding: '8px', textAlign: 'right', fontWeight: '500', border: '1px solid #dee2e6' },
    
    // Botonera
    btnPrimario: { backgroundColor: '#1e3799', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' },
    btnSecundario: { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' },
    btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }
};

export default F16Page;