import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from 'jsr:@supabase/server@^1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_FILES = 6;
const MAX_CHARS_PER_FILE = 12000;

interface FileRef {
  name: string;
  file_type?: string;
  mime_type?: string;
  url?: string;
  assignment_title?: string;
}

// ── Best-effort text extraction (inlined so this deploys as a single file) ──
const TEXT_EXT = [
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'py', 'js', 'jsx', 'ts', 'tsx',
  'java', 'c', 'cc', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'sh',
  'sql', 'html', 'htm', 'css', 'scss', 'xml', 'yml', 'yaml', 'ipynb', 'log',
];

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function truncate(text: string, maxChars: number): string {
  const clean = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, maxChars) + '\n...[truncated]';
}

function isTextLike(mime: string, ext: string): boolean {
  return mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/x-ipynb+json' ||
    TEXT_EXT.includes(ext);
}

function notebookToText(raw: string): string {
  try {
    const nb = JSON.parse(raw);
    const cells = Array.isArray(nb.cells) ? nb.cells : [];
    return cells
      .map((c: any) => (Array.isArray(c.source) ? c.source.join('') : String(c.source || '')))
      .filter(Boolean)
      .join('\n\n');
  } catch {
    return raw;
  }
}

interface ExtractionResult {
  text: string;
  extracted: boolean;
  note?: string;
}

async function extractTextFromUrl(
  url: string,
  mime = '',
  name = '',
  maxChars = 12000,
): Promise<ExtractionResult> {
  const ext = extOf(name);
  const type = (mime || '').toLowerCase();

  try {
    const res = await fetch(url);
    if (!res.ok) return { text: '', extracted: false, note: `unreachable (${res.status})` };

    // PDF
    if (type === 'application/pdf' || ext === 'pdf') {
      const buf = new Uint8Array(await res.arrayBuffer());
      const { getDocumentProxy, extractText } = await import('npm:unpdf');
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });
      const merged = typeof text === 'string' ? text : (text as string[]).join('\n');
      const out = truncate(merged, maxChars);
      return out ? { text: out, extracted: true } : { text: '', extracted: false, note: 'empty pdf' };
    }

    // DOCX: a zip archive whose body lives in word/document.xml
    if (type.includes('wordprocessingml') || ext === 'docx') {
      const buf = new Uint8Array(await res.arrayBuffer());
      const { unzipSync, strFromU8 } = await import('npm:fflate');
      const unzipped = unzipSync(buf);
      const doc = unzipped['word/document.xml'];
      if (!doc) return { text: '', extracted: false, note: 'docx missing body' };
      const xml = strFromU8(doc)
        .replace(/<\/w:p>/g, '\n')
        .replace(/<w:br[^>]*>/g, '\n')
        .replace(/<w:tab[^>]*>/g, '\t');
      const out = truncate(xml.replace(/<[^>]+>/g, ''), maxChars);
      return out ? { text: out, extracted: true } : { text: '', extracted: false, note: 'empty docx' };
    }

    // Plain text / code / notebook
    if (isTextLike(type, ext)) {
      const raw = await res.text();
      const body = (ext === 'ipynb' || type === 'application/x-ipynb+json') ? notebookToText(raw) : raw;
      const out = truncate(body, maxChars);
      return out ? { text: out, extracted: true } : { text: '', extracted: false, note: 'empty file' };
    }

    return { text: '', extracted: false, note: `unsupported type (${ext || type || 'unknown'})` };
  } catch (err) {
    return { text: '', extracted: false, note: err instanceof Error ? err.message : 'extraction failed' };
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fmtDate(d?: string): string {
  try {
    return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'no due date';
  } catch {
    return 'no due date';
  }
}

function daysUntil(d?: string): string {
  if (!d) return 'no deadline';
  const then = new Date(d).getTime();
  if (Number.isNaN(then)) return 'no deadline';
  const days = Math.round((then - Date.now()) / 86400000);
  if (days < 0) return `overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`;
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  return `due in ${days} days`;
}

// Parse Gemini output as JSON, tolerating stray prose or code fences.
function parseJson(text: string): any | null {
  const t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* give up */ } }
  return null;
}

const PERSONA = `You are AcadFlow Copilot - a sharp, pragmatic study strategist. Think "brilliant senior who already aced this course", not a corporate chatbot. Be direct, specific, and human. Never use filler ("Certainly", "Great question", "I'd be happy to"), never give generic advice ("manage your time", "start early", "stay organized"). Reference the student's real titles, due dates, statuses, and file contents.`;

