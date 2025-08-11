<script lang="ts">
  import type { WAction, WPeriod, WPos, WSide, WStyle } from "@/types";
  import { 
    cnsActions, 
    type ActionEntry, 
    type ActionPoint 
  } from "@/constants/wrestling.constants";
    import { generateId } from "@/lib/math";

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
    actionCount?: number;
    currentOppPoints?: ActionPoint;
  };

  const allSideActions = $derived(
    periods
     .flatMap(p => p.actions)
     .filter(a => a.side === side && !!a.wrestle)
  );

  $inspect("all side actions", side, allSideActions)

  const goodActions: ActionEntry[] = $derived(
    cnsActions[style].filter(a => {
      return !a.oppPoints && (!a.show || a.show === pos);
    })
  );
  const badActions: CalculatedActionEntry[] = $derived(

    cnsActions[style]
      .filter(a => {
        return !!a.oppPoints;
      }).map(a => {

        // add calculations based on count for this action
        const actionCount = allSideActions.reduce((acc, allAction) => {
          if (allAction.wrestle?.action === a.code) 
            return acc + 1;
          return acc;
        }, 0);
        let currentOppPoints: ActionPoint;
        if (!a.oppPoints) {
          currentOppPoints = 0;
        } else {
          if (actionCount <= a.oppPoints.length) {
            currentOppPoints = a.oppPoints[actionCount];
          } else {
            currentOppPoints = a.oppPoints[a.oppPoints.length - 1];
          }
        }
        return {
          ...a,
          actionCount,
          currentOppPoints,
        };
      }) // end .map
  );

  const actionTitleMap = $derived(() => {
    const map = new Map<string, CalculatedActionEntry>();
    cnsActions[style].forEach(action => {
      map.set(action.code, action);
    });
    return map;
  });

  const handleActionClick = (code: string) => {
    
    let actionTitle: string = '', 
      pt: ActionPoint = 0, 
      oppPt: ActionPoint = 0, 
      actionCount: number = 0;

    const selectedAction = actionTitleMap().get(code);
    if (!!selectedAction) {
      actionTitle = selectedAction.title;
      pt = selectedAction.points?.[0] || 0;
      oppPt = selectedAction.currentOppPoints || 0;
      actionCount = selectedAction.actionCount || 0;
    }

    const actn = {
      id: generateId(),
      side,
      wrestle: {
        action: code,
        actionTitle,
        clean: true,
        pt: 0,
        oppPt: 0,
        dq: false,
      },
      ts: Date.now(),
    } as WAction;

    console.log('action button clicked', side, code, actionCount);

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