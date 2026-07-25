import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProgramaMantenimiento = ({ aeronaveId }) => {
    // ----------------------------------------------------
    // ESTADOS
    // ----------------------------------------------------
    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [tabActivo, setTabActivo] = useState('programaPlaneador');

    // Datos del Programa
    const [programa, setPrograma] = useState({
        tgPlaneadorActual: "0,0",
        tgMotorActual: "0,0",
        tgMotor2Actual: "0,0",
        tgHeliceActual: "0,0",
        tgHelice2Actual: "0,0",
        programaPlaneador: [],
        programaMotor: [],
        programaMotor2: [],
        programaHelice: [],
        programaHelice2: []
    });

    // Componentes de la BD (Solo Lectura)
    const [listaComponentes, setListaComponentes] = useState([]);
    const [sistemaFiltro, setSistemaFiltro] = useState('Planeador');
    const [componenteSeleccionadoId, setComponenteSeleccionadoId] = useState('');
    const [componenteDetalle, setComponenteDetalle] = useState(null);

    // ----------------------------------------------------
    // CARGA INICIAL DE DATOS
    // ----------------------------------------------------
    useEffect(() => {
        if (aeronaveId) {
            cargarPrograma();
            cargarComponentesAeronave();
        }
    }, [aeronaveId]);

    const cargarPrograma = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/programa-mantenimiento/${aeronaveId}`);
            if (res.data && res.data.data) {
                setPrograma(res.data.data);
            }
        } catch (err) {
            console.error("Error al cargar programa:", err);
            mostrarNotificacion("error", "Error al cargar el programa de mantenimiento.");
        } finally {
            setLoading(false);
        }
    };

    const cargarComponentesAeronave = async () => {
        try {
            const res = await axios.get(`/api/aeronaves/${aeronaveId}/componentes`);
            if (res.data && Array.isArray(res.data)) {
                setListaComponentes(res.data);
            }
        } catch (err) {
            console.error("Error al cargar componentes:", err);
        }
    };

    // ----------------------------------------------------
    // LÓGICA DE VISOR DE COMPONENTES (SOLO LECTURA)
    // ----------------------------------------------------
    const componentesFiltradosVisor = listaComponentes.filter(c => {
        if (!c.sistema) return sistemaFiltro === 'Planeador';
        return c.sistema.toLowerCase() === sistemaFiltro.toLowerCase();
    });

    useEffect(() => {
        if (!componenteSeleccionadoId) {
            setComponenteDetalle(null);
            return;
        }
        const comp = listaComponentes.find(c => (c._id || c.id) === componenteSeleccionadoId);
        setComponenteDetalle(comp || null);
    }, [componenteSeleccionadoId, listaComponentes]);

    // ----------------------------------------------------
    // MANEJO DE RENGLONES EN LA TABLA
    // ----------------------------------------------------
    const handleRenglonChange = (index, campo, valor) => {
        setPrograma(prev => {
            const nuevosRenglones = [...prev[tabActivo]];
            nuevosRenglones[index] = {
                ...nuevosRenglones[index],
                [campo]: valor
            };
            return { ...prev, [tabActivo]: nuevosRenglones };
        });
    };

    const handleSelectComponenteEnFila = (index, compId) => {
        const comp = listaComponentes.find(c => (c._id || c.id) === compId);

        setPrograma(prev => {
            const nuevosRenglones = [...prev[tabActivo]];
            if (comp) {
                nuevosRenglones[index] = {
                    ...nuevosRenglones[index],
                    componenteRef: comp._id || comp.id,
                    componenteNombre: `${comp.nombre || 'COMPONENTE'} (P/N: ${comp.pn || 'S/D'})`,
                    tgComponente: comp.tgInstalacion || comp.tgAcumulado || "0,0",
                    limiteComponente: `${comp.limiteValor || ''} ${comp.limiteUnidad || ''} ${comp.limiteTipo ? `(${comp.limiteTipo})` : ''}`.trim(),
                    dispComponente: comp.disponibleReal || comp.disponible || "0,0",
                    descripcion: nuevosRenglones[index].descripcion || `INSPECCIÓN DE ${comp.nombre?.toUpperCase() || 'COMPONENTE'}`
                };
            } else {
                nuevosRenglones[index] = {
                    ...nuevosRenglones[index],
                    componenteRef: "",
                    componenteNombre: "",
                    tgComponente: "",
                    limiteComponente: "",
                    dispComponente: ""
                };
            }
            return { ...prev, [tabActivo]: nuevosRenglones };
        });
    };

    const agregarRenglon = () => {
        const nuevoRenglon = {
            id: `temp-${Date.now()}`,
            componenteRef: "",
            componenteNombre: "",
            tgComponente: "",
            limiteComponente: "",
            dispComponente: "",
            descripcion: "",
            tipoCriterio: "HORAS",
            intervaloHs: "",
            intervaloMeses: 0,
            intervaloLandings: 0,
            intervaloCiclos: 0,
            ultHs: "",
            ultFecha: "",
            ultLandings: "",
            ultCiclos: "",
            ultOt: "",
            proxHs: "",
            proxFecha: "",
            proxLandings: "",
            proxCiclos: "",
            responsable: "Ec AE",
            disp: ""
        };

        setPrograma(prev => ({
            ...prev,
            [tabActivo]: [...prev[tabActivo], nuevoRenglon]
        }));
    };

    const eliminarRenglon = (index) => {
        setPrograma(prev => {
            const nuevosRenglones = [...prev[tabActivo]];
            nuevosRenglones.splice(index, 1);
            return { ...prev, [tabActivo]: nuevosRenglones };
        });
    };

    // ----------------------------------------------------
    // PERSISTENCIA (GUARDAR EN PROGRAMA)
    // ----------------------------------------------------
    const guardarPrograma = async () => {
        setLoading(true);
        try {
            const payload = {
                aeronaveId,
                ...programa
            };

            const res = await axios.post('/api/programa-mantenimiento/guardar', payload);
            if (res.data && res.data.status === 'success') {
                mostrarNotificacion("success", "Programa de mantenimiento guardado correctamente.");
                if (res.data.data) {
                    setPrograma(res.data.data);
                }
            }
        } catch (err) {
            console.error("Error al guardar programa:", err);
            mostrarNotificacion("error", "Error al guardar el programa de mantenimiento.");
        } finally {
            setLoading(false);
        }
    };

    const mostrarNotificacion = (tipo, text) => {
        setMensaje({ tipo, text });
        setTimeout(() => setMensaje(null), 4000);
    };

    // Helper para etiqueta de TG según el Tab activo
    const getTgActualTab = () => {
        switch (tabActivo) {
            case 'programaPlaneador': return { label: 'TOTAL PLANEADOR ACTUAL', val: programa.tgPlaneadorActual, key: 'tgPlaneadorActual' };
            case 'programaMotor': return { label: 'TOTAL MOTOR 1 ACTUAL', val: programa.tgMotorActual, key: 'tgMotorActual' };
            case 'programaMotor2': return { label: 'TOTAL MOTOR 2 ACTUAL', val: programa.tgMotor2Actual, key: 'tgMotor2Actual' };
            case 'programaHelice': return { label: 'TOTAL HÉLICE 1 ACTUAL', val: programa.tgHeliceActual, key: 'tgHeliceActual' };
            case 'programaHelice2': return { label: 'TOTAL HÉLICE 2 ACTUAL', val: programa.tgHelice2Actual, key: 'tgHelice2Actual' };
            default: return { label: 'TOTAL ACTUAL', val: '0,0', key: '' };
        }
    };

    const currentTg = getTgActualTab();

    // ----------------------------------------------------
    // ESTILOS LIMPIOS Y SEGUROS (CSS NATIVO)
    // ----------------------------------------------------
    const styles = {
        container: { fontFamily: 'Arial, sans-serif', padding: '16px', backgroundColor: '#f8fafc', color: '#1e293b' },
        card: { backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
        cardTitle: { fontWeight: 'bold', fontSize: '12px', color: '#334155', textTransform: 'uppercase', marginBottom: '10px' },
        input: { padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', backgroundColor: '#ffffff', color: '#0f172a', width: '100%', boxSizing: 'border-box' },
        inputCenter: { textAlign: 'center' },
        btnPrimary: { backgroundColor: '#48bb78', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 14px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' },
        btnSecondary: { backgroundColor: '#e2e8f0', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 14px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' },
        btnDelete: { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold' },
        tab: { padding: '8px 16px', border: '1px solid #cbd5e1', borderBottom: 'none', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '4px 4px 0 0', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
        tabActive: { padding: '8px 16px', border: '1px solid #cbd5e1', borderBottom: '2px solid #ffffff', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '4px 4px 0 0', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
        table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff', fontSize: '12px' },
        th: { backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px', color: '#334155', fontWeight: 'bold', fontSize: '11px', textAlign: 'left' },
        td: { border: '1px solid #cbd5e1', padding: '6px', verticalAlign: 'top' },
        snapshot: { marginTop: '4px', padding: '4px 6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '10px', color: '#64748b' }
    };

    return (
        <div style={styles.container}>
            
            {/* NOTIFICACIÓN FLOTANTE */}
            {mensaje && (
                <div style={{ ...styles.card, backgroundColor: mensaje.tipo === 'success' ? '#dcfce7' : '#fee2e2', color: mensaje.tipo === 'success' ? '#166534' : '#991b1b', borderColor: mensaje.tipo === 'success' ? '#86efac' : '#fca5a5' }}>
                    {mensaje.text}
                </div>
            )}

            {/* 1. VISOR DE COMPONENTES / FICHA TÉCNICA (SOLO LECTURA) */}
            <div style={styles.card}>
                <div style={styles.cardTitle}>VISOR DE COMPONENTES / FICHA TÉCNICA (SOLO LECTURA)</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '12px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>SISTEMA / GRUPO</label>
                        <select 
                            value={sistemaFiltro} 
                            onChange={(e) => {
                                setSistemaFiltro(e.target.value);
                                setComponenteSeleccionadoId('');
                            }}
                            style={styles.input}
                        >
                            <option value="Planeador">Planeador</option>
                            <option value="Motor 1">Motor 1</option>
                            <option value="Motor 2">Motor 2</option>
                            <option value="Hélice 1">Hélice 1</option>
                            <option value="Hélice 2">Hélice 2</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>SELECCIONAR COMPONENTE A CONSULTAR</label>
                        <select 
                            value={componenteSeleccionadoId} 
                            onChange={(e) => setComponenteSeleccionadoId(e.target.value)}
                            style={styles.input}
                        >
                            <option value="">-- Seleccionar para ver detalle completo --</option>
                            {componentesFiltradosVisor.map((comp) => (
                                <option key={comp._id || comp.id} value={comp._id || comp.id}>
                                    {comp.nombre} | P/N: {comp.pn || 'N/A'} | S/N: {comp.sn || 'N/A'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* RESUMEN ESTÁTICO DE INFORMACIÓN DE LA BD */}
                {componenteDetalle ? (
                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', fontSize: '11px' }}>
                        <div><span style={{ color: '#64748b', display: 'block' }}>ATA</span> <strong>{componenteDetalle.ata || 'N/A'}</strong></div>
                        <div><span style={{ color: '#64748b', display: 'block' }}>P/N</span> <strong>{componenteDetalle.pn || 'N/A'}</strong></div>
                        <div><span style={{ color: '#64748b', display: 'block' }}>S/N</span> <strong>{componenteDetalle.sn || 'N/A'}</strong></div>
                        <div><span style={{ color: '#64748b', display: 'block' }}>TG Inst.</span> <strong style={{ color: '#d97706' }}>{componenteDetalle.tgInstalacion || componenteDetalle.tgAcumulado || '0,0'}</strong></div>
                        <div><span style={{ color: '#64748b', display: 'block' }}>Límite BD</span> <strong>{componenteDetalle.limiteValor || '-'} {componenteDetalle.limiteUnidad || ''}</strong></div>
                        <div><span style={{ color: '#64748b', display: 'block' }}>Disponible BD</span> <strong style={{ color: '#16a34a' }}>{componenteDetalle.disponibleReal || componenteDetalle.disponible || 'N/A'}</strong></div>
                    </div>
                ) : (
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '4px' }}>
                        Seleccione un componente del desplegable para consultar su ficha técnica grabada en la base de datos sin alterar registros.
                    </div>
                )}
            </div>

            {/* 2. BARRA DE NAVEGACIÓN DE TABS DEL PROGRAMA */}
            <div style={{ display: 'flex', gap: '4px' }}>
                {[
                    { key: 'programaPlaneador', label: 'PLANEADOR' },
                    { key: 'programaMotor', label: 'MOTOR 1' },
                    { key: 'programaMotor2', label: 'MOTOR 2' },
                    { key: 'programaHelice', label: 'HÉLICE 1' },
                    { key: 'programaHelice2', label: 'HÉLICE 2' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setTabActivo(tab.key)}
                        style={tabActivo === tab.key ? styles.tabActive : styles.tab}
                    >
                        {tab.label} ({programa[tab.key]?.length || 0})
                    </button>
                ))}
            </div>

            {/* CUERPO PRINCIPAL */}
            <div style={{ ...styles.card, borderRadius: '0 0 6px 6px', borderTop: 'none', marginTop: '0' }}>
                
                {/* CABECERA DE TABLA CON TG Y BOTÓN AGREGAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>{currentTg.label}:</span>
                        <input 
                            type="text" 
                            value={currentTg.val}
                            onChange={(e) => setPrograma(prev => ({ ...prev, [currentTg.key]: e.target.value }))}
                            style={{ ...styles.input, ...styles.inputCenter, width: '90px', fontWeight: 'bold' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={agregarRenglon} style={styles.btnSecondary}>+ AGREGAR INSPECCIÓN</button>
                        <button onClick={guardarPrograma} disabled={loading} style={styles.btnPrimary}>
                            {loading ? "GUARDANDO..." : "GUARDAR PROGRAMA"}
                        </button>
                    </div>
                </div>

                {/* 3. TABLA DEL PROGRAMA DE MANTENIMIENTO */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ ...styles.th, minWidth: '220px' }}>Componente (BD) / Descripción</th>
                                <th style={{ ...styles.th, width: '110px' }}>Criterio</th>
                                <th style={{ ...styles.th, width: '90px' }}>Intervalo</th>
                                <th style={{ ...styles.th, width: '90px' }}>Últ. Hs/Reg</th>
                                <th style={{ ...styles.th, width: '105px' }}>Últ. Fecha</th>
                                <th style={{ ...styles.th, width: '70px' }}>O.T.</th>
                                <th style={{ ...styles.th, width: '90px' }}>Próx. Venc</th>
                                <th style={{ ...styles.th, width: '105px' }}>Próx. Fecha</th>
                                <th style={{ ...styles.th, width: '70px' }}>Resp.</th>
                                <th style={{ ...styles.th, width: '70px' }}>Disp.</th>
                                <th style={{ ...styles.th, width: '40px', textAlign: 'center' }}>Acc</th>
                            </tr>
                        </thead>
                        <tbody>
                            {programa[tabActivo]?.length === 0 ? (
                                <tr>
                                    <td colSpan="11" style={{ ...styles.td, textAlign: 'center', padding: '20px', color: '#94a3b8', fontStyle: 'italic' }}>
                                        No hay inspecciones registradas en esta sección. Presione "Agregar Inspección" para crear una nueva alerta.
                                    </td>
                                </tr>
                            ) : (
                                programa[tabActivo]?.map((renglon, idx) => (
                                    <tr key={renglon.id || renglon._id || idx}>
                                        
                                        {/* COMPONENTE BD + DESCRIPCIÓN */}
                                        <td style={styles.td}>
                                            <select 
                                                value={renglon.componenteRef || ""}
                                                onChange={(e) => handleSelectComponenteEnFila(idx, e.target.value)}
                                                style={{ ...styles.input, marginBottom: '4px' }}
                                            >
                                                <option value="">-- Sin Componente BD Vinculado --</option>
                                                {listaComponentes.map(c => (
                                                    <option key={c._id || c.id} value={c._id || c.id}>
                                                        {c.nombre} (P/N: {c.pn || 'N/A'})
                                                    </option>
                                                ))}
                                            </select>

                                            <input 
                                                type="text" 
                                                value={renglon.descripcion || ''}
                                                onChange={(e) => handleRenglonChange(idx, 'descripcion', e.target.value)}
                                                placeholder="Descripción de la inspección..."
                                                style={{ ...styles.input, fontWeight: 'bold' }}
                                            />

                                            {/* SNAPSHOT BD */}
                                            {renglon.componenteRef && (
                                                <div style={styles.snapshot}>
                                                    <div>TG Acum: <strong>{renglon.tgComponente || '0,0'}</strong></div>
                                                    <div>Límite: {renglon.limiteComponente || 'N/A'}</div>
                                                    <div>Disp: <strong style={{ color: '#16a34a' }}>{renglon.dispComponente || 'N/A'}</strong></div>
                                                </div>
                                            )}
                                        </td>

                                        {/* CRITERIO */}
                                        <td style={styles.td}>
                                            <select 
                                                value={renglon.tipoCriterio || 'HORAS'}
                                                onChange={(e) => handleRenglonChange(idx, 'tipoCriterio', e.target.value)}
                                                style={styles.input}
                                            >
                                                <option value="HORAS">Horas (Hs)</option>
                                                <option value="FECHA">Fecha Fija</option>
                                                <option value="MESES">Meses</option>
                                                <option value="LANDINGS">Landings</option>
                                                <option value="CICLOS">Ciclos</option>
                                            </select>
                                        </td>

                                        {/* INTERVALO */}
                                        <td style={styles.td}>
                                            {renglon.tipoCriterio === 'HORAS' && (
                                                <input type="text" placeholder="Ej: 200" value={renglon.intervaloHs || ''} onChange={(e) => handleRenglonChange(idx, 'intervaloHs', e.target.value)} style={{ ...styles.input, ...styles.inputCenter }} />
                                            )}
                                            {renglon.tipoCriterio === 'MESES' && (
                                                <input type="number" placeholder="Meses" value={renglon.intervaloMeses || 0} onChange={(e) => handleRenglonChange(idx, 'intervaloMeses', e.target.value)} style={{ ...styles.input, ...styles.inputCenter }} />
                                            )}
                                            {renglon.tipoCriterio === 'LANDINGS' && (
                                                <input type="number" placeholder="Landings" value={renglon.intervaloLandings || 0} onChange={(e) => handleRenglonChange(idx, 'intervaloLandings', e.target.value)} style={{ ...styles.input, ...styles.inputCenter }} />
                                            )}
                                            {renglon.tipoCriterio === 'CICLOS' && (
                                                <input type="number" placeholder="Ciclos" value={renglon.intervaloCiclos || 0} onChange={(e) => handleRenglonChange(idx, 'intervaloCiclos', e.target.value)} style={{ ...styles.input, ...styles.inputCenter }} />
                                            )}
                                            {renglon.tipoCriterio === 'FECHA' && (
                                                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', textAlign: 'center' }}>Fijo</span>
                                            )}
                                        </td>

                                        {/* ÚLTIMO CUMPLIMIENTO */}
                                        <td style={styles.td}>
                                            {renglon.tipoCriterio === 'HORAS' && (
                                                <input type="text" placeholder="Últ. Hs" value={renglon.ultHs || ''} onChange={(e) => handleRenglonChange(idx, 'ultHs', e.target.value)} style={{ ...styles.input, ...styles.inputCenter }} />
                                            )}
                                            {renglon.tipoCriterio === 'LANDINGS' && (
                                                <input type="text" placeholder="Últ. Landings" value={renglon.ultLandings || ''} onChange={(e) => handleRenglonChange(idx, 'ultLandings', e.target.value)} style={{ ...styles.input, ...styles.inputCenter }} />
                                            )}
                                            {renglon.tipoCriterio === 'CICLOS' && (
                                                <input type="text" placeholder="Últ. Ciclos" value={renglon.ultCiclos || ''} onChange={(e) => handleRenglonChange(idx, 'ultCiclos', e.target.value)} style={{ ...styles.input, ...styles.inputCenter }} />
                                            )}
                                            {(renglon.tipoCriterio === 'FECHA' || renglon.tipoCriterio === 'MESES') && (
                                                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', textAlign: 'center' }}>N/A</span>
                                            )}
                                        </td>

                                        {/* ÚLTIMA FECHA */}
                                        <td style={styles.td}>
                                            <input type="date" value={renglon.ultFecha || ''} onChange={(e) => handleRenglonChange(idx, 'ultFecha', e.target.value)} style={{ ...styles.input, ...styles.inputCenter }} />
                                        </td>

                                        {/* ORDEN DE TRABAJO */}
                                        <td style={styles.td}>
                                            <input type="text" placeholder="OT" value={renglon.ultOt || ''} onChange={(e) => handleRenglonChange(idx, 'ultOt', e.target.value)} style={{ ...styles.input, ...styles.inputCenter }} />
                                        </td>

                                        {/* PRÓXIMO VENCIMIENTO */}
                                        <td style={styles.td}>
                                            {renglon.tipoCriterio === 'HORAS' && (
                                                <input type="text" placeholder="Próx. Hs" value={renglon.proxHs || ''} onChange={(e) => handleRenglonChange(idx, 'proxHs', e.target.value)} style={{ ...styles.input, ...styles.inputCenter, fontWeight: 'bold' }} />
                                            )}
                                            {renglon.tipoCriterio === 'LANDINGS' && (
                                                <input type="text" placeholder="Próx. Landings" value={renglon.proxLandings || ''} onChange={(e) => handleRenglonChange(idx, 'proxLandings', e.target.value)} style={{ ...styles.input, ...styles.inputCenter, fontWeight: 'bold' }} />
                                            )}
                                            {renglon.tipoCriterio === 'CICLOS' && (
                                                <input type="text" placeholder="Próx. Ciclos" value={renglon.proxCiclos || ''} onChange={(e) => handleRenglonChange(idx, 'proxCiclos', e.target.value)} style={{ ...styles.input, ...styles.inputCenter, fontWeight: 'bold' }} />
                                            )}
                                            {(renglon.tipoCriterio === 'FECHA' || renglon.tipoCriterio === 'MESES') && (
                                                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', textAlign: 'center' }}>Ver Fecha</span>
                                            )}
                                        </td>

                                        {/* PRÓXIMA FECHA */}
                                        <td style={styles.td}>
                                            <input type="date" value={renglon.proxFecha || ''} onChange={(e) => handleRenglonChange(idx, 'proxFecha', e.target.value)} style={{ ...styles.input, ...styles.inputCenter, fontWeight: 'bold' }} />
                                        </td>

                                        {/* RESPONSABLE */}
                                        <td style={styles.td}>
                                            <input type="text" value={renglon.responsable || 'Ec AE'} onChange={(e) => handleRenglonChange(idx, 'responsable', e.target.value)} style={{ ...styles.input, ...styles.inputCenter }} />
                                        </td>

                                        {/* DISPONIBLE */}
                                        <td style={styles.td}>
                                            <input type="text" value={renglon.disp || ''} onChange={(e) => handleRenglonChange(idx, 'disp', e.target.value)} style={{ ...styles.input, ...styles.inputCenter, fontWeight: 'bold', color: '#16a34a' }} />
                                        </td>

                                        {/* ACCIONES */}
                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                            <button onClick={() => eliminarRenglon(idx)} style={styles.btnDelete}>X</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* BOTÓN GUARDAR Y SINCRONIZAR */}
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={guardarPrograma} disabled={loading} style={{ ...styles.btnPrimary, padding: '8px 20px' }}>
                        {loading ? "GUARDANDO CAMBIOS..." : "GUARDAR Y SINCRONIZAR PROGRAMA"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProgramaMantenimiento;