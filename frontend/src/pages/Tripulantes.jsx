import React, { useState, useEffect, useMemo } from 'react';
import API, { getPlanificacionEbm, actualizarConfiguracionEbm } from '../services/api'; 

// --- MATRIZ DE REQUISITOS CONFIGURABLE ---
const CONFIG_HORAS_EBM = {
    HELICOPTERO: {
        CP: { A: 6, B: 18, C: 15, D: 15 },
        PC: { A: 16, B: 24, C: 20, D: 20 },
        IE: { A: 20, B: 30, C: 25, D: 25 }
    },
    AVION: {
        CP: { A: 12, B: 18, C: 15, D: 15 },
        PC: { A: 20, B: 30, C: 25, D: 25 },
        IE: { A: 24, B: 36, C: 30, D: 30 }
    }
};

// --- DETECTOR AUXILIAR DE TIPO DE AERONAVE ---
const determinarTipoAeronave = (sda) => {
    if (!sda) return 'AVION';
    const sdaUpper = sda.toUpperCase();
    const palabrasHelicopteros = ['UH', 'BELL', 'PUMA', 'AB206', 'AB-206', 'HUEY', 'AS332', 'AS350', 'HA-1'];
    if (palabrasHelicopteros.some(p => sdaUpper.includes(p))) return 'HELICOPTERO';
    return 'AVION';
};

// --- DETECCIÓN DEL TRIMESTRE ACTUAL (Año 2026) ---
const getTrimestreActualCronologico = () => {
    const mesActual = new Date().getMonth(); 
    if (mesActual >= 0 && mesActual <= 2) return 1;
    if (mesActual >= 3 && mesActual <= 5) return 2;
    if (mesActual >= 6 && mesActual <= 8) return 3;
    return 4;
};

const ORDEN_GRADOS = { 'CR': 1, 'TC': 2, 'MY': 3, 'CT': 4, 'TP': 5, 'TT': 6, 'ST': 7 };

