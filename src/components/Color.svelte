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
</script>

<div class="w-full">
  <ZonkDropdown
    value={selected}
    options={colors}
    className="w-full"
    onchange={(val) => onSelected(val as SideColor)}
  />
</div>