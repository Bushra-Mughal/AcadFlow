import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from 'jsr:@supabase/server@^1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default {
  fetch: withSupabase({ auth: 'user' }, async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const { content, contentType } = await req.json();

      if (!content || typeof content !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Content is required' }),
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

    const prompt = `You are an expert academic content analyzer for AcadFlow. Analyze the following student work thoroughly and provide constructive, helpful feedback.

Content Type: ${contentType || 'text'}

Student Work:
${content}

Provide a comprehensive analysis in the following JSON format:
{
  "grammarAndSpelling": {
    "issues": ["list of specific grammar and spelling mistakes with examples"],
    "score": 0-100
  },
  "structure": {
    "strengths": ["list of structural strengths"],
    "weaknesses": ["list of structural weaknesses"],
    "suggestions": ["specific suggestions for improvement"],
    "score": 0-100
  },
  "contentQuality": {
    "strengths": ["what the content does well"],
    "weaknesses": ["areas that need improvement"],
    "suggestions": ["specific recommendations"],
    "score": 0-100
  },
  "clarityAndFlow": {
    "rating": "Excellent/Good/Fair/Poor",
    "feedback": "detailed feedback on clarity and flow",
    "score": 0-100
  },
  "plagiarismRisk": {
    "level": "Low/Medium/High",
    "reasoning": "explanation of the assessment",
    "warnings": ["specific concerns if any"]
  },
  "aiSimilarity": {
    "score": 0-100,
    "verdict": "Very Low/Low/Moderate/High/Very High",
    "confidence": 0-100,
    "reasoning": "why this text does or does not look machine-generated",
    "signals": ["specific stylistic tells, e.g. uniform sentence length, low burstiness, generic phrasing, over-hedging, formulaic transitions"],
    "segments": [
      { "text": "short VERBATIM excerpt (max 25 words)", "likelihood": 0-100, "reason": "why this passage reads as AI-written" }
    ],
    "humanizationTips": ["concrete, specific rewrites that make the writing sound authentically human"],
    "advisory": "one-line reminder that this is a heuristic estimate, not proof of misconduct"
  },
  "overallScore": 0-100,
  "readyToSubmit": {
    "answer": "Yes/No",
    "reasoning": "clear explanation of why or why not"
  },
  "recommendedTools": [
    {
      "name": "Tool name",
      "purpose": "What it helps with",
      "url": "https://..."
    }
  ],
  "summary": "Brief encouraging summary of the analysis"
}

For "aiSimilarity", act as a STRICT AI-writing detector comparable to Turnitin's AI score.
- "score" = your best estimate of the PERCENTAGE of the text that appears machine-generated (0 = clearly human, 100 = clearly AI). Map score to verdict: 0-15 Very Low, 16-35 Low, 36-60 Moderate, 61-80 High, 81-100 Very High.
- Judge burstiness (variation in sentence length/structure), perplexity (unexpected, specific word choices), repetitive or over-smooth transitions, an over-neutral impersonal tone, hedging filler, and absence of concrete personal detail or genuine voice.
- Quote the 3-6 MOST suspicious verbatim segments (copy exact words, max 25 words each) with a per-segment likelihood and a short reason.
- Be rigorous but fair and non-accusatory: present everything as likelihood, never as proof. If the text is under ~80 words, set "confidence" low and say so in "reasoning".
- "humanizationTips" must be actionable rewrites the student can apply immediately.

Be constructive, specific, and encouraging. Focus on helping the student improve. Don't be harsh.`;

    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze content', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullText += text;
              }
            } catch (error) {
              console.error('Parse error:', error);
            }
          }
        }
      }
    }

    pending += decoder.decode();
    if (pending.startsWith('data: ')) {
      try {
        const parsed = JSON.parse(pending.slice(6));
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) fullText += text;
      } catch (error) {
        console.error('Final parse error:', error);
      }
    }

    // Extract JSON from response
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: 'Could not extract analysis from response' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  }),
};


