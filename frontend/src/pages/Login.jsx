import React, { useState, useEffect } from 'react';
import { login, API } from '../services/api';
import { APP_VERSION } from '../version';

// Importación de escudos/logos de las unidades y elementos
import logoBAvApyComb601 from '../assets/B AV APY COMB 601.png';
import logoBHelicAsal601 from '../assets/B HELIC ASAL 601.png';
import logoDirAE from '../assets/DIR AE.png';
import logoECAE from '../assets/EC AE.png';
import logoEscAvExplAtq602 from '../assets/ESC AV EXPL ATQ 602.png';
import logoSecAE9 from '../assets/SEC AE 9.png';
import logoSecAE11 from '../assets/SEC AE 11.png';
import logoSecAEDR from '../assets/SEC AE DR.png';
import logoSecAEM5 from '../assets/SEC AE M 5.png';
import logoSecAEM6 from '../assets/SEC AE M 6.png';
import logoSecAEM8 from '../assets/SEC AE M 8.png';
import logoSecAEMTE3 from '../assets/SEC AE MTE 3.png';
import logoSecAEMTE12 from '../assets/SEC AE MTE 12.png';

// Mapa asociativo de logos por nombre exacto de unidad (sin AEOOEE)
const mapaLogos = {
  "DIR AE": logoDirAE,
  "B AV APY COMB 601": logoBAvApyComb601,
  "B HELIC ASAL 601": logoBHelicAsal601,
  "ESC AV EXPL ATQ 602": logoEscAvExplAtq602,
  "EC AE": logoECAE,
  "SEC AE 9": logoSecAE9,
  "SEC AE 11": logoSecAE11,
  "SEC AE DR": logoSecAEDR,
  "SEC AE M 5": logoSecAEM5,
  "SEC AE M 6": logoSecAEM6,
  "SEC AE M 8": logoSecAEM8,
  "SEC AE MTE 3": logoSecAEMTE3,
  "SEC AE MTE 12": logoSecAEMTE12
};

const listaLogos = Object.entries(mapaLogos).map(([name, src]) => ({ name, src }));

const Login = ({ setAuth }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para el control de versión
  const [serverVersion, setServerVersion] = useState(null);
  const [isOutdated, setIsOutdated] = useState(false);

  // Estado para la animación de ingreso del escudo de la Unidad
  const [detectedLogo, setDetectedLogo] = useState(null);
  const [animateLogo, setAnimateLogo] = useState(false);

  useEffect(() => {
    verificarVersion();
  }, []);

  const verificarVersion = async () => {
    try {
      const response = await API.get('/system/version');
      const latestVer = response.data?.version;

      if (latestVer) {
        setServerVersion(latestVer);
        if (latestVer !== APP_VERSION) {
          setIsOutdated(true);
        }
      }
    } catch (err) {
      console.warn("No se pudo verificar la versión del servidor:", err);
    }
  };

  const handleForceReload = () => {
    window.location.reload(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(form);
      const userData = response.data;

      const token = userData.token;
      const userRole = userData.role;
      const userElemento = userData.elemento ? userData.elemento.toUpperCase().trim() : '';
      const displayName = userData.nombreReal || userData.username;

      if (!token || !userRole) {
        throw new Error('Respuesta del servidor incompleta (Falta Token o Rol)');
      }

      // Guardar credenciales en Storage
      localStorage.setItem('token', token);
      localStorage.setItem('role', userRole);
      localStorage.setItem('username', displayName); 
      localStorage.setItem('app_version', APP_VERSION);
      
      if (userElemento) {
        localStorage.setItem('elemento', userElemento);
      } else if (userRole === 'admin') {
        localStorage.setItem('elemento', 'SECCIÓN AVIACIÓN EJÉRCITO');
      }

      // 🎯 ANIMACIÓN DE ENTRADA DEL ESCUDO DE LA UNIDAD
      const logoEncontrado = mapaLogos[userElemento] || logoDirAE;
      setDetectedLogo(logoEncontrado);
      
      setTimeout(() => {
        setAnimateLogo(true);
      }, 50);

      setTimeout(() => {
        setAuth(true);
      }, 1300);

    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Error de conexión con el servidor';
      setError(message);
      console.error("Fallo en inicio de sesión AE:", err);
      setLoading(false);
    }
  };

  return (
    <div style={styles.loginPage}>
      <style>
        {`
          @keyframes zoomInCenter {
            0% {
              opacity: 0;
              transform: translate(-50%, -150%) scale(0.3);
            }
            60% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.35);
            }
            100% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.1);
            }
          }
          .logo-animated-active {
            animation: zoomInCenter 1.1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }
        `}
      </style>

      {/* --- CORTINA OVERLAY / ANIMACIÓN DEL ESCUDO AL INGRESAR --- */}
      {detectedLogo && (
        <div style={{
          ...styles.animOverlay,
          opacity: animateLogo ? 1 : 0,
          pointerEvents: 'none'
        }}>
          <div 
            className={animateLogo ? 'logo-animated-active' : ''} 
            style={styles.centerLogoWrapper}
          >
            <img src={detectedLogo} alt="Unidad Detectada" style={styles.centerLogoImg} />
            <span style={styles.welcomeText}>¡Bienvenido!</span>
          </div>
        </div>
      )}

      {/* --- FAJA SUPERIOR DE LOGOS DE UNIDADES --- */}
      <div style={styles.topHeaderLogos}>
        {listaLogos.map((item, index) => (
          <div key={index} style={styles.topLogoBadge} title={item.name}>
            <img src={item.src} alt={item.name} style={styles.topLogoImg} />
          </div>
        ))}
      </div>

      {/* --- TARJETA DE LOGIN --- */}
      <div style={styles.loginCard}>
        <div style={{ marginBottom: '25px' }}>
            <h2 style={{ margin: '0', color: '#1b3a57', fontSize: '1.8rem', letterSpacing: '1px' }}>Sistema AE</h2>
            <p style={{ color: '#6c757d', fontSize: '0.9rem', marginTop: '8px' }}>Gestión de Operaciones de Vuelo</p>
        </div>

        {/* --- BANNER / ALERTA DE VERSIÓN OBSOLETA --- */}
        {isOutdated && (
          <div style={styles.outdatedAlert}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              ⚠️ ¡Nueva versión disponible ({serverVersion})!
            </div>
            <div>Por favor, <strong>presione F5</strong> o haga clic aquí para recargar el sistema:</div>
            <button onClick={handleForceReload} style={styles.btnReload}>
              🔄 Recargar Aplicación
            </button>
          </div>
        )}
        
        {error && (
          <div style={styles.errorAlert}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ textAlign: 'left', marginBottom: '18px' }}>
            <label style={styles.fieldLabel}>Usuario</label>
            <input 
                type="text" 
                placeholder="Nombre y Apellido" 
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} 
                style={styles.input}
                disabled={loading}
            />
          </div>

          <div style={{ textAlign: 'left', marginBottom: '28px' }}>
            <label style={styles.fieldLabel}>Contraseña</label>
            <input 
                type="password" 
                placeholder="••••••••" 
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
                style={styles.input}
                disabled={loading}
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
            {loading ? 'Identificando Unidad...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
      
      {/* Footer con versión actual del cliente */}
      <p style={styles.footerText}>
        © 2026 Aviación de Ejército | <span style={{ fontWeight: 'bold' }}>v{APP_VERSION}</span><br/>
        <span style={{ fontWeight: '600' }}>Acceso restringido - Uso Profesional</span>
      </p>
    </div>
  );
};

