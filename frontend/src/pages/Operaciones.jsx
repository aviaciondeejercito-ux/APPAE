import React, { useEffect, useState } from 'react';
import { getEvents, createEvent, deleteEvent, updateEvent, getAircrafts, updateAircraftStatus, createAircraft } from '../services/api';

const Operaciones = () => {
    const [events, setEvents] = useState([]);
    const [aircrafts, setAircrafts] = useState([]); 
    const [role] = useState(localStorage.getItem('role'));
    const [userElemento] = useState(localStorage.getItem('elemento')); 
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
        // El S4, Admin y Boss siempre deben disparar la carga de material
        if (role === 'S4_UNIDAD' || role === 'admin' || role === 'boss') {
            fetchMaterial();
        }
    }, [role, userElemento]); // Se añade dependencia para asegurar carga post-login

    const fetchData = async () => {
        try {
            const { data } = await getEvents();
            setEvents(data);
        } catch (error) { console.error("Error AE: Fallo de sincronización de eventos"); }
    };

    const fetchMaterial = async () => {
        try {
            const { data } = await getAircrafts();
            // Filtro robusto: Si no es admin/boss, solo ve lo de su unidad asignada
            const filtrados = (role === 'admin' || role === 'boss') 
                ? data 
                : data.filter(a => String(a.unidad).trim() === String(userElemento).trim());
            
            setAircrafts(filtrados);
        } catch (error) { 
            console.error("Error AE: Fallo de sincronización de material"); 
        }
    };

    const handleAddAircraft = async () => {
        const matricula = prompt("Ingrese Matrícula (Ej: AE-432):");
        if (!matricula) return;
        const sda = prompt(`Ingrese SdA para ${matricula} (Ej: UH-1H):`);
        if (!sda) return;

        try {
            await createAircraft({
                matricula: matricula.toUpperCase(),
                sda: sda.toUpperCase(),
                unidad: userElemento, // El S4 siempre da de alta para su propia unidad
                estado: 'E/S',
                horasRemanentes: 0
            });
            fetchMaterial();
            alert("Aeronave dada de alta exitosamente.");
        } catch (error) {
            alert("Error al dar de alta. Verifique permisos de escritura.");
        }
    };

    const handleUpdateAircraft = async (id, updatedFields) => {
        try {
            await updateAircraftStatus(id, updatedFields);
            // Actualización optimista en el estado local para rapidez visual
            setAircrafts(prev => prev.map(a => a._id === id ? { ...a, ...updatedFields } : a));
            fetchMaterial(); 
        } catch (error) {
            alert("Error al actualizar material. Verifique su jurisdicción.");
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
        } catch (error) { alert("Error en el registro."); }
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
            <div style={{...styles.grid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'}}>
                
                {/* 1. FORMULARIO DE CARGA DE VUELO */}
                <div style={styles.card}>
                    <h3 style={styles.title}>{isEditing ? "📝 Editar Misión" : "➕ Nueva Carga de Vuelo"}</h3>
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <input type="text" required placeholder="Nombre de la Misión" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={styles.input}/>
                        
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

                        <textarea placeholder="Observaciones y detalles..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={styles.textarea}></textarea>
                        
                        <div style={styles.row}>
                            <button type="submit" style={{...styles.btnSave, backgroundColor: isEditing ? '#f39c12' : '#1b3a57'}}>
                                {isEditing ? "Guardar Cambios" : "Cargar al Monitor"}
                            </button>
                            {isEditing && <button type="button" onClick={resetForm} style={styles.btnCancel}>Cancelar</button>}
                        </div>
                    </form>
                </div>

                {/* 2. PANEL S4: GESTIÓN DE MATERIAL - REFORZADO */}
                {(role === 'S4_UNIDAD' || role === 'admin' || role === 'boss') && (
                    <div style={styles.card}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f0f2f5', paddingBottom: '10px', marginBottom: '15px'}}>
                            <h3 style={{...styles.title, borderBottom: 'none', margin: 0}}>🛠️ Gestión de Material - {userElemento}</h3>
                            <button onClick={handleAddAircraft} style={styles.btnAddMaterial}>+ Alta Material</button>
                        </div>
                        <div style={styles.scrollList}>
                            {aircrafts.length === 0 ? (
                                <div style={{textAlign: 'center', padding: '40px 20px'}}>
                                    <p style={{opacity: 0.6, fontSize: '0.9rem'}}>No hay aeronaves cargadas para <strong>{userElemento}</strong>.</p>
                                    <p style={{fontSize: '0.75rem', color: '#888'}}>Use el botón "+ Alta Material" para iniciar el inventario.</p>
                                </div>
                            ) : (
                                aircrafts.map(air => (
                                    <div key={air._id} style={{...styles.logItem, borderLeft: air.estado === 'E/S' ? '5px solid #28a745' : '5px solid #e74c3c', backgroundColor: '#fdfdfd', marginBottom: '8px', borderRadius: '4px'}}>
                                        <div style={{flex: 1}}>
                                            <div style={{fontWeight: 'bold', fontSize: '1rem'}}>{air.matricula}</div>
                                            <div style={{fontSize: '0.8rem', color: '#555'}}>{air.sda}</div>
                                            <div style={{fontSize: '0.75rem', marginTop: '4px'}}>Hs Rem: <strong style={{color: air.horasRemanentes < 10 ? '#e74c3c' : '#2ecc71'}}>{air.horasRemanentes}</strong></div>
                                        </div>
                                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                            <select 
                                                value={air.estado} 
                                                onChange={(e) => handleUpdateAircraft(air._id, { estado: e.target.value })}
                                                style={{...styles.input, padding: '5px', fontSize: '0.85rem', height: '35px', fontWeight: 'bold', border: '1px solid #ccc'}}
                                            >
                                                <option value="E/S">E/S</option>
                                                <option value="F/S">F/S</option>
                                            </select>
                                            <button 
                                                title="Actualizar Horas"
                                                onClick={() => {
                                                    const nuevaHs = prompt(`Actualizar Horas Remanentes para ${air.matricula}:`, air.horasRemanentes);
                                                    if(nuevaHs !== null && !isNaN(nuevaHs)) {
                                                        handleUpdateAircraft(air._id, { horasRemanentes: Number(nuevaHs) });
                                                    }
                                                }}
                                                style={styles.btnIconHs}
                                            >⏱️</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <p style={{fontSize: '0.7rem', marginTop: '15px', color: '#7f8c8d', fontStyle: 'italic'}}>
                            * Los cambios realizados impactan en tiempo real en el Monitor General.
                        </p>
                    </div>
                )}

                {/* 3. REGISTRO OPERATIVO */}
                <div style={{...styles.card, gridColumn: isMobile ? 'auto' : 'span 2'}}>
                    <h3 style={styles.title}>📜 Registro de Misiones Recientes</h3>
                    <div style={{...styles.scrollList, maxHeight: '300px'}}>
                        {events.length === 0 ? <p style={{textAlign: 'center', opacity: 0.5}}>No hay eventos registrados</p> : 
                        events.slice(0).reverse().map(ev => (
                            <div key={ev._id} style={styles.logItem}>
                                <div>
                                    <div style={{fontWeight: 'bold', color: '#1b3a57'}}>{ev.title}</div>
                                    <div style={{fontSize: '0.75rem', color: '#666'}}>
                                        {new Date(ev.start).toLocaleDateString()} | {ev.userName || 'Sistema AE'}
                                    </div>
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
    grid: { display: 'grid', gap: '20px' },
    card: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', height: 'fit-content' },
    title: { marginTop: 0, borderBottom: '2px solid #f0f2f5', paddingBottom: '10px', fontSize: '1.1rem', color: '#1b3a57' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    row: { display: 'flex', gap: '10px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px', display: 'block' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' },
    textarea: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px', fontSize: '0.9rem', resize: 'none' },
    sdaBox: { display: 'flex', gap: '8px' },
    btnAdd: { background: '#1b3a57', color: 'white', border: 'none', borderRadius: '8px', width: '45px', cursor: 'pointer', fontSize: '1.2rem' },
    btnAddMaterial: { background: '#0056b3', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' },
    tagWrap: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
    tag: { background: '#e1e8ed', padding: '5px 10px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold', color: '#1b3a57' },
    btnTagX: { background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold' },
    btnSave: { flex: 2, color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    btnCancel: { flex: 1, background: '#bdc3c7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
    scrollList: { maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' },
    logItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #f0f0f0', transition: '0.2s' },
    logActions: { display: 'flex', gap: '5px' },
    btnIconEdit: { background: '#f1c40f', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' },
    btnIconHs: { background: '#e1e8ed', border: '1px solid #ccc', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' },
    btnIconDel: { background: '#fadbd8', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }
};

export default Operaciones;