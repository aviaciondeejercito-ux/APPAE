import React, { useState } from 'react';
import { login } from '../services/api';

/**
 * COMPONENTE DE LOGIN - SISTEMA GESTIÓN AE
 * Maneja el ingreso para Admin, Boss y Users.
 */
const Login = ({ setAuth }) => {
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
      
      /**
       * ESTÁNDAR DE SEGURIDAD Y PERSISTENCIA
       * Verificamos la estructura de 'data' para asegurar que el rol se guarde correctamente.
       * El Calendario depende de que 'role' no sea undefined.
       */
      const token = data.token;
      const userRole = data.role || (data.user && data.user.role);
      const userName = data.username || (data.user && data.user.username);

      if (!token || !userRole) {
        throw new Error('Respuesta del servidor incompleta (Falta Token o Rol)');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('role', userRole);
      localStorage.setItem('username', userName || 'Usuario'); 

      // Cambiamos el estado de autenticación en App.jsx
      setAuth(true);
      
    } catch (err) {
      // Capturamos el mensaje específico del backend o del error de validación manual
      const message = err.response?.data?.message || err.message || 'Error de conexión con el servidor';
      setError(message);
      console.error("Fallo en inicio de sesión:", err);
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
      height: '100vh',
      backgroundColor: '#f4f7f6'
    }}>
      <div style={{ 
        width: '350px',
        padding: '35px', 
        borderRadius: '15px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        backgroundColor: '#fff',
        textAlign: 'center'
      }}>
        {/* Identidad del Sistema */}
        <div style={{ marginBottom: '25px' }}>
            <h2 style={{ margin: '0', color: '#1b3a57', fontSize: '1.8rem' }}>Sistema AE</h2>
            <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '5px' }}>Gestión Operativa de Actividades</p>
        </div>
        
        {error && (
          <div style={{ 
            color: '#721c24', 
            backgroundColor: '#f8d7da', 
            padding: '12px', 
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            border: '1px solid #f5c6cb'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ textAlign: 'left', marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#555' }}>Identificación</label>
            <input 
                type="text" 
                placeholder="Usuario o Email" 
                required
                onChange={(e) => setForm({ ...form, username: e.target.value })} 
                style={styles.input}
            />
          </div>

          <div style={{ textAlign: 'left', marginBottom: '25px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#555' }}>Contraseña</label>
            <input 
                type="password" 
                placeholder="••••••••" 
                required
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
                style={styles.input}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              ...styles.button,
              backgroundColor: loading ? '#6c757d' : '#1b3a57', 
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verificando Credenciales...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
      <p style={{ marginTop: '30px', color: '#888', fontSize: '11px', textAlign: 'center', lineHeight: '1.5' }}>
        © 2026 Aviación de Ejército<br/>
        Acceso restringido - Uso Profesional
      </p>
    </div>
  );
};

const styles = {
    input: {
        display: 'block', 
        marginTop: '5px',
        width: '100%', 
        padding: '12px',
        boxSizing: 'border-box',
        borderRadius: '8px',
        border: '1px solid #ccc',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.3s'
    },
    button: {
        width: '100%', 
        padding: '14px', 
        color: 'white', 
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: '1rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        transition: 'all 0.3s'
    }
};

export default Login;