<script lang="ts">
  import { navigate } from '../lib/router.svelte';
  import { initStore } from "@/stores/init.svelte";
  import type { WAge, WConfig, WStyle } from "@/types";
  import ZonkDropdown from "@/components/_UI/ZonkDropdown.svelte";
  import ZonkButton from "@/components/_UI/ZonkButton.svelte";

  let selectedType = $state(1);
  let selectedTime = $state(1);
  let selectedTeam = $state(1);

  const wrestlingTypeOptions = [
    { value: 1, label: "Folkstyle Highschool" }, //  120, 90, 60
    { value: 2, label: "Folkstyle College" }, // 180+120 (no choice)
    { value: 3, label: "Greco" }, //  120, 90, 60
    { value: 4, label: "Freestyle" }, //  120, 90, 60
  ];

  const timeOptions = [
    { value: 1, label: "2:00", seconds: 120 },
    { value: 2, label: "1:30", seconds: 90 },
    { value: 3, label: "1:00", seconds: 60 },
  ];

  const teamOptions = [
    { value: 1, label: "Individual" },
    { value: 2, label: "Team" },
  ];

  const sec = $derived((): number => {
    const idx = timeOptions.findIndex((el) => el.value === selectedTime);
    return timeOptions[idx].seconds;
  });

  const showSelectTime = $derived(selectedType !== 2);
  const canSubmit = $derived(!!selectedType && !!selectedTime);

  const initAndStart = () => {

    let style: WStyle, age: WAge = undefined, periodLengths: number[];

    switch (selectedType) {
      case 1:
        style = "Folkstyle";
        age = "Highschool";
        periodLengths = [sec(), sec(), sec()];
        break;
      case 2:
        style = "Folkstyle";
        age = "College";
        periodLengths = [180, 120, 120];
        break;
      case 3:
        style = "Greco";
        periodLengths = [sec(), sec()];
        break;
      case 4:
        style = "Freestyle";
        periodLengths = [sec(), sec()];
        break;
      default:
        style = "Folkstyle";
        age = "Highschool";
        periodLengths = [sec(), sec(), sec()];
    }

    initStore.setAll({
      style,
      age,
      periodLengths,
      team: selectedTeam === 2
    } as WConfig)

    navigate("wrestling");
  };
</script>

<div class="page">
  <div class="control-container">
    <div class="polar-col">
      <div
        id="dropdowns"
        class="flex flex-col gap-6 justify-start items-center"
      >
        <h2>Wrestling Options</h2>

        <div>
          <div class="text-center">Wrestling Style</div>
          <ZonkDropdown
            bind:value={selectedType}
            options={wrestlingTypeOptions}
          />
        </div>

        <div>
          <div class="text-center">Team</div>
          <ZonkDropdown bind:value={selectedTeam} options={teamOptions} />
        </div>

        <div>
          <div class="text-center">Periods</div>
          {#if !!showSelectTime}
            <ZonkDropdown bind:value={selectedTime} options={timeOptions} />
          {:else}
            <div>2:00, 1:00, 1:00</div>
          {/if}
        </div>
      </div>
      <div id="button" class="flex justify-center">
        <ZonkButton
          disabled={!canSubmit}
          color="grey"
          size="md"
          onclick={initAndStart}
        >
          Start
        </ZonkButton>
      </div>
    </div>
  </div>
</div>

<style>
  .page {
    @apply w-full min-h-[99.5vh] 
      flex items-center justify-center 
      border-red-700 border-2;
  }

  .control-container {
    @apply w-[60vw] h-[40vh] 
      p-4
      border-2 border-slate-300;
  }

  .polar-col {
    @apply flex flex-col justify-between h-full;
  }
</style>
