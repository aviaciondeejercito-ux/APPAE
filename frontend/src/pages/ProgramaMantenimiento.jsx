import React, { useState, useEffect } from 'react';
import { getAircrafts, getProgramaPorAeronave, guardarProgramaMantenimiento } from '../services/api'; 

const ProgramaMantenimiento = () => {
    const [aeronaves, setAeronaves] = useState([]);
    const [unidadesDisponibles, setUnidadesDisponibles] = useState([]); 
    const [loading, setLoading] = useState(true);

    const [unidadNavegacion, setUnidadNavegacion] = useState('');
    const [aeronaveSeleccionadaId, setAeronaveSeleccionadaId] = useState('');
    
    // Banderas de configuración estructural
    const [configAeronave, setConfigAeronave] = useState({
        esBimotor: false,
        tieneHelice: true
    });

    const [formData, setFormData] = useState({
        sda: '',
        matricula: '',
        nroSerie: '',
        tgPlaneadorActual: '0,0',
        tgMotorActual: '0,0',
        tgMotor2Actual: '0,0',
        tgHeliceActual: '0,0',
        tgHelice2Actual: '0,0'
    });

    // Tablas de Inspecciones
    const [tablaPlaneador, setTablaPlaneador] = useState([]);
    const [tablaMotor, setTablaMotor] = useState([]);
    const [tablaMotor2, setTablaMotor2] = useState([]);
    const [tablaHelice, setTablaHelice] = useState([]);
    const [tablaHelice2, setTablaHelice2] = useState([]);

    const usuarioSesion = {
        username: localStorage.getItem('username') || "Operador",
        role: (localStorage.getItem('role') || localStorage.getItem('rol') || 'USER').toUpperCase().trim(),
        elemento: (localStorage.getItem('elemento') || '').toUpperCase().trim()
    };

    const isMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OTOAE'].includes(usuarioSesion.role) || usuarioSesion.elemento === 'COMANDO';

    // Carga inicial de Flota
    useEffect(() => {
        const inicializarPanel = async () => {
            setLoading(true);
            try {
                const respuesta = await getAircrafts();
                let listaAviones = [];
                
                if (respuesta?.data?.data && Array.isArray(respuesta.data.data)) {
                    listaAviones = respuesta.data.data; 
                } else if (respuesta?.data && Array.isArray(respuesta.data)) {
                    listaAviones = respuesta.data;
                } else if (Array.isArray(respuesta)) {
                    listaAviones = respuesta;
                }
                
                setAeronaves(listaAviones);

                const unidadesUnicas = [...new Set(listaAviones.map(a => a.unidad?.trim().toUpperCase()).filter(Boolean))];
                setUnidadesDisponibles(unidadesUnicas);

                if (isMandoEstrategico) {
                    const unidadInicialAdmin = unidadesUnicas.includes(usuarioSesion.elemento) ? usuarioSesion.elemento : (unidadesUnicas[0] || 'B AV APY COMB 601');
                    setUnidadNavegacion(unidadInicialAdmin);
                } else {
                    setUnidadNavegacion(usuarioSesion.elemento);
                }
                
                setLoading(false);
            } catch (error) {
                console.error("❌ Error al inicializar flota:", error);
                setLoading(false);
            }
        };

        inicializarPanel();
    }, []);

    const aeronavesFiltradas = aeronaves.filter(a => 
        a.unidad && String(a.unidad).trim().toUpperCase() === unidadNavegacion.toUpperCase()
    );

    // Helpers para conversión numérica con coma/punto
    const parseNum = (val) => {
        if (!val) return 0;
        const clean = String(val).replace(',', '.').trim();
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    };

    const formatNum = (val) => String(val).replace('.', ',');

    // Motor de Cálculo Automático del Renglón
    const recalcularRenglon = (renglon, totalHsActual) => {
        const cop = { ...renglon };
        const totalHsNum = parseNum(totalHsActual);

        if (cop.tipoCriterio === 'HORAS') {
            const proxHsNum = parseNum(cop.proxHs);
            if (proxHsNum > 0) {
                const disp = proxHsNum - totalHsNum;
                cop.disp = `${formatNum(disp.toFixed(1))} Hs`;
            } else {
                cop.disp = '-';
            }
        } else if (cop.tipoCriterio === 'MESES') {
            const meses = parseInt(cop.intervaloMeses, 10) || 0;
            if (cop.ultFecha && meses > 0) {
                const fechaOrigen = new Date(cop.ultFecha);
                if (!isNaN(fechaOrigen.getTime())) {
                    fechaOrigen.setMonth(fechaOrigen.getMonth() + meses);
                    const yyyy = fechaOrigen.getFullYear();
                    const mm = String(fechaOrigen.getMonth() + 1).padStart(2, '0');
                    const dd = String(fechaOrigen.getDate()).padStart(2, '0');
                    cop.proxFecha = `${yyyy}-${mm}-${dd}`;
                    
                    // Cálculo de días/meses restantes
                    const hoy = new Date();
                    const diffTime = fechaOrigen - hoy;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    cop.disp = diffDays > 0 ? `${diffDays} Días` : `VENCIDA (${Math.abs(diffDays)}d)`;
                }
            }
        } else if (cop.tipoCriterio === 'FECHA') {
            if (cop.proxFecha) {
                const fechaLimite = new Date(cop.proxFecha);
                if (!isNaN(fechaLimite.getTime())) {
                    const hoy = new Date();
                    const diffTime = fechaLimite - hoy;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    cop.disp = diffDays > 0 ? `${diffDays} Días` : `VENCIDA (${Math.abs(diffDays)}d)`;
                }
            }
        }

        return cop;
    };

    // Cambio de Selección de Aeronave y Extracción de Totales
    const handleAeronaveChange = async (e) => {
        const id = e.target.value;
        setAeronaveSeleccionadaId(id);
        
        if (!id) {
            resetVistaLocal();
            return;
        }

        const avion = aeronaves.find(a => {
            const avionId = a._id?.$oid || a._id;
            return String(avionId) === String(id);
        });

        if (avion) {
            const esBim = avion.esBimotor || avion.cantidadMotores === 2 || Boolean(avion.motor2Tsn);
            const tieneHel = avion.tieneHelice !== false && avion.tipoPropulsion !== 'TURBOFAN' && avion.tipoPropulsion !== 'REACCION';

            setConfigAeronave({ esBimotor: esBim, tieneHelice: tieneHel });

            // Horas provenientes del modelo Aircraft (actualizadas vía F-13)
            const hsPlaneador = formatNum(avion.tgPlaneadorActual ?? avion.horasTotales ?? '0,0');
            const hsMotor1 = formatNum(avion.motor1Tsn ?? avion.motorTsn ?? '0,0');
            const hsMotor2 = formatNum(avion.motor2Tsn ?? '0,0');
            const hsHelice1 = formatNum(avion.helice1Tsn ?? avion.heliceTsn ?? '0,0');
            const hsHelice2 = formatNum(avion.helice2Tsn ?? '0,0');

            setFormData({
                sda: avion.sda || 'N/D',
                matricula: avion.matricula || 'N/D',
                nroSerie: avion.nroSerie || 'S/N', 
                tgPlaneadorActual: hsPlaneador, 
                tgMotorActual: hsMotor1,
                tgMotor2Actual: hsMotor2,
                tgHeliceActual: hsHelice1,
                tgHelice2Actual: hsHelice2
            });

            try {
                const res = await getProgramaPorAeronave(id);
                
                if (res?.data?.data) {
                    const prog = res.data.data;
                    
                    const mapTable = (lista, totalHs) => (lista || []).map(r => 
                        recalcularRenglon({ ...r, id: r._id || r.id || Date.now() + Math.random() }, totalHs)
                    );

                    setTablaPlaneador(mapTable(prog.programaPlaneador, hsPlaneador));
                    setTablaMotor(mapTable(prog.programaMotor, hsMotor1));
                    setTablaMotor2(mapTable(prog.programaMotor2, hsMotor2));
                    setTablaHelice(mapTable(prog.programaHelice, hsHelice1));
                    setTablaHelice2(mapTable(prog.programaHelice2, hsHelice2));
                } else {
                    limpiarTodasLasTablas();
                }
            } catch (error) {
                console.error("Error al recuperar programa de mantenimiento:", error);
                limpiarTodasLasTablas();
            }
        }
    };

    const limpiarTodasLasTablas = () => {
        setTablaPlaneador([]);
        setTablaMotor([]);
        setTablaMotor2([]);
        setTablaHelice([]);
        setTablaHelice2([]);
    };

    const resetVistaLocal = () => {
        setAeronaveSeleccionadaId('');
        setFormData({ sda: '', matricula: '', nroSerie: '', tgPlaneadorActual: '0,0', tgMotorActual: '0,0', tgMotor2Actual: '0,0', tgHeliceActual: '0,0', tgHelice2Actual: '0,0' });
        limpiarTodasLasTablas();
    };

    // Manejo genérico de cambio de celdas
    const handleCellChange = (tabla, setTabla, id, campo, valor, totalHs) => {
        setTabla(tabla.map(row => {
            if (row.id === id) {
                const actualizado = { ...row, [campo]: valor };
                return recalcularRenglon(actualizado, totalHs);
            }
            return row;
        }));
    };

    const agregarRenglon = (tabla, setTabla) => {
        setTabla([...tabla, {
            id: 'temp-' + Date.now() + Math.random(),
            descripcion: "",
            tipoCriterio: "HORAS",
            intervaloMeses: 0,
            ultHs: "",
            ultFecha: "",
            ultOt: "",
            proxHs: "",
            proxFecha: "",
            responsable: "Ec AE",
            disp: ""
        }]);
    };

    const guardarMantenimiento = async () => {
        if (!aeronaveSeleccionadaId) {
            alert("Error: Debe seleccionar una aeronave de la flota antes de guardar.");
            return;
        }

        const sanitizar = (lista) => (lista || []).map(r => {
            const copia = { ...r };
            if (copia.id && String(copia.id).startsWith('temp-')) delete copia.id;
            else if (copia.id) { copia._id = copia.id; delete copia.id; }
            return copia;
        });

        const payload = {
            aeronaveId: aeronaveSeleccionadaId,
            tgPlaneadorActual: formData.tgPlaneadorActual,
            tgMotorActual: formData.tgMotorActual,
            tgMotor2Actual: formData.tgMotor2Actual,
            tgHeliceActual: formData.tgHeliceActual,
            tgHelice2Actual: formData.tgHelice2Actual,
            programaPlaneador: sanitizar(tablaPlaneador),
            programaMotor: sanitizar(tablaMotor),
            programaMotor2: sanitizar(tablaMotor2),
            programaHelice: sanitizar(tablaHelice),
            programaHelice2: sanitizar(tablaHelice2),
            actualizadoPor: usuarioSesion.username
        };

        try {
            const respuesta = await guardarProgramaMantenimiento(payload);
            if (respuesta.status === 200 || respuesta.data?.status === "success") {
                alert(`📋 ¡Programa de mantenimiento de ${formData.matricula} sincronizado con éxito!`);
            }
        } catch (error) {
            console.error("Error al guardar el programa:", error);
            alert("Error al guardar el programa de mantenimiento.");
        }
    };

    // Renderizador de Tabla Reutilizable
    const renderTablaSeccion = (titulo, totalHs, tabla, setTabla, bgHeader = '#00a8ff') => (
        <div style={{ marginTop: '20px' }}>
            <div style={styles.sectionDivider}>
                <div style={{ ...styles.miniKpiExcel, backgroundColor: bgHeader }}>
                    <span style={styles.kpiLabel}>{titulo.toUpperCase()}:</span>
                    <input type="text" style={styles.kpiInputInline} value={totalHs} disabled readOnly />
                </div>
                <button style={styles.btnAddRow} onClick={() => agregarRenglon(tabla, setTabla)} disabled={!aeronaveSeleccionadaId}>
                    ➕ Agregar Inspección
                </button>
            </div>

            <div style={styles.tableWrapper}>
                <table style={styles.mantoTable}>
                    <thead>
                        <tr>
                            <th style={{ ...styles.th, width: '22%' }}>DESCRIPCIÓN</th>
                            <th style={{ ...styles.th, width: '10%' }}>CRITERIO</th>
                            <th style={{ ...styles.th, width: '9%' }}>ÚLT. HS</th>
                            <th style={{ ...styles.th, width: '10%' }}>ÚLT. FECHA</th>
                            <th style={{ ...styles.th, width: '8%' }}>OT</th>
                            <th style={{ ...styles.th, width: '10%' }}>PRÓX. HS / MESES</th>
                            <th style={{ ...styles.th, width: '10%' }}>PRÓX. FECHA</th>
                            <th style={{ ...styles.th, width: '9%' }}>RESPONSABLE</th>
                            <th style={{ ...styles.th, width: '9%' }}>DISP / REM.</th>
                            <th style={{ ...styles.th, width: '3%' }}>ACC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tabla.length === 0 ? (
                            <tr><td colSpan="10" style={styles.tdEmpty}>No hay inspecciones programadas.</td></tr>
                        ) : (
                            tabla.map((row) => (
                                <tr key={row.id} style={styles.tr}>
                                    <td style={styles.td}>
                                        <input type="text" style={styles.inputInCellBold} value={row.descripcion} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'descripcion', e.target.value, totalHs)} placeholder="Ej: Insp. 100 Hs / 12 Meses" />
                                    </td>
                                    <td style={styles.td}>
                                        <select style={styles.selectInCell} value={row.tipoCriterio || 'HORAS'} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'tipoCriterio', e.target.value, totalHs)}>
                                            <option value="HORAS">⏱️ Horas</option>
                                            <option value="FECHA">📅 Fecha Fija</option>
                                            <option value="MESES">📆 Mensual</option>
                                        </select>
                                    </td>
                                    <td style={styles.td}>
                                        <input type="text" style={styles.inputInCell} value={row.ultHs} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'ultHs', e.target.value, totalHs)} placeholder="0.0" />
                                    </td>
                                    <td style={styles.td}>
                                        <input type="date" style={styles.inputInCell} value={row.ultFecha} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'ultFecha', e.target.value, totalHs)} />
                                    </td>
                                    <td style={styles.td}>
                                        <input type="text" style={styles.inputInCell} value={row.ultOt} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'ultOt', e.target.value, totalHs)} />
                                    </td>
                                    <td style={styles.td}>
                                        {row.tipoCriterio === 'MESES' ? (
                                            <input type="number" style={styles.inputInCell} value={row.intervaloMeses || ''} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'intervaloMeses', e.target.value, totalHs)} placeholder="Meses (ej: 6)" />
                                        ) : (
                                            <input type="text" style={styles.inputInCell} value={row.proxHs} disabled={row.tipoCriterio === 'FECHA'} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'proxHs', e.target.value, totalHs)} placeholder="0.0" />
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        <input type="date" style={styles.inputInCell} value={row.proxFecha} disabled={row.tipoCriterio === 'MESES'} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'proxFecha', e.target.value, totalHs)} />
                                    </td>
                                    <td style={styles.td}>
                                        <input type="text" style={styles.inputInCell} value={row.responsable} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'responsable', e.target.value, totalHs)} />
                                    </td>
                                    <td style={styles.td}>
                                        <input type="text" style={{ ...styles.inputInCell, fontWeight: 'bold', color: String(row.disp).includes('VENCIDA') ? '#e74c3c' : '#27ae60' }} value={row.disp} readOnly />
                                    </td>
                                    <td style={styles.tdAction}>
                                        <button style={styles.btnDeleteRow} onClick={() => setTabla(tabla.filter(r => r.id !== row.id))}>✖</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (loading) return <div style={styles.loading}>📡 CONECTANDO CON EL REGISTRO MATRICIAL...</div>;

    return (
        <div style={styles.container}>
            {/* CABECERA Y SELECTORES */}
            <div style={styles.topHeaderBar}>
                <h2 style={styles.mainTitle}>SISTEMA DE GESTIÓN DE MANTENIMIENTO</h2>
                <button style={styles.btnSave} onClick={guardarMantenimiento} disabled={!aeronaveSeleccionadaId}>
                    💾 Guardar Cambios
                </button>
            </div>

            <div style={styles.selectorsBar}>
                <div style={styles.selectorGroup}>
                    <label style={styles.labelTitle}>📁 SU FLOTA ASIGNADA ({unidadNavegacion})</label>
                    <select style={styles.selectInputFlota} value={aeronaveSeleccionadaId} onChange={handleAeronaveChange}>
                        <option value="">-- Seleccione Aeronave --</option>
                        {aeronavesFiltradas.map(a => (
                            <option key={a._id?.$oid || a._id} value={a._id?.$oid || a._id}>
                                {a.matricula} - {a.sda}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* SECCIÓN 1: PLANEADOR */}
            {renderTablaSeccion('Total Planeador Actual', formData.tgPlaneadorActual, tablaPlaneador, setTablaPlaneador, '#00a8ff')}

            {/* SECCIÓN 2: MOTOR 1 Y MOTOR 2 */}
            {renderTablaSeccion('Total Motor #1 Actual', formData.tgMotorActual, tablaMotor, setTablaMotor, '#d35400')}
            {configAeronave.esBimotor && renderTablaSeccion('Total Motor #2 Actual', formData.tgMotor2Actual, tablaMotor2, setTablaMotor2, '#e67e22')}

            {/* SECCIÓN 3: HÉLICE 1 Y HÉLICE 2 */}
            {configAeronave.tieneHelice && renderTablaSeccion('Total Hélice #1 Actual', formData.tgHeliceActual, tablaHelice, setTablaHelice, '#27ae60')}
            {configAeronave.tieneHelice && configAeronave.esBimotor && renderTablaSeccion('Total Hélice #2 Actual', formData.tgHelice2Actual, tablaHelice2, setTablaHelice2, '#2ecc71')}
        </div>
    );
};

const styles = {
    container: { padding: '10px 20px', fontFamily: 'monospace, sans-serif' },
    topHeaderBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1b2a4a', padding: '10px 20px' },
    mainTitle: { color: '#fff', fontSize: '0.95rem', margin: 0 },
    btnSave: { backgroundColor: '#27ae60', color: '#fff', border: 'none', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' },
    selectorsBar: { background: '#eef2f5', padding: '10px', marginTop: '10px', border: '1px solid #ccc' },
    selectorGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
    labelTitle: { fontSize: '0.75rem', fontWeight: 'bold' },
    selectInputFlota: { padding: '6px', fontSize: '0.85rem', fontWeight: 'bold' },
    sectionDivider: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' },
    miniKpiExcel: { color: '#000', padding: '4px 10px', border: '1px solid #000', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 'bold', fontSize: '0.78rem' },
    kpiInputInline: { width: '80px', textAlign: 'center', fontWeight: 'bold', background: '#fff', border: '1px solid #000' },
    btnAddRow: { backgroundColor: '#2c3e50', color: '#fff', border: 'none', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' },
    tableWrapper: { overflowX: 'auto', border: '1px solid #000' },
    mantoTable: { width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' },
    th: { backgroundColor: '#34495e', color: '#fff', border: '1px solid #000', padding: '6px', textAlign: 'center' },
    tr: { backgroundColor: '#fff' },
    td: { border: '1px solid #000', padding: '0px' },
    tdAction: { border: '1px solid #000', textAlign: 'center' },
    tdEmpty: { padding: '15px', textAlign: 'center', color: '#7f8c8d' },
    inputInCell: { width: '100%', border: 'none', padding: '5px', textAlign: 'center', fontFamily: 'monospace', boxSizing: 'border-box' },
    inputInCellBold: { width: '100%', border: 'none', padding: '5px', fontWeight: 'bold', fontFamily: 'monospace', boxSizing: 'border-box' },
    selectInCell: { width: '100%', border: 'none', padding: '4px', fontSize: '0.75rem' },
    btnDeleteRow: { background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold' },
    loading: { padding: '20px', color: '#fff', background: '#1b2a4a', fontFamily: 'monospace' }
};

export default ProgramaMantenimiento;