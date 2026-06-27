/**
 * Standalone PostgreSQL backup script
 * Usage: ts-node scripts/backup-postgres-to-gdrive.ts
 * 
 * This script performs a PostgreSQL database backup and uploads it to Google Drive.
 * It uses the same environment variables as the main application.
 */

import * as dotenv from 'dotenv';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { google } from 'googleapis';

dotenv.config();

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
];

const GOOGLE_DRIVE_ENV_VARS = [
  'GOOGLE_DRIVE_CLIENT_ID',
  'GOOGLE_DRIVE_CLIENT_SECRET',
  'GOOGLE_DRIVE_REFRESH_TOKEN',
];

async function main() {
  console.log('🔄 Starting PostgreSQL backup...');
  console.log(`⏰ Time: ${new Date().toISOString()}`);

  // Validate required env vars
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  const dbUrl = process.env.DATABASE_URL!;
  const url = new URL(dbUrl);
  const host = url.hostname;
  const port = url.port || '5432';
  const database = url.pathname.slice(1);
  const username = url.username;
  const password = url.password;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `company_db_${timestamp}.sql.gz`;
  const backupDir = path.join(process.cwd(), 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const filePath = path.join(backupDir, filename);

  try {
    // Run pg_dump
    console.log(`📦 Running pg_dump for database: ${database}@${host}:${port}`);
    await executePgDump(host, port, database, username, password, filePath);
    
    const stats = fs.statSync(filePath);
    console.log(`✅ Backup created: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    // Upload to Google Drive if configured
    const hasGoogleDrive = GOOGLE_DRIVE_ENV_VARS.every(v => process.env[v]);
    if (hasGoogleDrive) {
      console.log('☁️  Uploading to Google Drive...');
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_DRIVE_CLIENT_ID,
        process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      );
      oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });
      
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;

      const response = await drive.files.create({
        requestBody: {
          name: filename,
          parents: folderId ? [folderId] : undefined,
        },
        media: {
          mimeType: 'application/gzip',
          body: fs.createReadStream(filePath),
        },
        fields: 'id, webViewLink',
      });

      console.log(`✅ Uploaded to Google Drive: ${response.data.id}`);
      
      // Delete local file after upload
      fs.unlinkSync(filePath);
      console.log('🗑️  Local backup file deleted after upload');

      // Retention cleanup
      const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      console.log(`🧹 Cleaning up backups older than ${retentionDays} days...`);
      const listResponse = await drive.files.list({
        q: `name contains 'company_db_' and trashed = false${folderId ? ` and '${folderId}' in parents` : ''}`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc',
      });

      for (const file of listResponse.data.files || []) {
        if (new Date(file.createdTime!) < cutoffDate) {
          await drive.files.delete({ fileId: file.id! });
          console.log(`  🗑️  Deleted old backup: ${file.name}`);
        }
      }
    } else {
      console.log('⚠️  Google Drive not configured, backup saved locally only');
    }

    console.log('✅ Backup completed successfully!');
  } catch (error) {
    console.error('❌ Backup failed:', error instanceof Error ? error.message : error);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    process.exit(1);
  }
}

function executePgDump(
  host: string,
  port: string,
  database: string,
  username: string,
  password: string,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ['-h', host, '-p', port, '-U', username, '-d', database, '--no-password', '-Fc'];
    const pgDump = spawn('pg_dump', args, {
      env: { ...process.env, PGPASSWORD: password },
    });

    const gzip = zlib.createGzip();
    const writeStream = fs.createWriteStream(outputPath);

    pgDump.stdout.pipe(gzip).pipe(writeStream);

    let stderr = '';
    pgDump.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    writeStream.on('finish', () => resolve());
    pgDump.on('error', (err: Error) => reject(new Error(`pg_dump process error: ${err.message}`)));
    pgDump.on('close', (code: number | null) => {
      if (code !== 0) reject(new Error(`pg_dump exited with code ${code}: ${stderr}`));
    });
    writeStream.on('error', (err: Error) => reject(new Error(`Write error: ${err.message}`)));
  });
}

main();
