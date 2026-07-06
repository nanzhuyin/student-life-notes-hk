import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const defaultDb = {
  users: [],
  analyticsEvents: [],
  supportTickets: []
};

function cloneDefaultDb() {
  return structuredClone(defaultDb);
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function chunk(rows, size = 500) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) chunks.push(rows.slice(index, index + size));
  return chunks;
}

function toUserRow(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    school_id: user.schoolId,
    password_hash: user.passwordHash,
    created_at: user.createdAt,
    updated_at: user.updatedAt
  };
}

function fromUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    schoolId: row.school_id,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toAnalyticsRow(event) {
  return {
    id: event.id,
    timestamp: event.timestamp,
    type: event.type,
    school_id: event.schoolId || '',
    route_name: event.routeName || '',
    feature: event.feature || '',
    target_id: event.targetId || '',
    duration_seconds: Number(event.durationSeconds || 0),
    path: event.path || '',
    session_id: event.sessionId || '',
    user_agent: event.userAgent || '',
    ip_hint: event.ipHint || '',
    payload: compactObject({
      ...event,
      id: undefined,
      timestamp: undefined,
      type: undefined,
      schoolId: undefined,
      routeName: undefined,
      feature: undefined,
      targetId: undefined,
      durationSeconds: undefined,
      path: undefined,
      sessionId: undefined,
      userAgent: undefined,
      ipHint: undefined
    })
  };
}

function fromAnalyticsRow(row) {
  return {
    ...(row.payload || {}),
    id: row.id,
    timestamp: row.timestamp,
    type: row.type,
    schoolId: row.school_id,
    routeName: row.route_name,
    feature: row.feature,
    targetId: row.target_id,
    durationSeconds: Number(row.duration_seconds || 0),
    path: row.path,
    sessionId: row.session_id,
    userAgent: row.user_agent,
    ipHint: row.ip_hint
  };
}

function toTicketRow(ticket) {
  return {
    id: ticket.id,
    user_id: ticket.userId || '',
    username: ticket.username || '',
    school_id: ticket.schoolId || '',
    type: ticket.type,
    contact: ticket.contact,
    message: ticket.message,
    status: ticket.status,
    admin_note: ticket.adminNote || '',
    admin_reply: ticket.adminReply || '',
    created_at: ticket.createdAt,
    updated_at: ticket.updatedAt
  };
}

function fromTicketRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    schoolId: row.school_id,
    type: row.type,
    contact: row.contact,
    message: row.message,
    status: row.status,
    adminNote: row.admin_note,
    adminReply: row.admin_reply,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createStorage({ dbFile, supabaseUrl, supabaseServiceRoleKey }) {
  const hasSupabase = Boolean(supabaseUrl && supabaseServiceRoleKey);
  const restBase = hasSupabase ? `${supabaseUrl.replace(/\/$/, '')}/rest/v1` : '';

  async function supabaseRequest(path, options = {}) {
    const response = await fetch(`${restBase}${path}`, {
      ...options,
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const message = data?.message || data?.hint || text || `Supabase request failed: ${response.status}`;
      throw new Error(message);
    }
    return data;
  }

  async function readLocalDb() {
    try {
      return { ...cloneDefaultDb(), ...JSON.parse(await readFile(dbFile, 'utf8')) };
    } catch {
      return cloneDefaultDb();
    }
  }

  async function writeLocalDb(db) {
    await mkdir(dirname(dbFile), { recursive: true });
    await writeFile(dbFile, JSON.stringify(db, null, 2) + '\n');
  }

  async function selectRows(table, query) {
    return supabaseRequest(`/${table}?${query}`);
  }

  async function upsertRows(table, rows) {
    if (!rows.length) return [];
    const results = [];
    for (const batch of chunk(rows)) {
      const data = await supabaseRequest(`/${table}?on_conflict=id`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(batch)
      });
      results.push(...data);
    }
    return results;
  }

  return {
    type: hasSupabase ? 'supabase' : 'json',

    async readAll() {
      if (!hasSupabase) return readLocalDb();
      const [users, analyticsEvents, supportTickets] = await Promise.all([
        selectRows('otter_users', 'select=*&order=created_at.asc'),
        selectRows('otter_analytics_events', 'select=*&order=timestamp.asc&limit=20000'),
        selectRows('otter_support_tickets', 'select=*&order=created_at.asc')
      ]);
      return {
        users: users.map(fromUserRow),
        analyticsEvents: analyticsEvents.map(fromAnalyticsRow),
        supportTickets: supportTickets.map(fromTicketRow)
      };
    },

    async findUserByEmail(email) {
      if (!hasSupabase) {
        const db = await readLocalDb();
        return db.users.find((item) => item.email === email) || null;
      }
      const rows = await selectRows('otter_users', `select=*&email=eq.${encodeURIComponent(email)}&limit=1`);
      return rows[0] ? fromUserRow(rows[0]) : null;
    },

    async upsertUser(user) {
      if (!hasSupabase) {
        const db = await readLocalDb();
        const index = db.users.findIndex((item) => item.id === user.id || item.email === user.email);
        if (index >= 0) db.users[index] = user;
        else db.users.push(user);
        await writeLocalDb(db);
        return user;
      }
      const [row] = await upsertRows('otter_users', [toUserRow(user)]);
      return fromUserRow(row);
    },

    async insertAnalyticsEvent(event) {
      if (!hasSupabase) {
        const db = await readLocalDb();
        db.analyticsEvents.push(event);
        db.analyticsEvents = db.analyticsEvents.slice(-20000);
        await writeLocalDb(db);
        return event;
      }
      const [row] = await upsertRows('otter_analytics_events', [toAnalyticsRow(event)]);
      return fromAnalyticsRow(row);
    },

    async insertSupportTicket(ticket) {
      if (!hasSupabase) {
        const db = await readLocalDb();
        db.supportTickets.push(ticket);
        await writeLocalDb(db);
        return ticket;
      }
      const [row] = await upsertRows('otter_support_tickets', [toTicketRow(ticket)]);
      return fromTicketRow(row);
    },

    async getMailboxTickets({ userId, email }) {
      if (!hasSupabase) {
        const db = await readLocalDb();
        return db.supportTickets
          .filter((ticket) => (userId && ticket.userId === userId) || (email && ticket.contact.toLowerCase() === email))
          .slice()
          .reverse();
      }
      const rows = [];
      if (userId) rows.push(...await selectRows('otter_support_tickets', `select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`));
      if (email) rows.push(...await selectRows('otter_support_tickets', `select=*&contact=eq.${encodeURIComponent(email)}&order=created_at.desc`));
      const seen = new Set();
      return rows
        .filter((row) => {
          if (seen.has(row.id)) return false;
          seen.add(row.id);
          return true;
        })
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .map(fromTicketRow);
    },

    async updateSupportTicket(ticketId, patch) {
      if (!hasSupabase) {
        const db = await readLocalDb();
        const ticket = db.supportTickets.find((item) => item.id === ticketId);
        if (!ticket) return null;
        Object.assign(ticket, compactObject(patch));
        await writeLocalDb(db);
        return ticket;
      }
      const rows = await supabaseRequest(`/otter_support_tickets?id=eq.${encodeURIComponent(ticketId)}&select=*`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(compactObject({
          status: patch.status,
          admin_note: patch.adminNote,
          admin_reply: patch.adminReply,
          updated_at: patch.updatedAt
        }))
      });
      return rows[0] ? fromTicketRow(rows[0]) : null;
    }
  };
}
