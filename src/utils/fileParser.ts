import type { AnswerOption, ParsedQuestionInput, TeamCount } from '../types'
import { getRequiredMainQuestionsCount } from './bracketGenerator'

export interface ParseResult {
  questions: ParsedQuestionInput[]
  errors: string[]
}

/**
 * Validasi daftar soal:
 * 1. Tepat 5 jawaban per soal, bobot kelipatan 5 (> 0), total poin = 100.
 * 2. Tipe 'main' wajib punya match_number & question_order (1 atau 2).
 * 3. Jumlah soal 'main' sesuai teamCount * 2.
 */
export function validateQuestions(
  rawQuestions: ParsedQuestionInput[],
  teamCount: TeamCount
): string[] {
  const errors: string[] = []

  if (rawQuestions.length === 0) {
    errors.push('File tidak berisi soal sama sekali.')
    return errors
  }

  const requiredMain = getRequiredMainQuestionsCount(teamCount)
  const mainCount = rawQuestions.filter((q) => q.type === 'main').length
  if (mainCount !== requiredMain) {
    errors.push(
      `Jumlah soal utama (type="main") harus tepat ${requiredMain} untuk format ${teamCount} tim (ditemukan ${mainCount}).`
    )
  }

  const seenMainSlots = new Set<string>()
  const maxMatch = teamCount

  rawQuestions.forEach((q, idx) => {
    const label = `Soal #${idx + 1}`
    if (!q.question_text || !q.question_text.trim()) {
      errors.push(`${label}: Teks pertanyaan tidak boleh kosong.`)
    }

    if (q.type !== 'main' && q.type !== 'backup') {
      errors.push(`${label}: Tipe soal harus 'main' atau 'backup'.`)
    }

    if (q.type === 'main') {
      if (
        !q.match_number ||
        q.match_number < 1 ||
        q.match_number > maxMatch
      ) {
        errors.push(
          `${label}: match_number harus antara 1 sampai ${maxMatch} untuk format ${teamCount} tim.`
        )
      }
      if (q.question_order !== 1 && q.question_order !== 2) {
        errors.push(`${label}: question_order harus bernilai 1 atau 2.`)
      }
      const slotKey = `${q.match_number}-${q.question_order}`
      if (seenMainSlots.has(slotKey)) {
        errors.push(
          `${label}: Duplikat slot Match ${q.match_number} Soal ${q.question_order}.`
        )
      }
      seenMainSlots.add(slotKey)
    }

    if (!Array.isArray(q.answers) || q.answers.length !== 5) {
      errors.push(`${label}: Wajib memiliki tepat 5 jawaban.`)
      return
    }

    let total = 0
    q.answers.forEach((ans, aIdx) => {
      if (!ans.text || !ans.text.trim()) {
        errors.push(`${label}, Jawaban #${aIdx + 1}: Teks jawaban kosong.`)
      }
      const pts = Number(ans.points)
      if (!Number.isInteger(pts) || pts <= 0 || pts % 5 !== 0) {
        errors.push(
          `${label}, Jawaban #${aIdx + 1}: Bobot poin (${ans.points}) harus kelipatan 5 dan > 0.`
        )
      }
      total += Number.isFinite(pts) ? pts : 0
    })

    if (total !== 100) {
      errors.push(
        `${label}: Total poin semua jawaban harus 100 (saat ini: ${total}).`
      )
    }
  })

  return errors
}

export function parseJsonQuestions(
  content: string,
  teamCount: TeamCount
): ParseResult {
  try {
    const parsed = JSON.parse(content) as { questions?: unknown[] }
    if (!parsed || !Array.isArray(parsed.questions)) {
      return {
        questions: [],
        errors: ['Format JSON tidak valid: harus memiliki array "questions".'],
      }
    }

    const questions: ParsedQuestionInput[] = parsed.questions.map((item) => {
      const obj = item as Record<string, unknown>
      const answersRaw = Array.isArray(obj.answers) ? obj.answers : []
      const answers: AnswerOption[] = answersRaw.map((a) => {
        const ansObj = a as Record<string, unknown>
        return {
          text: String(ansObj.text ?? '').trim(),
          points: Number(ansObj.points ?? 0),
        }
      })

      return {
        type: obj.type === 'backup' ? 'backup' : 'main',
        match_number:
          obj.match_number === null || obj.match_number === undefined
            ? null
            : Number(obj.match_number),
        question_order:
          obj.question_order === null || obj.question_order === undefined
            ? null
            : Number(obj.question_order),
        question_text: String(obj.question_text ?? '').trim(),
        answers,
      }
    })

    const errors = validateQuestions(questions, teamCount)
    return { questions, errors }
  } catch (err) {
    return {
      questions: [],
      errors: [
        `Gagal membaca JSON: ${err instanceof Error ? err.message : 'Format rusak'}`,
      ],
    }
  }
}

