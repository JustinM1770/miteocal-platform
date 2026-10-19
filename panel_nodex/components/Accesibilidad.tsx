"use client";

import { useEffect } from "react";

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accesibilidad para las ventanas que usan el marcado `.scrim > .modal` y las
 * filas `tr.click` (las que no usan <Modal>):
 *  - el modal se anuncia como diálogo y recibe el foco; al cerrarse, el foco regresa
 *  - Escape cierra (equivale a tocar fuera) y Tab no se sale de la ventana
 *  - una fila clicable se puede enfocar y abrir con Enter o Espacio
 */
export default function Accesibilidad() {
  useEffect(() => {
    const regreso = new WeakMap<Element, HTMLElement | null>();

    const ultimo = () => {
      const l = [...document.querySelectorAll<HTMLElement>(".scrim")].filter((s) => !s.querySelector("[aria-modal][data-propio]"));
      return l[l.length - 1] ?? null;
    };

    function preparar(raiz: ParentNode) {
      raiz.querySelectorAll<HTMLElement>(".scrim > .modal:not([role])").forEach((m) => {
        m.setAttribute("role", "dialog");
        m.setAttribute("aria-modal", "true");
        m.tabIndex = -1;
        const titulo = m.querySelector("h3");
        if (titulo) { titulo.id ||= `modal-${Math.random().toString(36).slice(2)}`; m.setAttribute("aria-labelledby", titulo.id); }
        regreso.set(m, document.activeElement as HTMLElement | null);
        (m.querySelector<HTMLElement>(ENFOCABLES) ?? m).focus();
      });
      raiz.querySelectorAll<HTMLElement>("tr.click:not([tabindex])").forEach((tr) => { tr.tabIndex = 0; });
    }

    const obs = new MutationObserver((cambios) => {
      for (const c of cambios) {
        c.addedNodes.forEach((n) => n instanceof HTMLElement && preparar(n.parentElement ?? n));
        c.removedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          const m = n.matches(".modal") ? n : n.querySelector(".modal");
          if (m && regreso.has(m)) { regreso.get(m)?.focus?.(); regreso.delete(m); }
        });
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    preparar(document);

    function tecla(e: KeyboardEvent) {
      const scrim = ultimo();
      if (scrim && e.key === "Escape") { scrim.click(); return; }
      if (scrim && e.key === "Tab") {
        const l = [...scrim.querySelectorAll<HTMLElement>(ENFOCABLES)];
        if (!l.length) return;
        if (e.shiftKey && document.activeElement === l[0]) { e.preventDefault(); l[l.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === l[l.length - 1]) { e.preventDefault(); l[0].focus(); }
        return;
      }
      const el = document.activeElement as HTMLElement | null;
      if ((e.key === "Enter" || e.key === " ") && el?.matches("tr.click")) { e.preventDefault(); el.click(); }
    }
    document.addEventListener("keydown", tecla);
    return () => { obs.disconnect(); document.removeEventListener("keydown", tecla); };
  }, []);
  return null;
}
