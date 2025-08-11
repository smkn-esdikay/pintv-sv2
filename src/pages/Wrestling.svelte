<script lang="ts">
  import { navigate } from "@/lib/router.svelte";
  import { initStore } from "@/stores/init.svelte";
  import { WrestlingManager } from "@/lib/WrestlingManager.svelte";
  import { KeyboardHandler } from "@/lib/KeyboardHandler";
  import type { SideColor, WPos, WSide } from "@/types";

  import Position from '@/components/Position.svelte';
  import Color from "@/components/Color.svelte";
  import TimeDisplay from '@/components/TimeDisplay.svelte';
  import TimeControls from '@/components/TimeControls.svelte';
  import ActionBoard from "@/components/ActionBoard.svelte";
  import Recap from "@/components/Recap.svelte";

  import Button from "@/components/_UI/ZonkButton.svelte";
  import Modal from "@/components/_UI/ZonkModal.svelte";

  const config = initStore.config;
  const manager = WrestlingManager.getInstance();
  manager.initializeMatch(config);
  let current = $derived(manager.current);

  let keyboardHandler: KeyboardHandler;
  let showResetConfirm = $state(false);

  $effect(() => {
    keyboardHandler = new KeyboardHandler({
      onLeft: () => { manager.setPosition('l', 't'); },
      onDown: () => { manager.setPosition('l', 'n'); },
      onRight: () => { manager.setPosition('r', 't'); },
      onSpace: () => {
        const clockRunning = current.clocks.mc.isRunning;
        let isRunning = false;
        clockRunning.subscribe(val => isRunning = val)();
        if (isRunning) 
          manager.stopClock('mc');
        else 
          manager.startClock('mc');
      }
    });
    keyboardHandler.start();

    return () => { // cleanup
      keyboardHandler?.destroy();
    };
  });

</script>

