const crypto = require('crypto');
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'greens:state';
const SALT = process.env.ADMIN_PASSWORD || 'greens';

async function redis(cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(cmd) });
  return (await r.json()).result;
}
async function load() {
  const raw = await redis(['GET', KEY]);
  return raw ? JSON.parse(raw) : { participants: [], done: false, results: {} };
}
const save = (s) => redis(['SET', KEY, JSON.stringify(s)]);
const hash = (pin) => crypto.createHash('sha256').update(SALT + ':' + pin).digest('hex');
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

module.exports = async (req, res) => {
  const b = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) : {};
  const send = (code, obj) => res.status(code).json(obj);
  try {
    const s = await load();
    const name = String(b.name || '').trim().slice(0, 30);
    const pin = String(b.pin || '');
    const me = s.participants.find((p) => same(p.name, name));
    const isAdmin = process.env.ADMIN_PASSWORD && b.admin === process.env.ADMIN_PASSWORD;

    switch (b.action) {
      case 'list':
        return send(200, { names: s.participants.map((p) => p.name), done: s.done });
      case 'join':
        if (s.done) return send(400, { error: 'O sorteio já foi feito.' });
        if (!name) return send(400, { error: 'Digite seu nome.' });
        if (!/^\d{4,8}$/.test(pin)) return send(400, { error: 'O PIN deve ter de 4 a 8 números.' });
        if (me) return send(400, { error: 'Esse nome já está na lista.' });
        s.participants.push({ name, pin: hash(pin), t: Date.now() });
        await save(s);
        return send(200, { ok: true });
      case 'leave':
        if (s.done) return send(400, { error: 'O sorteio já foi feito.' });
        if (!me || me.pin !== hash(pin)) return send(403, { error: 'Nome ou PIN incorretos.' });
        s.participants = s.participants.filter((p) => p !== me);
        await save(s);
        return send(200, { ok: true });
      case 'result':
        if (!s.done) return send(200, { done: false });
        if (!me || me.pin !== hash(pin)) return send(403, { error: 'Nome ou PIN incorretos.' });
        return send(200, { done: true, amigo: s.results[me.name] });
      case 'draw': {
        if (!isAdmin) return send(403, { error: 'Senha do organizador incorreta.' });
        if (s.done) return send(400, { error: 'O sorteio já foi feito.' });
        if (s.participants.length < 3) return send(400, { error: 'Precisa de pelo menos 3 participantes.' });
        const a = s.participants.map((p) => p.name);
        for (let i = a.length - 1; i > 0; i--) {
          const j = crypto.randomInt(i + 1);
          [a[i], a[j]] = [a[j], a[i]];
        }
        a.forEach((n, i) => (s.results[n] = a[(i + 1) % a.length]));
        s.done = true;
        await save(s);
        return send(200, { ok: true }); // não devolve os pares
      }
      case 'remove':
        if (!isAdmin) return send(403, { error: 'Senha do organizador incorreta.' });
        if (s.done) return send(400, { error: 'O sorteio já foi feito.' });
        s.participants = s.participants.filter((p) => !same(p.name, name));
        await save(s);
        return send(200, { ok: true });
      case 'reset':
        if (!isAdmin) return send(403, { error: 'Senha do organizador incorreta.' });
        await save({ participants: [], done: false, results: {} });
        return send(200, { ok: true });
      default:
        return send(400, { error: 'Ação inválida.' });
    }
  } catch (e) {
    return send(500, { error: 'Erro no servidor. Confira as variáveis de ambiente.' });
  }
};
