#!/usr/bin/env node

// Script para verificar configuración de entorno en Render
console.log('🔍 Verificando configuración para Render...\n');

// Verificar variables de entorno críticas
const requiredEnvVars = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'NODE_ENV',
  'PORT'
];

const optionalEnvVars = [
  'PGSSLMODE',
  'PGSSLROOTCERT'
];

console.log('📋 Variables de entorno requeridas:');
let allRequiredPresent = true;

for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (value) {
    console.log(`  ✅ ${envVar}: ${envVar === 'DATABASE_URL' ? '[CONFIGURADO]' : value}`);
  } else {
    console.log(`  ❌ ${envVar}: NO CONFIGURADO`);
    allRequiredPresent = false;
  }
}

console.log('\n📋 Variables de entorno opcionales:');
for (const envVar of optionalEnvVars) {
  const value = process.env[envVar];
  if (value) {
    console.log(`  ✅ ${envVar}: ${value}`);
  } else {
    console.log(`  ⚠️  ${envVar}: No configurado (usará valores por defecto)`);
  }
}

// Verificar formato de DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  console.log('\n🔍 Verificando DATABASE_URL...');
  try {
    const url = new URL(databaseUrl);
    console.log(`  ✅ Protocolo: ${url.protocol}`);
    console.log(`  ✅ Host: ${url.hostname}:${url.port || '5432'}`);
    console.log(`  ✅ Base de datos: ${url.pathname.slice(1)}`);
    console.log(`  ✅ Usuario: ${url.username ? '[CONFIGURADO]' : 'NO CONFIGURADO'}`);

    if (url.protocol !== 'postgresql:') {
      console.log(`  ⚠️  ADVERTENCIA: El protocolo debería ser 'postgresql:', se encontró '${url.protocol}'`);
    }
  } catch (error) {
    console.log(`  ❌ ERROR: DATABASE_URL no es una URL válida: ${error.message}`);
    allRequiredPresent = false;
  }
}

// Verificar conectividad básica a PostgreSQL
console.log('\n🔍 Verificando conectividad PostgreSQL...');
try {
  const postgres = await import('postgres');
  const sql = postgres.default(databaseUrl, {
    ssl: 'require',
    connection: {
      application_name: 'sentinel-pro-render-check'
    }
  });

  // Intentar una consulta simple
  const result = await sql`SELECT version() as version`;
  console.log(`  ✅ Conexión exitosa a PostgreSQL`);
  console.log(`  📊 Versión: ${result[0].version.split(' ')[1]}`);

  await sql.end();
} catch (error) {
  console.log(`  ❌ ERROR de conexión: ${error.message}`);
  console.log(`  💡 Verifica que DATABASE_URL sea correcta y la base de datos esté accesible`);
  allRequiredPresent = false;
}

// Verificar que se está usando la URL correcta para el entorno
console.log('\n🔍 Verificando configuración de URL para el entorno...');
const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
const isInternalUrl = databaseUrl.includes('.oregon-postgres.render.com') === false &&
                     databaseUrl.includes('dpg-') && databaseUrl.includes('@dpg-');

if (isRender && !isInternalUrl) {
  console.log(`  ⚠️  ADVERTENCIA: En Render deberías usar la Internal Database URL`);
  console.log(`     Actualmente usando: External URL (.render.com)`);
  console.log(`     Recomendado: Internal URL (sin .render.com)`);
} else if (!isRender && isInternalUrl) {
  console.log(`  ⚠️  ADVERTENCIA: Para desarrollo local usa la External Database URL`);
  console.log(`     Actualmente usando: Internal URL`);
  console.log(`     Recomendado: External URL (con .render.com)`);
} else {
  console.log(`  ✅ URL correcta para el entorno actual`);
}

console.log('\n' + '='.repeat(50));
if (allRequiredPresent) {
  console.log('✅ Configuración para Render VERIFICADA correctamente');
  console.log('🚀 El despliegue debería funcionar sin problemas');
} else {
  console.log('❌ Configuración INCOMPLETA para Render');
  console.log('🛠️  Revisa las variables de entorno faltantes antes del despliegue');
}
console.log('='.repeat(50));