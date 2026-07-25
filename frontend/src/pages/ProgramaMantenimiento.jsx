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
        tgPlaneadorActual: "0.0",
        tgMotorActual: "0.0",
        tgMotor2Actual: "0.0",
        tgHeliceActual: "0.0",
        tgHelice2Actual: "0.0",
        programaPlaneador: [],
        programaMotor: [],
        programaMotor2: [],
        programaHelice: [],
        programaHelice2: []
    });

    // Componentes de la BD
    const [listaComponentes, setListaComponentes] = useState([]);
    const [sistemaFiltro, setSistemaFiltro] = useState('Planeador');
    const [componenteSeleccionadoId, setComponenteSeleccionadoId] = useState('');
    const [componenteDetalle, setComponenteDetalle] = useState(null);

    // ----------------------------------------------------
    // CARGA DE DATOS
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
    // VISOR COMPONENTES
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

    const parseNum = (val) => {
        if (!val) return 0;
        const clean = String(val).replace(',', '.');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    };

    const calcularRenglon = (renglon, tgActual) => {
        let r = { ...renglon };
        if (r.tipoCriterio === 'HORAS') {
            const ultHs = parseNum(r.ultHs);
            const intHs = parseNum(r.intervaloHs);
            const tg = parseNum(tgActual);

            if (intHs > 0) {
                const proxHsCalc = ultHs + intHs;
                r.proxHs = proxHsCalc.toFixed(1);
                r.disp = (proxHsCalc - tg).toFixed(1);
            }
        }
        return r;
    };

    const handleRenglonChange = (index, campo, valor) => {
        setPrograma(prev => {
            const nuevosRenglones = [...prev[tabActivo]];
            const tgActual = getTgActualTab().val;

            let renglonModificado = { ...nuevosRenglones[index], [campo]: valor };
            renglonModificado = calcularRenglon(renglonModificado, tgActual);
            nuevosRenglones[index] = renglonModificado;

            return { ...prev, [tabActivo]: nuevosRenglones };
        });
    };

    const handleSelectComponenteEnFila = (index, compId) => {
        const comp = listaComponentes.find(c => (c._id || c.id) === compId);

        setPrograma(prev => {
            const nuevosRenglones = [...prev[tabActivo]];
            const tgActual = getTgActualTab().val;

            if (comp) {
                let nuevoRenglon = {
                    ...nuevosRenglones[index],
                    componenteRef: comp._id || comp.id,
                    componenteNombre: `${comp.nombre || 'COMPONENTE'} (P/N: ${comp.pn || 'S/D'})`,
                    tgComponente: comp.tgInstalacion || comp.tgAcumulado || "0.0",
                    limiteComponente: `${comp.limiteValor || ''} ${comp.limiteUnidad || ''}`.trim(),
                    dispComponente: comp.disponibleReal || comp.disponible || "0.0",
                    descripcion: nuevosRenglones[index].descripcion || `INSPECCIÓN DE ${comp.nombre?.toUpperCase() || 'COMPONENTE'}`
                };

                nuevosRenglones[index] = calcularRenglon(nuevoRenglon, tgActual);
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
            descripcion: "",
            tipoCriterio: "HORAS",
            intervaloHs: "",
            ultHs: "",
            ultFecha: "",
            ultOt: "",
            proxHs: "",
            proxFecha: "",
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

    const guardarPrograma = async () => {
        setLoading(true);
        try {
            const payload = { aeronaveId, ...programa };
            const res = await axios.post('/api/programa-mantenimiento/guardar', payload);
            if (res.data && res.data.status === 'success') {
                setMensaje({ tipo: 'success', text: "Programa de mantenimiento guardado correctamente." });
                if (res.data.data) setPrograma(res.data.data);
            }
        } catch (err) {
            setMensaje({ tipo: 'error', text: "Error al guardar el programa." });
        } finally {
            setLoading(false);
            setTimeout(() => setMensaje(null), 3000);
        }
    };

    const getTgActualTab = () => {
        switch (tabActivo) {
            case 'programaPlaneador': return { label: 'TOTAL PLANEADOR ACTUAL', val: programa.tgPlaneadorActual, key: 'tgPlaneadorActual' };
            case 'programaMotor': return { label: 'TOTAL MOTOR 1 ACTUAL', val: programa.tgMotorActual, key: 'tgMotorActual' };
            case 'programaMotor2': return { label: 'TOTAL MOTOR 2 ACTUAL', val: programa.tgMotor2Actual, key: 'tgMotor2Actual' };
            case 'programaHelice': return { label: 'TOTAL HÉLICE 1 ACTUAL', val: programa.tgHeliceActual, key: 'tgHeliceActual' };
            case 'programaHelice2': return { label: 'TOTAL HÉLICE 2 ACTUAL', val: programa.tgHelice2Actual, key: 'tgHelice2Actual' };
            default: return { label: 'TOTAL ACTUAL', val: '0.0', key: '' };
        }
    };

    const currentTg = getTgActualTab();

    // ----------------------------------------------------
    // ESTILOS BÁSICOS DIRECTOS (CSS NATIVO)
    // ----------------------------------------------------
    const styles = {
        container: {
            fontFamily: 'Arial, sans-serif',
            padding: '20px',
            backgroundColor: '#f4f6f8',
            color: '#333'
        },
        box: {
            backgroundColor: '#ffffff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '15px',
            marginBottom: '15px'
        },
        title: {
            margin: '0 0 10px 0',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#444'
        },
        input: {
            padding: '6px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            fontSize: '12px',
            boxSizing: 'border-box'
        },
        button: {
            padding: '6px 12px',
            border: '1px solid #999',
            borderRadius: '3px',
            backgroundColor: '#e0e0e0',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
        },
        buttonSave: {
            padding: '6px 12px',
            border: '1px solid #2e7d32',
            borderRadius: '3px',
            backgroundColor: '#4caf50',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
        },
        tab: {
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderBottom: 'none',
            backgroundColor: '#e0e0e0',
            cursor: 'pointer',
            marginRight: '4px',
            borderRadius: '3px 3px 0 0',
            fontSize: '12px'
        },
        tabActive: {
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderBottom: '1px solid #fff',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            marginRight: '4px',
            borderRadius: '3px 3px 0 0',
            fontWeight: 'bold',
            fontSize: '12px'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#ffffff',
            fontSize: '12px'
        },
        th: {
            border: '1px solid #ccc',
            backgroundColor: '#eaeaea',
            padding: '6px',
            textAlign: 'left'
        },
        td: {
            border: '1px solid #ccc',
            padding: '4px'
        }
    };

    return (
        <div style={styles.container}>
            
            {/* NOTIFICACIONES */}
            {mensaje && (
                <div style={{ ...styles.box, backgroundColor: mensaje.tipo === 'success' ? '#e8f5e9' : '#ffebee', color: mensaje.tipo === 'success' ? '#2e7d32' : '#c62828' }}>
                    {mensaje.text}
                </div>
            )}

            {/* VISOR DE COMPONENTES */}
            <div style={styles.box}>
                <div style={styles.title}>VISOR DE COMPONENTES / FICHA TÉCNICA (SOLO LECTURA)</div>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', marginBottom: '3px' }}>SISTEMA / GRUPO</label>
                        <select 
                            value={sistemaFiltro} 
                            onChange={(e) => { setSistemaFiltro(e.target.value); setComponenteSeleccionadoId(''); }}
                            style={styles.input}
                        >
                            <option value="Planeador">Planeador</option>
                            <option value="Motor 1">Motor 1</option>
                            <option value="Motor 2">Motor 2</option>
                            <option value="Hélice 1">Hélice 1</option>
                            <option value="Hélice 2">Hélice 2</option>
                        </select>
                    </div>

                    <div style={{ flexGrow: 1 }}>
                        <label style={{ display: 'block', fontSize: '11px', marginBottom: '3px' }}>SELECCIONAR COMPONENTE A CONSULTAR</label>
                        <select 
                            value={componenteSeleccionadoId} 
                            onChange={(e) => setComponenteSeleccionadoId(e.target.value)}
                            style={{ ...styles.input, width: '100%' }}
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

                {componenteDetalle && (
                    <div style={{ backgroundColor: '#f9f9f9', padding: '8px', border: '1px solid #eee', fontSize: '11px', display: 'flex', gap: '15px' }}>
                        <div><strong>ATA:</strong> {componenteDetalle.ata || 'N/A'}</div>
                        <div><strong>P/N:</strong> {componenteDetalle.pn || 'N/A'}</div>
                        <div><strong>S/N:</strong> {componenteDetalle.sn || 'N/A'}</div>
                        <div><strong>TG Inst:</strong> {componenteDetalle.tgInstalacion || '0.0'}</div>
                        <div><strong>Disp:</strong> {componenteDetalle.disponibleReal || 'N/A'}</div>
                    </div>
                )}
            </div>

            {/* PESTAÑAS */}
            <div style={{ display: 'flex' }}>
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

            {/* CUERPO DE LA TABLA */}
            <div style={{ ...styles.box, borderRadius: '0 0 4px 4px', borderTop: 'none' }}>
                
                {/* BARRA DE HERRAMIENTAS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                        <strong>{currentTg.label}: </strong>
                        <input 
                            type="text" 
                            value={currentTg.val}
                            onChange={(e) => setPrograma(prev => ({ ...prev, [currentTg.key]: e.target.value }))}
                            style={{ ...styles.input, width: '70px', fontWeight: 'bold' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={agregarRenglon} style={styles.button}>+ AGREGAR INSPECCIÓN</button>
                        <button onClick={guardarPrograma} disabled={loading} style={styles.buttonSave}>
                            {loading ? "GUARDANDO..." : "GUARDAR PROGRAMA"}
                        </button>
                    </div>
                </div>

                {/* TABLA */}
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Componente (BD) / Descripción</th>
                            <th style={styles.th}>Criterio</th>
                            <th style={styles.th}>Intervalo</th>
                            <th style={styles.th}>Últ. Hs</th>
                            <th style={styles.th}>Últ. Fecha</th>
                            <th style={styles.th}>O.T.</th>
                            <th style={styles.th}>Próx. Hs</th>
                            <th style={styles.th}>Próx. Fecha</th>
                            <th style={styles.th}>Resp.</th>
                            <th style={styles.th}>Disp.</th>
                            <th style={styles.th}>Acc</th>
                        </tr>
                    </thead>
                    <tbody>
                        {programa[tabActivo]?.length === 0 ? (
                            <tr>
                                <td colSpan="11" style={{ ...styles.td, textAlign: 'center', padding: '15px', color: '#777' }}>
                                    No hay inspecciones registradas en esta sección. Presione "Agregar Inspección" para crear una nueva alerta.
                                </td>
                            </tr>
                        ) : (
                            programa[tabActivo]?.map((renglon, idx) => (
                                <tr key={renglon.id || idx}>
                                    <td style={styles.td}>
                                        <select 
                                            value={renglon.componenteRef || ""}
                                            onChange={(e) => handleSelectComponenteEnFila(idx, e.target.value)}
                                            style={{ ...styles.input, width: '100%', marginBottom: '2px' }}
                                        >
                                            <option value="">-- Sin Componente BD Vinculado --</option>
                                            {listaComponentes.map(c => (
                                                <option key={c._id || c.id} value={c._id || c.id}>{c.nombre} (P/N: {c.pn || 'N/A'})</option>
                                            ))}
                                        </select>
                                        <input 
                                            type="text" 
                                            value={renglon.descripcion || ''}
                                            onChange={(e) => handleRenglonChange(idx, 'descripcion', e.target.value)}
                                            placeholder="Descripción..."
                                            style={{ ...styles.input, width: '100%' }}
                                        />
                                    </td>
                                    <td style={styles.td}>
                                        <select 
                                            value={renglon.tipoCriterio || 'HORAS'}
                                            onChange={(e) => handleRenglonChange(idx, 'tipoCriterio', e.target.value)}
                                            style={styles.input}
                                        >
                                            <option value="HORAS">Horas</option>
                                            <option value="FECHA">Fecha</option>
                                            <option value="MESES">Meses</option>
                                        </select>
                                    </td>
                                    <td style={styles.td}><input type="text" value={renglon.intervaloHs || ''} onChange={(e) => handleRenglonChange(idx, 'intervaloHs', e.target.value)} style={{ ...styles.input, width: '55px' }} /></td>
                                    <td style={styles.td}><input type="text" value={renglon.ultHs || ''} onChange={(e) => handleRenglonChange(idx, 'ultHs', e.target.value)} style={{ ...styles.input, width: '55px' }} /></td>
                                    <td style={styles.td}><input type="date" value={renglon.ultFecha || ''} onChange={(e) => handleRenglonChange(idx, 'ultFecha', e.target.value)} style={{ ...styles.input, width: '105px' }} /></td>
                                    <td style={styles.td}><input type="text" value={renglon.ultOt || ''} onChange={(e) => handleRenglonChange(idx, 'ultOt', e.target.value)} style={{ ...styles.input, width: '50px' }} /></td>
                                    <td style={styles.td}><input type="text" value={renglon.proxHs || ''} onChange={(e) => handleRenglonChange(idx, 'proxHs', e.target.value)} style={{ ...styles.input, width: '55px', fontWeight: 'bold' }} /></td>
                                    <td style={styles.td}><input type="date" value={renglon.proxFecha || ''} onChange={(e) => handleRenglonChange(idx, 'proxFecha', e.target.value)} style={{ ...styles.input, width: '105px' }} /></td>
                                    <td style={styles.td}><input type="text" value={renglon.responsable || 'Ec AE'} onChange={(e) => handleRenglonChange(idx, 'responsable', e.target.value)} style={{ ...styles.input, width: '50px' }} /></td>
                                    <td style={styles.td}><input type="text" value={renglon.disp || ''} onChange={(e) => handleRenglonChange(idx, 'disp', e.target.value)} style={{ ...styles.input, width: '55px', fontWeight: 'bold' }} /></td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                        <button onClick={() => eliminarRenglon(idx)} style={{ ...styles.button, backgroundColor: '#ffebee', color: '#c62828', borderColor: '#ef9a9a' }}>X</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProgramaMantenimiento;