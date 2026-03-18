import React, { useState } from 'react';
import { login } from '../services/api';

/**
 * COMPONENTE DE LOGIN - SISTEMA GESTIÓN AE
 * Actualizado: Acceso mediante Usuario (Nombre y Apellido) y Contraseña.
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
      // 'username' aquí transporta el Nombre Real o Email ingresado
      const response = await login(form);
      
      // Axios guarda la respuesta del servidor en .data
      const userData = response.data;

      /**
       * ESTÁNDAR DE SEGURIDAD Y PERSISTENCIA
       * Extraemos los datos según la respuesta del authController (id, nombreReal, role, token)
       */
      const token = userData.token;
      const userRole = userData.role;
      const displayName = userData.nombreReal || userData.username;

      if (!token || !userRole) {
        throw new Error('Respuesta del servidor incompleta (Falta Token o Rol)');
      }

      // Guardamos en el almacenamiento local para persistir la sesión
      localStorage.setItem('token', token);
      localStorage.setItem('role', userRole);
      localStorage.setItem('username', displayName); 

      // Notificamos a App.jsx que el usuario está autenticado
      setAuth(true);
      
    } catch (err) {
      // Capturamos el mensaje de error del backend (401, 400, 500)
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
        padding: '40px', 
        borderRadius: '15px',
        boxShadow: '0 10px 35px rgba(0,0,0,0.12)',
        backgroundColor: '#fff',
        textAlign: 'center'
      }}>
        {/* Identidad del Sistema */}
        <div style={{ marginBottom: '30px' }}>
            <h2 style={{ margin: '0', color: '#1b3a57', fontSize: '1.8rem', letterSpacing: '1px' }}>Sistema AE</h2>
            <p style={{ color: '#6c757d', fontSize: '0.9rem', marginTop: '8px' }}>Gestión Operativa de Actividades</p>
        </div>
        
        {error && (
          <div style={{ 
            color: '#721c24', 
            backgroundColor: '#f8d7da', 
            padding: '12px', 
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            border: '1px solid #f5c6cb',
            textAlign: 'left'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ textAlign: 'left', marginBottom: '18px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#495057', marginLeft: '5px' }}>Usuario</label>
            <input 
                type="text" 
                placeholder="Nombre y Apellido" 
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} 
                style={styles.input}
            />
          </div>

          <div style={{ textAlign: 'left', marginBottom: '28px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#495057', marginLeft: '5px' }}>Contraseña</label>
            <input 
                type="password" 
                placeholder="••••••••" 
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
                style={styles.input}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              ...styles.button,
              backgroundColor: loading ? '#adb5bd' : '#1b3a57', 
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Verificando Credenciales...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
      
      <p style={{ marginTop: '30px', color: '#adb5bd', fontSize: '12px', textAlign: 'center', lineHeight: '1.6' }}>
        © 2026 Aviación de Ejército<br/>
        <span style={{ fontWeight: '600' }}>Acceso restringido - Uso Profesional</span>
      </p>
    </div>
  );
};

const styles = {
    input: {
        display: 'block', 
        marginTop: '6px',
        width: '100%', 
        padding: '14px',
        boxSizing: 'border-box',
        borderRadius: '10px',
        border: '1px solid #dee2e6',
        fontSize: '1rem',
        outline: 'none',
        backgroundColor: '#fcfcfc',
        transition: 'all 0.2s ease-in-out'
    },
    button: {
        width: '100%', 
        padding: '16px', 
        color: 'white', 
        border: 'none',
        borderRadius: '10px',
        fontWeight: 'bold',
        fontSize: '1rem',
        boxShadow: '0 4px 12px rgba(27, 58, 87, 0.2)',
        transition: 'background-color 0.3s'
    }
};

export default Login;