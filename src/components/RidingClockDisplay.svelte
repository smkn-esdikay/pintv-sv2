<script lang="ts">
  import type { RidingClock } from '@/lib/RidingClock';
  import type { SideColor, WPos } from '@/types';
  import { formatRidingTime, msToRidingComponents, ridingComponentsToMs } from '@/lib/RidingClock';
  import EditableTimeSegment from './EditableTimeSegment.svelte';
  import ZonkButton from './_UI/ZonkButton.svelte';
  import { RotateCcw, ArrowLeftRight, ChevronsLeft, ChevronsRight } from '@lucide/svelte';

  interface Props {
    id: string;
    clock: RidingClock;
    leftPos: WPos;
    leftColor: SideColor;
    rightColor: SideColor;
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
    leftPos,
    leftColor,
    rightColor,
    className = '',
    size = 'md',
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

  const clockFontClass = $derived(
    size === "sm" ? 'text-lg' :
    size === "md" ? 'text-xl' :
    size === "lg" ? 'text-3xl' :
    'text-5xl' // xl
  );
  
  const canEdit = $derived(allowEditing && !isRunning);
  
  const maxMinutes = 99; 
  const maxSeconds = 59; 
  // const maxCentiseconds = 99;

  const leftBgClass = $derived(
    leftColor === 'red' ? 'bg-red-600 text-white' :
    leftColor === 'green' ? 'bg-green-600 text-white' :
    'bg-blue-600 text-white'
  );
  const rightBgClass = $derived(
    rightColor === 'red' ? 'bg-red-600 text-white' :
    rightColor === 'green' ? 'bg-green-600 text-white' :
    'bg-blue-600 text-white'
  );

  const leftChevronClass = $derived(leftPos === "t" ? leftBgClass : 'text-slate-300');
  const rightChevronClass = $derived(leftPos === "b" ? rightBgClass : 'text-slate-300');
  
  function getColorClasses(): string {
    if (netTime > 0) { // Right has advantage
      return rightBgClass;
    } else if (netTime < 0) { // Left has advantage  
      return leftBgClass;
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

  // function handleCentisecondsUpdate(newCentiseconds: number) {
  //   handleTimeUpdate(minutes, seconds, newCentiseconds);
  // }

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

<div class={`transition-colors duration-300 ${className}`}>
  <div class="flex flex-row gap-1 items-center justify-center ">
    <ChevronsLeft class={`${leftChevronClass}`} size={16} />
    <div class={`font-mono text-center ${clockFontClass} ${getColorClasses()} mx-1 px-1 py-1 rounded-lg min-w-[120px]`}>
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
        </div>
      {:else}
        {formatRidingTime(netTime)}
      {/if}
    </div>
    <ChevronsRight class={`${rightChevronClass}`} size={16} />
  </div>
  {#if allowEditing}
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
  {/if}
</div>
