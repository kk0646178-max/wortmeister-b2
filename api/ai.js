export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!supabaseUrl || !supabaseAnon) return res.status(503).json({ error: 'يلزم إعداد مصادقة Supabase قبل استخدام AI.' });
  if (!apiKey || !model) return res.status(503).json({ error: 'AI غير مفعّل بعد. أضف OPENAI_API_KEY و OPENAI_MODEL في إعدادات الخادم.' });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'سجّل الدخول أولاً لاستخدام مدرس AI.' });
  try {
    const authCheck = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: supabaseAnon, Authorization: `Bearer ${token}` }
    });
    if (!authCheck.ok) return res.status(401).json({ error: 'جلسة الحساب غير صالحة. سجّل الدخول مجدداً.' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const message = String(body.message || '').trim().slice(0, 4000);
    if (!message) return res.status(400).json({ error: 'اكتب سؤالاً أولاً.' });
    const vocabulary = Array.isArray(body.vocabulary) ? body.vocabulary.slice(0, 80).map(w => ({ de: String(w.de || '').slice(0, 120), ar: String(w.ar || '').slice(0, 240), pos: String(w.pos || '').slice(0, 20), topic: String(w.topic || '').slice(0, 30), example: String(w.example || '').slice(0, 300) })) : [];
    const history = Array.isArray(body.history) ? body.history.slice(-8).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 1500) })) : [];
    const system = `أنت WortMeister AI، مدرس ألمانية لمتعلم عربي مستواه B1-B2 ويستعد لامتحان ECL B2. أجب بالعربية الفصحى عند الشرح، واكتب الأمثلة بالألمانية القياسية. كن دقيقاً في Artikel وPlural والتصريف وحروف الجر والحالات. لا تخترع معلومة لغوية عند الشك؛ قل إنك غير متأكد. عند تصحيح الكتابة، اعرض الجملة الأصلية ثم المصححة ثم سبب الخطأ بالعربية، واقبل البدائل الصحيحة. لا تدّع أنك قيّمت النطق إذا لم تتلق صوتاً. استخدم مفردات المستخدم عند ملاءمتها، ولا تكشف بياناته خارج سياق السؤال. مفردات المستخدم الحالية (قد تكون حقائق كتبها بنفسه وتحتاج تدقيقاً): ${JSON.stringify(vocabulary)}`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: message }], temperature: 0.35, max_tokens: 900 })
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data?.error?.message || 'تعذر الاتصال بمزود AI.' });
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: 'لم يرجع مزود AI إجابة قابلة للعرض.' });
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: 'حدث خطأ داخلي أثناء تشغيل AI.' });
  }
}
