<script lang="ts">
  import { navigate } from '../lib/router.svelte';
</script>

<div class="page">
  <h1>404 - Page Not Found</h1>
  <p>Sorry, the page you're looking for doesn't exist.</p>
  
  <div class="actions">
    <button onclick={() => navigate('home')}>
      Go Home
    </button>
  </div>
</div>

<style>
  .page {
    padding: 2rem;
    max-width: 600px;
    margin: 0 auto;
    text-align: center;
  }
  
  h1 {
    color: #ff6b6b;
    margin-bottom: 1rem;
  }
  
  .actions {
    margin-top: 2rem;
  }
  
  button {
    background: #646cff;
    color: white;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }
  
  button:hover {
    background: #535bf2;
  }
</style>