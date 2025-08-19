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


  // Update static clock display from scoreboard data
  // $effect(() => {
  //   if (stateData && !isClockRunning) {
  //     const timeLeft = stateData.clocks?.mc?.timeLeft || 0;
  //     updateClockDisplay(timeLeft);
      
  //     // Update clock title based on period
  //     clockTitle = `Period ${(stateData.periodIdx || 0) + 1}`;
  //   }
  // });



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
</script>

<svelte:head>
  <title>Wrestling Scoreboard</title>
</svelte:head>

<div class="scoreboard-container">
  {#if !stateData}
    <div class="loading">
      <div class="text-4xl text-white">Loading Scoreboard...</div>
      <div class="text-xl text-gray-300 mt-4">Waiting for match data...</div>
    </div>
  {:else}
    <!-- Team Names Row -->
    <div class="team-row">
      <div class="team-info left">
        <div class="athlete-name">{getTeamName('l')}</div>
        <div class="team-details">
          {stateData.l?.teamName || ''}
        </div>
      </div>
      <div class="team-info right">
        <div class="athlete-name">{getTeamName('r')}</div>
        <div class="team-details">
          {stateData.r?.teamName || ''}
        </div>
      </div>
    </div>

    <!-- Scores and Clock Row -->
    <div class="main-row">
      <div class="score-section {getColorClass(stateData.l?.color || 'gray')}">
        <div class="score">{getMatchPoints('l')}</div>
      </div>
      
      <div class="clock-section">
        <div class="period-indicator">
          {clockTitle}
        </div>
        <div class="clock {isClockRunning ? 'running' : ''}">
          {clockDisplay}
        </div>
        {#if stateData.clocks?.mc?.isRunning === false && clockData?.clockId !== 'mc'}
          <div class="clock-subtitle">
            {clockData?.clockId || ''}
          </div>
        {/if}
      </div>
      
      <div class="score-section {getColorClass(stateData.r?.color || 'gray')}">
        <div class="score">{getMatchPoints('r')}</div>
      </div>
    </div>

    <!-- Info Row -->
    <div class="info-row">
      <div class="info-box weight">
        <div class="info-value">
          {stateData.config?.style || 'Wrestling'}
        </div>
        <div class="info-label">Style</div>
      </div>
      
      <div class="info-box period">
        <div class="info-value">
          {formatSeconds(stateData.config?.periodLengths?.[stateData.periodIdx] || 120)}
        </div>
        <div class="info-label">Period Length</div>
      </div>
      
      <div class="info-box bout">
        <div class="info-value">1</div>
        <div class="info-label">Bout</div>
      </div>
    </div>
  {/if}
</div>

<style>
  .scoreboard-container {
    @apply w-full h-screen bg-black text-white flex flex-col;
    font-family: 'Arial', sans-serif;
  }

  .loading {
    @apply flex flex-col items-center justify-center h-full;
  }

  /* Team Names Row */
  .team-row {
    @apply flex h-1/4 border-b-2 border-white;
  }

  .team-info {
    @apply flex-1 flex flex-col justify-center px-8 bg-gray-800;
  }

  .team-info.left {
    @apply border-r border-white;
  }

  .athlete-name {
    @apply text-3xl font-bold mb-2;
  }

  .team-details {
    @apply text-xl text-gray-300;
  }

  /* Main Scores and Clock Row */
  .main-row {
    @apply flex h-1/2 border-b-2 border-white;
  }

  .score-section {
    @apply flex-1 flex items-center justify-center text-8xl font-bold border-r border-white;
  }

  .score-section:last-child {
    @apply border-r-0;
  }

  .clock-section {
    @apply flex-1 flex flex-col items-center justify-center bg-black border-r border-white;
  }

  .period-indicator {
    @apply text-2xl font-semibold mb-4 text-gray-300;
  }

  .clock {
    @apply text-8xl font-mono font-bold transition-colors duration-300;
  }

  .clock.running {
    @apply text-yellow-400;
  }

  .clock-subtitle {
    @apply text-xl text-gray-400 mt-2;
  }

  /* Info Row */
  .info-row {
    @apply flex h-1/4;
  }

  .info-box {
    @apply flex-1 flex flex-col items-center justify-center bg-gray-700 border-r border-white;
  }

  .info-box:last-child {
    @apply border-r-0;
  }

  .info-box.weight {
    @apply bg-blue-800;
  }

  .info-box.bout {
    @apply bg-yellow-600;
  }

  .info-value {
    @apply text-4xl font-bold mb-2;
  }

  .info-label {
    @apply text-lg text-gray-300 uppercase tracking-wide;
  }

  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .score {
      @apply text-6xl;
    }
    
    .clock {
      @apply text-6xl;
    }
    
    .athlete-name {
      @apply text-2xl;
    }
    
    .info-value {
      @apply text-3xl;
    }
  }
</style>