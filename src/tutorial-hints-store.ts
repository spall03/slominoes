// src/tutorial-hints-store.ts
//
// Small dedicated store for the FTUE Level 0 hint sequence. Drives:
// - which banner/overlay copy is currently visible
// - which UI element (if any) should be pulsing for attention
//
// Lives separately from useGameStore / useMetaStore so it can be torn down
// cleanly when leaving Level 0, and so non-tutorial components only pay a
// subscription cost when they actually need to (i.e., during Level 0).

import { create } from 'zustand';

/** Which UI affordance should pulse for attention. */
export type TutorialFocus =
  | 'entry'         // entry-spot buttons
  | 'respin-badge'  // HUD respin badge ("EARN" / count)
  | 'rows'          // row respin buttons (when respin mode is active)
  | null;

export interface TutorialHintsState {
  /** Current step (0 = inactive, 1..6 plus 1.5 for rotate/confirm) */
  step: number;

  /** Persistent banner copy at the top of the play area. Null = hide. */
  bannerCopy: string | null;

  /** Centered "wow moment" overlay. Auto-fades on a timer. Null = hide. */
  overlayCopy: string | null;

  /** Which UI element should pulse for attention. */
  focus: TutorialFocus;

  /** True after the player has fired a respin in this Level 0 attempt. */
  respinUsed: boolean;

  // Actions
  show: (params: { step?: number; bannerCopy?: string | null; overlayCopy?: string | null; focus?: TutorialFocus }) => void;
  showOverlay: (copy: string) => void;
  clearOverlay: () => void;
  markRespinUsed: () => void;
  reset: () => void;
}

export const useTutorialHints = create<TutorialHintsState>((set) => ({
  step: 0,
  bannerCopy: null,
  overlayCopy: null,
  focus: null,
  respinUsed: false,

  show: ({ step, bannerCopy, overlayCopy, focus }) => set((s) => ({
    step: step ?? s.step,
    bannerCopy: bannerCopy === undefined ? s.bannerCopy : bannerCopy,
    overlayCopy: overlayCopy === undefined ? s.overlayCopy : overlayCopy,
    focus: focus === undefined ? s.focus : focus,
  })),

  showOverlay: (copy) => set({ overlayCopy: copy }),
  clearOverlay: () => set({ overlayCopy: null }),
  markRespinUsed: () => set({ respinUsed: true }),

  reset: () => set({
    step: 0,
    bannerCopy: null,
    overlayCopy: null,
    focus: null,
    respinUsed: false,
  }),
}));
