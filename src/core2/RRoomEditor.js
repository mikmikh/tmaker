import { JElementBuilder } from "../utils/JElementBuilder.js";
import { JCanvas } from "../core/JCanvas.js";
import { observable, operators } from "../libs/obslite/index.js";
import { ACTION_TYPES, selectors } from "../store.js";
import { jdeepCopy } from "../libs/obslite/jutils.js";

function createGrid(size) {
  return [...new Array(size[0])].map((_, ri) =>
    [...new Array(size[1])].map(() => null),
  );
}

export class RRoomEditor {
  constructor(rootEl, store, roomSize = [8, 8], tileSize = [16, 16]) {
    this.rootEl = rootEl;
    this.store = store;
    this.sprites = null;

    this.roomSize = roomSize;
    this.tileSize = tileSize;
    this.canvasSize = null;
    this.data = null;
    this.resize(roomSize, tileSize);

    this.tool = "tile";
    this.mode = null;
    this.sprite = null;
    this._init();

    this.sprites$ = this.store
      .select(selectors.selectSprites)
      .pipe(operators.jdistinct());
    this.spritesIdx$ = this.store
      .select(selectors.selectSpriteIdx)
      .pipe(operators.jdistinct());
    this.rooms$ = this.store
      .select(selectors.selectRooms)
      .pipe(operators.jdistinct());
    this.roomIdx$ = this.store
      .select(selectors.selectRoomIdx)
      .pipe(operators.jdistinct());

    operators
      .jmerge(this.sprites$, this.spritesIdx$)
      .pipe(
        operators.jtap(() => {
          const { sprites, spriteIdx } = this.store.state;
          this.sprites = sprites;
          this.sprite = sprites[spriteIdx];
          this._updateCanvas();
        }),
      )
      .subscribe();

    operators
      .jmerge(this.rooms$, this.roomIdx$)
      .pipe(
        operators.jtap(() => {
          const { rooms, roomIdx } = this.store.state;
          const room = rooms[roomIdx];
          if (room) {
            this.data = jdeepCopy(room.data);
          }
          this._updateCanvas();
        }),
      )
      .subscribe();
  }

  _init() {
    const canvas = document.createElement("canvas");
    canvas.classList.add("canvas");
    this.rootEl.appendChild(canvas);

    this.tcanvas = new JCanvas(canvas, this.canvasSize);

    const tools = ["tile", "sprite", "message", "transition", "player"];
    this.rootEl.appendChild(
      JElementBuilder.addSelect("tool", tools, (e) => {
        console.log("value", e.target.value);
        this.tool = e.target.value;
        this._updateCanvas();
      }),
    );

    this.rootEl.appendChild(
      JElementBuilder.addButton("clear", () => {
        this.resize(this.roomSize, this.tileSize);
      }),
    );
    this.rootEl.appendChild(
      JElementBuilder.addButton("save", () => {
        this.store.dispatch({ type: ACTION_TYPES.ROOM_SAVE });
      }),
    );
    this.rootEl.appendChild(
      JElementBuilder.addButton("add", () => {
        this.store.dispatch({ type: ACTION_TYPES.ROOM_ADD });
      }),
    );
    this.rootEl.appendChild(
      JElementBuilder.addButton("rename", () => {
        this.store.dispatch({ type: ACTION_TYPES.ROOM_RENAME });
      }),
    );
    this.rootEl.appendChild(
      JElementBuilder.addButton("delete", () => {
        this.store.dispatch({ type: ACTION_TYPES.ROOM_DELETE });
      }),
    );

    const _stopDraw = () => {
      this.mode = null;
    };
    const _draw = (e) => {
      const clientPos = [e.clientX, e.clientY];
      const cpos = this._clientPos2PixelPos(clientPos);
      this._handleDraw(cpos);
    };
    this.tcanvas.canvas.addEventListener("mouseup", _stopDraw);
    this.tcanvas.canvas.addEventListener("mouseleave", _stopDraw);
    this.tcanvas.canvas.addEventListener("mousedown", (e) => {
      this.mode = e.buttons === 1 ? "draw" : "clear";
      _draw(e);
    });
    this.tcanvas.canvas.addEventListener("mousemove", _draw);
  }
  resize(roomSize = [8, 8], tileSize = [16, 16]) {
    this.roomSize = roomSize;
    this.tileSize = tileSize;
    this.canvasSize = this.roomSize.map((v, i) => v * this.tileSize[i]);
    this.tcanvas?.resize(this.canvasSize);
    this.data = createGrid(this.roomSize);
  }
  setData(data) {
    this.data = data;
    if (!this.data) {
      this.resize(this.roomSize, this.tileSize);
    }
    this._updateCanvas();
  }
  reset() {
    this.resize(this.roomSize, this.tileSize);
    this.data[0][0] = { sprite: this.sprites[0].name, player: true };
    this._updateCanvas();
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
        const { tile, sprite, message, transition, player } = value;
        if (tile !== null && tile !== undefined) {
          this._drawSprite(cpos, name2sprite[tile]);
        }
        if (sprite !== null && sprite !== undefined) {
          this._drawSprite(cpos, name2sprite[sprite]);
        }
        if (
          message !== null &&
          message !== undefined &&
          this.tool === "message"
        ) {
          this._strokeRect(cpos, "red");
        }
        if (
          transition !== null &&
          transition !== undefined &&
          this.tool === "transition"
        ) {
          this._strokeRect(cpos, "blue");
        }
        if (player && this.tool === "player") {
          this._strokeRect(cpos, "green");
        }
      }
    }
  }
  _drawSprite(cpos, sprite) {
    const pos = cpos.map((v, i) => v * this.tileSize[i]);
    this.tcanvas.drawImage(
      sprite.img,
      [0, 0],
      this.tileSize,
      pos,
      this.tileSize,
    );
  }
  _strokeRect(cpos, color) {
    const pos = cpos.map((v, i) => v * this.tileSize[i]);
    this.tcanvas.strokeRect(pos, this.tileSize, color);
  }
  _clientPos2PixelPos(clientPos) {
    const rect = this.tcanvas.getRect();
    return clientPos.map((v, i) =>
      Math.floor(((v - rect.pos[i]) / rect.size[i]) * this.roomSize[i]),
    );
  }
  _handleDraw(cpos) {
    if (this.mode === "draw") {
      if (!this.data[cpos[0]][cpos[1]]) {
        this.data[cpos[0]][cpos[1]] = {};
      }
      if (this.tool === "tile" || this.tool === "sprite") {
        this.data[cpos[0]][cpos[1]][this.tool] = this.sprite.name;
      } else if (this.tool === "player") {
        if (!this.data[cpos[0]][cpos[1]]["sprite"]) {
          return;
        }
        this.data.forEach((row) =>
          row.forEach((cell) => {
            if (cell?.player) {
              delete cell.player;
            }
          }),
        );
        this.data[cpos[0]][cpos[1]][this.tool] = true;
      } else {
        const oldValue = this.data[cpos[0]][cpos[1]][this.tool] ?? "";
        const value = prompt(`${this.tool}: `, oldValue);
        if (!value?.trim()) {
          return;
        }
        this.data[cpos[0]][cpos[1]][this.tool] = value?.trim() ? value : null;
      }
      this._updateCanvas();
    } else if (this.mode === "clear") {
      if (!this.data[cpos[0]][cpos[1]]) {
        this.data[cpos[0]][cpos[1]] = {};
      }
      this.data[cpos[0]][cpos[1]][this.tool] = null;
      this._updateCanvas();
    }
  }
}
