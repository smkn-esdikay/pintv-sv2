<!-- src/pages/ScoreboardDisplay.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // import { createScoreboardReceiver } from '@/lib/broadcast.svelte';
  import type { 
    WConfig, 
    WSide, 
    SideColor,
    WPeriod, 
    WStateSide,
    WStateMain, 
    WStateMainPublicDisplay, 
    WStateSidePublicDisplay 
  } from '@/types';

  import { broadcast } from '@/lib/broadcast.svelte';
  import { ZonkClock } from '@/lib/ZonkClock';
  import { RidingClock } from '@/lib/RidingClock';

  type WStateAdapted = WStateMain & {
    matchPoints: {
      l: number; 
      r: number; 
    }
  }

  // Create a reactive variable to hold the transformed state
  let wrestlingState = $state<WStateAdapted | null>(null);


  function transformToMainState(publicData: WStateMainPublicDisplay): WStateAdapted {
    return {
      config: publicData.config,
      clockInfo: publicData.clockInfo,
      
      // Recreate clocks from states
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

  // Set up the listener in onMount
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


  // interface SerializedClockData {
  //   timeLeft: number;
  //   elapsed: number;
  //   isRunning: boolean;
  //   isComplete: boolean;
  // }

  // interface SerializedRideData {
  //   netTime: number;
  //   isRunning: boolean;
  //   currentSide: WSide | null;
  //   advantage: WSide | null;
  //   leftAdvantageTime: number;
  //   rightAdvantageTime: number;
  // }

  // interface SerializedClocks {
  //   mc: SerializedClockData;
  //   ride?: SerializedRideData;
  //   rest?: SerializedClockData;
  //   shotclock?: SerializedClockData;
  // }

  // interface ScoreboardStateData {
  //   config: WConfig;
  //   periodIdx: number;
  //   periods: WPeriod[];
  //   matchPoints: { l: number; r: number };
  //   clocks: SerializedClocks;
  //   l: WStateSide;
  //   r: WStateSide;
  //   clockInfo: {
  //     activeId: string;
  //     lastActivatedId: string;
  //     lastActivatedAction: string;
  //   };
  // }

  // interface ClockEvent {
  //   type: 'start' | 'stop' | 'reset';
  //   clockId: string;
  //   timeLeft?: number;
  //   timestamp: number;
  //   title?: string;
  // }


  // const receiver = createScoreboardReceiver();
  
  // // state
  // let stateData = $state<ScoreboardStateData | null>(null);
  // let clockData = $state<ClockEvent | null>(null);
  // let clockDisplay = $state<string>('0:00');
  // let isClockRunning = $state<boolean>(false);
  // let clockTitle = $state<string>('Period 1');
  // let clockInterval: ReturnType<typeof setInterval> | null = null;

  // // riding time
  // let rideNetTime = $state<number>(0);
  // let rideIsRunning = $state<boolean>(false);
  // let rideLastUpdate = $state<number>(0);
  // let rideCurrentSide = $state<WSide | null>(null);
  // let rideDisplayTime = $state<number>(0);
  // let rideUpdateInterval: ReturnType<typeof setInterval> | null = null;

  // // Get reactive data from receiver
  // $effect(() => {
  //   stateData = receiver.stateData;
  // });

  // $effect(() => {
  //   clockData = receiver.clockData;
  // });

  // // Update riding time data when state changes
  // $effect(() => {
  //   if (stateData?.clocks?.ride) {
  //     const rideData = stateData.clocks.ride;
  //     rideNetTime = rideData.netTime || 0;
  //     rideIsRunning = rideData.isRunning || false;
  //     rideCurrentSide = rideData.currentSide || null;
  //     rideLastUpdate = Date.now();
      
  //     // Update display time immediately
  //     rideDisplayTime = rideNetTime;
  //   }
  // });

  // // Handle real-time riding time updates when running
  // $effect(() => {
  //   if (rideIsRunning && rideCurrentSide) {
  //     // Start real-time updates for riding time
  //     rideUpdateInterval = setInterval(() => {
  //       if (rideIsRunning && rideCurrentSide) {
  //         const elapsed = Date.now() - rideLastUpdate;
          
  //         // Calculate time change based on which side is on top
  //         // Positive netTime = right advantage, negative = left advantage
  //         const timeChange = rideCurrentSide === 'r' ? elapsed : -elapsed;
  //         rideDisplayTime = rideNetTime + timeChange;
  //       }
  //     }, 50); // Update every 50ms for smooth display
  //   } else {
  //     // Stop updates when not running
  //     if (rideUpdateInterval) {
  //       clearInterval(rideUpdateInterval);
  //       rideUpdateInterval = null;
  //     }
  //     // Show the exact static value when not running
  //     rideDisplayTime = rideNetTime;
  //   }

  //   // Cleanup function
  //   return () => {
  //     if (rideUpdateInterval) {
  //       clearInterval(rideUpdateInterval);
  //       rideUpdateInterval = null;
  //     }
  //   };
  // });

  // onMount(() => {
  //   receiver.initialize();
  // });

  // onDestroy(() => {
  //   receiver.cleanup();
  //   if (clockInterval) {
  //     clearInterval(clockInterval);
  //   }
  //   if (rideUpdateInterval) {
  //     clearInterval(rideUpdateInterval);
  //   }
  // });

  // // Handle clock updates
  // $effect(() => {
  //   if (clockData) {
  //     switch (clockData.type) {
  //       case 'start':
  //         isClockRunning = true;
  //         startClockDisplay(clockData.timeLeft || 0, clockData.timestamp);
  //         break;
  //       case 'stop':
  //         isClockRunning = false;
  //         if (clockInterval) {
  //           clearInterval(clockInterval);
  //           clockInterval = null;
  //         }
  //         break;
  //       case 'reset':
  //         isClockRunning = false;
  //         if (clockInterval) {
  //           clearInterval(clockInterval);
  //           clockInterval = null;
  //         }
  //         updateClockDisplay(clockData.timeLeft || 0);
  //         break;
  //     }
  //   }
  // });

  // let lastClockEvent = $state<string | null>(null);

  // $effect(() => {
  //   if (clockData) {
  //     const eventType = clockData.type;
  //     lastClockEvent = eventType;
  //     // Clear the flag after 2 seconds to allow normal state updates
  //     setTimeout(() => {
  //       if (lastClockEvent === eventType) {
  //         lastClockEvent = null;
  //       }
  //     }, 2000);
  //   }
  // });

  // $effect(() => {
  //   // Only update from state data if:
  //   // 1. Clock is not running 
  //   // 2. No recent clock events (to preserve stopped time)
  //   // 3. We have state data
  //   if (stateData && !isClockRunning && !lastClockEvent) {
  //     const timeLeft = stateData.clocks?.mc?.timeLeft || 0;
  //     updateClockDisplay(timeLeft);
  //     clockTitle = `Period ${(stateData.periodIdx || 0) + 1}`;
  //   }
  // });

  // function updateClockDisplay(timeMs: number): void {
  //   const totalSeconds = Math.floor(timeMs / 1000);
  //   const minutes = Math.floor(totalSeconds / 60);
  //   const seconds = totalSeconds % 60;
  //   clockDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  // }

  // function startClockDisplay(initialTimeMs: number, startTimestamp: number): void {
  //   if (clockInterval) {
  //     clearInterval(clockInterval);
  //   }

  //   clockInterval = setInterval(() => {
  //     if (!isClockRunning) {
  //       if (clockInterval) {
  //         clearInterval(clockInterval);
  //         clockInterval = null;
  //       }
  //       return;
  //     }

  //     const elapsed = Date.now() - startTimestamp;
  //     const currentTime = Math.max(0, initialTimeMs - elapsed);
  //     updateClockDisplay(currentTime);

  //     if (currentTime <= 0) {
  //       isClockRunning = false;
  //       if (clockInterval) {
  //         clearInterval(clockInterval);
  //         clockInterval = null;
  //       }
  //     }
  //   }, 100);
  // }

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
    // return 0;
    return wrestlingState?.matchPoints?.[side] || 0;
  }

  // // Updated riding time functions to use the real-time display time
  // const getRideColor = (): SideColor | '' => {
  //   if (rideDisplayTime > 0)
  //     return stateData?.r?.color || '';
  //   else if (rideDisplayTime < 0)
  //     return stateData?.l?.color || '';
  //   return '';
  // };
  
  // const getRideClockClass = (): string => {
  //   const rideColor = getRideColor();
  //   if (!rideColor) return '';
  //   return `sb-ride-clock-${rideColor}`;
  // }

  // const getRideLabelClass = (): string => {
  //   const rideColor = getRideColor();
  //   if (!rideColor) return '';
  //   return `sb-ride-label-${rideColor}`;
  // }

  // const formatRideTime = (netTime: number): string => {
  //   const pad = (num: number): string => {
  //     return num.toString().padStart(2, '0');
  //   };

  //   const absTime = Math.abs(netTime);
  //   const minutes = Math.floor(absTime / 60000);
  //   const seconds = Math.floor((absTime % 60000) / 1000);
    
  //   return `${pad(minutes)}:${pad(seconds)}`;
  // };

  // // Check if riding time should be shown
  const showRideTime = $derived((): boolean => {
    return wrestlingState?.config?.style === "Folkstyle" && 
      wrestlingState?.config?.age === "College" &&
      wrestlingState?.clocks?.ride !== undefined;
      // also check if ride time is 0:00!
  });
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
    <div class="w-1/4 sb-border c {getColorClass(wrestlingState?.l?.color || 'red')}">
      <div class='sb-text-max'>
        {getMatchPoints('l')}
      </div>
    </div>
    <div class="w-1/2 sb-border sb-cell-clock c">
      <div class='flex flex-col items-center justify-center'>
        {#if wrestlingState?.clockInfo?.activeId === "mc"}
        <div class='w-full text-left sb-text-large flex flex-row'>
          <!-- Period markers could go here -->
        </div>
        {/if}
        <div class={`sb-text-max`}>
          clock
        </div>
        {#if wrestlingState?.clockInfo?.activeId !== "mc"}
          <div>
            {wrestlingState?.clockInfo?.activeId || ''}
          </div>
        {/if}
      </div>
    </div>
    <div class="w-1/4 sb-border c {getColorClass(wrestlingState?.r?.color || 'green')}">
      <div class='sb-text-max'>
        {getMatchPoints('r')}
      </div>
    </div>
  </div>

  <div class="sb-row h-[25%]" id="row-c">
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

    {#if showRideTime()}
      <div class={`w-1/2 sb-border sb-cell-neutral sb-cell-split`}>
        <div class='sb-cell-split-main'>
          <div class='sb-text-xxl'> 
            0:00
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