import React from 'react';
import CalendarPage from './pages/CalendarPage';
import './App.css'; // Si no tienes este archivo, puedes crearlo vacío o ignorar la línea

function App() {
  return (
    <div className="App" style={{ minHeight: '100vh', backgroundColor: '#f4f7f6' }}>
      <header style={{ 
        backgroundColor: '#1b3a57', 
        padding: '20px', 
        color: 'white', 
        textAlign: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0 }}>Sistema de Gestión - Aviación de Ejército</h1>
      </header>
      
      <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <CalendarPage />
      </main>
    </div>
  );
}

export default App;