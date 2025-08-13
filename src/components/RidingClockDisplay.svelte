<script lang="ts">
  import { RotateCcw, ArrowLeftRight } from '@lucide/svelte';
  import EditableTimeSegment from './EditableTimeSegment.svelte';
  import type { RidingClock } from '@/lib/RidingClock';
  import { formatRidingTime, msToRidingComponents, ridingComponentsToMs } from '@/lib/RidingClock';
  import ZonkButton from './_UI/ZonkButton.svelte';

  interface Props {
    id: string;
    clock: RidingClock;
    leftColor: 'red' | 'green' | 'blue';
    rightColor: 'red' | 'green' | 'blue';
    className?: string;
    size?: 'xl' | 'lg' | 'md' | 'sm';
    allowEditing?: boolean;
    onTimeEdit?: (newTimeMs: number) => void;
    onEditingChange?: (isEditing: boolean) => void;
    onReset?: () => void;
    onSwapAdvantage?: () => void;
  }

  let {
    id,
    clock,
    leftColor,
    rightColor,
    className = '',
    size = 'lg',
    allowEditing = true,
    onTimeEdit,
    onEditingChange,
    onReset,
    onSwapAdvantage
  }: Props = $props();

  // Subscribe to clock stores
  let netTime = $state(0);
  let isRunning = $state(false);

  $effect(() => {
    const unsubNetTime = clock.netTime.subscribe(val => netTime = val);
    const unsubRunning = clock.isRunning.subscribe(val => isRunning = val);

    return () => {
      unsubNetTime();
      unsubRunning();
    };
  });

  // Convert time components
  const { minutes, seconds, centiseconds, isNegative } = $derived(msToRidingComponents(netTime));

  const clockBaseClasses = 'font-mono text-center transition-colors duration-300';
  const clockFontClass = $derived(
    size === "sm" ? 'text-lg' :
    size === "md" ? 'text-xl' :
    size === "lg" ? 'text-3xl' :
    'text-5xl' // xl
  );
  
  const canEdit = $derived(allowEditing && !isRunning);
  
  const maxMinutes = 99; 
  const maxSeconds = 59; 
  const maxCentiseconds = 99;
  
  function getColorClasses(): string {
    if (netTime > 0) { // Right has advantage
      return rightColor === 'red' ? 'bg-red-600/80 text-white' :
             rightColor === 'green' ? 'bg-green-600/80 text-white' :
             'bg-blue-600/80 text-white';
    } else if (netTime < 0) { // Left has advantage  
      return leftColor === 'red' ? 'bg-red-600/80 text-white' :
             leftColor === 'green' ? 'bg-green-600/80 text-white' :
             'bg-blue-600/80 text-white';
    } else {
      return 'bg-black text-white';
    }
  }

  function handleTimeUpdate(newMinutes: number, newSeconds: number, newCentiseconds: number) {
    const newTimeMs = ridingComponentsToMs(newMinutes, newSeconds, newCentiseconds, isNegative);
    onTimeEdit?.(newTimeMs);
  }

  function handleMinutesUpdate(newMinutes: number) {
    handleTimeUpdate(newMinutes, seconds, centiseconds);
  }

  function handleSecondsUpdate(newSeconds: number) {
    handleTimeUpdate(minutes, newSeconds, 0); // Reset centiseconds when updating seconds
  }

  function handleCentisecondsUpdate(newCentiseconds: number) {
    handleTimeUpdate(minutes, seconds, newCentiseconds);
  }

  function handleEditingChange(isEditing: boolean) {
    onEditingChange?.(isEditing);
  }

  function handleReset() {
    onReset?.();
  }

  function handleSwapAdvantage() {
    onSwapAdvantage?.();
  }
</script>

<div class={`${clockBaseClasses} ${className}`}>
  <div class={`mx-1 ${clockFontClass} ${getColorClasses()} px-3 py-2 rounded-lg min-w-[120px]`}>
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
        <span class="mx-1">.</span>
        <EditableTimeSegment
          value={centiseconds}
          maxValue={maxCentiseconds}
          onUpdate={handleCentisecondsUpdate}
          onEditingChange={handleEditingChange}
          className={`inline-block ${clockFontClass}`}
          placeholder="centiseconds"
        />
      </div>
    {:else}
      {formatRidingTime(netTime)}
    {/if}
  </div>
  
  <div class="flex items-center justify-center gap-2 mt-2">
    <ZonkButton
      size="sm"
      color="grey"
      onclick={handleSwapAdvantage}
    >
      <ArrowLeftRight size={16} />
    </ZonkButton>
    
    <ZonkButton
      size="sm"
      color="grey"
      onclick={handleReset}
    >
      <RotateCcw size={16} />
    </ZonkButton>
  </div>
</div>
