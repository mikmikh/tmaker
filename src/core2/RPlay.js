import { JElementBuilder } from "../utils/JElementBuilder.js";
import { EventManager, KeyboardControls } from "../utils/keyboard.js";
import { JCanvas } from "../core/JCanvas.js";

export function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export class RPlay {
  constructor(rootEl, roomSize = [8, 8], tileSize = [16, 16]) {
    this.rootEl = rootEl;

    this.roomSize = roomSize;
    this.tileSize = tileSize;
    this.rooms = null;
    this.sprites = null;

    this.canvasSize = null;
    this.data = null;
    this.currentRoomName = null;
    this.player = null; // {pos: [0,0], sprtie}
    this.resize(roomSize, tileSize);

    this.keyboard = new KeyboardControls(new EventManager());
    this.counter = 0;
    this.interval = null;
    this._init();
  }
  setState(rooms, sprites) {
    this.rooms = rooms;
    this.sprites = sprites;
  }
  resize(roomSize = [8, 8], tileSize = [16, 16]) {
    this.roomSize = roomSize;
    this.tileSize = tileSize;
    this.canvasSize = this.roomSize.map((v, i) => v * this.tileSize[i]);
    this.tcanvas?.resize(this.canvasSize);
  }

  _init() {
    const canvas = document.createElement("canvas");
    canvas.classList.add("canvas");
    this.rootEl.appendChild(canvas);

    this.tcanvas = new JCanvas(canvas, this.canvasSize);

    // this.rootEl.appendChild(
    //   JElementBuilder.addButton("start", () => {
    //     this.handleStart();
    //   }),
    // );
    // this.rootEl.appendChild(
    //   JElementBuilder.addButton("stop", () => {
    //     this.handleStop();
    //   }),
    // );

    const key2offset = {
      a: [-1, 0],
      d: [1, 0],
      w: [0, -1],
      s: [0, 1],
    };
    Object.keys(key2offset).forEach((key) => {
      // try move player
      // show message
      // transit to new room
      const offset = key2offset[key];
      this.keyboard.addOnKeydown(key, () => {
        const npos = [...this.player.pos].map((v, i) => v + offset[i]);
        this._handleMoveToPos(npos);
      });
    });
  }

  _setRoom(room) {
    this.data = deepCopy(room.data);
    this.currentRoomName = room.name;
    this.player = null;
    this.data.forEach((row, ri) =>
      row.forEach((cell, ci) => {
        if (cell?.player) {
          this.player = { pos: [ri, ci], sprite: cell.sprite };
        }
      }),
    );
    if (!this.player) {
        alert('no player found in room');
        return false;
    }
    this.data[this.player.pos[0]][this.player.pos[1]]["sprite"] = null;

    this._updateCanvas();
    this._handleMoveToPos(this.player.pos);
    return true;
  }
  handleStart() {
    this.handleStop();
    if (!this.rooms || !this.rooms.length || !this.sprites) {
        return;
    }
    const succ = this._setRoom(this.rooms[0]);
    if (!succ) {
        return;
    }
    this.keyboard.activate();
    // this.start();
    this.counter = 0;
    this.interval = setInterval(() => {
      this._updateCanvas();
      this.counter++;
    }, 200);
  }
  handleStop() {
    this.keyboard.deactivate();
    // this.stop();
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  _handleMoveToPos(npos) {
    if (!npos.every((v, i) => v >= 0 && v <= this.roomSize[i])) {
      return;
    }
    this.player.pos = npos;
    // render
    const cell = this.data[npos[0]][npos[1]];
    this._updateCanvas();
    if (cell?.message) {
      alert(cell.message);
    }
    if (cell?.transition) {
      const nextRoom = this.rooms.find((r) => r.name === cell.transition);
      if (nextRoom === this.currentRoomName) {
        alert('room transition loop');
        return;
      }
      const success = this._setRoom(nextRoom);
    }
  }
  _updateCanvas() {
    const name2sprite = {};
    this.sprites.forEach((sprite) => {
      name2sprite[sprite.name] = sprite;
    });
    this.tcanvas.clear();
    for (let r = 0; r < this.roomSize[0]; r++) {
      for (let c = 0; c < this.roomSize[1]; c++) {
        const value = this.data[r][c];
        if (!value) {
          continue;
        }
        const cpos = [r, c];
        const { tile, sprite } = value;
        if (tile !== null && tile !== undefined) {
          this._drawSprite(cpos, name2sprite[tile]);
        }
        if (sprite !== null && sprite !== undefined) {
          this._drawSprite(cpos, name2sprite[sprite]);
        }
      }
    }
    this._drawSprite(this.player.pos, name2sprite[this.player.sprite]);
  }

  _drawSprite(cpos, sprite) {
    const pos = cpos.map((v, i) => v * this.tileSize[i]);
    const ssize = [sprite.img.naturalWidth, sprite.img.naturalHeight];
    const start = [16 * (this.counter % Math.floor(ssize[0] / 16)), 0];
    this.tcanvas.drawImage(
      sprite.img,
      start,
      this.tileSize,
      pos,
      this.tileSize,
    );
  }
}
