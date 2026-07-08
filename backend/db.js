import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 1. Define the dynamic path using an environment variable with a local fallback
const dbPath = process.env.DB_PATH || path.join(__dirname, 'sahaay.db')

// 2. Initialize the database with the resolved path
export const db = new Database(dbPath)
console.log(`Successfully connected to SQLite database at: ${dbPath}`)

// Enable foreign keys or other pragmas if necessary
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    language_pref TEXT DEFAULT 'en',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS query_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    mode TEXT NOT NULL,
    query_text TEXT,
    response_text TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS registered_faces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    contact_name TEXT NOT NULL,
    embedding TEXT,
    photo_url TEXT
  );

  CREATE TABLE IF NOT EXISTS emergency_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL
  );

  INSERT OR IGNORE INTO users (id, name, language_pref) VALUES (1, 'Demo User', 'en');
`)
