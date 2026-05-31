/**
 * Handles real-time score synchronization for multiplayer games
 */
export class MultiplayerSyncSystem {
  private lastUpdateTime = 0;
  private updateInterval = 1000; // Update every 1 second
  private roomId: string;
  private username: string;

  constructor(roomId: string, username: string) {
    this.roomId = roomId;
    this.username = username;
  }

  /**
   * Send score update to backend
   */
  async updateScore(
    score: number,
    accuracy: number,
    combo: number,
    failed: boolean
  ) {
    const now = Date.now();

    // Rate limit updates
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    this.lastUpdateTime = now;

    try {
      await fetch(`/api/multiplayer/room.${this.roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: this.username,
          action: "updateScore",
          score,
          accuracy,
          combo,
          failed,
        }),
      });
    } catch (error) {
      console.error("Failed to sync multiplayer score:", error);
    }
  }

  /**
   * Force an immediate score update (for final results)
   */
  async finalizeScore(
    score: number,
    accuracy: number,
    combo: number,
    failed: boolean
  ) {
    try {
      await fetch(`/api/multiplayer/room.${this.roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: this.username,
          action: "updateScore",
          score,
          accuracy,
          combo,
          failed,
        }),
      });
    } catch (error) {
      console.error("Failed to finalize multiplayer score:", error);
    }
  }
}
