<script lang="ts">
  import { navigate } from '../lib/router.svelte';
  import { ZonkClock } from '@/lib/ZonkClock';
  import TimeDisplay from '@/components/TimeDisplay.svelte';
  import TimeControls from '@/components/TimeControls.svelte';

  let clock = new ZonkClock(120000); 

  function handleTimeEdit(newTimeMs: number) {
    // Create new clock with new time
    clock.destroy();
    clock = new ZonkClock(newTimeMs);
  }

</script>

<div class="page">
  <h1>Welcome Home</h1>
  <p>This is the home page of your Svelte app.</p>
  
  <div class="actions">

    <p>
      <TimeDisplay 
        id="test"
        {clock} 
        allowEditing={true}
        showElapsed={true}
        onTimeEdit={handleTimeEdit}
      />
      <TimeControls {clock} />
    </p>


    <button onclick={() => navigate('selector')}>
      Selector
    </button>
    <button onclick={() => navigate('nonexistent')}>
      Test 404 Page
    </button>
  </div>
</div>

<style>
  .page {
    padding: 2rem;
    max-width: 600px;
    margin: 0 auto;
  }
  
  .actions {
    margin-top: 2rem;
  }
  
  button {
    background: #ff3e00;
    color: white;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }
  
  button:hover {
    background: #e8380e;
  }
</style>