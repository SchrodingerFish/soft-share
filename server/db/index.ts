import { createClient } from "@libsql/client";

const dbUrl = process.env.TURSO_DATABASE_URL || "file:data.db";
const dbAuthToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

async function initDb() {
  // Setup tables
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    );
    
    CREATE TABLE IF NOT EXISTS software (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      version TEXT,
      platforms TEXT, -- JSON array
      category TEXT,
      size TEXT,
      update_date TEXT,
      description TEXT,
      screenshots TEXT, -- JSON array
      popularity INTEGER,
      download_url TEXT
    );
    
    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER,
      software_id INTEGER,
      PRIMARY KEY (user_id, software_id)
    );
  `);

  // Seed initial data if empty
  const countResult = await db.execute("SELECT COUNT(*) as count FROM software");
  const count = countResult.rows[0].count as number;
  
  if (count === 0) {
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
    
    await db.batch(statements, "write");
  }
}

initDb().catch(console.error);

export default db;
