// Supabase Edge Function: export-to-sheets
//
// Optional. The teacher dashboard's "Export CSV" button always works with no
// setup. This function is only needed for the "Export to Google Sheets"
// button, which pushes results straight into a Google Sheet using a service
// account (no per-teacher Google login required, since this is a personal
// single-teacher tool).
//
// Deploy with:  supabase functions deploy export-to-sheets
// Required secrets (supabase secrets set ...):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL   - client_email from your service account JSON
//   GOOGLE_PRIVATE_KEY             - private_key from the same JSON (keep the \n escapes)
//   GOOGLE_SHEET_ID                - the spreadsheet to write into (share it with the
//                                     service account email as an Editor first)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY - set automatically by Supabase for edge functions
//
// See README.md for step-by-step setup instructions.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function getAccessToken(): Promise<string> {
  const email = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')!
  const rawKey = Deno.env.get('GOOGLE_PRIVATE_KEY')!.replace(/\\n/g, '\n')

  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now
  }

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(rawKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  const jwt = `${unsigned}.${base64url(signature)}`

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Google auth failed: ${JSON.stringify(data)}`)
  return data.access_token
}

Deno.serve(async (req) => {
  try {
    const { lessonId } = await req.json()
    const sheetId = Deno.env.get('GOOGLE_SHEET_ID')!

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('title')
      .eq('id', lessonId)
      .single()
    if (lessonError) throw lessonError

    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .select('*, responses(*, activities(prompt))')
      .eq('lesson_id', lessonId)
    if (subError) throw subError

    const rows: string[][] = [
      ['Student', 'Status', 'Submitted', 'Auto score', 'Max auto score', 'Question', 'Response', 'Auto-correct']
    ]
    for (const s of submissions) {
      const responses = s.responses?.length ? s.responses : [{}]
      for (const r of responses) {
        rows.push([
          s.student_identifier ?? '',
          s.status ?? '',
          s.submitted_at ?? '',
          String(s.score ?? ''),
          String(s.max_auto_score ?? ''),
          r.activities?.prompt ?? '',
          r.response_text ?? '',
          r.auto_correct === null || r.auto_correct === undefined
            ? 'teacher review'
            : r.auto_correct
            ? 'correct'
            : 'incorrect'
        ])
      }
    }

    const accessToken = await getAccessToken()

    // Sheet tab name: lesson title, Sheets tab names max ~100 chars and can't contain []*?/:\\
    const tabName = String(lesson.title).replace(/[\[\]*?/:\\]/g, '').slice(0, 90) || 'Results'

    // Ensure the tab exists (ignore failure if it already does).
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabName } } }] })
    })

    const range = `${tabName}!A1`
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
        range
      )}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: rows })
      }
    )
    if (!updateRes.ok) throw new Error(await updateRes.text())

    return new Response(
      JSON.stringify({ ok: true, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}` }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
