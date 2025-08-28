<script lang="ts">
  import type { WPeriod } from '@/types';

  interface Props {
    period: WPeriod | undefined;
  }

  let {
    period
  }: Props = $props();

</script>

<div class="w-full">
  {#if !!period}
  <div class="text-center">
    { period.definition.name }
  </div>
  {/if}
</div>