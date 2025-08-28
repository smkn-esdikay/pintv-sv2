<script lang="ts">
  import { navigate } from '../lib/router.svelte';
  import { initStore } from "@/stores/init.svelte";
  import ZonkDropdown from "@/components/_UI/ZonkDropdown.svelte";
  import ZonkButton from "@/components/_UI/ZonkButton.svelte";
  import { cnsStyles, cnsClocks } from '@/constants/wrestling.constants';
  import { formatSecondsArray } from '@/lib/math';
  import type { WAge, WConfig, WStyle } from "@/types";

  let selectedStyle: WStyle = $state("Folkstyle");
  let selectedAge: Omit<WAge, 'undefined'> = $state("College");
  let selectedTime: number = $state(120);
  let selectedTeam: boolean = $state(false);


  const wrestlingTypeOptions: { label: WStyle, value: WStyle}[] = cnsStyles.
    map(st => ({ label: st.style, value: st.style }));

  const ageOptions: { label: WAge, value: WAge }[] | undefined = $derived(
    cnsStyles.
      find(el => el.style === selectedStyle)?.
      ages?.
      map(age => ({ label: age, value: age }))
  );

  const timeOptions = [
    { value: 120, label: "2:00" },
    { value: 90, label: "1:30" },
    { value: 60, label: "1:00" },
  ];

  const teamOptions = [
    { value: false, label: "Individual" },
    { value: true, label: "Team" },
  ];

  const folkstyleCollegeTimes: number[] = [];
  const fcIdx = cnsClocks.findIndex(c => c.style === "Folkstyle" && c.age === "College");
  if (fcIdx > -1) {
    folkstyleCollegeTimes.push(cnsClocks[fcIdx].timers.p1);
    folkstyleCollegeTimes.push(cnsClocks[fcIdx].timers.p2);
    folkstyleCollegeTimes.push(cnsClocks[fcIdx].timers.p3 as number);
  }

  const showSelectTime = $derived(
    selectedStyle !== "Folkstyle" || selectedAge !== "College"
  );
  const canSubmit = $derived(!!selectedStyle && !!selectedTime);

  const initAndStart = () => {

    let periodLengths: number[];
    let age: WAge = selectedAge as WAge;

    if (selectedStyle === "Freestyle" || selectedStyle === "Greco") {
      periodLengths = [selectedTime, selectedTime];
      age = undefined;
    } else { // Folkstyle
      if (selectedAge === "Highscool") {
        periodLengths = [selectedTime, selectedTime, selectedTime];
      } else { // College
        periodLengths = folkstyleCollegeTimes;
      }
    }

    initStore.setAll({
      style: selectedStyle,
      age: selectedAge,
      periodLengths,
      team: selectedTeam,
    } as WConfig)

    navigate("wrestling");
  };
</script>

<div class="page">
  <div class="control-container">
    <div class="polar-col">
      <div
        id="dropdowns"
        class="flex flex-col items-center gap-6"
      >
        <div id="title">
          <h3>Wrestling Options</h3>
        </div>

        <div id="dropdowns" class="grid grid-cols-2 gap-y-2 items-center w-full">
          <div class="text-center">Wrestling Style</div>
          <ZonkDropdown
            bind:value={selectedStyle}
            options={wrestlingTypeOptions}
          />

          {#if !!ageOptions && ageOptions.length > 0}
            <div class="text-center">Age Group</div>
            <ZonkDropdown
              bind:value={selectedAge as string}
              options={ageOptions as {label: string, value: string}[]}
            />
          {/if}

          <div class="text-center">Team</div>
          <ZonkDropdown bind:value={selectedTeam} options={teamOptions} />

          <div class="text-center">Periods</div>
          {#if !!showSelectTime}
            <ZonkDropdown bind:value={selectedTime} options={timeOptions} />
          {:else}
            <div>{formatSecondsArray(folkstyleCollegeTimes)}</div>
          {/if}
        </div>
      </div>

      <div id="button" class="flex justify-center">
        <ZonkButton
          disabled={!canSubmit}
          color="green"
          size="lg"
          onclick={initAndStart}
        >
          Start
        </ZonkButton>
      </div>
    </div>
  </div>
</div>

<style>
  .control-container {
    @apply w-[70vw] min-h-[40vh];
  }

  .polar-col {
    @apply flex flex-col justify-between h-full gap-6;
  }
</style>
