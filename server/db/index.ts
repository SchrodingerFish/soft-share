import { createClient } from "@libsql/client";
import pg from "pg";

const { Pool } = pg;

// Database type selection
const DB_TYPE = process.env.DB_TYPE || "sqlite"; // "sqlite", "postgres", or "turso"

interface DbResult {
  rows: any[];
  lastInsertRowid?: any;
}

interface DbClient {
  execute: (query: { sql: string; args?: any[] } | string, args?: any[]) => Promise<DbResult>;
  executeMultiple: (sql: string) => Promise<void>;
  batch: (statements: { sql: string; args?: any[] }[], mode?: string) => Promise<void>;
}

let db: DbClient;
let isInitialized = false;

function getDb(): DbClient {
  if (db) return db;

  const DB_TYPE = process.env.DB_TYPE || "sqlite";
  
  if (DB_TYPE === "postgres") {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    db = {
      execute: async (query, args) => {
        const sql = typeof query === "string" ? query : query.sql;
        const sqlArgs = typeof query === "string" ? args : query.args;
        
        let pgSql = sql;
        if (sqlArgs && sqlArgs.length > 0) {
          let index = 1;
          pgSql = sql.replace(/\?/g, () => `$${index++}`);
        }

        const result = await pool.query(pgSql, sqlArgs);
        return {
          rows: result.rows,
          lastInsertRowid: result.rows[0]?.id
        };
      },
      executeMultiple: async (sql) => {
        await pool.query(sql);
      },
      batch: async (statements) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          for (const stmt of statements) {
            let pgSql = stmt.sql;
            if (stmt.args && stmt.args.length > 0) {
              let index = 1;
              pgSql = stmt.sql.replace(/\?/g, () => `$${index++}`);
            }
            await client.query(pgSql, stmt.args);
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }
    };
  } else {
    const url = DB_TYPE === "turso" 
      ? process.env.TURSO_DATABASE_URL 
      : (process.env.SQLITE_URL || "file:data.db");
    
    const authToken = DB_TYPE === "turso" ? process.env.TURSO_AUTH_TOKEN : undefined;

    if (DB_TYPE === "turso" && !url) {
      console.error("TURSO_DATABASE_URL is required when DB_TYPE is 'turso'");
    }

    const sqliteClient = createClient({
      url: url as string,
      authToken: authToken,
    });

    db = {
      execute: async (query, args) => {
        const result = await sqliteClient.execute(typeof query === "string" ? { sql: query, args } : query);
        return {
          rows: result.rows,
          lastInsertRowid: result.lastInsertRowid
        };
      },
      executeMultiple: async (sql) => {
        await sqliteClient.executeMultiple(sql);
      },
      batch: async (statements, mode) => {
        await sqliteClient.batch(statements, mode as any);
      }
    };
  }
  return db;
}

// Proxy object to allow exporting 'db' while delaying its actual creation
const dbProxy: DbClient = {
  execute: (q, a) => getDb().execute(q, a),
  executeMultiple: (s) => getDb().executeMultiple(s),
  batch: (s, m) => getDb().batch(s, m)
};

