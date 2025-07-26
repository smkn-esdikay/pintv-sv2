<script lang="ts">
  import { initStore } from "@/stores/init.svelte";
  import ZonkButton from "@/components/_UI/ZonkButton.svelte";
  import { navigate } from "@/lib/router.svelte";

  const style = initStore.style;
  const age = initStore.age;
  const periodLengths = initStore.periodLengths;
  const team = initStore.team;
  
  

</script>

<div class="master-grid">
  <div class="card-red">


    <div>

      {style} {age} {team}
    </div>
    <ZonkButton
      color="grey"
      size="md"
      onclick={() => navigate("selector")}
    >
      back
    </ZonkButton>

  </div>
  <div class="card-base">

  </div>
  <div class="card-blue">

  </div>
</div>

<style>
  
  .master-grid {
    @apply 
      w-full min-h-screen
      grid grid-flow-col gap-4
      p-2
    ;
  }

  .page > * {
    @apply w-1/3;
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
