import React, { useState, useEffect } from 'react';
import { getAircrafts, getProgramaPorAeronave, guardarProgramaMantenimiento, guardarAeronave } from '../services/api'; 

const ProgramaMantenimiento = () => {
    const [aeronaves, setAeronaves] = useState([]);
    const [unidadesDisponibles, setUnidadesDisponibles] = useState([]); 
    const [loading, setLoading] = useState(true);

    const [unidadNavegacion, setUnidadNavegacion] = useState('');
    const [aeronaveSeleccionadaId, setAeronaveSeleccionadaId] = useState('');
    
    // Almacena el objeto completo de la aeronave seleccionada (para compPlaneador, motores, helices)
    const [aeronaveData, setAeronaveData] = useState(null);

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

    // -------------------------------------------------------------
    // ESTADOS PARA EDICIÓN DINÁMICA DE COMPONENTES (AIRCRAFT SCHEMA)
    // -------------------------------------------------------------
    const [grupoComponente, setGrupoComponente] = useState('compPlaneador'); // 'compPlaneador' | 'motores' | 'helices'
    const [subIndiceGrupo, setSubIndiceGrupo] = useState(0); // 0 para Motor/Hélice 1, 1 para Motor/Hélice 2
    const [componenteIndex, setComponenteIndex] = useState('');
    const [compEdit, setCompEdit] = useState(null);

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

    // ⏱️ Motor de Cálculo Automático del Renglón con Cómputo Dinámico de Descuento
    const recalcularRenglon = (renglon, totalHsActual) => {
        const cop = { ...renglon };
        const totalHsNum = parseNum(totalHsActual);

        if (cop.tipoCriterio === 'HORAS') {
            const ultHsNum = parseNum(cop.ultHs);
            const intervaloHsNum = parseNum(cop.intervaloHs);
            
            // Si tiene intervalo y última hora, calculamos la próxima vencimiento
            let proxHsNum = parseNum(cop.proxHs);
            if (intervaloHsNum > 0 && ultHsNum > 0 && !cop.proxHsManual) {
                proxHsNum = ultHsNum + intervaloHsNum;
                cop.proxHs = formatNum(proxHsNum.toFixed(1));
            }

            if (proxHsNum > 0) {
                const disp = proxHsNum - totalHsNum;
                if (disp <= 0) {
                    cop.disp = `🛑 VENCIDA (${formatNum(disp.toFixed(1))} Hs)`;
                } else if (disp <= 10) {
                    cop.disp = `⚠️ ${formatNum(disp.toFixed(1))} Hs`;
                } else {
                    cop.disp = `✔️ ${formatNum(disp.toFixed(1))} Hs`;
                }
            } else {
                cop.disp = '-';
            }
        } else if (cop.tipoCriterio === 'MESES') {
            const meses = parseInt(cop.intervaloMeses, 10) || 0;
            if (cop.ultFecha && meses > 0) {
                const fechaOrigen = new Date(cop.ultFecha);
                if (!isNaN(fechaOrigen.getTime())) {
                    const fechaLimite = new Date(fechaOrigen);
                    fechaLimite.setMonth(fechaLimite.getMonth() + meses);
                    const yyyy = fechaLimite.getFullYear();
                    const mm = String(fechaLimite.getMonth() + 1).padStart(2, '0');
                    const dd = String(fechaLimite.getDate()).padStart(2, '0');
                    cop.proxFecha = `${yyyy}-${mm}-${dd}`;
                    
                    const hoy = new Date();
                    const diffTime = fechaLimite - hoy;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 0) {
                        cop.disp = `🛑 VENCIDA (${Math.abs(diffDays)}d)`;
                    } else if (diffDays <= 15) {
                        cop.disp = `⚠️ ${diffDays} Días`;
                    } else {
                        cop.disp = `✔️ ${diffDays} Días`;
                    }
                }
            }
        } else if (cop.tipoCriterio === 'FECHA') {
            if (cop.proxFecha) {
                const fechaLimite = new Date(cop.proxFecha);
                if (!isNaN(fechaLimite.getTime())) {
                    const hoy = new Date();
                    const diffTime = fechaLimite - hoy;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 0) {
                        cop.disp = `🛑 VENCIDA (${Math.abs(diffDays)}d)`;
                    } else if (diffDays <= 15) {
                        cop.disp = `⚠️ ${diffDays} Días`;
                    } else {
                        cop.disp = `✔️ ${diffDays} Días`;
                    }
                }
            }
        }

        return cop;
    };

    // Cambio de Selección de Aeronave y Extracción de Totales
    const handleAeronaveChange = async (e) => {
        const id = e.target.value;
        setAeronaveSeleccionadaId(id);
        resetSeleccionComponente();
        
        if (!id) {
            resetVistaLocal();
            return;
        }

        const avion = aeronaves.find(a => {
            const avionId = a._id?.$oid || a._id;
            return String(avionId) === String(id);
        });

        if (avion) {
            setAeronaveData(JSON.parse(JSON.stringify(avion)));

            const esBim = avion.esBimotor || avion.cantidadMotores === 2 || Boolean(avion.motor2Tsn);
            const tieneHel = avion.tieneHelice !== false && avion.tipoPropulsion !== 'TURBOFAN' && avion.tipoPropulsion !== 'REACCION';

            setConfigAeronave({ esBimotor: esBim, tieneHelice: tieneHel });

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
        setAeronaveData(null);
        setFormData({ sda: '', matricula: '', nroSerie: '', tgPlaneadorActual: '0,0', tgMotorActual: '0,0', tgMotor2Actual: '0,0', tgHeliceActual: '0,0', tgHelice2Actual: '0,0' });
        limpiarTodasLasTablas();
        resetSeleccionComponente();
    };

    // -------------------------------------------------------------
    // LÓGICA DE GESTIÓN Y EDICIÓN DE COMPONENTES INDIVIDUALES
    // -------------------------------------------------------------
    const resetSeleccionComponente = () => {
        setComponenteIndex('');
        setCompEdit(null);
    };

    const getListaComponentesActual = () => {
        if (!aeronaveData) return [];
        if (grupoComponente === 'compPlaneador') {
            return aeronaveData.compPlaneador || [];
        } else if (grupoComponente === 'motores') {
            return aeronaveData.motores?.[subIndiceGrupo]?.componentes || [];
        } else if (grupoComponente === 'helices') {
            return aeronaveData.helices?.[subIndiceGrupo]?.componentes || [];
        }
        return [];
    };

    const handleComponenteSelect = (e) => {
        const idx = e.target.value;
        setComponenteIndex(idx);
        if (idx !== '') {
            const lista = getListaComponentesActual();
            setCompEdit(JSON.parse(JSON.stringify(lista[idx])));
        } else {
            setCompEdit(null);
        }
    };

    const handleCompFieldChange = (campo, valor) => {
        setCompEdit(prev => ({ ...prev, [campo]: valor }));
    };

    const handleCompNestedArrayChange = (arrayName, idx, campo, valor) => {
        setCompEdit(prev => {
            const copiaArray = [...(prev[arrayName] || [])];
            copiaArray[idx] = { ...copiaArray[idx], [campo]: valor };
            return { ...prev, [arrayName]: copiaArray };
        });
    };

    const handleAplicarCambioComponenteLocal = () => {
        if (componenteIndex === '' || !compEdit || !aeronaveData) return;

        const copiaAeronave = JSON.parse(JSON.stringify(aeronaveData));
        const idx = parseInt(componenteIndex, 10);

        if (grupoComponente === 'compPlaneador') {
            if (!copiaAeronave.compPlaneador) copiaAeronave.compPlaneador = [];
            copiaAeronave.compPlaneador[idx] = compEdit;
        } else if (grupoComponente === 'motores') {
            if (copiaAeronave.motores?.[subIndiceGrupo]) {
                copiaAeronave.motores[subIndiceGrupo].componentes[idx] = compEdit;
            }
        } else if (grupoComponente === 'helices') {
            if (copiaAeronave.helices?.[subIndiceGrupo]) {
                copiaAeronave.helices[subIndiceGrupo].componentes[idx] = compEdit;
            }
        }

        setAeronaveData(copiaAeronave);
        alert(`✔️ Componente "${compEdit.componente || 'Nº' + compEdit.nro}" actualizado localmente.`);
    };

    // Manejo de Tablas de Inspección
    const handleCellChange = (tabla, setTabla, id, campo, valor, totalHs) => {
        setTabla(tabla.map(row => {
            if (row.id === id) {
                const actualizado = { ...row, [campo]: valor };
                if (campo === 'proxHs') {
                    actualizado.proxHsManual = true;
                }
                return recalcularRenglon(actualizado, totalHs);
            }
            return row;
        }));
    };

    const agregarRenglon = (tabla, setTabla) => {
        setTabla([...tabla, {
            id: 'temp-' + Date.now() + Math.random(),
            componenteRef: '',
            componenteNombre: '',
            descripcion: '',
            tipoCriterio: "HORAS",
            intervaloHs: "200",
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

    // Guardado Global del Programa y Componentes
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

        const payloadPrograma = {
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
            await guardarProgramaMantenimiento(payloadPrograma);

            if (aeronaveData && guardarAeronave) {
                await guardarAeronave(aeronaveData);
            }

            alert(`📋 ¡Programa e Histórico de Componentes de ${formData.matricula} sincronizados con éxito!`);
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("❌ Ocurrió un error al guardar la información.");
        }
    };

    // Renderizador de Tabla Reutilizable con Selector de Componentes
    const renderTablaSeccion = (titulo, totalHs, tabla, setTabla, bgHeader = '#00a8ff', componentesSeccion = []) => (
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
                            <th style={{ ...styles.th, width: '20%' }}>COMPONENTE (BD) / DESCRIPCIÓN</th>
                            <th style={{ ...styles.th, width: '8%' }}>CRITERIO</th>
                            <th style={{ ...styles.th, width: '8%' }}>ÚLT. HS</th>
                            <th style={{ ...styles.th, width: '8%' }}>INT. (HS)</th>
                            <th style={{ ...styles.th, width: '9%' }}>ÚLT. FECHA</th>
                            <th style={{ ...styles.th, width: '7%' }}>OT</th>
                            <th style={{ ...styles.th, width: '9%' }}>PRÓX. HS</th>
                            <th style={{ ...styles.th, width: '9%' }}>PRÓX. FECHA</th>
                            <th style={{ ...styles.th, width: '9%' }}>RESPONSABLE</th>
                            <th style={{ ...styles.th, width: '10%' }}>DISP / REM.</th>
                            <th style={{ ...styles.th, width: '3%' }}>ACC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tabla.length === 0 ? (
                            <tr><td colSpan="11" style={styles.tdEmpty}>No hay inspecciones programadas.</td></tr>
                        ) : (
                            tabla.map((row) => (
                                <tr key={row.id} style={styles.tr}>
                                    <td style={{ ...styles.td, padding: '2px' }}>
                                        {componentesSeccion.length > 0 && (
                                            <select 
                                                style={styles.selectInCellMini} 
                                                value={row.componenteRef || ''} 
                                                onChange={(e) => {
                                                    const selectedId = e.target.value;
                                                    const comp = componentesSeccion.find((c, i) => String(c._id || c.id || i) === String(selectedId));
                                                    const compNombre = comp ? (comp.componente || comp.nombre || '') : '';
                                                    const descAuto = compNombre ? `INSPECCIÓN DE ${compNombre.toUpperCase()}` : row.descripcion;
                                                    
                                                    setTabla(tabla.map(r => r.id === row.id ? recalcularRenglon({
                                                        ...r,
                                                        componenteRef: selectedId,
                                                        componenteNombre: compNombre,
                                                        descripcion: descAuto
                                                    }, totalHs) : r));
                                                }}
                                            >
                                                <option value="">-- Sin Vincular / General --</option>
                                                {componentesSeccion.map((c, i) => (
                                                    <option key={c._id || c.id || i} value={c._id || c.id || i}>
                                                        {c.componente || c.nombre || `Comp #${i+1}`} (P/N: {c.pn || 'S/PN'})
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        <input 
                                            type="text" 
                                            style={styles.inputInCellBold} 
                                            value={row.descripcion} 
                                            onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'descripcion', e.target.value, totalHs)} 
                                            placeholder="Ej: Inspección de 200 HS" 
                                        />
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
                                        {row.tipoCriterio === 'MESES' ? (
                                            <input type="number" style={styles.inputInCell} value={row.intervaloMeses || ''} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'intervaloMeses', e.target.value, totalHs)} placeholder="Meses" />
                                        ) : (
                                            <input type="text" style={styles.inputInCell} value={row.intervaloHs || ''} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'intervaloHs', e.target.value, totalHs)} placeholder="Ej: 200" />
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        <input type="date" style={styles.inputInCell} value={row.ultFecha} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'ultFecha', e.target.value, totalHs)} />
                                    </td>
                                    <td style={styles.td}>
                                        <input type="text" style={styles.inputInCell} value={row.ultOt} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'ultOt', e.target.value, totalHs)} placeholder="OT" />
                                    </td>
                                    <td style={styles.td}>
                                        <input type="text" style={{ ...styles.inputInCell, fontWeight: 'bold' }} value={row.proxHs} disabled={row.tipoCriterio === 'FECHA'} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'proxHs', e.target.value, totalHs)} placeholder="0.0" />
                                    </td>
                                    <td style={styles.td}>
                                        <input type="date" style={styles.inputInCell} value={row.proxFecha} disabled={row.tipoCriterio === 'MESES'} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'proxFecha', e.target.value, totalHs)} />
                                    </td>
                                    <td style={styles.td}>
                                        <input type="text" style={styles.inputInCell} value={row.responsable} onChange={(e) => handleCellChange(tabla, setTabla, row.id, 'responsable', e.target.value, totalHs)} />
                                    </td>
                                    <td style={styles.td}>
                                        <input 
                                            type="text" 
                                            style={{ 
                                                ...styles.inputInCell, 
                                                fontWeight: 'bold', 
                                                color: String(row.disp).includes('🛑') ? '#e74c3c' : String(row.disp).includes('⚠️') ? '#f39c12' : '#27ae60' 
                                            }} 
                                            value={row.disp || '-'} 
                                            readOnly 
                                        />
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

    const listaCompActuales = getListaComponentesActual();

    return (
        <div style={styles.container}>
            {/* CABECERA Y SELECTORES */}
            <div style={styles.topHeaderBar}>
                <h2 style={styles.mainTitle}>SISTEMA DE GESTIÓN DE MANTENIMIENTO</h2>
                <button style={styles.btnSave} onClick={guardarMantenimiento} disabled={!aeronaveSeleccionadaId}>
                    💾 Guardar Todo en Servidor
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

            {/* SECCIÓN DINÁMICA: REGISTRO/EDICIÓN DE COMPONENTES DE LA AERONAVE */}
            {aeronaveData && (
                <div style={styles.componentBox}>
                    <h3 style={styles.subTitleBox}>⚙️ EDICIÓN / REGISTRO DE COMPONENTES INDIVIDUALES</h3>
                    
                    <div style={styles.compSelectorRow}>
                        <div>
                            <label style={styles.miniLabel}>SISTEMA / GRUPO:</label>
                            <select 
                                style={styles.compSelect} 
                                value={grupoComponente} 
                                onChange={(e) => {
                                    setGrupoComponente(e.target.value);
                                    setSubIndiceGrupo(0);
                                    resetSeleccionComponente();
                                }}
                            >
                                <option value="compPlaneador">✈️ Planeador</option>
                                <option value="motores">⚙️ Motores</option>
                                <option value="helices">🌀 Hélices</option>
                            </select>
                        </div>

                        {(grupoComponente === 'motores' || grupoComponente === 'helices') && (
                            <div>
                                <label style={styles.miniLabel}>SUBGRUPO:</label>
                                <select 
                                    style={styles.compSelect} 
                                    value={subIndiceGrupo} 
                                    onChange={(e) => {
                                        setSubIndiceGrupo(Number(e.target.value));
                                        resetSeleccionComponente();
                                    }}
                                >
                                    <option value={0}>Nº 1</option>
                                    <option value={1}>Nº 2</option>
                                </select>
                            </div>
                        )}

                        <div style={{ flexGrow: 1 }}>
                            <label style={styles.miniLabel}>SELECCIONAR COMPONENTE A EDITAR:</label>
                            <select style={styles.compSelect} value={componenteIndex} onChange={handleComponenteSelect}>
                                <option value="">-- Seleccione Componente --</option>
                                {listaCompActuales.map((c, idx) => (
                                    <option key={idx} value={idx}>
                                        Nº {c.nro} - {c.componente || 'Sin Nombre'} | P/N: {c.pn || 'S/PN'} | S/N: {c.sn || 'S/SN'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* FORMULARIO DE CAMPOS DEL COMPONENTE SELECCIONADO */}
                    {compEdit && (
                        <div style={styles.compEditForm}>
                            <h4 style={styles.formTitle}>📝 Editando: {compEdit.componente || 'Componente Sin Nombre'}</h4>
                            <div style={styles.gridForm}>
                                <div>
                                    <label style={styles.fieldLabel}>ATA:</label>
                                    <input style={styles.inputForm} type="text" value={compEdit.ata || ''} onChange={(e) => handleCompFieldChange('ata', e.target.value)} />
                                </div>
                                <div>
                                    <label style={styles.fieldLabel}>Nombre Componente:</label>
                                    <input style={styles.inputForm} type="text" value={compEdit.componente || ''} onChange={(e) => handleCompFieldChange('componente', e.target.value)} />
                                </div>
                                <div>
                                    <label style={styles.fieldLabel}>P/N (Part Number):</label>
                                    <input style={styles.inputForm} type="text" value={compEdit.pn || ''} onChange={(e) => handleCompFieldChange('pn', e.target.value)} />
                                </div>
                                <div>
                                    <label style={styles.fieldLabel}>S/N (Serial Number):</label>
                                    <input style={styles.inputForm} type="text" value={compEdit.sn || ''} onChange={(e) => handleCompFieldChange('sn', e.target.value)} />
                                </div>
                                <div>
                                    <label style={styles.fieldLabel}>Límite Tipo:</label>
                                    <select style={styles.selectForm} value={compEdit.limiteTipo || 'TBO'} onChange={(e) => handleCompFieldChange('limiteTipo', e.target.value)}>
                                        <option value="TBO">TBO</option>
                                        <option value="LL">LL (Life Limited)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={styles.fieldLabel}>TG Instalación:</label>
                                    <input style={styles.inputForm} type="text" value={compEdit.tgInstalacion || ''} onChange={(e) => handleCompFieldChange('tgInstalacion', e.target.value)} />
                                </div>
                            </div>

                            {/* DYNAMIC LIMITES */}
                            <div style={{ marginTop: '10px' }}>
                                <strong style={styles.miniLabel}>LÍMITES:</strong>
                                {(compEdit.limites || []).map((lim, lIdx) => (
                                    <div key={lIdx} style={styles.nestedRow}>
                                        <input style={styles.inputForm} value={lim.valor || ''} onChange={(e) => handleCompNestedArrayChange('limites', lIdx, 'valor', e.target.value)} placeholder="Valor" />
                                        <select style={styles.selectForm} value={lim.unidad || 'H'} onChange={(e) => handleCompNestedArrayChange('limites', lIdx, 'unidad', e.target.value)}>
                                            <option value="H">Horas (H)</option>
                                            <option value="LDG">Aterrizajes (LDG)</option>
                                            <option value="M">Meses (M)</option>
                                            <option value="C">Ciclos (C)</option>
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <button style={styles.btnApplyComp} onClick={handleAplicarCambioComponenteLocal}>
                                ✔️ Aplicar Cambio al Componente
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* SECCIÓN 1: PROGRAMA PLANEADOR */}
            {renderTablaSeccion(
                'Total Planeador Actual', 
                formData.tgPlaneadorActual, 
                tablaPlaneador, 
                setTablaPlaneador, 
                '#00a8ff',
                aeronaveData?.compPlaneador || []
            )}

            {/* SECCIÓN 2: PROGRAMA MOTOR 1 Y MOTOR 2 */}
            {renderTablaSeccion(
                'Total Motor #1 Actual', 
                formData.tgMotorActual, 
                tablaMotor, 
                setTablaMotor, 
                '#d35400',
                aeronaveData?.motores?.[0]?.componentes || []
            )}
            {configAeronave.esBimotor && renderTablaSeccion(
                'Total Motor #2 Actual', 
                formData.tgMotor2Actual, 
                tablaMotor2, 
                setTablaMotor2, 
                '#e67e22',
                aeronaveData?.motores?.[1]?.componentes || []
            )}

            {/* SECCIÓN 3: PROGRAMA HÉLICE 1 Y HÉLICE 2 */}
            {configAeronave.tieneHelice && renderTablaSeccion(
                'Total Hélice #1 Actual', 
                formData.tgHeliceActual, 
                tablaHelice, 
                setTablaHelice, 
                '#27ae60',
                aeronaveData?.helices?.[0]?.componentes || []
            )}
            {configAeronave.tieneHelice && configAeronave.esBimotor && renderTablaSeccion(
                'Total Hélice #2 Actual', 
                formData.tgHelice2Actual, 
                tablaHelice2, 
                setTablaHelice2, 
                '#2ecc71',
                aeronaveData?.helices?.[1]?.componentes || []
            )}
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
    
    // COMPONENT SECTION STYLES
    componentBox: { background: '#2c3e50', color: '#fff', padding: '12px', marginTop: '15px', border: '1px solid #1a252f' },
    subTitleBox: { margin: '0 0 10px 0', fontSize: '0.85rem', color: '#f39c12' },
    compSelectorRow: { display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' },
    miniLabel: { fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '2px', color: '#ecf0f1' },
    compSelect: { width: '100%', padding: '5px', fontSize: '0.8rem', background: '#ecf0f1', border: '1px solid #bdc3c7', fontWeight: 'bold' },
    compEditForm: { background: '#34495e', padding: '10px', marginTop: '10px', borderRadius: '4px' },
    formTitle: { margin: '0 0 8px 0', fontSize: '0.8rem', color: '#2ecc71' },
    gridForm: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' },
    fieldLabel: { fontSize: '0.7rem', color: '#bdc3c7', display: 'block' },
    inputForm: { width: '100%', padding: '4px', fontSize: '0.75rem', boxSizing: 'border-box' },
    selectForm: { width: '100%', padding: '4px', fontSize: '0.75rem' },
    nestedRow: { display: 'flex', gap: '5px', marginTop: '4px' },
    btnApplyComp: { backgroundColor: '#2980b9', color: '#fff', border: 'none', padding: '6px 12px', marginTop: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' },

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
    selectInCellMini: { width: '100%', border: 'none', background: '#eaf2f8', padding: '2px', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '2px' },
    btnDeleteRow: { background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold' },
    loading: { padding: '20px', color: '#fff', background: '#1b2a4a', fontFamily: 'monospace' }
};

export default ProgramaMantenimiento;