<script lang="ts">
  import { getCurrentRoute } from './lib/router.svelte';
  // import Home from './pages/Home.svelte';
  import Selector from './pages/Selector.svelte';
  import Wrestling from './pages/Wrestling.svelte';
  import ScoreboardDisplay from './pages/ScoreboardDisplay.svelte';
  import NotFound from './pages/NotFound.svelte';
  
  let currentRoute: string = $derived(getCurrentRoute());
</script>

<main>
  <div class="min-h-screen">
    {#if currentRoute === 'home'}
      <Selector />
    {:else if currentRoute === 'selector'}
      <Selector />
    {:else if currentRoute === 'wrestling'}
      <Wrestling />
    {:else if currentRoute === 'scoreboard-display'}
      <ScoreboardDisplay />
    {:else}
      <NotFound />
    {/if}
  </div>
</main>

<style>  
  main {
    width: 100%;
    margin: 0;
    padding: 0;
  }
</style>