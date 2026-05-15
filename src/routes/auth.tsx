import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول وإنشاء حساب — المصحف الشريف" },
      { name: "description", content: "ادخل إلى حسابك أو أنشئ حسابًا جديدًا لحفظ سجل محادثاتك مع المساعد الإسلامي." },
    ],
  }),
});

function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user && !loading) nav({ to: "/" }); }, [user, loading, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب بنجاح");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("أهلاً بعودتك");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally { setBusy(false); }
  };

  const google = async () => {
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (r.error) throw r.error;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "تعذّر تسجيل الدخول");
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto px-4 pb-20 max-w-md">
      <div className="anim-fade-down text-center mb-8 mt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>سجّل ليصبح مساعدك الإسلامي يتذكّرك</span>
        </div>
        <h1 className="text-4xl font-bold gradient-text mb-2">
          {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
        </h1>
        <p className="text-muted-foreground text-sm">
          أو يمكنك المتابعة كزائر <Link to="/" className="text-primary underline-offset-4 hover:underline">من هنا</Link>
        </p>
      </div>

      <div className="anim-scale glass rounded-3xl p-6 sm:p-8">
        <Button onClick={google} disabled={busy} variant="outline" className="w-full h-12 mb-4 border-primary/30 gap-2">
          <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.4-.2-2.1H12v3.9h5.9c-.1 1-.8 2.5-2.3 3.5l-.02.13 3.34 2.59.23.02c2.13-1.97 3.36-4.86 3.36-8.07"/><path fill="#34A853" d="M12 23c3 0 5.6-1 7.4-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7l-.1.01-3.5 2.7-.05.13C3.7 20.5 7.6 23 12 23"/><path fill="#FBBC05" d="M5.6 14c-.2-.7-.4-1.4-.4-2s.1-1.4.3-2L5.5 9.9 2 7.1l-.1.05A11 11 0 0 0 1 12c0 1.8.4 3.5 1 5l3.6-3"/><path fill="#EA4335" d="M12 5.4c2.1 0 3.6.9 4.4 1.7l3.2-3.1C17.6 2.2 15 1 12 1 7.6 1 3.7 3.5 1.9 7.1l3.7 2.9C6.5 7.4 9 5.4 12 5.4"/></svg>
          متابعة عبر Google
        </Button>
        <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> أو <div className="flex-1 h-px bg-border" />
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <Label className="mb-1.5 block text-xs">الاسم</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="glass border-primary/20 h-11" />
            </div>
          )}
          <div>
            <Label className="mb-1.5 block text-xs">البريد الإلكتروني</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="glass border-primary/20 h-11" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">كلمة المرور</Label>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="glass border-primary/20 h-11" />
          </div>
          <Button type="submit" disabled={busy} className="btn-gold w-full h-11 gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {mode === "login" ? "دخول" : "إنشاء حساب"}
          </Button>
        </form>
        <div className="text-center text-sm text-muted-foreground mt-5">
          {mode === "login" ? "ليس لديك حساب؟ " : "لديك حساب؟ "}
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary font-medium hover:underline">
            {mode === "login" ? "إنشاء حساب" : "تسجيل الدخول"}
          </button>
        </div>
      </div>
    </div>
  );
}