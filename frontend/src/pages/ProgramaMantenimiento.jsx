import React, { useState, useEffect } from 'react';
import { getAircrafts } from '../services/api'; 

const ProgramaMantenimiento = () => {
    // Estados de Datos de la API
    const [aeronaves, setAeronaves] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados de Selección y Cabecera de Aeronave
    const [unidadNavegacion, setUnidadNavegacion] = useState('');
    const [aeronaveSeleccionadaId, setAeronaveSeleccionadaId] = useState('');
    
    const [formData, setFormData] = useState({
        sda: '',
        matricula: '',
        nroSerie: '',
        tgPlaneadorActual: '0,0',
        tgMotorActual: '0,0' // Añadido para el control de motor
    });

    // 📊 DOS MATRICES DINÁMICAS INDEPENDIENTES (Excel Style)
    const [tablaPlaneador, setTablaPlaneador] = useState([]);
    const [tablaMotor, setTablaMotor] = useState([]);

    // Seguridad e Institucional (RBAC)
    const rawRole = localStorage.getItem('role') || 'user';
    const roleUpper = String(rawRole).trim().toUpperCase().replace(/[\s_]/g, '');
    const roleLower = String(rawRole).trim().toLowerCase().replace(/[\s_]/g, '');
    const userElemento = localStorage.getItem('elemento')?.trim().toUpperCase() || "";

    const esAdminPorContenido = roleUpper.includes('ADMIN') || roleLower.includes('admin');
    const esMandoPorLista = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleUpper) || ['admin', 'boss', 'director', 'oto'].includes(roleLower);
    const isMandoPorRol = esAdminPorContenido || esMandoPorLista;
    const isMandoEstrategico = isMandoPorRol || userElemento === 'COMANDO';

    useEffect(() => {
        const inicializarUnidad = isMandoEstrategico ? 'B AV APY COMB 601' : userElemento;
        setUnidadNavegacion(inicializarUnidad);
    }, []);

    useEffect(() => {
        if (unidadNavegacion) {
            cargarDatosPorUnidad();
        }
    }, [unidadNavegacion]);

    const cargarDatosPorUnidad = async () => {
        setLoading(true);
        try {
            const respuesta = await getAircrafts();
            let listaAviones = [];
            if (Array.isArray(respuesta)) listaAviones = respuesta;
            else if (respuesta && Array.isArray(respuesta.data)) listaAviones = respuesta.data;
            
            const filtrados = listaAviones.filter(a => 
                a.unidad && String(a.unidad).trim().toUpperCase() === unidadNavegacion.toUpperCase()
            );
            setAeronaves(filtrados);
            setLoading(false);
        } catch (error) {
            console.error("Error al cargar aeronaves:", error);
            setLoading(false);
        }
    };

    const handleAeronaveChange = (e) => {
        const id = e.target.value;
        setAeronaveSeleccionadaId(id);
        
        if (!id) {
            limpiarFormulario();
            return;
        }

        const avion = aeronaves.find(a => a._id === id);
        if (avion) {
            setFormData({
                sda: avion.sda || '',
                matricula: avion.matricula || '',
                nroSerie: avion.nroSerie || '',
                tgPlaneadorActual: avion.tgPlaneadorActual ? String(avion.tgPlaneadorActual).replace('.', ',') : '0,0',
                tgMotorActual: avion.tgMotorActual ? String(avion.tgMotorActual).replace('.', ',') : '0,0'
            });

            // Carga de históricos si existen en DB
            setTablaPlaneador(avion.programaPlaneador || []);
            setTablaMotor(avion.programaMotor || []);
        }
    };

    // ➕ OPERATORIA PLANEADOR: Agregar, Cambiar y Remover Renglón
    const agregarRenglonPlaneador = () => {
        setTablaPlaneador([...tablaPlaneador, {
            id: Date.now(), descripcion: "", ultHs: "", ultFecha: "", ultOt: "", proxHs: "", proxFecha: "", responsable: "Ec AE", disp: ""
        }]);
    };

    const handleCellChangePlaneador = (id, campo, valor) => {
        setTablaPlaneador(tablaPlaneador.map(row => row.id === id ? { ...row, [campo]: valor } : row));
    };

    // ➕ OPERATORIA MOTOR: Agregar, Cambiar y Remover Renglón
    const agregarRenglonMotor = () => {
        setTablaMotor([...tablaMotor, {
            id: Date.now(), descripcion: "", ultHs: "", ultFecha: "", ultOt: "", proxHs: "", proxFecha: "", responsable: "Ec AE", disp: ""
        }]);
    };

    const handleCellChangeMotor = (id, campo, valor) => {
        setTablaMotor(tablaMotor.map(row => row.id === id ? { ...row, [campo]: valor } : row));
    };

    const limpiarFormulario = () => {
        setAeronaveSeleccionadaId('');
        setFormData({ sda: '', matricula: '', nroSerie: '', tgPlaneadorActual: '0,0', tgMotorActual: '0,0' });
        setTablaPlaneador([]);
        setTablaMotor([]);
    };

    const guardarRegistro = () => {
        alert(`Sincronizando Mantenimiento General. Renglones Planeador: ${tablaPlaneador.length} | Renglones Motor: ${tablaMotor.length}`);
        console.log("Payload Consolidado para Backend:", {
            aeronaveId: aeronaveSeleccionadaId,
            tablaPlaneador,
            tablaMotor
        });
    };

    const eliminarRegistro = () => {
        if (!aeronaveSeleccionadaId) return;
        if (window.confirm(`¿Eliminar programa completo de la aeronave ${formData.matricula}?`)) {
            limpiarFormulario();
        }
    };

    return (
        <div style={styles.container}>
            
            {/* 🟦 BARRA DE TÍTULO SUPERIOR OSCURA */}
            <div style={styles.topHeaderBar}>
                <h2 style={styles.mainTitle}>SISTEMA DE GESTIÓN MANTENIMIENTO - SINCRO MONGOOSE</h2>
                <div style={styles.topButtonBar}>
                    <button style={{...styles.btnTop, backgroundColor: '#3498db'}} onClick={limpiarFormulario}>📄 Limpiar / Nuevo</button>
                    <button style={{...styles.btnTop, backgroundColor: '#2ecc71'}} onClick={guardarRegistro}>💾 Dar de Alta / Guardar</button>
                    <button style={{...styles.btnTop, backgroundColor: '#e74c3c'}} onClick={eliminarRegistro}>🗑️ Eliminar Registro</button>
                </div>
            </div>

            {/* 📁 BARRA GRIS DE SELECTORES */}
            <div style={styles.selectorsBar}>
                <div style={styles.selectorGroup}>
                    <label style={styles.labelTitle}>📁 SELECTOR FLOTA (Restringido a tu Base: {userElemento || 'N/D'})</label>
                    <select style={styles.selectInputFlota} value={aeronaveSeleccionadaId} onChange={handleAeronaveChange}>
                        <option value="">-- Seleccionar Aeronave Guardada --</option>
                        {aeronaves.map(a => <option key={a._id} value={a._id}>{a.matricula} - {a.sda}</option>)}
                    </select>
                </div>
                <div style={styles.selectorGroup}>
                    <label style={styles.labelTitle}>🛡️ NAVEGACIÓN ENTRE UNIDADES {!isMandoEstrategico && '🔒 (BLOQUEADO)'}</label>
                    <select style={styles.selectInputNav} value={unidadNavegacion} disabled={!isMandoEstrategico} onChange={(e) => { setUnidadNavegacion(e.target.value); limpiarFormulario(); }}>
                        <option value={unidadNavegacion}>{unidadNavegacion}</option>
                    </select>
                </div>
            </div>

            {/* 📝 PANEL DE INFORMACIÓN CABECERA */}
            <div style={styles.cardForm}>
                <h3 style={styles.sectionHeader}>DATOS DE LA AERONAVE</h3>
                <div style={styles.formRow}>
                    <div style={styles.inputField}><label style={styles.fieldLabel}>SdA</label><input type="text" style={styles.textInput} value={formData.sda} readOnly placeholder="UH-1H" /></div>
                    <div style={styles.inputField}><label style={styles.fieldLabel}>Matrícula</label><input type="text" style={styles.textInput} value={formData.matricula} readOnly placeholder="AE-XXX" /></div>
                    <div style={styles.inputField}><label style={styles.fieldLabel}>Nro Serie</label><input type="text" style={styles.textInput} value={formData.nroSerie} readOnly placeholder="N/S" /></div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 🛡️ SECCIÓN 1: HOJA DE SEGUIMIENTO DEL PLANEADOR */}
            {/* ========================================================================= */}
            <div style={styles.sectionDivider}>
                <div style={styles.miniKpiExcel}>
                    <span style={styles.kpiLabel}>TOTAL GRAL PLANEADOR:</span>
                    <span style={styles.kpiValue}>{formData.tgPlaneadorActual}</span>
                </div>
                <button style={styles.btnAddRow} onClick={agregarRenglonPlaneador}>➕ Agregar Renglón Planeador</button>
            </div>

            <div style={styles.tableWrapper}>
                <table style={styles.mantoTable}>
                    <thead>
                        <tr>
                            <th style={{...styles.th, width: '35%'}}>DESCRIPCION</th>
                            <th style={styles.th}>ULTIMA INTERVENCIÓN<br/><span style={styles.thSub}>HS PLANEADOR</span></th>
                            <th style={styles.th}>ULTIMA INTERVENCIÓN<br/><span style={styles.thSub}>FECHA</span></th>
                            <th style={styles.th}>OT</th>
                            <th style={styles.th}>PROXIMA INTERVENCIÓN<br/><span style={styles.thSub}>HS PLANEADOR</span></th>
                            <th style={styles.th}>PROXIMA INTERVENCIÓN<br/><span style={styles.thSub}>FECHA</span></th>
                            <th style={styles.th}>RESPONSABLE</th>
                            <th style={{...styles.th, width: '8%'}}>DISP</th>
                            <th style={{...styles.th, width: '3%'}}>ACC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tablaPlaneador.length === 0 ? (
                            <tr><td colSpan="9" style={styles.tdEmpty}>No hay inspecciones de Planeador registradas.</td></tr>
                        ) : (
                            tablaPlaneador.map((row) => (
                                <tr key={row.id} style={styles.tr}>
                                    <td style={styles.td}><input type="text" style={styles.inputInCellBold} value={row.descripcion} onChange={(e) => handleCellChangePlaneador(row.id, 'descripcion', e.target.value)} placeholder="Ej. INSP 100 HS..." /></td>
                                    <td style={styles.td}><input type="text" style={styles.inputInCell} value={row.ultHs} onChange={(e) => handleCellChangePlaneador(row.id, 'ultHs', e.target.value)} /></td>
                                    <td style={styles.td}><input type="text" style={styles.inputInCell} value={row.ultFecha} onChange={(e) => handleCellChangePlaneador(row.id, 'ultFecha', e.target.value)} /></td>
                                    <td style={styles.td}><input type="text" style={styles.inputInCell} value={row.ultOt} onChange={(e) => handleCellChangePlaneador(row.id, 'ultOt', e.target.value)} /></td>
                                    <td style={styles.td}><input type="text" style={styles.inputInCell} value={row.proxHs} onChange={(e) => handleCellChangePlaneador(row.id, 'proxHs', e.target.value)} /></td>
                                    <td style={styles.td}><input type="text" style={styles.inputInCell} value={row.proxFecha} onChange={(e) => handleCellChangePlaneador(row.id, 'proxFecha', e.target.value)} /></td>
                                    <td style={styles.td}><input type="text" style={styles.inputInCell} value={row.responsable} onChange={(e) => handleCellChangePlaneador(row.id, 'responsable', e.target.value)} /></td>
                                    <td style={styles.td}><input type="text" style={{...styles.inputInCell, fontWeight: 'bold'}} value={row.disp} onChange={(e) => handleCellChangePlaneador(row.id, 'disp', e.target.value)} /></td>
                                    <td style={styles.tdAction}><button style={styles.btnDeleteRow} onClick={() => setTablaPlaneador(tablaPlaneador.filter(r => r.id !== row.id))}>✖</button></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ========================================================================= */}
            {/* ⚙️ SECCIÓN 2: HOJA DE SEGUIMIENTO DEL GRUPO MOTOPROPULSOR (MOTOR) */}
            {/* ========================================================================= */}
            <div style={{...styles.sectionDivider, marginTop: '25px'}}>
                <div style={{...styles.miniKpiExcel, backgroundColor: '#00a8ff'}}>
                    <span style={styles.kpiLabel}>TOTAL GRAL MOTOR:</span>
                    <span style={styles.kpiValue}>{formData.tgMotorActual}</span>
                </div>
                <button style={{...styles.btnAddRow, backgroundColor: '#d35400'}} onClick={agregarRenglonMotor}>➕ Agregar Renglón Motor</button>
            </div>

            <div style={styles.tableWrapper}>
                <table style={styles.mantoTable}>
                    <thead>
                        <tr>
                            <th style={{...styles.th, width: '35%'}}>DESCRIPCION</th>
                            <th style={styles.th}>ULTIMA INTERVENCIÓN<br/><span style={styles.thSub}>HS MOTOR</span></th>
                            <th style={styles.th}>ULTIMA INTERVENCIÓN<br/><span style={styles.thSub}>FECHA</span></th>
                            <th style={styles.th}>OT</th>
                            <th style={styles.th}>PROXIMA INTERVENCIÓN<br/><span style={styles.thSub}>HS MOTOR</span></th>
                            <th style={styles.th}>PROXIMA INTERVENCIÓN<br/><span style={styles.thSub}>FECHA</span></th>
                            <th style={styles.th}>RESPONSABLE</th>
                            <th style={{...styles.th, width: '8%'}}>DISP</th>
                            <th style={{...styles.th, width: '3%'}}>ACC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tablaMotor.length === 0 ? (
                            <tr><td colSpan="9" style={styles.tdEmpty}>No hay inspecciones de Motor registradas.</td></tr>
                        ) : (
                            tablaMotor.map((row) => (
                                <tr key={row.id} style={styles.tr}>
                                    <td style={styles.td}><input type="text" style={styles.inputInCellBold} value={row.descripcion} onChange={(e) => handleCellChangeMotor(row.id, 'descripcion', e.target.value)} placeholder="Ej. INSP DE SERVICIO 100 HS..." /></td>
                                    <td style={styles.td}><input type="text" style={styles.inputInCell} value={row.ultHs} onChange={(e) => handleCellChangeMotor(row.id, 'ultHs', e.target.value)} /></td>
                                    <td style={styles.td}><input type="text" style={styles.inputInCell} value={row.ultFecha} onChange={(e) => handleCellChangeMotor(row.id, 'ultFecha', e.target.value)} /></td>
                                    <td style={styles.td}><input type="text" style={styles.inputInCell} value={row.ultOt} onChange={(e) => handleCellChangeMotor(row.id, 'ultOt', e.target.value)} /></td>
                                    <td style={styles.td}><input type="text" style={styles.inputInCell} value={row.proxHs} onChange={(e) => handleCellChangeMotor(row.id, 'proxHs', e.target.value)} /></td>
                                    <td style={styles.td}><input type="text" style={styles.inputInCell} value={row.proxFecha} onChange={(e) => handleCellChangeMotor(row.id, 'proxFecha', e.target.value)} /></td>
                                    <td style={styles.td}><input type="text" style={styles.inputInCell} value={row.responsable} onChange={(e) => handleCellChangeMotor(row.id, 'responsable', e.target.value)} /></td>
                                    <td style={styles.td}><input type="text" style={{...styles.inputInCell, fontWeight: 'bold'}} value={row.disp} onChange={(e) => handleCellChangeMotor(row.id, 'disp', e.target.value)} /></td>
                                    <td style={styles.tdAction}><button style={styles.btnDeleteRow} onClick={() => setTablaMotor(tablaMotor.filter(r => r.id !== row.id))}>✖</button></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

// Estilos de Estructura e Identidad Rígida F-16
const styles = {
    container: { padding: '10px 20px', maxWidth: '100%', margin: '0 auto', fontFamily: 'monospace, sans-serif' },
    topHeaderBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1b2a4a', padding: '10px 20px', borderRadius: '0px', marginBottom: '10px', border: '1px solid #111a30' },
    mainTitle: { color: '#ffffff', margin: 0, fontSize: '0.95rem', fontWeight: 'bold' },
    topButtonBar: { display: 'flex', gap: '5px' },
    btnTop: { color: '#fff', border: 'none', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer' },
    
    selectorsBar: { display: 'flex', gap: '15px', background: '#eef2f5', padding: '8px 15px', border: '1px solid #ccc' },
    selectorGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
    labelTitle: { fontSize: '0.7rem', fontWeight: 'bold', color: '#444' },
    selectInputFlota: { padding: '5px 10px', border: '1px solid #2ecc71', backgroundColor: '#fff', fontSize: '0.85rem', fontWeight: 'bold', outline: 'none' },
    selectInputNav: { padding: '5px 10px', border: '1px solid #ccc', backgroundColor: '#e9ecef', fontSize: '0.85rem', color: '#495057' },
    
    cardForm: { background: '#fff', border: '1px solid #ccc', padding: '10px 15px', marginTop: '10px' },
    sectionHeader: { margin: '0 0 6px 0', fontSize: '0.75rem', color: '#000', fontWeight: 'bold' },
    formRow: { display: 'flex', gap: '15px' },
    inputField: { flex: 1, display: 'flex', flexDirection: 'column' },
    fieldLabel: { fontSize: '0.68rem', color: '#555', fontWeight: 'bold' },
    textInput: { padding: '5px 8px', border: '1px solid #ccc', fontSize: '0.85rem', backgroundColor: '#fafafa', outline: 'none' },
    
    // Controles de División de Tablas
    sectionDivider: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', marginBottom: '5px' },
    miniKpiExcel: { backgroundColor: '#00a8ff', color: '#000', padding: '4px 10px', border: '1px solid #000', display: 'flex', gap: '10px', fontSize: '0.75rem', fontWeight: 'bold' },
    kpiLabel: { color: '#000' },
    kpiValue: { color: '#000', textDecoration: 'underline' },
    btnAddRow: { backgroundColor: '#2c3e50', color: '#fff', border: 'none', padding: '5px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' },

    // Matriz de Datos Operacionales
    tableWrapper: { overflowX: 'auto', border: '1px solid #000' },
    mantoTable: { width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' },
    th: { backgroundColor: '#00a8ff', color: '#000', border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.1' },
    thSub: { fontSize: '0.68rem', color: '#111', fontWeight: 'normal' },
    tr: { backgroundColor: '#badc58' },
    td: { border: '1px solid #000', padding: '0px' },
    tdAction: { border: '1px solid #000', padding: '0px', backgroundColor: '#f8f9fa', textAlign: 'center' },
    tdEmpty: { border: '1px solid #000', padding: '12px', textAlign: 'center', color: '#444', backgroundColor: '#f1f2f6', fontStyle: 'italic' },
    
    inputInCell: { width: '100%', boxSizing: 'border-box', border: 'none', background: 'transparent', padding: '6px 4px', fontSize: '0.78rem', fontFamily: 'monospace', textAlign: 'center', color: '#000', outline: 'none' },
    inputInCellBold: { width: '100%', boxSizing: 'border-box', border: 'none', background: 'transparent', padding: '6px 6px', fontSize: '0.78rem', fontFamily: 'monospace', textAlign: 'left', fontWeight: 'bold', color: '#000', outline: 'none' },
    btnDeleteRow: { background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }
};

export default ProgramaMantenimiento;