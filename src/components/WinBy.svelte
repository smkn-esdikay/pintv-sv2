<script lang="ts">
  import type { WWinTypeCode } from "@/types";
  import ZonkDropdown from "./_UI/ZonkDropdown.svelte";
  import { cnsWinby } from "@/constants/wrestling.constants";

  interface Props {
    winTypeCode: WWinTypeCode | null;
    onclick: (code: WWinTypeCode | null) => void;
  }

  let {
    winTypeCode,
    onclick,
  }: Props = $props();

  const options: { value: WWinTypeCode | null, label: string }[] = [
    { value: null, label: ' - ' },
    ...cnsWinby.map(el => ({ value: el.code, label: el.title, })),
  ];

  const handleChange = (newValue: WWinTypeCode | null) => {
    onclick(newValue as WWinTypeCode | null);
  }
</script>

<div>
  <ZonkDropdown 
    placeholder="Win By"
    value={winTypeCode}
    options={options}
    onchange={(newVal) => handleChange(newVal as WWinTypeCode | null)}
  />
</div>