import React, { useState, useEffect } from 'react';
import { getAircrafts } from '../services/api'; // Asegurá la ruta correcta a tu API

const ProgramaMantenimiento = () => {
    // Estados de Datos
    const [aeronaves, setAeronaves] = useState([]);
    const [f13Records, setF13Records] = useState([]); // Horas voladas por turno de vuelo
    const [loading, setLoading] = useState(true);

    // Estados de Selección y Formulario
    const [unidadNavegacion, setUnidadNavegacion] = useState('');
    const [aeronaveSeleccionadaId, setAeronaveSeleccionadaId] = useState('');
    
    const [formData, setFormData] = useState({
        sda: '',
        matricula: '',
        nroSerie: ''
    });

    // Roles y Elemento de Seguridad institucional (Idéntico a F16Page / EstadoAeronaves)
    const rawRole = localStorage.getItem('role') || 'user';
    const roleUpper = String(rawRole).trim().toUpperCase().replace(/[\s_]/g, '');
    const roleLower = String(rawRole).trim().toLowerCase().replace(/[\s_]/g, '');
    const userElemento = localStorage.getItem('elemento')?.trim().toUpperCase() || "";

    const esAdminPorContenido = roleUpper.includes('ADMIN') || roleLower.includes('admin');
    const esMandoPorLista = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleUpper) || ['admin', 'boss', 'director', 'oto'].includes(roleLower);
    const isMandoPorRol = esAdminPorContenido || esMandoPorLista;
    const isMandoEstrategico = isMandoPorRol || userElemento === 'COMANDO';

    // Carga inicial de datos
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
            // 1. Obtener Aircrafts
            const respuesta = await getAircrafts();
            let listaAviones = [];
            if (Array.isArray(respuesta)) listaAviones = respuesta;
            else if (respuesta && Array.isArray(respuesta.data)) listaAviones = respuesta.data;
            else if (respuesta && respuesta.data && Array.isArray(respuesta.data.data)) listaAviones = respuesta.data.data;

            // Filtrado estricto por la unidad actualmente navegada
            const filtrados = listaAviones.filter(a => 
                a.unidad && String(a.unidad).trim().toUpperCase() === unidadNavegacion.toUpperCase()
            );
            setAeronaves(filtrados);

            // 2. 📝 AQUÍ BUSCARÍAS LOS MODELOS F13 FILTRADOS POR UNIDAD
            // const f13Res = await getF13ByUnidad(unidadNavegacion);
            // setF13Records(f13Res.data || []);

            setLoading(false);
        } catch (error) {
            console.error("Error al cargar datos en Programa de Mantenimiento:", error);
            setLoading(false);
        }
    };

    // Al cambiar la aeronave elegida en el selector de flota
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

    // Acciones de la Botonera Inferior
    const limpiarFormulario = () => {
        setAeronaveSeleccionadaId('');
        setFormData({
            sda: '',
            matricula: '',
            nroSerie: ''
        });
        console.log("Formulario reseteado.");
    };

    const guardarRegistro = async () => {
        console.log("Guardando Programa de Mantenimiento / F13 para:", formData.matricula, formData);
        alert(`Guardando datos de la aeronave ${formData.matricula || 'Sin Matrícula'}`);
        // Aquí agregarás el fetch POST/PUT correspondiente a tu lógica
    };

    const eliminarRegistro = async () => {
        if (!aeronaveSeleccionadaId) {
            alert("Seleccione una aeronave válida para eliminar del programa.");
            return;
        }
        if (window.confirm(`¿Está seguro de eliminar el registro de ${formData.matricula}?`)) {
            console.log("Eliminando registro id:", aeronaveSeleccionadaId);
            limpiarFormulario();
        }
    };

    // Listado de unidades únicas para el selector de navegación (Mandos)
    const listaTodasLasUnidades = [
        "B AV APY COMB 601",
        "B AV COMB 601",
        "SEC AV CH 601",
        "COMANDO"
    ];

    return (
        <div style={styles.container}>
            <h2 style={styles.mainTitle}>🛠️ Programa de Mantenimiento</h2>

            {/* 📁 SECCIÓN SELECTORES (Primera Foto) */}
            <div style={styles.selectorsBar}>
                <div style={styles.selectorGroup}>
                    <label style={styles.labelTitle}>📁 SELECTOR FLOTA (Restringido a tu Base: {userElemento || 'N/D'})</label>
                    <select 
                        style={styles.selectInputFlota} 
                        value={aeronaveSeleccionadaId} 
                        onChange={handleAeronaveChange}
                    >
                        <option value="">-- {aeronaves.length > 0 ? 'Seleccione una Aeronave' : 'No hay aeronaves registradas'} --</option>
                        {aeronaves.map(a => (
                            <option key={a._id} value={a._id}>{a.matricula} - {a.sda}</option>
                        ))}
                    </select>
                </div>

                <div style={styles.selectorGroup}>
                    <label style={styles.labelTitle}>
                        🛡️ NAVEGACIÓN ENTRE UNIDADES {!isMandoEstrategico && '🔒 (BLOQUEADO)'}
                    </label>
                    <select 
                        style={styles.selectInputNav} 
                        value={unidadNavegacion}
                        disabled={!isMandoEstrategico}
                        onChange={(e) => {
                            setUnidadNavegacion(e.target.value);
                            limpiarFormulario();
                        }}
                    >
                        {isMandoEstrategico ? (
                            listaTodasLasUnidades.map(u => <option key={u} value={u}>{u}</option>)
                        ) : (
                            <option value={userElemento}>{userElemento}</option>
                        )}
                    </select>
                </div>
            </div>

            {/* 📝 DATOS DE LA AERONAVE (Segunda Foto) */}
            <div style={styles.cardForm}>
                <h3 style={styles.sectionHeader}>DATOS DE LA AERONAVE</h3>
                <div style={styles.formRow}>
                    <div style={styles.inputField}>
                        <label style={styles.fieldLabel}>SdA</label>
                        <input 
                            type="text" 
                            style={styles.textInput} 
                            value={formData.sda} 
                            readOnly 
                            placeholder="S/D"
                        />
                    </div>
                    <div style={styles.inputField}>
                        <label style={styles.fieldLabel}>Matrícula</label>
                        <input 
                            type="text" 
                            style={styles.textInput} 
                            value={formData.matricula} 
                            readOnly 
                            placeholder="AE-XXX"
                        />
                    </div>
                    <div style={styles.inputField}>
                        <label style={styles.fieldLabel}>Nro Serie</label>
                        <input 
                            type="text" 
                            style={styles.textInput} 
                            value={formData.nroSerie} 
                            readOnly 
                            placeholder="N/S"
                        />
                    </div>
                </div>
            </div>

            {/* 🎛️ BOTONERA DE CONTROL (Tercera Foto) */}
            <div style={styles.buttonBar}>
                <button style={{...styles.btn, backgroundColor: '#3498db'}} onClick={limpiarFormulario}>
                    📄 Limpiar / Nuevo
                </button>
                <button style={{...styles.btn, backgroundColor: '#2ecc71'}} onClick={guardarRegistro}>
                    💾 Dar de Alta / Guardar
                </button>
                <button style={{...styles.btn, backgroundColor: '#e74c3c'}} onClick={eliminarRegistro}>
                    🗑️ Eliminar Registro
                </button>
            </div>

            {loading && <div style={styles.loader}>Sincronizando datos con Base de Datos Mantenimiento...</div>}
        </div>
    );
};