function buildPlanPrompt(
  assignments: any[],
  projects: any[],
  files: { ref: FileRef; text: string; extracted: boolean; note?: string }[],
): string {
  const today = new Date().toDateString();

  const aLines = assignments.map((a) =>
    `- "${a.title}" | course: ${a.course || 'N/A'} | ${daysUntil(a.due_date)} (${fmtDate(a.due_date)}) | status: ${a.status} | priority: ${a.priority}${a.weightage ? ` | weight: ${a.weightage}%` : ''}${a.description ? ` | brief: ${String(a.description).slice(0, 400)}` : ''}`
  ).join('\n') || '(none)';

  const pLines = projects.map((p) =>
    `- "${p.title}" | course: ${p.course || 'N/A'} | ${daysUntil(p.due_date)} (${fmtDate(p.due_date)}) | status: ${p.status} | priority: ${p.priority} | role: ${p.is_creator ? 'creator' : 'member'} | team size: ${p.member_count ?? 1}${p.description ? ` | notes: ${String(p.description).slice(0, 400)}` : ''}`
  ).join('\n') || '(none)';

  let ctx = `${PERSONA}

TODAY: ${today}

## The student's assignments
${aLines}

## The student's team projects
${pLines}`;

  if (files.length) {
    ctx += `\n\n## Coursework files & subject lectures (contents read where possible)`;
    for (const f of files) {
      if (f.extracted && f.text) {
        ctx += `\n\n### File: "${f.ref.name}"${f.ref.assignment_title ? ` (for: ${f.ref.assignment_title})` : ''}\n"""\n${f.text}\n"""`;
      } else {
        ctx += `\n\n### File: "${f.ref.name}" - contents not readable (${f.note || 'unsupported'}); plan from its name/type only.`;
      }
    }
  }

  ctx += `

## Your job
Produce a concrete, prioritized action plan to complete this work efficiently.
- Prioritize by deadline pressure, then weight, then status. Overdue and near-due high-weight items come first.
- NEVER write generic steps ("research the topic", "work on the report", "study the material"). Every step and sub-task must name the CONCRETE deliverable, section, file, function, or dataset from the brief or lectures (e.g. "Draft the Methodology section (~400 words) describing the CNN architecture from the lecture 5 notes", "Implement minimax with alpha-beta pruning in search.py").
- Ground steps in the file contents above. When a step draws on a specific brief requirement or lecture, mention that source inside the step text AND list its file name in the item's "references".
- Give every step and sub-task a realistic "minutes" estimate derived from the actual scope (word counts, number of deliverables, code complexity). The item "effort" is the summed total, phrased like "3h 20m".
- If the plan would be genuinely sharper with more info, ask 1-3 useful follow-up questions (not rhetorical ones).

Return ONLY valid JSON in exactly this shape:
{
  "summary": "2-3 sentence honest read of the workload and the single most important thing to do first",
  "plan": [
    {
      "title": "assignment or project title (verbatim)",
      "kind": "assignment" or "project",
      "priority": "Do first" or "Do soon" or "When you can",
      "dueLabel": "${'e.g. due in 2 days / overdue by 3 days / no deadline'}",
      "why": "one line on why it sits here in the order",
      "effort": "summed total effort, e.g. '3h 20m'",
      "references": ["file/lecture names this item draws on"],
      "steps": [ { "text": "verb-first concrete action naming the deliverable and its source", "minutes": 45 } ],
      "subtasks": [ { "text": "tickable checklist item", "minutes": 20 } ]
    }
  ],
  "followUpQuestions": ["a clarifying question that would meaningfully improve the plan"]
}
`;

  return ctx;
}

function buildExplainPrompt(
  f: FileRef,
  assignment: any,
  ex: { text: string; extracted: boolean; note?: string },
): string {
  const contentBlock = ex.extracted && ex.text
    ? `"""\n${ex.text}\n"""`
    : `(The file's text could not be read - ${ex.note || 'unsupported format'}. Explain from the file name/type and any assignment brief, and state clearly that you could not read the file contents.)`;

  const assignmentBlock = assignment
    ? `\n\n## Assignment context\n"${assignment.title}"${assignment.course ? ` | course: ${assignment.course}` : ''} | ${daysUntil(assignment.due_date)}${assignment.description ? `\nBrief: ${String(assignment.description).slice(0, 600)}` : ''}`
    : '';

  return `${PERSONA} You are explaining an assignment file to the student who uploaded it.

## File
Name: "${f.name}"${f.assignment_title ? ` | Linked assignment: ${f.assignment_title}` : ''}
Type: ${f.mime_type || f.file_type || 'unknown'}${assignmentBlock}

## File contents
${contentBlock}

## Your job
Explain what this file is and, crucially, what the student is REQUIRED to do. Break down the real requirements, deliverables, formatting/marking rules, and anything easy to miss. Then give concrete next actions. Be direct and human; no filler.

Return ONLY valid JSON:
{
  "name": "${f.name}",
  "whatIsRequired": "2-4 sentence plain-language explanation of what this file demands of the student",
  "keyPoints": ["specific requirements / deliverables / rules, one per line"],
  "easyToMiss": ["subtle requirements or constraints students often overlook"],
  "actionItems": ["verb-first next steps"]
}
`;
}

