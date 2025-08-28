import type { WConfig } from "@/types";

const ur: WConfig = {
  style: 'Folkstyle',
  age: 'College',
  periodLengths: [180, 120, 120],
  team: false,
};

class InitStore {
  private data = $state<WConfig>({...ur});

  get style() { return this.data.style; }
  get age() { return this.data.age; }
  get periodLengths() { return this.data.periodLengths; }
  get team() { return this.data.team; }
  get config() { return this.data; }

  /**
   * @param {WConfig} newData - set the init data
   */
  setAll(newData: WConfig) { this.data = newData }
}

export const initStore = new InitStore();
