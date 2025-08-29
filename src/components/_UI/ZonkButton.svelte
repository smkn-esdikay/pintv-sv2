<script lang="ts">
  interface Props {
    color?: 'green' | 'blue' | 'red' | 'grey' | 'dev';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    className?: string;
    onclick?: (event: MouseEvent) => void;
    type?: 'button' | 'submit' | 'reset';
    children?: import('svelte').Snippet;
  }

  let {
    color = 'grey',
    size = 'md',
    disabled = false,
    className = '',
    onclick,
    type = 'button',
    children
  }: Props = $props();

  const buttonClasses = $derived(
    `base ${color} ${size} ${className}`.trim()
  );

  function handleClick(event: MouseEvent) {
    if (!disabled && onclick) {
      onclick(event);
    }
  }
</script>

<button
  {type}
  {disabled}
  class={buttonClasses}
  onclick={handleClick}
>
  {@render children?.()}
</button>


<style>
  .base {
    @apply flex items-center justify-center
			h-8 
			pl-4 pr-4
			rounded-md
			text-nowrap text-sm font-normal 
			hover:opacity-80
      disabled:cursor-not-allowed
      disabled:bg-slate-200
      disabled:text-slate-600
    ;
  }

  /* colors */
  .green {
    @apply base text-white bg-green-600;
  }
  .blue {
    @apply base text-white bg-blue-600;
  }
  .red {
    @apply base text-white bg-red-600;
  }
  .grey {
    @apply base text-white bg-slate-500;
  }
  .dev {
    @apply base text-white bg-orange-500;
  }


  /* size */
  .sm {
    @apply h-6 px-3 text-xs;
  }
  .md {
    @apply h-7 px-4 text-sm;
  }
  .lg {
    @apply h-8 px-5 text-base font-semibold;
  }

</style>