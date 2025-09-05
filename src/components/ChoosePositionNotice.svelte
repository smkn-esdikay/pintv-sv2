<script lang="ts">
  import type { WPeriod } from "@/types";

  interface Props {
    periodIdx: number;
    periods: WPeriod[];
  }

  let {
    periodIdx,
    periods,
  }: Props = $props();

  let currentPeriodName = $derived(
    periods[periodIdx]?.definition.name
  );
</script>

<div class="w-full bg-yellow-300 p-2 text-center">
  <h2>Choose a starting position for {currentPeriodName}</h2>
</div>