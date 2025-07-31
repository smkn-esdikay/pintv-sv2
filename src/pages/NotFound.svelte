<script lang="ts">
  import { navigate } from '../lib/router.svelte';
  import Button from '@/components/_UI/ZonkButton.svelte';
</script>

<div class="page">
  <div class="flex flex-col gap-2">
    <h1>404 - Page Not Found</h1>
    <p>Sorry, the page you're looking for doesn't exist.</p>
    
    <div class="actions">
      <Button 
        color="grey"
        onclick={() => navigate('home')}
      >
        Go Home
      </Button>
    </div>
  </div>
</div>

<style>
</style>