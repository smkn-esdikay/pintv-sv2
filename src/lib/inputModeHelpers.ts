// src/lib/inputModeHelpers.ts - Helper functions and components

import { onMount, onDestroy } from 'svelte';
import { inputModeManager, type InputMode } from './InputModeManager.svelte';
import { randomId } from './math';

/**
 * Svelte action for components that need to control input mode
 * Usage: <div use:inputMode={{ mode: 'modal', componentId: 'my-modal' }}>
 */
export function inputMode(
  node: HTMLElement, 
  params: { mode: InputMode; componentId?: string; enabled?: boolean }
) {
  const componentId = params.componentId ?? randomId('input-mode');
  let currentMode = params.mode;
  let isEnabled = params.enabled ?? true;

  function updateMode() {
    if (isEnabled) {
      inputModeManager.requestMode(currentMode, componentId);
    } else {
      inputModeManager.releaseMode(componentId);
    }
  }

  // Initial setup
  updateMode();

  return {
    update(newParams: { mode: InputMode; componentId?: string; enabled?: boolean }) {
      const wasEnabled = isEnabled;
      currentMode = newParams.mode;
      isEnabled = newParams.enabled ?? true;

      if (wasEnabled !== isEnabled || newParams.mode !== currentMode) {
        if (wasEnabled && !isEnabled) {
          inputModeManager.releaseMode(componentId);
        }
        updateMode();
      }
    },
    destroy() {
      inputModeManager.releaseMode(componentId);
    }
  };
}

/**
 * Helper for input elements that should trigger editing mode
 * Usage: <input use:editingMode />
 */
export function editingMode(node: HTMLInputElement | HTMLTextAreaElement) {
  const componentId = randomId('editing');
  
  function handleFocus() {
    inputModeManager.requestMode('editing', componentId);
  }
  
  function handleBlur() {
    inputModeManager.releaseMode(componentId);
  }
  
  node.addEventListener('focus', handleFocus);
  node.addEventListener('blur', handleBlur);
  
  return {
    destroy() {
      node.removeEventListener('focus', handleFocus);
      node.removeEventListener('blur', handleBlur);
      inputModeManager.releaseMode(componentId);
    }
  };
}

/**
 * Composable function for Svelte components to manage input mode
 * Usage in component:
 * const { requestMode, releaseMode } = useInputModeControl('modal');
 * requestMode(); // Request modal mode
 * releaseMode(); // Release modal mode
 */
export function useInputModeControl(mode: InputMode, componentId?: string) {
  const id = componentId ?? randomId('input-control');
  let isRequested = false;

  function requestMode() {
    if (!isRequested) {
      inputModeManager.requestMode(mode, id);
      isRequested = true;
    }
  }

  function releaseMode() {
    if (isRequested) {
      inputModeManager.releaseMode(id);
      isRequested = false;
    }
  }

  // Cleanup on component destroy
  onDestroy(() => {
    releaseMode();
  });

  return {
    requestMode,
    releaseMode,
    get isRequested() { return isRequested; }
  };
}

/**
 * Auto-managing input mode for component lifecycle
 * Automatically requests mode on mount, releases on destroy
 * Usage: useAutoInputMode('modal', 'my-modal-component');
 */
export function useAutoInputMode(mode: InputMode, componentId?: string, enabled: boolean = true) {
  const id = componentId ?? randomId('auto-input');
  
  onMount(() => {
    if (enabled) {
      inputModeManager.requestMode(mode, id);
    }
  });

  onDestroy(() => {
    inputModeManager.releaseMode(id);
  });

  return {
    enable: () => inputModeManager.requestMode(mode, id),
    disable: () => inputModeManager.releaseMode(id)
  };
}

/**
 * Higher-order function to create input-aware event handlers
 * Usage: const safeHandler = createInputAwareHandler(() => console.log('clicked'), ['normal']);
 */
export function createInputAwareHandler(
  handler: () => void, 
  allowedModes: InputMode[] = ['normal']
): () => void {
  return () => {
    const currentMode = inputModeManager.getCurrentMode();
    if (allowedModes.includes(currentMode)) {
      handler();
    }
  };
}

/**
 * Debounced input mode watcher
 * Useful for expensive operations that should respond to input mode changes
 */
export function watchInputMode(
  callback: (mode: InputMode) => void,
  debounceMs: number = 0
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  
  return inputModeManager.subscribe((mode) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    if (debounceMs > 0) {
      timeoutId = setTimeout(() => callback(mode), debounceMs);
    } else {
      callback(mode);
    }
  });
}