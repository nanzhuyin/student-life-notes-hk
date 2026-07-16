import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const defaultDb = {
  users: [],
  analyticsEvents: [],
  analyticsEventTotal: 0,
  analyticsEventsTruncated: false,
  supportTickets: [],
  posts: [],
  programmes: [],
  recommendationLogs: []
};

const SUPABASE_PAGE_SIZE = 1000;
const ANALYTICS_READ_LIMIT = 50000;
const SUPABASE_RETRY_DELAYS_MS = [500, 1500, 3000];

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableSupabaseError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|network|timeout|terminated|econnreset|econnrefused|etimedout|socket/i.test(message);
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

function toPostRow(post) {
  return {
    id: post.id,
    section_id: post.sectionId,
    title: post.title,
    summary: post.summary || '',
    content: post.content,
    tags: post.tags || [],
    region: post.region || '',
    source: post.source || '',
    author_role: post.authorRole || '管理员',
    status: post.status || 'published',
    shared: Boolean(post.shared),
    recommended: Boolean(post.recommended),
    pinned: Boolean(post.pinned),
    owner_id: post.ownerId || '',
    school_id: post.schoolId || 'shared',
    image_urls: post.imageUrls || [],
    metadata: post.metadata || {},
    created_at: post.createdAt,
    updated_at: post.updatedAt
  };
}

