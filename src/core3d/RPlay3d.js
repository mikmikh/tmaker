import * as THREE from "three";
import { JSpriteSheet } from "../utils/JSpriteSheet.js";
import { EventManager, KeyboardControls } from "../utils/keyboard.js";
import {
  checkInside,
  jdeepCopy,
  jdeepEqual,
  jkey2pos,
  jpos2key,
  equalV,
} from "../utils/utils.js";
import {
  createGeo,
  createSpriteGeoData,
  JBlocksDebug,
  JBlocksMeshBuilder,
  JSpritesMeshBuilder,
  rotateMeshToCamera,
} from "./blocks-mesh.js";
import { JBlocksDataRanges } from "./blocks-model.js";
import { JEngine } from "./engine.js";
import { JPhysics } from "../utils/JPhysics.js";
import { JLights } from "../utils/JLights.js";

// room is stored in saved for BlocksData
export class RPlay3d {
  constructor(rootEl, start = [0, 0, 0], size = [4, 4, 4]) {
    this.rootEl = rootEl;

    this.start = start;
    this.size = size;

    this.rooms = null;
    this.spritesheet = new JSpriteSheet([]);

    this.engine = null;
    this.blocksData = null;
    this.debugMesh = null;
    this.jblocksMeshBuilder = null;
    this.jspritesMeshBuilder = null;

    this.keyboard = null;
    this.jphysics = null;
    this.player = null;

    this.interval=null;

    this._init();
  }
  setState(rooms, spritesheet) {
    this.rooms = rooms;
    this.spritesheet = spritesheet;
  }
  startGame() {
    this.engine.stop();
    this.engine.start();
    this.keyboard.activate();
    this._setRoom(this.rooms[0]);
    this.blocksData.changes["dummy"] = true;
  }
  stopGame() {
    this.engine.stop();
    this.keyboard.deactivate();
  }
  _init() {
    const container = document.createElement("div");
    container.classList.add("three-container");
    this.rootEl.appendChild(container);

    this.engine = new JEngine(container);
    this.engine.init();
    // this.engine.start();

    this.blocksData = new JBlocksDataRanges([]);

    this.debugMesh = new JBlocksDebug(this.size);
    this.engine.scene.add(this.debugMesh.meshGroup);

    this.lights = new JLights({});
    this.engine.scene.add(this.lights.meshGroup);

    this.jblocksMeshBuilder = new JBlocksMeshBuilder(true);
    this.engine.scene.add(this.jblocksMeshBuilder.mesh);

    this.jspritesMeshBuilder = new JSpritesMeshBuilder();
    this.engine.scene.add(this.jspritesMeshBuilder.meshGroup);

    this.keyboard = new KeyboardControls(new EventManager());
    // const key2offset = {
    //   a: [0, -1],
    //   d: [0, 1],
    //   w: [1, 0],
    //   s: [-1, 0],
    // };
    // Object.keys(key2offset).forEach((key) => {
    //   const offset = key2offset[key];
    //   this.keyboard.addOnKeydown(key, () => {
    //     if (!this.player) {
    //       return;
    //     }
    //     const forward = new THREE.Vector3();
    //     this.engine.camera.getWorldDirection(forward);
    //     forward.y = 0;
    //     // if (Math.abs(forward.x) >= Math.abs(forward.z)) {
    //     //   forward.z = 0;
    //     // } else {
    //     //   forward.x = 0;
    //     // }
    //     forward.normalize();
    //     const up = new THREE.Vector3(0, 1, 0);
    //     const right = new THREE.Vector3();
    //     right.crossVectors(forward, up).normalize();
    //     forward.multiplyScalar(offset[0]);
    //     right.multiplyScalar(offset[1]);

    //     forward.add(right);
    //     const off = Object.values(forward);
    //     const speed = 10;
    //     off.forEach((v, i) => {
    //       this.player.velocity[i] += off[i] * speed;
    //     });

    //     // const npos = this.player.pos.map((v, i) => v + off[i]);
    //     // this._handleMoveToPos(npos);
    //   });
    // });

    this.jphysics = new JPhysics();

    this.player = {
      pos: [0, 0, 0],
      size: [0.95, 0.95, 0.95],
      mesh: new THREE.Mesh(),
      velocity: [0, 0, 0],
      cell: null,
      start: null,
    };
    this.engine.scene.add(this.player.mesh);

    this.engine.onUpdate = (dt) => this._handleUpdate(dt);
  }

