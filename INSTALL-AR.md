# دليل تشغيل WortMeister B2 المستقل (بالعربية)

هذه نسخة مستقلة عن Emergent. لا تدفع شيئاً إلى Emergent لتشغيل هذه الملفات. يلزم نشرها على استضافة تدعم ملفات الويب ووظائف الخادم، مثل Vercel.

## أولاً: رفع الكود إلى GitHub

1. نزّل ملف ZIP وافتحه في مدير الملفات على الهاتف أو الحاسوب.
2. أنشئ مستودعاً جديداً في GitHub باسم `wortmeister-b2` واجعله **Private**.
3. افتح المستودع، اختر **Add file → Upload files**.
4. ارفع محتويات مجلد المشروع بعد فك الضغط، وليس ملف ZIP وحده. احتفظ ببنية المجلدات مثل `api` و`supabase` و`icons`.
5. اضغط **Commit changes**.

## ثانياً: نشره على Vercel

1. سجّل الدخول إلى Vercel باستخدام GitHub.
2. اختر **Add New → Project** ثم استورد مستودع `wortmeister-b2`.
3. Framework Preset: اختر **Other**. لا يحتاج المشروع إلى build step.
4. اترك Build Command فارغاً، واجعل Output Directory هو `.` إن طلبه Vercel.
5. اضغط Deploy.

## ثالثاً: استعادة كلماتك الخاصة

1. افتح رابط التطبيق المنشور.
2. انتقل إلى الإعدادات والنسخ الاحتياطي.
3. عند «استيراد نسخة احتياطية»، اختر الملف الأصلي الذي حفظته على هاتفك: `wortmeister-b2-2026-11-15.json`.
4. اضغط «دمج النسخة».
5. سيضيف التطبيق كلماتك الشخصية الخمس وسجلاتها، مع تجاهل معرّفات الكلمات والسجلات الموجودة أصلاً. لا تختَر استبدال البيانات؛ التطبيق يستخدم الدمج فقط.

ملف البداية العام يحتوي 35 كلمة بنك و120 حدثاً تاريخياً. الكلمات الشخصية الخمس غير مضمنة في ملفات النشر العامة لحماية خصوصيتها، ولهذا نستورد ملفك الأصلي بعد فتح الموقع.

## رابعاً: تفعيل Google والمزامنة

هذه الخطوة تحتاج مشروع Supabase وإعداد Google OAuth:

1. أنشئ مشروعاً في Supabase.
2. افتح SQL Editor وشغّل الملف `supabase/schema.sql`.
3. في Authentication → Providers فعّل Google وأدخل OAuth Client ID وClient Secret من إعداد Google Cloud.
4. في Google Cloud، أضف عنوان callback التالي كـ Authorized redirect URI:
   `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`
5. في Supabase → Authentication → URL Configuration أضف رابط تطبيق Vercel ضمن Redirect URLs، مثل `https://YOUR-APP.vercel.app/**`.
6. في تطبيق WortMeister افتح الإعدادات، وأدخل Project URL والمفتاح العام anon/publishable في قسم «إعداد Google والمزامنة»، ثم احفظ.
7. اضغط «متابعة باستخدام Google».

تستخدم الجلسة PKCE وتجديد الرموز وحفظ الجلسة محلياً. بعد نجاح OAuth، يُفترض أن يعود المستخدم مباشرة إلى تطبيق Vercel، لا إلى Emergent.

لخدمة AI، أضف أيضاً متغيرات الخادم في Vercel → Settings → Environment Variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

لا تضع مفتاح OpenAI في `config.js` أو في الواجهة. بعد إضافة المتغيرات أعد النشر. يتطلب AI تسجيل الدخول والموافقة على إرسال السؤال ومفردات مختارة لمزود النموذج.

## ملاحظات صادقة

- المراجعة والمفردات والحفظ المحلي تعمل دون Supabase أو AI.
- تسجيل Google والمزامنة لا يعملان قبل إعداد Supabase وGoogle OAuth.
- AI لا يعمل قبل إضافة متغيرات الخادم الصحيحة.
- هذه النسخة لا تتضمن تحويل الكلام إلى نص أو تقييم النطق.
- النسخة المستقلة لم تُنشر بعد؛ تحتاج ربط حساب GitHub وVercel يدوياً من طرفك. لم يتم تعديل تطبيق Emergent الأصلي أو حذف بياناته.
