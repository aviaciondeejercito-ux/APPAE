import React, { useState, useEffect, useCallback } from 'react';
// Importamos la función declarada y tipada en tu archivo api.js centralizado
import { getPlanificacionEbm } from '../services/api'; 

const EbmPage = () => {
    const [personal, setPersonal] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Lista total de SDAs detectados dinámicamente en la unidad
    const [todosLosSdas, setTodosLosSdas] = useState([]);
    // Estado para controlar qué SDAs se muestran (objeto clave-valor: { 'C-130': true, 'IA-63': false })
    const [sdasVisibles, setSdasVisibles] = useState({});
    
    // El ID de despliegue es compuesto: "pilotoId_sistema" para evitar abrir duplicados al mismo tiempo
    const [filasDesplegadas, setFilasDesplegadas] = useState({});

    // --- DATOS DE SESIÓN ---
    const userUnidad = localStorage.getItem('elemento') || localStorage.getItem('unidad') || 'MI UNIDAD';

    // --- DETECCIÓN DEL TRIMESTRE ACTUAL (Año 2026) ---
    const getTrimestreActualCronologico = () => {
        const mesActual = new Date().getMonth(); // 0 = Ene, 11 = Dic
        if (mesActual >= 0 && mesActual <= 2) return 1;
        if (mesActual >= 3 && mesActual <= 5) return 2;
        if (mesActual >= 6 && mesActual <= 8) return 3;
        return 4;
    };
    const trimestreActualId = getTrimestreActualCronologico();

    const fetchPersonal = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getPlanificacionEbm();
            const dataBackend = response.data || [];

            // Inyectamos un estado base de configuraciones si el backend no lo provee estructurado por SdA
            const datosInicializados = dataBackend.map(p => ({
                ...p,
                configTrimestresSda: p.configTrimestresSda || {}
            }));

            setPersonal(datosInicializados);

            // 🔍 EXTRAER SDAs DINÁMICAMENTE SEGÚN LAS HABILITACIONES EXPRESADAS EN LA UNIDAD
            const sdasDetectados = Array.from(
                new Set(datosInicializados.flatMap(p => p.habilitaciones?.map(h => h.aeronave).filter(Boolean) || []))
            );
            setTodosLosSdas(sdasDetectados);

            // Inicialmente, todos los sistemas se marcan como activos (visibles)
            const visibilidadInicial = {};
            sdasDetectados.forEach(sda => {
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

    // Alternar visibilidad de la fila expandible usando clave compuesta
    const toggleDespliegueFila = (pilotoId, sda) => {
        const key = `${pilotoId}_${sda}`;
        setFilasDesplegadas(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Alternar el filtro de visualización de un SdA específico en la barra superior
    const toggleVisibilidadSda = (sdaName) => {
        setSdasVisibles(prev => ({
            ...prev,
            [sdaName]: !prev[sdaName]
        }));
    };

    // Actualiza la configuración trimestral específica de un piloto PARA un sistema de armas determinado
    const handleConfigChange = (pilotoId, sda, trimestre, campo, valor) => {
        setPersonal(prevPersonal => 
            prevPersonal.map(p => {
                if (p._id !== pilotoId) return p;
                const configSdaActual = p.configTrimestresSda?.[sda] || {
                    t1: { rol: '', tipo: '' }, t2: { rol: '', tipo: '' }, t3: { rol: '', tipo: '' }, t4: { rol: '', tipo: '' }
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

    // --- PROCESAMIENTO Y GENERACIÓN DE LA MATRIZ DE RECORRIDO POR SISTEMA ---
    const obtenerMatrizPorSistema = () => {
        const esquemasPorSda = {};

        personal.forEach(piloto => {
            const habilitaciones = piloto.habilitaciones || [];
            habilitaciones.forEach(hab => {
                const sdaName = hab.aeronave;
                if (!sdaName) return;

                // 🛑 FILTRO DINÁMICO SELECTIVO: Si el SdA fue desactivado en la botonera superior, no se procesa
                if (sdasVisibles[sdaName] === false) return;

                if (!esquemasPorSda[sdaName]) {
                    esquemasPorSda[sdaName] = [];
                }

                esquemasPorSda[sdaName].push({
                    ...piloto,
                    sistemaActivo: sdaName 
                });
            });
        });

        // Ordenamiento Jerárquico y Alfabético interno para cada SdA
        const ordenGrados = { 'CR': 1, 'TC': 2, 'MY': 3, 'CT': 4, 'TP': 5, 'TT': 6, 'ST': 7 };
        
        Object.keys(esquemasPorSda).forEach(sda => {
            esquemasPorSda[sda].sort((a, b) => {
                const pesoA = ordenGrados[a.grado] || 99;
                const pesoB = ordenGrados[b.grado] || 99;
                if (pesoA !== pesoB) return pesoA - pesoB;

                const apellidoA = (a.apellido || '').trim().toUpperCase();
                const apellidoB = (b.apellido || '').trim().toUpperCase();
                if (apellidoA !== apellidoB) return apellidoA.localeCompare(apellidoB);

                const nombreA = (a.nombre || '').trim().toUpperCase();
                const nombreB = (b.nombre || '').trim().toUpperCase();
                return nombreA.localeCompare(nombreB);
            });
        });

        return esquemasPorSda;
    };

    const matrizSda = obtenerMatrizPorSistema();

    // Helper Dinámico de Renderizado con Semáforo de Alertas
    const renderCeldaTrimestre = (nroTrimestre, horasVoladas = 0, horasFaltantes = 0) => {
        let colorEstado = '#555';

        if (horasFaltantes <= 0) {
            colorEstado = '#0f0'; // CUMPLIDO -> Verde
        } else {
            if (nroTrimestre < trimestreActualId) {
                colorEstado = '#ff4d4d'; // EXPIRED/INCUMPLIDO -> Rojo
            } else {
                colorEstado = '#ff9800'; // EN CURSO SIN CUMPLIR -> Amarillo
            }
        }

        return (
            <td style={styles.tdMétrica}>
                <div style={{ color: colorEstado, fontWeight: 'bold' }}>{horasVoladas} hs</div>
                {horasFaltantes > 0 && (
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                        Faltan: <span style={{ color: colorEstado }}>{horasFaltantes} hs</span>
                    </div>
                )}
            </td>
        );
    };

    // Helper de bloques de asignación adaptados a claves SdA
    const renderBloqueAsignacion = (piloto, sda, tKey, tLabel) => {
        const conf = piloto.configTrimestresSda?.[sda]?.[tKey] || { rol: '', tipo: '' };
        return (
            <div style={styles.bloqueTrimestreConfig}>
                <h5 style={styles.tituloBloque}>{tLabel}</h5>
                <div style={styles.grupoInput}>
                    <label style={styles.labelMini}>ROL:</label>
                    <select 
                        value={conf.rol} 
                        onChange={(e) => handleConfigChange(piloto._id, sda, tKey, 'rol', e.target.value)}
                        style={styles.selectPanel}
                    >
                        <option value="">-- SELECCIONE --</option>
                        <option value="Copiloto">COPILOTO</option>
                        <option value="Piloto">PILOTO</option>
                        <option value="Instructor">INSTRUCTOR</option>
                    </select>
                </div>
                <div style={styles.grupoInput}>
                    <label style={styles.labelMini}>TIPO:</label>
                    <select 
                        value={conf.tipo} 
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
            </div>
        );
    };

    if (loading) return <div style={{ color: '#0f0', padding: '20px', fontFamily: 'monospace' }}>CARGANDO MATRIZ DE OPERACIONES EBM...</div>;

    // Evaluamos si hay al menos un SdA activo en los filtros visuales
    const haySdasVisibles = Object.values(sdasVisibles).some(v => v === true);

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h2 style={{ margin: 0, textTransform: 'uppercase' }}>NÓMINA EBM POR SISTEMA - {userUnidad}</h2>
                
                {/* 🎛️ NUEVO SELECTOR DINÁMICO TIPO TAGS */}
                <div style={styles.contenedorFiltrosDinamicos}>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#888', fontWeight: 'bold' }}>
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
                                        backgroundColor: estaActivo ? '#1a241f' : '#222',
                                        color: estaActivo ? '#0f0' : '#555',
                                        borderColor: estaActivo ? '#0f0' : '#444'
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
                            <React.Fragment key={sdaNom}>
                                <tr>
                                    <td colSpan="8" style={styles.thSeparadorSda}>
                                        ✈️ SISTEMA DE ARMAS: {sdaNom.toUpperCase()}
                                    </td>
                                </tr>
                                
                                {matrizSda[sdaNom].map(p => {
                                    const filaKey = `${p._id}_${sdaNom}`;
                                    const hTrim = p.horasTrimestralesSda?.[sdaNom] || {};
                                    const hFalt = p.horasFaltantesSda?.[sdaNom] || {};
                                    const totalAnualSda = p.horasAcumuladasSda?.[sdaNom] || 0;

                                    return (
                                        <React.Fragment key={filaKey}>
                                            <tr style={styles.tr}>
                                                <td style={styles.tdGrado}><span style={{ color: '#0f0', fontFamily: 'monospace' }}>{p.grado}</span></td>
                                                <td style={styles.tdNombre}>
                                                    <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{p.apellido}, {p.nombre}</span>
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
                                                            backgroundColor: filasDesplegadas[filaKey] ? '#ff9800' : '#222'
                                                        }}
                                                    >
                                                        ⚙️
                                                    </button>
                                                </td>
                                            </tr>

                                            {filasDesplegadas[filaKey] && (
                                                <tr>
                                                    <td colSpan="8" style={styles.tdExpandido}>
                                                        <div style={styles.contenedorPanelPlanificacion}>
                                                            <div style={styles.headerPanelConfig}>
                                                                <span style={{ color: '#0f0', fontWeight: 'bold' }}>
                                                                    CONFIGURACIÓN {sdaNom} - {p.grado} {p.apellido}
                                                                </span>
                                                            </div>
                                                            <div style={styles.grillaAsignacion}>
                                                                {renderBloqueAsignacion(p, sdaNom, 't1', '1er Trimestre')}
                                                                {renderBloqueAsignacion(p, sdaNom, 't2', '2do Trimestre')}
                                                                {renderBloqueAsignacion(p, sdaNom, 't3', '3er Trimestre')}
                                                                {renderBloqueAsignacion(p, sdaNom, 't4', '4to Trimestre')}
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
                            <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#666', fontFamily: 'monospace' }}>
                                ACTIVÁ AL MENOS UN SISTEMA EN LA BARRA SUPERIOR PARA VISUALIZAR LA PLANIFICACIÓN EBM
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const styles = {
    container: { padding: '20px', backgroundColor: '#121212', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    
    // Header rediseñado en bloque vertical para albergar la botonera
    header: { display: 'flex', flexDirection: 'column', gap: '15px', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '20px' },
    contenedorFiltrosDinamicos: { display: 'flex', flexDirection: 'column', gap: '8px' },
    grupoTags: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
    tagSda: { border: '1px solid', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', cursor: 'pointer', transition: 'all 0.15s ease' },
    
    table: { width: '100%', borderCollapse: 'collapse' },
    thSeparadorSda: { backgroundColor: '#1a241f', color: '#0f0', padding: '10px 15px', fontSize: '13px', fontFamily: 'monospace', fontWeight: 'bold', borderLeft: '4px solid #0f0', letterSpacing: '1px', borderBottom: '1px solid #2a3a30' },
    th: { textAlign: 'left', padding: '12px', color: '#888', borderBottom: '2px solid #444', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' },
    thTrimestre: { textAlign: 'right', padding: '12px', color: '#666', borderBottom: '2px solid #444', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', width: '12%' },
    thTotal: { textAlign: 'right', padding: '12px', color: '#888', borderBottom: '2px solid #444', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', width: '10%' },
    thAcciones: { textAlign: 'center', padding: '12px', color: '#888', borderBottom: '2px solid #444', fontSize: '12px', fontWeight: 'bold', width: '6%' },
    tdGrado: { padding: '12px', borderBottom: '1px solid #222', fontSize: '14px', width: '8%' },
    tdNombre: { padding: '12px', borderBottom: '1px solid #222', fontSize: '14px' },
    tdMétrica: { padding: '10px 12px', borderBottom: '1px solid #222', fontSize: '14px', textAlign: 'right', fontFamily: 'monospace', lineHeight: '1.3' },
    tdTotal: { padding: '12px', borderBottom: '1px solid #222', fontSize: '14px', textAlign: 'right', color: '#0f0', fontFamily: 'monospace', fontWeight: 'bold' },
    tdAcciones: { padding: '12px', borderBottom: '1px solid #222', textAlign: 'center' },
    btnConfig: { border: '1px solid #444', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' },
    tdExpandido: { backgroundColor: '#151515', padding: '12px', borderBottom: '1px solid #333' },
    contenedorPanelPlanificacion: { border: '1px solid #333', borderRadius: '6px', backgroundColor: '#1c1c1c', padding: '15px' },
    headerPanelConfig: { borderBottom: '1px solid #2a2a2a', paddingBottom: '8px', marginBottom: '12px', fontSize: '11px', fontFamily: 'monospace' },
    grillaAsignacion: { display: 'flex', gap: '15px', justifyContent: 'space-between' },
    bloqueTrimestreConfig: { flex: 1, backgroundColor: '#121212', border: '1px solid #2d2d2d', borderRadius: '4px', padding: '10px' },
    tituloBloque: { margin: '0 0 10px 0', fontSize: '11px', color: '#aaa', textTransform: 'uppercase', fontFamily: 'monospace', textAlign: 'center', borderBottom: '1px solid #252525', paddingBottom: '4px' },
    grupoInput: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '5px' },
    labelMini: { fontSize: '11px', color: '#555', fontFamily: 'monospace', fontWeight: 'bold' },
    selectPanel: { backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '11px', padding: '3px 5px', borderRadius: '3px', width: '75%', cursor: 'pointer' },
    tr: { transition: 'background-color 0.1s', ':hover': { backgroundColor: '#161616' } }
};

export default EbmPage;