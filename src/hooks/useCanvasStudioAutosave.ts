// 画板工程自动保存与崩溃恢复
'use client';

import { useEffect, useState } from 'react';
import {
  createDocumentFile,
  parseCanvasDocumentFile,
} from '@/engine/canvas-studio/engine';
import { useCanvasStudioStore } from '@/store/useCanvasStudioStore';

const AUTOSAVE_KEY = 'stellar-canvas-studio:autosave:v1';
const AUTOSAVE_DELAY = 700;

export function useCanvasStudioAutosave(): {
  savedAt: number | null;
  restored: boolean;
} {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (raw) {
        const file = parseCanvasDocumentFile(raw);
        useCanvasStudioStore.getState().loadDocumentFile(file);
        setRestored(true);
      }
    } catch {
      localStorage.removeItem(AUTOSAVE_KEY);
    }

    let timer: number | undefined;
    const unsubscribe = useCanvasStudioStore.subscribe((state, prevState) => {
      if (state.layers === prevState.layers && state.document === prevState.document) {
        return;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const { document, layers } = useCanvasStudioStore.getState();
        const file = createDocumentFile(document, layers);
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(file));
        setSavedAt(Date.now());
      }, AUTOSAVE_DELAY);
    });

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return { savedAt, restored };
}
