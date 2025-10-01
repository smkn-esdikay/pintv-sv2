<script lang="ts">
  import { ActionBuilder } from "@/lib/ActionBuilder";
  import { co } from "@/lib/console";
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

  const handleClick = (delta: number) => {
    const action = ActionBuilder.buildSystemAction("man_match", side, delta);
    if (action) {
      onClick(action);
    } else {
      co.warn("ScoreDisplay: handleClick: action not found");
    }
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