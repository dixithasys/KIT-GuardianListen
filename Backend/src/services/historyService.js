import crypto from 'node:crypto';
import db from '../database/db.js';

export const historyService = {
  createConversation(userId, role, title = 'New Conversation') {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO conversations (id, user_id, role, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, String(userId), role, title, now, now);
    return { id, user_id: String(userId), role, title, created_at: now, updated_at: now };
  },

  getConversations(userId) {
    const stmt = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
      FROM conversations c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
    `);
    return stmt.all(String(userId));
  },

  getConversation(id, userId) {
    const stmt = db.prepare(`
      SELECT * FROM conversations WHERE id = ? AND user_id = ?
    `);
    const conversation = stmt.get(id, String(userId));
    if (!conversation) return null;

    const msgStmt = db.prepare(`
      SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
    `);
    const messages = msgStmt.all(id).map(m => ({
      ...m,
      tool_calls: m.tool_calls ? JSON.parse(m.tool_calls) : null,
      tool_results: m.tool_results ? JSON.parse(m.tool_results) : null,
    }));

    return { ...conversation, messages };
  },

  addMessage(conversationId, role, content, toolCalls = null, toolResults = null, audioUrl = null) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, tool_calls, tool_results, audio_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      conversationId,
      role,
      content,
      toolCalls ? JSON.stringify(toolCalls) : null,
      toolResults ? JSON.stringify(toolResults) : null,
      audioUrl,
      now
    );

    // Update conversation updated_at
    const updateStmt = db.prepare(`
      UPDATE conversations SET updated_at = ? WHERE id = ?
    `);
    updateStmt.run(now, conversationId);

    return {
      id,
      conversation_id: conversationId,
      role,
      content,
      tool_calls: toolCalls,
      tool_results: toolResults,
      audio_url: audioUrl,
      created_at: now,
    };
  },

  updateConversationTitle(id, userId, title) {
    const stmt = db.prepare(`
      UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?
    `);
    const now = new Date().toISOString();
    stmt.run(title, now, id, String(userId));
  },

  recordAction(conversationId, actionType, payload, result, status, idempotencyKey = null) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO actions (id, conversation_id, action_type, payload, result, status, idempotency_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      conversationId,
      actionType,
      payload ? JSON.stringify(payload) : null,
      result ? JSON.stringify(result) : null,
      status,
      idempotencyKey,
      now
    );
    return { id, action_type: actionType, status, created_at: now };
  },

  deleteConversation(id, userId) {
    const msgStmt = db.prepare(`DELETE FROM messages WHERE conversation_id = ?`);
    msgStmt.run(id);
    const stmt = db.prepare(`DELETE FROM conversations WHERE id = ? AND user_id = ?`);
    stmt.run(id, String(userId));
    return { success: true };
  },
};

