"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Shell from "@/components/Shell";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { sesion, cargando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !sesion) router.replace("/login");
  }, [cargando, sesion, router]);

  if (cargando) return <div className="spinner-wrap">Cargando…</div>;
  if (!sesion) return null;

  return <Shell>{children}</Shell>;
}
