/**
 * CF Pages Function: /api/chat
 * Sage AI chat — calls Groq API directly (no Flask / no PC required)
 *
 * Required CF Pages env var:
 *   GROQ_API_KEY
 */

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are Sage AI — an autonomous AI assistant specialized in helping solopreneurs build income streams, automate their business, and grow on social media.

You are direct, practical, and results-focused. You give specific, actionable advice with real numbers and examples. You understand tools like Notion, Cloudflare Workers, Groq, Bluesky, Instagram, Stripe, Gumroad, and Make.com.

When the user asks about their current phase or topic, tailor your advice accordingly. Keep responses concise (under 300 words) unless a detailed breakdown is needed.`;

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const userMessage = body.message || body.content || '';

    if (!userMessage.trim()) {
      return new Response(JSON.stringify({ error: 'No message provided' }), {
        status: 400, headers: corsHeaders,
      });
    }

    const groqKey = env.GROQ_API_KEY;
    if (!groqKey) {
      return new Response(JSON.stringify({
        response: "Sage AI is running in demo mode. Add GROQ_API_KEY to CF Pages env vars to enable live chat.",
      }), { headers: corsHeaders });
    }

    const groqRes = await fetch(GROQ_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim()
      || 'Sage AI encountered an issue. Please try again.';

    return new Response(JSON.stringify({ response: reply }), { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({
      error: 'Chat unavailable', detail: String(err),
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
