import type { ComponentSearchResult } from '@/types/supabase';
import { useCallback, useState } from 'preact/hooks';

export interface SelectedComponentWithCode extends ComponentSearchResult {
  // Removed codeContent, codeLoading, codeError since we no longer fetch code upfront
}

interface UseSelectedComponentsReturn {
  selectedComponents: SelectedComponentWithCode[];
  addComponent: (component: ComponentSearchResult) => void;
  removeComponent: (componentId: number) => void;
  clearSelection: () => void;
}

export function useSelectedComponents(): UseSelectedComponentsReturn {
  const [selectedComponents, setSelectedComponents] = useState<
    SelectedComponentWithCode[]
  >([]);

  const addComponent = useCallback((component: ComponentSearchResult) => {
    setSelectedComponents((prev) => {
      const exists = prev.some((c) => c.id === component.id);
      if (exists) return prev;

      return [...prev, { ...component }];
    });
  }, []);

  const removeComponent = useCallback((componentId: number) => {
    setSelectedComponents((prev) => prev.filter((c) => c.id !== componentId));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedComponents([]);
  }, []);

  return {
    selectedComponents,
    addComponent,
    removeComponent,
    clearSelection,
  };
}
