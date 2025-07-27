<script lang="ts">
  interface Option {
    value: string | number | null;
    label: string;
  }

  interface Props {
    value: string | number | null;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    onchange?: (newValue: string | number | null) => void;
  }

  let {
    value = $bindable(),
    options,
    placeholder = "",
    disabled = false,
    className = "",
    onchange
  }: Props = $props();

  const handleChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const newValue = target.value === "" ? null : 
      (isNaN(Number(target.value)) ? target.value : Number(target.value));
    
    value = newValue;
    onchange?.(newValue);
  }

</script>

<select 
  {value}
  {disabled}
  class={`${className}`}
  onchange={handleChange}
>
  {#if placeholder}
    <option value="" disabled>{placeholder}</option>
  {/if}
  
  {#each options as option}
    <option value={option.value}>
      {option.label}
    </option>
  {/each}
</select>

<style>
  select {
    @apply p-2 
      min-w-[100px]
      border border-gray-300 
      rounded-md bg-white 
      text-base 
      focus:outline-none 
      focus:border-blue-500 
      focus:ring-2 
      focus:ring-blue-200
      disabled:bg-gray-100 
      disabled:text-gray-500 
      disabled:cursor-not-allowed
    ;
  }

</style>