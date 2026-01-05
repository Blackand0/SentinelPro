import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function runMigration(migrationPath) {
  try {
    console.log(`🚀 Ejecutando migración: ${migrationPath}`);

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Ejecutando: ${statement.substring(0, 60)}...`);
        await sql.unsafe(statement);
      }
    }

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
}

async function main() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Uso: node run_migration.js <migration_file>');
    process.exit(1);
  }

  const migrationPath = path.resolve(migrationFile);
  if (!fs.existsSync(migrationPath)) {
    console.error(`Archivo de migración no encontrado: ${migrationPath}`);
    process.exit(1);
  }

  await runMigration(migrationPath);
  await sql.end();
}

main();