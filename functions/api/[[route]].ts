import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'

type Bindings = {
  DB: D1Database
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
  JWT_SECRET: string
}

type Variables = {
  user: { username: string }
}

type TeamCount = 4 | 6 | 8

interface BlueprintRow {
  match_number: number
  round_name: string
  seed_a: number | null
  seed_b: number | null
  next_win_match_number: number | null
  next_win_slot: 'A' | 'B' | null
  next_lose_match_number: number | null
  next_lose_slot: 'A' | 'B' | null
}

function getBracketBlueprint(teamCount: TeamCount): BlueprintRow[] {
  if (teamCount === 4) {
    return [
      { match_number: 1, round_name: 'Semifinal', seed_a: 1, seed_b: 2, next_win_match_number: 4, next_win_slot: 'A', next_lose_match_number: 3, next_lose_slot: 'A' },
      { match_number: 2, round_name: 'Semifinal', seed_a: 3, seed_b: 4, next_win_match_number: 4, next_win_slot: 'B', next_lose_match_number: 3, next_lose_slot: 'B' },
      { match_number: 3, round_name: 'Perebutan Juara 3', seed_a: null, seed_b: null, next_win_match_number: null, next_win_slot: null, next_lose_match_number: null, next_lose_slot: null },
      { match_number: 4, round_name: 'Final', seed_a: null, seed_b: null, next_win_match_number: null, next_win_slot: null, next_lose_match_number: null, next_lose_slot: null },
    ]
  }
  if (teamCount === 6) {
    return [
      { match_number: 1, round_name: 'Penyisihan', seed_a: 3, seed_b: 4, next_win_match_number: 3, next_win_slot: 'B', next_lose_match_number: null, next_lose_slot: null },
      { match_number: 2, round_name: 'Penyisihan', seed_a: 5, seed_b: 6, next_win_match_number: 4, next_win_slot: 'B', next_lose_match_number: null, next_lose_slot: null },
      { match_number: 3, round_name: 'Semifinal', seed_a: 1, seed_b: null, next_win_match_number: 6, next_win_slot: 'A', next_lose_match_number: 5, next_lose_slot: 'A' },
      { match_number: 4, round_name: 'Semifinal', seed_a: 2, seed_b: null, next_win_match_number: 6, next_win_slot: 'B', next_lose_match_number: 5, next_lose_slot: 'B' },
      { match_number: 5, round_name: 'Perebutan Juara 3', seed_a: null, seed_b: null, next_win_match_number: null, next_win_slot: null, next_lose_match_number: null, next_lose_slot: null },
      { match_number: 6, round_name: 'Final', seed_a: null, seed_b: null, next_win_match_number: null, next_win_slot: null, next_lose_match_number: null, next_lose_slot: null },
    ]
  }
  return [
    { match_number: 1, round_name: 'Penyisihan', seed_a: 1, seed_b: 2, next_win_match_number: 5, next_win_slot: 'A', next_lose_match_number: null, next_lose_slot: null },
    { match_number: 2, round_name: 'Penyisihan', seed_a: 3, seed_b: 4, next_win_match_number: 5, next_win_slot: 'B', next_lose_match_number: null, next_lose_slot: null },
    { match_number: 3, round_name: 'Penyisihan', seed_a: 5, seed_b: 6, next_win_match_number: 6, next_win_slot: 'A', next_lose_match_number: null, next_lose_slot: null },
    { match_number: 4, round_name: 'Penyisihan', seed_a: 7, seed_b: 8, next_win_match_number: 6, next_win_slot: 'B', next_lose_match_number: null, next_lose_slot: null },
    { match_number: 5, round_name: 'Semifinal', seed_a: null, seed_b: null, next_win_match_number: 8, next_win_slot: 'A', next_lose_match_number: 7, next_lose_slot: 'A' },
    { match_number: 6, round_name: 'Semifinal', seed_a: null, seed_b: null, next_win_match_number: 8, next_win_slot: 'B', next_lose_match_number: 7, next_lose_slot: 'B' },
    { match_number: 7, round_name: 'Perebutan Juara 3', seed_a: null, seed_b: null, next_win_match_number: null, next_win_slot: null, next_lose_match_number: null, next_lose_slot: null },
    { match_number: 8, round_name: 'Final', seed_a: null, seed_b: null, next_win_match_number: null, next_win_slot: null, next_lose_match_number: null, next_lose_slot: null },
  ]
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath('/api')

// Auth middleware for protected routes
app.use('/events/*', async (c, next) => {
  const token = getCookie(c, 'session')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('user', { username: String(payload.username) })
    await next()
  } catch {
    return c.json({ error: 'Sesi tidak valid atau kedaluwarsa' }, 401)
  }
})

