import { JElementBuilder } from "../utils/JElementBuilder.js";
import { JCanvas, loadImagePromise } from "../core/JCanvas.js";
import { ACTION_TYPES, selectors } from "../store.js";
import * as obslite from "../libs/obslite/index.js";

export class RSpriteEditor {
  constructor(rootEl, store) {
    this.rootEl = rootEl;
    this.store = store;

    this.sprites$ = this.store
      .select(selectors.selectSprites)
      .pipe(obslite.operators.jdistinct());
    this.spriteIdx$ = this.store
      .select(selectors.selectSpriteIdx)
      .pipe(obslite.operators.jdistinct());
    this.sprite$ = obslite.operators
      .jcombineLatest(this.sprites$, this.spriteIdx$)
      .pipe(
        obslite.operators.jmap(([sprites, spriteIdx]) => {
          return sprites[spriteIdx];
        }),
      );

    this.sprite$.subscribe({
      next: (sprite) => {
        sprite && this.setSprite(sprite);
      },
    });

    this._init();
  }

  _init() {
    // NOTE: canvas
    const canvas = document.createElement("canvas");
    canvas.classList.add("canvas");
    this.rootEl.appendChild(canvas);
    this.jcanvas = new JCanvas(canvas, this.canvasSize);
    this.resize(this.spriteSize);

    const _stopDraw = () => {
      this.mode = null;
    };
    const _draw = (e) => {
      const clientPos = [e.clientX, e.clientY];
      const cpos = this._clientPos2PixelPos(clientPos);
      if (this.mode === "draw") {
        this._drawPixel(cpos);
      } else if (this.mode === "clear") {
        this._clearPixel(cpos);
      }
    };

    this.jcanvas.canvas.addEventListener("mouseup", _stopDraw);
    this.jcanvas.canvas.addEventListener("mouseleave", _stopDraw);
    this.jcanvas.canvas.addEventListener("mousedown", (e) => {
      this.mode = e.buttons === 1 ? "draw" : "clear";
      _draw(e);
    });
    this.jcanvas.canvas.addEventListener("mousemove", _draw);

    // NOTE: controls
    this.rootEl.appendChild(
      JElementBuilder.addInput(
        (input) => {
          input.classList.add("color");
          input.type = "color";
          input.value = 1;
        },
        (e) => {
          this.color = e.target.value;
        },
      ),
    );
    this.rootEl.appendChild(
      JElementBuilder.addButton("clear", () => this.jcanvas.clear()),
    );
    this.rootEl.appendChild(
      JElementBuilder.addButton("save", () => {
        const { sprites, spriteIdx } = this.store.state;
        const sprite = sprites[spriteIdx];
        if (!sprite) {
          return;
        }
        sprite.img.src = this.toDataURL();
        const url = this.toDataURL();
        loadImagePromise(url).then((img) => {
          const newSprite = { ...sprite, img };
          const newSprites = obslite.utils.jupdateByIdx(
            spriteIdx,
            newSprite,
            sprites,
          );
          this.store.dispatch({
            type: ACTION_TYPES.SPRITES_UPDATE,
            payload: newSprites,
          });
        });
      }),
    );
    this.rootEl.appendChild(
      JElementBuilder.addButton("rename", () => {
        const { sprites, spriteIdx } = this.store.state;
        const sprite = sprites[spriteIdx];
        if (!sprite) {
          return;
        }
        const name = prompt("Sprite name", sprite.name)?.trim();
        if (!name) {
          return;
        }
        const newSprite = { ...sprite, name };
        newSprite.img.title = name;
        const newSprites = sprites.map((s, i) =>
          i === spriteIdx ? newSprite : s,
        );

        this.store.dispatch({
          type: ACTION_TYPES.SPRITES_UPDATE,
          payload: newSprites,
        });
      }),
    );
    this.rootEl.appendChild(
      JElementBuilder.addButton("add", () => {
        const { sprites } = this.store.state;
        const url = this.toDataURL();
        const name = prompt("Sprite name", "")?.trim();
        if (!name) {
          return;
        }
        loadImagePromise(url).then((img) => {
          const newSprite = { name, img };
          this.store.dispatch({
            type: ACTION_TYPES.SPRITES_UPDATE,
            payload: [...sprites, newSprite],
          });
          this.store.dispatch({
            type: ACTION_TYPES.SPRITE_SELECT,
            payload: newSprite,
          });
        });
      }),
    );
    this.rootEl.appendChild(
      JElementBuilder.addButton("download", () => {
        const filename = this.name.endsWith(".png")
          ? this.name
          : `${this.name}.png`;
        this.jcanvas.saveImage(filename);
      }),
    );
    this.rootEl.appendChild(
      JElementBuilder.addInput(
        (input) => {
          input.classList.add("file");
          input.type = "file";
          input.accept = "image/*";
        },
        (e) => {
          const files = e.target.files;
          if (!files.length) {
            return;
          }
          const file = files[0];
          const url = URL.createObjectURL(file);
          this.jcanvas.drawImageFromUrl(url);
        },
      ),
    );
    this.rootEl.appendChild(
      JElementBuilder.addButton("delete", () => {
        const { sprites, spriteIdx } = this.store.state;
        const sprite = sprites[spriteIdx];
        if (!sprite) {
          return;
        }
        const confirmed = confirm(`Delete sprite ${sprite.name}?`);
        if (!confirmed) {
          return;
        }
        const newSprites = sprites.filter((s) => s !== sprite);
        const newSpriteIdx = Math.max(0, spriteIdx - 1);

        this.store.dispatch({
          type: ACTION_TYPES.SPRITES_UPDATE,
          payload: newSprites,
        });
        this.store.dispatch({
          type: ACTION_TYPES.SPRITE_SELECT,
          payload: newSprites[newSpriteIdx],
        });
      }),
    );

    {
      this.frameCountEl = JElementBuilder.addInput(
        (input) => {
          input.classList.add("input");
          input.type = "number";
          input.min = 1;
          input.max = 4;
        },
        (e) => {
          const prevSize = this.spriteSize;
          const size = Math.min(4, Math.max(1, +e.target.value));
          e.target.value = size;
          const url = this.toDataURL();
          this.resize([16 * size, 16]);
          const img = new Image();
          img.src = url;
          img.onload = () => {
            const repeatCount = Math.ceil(size / prevSize[0]) + 1;
            for (let i = 0; i < repeatCount; i++) {
              this.jcanvas.drawImage(
                img,
                [0, 0],
                prevSize,
                [i * prevSize[0], 0],
                prevSize,
              );
            }
          };
        },
      );
      const label = document.createElement("label");
      label.textContent = "frame count:";
      label.appendChild(this.frameCountEl);
      this.rootEl.appendChild(label);
    }
  }

