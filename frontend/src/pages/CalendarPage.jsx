import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import esLocale from '@fullcalendar/core/locales/es';
import { getEvents, createEvent, deleteEvent, updateEvent } from '../services/api';

const CalendarPage = () => {
    const [events, setEvents] = useState([]);
    const [role] = useState(localStorage.getItem('role'));
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const sdaList = [
        "UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", 
        "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3"
    ];

    const [formData, setFormData] = useState({
        title: '', start: '', end: '', color: '#1b3a57', notes: '',
        tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: []
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const { data } = await getEvents();
            setEvents(data);
        } catch (error) { 
            console.error("Error de conexión con el servidor AE"); 
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

    const handleEditClick = (ev) => {
        if (role === 'boss') return;
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
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
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
            setFormData({ title: '', start: '', end: '', color: '#1b3a57', notes: '', tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: [] });
            setIsEditing(false);
            fetchData(); 
        } catch (error) { 
            alert("Error en base de datos. Verifique los campos."); 
        }
    };

    const handleDelete = async (id) => {
        if (role === 'boss') return;
        if (window.confirm("¿Confirmar BAJA DEFINITIVA del evento?")) {
            await deleteEvent(id);
            fetchData();
        }
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            
            <div style={styles.mainCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ color: '#1b3a57', margin: 0 }}>🗓️ Monitor de Actividades Operativas</h2>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>Modo: {role === 'boss' ? 'Solo Lectura (Jefe)' : 'Gestión Total'}</span>
                </div>
                
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    locale={esLocale}
                    events={events.map(ev => ({
                        id: ev._id,
                        title: ev.title,
                        start: ev.start,
                        end: ev.end,
                        backgroundColor: ev.color,
                        borderColor: 'transparent',
                        extendedProps: { notes: ev.notes, user: ev.userName }
                    }))}
                    height="70vh"
                    editable={false}
                    selectable={false}
                    eventDisplay="block"
                    eventOverlap={true}
                    dayMaxEvents={3}
                    nowIndicator={true} // Muestra línea de hora actual
                    eventDidMount={(info) => {
                        const { notes, user } = info.event.extendedProps;
                        info.el.title = `Operador: ${user || 'Sistema'}\nDetalle: ${notes || 'Sin observaciones'}`;
                    }}
                    headerToolbar={{ 
                        left: 'prev,next today', 
                        center: 'title', 
                        right: 'dayGridMonth,timeGridWeek,timeGridDay' // Agregada vista diaria
                    }}
                />
            </div>

            {role !== 'boss' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '450px 1fr', gap: '20px' }}>
                    
                    <div style={styles.actionCard}>
                        <h3 style={styles.subTitle}>{isEditing ? "📝 Editar Evento" : "➕ Nueva Carga"}</h3>
                        <form onSubmit={handleSubmit} style={styles.form}>
                            
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Nombre de la Misión</label>
                                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={styles.input} placeholder="Ej: Vuelo de Reconocimiento"/>
                            </div>
                            
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Inicio</label>
                                <input type="datetime-local" required value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} style={styles.input}/>
                            </div>

                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Fin</label>
                                <input type="datetime-local" required value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} style={styles.input}/>
                            </div>

                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Tipo de Apoyo (Define Color)</label>
                                <select value={formData.tipoApoyo} onChange={handleTipoApoyoChange} style={styles.input} required>
                                    <option value="">Seleccione Tipo...</option>
                                    <option value="Sostenimiento">Sostenimiento (Azul)</option>
                                    <option value="Fuerza Operativa">Fuerza Operativa (Verde)</option>
                                    <option value="Educacion">Educación (Bordo)</option>
                                </select>
                            </div>

                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Sistemas de Armas (SdA)</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select value={formData.sdaSelected} onChange={e => setFormData({...formData, sdaSelected: e.target.value})} style={{...styles.input, flex: 1}}>
                                        <option value="">Seleccione SdA...</option>
                                        {sdaList.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <input type="number" min="1" value={formData.sdaCantidad} onChange={e => setFormData({...formData, sdaCantidad: e.target.value})} style={{...styles.input, width: '60px', textAlign: 'center'}}/>
                                    <button type="button" onClick={addSda} style={styles.btnAddSda}>+</button>
                                </div>
                            </div>
                            
                            <div style={styles.sdaTagContainer}>
                                {formData.sdaListado.map((s, i) => (
                                    <span key={i} style={styles.sdaTag}>
                                        {s}
                                        <button type="button" onClick={() => removeSda(i)} style={styles.btnRemoveTag}>×</button>
                                    </span>
                                ))}
                            </div>

                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>Notas Adicionales</label>
                                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={styles.textarea} placeholder="Detalles de la misión..."/>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" style={styles.btnSave}>{isEditing ? "Actualizar" : "Materializar en Calendario"}</button>
                                {isEditing && (
                                    <button type="button" onClick={() => {setIsEditing(false); setFormData({title:'',start:'',end:'',color:'#1b3a57',notes:'', sdaListado: [], tipoApoyo: ''})}} style={styles.btnCancel}>X</button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div style={styles.actionCard}>
                        <h3 style={styles.subTitle}>📜 Registro de Actividades (Logs)</h3>
                        <div style={{ overflowY: 'auto', maxHeight: '550px' }}>
                            <table style={styles.table}>
                                <thead style={styles.thead}>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Evento</th>
                                        <th>Operador</th>
                                        <th style={{ textAlign: 'center' }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map(ev => (
                                        <tr key={ev._id} style={styles.tr}>
                                            <td style={styles.td}>{new Date(ev.start).toLocaleDateString()}</td>
                                            <td style={styles.td}><strong>{ev.title}</strong></td>
                                            <td style={styles.td}><span style={styles.badge}>{ev.userName || 'Admin'}</span></td>
                                            <td style={{ ...styles.td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <button onClick={() => handleEditClick(ev)} style={styles.btnEdit} title="Editar">✏️</button>
                                                <button onClick={() => handleDelete(ev._id)} style={styles.btnDeleteLog} title="Eliminar">🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={styles.actionCard}>
                    <h3 style={styles.subTitle}>📜 Auditoría Técnica (Solo Lectura)</h3>
                    <table style={styles.table}>
                        <thead style={styles.thead}>
                            <tr>
                                <th>Rango Horario</th>
                                <th>Actividad</th>
                                <th>Cargado por</th>
                                <th>Detalle Operativo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map(ev => (
                                <tr key={ev._id} style={styles.tr}>
                                    <td style={styles.td}>{new Date(ev.start).toLocaleString()} - {new Date(ev.end).toLocaleString()}</td>
                                    <td style={styles.td}><strong>{ev.title}</strong></td>
                                    <td style={styles.td}>{ev.userName || 'Admin'}</td>
                                    <td style={{ ...styles.td, color: '#666', fontSize: '0.8rem' }}>{ev.notes || '---'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const styles = {
    mainCard: { background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '25px' },
    actionCard: { background: '#fff', padding: '25px', borderRadius: '12px', borderTop: '5px solid #1b3a57', boxShadow: '0 2px 15px rgba(0,0,0,0.05)' },
    subTitle: { color: '#1b3a57', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0, marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '0.85rem', fontWeight: 'bold', color: '#444' },
    input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box' },
    textarea: { padding: '12px', borderRadius: '8px', border: '1px solid #ccc', height: '90px', resize: 'none', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' },
    btnSave: { flex: 1, background: '#1b3a57', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
    btnCancel: { background: '#6c757d', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: 'pointer' },
    btnAddSda: { background: '#1b3a57', color: 'white', border: 'none', borderRadius: '8px', width: '42px', height: '42px', cursor: 'pointer', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    sdaTagContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '30px' },
    sdaTag: { background: '#f0f2f5', color: '#1b3a57', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', gap: '8px' },
    btnRemoveTag: { background: 'transparent', border: 'none', color: '#dc3545', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', padding: 0, lineHeight: 1, marginLeft: '4px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { textAlign: 'left', borderBottom: '2px solid #1b3a57', fontSize: '0.85rem', color: '#1b3a57' },
    tr: { borderBottom: '1px solid #f0f0f0', transition: '0.2s' },
    td: { padding: '14px 8px', fontSize: '0.9rem' },
    badge: { background: '#e9ecef', padding: '4px 12px', borderRadius: '15px', fontSize: '0.75rem', fontWeight: 'bold' },
    btnEdit: { background: '#ffc107', border: 'none', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px' },
    btnDeleteLog: { background: '#f8d7da', color: '#721c24', border: 'none', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer' }
};

export default CalendarPage;