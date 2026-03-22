import { ACTION_TYPES, store } from "./store.js";
import { RSpriteEditor } from "./core3d/RSpriteEditor.js";
import { RSpriteGallery } from "./core3d/RSpriteGallery.js";
import { RRoomGallery } from "./core3d/RRoomGallery.js";
import * as obslite from "./libs/obslite/index.js";

import { RRoomEditor3d } from "./core3d/RRoomEditor3d.js";
import { loadImagePromise } from "./core/JCanvas.js";
import { RPlay3d } from "./core3d/RPlay3d.js";
import {
  downloadObjectAsJson,
  JElementBuilder,
} from "./utils/JElementBuilder.js";
import { JSpriteSheet } from "./utils/JSpriteSheet.js";
import * as utils from "./utils/utils.js";

const initSpriteUrls = [
  "/assets/sprites/player.png",
  "/assets/sprites/grass.png",
  "/assets/sprites/npc.png",
];
async function main() {
  const rspriteEditor = new RSpriteEditor(
    document.querySelector(".rsprite-editor"),
    store,
  );
  const rspriteGallery = new RSpriteGallery(
    document.querySelector(".rsprite-gallery"),
    store,
  );

  const rroomEditor3d = new RRoomEditor3d(
    document.querySelector(".rroom-editor"),
    store,
  );

  const rroomGallery = new RRoomGallery(
    document.querySelector(".rroom-gallery"),
    store,
  );

  const rplay3d = new RPlay3d(document.querySelector(".rplay"));
  const rgameOptionsEl = document.querySelector(".rgame-options");
  rgameOptionsEl.appendChild(
    JElementBuilder.addButton("start", () => {
      const { rooms, sprites } = store.state;
      const ss = new JSpriteSheet();
      const _sprites = sprites.map((s) => {
        const size = [16, 16];
        return { ...s, size };
      });
      ss.generate(_sprites);
      rplay3d.setState(rooms, ss);
      rplay3d.startGame();
    }),
  );
  rgameOptionsEl.appendChild(
    JElementBuilder.addButton("stop", () => {
      rplay3d.stopGame();
    }),
  );

  rgameOptionsEl.appendChild(
    JElementBuilder.addButton("export", () => {
      exportGame();
    }),
  );

  rgameOptionsEl.appendChild(
    JElementBuilder.addInput(
      (input) => {
        input.classList.add("file");
        input.type = "file";
        input.accept = "application/json";
      },
      (e) => {
        const files = e.target.files;

        if (!files.length) {
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const data = JSON.parse(event.target.result);
          console.log(data);
          importGame(data);
        };
        reader.readAsText(files[0]);
      },
    ),
  );

  function _exportGameData() {
    const { sprites, rooms } = store.state;
    const spritesData = sprites.map((sprite) => ({
      name: sprite.name,
      url: sprite.img.src,
    }));
    const roomsData = utils.jdeepCopy(rooms);
    const data = { sprites: spritesData, rooms: roomsData };
    return data;
  }
  function exportGame() {
    const data = _exportGameData();
    let name = prompt("Game name:", "game")?.trim();
    if (!name) {
      return;
    }
    downloadObjectAsJson(data, `${name}`);
  }
  function importGame(data) {
    const { sprites: spritesData, rooms } = data;

    Promise.all(spritesData.map((s) => loadImagePromise(s.url))).then(
      (imgs) => {
        console.log("imgs", imgs);
        const sprites = imgs.map((img, i) => {
          const name = spritesData[i].name;
          const sprite = { name, img };
          return sprite;
        });
        store.dispatch({
          type: ACTION_TYPES.SPRITES_UPDATE,
          payload: sprites,
        });
        store.dispatch({
          type: ACTION_TYPES.SPRITE_SELECT,
          payload: sprites[0],
        });
        store.dispatch({ type: ACTION_TYPES.ROOMS_UPDATE, payload: rooms });
        store.dispatch({ type: ACTION_TYPES.ROOM_SELECT, payload: rooms[0] });
      },
    );
  }

  const systemEffects = {
    loggerEffect: (action$, store) =>
      action$.pipe(
        obslite.operators.jmap((action) => {
          console.log("Action:", action);
        }),
      ),
  };

  store.addEffect(...Object.values(systemEffects));

  // Promise.all(initSpriteUrls.map((url) => loadImagePromise(url))).then(
  //   (imgs) => {
  //     console.log("imgs", imgs);
  //     const sprites = imgs.map((img) => {
  //       const name = img.src.split("/").at(-1).split(".")[0];
  //       const sprite = { name, img };
  //       return sprite;
  //     });
  //     store.dispatch({
  //       type: ACTION_TYPES.SPRITES_UPDATE,
  //       payload: sprites,
  //     });
  //     store.dispatch({
  //       type: ACTION_TYPES.SPRITE_SELECT,
  //       payload: sprites[0],
  //     });
  //   },
  // );

  // rroomEditor3d.__addRoom("start");

  {
    const resp = await fetch("../assets/games/game03.json", { mode: "no-cors" });
    const data = await resp.json();
    // alert(JSON.stringify(data));
    importGame(data);
  }
}

main();