  setSprite(sprite) {
    this.fromUrl(sprite.img.src, sprite.name);
  }
  toDataURL() {
    return this.jcanvas.canvas.toDataURL();
  }
  fromUrl(url, name = "default.png") {
    this.jcanvas.drawImageFromUrl(url).then(() => {
      this.spriteSize = [...this.jcanvas.size];
      this.frameCountEl.value = Math.floor(this.jcanvas.size[0] / 16);
    });
    this.name = name;
  }

  resize(spriteSize = [16, 16]) {
    this.spriteSize = spriteSize;
    this.jcanvas?.resize(spriteSize);
  }
  _drawPixel(cpos) {
    const pos = this._cell2canvas(cpos);
    this.jcanvas.fillRect(pos, [1, 1], this.color);
  }
  _clearPixel(cpos) {
    const pos = this._cell2canvas(cpos);
    this.jcanvas.clear(pos, [1, 1]);
  }
  clear() {
    this.jcanvas.clear();
  }
  _cell2canvas(cpos) {
    return cpos;
  }
  _clientPos2PixelPos(clientPos) {
    const rect = this.jcanvas.getRect();
    return clientPos.map((v, i) =>
      Math.floor(((v - rect.pos[i]) / rect.size[i]) * this.spriteSize[i]),
    );
  }
}
