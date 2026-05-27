import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API, { getPlanificacionEbm } from '../services/api'; 

// --- DETECCIÓN DEL TRIMESTRE ACTUAL (Año 2026) ---
const getTrimestreActualCronologico = () => {
    const mesActual = new Date().getMonth(); // 0 = Ene, 11 = Dic
    if (mesActual >= 0 && mesActual <= 2) return 1;
    if (mesActual >= 3 && mesActual <= 5) return 2;
    if (mesActual >= 6 && mesActual <= 8) return 3;
    return 4;
};

const ORDEN_GRADOS = { 'CR': 1, 'TC': 2, 'MY': 3, 'CT': 4, 'TP': 5, 'TT': 6, 'ST': 7 };

const EbmPage = () => {
    const [personal, setPersonal] = useState([]);
    const [loading, setLoading] = useState(true);
    const [guardandoId, setGuardandoId] = useState(null); 
    const [todosLosSdas, setTodosLosSdas] = useState([]);
    const [sdasVisibles, setSdasVisibles] = useState({});
    const [filasDesplegadas, setFilasDesplegadas] = useState({});

    const userUnidad = localStorage.getItem('elemento') || localStorage.getItem('unidad') || 'MI UNIDAD';
    const trimestreActualId = getTrimestreActualCronologico();

    const fetchPersonal = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getPlanificacionEbm();
            
            // El backend responde directamente con el array consolidado o dentro de response.data
            const dataBackend = Array.isArray(response) ? response : (response.data || []);

            setPersonal(dataBackend);

            // 🔍 EXTRAER SDAs directamente de las llaves del mapa de configuración que calculó el controlador
            const sdasDetectados = new Set();
            dataBackend.forEach(p => {
                if (p.configTrimestresSda) {
                    Object.keys(p.configTrimestresSda).forEach(sda => sdasDetectados.add(sda.toUpperCase().trim()));
                }
            });

            const arraySdas = Array.from(sdasDetectados);
            setTodosLosSdas(arraySdas);

            // Inicialmente, todos los sistemas se marcan como activos (visibles)
            const visibilidadInicial = {};
            arraySdas.forEach(sda => {
                visibilidadInicial[sda] = true;
            });
            setSdasVisibles(visibilidadInicial);

        } catch (error) {
            console.error("❌ Error de carga de personal EBM:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPersonal();
    }, [fetchPersonal]);

    const toggleDespliegueFila = (pilotoId, sda) => {
        const key = `${pilotoId}_${sda}`;
        setFilasDesplegadas(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleVisibilidadSda = (sdaName) => {
        setSdasVisibles(prev => ({
            ...prev,
            [sdaName]: !prev[sdaName]
        }));
    };

    const handleConfigChange = (pilotoId, sda, trimestre, campo, valor) => {
        setPersonal(prevPersonal => 
            prevPersonal.map(p => {
                if (p._id !== pilotoId) return p;
                const configSdaActual = p.configTrimestresSda?.[sda] || {
                    t1: { rol: '', tipo: '', novedad: '', novedadOtro: '' }, 
                    t2: { rol: '', tipo: '', novedad: '', novedadOtro: '' }, 
                    t3: { rol: '', tipo: '', novedad: '', novedadOtro: '' }, 
                    t4: { rol: '', tipo: '', novedad: '', novedadOtro: '' }
                };
                return {
                    ...p,
                    configTrimestresSda: {
                        ...p.configTrimestresSda,
                        [sda]: {
                            ...configSdaActual,
                            [trimestre]: {
                                ...configSdaActual[trimestre],
                                [campo]: valor
                            }
                        }
                    }
                };
            })
        );
    };

    const handleGuardarConfiguracion = async (pilotoId, sda) => {
        const keyGuardado = `${pilotoId}_${sda}`;
        try {
            setGuardandoId(keyGuardado);
            const piloto = personal.find(p => p._id === pilotoId);
            if (!piloto) return;

            const configTrimestresSda = piloto.configTrimestresSda;

            // Enviamos la estructura completa requerida por la OP 3 del backend
            const response = await API.put(`/api/ebm/actualizar-configuracion/${pilotoId}`, {
                configTrimestresSda
            });

            if (response.data?.success || response.status === 200) {
                alert(`✅ Plan EBM de ${piloto.apellido} para el sistema ${sda} guardado exitosamente.`);
            } else {
                alert(`⚠️ Ocurrió un inconveniente al registrar la información.`);
            }
        } catch (error) {
            console.error("❌ Error al guardar configuración EBM:", error);
            alert("❌ Error de comunicación con la base de datos central.");
        } finally {
            setGuardandoId(null);
        }
    };

    // --- GENERACIÓN DE LA MATRIZ DE RECORRIDO POR SISTEMA ---
    const matrizSda = useMemo(() => {
        const esquemasPorSda = {};

        personal.forEach(piloto => {
            const sdasAsignados = Object.keys(piloto.configTrimestresSda || {});

            sdasAsignados.forEach(sdaName => {
                const sdaUpper = sdaName.toUpperCase().trim();
                if (sdasVisibles[sdaUpper] === false) return;

                if (!esquemasPorSda[sdaUpper]) {
                    esquemasPorSda[sdaUpper] = [];
                }

                esquemasPorSda[sdaUpper].push({
                    ...piloto,
                    sistemaActivo: sdaUpper 
                });
            });
        });

        // Ordenamiento Jerárquico Militar
        Object.keys(esquemasPorSda).forEach(sda => {
            esquemasPorSda[sda].sort((a, b) => {
                const pesoA = ORDEN_GRADOS[a.grado] || 99;
                const pesoB = ORDEN_GRADOS[b.grado] || 99;
                if (pesoA !== pesoB) return pesoA - pesoB;
                return (a.apellido || '').trim().toUpperCase().localeCompare((b.apellido || '').trim().toUpperCase());
            });
        });

        return esquemasPorSda;
    }, [personal, sdasVisibles]);

    const renderCeldaTrimestre = (nroTrimestre, horasVoladas = 0, horasFaltantes = 0) => {
        let colorEstado = '#555';
        if (horasFaltantes <= 0) {
            colorEstado = '#2e7d32'; 
        } else {
            if (nroTrimestre < trimestreActualId) {
                colorEstado = '#d32f2f'; 
            } else {
                colorEstado = '#ed6c02'; 
            }
        }

        return (
            <td style={styles.tdMetrica}>
                <div style={{ color: colorEstado, fontWeight: 'bold' }}>{horasVoladas} hs</div>
                {horasFaltantes > 0 && (
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                        Faltan: <span style={{ color: colorEstado, fontWeight: '500' }}>{horasFaltantes} hs</span>
                    </div>
                )}
            </td>
        );
    };

    const renderBloqueAsignacion = (piloto, sda, tKey, tLabel, nroTrimestre) => {
        const conf = piloto.configTrimestresSda?.[sda]?.[tKey] || { rol: '', tipo: '', novedad: '', novedadOtro: '' };
        const hFaltantes = piloto.horasFaltantesSda?.[sda]?.[tKey] || 0;
        const pasoDeTrimestre = nroTrimestre < trimestreActualId;
        const mostrarJustificacion = hFaltantes > 0 && pasoDeTrimestre;

        return (
            <div style={{
                ...styles.bloqueTrimestreConfig,
                borderColor: mostrarJustificacion ? '#d32f2f' : '#cbd5e1'
            }}>
                <h5 style={styles.tituloBloque}>{tLabel}</h5>
                <div style={styles.grupoInput}>
                    <label style={styles.labelMini}>ROL:</label>
                    <select 
                        value={conf.role || conf.rol || ''} 
                        onChange={(e) => handleConfigChange(piloto._id, sda, tKey, 'rol', e.target.value)}
                        style={styles.selectPanel}
                    >
                        <option value="">-- SELECCIONE --</option>
                        <option value="COPILOTO">COPILOTO</option>
                        <option value="PILOTO">PILOTO</option>
                        <option value="INSTRUCTOR">INSTRUCTOR</option>
                    </select>
                </div>
                <div style={styles.grupoInput}>
                    <label style={styles.labelMini}>TIPO:</label>
                    <select 
                        value={conf.tipo || ''} 
                        onChange={(e) => handleConfigChange(piloto._id, sda, tKey, 'tipo', e.target.value)}
                        style={styles.selectPanel}
                    >
                        <option value="">-- SELECCIONE --</option>
                        <option value="A">TIPO A</option>
                        <option value="B">TIPO B</option>
                        <option value="C">TIPO C</option>
                        <option value="D">TIPO D</option>
                    </select>
                </div>

                {mostrarJustificacion && (
                    <div style={styles.seccionJustificacion}>
                        <div style={styles.grupoInput}>
                            <label style={styles.labelMiniJustificacion}>MOTIVO NO CUMP:</label>
                            <select 
                                value={conf.novedad || ''} 
                                onChange={(e) => handleConfigChange(piloto._id, sda, tKey, 'novedad', e.target.value)}
                                style={styles.selectJustificacion}
                            >
                                <option value="">-- SELECCIONE MOTIVO --</option>
                                <option value="SIN AERONAVES DISPONIBLES">SIN AERONAVES DISPONIBLES</option>
                                <option value="SIN DISPONIBILIDAD DE HORAS">SIN DISPONIBILIDAD DE HORAS</option>
                                <option value="PROBLEMAS DE SALUD">PROBLEMAS DE SALUD</option>
                                <option value="OTROS">OTROS (ESPECIFICAR)</option>
                            </select>
                        </div>
                        
                        {(conf.novedad === 'OTROS' || (!['', 'SIN AERONAVES DISPONIBLES', 'SIN DISPONIBILIDAD DE HORAS', 'PROBLEMAS DE SALUD'].includes(conf.novedad?.toUpperCase()))) && (
                            <div style={{ marginTop: '5px' }}>
                                <input 
                                    type="text"
                                    placeholder="Escriba el motivo aquí..."
                                    value={conf.novedadOtro || ''}
                                    onChange={(e) => handleConfigChange(piloto._id, sda, tKey, 'novedadOtro', e.target.value)}
                                    style={styles.inputJustificacion}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div style={{ color: '#0b2545', padding: '20px', fontFamily: 'sans-serif', fontWeight: 'bold' }}>CARGANDO MATRIZ DE OPERACIONES EBM...</div>;

    const haySdasVisibles = Object.values(sdasVisibles).some(v => v === true);

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h2 style={{ margin: 0, textTransform: 'uppercase', color: '#0b2545', fontWeight: '800' }}>NÓMINA EBM POR SISTEMA - {userUnidad}</h2>
                
                <div style={styles.contenedorFiltrosDinamicos}>
                    <span style={{ fontSize: '12px', color: '#555', fontWeight: 'bold' }}>
                        SISTEMAS DE ARMAS VISIBLES:
                    </span>
                    <div style={styles.grupoTags}>
                        {todosLosSdas.map(sda => {
                            const estaActivo = sdasVisibles[sda] !== false;
                            return (
                                <button
                                    key={sda}
                                    onClick={() => toggleVisibilidadSda(sda)}
                                    style={{
                                        ...styles.tagSda,
                                        backgroundColor: estaActivo ? '#e0f2fe' : '#f1f5f9',
                                        color: estaActivo ? '#0369a1' : '#64748b',
                                        borderColor: estaActivo ? '#0284c7' : '#cbd5e1'
                                    }}
                                >
                                    {estaActivo ? '👁️ ' : '🙈 '} {sda.toUpperCase()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>GRADO</th>
                        <th style={styles.th}>APELLIDO Y NOMBRE</th>
                        <th style={styles.thTrimestre}>1° TRIM (VOL/FALT)</th>
                        <th style={styles.thTrimestre}>2° TRIM (VOL/FALT)</th>
                        <th style={styles.thTrimestre}>3° TRIM (VOL/FALT)</th>
                        <th style={styles.thTrimestre}>4° TRIM (VOL/FALT)</th>
                        <th style={styles.thTotal}>TOTAL SdA</th>
                        <th style={styles.thAcciones}>CONFIG</th>
                    </tr>
                </thead>
                <tbody>
                    {haySdasVisibles && Object.keys(matrizSda).length > 0 ? (
                        Object.keys(matrizSda).map(sdaNom => (
                            <React.Fragment key={`grupo_${sdaNom}`}>
                                <tr>
                                    <td colSpan="8" style={styles.thSeparadorSda}>
                                         SISTEMA DE ARMAS: {sdaNom.toUpperCase()}
                                    </td>
                                </tr>
                                
                                {matrizSda[sdaNom].map(p => {
                                    const filaKey = `${p._id}_${sdaNom}`;
                                    const hTrim = p.horasTrimestralesSda?.[sdaNom] || {};
                                    const hFalt = p.horasFaltantesSda?.[sdaNom] || {};
                                    const totalAnualSda = p.horasAcumuladasSda?.[sdaNom] || 0;
                                    const estaGuardando = guardandoId === filaKey;

                                    return (
                                        <React.Fragment key={`row_${filaKey}`}>
                                            <tr style={styles.tr}>
                                                <td style={styles.tdGrado}><span style={{ color: '#0b2545', fontWeight: 'bold' }}>{p.grado}</span></td>
                                                <td style={styles.tdNombre}>
                                                    <span style={{ fontWeight: '600', textTransform: 'uppercase', color: '#1e293b' }}>{p.apellido}, {p.nombre}</span>
                                                </td>
                                                
                                                {renderCeldaTrimestre(1, hTrim.t1, hFalt.t1)}
                                                {renderCeldaTrimestre(2, hTrim.t2, hFalt.t2)}
                                                {renderCeldaTrimestre(3, hTrim.t3, hFalt.t3)}
                                                {renderCeldaTrimestre(4, hTrim.t4, hFalt.t4)}
                                                
                                                <td style={styles.tdTotal}>{totalAnualSda} HS</td>

                                                <td style={styles.tdAcciones}>
                                                    <button 
                                                        onClick={() => toggleDespliegueFila(p._id, sdaNom)} 
                                                        style={{
                                                            ...styles.btnConfig,
                                                            backgroundColor: filasDesplegadas[filaKey] ? '#b45309' : '#0f172a'
                                                        }}
                                                    >
                                                        ⚙️
                                                    </button>
                                                </td>
                                            </tr>

                                            {filasDesplegadas[filaKey] && (
                                                <tr key={`expand_${filaKey}`}>
                                                    <td colSpan="8" style={styles.tdExpandido}>
                                                        <div style={styles.contenedorPanelPlanificacion}>
                                                            <div style={styles.headerPanelConfig}>
                                                                <span style={{ color: '#0b2545', fontWeight: 'bold' }}>
                                                                    CONFIGURACIÓN {sdaNom} - {p.grado} {p.apellido}
                                                                </span>
                                                            </div>
                                                            <div style={styles.grillaAsignacion}>
                                                                {renderBloqueAsignacion(p, sdaNom, 't1', '1er Trimestre', 1)}
                                                                {renderBloqueAsignacion(p, sdaNom, 't2', '2do Trimestre', 2)}
                                                                {renderBloqueAsignacion(p, sdaNom, 't3', '3er Trimestre', 3)}
                                                                {renderBloqueAsignacion(p, sdaNom, 't4', '4to Trimestre', 4)}
                                                            </div>

                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
                                                                <button
                                                                    onClick={() => handleGuardarConfiguracion(p._id, sdaNom)}
                                                                    disabled={estaGuardando}
                                                                    style={{
                                                                        backgroundColor: estaGuardando ? '#a1a1aa' : '#1e3a8a',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        padding: '8px 18px',
                                                                        borderRadius: '4px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 'bold',
                                                                        cursor: estaGuardando ? 'not-allowed' : 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                                        transition: 'background-color 0.2s'
                                                                    }}
                                                                >
                                                                    {estaGuardando ? '⏳ GUARDANDO...' : '💾 GUARDAR CONFIGURACIÓN CENTRAL'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </React.Fragment>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                ACTIVÁ AL MENOS UN SISTEMA EN LA BARRA SUPERIOR PARA VISUALIZAR LA PLANIFICACIÓN EBM
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

// Se mantienen intactos tus estilos visuales nativos
const styles = {
    container: { padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', color: '#334155', fontFamily: 'sans-serif' },
    header: { display: 'flex', flexDirection: 'column', gap: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' },
    contenedorFiltrosDinamicos: { display: 'flex', flexDirection: 'column', gap: '8px' },
    grupoTags: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
    tagSda: { border: '1px solid', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s ease' },
    table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: '4px' },
    thSeparadorSda: { backgroundColor: '#0b2545', color: '#fff', padding: '12px 15px', fontSize: '13px', fontWeight: 'bold', borderLeft: '5px solid #ca8a04', letterSpacing: '1px' }, 
    th: { textAlign: 'left', padding: '12px', color: '#1e293b', borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' },
    thTrimestre: { textAlign: 'right', padding: '12px', color: '#1e293b', borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', width: '12%' },
    thTotal: { textAlign: 'right', padding: '12px', color: '#1e293b', borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', width: '10%' },
    thAcciones: { textAlign: 'center', padding: '12px', color: '#1e293b', borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9', fontSize: '12px', fontWeight: 'bold', width: '6%' },
    tdGrado: { padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px', width: '8%' },
    tdNombre: { padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px' },
    tdMetrica: { padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textAlign: 'right', lineHeight: '1.3' },
    tdTotal: { padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px', textAlign: 'right', color: '#0b2545', fontWeight: 'bold' },
    tdAcciones: { padding: '12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' },
    btnConfig: { border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' },
    tdExpandido: { backgroundColor: '#f8fafc', padding: '15px', borderBottom: '1px solid #e2e8f0' },
    contenedorPanelPlanificacion: { border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', padding: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    headerPanelConfig: { borderBottom: '2px solid #38bdf8', paddingBottom: '8px', marginBottom: '12px', fontSize: '12px' }, 
    grillaAsignacion: { display: 'flex', gap: '15px', justifyContent: 'space-between' },
    bloqueTrimestreConfig: { flex: 1, backgroundColor: '#f8fafc', border: '1px solid', borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s' },
    tituloBloque: { margin: '0 0 10px 0', fontSize: '11px', color: '#475569', textTransform: 'uppercase', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' },
    grupoInput: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '5px' },
    labelMini: { fontSize: '11px', color: '#475569', fontWeight: 'bold' },
    selectPanel: { backgroundColor: '#fff', color: '#334155', border: '1px solid #cbd5e1', fontSize: '11px', padding: '4px 5px', borderRadius: '3px', width: '75%', cursor: 'pointer' },
    seccionJustificacion: { marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #fca5a5' },
    labelMiniJustificacion: { fontSize: '10px', color: '#dc2626', fontWeight: 'bold' },
    selectJustificacion: { backgroundColor: '#fff', color: '#dc2626', border: '1px solid #fca5a5', fontSize: '11px', padding: '4px 5px', borderRadius: '3px', width: '60%', cursor: 'pointer' },
    inputJustificacion: { backgroundColor: '#fff', color: '#334155', border: '1px solid #cbd5e1', fontSize: '11px', padding: '5px 6px', borderRadius: '3px', width: '93%', marginTop: '4px' },
    tr: { transition: 'background-color 0.1s' }
};

export default EbmPage;