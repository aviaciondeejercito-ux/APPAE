import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API, { getPlanificacionEbm, actualizarConfiguracionEbm } from '../services/api'; 

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
    const [todoElPersonal, setTodoElPersonal] = useState([]); // Base de datos cruda filtrada por req
    const [personalFiltrado, setPersonalFiltrado] = useState([]); // Personal filtrado por el select de Unidad
    const [loading, setLoading] = useState(true);
    const [guardandoId, setGuardandoId] = useState(null); 
    const [todosLosSdas, setTodosLosSdas] = useState([]);
    const [todosLosElementos, setTodosLosElementos] = useState([]); // Lista de Unidades únicas para el Select
    const [elementoSeleccionado, setElementoSeleccionado] = useState(''); // Estado del selector de unidad
    
    const [sdasVisibles, setSdasVisibles] = useState({});
    const [filasDesplegadas, setFilasDesplegadas] = useState({});

    // --- NORMALIZACIÓN SINCRO JOKER v3.6 ---
    const rawRole = localStorage.getItem('role') || 'user';
    const roleNormalizado = rawRole.toUpperCase().replace(/[\s_]/g, '');
    const userUnidad = localStorage.getItem('elemento')?.trim().toUpperCase() || localStorage.getItem('unidad')?.trim().toUpperCase() || 'MI UNIDAD';

    const esMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleNormalizado);
    const esGestorOperativo = ['ADMIN', 'OPERACIONES', 'JEFE', 'OFICINATECNICA'].includes(roleNormalizado);

    const trimestreActualId = getTrimestreActualCronologico();

    useEffect(() => {
        fetchPlanificacion();
    }, []);

    // Hook para re-filtrar el personal cada vez que cambia el combo de Elemento/Unidad
    useEffect(() => {
        let filtrados = todoElPersonal;
        if (elementoSeleccionado && elementoSeleccionado !== 'TODOS') {
            filtrados = todoElPersonal.filter(p => {
                const uni = (p.elemento || p.unidad || '').trim().toUpperCase();
                return uni === elementoSeleccionado;
            });
        }
        setPersonalFiltrado(filtrados);

        // recalcular SdA disponibles para la unidad seleccionada
        const sdas = [...new Set(filtrados.map(p => p.aeronave).filter(Boolean))];
        setTodosLosSdas(sdas);

        // Resetear visibilidad (todo oculto al cambiar de elemento)
        const visibilidadInicial = {};
        sdas.forEach(sda => { visibilidadInicial[sda] = false; });
        setSdasVisibles(visibilidadInicial);
        setFilasDesplegadas({});
    }, [elementoSeleccionado, todoElPersonal]);

    const fetchPlanificacion = async () => {
        try {
            setLoading(true);
            const response = await getPlanificacionEbm();
            const dataBackend = response.data || [];

            // FILTRADO INICIAL DE SEGURIDAD POR JURISDICCIÓN
            const dataJurisdiccion = esMandoEstrategico
                ? dataBackend
                : dataBackend.filter(p => {
                    const unidadPiloto = p.elemento || p.unidad;
                    return unidadPiloto && unidadPiloto.trim().toUpperCase() === userUnidad;
                });

            setTodoElPersonal(dataJurisdiccion);

            // Extraer lista única de Elementos/Unidades para el combobox superior
            const elementosUnicos = [...new Set(dataJurisdiccion.map(p => (p.elemento || p.unidad || '').trim().toUpperCase()).filter(Boolean))].sort();
            setTodosLosElementos(elementosUnicos);

            // Definir selección inicial del combo
            if (esMandoEstrategico) {
                setElementoSeleccionado('TODOS');
            } else {
                setElementoSeleccionado(userUnidad);
            }

        } catch (error) {
            console.error("❌ Error al cargar planificación EBM:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSdaVisible = (sda) => {
        setSdasVisibles(prev => ({ ...prev, [sda]: !prev[sda] }));
    };

    const toggleFilaDesplegada = (id) => {
        setFilasDesplegadas(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleInputChange = (pilotoId, trimestreNum, campo, valor) => {
        if (!esGestorOperativo) return; 
        
        // Modificar en la lista local filtrada
        setPersonalFiltrado(prev => prev.map(p => {
            if (p._id !== pilotoId) return p;
            const keyTrimestre = `trimestre${trimestreNum}`;
            return { ...p, [keyTrimestre]: { ...p[keyTrimestre], [campo]: valor } };
        }));

        // Sincronizar en la lista maestra global
        setTodoElPersonal(prev => prev.map(p => {
            if (p._id !== pilotoId) return p;
            const keyTrimestre = `trimestre${trimestreNum}`;
            return { ...p, [keyTrimestre]: { ...p[keyTrimestre], [campo]: valor } };
        }));
    };

    const handleGuardarFila = async (pilotoId) => {
        if (!esGestorOperativo) {
            alert("No posee permisos de escritura para modificar el EBM.");
            return;
        }
        try {
            setGuardandoId(pilotoId);
            const pilotoData = personalFiltrado.find(p => p._id === pilotoId);
            
            const payload = {
                trimestre1: pilotoData.trimestre1,
                trimestre2: pilotoData.trimestre2,
                trimestre3: pilotoData.trimestre3,
                trimestre4: pilotoData.trimestre4
            };

            // Se envía la key combinada (idOriginal_SdA) para que el backend asocie el SdA correspondiente
            await actualizarConfiguracionEbm(pilotoId, payload);
            alert("Configuración de EBM actualizada correctamente para este SdA.");
            setFilasDesplegadas(prev => ({ ...prev, [pilotoId]: false }));
        } catch (error) {
            console.error(error);
            alert("Error al guardar cambios en el servidor.");
        } finally {
            setGuardandoId(false);
        }
    };

    // Agrupación táctica por SdA de la nómina actualmente filtrada
    const matrizSda = useMemo(() => {
        const agrupa = {};
        todosLosSdas.forEach(sda => { agrupa[sda] = []; });

        personalFiltrado.forEach(p => {
            if (p.aeronave && agrupa[p.aeronave]) {
                agrupa[p.aeronave].push(p);
            }
        });

        Object.keys(agrupa).forEach(sda => {
            agrupa[sda].sort((a, b) => {
                const ordenA = ORDEN_GRADOS[a.grado] || 99;
                const ordenB = ORDEN_GRADOS[b.grado] || 99;
                if (ordenA !== ordenB) return ordenA - ordenB;
                return (a.apellido || '').localeCompare(b.apellido || '');
            });
        });

        return agrupa;
    }, [personalFiltrado, todosLosSdas]);

    const formatearHoras = (valor) => {
        const num = Number(valor || 0);
        return Number.isInteger(num) ? num : num.toFixed(1);
    };

    const getEstiloFaltantes = (hFalt, numTrimestre) => {
        if (Number(hFalt) <= 0) return { color: '#2e7d32', fontWeight: 'bold' }; 
        if (numTrimestre < trimestreActualId) return { color: '#d32f2f', fontWeight: 'bold' }; 
        return { color: '#ed6c02', fontWeight: 'bold' }; 
    };

    const haySdaSeleccionado = Object.values(sdasVisibles).some(v => v === true);

    if (loading) {
        return <div style={styles.centerText}>Cargando Matriz de Eficiencia Bajo Mínimos...</div>;
    }

    return (
        <div style={styles.pageContainer}>
            <div style={styles.headerArea}>
                <div>
                    <h2 style={styles.title}>Planificación Anual EBM - Año 2026</h2>
                    <p style={styles.subtitle}>Jurisdicción de visualización activa</p>
                </div>
                
                {/* 🎛️ NUEVO PANEL DE FILTRADO SUPERIOR MULTI-UNIDAD */}
                <div style={styles.headerControlsRight}>
                    <div style={styles.containerFiltroUnidad}>
                        <span style={styles.labelFiltroUnidad}>Filtrar Elemento:</span>
                        <select
                            style={styles.selectUnidadSuperior}
                            value={elementoSeleccionado}
                            disabled={!esMandoEstrategico} // Bloqueado si no es del comando superior
                            onChange={(e) => setElementoSeleccionado(e.target.value)}
                        >
                            {esMandoEstrategico && <option value="TODOS">⚠️ VER TODO EL COMANDO</option>}
                            {todosLosElementos.map(el => (
                                <option key={el} value={el}>{el}</option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.badgeTrimestre}>
                        Trimestre Activo: T{trimestreActualId}
                    </div>
                </div>
            </div>

            {/* FILTROS DE SISTEMAS DE ARMAS */}
            <div style={styles.filterBar}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}>Seleccionar SdA para visualizar:</span>
                <div style={styles.filterGroup}>
                    {todosLosSdas.length === 0 ? (
                        <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>Sin aeronaves registradas para este elemento.</span>
                    ) : (
                        todosLosSdas.map(sda => (
                            <button 
                                key={sda} 
                                onClick={() => toggleSdaVisible(sda)}
                                style={{
                                    ...styles.filterButton,
                                    backgroundColor: sdasVisibles[sda] ? '#16a34a' : '#e2e8f0', 
                                    color: sdasVisibles[sda] ? 'white' : '#475569'
                                }}
                            >
                                {sda} {sdasVisibles[sda] ? '👁️' : '📁'}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* TABLA GLOBAL AGRUPADA */}
            <div style={styles.tableWrapper}>
                <table style={styles.mainTable}>
                    <thead>
                        <tr style={styles.tableHeaderRow}>
                            <th style={{...styles.th, width: '40px'}}>Acción</th>
                            <th style={styles.th}>Grado y Nombre</th>
                            <th style={{...styles.th, textAlign: 'center'}} colSpan={2}>Trimestre 1</th>
                            <th style={{...styles.th, textAlign: 'center'}} colSpan={2}>Trimestre 2</th>
                            <th style={{...styles.th, textAlign: 'center'}} colSpan={2}>Trimestre 3</th>
                            <th style={{...styles.th, textAlign: 'center'}} colSpan={2}>Trimestre 4</th>
                        </tr>
                        <tr style={styles.subHeaderRow}>
                            <th></th>
                            <th>Piloto</th>
                            <th style={styles.thSub}>Voladas</th><th style={styles.thSub}>Faltan</th>
                            <th style={styles.thSub}>Voladas</th><th style={styles.thSub}>Faltan</th>
                            <th style={styles.thSub}>Voladas</th><th style={styles.thSub}>Faltan</th>
                            <th style={styles.thSub}>Voladas</th><th style={styles.thSub}>Faltan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!haySdaSeleccionado ? (
                            <tr>
                                <td colSpan={10} style={styles.noDataRow}>
                                    💡 Presione uno o más botones de Sistema de Armas arriba para listar al personal correspondiente de {elementoSeleccionado}.
                                </td>
                            </tr>
                        ) : (
                            todosLosSdas.map(sda => {
                                if (!sdasVisibles[sda] || !matrizSda[sda] || matrizSda[sda].length === 0) return null;

                                return (
                                    <React.Fragment key={sda}>
                                        <tr style={styles.sdaGroupRow}>
                                            <td colSpan={10} style={styles.sdaGroupCell}>
                                                SISTEMA DE ARMAS: {sda} <span style={styles.countBadge}>({matrizSda[sda].length} listados)</span>
                                            </td>
                                        </tr>

                                        {matrizSda[sda].map(p => {
                                            const estaDesplegado = !!filasDesplegadas[p._id];

                                            return (
                                                <React.Fragment key={p._id}>
                                                    <tr style={styles.pilotRow}>
                                                        <td style={styles.tdCenter}>
                                                            <button 
                                                                style={styles.btnConfig} 
                                                                onClick={() => toggleFilaDesplegada(p._id)}
                                                            >
                                                                ⚙️
                                                            </button>
                                                        </td>
                                                        <td style={styles.tdName}>
                                                            <div>{p.grado} {p.apellido}, {p.nombre}</div>
                                                            <div style={styles.miniSubtext}>
                                                                Elemento: {p.elemento} | 
                                                                T1: {p.trimestre1?.condicion || 'S/D'} ({p.trimestre1?.tipoEbm || '-'})
                                                            </div>
                                                        </td>
                                                        
                                                        {/* Trimestres */}
                                                        <td style={styles.tdVoladas}>{formatearHoras(p.trimestre1?.hsVoladas)} hs</td>
                                                        <td style={{...styles.tdFaltan, ...getEstiloFaltantes(p.trimestre1?.hsFaltantes || 0, 1)}}>
                                                            {Number(p.trimestre1?.hsFaltantes || 0) <= 0 ? '✔ OK' : `${formatearHoras(p.trimestre1.hsFaltantes)} hs`}
                                                        </td>

                                                        <td style={styles.tdVoladas}>{formatearHoras(p.trimestre2?.hsVoladas)} hs</td>
                                                        <td style={{...styles.tdFaltan, ...getEstiloFaltantes(p.trimestre2?.hsFaltantes || 0, 2)}}>
                                                            {Number(p.trimestre2?.hsFaltantes || 0) <= 0 ? '✔ OK' : `${formatearHoras(p.trimestre2.hsFaltantes)} hs`}
                                                        </td>

                                                        <td style={styles.tdVoladas}>{formatearHoras(p.trimestre3?.hsVoladas)} hs</td>
                                                        <td style={{...styles.tdFaltan, ...getEstiloFaltantes(p.trimestre3?.hsFaltantes || 0, 3)}}>
                                                            {Number(p.trimestre3?.hsFaltantes || 0) <= 0 ? '✔ OK' : `${formatearHoras(p.trimestre3.hsFaltantes)} hs`}
                                                        </td>

                                                        <td style={styles.tdVoladas}>{formatearHoras(p.trimestre4?.hsVoladas)} hs</td>
                                                        <td style={{...styles.tdFaltan, ...getEstiloFaltantes(p.trimestre4?.hsFaltantes || 0, 4)}}>
                                                            {Number(p.trimestre4?.hsFaltantes || 0) <= 0 ? '✔ OK' : `${formatearHoras(p.trimestre4.hsFaltantes)} hs`}
                                                        </td>
                                                    </tr>

                                                    {estaDesplegado && (
                                                        <tr style={styles.configExpandedRow}>
                                                            <td colSpan={10} style={styles.configExpandedCell}>
                                                                <div style={styles.panelConfigFlex}>
                                                                    {[1, 2, 3, 4].map(num => {
                                                                        const trimData = p[`trimestre${num}`] || {};
                                                                        const mostrarJustificacion = num < trimestreActualId && Number(trimData.hsFaltantes || 0) > 0;

                                                                        return (
                                                                            <div 
                                                                                key={num} 
                                                                                style={{
                                                                                    ...styles.bloqueTrimestreConfig,
                                                                                    borderColor: mostrarJustificacion ? '#f87171' : '#e2e8f0',
                                                                                    backgroundColor: num === trimestreActualId ? '#f0fdf4' : '#f8fafc'
                                                                                }}
                                                                            >
                                                                                <h4 style={styles.tituloBloque}>Trimestre {num} {num === trimestreActualId && '🔹'}</h4>
                                                                                
                                                                                <div style={styles.grupoInput}>
                                                                                    <span style={styles.labelMini}>Rol:</span>
                                                                                    <select 
                                                                                        style={styles.selectPanel}
                                                                                        value={trimData.condicion || 'Copiloto'}
                                                                                        disabled={!esGestorOperativo}
                                                                                        onChange={(e) => handleInputChange(p._id, num, 'condicion', e.target.value)}
                                                                                    >
                                                                                        <option value="Copiloto">Copiloto</option>
                                                                                        <option value="Piloto">Piloto</option>
                                                                                        <option value="Instructor">Instructor</option>
                                                                                    </select>
                                                                                </div>

                                                                                <div style={styles.grupoInput}>
                                                                                    <span style={styles.labelMini}>Tipo EBM:</span>
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

                                                                                {mostrarJustificacion && (
                                                                                    <div style={styles.seccionJustificacion}>
                                                                                        <span style={styles.labelMiniJustificacion}>Justificación:</span>
                                                                                        <select
                                                                                            style={styles.selectJustificacion}
                                                                                            value={trimData.motivoNoCumplimiento || ''}
                                                                                            disabled={!esGestorOperativo}
                                                                                            onChange={(e) => handleInputChange(p._id, num, 'motivoNoCumplimiento', e.target.value)}
                                                                                        >
                                                                                            <option value="">Seleccione motivo...</option>
                                                                                            <option value="SIN AERONAVES DISPONIBLES">Sin Aeronaves Disponibles</option>
                                                                                            <option value="PROBLEMAS DE SALUD">Parte Médico / Salud</option>
                                                                                            <option value="COMISION DE SERVICIO">Comisión de Servicio fuera</option>
                                                                                            <option value="METEOROLOGIA ADVERSA">Meteorología Adversa Continua</option>
                                                                                            <option value="OTROS">Otros motivos operativos</option>
                                                                                        </select>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {esGestorOperativo && (
                                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                                                        <button 
                                                                            style={styles.btnSaveRow}
                                                                            onClick={() => handleGuardarFila(p._id)}
                                                                            disabled={guardandoId === p._id}
                                                                        >
                                                                            {guardandoId === p._id ? 'Guardando...' : '💾 Aplicar Cambios Legajo'}
                                                                        </button>
                                                                    </div>
                                                                )}
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
    headerArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'white', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
    title: { margin: 0, fontSize: '20px', color: '#1b3a57', fontWeight: 'bold' },
    subtitle: { margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' },
    headerControlsRight: { display: 'flex', alignItems: 'center', gap: '20px' },
    containerFiltroUnidad: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' },
    labelFiltroUnidad: { fontSize: '12px', fontWeight: 'bold', color: '#334155' },
    selectUnidadSuperior: { padding: '5px 10px', fontSize: '12px', fontWeight: 'bold', color: '#1b3a57', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer' },
    badgeTrimestre: { backgroundColor: '#1b3a57', color: 'white', padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' },
    filterBar: { backgroundColor: 'white', padding: '12px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
    filterGroup: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    filterButton: { border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '4px' },
    tableWrapper: { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' },
    mainTable: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    tableHeaderRow: { backgroundColor: '#1b3a57', color: 'white' },
    subHeaderRow: { backgroundColor: '#2c4e70', color: 'white' },
    th: { padding: '12px 15px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
    thSub: { padding: '6px 10px', fontSize: '11px', textAlign: 'center', fontWeight: 'normal', backgroundColor: '#244260' },
    sdaGroupRow: { backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' },
    sdaGroupCell: { padding: '10px 15px', fontWeight: 'bold', fontSize: '13px', color: '#1e293b' },
    countBadge: { fontWeight: 'normal', color: '#64748b', fontSize: '11px', marginLeft: '5px' },
    pilotRow: { borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' },
    tdCenter: { padding: '10px', textAlign: 'center' },
    tdName: { padding: '12px 15px', fontWeight: 'bold', fontSize: '13px', color: '#334155' },
    miniSubtext: { fontSize: '10px', color: '#64748b', fontWeight: 'normal', marginTop: '3px' },
    tdVoladas: { padding: '12px 10px', fontSize: '12px', color: '#334155', textAlign: 'center', backgroundColor: '#fafafa' },
    tdFaltan: { padding: '12px 10px', fontSize: '12px', textAlign: 'center', borderRight: '1px solid #f1f5f9' },
    btnConfig: { background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer', opacity: 0.7 },
    configExpandedRow: { backgroundColor: '#f8fafc', borderLeft: '4px solid #1b3a57' },
    configExpandedCell: { padding: '15px 20px', borderBottom: '1px solid #cbd5e1' },
    panelConfigFlex: { display: 'flex', gap: '15px', justifyContent: 'space-between' },
    bloqueTrimestreConfig: { flex: 1, backgroundColor: '#f8fafc', border: '1px solid', borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column' },
    tituloBloque: { margin: '0 0 10px 0', fontSize: '11px', color: '#475569', textTransform: 'uppercase', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' },
    grupoInput: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '5px' },
    labelMini: { fontSize: '11px', color: '#475569', fontWeight: 'bold' },
    selectPanel: { backgroundColor: '#fff', color: '#334155', border: '1px solid #cbd5e1', fontSize: '11px', padding: '4px 5px', borderRadius: '3px', width: '75%', cursor: 'pointer' },
    seccionJustificacion: { marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #fca5a5' },
    labelMiniJustificacion: { fontSize: '10px', color: '#dc2626', fontWeight: 'bold' },
    selectJustificacion: { backgroundColor: '#fff', color: '#dc2626', border: '1px solid #fca5a5', fontSize: '10px', padding: '4px 5px', borderRadius: '3px', width: '100%', cursor: 'pointer', marginTop: '4px' },
    btnSaveRow: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
    centerText: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', fontSize: '14px', color: '#475569', fontWeight: 'bold' },
    noDataRow: { padding: '30px', color: '#475569', fontSize: '13px', textAlign: 'center', backgroundColor: '#f8fafc', fontStyle: 'italic' }
};

export default EbmPage;