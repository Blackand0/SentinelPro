import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

const schema = `
CREATE TABLE IF NOT EXISTS companies (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  admin_id varchar,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'operator',
  company_id varchar REFERENCES companies(id),
  created_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE companies ADD CONSTRAINT companies_admin_id_users_id_fk FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS printers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  model text NOT NULL,
  ip_address text,
  company_id varchar REFERENCES companies(id),
  status text NOT NULL DEFAULT 'active',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS print_jobs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id),
  printer_id varchar NOT NULL REFERENCES printers(id),
  document_name text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  page_count integer NOT NULL,
  copies integer NOT NULL DEFAULT 1,
  color_mode text NOT NULL DEFAULT 'bw',
  paper_size text NOT NULL DEFAULT 'letter',
  status text NOT NULL DEFAULT 'completed',
  printed_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session (
  sid varchar PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp NOT NULL
);
`;

async function init() {
  try {
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await sql.unsafe(statement.trim());
        console.log('Executed:', statement.substring(0, 50) + '...');
      }
    }
    console.log('✅ Database initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  }
}

init();
