<script lang="ts">
  import { navigate } from "@/lib/router.svelte";
  import { initStore } from "@/stores/init.svelte";
  import { WrestlingManager } from "@/lib/WrestlingManager.svelte";
  import { KeyboardHandler } from "@/lib/KeyboardHandler";
  import { openScoreboard } from '@/lib/broadcast.svelte';
  import { Home, RotateCcw, Monitor, SquarePen, ShieldHalf, User } from "@lucide/svelte";

  import Position from '@/components/Position.svelte';
  import Color from "@/components/Color.svelte";
  import TimeDisplay from '@/components/TimeDisplay.svelte';
  import TimeControls from '@/components/TimeControls.svelte';
  import RidingClockDisplay from "@/components/RidingClockDisplay.svelte";
  import ActionBoard from "@/components/ActionBoard.svelte";
  import ScoreDisplay from "@/components/ScoreDisplay.svelte";
  import Recap from "@/components/Recap.svelte";
  import Period from "@/components/Period.svelte";

  import Button from "@/components/_UI/ZonkButton.svelte";
  import Confirm from "@/components/_UI/ConfirmModal.svelte";
  import ChoosePosition from "@/components/ChoosePosition.svelte";
  import ChoosePositionNotice from "@/components/ChoosePositionNotice.svelte";
  import NextPeriodNotice from "@/components/NextPeriodNotice.svelte";
  import EditNames from "@/components/EditNames.svelte";
  import { outputAthleteName, outputTeamName } from "@/lib/strings";
    import EditBoutNumber from "@/components/EditBoutNumber.svelte";


  const config = initStore.config;
  const manager = WrestlingManager.getInstance();
  manager.initializeMatch(config);
  let current = $derived(manager.current);
  let mustChoosePosition = $derived(manager.mustChoosePosition);
  let whoCanChooseSides = $derived(manager.whoCanChooseSides);
  let mainClockIsComplete = $derived(manager.clockPhases?.mc === "complete");

  let displayLeftName = $derived(outputAthleteName(current.l.athlete));
  let displayRightName = $derived(outputAthleteName(current.r.athlete));
  let displayLeftTeam = $derived(outputTeamName(current.l.team));
  let displayRightTeam = $derived(outputTeamName(current.r.team));

  let keyboardHandler: KeyboardHandler;
  let showEditNames = $state(false);
  let showResetConfirm = $state(false);
  let showGoHomeConfirm = $state(false);

  let matchPoints = $derived(() => {
    // Re-compute whenever periods change (which happens when actions are added)
    const _ = current.periods;
    return manager.getPointsForMatch();
  });

  $effect(() => {
    keyboardHandler = new KeyboardHandler({
      onLeft: () => {   manager.setPosition('l', 't'); },
      onDown: () => {   manager.setPosition('l', 'n'); },
      onRight: () => {  manager.setPosition('r', 't'); },
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

  let choosePosDisabledClass = $derived(mustChoosePosition ? "disable-section" : "");

  // $inspect('mustChoosePosition', mustChoosePosition);
  // $inspect('whoCanChooseSides', whoCanChooseSides);
  // $inspect('bout', current?.boutNumber);

</script>

<div class="master-grid">
  <!-- LEFT -->
  <div class={`card-${current.l.color}`}>
    
    <div class="mb-2 text-white">
      <div class="w-full flex flex-row justify-between items-center">
        <div class="flex flex-row items-center justify-start gap-2">
          {#if displayLeftName}
          <User size={16} />
          <span>{displayLeftName}</span>
          {:else}
          (set athlete name)
          {/if}
        </div>
        <div>
          <button class="transparent-icon" onclick={() => { showEditNames = true }}>
            <SquarePen size={16} />
          </button>
        </div>
      </div>
      {#if displayLeftTeam}
      <div class="flex flex-row items-center justify-start gap-2">
        <ShieldHalf size={16} />
        <span>{displayLeftTeam}</span>
      </div>
      {/if}
    </div>

    {#if mustChoosePosition}
      {#if whoCanChooseSides?.l}
      <ChoosePosition 
        side="l"
        onSelected={(pos) => manager.setPosition("l", pos, true)}
        onDefer={() => manager.setDefer("l")}
      />
      {/if}
    {:else}
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
    {/if}

    <div id="left_actionboard" class="mb-4 {choosePosDisabledClass}">
      <ActionBoard 
        side='l'
        pos={current.l.pos}
        style={current.config.style}
        periods={current.periods}
        onClick={(actn) => { manager.processAction(actn) }}
      />
    </div>

    <div id="left_sideclocks" class="flex flex-col gap-1 mb-4 {choosePosDisabledClass}">
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
          id='l_blood'
          size="md"
          clock={current.l.clocks.blood}
          canReset={false}
          onClockUpdate={(eventName, id) => {
            if (eventName === 'start') manager.startClock(id);
            else if (eventName === 'stop') manager.stopClock(id);
            else if (eventName === 'complete') manager.handleClockComplete(id);
            manager.updateClockPhase(id, eventName);
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
          id='l_injury'
          size="md"
          clock={current.l.clocks.injury}
          canReset={false}
          onClockUpdate={(eventName, id) => {
            if (eventName === 'start') manager.startClock(id);
            else if (eventName === 'stop') manager.stopClock(id);
            else if (eventName === 'complete') manager.handleClockComplete(id);
            manager.updateClockPhase(id, eventName);
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
          id='l_recovery'
          size="md"
          clock={current.l.clocks.recovery}
          canReset={false}
          onClockUpdate={(eventName, id) => {
            if (eventName === 'start') manager.startClock(id);
            else if (eventName === 'stop') manager.stopClock(id);
            else if (eventName === 'complete') manager.handleClockComplete(id);
            manager.updateClockPhase(id, eventName);
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
          id='l_headneck'
          size="md"
          clock={current.l.clocks.headneck}
          canReset={false}
          onClockUpdate={(eventName, id) => {
            if (eventName === 'start') manager.startClock(id);
            else if (eventName === 'stop') manager.stopClock(id);
            else if (eventName === 'complete') manager.handleClockComplete(id);
            manager.updateClockPhase(id, eventName);
          }}
        />
      </div>
      {/if}
    </div>

    <div class="h-full flex flex-col items-center justify-end">
      <div class="flex flex-col items-center justify-center">
        <div class="text-center text-white mb-2">
          Press &larr; &darr; &rarr; to change position.
          <br />
          SPACE to start/stop the main clock
        </div>
      </div>
    </div>

  </div>
  <!-- CENTER -->
  <div class="">

    <section id="reset-panel">
      <div class="flex flex-row gap-2 items-center justify-center">
        <Button
          color="grey"
          size="md"
          onclick={() => showGoHomeConfirm = true}
        >
          <Home size={16} />
        </Button>
        <Button 
          color="grey"
          size="md"
          onclick={() => showResetConfirm = true}
        >
          <RotateCcw size={16} class="mr-1" />
          Reset Match
        </Button>
      </div>
    </section>

    <section id="period">
      {#if !current.config.team}
      <EditBoutNumber 
        boutNumber={current.boutNumber} 
        onUpdate={(newBoutNumber) => manager.setBoutNumber(newBoutNumber)}
      />
      {/if}

      <Period period={manager.getCurrentPeriod()} />
    </section>

    {#if mainClockIsComplete}
    <section>
      <NextPeriodNotice 
        onGoNext={() => manager.processPeriodComplete()}
      />
    </section>
    {/if}

    {#if mustChoosePosition}
    <section>
      <ChoosePositionNotice 
        periodIdx={current.periodIdx}
        periods={current.periods}
      />
    </section>
    {/if}

    <section id="match-score">
      <div class="w-full flex flex-row items-center justify-between">
        <ScoreDisplay 
          side="l"
          score={matchPoints().l}
          onClick={(action) => manager.processAction(action)}
        />
        <h3>
          Match Score
        </h3>
        <ScoreDisplay 
          side="r"
          score={matchPoints().r}
          onClick={(action) => manager.processAction(action)}
        />

      </div>
    </section>

    <section class="{choosePosDisabledClass}">
      <div class="title">Main Clock</div>
      <TimeDisplay 
        id='mc'
        size="lg"
        clock={current.clocks.mc}
        allowEditing={true}
        showElapsed={false}
        onTimeEdit={(newTimeMs) => manager.setClockTime('mc', newTimeMs)}
      />
      
      <TimeControls 
        id='mc'
        clock={current.clocks.mc}
        canReset={true}
        oneSecondButton={true}
        onClockUpdate={(eventName, id) => {
          if (eventName === 'start') manager.startClock(id);
          else if (eventName === 'stop') manager.stopClock(id);
          else if (eventName === 'reset') manager.resetClock(id);
          else if (eventName === 'onesecond') manager.setClockTime('mc', 1000);
          else if (eventName === 'complete') manager.handleClockComplete(id);
          manager.updateClockPhase(id, eventName);
        }}
      />
    </section>

    {#if current.clocks.ride}
    <section>
      <div class="title mb-1">Riding Time</div>
      <RidingClockDisplay 
        id='ride'
        clock={current.clocks.ride}
        leftPos={current.l.pos}
        leftColor={current.l.color}
        rightColor={current.r.color}
        allowEditing={true}
        onTimeEdit={(newTimeMs) => manager.setRidingTime(newTimeMs)}
        onReset={() => manager.resetRidingClock()}
        onSwapAdvantage={() => manager.swapRidingAdvantage()}
      />
    </section>
    {/if}    

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

    <div class="mb-2 text-white">
      <div class="w-full flex flex-row justify-between items-center">
        <div class="flex flex-row items-center justify-start gap-2">
          {#if displayRightName}
          <User size={16} />
          <span>{displayRightName}</span>
          {:else}
          (set athlete name)
          {/if}
        </div>
        <div>
          <button class="transparent-icon" onclick={() => { showEditNames = true }}>
            <SquarePen size={16} />
          </button>
        </div>
      </div>
      {#if displayRightTeam}
      <div class="flex flex-row items-center justify-start gap-2">
        <ShieldHalf size={16} />
        <span>{displayRightTeam}</span>
      </div>
      {/if}
    </div>

    {#if mustChoosePosition}
      {#if whoCanChooseSides?.r}
      <ChoosePosition 
        side="r"
        onSelected={(pos) => manager.setPosition("r", pos, true)}
        onDefer={() => manager.setDefer("r")}
      />
      {/if}
    {:else}
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
    {/if}

    <div id="right_actionboard" class="mb-4 {choosePosDisabledClass}">
      <ActionBoard 
        side='r'
        pos={current.r.pos}
        style={current.config.style}
        periods={current.periods}
        onClick={(actn) => { manager.processAction(actn) }}
      />
    </div>
    
    <div id="right_sideclocks" class="flex flex-col gap-1 mb-4 {choosePosDisabledClass}">
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
          id='r_blood'
          size="md"
          clock={current.r.clocks.blood}
          canReset={false}
          onClockUpdate={(eventName, id) => {
            if (eventName === 'start') manager.startClock(id);
            else if (eventName === 'stop') manager.stopClock(id);
            else if (eventName === 'complete') manager.handleClockComplete(id);
            manager.updateClockPhase(id, eventName);
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
          id='r_injury'
          size="md"
          clock={current.r.clocks.injury}
          canReset={false}
          onClockUpdate={(eventName, id) => {
            if (eventName === 'start') manager.startClock(id);
            else if (eventName === 'stop') manager.stopClock(id);
            else if (eventName === 'complete') manager.handleClockComplete(id);
            manager.updateClockPhase(id, eventName);
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
          id='r_recovery'
          size="md"
          clock={current.r.clocks.recovery}
          canReset={false}
          onClockUpdate={(eventName, id) => {
            if (eventName === 'start') manager.startClock(id);
            else if (eventName === 'stop') manager.stopClock(id);
            else if (eventName === 'complete') manager.handleClockComplete(id);
            manager.updateClockPhase(id, eventName);
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
          id='r_headneck'
          size="md"
          clock={current.r.clocks.headneck}
          canReset={false}
          onClockUpdate={(eventName, id) => {
            if (eventName === 'start') manager.startClock(id);
            else if (eventName === 'stop') manager.stopClock(id);
            else if (eventName === 'complete') manager.handleClockComplete(id);
            manager.updateClockPhase(id, eventName);
          }}
        />
      </div>
      {/if}
    </div>
    <div class="h-full flex flex-col items-center justify-end">
      <div class="flex flex-col items-center justify-center">
        <div class="text-center mb-2">
          <Button 
            onclick={() => console.clear()} 
            color="dev"
            size="lg"
          >
            clear console
          </Button>
          <Button
            color="blue"
            size="lg"
            onclick={() => openScoreboard()}
          >
            <Monitor size={16} class="mr-1" />
            Open Scoreboard
          </Button>
        </div>
      </div>
    </div>

  </div>

  <EditNames 
    open={showEditNames}
    leftAthlete={current.l.athlete}
    rightAthlete={current.r.athlete}
    leftTeam={current.l.team}
    rightTeam={current.r.team}
    leftColor={current.l.color}
    rightColor={current.r.color}
    oncancel={() => { showEditNames = false; }}
    onsave={(updateData) => { 
      manager.updateNames(updateData);
      showEditNames = false; 
    }}
  />
  <Confirm
    bind:open={showResetConfirm}
    title="Reset Match?"
    confirmText="Reset"
    confirmColor="red"
    onconfirm={() => manager.resetMatch()}
  />
  <Confirm
    bind:open={showGoHomeConfirm}
    title="Return to Selection Screen?"
    confirmText="Proceed"
    confirmColor="green"
    onconfirm={() => navigate("selector")}
  />

</div>


<style>
  
  .master-grid {
    @apply 
      min-w-[950px] w-full h-screen
      grid grid-cols-3 gap-1
      p-2;
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
      mb-1 p-[4px]
      rounded-lg
      border-[0.6px] border-slate-500;
  }
  section div.title {
    @apply text-[1rem] font-semibold;
    line-height: 1;
    font-feature-settings: "kern" 1;
  }

  .side-clock-container {
    @apply flex flex-row gap-4 items-center justify-between
      py-1 px-4
      bg-white/15;
  }
  .side-clock-container > * {
    @apply w-1/3;
  }
  .side-clock-container > span {
    @apply text-xl text-white;
  }

  .disable-section {
    @apply pointer-events-none opacity-70 blur-[1.5px];
  }

</style>
