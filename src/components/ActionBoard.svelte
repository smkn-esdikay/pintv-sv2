<script lang="ts">
  import type { WAction, WPeriod, WPos, WSide, WStyle } from "@/types";
  import { 
    cnsActions, 
    type ActionEntry, 
    type ActionPoint 
  } from "@/constants/wrestling.constants";
  import { generateId } from "@/lib/math";
    import { co } from "@/lib/console";

  interface Props {
    side: WSide;
    pos: WPos,
    style: WStyle;
    periods: WPeriod[];
    onClick: (action: WAction) => void;
  }

  let {
    side,
    pos,
    style,
    periods,
    onClick,
  }: Props = $props();

  type CalculatedActionEntry = ActionEntry & {
    currentOppPoints?: ActionPoint;
  };

  let allSideActions = $derived(
    periods
     .flatMap(p => p.actions)
     .filter(a => a.wrestle?.side === side && !!a.wrestle)
  );

  let actionCountMap = $derived(() => {
    const countMap = new Map<string, number>();
    
    allSideActions.forEach(action => {
      if (action.wrestle?.action) {
        const currentCount = countMap.get(action.wrestle.action) || 0;
        countMap.set(action.wrestle.action, currentCount + 1);
      }
    });
    
    return countMap;
  });

  const goodActions: ActionEntry[] = $derived(
    cnsActions[style].filter(a => !a.oppPoints && (!a.show || a.show === pos))
  );
  
  const badActions: CalculatedActionEntry[] = $derived(
    cnsActions[style]
      .filter(a => !!a.oppPoints)
      .map(a => {
        const actionCount = actionCountMap().get(a.code) || 0;
        
        let currentOppPoints: ActionPoint;
        if (!a.oppPoints) {
          currentOppPoints = 0;
        } else {
          if (actionCount < a.oppPoints.length) {
            currentOppPoints = a.oppPoints[actionCount];
          } else {
            currentOppPoints = a.oppPoints[a.oppPoints.length - 1];
          }
        }
                
        return {
          ...a,
          currentOppPoints,
        };
      })
  );

  const handleActionClick = (code: string) => {

    const actn = {
      id: generateId(),
      wrestle: {
        side,
        action: code,
        actionTitle: '',
        clean: true,
        pt: 0,
        oppPt: 0,
        dq: false,
      },
      ts: Date.now(),
    } as WAction;

    onClick(actn);
  };

</script>

<div>
  <div class="flex flex-row gap-1 items-center justify-start mb-1">
    {#each goodActions as action (action.code)}
      <button
        class=""
        onclick={() => handleActionClick(action.code)}
      >
        {action.title}
        {#if action.points && action.points.length > 0}
          <span class="text-xs">{action.points[0]}</span>
        {/if}
      </button>
    {/each}
  </div>
  <div class="grid grid-cols-2 gap-1">
    {#each badActions as action (action.code)}
      <button
        class=""
        onclick={() => handleActionClick(action.code)}
      >
        {action.title}
        {#if action.currentOppPoints}
          {#if action.currentOppPoints !== "dq"}
            <span class="text-xs">-{action.currentOppPoints}</span>
          {:else}
            <span class="text-xs">{action.currentOppPoints}</span>
          {/if}
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  button {
    @apply 
      w-full py-[0.375rem]
      border-white/65 border-[0.5px]
      bg-white/10 
      text-white font-bold
    ;
  }
</style>