import React, { useEffect, useState } from 'react';
import { getEvents, createEvent, deleteEvent, updateEvent } from '../services/api';

const Operaciones = () => {
    const [events, setEvents] = useState([]);
    const [role] = useState(localStorage.getItem('role'));
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [isMobile] = useState(window.innerWidth < 768);

    const sdaList = [
        "UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", 
        "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3"
    ];

    const [formData, setFormData] = useState({
        title: '', start: '', end: '', color: '#1b3a57', notes: '',
        tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: []
    });

    useEffect(() => { 
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data } = await getEvents();
            setEvents(data);
        } catch (error) { 
            console.error("Error AE: Fallo de sincronización de eventos"); 
        }
    };

    const handleTipoApoyoChange = (e) => {
        const tipo = e.target.value;
        let autoColor = '#1b3a57';
        if (tipo === "Sostenimiento") autoColor = "#0056b3";
        if (tipo === "Fuerza Operativa") autoColor = "#28a745";
        if (tipo === "Educacion") autoColor = "#800000";
        setFormData({ ...formData, tipoApoyo: tipo, color: autoColor });
    };

    const addSda = () => {
        if (!formData.sdaSelected) return;
        const nuevoSda = `${formData.sdaCantidad}x ${formData.sdaSelected}`;
        setFormData({
            ...formData,
            sdaListado: [...formData.sdaListado, nuevoSda],
            sdaSelected: '',
            sdaCantidad: 1
        });
    };

    const removeSda = (index) => {
        const newList = [...formData.sdaListado];
        newList.splice(index, 1);
        setFormData({ ...formData, sdaListado: newList });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const finalData = {
            ...formData,
            notes: `SdA: ${formData.sdaListado.join(', ')} | Obs: ${formData.notes}`
        };

        try {
            if (isEditing) {
                await updateEvent(selectedId, finalData);
            } else {
                await createEvent(finalData);
            }
            resetForm();
            fetchData();
            alert("Operación registrada con éxito.");
        } catch (error) { 
            alert("Error en el registro."); 
        }
    };

    const resetForm = () => {
        setFormData({ title: '', start: '', end: '', color: '#1b3a57', notes: '', tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: [] });
        setIsEditing(false);
        setSelectedId(null);
    };

    const handleEdit = (ev) => {
        setIsEditing(true);
        setSelectedId(ev._id);
        const sdaPart = ev.notes?.split(' | Obs: ')[0]?.replace('SdA: ', '') || '';
        const obsPart = ev.notes?.split(' | Obs: ')[1] || ev.notes || '';

        setFormData({
            title: ev.title,
            start: new Date(ev.start).toISOString().slice(0, 16),
            end: new Date(ev.end).toISOString().slice(0, 16),
            color: ev.color,
            notes: obsPart,
            sdaListado: sdaPart ? sdaPart.split(', ') : [],
            tipoApoyo: ev.tipoApoyo || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Confirmar ELIMINACIÓN?")) {
            await deleteEvent(id);
            fetchData();
        }
    };

    return (
        <div style={styles.container}>
            <div style={{...styles.grid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr'}}>
                
                {/* 1. FORMULARIO DE CARGA DE VUELO */}
                <div style={styles.card}>
                    <h3 style={styles.title}>{isEditing ? "📝 Editar Misión" : "➕ Nueva Carga de Vuelo"}</h3>
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <input 
                            type="text" 
                            required 
                            placeholder="Nombre de la Misión / Orden de Vuelo" 
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})} 
                            style={styles.input}
                        />
                        
                        <div style={styles.row}>
                            <div style={{flex: 1}}>
                                <label style={styles.label}>Inicio</label>
                                <input type="datetime-local" required value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} style={styles.input}/>
                            </div>
                            <div style={{flex: 1}}>
                                <label style={styles.label}>Fin</label>
                                <input type="datetime-local" required value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} style={styles.input}/>
                            </div>
                        </div>

                        <select value={formData.tipoApoyo} onChange={handleTipoApoyoChange} style={styles.input} required>
                            <option value="">Seleccione Tipo de Apoyo...</option>
                            <option value="Sostenimiento">Sostenimiento (Azul)</option>
                            <option value="Fuerza Operativa">Fuerza Operativa (Verde)</option>
                            <option value="Educacion">Educación (Bordo)</option>
                        </select>

                        <div style={styles.sdaBox}>
                            <select value={formData.sdaSelected} onChange={e => setFormData({...formData, sdaSelected: e.target.value})} style={{...styles.input, flex: 1}}>
                                <option value="">Seleccione SdA...</option>
                                {sdaList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input type="number" min="1" value={formData.sdaCantidad} onChange={e => setFormData({...formData, sdaCantidad: e.target.value})} style={{...styles.input, width: '60px'}}/>
                            <button type="button" onClick={addSda} style={styles.btnAdd}>+</button>
                        </div>

                        <div style={styles.tagWrap}>
                            {formData.sdaListado.map((s, i) => (
                                <span key={i} style={styles.tag}>{s} <button type="button" onClick={() => removeSda(i)} style={styles.btnTagX}>×</button></span>
                            ))}
                        </div>

                        <textarea placeholder="Observaciones y detalles de la misión..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={styles.textarea}></textarea>
                        
                        <div style={styles.row}>
                            <button type="submit" style={{...styles.btnSave, backgroundColor: isEditing ? '#f39c12' : '#1b3a57'}}>
                                {isEditing ? "Guardar Cambios" : "Cargar al Monitor"}
                            </button>
                            {isEditing && <button type="button" onClick={resetForm} style={styles.btnCancel}>Cancelar</button>}
                        </div>
                    </form>
                </div>

                {/* 2. REGISTRO OPERATIVO */}
                <div style={styles.card}>
                    <h3 style={styles.title}>📜 Registro de Misiones Recientes</h3>
                    <div style={styles.scrollList}>
                        {events.length === 0 ? (
                            <p style={{textAlign: 'center', opacity: 0.5, padding: '20px'}}>No hay eventos registrados</p>
                        ) : (
                            events.slice(0).reverse().map(ev => (
                                <div key={ev._id} style={styles.logItem}>
                                    <div style={{flex: 1}}>
                                        <div style={{fontWeight: 'bold', color: '#1b3a57', fontSize: '0.95rem'}}>{ev.title}</div>
                                        <div style={{fontSize: '0.75rem', color: '#666', marginTop: '3px'}}>
                                            {new Date(ev.start).toLocaleDateString()} | {ev.userName || 'Sistema AE'}
                                        </div>
                                        <div style={{fontSize: '0.7rem', color: ev.color, fontWeight: 'bold'}}>{ev.tipoApoyo}</div>
                                    </div>
                                    <div style={styles.logActions}>
                                        <button onClick={() => handleEdit(ev)} style={styles.btnIconEdit}>✏️</button>
                                        <button onClick={() => handleDelete(ev._id)} style={styles.btnIconDel}>🗑️</button>
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
    container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
    grid: { display: 'grid', gap: '25px', alignItems: 'start' },
    card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #f0f2f5' },
    title: { marginTop: 0, borderBottom: '2px solid #f0f2f5', paddingBottom: '12px', fontSize: '1.2rem', color: '#1b3a57', marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '18px' },
    row: { display: 'flex', gap: '12px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px', display: 'block', color: '#555' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.95rem', outline: 'none', transition: '0.2s' },
    textarea: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '100px', fontSize: '0.95rem', resize: 'none', outline: 'none' },
    sdaBox: { display: 'flex', gap: '10px' },
    btnAdd: { background: '#1b3a57', color: 'white', border: 'none', borderRadius: '8px', width: '50px', cursor: 'pointer', fontSize: '1.3rem', transition: '0.2s' },
    tagWrap: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
    tag: { background: '#e1e8ed', padding: '6px 12px', borderRadius: '18px', fontSize: '0.8rem', fontWeight: 'bold', color: '#1b3a57', display: 'flex', alignItems: 'center', gap: '5px' },
    btnTagX: { background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' },
    btnSave: { flex: 2, color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' },
    btnCancel: { flex: 1, background: '#bdc3c7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    scrollList: { maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' },
    logItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #f0f0f0', transition: '0.2s' },
    logActions: { display: 'flex', gap: '8px' },
    btnIconEdit: { background: '#f1c40f', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' },
    btnIconDel: { background: '#fadbd8', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' }
};

export default Operaciones;