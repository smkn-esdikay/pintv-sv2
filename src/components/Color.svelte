<script lang="ts">
  import ZonkDropdown from '@/components/_UI/ZonkDropdown.svelte';
  import type { SideColor } from '@/types';

  interface Props {
    selected: SideColor;
    className?: string;
    onSelected: (color: SideColor) => void;
  }

  let {
    selected = $bindable(),
    onSelected
  }: Props = $props();

  const colors = [
    { value: 'red', label: 'Red' },
    { value: 'green', label: 'Green' },
    { value: 'blue', label: 'Blue' },
  ];

  $effect(() => {
    onSelected(selected);
  });

</script>

<div class="w-full">
  <ZonkDropdown
    bind:value={selected}
    options={colors}
    className="w-full"
  />
</div>