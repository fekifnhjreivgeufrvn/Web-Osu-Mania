import { Container, Graphics } from "pixi.js";
import type { Game } from "../game";

export class TouchHitboxes {
  public game: Game;

  public view: Container;

  private hitAreas: Graphics[] = [];
  private touchIdToColumn: Map<number, number> = new Map();
  private handleTouchStart: ((e: TouchEvent) => void) | null = null;
  private handleTouchEnd: ((e: TouchEvent) => void) | null = null;
  private handleTouchMove: ((e: TouchEvent) => void) | null = null;
  private handleTouchCancel: ((e: TouchEvent) => void) | null = null;

  constructor(game: Game) {
    this.game = game;

    this.view = new Container();
    this.view.eventMode = "passive";

    for (let i = 0; i < this.game.difficulty.keyCount; i++) {
      const hitArea = new Graphics();
      hitArea.width = 40;
      hitArea.height = 40;

      hitArea.eventMode = "static";
      hitArea.cursor = "pointer";

      this.hitAreas.push(hitArea);
      this.view.addChild(hitArea);
    }

    this.setupNativeTouchListeners();
  }

  private setupNativeTouchListeners() {
    const canvas = this.game.app.canvas;

    this.handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      for (const touch of e.touches) {
        const column = this.getColumnFromTouch(touch);
        if (column !== -1) {
          this.touchIdToColumn.set(touch.identifier, column);
          this.game.inputSystem.hit(column);
          this.updateHitAreaVisuals(column, true);
        }
      }
    };

    this.handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const column = this.touchIdToColumn.get(touch.identifier);
        if (column !== undefined) {
          this.touchIdToColumn.delete(touch.identifier);
          this.game.inputSystem.release(column);
          this.updateHitAreaVisuals(column, false);
        }
      }
    };

    this.handleTouchMove = (e: TouchEvent) => {
      // Update visual feedback for touches that move between columns
      for (const touch of e.touches) {
        const oldColumn = this.touchIdToColumn.get(touch.identifier);
        const newColumn = this.getColumnFromTouch(touch);

        if (oldColumn !== undefined && oldColumn !== newColumn && newColumn !== -1) {
          this.updateHitAreaVisuals(oldColumn, false);
          this.touchIdToColumn.set(touch.identifier, newColumn);
          this.game.inputSystem.release(oldColumn);
          this.game.inputSystem.hit(newColumn);
          this.updateHitAreaVisuals(newColumn, true);
        }
      }
    };

    this.handleTouchCancel = (e: TouchEvent) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const column = this.touchIdToColumn.get(touch.identifier);
        if (column !== undefined) {
          this.touchIdToColumn.delete(touch.identifier);
          this.game.inputSystem.release(column);
          this.updateHitAreaVisuals(column, false);
        }
      }
    };

    canvas.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    canvas.addEventListener("touchend", this.handleTouchEnd, { passive: false });
    canvas.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    canvas.addEventListener("touchcancel", this.handleTouchCancel, { passive: false });
  }

  private getColumnFromTouch(touch: Touch): number {
    const rect = this.game.app.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Check if touch is within vertical bounds of touch area
    if (y < 0 || y > this.game.app.screen.height) {
      return -1;
    }

    const hitAreaWidth =
      this.game.settings.touch.mode === "normal"
        ? this.game.scaledColumnWidth + this.game.settings.laneSpacing
        : this.game.app.screen.width / this.game.difficulty.keyCount;

    let column = Math.floor(x / hitAreaWidth);

    // Account for stage offset in normal mode
    if (this.game.settings.touch.mode === "normal") {
      const totalWidth =
        this.game.scaledColumnWidth * this.game.difficulty.keyCount +
        this.game.settings.laneSpacing * (this.game.difficulty.keyCount - 1);

      const stageX =
        this.game.app.screen.width / 2 - totalWidth / 2 + this.game.stagePositionOffset;

      if (x < stageX || x > stageX + totalWidth) {
        return -1;
      }

      column = Math.floor((x - stageX) / hitAreaWidth);
    }

    if (column < 0 || column >= this.game.difficulty.keyCount) {
      return -1;
    }

    return column;
  }

  private updateHitAreaVisuals(column: number, isPressed: boolean) {
    if (column < 0 || column >= this.hitAreas.length) return;

    if (isPressed) {
      this.hitAreas[column].alpha = Math.min(
        this.game.settings.touch.borderOpacity * 3,
        1,
      );
    } else {
      this.hitAreas[column].alpha = this.game.settings.touch.borderOpacity;
    }
  }

  public dispose() {
    const canvas = this.game.app.canvas;
    if (this.handleTouchStart) canvas.removeEventListener("touchstart", this.handleTouchStart);
    if (this.handleTouchEnd) canvas.removeEventListener("touchend", this.handleTouchEnd);
    if (this.handleTouchMove) canvas.removeEventListener("touchmove", this.handleTouchMove);
    if (this.handleTouchCancel) canvas.removeEventListener("touchcancel", this.handleTouchCancel);
  }

  private redrawHitAreas() {
    const hitAreaWidth =
      this.game.settings.touch.mode === "normal"
        ? this.game.scaledColumnWidth
        : this.game.app.screen.width / this.game.difficulty.keyCount;

    const borderWidth = 1;

    this.hitAreas.forEach((hitArea, i) => {
      let x = hitAreaWidth * i;
      if (this.game.settings.touch.mode === "normal") {
        x += this.game.settings.laneSpacing * i;
      }

      hitArea.clear();
      hitArea
        .rect(x, 0, hitAreaWidth, this.game.app.screen.height)
        .stroke({ width: borderWidth, color: "white" })
        .fill({ color: "transparent" });

      hitArea.alpha = this.game.settings.touch.borderOpacity;
    });
  }

  public resize() {
    if (this.game.settings.touch.mode === "normal") {
      const totalWidth =
        this.game.scaledColumnWidth * this.game.difficulty.keyCount +
        this.game.settings.laneSpacing * (this.game.difficulty.keyCount - 1);

      this.view.x =
        this.game.app.screen.width / 2 -
        totalWidth / 2 +
        this.game.stagePositionOffset;
    }

    this.redrawHitAreas();
  }
}