// Estilos Normalizados para Clones Perfectos de Interfaz
const styles = {
    container: { padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'sans-serif' },
    mainTitle: { color: '#1b3a57', marginBottom: '20px' },
    selectorsBar: { display: 'flex', gap: '20px', background: '#eef2f5', padding: '15px', borderRadius: '6px', marginBottom: '25px', border: '1px solid #dcdcdc' },
    selectorGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' },
    labelTitle: { fontSize: '0.8rem', fontWeight: 'bold', color: '#555', letterSpacing: '0.5px' },
    selectInputFlota: { padding: '10px', borderRadius: '4px', border: '1px solid #2ecc71', backgroundColor: '#eefcf5', fontSize: '0.95rem', fontWeight: 'bold', outline: 'none' },
    selectInputNav: { padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#e9ecef', fontSize: '0.95rem', color: '#495057' },
    cardForm: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '20px', marginBottom: '25px' },
    sectionHeader: { margin: '0 0 15px 0', fontSize: '0.9rem', color: '#444', fontWeight: 'bold', letterSpacing: '0.5px' },
    formRow: { display: 'flex', gap: '20px' },
    inputField: { flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' },
    fieldLabel: { fontSize: '0.8rem', color: '#666' },
    textInput: { padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem', backgroundColor: '#fafafa', outline: 'none' },
    buttonBar: { display: 'flex', gap: '15px', background: '#2c3e50', padding: '15px', borderRadius: '6px' },
    btn: { color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    loader: { textAlign: 'center', marginTop: '15px', color: '#34495e', fontStyle: 'italic', fontSize: '0.9rem' }
};

export default ProgramaMantenimiento;