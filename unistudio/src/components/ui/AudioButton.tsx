"use client";

import { useEffect, useState, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";

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
 *   <AudioButton text={COPY.pipelines.lingerie.benefit} variant="inline" />
 *
 * - Voz: prefiere voces es-ES o es-MX disponibles en el dispositivo
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
  /** Idioma BCP-47. Default es-ES con fallback es-MX/es-US */
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

function pickSpanishVoice(lang = "es-ES"): SpeechSynthesisVoice | null {
  if (!checkSupport()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  // Preferencia: es-ES exacto > es-MX > es-US > cualquier es-*
  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;
  const mxOrUs = voices.find((v) => v.lang === "es-MX" || v.lang === "es-US");
  if (mxOrUs) return mxOrUs;
  const anySpanish = voices.find((v) => v.lang.startsWith("es"));
  return anySpanish ?? null;
}

export function AudioButton({
  text,
  variant = "icon",
  size = "md",
  className = "",
  lang = "es-ES",
}: AudioButtonProps) {
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
      // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount only, no cascading
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
    const voice = pickSpanishVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  }, [text, lang]);

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
        title={isPlaying ? "Detener audio" : "Escuchar descripción"}
        aria-label={isPlaying ? "Detener audio" : "Escuchar descripción"}
      >
        <Icon className={ICON_SIZES[size]} />
        <span className="text-xs font-medium">{isPlaying ? "Detener" : "Escuchar"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`${baseClasses} ${className}`}
      title={isPlaying ? "Detener audio" : "Escuchar descripción"}
      aria-label={isPlaying ? "Detener audio" : "Escuchar descripción"}
    >
      <Icon className={ICON_SIZES[size]} />
    </button>
  );
}