<div class="master-grid">
  <!-- LEFT -->
  <div class={`card-${current.l.color}`}>

    <div class="flex flex-row gap-4 items-center mb-2">
      <Position 
        bind:selected={current.l.pos}
        onSelected={(pos) => manager.setPosition('l', pos)}
      />
      <Color 
        bind:selected={current.l.color}
        onSelected={(color) => manager.setColor('l', color)}
      />
    </div>

    <div class="mb-4">
      <ActionBoard 
        side='l'
        pos={current.l.pos}
        style={current.config.style}
        periods={current.periods}
        onClick={(actn) => { manager.processAction(actn) }}
      />
    </div>

    <div class="flex flex-col gap-1 mb-4" id="left_sideclocks">
      {#if current.l.clocks.blood}
      <div class="side-clock-container">
        <span>Blood</span>
        <TimeDisplay 
          id='l_blood'
          size="md"
          clock={current.l.clocks.blood}
          allowEditing={true}
          onTimeEdit={(newTimeMs) => manager.setClockTime('l_blood', newTimeMs)}
          className="bg-white"
        />
        <TimeControls 
          size="md"
          clock={current.l.clocks.blood}
          canReset={false}
          onClockUpdate={(eventName) => {
            if (eventName === 'start') manager.startClock('l_blood');
            else if (eventName === 'stop') manager.stopClock('l_blood');
          }}
        />
      </div>
      {/if}
      {#if current.l.clocks.injury}
      <div class="side-clock-container">
        <span>Injury</span>
        <TimeDisplay 
          id='l_injury'
          size="md"
          clock={current.l.clocks.injury}
          allowEditing={true}
          onTimeEdit={(newTimeMs) => manager.setClockTime('l_injury', newTimeMs)}
          className="bg-white"
        />
        <TimeControls 
          size="md"
          clock={current.l.clocks.injury}
          canReset={false}
          onClockUpdate={(eventName) => {
            if (eventName === 'start') manager.startClock('l_injury');
            else if (eventName === 'stop') manager.stopClock('l_injury');
          }}
        />
      </div>
      {/if}
      {#if current.l.clocks.recovery}
      <div class="side-clock-container">
        <span>Recovery</span>
        <TimeDisplay 
          id='l_recovery'
          size="md"
          clock={current.l.clocks.recovery}
          allowEditing={true}
          onTimeEdit={(newTimeMs) => manager.setClockTime('l_recovery', newTimeMs)}
          className="bg-white"
        />
        <TimeControls 
          size="md"
          clock={current.l.clocks.recovery}
          canReset={false}
          onClockUpdate={(eventName) => {
            if (eventName === 'start') manager.startClock('l_recovery');
            else if (eventName === 'stop') manager.stopClock('l_recovery');
          }}
        />
      </div>
      {/if}
      {#if current.l.clocks.headneck}
      <div class="side-clock-container">
        <span>Head/Neck</span>
        <TimeDisplay 
          id='l_headneck'
          size="md"
          clock={current.l.clocks.headneck}
          allowEditing={true}
          onTimeEdit={(newTimeMs) => manager.setClockTime('l_headneck', newTimeMs)}
          className="bg-white"
        />
        <TimeControls 
          size="md"
          clock={current.l.clocks.headneck}
          canReset={false}
          onClockUpdate={(eventName) => {
            if (eventName === 'start') manager.startClock('l_headneck');
            else if (eventName === 'stop') manager.stopClock('l_headneck');
          }}
        />
      </div>
      {/if}
    </div>

    <div class="h-full flex flex-col items-center justify-end">
      <div class="flex flex-col items-center justify-center">
        <div class="text-center text-white/60 mb-2">
          Press &larr; &darr; &rarr; to change position.
          <br />
          SPACE to start/stop the main clock;
        </div>
        <Button
          color="grey"
          size="md"
          onclick={() => navigate("selector")}
        >
          Back
        </Button>
      </div>
    </div>

  </div>
  <!-- CENTER -->
  <div class="card-base">

    <section>
      <Button 
        color="grey"
        size="md"
        onclick={() => showResetConfirm = true}
      >
        Reset Match
      </Button>
    </section>

    <section>
      <h3>main clock</h3>

      <TimeDisplay 
        id='mc'
        size="lg"
        clock={current.clocks.mc}
        allowEditing={true}
        showElapsed={false}
        onTimeEdit={(newTimeMs) => manager.setClockTime('mc', newTimeMs)}
      />
      
      <TimeControls 
        clock={current.clocks.mc}
        canReset={true}
        onClockUpdate={(eventName) => {
          if (eventName === 'start') manager.startClock('mc');
          else if (eventName === 'stop') manager.stopClock('mc');
          else if (eventName === 'reset') manager.resetClock('mc');
        }}
        className="mt-4"
      />

    </section>

    <section>
      <Recap 
        periods={current.periods}
        colorLeft={current.l.color}
        colorRight={current.r.color}
        onSwitch={(actionId) => manager.switchActionSide(actionId)}
        onDelete={(actionId) => manager.deleteAction(actionId)}
      />

    </section>

  </div>
  <!-- RIGHT -->
  <div class={`card-${current.r.color}`}>

    <div class="flex flex-row gap-4 items-center mb-2">
      <Position 
        bind:selected={current.r.pos}
        onSelected={(pos) => manager.setPosition('r', pos)}
      />
      <Color 
        bind:selected={current.r.color}
        onSelected={(color) => manager.setColor("r", color)}
      />
    </div>

    <div class="mb-4">
      <ActionBoard 
        side='r'
        pos={current.r.pos}
        style={current.config.style}
        periods={current.periods}
        onClick={(actn) => { manager.processAction(actn) }}
      />
    </div>

    <div class="flex flex-col gap-1 mb-4" id="right_sideclocks">
      {#if current.r.clocks.blood}
      <div class="side-clock-container">
        <span>Blood</span>
        <TimeDisplay 
          id='r_blood'
          size="md"
          clock={current.r.clocks.blood}
          allowEditing={true}
          onTimeEdit={(newTimeMs) => manager.setClockTime('r_blood', newTimeMs)}
          className="bg-white"
        />
        <TimeControls 
          size="md"
          clock={current.r.clocks.blood}
          canReset={false}
          onClockUpdate={(eventName) => {
            if (eventName === 'start') manager.startClock('r_blood');
            else if (eventName === 'stop') manager.stopClock('r_blood');
          }}
        />
      </div>
      {/if}
      {#if current.r.clocks.injury}
      <div class="side-clock-container">
        <span>Injury</span>
        <TimeDisplay 
          id='r_injury'
          size="md"
          clock={current.r.clocks.injury}
          allowEditing={true}
          onTimeEdit={(newTimeMs) => manager.setClockTime('r_injury', newTimeMs)}
          className="bg-white"
        />
        <TimeControls 
          size="md"
          clock={current.r.clocks.injury}
          canReset={false}
          onClockUpdate={(eventName) => {
            if (eventName === 'start') manager.startClock('r_injury');
            else if (eventName === 'stop') manager.stopClock('r_injury');
          }}
        />
      </div>
      {/if}
      {#if current.r.clocks.recovery}
      <div class="side-clock-container">
        <span>Recovery</span>
        <TimeDisplay 
          id='r_recovery'
          size="md"
          clock={current.r.clocks.recovery}
          allowEditing={true}
          onTimeEdit={(newTimeMs) => manager.setClockTime('r_recovery', newTimeMs)}
          className="bg-white"
        />
        <TimeControls 
          size="md"
          clock={current.r.clocks.recovery}
          canReset={false}
          onClockUpdate={(eventName) => {
            if (eventName === 'start') manager.startClock('r_recovery');
            else if (eventName === 'stop') manager.stopClock('r_recovery');
          }}
        />
      </div>
      {/if}
      {#if current.r.clocks.headneck}
      <div class="side-clock-container">
        <span>Head/Neck</span>
        <TimeDisplay 
          id='r_headneck'
          size="md"
          clock={current.r.clocks.headneck}
          allowEditing={true}
          onTimeEdit={(newTimeMs) => manager.setClockTime('r_headneck', newTimeMs)}
          className="bg-white"
        />
        <TimeControls 
          size="md"
          clock={current.r.clocks.headneck}
          canReset={false}
          onClockUpdate={(eventName) => {
            if (eventName === 'start') manager.startClock('r_headneck');
            else if (eventName === 'stop') manager.stopClock('r_headneck');
          }}
        />
      </div>
      {/if}
    </div>

  </div>

  <Modal 
    bind:open={showResetConfirm} 
    onclose={() => showResetConfirm = false}
    size="md"
  >
    <div class="text-center">
      <h2>Reset Match?</h2>
      <div class="mt-4 flex flex-row gap-4 items-center justify-center">
        <Button 
          color="grey" 
          onclick={() => showResetConfirm = false}
        >
          Cancel
        </Button>
        <Button 
          color="red"
          onclick={() => {
            manager.resetMatch();
            showResetConfirm = false;
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  </Modal>

</div>


<style>
  
  .master-grid {
    @apply 
      w-full min-h-screen
      grid grid-cols-3 gap-2
      p-2
    ;
  }

  .card-base {
    @apply flex flex-col w-full
    sm:p-2 p-1 
    rounded-xl
    border-[0.6px] border-slate-200
    shadow-[0px_2px_8px_0px_rgba(0,0,0,0.05)];
  }

  .card-red {
    @apply card-base 
    bg-red-600/80;
  }

  .card-green {
    @apply card-base 
    bg-green-600/80;
  }

  .card-blue {
    @apply card-base 
    bg-blue-600/80;
  }

  section {
    @apply flex flex-col w-full
      items-center
      mb-2
      sm:p-2 p-1 
      rounded-lg
      border-[0.6px] border-slate-500;
  }

  .side-clock-container {
    @apply flex flex-row gap-4 items-center justify-between
      py-1 px-4
      bg-white/20;
  }
  .side-clock-container > * {
    @apply w-1/3;
  }
  .side-clock-container > span {
    @apply text-xl text-white;
  }


</style>