app.use('/events', async (c, next) => {
  const token = getCookie(c, 'session')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('user', { username: String(payload.username) })
    await next()
  } catch {
    return c.json({ error: 'Sesi tidak valid atau kedaluwarsa' }, 401)
  }
})

app.use('/matches/*', async (c, next) => {
  const token = getCookie(c, 'session')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('user', { username: String(payload.username) })
    await next()
  } catch {
    return c.json({ error: 'Sesi tidak valid atau kedaluwarsa' }, 401)
  }
})

// 1. Auth Endpoints
app.post('/auth/login', async (c) => {
  const body = await c.req.json<{ username?: string; password?: string }>().catch(() => ({}))
  const username = body.username?.trim() ?? ''
  const password = body.password ?? ''

  if (!username || !password) {
    return c.json({ error: 'Username dan password wajib diisi' }, 400)
  }

  if (username !== c.env.ADMIN_USERNAME || password !== c.env.ADMIN_PASSWORD) {
    return c.json({ error: 'Username atau password salah' }, 401)
  }

  const now = Math.floor(Date.now() / 1000)
  const token = await sign(
    {
      username,
      iat: now,
      exp: now + 60 * 60 * 24 * 7, // 7 hari
    },
    c.env.JWT_SECRET,
    'HS256'
  )

  const isHttps = c.req.url.startsWith('https://')
  setCookie(c, 'session', token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'Strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return c.json({ authenticated: true, username })
})

app.post('/auth/logout', (c) => {
  deleteCookie(c, 'session', { path: '/' })
  return c.json({ authenticated: false })
})

app.get('/auth/me', async (c) => {
  const token = getCookie(c, 'session')
  if (!token) {
    return c.json({ authenticated: false }, 401)
  }
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    return c.json({ authenticated: true, username: String(payload.username) })
  } catch {
    return c.json({ authenticated: false }, 401)
  }
})

// 2. Events Endpoints
app.get('/events', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM events ORDER BY created_at DESC'
  ).all()
  return c.json({ events: results })
})

app.post('/events', async (c) => {
  const body = await c.req.json<{
    name?: string
    team_count?: number
    timer_seconds?: number
  }>()

  const name = body.name?.trim()
  const teamCount = Number(body.team_count)
  const timerSeconds = Number(body.timer_seconds ?? 20)

  if (!name) {
    return c.json({ error: 'Nama event wajib diisi' }, 400)
  }
  if (teamCount !== 4 && teamCount !== 6 && teamCount !== 8) {
    return c.json({ error: 'Jumlah tim harus 4, 6, atau 8' }, 400)
  }
  if (!Number.isFinite(timerSeconds) || timerSeconds < 5 || timerSeconds > 120) {
    return c.json({ error: 'Durasi timer harus antara 5–120 detik' }, 400)
  }

  const eventId = crypto.randomUUID()
  const statements: D1PreparedStatement[] = []

  statements.push(
    c.env.DB.prepare(
      'INSERT INTO events (id, name, team_count, timer_seconds, status) VALUES (?, ?, ?, ?, ?)'
    ).bind(eventId, name, teamCount, timerSeconds, 'active')
  )

  const teamIdsBySeed = new Map<number, string>()
  for (let seed = 1; seed <= teamCount; seed++) {
    const teamId = crypto.randomUUID()
    teamIdsBySeed.set(seed, teamId)
    statements.push(
      c.env.DB.prepare(
        'INSERT INTO teams (id, event_id, name, seed_order) VALUES (?, ?, ?, ?)'
      ).bind(teamId, eventId, `Tim ${seed}`, seed)
    )
  }

  const blueprint = getBracketBlueprint(teamCount)
  for (const bp of blueprint) {
    const matchId = crypto.randomUUID()
    const teamAId = bp.seed_a ? (teamIdsBySeed.get(bp.seed_a) ?? null) : null
    const teamBId = bp.seed_b ? (teamIdsBySeed.get(bp.seed_b) ?? null) : null
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO matches (
          id, event_id, match_number, round_name, team_a_id, team_b_id,
          next_win_match_number, next_win_slot, next_lose_match_number, next_lose_slot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        matchId,
        eventId,
        bp.match_number,
        bp.round_name,
        teamAId,
        teamBId,
        bp.next_win_match_number,
        bp.next_win_slot,
        bp.next_lose_match_number,
        bp.next_lose_slot
      )
    )
  }

  await c.env.DB.batch(statements)

  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first()

  return c.json({ event }, 201)
})

