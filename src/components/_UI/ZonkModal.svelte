<script lang="ts">
  import { onMount } from 'svelte';
  import { X } from '@lucide/svelte'; 

  interface Props {
    open: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    onclose?: () => void;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    children?: import('svelte').Snippet;
  }

  let {
    open = $bindable(),
    size = 'md',
    onclose,
    closeOnBackdrop = true,
    closeOnEscape = true,
    children
  }: Props = $props();

  let isVisible = $state(false);

  // Size classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  const modalClasses = $derived(
    `modal-content ${sizeClasses[size]} ${isVisible ? 'modal-enter' : 'modal-exit'}`
  );

  // Handle escape key
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && closeOnEscape && open) {
      handleClose();
    }
  }

  // Handle backdrop click
  function handleBackdropClick(event: MouseEvent) {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      handleClose();
    }
  }

  // Handle backdrop keydown
  function handleBackdropKeydown(event: KeyboardEvent) {
    if (closeOnBackdrop && (event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
      event.preventDefault();
      handleClose();
    }
  }

  // Handle close
  function handleClose() {
    if (onclose) {
      onclose();
    }
  }

  // Watch for open changes
  $effect(() => {
    if (open) {
      isVisible = true;
      document.body.style.overflow = 'hidden';
    } else {
      isVisible = false;
      document.body.style.overflow = '';
    }
  });

  // Cleanup on destroy
  onMount(() => {
    return () => {
      document.body.style.overflow = '';
    };
  });
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
  <div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class={modalClasses}>
      <button
        class="modal-close"
        onclick={handleClose}
        aria-label="Close modal"
      >
        <X size={24} />
      </button>
      
      <div class="modal-body">
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    @apply fixed inset-0 z-50
      bg-black/50 backdrop-blur-sm
      flex items-center justify-center
      p-4
    ;
  }

  .modal-content {
    @apply relative
      w-full
      bg-white
      rounded-xl
      shadow-2xl
      transform transition-all duration-300 ease-out
    ;
  }

  .modal-enter {
    @apply scale-100 opacity-100;
  }

  .modal-exit {
    @apply scale-95 opacity-0;
  }

  .modal-close {
    @apply absolute top-4 right-4 z-10
      w-8 h-8
      flex items-center justify-center
      text-gray-400 hover:text-gray-600
      hover:bg-gray-100 rounded-full
      transition-colors duration-200
    ;
  }

  .modal-body {
    @apply p-6;
  }
</style>