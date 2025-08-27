<!-- src/pages/ScoreboardDisplay.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  import { broadcast } from '@/lib/broadcast.svelte';
  import { ZonkClock } from '@/lib/ZonkClock';
  import { RidingClock } from '@/lib/RidingClock';
  import TimeDisplay from '@/components/TimeDisplay.svelte';
  import RidingClockDisplay from '@/components/RidingClockDisplay.svelte';

  import type { 
    WSide, 
    SideColor,
    WStateSide,
    WStateMain, 
    WStateMainPublicDisplay, 
    WStateSidePublicDisplay 
  } from '@/types';
  import { Circle } from "@lucide/svelte";

  type WStateAdapted = WStateMain & {
    matchPoints: {
      l: number; 
      r: number; 
    }
  }

  let wrestlingState = $state<WStateAdapted | null>(null);

  function transformToMainState(publicData: WStateMainPublicDisplay): WStateAdapted {
    return {
      config: publicData.config,
      clockInfo: publicData.clockInfo,
      
      clocks: {
        mc: ZonkClock.fromState(publicData.clockStates.mc),
        rest: publicData.clockStates.rest ? ZonkClock.fromState(publicData.clockStates.rest) : undefined,
        shotclock: publicData.clockStates.shotclock ? ZonkClock.fromState(publicData.clockStates.shotclock) : undefined,
        ride: publicData.clockStates.ride ? RidingClock.fromState(publicData.clockStates.ride) : undefined,
      },
      
      // Transform sides
      l: transformSide(publicData.l),
      r: transformSide(publicData.r),
      
      periods: [], // You'll need to include periods in the broadcast if needed
      periodIdx: publicData.periodIdx,
      defer: publicData.defer,
      matchPoints: publicData.matchPoints,
    };
  }

  function transformSide(publicSide: WStateSidePublicDisplay): WStateSide {
    return {
      ...publicSide,
      clocks: {
        blood: publicSide.clockStates.blood ? ZonkClock.fromState(publicSide.clockStates.blood) : undefined,
        injury: publicSide.clockStates.injury ? ZonkClock.fromState(publicSide.clockStates.injury) : undefined,
        recovery: publicSide.clockStates.recovery ? ZonkClock.fromState(publicSide.clockStates.recovery) : undefined,
        headneck: publicSide.clockStates.headneck ? ZonkClock.fromState(publicSide.clockStates.headneck) : undefined,
      }
    };
  }

  // Set up the listener
  onMount(() => {
    const unsubscribe = broadcast.listen('state', (data: WStateMainPublicDisplay) => {
      // Transform WStateMainPublicDisplay back to WStateMain
      wrestlingState = transformToMainState(data);
    });

    // Request initial data
    broadcast.sendGeneric('control', 'request_data');

    // Cleanup
    onDestroy(() => {
      unsubscribe();
    });
  });

  function getColorClass(color: SideColor): string {
    switch (color) {
      case 'red': return 'bg-red-600 text-white';
      case 'green': return 'bg-green-600 text-white';
      case 'blue': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  }

  function getTeamName(side: WSide): string {
    if (!wrestlingState) return side.toUpperCase();
    
    const sideData = wrestlingState[side];
    if (sideData?.teamName) return sideData.teamName;
    if (sideData?.athleteName) return sideData.athleteName;
    
    return sideData?.color?.toUpperCase() || side.toUpperCase();
  }

  function getMatchPoints(side: WSide): number {
    return wrestlingState?.matchPoints?.[side] || 0;
  }

  const showRideTime = $derived((): boolean => {
    return !!wrestlingState && 
      wrestlingState.config?.style === "Folkstyle" && 
      wrestlingState.config?.age === "College" &&
      wrestlingState.clocks?.ride !== undefined;
      // also check if ride time is 0:00!
  });
</script>

<svelte:head>
  <title>Wrestling Scoreboard</title>
</svelte:head>

<div class="sb-wrapper">
  <div class="sb-row h-[27%]" id="row-a">
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

  <div class="sb-row h-[46%]" id="row-b">
    <div class="w-1/4 sb-border c {getColorClass(wrestlingState?.l?.color || 'red')}">
      <div class='max-clamp font-mono'>
        {getMatchPoints('l')}
      </div>
    </div>
    <div class="w-1/2 sb-border sb-cell-clock c">
      <div class='flex flex-col items-center justify-center'>
        {#if wrestlingState?.clockInfo?.activeId === "mc"}
        <div class='w-full text-left sb-text-large flex flex-row'>
          {#each Array(wrestlingState.periodIdx + 1) as _, index}
            <Circle size={44} class="sb-period-marker" />
          {/each}
        </div>
        {/if}
        <div>
          {#if wrestlingState?.clocks.mc}
          <TimeDisplay 
            id='mc'
            size="max"
            clock={wrestlingState?.clocks.mc}
            allowEditing={false}
            showElapsed={false}
            className="text-white"
          />
          {/if}
        </div>
        {#if wrestlingState?.clockInfo?.activeId !== "mc"}
          <div>
            {wrestlingState?.clockInfo?.activeId || ''}
          </div>
        {/if}
      </div>
    </div>
    <div class="w-1/4 sb-border c {getColorClass(wrestlingState?.r?.color || 'green')}">
      <div class='max-clamp font-mono'>
        {getMatchPoints('r')}
      </div>
    </div>
  </div>

  <div class="sb-row h-[27%]" id="row-c">
    <div class="w-1/4 sb-cell-neutral sb-border sb-cell-split">
      <div class='sb-cell-split-main'>
        <div class='sb-text-xxl'> 
          97
        </div>
      </div>
      <div class='sb-cell-split-bottom'>
        <div class='sb-cell-split-bottom-text'>Weight Class</div>
      </div>
    </div>

    {#if wrestlingState && wrestlingState.clocks.ride && showRideTime()}
      <div class={`w-1/2 sb-border sb-cell-neutral sb-cell-split`}>
        <div class='sb-cell-split-main'>
          <div class=''> 
            <RidingClockDisplay 
              id='ride'
              size="xl"
              clock={wrestlingState.clocks.ride}
              leftPos={wrestlingState.l.pos}
              leftColor={wrestlingState.l.color}
              rightColor={wrestlingState.r.color}
              allowEditing={false}
            />
          </div>
        </div>
        <div class={`sb-cell-split-bottom`}>
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
    @apply sb-cell-base border-white border-[0.5px] p-[2px];
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

  :global(.sb-period-marker) {
    @apply fill-yellow-300 text-yellow-300 mr-1;
    width: clamp(1.2rem, 4vw, 6rem);
    height: clamp(1.2rem, 4vw, 6rem);
  }
</style>