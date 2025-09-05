<script lang="ts">
  import ZonkInput from "./_UI/ZonkInput.svelte";

  interface Props {
    boutNumber: number | undefined;
    onUpdate: (newBoutNumber: number | undefined) => void;
  }

  let {
    boutNumber = $bindable(),
    onUpdate
  }: Props = $props();
  
  let inputValue = $state(boutNumber?.toString() ?? '');
  
  $effect(() => {
    inputValue = boutNumber?.toString() ?? '';
  });
  
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    let value = target.value;

    if (parseInt(value) > 9999)
      value = "9999";
    else if (parseInt(value) < 0)
      value = "0";
    
    inputValue = value;
    
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      onUpdate(numValue);
    } else if (value === '') {
      onUpdate(undefined);
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