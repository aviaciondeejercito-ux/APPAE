import React, { useState, useEffect } from 'react';

const StatusIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(localStorage.getItem('lastSync') || 'Nunca');

  useEffect(() => {
    const handleStatusChange = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        const now = new Date().toLocaleString('es-AR', { 
          hour: '2-digit', 
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        });
        setLastSync(now);
        localStorage.setItem('lastSync', now);
      }
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '5px 10px',
      fontSize: '11px',
      color: '#555',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: isOnline ? '#4caf50' : '#f44336',
        boxShadow: isOnline ? '0 0 5px #4caf50' : '0 0 5px #f44336'
      }} />
      <span>{isOnline ? 'En línea' : 'Modo Offline'}</span>
      <span style={{ color: '#999' }}>| Act: {lastSync}</span>
    </div>
  );
};

export default StatusIndicator;