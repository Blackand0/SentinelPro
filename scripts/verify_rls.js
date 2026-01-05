import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function verifyRLS() {
  try {
    console.log('🔍 Verificando configuración RLS...\n');

    // Verificar que RLS esté habilitado en todas las tablas
    const tables = [
      'companies',
      'users',
      'printers',
      'print_jobs',
      'paper_types',
      'toner_inventory',
      'maintenance_logs',
      'consumption_expenses',
      'alerts',
      'audit_logs'
    ];

    console.log('📋 Estado RLS por tabla:');
    for (const table of tables) {
      const result = await sql`
        SELECT schemaname, tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = ${table}
      `;

      const status = result[0]?.rowsecurity ? '✅ Habilitado' : '❌ Deshabilitado';
      console.log(`  ${table.padEnd(20)}: ${status}`);
    }

    console.log('\n📋 Políticas RLS por tabla:');
    for (const table of tables) {
      const policies = await sql`
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = ${table}
        ORDER BY policyname
      `;

      console.log(`  ${table}: ${policies.length} políticas`);
      policies.forEach(policy => {
        console.log(`    - ${policy.policyname} (${policy.cmd})`);
      });
    }

    console.log('\n🔧 Verificando permisos del super-admin:');

    // Verificar que existan políticas para super-admin
    const superAdminPolicies = await sql`
      SELECT tablename, policyname, qual
      FROM pg_policies
      WHERE schemaname = 'public'
        AND qual LIKE '%super-admin%'
      ORDER BY tablename, policyname
    `;

    console.log(`  Políticas para super-admin encontradas: ${superAdminPolicies.length}`);
    superAdminPolicies.forEach(policy => {
      console.log(`    - ${policy.tablename}: ${policy.policyname}`);
    });

    // Verificar funciones de seguridad
    console.log('\n🔧 Verificando funciones de seguridad:');
    const functions = await sql`
      SELECT proname
      FROM pg_proc
      WHERE proname IN ('set_security_context', 'clear_security_context')
        AND pg_function_is_visible(oid)
    `;

    console.log(`  Funciones encontradas: ${functions.length}`);
    functions.forEach(func => {
      console.log(`    - ${func.proname}`);
    });

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

verifyRLS();