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
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    const [formData, setFormData] = useState({
        title: '', start: '', end: '', color: '#1b3a57', notes: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data } = await getEvents();
            const formatted = data.map(ev => ({
                id: ev._id,
                title: ev.title,
                start: ev.start,
                end: ev.end,
                backgroundColor: ev.color || '#1b3a57',
                borderColor: ev.color || '#1b3a57',
                extendedProps: { notes: ev.notes }
            }));
            setEvents(formatted);
        } catch (error) {
            console.error("Error en servidor AE");
        }
    };

    // Al hacer clic en un evento, cargamos sus datos en el panel secundario
    const handleEventClick = (info) => {
        setIsCreating(false);
        const ev = info.event;
        setSelectedEvent(ev.id);
        setFormData({
            title: ev.title,
            start: new Date(ev.start).toISOString().slice(0, 16),
            end: ev.end ? new Date(ev.end).toISOString().slice(0, 16) : new Date(ev.start).toISOString().slice(0, 16),
            color: ev.backgroundColor,
            notes: ev.extendedProps.notes || ''
        });
    };

    // Tooltip al acercar el mouse (Miniventanita de información)
    const handleMouseEnter = (info) => {
        info.el.title = `📝 Notas: ${info.event.extendedProps.notes || 'Sin notas'}`;
        info.el.style.cursor = 'pointer';
    };

    const handleNewEventBtn = () => {
        setIsCreating(true);
        setSelectedEvent(null);
        setFormData({ title: '', start: '', end: '', color: '#1b3a57', notes: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isCreating) {
                await createEvent(formData);
            } else {
                await updateEvent(selectedEvent, formData);
            }
            fetchData();
            setSelectedEvent(null);
            setIsCreating(false);
        } catch (error) {
            alert("Fallo en la operación de base de datos.");
        }
    };

    const handleDelete = async () => {
        if (window.confirm("¿Confirmar baja definitiva?")) {
            await deleteEvent(selectedEvent);
            setSelectedEvent(null);
            fetchData();
        }
    };

    return (
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
            
            {/* 1. CALENDARIO (VISUALIZADOR PURO) */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ color: '#1b3a57', margin: 0 }}>🗓️ Calendario Operativo</h2>
                    {role !== 'boss' && (
                        <button onClick={handleNewEventBtn} style={styles.btnNew}>+ Cargar Nuevo Evento</button>
                    )}
                </div>
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    locale={esLocale}
                    events={events}
                    height="75vh"
                    editable={false} 
                    selectable={false} // BLOQUEADO: No se puede crear haciendo click en la fecha
                    eventClick={handleEventClick}
                    eventMouseEnter={handleMouseEnter} // Miniventanita de info al acercar mouse
                    eventOverlap={true} // Permite superposición
                    dayMaxEvents={true} // Resume eventos ("+2 más") para no romper la estética
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
                />
            </div>

            {/* 2. PANEL SECUNDARIO (ÚNICO CENTRO DE MANDO) */}
            <div style={styles.panelSecundario}>
                {(selectedEvent || isCreating) ? (
                    <>
                        <h3 style={{ borderBottom: '2px solid #1b3a57', paddingBottom: '10px' }}>
                            {isCreating ? "🆕 Cargar Evento" : "📝 Gestión de Evento"}
                        </h3>
                        <form onSubmit={handleSubmit} style={styles.form}>
                            <label style={styles.label}>Nombre de la Misión</label>
                            <input type="text" required disabled={role === 'boss'} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={styles.input}/>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={styles.label}>Desde</label>
                                    <input type="datetime-local" required disabled={role === 'boss'} value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} style={styles.input}/>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={styles.label}>Hasta</label>
                                    <input type="datetime-local" required disabled={role === 'boss'} value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} style={styles.input}/>
                                </div>
                            </div>

                            <label style={styles.label}>Color Identificador</label>
                            <input type="color" disabled={role === 'boss'} value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} style={{ width: '100%', height: '40px', cursor: 'pointer', border: 'none' }}/>

                            <label style={styles.label}>Notas Técnicas</label>
                            <textarea disabled={role === 'boss'} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={{ ...styles.input, height: '150px' }}/>

                            {role !== 'boss' && (
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="submit" style={styles.btnSave}>{isCreating ? "Materializar" : "Actualizar"}</button>
                                    {!isCreating && <button type="button" onClick={handleDelete} style={styles.btnDelete}>Eliminar</button>}
                                </div>
                            )}
                            <button type="button" onClick={() => {setSelectedEvent(null); setIsCreating(false);}} style={styles.btnCancel}>Cerrar Panel</button>
                        </form>
                    </>
                ) : (
                    <div style={styles.emptyState}>
                        <p>Pase el mouse por el calendario para información rápida o seleccione un evento para editarlo.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    panelSecundario: { background: '#f8f9fa', padding: '25px', borderRadius: '12px', border: '1px solid #dee2e6', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: 'fit-content', position: 'sticky', top: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '12px' },
    label: { fontSize: '0.8rem', fontWeight: 'bold', color: '#555', marginBottom: '-8px' },
    input: { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem' },
    btnNew: { background: '#1b3a57', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    btnSave: { background: '#28a745', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', flex: 2, fontWeight: 'bold' },
    btnDelete: { background: '#dc3545', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', flex: 1 },
    btnCancel: { background: '#6c757d', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', marginTop: '5px' },
    emptyState: { textAlign: 'center', color: '#888', marginTop: '100px', fontStyle: 'italic', lineHeight: '1.5' }
};

export default CalendarPage;