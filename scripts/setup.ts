import { setupDatabase, closeDatabase } from '../src/lib/db';
async function main() {
  await setupDatabase();
  console.log('Database indexes, transaction guard and empty content/settings are initialized. Existing records were not replaced.');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Database setup failed.'); process.exitCode = 1; }).finally(closeDatabase);

