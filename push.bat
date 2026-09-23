@echo off
echo -------------------------------
echo 🔄 Actualizando versión del sistema...
echo -------------------------------
node update-version.js

git add .
git commit -m "Actualizacion automatica"
git push

echo -------------------------------
echo ✅ Push y actualización de versión realizados con éxito
echo -------------------------------
pause