"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, MUNICIPIO_NOMBRE } from "@/lib/firebase";

export default function Login() {
  const { entrar, modoDemo } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(modoDemo ? "laura.m@teocaltiche.gob.mx" : "");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function restablecer(e: React.MouseEvent) {
    e.preventDefault();
    setError(null); setAviso(null);
    if (!email.trim()) { setError("Escribe tu correo arriba y vuelve a tocar «¿Olvidaste tu contraseña?»."); return; }
    if (!auth) { setAviso("En modo demo cualquier contraseña funciona."); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setAviso(`Si ${email.trim()} tiene cuenta, te llegó un correo para crear una contraseña nueva. Revisa también spam.`);
    } catch {
      setError("No se pudo enviar el correo. Revisa que el correo esté bien escrito.");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await entrar(email.trim(), pass);
      router.push("/panel");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setError(
        code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-email"
          ? "Correo o contraseña incorrectos"
          : code === "auth/too-many-requests" ? "Demasiados intentos. Espera unos minutos o restablece la contraseña."
          : code === "auth/user-disabled" ? "Esta cuenta está deshabilitada."
          : code === "auth/network-request-failed" ? "Sin conexión a internet."
          : `No se pudo entrar (${code || "error desconocido"})`
      );
      setEnviando(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card col" style={{ gap: 18 }} onSubmit={onSubmit}>
        <div className="col" style={{ gap: 5 }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Nodex</div>
          <div className="muted">Panel del Ayuntamiento de {MUNICIPIO_NOMBRE}</div>
        </div>

        {error && (
          <div style={{ background: "var(--danger-soft)", borderRadius: 10, padding: "11px 14px" }}>
            <div style={{ color: "var(--danger)", fontWeight: 600, fontSize: 13 }}>{error}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              Revisa el correo o pide al administrador que restablezca tu acceso.
            </div>
          </div>
        )}

        {modoDemo && (
          <div className="banner info" style={{ display: "block", padding: "11px 14px" }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Modo demo</div>
            <div className="muted" style={{ fontSize: 12 }}>
              Falta configurar <code>.env.local</code>. Entra con cualquier contraseña para ver el panel.
            </div>
          </div>
        )}

        <div className="field">
          <label className="section-label" htmlFor="email">CORREO INSTITUCIONAL</label>
          <input
            id="email" className={`input${error ? " error" : ""}`} type="email" required
            placeholder="correo@teocaltiche.gob.mx"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="section-label" htmlFor="pass">CONTRASEÑA</label>
          <input
            id="pass" className={`input${error ? " error" : ""}`} type="password" required
            placeholder="••••••••••"
            value={pass} onChange={(e) => setPass(e.target.value)}
          />
        </div>

        <button className="btn primary block" type="submit" disabled={enviando || !email || !pass}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>

        <div className="col" style={{ gap: 14, alignItems: "center" }}>
          <a href="#" onClick={restablecer} style={{ fontSize: 13, fontWeight: 600 }}>¿Olvidaste tu contraseña?</a>
          {aviso && <span className="muted" style={{ fontSize: 12, textAlign: "center" }}>{aviso}</span>}
          <p className="muted" style={{ fontSize: 12, textAlign: "center", margin: 0 }}>
            El acceso lo da el administrador del ayuntamiento. Si no tienes cuenta, pídela en tu dependencia.
          </p>
        </div>
      </form>
    </div>
  );
}
