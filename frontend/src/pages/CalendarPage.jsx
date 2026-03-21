import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import esLocale from '@fullcalendar/core/locales/es';
import { getEvents } from '../services/EventService';

const CalendarPage = () => {
    const [events, setEvents] = useState([]);
    const [role] = useState(localStorage.getItem('role')?.toLowerCase());
    const [userUnidad] = useState(localStorage.getItem('elemento')); 
    const [selectedEvent, setSelectedEvent] = useState(null); 
    const [isMobile] = useState(window.innerWidth < 768);

    useEffect(() => { 
        fetchData(); 
    }, []);

    const fetchData = async () => {
        try {
            const data = await getEvents();
            const esMando = role === 'admin' || role === 'boss';
            
            const filteredData = esMando 
                ? data 
                : data.filter(ev => ev.elemento?.includes(userUnidad) || ev.esGlobal);

            setEvents(Array.isArray(filteredData) ? filteredData : []);
        } catch (error) { 
            console.error("❌ Error de sincronización con el Monitor AE:", error); 
        }
    };

    const handleEventClick = (info) => {
        const { event } = info;
        setSelectedEvent({
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            color: event.backgroundColor,
            notes: event.extendedProps.notes,
            user: event.extendedProps.user,
            origen: event.extendedProps.tipoOrigen,
            elemento: event.extendedProps.elemento,
            etapa: event.extendedProps.etapa,
            tipoApoyo: event.extendedProps.tipoApoyo,
            esGlobal: event.extendedProps.esGlobal,
            sdaListado: event.extendedProps.sdaListado || []
        });
    };

    const closeModal = () => setSelectedEvent(null);

    const eventDidMount = (info) => {
        const { tipoOrigen, esGlobal, etapa } = info.event.extendedProps;
        
        // Borde Dorado para Órdenes de Comando o Globales
        if (tipoOrigen === 'COMANDO' || esGlobal) {
            info.el.style.border = '2px solid #FFD700'; 
            info.el.style.boxShadow = '0 0 5px rgba(255, 215, 0, 0.5)';
            info.el.style.fontWeight = 'bold';
        }

        // Estilos por Etapa
        if (etapa === 'recepcion') {
            info.el.style.opacity = '0.7'; 
            info.el.style.borderStyle = 'dashed';
        } else if (etapa === 'revision') {
            info.el.style.opacity = '0.9';
        }

        // Corrección de visibilidad para eventos color Negro
        if (info.event.backgroundColor === '#000000') {
            const titleEl = info.el.querySelector('.fc-event-title');
            if (titleEl) titleEl.style.color = '#FFFFFF';
        }
    };

    const getEtapaLabel = (etapa) => {
        const etiquetas = {
            'recepcion': { text: '🟡 RECEPCIÓN / SOLICITUD', color: '#f39c12' },
            'revision': { text: '🔵 EN REVISIÓN (DIR AE)', color: '#3498db' },
            'ordenada': { text: '🟢 ORDENADA / CONFIRMADA', color: '#27ae60' }
        };
        return etiquetas[etapa] || { text: 'S/D', color: '#95a5a6' };
    };

    return (
        <div style={styles.pageContainer}>
            <div style={styles.mainCard}>
                <div style={styles.headerMonitor}>
                    <h2 style={styles.title}>🗓️ Monitor de Actividades Operativas</h2>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={styles.unidadBadge}>{userUnidad || "SIN UNIDAD"}</span>
                        <span style={styles.modeBadge}>
                            {role === 'boss' || role === 'admin' ? `MODO: COMANDO (${role.toUpperCase()})` : 'MODO: UNIDAD (S4)'}
                        </span>
                    </div>
                </div>
                
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView={isMobile ? "timeGridDay" : "dayGridMonth"}
                    locale={esLocale}
                    events={events.map(ev => ({
                        id: ev._id,
                        title: `${ev.esGlobal ? '🌐 ' : ''}${ev.tipoApoyo ? `[${ev.tipoApoyo}] ` : ''}${ev.title}`,
                        start: ev.start,
                        end: ev.end,
                        backgroundColor: ev.color || '#1b3a57', 
                        borderColor: 'transparent',
                        extendedProps: { 
                            notes: ev.notes, 
                            user: ev.userName,
                            tipoOrigen: ev.tipoOrigen,
                            elemento: ev.elemento,
                            esGlobal: ev.esGlobal,
                            etapa: ev.etapa,
                            tipoApoyo: ev.tipoApoyo,
                            sdaListado: ev.sdaListado 
                        }
                    }))}
                    height="75vh"
                    editable={false}
                    eventClick={handleEventClick}
                    eventDidMount={eventDidMount} 
                    headerToolbar={{ 
                        left: 'prev,next today', 
                        center: 'title', 
                        right: isMobile ? 'timeGridDay,dayGridMonth' : 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                    dayMaxEvents={isMobile ? 2 : 5}
                    nowIndicator={true}
                    timeZone="local" 
                />
            </div>

            {selectedEvent && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={{...styles.modalHeader, backgroundColor: selectedEvent.color || '#1b3a57'}}>
                            <h3 style={styles.modalTitle}>
                                {selectedEvent.esGlobal ? `🌐 [GLOBAL] ${selectedEvent.title}` : selectedEvent.title}
                            </h3>
                            <button onClick={closeModal} style={styles.btnClose}>×</button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <div style={{...styles.etapaBanner, backgroundColor: getEtapaLabel(selectedEvent.etapa).color}}>
                                {getEtapaLabel(selectedEvent.etapa).text}
                            </div>

                            <div style={styles.infoRow}>
                                <strong>🏢 Unidades Involucradas:</strong> 
                                <span style={{ color: '#1b3a57', fontWeight: 'bold' }}>{selectedEvent.elemento}</span>
                            </div>
                            <hr style={styles.divider} />
                            
                            <div style={styles.infoRow}>
                                <strong>🚁 Tipo de Apoyo y Medios:</strong> 
                                <span>{selectedEvent.tipoApoyo || 'No especificado'}</span>
                                {selectedEvent.sdaListado?.length > 0 && (
                                    <div style={styles.sdaContainer}>
                                        {selectedEvent.sdaListado.map((sda, idx) => (
                                            <span key={idx} style={styles.sdaBadge}>⚙️ {sda}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <hr style={styles.divider} />

                            <div style={styles.infoRow}>
                                <strong>⏱️ Horario Operativo:</strong> 
                                <span>
                                    {new Date(selectedEvent.start).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} - 
                                    {new Date(selectedEvent.end).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                            </div>
                            <hr style={styles.divider} />
                            
                            <div style={styles.infoRow}>
                                <strong>👤 Responsable Registro:</strong> 
                                <span style={styles.badge}>{selectedEvent.user || 'Sistema AE'}</span>
                            </div>
                            <hr style={styles.divider} />
                            
                            <div style={styles.notesBox}>
                                <strong>📝 Detalle de la Misión:</strong>
                                <p style={styles.notesText}>{selectedEvent.notes || 'Sin observaciones adicionales.'}</p>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button onClick={closeModal} style={styles.btnOk}>Cerrar Monitor</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    pageContainer: { padding: '10px', backgroundColor: '#f4f7f6', minHeight: '85vh' },
    mainCard: { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', marginBottom: '20px' },
    headerMonitor: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' },
    title: { color: '#1b3a57', margin: 0, fontSize: '1.2rem' },
    unidadBadge: { fontSize: '0.75rem', background: '#e9ecef', color: '#1b3a57', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #1b3a57' },
    modeBadge: { fontSize: '0.7rem', background: '#1b3a57', color: 'white', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' },
    etapaBanner: { padding: '8px', borderRadius: '6px', color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: '0.85rem', marginBottom: '15px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' },
    modalContent: { background: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' },
    modalHeader: { padding: '15px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { margin: 0, fontSize: '1.1rem' },
    btnClose: { background: 'transparent', border: 'none', color: 'white', fontSize: '1.8rem', cursor: 'pointer' },
    modalBody: { padding: '20px' },
    infoRow: { display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.95rem' },
    divider: { border: 'none', borderBottom: '1px solid #eee', margin: '12px 0' },
    badge: { background: '#e9ecef', padding: '4px 12px', borderRadius: '15px', fontSize: '0.8rem', width: 'fit-content' },
    sdaContainer: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' },
    sdaBadge: { background: '#f1f4f8', color: '#1b3a57', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #d1d9e6' },
    notesBox: { marginTop: '10px' },
    notesText: { background: '#f8f9fa', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', color: '#444', whiteSpace: 'pre-line' },
    modalFooter: { padding: '15px 20px', borderTop: '1px solid #eee', textAlign: 'right' },
    btnOk: { background: '#1b3a57', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }
};

export default CalendarPage;