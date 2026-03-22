import * as obslite from "../libs/obslite/index.js";
import { ACTION_TYPES, selectors } from "../store.js";
import { JElementBuilder } from "../utils/JElementBuilder.js";
import { JLights } from "../utils/JLights.js";
import { JSpriteSheet } from "../utils/JSpriteSheet.js";
import { EventManager, MouseControls } from "../utils/keyboard.js";
import { checkInside, jdeepCopy, jdeepEqual } from "../utils/utils.js";
import {
  JBlocksDebug,
  JBlocksMeshBuilder,
  JInstancedSpritesBuilder,
  JSpritesMeshBuilder,
} from "./blocks-mesh.js";
import { JBlocksDataRanges } from "./blocks-model.js";
import { JEngine } from "./engine.js";
import { JRaycaster } from "./jraycaster.js";

const tools = ["tile", "slide", "sprite", "message", "transition", "player"];

const tool2scale = {
  // tile: 0.5,
  // sprite: 0.5,
  message: 1.1,
  transition: 1.1,
  player: 1.1,
};
const tool2color = {
  // tile: 0.5,
  // sprite: 0.5,
  message: "red",
  transition: "cyan",
  player: "lime",
};

// room is stored in saved for BlocksData
export class RRoomEditor3d {
  constructor(rootEl, store, start = [0, 0, 0], size = [4, 4, 4]) {
    this.rootEl = rootEl;
    this.store = store;

    this.start = start;
    this.size = size;

    this.spritesheet = new JSpriteSheet([]);
    this.engine = null;
    this.blocksData = null;
    this.debugMesh = null;
    this.jraycaster = null;
    this.eventManager = null;
    this.mouseControls = null;
    this.jblocksMeshBuilder = null;
    this.jspritesMeshBuilder = null;

    this.tool = tools[0]; // null,block,sprite,message,transition
    this.moved = false;
    this.sprite = "grass";
    this.sizeEl = null;

    this.interval = null;

    this._init();

    this.store
      .select(selectors.selectSprites)
      .pipe(
        obslite.operators.jdistinct(),
        obslite.operators.jtap(() => {
          const { sprites, spriteIdx } = store.state;
          console.log("selectSprites", sprites);
          const ss = new JSpriteSheet(document.querySelector(".canvas-debug"));
          ss.generate(sprites);
          this.spritesheet = ss;

          const sprite = sprites[spriteIdx];
          this.sprite = sprite?.name;
          this._generate();
        }),
      )
      .subscribe();
    this.store
      .select(selectors.selectSpriteIdx)
      .pipe(
        obslite.operators.jdistinct(),
        obslite.operators.jtap(() => {
          const { sprites, spriteIdx } = store.state;
          const sprite = sprites[spriteIdx];
          this.sprite = sprite?.name;
        }),
      )
      .subscribe();

    obslite.operators
      .jmerge(
        this.store
          .select(selectors.selectRooms)
          .pipe(obslite.operators.jdistinct()),
        this.store
          .select(selectors.selectRoomIdx)
          .pipe(obslite.operators.jdistinct()),
      )
      .pipe(
        obslite.operators.jtap(() => {
          const { rooms, roomIdx } = store.state;
          const room = rooms[roomIdx];
          if (!room) {
            return;
          }
          if (!jdeepEqual(rooms.data, this.blocksData.saved)) {
            this.blocksData.saved = jdeepCopy(room.data);
            this.size = room.size;
            this.sizeEl.value = room.size[0];
            this._generate();
          }
        }),
      )
      .subscribe();
  }
  _init() {
    this._initControls();
    this._initThree();
  }

