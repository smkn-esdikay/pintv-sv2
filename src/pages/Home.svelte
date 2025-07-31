<script lang="ts">
  import { navigate } from '../lib/router.svelte';
  import Button from '@/components/_UI/ZonkButton.svelte';
</script>

<div class="page">
  
  <div class="flex flex-row gap-4 items-center">
    <Button 
      size="lg"
      color="green"
      onclick={() => navigate('selector')}
    >
      Wrestling Start
    </Button>
    <Button 
      size="lg"
      color="grey"
      onclick={() => navigate('nonexistent')}
    >
      Test 404 Page
    </Button>
  </div>
</div>

<style>
</style>
