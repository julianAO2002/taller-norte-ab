"use client";

import { useActionState } from "react";
import { registerConversion, type CtaState, type CtaStatus } from "@/app/practica/actions";

const FEEDBACK: Record<CtaStatus, string> = {
  idle: "",
  recorded: "Listo, anotamos tu interés.",
  "already-converted": "Ya habíamos anotado tu interés.",
  "not-counted": "Tu interés no se pudo asociar a una visita.",
  error: "No pudimos registrar el clic. Probá de nuevo en un momento.",
};

interface CtaButtonProps {
  label: string;
  preview: boolean;
}

/** The only conversion trigger. In preview mode it never calls the action. */
export function CtaButton({ label, preview }: CtaButtonProps) {
  const [state, formAction, pending] = useActionState<CtaState>(registerConversion, {
    status: "idle",
  });

  if (preview) {
    return (
      <div className="cta">
        <button type="button" className="cta-button" disabled title="La vista previa no registra conversiones">
          {label}
        </button>
        <p className="cta-feedback">En la vista previa el botón no registra conversiones.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="cta">
      <button type="submit" className="cta-button" disabled={pending}>
        {label}
      </button>
      <p className="cta-feedback" aria-live="polite">
        {FEEDBACK[state.status]}
      </p>
    </form>
  );
}
