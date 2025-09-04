<script lang="ts">
  import type { SideColor, WAthlete, WNameUpdate, WTeam } from "@/types";
  import ZonkModal from "./_UI/ZonkModal.svelte";
  import ZonkInput from "./_UI/ZonkInput.svelte";
  import Button from "./_UI/ZonkButton.svelte";

  interface Props {
    open: boolean;
    leftAthlete: WAthlete;
    rightAthlete: WAthlete;
    leftTeam: WTeam;
    rightTeam: WTeam;
    leftColor: SideColor;
    rightColor: SideColor;
    onsave: (updateDate: WNameUpdate) => void;
    oncancel: () => void;
  }

  let {
    open = $bindable(),
    leftAthlete,
    rightAthlete,
    leftTeam,
    rightTeam,
    leftColor,
    rightColor,
    onsave,
    oncancel,
  }: Props = $props();

  const handleClose = () => {
    open = false;
    oncancel();
  };
  const handleSave = () => {
    onsave({
      leftAthlete,
      rightAthlete,
      leftTeam,
      rightTeam,
    });
  };

</script>

<ZonkModal
  bind:open
  size="xl"
  onclose={handleClose}
  closeOnBackdrop={true}
  closeOnEscape={true}
>
  <h1>Edit Athlete Names and Team Names</h1>
  <div class="mt-4 w-full h-full grid grid-cols-2 gap-2 text-white">
    <div class={`side-${leftColor}`}>
      <h3>Athlete Name</h3>
      <div class="flex flex-row gap-2">
        <ZonkInput 
          value={leftAthlete.firstName}
        />
        <ZonkInput 
          value={leftAthlete.lastName}
        />
      </div>
      <h3 class="mt-4">Team Name</h3>
      <div class="flex flex-row gap-2">
        <ZonkInput 
          value={leftTeam.name}
        />
        <ZonkInput 
          value={leftTeam.abbreviation}
        />
      </div>
    </div>
    <div class={`side-${rightColor}`}>
      <h3>Athlete Name</h3>
      <div class="flex flex-row gap-2">
        <ZonkInput 
          value={rightAthlete.firstName}
        />
        <ZonkInput 
          value={rightAthlete.lastName}
        />
      </div>
      <h3 class="mt-4">Team Name</h3>
      <div class="flex flex-row gap-2">
        <ZonkInput 
          value={rightTeam.name}
        />
        <ZonkInput 
          value={rightTeam.abbreviation}
        />
      </div>
    </div>
  </div>
  <div class="w-full mt-4 p-2 flex flex-row gap-4 justify-center">
    <Button 
      color="grey"
      size="lg"
      onclick={handleSave}
    >
      Save
    </Button>
    <Button 
      color="grey"
      size="lg"
      onclick={handleClose}
    >
      Cancel
    </Button>

  </div>
</ZonkModal>

<style>
  .side-red {
    @apply bg-red-600/80 p-2;
  }

  .side-green {
    @apply bg-green-600/80 p-2;
  }

  .side-blue {
    @apply bg-blue-600/80 p-2;
  }

</style>
