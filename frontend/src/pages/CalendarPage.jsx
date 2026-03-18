import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import esLocale from '@fullcalendar/core/locales/es';
import { getEvents } from '../services/api';

const CalendarPage = () => {
    const [events, setEvents] = useState([]);
    const [role] = useState(localStorage.getItem('role'));
    const [selectedEvent, setSelectedEvent] = useState(null); // Estado para el Pop-up
    const [isMobile] = useState(window.innerWidth < 768);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const { data } = await getEvents();
            setEvents(data);
        } catch (error) { 
            console.error("Error de conexión con el servidor AE"); 
        }
    };

    // Función para abrir el Pop-up al hacer clic
    const handleEventClick = (info) => {
        const { event } = info;
        setSelectedEvent({
            title: event.title,
            start: event.start,
            end: event.end,
            color: event.backgroundColor,
            notes: event.extendedProps.notes,
            user: event.extendedProps.user
        });
    };

    // Función para cerrar el Pop-up
    const closeModal = () => setSelectedEvent(null);

    return (
        <div style={styles.pageContainer}>
            
            {/* MONITOR PRINCIPAL */}
            <div style={styles.mainCard}>
                <div style={styles.headerMonitor}>
                    <h2 style={styles.title}>🗓️ Monitor de Actividades Operativas</h2>
                    <span style={styles.modeBadge}>
                        {role === 'boss' ? 'MODO: LECTURA (JEFE)' : 'MODO: GESTIÓN ACTIVA'}
                    </span>
                </div>
                
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView={isMobile ? "timeGridDay" : "dayGridMonth"}
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
                    height="75vh"
                    editable={false}
                    eventClick={handleEventClick} // Activamos el Pop-up
                    headerToolbar={{ 
                        left: 'prev,next today', 
                        center: 'title', 
                        right: isMobile ? 'timeGridDay,dayGridMonth' : 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridian: false }}
                    dayMaxEvents={isMobile ? 2 : 4}
                    nowIndicator={true}
                />
            </div>

            {/* MODAL / POP-UP DE INFORMACIÓN */}
            {selectedEvent && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={{...styles.modalHeader, backgroundColor: selectedEvent.color}}>
                            <h3 style={styles.modalTitle}>{selectedEvent.title}</h3>
                            <button onClick={closeModal} style={styles.btnClose}>×</button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <div style={styles.infoRow}>
                                <strong>⏱️ Horario:</strong> 
                                <span>{selectedEvent.start.toLocaleString()} - {selectedEvent.end.toLocaleString()}</span>
                            </div>
                            <hr style={styles.divider} />
                            <div style={styles.infoRow}>
                                <strong>👤 Operador:</strong> 
                                <span style={styles.badge}>{selectedEvent.user || 'Sistema'}</span>
                            </div>
                            <hr style={styles.divider} />
                            <div style={styles.notesBox}>
                                <strong>📝 Detalle Operativo:</strong>
                                <p style={styles.notesText}>{selectedEvent.notes || 'Sin observaciones adicionales.'}</p>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button onClick={closeModal} style={styles.btnOk}>Entendido</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    pageContainer: { padding: '10px', backgroundColor: '#f4f7f6', minHeight: '85vh' },
    mainCard: { 
        background: '#fff', 
        padding: '20px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)', 
        marginBottom: '20px' 
    },
    headerMonitor: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '15px',
        flexWrap: 'wrap',
        gap: '10px'
    },
    title: { color: '#1b3a57', margin: 0, fontSize: '1.2rem' },
    modeBadge: { 
        fontSize: '0.7rem', 
        background: '#1b3a57', 
        color: 'white', 
        padding: '4px 10px', 
        borderRadius: '4px',
        fontWeight: 'bold'
    },

    // ESTILOS DEL MODAL (POP-UP)
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        padding: '20px'
    },
    modalContent: {
        background: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        animation: 'fadeIn 0.3s ease'
    },
    modalHeader: {
        padding: '15px 20px',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    modalTitle: { margin: 0, fontSize: '1.1rem' },
    btnClose: {
        background: 'transparent',
        border: 'none',
        color: 'white',
        fontSize: '1.8rem',
        cursor: 'pointer',
        lineHeight: 1
    },
    modalBody: { padding: '20px' },
    infoRow: { display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.95rem' },
    divider: { border: 'none', borderBottom: '1px solid #eee', margin: '15px 0' },
    badge: { 
        background: '#e9ecef', 
        padding: '4px 12px', 
        borderRadius: '15px', 
        fontSize: '0.8rem', 
        width: 'fit-content' 
    },
    notesBox: { marginTop: '10px' },
    notesText: { 
        background: '#f8f9fa', 
        padding: '10px', 
        borderRadius: '8px', 
        fontSize: '0.9rem', 
        color: '#444',
        whiteSpace: 'pre-line' 
    },
    modalFooter: {
        padding: '15px 20px',
        borderTop: '1px solid #eee',
        textAlign: 'right'
    },
    btnOk: {
        background: '#1b3a57',
        color: 'white',
        border: 'none',
        padding: '10px 25px',
        borderRadius: '6px',
        fontWeight: 'bold',
        cursor: 'pointer'
    }
};

export default CalendarPage;