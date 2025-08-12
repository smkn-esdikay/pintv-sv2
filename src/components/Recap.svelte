<script lang="ts">
  import type { WPeriod, WAction, WStyle, SideColor, WSide } from '@/types';
  import { Clock, Settings } from '@lucide/svelte';

  interface Props {
    periods: WPeriod[];
    colorLeft: SideColor;
    colorRight: SideColor;
    onSwitch?: (actionId: string) => void;
    onDelete?: (actionId: string) => void;
  }

  let {
    periods,
    colorLeft,
    colorRight,
    onSwitch,
    onDelete,
  }: Props = $props();

  let orderMode = $state<'chrono' | 'match'>('chrono');
  let recapContainer: HTMLDivElement;

  let expandedActions = $state<Set<string>>(new Set());

  function getColorClass(side: WSide, opp: boolean = false): string {
    let color; 
    if (!opp)
      color = side === "l" ? colorLeft : colorRight;
    else
      color = side === "r" ? colorLeft : colorRight;

    if (color === "blue")
      return "text-points-blue";
    else if (color === "green")
      return "text-points-green";
    return "text-points-red";
  }

  function getSideClass(side: WSide): string {
    if (side === "l") 
      return "justify-start";
    else
      return "justify-end";
  }

  function toggleExpand(actionId: string) {
    const newExpanded = new Set(expandedActions);
    
    if (newExpanded.has(actionId)) {
      newExpanded.delete(actionId);
    } else {
      newExpanded.add(actionId);
    }
    
    expandedActions = newExpanded;
  }

  function deleteAction(actionId: string) {
    onDelete?.(actionId);
    const newExpanded = new Set(expandedActions);
    newExpanded.delete(actionId);
    expandedActions = newExpanded;
  }

  function switchAction(actionId: string) {
    onSwitch?.(actionId);
    toggleExpand(actionId);
  }

  function formatTime(action: WAction): string {
    if (action.elapsed === undefined)
      return '';
    const minutes = Math.floor(action.elapsed / 60);
    const seconds = Math.floor(action.elapsed % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function formatTimestamp(action: WAction): string {
    const date = new Date(action.ts);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function scrollToBottom() {
    if (recapContainer) {
      recapContainer.scrollTop = recapContainer.scrollHeight;
    }
  }

  // auto scroll
  let previousActionCount = 0;
  $effect(() => {
    const currentCount = periods.reduce((sum, period) => sum + period.actions.length, 0);
    if (currentCount > previousActionCount) {
      setTimeout(scrollToBottom, 50);
    }
    previousActionCount = currentCount;
  });
</script>

<div class="recap-wrapper">
  <div class="recap-header">
    <span class="recap-title">Match Recap</span>
    <div class="flexrow">
      <button
        onclick={() => orderMode = 'chrono'}
        class={`sort-btn ${orderMode === 'chrono' ? 'active' : ''}`}
        title="Sort chronologically by input time"
      >
        <Clock size={16} />
      </button>
      <button
        onclick={() => orderMode = 'match'}
        class={`sort-btn ${orderMode === 'match' ? 'active' : ''}`}
        title="Sort by match periods"
      >
        <Settings size={16} />
      </button>
    </div>
  </div>

  <div
    bind:this={recapContainer}
    class="recap-content"
  >
    {#if periods.length === 0 || periods.every(p => p.actions.length === 0)}
      <div class="no-actions">
        No actions recorded yet
      </div>
    {:else}
      {#each periods as period, periodIndex (periodIndex)}
        {#if period.actions.length > 0}
          <div class="period-header">
            {period.title}
          </div>

          {#each period.actions as action (action.id)}
            {@const isExpanded = expandedActions.has(action.id)}
            
            <div class="action-item">
              <div class="flexrow text-standard {getSideClass(action.side)}">
                <span>{formatTime(action)}</span>
                
                {#if action.wrestle}
                  <span> - {action.wrestle.actionTitle}</span>
                  
                  {#if action.wrestle.pt !== 0}
                    <span class={getColorClass(action.side)}>
                      {action.wrestle.pt} pts
                    </span>
                  {/if}
                  
                  {#if action.wrestle.oppPt !== 0}
                    <span class={getColorClass(action.side, true)}>
                      {action.wrestle.oppPt} pts
                    </span>
                  {/if}
                  
                  {#if action.wrestle.dq}
                    <span class="text-dq"> &gt; DISQUALIFIED</span>
                  {/if}
                {/if}
                
                <!-- {#if action.clock}
                  <span> - Clock: {action.clock.event}</span>
                {/if} -->
                
                <button
                  class="icon"
                  onclick={() => toggleExpand(action.id)}
                  title="Edit action"
                >
                  <Settings size={12} />
                </button>
              </div>
              
              <div class="flexrow text-grey {getSideClass(action.side)}">
                {formatTimestamp(action)}
              </div>
            </div>

            {#if isExpanded}
              <div class="action-controls">
                <button
                  onclick={() => switchAction(action.id)}
                  class="control-btn switch"
                >
                  Switch
                </button>
                <button
                  onclick={() => deleteAction(action.id)}
                  class="control-btn delete"
                >
                  Delete
                </button>
                <button
                  onclick={() => toggleExpand(action.id)}
                  class="control-btn cancel"
                >
                  Cancel
                </button>
              </div>
            {/if}
          {/each}
        {/if}
      {/each}
    {/if}
  </div>
</div>

<style>

  /* text */
  .text-standard {
    @apply text-xs;
  }
  .text-grey {
    @apply text-xs text-slate-500;
  }
  .text-dq {
    @apply text-red-600 font-bold;
  }

  .text-points-red {
    @apply bg-red-600 text-white font-bold px-1 rounded-md;
  }
  .text-points-green {
    @apply bg-green-600 text-white font-bold px-1 rounded-md;
  }
  .text-points-blue {
    @apply bg-blue-600 text-white font-bold px-1 rounded-md;
  }

  .flexrow {
    @apply flex items-center gap-1 flex-wrap;
  }

  .recap-wrapper {
    @apply w-full;
  }

  .recap-header {
    @apply flex items-center justify-between mb-3;
  }

  .recap-title {
    @apply text-lg font-semibold;
  }

  .sort-btn {
    @apply px-2 py-1 border rounded bg-gray-100 hover:bg-gray-200 transition-colors;
  }

  .sort-btn.active {
    @apply bg-yellow-300;
  }

  .recap-content {
    @apply h-72 overflow-y-auto pr-2 space-y-2;
    scrollbar-width: thin;
  }

  .no-actions {
    @apply text-center text-gray-500 py-8;
  }

  .period-header {
    @apply text-center font-semibold text-sm bg-gray-100;
  }

  .action-item {
    @apply w-full;
  }

  .action-controls {
    @apply text-center mt-2 space-x-2;
  }

  .control-btn {
    @apply px-3 py-1 rounded text-sm font-medium transition-colors;
  }

  .control-btn.switch {
    @apply bg-blue-500 text-white hover:bg-blue-600;
  }

  .control-btn.delete {
    @apply bg-red-500 text-white hover:bg-red-600;
  }

  .control-btn.cancel {
    @apply bg-gray-500 text-white hover:bg-gray-600;
  }
</style>