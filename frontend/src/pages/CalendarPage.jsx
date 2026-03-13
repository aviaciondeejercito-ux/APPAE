import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid'; // Para mejor superposición
import esLocale from '@fullcalendar/core/locales/es';
import { getEvents, createEvent, deleteEvent } from '../services/api'; // Usamos tu api.js centralizada

const CalendarPage = () => {
    const [events, setEvents] = useState([]);
    const [role] = useState(localStorage.getItem('role'));
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    
    // Estado para el nuevo evento
    const [newEvent, setNewEvent] = useState({
        title: '',
        start: '',
        end: '',
        color: '#1b3a57',
        description: ''
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
                extendedProps: { notes: ev.description }
            }));
            setEvents(formatted);
        } catch (error) {
            console.error("Error cargando eventos");
        }
    };

    const handleDateClick = (arg) => {
        if (role === 'boss') return; // El Boss no puede crear
        setNewEvent({ ...newEvent, start: arg.dateStr, end: arg.dateStr });
        setShowModal(true);
        setSelectedEvent(null);
    };

    const handleEventClick = (info) => {
        setSelectedEvent({
            id: info.event.id,
            title: info.event.title,
            notes: info.event.extendedProps.notes,
            start: info.event.start.toLocaleString(),
            end: info.event.end ? info.event.end.toLocaleString() : 'N/A'
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createEvent(newEvent);
            setShowModal(false);
            setNewEvent({ title: '', start: '', end: '', color: '#1b3a57', description: '' });
            fetchData(); // Materialización inmediata
        } catch (error) {
            alert("Error al crear el evento");
        }
    };

    const handleDelete = async (id) => {
        if (role !== 'admin') return; // Solo admin borra
        if (window.confirm("¿Eliminar este evento?")) {
            await deleteEvent(id);
            setSelectedEvent(null);
            fetchData(); // Actualización inmediata
        }
    };

    return (
        <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
            
            {/* PANEL DE CREACIÓN (Solo para Admin y User) */}
            {role !== 'boss' && showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h3>Nuevo Evento Operativo</h3>
                        <form onSubmit={handleSubmit} style={styles.form}>
                            <input type="text" placeholder="Título del evento" required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} style={styles.input}/>
                            <div style={{display: 'flex', gap: '10px'}}>
                                <input type="datetime-local" required value={newEvent.start} onChange={e => setNewEvent({...newEvent, start: e.target.value})} style={styles.input}/>
                                <input type="datetime-local" required value={newEvent.end} onChange={e => setNewEvent({...newEvent, end: e.target.value})} style={styles.input}/>
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <label>Color:</label>
                                <input type="color" value={newEvent.color} onChange={e => setNewEvent({...newEvent, color: e.target.value})} style={{height: '40px', cursor: 'pointer'}}/>
                            </div>
                            <textarea placeholder="Notas adicionales..." value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} style={{...styles.input, height: '80px'}}/>
                            <div style={{display: 'flex', gap: '10px'}}>
                                <button type="submit" style={styles.btnSave}>Guardar Evento</button>
                                <button type="button" onClick={() => setShowModal(false)} style={styles.btnCancel}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETALLES DEL EVENTO (Para todos, incluyendo Boss) */}
            {selectedEvent && (
                <div style={styles.detailCard}>
                    <h4>📋 Detalle: {selectedEvent.title}</h4>
                    <p><strong>Inicio:</strong> {selectedEvent.start}</p>
                    <p><strong>Fin:</strong> {selectedEvent.end}</p>
                    <p><strong>Notas:</strong> {selectedEvent.notes || 'Sin notas'}</p>
                    <div style={{display: 'flex', gap: '10px'}}>
                        {role === 'admin' && <button onClick={() => handleDelete(selectedEvent.id)} style={styles.btnDelete}>Eliminar</button>}
                        <button onClick={() => setSelectedEvent(null)} style={styles.btnClose}>Cerrar</button>
                    </div>
                </div>
            )}

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    locale={esLocale}
                    events={events}
                    height="75vh"
                    editable={role === 'admin'}
                    selectable={role !== 'boss'}
                    dayMaxEvents={true} // Superpone y resume eventos con "+ más"
                    eventClick={handleEventClick}
                    dateClick={handleDateClick}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                />
            </div>
        </div>
    );
};

const styles = {
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { background: 'white', padding: '25px', borderRadius: '8px', width: '400px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' },
    detailCard: { background: '#e9ecef', padding: '15px', borderRadius: '8px', borderLeft: '5px solid #1b3a57' },
    btnSave: { background: '#28a745', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    btnCancel: { background: '#6c757d', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' },
    btnDelete: { background: '#dc3545', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' },
    btnClose: { background: '#1b3a57', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }
};

export default CalendarPage;