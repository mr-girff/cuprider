/**
 * POST /api/score — Submit a game score
 * Body: { trackKey, playerName, score, goals, completed }
 * Returns: { ok, rank }
 */
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders()
    });
  }

  try {
    const body = await request.json();
    const { trackKey, playerName, score, goals, completed = false } = body;

    if (!trackKey || !playerName || score == null) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: corsHeaders()
      });
    }

    const safeName = playerName.trim().slice(0, 20) || 'Anonymous';
    const kv = env.CUPRIDER_KV;

    // ── Update track leaderboard ──
    const lbKey = `leaderboard:${trackKey}`;
    const existing = await kv.get(lbKey);
    let leaderboard = existing ? JSON.parse(existing) : [];
    leaderboard.push({
      name: safeName,
      score,
      goals,
      completed,
      date: new Date().toISOString().split('T')[0]
    });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 50);
    await kv.put(lbKey, JSON.stringify(leaderboard));

    // ── Update global stats ──
    const statsKey = 'stats:global';
    const statsRaw = await kv.get(statsKey);
    let stats = statsRaw ? JSON.parse(statsRaw) : { totalRides: 0, totalGoals: 0, totalCrashes: 0 };
    stats.totalRides++;
    stats.totalGoals += goals;
    if (!completed) stats.totalCrashes++;
    await kv.put(statsKey, JSON.stringify(stats));

    // ── Update daily stats ──
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `stats:daily:${today}`;
    const dailyRaw = await kv.get(dailyKey);
    let daily = dailyRaw ? JSON.parse(dailyRaw) : { rides: 0, goals: 0, crashes: 0, bestScore: 0, bestPlayer: '' };
    daily.rides++;
    daily.goals += goals;
    if (!completed) daily.crashes++;
    if (score > daily.bestScore) {
      daily.bestScore = score;
      daily.bestPlayer = safeName;
    }
    await kv.put(dailyKey, JSON.stringify(daily));

    const rank = leaderboard.findIndex(e => e.name === safeName && e.score === score) + 1;

    return new Response(JSON.stringify({ ok: true, rank, leaderboard: leaderboard.slice(0, 10) }), {
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
