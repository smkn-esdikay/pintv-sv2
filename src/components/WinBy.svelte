<script lang="ts">
  import type { WWinTypeCode } from "@/types";
  import ZonkDropdown from "./_UI/ZonkDropdown.svelte";
  import { cnsWinby } from "@/constants/wrestling.constants";

  interface Props {
    winTypeCode: WWinTypeCode | 'none';
    onclick: (code: WWinTypeCode | 'none') => void;
  }

  let {
    winTypeCode,
    onclick,
  }: Props = $props();

  const options: { value: WWinTypeCode | 'none', label: string }[] = [
    { value: 'none', label: ' - ' },
    ...cnsWinby.map(el => ({ value: el.code, label: el.title, })),
  ];

  const handleChange = (newValue: WWinTypeCode | 'none') => {
    onclick(newValue as WWinTypeCode | 'none');
  }
</script>

<div>
  <ZonkDropdown 
    placeholder="Win By"
    value={winTypeCode}
    options={options}
    onchange={(newVal) => handleChange(newVal as WWinTypeCode | 'none')}
  />
</div>