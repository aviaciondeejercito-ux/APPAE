import React, { useEffect, useState } from 'react';
import { syncPendingData } from '../services/EventService';

const NetworkManager = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);
            // Al volver la conexión, procesa la cola de EventService
            await syncPendingData();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div style={{
            position: 'fixed', bottom: '10px', left: '10px', zIndex: 10000,
            background: '#c0392b', color: 'white', padding: '8px 15px',
            borderRadius: '5px', fontWeight: 'bold', fontSize: '12px'
        }}>
            ⚠️ MODO OFFLINE ACTIVADO - CARGAS EN PENDIENTE
        </div>
    );
};

export default NetworkManager;