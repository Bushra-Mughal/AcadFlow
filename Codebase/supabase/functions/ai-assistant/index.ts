import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from 'jsr:@supabase/server@^1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_HISTORY_MESSAGES = 20;

export default {
  fetch: withSupabase({ auth: 'user' }, async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

  try {
    const {
      message,
      conversationHistory,
      fileContext,
      assignmentContext,
      projectContext,
      pageContext,
      attachments,
      sessionId,
    } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'AI backend is not configured. Set INTEGRATIONS_API_KEY (or GEMINI_API_KEY) in your Supabase Edge Function secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (apiKey.startsWith('sb_publishable_') || apiKey.startsWith('sb_secret_')) {
      return new Response(
        JSON.stringify({ error: 'Invalid AI gateway secret. Do not use a Supabase publishable or secret key as the AI API key.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // â”€â”€ Build system prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let systemPrompt = `You are AcadFlow AI Assistant, a focused 24/7 AI tutor for university students.

RESPONSE FORMATTING RULES â€” follow strictly:
1. Use ## headings only when the response has 3 or more distinct sections.
2. Use bullet points (- item) for lists of 3 or more items.
3. Use numbered steps (1. 2. 3.) for sequential processes.
4. Use **bold** only to highlight the single most important term per section.
5. Keep sentences short and direct. Max 2-3 sentences per paragraph.
6. No filler phrases: never start with "Certainly!", "Great question!", "Of course!", "Absolutely!".
7. No excessive punctuation: avoid "...", em-dashes, or mid-sentence colons unless listing.
8. End responses concisely. Offer a follow-up only when genuinely relevant.
9. Use plain language unless the student uses jargon.
10. MEMORY: You have access to recent conversation history. Build on it.
11. NEVER give generic advice ("manage your time", "start early", "review your notes"). Always reference the student's REAL assignment/project titles, courses, due dates, and statuses from the context above.
12. When answering from an attached file, cite it by name and ground every claim in its actual contents. If a question needs a file's contents you do not have, ask the student to attach it with the paperclip button instead of guessing.
13. If you cannot read a needed file or lack information, say so plainly. Never invent requirements, deadlines, or file contents.`;

    // Assignments context
    if (Array.isArray(assignmentContext) && assignmentContext.length > 0) {
      systemPrompt += `\n\n## Student's Assignments (${assignmentContext.length} total)\n`;
      for (const a of assignmentContext) {
        const due = a.due_date ? new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'no due date';
        systemPrompt += `- **${a.title}** | Course: ${a.course || 'N/A'} | Due: ${due} | Status: ${a.status} | Priority: ${a.priority}${a.description ? ` | Notes: ${a.description}` : ''}\n`;
      }
      systemPrompt += `\nWhen the student asks about their work, reference specific assignment titles, due dates, and statuses above. Help them prioritise, plan, or understand tasks.`;
    }

    // Projects context
    if (Array.isArray(projectContext) && projectContext.length > 0) {
      systemPrompt += `\n\n## Student's Team Projects (${projectContext.length} total)\n`;
      for (const p of projectContext) {
        const due = p.due_date ? new Date(p.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'no due date';
        const role = p.is_creator ? 'creator' : 'member';
        systemPrompt += `- **${p.title}** | Course: ${p.course || 'N/A'} | Due: ${due} | Status: ${p.status} | Priority: ${p.priority} | Role: ${role} | Team size: ${p.member_count ?? 1}${p.description ? ` | Notes: ${p.description}` : ''}\n`;
      }
      systemPrompt += `\nHelp the student collaborate effectively, manage deadlines, and contribute to their team projects.`;
    }

    // Uploaded files context
    if (Array.isArray(fileContext) && fileContext.length > 0) {
      systemPrompt += `\n\n## Uploaded Files\n${fileContext.map((f: any) => `- ${f.name} (${f.file_type})`).join('\n')}`;
    }

    // Attached files: the student explicitly attached these via the paperclip.
    // Their real text was extracted client-side (copilot extractor) and is sent
    // here, so the model can answer "explain this" grounded in actual contents.
    if (Array.isArray(attachments) && attachments.length > 0) {
      systemPrompt += `\n\n## Attached file(s)\nThe student attached the file(s) below and their real contents follow. When they say "this", "the file", "explain it", or ask anything about the attachment, ground your answer in this text.`;
      for (const att of attachments) {
        const name = att && att.name ? att.name : 'attachment';
        if (att && att.text) {
          systemPrompt += `\n\n### ${name}\n"""\n${String(att.text).slice(0, 12000)}\n"""`;
        } else {
          systemPrompt += `\n\n### ${name} - contents could not be read${att && att.note ? ` (${att.note})` : ''}. Say so plainly and ask for a readable format or more detail.`;
        }
      }
    }

    // Page-awareness: where the student is looking right now
    if (pageContext && typeof pageContext === 'object' && (pageContext as any).label) {
      const pc = pageContext as { label?: string; entityTitle?: string };
      systemPrompt += `\n\n## Current page\nThe student is right now on: ${pc.label}${pc.entityTitle ? ` — "${pc.entityTitle}"` : ''}. When they say "this", "it", or "this page", they mean this. Ground page-specific answers in it.`;
    }

    if (sessionId) {
      systemPrompt += `\n\nSession ID: ${sessionId} (maintain continuity throughout this session)`;
    }

    // â”€â”€ Build contents array â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood. I am AcadFlow AI Assistant â€” a focused academic tutor. I have full context of your assignments and projects and am ready to help.' }],
    });

    // Rolling history
    if (Array.isArray(conversationHistory)) {
      const history = conversationHistory.slice(-MAX_HISTORY_MESSAGES);
      const startIdx = history.findIndex((m: any) => m.role === 'user');
      const trimmed = startIdx >= 0 ? history.slice(startIdx) : [];
      for (const msg of trimmed) {
        if (!msg.content || typeof msg.content !== 'string') continue;
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    contents.push({ role: 'user', parts: [{ text: message }] });

    // â”€â”€ Call Gemini â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.9,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-assistant] API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get AI response', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // â”€â”€ Stream response back â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('content-type') || 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('[ai-assistant] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  }),
};


