<script lang="ts">
  import type { WPos, WSide } from '@/types';
  import { ChevronsLeft, ChevronsRight, } from "@lucide/svelte";

  interface Props {
    side: WSide;
    onSelected: (pos: WPos) => void;
    onDefer: () => void;
  }

  let {
    side,
    onSelected,
    onDefer,
  }: Props = $props();

  const handlePositionClick = (pos: WPos) => {
    onSelected(pos);
  }
  const handleDeferClick = () => {
    onDefer();
  }

</script>

<div class="w-full mb-4">
  <div class="grid grid-cols-3 gap-x-2">
    <button
      onclick={() => handlePositionClick("t")}
    >
      Top
    </button>
    <button
      onclick={() => handlePositionClick("n")}
    >
      Neutral
    </button>
    <button
      onclick={() => handlePositionClick("b")}
    >
      Bottom
    </button>
  </div>
  <div class="mt-2">
    <button
      onclick={() => handleDeferClick()}
    >
      <div class="flex flex-row gap-2 items-center justify-center">
        {#if side === "r"}
        <ChevronsLeft size={16} />
        {/if}
        <div>Defer</div>
        {#if side === "l"}
        <ChevronsRight size={16} />
        {/if}
      </div>
    </button>
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