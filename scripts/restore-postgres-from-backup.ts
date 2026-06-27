/**
 * ⚠️ WARNING: This script is DESTRUCTIVE!
 * It will DROP and RECREATE the target database.
 * 
 * Usage: ts-node scripts/restore-postgres-from-backup.ts <path-to-backup-file>
 * 
 * The backup file should be a .sql.gz file created by the backup script.
 * 
 * ⚠️ IMPORTANT:
 * - This script will DESTROY ALL DATA in the target database
 * - Make sure you are targeting the correct database
 * - This should NEVER be exposed as a public API endpoint
 * - Always verify the DATABASE_URL before running
 */

import * as dotenv from 'dotenv';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as zlib from 'zlib';
import * as readline from 'readline';

dotenv.config();

async function main() {
  const backupFile = process.argv[2];

  if (!backupFile) {
    console.error('❌ Usage: ts-node scripts/restore-postgres-from-backup.ts <path-to-backup-file>');
    console.error('   Example: ts-node scripts/restore-postgres-from-backup.ts ./backups/company_db_2024-01-15_02-00-00.sql.gz');
    process.exit(1);
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const url = new URL(dbUrl);
  const host = url.hostname;
  const port = url.port || '5432';
  const database = url.pathname.slice(1);
  const username = url.username;
  const password = url.password;

  console.log('⚠️  ============================================');
  console.log('⚠️  WARNING: DATABASE RESTORE IS DESTRUCTIVE!');
  console.log('⚠️  ============================================');
  console.log('');
  console.log(`  Target database: ${database}`);
  console.log(`  Host: ${host}:${port}`);
  console.log(`  User: ${username}`);
  console.log(`  Backup file: ${backupFile}`);
  console.log('');
  console.log('  This will REPLACE ALL DATA in the target database.');
  console.log('');

  const confirmed = await askConfirmation('Are you sure you want to proceed? (yes/no): ');
  if (confirmed.toLowerCase() !== 'yes') {
    console.log('❌ Restore cancelled.');
    process.exit(0);
  }

  console.log('');
  console.log('🔄 Starting database restore...');

  try {
    if (backupFile.endsWith('.sql.gz')) {
      // Restore from gzipped custom format backup
      await restoreFromGzippedBackup(host, port, database, username, password, backupFile);
    } else if (backupFile.endsWith('.sql')) {
      // Restore from plain SQL
      await restoreFromSql(host, port, database, username, password, backupFile);
    } else {
      console.error('❌ Unsupported file format. Expected .sql or .sql.gz');
      process.exit(1);
    }

    console.log('✅ Database restore completed successfully!');
  } catch (error) {
    console.error('❌ Restore failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function askConfirmation(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function restoreFromGzippedBackup(
  host: string,
  port: string,
  database: string,
  username: string,
  password: string,
  filePath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-h', host,
      '-p', port,
      '-U', username,
      '-d', database,
      '--no-password',
      '--clean',
      '--if-exists',
    ];

    const gunzip = zlib.createGunzip();
    const readStream = fs.createReadStream(filePath);
    
    const pgRestore = spawn('pg_restore', args, {
      env: { ...process.env, PGPASSWORD: password },
    });

    readStream.pipe(gunzip).pipe(pgRestore.stdin);

    let stderr = '';
    pgRestore.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    pgRestore.on('error', (err: Error) => {
      reject(new Error(`pg_restore process error: ${err.message}`));
    });

    pgRestore.on('close', (code: number | null) => {
      // pg_restore may return non-zero for warnings, which is often OK
      if (code !== 0 && code !== 1) {
        reject(new Error(`pg_restore exited with code ${code}: ${stderr}`));
      } else {
        if (stderr) {
          console.log('⚠️  pg_restore warnings:', stderr.substring(0, 500));
        }
        resolve();
      }
    });
  });
}

function restoreFromSql(
  host: string,
  port: string,
  database: string,
  username: string,
  password: string,
  filePath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-h', host,
      '-p', port,
      '-U', username,
      '-d', database,
      '--no-password',
      '-f', filePath,
    ];

    const psql = spawn('psql', args, {
      env: { ...process.env, PGPASSWORD: password },
    });

    let stderr = '';
    psql.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    psql.on('error', (err: Error) => {
      reject(new Error(`psql process error: ${err.message}`));
    });

    psql.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`psql exited with code ${code}: ${stderr}`));
      } else {
        resolve();
      }
    });
  });
}

main();
