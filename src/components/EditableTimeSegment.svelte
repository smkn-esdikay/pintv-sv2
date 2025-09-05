<script lang="ts">
  import { useInputModeControl } from '@/lib/inputModeHelpers';
  import { randomId } from '@/lib/math';

  interface Props {
    value: number;
    maxValue: number;
    minValue?: number;
    onUpdate: (newValue: number) => void;
    onEditingChange?: (isEditing: boolean) => void;
    className?: string;
    placeholder: string;
  }

  let {
    value,
    maxValue,
    minValue = 0,
    onUpdate,
    onEditingChange,
    className = '',
    placeholder
  }: Props = $props();

  let isEditing = $state(false);
  let editValue = $state(value.toString().padStart(2, '0'));
  let spanElement: HTMLSpanElement;

  const { requestMode: requestEditingMode, releaseMode: releaseEditingMode } = 
    useInputModeControl('editing', randomId('time-edit'));

  $effect(() => {
    if (!isEditing) {
      editValue = value.toString().padStart(2, '0');
    }
  });

  function handleClick() {
    isEditing = true;
    editValue = value.toString();
    requestEditingMode();
    onEditingChange?.(true);
    
    // Focus and select text after DOM update
    setTimeout(() => {
      if (spanElement) {
        spanElement.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(spanElement);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    // Allow navigation keys
    if (['ArrowLeft', 'ArrowRight', 'Backspace', 'Delete', 'Tab'].includes(e.key)) {
      return;
    }

    // Allow Enter to confirm
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // Allow Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
      return;
    }

    // Only allow digits
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    // Prevent input if it would exceed 2 digits
    const currentText = (e.target as HTMLElement).textContent || '';
    if (currentText.length >= 2) {
      e.preventDefault();
      return;
    }
  }

  function handleInput(e: Event) {
    const text = (e.target as HTMLElement).textContent || '';
    
    // Remove non-digits
    const digitsOnly = text.replace(/\D/g, '');
    
    // Limit to 2 digits
    const limited = digitsOnly.slice(0, 2);
    
    editValue = limited;
    
    // Update the display
    if ((e.target as HTMLElement).textContent !== limited) {
      (e.target as HTMLElement).textContent = limited;
      
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(e.target as HTMLElement);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }

  function handleSubmit() {
    const numValue = parseInt(editValue, 10);
    
    // Validate the value
    if (isNaN(numValue) || numValue < minValue || numValue > maxValue) {
      // Reset to original value if invalid
      editValue = value.toString().padStart(2, '0');
      isEditing = false;
      releaseEditingMode();
      onEditingChange?.(false);
      return;
    }

    // Update the value
    onUpdate(numValue);
    isEditing = false;
    releaseEditingMode();
    onEditingChange?.(false);
  }

  function handleCancel() {
    editValue = value.toString().padStart(2, '0');
    isEditing = false;
    onEditingChange?.(false);
  }

  function handleBlur() {
    handleSubmit();
  }

  let dynamicClasses = $derived(
    isEditing
      ? 'bg-blue-100 text-blue-900 outline-none'
      : 'cursor-pointer hover:bg-blue-300'
  );
</script>

<span
  bind:this={spanElement}
  class={`${className} ${dynamicClasses} transition-colors duration-150`}
  contenteditable={isEditing}
  role="button"
  tabindex="0"
  onclick={handleClick}
  onkeydown={handleKeyDown}
  oninput={handleInput}
  onblur={handleBlur}
  title={`Click to edit ${placeholder} (0-${maxValue})`}
>
  {isEditing ? editValue : value.toString().padStart(2, '0')}
</span>