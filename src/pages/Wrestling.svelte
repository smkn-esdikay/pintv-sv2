<script lang="ts">
  import { navigate } from "@/lib/router.svelte";
  import { initStore } from "@/stores/init.svelte";
  import { WrestlingManager } from "@/lib/WrestlingManager.svelte";

  import Position from '@/components/Position.svelte';
  import Color from "@/components/Color.svelte";
  import ZonkButton from "@/components/_UI/ZonkButton.svelte";
    import type { SideColor, WPos, WSide } from "@/types";

  const config = initStore.config;
  const manager = WrestlingManager.getInstance();
  manager.initializeMatch(config);
  
  // Get reactive state from manager
  let current = $derived(manager.current);
  
  function handlePositionChange(side: WSide, newPosition: WPos) {
    manager.setPosition(side, newPosition);
  }

  function handleColorChange(side: WSide, newColor: SideColor) {
    manager.setColor(side, newColor);
  }

</script>

<div class="master-grid">
  <!-- LEFT -->
  <div class={`card-${current.l.color}`}>

    <div class="flex flex-row gap-4 items-center">
      <Position 
        bind:selected={current.l.pos}
        onSelected={(pos) => handlePositionChange('l', pos)}
      />
      <Color 
        bind:selected={current.l.color}
        onSelected={(color) => handleColorChange('l', color)}
      />
    </div>

    <div>
      <ZonkButton
        color="grey"
        size="md"
        onclick={() => navigate("selector")}
      >
        back
      </ZonkButton>
    </div>

  </div>
  <!-- CENTER -->
  <div class="card-base">

  </div>
  <!-- RIGHT -->
  <div class={`card-${current.r.color}`}>

    <div class="flex flex-row gap-4 items-center">
      <Position 
        bind:selected={current.r.pos}
        onSelected={(pos) => handlePositionChange('r', pos)}
      />
      <Color 
        bind:selected={current.r.color}
        onSelected={(color) => handleColorChange('r', color)}
      />
    </div>

  </div>
</div>

<style>
  
  .master-grid {
    @apply 
      w-full min-h-screen
      grid grid-cols-3 gap-4
      p-2
    ;
  }

  .card-base {
    @apply flex flex-col w-full
    sm:p-2 p-1 
    rounded-xl
    border-[0.6px] border-slate-500
    shadow-[0px_2px_8px_0px_rgba(0,0,0,0.05)];
  }

  .card-red {
    @apply card-base 
    bg-red-600/80;
  }

  .card-green {
    @apply card-base 
    bg-green-600/80;
  }

  .card-blue {
    @apply card-base 
    bg-blue-600/80;
  }

</style>
