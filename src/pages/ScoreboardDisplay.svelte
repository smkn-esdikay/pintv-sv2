<!-- src/pages/ScoreboardDisplay.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createScoreboardReceiver } from '@/lib/broadcast.svelte';
  import { formatSeconds } from '@/lib/math';

  // Initialize receiver
  const receiver = createScoreboardReceiver();
  
  // Reactive state
  let stateData = $state<any>(null);
  let clockData = $state<any>(null);
  let clockDisplay = $state('0:00');
  let isClockRunning = $state(false);
  let clockTitle = $state('Period 1');
  let clockInterval: ReturnType<typeof setInterval> | null = null;

  // Get reactive data from receiver
  $effect(() => {
    stateData = receiver.stateData;
  });

  $effect(() => {
    clockData = receiver.clockData;
  });

  onMount(() => {
    receiver.initialize();
  });

  onDestroy(() => {
    receiver.cleanup();
    if (clockInterval) {
      clearInterval(clockInterval);
    }
  });

  // Handle clock updates
  $effect(() => {
    if (clockData) {
      switch (clockData.type) {
        case 'start':
          isClockRunning = true;
          startClockDisplay(clockData.timeLeft, clockData.timestamp);
          break;
        case 'stop':
          isClockRunning = false;
          if (clockInterval) {
            clearInterval(clockInterval);
            clockInterval = null;
          }
          break;
        case 'reset':
          isClockRunning = false;
          if (clockInterval) {
            clearInterval(clockInterval);
            clockInterval = null;
          }
          updateClockDisplay(clockData.timeLeft);
          break;
      }
    }
  });

  let lastClockEvent = $state<string | null>(null);

  $effect(() => {
    if (clockData) {
      lastClockEvent = clockData.type;
      // Clear the flag after 2 seconds to allow normal state updates
      setTimeout(() => {
        if (lastClockEvent === clockData.type) {
          lastClockEvent = null;
        }
      }, 2000);
    }
  });

  $effect(() => {
    // Only update from state data if:
    // 1. Clock is not running 
    // 2. No recent clock events (to preserve stopped time)
    // 3. We have state data
    if (stateData && !isClockRunning && !lastClockEvent) {
      const timeLeft = stateData.clocks?.mc?.timeLeft || 0;
      updateClockDisplay(timeLeft);
      clockTitle = `Period ${(stateData.periodIdx || 0) + 1}`;
    }
  });

  function updateClockDisplay(timeMs: number) {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    clockDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function startClockDisplay(initialTimeMs: number, startTimestamp: number) {
    if (clockInterval) {
      clearInterval(clockInterval);
    }

    clockInterval = setInterval(() => {
      if (!isClockRunning) {
        if (clockInterval) {
          clearInterval(clockInterval);
          clockInterval = null;
        }
        return;
      }

      const elapsed = Date.now() - startTimestamp;
      const currentTime = Math.max(0, initialTimeMs - elapsed);
      updateClockDisplay(currentTime);

      if (currentTime <= 0) {
        isClockRunning = false;
        if (clockInterval) {
          clearInterval(clockInterval);
          clockInterval = null;
        }
      }
    }, 100);
  }

  function getColorClass(color: string): string {
    switch (color) {
      case 'red': return 'bg-red-600 text-white';
      case 'green': return 'bg-green-600 text-white';
      case 'blue': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  }

  function getTeamName(side: 'l' | 'r'): string {
    if (!stateData) return side.toUpperCase();
    
    const sideData = stateData[side];
    if (sideData?.teamName) return sideData.teamName;
    if (sideData?.athleteName) return sideData.athleteName;
    
    return sideData?.color?.toUpperCase() || side.toUpperCase();
  }

  function getMatchPoints(side: 'l' | 'r'): number {
    return stateData?.matchPoints?.[side] || 0;
  }


  const getRideColor = (): string => {
    if (stateData?.clocks?.ride?.netTime > 0)
      return stateData?.l?.color;
    else if (stateData?.clocks?.ride?.netTime < 0)
      return stateData?.r?.color;
    return '';
  };
  
  const getRideClockClass = (): string => {
    const rideColor = getRideColor();
    if (!rideColor)
      return '';
    return `sb-ride-clock-${rideColor}`;
  }
  const getRideLabelClass = (): string => {
    const rideColor = getRideColor();
    if (!rideColor)
      return '';
    return `sb-ride-label-${rideColor}`;
  }
  const formatRideTime = (netTime: number): string => {
    const pad = (num: number): string => {
      return num.toString().padStart(2, '0');
    };

    const absTime = Math.abs(netTime);
    const minutes = Math.floor(absTime / 60000);
    const seconds = Math.floor((absTime % 60000) / 1000);
    
    return `${pad(minutes)}:${pad(seconds)}`;
  };


</script>

<svelte:head>
  <title>Wrestling Scoreboard</title>
</svelte:head>


<div class="sb-wrapper">
  <div class="sb-row h-[25%]" id="row-a">

    <div class='sb-cell-neutral sb-border w-1/2 l'>
      <div class='pl-4'>
        <div class='sb-text-larger font-bold'>
          Athlete 1  
        </div>
        <div class='sb-text-large'>
          {getTeamName('l')}
        </div>       
      </div>
    </div>
    <div class='sb-cell-neutral sb-border w-1/2 l'>
      <div class='pl-4'>
        <div class='sb-text-larger font-bold'>
          Athlete 2
        </div>
        <div class='sb-text-large'>
          {getTeamName('r')}
        </div>       
      </div>
    </div>

  </div>

  <div class="sb-row h-[50%]" id="row-b">
    <div class="w-1/4 sb-border c {getColorClass(stateData?.l?.color || 'gray')}">
      <div class='sb-text-max'>
        {getMatchPoints('l')}
      </div>
    </div>
    <div class="w-1/2 sb-border sb-cell-clock c">
      <div class='flex flex-col items-center justify-center'>
        {#if clockData?.clockId === "mc"}
        
        <div class='w-full text-left sb-text-large flex flex-row'>
          <!-- {getPeriodOutput()} -->
        </div>
        {/if}
        <div class={`sb-text-max`}>
          {clockDisplay}
        </div>
        {#if clockData?.clockId !== "mc"}
          <div>
            {clockData?.title}
          </div>
        {/if}
      </div>
    </div>
    <div class="w-1/4 sb-border c {getColorClass(stateData?.r?.color || 'gray')}">
      <div class='sb-text-max'>
        {getMatchPoints('r')}
      </div>
    </div>
  </div>

  <div class="sb-row h-[25%]" id="row-c">
    <div class="w-1/4 sb-cell-neutral sb-border sb-cell-split">
      <div class='sb-cell-split-main'>
        <div class='sb-text-xxl'> 
          weight
        </div>
      </div>
      <div class='sb-cell-split-bottom'>
        <div class='sb-cell-split-bottom-text'>Weight Class</div>
      </div>
    </div>

    
    {#if stateData?.clocks?.ride }
      <div class={`w-1/2 sb-border sb-cell-neutral sb-cell-split ${getRideClockClass()}`}>

        <div class='sb-cell-split-main'>
          <div class='sb-text-xxl'> 
            {formatRideTime(stateData.clocks.ride.netTime)}
          </div>
        </div>
        <div class={`sb-cell-split-bottom  ${getRideLabelClass()}`}>
          <div class='sb-cell-split-bottom-text'>
            Riding Time
          </div>
        </div>

      </div>

    {:else}
      <div class={`w-1/2 sb-border sb-cell-neutral c`}>
        <div class='flex-col flex text-lg'>
          <div>Next Bout # - Name1, Name2</div>
          <div>Next Bout # - Name1, Name2</div>
        </div>
      </div>
    {/if}

    <div class="w-1/4 sb-border sb-cell-yellow sb-cell-split">
      <div class='sb-cell-split-main'>
        <div class='sb-text-xxl'> 
          123
        </div>
      </div>
      <div class='sb-cell-split-bottom'>
        <div class='sb-cell-split-bottom-text'>Bout</div>
      </div>
    </div>

  </div>

</div>


<style>


  .sb-wrapper {
    @apply 
      w-full h-screen 
      flex flex-col gap-[6px]
      bg-[#122128] text-white relative overflow-hidden;
  }

  .sb-wrapper .sb-row {
    @apply flex flex-row items-center gap-[6px];
  }

  .sb-wrapper .c {
    @apply flex items-center justify-center;
  }
  .sb-wrapper .l {
    @apply flex items-center justify-start;
  }

  .sb-cell-base {
    @apply h-full p-2;
  }

  .sb-wrapper .sb-cell-neutral {
    @apply sb-cell-base text-white;
  }

  .sb-wrapper .sb-cell-yellow {
    @apply sb-cell-base bg-amber-300 text-blue-950;
  }
  .sb-wrapper .sb-cell-red {
    @apply sb-cell-base bg-red-600 text-white;
  }
  .sb-wrapper .sb-cell-green {
    @apply sb-cell-base bg-green-600 text-white;
  }
  .sb-wrapper .sb-cell-blue {
    @apply sb-cell-base bg-blue-500 text-white;
  }
  .sb-wrapper .sb-cell-clock {
    @apply sb-cell-base text-amber-300;
  }

  .sb-wrapper .sb-border {
    @apply border-white border-[0.5px] p-[2px];
  }

  .sb-wrapper .sb-cell-split {
    @apply flex flex-col gap-0 h-full;
  }

  .sb-wrapper .sb-cell-split-main {
    @apply h-4/5 flex items-center justify-center;
  }

  .sb-wrapper .sb-cell-split-bottom {
    @apply h-1/5 bg-white flex items-center justify-center;

  }
  .sb-wrapper .sb-cell-split-bottom-text {
    @apply text-indigo-950 text-xl font-bold;
  }
  /* transform: rotate(90deg); */

  /* period markers */
  .sb-wrapper .sb-period-marker {
    @apply text-amber-400;
  }


  /* ride colors */
  .sb-wrapper .sb-ride-clock-red {
    @apply text-red-600 bg-white;
  }
  .sb-wrapper .sb-ride-clock-green {
    @apply text-green-600 bg-white;
  }
  .sb-wrapper .sb-ride-clock-blue {
    @apply text-blue-600 bg-white;
  }

  .sb-wrapper .sb-ride-label-red {
    @apply text-white bg-red-600/80;
  }
  .sb-wrapper .sb-ride-label-green {
    @apply text-white bg-green-600/80;
  }
  .sb-wrapper .sb-ride-label-blue {
    @apply text-white bg-blue-600/80;
  }

  /* text */
  .sb-wrapper .sb-text-large {
    @apply text-[clamp(2rem,4vw,9rem)];
      line-height: 1;
      font-feature-settings: "kern" 1;
  }
  .sb-wrapper .sb-text-larger {
    @apply text-[clamp(3rem,6vw,10rem)];
      line-height: 1;
      font-feature-settings: "kern" 1;
  }
  .sb-wrapper .sb-text-xxl {
    @apply text-[clamp(4rem,10vw,18rem)];
      line-height: 1;
      font-feature-settings: "kern" 1;
  }
  .sb-wrapper .sb-text-max {
    @apply text-[clamp(6rem,14vw,25rem)];
      line-height: 1;
      font-feature-settings: "kern" 1;
    
  }


</style>