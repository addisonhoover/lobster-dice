// Owner roster for Crimson Dice kits 01–25.
// Gate: CRIMSON_OWNER_KEY (shared code Addison types on /crimson/activity).
// Read: SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). Anon clients cannot SELECT.

const KITS = Array.from({ length: 25 }, (_, i) => String(i + 1).padStart(2, '0'));

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readKey(req) {
  const auth = req.headers.authorization || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const hdr = req.headers['x-owner-key'];
  if (hdr) return String(hdr).trim();
  try {
    const url = new URL(req.url, 'http://localhost');
    const q = url.searchParams.get('key');
    if (q) return q.trim();
  } catch (e) {}
  return '';
}

function emptyRoster() {
  const kits = {};
  for (const id of KITS) {
    kits[id] = {
      kit: id,
      opened: false,
      opens: 0,
      returns: 0,
      games: 0,
      last_seen: null,
      name: null,
      email: null
    };
  }
  return kits;
}

function aggregate(rows) {
  const kits = emptyRoster();
  for (const row of rows || []) {
    const k = kits[row.kit_id];
    if (!k) continue;
    if (row.event === 'open') k.opens += 1;
    if (row.event === 'return') k.returns += 1;
    if (row.event === 'game_end' || row.event === 'game_start') {
      if (row.event === 'game_end') k.games += 1;
    }
    if (row.event === 'open' || row.event === 'return') k.opened = true;
    if (row.event === 'setup' || row.event === 'game_start' || row.event === 'game_end') k.opened = true;
    if (row.created_at && (!k.last_seen || row.created_at > k.last_seen)) k.last_seen = row.created_at;
    if (row.name) k.name = row.name;
    if (row.email) k.email = row.email;
  }
  // any event counts as opened
  for (const row of rows || []) {
    if (kits[row.kit_id]) kits[row.kit_id].opened = true;
  }
  const list = KITS.map(id => kits[id]);
  return {
    kits: list,
    totals: {
      opened: list.filter(k => k.opened).length,
      opens: list.reduce((s, k) => s + k.opens + k.returns, 0),
      games: list.reduce((s, k) => s + k.games, 0)
    }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    json(res, 405, { error: 'method not allowed' });
    return;
  }

  const expected = process.env.CRIMSON_OWNER_KEY || 'change-me-crimson-owner';
  const given = readKey(req);
  if (!given || given !== expected) {
    console.error('crimson-activity: unauthorized');
    json(res, 401, { error: 'unauthorized' });
    return;
  }

  const url = process.env.SUPABASE_URL || process.env.SUPA_URL || 'https://exxpaetnxamzqifqkyly.supabase.co';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPA_SERVICE_ROLE_KEY;
  if (!service) {
    console.error('crimson-activity: missing SUPABASE_SERVICE_ROLE_KEY');
    json(res, 503, {
      error: 'missing_service_role',
      hint: 'Set SUPABASE_SERVICE_ROLE_KEY on the Vercel project so the owner page can read kit events.'
    });
    return;
  }

  try {
    const r = await fetch(
      `${url}/rest/v1/crimson_events?select=kit_id,event,name,email,created_at&order=created_at.asc&limit=20000`,
      {
        headers: {
          apikey: service,
          Authorization: 'Bearer ' + service
        }
      }
    );
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.error('crimson-activity: supabase', r.status, txt.slice(0, 200));
      json(res, 502, { error: 'supabase_error' });
      return;
    }
    const rows = await r.json();
    json(res, 200, aggregate(rows));
  } catch (e) {
    console.error('crimson-activity: fetch failed', e && e.message);
    json(res, 502, { error: 'supabase_error' });
  }
}
