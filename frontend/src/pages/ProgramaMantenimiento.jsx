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
        tgMotorActual: '0,0'
    });

    // 📊 MATRICES DINÁMICAS
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
            // Sincronización con el JSON real de la aeronave
            const horasPlaneadorInicial = avion.tgPlaneadorActual ? String(avion.tgPlaneadorActual).replace('.', ',') : '0,0';
            const horasMotorInicial = avion.motorTsn ? String(avion.motorTsn).replace('.', ',') : '0,0';

            // 1. Carga inicial con datos del modelo Aircraft
            setFormData({
                sda: avion.sda || 'N/D',
                matricula: avion.matricula || 'N/D',
                nroSerie: avion.nroSerie || 'S/N', 
                tgPlaneadorActual: horasPlaneadorInicial, 
                tgMotorActual: horasMotorInicial
            });

            // 2. Consulta al programa independiente
            try {
                const res = await fetch(`/api/programas-mantenimiento/aeronave/${id}`);
                const resultado = await res.json();
                
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
            programaMotor: tablaMotor
        };

        try {
            const respuesta = await fetch('/api/programas-mantenimiento/guardar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const resultado = await respuesta.json();
            
            if (respuesta.ok) {
                alert(`📋 ¡Programa de mantenimiento de ${formData.matricula} guardado con éxito!`);
            } else {
                alert(`Error del servidor: ${resultado.mensaje}`);
            }
        } catch (error) {
            console.error("Error al guardar el programa:", error);
            alert("Error de conexión con el servidor backend.");
        }
    };

    return (
        <div style={styles.container}>
            {/* BARRA DE TÍTULO SUPERIOR */}
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

            {/* BARRA DE SELECTORES */}
            <div style={styles.selectorsBar}>
                <div style={styles.selectorGroup}>
                    <label style={styles.labelTitle}>📁 SELECCIONAR AERONAVE DE LA FLOTA ({userElemento || 'N/D'})</label>
                    <select style={styles.selectInputFlota} value={aeronaveSeleccionadaId} onChange={handleAeronaveChange}>
                        <option value="">-- Seleccione una aeronave registrada para gestionar su programa --</option>
                        {aeronaves.map(a => {
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
                    <label style={styles.labelTitle}>🛡️ NAVEGACIÓN ENTRE UNIDADES {!isMandoEstrategico && '🔒 (BLOQUEADO)'}</label>
                    <select style={styles.selectInputNav} value={unidadNavegacion} disabled={!isMandoEstrategico} onChange={(e) => { setUnidadNavegacion(e.target.value); resetVistaLocal(); }}>
                        <option value={unidadNavegacion}>{unidadNavegacion}</option>
                    </select>
                </div>
            </div>

            {/* PANEL DE INFORMACIÓN CABECERA */}
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

// Se mantienen intactos tus estilos CSS en la constante 'styles'
const styles = { /* ... */ };

export default ProgramaMantenimiento;