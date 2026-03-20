import React, { useEffect, useState } from 'react';
import { getEvents, createEvent, deleteEvent, updateEvent } from '../services/api';

const Operaciones = () => {
    const [events, setEvents] = useState([]);
    // Normalizamos el rol a minúsculas para evitar errores de comparación
    const [role] = useState(localStorage.getItem('role')?.toLowerCase());
    const [userUnidad] = useState(localStorage.getItem('elemento'));
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [isMobile] = useState(window.innerWidth < 768);

    // Estado para el botón de Global (Solo para BOSS/ADMIN)
    const [publicarGlobal, setPublicarGlobal] = useState(false);

    const sdaList = [
        "UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", 
        "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3"
    ];

    // Listado de Unidades actualizado según imagen proporcionada
    const unidadesAE = [
        "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8", 
        "SEC AE 11", "ESC AV EXPL ATQ 602", "EC AE", "SEC AE DR", 
        "SEC AE MTE 12", "B AB MANT AERON 601", "SEC AE MTE 3", "SEC AE 9"
    ];

    const [formData, setFormData] = useState({
        title: '', start: '', end: '', color: '#1b3a57', notes: '',
        tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: [],
        etapa: 'recepcion', 
        unidadesInvolucradas: []
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const { data } = await getEvents();
            // Seguridad: El S4/User solo ve lo de su unidad. El Admin/Boss ve todo.
            const filteredData = (role === 'admin' || role === 'boss') 
                ? data 
                : data.filter(ev => ev.elemento?.includes(userUnidad) || ev.esGlobal);
            setEvents(filteredData);
        } catch (error) { 
            console.error("Error AE: Fallo de sincronización"); 
        }
    };

    const handleEtapaChange = (nuevaEtapa) => {
        let colorEtapa = '#95a5a6';
        if (nuevaEtapa === 'recepcion') colorEtapa = '#f39c12';
        if (nuevaEtapa === 'revision') colorEtapa = '#3498db';
        if (nuevaEtapa === 'ordenada') colorEtapa = '#27ae60';
        setFormData({ ...formData, etapa: nuevaEtapa, color: colorEtapa });
    };

    const toggleUnidad = (unidad) => {
        const current = formData.unidadesInvolucradas;
        const updated = current.includes(unidad) 
            ? current.filter(u => u !== unidad) 
            : [...current, unidad];
        setFormData({ ...formData, unidadesInvolucradas: updated });
    };

    const addSda = () => {
        if (!formData.sdaSelected) return;
        const nuevoSda = `${formData.sdaCantidad}x ${formData.sdaSelected}`;
        setFormData({ ...formData, sdaListado: [...formData.sdaListado, nuevoSda], sdaSelected: '', sdaCantidad: 1 });
    };

    const removeSda = (index) => {
        const newList = [...formData.sdaListado];
        newList.splice(index, 1);
        setFormData({ ...formData, sdaListado: newList });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const esAutorizado = role === 'admin' || role === 'boss';
        
        const finalData = {
            ...formData,
            // Solo es global si es Jefe y apretó el botón. S4/User siempre false.
            esGlobal: esAutorizado ? publicarGlobal : false,
            tipoOrigen: esAutorizado && publicarGlobal ? 'COMANDO' : 'UNIDAD',
            notes: `SdA: ${formData.sdaListado.join(', ')} | Obs: ${formData.notes}`,
            // Si es Jefe y seleccionó unidades, se guardan esas. Si es S4, solo su unidad.
            elemento: esAutorizado && formData.unidadesInvolucradas.length > 0 
                      ? formData.unidadesInvolucradas.join(', ') 
                      : userUnidad
        };

        try {
            if (isEditing) {
                await updateEvent(selectedId, finalData);
            } else {
                await createEvent(finalData);
            }
            resetForm();
            fetchData();
            alert("Operación procesada correctamente en el sistema.");
        } catch (error) { 
            alert("Error en el registro."); 
        }
    };

    const resetForm = () => {
        setFormData({ 
            title: '', start: '', end: '', color: '#f39c12', notes: '', 
            tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: [],
            etapa: 'recepcion', unidadesInvolucradas: []
        });
        setPublicarGlobal(false);
        setIsEditing(false);
        setSelectedId(null);
    };

    const handleEdit = (ev) => {
        setIsEditing(true);
        setSelectedId(ev._id);
        setPublicarGlobal(ev.esGlobal || false);
        const sdaPart = ev.notes?.split(' | Obs: ')[0]?.replace('SdA: ', '') || '';
        const obsPart = ev.notes?.split(' | Obs: ')[1] || ev.notes || '';
        setFormData({
            title: ev.title,
            start: new Date(ev.start).toISOString().slice(0, 16),
            end: new Date(ev.end).toISOString().slice(0, 16),
            color: ev.color,
            notes: obsPart,
            sdaListado: sdaPart ? sdaPart.split(', ') : [],
            tipoApoyo: ev.tipoApoyo || '',
            etapa: ev.etapa || 'recepcion',
            unidadesInvolucradas: ev.elemento ? ev.elemento.split(', ') : []
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Confirmar ELIMINACIÓN de la orden?")) {
            await deleteEvent(id);
            fetchData();
        }
    };

    return (
        <div style={styles.container}>
            <div style={{...styles.grid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr'}}>
                
                <div style={styles.card}>
                    <h3 style={styles.title}>{isEditing ? "📝 Gestionar Orden" : "➕ Nueva Solicitud"}</h3>
                    
                    {/* BOTÓN GLOBAL: Solo visible para BOSS y ADMIN */}
                    {(role === 'admin' || role === 'boss') && (
                        <div style={styles.globalToggleContainer}>
                            <button 
                                type="button" 
                                onClick={() => setPublicarGlobal(!publicarGlobal)}
                                style={{
                                    ...styles.btnGlobal, 
                                    backgroundColor: publicarGlobal ? '#27ae60' : '#bdc3c7'
                                }}
                            >
                                {publicarGlobal ? "🌐 PUBLICACIÓN GLOBAL ACTIVADA" : "🏠 PUBLICACIÓN LOCAL (UNIDAD)"}
                            </button>
                        </div>
                    )}

                    {/* FLUJO DE TRABAJO: Solo para BOSS/ADMIN */}
                    {(role === 'admin' || role === 'boss') && (
                        <div style={styles.etapaWrapper}>
                            <label style={styles.labelEtapa}>ESTADO DE LA ORDEN:</label>
                            <div style={styles.etapaGrid}>
                                <button type="button" onClick={() => handleEtapaChange('recepcion')} 
                                        style={{...styles.btnStep, opacity: formData.etapa === 'recepcion' ? 1 : 0.4, border: '2px solid #f39c12'}}>🟡 Recibida</button>
                                <button type="button" onClick={() => handleEtapaChange('revision')} 
                                        style={{...styles.btnStep, opacity: formData.etapa === 'revision' ? 1 : 0.4, border: '2px solid #3498db'}}>🔵 Revisión</button>
                                <button type="button" onClick={() => handleEtapaChange('ordenada')} 
                                        style={{...styles.btnStep, opacity: formData.etapa === 'ordenada' ? 1 : 0.4, border: '2px solid #27ae60'}}>🟢 Ordenada</button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <input type="text" required placeholder="Título de la Misión" value={formData.title} 
                               onChange={e => setFormData({...formData, title: e.target.value})} style={styles.input} />
                        
                        <div style={styles.row}>
                            <div style={{flex: 1}}><label style={styles.label}>Inicio</label>
                            <input type="datetime-local" required value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} style={styles.input}/></div>
                            <div style={{flex: 1}}><label style={styles.label}>Fin</label>
                            <input type="datetime-local" required value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} style={styles.input}/></div>
                        </div>

                        {/* SELECTOR DE UNIDADES: Solo si es Boss/Admin y activó Global */}
                        {(role === 'admin' || role === 'boss') && publicarGlobal && (
                            <div style={styles.unidadSelector}>
                                <label style={styles.label}>Asignar a Unidades (DIR AE):</label>
                                <div style={styles.unidadChips}>
                                    {unidadesAE.map(u => (
                                        <button key={u} type="button" onClick={() => toggleUnidad(u)}
                                                style={{...styles.chip, backgroundColor: formData.unidadesInvolucradas.includes(u) ? '#1b3a57' : '#eee', color: formData.unidadesInvolucradas.includes(u) ? 'white' : '#555'}}>
                                            {u}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <select value={formData.tipoApoyo} onChange={e => setFormData({...formData, tipoApoyo: e.target.value})} style={styles.input} required>
                            <option value="">Tipo de Apoyo...</option>
                            <option value="Sostenimiento">Sostenimiento</option>
                            <option value="Fuerza Operativa">Fuerza Operativa</option>
                            <option value="Educacion">Educación</option>
                        </select>

                        <div style={styles.sdaBox}>
                            <select value={formData.sdaSelected} onChange={e => setFormData({...formData, sdaSelected: e.target.value})} style={{...styles.input, flex: 1}}>
                                <option value="">SdA...</option>
                                {sdaList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button type="button" onClick={addSda} style={styles.btnAdd}>+</button>
                        </div>

                        <div style={styles.tagWrap}>
                            {formData.sdaListado.map((s, i) => (
                                <span key={i} style={styles.tag}>{s} <button type="button" onClick={() => removeSda(i)} style={styles.btnTagX}>×</button></span>
                            ))}
                        </div>

                        <textarea placeholder="Observaciones..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={styles.textarea}></textarea>
                        
                        <button type="submit" style={{...styles.btnSave, backgroundColor: formData.color}}>
                            {isEditing ? "Actualizar Orden" : "Registrar en Sistema AE"}
                        </button>
                    </form>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.title}>📜 Órdenes {role === 'admin' || role === 'boss' ? 'Generales' : `de ${userUnidad}`}</h3>
                    <div style={styles.scrollList}>
                        {events.map(ev => (
                            <div key={ev._id} style={{...styles.logItem, borderLeft: `5px solid ${ev.color}`}}>
                                <div style={{flex: 1}}>
                                    <div style={{fontWeight: 'bold', color: '#1b3a57'}}>
                                        {ev.esGlobal && "🌐 "}{ev.title}
                                    </div>
                                    <div style={{fontSize: '0.75rem', color: '#666'}}>
                                        {ev.elemento} | {new Date(ev.start).toLocaleDateString()}
                                    </div>
                                    <span style={{...styles.miniBadge, backgroundColor: ev.color}}>
                                        {ev.etapa?.toUpperCase() || 'LOCAL'}
                                    </span>
                                </div>
                                <div style={styles.logActions}>
                                    <button onClick={() => handleEdit(ev)} style={styles.btnIconEdit}>✏️</button>
                                    <button onClick={() => handleDelete(ev._id)} style={styles.btnIconDel}>🗑️</button>
                                </div>
                            </div>
                        ))}
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
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    globalToggleContainer: { marginBottom: '15px' },
    btnGlobal: { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
    etapaWrapper: { marginBottom: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '8px' },
    labelEtapa: { fontSize: '0.7rem', fontWeight: 'bold', color: '#777', marginBottom: '8px', display: 'block' },
    etapaGrid: { display: 'flex', gap: '8px' },
    btnStep: { flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', background: 'white', transition: '0.3s' },
    unidadSelector: { margin: '10px 0' },
    unidadChips: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' },
    chip: { border: 'none', padding: '5px 10px', borderRadius: '15px', fontSize: '0.7rem', cursor: 'pointer', transition: '0.2s' },
    row: { display: 'flex', gap: '12px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', color: '#555' },
    input: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none' },
    textarea: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px', fontSize: '0.9rem', resize: 'none' },
    sdaBox: { display: 'flex', gap: '10px' },
    btnAdd: { background: '#1b3a57', color: 'white', border: 'none', borderRadius: '8px', width: '40px', cursor: 'pointer' },
    tagWrap: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
    tag: { background: '#e1e8ed', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', color: '#1b3a57', display: 'flex', alignItems: 'center' },
    btnTagX: { background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer' },
    btnSave: { color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginTop: '10px' },
    scrollList: { maxHeight: '600px', overflowY: 'auto' },
    logItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #f0f0f0' },
    miniBadge: { color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 'bold', marginTop: '5px', display: 'inline-block' },
    logActions: { display: 'flex', gap: '5px' },
    btnIconEdit: { background: '#f1c40f', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' },
    btnIconDel: { background: '#fadbd8', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }
};

export default Operaciones;