  _initControls() {
    this.rootEl.appendChild(
      JElementBuilder.addSelect("tool", tools, (e) => {
        // console.log("value", e.target.value);
        this.tool = e.target.value;
        this._generate();
      }),
    );

    this.rootEl.appendChild(
      JElementBuilder.addButton("clear", () => {
        // TODO: add confirm
        const { rooms, roomIdx } = this.store.state;
        const room = rooms[roomIdx];
        if (!room) {
          return;
        }
        const confirmed = confirm(`Delete room ${room.name}`);
        if (!confirmed) {
          return;
        }
        this.blocksData.clear();
        this._generate();
      }),
    );

    this.rootEl.appendChild(
      JElementBuilder.addButton("rename", () => {
        const { rooms, roomIdx } = this.store.state;
        const room = rooms[roomIdx];
        if (!room) {
          return;
        }
        const name = prompt("Room name", room.name)?.trim();
        if (!name) {
          return;
        }
        const newRoom = { ...room, name };
        const newRooms = obslite.utils.jupdateByIdx(roomIdx, newRoom, rooms);

        this.store.dispatch({
          type: ACTION_TYPES.ROOMS_UPDATE,
          payload: newRooms,
        });
      }),
    );

    this.rootEl.appendChild(
      JElementBuilder.addButton("save", () => {
        const { rooms, roomIdx } = this.store.state;
        const room = rooms[roomIdx];
        if (!room) {
          return;
        }
        const newRoom = {
          ...room,
          data: jdeepCopy(this.blocksData.saved),
          size: jdeepCopy(this.size),
        };
        const newRooms = obslite.utils.jupdateByIdx(roomIdx, newRoom, rooms);
        this.store.dispatch({
          type: ACTION_TYPES.ROOMS_UPDATE,
          payload: newRooms,
        });
      }),
    );
    this.rootEl.appendChild(
      JElementBuilder.addButton("add", () => {
        const name = prompt("Room name: ", "")?.trim();
        if (!name) {
          return;
        }
        this.__addRoom(name);
        // const { rooms } = this.store.state;
        // const newRoom = {
        //   name,
        //   data: jdeepCopy(this.blocksData.saved),
        //   size: jdeepCopy(this.size),
        // };
        // const newRooms = [...rooms, newRoom];
        // this.store.dispatch({
        //   type: ACTION_TYPES.ROOMS_UPDATE,
        //   payload: newRooms,
        // });
        // this.store.dispatch({
        //   type: ACTION_TYPES.ROOM_SELECT,
        //   payload: newRooms.at(-1),
        // });
      }),
    );

    this.rootEl.appendChild(
      JElementBuilder.addButton("delete", () => {
        const { rooms, roomIdx } = this.store.state;
        const room = rooms[roomIdx];
        if (!room) {
          return;
        }
        const newRooms = rooms.filter((r) => r !== room);
        const newRoomIdx = Math.max(0, roomIdx - 1);
        this.store.dispatch({
          type: ACTION_TYPES.ROOMS_UPDATE,
          payload: newRooms,
        });
        this.store.dispatch({
          type: ACTION_TYPES.ROOM_SELECT,
          payload: newRooms[newRoomIdx],
        });
      }),
    );

    this.rootEl.appendChild(
      JElementBuilder.addButton("reset", () => {
        const { sprites } = this.store.state;
        this.blocksData.clear();
        for (let x = 0; x < this.size[0]; x++) {
          for (let z = 0; z < this.size[2]; z++) {
            this._setValue([x, 0, z], "tile", sprites[1].name);
          }
        }
        this._setValue([0, 1, 0], "tile", sprites[1].name + "$0_1_1");
        this._setValue([1, 1, 0], "tile", sprites[1].name);
        this._setValue([2, 1, 0], "tile", sprites[1].name);
        this._setValue([0, 2, 0], "sprite", sprites[0].name);
        this._setValue([2, 2, 0], "sprite", sprites[2].name);
        this._setValue([2, 2, 0], "message", "Hi!");
        this._setValue([0, 2, 0], "player", true);
        this._generate();
      }),
    );

    {
      this.sizeEl = JElementBuilder.addInput(
        (input) => {
          input.classList.add("input");
          input.type = "number";
          input.min = 4;
          input.max = 16;
          input.value = this.size[0];
        },
        (e) => {
          const size = Math.min(16, Math.max(4, +e.target.value));
          e.target.value = size;
          this.size = [size, size, size];
          this._generate();
        },
      );
      const label = document.createElement("label");
      label.textContent = "size:";
      label.appendChild(this.sizeEl);
      this.rootEl.appendChild(label);
    }
  }

  _initThree() {
    const container = document.createElement("div");
    container.classList.add("three-container");
    this.rootEl.appendChild(container);

    this.engine = new JEngine(container);
    this.engine.init();
    this.engine.start();

    this.blocksData = new JBlocksDataRanges([]);
    this.debugMesh = new JBlocksDebug(this.size);
    // generate
    this.engine.scene.add(this.debugMesh.meshGroup);

    this.jraycaster = new JRaycaster(16);
    this.jraycaster.generate();
    this.engine.scene.add(this.jraycaster.meshGroup);

    this.eventManager = new EventManager(container);
    this.mouseControls = new MouseControls(this.eventManager);
    this.mouseControls.activate();

    this.mouseControls.onMouseMove = (pos) => this._handleMouseMove(pos);
    this.mouseControls.onMouseDown = () => this._handleMouseDown();
    this.mouseControls.onMouseUp = (button) => this._handleMouseUp(button);

    this.lights = new JLights({});
    this.engine.scene.add(this.lights.meshGroup);

    this.jblocksMeshBuilder = new JBlocksMeshBuilder(true);
    this.engine.scene.add(this.jblocksMeshBuilder.mesh);

    this.jspritesMeshBuilder = new JSpritesMeshBuilder();
    this.engine.scene.add(this.jspritesMeshBuilder.meshGroup);

    this.engine.onUpdate = (dt) => this._handleUpdate(dt);
    this._generate();
  }

