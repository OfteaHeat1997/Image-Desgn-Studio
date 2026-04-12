// =============================================================================
// Video Store - UniStudio
// Zustand store for Video Studio state management.
// =============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  VideoStoreState,
  VideoMode,
  VideoCategory,
  VideoProviderKey,
  AvatarProviderKey,
  TtsProviderKey,
  VideoProject,
  AiEnhancement,
} from '@/types/video';

const initialState = {
  mode: 'manual' as VideoMode,
  activeTab: 'product' as VideoCategory,
  selectedProvider: 'wan-2.2-fast' as VideoProviderKey,
  selectedPreset: 'product-rotate',
  customPrompt: '',
  duration: 5,
  aspectRatio: '16:9',
  avatarProvider: 'sadtalker' as AvatarProviderKey,
  ttsProvider: 'edge-tts' as TtsProviderKey,
  script: '',
  voice: 'es-MX-DaliaNeural',
  language: 'es',
  aiEnhancement: null as AiEnhancement | null,
  isEnhancing: false,
  autoStep: null as string | null,
  isProcessing: false,
  videoResult: null as string | null,
  projects: [] as VideoProject[],
};

export const useVideoStore = create<VideoStoreState>()(
  persist(
    (set) => ({
      ...initialState,

      setMode: (mode) => set({ mode }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setSelectedProvider: (selectedProvider) => set({ selectedProvider }),
      setSelectedPreset: (selectedPreset) => set({ selectedPreset }),
      setCustomPrompt: (customPrompt) => set({ customPrompt }),
      setDuration: (duration) => set({ duration }),
      setAspectRatio: (aspectRatio) => set({ aspectRatio }),
      setAvatarProvider: (avatarProvider) => set({ avatarProvider }),
      setTtsProvider: (ttsProvider) => set({ ttsProvider }),
      setScript: (script) => set({ script }),
      setVoice: (voice) => set({ voice }),
      setLanguage: (language) => set({ language }),
      setAiEnhancement: (aiEnhancement) => set({ aiEnhancement }),
      setIsEnhancing: (isEnhancing) => set({ isEnhancing }),
      setAutoStep: (autoStep) => set({ autoStep }),
      setIsProcessing: (isProcessing) => set({ isProcessing }),
      setVideoResult: (videoResult) => set({ videoResult }),

      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects].slice(0, 50),
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'unistudio-video-store',
      storage: {
        getItem: (name) => {
          try { const v = localStorage.getItem(name); return v ? JSON.parse(v) : null; }
          catch { return null; }
        },
        setItem: (name, value) => {
          try { localStorage.setItem(name, JSON.stringify(value)); }
          catch { /* QuotaExceededError — silently drop, preferences not critical */ }
        },
        removeItem: (name) => { try { localStorage.removeItem(name); } catch {} },
      },
      partialize: (state) => ({
        mode: state.mode,
        activeTab: state.activeTab,
        selectedProvider: state.selectedProvider,
        avatarProvider: state.avatarProvider,
        ttsProvider: state.ttsProvider,
        language: state.language,
        voice: state.voice,
        duration: state.duration,
        aspectRatio: state.aspectRatio,
        // Strip data URLs before persisting to avoid localStorage quota crashes
        projects: state.projects.map((p) => ({
          ...p,
          sourceImageUrl: p.sourceImageUrl?.startsWith('data:') ? '' : p.sourceImageUrl,
          resultVideoUrl: p.resultVideoUrl?.startsWith('data:') ? '' : p.resultVideoUrl,
        })),
      }),
    },
  ),
);