const styles = {
    loginPage: { 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f4f7f6',
      padding: '20px 0',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden'
    },
    topHeaderLogos: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      maxWidth: '90vw',
      overflow: 'hidden',
      marginBottom: '25px',
      padding: '10px 15px',
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
      backdropFilter: 'blur(5px)'
    },
    topLogoBadge: {
      width: '42px',
      height: '42px',
      borderRadius: '8px',
      backgroundColor: '#ffffff',
      border: '1px solid #e1e8ed',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px',
      boxSizing: 'border-box',
      flexShrink: 0,
      transition: 'transform 0.2s',
      cursor: 'default'
    },
    topLogoImg: {
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain'
    },
    loginCard: { 
      width: '360px',
      padding: '35px 30px', 
      borderRadius: '15px',
      boxShadow: '0 10px 35px rgba(0,0,0,0.12)',
      backgroundColor: '#fff',
      textAlign: 'center',
      zIndex: 1
    },
    fieldLabel: { fontSize: '0.8rem', fontWeight: 'bold', color: '#495057', marginLeft: '5px' },
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
    },
    outdatedAlert: { 
      color: '#721c24', 
      backgroundColor: '#f8d7da', 
      padding: '12px', 
      borderRadius: '10px',
      marginBottom: '20px',
      fontSize: '12px',
      border: '1px solid #f5c6cb',
      textAlign: 'center'
    },
    btnReload: {
      marginTop: '8px',
      backgroundColor: '#721c24',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '6px',
      fontWeight: 'bold',
      cursor: 'pointer',
      fontSize: '11px'
    },
    errorAlert: { 
      color: '#721c24', 
      backgroundColor: '#f8d7da', 
      padding: '12px', 
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '13px',
      border: '1px solid #f5c6cb',
      textAlign: 'left'
    },
    footerText: { marginTop: '20px', color: '#adb5bd', fontSize: '12px', textAlign: 'center', lineHeight: '1.6', zIndex: 1 },

    animOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(27, 58, 87, 0.88)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 0.4s ease'
    },
    centerLogoWrapper: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '15px'
    },
    centerLogoImg: {
      width: '140px',
      height: '140px',
      objectFit: 'contain',
      filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))'
    },
    welcomeText: {
      color: 'white',
      fontSize: '1.5rem',
      fontWeight: 'bold',
      letterSpacing: '2px',
      textShadow: '0 2px 10px rgba(0,0,0,0.5)'
    }
};

export default Login;