function buildDelegatePrompt(
  project: any,
  members: { username: string; is_lead?: boolean }[],
  files: { ref: FileRef; text: string; extracted: boolean; note?: string }[],
): string {
  const memberLines = members.map((m) => `- ${m.username}${m.is_lead ? ' (lead / creator)' : ''}`).join('\n');

  let ctx = `${PERSONA} You are the project manager for a team project. Divide the REAL work between the actual teammates listed below.

## Project
"${project.title}"${project.course ? ` | course: ${project.course}` : ''} | ${daysUntil(project.due_date)} (${fmtDate(project.due_date)})${project.description ? `\nBrief: ${String(project.description).slice(0, 800)}` : ''}

## Teammates
${memberLines}`;

  if (files.length) {
    ctx += `\n\n## Project files (contents read where possible)`;
    for (const f of files) {
      if (f.extracted && f.text) {
        ctx += `\n\n### File: "${f.ref.name}"\n"""\n${f.text}\n"""`;
      } else {
        ctx += `\n\n### File: "${f.ref.name}" - not readable (${f.note || 'unsupported'}); infer from its name/type.`;
      }
    }
  }

  ctx += `

## Your job
Split the project into concrete, non-generic tasks and assign them to the teammates above.
- Derive tasks from the ACTUAL brief and deliverables (report sections, rubric items, code modules, slides, testing, editing), never generic filler like "help the team" or "do research".
- Give EVERY teammate (including the lead) a distinct, owned slice of the work; balance effort roughly fairly.
- Each task starts with a verb and is specific enough to be ticked off when done.
- Add a one-line "focus" per teammate describing what they own in plain language.

Return ONLY valid JSON:
{
  "summary": "1-2 sentence read of how the work is divided and why",
  "assignments": [
    {
      "username": "exact username from the Teammates list",
      "focus": "one line on what this person owns",
      "tasks": [ { "title": "verb-first specific task", "detail": "optional one-line clarification" } ]
    }
  ]
}
`;
  return ctx;
}