async function initDb() {
  if (isInitialized) return;
  
  const DB_TYPE = process.env.DB_TYPE || "sqlite";
  const isPostgres = DB_TYPE === "postgres";
  console.log(`[DB] Initializing database (Type: ${DB_TYPE})...`);
  
  const client = getDb();
  const usersTable = isPostgres 
    ? `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT
      );`
    : `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
      );`;

  const softwareTable = isPostgres
    ? `CREATE TABLE IF NOT EXISTS software (
        id SERIAL PRIMARY KEY,
        name TEXT,
        version TEXT,
        platforms TEXT,
        category TEXT,
        size TEXT,
        update_date TEXT,
        description TEXT,
        screenshots TEXT,
        popularity INTEGER,
        download_url TEXT
      );`
    : `CREATE TABLE IF NOT EXISTS software (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        version TEXT,
        platforms TEXT,
        category TEXT,
        size TEXT,
        update_date TEXT,
        description TEXT,
        screenshots TEXT,
        popularity INTEGER,
        download_url TEXT
      );`;

  const favoritesTable = `CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER,
      software_id INTEGER,
      PRIMARY KEY (user_id, software_id)
    );`;

  try {
    console.log("[DB] Creating tables...");
    // Execute individually for better error tracking
    await client.execute(usersTable);
    await client.execute(softwareTable);
    await client.execute(favoritesTable);
    console.log("[DB] Tables checked/created successfully.");

    // Seed initial data if empty
    const countResult = await client.execute("SELECT COUNT(*) as count FROM software");
    const count = parseInt(countResult.rows[0].count);
    
    if (count === 0) {
      console.log("[DB] Seeding initial data...");
      const seedData = [
        {
          name: "Visual Studio Code", version: "1.85.0", platforms: '["Windows", "macOS", "Android"]', category: "Dev",
          size: "90 MB", update_date: "2023-12-01", description: "A powerful, lightweight code editor.",
          screenshots: '["https://picsum.photos/seed/vscode1/800/600", "https://picsum.photos/seed/vscode2/800/600"]',
          popularity: 9999, download_url: "https://code.visualstudio.com/download"
        },
        {
          name: "Google Chrome", version: "120.0.0", platforms: '["Windows", "macOS", "Android"]', category: "System",
          size: "120 MB", update_date: "2023-11-28", description: "Fast, secure, and free web browser.",
          screenshots: '["https://picsum.photos/seed/chrome1/800/600"]',
          popularity: 8500, download_url: "https://www.google.com/chrome/"
        },
        {
          name: "VLC Media Player", version: "3.0.20", platforms: '["Windows", "macOS", "Android"]', category: "Media",
          size: "40 MB", update_date: "2023-10-15", description: "Free and open source cross-platform multimedia player.",
          screenshots: '["https://picsum.photos/seed/vlc1/800/600"]',
          popularity: 7200, download_url: "https://www.videolan.org/vlc/"
        },
        {
          name: "Figma", version: "116.3.0", platforms: '["Windows", "macOS"]', category: "Design",
          size: "150 MB", update_date: "2023-11-10", description: "Collaborative interface design tool.",
          screenshots: '["https://picsum.photos/seed/figma1/800/600"]',
          popularity: 6800, download_url: "https://www.figma.com/downloads/"
        },
        {
          name: "Notion", version: "2.23.0", platforms: '["Windows", "macOS", "Android"]', category: "Productivity",
          size: "85 MB", update_date: "2023-12-05", description: "All-in-one workspace for your notes, tasks, wikis, and databases.",
          screenshots: '["https://picsum.photos/seed/notion1/800/600"]',
          popularity: 5400, download_url: "https://www.notion.so/desktop"
        },
        {
          name: "Postman", version: "10.20.0", platforms: '["Windows", "macOS"]', category: "Dev",
          size: "110 MB", update_date: "2023-11-20", description: "API platform for building and using APIs.",
          screenshots: '["https://picsum.photos/seed/postman1/800/600"]',
          popularity: 4900, download_url: "https://www.postman.com/downloads/"
        }
      ];
      
      const statements = seedData.map(item => ({
        sql: `INSERT INTO software (name, version, platforms, category, size, update_date, description, screenshots, popularity, download_url)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [item.name, item.version, item.platforms, item.category, item.size, item.update_date, item.description, item.screenshots, item.popularity, item.download_url]
      }));
      
      await client.batch(statements, "write");
      console.log("[DB] Seeding completed.");
    } else {
      console.log(`[DB] Database already contains ${count} items. Skipping seed.`);
    }
    isInitialized = true;
  } catch (error) {
    console.error("[DB] Initialization error:", error);
  }
}

export default dbProxy;
export { initDb };
