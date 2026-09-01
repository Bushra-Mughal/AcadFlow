import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
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

    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
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

Be constructive, specific, and encouraging. Focus on helping the student improve. Don't be harsh.`;

    const apiUrl = 'https://app-biof3pfof94x-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Authorization': `Bearer ${apiKey}`,
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
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

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
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
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
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