function buildParsePrompt(transcript: string, kind: string, todayISO: string): string {
  const isProject = kind === 'project';
  const weightRule = isProject ? '' : `
- weightage: the percentage weight if stated (integer 0-100), else null.`;
  const weightField = isProject ? '' : `
  "weightage": <integer 0-100 or null>,`;
  return `${PERSONA} You convert a student's spoken dictation into clean form fields.

TODAY: ${todayISO}

## Spoken text
"""
${transcript}
"""

## Your job
Extract structured fields from ONLY what the student actually said. Rules:
- title: a concise name for the ${isProject ? 'project' : 'assignment'} (the task itself, not the whole sentence). Required; never empty.
- course: the subject or course code if mentioned, else null.
- due_date: resolve any relative date (friday, next week, in 3 days, the 20th) to an absolute date YYYY-MM-DD using TODAY above. If no deadline is stated, use null. Never invent one.
- priority: high if urgency is implied (urgent, asap, important), low if downplayed (minor, whenever, eventually), otherwise medium.${weightRule}
- description: the remaining useful detail the student gave (requirements, deliverables, notes). Empty string if there is none beyond the title.
Do NOT add information that was not spoken. Leave unknown fields null (or empty string for description).

Return ONLY valid JSON in exactly this shape:
{
  "title": "concise task name",
  "course": "course or code, or null",
  "due_date": "YYYY-MM-DD, or null",${weightField}
  "priority": "low or medium or high",
  "description": "remaining detail, or empty string"
}
`;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, topP: 0.95, responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini ${response.status}: ${errorText.slice(0, 300)}`);
  }

  let fullText = '';
  let pending = '';
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) fullText += text;
        } catch { /* ignore partial SSE frame */ }
      }
    }
  }

  pending += decoder.decode();
  if (pending.startsWith('data: ')) {
    const data = pending.slice(6);
    if (data !== '[DONE]') {
      try {
        const parsed = JSON.parse(data);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) fullText += text;
      } catch { /* ignore incomplete final frame */ }
    }
  }

  return fullText;
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
      const body = await req.json();
      const task = body.task === 'explain' ? 'explain' : body.task === 'delegate' ? 'delegate' : body.task === 'extract' ? 'extract' : body.task === 'parse' ? 'parse' : 'plan';

      // 'extract' returns the file's raw text with no model call, so the chat
      // assistant can ground itself in a user-attached file. Needs no API key.
      if (task === 'extract') {
        const ref: FileRef = body.file || {};
        if (!ref.url) return json({ error: 'A file with a downloadable URL is required to read it.' }, 400);
        const ex = await extractTextFromUrl(ref.url, ref.mime_type || '', ref.name || '', MAX_CHARS_PER_FILE);
        return json({ task: 'extract', result: { name: ref.name || '', text: ex.text, extracted: ex.extracted, note: ex.note } }, 200);
      }

      const apiKey = Deno.env.get('INTEGRATIONS_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
      if (!apiKey) {
        return json({ error: 'AI backend is not configured. Set INTEGRATIONS_API_KEY (or GEMINI_API_KEY) in your Supabase Edge Function secrets.' }, 500);
      }
      if (apiKey.startsWith('sb_publishable_') || apiKey.startsWith('sb_secret_')) {
        return json({ error: 'Invalid AI gateway secret. Do not use a Supabase publishable or secret key as the AI API key.' }, 500);
      }

      let prompt: string;

      if (task === 'explain') {
        const ref: FileRef = body.file || {};
        if (!ref.url) return json({ error: 'A file with a downloadable URL is required to explain it.' }, 400);
        const ex = await extractTextFromUrl(ref.url, ref.mime_type || '', ref.name || '', MAX_CHARS_PER_FILE);
        prompt = buildExplainPrompt(ref, body.assignment, ex);
      } else if (task === 'delegate') {
        const project = body.project;
        const members = Array.isArray(body.members) ? body.members : [];
        if (!project || !project.title) return json({ error: 'A project is required to delegate tasks.' }, 400);
        if (members.length === 0) return json({ error: 'At least one teammate is required to delegate tasks.' }, 400);
        const refs: FileRef[] = Array.isArray(body.files) ? body.files.slice(0, MAX_FILES) : [];
        const read = await Promise.all(refs.map(async (ref) => {
          const ex = ref.url
            ? await extractTextFromUrl(ref.url, ref.mime_type || '', ref.name || '', MAX_CHARS_PER_FILE)
            : { text: '', extracted: false, note: 'no url' };
          return { ref, text: ex.text, extracted: ex.extracted, note: ex.note };
        }));
        prompt = buildDelegatePrompt(project, members, read);
      } else if (task === 'parse') {
        const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
        if (!transcript) return json({ error: 'No speech transcript was provided to parse.' }, 400);
        const kind = body.kind === 'project' ? 'project' : 'assignment';
        const todayISO = typeof body.today === 'string' && body.today ? body.today : new Date().toISOString().slice(0, 10);
        prompt = buildParsePrompt(transcript.slice(0, 4000), kind, todayISO);
      } else {
        const assignments = Array.isArray(body.assignments) ? body.assignments : [];
        const projects = Array.isArray(body.projects) ? body.projects : [];
        const refs: FileRef[] = Array.isArray(body.files) ? body.files.slice(0, MAX_FILES) : [];
        if (assignments.length === 0 && projects.length === 0) {
          return json({ error: 'Nothing to plan yet. Add an assignment or project first.' }, 400);
        }
        const read = await Promise.all(refs.map(async (ref) => {
          const ex = ref.url
            ? await extractTextFromUrl(ref.url, ref.mime_type || '', ref.name || '', MAX_CHARS_PER_FILE)
            : { text: '', extracted: false, note: 'no url' };
          return { ref, text: ex.text, extracted: ex.extracted, note: ex.note };
        }));
        prompt = buildPlanPrompt(assignments, projects, read);
      }

      const fullText = await callGemini(apiKey, prompt);
      const parsed = parseJson(fullText);
      if (!parsed) {
        return json({ error: 'Could not parse the AI response. Please try again.' }, 502);
      }
      return json({ task, result: parsed }, 200);
    } catch (error: unknown) {
      console.error('[ai-copilot] error:', error);
      return json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
    }
  }),
};
