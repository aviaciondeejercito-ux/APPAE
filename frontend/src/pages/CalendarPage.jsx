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
        } catch (error) { 
            console.error("Error de conexión con el servidor AE"); 
        }
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
            fetchData(); // Materialización inmediata (Crear/Eliminar/Editar)
        } catch (error) { 
            alert("Error en base de datos. Verifique que la fecha de fin sea posterior a la de inicio."); 
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Confirmar BAJA DEFINITIVA del evento?")) {
            await deleteEvent(id);
            fetchData();
        }
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            
            {/* 1. VISUALIZADOR TÁCTICO (Estilo Imagen) */}
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
                    selectable={false} // Calendario solo para VER
                    eventDisplay="block"
                    eventOverlap={true} // Permite superposición (resumido)
                    dayMaxEvents={3} // Resume a "+X más" si hay muchos
                    eventDidMount={(info) => {
                        // Miniventanita de información al acercar el mouse
                        const { notes, user } = info.event.extendedProps;
                        info.el.title = `Operador: ${user || 'Sistema'}\nNotas: ${notes || 'Sin observaciones'}`;
                    }}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
                />
            </div>

            {/* 2. PANEL SECUNDARIO DE GESTIÓN Y LOGS */}
            {role !== 'boss' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px' }}>
                    
                    {/* FORMULARIO DE CARGA */}
                    <div style={styles.actionCard}>
                        <h3 style={styles.subTitle}>{isEditing ? "📝 Editar Evento" : "➕ Nueva Carga"}</h3>
                        <form onSubmit={handleSubmit} style={styles.form}>
                            <label style={styles.label}>Nombre de la Misión</label>
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

                            <label style={styles.label}>Color de Identificación</label>
                            <input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} style={styles.colorPicker}/>

                            <label style={styles.label}>Notas y Observaciones</label>
                            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={styles.textarea}/>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit" style={styles.btnSave}>{isEditing ? "Actualizar" : "Materializar en Calendario"}</button>
                                {isEditing && (
                                    <button type="button" onClick={() => {setIsEditing(false); setFormData({title:'',start:'',end:'',color:'#1b3a57',notes:''})}} style={styles.btnCancel}>X</button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* REGISTRO DE LOGS (Auditoría) */}
                    <div style={styles.actionCard}>
                        <h3 style={styles.subTitle}>📜 Registro de Actividades (Logs)</h3>
                        <div style={{ overflowY: 'auto', maxHeight: '450px' }}>
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
                                            <td style={{ ...styles.td, textAlign: 'center' }}>
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
                /* VISTA BOSS: PANEL DE SOLO LECTURA */
                <div style={styles.actionCard}>
                    <h3 style={styles.subTitle}>📜 Auditoría Técnica (Solo Lectura)</h3>
                    <table style={styles.table}>
                        <thead style={styles.thead}>
                            <tr>
                                <th>Rango Horario</th>
                                <th>Actividad</th>
                                <th>Cargado por</th>
                                <th>Observaciones</th>
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
    subTitle: { color: '#1b3a57', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0 },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', color: '#555', marginBottom: '-10px' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' },
    inputSmall: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', width: '100%' },
    colorPicker: { width: '100%', height: '40px', border: 'none', cursor: 'pointer', borderRadius: '8px' },
    textarea: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', height: '100px', resize: 'none', fontSize: '0.9rem' },
    btnSave: { flex: 1, background: '#1b3a57', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
    btnCancel: { background: '#6c757d', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { textAlign: 'left', borderBottom: '2px solid #1b3a57', fontSize: '0.85rem', color: '#1b3a57' },
    tr: { borderBottom: '1px solid #f0f0f0', transition: '0.2s' },
    td: { padding: '12px 8px', fontSize: '0.9rem' },
    badge: { background: '#e9ecef', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' },
    btnEdit: { background: '#ffc107', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', marginRight: '8px' },
    btnDeleteLog: { background: '#f8d7da', color: '#721c24', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }
};

export default CalendarPage;