  _handleUpdate(dt) {
    const predicateFn = (pos) => this._raycasterPredicateFn(pos);
    this.jraycaster.update(predicateFn, this.engine.camera);
    if (Object.keys(this.blocksData.changes).length) {
      console.log("regenerate");
      this._generate();
    }
    this.jspritesMeshBuilder.update(this.engine.camera.position);
  }
  _raycasterPredicateFn(pos) {
    if (this.tool === "tile" && pos[1] === -1) {
      return true;
    }
    const data = this.blocksData.at(pos);
    if (!data) {
      return false;
    }
    if (this.tool === "tile" || this.tool === "sprite") {
      return data.tile || data.sprite;
    } else if (
      this.tool === "slide" ||
      this.tool === "message" ||
      this.tool === "transition"
    ) {
      return data.tile || data[this.tool];
    } else if (this.tool === "player") {
      return data.sprite;
    }
  }
  _handleMouseDown() {
    this.moved = false;
  }
  _handleMouseMove(pos) {
    this.moved = true;
    this.jraycaster.mouseV.set(...pos);
  }
  _handleMouseUp(button) {
    if (this.moved) {
      return;
    }
    if (button === 2) {
      this._handleRemove();
    } else {
      if (this.tool === "player") {
        this._handleAddPlayer();
      } else if (this.tool === "slide") {
        this._handleAddSlide();
      } else {
        this._handleAdd();
      }
    }
  }
  _handleRemove() {
    const cell = this.jraycaster.cell;
    if (!checkInside(cell, this.start, this.size)) {
      return;
    }
    this._setValue(cell, this.tool, null);
  }
  _handleAdd() {
    const isTileSprite = this.tool === "tile" || this.tool === "sprite";
    // const cell = isTileSprite ? this.jraycaster.cellAdd : this.jraycaster.cell;
    const cell = this.jraycaster.cellAdd;
    if (!checkInside(cell, this.start, this.size)) {
      return;
    }
    if (isTileSprite) {
      const value = this.sprite;
      this._setValue(cell, this.tool, value);
    } else {
      const prevValue = this._getValue(cell, this.tool) ?? "";
      const value = prompt(`Enter ${this.tool}:`, prevValue)?.trim();
      if (!value) {
        return;
      }
      this._setValue(cell, this.tool, value);
    }
  }
  _handleAddPlayer() {
    // remove player
    Object.values(this.blocksData.saved).forEach((data) => {
      if (data?.player) {
        data.player = null;
      }
    });
    const cell = this.jraycaster.cell;
    this._setValue(cell, this.tool, true);
  }
  _handleAddSlide() {
    // remove player
    const cell = this.jraycaster.cell;
    if (!checkInside(cell, this.start, this.size)) {
      return;
    }
    const tile = this._getValue(cell, "tile");
    if (!tile) {
      return;
    }
    const slideMap = {
      "-1_1_0": "1_1_0",
      "1_1_0": "0_1_-1",
      "0_1_-1": "0_1_1",
      "0_1_1": "",
    };
    const parts = tile.split("$");
    if (parts.length === 1) {
      this._setValue(cell, "tile", tile + "$-1_1_0");
    } else {
      let ntile = parts[0];
      const next = slideMap[parts[1]];
      if (next) {
        ntile += "$" + next;
      }
      this._setValue(cell, "tile", ntile);
    }
  }
  _generate() {
    this.blocksData.save();
    this.debugMesh.resize(this.size);
    this.debugMesh.generate((pos) => {
      const val = this._getValue(pos, this.tool);
      return val && (tool2color[this.tool] || "red");
    }, tool2scale[this.tool] ?? 0.5);

    const pos2nameFn = (pos) => this._getValue(pos, "tile");
    this.jblocksMeshBuilder.generate(
      this.spritesheet,
      pos2nameFn,
      this.start,
      this.size,
    );
    const pos2nameSpriteFn = (pos) => this._getValue(pos, "sprite");
    this.jspritesMeshBuilder.generate(
      this.spritesheet,
      pos2nameSpriteFn,
      this.start,
      this.size,
    );

    if (this.interval) {
      clearInterval(this.interval);
    }
    this.interval = setInterval(() => {
      if (this.spritesheet) {
        this.spritesheet.texture.offset.set(
          this.spritesheet.frame / this.spritesheet.frames,
          0,
        );
        this.spritesheet.frame =
          (this.spritesheet.frame + 1) % this.spritesheet.frames;
      }
    }, 500);
  }
  _getValue(pos, key) {
    const data = this.blocksData.at(pos);
    return data && data[key];
  }
  _setValue(pos, key, value) {
    const data = this.blocksData.at(pos) || {};
    data[key] = value;
    this.blocksData.set(pos, { ...data });
  }

  __addRoom(name) {
    const { rooms } = this.store.state;
    const newRoom = {
      name,
      data: jdeepCopy(this.blocksData.saved),
      size: jdeepCopy(this.size),
    };
    const newRooms = [...rooms, newRoom];
    this.store.dispatch({
      type: ACTION_TYPES.ROOMS_UPDATE,
      payload: newRooms,
    });
    this.store.dispatch({
      type: ACTION_TYPES.ROOM_SELECT,
      payload: newRooms.at(-1),
    });
  }
}
