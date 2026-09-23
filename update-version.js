// update-version.js
const fs = require('fs');
const path = require('path');

// 💡 Se agrega 'frontend' al path para apuntar a la carpeta correcta
const versionFilePath = path.join(__dirname, 'frontend', 'src', 'version.js');

// Genera una versión basada en la fecha y hora actual: YYYY.MM.DD.HHMM
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');

const newVersion = `1.${year}${month}${day}.${hours}${minutes}`;

const content = `// Archivo generado automáticamente en cada deploy\nexport const APP_VERSION = '${newVersion}';\n`;

fs.writeFileSync(versionFilePath, content, 'utf8');
console.log(`🚀 Versión de la App actualizada a: ${newVersion}`);