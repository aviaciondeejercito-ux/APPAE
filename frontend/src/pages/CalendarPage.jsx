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

    const [formData, setFormData] = useState({
        title: '', start: '', end: '', color: '#1b3a57', notes: ''
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const { data } = await getEvents();
            setEvents(data);
        } catch (error) { console.error("Error de conexión AE"); }
    };

    const handleEditClick = (ev) => {
        if (role === 'boss') return;
        setIsEditing(true);
        setSelectedId(ev._id);
        setFormData({
            title: ev.title,
            start: new Date(ev.start).toISOString().slice(0, 16),
            end: new Date(ev.end).toISOString().slice(0, 16),
            color: ev.color,
            notes: ev.notes || ''
        });
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await updateEvent(selectedId, formData);
            } else {
                await createEvent(formData);
            }
            setFormData({ title: '', start: '', end: '', color: '#1b3a57', notes: '' });
            setIsEditing(false);
            fetchData(); // Materialización instantánea
        } catch (error) { alert("Error en base de datos. Verifique los rangos de fecha."); }
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Confirmar BAJA DEFINITIVA del evento?")) {
            await deleteEvent(id);
            fetchData();
        }
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
            
            {/* 1. VISUALIZADOR (Imagen de Calendario Grande) */}
            <div style={styles.mainCard}>
                <h2 style={{ color: '#1b3a57', marginBottom: '20px' }}>🗓️ Monitor de Actividades Operativas</h2>
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
                        extendedProps: { notes: ev.notes }
                    }))}
                    height="75vh"
                    editable={false}
                    selectable={false}
                    eventMouseEnter={(info) => { 
                        info.el.title = `Notas: ${info.event.extendedProps.notes || 'Sin observaciones'}`;
                    }}
                    dayMaxEvents={true}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
                />
            </div>

            {/* PANEL SECUNDARIO DE GESTIÓN (Solo Admin/User) */}
            {role !== 'boss' && (
                <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px' }}>
                    
                    {/* FORMULARIO DE CARGA/EDICIÓN */}
                    <div style={styles.actionCard}>
                        <h3 style={styles.subTitle}>{isEditing ? "📝 Editar Evento" : "➕ Nueva Carga"}</h3>
                        <form onSubmit={handleSubmit} style={styles.form}>
                            <label style={styles.label}>Misión/Evento</label>
                            <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={styles.input}/>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={styles.label}>Inicio</label>
                                    <input type="datetime-local" required value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} style={styles.inputSmall}/>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={styles.label}>Fin</label>
                                    <input type="datetime-local" required value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} style={styles.inputSmall}/>
                                </div>
                            </div>

                            <label style={styles.label}>Identificador Visual</label>
                            <input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} style={styles.colorPicker}/>

                            <label style={styles.label}>Notas Técnicas</label>
                            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={styles.textarea}/>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit" style={styles.btnSave}>{isEditing ? "Actualizar" : "Materializar"}</button>
                                {isEditing && (
                                    <button type="button" onClick={() => {setIsEditing(false); setFormData({title:'',start:'',end:'',color:'#1b3a57',notes:''})}} style={styles.btnCancel}>X</button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* REGISTRO DE LOGS Y AUDITORÍA */}
                    <div style={styles.actionCard}>
                        <h3 style={styles.subTitle}>📜 Registro de Actividades (Logs)</h3>
                        <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
                            <table style={styles.table}>
                                <thead>
                                    <tr style={styles.thRow}>
                                        <th>Fecha</th>
                                        <th>Evento</th>
                                        <th>Operador</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map(ev => (
                                        <tr key={ev._id} style={styles.tr}>
                                            <td style={styles.td}>{new Date(ev.start).toLocaleDateString()}</td>
                                            <td style={styles.td}><strong>{ev.title}</strong></td>
                                            <td style={styles.td}><span style={styles.badge}>{ev.userName || 'Sistema'}</span></td>
                                            <td style={styles.td}>
                                                <button onClick={() => handleEditClick(ev)} style={styles.btnEdit}>✏️</button>
                                                <button onClick={() => handleDelete(ev._id)} style={styles.btnDeleteLog}>🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA BOSS: SOLO LOGS DE LECTURA */}
            {role === 'boss' && (
                <div style={styles.mainCard}>
                    <h3 style={styles.subTitle}>📜 Resumen de Auditoría Operativa</h3>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.thRow}>
                                <th>INICIO</th>
                                <th>FIN</th>
                                <th>EVENTO</th>
                                <th>RESPONSABLE</th>
                                <th>NOTAS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map(ev => (
                                <tr key={ev._id} style={styles.tr}>
                                    <td style={styles.td}>{new Date(ev.start).toLocaleString()}</td>
                                    <td style={styles.td}>{new Date(ev.end).toLocaleString()}</td>
                                    <td style={styles.td}><strong>{ev.title}</strong></td>
                                    <td style={styles.td}>{ev.userName || 'Admin'}</td>
                                    <td style={{...styles.td, fontSize: '0.8rem', color: '#666'}}>{ev.notes}</td>
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
    mainCard: { background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '20px' },
    actionCard: { background: '#fff', padding: '20px', borderRadius: '12px', borderTop: '4px solid #1b3a57', boxShadow: '0 2px 15px rgba(0,0,0,0.05)' },
    subTitle: { color: '#1b3a57', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0 },
    form: { display: 'flex', flexDirection: 'column', gap: '12px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginBottom: '-8px' },
    input: { padding: '10px', borderRadius: '6px', border: '1px solid #ddd' },
    inputSmall: { padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.8rem', width: '100%' },
    colorPicker: { width: '100%', height: '35px', border: 'none', cursor: 'pointer' },
    textarea: { padding: '10px', borderRadius: '6px', border: '1px solid #ddd', height: '80px', resize: 'none' },
    btnSave: { flex: 1, background: '#1b3a57', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
    btnCancel: { background: '#6c757d', color: 'white', border: 'none', padding: '0 15px', borderRadius: '6px', cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
    thRow: { textAlign: 'left', borderBottom: '2px solid #1b3a57', fontSize: '0.85rem', color: '#1b3a57' },
    tr: { borderBottom: '1px solid #f0f0f0' },
    td: { padding: '10px 5px', fontSize: '0.9rem' },
    badge: { background: '#e9ecef', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' },
    btnEdit: { background: '#ffc107', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' },
    btnDeleteLog: { background: '#f8d7da', color: '#721c24', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }
};

export default CalendarPage;