const EbmPage = () => {
    const [todoElPersonal, setTodoElPersonal] = useState([]); 
    const [personalFiltrado, setPersonalFiltrado] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [guardandoId, setGuardandoId] = useState(null); 
    const [todosLosSdas, setTodosLosSdas] = useState([]);
    const [todosLosElementos, setTodosLosElementos] = useState([]); 
    const [elementoSeleccionado, setElementoSeleccionado] = useState(''); 
    
    const [sdasVisibles, setSdasVisibles] = useState({});
    const [filasDesplegadas, setFilasDesplegadas] = useState({});

    const rawRole = localStorage.getItem('role') || 'user';
    const roleNormalizado = rawRole.toUpperCase().replace(/[\s_]/g, '');
    const userUnidad = localStorage.getItem('elemento')?.trim().toUpperCase() || localStorage.getItem('unidad')?.trim().toUpperCase() || 'MI UNIDAD';

    const esMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'COMANDO', 'COMANAV'].includes(roleNormalizado);
    const esGestorOperativo = ['ADMIN', 'OPERACIONES', 'JEFE', 'OFICINATECNICA'].includes(roleNormalizado);

    const trimestreActualId = getTrimestreActualCronologico();

    useEffect(() => {
        fetchPlanificacion();
    }, []);

    useEffect(() => {
        let filtrados = todoElPersonal;
        if (elementoSeleccionado && elementoSeleccionado !== 'TODOS') {
            filtrados = todoElPersonal.filter(p => (p.elemento || p.unidad || '').trim().toUpperCase() === elementoSeleccionado);
        }
        setPersonalFiltrado(filtrados);

        const sdas = [...new Set(filtrados.map(p => p.aeronave).filter(Boolean))];
        setTodosLosSdas(sdas);

        setSdasVisibles(prev => {
            const nuevo = { ...prev };
            sdas.forEach(sda => { if (nuevo[sda] === undefined) nuevo[sda] = false; });
            return nuevo;
        });
    }, [elementoSeleccionado, todoElPersonal]);

    const fetchPlanificacion = async () => {
        try {
            setLoading(true);
            const response = await getPlanificacionEbm();
            const dataBackend = response.data || [];

            const dataNormalizada = dataBackend.map(p => {
                const pModificado = { ...p };
                const tipoAeronave = determinarTipoAeronave(p.aeronave);
                
                [1, 2, 3, 4].forEach(num => {
                    const keyTrimestre = `trimestre${num}`;
                    if (pModificado[keyTrimestre]) {
                        const cond = pModificado[keyTrimestre].condicion || 'CP';
                        const tipo = pModificado[keyTrimestre].tipoEbm || 'A';
                        
                        const reqHs = CONFIG_HORAS_EBM[tipoAeronave]?.[cond]?.[tipo] || 0;
                        const restantes = reqHs - Number(pModificado[keyTrimestre].hsVoladas || 0);
                        
                        pModificado[keyTrimestre] = {
                            ...pModificado[keyTrimestre],
                            hsFaltantes: restantes > 0 ? Math.round(restantes * 10) / 10 : 0
                        };
                    }
                });
                return pModificado;
            });

            const dataJurisdiccion = esMandoEstrategico ? dataNormalizada : dataNormalizada.filter(p => {
                const unidadPiloto = p.elemento || p.unidad;
                return unidadPiloto && unidadPiloto.trim().toUpperCase() === userUnidad;
            });

            setTodoElPersonal(dataJurisdiccion);

            const elementosUnicos = [...new Set(dataJurisdiccion.map(p => (p.elemento || p.unidad || '').trim().toUpperCase()).filter(Boolean))].sort();
            setTodosLosElementos(elementosUnicos);
            
            setElementoSeleccionado(esMandoEstrategico ? 'TODOS' : userUnidad);

        } catch (error) {
            console.error("Error cargando planificación EBM:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSdaVisible = (sda) => { setSdasVisibles(prev => ({ ...prev, [sda]: !prev[sda] })); };
    const toggleFilaDesplegada = (id) => { setFilasDesplegadas(prev => ({ ...prev, [id]: !prev[id] })); };

    const handleInputChange = (p_id, trimestreNum, campo, valor) => {
        if (!esGestorOperativo) return; 

        const actualizarLista = prev => prev.map(p => {
            if (p._id !== p_id) return p;
            
            const keyTrimestre = `trimestre${trimestreNum}`;
            const trimModificado = { ...p[keyTrimestre], [campo]: valor };

            const cond = campo === 'condicion' ? valor : p[keyTrimestre].condicion;
            const tipo = campo === 'tipoEbm' ? valor : p[keyTrimestre].tipoEbm;
            
            const tipoAeronave = determinarTipoAeronave(p.aeronave);
            const reqHs = CONFIG_HORAS_EBM[tipoAeronave]?.[cond]?.[tipo] || 0;

            const restantes = reqHs - Number(p[keyTrimestre].hsVoladas || 0);
            trimModificado.hsFaltantes = restantes > 0 ? Math.round(restantes * 10) / 10 : 0;

            return { ...p, [keyTrimestre]: trimModificado };
        });

        setPersonalFiltrado(actualizarLista);
        setTodoElPersonal(actualizarLista);
    };

    const handleGuardarFila = async (pilotoId) => {
        if (!esGestorOperativo) return;
        try {
            setGuardandoId(pilotoId);
            const pData = personalFiltrado.find(p => p._id === pilotoId);
            
            const payload = {
                trimestre1: pData.trimestre1,
                trimestre2: pData.trimestre2,
                trimestre3: pData.trimestre3,
                trimestre4: pData.trimestre4
            };

            await actualizarConfiguracionEbm(pilotoId, payload);
            alert(`Parámetros EBM guardados con éxito para ${pData.grado} ${pData.apellido}.`);
            setFilasDesplegadas(prev => ({ ...prev, [pilotoId]: false }));
        } catch (error) {
            console.error(error);
            alert("Error al guardar la configuración del legajo.");
        } finally {
            setGuardandoId(null);
        }
    };

    const matrizSda = useMemo(() => {
        const agrupa = {};
        todosLosSdas.forEach(sda => { agrupa[sda] = []; });
        personalFiltrado.forEach(p => { if (p.aeronave && agrupa[p.aeronave]) agrupa[p.aeronave].push(p); });
        
        Object.keys(agrupa).forEach(sda => {
            agrupa[sda].sort((a, b) => (ORDEN_GRADOS[a.grado] || 99) - (ORDEN_GRADOS[b.grado] || 99));
        });
        return agrupa;
    }, [personalFiltrado, todosLosSdas]);

    const formatearHoras = (valor) => {
        const num = Number(valor || 0);
        return Number.isInteger(num) ? num : num.toFixed(1);
    };

    const verificarRotacionCorrecta = (p) => {
        const tipos = [p.trimestre1?.tipoEbm, p.trimestre2?.tipoEbm, p.trimestre3?.tipoEbm, p.trimestre4?.tipoEbm];
        const unicos = new Set(tipos.filter(Boolean));
        return unicos.size === 4; 
    };

    const calcularTotalesAnuales = (p) => {
        let totalPiloto = 0;
        let totalInstructor = 0;
        let totalGeneral = 0;

        [1, 2, 3, 4].forEach(num => {
            const t = p[`trimestre${num}`] || {};
            totalPiloto += Number(t.hsPiloto || 0);
            totalInstructor += Number(t.hsInstructor || 0);
            totalGeneral += Number(t.hsVoladas || 0);
        });

        return {
            totalPiloto: Math.round(totalPiloto * 10) / 10,
            totalInstructor: Math.round(totalInstructor * 10) / 10,
            totalGeneral: Math.round(totalGeneral * 10) / 10
        };
    };

    const haySdaSeleccionado = Object.values(sdasVisibles).some(v => v === true);

    if (loading) return <div style={styles.centerText}>Cargando Matriz de Exigencias EBM...</div>;

    return (
        <div style={styles.pageContainer}>
            <div style={styles.headerArea}>
                <div>
                    <h2 style={styles.title}>Planificación Anual EBM - Año 2026</h2>
                    <p style={styles.subtitle}>Distribución de Exigencias de Horas de Vuelo Mínimas</p>
                </div>
                <div style={styles.headerControlsRight}>
                    <div style={styles.containerFiltroUnidad}>
                        <span style={styles.labelFiltroUnidad}>Elemento/Unidad:</span>
                        <select 
                            style={styles.selectUnidadSuperior} 
                            value={elementoSeleccionado} 
                            disabled={!esMandoEstrategico} 
                            onChange={(e) => setElementoSeleccionado(e.target.value)}
                        >
                            {esMandoEstrategico && <option value="TODOS">⚠️ VER TODO EL COMANDO</option>}
                            {todosLosElementos.map(el => <option key={el} value={el}>{el}</option>)}
                        </select>
                    </div>
                    <div style={styles.badgeTrimestre}>Trimestre Cronológico: T{trimestreActualId}</div>
                </div>
            </div>

            <div style={styles.filterBar}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1b3a57' }}>Sistemas de Armas:</span>
                <div style={styles.filterGroup}>
                    {todosLosSdas.map(sda => (
                        <button 
                            key={sda} 
                            onClick={() => toggleSdaVisible(sda)} 
                            style={{ 
                                ...styles.filterButton, 
                                backgroundColor: sdasVisibles[sda] ? '#1b3a57' : '#e2e8f0', 
                                color: sdasVisibles[sda] ? 'white' : '#475569' 
                            }}
                        >
                            {sda} {sdasVisibles[sda] ? '👁️' : '📁'}
                        </button>
                    ))}
                </div>
            </div>

            <div style={styles.tableWrapper}>
                <table style={styles.mainTable}>
                    <thead>
                        <tr style={styles.tableHeaderRow}>
                            <th style={{...styles.th, width: '50px', textAlign: 'center'}}>Ajustar</th>
                            <th style={styles.th}>Grado, Apellido y Nombre</th>
                            <th style={{...styles.th, textAlign: 'center'}} colSpan={2}>1er Trimestre</th>
                            <th style={{...styles.th, textAlign: 'center'}} colSpan={2}>2do Trimestre</th>
                            <th style={{...styles.th, textAlign: 'center'}} colSpan={2}>3er Trimestre</th>
                            <th style={{...styles.th, textAlign: 'center'}} colSpan={2}>4to Trimestre</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!haySdaSeleccionado ? (
                            <tr><td colSpan={10} style={styles.noDataRow}>💡 Seleccione un Sistema de Armas arriba para listar y parametrizar las tripulaciones.</td></tr>
                        ) : (
                            todosLosSdas.map(sda => {
                                if (!sdasVisibles[sda] || !matrizSda[sda] || matrizSda[sda].length === 0) return null;
                                return (
                                    <React.Fragment key={sda}>
                                        <tr style={styles.sdaGroupRow}><td colSpan={10} style={styles.sdaGroupCell}>✈️ SISTEMA DE ARMAS: {sda}</td></tr>
                                        {matrizSda[sda].map(p => {
                                            const estaDesplegado = !!filasDesplegadas[p._id];
                                            const rotacionValida = verificarRotacionCorrecta(p);
                                            const totalesAnuales = calcularTotalesAnuales(p);

                                            return (
                                                <React.Fragment key={p._id}>
                                                    <tr style={styles.pilotRow}>
                                                        <td style={styles.tdCenter}>
                                                            <button style={styles.btnConfig} onClick={() => toggleFilaDesplegada(p._id)}>⚙️</button>
                                                        </td>
                                                        <td style={styles.tdName}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                {p.grado} {p.apellido}, {p.nombre}
                                                                {!rotacionValida && <span title="Alerta: Deben asignarse los 4 tipos de trimestre (A, B, C y D) en el año sin repetir" style={{ cursor: 'help' }}>⚠️</span>}
                                                            </div>
                                                            <div style={styles.miniSubtext}>
                                                                T1: {p.trimestre1?.condicion}-{p.trimestre1?.tipoEbm} | 
                                                                T2: {p.trimestre2?.condicion}-{p.trimestre2?.tipoEbm} | 
                                                                T3: {p.trimestre3?.condicion}-{p.trimestre3?.tipoEbm} | 
                                                                T4: {p.trimestre4?.condicion}-{p.trimestre4?.tipoEbm}
                                                            </div>
                                                        </td>

                                                        {/* TRIMESTRE 1 */}
                                                        <td style={styles.tdVoladas}>
                                                            <div style={styles.totalPrincipal}>{formatearHoras(p.trimestre1?.hsVoladas)} hs</div>
                                                            {(Number(p.trimestre1?.hsInstructor) > 0 || Number(p.trimestre1?.hsPiloto) > 0) && (
                                                                <div style={styles.subtextSutil}>
                                                                    <span>P: {formatearHoras(p.trimestre1?.hsPiloto)}</span>
                                                                    <span style={{ marginLeft: '4px', color: '#0369a1' }}>I: {formatearHoras(p.trimestre1?.hsInstructor)}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{...styles.tdFaltan, color: Number(p.trimestre1?.hsFaltantes || 0) <= 0 ? '#16a34a' : '#ed6c02'}}>
                                                            {Number(p.trimestre1?.hsFaltantes || 0) <= 0 ? '✔ OK' : `${formatearHoras(p.trimestre1.hsFaltantes)} hs`}
                                                        </td>

                                                        {/* TRIMESTRE 2 */}
                                                        <td style={styles.tdVoladas}>
                                                            <div style={styles.totalPrincipal}>{formatearHoras(p.trimestre2?.hsVoladas)} hs</div>
                                                            {(Number(p.trimestre2?.hsInstructor) > 0 || Number(p.trimestre2?.hsPiloto) > 0) && (
                                                                <div style={styles.subtextSutil}>
                                                                    <span>P: {formatearHoras(p.trimestre2?.hsPiloto)}</span>
                                                                    <span style={{ marginLeft: '4px', color: '#0369a1' }}>I: {formatearHoras(p.trimestre2?.hsInstructor)}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{...styles.tdFaltan, color: Number(p.trimestre2?.hsFaltantes || 0) <= 0 ? '#16a34a' : '#ed6c02'}}>
                                                            {Number(p.trimestre2?.hsFaltantes || 0) <= 0 ? '✔ OK' : `${formatearHoras(p.trimestre2.hsFaltantes)} hs`}
                                                        </td>

                                                        {/* TRIMESTRE 3 */}
                                                        <td style={styles.tdVoladas}>
                                                            <div style={styles.totalPrincipal}>{formatearHoras(p.trimestre3?.hsVoladas)} hs</div>
                                                            {(Number(p.trimestre3?.hsInstructor) > 0 || Number(p.trimestre3?.hsPiloto) > 0) && (
                                                                <div style={styles.subtextSutil}>
                                                                    <span>P: {formatearHoras(p.trimestre3?.hsPiloto)}</span>
                                                                    <span style={{ marginLeft: '4px', color: '#0369a1' }}>I: {formatearHoras(p.trimestre3?.hsInstructor)}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{...styles.tdFaltan, color: Number(p.trimestre3?.hsFaltantes || 0) <= 0 ? '#16a34a' : '#ed6c02'}}>
                                                            {Number(p.trimestre3?.hsFaltantes || 0) <= 0 ? '✔ OK' : `${formatearHoras(p.trimestre3.hsFaltantes)} hs`}
                                                        </td>

                                                        {/* TRIMESTRE 4 */}
                                                        <td style={styles.tdVoladas}>
                                                            <div style={styles.totalPrincipal}>{formatearHoras(p.trimestre4?.hsVoladas)} hs</div>
                                                            {(Number(p.trimestre4?.hsInstructor) > 0 || Number(p.trimestre4?.hsPiloto) > 0) && (
                                                                <div style={styles.subtextSutil}>
                                                                    <span>P: {formatearHoras(p.trimestre4?.hsPiloto)}</span>
                                                                    <span style={{ marginLeft: '4px', color: '#0369a1' }}>I: {formatearHoras(p.trimestre4?.hsInstructor)}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{...styles.tdFaltan, color: Number(p.trimestre4?.hsFaltantes || 0) <= 0 ? '#16a34a' : '#ed6c02'}}>
                                                            {Number(p.trimestre4?.hsFaltantes || 0) <= 0 ? '✔ OK' : `${formatearHoras(p.trimestre4.hsFaltantes)} hs`}
                                                        </td>
                                                    </tr>

                                                    {estaDesplegado && (
                                                        <tr style={styles.configExpandedRow}>
                                                            <td colSpan={10} style={styles.configExpandedCell}>
                                                                <div style={styles.panelConfigFlex}>
                                                                    {[1, 2, 3, 4].map(num => {
                                                                        const trimData = p[`trimestre${num}`] || {};
                                                                        const esInstructor = trimData.condicion === 'IE';

                                                                        return (
                                                                            <div key={num} style={styles.bloqueTrimestreConfig}>
                                                                                <h4 style={styles.tituloBloque}>Trimestre {num}</h4>
                                                                                <div style={styles.grupoInput}>
                                                                                    <span style={styles.labelMini}>Función:</span>
                                                                                    <select 
                                                                                        style={styles.selectPanel} 
                                                                                        value={trimData.condicion || 'CP'} 
                                                                                        disabled={!esGestorOperativo} 
                                                                                        onChange={(e) => handleInputChange(p._id, num, 'condicion', e.target.value)}
                                                                                    >
                                                                                        <option value="CP">Copiloto (CP)</option>
                                                                                        <option value="PC">Piloto en Comando (PC)</option>
                                                                                        <option value="IE">Instructor / Estand. (IE)</option>
                                                                                    </select>
                                                                                </div>
                                                                                <div style={styles.grupoInput}>
                                                                                    <span style={styles.labelMini}>Tipo Trimestre:</span>
                                                                                    <select 
                                                                                        style={styles.selectPanel} 
                                                                                        value={trimData.tipoEbm || 'A'} 
                                                                                        disabled={!esGestorOperativo} 
                                                                                        onChange={(e) => handleInputChange(p._id, num, 'tipoEbm', e.target.value)}
                                                                                    >
                                                                                        <option value="A">Tipo A</option>
                                                                                        <option value="B">Tipo B</option>
                                                                                        <option value="C">Tipo C</option>
                                                                                        <option value="D">Tipo D</option>
                                                                                    </select>
                                                                                </div>

                                                                                {esInstructor && (
                                                                                    <div style={styles.boxDiscriminado}>
                                                                                        <div style={styles.badgeDiscriminadoPiloto}>
                                                                                            <span>👨‍✈️ Piloto:</span>
                                                                                            <strong>{formatearHoras(trimData.hsPiloto)} hs</strong>
                                                                                        </div>
                                                                                        <div style={styles.badgeDiscriminadoInstructor}>
                                                                                            <span>🎓 Instructor:</span>
                                                                                            <strong>{formatearHoras(trimData.hsInstructor)} hs</strong>
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'right', marginTop: '6px', fontWeight: 'bold' }}>
                                                                                    Exige: {(() => {
                                                                                        const tipoAeronave = determinarTipoAeronave(p.aeronave);
                                                                                        return CONFIG_HORAS_EBM[tipoAeronave]?.[trimData.condicion || 'CP']?.[trimData.tipoEbm || 'A'] || 0;
                                                                                    })()} hs
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                <div style={styles.barConsolidado}>
                                                                    <div style={styles.cardConsolidadoAnual}>
                                                                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1b3a57' }}>📊 Totales Acumulados (Año 2026):</span>
                                                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                                            <span style={{ fontSize: '11px', color: '#334155' }}>
                                                                                Piloto: <strong style={{ color: '#0284c7' }}>{formatearHoras(totalesAnuales.totalPiloto)} hs</strong>
                                                                            </span>
                                                                            <span style={{ fontSize: '11px', color: '#334155' }}>
                                                                                Instructor: <strong style={{ color: '#475569' }}>{formatearHoras(totalesAnuales.totalInstructor)} hs</strong>
                                                                            </span>
                                                                            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 'bold', borderLeft: '1px solid #cbd5e1', paddingLeft: '10px' }}>
                                                                                Total Volado: {formatearHoras(totalesAnuales.totalGeneral)} hs
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                        {!rotacionValida && (
                                                                            <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 'bold' }}>
                                                                                ⚠️ Combine los tipos A, B, C y D en el año.
                                                                            </span>
                                                                        )}
                                                                        {esGestorOperativo && (
                                                                            <button style={styles.btnSaveRow} onClick={() => handleGuardarFila(p._id)} disabled={guardandoId === p._id}>
                                                                                {guardandoId === p._id ? 'Guardando legajo...' : '💾 Aplicar Configuración Anual'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles = {
    pageContainer: { padding: '25px', backgroundColor: '#f1f5f9', minHeight: 'calc(100vh - 65px)' },
    headerArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'white', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    title: { margin: 0, fontSize: '20px', color: '#1b3a57', fontWeight: 'bold' },
    subtitle: { margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' },
    headerControlsRight: { display: 'flex', alignItems: 'center', gap: '20px' },
    containerFiltroUnidad: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' },
    labelFiltroUnidad: { fontSize: '12px', fontWeight: 'bold', color: '#334155' },
    selectUnidadSuperior: { padding: '5px 10px', fontSize: '12px', fontWeight: 'bold', color: '#1b3a57', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white' },
    badgeTrimestre: { backgroundColor: '#1b3a57', color: 'white', padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
    filterBar: { backgroundColor: 'white', padding: '12px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    filterGroup: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    filterButton: { border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' },
    tableWrapper: { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' },
    mainTable: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    tableHeaderRow: { backgroundColor: '#1b3a57', color: 'white' },
    th: { padding: '12px 15px', fontSize: '12px', fontWeight: 'bold' },
    sdaGroupRow: { backgroundColor: '#e2e8f0', borderBottom: '2px solid #cbd5e1' },
    sdaGroupCell: { padding: '10px 15px', fontWeight: 'bold', fontSize: '13px', color: '#1e293b' },
    pilotRow: { borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.1s' },
    tdCenter: { padding: '10px', textAlign: 'center' },
    tdName: { padding: '12px 15px', fontWeight: 'bold', fontSize: '13px', color: '#334155' },
    miniSubtext: { fontSize: '10px', color: '#64748b', marginTop: '3px', fontFamily: 'monospace' },
    
    // ESTILOS DE CELDAS REVISADOS
    tdVoladas: { padding: '8px 6px', fontSize: '12px', textAlign: 'center', backgroundColor: '#fafafa', borderRight: '1px solid #f1f5f9', verticalAlign: 'middle' },
    totalPrincipal: { fontWeight: 'bold', color: '#1b3a57', fontSize: '12px' },
    subtextSutil: { fontSize: '9px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace', fontWeight: 'bold' },

    tdFaltan: { padding: '12px 10px', fontSize: '12px', textAlign: 'center', fontWeight: 'bold', borderRight: '1px solid #e2e8f0', verticalAlign: 'middle' },
    btnConfig: { background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer', padding: '4px' },
    configExpandedRow: { backgroundColor: '#f8fafc', borderLeft: '5px solid #1b3a57' },
    configExpandedCell: { padding: '15px 20px', backgroundColor: '#f8fafc' },
    panelConfigFlex: { display: 'flex', gap: '15px' },
    bloqueTrimestreConfig: { flex: 1, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' },
    tituloBloque: { margin: '0 0 10px 0', fontSize: '11px', color: '#1b3a57', textTransform: 'uppercase', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' },
    grupoInput: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '5px' },
    labelMini: { fontSize: '11px', color: '#475569', fontWeight: 'bold' },
    selectPanel: { backgroundColor: '#fff', color: '#334155', border: '1px solid #cbd5e1', fontSize: '11px', padding: '4px 5px', borderRadius: '3px', width: '70%', cursor: 'pointer' },
    boxDiscriminado: { marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' },
    badgeDiscriminadoPiloto: { display: 'flex', justifyContent: 'space-between', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 6px', borderRadius: '4px', fontSize: '10px' },
    badgeDiscriminadoInstructor: { display: 'flex', justifyContent: 'space-between', backgroundColor: '#f1f5f9', color: '#334155', padding: '3px 6px', borderRadius: '4px', fontSize: '10px' },
    barConsolidado: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', backgroundColor: '#e2e8f0', padding: '10px 15px', borderRadius: '6px' },
    cardConsolidadoAnual: { display: 'flex', alignItems: 'center', gap: '12px' },
    btnSaveRow: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    centerText: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', fontSize: '14px', fontWeight: 'bold', color: '#1b3a57' },
    noDataRow: { padding: '40px', color: '#64748b', fontSize: '13px', textAlign: 'center', backgroundColor: '#fafafa' }
};

export default EbmPage;