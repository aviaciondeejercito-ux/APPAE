import React, { useState, useEffect } from 'react';
import { getAircrafts } from '../services/api'; 

const ProgramaMantenimiento = () => {
    // Estados de Datos
    const [aeronaves, setAeronaves] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados de Selección y Formulario
    const [unidadNavegacion, setUnidadNavegacion] = useState('');
    const [aeronaveSeleccionadaId, setAeronaveSeleccionadaId] = useState('');
    
    const [formData, setFormData] = useState({
        sda: '',
        matricula: '',
        nroSerie: ''
    });

    // 📊 REGISTROS DE MUESTRA (Basados exactamente en tu planilla Excel)
    const [tablaMantenimiento, setTablaMantenimiento] = useState([
        {
            id: 1,
            descripcion: "INSP DE 100HS DE AERONAVE PROGRESIVA EVENTOS (1,2,3,4) y CORROSION",
            ultHsPlaneador: "2355,9",
            ultFecha: "5-Nov-25",
            ultOt: "231/25",
            proxHsPlaneador: "2380,9",
            proxFecha: "X ACT DE VLO",
            responsable: "Ec AE",
            disp: "20,0"
        },
        {
            id: 2,
            descripcion: "WEEKLY INSPECCION",
            ultHsPlaneador: "2355,9",
            ultFecha: "6-Nov-25",
            ultOt: "231/25",
            proxHsPlaneador: "N/A",
            proxFecha: "X ACT DE VLO",
            responsable: "Ec AE",
            disp: "N/A"
        },
        {
            id: 3,
            descripcion: "12 MESES DE INSP",
            ultHsPlaneador: "2106,9",
            ultFecha: "21-Mar-25",
            ultOt: "B232/24",
            proxHsPlaneador: "N/A",
            proxFecha: "21-Mar-26",
            responsable: "Ec AE",
            disp: "N/A"
        }
    ]);

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
                nroSerie: avion.nroSerie || ''
            });
        }
    };

    const limpiarFormulario = () => {
        setAeronaveSeleccionadaId('');
        setFormData({ sda: '', matricula: '', nroSerie: '' });
    };

    const guardarRegistro = () => {
        alert(`Guardando datos para la aeronave ${formData.matricula || 'Sin Seleccionar'}`);
    };

    const eliminarRegistro = () => {
        if (!aeronaveSeleccionadaId) return;
        if (window.confirm(`¿Eliminar registro de ${formData.matricula}?`)) {
            limpiarFormulario();
        }
    };

    // Helper para formatear celdas de alerta/N/A con estilos planos
    const getDispStyle = (val) => {
        if (val === 'N/A') return { backgroundColor: '#e74c3c', color: '#fff', fontWeight: 'bold' };
        return { backgroundColor: '#2ecc71', color: '#000', fontWeight: 'bold' };
    };

    const getProxStyle = (val) => {
        if (val === 'N/A') return { backgroundColor: '#e74c3c', color: '#fff' };
        return {};
    };

    return (
        <div style={styles.container}>
            
            {/* 🟦 BARRA DE TÍTULO SUPERIOR OSCURA CON BOTONERA INTEGRADA */}
            <div style={styles.topHeaderBar}>
                <h2 style={styles.mainTitle}>SISTEMA DE GESTIÓN MANTENIMIENTO - SINCRO MONGOOSE</h2>
                
                <div style={styles.topButtonBar}>
                    <button style={{...styles.btnTop, backgroundColor: '#3498db'}} onClick={limpiarFormulario}>
                        📄 Limpiar / Nuevo
                    </button>
                    <button style={{...styles.btnTop, backgroundColor: '#2ecc71'}} onClick={guardarRegistro}>
                        💾 Dar de Alta / Guardar
                    </button>
                    <button style={{...styles.btnTop, backgroundColor: '#e74c3c'}} onClick={eliminarRegistro}>
                        🗑️ Eliminar Registro
                    </button>
                </div>
            </div>

            {/* 📁 BARRA GRIS DE SELECTORES */}
            <div style={styles.selectorsBar}>
                <div style={styles.selectorGroup}>
                    <label style={styles.labelTitle}>📁 SELECTOR FLOTA (Restringido a tu Base: {userElemento || 'N/D'})</label>
                    <select style={styles.selectInputFlota} value={aeronaveSeleccionadaId} onChange={handleAeronaveChange}>
                        <option value="">-- Seleccionar Aeronave Guardada --</option>
                        {aeronaves.map(a => (
                            <option key={a._id} value={a._id}>{a.matricula} - {a.sda}</option>
                        ))}
                    </select>
                </div>

                <div style={styles.selectorGroup}>
                    <label style={styles.labelTitle}>🛡️ NAVEGACIÓN ENTRE UNIDADES {!isMandoEstrategico && '🔒 (BLOQUEADO)'}</label>
                    <select style={styles.selectInputNav} value={unidadNavegacion} disabled={!isMandoEstrategico} onChange={(e) => { setUnidadNavegacion(e.target.value); limpiarFormulario(); }}>
                        <option value={unidadNavegacion}>{unidadNavegacion}</option>
                    </select>
                </div>
            </div>

            {/* 📝 PANEL DE INFORMACIÓN COMPACTO */}
            <div style={styles.cardForm}>
                <div style={styles.cardHeaderRow}>
                    <h3 style={styles.sectionHeader}>DATOS DE LA AERONAVE</h3>
                    <div style={styles.miniKpiExcel}>
                        <span style={styles.kpiLabel}>TOTAL GRAL PLANEADOR:</span>
                        <span style={styles.kpiValue}>2360,9</span>
                    </div>
                </div>
                
                <div style={styles.formRow}>
                    <div style={styles.inputField}>
                        <label style={styles.fieldLabel}>SdA</label>
                        <input type="text" style={styles.textInput} value={formData.sda} readOnly placeholder="UH-1H" />
                    </div>
                    <div style={styles.inputField}>
                        <label style={styles.fieldLabel}>Matrícula</label>
                        <input type="text" style={styles.textInput} value={formData.matricula} readOnly placeholder="AE-XXX" />
                    </div>
                    <div style={styles.inputField}>
                        <label style={styles.fieldLabel}>Nro Serie</label>
                        <input type="text" style={styles.textInput} value={formData.nroSerie} readOnly placeholder="N/S" />
                    </div>
                </div>
            </div>

            {/* 🤖 TABLA CON FORMATO ROBÓTICO / ALTA DENSIDAD EXCEL */}
            <div style={styles.tableWrapper}>
                <table style={styles.mantoTable}>
                    <thead>
                        <tr>
                            <th style={{...styles.th, width: '40%'}}>DESCRIPCION</th>
                            <th style={styles.th}>ULTIMA INTERVENCIÓN<br/><span style={styles.thSub}>HS PLANEADOR</span></th>
                            <th style={styles.th}>ULTIMA INTERVENCIÓN<br/><span style={styles.thSub}>FECHA</span></th>
                            <th style={styles.th}>OT</th>
                            <th style={styles.th}>PROXIMA INTERVENCIÓN<br/><span style={styles.thSub}>HS PLANEADOR</span></th>
                            <th style={styles.th}>PROXIMA INTERVENCIÓN<br/><span style={styles.thSub}>FECHA</span></th>
                            <th style={styles.th}>RESPONSABLE</th>
                            <th style={{...styles.th, width: '8%'}}>DISP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tablaMantenimiento.map((row) => (
                            <tr key={row.id} style={styles.tr}>
                                <td style={{...styles.td, textAlign: 'left', fontWeight: 'bold'}}>{row.descripcion}</td>
                                <td style={styles.td}>{row.ultHsPlaneador}</td>
                                <td style={styles.td}>{row.ultFecha}</td>
                                <td style={styles.td}>{row.ultOt}</td>
                                <td style={{...styles.td, ...getProxStyle(row.proxHsPlaneador)}}>{row.proxHsPlaneador}</td>
                                <td style={styles.td}>{row.proxFecha}</td>
                                <td style={styles.td}>{row.responsable}</td>
                                <td style={{...styles.td, ...getDispStyle(row.disp)}}>{row.disp}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Estilos Planos, Cuadrados y de Alta Densidad (Tipo Terminal Operativa)
const styles = {
    container: { padding: '10px 20px', maxWidth: '100%', margin: '0 auto', fontFamily: 'monospace, sans-serif' },
    
    topHeaderBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1b2a4a', padding: '10px 20px', borderRadius: '0px', marginBottom: '10px', border: '1px solid #111a30' },
    mainTitle: { color: '#ffffff', margin: 0, fontSize: '0.95rem', fontWeight: 'bold', letterSpacing: '0.5px' },
    topButtonBar: { display: 'flex', gap: '5px' },
    btnTop: { color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '0px', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' },
    
    selectorsBar: { display: 'flex', gap: '15px', background: '#eef2f5', padding: '8px 15px', borderRadius: '0px', marginBottom: '10px', border: '1px solid #ccc' },
    selectorGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
    labelTitle: { fontSize: '0.7rem', fontWeight: 'bold', color: '#444', letterSpacing: '0.3px' },
    selectInputFlota: { padding: '5px 10px', borderRadius: '0px', border: '1px solid #2ecc71', backgroundColor: '#fff', fontSize: '0.85rem', fontWeight: 'bold', outline: 'none' },
    selectInputNav: { padding: '5px 10px', borderRadius: '0px', border: '1px solid #ccc', backgroundColor: '#e9ecef', fontSize: '0.85rem', color: '#495057' },
    
    cardForm: { background: '#fff', border: '1px solid #ccc', borderRadius: '0px', padding: '10px 15px', marginBottom: '10px' },
    cardHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid #ccc', paddingBottom: '4px' },
    sectionHeader: { margin: 0, fontSize: '0.75rem', color: '#000', fontWeight: 'bold' },
    
    miniKpiExcel: { backgroundColor: '#00a8ff', color: '#000', padding: '3px 8px', border: '1px solid #0097e6', display: 'flex', gap: '10px', fontSize: '0.75rem', fontWeight: 'bold' },
    kpiLabel: { color: '#000' },
    kpiValue: { color: '#000', underline: 'true' },

    formRow: { display: 'flex', gap: '15px' },
    inputField: { flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' },
    fieldLabel: { fontSize: '0.68rem', color: '#555', fontWeight: 'bold' },
    textInput: { padding: '5px 8px', borderRadius: '0px', border: '1px solid #ccc', fontSize: '0.85rem', backgroundColor: '#fafafa', outline: 'none' },
    
    // 🤖 Estilos de la Tabla Mantenimiento Estilo Excel Duro
    tableWrapper: { overflowX: 'auto', marginTop: '10px', border: '1px solid #000' },
    mantoTable: { width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', backgroundColor: '#95afc0' },
    th: { backgroundColor: '#00a8ff', color: '#000', border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.1' },
    thSub: { fontSize: '0.68rem', color: '#111', fontWeight: 'normal' },
    tr: { backgroundColor: '#badc58' }, // Color verde base de fondo idéntico al Excel enviado
    td: { border: '1px solid #000', padding: '6px 8px', textAlign: 'center', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
};

export default ProgramaMantenimiento;