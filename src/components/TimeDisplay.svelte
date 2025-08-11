<script lang="ts">
  import EditableTimeSegment from './EditableTimeSegment.svelte';
  import type { ZonkClock } from '@/lib/ZonkClock';

  interface Props {
    id: string;
    clock: ZonkClock;
    className?: string;
    size?: 'xl' | 'lg' | 'md' | 'sm';
    showElapsed?: boolean;
    allowEditing?: boolean;
    onTimeEdit?: (newTimeMs: number) => void;
    onEditingChange?: (isEditing: boolean) => void;
  }

  let {
    id,
    clock,
    className = '',
    size = 'lg',
    showElapsed = false,
    allowEditing = true,
    onTimeEdit,
    onEditingChange
  }: Props = $props();

  // Subscribe to clock stores
  let remaining = $state(0);
  let elapsed = $state(0);
  let isRunning = $state(false);
  let isComplete = $state(false);

  $effect(() => {
    const unsubRemaining = clock.remaining.subscribe(val => remaining = val);
    const unsubElapsed = clock.elapsed.subscribe(val => elapsed = val);
    const unsubRunning = clock.isRunning.subscribe(val => isRunning = val);
    const unsubComplete = clock.isComplete.subscribe(val => isComplete = val);

    return () => {
      unsubRemaining();
      unsubElapsed();
      unsubRunning();
      unsubComplete();
    };
  });

  // Convert time to components
  function msToComponents(ms: number): { minutes: number; seconds: number } {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return { minutes, seconds };
  }

  // Format time with precision
  function msToTimeWithPrecision(ms: number, showPrecision: boolean = false): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (showPrecision) {
      const centiseconds = Math.floor((ms % 1000) / 10);
      return `${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  // Convert time components to milliseconds
  function timeToMs(minutes: number, seconds: number): number {
    return (minutes * 60 + seconds) * 1000;
  }

  const { minutes, seconds } = $derived(msToComponents(remaining));

  const clockBaseClasses = 'font-mono text-black text-center';
  const clockFontClass = $derived(
    size === "md" ? 'text-xl' :
    size === "lg" ? 'text-4xl' :
    size === "xl" ? 'text-6xl' :
    'text-lg' // small
  );
  
  // Show precision when 5 seconds or less remain
  const showPrecision = $derived(remaining <= 5000 && isRunning);
  
  const canEdit = $derived(allowEditing && (!isRunning && !isComplete));
  
  const maxMinutes = 99; 
  const maxSeconds = 59; 
  
  function handleTimeUpdate(newMinutes: number, newSeconds: number) {
    const newTimeMs = timeToMs(newMinutes, newSeconds);
    onTimeEdit?.(newTimeMs);
  }

  function handleMinutesUpdate(newMinutes: number) {
    handleTimeUpdate(newMinutes, seconds);
  }

  function handleSecondsUpdate(newSeconds: number) {
    handleTimeUpdate(minutes, newSeconds);
  }

  const precisionClass = $derived(showPrecision ? 'text-red-600' : '');

  function handleEditingChange(isEditing: boolean) {
    onEditingChange?.(isEditing);
  }
</script>

<div class={`${clockBaseClasses} ${className}`}>
  <div class={`mx-1 ${clockFontClass} ${precisionClass}`}>
    {#if canEdit}
      <div class="inline-flex items-center">
        <EditableTimeSegment
          value={minutes}
          maxValue={maxMinutes}
          onUpdate={handleMinutesUpdate}
          onEditingChange={handleEditingChange}
          className={`inline-block ${clockFontClass}`}
          placeholder="minutes"
        />
        <span class="mx-1">:</span>
        <EditableTimeSegment
          value={seconds}
          maxValue={maxSeconds}
          onUpdate={handleSecondsUpdate}
          onEditingChange={handleEditingChange}
          className={`inline-block ${clockFontClass}`}
          placeholder="seconds"
        />
        {#if showPrecision}
          <span class="ml-1 text-sm">
            .{Math.floor((remaining % 1000) / 10).toString().padStart(2, '0')}
          </span>
        {/if}
      </div>
    {:else}
      {msToTimeWithPrecision(remaining, showPrecision)}
    {/if}
  </div>
        
  {#if showElapsed}
    <div class="text-gray-500 mt-1">
      Elapsed: {msToTimeWithPrecision(elapsed, false)}
    </div>
  {/if}
</div>