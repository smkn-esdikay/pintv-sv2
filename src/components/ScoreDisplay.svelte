<script lang="ts">
    import { generateId } from "@/lib/math";
  import type { WAction, WSide } from "@/types";
  import { PlusCircle, MinusCircle } from "@lucide/svelte";


  interface Props {
    side: WSide;
    score: number;
    onClick: (action: WAction) => void;
  }

  let {
    side,
    score,
    onClick,
  }: Props = $props();

  let flexStyle = $derived(side === "r" ? " flex-row" : "flex-row-reverse");

  const buildAction = (delta: number): WAction => {
    const action = {
      id: generateId(),
      wrestle: {
        side,
        action: "manual",
        actionTitle: "Manual",
        clean: true,
        pt: delta,
        oppPt: 0,
        dq: false,
      },
      ts: Date.now(),
    } as WAction;
    return action;
  }

  const handleClick = (delta: number) => {
    const action = buildAction(delta);
    onClick(action);
  }

</script>

<div class="flex {flexStyle} items-center gap-2">
  <div class="score">{score}</div>
  <div class="flex flex-col items-center justify-center">
    <button class="icon" onclick={() => handleClick(1)}>
      <PlusCircle />
    </button>
    <button class="icon" onclick={() => handleClick(-1)}>
      <MinusCircle />
    </button>
  </div>
</div>

<style>
  div.score {
    @apply text-[3rem] font-extrabold;
    line-height: 1em;
  }
</style>