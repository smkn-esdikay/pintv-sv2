<script lang="ts">
  import ZonkInput from "./_UI/ZonkInput.svelte";

  interface Props {
    boutNumber: number | undefined;
  }

  let {
    boutNumber = $bindable(),
  }: Props = $props();
  
  // Local string value for the input
  let inputValue = $state(boutNumber?.toString() ?? '');
  
  // Sync inputValue with boutNumber when boutNumber changes externally
  $effect(() => {
    inputValue = boutNumber?.toString() ?? '';
  });
  
  // Handle input changes and update boutNumber
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    
    // Update local input value
    inputValue = value;
    
    // Parse and update boutNumber
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      boutNumber = numValue;
    } else if (value === '') {
      boutNumber = undefined;
    }
  }
</script>

<div>
  <ZonkInput 
    bind:value={inputValue}
    type="number"
    placeholder="Bout #"
    oninput={handleInput}
    size="md"
  />
</div>
