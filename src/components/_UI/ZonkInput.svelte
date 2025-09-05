<script lang="ts">
  import { editingMode } from '@/lib/inputModeHelpers';
  import { randomId } from '@/lib/math';

  interface Props {
    value: string;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    maxlength?: number;
    autocomplete?: 'on' | 'off' | 'name' | 'email' | 'username' | 'current-password' | 'new-password' | 'tel' | 'url' | 'street-address' | 'postal-code' | 'cc-name' | 'cc-number' | 'cc-exp' | 'cc-csc';
    oninput?: (event: Event) => void;
    onchange?: (event: Event) => void;
    onfocus?: (event: FocusEvent) => void;
    onblur?: (event: FocusEvent) => void;
    onkeydown?: (event: KeyboardEvent) => void;
    onkeyup?: (event: KeyboardEvent) => void;
  }

  let {
    value = $bindable(),
    placeholder = '',
    disabled = false,
    readonly = false,
    type = 'text',
    size = 'md',
    className = '',
    maxlength,
    autocomplete,
    oninput,
    onchange,
    onfocus,
    onblur,
    onkeydown,
    onkeyup
  }: Props = $props();

  const inputId = randomId();

  let inputElement: HTMLInputElement;
  let isFocused = $state(false);

  const containerClasses = $derived(
    `input-container ${size} ${className}`.trim()
  );

  const inputClasses = $derived(
    `base ${size}`.trim()
  );

  const showFloatingLabel = $derived(value !== '');

  const floatingLabelClasses = $derived(
    `floating-label ${size} ${showFloatingLabel ? 'show' : 'hide'}`
  );

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    oninput?.(event);
  }

  function handleChange(event: Event) {
    onchange?.(event);
  }

  function handleFocus(event: FocusEvent) {
    isFocused = true;
    onfocus?.(event);
  }

  function handleBlur(event: FocusEvent) {
    isFocused = false;
    onblur?.(event);
  }

  function handleKeyDown(event: KeyboardEvent) {
    onkeydown?.(event);
  }

  function handleKeyUp(event: KeyboardEvent) {
    onkeyup?.(event);
  }

  // Public API for programmatic access
  export function focus() {
    inputElement?.focus();
  }

  export function blur() {
    inputElement?.blur();
  }

  export function select() {
    inputElement?.select();
  }
</script>

<div class={containerClasses}>
  <input
    bind:this={inputElement}
    bind:value
    {type}
    id={inputId}
    placeholder={isFocused || !showFloatingLabel ? placeholder : ''}
    {disabled}
    {readonly}
    {maxlength}
    autocomplete={autocomplete}
    class={inputClasses}
    use:editingMode
    oninput={handleInput}
    onchange={handleChange}
    onfocus={handleFocus}
    onblur={handleBlur}
    onkeydown={handleKeyDown}
    onkeyup={handleKeyUp}
  />
  
  {#if placeholder}
    <label for={inputId} class={floatingLabelClasses}>
      {placeholder}
    </label>
  {/if}
</div>

<style>
  .input-container {
    @apply relative w-full;
  }

  .base {
    @apply w-full
      border border-gray-300 
      rounded-md bg-white 
      text-base text-gray-900
      placeholder-gray-500
      focus:outline-none 
      focus:border-blue-500 
      focus:ring-2 
      focus:ring-blue-200
      disabled:bg-gray-100 
      disabled:text-gray-500 
      disabled:cursor-not-allowed
      disabled:border-gray-200
      transition-colors duration-150
    ;
  }

  .sm {
    @apply px-3 py-1.5 text-sm;
  }
  
  .md {
    @apply px-4 py-2 text-base;
  }
  
  .lg {
    @apply px-5 py-3 text-lg;
  }

  /* Focus styles for better accessibility */
  .base:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Floating label styles */
  .floating-label {
    @apply absolute left-0 
      bg-white p-1
      rounded-md
      text-gray-600
      pointer-events-none
      transition-all duration-200 ease-out
      transform-gpu
    ;
  }

  .floating-label.sm {
    @apply text-xs;
  }

  .floating-label.md {
    @apply text-sm;
  }

  .floating-label.lg {
    @apply text-base;
  }

  /* Floating label positioning */
  .floating-label.sm.show {
    @apply -top-2 left-3;
    transform: translateY(0) scale(0.85);
  }

  .floating-label.md.show {
    @apply -top-1 left-4;
    transform: translateY(0) scale(0.85);
  }

  .floating-label.lg.show {
    @apply -top-3 left-5;
    transform: translateY(0) scale(0.85);
  }

  .floating-label.hide {
    @apply opacity-0;
    transform: translateY(0) scale(1);
  }

  /* Error state (can be added via className prop) */
  :global(.error .base) {
    @apply border-red-500 focus:border-red-500 focus:ring-red-200;
  }

  :global(.error .floating-label) {
    @apply text-red-500;
  }

  /* Success state (can be added via className prop) */
  :global(.success .base) {
    @apply border-green-500 focus:border-green-500 focus:ring-green-200;
  }

  :global(.success .floating-label) {
    @apply text-green-500;
  }

  /* When input is focused, make sure floating label stays visible */
  .input-container:focus-within .floating-label.show {
    @apply text-blue-500;
  }
</style>