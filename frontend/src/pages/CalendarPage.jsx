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

    // Lógica de colores según Tipo de Apoyo
    const getEventColor = (tipo) => {
        const t = tipo?.toUpperCase();
        if (t?.includes('SOSTENIMIENTO')) return '#007bff'; // Azul
        if (t?.includes('FUERZA OPERATIVA')) return '#28a745'; // Verde
        if (t?.includes('EDUCACION')) return '#800000'; // Bordó
        return '#ffffff'; // Otros / Blanco
    };

    const handleEventClick = (info) => {
        const { event } = info;
        // Limpiamos las notas para que no dupliquen el SDA si ya viene en el array
        let cleanNotes = event.extendedProps.notes || '';
        const sdas = event.extendedProps.sdaListado || [];
        
        sdas.forEach(sda => {
            const regex = new RegExp(`SDA:\\s*${sda}`, 'gi');
            cleanNotes = cleanNotes.replace(regex, '').replace(/\|\s*\|/g, '|').trim();
        });

        setSelectedEvent({
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            color: event.backgroundColor,
            notes: cleanNotes,
            user: event.extendedProps.user,
            origen: event.extendedProps.tipoOrigen,
            elemento: event.extendedProps.elemento,
            etapa: event.extendedProps.etapa,
            tipoApoyo: event.extendedProps.tipoApoyo,
            esGlobal: event.extendedProps.esGlobal,
            sdaListado: sdas
        });
    };

    const closeModal = () => setSelectedEvent(null);

    const eventDidMount = (info) => {
        const { tipoOrigen, esGlobal, etapa, elemento } = info.event.extendedProps;
        
        // Actividades Internas: Reborde Negro
        if (elemento === userUnidad && !esGlobal && tipoOrigen !== 'COMANDO') {
            info.el.style.border = '2px solid #000000';
        }

        // Estilos por Etapa (Tildes Visuales en el título se manejan en el map de eventos)
        if (etapa === 'recepcion') {
            info.el.style.opacity = '0.8'; 
            info.el.style.borderStyle = 'dashed';
        }

        // Contraste para eventos blancos
        if (info.event.backgroundColor === '#ffffff' || info.event.backgroundColor === '#FFFFFF') {
            const titleEl = info.el.querySelector('.fc-event-title');
            if (titleEl) titleEl.style.color = '#000000';
            info.el.style.border = '1px solid #ddd';
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
            <div style={styles.layout}>
                <div style={styles.mainCard}>
                    <div style={styles.headerMonitor}>
                        <h2 style={styles.title}>🗓️ Monitor de Actividades Operativas</h2>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={styles.unidadBadge}>{userUnidad || "SIN UNIDAD"}</span>
                            <span style={styles.modeBadge}>
                                {role === 'boss' || role === 'admin' ? `MODO: COMANDO` : 'MODO: UNIDAD'}
                            </span>
                        </div>
                    </div>
                    
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView={isMobile ? "timeGridDay" : "dayGridMonth"}
                        locale={esLocale}
                        events={events.map(ev => {
                            const colorBase = getEventColor(ev.tipoApoyo);
                            let tilde = '';
                            if (ev.etapa === 'recepcion') tilde = '🟡 ';
                            if (ev.etapa === 'revision') tilde = '🔵 ';
                            if (ev.etapa === 'ordenada') tilde = '🟢 ';

                            return {
                                id: ev._id,
                                title: `${tilde}${ev.esGlobal ? '🌐 ' : ''}${ev.title}`,
                                start: ev.start,
                                end: ev.end,
                                backgroundColor: colorBase, 
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
                            };
                        })}
                        height="auto"
                        eventClick={handleEventClick}
                        eventDidMount={eventDidMount} 
                        headerToolbar={{ 
                            left: 'prev,next today', 
                            center: 'title', 
                            right: isMobile ? 'timeGridDay,dayGridMonth' : 'dayGridMonth,timeGridWeek'
                        }}
                        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                        timeZone="UTC" 
                    />
                </div>

                {/* LEYENDA TÁCTICA APB */}
                <div style={styles.legendCard}>
                    <h4 style={styles.legendTitle}>REFERENCIAS</h4>
                    <div style={styles.legendSection}>
                        <p style={styles.legendSub}>Tipos de Misión</p>
                        <div style={styles.legendItem}><span style={{...styles.colorBox, background:'#007bff'}}></span> Sostenimiento</div>
                        <div style={styles.legendItem}><span style={{...styles.colorBox, background:'#28a745'}}></span> Fza. Operativa</div>
                        <div style={styles.legendItem}><span style={{...styles.colorBox, background:'#800000'}}></span> Educación</div>
                        <div style={styles.legendItem}><span style={{...styles.colorBox, background:'#ffffff', border:'1px solid #ccc'}}></span> Otros</div>
                    </div>
                    <div style={styles.legendSection}>
                        <p style={styles.legendSub}>Estados</p>
                        <div style={styles.legendItem}>🟡 Recepción</div>
                        <div style={styles.legendItem}>🔵 Revisión</div>
                        <div style={styles.legendItem}>🟢 Ordenada</div>
                    </div>
                    <div style={styles.legendSection}>
                        <p style={styles.legendSub}>Origen</p>
                        <div style={styles.legendItem}><span style={{...styles.colorBox, border:'2px solid #000', background:'none'}}></span> Actividad Interna</div>
                        <div style={styles.legendItem}>🌐 Evento Global</div>
                    </div>
                </div>
            </div>

            {selectedEvent && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={{...styles.modalHeader, backgroundColor: selectedEvent.color || '#1b3a57'}}>
                            <h3 style={styles.modalTitle}>{selectedEvent.title}</h3>
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
                                <strong>⏱️ Horario Operativo (UTC):</strong> 
                                <span>{new Date(selectedEvent.start).toISOString().slice(0, 16).replace('T', ' ')} hs</span>
                            </div>
                            <hr style={styles.divider} />
                            
                            <div style={styles.notesBox}>
                                <strong>📝 Detalle de la Misión:</strong>
                                <p style={styles.notesText}>{selectedEvent.notes || 'Sin observaciones.'}</p>
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={closeModal} style={styles.btnOk}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    pageContainer: { padding: '10px', backgroundColor: '#f4f7f6', minHeight: '100vh' },
    layout: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    mainCard: { flex: '1 1 800px', background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
    legendCard: { flex: '1 1 200px', background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', height: 'fit-content' },
    legendTitle: { margin: '0 0 10px 0', fontSize: '0.9rem', borderBottom: '2px solid #1b3a57', color: '#1b3a57', paddingBottom: '5px' },
    legendSection: { marginBottom: '15px' },
    legendSub: { fontSize: '0.75rem', fontWeight: 'bold', color: '#666', margin: '5px 0' },
    legendItem: { fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
    colorBox: { width: '12px', height: '12px', borderRadius: '2px' },
    headerMonitor: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    title: { color: '#1b3a57', margin: 0, fontSize: '1.2rem', fontWeight: 'bold' },
    unidadBadge: { fontSize: '0.75rem', background: '#e9ecef', color: '#1b3a57', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' },
    modeBadge: { fontSize: '0.75rem', background: '#1b3a57', color: 'white', padding: '4px 10px', borderRadius: '4px' },
    etapaBanner: { padding: '8px', borderRadius: '6px', color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: '0.8rem', marginBottom: '15px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
    modalContent: { background: 'white', borderRadius: '12px', width: '95%', maxWidth: '500px', overflow: 'hidden' },
    modalHeader: { padding: '15px', color: 'white', display: 'flex', justifyContent: 'space-between' },
    modalTitle: { margin: 0, fontSize: '1rem' },
    btnClose: { background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' },
    modalBody: { padding: '20px' },
    infoRow: { display: 'flex', flexDirection: 'column', fontSize: '0.9rem' },
    divider: { border: 'none', borderBottom: '1px solid #eee', margin: '10px 0' },
    sdaContainer: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' },
    sdaBadge: { background: '#f1f4f8', color: '#1b3a57', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', border: '1px solid #d1d9e6' },
    notesBox: { marginTop: '10px' },
    notesText: { background: '#f8f9fa', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', whiteSpace: 'pre-line' },
    modalFooter: { padding: '10px', textAlign: 'right' },
    btnOk: { background: '#1b3a57', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer' }
};

export default CalendarPage;