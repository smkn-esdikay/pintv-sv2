<script lang="ts">
  import { randomId } from '@/lib/math';
  import { ChevronDown, ChevronUp } from '@lucide/svelte';

  interface Option {
    value: string | number | boolean | null;
    label: string;
  }

  interface Props {
    value: string | number | boolean| null;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    onchange?: (newValue: string | number | boolean | null) => void;
  }

  let {
    value = $bindable(),
    options,
    placeholder = "",
    disabled = false,
    size = 'md',
    className = "",
    onchange
  }: Props = $props();

  const selectId = randomId();
  let isFocused = $state(false);
  let selectElement: HTMLSelectElement;

  let containerClasses = $derived(
    `dropdown-container ${size} ${className}`.trim()
  );

  let selectClasses = $derived(
    `base ${size}`.trim()
  );

  let hasValue = $derived(value !== null && value !== "");
  
  let floatingLabelClasses = $derived(
    `floating-label ${size} ${hasValue || isFocused ? 'show' : 'hide'}`
  );

  const handleChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    let newValue: string | number | boolean | null;
    
    if (target.value === "") {
      newValue = null;
    } else {
      const selectedOption = options.find(opt => String(opt.value) === target.value);
      newValue = selectedOption ? selectedOption.value : target.value;
    }
    
    value = newValue;
    onchange?.(newValue);
    
    // Blur the select element after selection
    target.blur();
  }

  function handleFocus() {
    isFocused = true;
  }

  function handleBlur() {
    isFocused = false;
  }

  let selectValue = $derived(value === null ? "" : String(value));
</script>

<div class={containerClasses}>
  <select 
    bind:this={selectElement}
    id={selectId}
    value={selectValue}
    {disabled}
    class={selectClasses}
    onchange={handleChange}
    onfocus={handleFocus}
    onblur={handleBlur}
  >
    {#if !hasValue}
      <option value="" disabled hidden></option>
    {/if}
    
    {#each options as option}
      <option value={String(option.value)}>
        {option.label}
      </option>
    {/each}
  </select>
  
  <div class="dropdown-icon">
    {#if isFocused}
      <ChevronUp size={20} class={disabled ? "text-gray-400" : "text-gray-500"} />
    {:else}
      <ChevronDown size={20} class={disabled ? "text-gray-400" : "text-gray-500"} />
    {/if}
  </div>
  
  {#if placeholder}
    <label for={selectId} class={floatingLabelClasses}>
      {placeholder}
    </label>
  {/if}
</div>

<style>
  .dropdown-container {
    @apply relative w-full;
  }

  .base {
    @apply w-full
      border border-gray-300 
      rounded-md bg-white 
      text-base text-gray-900
      focus:outline-none 
      focus:border-blue-500 
      focus:ring-2 
      focus:ring-blue-200
      disabled:bg-gray-100 
      disabled:text-gray-500 
      disabled:cursor-not-allowed
      disabled:border-gray-200
      transition-colors duration-150
      appearance-none
      cursor-pointer
    ;
    padding-right: 2.5rem;
  }

  .dropdown-icon {
    @apply absolute right-3 top-1/2 
      pointer-events-none
      transform -translate-y-1/2
      transition-transform duration-150
    ;
  }

  .sm {
    @apply px-1 py-1 text-sm;
  }
  
  .md {
    @apply px-1 py-1 text-base;
  }
  
  .lg {
    @apply px-1 py-1 text-lg;
  }

  /* Focus styles for better accessibility */
  .base:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Floating label styles */
  .floating-label {
    @apply absolute left-0 
      bg-white p-[1px]
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
    @apply -top-1.5 left-1;
    transform: translateY(0) scale(0.85);
  }

  .floating-label.md.show {
    @apply -top-1.5 left-1;
    transform: translateY(0) scale(0.85);
  }

  .floating-label.lg.show {
    @apply -top-1.5 left-1;
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

  /* When select is focused, make sure floating label stays visible */
  .dropdown-container:focus-within .floating-label.show {
    @apply text-blue-500;
  }
</style>