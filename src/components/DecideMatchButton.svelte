<script lang="ts">
    import type { SideColor, WAthlete, WSide, WWinTypeCode } from "@/types";
    import Button from "./_UI/ZonkButton.svelte";
    import ZonkModal from "./_UI/ZonkModal.svelte";
    import { cnsWinby } from "@/constants/wrestling.constants";
    import { capitalize } from "@/lib/strings";

  interface Props {
    leftCode: WWinTypeCode | 'none';
    rightCode: WWinTypeCode | 'none';
    leftColor: SideColor;
    rightColor: SideColor;
    leftAthlete: WAthlete;
    rightAthlete: WAthlete;
    onConfirm: () => void;
  }

  let {
    leftCode,
    rightCode,
    leftColor,
    rightColor,
    leftAthlete,
    rightAthlete,
    onConfirm,
  }: Props = $props();

  let showNextMatchDialogue = $state(false);
  let question = $state('');
  let showButton = $derived((leftCode === 'none' || rightCode === 'none') && leftCode !== rightCode);
  
  const openNextMatchDialogue = () => {
    if (!showButton)
      return;

    showNextMatchDialogue = true;
    let winner: WSide;
    let winCode: WWinTypeCode;
    if (leftCode !== 'none') {
      winner = 'l';
      winCode = leftCode;
    } else {
      winner = 'r';
      winCode = rightCode as WWinTypeCode;
    }

    const winbyObject = cnsWinby.find(el => el.code === winCode);

    let winnerString;
    if (winner === 'l') {
      if (leftAthlete?.firstName || leftAthlete?.lastName) {
        winnerString = leftAthlete.firstName + ' ' + leftAthlete.lastName;
        winnerString.trim();
      } else {
        winnerString = capitalize(leftColor);
      }
    } else {
      if (rightAthlete?.firstName || rightAthlete?.lastName) {
        winnerString = rightAthlete.firstName + ' ' + rightAthlete.lastName;
        winnerString.trim();
      } else {
        winnerString = capitalize(rightColor);
      } 
    }

    question = `Did ${winnerString} win by ${winbyObject?.title}?`;
  };

  const handleConfirm = () => {
    showNextMatchDialogue = false;
    onConfirm();
  }

  const closeDialogue = () => {
    showNextMatchDialogue = false;
  }
</script>

<div>
{#if showButton}
  <Button onclick={openNextMatchDialogue}>Next Match</Button>
{/if}

  <ZonkModal 
    open={showNextMatchDialogue} 
    onclose={closeDialogue}
    size='md'
  >
    <div class="p-4">
      <div class="text-center text-xl mb-4">{question}</div>
      <div class="flex flex-row justify-center items-center gap-4">
        <Button 
          size="lg"
          onclick={handleConfirm}
        >
          Yes
        </Button>
        <Button 
          size="lg"
          onclick={closeDialogue}
        >
          No
        </Button>
      </div>
    </div>
  </ZonkModal>

</div>