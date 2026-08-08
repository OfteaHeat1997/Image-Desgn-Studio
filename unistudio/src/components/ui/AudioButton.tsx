"use client";

import { useEffect, useState, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

/**
 * AudioButton — botón 🔊 que lee texto en voz alta usando Web Speech API.
 *
 * Por qué existe: la usuaria pidió que la app pueda escucharse, no solo leerse.
 * Su mamá no le gusta leer y necesita poder darle al botón y que la voz le
 * explique qué hace cada sección. Web Speech API funciona en todos los
 * navegadores modernos (incluido Samsung Browser y Chrome mobile) sin requerir
 * API keys ni costo recurrente.
 *
 * Uso:
 *   <AudioButton text="Sube tu foto del perfume y la IA hace los 3 outputs..." />
 *   <AudioButton text={t.pipelines.lingerie.benefit} variant="inline" />
 *
 * - Voz: sigue el idioma activo de la app (es-ES o en-US); si se pasa `lang`
 *   explícito, ese tiene prioridad
 * - Velocidad: 1.0 (natural)
 * - Cancelar otra utterance al iniciar nueva (evita superposición)
 */

interface AudioButtonProps {
  text: string;
  /** "icon" = solo botón con ícono. "inline" = ícono + label "Escuchar" */
  variant?: "icon" | "inline";
  /** Tamaño del icon: sm (12px) | md (16px) | lg (20px) */
  size?: "sm" | "md" | "lg";
  /** Clase extra para el wrapper */
  className?: string;
  /** Idioma BCP-47 explícito. Si se omite, sigue el idioma activo de la app. */
  lang?: string;
}

const ICON_SIZES = { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-5 w-5" };
const PADDING = { sm: "p-1", md: "p-1.5", lg: "p-2" };

let supportsSpeech: boolean | null = null;

function checkSupport(): boolean {
  if (supportsSpeech !== null) return supportsSpeech;
  if (typeof window === "undefined") return false;
  supportsSpeech = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  return supportsSpeech;
}

function pickVoice(lang = "es-ES"): SpeechSynthesisVoice | null {
  if (!checkSupport()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const base = lang.split("-")[0]; // "es-ES" -> "es", "en-US" -> "en"
  // Preferencia: match exacto de región > cualquier voz del mismo idioma.
  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;
  const sameLanguage = voices.find((v) => v.lang.startsWith(base));
  return sameLanguage ?? null;
}

export function AudioButton({
  text,
  variant = "icon",
  size = "md",
  className = "",
  lang,
}: AudioButtonProps) {
  // El idioma activo de la app decide la voz y los labels, salvo que se pase
  // un `lang` explícito.
  const { bcp47, t } = useI18n();
  const speechLang = lang ?? bcp47;
  const [isPlaying, setIsPlaying] = useState(false);
  // Mounted flag para evitar SSR mismatch — la API speechSynthesis solo existe
  // en el cliente. Renderizamos null en SSR y luego en el primer effect
  // determinamos si el browser realmente soporta TTS. Patrón estándar para
  // browser-only features sin disparar el warning de React 19 sobre setState
  // sincrónico en effects (ese warning es para CASCADING renders, no para
  // este caso de feature detection que solo corre una vez).
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (checkSupport()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once on mount only, no cascading
      setAvailable(true);
      // Warmup voices en Chrome mobile que devuelve [] hasta voiceschanged
      window.speechSynthesis.getVoices();
      const handler = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", handler);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
    }
  }, []);

  const speak = useCallback(() => {
    if (!checkSupport() || !text.trim()) return;
    // Cancela cualquier utterance previa para evitar overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(speechLang);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? speechLang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  }, [text, speechLang]);

  const stop = useCallback(() => {
    if (!checkSupport()) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isPlaying) stop();
      else speak();
    },
    [isPlaying, speak, stop],
  );

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (checkSupport()) window.speechSynthesis.cancel();
    };
  }, []);

  if (!available) return null;

  const Icon = isPlaying ? VolumeX : Volume2;
  const baseClasses = `inline-flex items-center justify-center rounded-md transition-default ${PADDING[size]} ${
    isPlaying
      ? "bg-[var(--accent)] text-[var(--bg-primary)]"
      : "bg-[var(--accent-dim)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg-primary)]"
  }`;

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={toggle}
        className={`${baseClasses} gap-1.5 px-2.5 ${className}`}
        title={isPlaying ? t.audio.stopTitle : t.audio.listenTitle}
        aria-label={isPlaying ? t.audio.stopTitle : t.audio.listenTitle}
      >
        <Icon className={ICON_SIZES[size]} />
        <span className="text-xs font-medium">{isPlaying ? t.audio.stop : t.audio.listen}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`${baseClasses} ${className}`}
      title={isPlaying ? t.audio.stopTitle : t.audio.listenTitle}
      aria-label={isPlaying ? t.audio.stopTitle : t.audio.listenTitle}
    >
      <Icon className={ICON_SIZES[size]} />
    </button>
  );
}
