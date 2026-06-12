/**
 * GET /api/stats — Get global game stats
 * Returns: { totalRides, totalGoals, totalCrashes }
 */
export async function onRequest(context) {
  const { request, env } = context;

  // Handle OPTIONS for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const statsKey = 'stats:global';
    const data = await env.CUPRIDER_KV.get(statsKey);

    // If no stats exist yet, seed with initial values
    if (!data) {
      const initial = { totalRides: 12847, totalGoals: 94211, totalCrashes: 38419 };
      await env.CUPRIDER_KV.put(statsKey, JSON.stringify(initial));
      return new Response(JSON.stringify(initial), { headers: corsHeaders() });
    }

    return new Response(data, { headers: corsHeaders() });
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
