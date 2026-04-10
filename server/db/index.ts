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
        password TEXT,
        role TEXT DEFAULT 'user'
      );`
    : `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user'
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
        download_url TEXT,
        link_status TEXT DEFAULT 'valid',
        version_history TEXT,
        tutorial TEXT
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
        download_url TEXT,
        link_status TEXT DEFAULT 'valid',
        version_history TEXT,
        tutorial TEXT
      );`;

  const collectionsTable = isPostgres
    ? `CREATE TABLE IF NOT EXISTS collections (
        id SERIAL PRIMARY KEY,
        title TEXT,
        description TEXT,
        cover_image TEXT,
        software_ids TEXT
      );`
    : `CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        cover_image TEXT,
        software_ids TEXT
      );`;

  const favoritesTable = isPostgres 
    ? `CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER,
      software_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, software_id)
    );`
    : `CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER,
      software_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, software_id)
    );`;

  try {
    console.log("[DB] Creating tables...");
    // Execute individually for better error tracking
    await client.execute(usersTable);
    // Ensure role column exists for existing databases
    try {
      await client.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
    } catch (e) {}
    try {
      await client.execute("ALTER TABLE users ADD COLUMN email TEXT");
    } catch (e) {}
    try {
      await client.execute("ALTER TABLE users ADD COLUMN avatar TEXT");
    } catch (e) {}
    try {
      const isPostgres = DB_TYPE === "postgres";
      await client.execute(`ALTER TABLE users ADD COLUMN is_paid ${isPostgres ? 'BOOLEAN DEFAULT FALSE' : 'INTEGER DEFAULT 0'}`);
    } catch (e) {}
    await client.execute(softwareTable);
    // Ensure link_status column exists for existing databases
    try {
      await client.execute("ALTER TABLE software ADD COLUMN link_status TEXT DEFAULT 'valid'");
    } catch (e) {}
    try {
      await client.execute("ALTER TABLE software ADD COLUMN version_history TEXT DEFAULT '[]'");
    } catch (e) {}
    try {
      await client.execute("ALTER TABLE software ADD COLUMN tutorial TEXT DEFAULT ''");
    } catch (e) {}
    try {
      await client.execute("ALTER TABLE software ADD COLUMN verification_code TEXT DEFAULT ''");
    } catch (e) {}
    await client.execute(collectionsTable);
    await client.execute(favoritesTable);
    try {
      const isPostgres = DB_TYPE === "postgres";
      await client.execute(`ALTER TABLE favorites ADD COLUMN created_at ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP`);
    } catch (e) {}

    // Categories and Tags tables
    const categoriesTable = isPostgres
      ? `CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE,
          description TEXT
        );`
      : `CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          description TEXT
        );`;
        
    const tagsTable = isPostgres
      ? `CREATE TABLE IF NOT EXISTS tags (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE,
          color TEXT
        );`
      : `CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          color TEXT
        );`;
        
    await client.execute(categoriesTable);
    await client.execute(tagsTable);

    // New tables for community features
    const commentsTable = isPostgres
      ? `CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          software_id INTEGER REFERENCES software(id),
          rating INTEGER,
          content TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      : `CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          software_id INTEGER,
          rating INTEGER,
          content TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`;

    const submissionsTable = isPostgres
      ? `CREATE TABLE IF NOT EXISTS submissions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          name TEXT,
          version TEXT,
          platforms TEXT,
          category TEXT,
          size TEXT,
          description TEXT,
          download_url TEXT,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      : `CREATE TABLE IF NOT EXISTS submissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          name TEXT,
          version TEXT,
          platforms TEXT,
          category TEXT,
          size TEXT,
          description TEXT,
          download_url TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`;

    const downloadLogsTable = isPostgres
      ? `CREATE TABLE IF NOT EXISTS download_logs (
          id SERIAL PRIMARY KEY,
          software_id INTEGER REFERENCES software(id),
          user_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      : `CREATE TABLE IF NOT EXISTS download_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          software_id INTEGER,
          user_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`;

    await client.execute(commentsTable);
    await client.execute(submissionsTable);
    await client.execute(downloadLogsTable);

    const notificationsTable = isPostgres
      ? `CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          title TEXT,
          content TEXT,
          type TEXT, -- 'update', 'system'
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      : `CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          title TEXT,
          content TEXT,
          type TEXT,
          is_read BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`;

    await client.execute(notificationsTable);

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
          popularity: 9999, download_url: "https://code.visualstudio.com/download",
          version_history: '[{"version": "1.85.0", "date": "2023-12-01", "content": "Update UI and fix bugs"}, {"version": "1.84.0", "date": "2023-11-01", "content": "New features"}]',
          tutorial: "## VS Code Tutorial\n\n1. Download and install.\n2. Open your project folder.\n3. Install extensions like Prettier or ESLint."
        },
        {
          name: "Google Chrome", version: "120.0.0", platforms: '["Windows", "macOS", "Android"]', category: "System",
          size: "120 MB", update_date: "2023-11-28", description: "Fast, secure, and free web browser.",
          screenshots: '["https://picsum.photos/seed/chrome1/800/600"]',
          popularity: 8500, download_url: "https://www.google.com/chrome/",
          version_history: '[]', tutorial: "Just install and browse!"
        },
        {
          name: "VLC Media Player", version: "3.0.20", platforms: '["Windows", "macOS", "Android"]', category: "Media",
          size: "40 MB", update_date: "2023-10-15", description: "Free and open source cross-platform multimedia player.",
          screenshots: '["https://picsum.photos/seed/vlc1/800/600"]',
          popularity: 7200, download_url: "https://www.videolan.org/vlc/",
          version_history: '[]', tutorial: "Supports all formats."
        },
        {
          name: "Figma", version: "116.3.0", platforms: '["Windows", "macOS"]', category: "Design",
          size: "150 MB", update_date: "2023-11-10", description: "Collaborative interface design tool.",
          screenshots: '["https://picsum.photos/seed/figma1/800/600"]',
          popularity: 6800, download_url: "https://www.figma.com/downloads/",
          version_history: '[]', tutorial: "Design together."
        },
        {
          name: "Notion", version: "2.23.0", platforms: '["Windows", "macOS", "Android"]', category: "Productivity",
          size: "85 MB", update_date: "2023-12-05", description: "All-in-one workspace for your notes, tasks, wikis, and databases.",
          screenshots: '["https://picsum.photos/seed/notion1/800/600"]',
          popularity: 5400, download_url: "https://www.notion.so/desktop",
          version_history: '[]', tutorial: "Organize everything."
        },
        {
          name: "Postman", version: "10.20.0", platforms: '["Windows", "macOS"]', category: "Dev",
          size: "110 MB", update_date: "2023-11-20", description: "API platform for building and using APIs.",
          screenshots: '["https://picsum.photos/seed/postman1/800/600"]',
          popularity: 4900, download_url: "https://www.postman.com/downloads/",
          version_history: '[]', tutorial: "Test your APIs."
        }
      ];
      
      const statements = seedData.map(item => ({
        sql: `INSERT INTO software (name, version, platforms, category, size, update_date, description, screenshots, popularity, download_url, version_history, tutorial)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.name, item.version, item.platforms, item.category, item.size, item.update_date, 
          item.description, item.screenshots, item.popularity, item.download_url,
          item.version_history, item.tutorial
        ]
      }));
      
      await client.batch(statements, "write");

      // Seed collections
      const collectionData = [
        {
          title: "Developer Essentials",
          description: "Must-have tools for every software engineer.",
          cover_image: "https://picsum.photos/seed/devcol/1200/600",
          software_ids: "[1, 6]"
        },
        {
          title: "Productivity Boosters",
          description: "Stay organized and get more done.",
          cover_image: "https://picsum.photos/seed/prodcol/1200/600",
          software_ids: "[5, 2]"
        }
      ];

      const colStatements = collectionData.map(c => ({
        sql: "INSERT INTO collections (title, description, cover_image, software_ids) VALUES (?, ?, ?, ?)",
        args: [c.title, c.description, c.cover_image, c.software_ids]
      }));

      await client.batch(colStatements, "write");
      
      // Seed categories
      const categoryData = [
        { name: "Dev", description: "Development tools" },
        { name: "System", description: "System utilities" },
        { name: "Download", description: "Download managers" },
        { name: "Media", description: "Media players and editors" },
        { name: "Productivity", description: "Office and productivity" },
        { name: "Design", description: "Design and graphics" }
      ];
      const catStatements = categoryData.map(c => ({
        sql: "INSERT INTO categories (name, description) VALUES (?, ?)",
        args: [c.name, c.description]
      }));
      await client.batch(catStatements, "write");

      // Seed tags
      const tagData = [
        { name: "Open Source", color: "green" },
        { name: "Free", color: "blue" },
        { name: "Cross-platform", color: "purple" },
        { name: "Essential", color: "red" }
      ];
      const tagStatements = tagData.map(t => ({
        sql: "INSERT INTO tags (name, color) VALUES (?, ?)",
        args: [t.name, t.color]
      }));
      await client.batch(tagStatements, "write");
      
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
