"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Ventana modal accesible: role="dialog", se cierra con Escape o tocando
 * fuera, el foco entra al abrir, no se sale con Tab y regresa al botón que
 * la abrió al cerrar.
 */
export default function Modal({ titulo, onCerrar, ancho = 560, children }: {
  titulo: string; onCerrar: () => void; ancho?: number; children: ReactNode;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;
  const idTitulo = useId();

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    const primero = caja.current?.querySelector<HTMLElement>(ENFOCABLES);
    (primero ?? caja.current)?.focus();

    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); cerrar.current(); return; }
      if (e.key !== "Tab" || !caja.current) return;
      const l = [...caja.current.querySelectorAll<HTMLElement>(ENFOCABLES)];
      if (!l.length) return;
      if (e.shiftKey && document.activeElement === l[0]) { e.preventDefault(); l[l.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === l[l.length - 1]) { e.preventDefault(); l[0].focus(); }
    }
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("keydown", tecla); previo?.focus?.(); };
  }, []);

  return (
    <div className="scrim" onClick={onCerrar}>
      <div ref={caja} className="modal" role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1} data-propio=""
        style={{ width: ancho }} onClick={(e) => e.stopPropagation()}>
        <h3 id={idTitulo} style={{ fontSize: 20, fontWeight: 600, margin: "0 0 16px" }}>{titulo}</h3>
        {children}
      </div>
    </div>
  );
}