/**
 * Parser CSV sederhana yang mendukung tanda kutip ganda (RFC 4180).
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

export function parseCsvQuestions(
  content: string,
  teamCount: TeamCount
): ParseResult {
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0)

  if (lines.length < 2) {
    return {
      questions: [],
      errors: ['File CSV kosong atau tidak memiliki baris data.'],
    }
  }

  const header = parseCsvLine(lines[0]!)
  const expectedHeader = [
    'type',
    'match_number',
    'question_order',
    'question_text',
    'ans_1',
    'pts_1',
    'ans_2',
    'pts_2',
    'ans_3',
    'pts_3',
    'ans_4',
    'pts_4',
    'ans_5',
    'pts_5',
  ]

  if (header.length < expectedHeader.length) {
    return {
      questions: [],
      errors: [
        `Header CSV tidak sesuai. Gunakan template CSV resmi (${expectedHeader.join(',')}).`,
      ],
    }
  }

  const questions: ParsedQuestionInput[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!)
    const typeVal = cols[0] === 'backup' ? 'backup' : 'main'
    const matchNum = cols[1] ? Number(cols[1]) : null
    const qOrder = cols[2] ? Number(cols[2]) : null
    const qText = cols[3] ?? ''

    const answers: AnswerOption[] = []
    for (let a = 0; a < 5; a++) {
      const ansText = cols[4 + a * 2] ?? ''
      const pts = Number(cols[5 + a * 2] ?? 0)
      answers.push({ text: ansText, points: pts })
    }

    questions.push({
      type: typeVal,
      match_number: typeVal === 'main' ? matchNum : null,
      question_order: typeVal === 'main' ? qOrder : null,
      question_text: qText,
      answers,
    })
  }

  const errors = validateQuestions(questions, teamCount)
  return { questions, errors }
}

export function generateJsonTemplate(teamCount: TeamCount): string {
  const questions: ParsedQuestionInput[] = []
  for (let m = 1; m <= teamCount; m++) {
    for (let o = 1; o <= 2; o++) {
      questions.push({
        type: 'main',
        match_number: m,
        question_order: o,
        question_text: `Contoh pertanyaan Match ${m} Soal ${o}?`,
        answers: [
          { text: 'Jawaban Peringkat 1', points: 35 },
          { text: 'Jawaban Peringkat 2', points: 25 },
          { text: 'Jawaban Peringkat 3', points: 20 },
          { text: 'Jawaban Peringkat 4', points: 10 },
          { text: 'Jawaban Peringkat 5', points: 10 },
        ],
      })
    }
  }
  questions.push({
    type: 'backup',
    match_number: null,
    question_order: null,
    question_text:
      'Apa yang biasanya dilakukan mahasiswa kalau dosen telat masuk kelas lebih dari 15 menit?',
    answers: [
      { text: 'Cek grup WhatsApp kelas', points: 35 },
      { text: 'Pergi ke kantin', points: 25 },
      { text: 'Main game', points: 20 },
      { text: 'Tidur', points: 10 },
      { text: 'Tanya PJ matkul', points: 10 },
    ],
  })
  return JSON.stringify({ questions }, null, 2)
}

export function generateCsvTemplate(teamCount: TeamCount): string {
  const rows: string[] = [
    'type,match_number,question_order,question_text,ans_1,pts_1,ans_2,pts_2,ans_3,pts_3,ans_4,pts_4,ans_5,pts_5',
  ]
  for (let m = 1; m <= teamCount; m++) {
    for (let o = 1; o <= 2; o++) {
      rows.push(
        `main,${m},${o},"Contoh pertanyaan Match ${m} Soal ${o}?","Jawaban 1",35,"Jawaban 2",25,"Jawaban 3",20,"Jawaban 4",10,"Jawaban 5",10`
      )
    }
  }
  rows.push(
    `backup,,,"Apa yang biasanya dilakukan mahasiswa kalau dosen telat masuk kelas lebih dari 15 menit?","Cek grup WhatsApp kelas",35,"Pergi ke kantin",25,"Main game",20,"Tidur",10,"Tanya PJ matkul",10`
  )
  return rows.join('\n')
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

