import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const DATABASE_URL = process.env.DATABASE_URL;

const WATCH_FOLDERS = [
  path.join('takeshi-bot-main', 'assets', 'auth', 'baileys'),
  path.join('takeshi-bot-main', 'database')
];

let client = null;
const fileCache = new Map(); // filepath -> base64 content
let isSyncing = false;

// Scan directory recursively
function scanDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      scanDir(fullPath, fileList);
    } else if (item.isFile()) {
      // Ignore temporary files, dotfiles, and gitkeep
      if (item.name !== '.gitkeep' && !item.name.startsWith('.') && !item.name.endsWith('.tmp')) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

// Restore files from Postgres database to local storage
async function restoreFiles() {
  console.log('[DB Sync] Restoring session and database files from PostgreSQL...');
  try {
    const res = await client.query('SELECT filepath, content FROM bot_files');
    console.log(`[DB Sync] Found ${res.rows.length} files in database.`);
    
    for (const row of res.rows) {
      const localPath = path.resolve(process.cwd(), row.filepath);
      const dir = path.dirname(localPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const buffer = Buffer.from(row.content, 'base64');
      fs.writeFileSync(localPath, buffer);
      
      // Update in-memory cache
      fileCache.set(row.filepath, row.content);
    }
    console.log('[DB Sync] Files restored successfully.');
  } catch (error) {
    console.error('[DB Sync] Error restoring files:', error.message);
  }
}

// Backup local files to Postgres database
async function backupFiles() {
  if (isSyncing) return;
  isSyncing = true;
  
  try {
    const currentFiles = [];
    
    // Scan all watch folders
    for (const folder of WATCH_FOLDERS) {
      const folderPath = path.resolve(process.cwd(), folder);
      if (fs.existsSync(folderPath)) {
        const files = scanDir(folderPath);
        for (const file of files) {
          const relPath = path.relative(process.cwd(), file);
          currentFiles.push(relPath);
        }
      }
    }
    
    // 1. Upload new/modified files
    for (const relPath of currentFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const contentBuffer = fs.readFileSync(fullPath);
      const base64Content = contentBuffer.toString('base64');
      
      // If not in cache or content changed
      if (fileCache.get(relPath) !== base64Content) {
        await client.query(
          `INSERT INTO bot_files (filepath, content, updated_at) 
           VALUES ($1, $2, CURRENT_TIMESTAMP) 
           ON CONFLICT (filepath) 
           DO UPDATE SET content = $2, updated_at = CURRENT_TIMESTAMP`,
          [relPath, base64Content]
        );
        fileCache.set(relPath, base64Content);
        console.log(`[DB Sync] Backed up to database: ${relPath}`);
      }
    }
    
    // 2. Delete removed files
    for (const cachedPath of fileCache.keys()) {
      if (!currentFiles.includes(cachedPath)) {
        await client.query('DELETE FROM bot_files WHERE filepath = $1', [cachedPath]);
        fileCache.delete(cachedPath);
        console.log(`[DB Sync] Deleted from database (removed locally): ${cachedPath}`);
      }
    }
    
  } catch (error) {
    console.error('[DB Sync] Error during backup loop:', error.message);
    // If the client connection is dead, try to reconnect
    if (error.message.includes('closed') || error.message.includes('connection') || error.message.includes('terminating')) {
      await reconnect();
    }
  } finally {
    isSyncing = false;
  }
}

async function reconnect() {
  console.log('[DB Sync] Attempting to reconnect to database...');
  try {
    if (client) {
      try { await client.end(); } catch (e) {}
    }
    client = new pg.Client({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
    });
    await client.connect();
    console.log('[DB Sync] Reconnected to database successfully.');
  } catch (err) {
    console.error('[DB Sync] Reconnection failed:', err.message);
  }
}

export async function initDbSync() {
  if (!DATABASE_URL) {
    console.log('[DB Sync] DATABASE_URL environment variable is not defined. SQLite/JSON local files mode only.');
    return;
  }
  
  console.log('[DB Sync] Initializing Postgres database sync...');
  try {
    client = new pg.Client({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('[DB Sync] Connected to PostgreSQL database.');
    
    // Create schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_files (
        filepath TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Restore files at startup
    await restoreFiles();
    
    // Start background sync backup loop every 5 seconds
    setInterval(backupFiles, 5000);
    
  } catch (error) {
    console.error('[DB Sync] Critical error initializing database sync:', error.message);
    console.log('[DB Sync] Proceeding in offline database mode (local files only).');
  }
}