  _handleUpdate(dt) {
    if (Object.keys(this.blocksData.changes).length) {
      console.log("regenerate");
      this._generate();
    }
    this.jspritesMeshBuilder.update(this.engine.camera.position);
    if (this.player.mesh) {
      this.player.mesh.position.set(...this.player.pos.map((v) => v + 0.5));
    }
    rotateMeshToCamera(this.player.mesh, this.engine.camera.position);

    this._updatePlayer(dt);
  }
  _updatePlayer(dt) {
    dt = Math.min(0.02, dt);
    const pos2nameFn = (pos) => this._getValue(pos, "tile");
    this.jphysics.update(dt, [this.player], pos2nameFn);

    this._updateControls(dt);
    const cell = this.player.pos.map((v) => Math.floor(v + 0.5));
    if (!equalV(cell, this.player.cell)) {
      this.player.cell = cell;
      this._handleMoveToPos(cell);
    }
    if (this.player.pos[1] < 0) {
      this.player.pos = [...this.player.start];
    }
  }
  _updateControls(dt) {
    if (!this.player) {
      return;
    }
    const { keyStates } = this.keyboard;
    const key2offset = {
      a: [0, -1],
      d: [0, 1],
      w: [1, 0],
      s: [-1, 0],
    };
    const speed = 100;

    Object.keys(key2offset).forEach((key) => {
      if (!keyStates[key]) {
        return;
      }
      const offset = key2offset[key];

      const forward = new THREE.Vector3();
      this.engine.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3();
      right.crossVectors(forward, up).normalize();
      forward.multiplyScalar(offset[0]);
      right.multiplyScalar(offset[1]);

      forward.add(right);
      const off = Object.values(forward);

      off.forEach((v, i) => {
        this.player.velocity[i] += off[i] * speed * dt;
      });
    });
  }
  _generate() {
    this.blocksData.save();
    this.debugMesh.generate((pos) => {
      const data = this.blocksData.at(pos);
      if (!data) {
        return null;
      }
      const haveValue = Object.values(data).some(Boolean);
      return haveValue && "red";
    });

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
  // play
  _handleMoveToPos(npos) {
    if (!checkInside(npos, this.start, this.size)) {
      return;
    }
    // this.player.pos = npos;
    // this.player.mesh?.position.set(...npos.map((v) => v + 0.5));
    // TODO: move player mesh
    const data = this.blocksData.at(npos);
    if (!data) {
      return;
    }
    // NOTE: schedule to display player first
    if (data.message) {
      this.player.velocity = [0, 0, 0];
      this.keyboard.reset();
      alert(data.message);
    }
    if (data.transition) {
      this.player.velocity = [0, 0, 0];
      this.keyboard.reset();
      const nextRoom = this.rooms.find((r) => r.name === data.transition);
      if (nextRoom === this.currentRoomName) {
        alert("room transition loop");
        return;
      }
      const success = this._setRoom(nextRoom);
    }
  }

  _setRoom(room) {
    this.size=room.size;
    this.debugMesh.resize(room.size);
    this.blocksData.saved = jdeepCopy(room.data);
    this.blocksData.changes["dummy"] = true;
    // find player sprite
    // setup mesh
    for (const key of Object.keys(this.blocksData.saved)) {
      const data = this.blocksData.saved[key];
      if (!data.player) {
        continue;
      }
      const pos = jkey2pos(key);
      this.player.pos = [...pos];
      this.player.start = [...pos];
      this.player.cell = [...pos];
      this._setPlayer(data.sprite);

      data.player = false;
      data.sprite = null;
      break;
    }
  }
  _setPlayer(name) {
    if (this.player.mesh) {
      this.player.mesh.geometry.dispose();
      this.player.mesh.material.dispose();
    }
    const { name2uv, texture } = this.spritesheet;
    const { start, size } = name2uv[name];
    const geoData = createSpriteGeoData(start, size);
    const geo = createGeo(geoData);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: true,
    });
    this.player.mesh.geometry = geo;
    this.player.mesh.material = mat;
  }
}
