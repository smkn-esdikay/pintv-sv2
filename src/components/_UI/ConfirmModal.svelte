<script lang="ts">
  import ZonkModal from './ZonkModal.svelte';
  import ZonkButton from './ZonkButton.svelte';

  interface Props {
    open: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'green' | 'blue' | 'red' | 'grey';
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    onconfirm: () => void;
    oncancel?: () => void;
    onclose?: () => void;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    children?: import('svelte').Snippet;
  }

  let {
    open = $bindable(),
    title = 'Confirm Action',
    message = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmColor = 'red',
    size = 'md',
    onconfirm,
    oncancel,
    onclose,
    closeOnBackdrop = true,
    closeOnEscape = true,
    children
  }: Props = $props();

  function handleConfirm() {
    onconfirm();
    open = false;
  }

  function handleCancel() {
    if (oncancel) {
      oncancel();
    }
    open = false;
  }

  function handleClose() {
    if (onclose) {
      onclose();
    } else {
      handleCancel();
    }
  }
</script>

<ZonkModal
  bind:open
  {size}
  onclose={handleClose}
  {closeOnBackdrop}
  {closeOnEscape}
>
  <div class="confirm-modal">
    {#if title}
      <h2 class="confirm-title">{title}</h2>
    {/if}
    
    <div class="confirm-content">
      {#if children}
        {@render children()}
      {:else if message}
        <p>{message}</p>
      {/if}
    </div>
    
    <div class="confirm-actions">
      <ZonkButton
        color="grey"
        size="lg"
        onclick={handleCancel}
      >
        {cancelText}
      </ZonkButton>
      
      <ZonkButton
        color={confirmColor}
        size="lg"
        onclick={handleConfirm}
      >
        {confirmText}
      </ZonkButton>
    </div>
  </div>
</ZonkModal>

<style>
  .confirm-modal {
    @apply my-4 text-center;
  }

  .confirm-content {
    @apply mb-6;
  }

  .confirm-actions {
    @apply flex gap-4 justify-center;
  }
</style>