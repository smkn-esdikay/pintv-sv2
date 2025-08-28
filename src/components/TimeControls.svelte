<script lang="ts">
  import type { ZonkClock } from '@/lib/ZonkClock';
  import Button from './_UI/ZonkButton.svelte';
  import type { ClockEvent, ClockId } from '@/types';

  interface Props {
    id: ClockId,
    clock: ZonkClock;
    canReset?: boolean;
    size?: 'lg' | 'md';
    className?: string;
    onClockUpdate?: (eventName: ClockEvent, id: ClockId) => void;
  }

  let {
    id,
    clock,
    canReset = true,
    size = 'lg',
    className = '',
    onClockUpdate
  }: Props = $props();

  let isRunning = $state(false);
  let isComplete = $state(false);

  $effect(() => {
    const unsubRunning = clock.isRunning.subscribe(val => isRunning = val);
    const unsubComplete = clock.isComplete.subscribe(val => {
      const wasComplete = isComplete;
      isComplete = val;
      
      if (!wasComplete && val && onClockUpdate) {
        onClockUpdate("complete", id);
      }
    });

    return () => {
      unsubRunning();
      unsubComplete();
    };
  });

  function handleStart() {
    clock.start();
    onClockUpdate?.('start', id);
  }

  function handleStop() {
    clock.stop();
    onClockUpdate?.('stop', id);
  }

  function handleReset() {
    clock.reset();
    onClockUpdate?.('reset', id);
  }

</script>

<div class={className}>
  <div class="flex items-center justify-center gap-2">
    {#if isRunning}
      <Button
        onclick={handleStop}
        color="red"
        {size}
      >
        Stop
      </Button>
    {:else}
      <Button
        disabled={isComplete}
        onclick={handleStart}
        color="green"
        {size}
      >
        Start
      </Button>
    {/if}
    
    {#if canReset}
      <Button
        disabled={isRunning}
        onclick={handleReset}
        color="grey"
        {size}
      >
        Reset
      </Button>
    {/if}
  </div>
</div>