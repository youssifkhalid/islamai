import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod/v4";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });

const Schema = z.object({
  score: z.number().min(0).max(100).describe("الدرجة من 100"),
  overall: z.string().describe("ملخص مختصر للأداء العام"),
  mistakes: z.array(z.object({
    ayahNumber: z.number().int().min(1).describe("رقم الآية داخل السورة"),
    expected: z.string().describe("الكلمة الصحيحة بالتشكيل من النص الأصلي"),
    heard: z.string().describe("ما قاله المستخدم"),
    type: z.enum(["تشكيل", "نطق", "حذف", "إضافة", "ترتيب", "خطأ كبير"]).describe("نوع الخطأ"),
    explanation: z.string().describe("شرح الخطأ ولماذا هو خطأ وكيف ينطق صحيحاً"),
  })).default([]),
  passed: z.boolean().describe("هل تجاوز الاختبار (>=85 وعدم وجود خطأ كبير)"),
});

const SYSTEM = `أنت مصحح خبير في تجويد وقراءة القرآن الكريم وفق رواية حفص عن عاصم. مهمتك:
1. مقارنة "النص الأصلي" (بالتشكيل الكامل) مع "ما قاله المتدرب" (transcript مستخرج من صوته).
2. اكتشاف كل خطأ: تشكيل (حركات/سكون/شدّة/مد)، نطق حرف، حذف كلمة، إضافة كلمة، تبديل، ترتيب.
3. أرجع JSON دقيق وفق الـ schema.
4. ضع الدرجة بناء على نسبة الصحيح. أي خطأ كبير (تبديل كلمة، حذف آية) ينقص كثيراً.
5. اشرح كل خطأ بإيجاز عربي واضح يفيد المتدرب.
6. إذا كان الـ transcript فارغ أو غير عربي رد بدرجة 0 وأخبر المتدرب أن صوته لم يُلتقط.
7. تذكر أن الـ speech recognition لا يلتقط التشكيل عادة — لذا قيّم التشكيل فقط إذا ظهرت أخطاء كلمات (مثل خطأ حركة تغير المعنى)، ولا تعاقب على غياب علامات التشكيل في الـ transcript.`;

export const Route = createFileRoute("/api/ai-correct")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }: { request: Request }) => {
        try {
          const { expected, heard, surah, fromAyah, toAyah } = (await request.json()) as {
            expected?: string; heard?: string; surah?: number; fromAyah?: number; toAyah?: number;
          };
          if (!expected || !heard) return json({ error: "بيانات ناقصة" }, 400);
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return json({ error: "AI غير مفعّل" }, 500);

          const gateway = createLovableAiGatewayProvider(apiKey);
          const userPrompt = `السورة: ${surah ?? "؟"}، من آية ${fromAyah ?? "؟"} إلى ${toAyah ?? "؟"}.

النص الأصلي (مع التشكيل):
${expected}

ما قاله المتدرب (transcript):
${heard}

قيّم وأرجع JSON.`;

          const { output } = await generateText({
            model: gateway("google/gemini-3-flash-preview"),
            system: SYSTEM,
            prompt: userPrompt,
            output: Output.object({ schema: Schema, name: "RecitationCorrection" }),
            temperature: 0.1,
          });

          return json(output);
        } catch (e) {
          console.error("ai-correct failed", e);
          const err = e as { statusCode?: number };
          const status = err.statusCode ?? 500;
          return json({ error: status === 429 ? "ازدحام، حاول لاحقاً" : status === 402 ? "نفد رصيد الذكاء" : "حدث خطأ" }, status);
        }
      },
    },
  },
});
