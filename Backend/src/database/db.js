import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.resolve(__dirname, '../../data');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'guardian.db');
const jsonBackupPath = path.join(dbDir, 'guardian_store.json');

let db;

try {
  const { DatabaseSync } = await import('node:sqlite');
  db = new DatabaseSync(dbPath);

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      tool_results TEXT,
      audio_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      payload TEXT,
      result TEXT,
      status TEXT,
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_documents (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      content TEXT NOT NULL,
      page_count INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);
  console.log('[Database] Initialized SQLite DatabaseSync engine');
} catch (err) {
  console.warn('[Database] Native SQLite not available, activating embedded JSON store fallback:', err.message);

  let memoryStore = { conversations: [], messages: [], actions: [] };
  if (fs.existsSync(jsonBackupPath)) {
    try {
      memoryStore = JSON.parse(fs.readFileSync(jsonBackupPath, 'utf8'));
    } catch (_) {}
  }

  const persist = () => {
    try {
      fs.writeFileSync(jsonBackupPath, JSON.stringify(memoryStore, null, 2));
    } catch (_) {}
  };

  db = {
    exec: () => {},
    prepare: (sql) => {
      const lower = sql.toLowerCase();
      return {
        run: (...params) => {
          if (lower.includes('insert into conversations')) {
            const [id, user_id, role, title, created_at, updated_at] = params;
            memoryStore.conversations.push({ id, user_id, role, title, created_at, updated_at });
            persist();
          } else if (lower.includes('insert into messages')) {
            const [id, conversation_id, role, content, tool_calls, tool_results, audio_url, created_at] = params;
            memoryStore.messages.push({ id, conversation_id, role, content, tool_calls, tool_results, audio_url, created_at });
            persist();
          } else if (lower.includes('update conversations set updated_at')) {
            const [now, id] = params;
            const c = memoryStore.conversations.find(item => item.id === id);
            if (c) c.updated_at = now;
            persist();
          } else if (lower.includes('update conversations set title')) {
            const [title, now, id, user_id] = params;
            const c = memoryStore.conversations.find(item => item.id === id && String(item.user_id) === String(user_id));
            if (c) { c.title = title; c.updated_at = now; }
            persist();
          } else if (lower.includes('insert into actions')) {
            const [id, conversation_id, action_type, payload, result, status, idempotency_key, created_at] = params;
            memoryStore.actions.push({ id, conversation_id, action_type, payload, result, status, idempotency_key, created_at });
            persist();
          } else if (lower.includes('delete from messages where conversation_id')) {
            const [cid] = params;
            memoryStore.messages = memoryStore.messages.filter(m => m.conversation_id !== cid);
            persist();
          } else if (lower.includes('delete from conversations where id')) {
            const [cid, uid] = params;
            memoryStore.conversations = memoryStore.conversations.filter(c => !(c.id === cid && String(c.user_id) === String(uid)));
            persist();
          }
          return { changes: 1 };
        },
        all: (...params) => {
          if (lower.includes('from conversations') && lower.includes('where c.user_id = ?')) {
            const [userId] = params;
            return memoryStore.conversations
              .filter(c => String(c.user_id) === String(userId))
              .map(c => {
                const msgs = memoryStore.messages.filter(m => m.conversation_id === c.id);
                return {
                  ...c,
                  message_count: msgs.length,
                  last_message: msgs.length ? msgs[msgs.length - 1].content : null,
                };
              })
              .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
          } else if (lower.includes('from messages where conversation_id = ?')) {
            const [cid] = params;
            return memoryStore.messages.filter(m => m.conversation_id === cid);
          }
          return [];
        },
        get: (...params) => {
          if (lower.includes('from conversations where id = ? and user_id = ?')) {
            const [cid, uid] = params;
            return memoryStore.conversations.find(c => c.id === cid && String(c.user_id) === String(uid)) || null;
          }
          return null;
        }
      };
    }
  };
}

export default db;
