<script lang="ts">
  import type { WPeriod, WAction, WStyle, SideColor, WSide } from '@/types';
  import { Clock, Settings } from '@lucide/svelte';

  interface Props {
    periods: WPeriod[];
    colorLeft: SideColor;
    colorRight: SideColor;
    onSwitch?: (periodIndex: number, actionIndex: number) => void;
    onDelete?: (periodIndex: number, actionIndex: number) => void;
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

  // Track expanded state for actions
  let expandedActions = $state<Set<string>>(new Set());


  function getColorClass(side: WSide, opp: boolean = false): string {
    let color; 
    if (!opp)
      color = side === "l" ? colorLeft : colorRight;
    else
      color = side === "r" ? colorLeft : colorRight;

    if (color === "blue")
      return "c-f-blue";
    else if (color === "green")
      return "c-f-green";
    return "c-f-red";
  }


  function getActionKey(periodIndex: number, actionIndex: number): string {
    return `${periodIndex}-${actionIndex}`;
  }

  function toggleExpand(periodIndex: number, actionIndex: number) {
    const key = getActionKey(periodIndex, actionIndex);
    const newExpanded = new Set(expandedActions);
    
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    
    expandedActions = newExpanded;
  }

  function deleteAction(periodIndex: number, actionIndex: number) {
    onDelete?.(periodIndex, actionIndex);
    const key = getActionKey(periodIndex, actionIndex);
    const newExpanded = new Set(expandedActions);
    newExpanded.delete(key);
    expandedActions = newExpanded;
  }

  function switchAction(periodIndex: number, actionIndex: number) {
    onSwitch?.(periodIndex, actionIndex);
    toggleExpand(periodIndex, actionIndex);
  }

  function formatTime(action: WAction): string {
    if (!action.elapsed)
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

  // Auto-scroll when new actions are added
  let previousActionCount = 0;
  $effect(() => {
    const currentCount = periods.reduce((sum, period) => sum + period.actions.length, 0);
    if (currentCount > previousActionCount) {
      setTimeout(scrollToBottom, 50);
    }
    previousActionCount = currentCount;
  });
</script>

<div class="recap-card">
  <div class="recap-header">
    <span class="recap-title">Match Recap</span>
    <div class="sort-buttons">
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

          {#each period.actions as action, actionIndex (action.ts)}
            {@const actionKey = getActionKey(periodIndex, actionIndex)}
            {@const isExpanded = expandedActions.has(actionKey)}
            
            <div class="action-item">
              <div class="action-main">
                <span>{formatTime(action)}</span>
                
                {#if action.wrestle}
                  <span> - {action.wrestle.actionTitle}</span>
                  
                  {#if action.wrestle.pt !== 0}
                    <span class={getColorClass(action.side)}>
                      ({Math.abs(action.wrestle.pt)} pts)
                    </span>
                  {/if}
                  
                  {#if action.wrestle.oppPt !== 0}
                    <span class={getColorClass(action.side, true)}>
                      ({Math.abs(action.wrestle.oppPt)} pts)
                    </span>
                  {/if}
                  
                  {#if action.wrestle.dq}
                    <span class="dq-text"> &gt; DISQUALIFIED</span>
                  {/if}
                {/if}
                
                <!-- {#if action.clock}
                  <span> - Clock: {action.clock.event}</span>
                {/if} -->
                
                <button
                  onclick={() => toggleExpand(periodIndex, actionIndex)}
                  class="expand-btn"
                  title="Edit action"
                >
                  <Settings size={12} />
                </button>
              </div>
              
              <div class="timestamp">
                {formatTimestamp(action)}
              </div>
            </div>

            {#if isExpanded}
              <div class="action-controls">
                <button
                  onclick={() => switchAction(periodIndex, actionIndex)}
                  class="control-btn switch"
                >
                  Switch
                </button>
                <button
                  onclick={() => deleteAction(periodIndex, actionIndex)}
                  class="control-btn delete"
                >
                  Delete
                </button>
                <button
                  onclick={() => toggleExpand(periodIndex, actionIndex)}
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
  .recap-card {
    @apply w-full;
  }

  .recap-header {
    @apply flex items-center justify-between mb-3;
  }

  .recap-title {
    @apply text-lg font-semibold;
  }

  .sort-buttons {
    @apply flex gap-1;
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
    @apply text-center font-semibold text-sm bg-gray-100 py-2 rounded mb-2;
  }

  .action-item {
    @apply text-xs;
  }

  .action-main {
    @apply flex items-center gap-1 flex-wrap;
  }

  .timestamp {
    @apply text-gray-500 mt-1;
  }

  .expand-btn {
    @apply ml-1 text-gray-500 hover:text-gray-700 p-1 rounded;
  }

  .dq-text {
    @apply text-red-600 font-bold;
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