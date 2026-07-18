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

    return (
        <div style={styles.container}>
            {/* 📁 BARRA SUPERIOR DE SELECTORES (Formato 3 columnas idéntico a la foto) */}
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

                <div style={styles.selectorGroup}>
                    <label style={styles.labelTitle}>✈️ PROGRAMA SELECCIONADO</label>
                    <select style={styles.selectInputDisabled} disabled>
                        <option>-- General Mantenimiento (F13) --</option>
                    </select>
                </div>
            </div>

            {/* 📝 PANEL DE INFORMACIÓN COMPACTO (Fila única horizontal) */}
            <div style={styles.cardForm}>
                <div style={styles.cardHeaderRow}>
                    <h3 style={styles.sectionHeader}>DATOS DE LA AERONAVE</h3>
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

            {/* 🎛️ BOTONERA DE CONTROL COMPACTA */}
            <div style={styles.buttonBar}>
                <button style={{...styles.btn, backgroundColor: '#3498db'}} onClick={limpiarFormulario}>📄 Limpiar / Nuevo</button>
                <button style={{...styles.btn, backgroundColor: '#2ecc71'}} onClick={guardarRegistro}>💾 Dar de Alta / Guardar</button>
                <button style={{...styles.btn, backgroundColor: '#e74c3c'}} onClick={eliminarRegistro}>🗑️ Eliminar</button>
            </div>

            {/* 📊 ESPACIO RESERVADO PARA LA FUTURA TABLA */}
            <div style={styles.tablePlaceholder}>
                <p style={{ margin: 0, color: '#7f8c8d' }}>📊 Espacio disponible para la nueva tabla de Programas de Mantenimiento / Horas F13...</p>
            </div>
        </div>
    );
};

// Estilos de Alta Densidad (Más juntos, menor padding vertical)
const styles = {
    container: { padding: '10px 20px', maxWidth: '100%', margin: '0 auto', fontFamily: 'sans-serif' },
    selectorsBar: { display: 'flex', gap: '15px', background: '#eef2f5', padding: '10px 15px', borderRadius: '4px', marginBottom: '12px', border: '1px solid #dcdcdc' },
    selectorGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
    labelTitle: { fontSize: '0.75rem', fontWeight: 'bold', color: '#555', letterSpacing: '0.3px', textTransform: 'uppercase' },
    selectInputFlota: { padding: '6px 10px', borderRadius: '4px', border: '1px solid #2ecc71', backgroundColor: '#fff', fontSize: '0.85rem', fontWeight: 'bold', outline: 'none' },
    selectInputNav: { padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#e9ecef', fontSize: '0.85rem', color: '#495057' },
    selectInputDisabled: { padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#f8f9fa', fontSize: '0.85rem', color: '#6c757d' },
    
    cardForm: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '10px 15px', marginBottom: '12px' },
    cardHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #f1f2f6', paddingBottom: '4px' },
    sectionHeader: { margin: 0, fontSize: '0.75rem', color: '#444', fontWeight: 'bold', letterSpacing: '0.5px' },
    
    formRow: { display: 'flex', gap: '15px' },
    inputField: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
    fieldLabel: { fontSize: '0.7rem', color: '#777', fontWeight: '500' },
    textInput: { padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem', backgroundColor: '#fafafa', outline: 'none' },
    
    buttonBar: { display: 'flex', gap: '10px', background: '#2c3e50', padding: '8px 15px', borderRadius: '4px', marginBottom: '15px' },
    btn: { color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' },
    
    tablePlaceholder: { marginTop: '10px', padding: '30px', textAlign: 'center', background: '#fff', border: '2px dashed #bdc3c7', borderRadius: '4px' }
};

export default ProgramaMantenimiento;