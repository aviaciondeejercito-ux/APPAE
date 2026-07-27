import React, { useState, useEffect } from 'react';
import { getPatronesVuelo, createPatronVuelo, updatePatronVuelo } from '../services/api';

const GestorPatrones = () => {
    const [patrones, setPatrones] = useState([]);
    const [patronSeleccionado, setPatronSeleccionado] = useState(null);
    const [cargando, setCargando] = useState(false);
    
    const [formData, setFormData] = useState({
        _id: null,
        codigo: '',
        nombre: '',
        descripcion: '',
        aeronaveTipo: 'GENERAL',
        estandares: [],
        activo: true
    });

    // 1. Cargar lista de patrones desde el backend
    const cargarPatrones = async () => {
        try {
            setCargando(true);
            const res = await getPatronesVuelo();
            setPatrones(res.data.data || res.data || []);
        } catch (err) {
            console.error("Error al cargar patrones de vuelo:", err);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarPatrones();
    }, []);

    // 2. Agrupar patrones por Nombre/Fase para la vista lateral
    const patronesAgrupados = patrones.reduce((acc, patron) => {
        const grupo = patron.nombre || 'SIN NOMBRE';
        if (!acc[grupo]) {
            acc[grupo] = [];
        }
        acc[grupo].push(patron);
        return acc;
    }, {});

    // 3. Handlers del Formulario
    const handleNuevoPatron = () => {
        setPatronSeleccionado(null);
        setFormData({
            _id: null,
            codigo: '',
            nombre: '',
            descripcion: '',
            aeronaveTipo: 'GENERAL',
            estandares: [{ nombre: '', descripcion: '', orden: 1 }],
            activo: true
        });
    };

    const handleEditarPatron = (patron) => {
        setPatronSeleccionado(patron._id);
        setFormData({
            _id: patron._id,
            codigo: patron.codigo || '',
            nombre: patron.nombre || '',
            descripcion: patron.descripcion || '',
            aeronaveTipo: patron.aeronaveTipo || 'GENERAL',
            estandares: patron.estandares && patron.estandares.length > 0 
                ? patron.estandares 
                : [{ nombre: '', descripcion: '', orden: 1 }],
            activo: patron.activo !== undefined ? patron.activo : true
        });
    };

    const handleAddEstandar = () => {
        setFormData(prev => ({
            ...prev,
            estandares: [
                ...prev.estandares, 
                { nombre: '', descripcion: '', orden: prev.estandares.length + 1 }
            ]
        }));
    };

    const handleEstandarChange = (index, field, value) => {
        const nuevosEstandares = [...formData.estandares];
        nuevosEstandares[index][field] = value;
        setFormData({ ...formData, estandares: nuevosEstandares });
    };

    const handleRemoveEstandar = (index) => {
        const nuevosEstandares = formData.estandares.filter((_, i) => i !== index);
        setFormData({ ...formData, estandares: nuevosEstandares });
    };

    const handleGuardar = async (e) => {
    e.preventDefault();
    try {
        // Clonamos el formulario y eliminamos el _id si no existe
        const payload = { ...formData };
        if (!payload._id) {
            delete payload._id;
        }

        if (formData._id) {
            await updatePatronVuelo(formData._id, payload);
        } else {
            await createPatronVuelo(payload);
        }
        
        alert("✅ Patrón de Vuelo guardado exitosamente");
        cargarPatrones();
        handleNuevoPatron();
    } catch (err) {
        console.error("Error al guardar:", err);
        const mensajeError = err.response?.data?.error || "Error al conectar con el servidor";
        alert(`❌ Error al guardar: ${mensajeError}`);
    }
};

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>⚙️ GESTOR DE PATRONES Y ESTÁNDARES DE VUELO</h2>
            </div>

            <div style={styles.grid}>
                {/* PANEL IZQUIERDO: PATRONES AGRUPADOS POR NOMBRE */}
                <div style={styles.card}>
                    <button style={styles.btnCreate} onClick={handleNuevoPatron}>
                        ➕ Crear Nuevo Patrón
                    </button>
                    <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #cbd5e1' }} />
                    
                    {cargando ? (
                        <p style={{ textAlign: 'center', fontSize: '0.85rem' }}>Cargando patrones...</p>
                    ) : Object.keys(patronesAgrupados).length === 0 ? (
                        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>No hay patrones registrados aún.</p>
                    ) : (
                        <div style={styles.groupContainer}>
                            {Object.keys(patronesAgrupados).map(nombreGrupo => (
                                <div key={nombreGrupo} style={styles.groupCard}>
                                    <div style={styles.groupHeader}>
                                        📂 <strong>{nombreGrupo.toUpperCase()}</strong>
                                        <span style={styles.groupBadge}>
                                            {patronesAgrupados[nombreGrupo].length} variante(s)
                                        </span>
                                    </div>
                                    
                                    <ul style={styles.list}>
                                        {patronesAgrupados[nombreGrupo].map(patron => (
                                            <li 
                                                key={patron._id} 
                                                style={{
                                                    ...styles.listItem,
                                                    backgroundColor: patronSeleccionado === patron._id ? '#e8f4f8' : '#fff',
                                                    borderColor: patronSeleccionado === patron._id ? '#3498db' : '#e2e8f0'
                                                }}
                                                onClick={() => handleEditarPatron(patron)}
                                            >
                                                <div>
                                                    <strong>[{patron.codigo}]</strong>
                                                    <span style={{ fontSize: '0.75rem', color: '#555', marginLeft: '6px' }}>
                                                        ({patron.aeronaveTipo || 'GENERAL'})
                                                    </span>
                                                </div>
                                                <span style={styles.badge}>
                                                    {patron.estandares?.length || 0} maniobra(s)
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* PANEL DERECHO: FORMULARIO DE EDICIÓN / ALTA */}
                <form onSubmit={handleGuardar} style={styles.card}>
                    <h3 style={{ marginTop: 0, color: '#1b2a4a', borderBottom: '2px solid #1b2a4a', paddingBottom: '8px' }}>
                        {patronSeleccionado ? '✏️ Editar Patrón de Vuelo' : '➕ Nuevo Patrón de Vuelo'}
                    </h3>

                    <div style={styles.formRow}>
                        <div>
                            <label style={styles.label}>Código del Patrón:</label>
                            <input 
                                type="text" 
                                style={styles.input} 
                                value={formData.codigo} 
                                onChange={e => setFormData({...formData, codigo: e.target.value.toUpperCase()})} 
                                placeholder="Ej: PV-01, NOCT-02" 
                                required 
                            />
                        </div>
                        <div>
                            <label style={styles.label}>Nombre Agrupador / Misión:</label>
                            <input 
                                type="text" 
                                style={styles.input} 
                                value={formData.nombre} 
                                onChange={e => setFormData({...formData, nombre: e.target.value})} 
                                placeholder="Ej: Navegación Táctica, Vuelo Nocturno" 
                                required 
                            />
                        </div>
                    </div>

                    <div style={styles.formRow}>
                        <div>
                            <label style={styles.label}>Tipo de Aeronave / Sistema:</label>
                            <input 
                                type="text" 
                                style={styles.input} 
                                value={formData.aeronaveTipo} 
                                onChange={e => setFormData({...formData, aeronaveTipo: e.target.value.toUpperCase()})} 
                                placeholder="Ej: BELL-206, UH-1H, GENERAL" 
                            />
                        </div>
                        <div>
                            <label style={styles.label}>Descripción / Alcance:</label>
                            <input 
                                type="text" 
                                style={styles.input} 
                                value={formData.descripcion} 
                                onChange={e => setFormData({...formData, descripcion: e.target.value})} 
                                placeholder="Notas u observaciones de la prueba..." 
                            />
                        </div>
                    </div>

                    <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#2c3e50' }}>
                        🎯 Maniobras / Estándares a Evaluar
                    </h4>

                    {formData.estandares.map((est, idx) => (
                        <div key={idx} style={styles.estandarRow}>
                            <span style={styles.estandarNumber}>{idx + 1}.</span>
                            <input 
                                type="text" 
                                placeholder="Nombre de Maniobra / Ítem (Ej: Autorrotación, Mantener Altitud)" 
                                style={{ ...styles.input, flex: 2 }} 
                                value={est.nombre}
                                onChange={e => handleEstandarChange(idx, 'nombre', e.target.value)}
                                required
                            />
                            <input 
                                type="text" 
                                placeholder="Detalle / Tolerancia (Opcional)" 
                                style={{ ...styles.input, flex: 2 }} 
                                value={est.descripcion || ''}
                                onChange={e => handleEstandarChange(idx, 'descripcion', e.target.value)}
                            />
                            <button 
                                type="button" 
                                style={styles.btnDelete} 
                                onClick={() => handleRemoveEstandar(idx)}
                                title="Eliminar Maniobra"
                            >
                                ❌
                            </button>
                        </div>
                    ))}

                    <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                        <button type="button" style={styles.btnAdd} onClick={handleAddEstandar}>
                            ➕ Agregar Maniobra
                        </button>
                    </div>

                    <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #cbd5e1' }} />

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" style={styles.btnSave}>
                            💾 GUARDAR PATRÓN
                        </button>
                        {patronSeleccionado && (
                            <button type="button" style={styles.btnCancel} onClick={handleNuevoPatron}>
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f4f6f9', minHeight: 'calc(100vh - 65px)' },
    header: { backgroundColor: '#1b2a4a', padding: '12px 20px', borderRadius: '4px', marginBottom: '15px' },
    title: { color: '#fff', fontSize: '1rem', margin: 0 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' },
    card: { background: '#fff', padding: '20px', borderRadius: '6px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    groupContainer: { display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '70vh', overflowY: 'auto' },
    groupCard: { border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' },
    groupHeader: { backgroundColor: '#e2e8f0', padding: '8px 12px', fontSize: '0.8rem', color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    groupBadge: { fontSize: '0.7rem', backgroundColor: '#cbd5e1', padding: '2px 6px', borderRadius: '4px' },
    list: { listStyle: 'none', padding: 0, margin: 0 },
    listItem: { padding: '10px 12px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s', borderLeft: '4px solid transparent' },
    badge: { fontSize: '0.7rem', background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: '#334155' },
    input: { width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.8rem' },
    estandarRow: { display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' },
    estandarNumber: { fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', width: '20px' },
    btnCreate: { width: '100%', padding: '10px', backgroundColor: '#1b2a4a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' },
    btnAdd: { backgroundColor: '#34495e', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' },
    btnSave: { backgroundColor: '#27ae60', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', flex: 1 },
    btnCancel: { backgroundColor: '#7f8c8d', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' },
    btnDelete: { backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }
};

export default GestorPatrones;