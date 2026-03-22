import { ACTION_TYPES, selectors } from "../store.js";
import { JElementBuilder } from "../utils/JElementBuilder.js";
import { operators } from "../libs/obslite/index.js";

class JSprite {
  constructor(name, img) {
    this.name = name;
    this.img = img;
  }
}

export class RSpriteGallery {
  constructor(rootEl, store) {
    this.rootEl = rootEl;
    this.store = store;

    this.sprites$ = this.store
      .select(selectors.selectSprites)
      .pipe(operators.jdistinct());
    this.spriteIdx$ = this.store
      .select(selectors.selectSpriteIdx)
      .pipe(operators.jdistinct());

    this._init();

    operators
      .jmerge(this.sprites$, this.spriteIdx$)
      .pipe(
        operators.jtap(() => {
          const { sprites, spriteIdx } = this.store.state;
          if (!sprites) {
            return;
          }
          this._renderSprites(sprites);
          this._selectSprite(spriteIdx);
        }),
      )
      .subscribe();
  }

  addSpriteFromUrl(name, url) {
    const sprite = this._createSprite(name, url);
    this.store.dispatch({
      type: ACTION_TYPES.SPRITES_UPDATE,
      payload: [...this.store.state.sprites, sprite],
    });
  }

  _init() {
    const spritesEl = document.createElement("div");
    spritesEl.classList.add("sprites");
    this.rootEl.appendChild(spritesEl);

    const spritesListEl = document.createElement("div");
    spritesListEl.classList.add("sprites__list");
    spritesEl.appendChild(spritesListEl);
    this._spritesListEl = spritesListEl;

    this._spritesListEl.addEventListener("click", (e) => {
      const el = e.target;
      if (!el.matches("img")) {
        return;
      }
      const imgs = Array.from(this._spritesListEl.querySelectorAll("img"));
      const idx = imgs.indexOf(el);

      const { sprites } = this.store.state;
      this.store.dispatch({
        type: ACTION_TYPES.SPRITE_SELECT,
        payload: sprites[idx],
      });
    });

    // this.rootEl.appendChild(
    //   JElementBuilder.addButton("save", () => {
    //     this.store.dispatch({ type: ACTION_TYPES.SPRITE_SAVE });
    //   }),
    // );

    this.rootEl.appendChild(
      JElementBuilder.addInput(
        (input) => {
          input.classList.add("file");
          input.type = "file";
          input.multiple = true;
          input.accept = "image/*";
        },
        (e) => {
          const files = e.target.files;
          if (!files.length) {
            return;
          }
          Array.from(files).forEach((file) => {
            const name = file.name;
            const url = URL.createObjectURL(file);
            this.addSpriteFromUrl(name, url);
          });
        },
      ),
    );
  }

  _renderSprites(sprites) {
    this._spritesListEl.innerHTML = "";
    sprites.forEach((sprite) => {
      sprite.img.title = sprite.name;
      this._spritesListEl.appendChild(sprite.img);
    });
  }
  _selectSprite(spriteIdx) {
    this.store.state.sprites.forEach((s) => s.img.classList.remove("active"));
    this.store.state.sprites[spriteIdx]?.img.classList.add("active");
  }
  // _createSprite(name, url) {
  //   const img = document.createElement("img");
  //   img.src = url;
  //   img.title = name;
  //   return this._createSpriteFromExistingImage(name, img);
  // }
  // _createSpriteFromExistingImage(name, img) {
  //   const sprite = new JSprite(name, img);
  //   // img.addEventListener("click", () => {
  //   //   this.store.dispatch({
  //   //     type: ACTION_TYPES.SPRITE_SELECT,
  //   //     payload: sprite,
  //   //   });
  //   // });
  //   return sprite;
  // }
}
