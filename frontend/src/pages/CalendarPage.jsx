import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import esLocale from '@fullcalendar/core/locales/es';
import { getEvents } from '../services/EventService';

const CalendarPage = () => {
    const [events, setEvents] = useState([]);
    const [role] = useState(localStorage.getItem('role') || 'guest');
    const [userUnidad] = useState(localStorage.getItem('elemento')?.toUpperCase() || ''); 
    const [selectedEvent, setSelectedEvent] = useState(null); 
    const [isMobile] = useState(window.innerWidth < 768);

    useEffect(() => { 
        fetchData(); 
    }, []);

    const fetchData = async () => {
        try {
            const data = await getEvents();
            
            const filteredData = (role === 'admin' || role === 'OTO') 
                ? data 
                : data.filter(ev => {
                    const evElemento = ev.elemento ? String(ev.elemento).toUpperCase() : '';
                    const evCreador = ev.creadorUnidad ? String(ev.creadorUnidad).toUpperCase() : '';
                    const unidadUsuario = userUnidad.toUpperCase();
                    const etapa = ev.etapa ? String(ev.etapa).toLowerCase() : '';

                    // Lógica existente
                    const soyDueño = evElemento === unidadUsuario || evCreador === unidadUsuario;
                    const soyInvolucradoOrdenado = evElemento.includes(unidadUsuario) && etapa === 'ordenada';

                    let visibilidadGlobal = false;
                    if (ev.esGlobal) {
                        if (unidadUsuario === 'DIR AE') {
                            visibilidadGlobal = evElemento.includes('DIR AE');
                        } else {
                            visibilidadGlobal = (evCreador.includes('DIR AE') || evElemento.includes('DIR AE')) && etapa === 'ordenada';
                        }
                    }

                    // NUEVA LÓGICA: BOSS y DIRECTOR
                    let visibilidadJerarquia = false;
                    if (role === 'BOSS' || role === 'DIRECTOR'|| role === 'OTO') {
                        // 1. Ver elementos GLOBALES en estado ORDENADO
                        const globalOrdenado = ev.esGlobal && etapa === 'ordenada';
                        
                        // 2. Ver eventos creados por usuarios de DIR AE (internos) en cualquier estado
                        const creadoPorDirAe = evCreador === 'DIR AE';

                        visibilidadJerarquia = globalOrdenado || creadoPorDirAe;
                    }

                    return soyDueño || soyInvolucradoOrdenado || visibilidadGlobal || visibilidadJerarquia;
                });

            setEvents(Array.isArray(filteredData) ? filteredData : []);
        } catch (error) { 
            console.error("❌ ERROR CRÍTICO:", error); 
        }
    };

    const getEventColor = (tipo) => {
        if (!tipo) return '#6c757d';
        const t = tipo.toUpperCase();
        if (t.includes('SOSTENIMIENTO')) return '#007bff';
        if (t.includes('FUERZA OPERATIVA')) return '#28a745';
        if (t.includes('EDUCACION') || t.includes('EDUCACIÓN')) return '#800000';
        return '#6c757d'; 
    };

    const handleEventClick = (info) => {
        const { event } = info;
        let cleanNotes = event.extendedProps.notes || '';
        const sdas = event.extendedProps.sdaListado || [];
        
        sdas.forEach(sda => {
            const regex = new RegExp(`SDA:\\s*${sda}`, 'gi');
            cleanNotes = cleanNotes.replace(regex, '').replace(/\|\s*\|/g, '|').trim();
        });

        setSelectedEvent({
            id: event.id,
            title: event.title.replace(/^[🟡🔵🟢🌐 ]+/, ''), 
            start: event.start,
            end: event.end,
            color: event.backgroundColor,
            notes: cleanNotes,
            user: event.extendedProps.user,
            creadorUnidad: event.extendedProps.creadorUnidad,
            origen: event.extendedProps.tipoOrigen,
            elemento: event.extendedProps.elemento,
            etapa: event.extendedProps.etapa,
            tipoApoyo: event.extendedProps.tipoApoyo,
            esGlobal: event.extendedProps.esGlobal,
            sdaListado: sdas,
            unidadApoyada: event.extendedProps.unidadApoyada,
            pntoContactoNom: event.extendedProps.pntoContactoNom,
            pntoContactoTel: event.extendedProps.pntoContactoTel,
            responsableNom: event.extendedProps.responsableNom,
            responsableTel: event.extendedProps.responsableTel
        });
    };

    const closeModal = () => setSelectedEvent(null);

    const eventDidMount = (info) => {
        const { elemento, esGlobal, tipoOrigen, etapa } = info.event.extendedProps;
        const backgroundColor = info.event.backgroundColor;
        info.el.style.backgroundColor = backgroundColor;
        const isWhite = backgroundColor.toLowerCase() === '#ffffff' || backgroundColor === 'rgb(255, 255, 255)';
        const textElements = info.el.querySelectorAll('.fc-event-title, .fc-event-time');
        
        textElements.forEach(el => {
            el.style.color = isWhite ? '#000000' : '#ffffff';
            el.style.fontWeight = 'bold';
        });

        if (isWhite) info.el.style.border = '1px solid #ddd';

        const evElemento = elemento ? String(elemento).toUpperCase() : '';
        if (evElemento === userUnidad && !esGlobal && tipoOrigen !== 'COMANDO') {
            info.el.style.border = '2px solid #000000';
        }

        if (etapa === 'recepcion') {
            info.el.style.borderStyle = 'dashed';
            info.el.style.borderWidth = '2px';
            info.el.style.borderColor = '#333';
        }
    };

    const getEtapaLabel = (etapa) => {
        const etiquetas = {
            'recepcion': { text: '🟡 RECEPCIÓN / SOLICITUD', color: '#f39c12' },
            'revision': { text: '🔵 EN REVISIÓN (DIR AE)', color: '#3498db' },
            'ordenada': { text: '🟢 ORDENADA / CONFIRMADA', color: '#27ae60' }
        };
        return etiquetas[etapa] || { text: 'ESTADO INDEFINIDO', color: '#6c757d' };
    };

    const styles = {
        pageContainer: { padding: '15px', backgroundColor: '#f4f7f6', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '15px' },
        mainCard: { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', flex: 1, overflow: 'hidden' },
        headerMonitor: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
        title: { color: '#1b3a57', margin: 0, fontSize: '1.2rem', fontWeight: 'bold' },
        unidadBadge: { fontSize: '0.75rem', background: '#e9ecef', color: '#1b3a57', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #1b3a57' },
        modeBadge: { fontSize: '0.75rem', background: '#1b3a57', color: 'white', padding: '4px 10px', borderRadius: '4px' },
        legendBar: { background: '#fff', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' },
        legendGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
        legendGroupTitle: { fontSize: '0.7rem', fontWeight: 'bold', color: '#1b3a57', textTransform: 'uppercase' },
        legendItem: { fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px', color: '#444' },
        colorBox: { width: '12px', height: '12px', borderRadius: '2px' },
        borderSample: { width: '15px', height: '0px', borderBottom: '2px solid #000' },
        dashedSample: { width: '15px', height: '0px', borderBottom: '2px dashed #333' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
        modalContent: { background: 'white', borderRadius: '12px', width: '95%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
        modalHeader: { padding: '15px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        modalTitle: { margin: 0, fontSize: '1rem' },
        btnClose: { background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' },
        modalBody: { padding: '15px' },
        etapaBanner: { padding: '6px', borderRadius: '4px', color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: '0.8rem', marginBottom: '12px' },
        infoRow: { display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '0.85rem', marginBottom: '8px' },
        divider: { border: 'none', borderBottom: '1px solid #eee', margin: '10px 0' },
        sdaContainer: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' },
        sdaBadge: { background: '#f1f4f8', color: '#1b3a57', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', border: '1px solid #d1d9e6' },
        notesBox: { marginTop: '8px' },
        notesText: { background: '#f8f9fa', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', color: '#333', whiteSpace: 'pre-line' },
        modalFooter: { padding: '12px', textAlign: 'right', borderTop: '1px solid #eee' },
        btnOk: { background: '#1b3a57', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }
    };

    return (
        <div style={styles.pageContainer}>
            <div style={styles.mainCard}>
                <div style={styles.headerMonitor}>
                    <h2 style={styles.title}>🗓️ Monitor de Actividades Operativas</h2>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={styles.unidadBadge}>{userUnidad || "SIN UNIDAD"}</span>
                        <span style={styles.modeBadge}>
                            {role === 'admin' ? 'JERARQUÍA: CONTROL TOTAL' : `JERARQUÍA: ${role.toUpperCase()}`}
                        </span>
                    </div>
                </div>
                
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView={isMobile ? "timeGridDay" : "dayGridMonth"}
                    locale={esLocale}
                    events={events.map(ev => {
                        const colorBase = getEventColor(ev.tipoApoyo);
                        let prefix = '';
                        if (ev.etapa === 'recepcion') prefix = '🟡 ';
                        if (ev.etapa === 'revision') prefix = '🔵 ';
                        if (ev.etapa === 'ordenada') prefix = '🟢 ';
                        if (ev.esGlobal) prefix += '🌐 ';

                        return {
                            id: ev._id,
                            title: `${prefix}${ev.title}`,
                            start: ev.start,
                            end: ev.end,
                            backgroundColor: colorBase, 
                            borderColor: colorBase,
                            extendedProps: { 
                                notes: ev.notes, 
                                user: ev.userName,
                                creadorUnidad: ev.creadorUnidad,
                                tipoOrigen: ev.tipoOrigen,
                                elemento: ev.elemento,
                                esGlobal: ev.esGlobal,
                                etapa: ev.etapa,
                                tipoApoyo: ev.tipoApoyo,
                                sdaListado: ev.sdaListado,
                                unidadApoyada: ev.unidadApoyada,
                                pntoContactoNom: ev.pntoContactoNom,
                                pntoContactoTel: ev.pntoContactoTel,
                                responsableNom: ev.responsableNom,
                                responsableTel: ev.responsableTel
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

            <div style={styles.legendBar}>
                <div style={styles.legendGroup}>
                    <span style={styles.legendGroupTitle}>Misiones (Colores):</span>
                    <div style={styles.legendItem}><span style={{...styles.colorBox, background:'#007bff'}}></span> Sostenimiento</div>
                    <div style={styles.legendItem}><span style={{...styles.colorBox, background:'#28a745'}}></span> Fza. Operativa</div>
                    <div style={styles.legendItem}><span style={{...styles.colorBox, background:'#800000'}}></span> Educación</div>
                </div>
                <div style={styles.legendGroup}>
                    <span style={styles.legendGroupTitle}>Estados:</span>
                    <div style={styles.legendItem}>🟡 Solicitud</div>
                    <div style={styles.legendItem}>🔵 Revisión</div>
                    <div style={styles.legendItem}>🟢 Ordenada</div>
                    <div style={styles.legendItem}>🌐 Global</div>
                </div>
                <div style={styles.legendGroup}>
                    <span style={styles.legendGroupTitle}>Ayudas Visuales:</span>
                    <div style={styles.legendItem}><div style={styles.borderSample}></div> Propio</div>
                    <div style={styles.legendItem}><div style={styles.dashedSample}></div> Borrador/Rec.</div>
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

                            <div style={styles.infoRow}>
                                <strong>✍️ Creado por:</strong> 
                                <span>{selectedEvent.creadorUnidad || 'N/C'} ({selectedEvent.user || 'Usuario'})</span>
                            </div>

                            {selectedEvent.unidadApoyada && (
                                <div style={styles.infoRow}>
                                    <strong>🤝 Unidad/Entidad Apoyada:</strong> 
                                    <span>{selectedEvent.unidadApoyada}</span>
                                </div>
                            )}

                            <hr style={styles.divider} />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={styles.infoRow}>
                                    <strong>👤 Responsable:</strong>
                                    <span>{selectedEvent.responsableNom || 'N/C'}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#666' }}>{selectedEvent.responsableTel}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <strong>📞 Punto Contacto:</strong>
                                    <span>{selectedEvent.pntoContactoNom || 'N/C'}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#666' }}>{selectedEvent.pntoContactoTel}</span>
                                </div>
                            </div>

                            <hr style={styles.divider} />

                            <div style={styles.infoRow}>
                                <strong>🚀 Tipo de Apoyo / SdA:</strong> 
                                <span>{selectedEvent.tipoApoyo || 'No especificado'}</span>
                                {selectedEvent.sdaListado?.length > 0 && (
                                    <div style={styles.sdaContainer}>
                                        {selectedEvent.sdaListado.map((sda, idx) => (
                                            <span key={idx} style={styles.sdaBadge}>⚙️ {sda}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={styles.infoRow}>
                                <strong>⏱️ Horario de Operación (UTC):</strong> 
                                <span>{new Date(selectedEvent.start).toISOString().slice(0, 16).replace('T', ' ')} hs</span>
                            </div>

                            <hr style={styles.divider} />

                            <div style={styles.notesBox}>
                                <strong>📝 Detalle de la Misión:</strong>
                                <p style={styles.notesText}>{selectedEvent.notes || 'Sin observaciones adicionales.'}</p>
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

export default CalendarPage;