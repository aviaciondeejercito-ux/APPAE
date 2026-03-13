import React, { useState } from 'react';
import { login } from '../services/api';

/**
 * COMPONENTE DE LOGIN - SISTEMA GESTIÓN AE
 * Maneja el ingreso para Admin, Boss y Users.
 */
const Login = ({ setAuth }) => {
  // El estado 'form' usa 'username', compatible con el modo híbrido del backend
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Enviamos el formulario al servicio API
      const { data } = await login(form);
      
      // ESTÁNDAR DE SEGURIDAD: Almacenamiento de sesión
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('username', data.username); // Guardamos el nombre para el encabezado

      setAuth(true);
      // En lugar de window.location.href, dejamos que el estado de App.jsx
      // renderice el componente correspondiente inmediatamente.
    } catch (err) {
      // Capturamos el mensaje específico del backend (401, 400, etc.)
      const message = err.response?.data?.message || 'Error de conexión con el servidor';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center',
      height: '80vh' 
    }}>
      <div style={{ 
        width: '350px',
        padding: '30px', 
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        backgroundColor: '#fff',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Sistema AE - Ingreso</h2>
        
        {error && (
          <div style={{ 
            color: '#721c24', 
            backgroundColor: '#f8d7da', 
            padding: '10px', 
            borderRadius: '5px',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="Usuario o Email" 
            required
            onChange={(e) => setForm({ ...form, username: e.target.value })} 
            style={{ 
              display: 'block', 
              marginBottom: '15px', 
              width: '100%', 
              padding: '12px',
              boxSizing: 'border-box',
              borderRadius: '5px',
              border: '1px solid #ddd'
            }}
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            required
            onChange={(e) => setForm({ ...form, password: e.target.value })} 
            style={{ 
              display: 'block', 
              marginBottom: '20px', 
              width: '100%', 
              padding: '12px',
              boxSizing: 'border-box',
              borderRadius: '5px',
              border: '1px solid #ddd'
            }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: loading ? '#6c757d' : '#007bff', 
              color: 'white', 
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              transition: 'background-color 0.3s'
            }}
          >
            {loading ? 'Validando...' : 'Entrar'}
          </button>
        </form>
      </div>
      <p style={{ marginTop: '20px', color: '#666', fontSize: '12px' }}>
        © 2026 Aviación de Ejército - Sistema de Control de Actividades
      </p>
    </div>
  );
};

export default Login;