app.get('/events/:id/bundle', async (c) => {
  const eventId = c.req.param('id')
  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first()

  if (!event) {
    return c.json({ error: 'Event tidak ditemukan' }, 404)
  }

  const [teamsRes, matchesRes, questionsRes] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM teams WHERE event_id = ? ORDER BY seed_order ASC')
      .bind(eventId)
      .all(),
    c.env.DB.prepare('SELECT * FROM matches WHERE event_id = ? ORDER BY match_number ASC')
      .bind(eventId)
      .all(),
    c.env.DB.prepare('SELECT * FROM questions WHERE event_id = ? ORDER BY type ASC, match_number ASC, question_order ASC')
      .bind(eventId)
      .all(),
  ])

  return c.json({
    event,
    teams: teamsRes.results,
    matches: matchesRes.results,
    questions: questionsRes.results,
  })
})

app.put('/events/:id/teams', async (c) => {
  const eventId = c.req.param('id')
  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first<{ id: string; team_count: TeamCount }>()

  if (!event) {
    return c.json({ error: 'Event tidak ditemukan' }, 404)
  }

  const body = await c.req.json<{
    teams: Array<{ id: string; name: string; seed_order: number }>
  }>()

  if (!Array.isArray(body.teams) || body.teams.length !== event.team_count) {
    return c.json({ error: `Jumlah tim harus tepat ${event.team_count}` }, 400)
  }

  const statements: D1PreparedStatement[] = []
  const teamIdsBySeed = new Map<number, string>()

  for (const t of body.teams) {
    const cleanName = t.name.trim()
    if (!cleanName) {
      return c.json({ error: 'Nama tim tidak boleh kosong' }, 400)
    }
    teamIdsBySeed.set(t.seed_order, t.id)
    statements.push(
      c.env.DB.prepare(
        'UPDATE teams SET name = ?, seed_order = ? WHERE id = ? AND event_id = ?'
      ).bind(cleanName, t.seed_order, t.id, eventId)
    )
  }

  // Perbarui slot tim awal pada match yang masih pending berdasarkan blueprint
  const blueprint = getBracketBlueprint(event.team_count)
  for (const bp of blueprint) {
    if (bp.seed_a !== null || bp.seed_b !== null) {
      const teamAId = bp.seed_a ? (teamIdsBySeed.get(bp.seed_a) ?? null) : null
      const teamBId = bp.seed_b ? (teamIdsBySeed.get(bp.seed_b) ?? null) : null

      if (bp.seed_a !== null && bp.seed_b !== null) {
        statements.push(
          c.env.DB.prepare(
            "UPDATE matches SET team_a_id = ?, team_b_id = ? WHERE event_id = ? AND match_number = ? AND status = 'pending'"
          ).bind(teamAId, teamBId, eventId, bp.match_number)
        )
      } else if (bp.seed_a !== null) {
        statements.push(
          c.env.DB.prepare(
            "UPDATE matches SET team_a_id = ? WHERE event_id = ? AND match_number = ? AND status = 'pending'"
          ).bind(teamAId, eventId, bp.match_number)
        )
      } else if (bp.seed_b !== null) {
        statements.push(
          c.env.DB.prepare(
            "UPDATE matches SET team_b_id = ? WHERE event_id = ? AND match_number = ? AND status = 'pending'"
          ).bind(teamBId, eventId, bp.match_number)
        )
      }
    }
  }

  await c.env.DB.batch(statements)
  return c.json({ ok: true })
})

