const https = require('https');

const url = 'https://appae.onrender.com/api/health';
console.log(`🔍 Iniciando diagnóstico de conexión hacia: ${url}\n`);

const start = Date.now();

const req = https.get(url, (res) => {
    const time = Date.now() - start;
    console.log(`✅ ¡Respuesta recibida en ${time}ms!`);
    console.log(`👉 Código de estado HTTP: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('\n📄 Cuerpo de la respuesta:');
        console.log(data);
    });
});

// Monitorear cada paso de la red
req.on('socket', (socket) => {
    socket.on('lookup', (err, address, family, host) => {
        console.log(`[1] 🌐 DNS Resuelto: ${host} apunta a la IP ${address}`);
    });
    socket.on('connect', () => {
        console.log(`[2] ⚡ Conexión TCP establecida con los servidores de Render.`);
        console.log(`[3] ⏳ Esperando que tu aplicación Node.js responda...`);
    });
});

req.on('error', (e) => {
    console.error(`\n❌ ERROR DE RED O CONEXIÓN: ${e.message}`);
});

// Límite de tiempo de 20 segundos
req.setTimeout(20000, () => {
    console.error('\n⏱️ TIMEOUT: El servidor de Render recibió la conexión, pero tu app nunca respondió después de 20 segundos.');
    req.destroy();
});