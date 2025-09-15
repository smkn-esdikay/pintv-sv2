<script lang="ts">
  import ZonkDropdown from '@/components/_UI/ZonkDropdown.svelte';
  import type { WPos } from '@/types';

  interface Props {
    selected: WPos;
    className?: string;
    onSelected: (position: WPos) => void;
  }

  let {
    selected = $bindable(),
    onSelected
  }: Props = $props();

  const positions = [
    { value: 't', label: 'Top' },
    { value: 'n', label: 'Neutral' },
    { value: 'b', label: 'Bottom' },
  ];

</script>

<div class="w-full">
  <ZonkDropdown
    placeholder="Position"
    value={selected}
    options={positions}
    className="w-full"
    onchange={(val) => onSelected(val as WPos)}
  />
</div>