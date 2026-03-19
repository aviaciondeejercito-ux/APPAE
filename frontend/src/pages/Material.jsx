import React, { useEffect, useState } from 'react';
import { getAircrafts, updateAircraftStatus, createAircraft, deleteAircraft } from '../services/api';

const Material = () => {
    const [aircrafts, setAircrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null); 
    
    const role = localStorage.getItem('role');
    const userElemento = localStorage.getItem('elemento');

    const sdaList = [
        "UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", 
        "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3"
    ];

    const [newAir, setNewAir] = useState({
        matricula: '',
        sda: '',
        horasRemanentes: 0
    });

    useEffect(() => {
        fetchMaterial();
    }, [role, userElemento]);

    const fetchMaterial = async () => {
        try {
            const { data } = await getAircrafts();
            const filtrados = (role === 'admin' || role === 'boss') 
                ? data 
                : data.filter(a => String(a.unidad).trim() === String(userElemento).trim());
            
            setAircrafts(filtrados);
            setLoading(false);
        } catch (error) {
            console.error("Error AE: Fallo de sincronización de material");
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newAir.matricula || !newAir.sda) return alert("Complete los campos obligatorios");

        try {
            await createAircraft({
                ...newAir,
                matricula: newAir.matricula.toUpperCase().trim(),
                horasRemanentes: Number(newAir.horasRemanentes),
                unidad: userElemento,
                estado: 'E/S'
            });
            setNewAir({ matricula: '', sda: '', horasRemanentes: 0 });
            fetchMaterial();
            alert("Aeronave dada de alta correctamente.");
        } catch (error) {
            const msg = error.response?.data?.message || "Error al dar de alta el material.";
            alert(msg);
        }
    };

    const handleUpdateField = async (id, updatedFields) => {
        try {
            const cleanFields = { ...updatedFields };
            if (cleanFields.horasRemanentes !== undefined) {
                cleanFields.horasRemanentes = Number(cleanFields.horasRemanentes);
            }
            if (cleanFields.matricula) cleanFields.matricula = cleanFields.matricula.toUpperCase().trim();

            await updateAircraftStatus(id, cleanFields);
            
            setAircrafts(prev => prev.map(a => a._id === id ? { ...a, ...cleanFields } : a));
            if (editingId) setEditingId(null);
        } catch (error) {
            alert("Error al actualizar datos.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Está seguro de eliminar esta aeronave del registro oficial?")) return;
        try {
            await deleteAircraft(id);
            setAircrafts(prev => prev.filter(a => a._id !== id));
            alert("Registro eliminado.");
        } catch (error) {
            alert("No se pudo eliminar el registro.");
        }
    };

    if (loading) return <div style={styles.loader}>Cargando inventario de unidad...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.grid}>
                
                {/* FORMULARIO DE ALTA */}
                <div style={styles.card}>
                    <h3 style={styles.title}>➕ Alta de Material Aéreo</h3>
                    <p style={styles.infoText}>Registrar nueva aeronave para: <strong>{userElemento}</strong></p>
                    <form onSubmit={handleCreate} style={styles.form}>
                        <div style={styles.field}>
                            <label style={styles.label}>Matrícula (AE-XXX)</label>
                            <input 
                                type="text" 
                                placeholder="Ej: AE-432" 
                                value={newAir.matricula} 
                                onChange={e => setNewAir({...newAir, matricula: e.target.value})} 
                                style={styles.input} 
                                required
                            />
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Sistema de Armas</label>
                            <select 
                                value={newAir.sda} 
                                onChange={e => setNewAir({...newAir, sda: e.target.value})} 
                                style={styles.input} 
                                required
                            >
                                <option value="">Seleccione SdA...</option>
                                {sdaList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Horas Remanentes Iniciales</label>
                            <input 
                                type="number" 
                                value={newAir.horasRemanentes} 
                                onChange={e => setNewAir({...newAir, horasRemanentes: e.target.value})} 
                                style={styles.input}
                            />
                        </div>
                        <button type="submit" style={styles.btnPrimary}>Dar de Alta en Unidad</button>
                    </form>
                </div>

                {/* LOG DE GESTIÓN Y MODIFICACIÓN */}
                <div style={styles.card}>
                    <h3 style={styles.title}>🛠️ Gestión de Estado y Mantenimiento</h3>
                    <div style={styles.scrollList}>
                        {aircrafts.length === 0 ? (
                            <p style={styles.empty}>No hay material cargado en esta unidad.</p>
                        ) : (
                            aircrafts.map(air => (
                                <div key={air._id} style={{
                                    ...styles.item,
                                    borderLeft: air.estado === 'E/S' ? '6px solid #28a745' : '6px solid #e74c3c'
                                }}>
                                    <div style={{flex: 1.5}}>
                                        {editingId === air._id ? (
                                            <div style={styles.editForm}>
                                                <input 
                                                    style={styles.inputSmallEdit}
                                                    defaultValue={air.matricula}
                                                    onBlur={(e) => handleUpdateField(air._id, { matricula: e.target.value })}
                                                    placeholder="Matrícula"
                                                    autoFocus
                                                />
                                                <select 
                                                    style={styles.selectSmall}
                                                    defaultValue={air.sda}
                                                    onChange={(e) => handleUpdateField(air._id, { sda: e.target.value })}
                                                >
                                                    {sdaList.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                                <button onClick={() => setEditingId(null)} style={styles.btnOk}>Confirmar</button>
                                            </div>
                                        ) : (
                                            <div onClick={() => setEditingId(air._id)} style={{cursor: 'pointer'}}>
                                                <div style={styles.itemMain}>{air.matricula} <span style={{fontSize: '0.7rem'}}>✏️</span></div>
                                                <div style={styles.itemSub}>{air.sda}</div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={styles.actions}>
                                        <div style={styles.controlGroup}>
                                            <label style={styles.tinyLabel}>ESTADO</label>
                                            <select 
                                                value={air.estado} 
                                                onChange={(e) => handleUpdateField(air._id, { estado: e.target.value })}
                                                style={{...styles.selectSmall, color: air.estado === 'E/S' ? '#28a745' : '#e74c3c'}}
                                            >
                                                <option value="E/S">E/S</option>
                                                <option value="F/S">F/S</option>
                                            </select>
                                        </div>

                                        <div style={styles.controlGroup}>
                                            <label style={styles.tinyLabel}>HS REM</label>
                                            <input 
                                                type="number" 
                                                value={air.horasRemanentes} 
                                                onChange={(e) => handleUpdateField(air._id, { horasRemanentes: e.target.value })}
                                                style={styles.inputSmall}
                                            />
                                        </div>

                                        {(role === 'admin') && (
                                            <button 
                                                onClick={() => handleDelete(air._id)} 
                                                style={styles.btnDelete}
                                                title="Eliminar registro"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '25px', maxWidth: '1200px', margin: '0 auto' },
    grid: { display: 'grid', gridTemplateColumns: window.innerWidth < 800 ? '1fr' : '1fr 1.5fr', gap: '25px' },
    card: { background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f0f2f5' },
    title: { marginTop: 0, marginBottom: '20px', fontSize: '1.2rem', color: '#1b3a57', borderBottom: '2px solid #f8f9fa', paddingBottom: '10px' },
    infoText: { fontSize: '0.85rem', color: '#666', marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    field: { display: 'flex', flexDirection: 'column', gap: '5px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', color: '#555' },
    tinyLabel: { fontSize: '0.65rem', fontWeight: 'bold', color: '#999', textAlign: 'center' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' },
    btnPrimary: { background: '#1b3a57', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
    scrollList: { maxHeight: '600px', overflowY: 'auto' },
    item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#fcfcfc', borderRadius: '8px', marginBottom: '10px', border: '1px solid #eee' },
    itemMain: { fontWeight: 'bold', fontSize: '1rem', color: '#1b3a57' },
    itemSub: { fontSize: '0.8rem', color: '#777' },
    actions: { display: 'flex', gap: '12px', alignItems: 'center' },
    controlGroup: { display: 'flex', flexDirection: 'column', gap: '3px' },
    selectSmall: { padding: '5px', borderRadius: '5px', border: '1px solid #ccc', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' },
    inputSmall: { width: '65px', padding: '5px', borderRadius: '5px', border: '1px solid #ccc', textAlign: 'center', fontSize: '0.85rem' },
    inputSmallEdit: { padding: '5px', borderRadius: '5px', border: '1px solid #1b3a57', fontSize: '0.85rem', width: '120px', marginBottom: '5px' },
    editForm: { display: 'flex', flexDirection: 'column', gap: '5px' },
    btnOk: { background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', padding: '5px', cursor: 'pointer' },
    btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '5px' },
    empty: { textAlign: 'center', padding: '40px', color: '#999', fontSize: '0.9rem' },
    loader: { textAlign: 'center', marginTop: '100px', fontWeight: 'bold', color: '#1b3a57' }
};

export default Material;