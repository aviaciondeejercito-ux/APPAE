import React, { useState, useEffect } from 'react';
import axios from 'axios'; // o tu instancia de api.js

const GestorPatrones = () => {
    const [patrones, setPatrones] = useState([]);
    const [patronSeleccionado, setPatronSeleccionado] = useState(null);
    const [formData, setFormData] = useState({
        codigo: '',
        nombre: '',
        descripcion: '',
        aeronaveTipo: 'GENERAL',
        estandares: [],
        activo: true
    });

    const cargarPatrones = async () => {
        try {
            const res = await axios.get('/api/escuela/patrones-vuelo');
            setPatrones(res.data.data || []);
        } catch (err) {
            console.error("Error al cargar patrones:", err);
        }
    };

    useEffect(() => { cargarPatrones(); }, []);

    const handleNuevoPatron = () => {
        setPatronSeleccionado(null);
        setFormData({
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
        setFormData(patron);
    };

    const handleAddEstandar = () => {
        setFormData({
            ...formData,
            estandares: [
                ...formData.estandares, 
                { nombre: '', descripcion: '', orden: formData.estandares.length + 1 }
            ]
        });
    };

    const handleEstandarChange = (index, field, value) => {
        const nuevos = [...formData.estandares];
        nuevos[index][field] = value;
        setFormData({ ...formData, estandares: nuevos });
    };

    const handleRemoveEstandar = (index) => {
        const nuevos = formData.estandares.filter((_, i) => i !== index);
        setFormData({ ...formData, estandares: nuevos });
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/escuela/patrones-vuelo', formData);
            alert("✅ Patrón de Vuelo guardado exitosamente");
            cargarPatrones();
            handleNuevoPatron();
        } catch (err) {
            alert("❌ Error al guardar patrón");
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>⚙️ GESTOR DE PATRONES Y ESTÁNDARES DE VUELO</h2>
            </div>

            <div style={styles.grid}>
                {/* LISTA DE PATRONES EXISTENTES */}
                <div style={styles.card}>
                    <button style={styles.btnCreate} onClick={handleNuevoPatron}>➕ Nuevo Patrón</button>
                    <hr />
                    <ul style={styles.list}>
                        {patrones.map(p => (
                            <li 
                                key={p._id} 
                                style={{
                                    ...styles.listItem,
                                    backgroundColor: patronSeleccionado === p._id ? '#e8f4f8' : '#fff'
                                }}
                                onClick={() => handleEditarPatron(p)}
                            >
                                <strong>[{p.codigo}]</strong> {p.nombre}
                                <span style={styles.badge}>{p.estandares.length} maniobras</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* FORMULARIO DE EDICIÓN DE PATRÓN */}
                <form onSubmit={handleGuardar} style={styles.card}>
                    <h3>{patronSeleccionado ? 'Editar Patrón' : 'Nuevo Patrón de Vuelo'}</h3>
                    <div style={styles.formRow}>
                        <div>
                            <label style={styles.label}>Código:</label>
                            <input 
                                type="text" 
                                style={styles.input} 
                                value={formData.codigo} 
                                onChange={e => setFormData({...formData, codigo: e.target.value})} 
                                placeholder="Ej: PV-TAC-01" 
                                required 
                            />
                        </div>
                        <div>
                            <label style={styles.label}>Nombre del Patrón / Misión:</label>
                            <input 
                                type="text" 
                                style={styles.input} 
                                value={formData.nombre} 
                                onChange={e => setFormData({...formData, nombre: e.target.value})} 
                                placeholder="Ej: Navegación Táctica Nocturna" 
                                required 
                            />
                        </div>
                    </div>

                    <h4 style={{ marginTop: '20px' }}>🎯 Maniobras / Estándares a Evaluar</h4>
                    {formData.estandares.map((est, idx) => (
                        <div key={idx} style={styles.estandarRow}>
                            <input 
                                type="text" 
                                placeholder="Nombre de Maniobra (Ej: Autorrotación)" 
                                style={{ ...styles.input, flex: 2 }} 
                                value={est.nombre}
                                onChange={e => handleEstandarChange(idx, 'nombre', e.target.value)}
                                required
                            />
                            <button type="button" style={styles.btnDelete} onClick={() => handleRemoveEstandar(idx)}>❌</button>
                        </div>
                    ))}

                    <button type="button" style={styles.btnAdd} onClick={handleAddEstandar}>➕ Agregar Maniobra</button>
                    <br /><br />
                    <button type="submit" style={styles.btnSave}>💾 GUARDAR PATRÓN</button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', fontFamily: 'monospace, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' },
    header: { backgroundColor: '#1b2a4a', padding: '12px 20px', borderRadius: '4px', marginBottom: '15px' },
    title: { color: '#fff', fontSize: '1rem', margin: 0 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' },
    card: { background: '#fff', padding: '20px', borderRadius: '4px', border: '1px solid #cbd5e1' },
    list: { listStyle: 'none', padding: 0, margin: 0 },
    listItem: { padding: '10px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    badge: { fontSize: '0.7rem', background: '#cbd5e1', padding: '2px 6px', borderRadius: '4px' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', display: 'block' },
    input: { width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' },
    estandarRow: { display: 'flex', gap: '10px', marginBottom: '8px' },
    btnCreate: { width: '100%', padding: '10px', backgroundColor: '#1b2a4a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    btnAdd: { backgroundColor: '#34495e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' },
    btnSave: { backgroundColor: '#27ae60', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', width: '100%' },
    btnDelete: { backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }
};

export default GestorPatrones;