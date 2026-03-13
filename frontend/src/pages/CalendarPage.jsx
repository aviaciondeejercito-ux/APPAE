import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { getEvents } from '../services/EventService';

const CalendarPage = () => {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await getEvents();
                // Adaptamos los datos de MongoDB al formato de FullCalendar
                const formattedEvents = data.map(ev => ({
                    id: ev._id,
                    title: ev.title,
                    start: ev.start,
                    end: ev.end,
                    backgroundColor: ev.color || '#1b3a57'
                }));
                setEvents(formattedEvents);
            } catch (error) {
                console.error("Error cargando el calendario");
            }
        };
        fetchEvents();
    }, []);

    return (
        <div className="calendar-container" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale={esLocale}
                events={events}
                height="75vh"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek'
                }}
            />
        </div>
    );
};

export default CalendarPage;