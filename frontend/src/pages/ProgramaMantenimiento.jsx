import React, { useState, useEffect } from 'react';
import { getAircrafts } from '../services/api'; 

// 🌐 URL DEL BACKEND CENTRALIZADA (Conectada a Render en prod o local en dev)
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? '' 
    : 'https://appae.onrender.com';

const ProgramaMantenimiento = () => {
    // Estados de Datos de la API
    const [aeronaves, setAeronaves] = useState([]);
    const [unidadesDisponibles, setUnidadesDisponibles] = useState([]); 
    const [loading, setLoading] = useState(true);

    // Estados de Selección y Cabecera de Aeronave
    const [unidadNavegacion, setUnidadNavegacion] = useState('');
    const [aeronaveSeleccionadaId, setAeronaveSeleccionadaId] = useState('');
    
    const [formData, setFormData] = useState({
        sda: '',
        matricula: '',
        nroSerie: '',
        tgPlaneadorActual: '0,0',
        tgMotorActual: '0,0'
    });

    // 📊 MATRICES DINÁMICAS (PLANEADOR Y MOTOR)
    const [tablaPlaneador, setTablaPlaneador] = useState([]);
    const [tablaMotor, setTablaMotor] = useState([]);

    // 🔐 EXTRACCIÓN REAL DE SESIÓN DESDE LOCALSTORAGE
    const token = localStorage.getItem('token');
    const usuarioSesion = {
        username: localStorage.getItem('username') || "Operador",
        role: (localStorage.getItem('role') || localStorage.getItem('rol') || 'USER').toUpperCase().trim(),
        elemento: (localStorage.getItem('elemento') || '').toUpperCase().trim()
    };

    const isMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(usuarioSesion.role) || usuarioSesion.elemento === 'COMANDO';

    // Encabezados globales requeridos por las políticas de CORS y el AuthMiddleware
    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token 
    });

    // 🔄 CARGA INICIAL Y CONFIGURACIÓN DE FILTROS SEGÚN ROL
    useEffect(() => {
        const inicializarPanel = async () => {
            setLoading(true);
            try {
                const respuesta = await getAircrafts();
                let listaAviones = [];
                if (Array.isArray(respuesta)) listaAviones = respuesta;
                else if (respuesta && Array.isArray(respuesta.data)) listaAviones = respuesta.data;
                
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
            const horasPlaneadorInicial = avion.tgPlaneadorActual ? String(avion.tgPlaneadorActual).replace('.', ',') : '0,0';
            const horasMotorInicial = avion.motorTsn ? String(avion.motorTsn).replace('.', ',') : '0,0';

            setFormData({
                sda: avion.sda || 'N/D',
                matricula: avion.matricula || 'N/D',
                nroSerie: avion.nroSerie || 'S/N', 
                tgPlaneadorActual: horasPlaneadorInicial, 
                tgMotorActual: horasMotorInicial
            });

            try {
                const res = await fetch(`${API_BASE_URL}/api/programas-mantenimiento/aeronave/${id}`, {
                    method: 'GET',
                    headers: getHeaders()
                });
                
                const textoCompleto = await res.text();
                let resultado;
                try {
                    resultado = JSON.parse(textoCompleto);
                } catch (e) {
                    throw new Error(`Error parsing JSON en lectura. Respuesta del servidor: "${textoCompleto}"`);
                }

                if (res.ok && resultado.data) {
                    setFormData(prev => ({
                        ...prev,
                        tgPlaneadorActual: resultado.data.tgPlaneadorActual || horasPlaneadorInicial,
                        tgMotorActual: resultado.data.tgMotorActual || horasMotorInicial
                    }));
                    setTablaPlaneador(resultado.data.programaPlaneador || []);
                    setTablaMotor(resultado.data.programaMotor || []);
                } else {
                    setTablaPlaneador([]);
                    setTablaMotor([]);
                }
            } catch (error) {
                console.error("Error al traer el programa de mantenimiento:", error);
                setTablaPlaneador([]);
                setTablaMotor([]);
            }
        }
    };

    const handleKpiChange = (campo, valor) => {
        setFormData({ ...formData, [campo]: valor });
    };

    const agregarRenglonPlaneador = () => {
        setTablaPlaneador([...tablaPlaneador, {
            id: Date.now(), descripcion: "", ultHs: "", ultFecha: "", ultOt: "", proxHs: "", proxFecha: "", responsable: "Ec AE", disp: ""
        }]);
    };

    const handleCellChangePlaneador = (id, campo, valor) => {
        setTablaPlaneador(tablaPlaneador.map(row => row.id === id ? { ...row, [campo]: valor } : row));
    };

    const agregarRenglonMotor = () => {
        setTablaMotor([...tablaMotor, {
            id: Date.now(), descripcion: "", ultHs: "", ultFecha: "", ultOt: "", proxHs: "", proxFecha: "", responsable: "Ec AE", disp: ""
        }]);
    };

    const handleCellChangeMotor = (id, campo, valor) => {
        setTablaMotor(tablaMotor.map(row => row.id === id ? { ...row, [campo]: valor } : row));
    };

    const resetVistaLocal = () => {
        setAeronaveSeleccionadaId('');
        setFormData({ sda: '', matricula: '', nroSerie: '', tgPlaneadorActual: '0,0', tgMotorActual: '0,0' });
        setTablaPlaneador([]);
        setTablaMotor([]);
    };

    const limpiarTablasActuales = () => {
        if (window.confirm("¿Desea limpiar los renglones de la pantalla para volver a escribir? (No alterará los datos guardados hasta que presione Guardar)")) {
            setTablaPlaneador([]);
            setTablaMotor([]);
        }
    };

    const guardarMantenimiento = async () => {
        if (!aeronaveSeleccionadaId) {
            alert("Error: Debe seleccionar una aeronave de la flota antes de guardar.");
            return;
        }

        const payload = {
            aeronaveId: aeronaveSeleccionadaId,
            tgPlaneadorActual: formData.tgPlaneadorActual,
            tgMotorActual: formData.tgMotorActual,
            programaPlaneador: tablaPlaneador,
            programaMotor: tablaMotor,
            actualizadoPor: usuarioSesion.username
        };

        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/programas-mantenimiento/guardar`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            
            const textoCompleto = await respuesta.text();
            let resultado;
            try {
                resultado = JSON.parse(textoCompleto);
            } catch (e) {
                throw new Error(`El servidor no devolvió un JSON válido. Respuesta: "${textoCompleto}"`);
            }

            if (respuesta.ok) {
                alert(`📋 ¡Programa de mantenimiento de ${formData.matricula} guardado con éxito!`);
            } else {
                alert(`Error del servidor: ${resultado.mensaje || resultado.message}`);
            }
        } catch (error) {
            console.error("Error al guardar el programa:", error);
            alert(error.message || "Error de conexión con el servidor backend.");
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.topHeaderBar}>
                <h2 style={styles.mainTitle}>SISTEMA DE GESTIÓN MANTENIMIENTO</h2>
                <div style={styles.topButtonBar}>
                    <button style={{...styles.btnTop, backgroundColor: '#7f8c8d'}} onClick={limpiarTablasActuales} disabled={!aeronaveSeleccionadaId}>
                        🔄 Limpiar Pantalla / Reescribir
                    </button>
                    <button style={{...styles.btnTop, backgroundColor: '#27ae60'}} onClick={guardarMantenimiento} disabled={!aeronaveSeleccionadaId}>
                        💾 Guardar Cambios
                    </button>
                </div>
            </div>

            <div style={styles.selectorsBar}>
                <div style={styles.selectorGroup}>
                    <label style={styles.labelTitle}>📁 SU FLOTA ASIGNADA ({unidadNavegacion})</label>
                    <select style={styles.selectInputFlota} value={aeronaveSeleccionadaId} onChange={handleAeronaveChange}>
                        <option value="">-- Seleccione Aeronave --</option>
                        {aeronavesFiltradas.map(a => {
                            const idReal = a._id?.$oid || a._id;
                            return (
                                <option key={idReal} value={idReal}>
                                    {a.matricula} - {a.sda}
                                </option>
                            );
                        })}
                    </select>
                </div>
                
                <div style={styles.selectorGroup}>
                    <label style={styles.labelTitle}>
                        {isMandoEstrategico ? "🛡️ NAVEGACIÓN GLOBAL DE UNIDADES" : "🔒 SU UNIDAD (SISTEMA BLOQUEADO)"}
                    </label>
                    <select 
                        style={{
                            ...styles.selectInputNav,
                            backgroundColor: isMandoEstrategico ? '#fff' : '#e9ecef',
                            color: isMandoEstrategico ? '#000' : '#7f8c8d'
                        }} 
                        value={unidadNavegacion} 
                        disabled={!isMandoEstrategico} 
                        onChange={(e) => { setUnidadNavegacion(e.target.value); resetVistaLocal(); }}
                    >
                        {isMandoEstrategico ? (
                            unidadesDisponibles.map(un => (
                                <option key={un} value={un}>{un}</option>
                            ))
                        ) : (
                            <option value={unidadNavegacion}>{unidadNavegacion}</option>
                        )}
                    </select>
                </div>
            </div>

            <div style={styles.cardForm}>
                <h3 style={styles.sectionHeader}>DATOS ESTRUCTURALES DE LA AERONAVE SELECCIONADA</h3>
                <div style={styles.formRow}>
                    <div style={styles.inputField}>
                        <label style={styles.fieldLabel}>SdA</label>
                        <input type="text" style={styles.textInput} value={formData.sda} disabled placeholder="N/D" />
                    </div>
                    <div style={styles.inputField}>
                        <label style={styles.fieldLabel}>Matrícula</label>
                        <input type="text" style={styles.textInput} value={formData.matricula} disabled placeholder="N/D" />
                    </div>
                    <div style={styles.inputField}>
                        <label style={styles.fieldLabel}>Nro Serie</label>
                        <input type="text" style={styles.textInput} value={formData.nroSerie} disabled placeholder="N/D" />
                    </div>
                </div>
            </div>

            {/* SECCIÓN 1: PLANEADOR */}
            <div style={styles.sectionDivider}>
                <div style={styles.miniKpiExcel}>
                    <span style={styles.kpiLabel}>TOTAL GRAL PLANEADOR:</span>
                    <input 
                        type="text" 
                        style={styles.kpiInputInline} 
                        value={formData.tgPlaneadorActual} 
                        disabled={!aeronaveSeleccionadaId}
                        onChange={(e) => handleKpiChange('tgPlaneadorActual', e.target.value)}
                    />
                </div>
                <button style={styles.btnAddRow} onClick={agregarRenglonPlaneador} disabled={!aeronaveSeleccionadaId}>➕ Agregar Renglón Planeador</button>
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
                            <tr><td colSpan="9" style={styles.tdEmpty}>No hay inspecciones de Planeador cargadas en pantalla.</td></tr>
                        ) : (
                            tablaPlaneador.map((row) => (
                                <tr key={row.id} style={styles.tr}>
                                    <td style={styles.td}><input type="text" style={styles.inputInCellBold} value={row.descripcion} onChange={(e) => handleCellChangePlaneador(row.id, 'descripcion', e.target.value)} placeholder="Escribir descripción..." /></td>
                                    <td style={styles.td}><input type="text" style={styles.inputInCell} value={row.gridHs || row.ultHs} onChange={(e) => handleCellChangePlaneador(row.id, 'ultHs', e.target.value)} /></td>
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

            {/* SECCIÓN 2: MOTOR */}
            <div style={{...styles.sectionDivider, marginTop: '25px'}}>
                <div style={{...styles.miniKpiExcel, backgroundColor: '#00a8ff'}}>
                    <span style={styles.kpiLabel}>TOTAL GRAL MOTOR:</span>
                    <input 
                        type="text" 
                        style={styles.kpiInputInline} 
                        value={formData.tgMotorActual} 
                        disabled={!aeronaveSeleccionadaId}
                        onChange={(e) => handleKpiChange('tgMotorActual', e.target.value)}
                    />
                </div>
                <button style={{...styles.btnAddRow, backgroundColor: '#d35400'}} onClick={agregarRenglonMotor} disabled={!aeronaveSeleccionadaId}>➕ Agregar Renglón Motor</button>
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
                            <tr><td colSpan="9" style={styles.tdEmpty}>No hay inspecciones de Motor cargadas en pantalla.</td></tr>
                        ) : (
                            tablaMotor.map((row) => (
                                <tr key={row.id} style={styles.tr}>
                                    <td style={styles.td}><input type="text" style={styles.inputInCellBold} value={row.descripcion} onChange={(e) => handleCellChangeMotor(row.id, 'descripcion', e.target.value)} placeholder="Escribir descripción..." /></td>
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

const styles = {
    container: { padding: '10px 20px', maxWidth: '100%', margin: '0 auto', fontFamily: 'monospace, sans-serif' },
    topHeaderBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1b2a4a', padding: '10px 20px', border: '1px solid #111a30' },
    mainTitle: { color: '#ffffff', margin: 0, fontSize: '0.95rem', fontWeight: 'bold' },
    topButtonBar: { display: 'flex', gap: '5px' },
    btnTop: { color: '#fff', border: 'none', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer' },
    selectorsBar: { display: 'flex', gap: '15px', background: '#eef2f5', padding: '8px 15px', border: '1px solid #ccc' },
    selectorGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
    labelTitle: { fontSize: '0.7rem', fontWeight: 'bold', color: '#444' },
    selectInputFlota: { padding: '5px 10px', border: '1px solid #3498db', backgroundColor: '#fff', fontSize: '0.85rem', fontWeight: 'bold', outline: 'none' },
    selectInputNav: { padding: '5px 10px', border: '1px solid #ccc', fontSize: '0.85rem', fontWeight: 'bold', outline: 'none' },
    cardForm: { background: '#fff', border: '1px solid #ccc', padding: '10px 15px', marginTop: '10px' },
    sectionHeader: { margin: '0 0 6px 0', fontSize: '0.75rem', color: '#7f8c8d', fontWeight: 'bold' },
    formRow: { display: 'flex', gap: '15px' },
    inputField: { flex: 1, display: 'flex', flexDirection: 'column' },
    fieldLabel: { fontSize: '0.68rem', color: '#555', fontWeight: 'bold' },
    textInput: { padding: '5px 8px', border: '1px solid #ccc', fontSize: '0.85rem', backgroundColor: '#e9ecef', color: '#2c3e50', fontWeight: 'bold', outline: 'none' },
    sectionDivider: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', marginBottom: '5px' },
    miniKpiExcel: { backgroundColor: '#00a8ff', color: '#000', padding: '2px 8px', border: '1px solid #000', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 'bold' },
    kpiLabel: { color: '#000' },
    kpiInputInline: { width: '70px', background: '#fff', border: '1px solid #000', padding: '2px 4px', fontSize: '0.75rem', fontFamily: 'monospace', textAlign: 'center', fontWeight: 'bold' },
    btnAddRow: { backgroundColor: '#2c3e50', color: '#fff', border: 'none', padding: '5px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' },
    tableWrapper: { overflowX: 'auto', border: '1px solid #000' },
    mantoTable: { width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' },
    th: { backgroundColor: '#00a8ff', color: '#000', border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.1' },
    thSub: { fontSize: '0.68rem', color: '#111', fontWeight: 'normal' },
    tr: { backgroundColor: '#ffffff' }, 
    td: { border: '1px solid #000', padding: '0px' },
    tdAction: { border: '1px solid #000', padding: '0px', backgroundColor: '#f8f9fa', textAlign: 'center' },
    tdEmpty: { border: '1px solid #000', padding: '15px', textAlign: 'center', color: '#7f8c8d', backgroundColor: '#ffffff', fontStyle: 'italic' },
    inputInCell: { width: '100%', boxSizing: 'border-box', border: 'none', background: 'transparent', padding: '6px 4px', fontSize: '0.78rem', fontFamily: 'monospace', textAlign: 'center', color: '#000', outline: 'none' },
    inputInCellBold: { width: '100%', boxSizing: 'border-box', border: 'none', background: 'transparent', padding: '6px 6px', fontSize: '0.78rem', fontFamily: 'monospace', textAlign: 'left', fontWeight: 'bold', color: '#000', outline: 'none' },
    btnDeleteRow: { background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }
};

export default ProgramaMantenimiento;