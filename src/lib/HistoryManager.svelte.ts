import type { WMatch, WHistory, WSide, WeightUnit } from "@/types";
import { co } from "./console";
import { broadcast } from "./broadcast.svelte";

/**
 * HistoryManager - Singleton class for managing match history
 * 
 * Tracks all completed matches in a wrestling dual/tournament,
 * including team points, individual match results, and statistics.
 */
export class HistoryManager {
  private static instance: HistoryManager | null = null;
  
  private _history = $state<WHistory>({ matches: [] });
  
  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager();
    }
    return HistoryManager.instance;
  }

  // ==================== Getters ====================

  /**
   * Get reactive history object
   */
  get history(): WHistory {
    return this._history;
  }

  /**
   * Get all matches
   */
  get matches(): WMatch[] {
    return this._history.matches;
  }

  /**
   * Get total number of matches
   */
  get matchCount(): number {
    return this._history.matches.length;
  }

  /**
   * Check if history is empty
   */
  get isEmpty(): boolean {
    return this._history.matches.length === 0;
  }

  // ==================== Match Management ====================

  /**
   * Add a match to the history
   * @param match - The match to add
   * @returns The index of the added match
   */
  addMatch(match: WMatch): number {
    this._history.matches.push(match);
    const index = this._history.matches.length - 1;
    
    co.success("HistoryManager: Match added", {
      index,
      weight: match.weight,
      score: `${match.ptLeft}-${match.ptRight}`,
      winner: match.winner
    });
    
    this.broadcastHistory();
    return index;
  }

  /**
   * Get a specific match by index
   * @param index - The index of the match
   * @returns The match or undefined if not found
   */
  getMatch(index: number): WMatch | undefined {
    if (index < 0 || index >= this._history.matches.length) {
      co.warn("HistoryManager: Invalid match index", index);
      return undefined;
    }
    return this._history.matches[index];
  }

  /**
   * Get the most recent match
   * @returns The last match or undefined if history is empty
   */
  getLastMatch(): WMatch | undefined {
    if (this.isEmpty) return undefined;
    return this._history.matches[this._history.matches.length - 1];
  }

  /**
   * Update a specific match
   * @param index - The index of the match to update
   * @param updates - Partial match object with fields to update
   * @returns true if successful, false if index invalid
   */
  updateMatch(index: number, updates: Partial<WMatch>): boolean {
    if (index < 0 || index >= this._history.matches.length) {
      co.warn("HistoryManager: Invalid match index for update", index);
      return false;
    }
    
    this._history.matches[index] = {
      ...this._history.matches[index],
      ...updates
    };
    
    co.info("HistoryManager: Match updated", { index, updates });
    this.broadcastHistory();
    return true;
  }

  /**
   * Remove a match from history
   * @param index - The index of the match to remove
   * @returns true if successful, false if index invalid
   */
  removeMatch(index: number): boolean {
    if (index < 0 || index >= this._history.matches.length) {
      co.warn("HistoryManager: Invalid match index for removal", index);
      return false;
    }
    
    const removed = this._history.matches.splice(index, 1)[0];
    co.info("HistoryManager: Match removed", { index, removed });
    this.broadcastHistory();
    return true;
  }

  /**
   * Clear all match history
   */
  clearHistory(): void {
    const previousCount = this._history.matches.length;
    this._history.matches = [];
    
    co.info("HistoryManager: History cleared", { previousCount });
    this.broadcastHistory();
  }

  // ==================== Statistics & Analysis ====================

  /**
   * Get cumulative team points across all matches
   * @returns Object with left and right team totals
   */
  getTotalTeamPoints(): { left: number; right: number } {
    return this._history.matches.reduce(
      (totals, match) => ({
        left: totals.left + match.teamPtLeft,
        right: totals.right + match.teamPtRight
      }),
      { left: 0, right: 0 }
    );
  }

  /**
   * Get cumulative match points across all matches
   * @returns Object with left and right match point totals
   */
  getTotalMatchPoints(): { left: number; right: number } {
    return this._history.matches.reduce(
      (totals, match) => ({
        left: totals.left + match.ptLeft,
        right: totals.right + match.ptRight
      }),
      { left: 0, right: 0 }
    );
  }

  /**
   * Get win counts by side
   * @returns Object with left and right win counts
   */
  getWinCounts(): { left: number; right: number; ties: number } {
    return this._history.matches.reduce(
      (counts, match) => {
        if (match.winner === 'l') {
          counts.left++;
        } else if (match.winner === 'r') {
          counts.right++;
        } else {
          counts.ties++;
        }
        return counts;
      },
      { left: 0, right: 0, ties: 0 }
    );
  }

  /**
   * Get matches filtered by winner
   * @param side - The winning side to filter by
   * @returns Array of matches won by the specified side
   */
  getMatchesBySide(side: WSide): WMatch[] {
    return this._history.matches.filter(match => match.winner === side);
  }

  /**
   * Get matches at a specific weight
   * @param weight - The weight to filter by
   * @returns Array of matches at that weight
   */
  getMatchesByWeight(weight: number, unit: WeightUnit): WMatch[] {
    return this._history.matches.filter(match => match.weight?.weight === weight && match.weight?.unit === unit);
  }

  /**
   * Calculate average match duration
   * @returns Average time in seconds, or 0 if no matches
   */
  getAverageMatchDuration(): number {
    if (this.isEmpty) return 0;
    
    const total = this._history.matches.reduce(
      (sum, match) => sum + (match.totalElapsedSeconds || 0),
      0
    );
    
    return Math.round(total / this._history.matches.length);
  }

  /**
   * Get matches that went to overtime
   * @returns Array of overtime matches
   */
  getOvertimeMatches(): WMatch[] {
    return this._history.matches.filter(
      match => match.winPeriod !== undefined && match.winPeriod >= 3
    );
  }

  /**
   * Get summary statistics
   * @returns Object with various statistics
   */
  getSummary(): {
    totalMatches: number;
    teamPoints: { left: number; right: number };
    matchPoints: { left: number; right: number };
    wins: { left: number; right: number; ties: number };
    averageDuration: number;
    overtimeMatches: number;
  } {
    return {
      totalMatches: this.matchCount,
      teamPoints: this.getTotalTeamPoints(),
      matchPoints: this.getTotalMatchPoints(),
      wins: this.getWinCounts(),
      averageDuration: this.getAverageMatchDuration(),
      overtimeMatches: this.getOvertimeMatches().length
    };
  }

  // ==================== Import/Export ====================

  /**
   * Export history as JSON string
   * @returns JSON string of history
   */
  exportToJSON(): string {
    return JSON.stringify(this._history, null, 2);
  }

  /**
   * Import history from JSON string
   * @param json - JSON string to import
   * @returns true if successful, false if invalid JSON
   */
  importFromJSON(json: string): boolean {
    try {
      const imported = JSON.parse(json) as WHistory;
      if (!imported.matches || !Array.isArray(imported.matches)) {
        co.error("HistoryManager: Invalid history format");
        return false;
      }
      
      this._history = imported;
      co.success("HistoryManager: History imported", {
        matchCount: imported.matches.length
      });
      this.broadcastHistory();
      return true;
    } catch (error) {
      co.error("HistoryManager: Failed to import history", error);
      return false;
    }
  }

  /**
   * Export history to localStorage
   * @param key - Storage key (default: 'wrestling_history')
   */
  saveToStorage(key: string = 'wrestling_history'): void {
    try {
      localStorage.setItem(key, this.exportToJSON());
      co.success("HistoryManager: History saved to storage", { key });
    } catch (error) {
      co.error("HistoryManager: Failed to save to storage", error);
    }
  }

  /**
   * Import history from localStorage
   * @param key - Storage key (default: 'wrestling_history')
   * @returns true if successful, false if not found or invalid
   */
  loadFromStorage(key: string = 'wrestling_history'): boolean {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        co.warn("HistoryManager: No history found in storage", { key });
        return false;
      }
      return this.importFromJSON(stored);
    } catch (error) {
      co.error("HistoryManager: Failed to load from storage", error);
      return false;
    }
  }

  // ==================== Broadcasting ====================

  /**
   * Broadcast history updates
   */
  private broadcastHistory(): void {
    broadcast.sendGeneric('history', JSON.stringify({
      matches: this._history.matches,
      summary: this.getSummary()
    }));
  }

  // ==================== Debugging ====================

  /**
   * Log current history to console
   */
  logHistory(): void {
    co.table(
      this._history.matches.map((match, index) => ({
        '#': index + 1,
        weight: match.weight || 'N/A',
        score: `${match.ptLeft}-${match.ptRight}`,
        teamPts: `${match.teamPtLeft}-${match.teamPtRight}`,
        winner: match.winner || 'tie',
        duration: match.totalElapsedSeconds 
          ? `${Math.floor(match.totalElapsedSeconds / 60)}:${(match.totalElapsedSeconds % 60).toString().padStart(2, '0')}`
          : 'N/A'
      })),
      "Match History"
    );
    
    const summary = this.getSummary();
    co.info("History Summary", summary);
  }

  // ==================== Cleanup ====================

  /**
   * Destroy the singleton instance
   */
  static destroy(): void {
    if (HistoryManager.instance) {
      HistoryManager.instance.clearHistory();
      HistoryManager.instance = null;
    }
  }
}

// Export singleton instance
export const historyManager = HistoryManager.getInstance();