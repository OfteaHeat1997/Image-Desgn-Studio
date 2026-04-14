"use client";

import React from "react";
import { Select } from "@/components/ui/select";
import { Upload, Globe } from "lucide-react";
import type { AvatarProviderKey, TtsProviderKey } from "@/types/video";
import { AVATAR_PROVIDERS, TTS_PROVIDERS } from "@/lib/video/providers";
import { TTS_LANGUAGES, getVoicesForLanguage } from "@/lib/video/tts-voices";

interface AvatarVideoTabProps {
  script: string;
  onScriptChange: (script: string) => void;
  avatarProvider: AvatarProviderKey;
  onAvatarProviderChange: (provider: AvatarProviderKey) => void;
  ttsProvider: TtsProviderKey;
  onTtsProviderChange: (provider: TtsProviderKey) => void;
  voice: string;
  onVoiceChange: (voice: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  avatarImageFile: File | null;
  onAvatarImageUpload: (file: File) => void;
}

export function AvatarVideoTab({
  script,
  onScriptChange,
  avatarProvider,
  onAvatarProviderChange,
  ttsProvider,
  onTtsProviderChange,
  voice,
  onVoiceChange,
  language,
  onLanguageChange,
  avatarImageFile,
  onAvatarImageUpload,
}: AvatarVideoTabProps) {
  const AVATAR_SPANISH_NAMES: Record<string, string> = {
    wav2lip: "Avatar Básico",
    musetalk: "Avatar Pro — Movimiento natural",
    sadtalker: "Avatar 3D — Expresiones",
    liveportrait: "Avatar Premium — Ultra realista",
    "hedra-free": "Avatar Gratis (22/mes)",
  };

  const TTS_SPANISH_NAMES: Record<string, string> = {
    "edge-tts": "Voz IA Gratis",
    "google-tts": "Google Cloud TTS",
  };

  const avatarOptions = Object.values(AVATAR_PROVIDERS)
    .filter((p) => p.key !== 'musetalk') // MuseTalk requires video input, not static images
    .map((p) => ({
      value: p.key,
      label: AVATAR_SPANISH_NAMES[p.key] ?? p.name,
    }));

  const ttsOptions = Object.values(TTS_PROVIDERS).map((p) => ({
    value: p.key,
    label: TTS_SPANISH_NAMES[p.key] ?? p.name,
  }));

  const languageOptions = TTS_LANGUAGES.map((l) => ({
    value: l.code,
    label: l.name,
  }));

  const voices = getVoicesForLanguage(language);
  const voiceOptions = voices.map((v) => ({
    value: v.id,
    label: `${v.name} (${v.gender})`,
  }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAvatarImageUpload(file);
  };

  return (
    <div className="space-y-4">
      {/* Avatar image upload */}
      <div>
        <label htmlFor="avatar-tab-upload" className="mb-1.5 block text-xs font-medium text-gray-400">
          Imagen del Avatar
        </label>
        <label htmlFor="avatar-tab-upload" className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-surface-lighter bg-surface-light p-3 transition-colors hover:border-accent/50">
          <Upload className="h-4 w-4 text-gray-500" />
          <span className="text-xs text-gray-400">
            {avatarImageFile ? avatarImageFile.name : "Subir foto del presentador"}
          </span>
          <input
            id="avatar-tab-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        <p className="mt-1 text-[10px] text-gray-500">
          O usa la imagen del canvas principal
        </p>
      </div>

      {/* Script / Text */}
      <div>
        <label htmlFor="avatar-tab-script" className="mb-1.5 block text-xs font-medium text-gray-400">
          Script / Texto
        </label>
        <textarea
          id="avatar-tab-script"
          value={script}
          onChange={(e) => onScriptChange(e.target.value)}
          placeholder="Descubre nuestra nueva coleccion de lenceria..."
          rows={4}
          className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
        />
        <p className="mt-1 text-right text-[10px] text-gray-500">
          {script.length} caracteres
        </p>
      </div>

      {/* TTS Provider */}
      <Select
        label="Voz (TTS)"
        value={ttsProvider}
        onValueChange={(v) => onTtsProviderChange(v as TtsProviderKey)}
        options={ttsOptions}
      />

      {/* Dutch/Papiamento notice for Curacao */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2">
        <Globe className="h-3.5 w-3.5 shrink-0 text-blue-400 mt-0.5" />
        <div>
          <p className="text-[10px] font-semibold text-blue-300">
            🇨🇼 Voces en Papiamento/Holandés disponibles
          </p>
          <p className="text-[10px] text-blue-400 mt-0.5">
            Selecciona <span className="font-medium text-blue-200">Nederlands</span> para activar voces de Colette (femenino) y Maarten (masculino) — ideales para Curaçao.
          </p>
        </div>
      </div>

      {/* Language */}
      <Select
        label="Idioma"
        value={language}
        onValueChange={(v) => {
          onLanguageChange(v);
          // Auto-select first voice for new language
          const newVoices = getVoicesForLanguage(v);
          if (newVoices.length > 0) onVoiceChange(newVoices[0].id);
        }}
        options={languageOptions}
      />

      {/* Voice */}
      {voiceOptions.length > 0 && (
        <Select
          label="Voz"
          value={voice}
          onValueChange={onVoiceChange}
          options={voiceOptions}
        />
      )}

      {/* Avatar Engine */}
      <Select
        label="Motor de Avatar"
        value={avatarProvider}
        onValueChange={(v) => onAvatarProviderChange(v as AvatarProviderKey)}
        options={avatarOptions}
      />

      {/* Provider info */}
      <div className="rounded-lg border border-surface-lighter bg-surface/50 px-3 py-2">
        <p className="text-[10px] text-gray-500">
          {AVATAR_PROVIDERS[avatarProvider]?.quality}
        </p>
      </div>
    </div>
  );
}
