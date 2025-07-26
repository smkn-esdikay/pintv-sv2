<script lang="ts">
  import type { ZonkClock } from '@/lib/ZonkClock';

  interface Props {
    clock: ZonkClock;
    canReset?: boolean;
    className?: string;
    onClockUpdate?: (eventName: string) => void;
  }

  let {
    clock,
    canReset = true,
    className = '',
    onClockUpdate
  }: Props = $props();

  let isRunning = $state(false);
  let isComplete = $state(false);

  $effect(() => {
    const unsubRunning = clock.isRunning.subscribe(val => isRunning = val);
    const unsubComplete = clock.isComplete.subscribe(val => isComplete = val);

    return () => {
      unsubRunning();
      unsubComplete();
    };
  });

  function handleStart() {
    clock.start();
    onClockUpdate?.('start');
  }

  function handleStop() {
    clock.stop();
    onClockUpdate?.('stop');
  }

  function handleReset() {
    clock.reset();
    onClockUpdate?.('reset');
  }
</script>

<div class={className}>
  <div class="flex items-center justify-center gap-2">
    {#if isRunning}
      <button
        onclick={handleStop}
        class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
      >
        Stop
      </button>
    {:else}
      <button
        onclick={handleStart}
        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
      >
        Start
      </button>
    {/if}
    
    {#if canReset}
      <button
        disabled={isRunning}
        onclick={handleReset}
        class="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded"
      >
        Reset
      </button>
    {/if}
  </div>
</div>