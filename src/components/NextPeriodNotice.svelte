<script lang="ts">
  import Button from "./_UI/ZonkButton.svelte";

  interface Props {
    onGoNext: () => void;
  }

  let {
    onGoNext
  }: Props = $props();

  const handleClick = () => {
    onGoNext();
  }

</script>

<div class="w-full bg-yellow-300 p-2 text-center">
  <h2>Period has ended.</h2>
  <Button onclick={handleClick}>Next</Button>
</div>