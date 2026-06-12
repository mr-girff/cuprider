/**
 * GET /api/leaderboard?track=XXX — Get top scores for a track
 * Returns: [{ name, score, goals, completed, date }, ...]
 */
export async function onRequest(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  const trackKey = url.searchParams.get('track');

  if (!trackKey) {
    return new Response(JSON.stringify({ error: 'Missing track param' }), {
      status: 400, headers: corsHeaders()
    });
  }

  try {
    const lbKey = `leaderboard:${trackKey}`;
    const data = await env.CUPRIDER_KV.get(lbKey);

    return new Response(data || '[]', {
      headers: corsHeaders()
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders()
    });
  }
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
