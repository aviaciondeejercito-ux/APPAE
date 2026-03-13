import React, { useState } from 'react';
import { login } from '../services/api';

const Login = ({ setAuth }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await login(form);
      localStorage.setItem('token', data.token); // Guardamos el JWT
      localStorage.setItem('role', data.role);   // Guardamos el rol para seguridad
      setAuth(true);
      window.location.href = '/'; // Redirigir al calendario
    } catch (err) {
      setError('Credenciales inválidas. Acceso denegado.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
      <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
        <h2>Sistema AE - Ingreso</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <input 
          type="text" placeholder="Usuario" 
          onChange={(e) => setForm({ ...form, username: e.target.value })} 
          style={{ display: 'block', marginBottom: '10px', width: '100%' }}
        />
        <input 
          type="password" placeholder="Contraseña" 
          onChange={(e) => setForm({ ...form, password: e.target.value })} 
          style={{ display: 'block', marginBottom: '10px', width: '100%' }}
        />
        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none' }}>
          Entrar
        </button>
      </form>
    </div>
  );
};

export default Login;