function fromPostRow(row) {
  return {
    id: row.id,
    sectionId: row.section_id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    tags: row.tags || [],
    region: row.region,
    source: row.source,
    authorRole: row.author_role,
    status: row.status,
    shared: row.shared,
    recommended: row.recommended,
    pinned: Boolean(row.pinned),
    ownerId: row.owner_id,
    schoolId: row.school_id,
    imageUrls: row.image_urls || [],
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function fromPlatformSchoolRow(row) {
  return {
    id: row.id,
    shortName: row.short_name || '',
    name: row.name || '',
    nameEn: row.name_en || '',
    accent: row.accent || '',
    description: row.description || ''
  };
}

function fromCourseProgrammeRow(row) {
  return {
    id: row.id,
    schoolId: row.school_id,
    school: row.school || '',
    faculty: row.faculty || '',
    unitName: row.unit_name || '',
    unitType: row.unit_type || '',
    unitLabel: row.unit_label || '',
    parentUnit: row.parent_unit || '',
    unitNote: row.unit_note || '',
    title: row.title || '',
    titleZh: row.title_zh || '',
    titleEn: row.title_en || '',
    translationNote: row.translation_note || '',
    medium: row.medium || '',
    mediumDetail: row.medium_detail || '',
    programmeCodes: row.programme_codes || [],
    studyModes: row.study_modes || [],
    totalCredits: row.total_credits === null || row.total_credits === undefined ? null : Number(row.total_credits),
    sourceUrl: row.source_url || '',
    checkedAt: row.checked_at || '',
    courseCount: Number(row.course_count || 0),
    dataLevel: row.data_level || '',
    statusBadge: row.status_badge || '',
    statusNote: row.status_note || '',
    requirements: row.requirements || {}
  };
}

function fromCourseCatalogCourseRow(row) {
  return {
    id: row.id,
    baseId: row.base_id || '',
    programmeId: row.programme_id || '',
    programmeTitle: row.programme_title || '',
    schoolId: row.school_id || '',
    school: row.school || '',
    faculty: row.faculty || '',
    unitName: row.unit_name || '',
    unitType: row.unit_type || '',
    unitLabel: row.unit_label || '',
    parentUnit: row.parent_unit || '',
    unitNote: row.unit_note || '',
    title: row.title || '',
    titleZh: row.title_zh || '',
    type: row.type || '',
    typeKey: row.type_key || '',
    credits: row.credits === null || row.credits === undefined ? null : Number(row.credits),
    creditsText: row.credits_text || '',
    required: Boolean(row.required),
    description: row.description || '',
    officialDescriptionEn: row.official_description_en || '',
    officialDescriptionZh: row.official_description_zh || '',
    descriptionSourceUrl: row.description_source_url || '',
    descriptionSourceType: row.description_source_type || '',
    courseGuide: row.course_guide || undefined,
    medium: row.medium || '',
    mediumDetail: row.medium_detail || '',
    programmeCodes: row.programme_codes || [],
    sourceUrl: row.source_url || '',
    checkedAt: row.checked_at || '',
    semester: row.semester || '',
    prerequisites: row.prerequisites || '',
    courseCode: row.course_code || '',
    tags: row.tags || [],
    notes: row.notes || '',
    learnerFit: row.learner_fit || [],
    learningGains: row.learning_gains || [],
    careerLinks: row.career_links || [],
    selectionAdvice: row.selection_advice || '',
    perspectiveSummary: row.perspective_summary || '',
    backgroundPerspectives: row.background_perspectives || [],
    strategyFocus: row.strategy_focus || [],
    materialBasis: row.material_basis || []
  };
}

function nullableTimestamp(value) {
  if (!value) return null;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function toProgrammeRow(programme) {
  return {
    id: programme.id,
    programme_name: programme.programmeName,
    degree_level: programme.degreeLevel,
    school: programme.school,
    department: programme.department,
    official_url: programme.officialUrl,
    summary: programme.summary,
    keywords: programme.keywords || [],
    suitable_backgrounds: programme.suitableBackgrounds || [],
    learning_objectives: programme.learningObjectives || [],
    core_courses: programme.coreCourses || [],
    course_descriptions: programme.courseDescriptions || [],
    important_courses: programme.importantCourses || [],
    skills_developed: programme.skillsDeveloped || [],
    career_directions: programme.careerDirections || [],
    graduate_outcome_summary: programme.graduateOutcomeSummary || '',
    graduate_outcomes: programme.graduateOutcomes || [],
    graduate_outcome_information_insufficient: Boolean(programme.graduateOutcomeInformationInsufficient),
    graduate_outcome_information_limits: programme.graduateOutcomeInformationLimits || [],
    admission_notes: programme.admissionNotes || '',
    information_insufficient: Boolean(programme.informationInsufficient),
    information_limits: programme.informationLimits || [],
    source_text: programme.sourceText || '',
    source_urls: programme.sourceUrls || [],
    source_hash: programme.sourceHash || '',
    source_updated_at: nullableTimestamp(programme.sourceUpdatedAt),
    last_updated_at: nullableTimestamp(programme.lastUpdatedAt),
    updated_at: new Date().toISOString()
  };
}

function fromProgrammeRow(row) {
  return {
    id: row.id,
    programmeName: row.programme_name,
    degreeLevel: row.degree_level || 'Other',
    school: row.school || '',
    department: row.department || '',
    officialUrl: row.official_url || '',
    summary: row.summary || '',
    keywords: row.keywords || [],
    suitableBackgrounds: row.suitable_backgrounds || [],
    learningObjectives: row.learning_objectives || [],
    coreCourses: row.core_courses || [],
    courseDescriptions: row.course_descriptions || [],
    importantCourses: row.important_courses || [],
    skillsDeveloped: row.skills_developed || [],
    careerDirections: row.career_directions || [],
    graduateOutcomeSummary: row.graduate_outcome_summary || '',
    graduateOutcomes: row.graduate_outcomes || [],
    graduateOutcomeInformationInsufficient: Boolean(row.graduate_outcome_information_insufficient),
    graduateOutcomeInformationLimits: row.graduate_outcome_information_limits || [],
    admissionNotes: row.admission_notes || '',
    informationInsufficient: Boolean(row.information_insufficient),
    informationLimits: row.information_limits || [],
    sourceText: row.source_text || '',
    sourceUrls: row.source_urls || [],
    sourceHash: row.source_hash || '',
    sourceUpdatedAt: row.source_updated_at || '',
    lastUpdatedAt: row.last_updated_at || ''
  };
}

function toRecommendationLogRow(log) {
  return {
    has_chosen_programme: Boolean(log.hasChosenProgramme),
    selected_programme_id: log.selectedProgrammeId || '',
    selected_programme_name: log.selectedProgrammeName || '',
    undergraduate_major: log.undergraduateMajor || '',
    master_major: log.masterMajor || '',
    main_courses: log.mainCourses || [],
    skills: log.skills || [],
    interests: log.interests || [],
    career_goals: log.careerGoals || [],
    preferred_directions: log.preferredDirections || [],
    target_degree_levels: log.targetDegreeLevels || [],
    study_preferences: log.studyPreferences || [],
    concerns: log.concerns || [],
    work_experience: log.workExperience || [],
    other_context: log.otherContext || '',
    retrieved_programme_ids: log.retrievedProgrammeIds || [],
    model_output: log.modelOutput || null
  };
}

function withoutNewRecommendationColumns(row) {
  const { master_major, other_context, ...rest } = row;
  void master_major;
  void other_context;
  return rest;
}

function withoutNewPostColumns(row) {
  const { pinned, ...rest } = row;
  void pinned;
  return rest;
}

export function createStorage({ dbFile, catalogFile = '', supabaseUrl, supabaseServiceRoleKey, seedPosts = [] }) {
  const hasSupabase = Boolean(supabaseUrl && supabaseServiceRoleKey);
  const supabaseBase = supabaseUrl.replace(/\/$/, '').replace(/\/rest\/v1$/, '');
  const restBase = hasSupabase ? `${supabaseBase}/rest/v1` : '';
  let localCatalogPromise;

  function mergeSeedPosts(storedPosts = []) {
    const postsById = new Map();
    for (const post of seedPosts) postsById.set(post.id, post);
    for (const post of storedPosts) postsById.set(post.id, post);
    return Array.from(postsById.values());
  }

  function sortedPosts(storedPosts = [], includeDrafts = true) {
    return mergeSeedPosts(storedPosts)
      .filter((post) => includeDrafts || post.status === 'published')
      .slice()
      .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  }

  async function supabaseResponse(path, options = {}) {
    let lastError;
    for (let attempt = 0; attempt <= SUPABASE_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
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
        return { data, headers: response.headers };
      } catch (error) {
        lastError = error;
        if (attempt >= SUPABASE_RETRY_DELAYS_MS.length || !isRetryableSupabaseError(error)) throw error;
        await sleep(SUPABASE_RETRY_DELAYS_MS[attempt]);
      }
    }
    throw lastError;
  }

  async function supabaseRequest(path, options = {}) {
    const response = await supabaseResponse(path, options);
    return response.data;
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

  async function readLocalCatalog() {
    if (!catalogFile) return { schools: [], programmes: [], courses: [] };
    localCatalogPromise ||= readFile(catalogFile, 'utf8')
      .then((content) => JSON.parse(content))
      .then((catalog) => ({
        schools: Array.isArray(catalog.schools) ? catalog.schools : [],
        programmes: Array.isArray(catalog.programmes) ? catalog.programmes : [],
        courses: Array.isArray(catalog.courses) ? catalog.courses : []
      }))
      .catch(() => ({ schools: [], programmes: [], courses: [] }));
    return localCatalogPromise;
  }

  async function selectRows(table, query) {
    return supabaseRequest(`/${table}?${query}`);
  }

  async function selectRowsPaged(table, query, maxRows = ANALYTICS_READ_LIMIT) {
    const rows = [];
    for (let offset = 0; rows.length < maxRows; offset += SUPABASE_PAGE_SIZE) {
      const separator = query ? '&' : '';
      const page = await selectRows(table, `${query}${separator}limit=${SUPABASE_PAGE_SIZE}&offset=${offset}`);
      rows.push(...page);
      if (page.length < SUPABASE_PAGE_SIZE) break;
    }
    return rows.slice(0, maxRows);
  }

  async function countRows(table) {
    const { headers } = await supabaseResponse(`/${table}?select=id&limit=1`, {
      headers: { Prefer: 'count=exact' }
    });
    const contentRange = headers.get('content-range') || '';
    const total = Number(contentRange.split('/')[1]);
    return Number.isFinite(total) ? total : 0;
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
      if (!hasSupabase) {
        const db = await readLocalDb();
        return {
          ...db,
          posts: sortedPosts(db.posts),
          analyticsEventTotal: db.analyticsEvents.length,
          analyticsEventsTruncated: false
        };
      }
      const [users, analyticsRowsDesc, analyticsEventTotal, supportTickets, posts] = await Promise.all([
        selectRows('otter_users', 'select=*&order=created_at.asc'),
        selectRowsPaged('otter_analytics_events', 'select=*&order=timestamp.desc'),
        countRows('otter_analytics_events'),
        selectRows('otter_support_tickets', 'select=*&order=created_at.asc'),
        selectRows('otter_posts', 'select=*&order=updated_at.desc').catch(() => [])
      ]);
      return {
        users: users.map(fromUserRow),
        analyticsEvents: analyticsRowsDesc.map(fromAnalyticsRow).reverse(),
        analyticsEventTotal,
        analyticsEventsTruncated: analyticsEventTotal > analyticsRowsDesc.length,
        supportTickets: supportTickets.map(fromTicketRow),
        posts: sortedPosts(posts.map(fromPostRow))
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

    async findUserByUsername(username) {
      if (!hasSupabase) {
        const db = await readLocalDb();
        return db.users.find((item) => item.username.toLowerCase() === username.toLowerCase()) || null;
      }
      const rows = await selectRows('otter_users', `select=*&username=ilike.${encodeURIComponent(username)}&limit=1`);
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
    },

    async listPosts({ includeDrafts = false } = {}) {
      if (!hasSupabase) {
        const db = await readLocalDb();
        return sortedPosts(db.posts, includeDrafts);
      }
      const statusQuery = includeDrafts ? '' : '&status=eq.published';
      const rows = await selectRows('otter_posts', `select=*&order=updated_at.desc${statusQuery}`).catch(() => []);
      return sortedPosts(rows.map(fromPostRow), includeDrafts);
    },

    async upsertPost(post) {
      if (!hasSupabase) {
        const db = await readLocalDb();
        const index = db.posts.findIndex((item) => item.id === post.id);
        if (index >= 0) db.posts[index] = post;
        else db.posts.push(post);
        await writeLocalDb(db);
        return post;
      }
      const postRow = toPostRow(post);
      let rows;
      try {
        rows = await upsertRows('otter_posts', [postRow]);
      } catch (error) {
        if (!/pinned/i.test(error instanceof Error ? error.message : String(error))) throw error;
        rows = await upsertRows('otter_posts', [withoutNewPostColumns(postRow)]);
      }
      const [row] = rows;
      return fromPostRow(row);
    },

    async listPlatformSchools() {
      if (!hasSupabase) return (await readLocalCatalog()).schools;
      const rows = await selectRows('platform_schools', 'select=*&order=id.asc').catch(() => []);
      return rows.map(fromPlatformSchoolRow);
    },

    async listCourseProgrammes() {
      if (!hasSupabase) return (await readLocalCatalog()).programmes;
      const rows = await selectRows('course_programmes', 'select=*&order=school_id.asc,faculty.asc,title.asc').catch(() => []);
      return rows.map(fromCourseProgrammeRow);
    },

    async listCourseCatalogCourses(filters = {}) {
      if (!hasSupabase) {
        return (await readLocalCatalog()).courses.filter((course) => {
          if (filters.schoolId && course.schoolId !== filters.schoolId) return false;
          if (filters.programmeId && course.programmeId !== filters.programmeId) return false;
          if (filters.typeKey && filters.typeKey !== 'all' && course.typeKey !== filters.typeKey) return false;
          if (typeof filters.required === 'boolean' && Boolean(course.required) !== filters.required) return false;
          return true;
        });
      }
      const queryParts = ['select=*'];
      if (filters.schoolId) queryParts.push(`school_id=eq.${encodeURIComponent(filters.schoolId)}`);
      if (filters.programmeId) queryParts.push(`programme_id=eq.${encodeURIComponent(filters.programmeId)}`);
      if (filters.typeKey && filters.typeKey !== 'all') queryParts.push(`type_key=eq.${encodeURIComponent(filters.typeKey)}`);
      if (typeof filters.required === 'boolean') queryParts.push(`required=eq.${filters.required ? 'true' : 'false'}`);
      queryParts.push('order=programme_id.asc,title.asc');
      const rows = await selectRowsPaged('course_catalog_courses', queryParts.join('&'), filters.maxRows || 10000).catch(() => []);
      return rows.map(fromCourseCatalogCourseRow);
    },

    async getCourseCatalogCourse(id) {
      if (!hasSupabase) return (await readLocalCatalog()).courses.find((course) => course.id === id) || null;
      const rows = await selectRows('course_catalog_courses', `select=*&id=eq.${encodeURIComponent(id)}&limit=1`).catch(() => []);
      const [row] = rows;
      return row ? fromCourseCatalogCourseRow(row) : null;
    },

    async listProgrammes() {
      if (!hasSupabase) {
        const db = await readLocalDb();
        return db.programmes || [];
      }
      const rows = await selectRows('programmes', 'select=*&order=programme_name.asc').catch(() => []);
      return rows.map(fromProgrammeRow);
    },

    async upsertProgrammes(programmes) {
      if (!hasSupabase) {
        const db = await readLocalDb();
        db.programmes = programmes;
        await writeLocalDb(db);
        return programmes;
      }
      const rows = await upsertRows('programmes', programmes.map(toProgrammeRow));
      return rows.map(fromProgrammeRow);
    },

    async insertRecommendationLog(log) {
      if (!hasSupabase) {
        const db = await readLocalDb();
        const item = { id: `recommendation_${Date.now()}`, ...log, createdAt: new Date().toISOString() };
        db.recommendationLogs.push(item);
        db.recommendationLogs = db.recommendationLogs.slice(-2000);
        await writeLocalDb(db);
        return item;
      }
      const recommendationRow = toRecommendationLogRow(log);
      let row;
      try {
        [row] = await supabaseRequest('/recommendation_logs?select=*', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(recommendationRow)
        });
      } catch (error) {
        if (!/master_major|other_context/.test(String(error?.message || ''))) throw error;
        [row] = await supabaseRequest('/recommendation_logs?select=*', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(withoutNewRecommendationColumns(recommendationRow))
        });
      }
      return row;
    }
  };
}
