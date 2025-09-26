import fs from 'fs';
import path from 'path';
import pool from '../config/database';

const MIGRATIONS_DIR = __dirname;

interface Migration {
  id: string;
  filename: string;
  content: string;
}

async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id VARCHAR(255) PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  await pool.query(query);
}

async function getExecutedMigrations(): Promise<string[]> {
  const result = await pool.query('SELECT id FROM migrations ORDER BY id');
  return result.rows.map(row => row.id);
}

async function getMigrationFiles(): Promise<Migration[]> {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();

  return files.map(filename => {
    const id = filename.replace('.sql', '');
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
    return { id, filename, content };
  });
}

async function runMigration(migration: Migration) {
  console.log(`Running migration: ${migration.filename}`);
  
  try {
    await pool.query('BEGIN');
    await pool.query(migration.content);
    await pool.query('INSERT INTO migrations (id, filename) VALUES ($1, $2)', [migration.id, migration.filename]);
    await pool.query('COMMIT');
    console.log(`✓ Migration ${migration.filename} completed`);
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(`✗ Migration ${migration.filename} failed:`, error);
    throw error;
  }
}

async function migrateUp() {
  await createMigrationsTable();
  
  const executedMigrations = await getExecutedMigrations();
  const allMigrations = await getMigrationFiles();
  
  const pendingMigrations = allMigrations.filter(
    migration => !executedMigrations.includes(migration.id)
  );

  if (pendingMigrations.length === 0) {
    console.log('No pending migrations');
    return;
  }

  console.log(`Found ${pendingMigrations.length} pending migrations`);
  
  for (const migration of pendingMigrations) {
    await runMigration(migration);
  }
  
  console.log('All migrations completed successfully');
}

async function migrateDown() {
  // Simple implementation - could be enhanced to support rollback scripts
  console.log('Migration rollback not implemented in this simple version');
  console.log('To rollback, manually drop tables or restore from backup');
}

async function main() {
  const direction = process.argv[2];
  
  try {
    if (direction === 'up') {
      await migrateUp();
    } else if (direction === 'down') {
      await migrateDown();
    } else {
      console.log('Usage: ts-node migrate.ts [up|down]');
      process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}