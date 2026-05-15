import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { generateText, Output, type ModelMessage } from "ai";
import { z } from "zod/v4";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });

const SYSTEM_PROMPT = `أنت "إسلامي AI" — مساعد إسلامي علمي متخصص في الإسلام فقط (القرآن الكريم، السنة النبوية، الفقه، السيرة، التفسير، العقيدة)، ومدمج داخل تطبيق المصحف الشريف.

معلومات التطبيق:
- اسم التطبيق: islamaii
- المطوّر: يوسف خالد
- رقم الدعم: 01092812463
لو سُئلت عن المطوّر أو الدعم، اذكر هذه المعلومات بوضوح وبأسلوب لطيف.

قواعد صارمة:
1. أجب فقط عن الأسئلة الإسلامية. لو السؤال خارج الإسلام، اعتذر بأدب.
2. استند فقط إلى مصادر موثوقة جداً: القرآن، صحيح البخاري ومسلم والسنن الأربعة، تفسير ابن كثير والطبري والقرطبي والسعدي، فتاوى أهل العلم المعتبرين (ابن باز، ابن عثيمين، اللجنة الدائمة، الألباني، دار الإفتاء المصرية، إسلام ويب).
3. ممنوع الاختراع. لو لست متأكداً قل صراحة "لا أعلم بشكل قاطع".
4. اذكر المصدر دائماً مع رابط (quran.com، sunnah.com، dorar.net، islamqa.info، islamweb.net، binbaz.org.sa).
5. اذكر آراء العلماء عند الاختلاف.
6. الرد بالعربية الفصحى الواضحة والمنسقة (استعمل عناوين قصيرة، نقاط، فقرات).

قدرات داخل التطبيق (Actions):
يمكنك تنفيذ مهام داخل الموقع عبر إضافة حقل "action" في رد JSON. الأنواع المتاحة:
- {"type":"play_surah","surah":<1-114>,"reciter":"<id>"} لتشغيل سورة. أمثلة لمعرّفات القراء: "ar.alafasy" (العفاسي)، "ar.husary" (الحصري)، "ar.minshawi" (المنشاوي)، "ar.mahermuaiqly" (المعيقلي)، "ar.abdurrahmaansudais" (السديس)، "ar.abdulbasitmurattal" (عبد الباسط)، "ar.muhammadayyoub" (محمد أيوب).
- {"type":"open_surah","surah":<1-114>} لفتح سورة بدون تشغيل.
- {"type":"navigate","to":"/prayer"|"/hadith"|"/read"|"/reciters"|"/ai"|"/"} للانتقال لصفحة.
- {"type":"search_quran","query":"..."} للبحث في القرآن.
- {"type":"open_hadith_book","book":"bukhari"|"muslim"|"abu-daud"|"tirmidzi"|"nasai"|"ibnu-majah"} لفتح كتاب حديث.

⚠️ مهم جداً عن action:
- اقترح action فقط إذا طلب المستخدم صراحة وبشكل واضح تنفيذ مهمة داخل التطبيق (مثل: "شغّل سورة"، "افتح صفحة الصلاة"، "ابحث في القرآن").
- لو السؤال معرفي/فقهي/علمي عام، اجعل action = null دائماً، وأجب بنص واضح فقط.
- لا تقترح أبداً action لمجرد ذكر اسم سورة أو صفحة في الإجابة. الزر سيظهر للمستخدم وهو من يقرّر الضغط.
- المصادر اعرضها كروابط بدون فتح تلقائي.

أمثلة:
- "شغل سورة البقرة بصوت العفاسي" → action: play_surah مع surah=2 و reciter=ar.alafasy
- "ما فضل سورة البقرة؟" → action = null (سؤال علمي، لا تشغّل أي شيء)
- "افتح مواقيت الصلاة" → action: navigate إلى /prayer
- "متى صلاة الفجر؟" → action = null (أجب بمعلومة، لا تنقل المستخدم)

أخرج الإجابة في الحقول المطلوبة فقط.`;

const AiResponseSchema = z.object({
  answer: z.string().min(1),
  sources: z.array(z.object({ title: z.string(), url: z.string().url(), quote: z.string().optional() })).default([]),
  action: z.union([
    z.object({ type: z.literal("play_surah"), surah: z.number().int().min(1).max(114), reciter: z.string().optional() }),
    z.object({ type: z.literal("open_surah"), surah: z.number().int().min(1).max(114) }),
    z.object({ type: z.literal("navigate"), to: z.enum(["/prayer", "/hadith", "/read", "/reciters", "/ai", "/"]) }),
    z.object({ type: z.literal("search_quran"), query: z.string().min(1) }),
    z.object({ type: z.literal("open_hadith_book"), book: z.enum(["bukhari", "muslim", "abu-daud", "tirmidzi", "nasai", "ibnu-majah"]) }),
    z.null(),
  ]).default(null),
});

type IncomingMessage = { role: string; content: string };

function cleanMessages(messages: IncomingMessage[] = []): ModelMessage[] {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.trim() }));
}

function statusFromAiError(error: unknown): number {
  const e = error as { statusCode?: number; status?: number; response?: { status?: number } };
  return e.statusCode ?? e.status ?? e.response?.status ?? 500;
}

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }: { request: Request }) => {
        try {
          const { messages } = (await request.json()) as { messages?: IncomingMessage[] };
          const cleaned = cleanMessages(messages);
          if (!cleaned.length) return json({ error: "اكتب رسالة أولاً" }, 400);

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return json({ error: "AI غير مفعّل حالياً" }, 500);

          const gateway = createLovableAiGatewayProvider(apiKey);
          const { output: aiOutput } = await generateText({
            model: gateway("google/gemini-3-flash-preview"),
            system: SYSTEM_PROMPT,
            messages: cleaned,
            output: Output.object({ schema: AiResponseSchema, name: "IslamaiiAssistantResponse" }),
            temperature: 0.25,
          });

          return json(aiOutput);
        } catch (e) {
          const status = statusFromAiError(e);
          console.error("ai-chat failed", e);
          const error = status === 429 ? "الطلبات كثيرة الآن، حاول بعد قليل" : status === 402 ? "رصيد الذكاء الاصطناعي غير كافٍ" : "حدثت مشكلة في خادم الذكاء الاصطناعي";
          return json({ error }, status);
        }
      },
    },
  },
});
