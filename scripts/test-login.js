#!/usr/bin/env node

// Script para probar el login desde línea de comandos
const API_URL = process.env.API_URL || 'https://sentinel-pro.onrender.com';

async function testLogin(username, password) {
  console.log(`🔍 Probando login para usuario: ${username}`);
  console.log(`🌐 API URL: ${API_URL}`);

  try {
    // Test 1: Verificar si el endpoint responde
    console.log('\n📡 Test 1: Verificando conectividad...');
    const healthResponse = await fetch(`${API_URL}/api/auth/debug-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!healthResponse.ok) {
      console.log(`❌ Error HTTP ${healthResponse.status}: ${healthResponse.statusText}`);
      const errorText = await healthResponse.text();
      console.log(`   Detalles: ${errorText}`);
      return;
    }

    const data = await healthResponse.json();
    console.log('✅ Respuesta exitosa del servidor');
    console.log('📊 Datos de respuesta:', JSON.stringify(data, null, 2));

    // Test 2: Verificar el token JWT
    if (data.ok && data.token) {
      console.log('\n🔐 Test 2: Verificando token JWT...');

      const meResponse = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.token}`,
        },
      });

      if (meResponse.ok) {
        const userData = await meResponse.json();
        console.log('✅ Token válido - Usuario autenticado');
        console.log('👤 Datos del usuario:', JSON.stringify(userData, null, 2));
      } else {
        console.log(`❌ Token inválido - Error ${meResponse.status}`);
        const errorText = await meResponse.text();
        console.log(`   Detalles: ${errorText}`);
      }
    }

  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}`);
    console.log('💡 Verifica que la URL de la API sea correcta y el servidor esté ejecutándose');
  }
}

// Ejecutar test si se pasan argumentos
const [,, username, password] = process.argv;
if (username && password) {
  testLogin(username, password);
} else {
  console.log('📋 Uso: node scripts/test-login.js <username> <password>');
  console.log('📋 Ejemplo: node scripts/test-login.js sentinelpro 123456');
  console.log('');
  console.log('🔧 Para probar con tu despliegue en Render:');
  console.log('   export API_URL=https://tu-app.onrender.com');
  console.log('   node scripts/test-login.js sentinelpro 123456');
}