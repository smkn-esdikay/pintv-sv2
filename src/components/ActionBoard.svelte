<script lang="ts">
  import type { WAction, WPeriod, WPos, WSide, WStyle } from "@/types";
  import { cnsActions, type ActionEntry } from "@/constants/wrestling.constants";

  interface Props {
    side: WSide;
    pos: WPos,
    style: WStyle;
    periods: WPeriod[];
    onClick: (side: WSide, action: WAction) => void;
  }

  let {
    side,
    pos,
    style,
    periods,
    onClick,
  }: Props = $props();

  const goodActions: ActionEntry[] = $derived(
    cnsActions[style].filter(a => {
      return !a.oppPoints && (!a.show || a.show === pos);
    })
  );
  const badActions: ActionEntry[] = $derived(
    cnsActions[style].filter(a => {
      return !!a.oppPoints;
    })
  );

  const handleActionClick = (code: string) => {
    console.log('action button clicked', side, code);
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