app.post('/events/:id/questions/import', async (c) => {
  const eventId = c.req.param('id')
  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first<{ id: string; team_count: TeamCount }>()

  if (!event) {
    return c.json({ error: 'Event tidak ditemukan' }, 404)
  }

  const body = await c.req.json<{
    questions: Array<{
      type: 'main' | 'backup'
      match_number: number | null
      question_order: number | null
      question_text: string
      answers: Array<{ text: string; points: number }>
    }>
  }>()

  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    return c.json({ error: 'Daftar soal tidak boleh kosong' }, 400)
  }

  const expectedMainCount = event.team_count * 2
  const mainQuestions = body.questions.filter((q) => q.type === 'main')
  if (mainQuestions.length !== expectedMainCount) {
    return c.json(
      {
        error: `Jumlah soal utama (main) harus tepat ${expectedMainCount} untuk format ${event.team_count} tim (ditemukan ${mainQuestions.length}).`,
      },
      400
    )
  }

  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare('DELETE FROM questions WHERE event_id = ?').bind(eventId),
  ]

  for (let i = 0; i < body.questions.length; i++) {
    const q = body.questions[i]!
    if (!q.question_text?.trim()) {
      return c.json({ error: `Soal #${i + 1}: Teks pertanyaan kosong` }, 400)
    }
    if (!Array.isArray(q.answers) || q.answers.length !== 5) {
      return c.json({ error: `Soal #${i + 1}: Wajib memiliki tepat 5 jawaban` }, 400)
    }
    const totalPoints = q.answers.reduce((sum, a) => sum + Number(a.points), 0)
    const invalidMult = q.answers.some((a) => Number(a.points) <= 0 || Number(a.points) % 5 !== 0)
    if (invalidMult || totalPoints !== 100) {
      return c.json(
        { error: `Soal #${i + 1}: Bobot harus kelipatan 5 (>0) dan total tepat 100 (saat ini ${totalPoints})` },
        400
      )
    }

    statements.push(
      c.env.DB.prepare(
        `INSERT INTO questions (
          id, event_id, type, match_number, question_order, question_text, answers_json, is_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
      ).bind(
        crypto.randomUUID(),
        eventId,
        q.type,
        q.type === 'main' ? q.match_number : null,
        q.type === 'main' ? q.question_order : null,
        q.question_text.trim(),
        JSON.stringify(q.answers.map((a) => ({ text: a.text.trim(), points: Number(a.points) })))
      )
    )
  }

  await c.env.DB.batch(statements)
  return c.json({ ok: true, count: body.questions.length })
})

// 3. Matches Endpoints
app.post('/matches/:id/complete', async (c) => {
  const matchId = c.req.param('id')
  const match = await c.env.DB.prepare('SELECT * FROM matches WHERE id = ?')
    .bind(matchId)
    .first<{
      id: string
      event_id: string
      next_win_match_number: number | null
      next_win_slot: 'A' | 'B' | null
      next_lose_match_number: number | null
      next_lose_slot: 'A' | 'B' | null
    }>()

  if (!match) {
    return c.json({ error: 'Match tidak ditemukan' }, 404)
  }

  const body = await c.req.json<{
    score_a: number
    score_b: number
    winner_team_id: string
    loser_team_id: string
    used_backup_question_ids?: string[]
  }>()

  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(
      `UPDATE matches
       SET score_a = ?, score_b = ?, winner_team_id = ?, loser_team_id = ?, status = 'completed'
       WHERE id = ?`
    ).bind(body.score_a, body.score_b, body.winner_team_id, body.loser_team_id, matchId),
  ]

  if (match.next_win_match_number && match.next_win_slot) {
    const col = match.next_win_slot === 'A' ? 'team_a_id' : 'team_b_id'
    statements.push(
      c.env.DB.prepare(
        `UPDATE matches SET ${col} = ? WHERE event_id = ? AND match_number = ?`
      ).bind(body.winner_team_id, match.event_id, match.next_win_match_number)
    )
  }

  if (match.next_lose_match_number && match.next_lose_slot) {
    const col = match.next_lose_slot === 'A' ? 'team_a_id' : 'team_b_id'
    statements.push(
      c.env.DB.prepare(
        `UPDATE matches SET ${col} = ? WHERE event_id = ? AND match_number = ?`
      ).bind(body.loser_team_id, match.event_id, match.next_lose_match_number)
    )
  }

  if (Array.isArray(body.used_backup_question_ids)) {
    for (const qId of body.used_backup_question_ids) {
      statements.push(
        c.env.DB.prepare('UPDATE questions SET is_used = 1 WHERE id = ? AND event_id = ?')
          .bind(qId, match.event_id)
      )
    }
  }

  await c.env.DB.batch(statements)
  return c.json({ ok: true })
})

app.post('/matches/:id/reset', async (c) => {
  const matchId = c.req.param('id')
  const match = await c.env.DB.prepare('SELECT id FROM matches WHERE id = ?')
    .bind(matchId)
    .first()

  if (!match) {
    return c.json({ error: 'Match tidak ditemukan' }, 404)
  }

  await c.env.DB.prepare(
    `UPDATE matches
     SET score_a = 0, score_b = 0, winner_team_id = NULL, loser_team_id = NULL, status = 'pending'
     WHERE id = ?`
  )
    .bind(matchId)
    .run()

  return c.json({ ok: true })
})

export const onRequest = handle(app)

