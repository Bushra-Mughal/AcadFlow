import { corsHeaders } from '../_shared/cors.ts';

const MAX_HISTORY_MESSAGES = 20;

Deno.serve(async (req) => {
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
      sessionId,
    } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
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
10. MEMORY: You have access to recent conversation history. Build on it.`;

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
    const apiUrl = 'https://app-biof3pfof94x-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Authorization': `Bearer ${apiKey}`,
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
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(new TextEncoder().encode(decoder.decode(value)));
            }
          } catch (err) {
            console.error('[ai-assistant] Stream error:', err);
          } finally {
            controller.close();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[ai-assistant] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


