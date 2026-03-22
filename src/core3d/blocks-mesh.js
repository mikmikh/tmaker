import * as THREE from "three";
import * as jutils from "../utils/utils.js";

// THREE
export function createGeo(data) {
  const { vertices, normals, uvs, idxs } = data;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3),
  );
  geo.setAttribute(
    "normal",
    new THREE.BufferAttribute(new Float32Array(normals), 3),
  );
  geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(idxs), 1));
  return geo;
}

// UVs
// 0,1  1,1
//
// 0,0  1,0

// Plane
// -w/2, h/2  w/2, h/2
//
// -w/2,-h/2  w/2,-h/2
// idxs
// 2.tl 3.tr
// 0.bl 1.br
// bl br tl, tl br tr
// 0 1 2, 2 1 3
export function createSpriteGeoData(uvStart, uvSize, uvTotalSize = [1, 1]) {
  const vertices = [
    [-0.5, -0.5, 0], // bl
    [0.5, -0.5, 0], // br
    [-0.5, 0.5, 0], // tl
    [0.5, 0.5, 0], // tr
  ];
  const normal = [0, 0, 1];
  const idxs = [0, 1, 2, 2, 1, 3];
  const uvOffsets = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];
  const uvs = uvOffsets.map((off, oi) =>
    uvStart.map((_, i) => uvStart[i] + (off[i] * uvSize[i]) / uvTotalSize[i]),
  );
  const data = {
    vertices: vertices.flat(),
    normals: vertices.map(() => normal).flat(),
    uvs: uvs.flat(),
    idxs,
  };

  return data;
}

export function disposeMeshGroup(meshGroup) {
  const meshes = [];
  meshGroup.traverse((obj) => {
    if (!obj.isMesh) {
      return;
    }
    obj.geometry?.dispose();
    obj.material?.dispose();
    meshes.push(obj);
  });
  meshes.forEach((mesh) => {
    meshGroup.remove(mesh);
  });
  meshGroup.clear();
}

export class JBlocksDebug {
  constructor(size) {
    this.size = size;
    this.meshGroup = new THREE.Group();
  }
  resize(size) {
    this.size=size;
  }
  dispose() {
    disposeMeshGroup(this.meshGroup);
  }
  generate(pos2colorFn, scale = 0.5) {
    this.dispose();
    this.generateBoundingBox();
    this.generateBlocks(pos2colorFn, scale);
  }
  generateBoundingBox() {
    const [xs, ys, zs] = this.size;
    const geo = new THREE.BoxGeometry(xs, ys, zs, xs, ys, zs);
    const mat = new THREE.MeshBasicMaterial({
      wireframe: true,
      color: 0xff00ff,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(xs / 2, ys / 2, zs / 2);
    this.meshGroup.add(mesh);
  }
  generateBlocks(pos2colorFn, scale = 0.5) {
    const [xs, ys, zs] = this.size;
    const color2cells = {};
    for (let y = 0; y < ys; y++) {
      for (let z = 0; z < zs; z++) {
        for (let x = 0; x < xs; x++) {
          const pos = [x, y, z];
          const color = pos2colorFn(pos);
          if (!color) {
            continue;
          }
          if (!(color in color2cells)) {
            color2cells[color] = [];
          }
          color2cells[color].push(pos);
        }
      }
    }

    const geo = new THREE.BoxGeometry();
    const dummy = new THREE.Object3D();
    dummy.scale.set(scale, scale, scale);
    Object.keys(color2cells).forEach((color) => {
      const mat = new THREE.MeshBasicMaterial({
        wireframe: true,
        color,
      });
      const cells = color2cells[color];
      const imesh = new THREE.InstancedMesh(geo, mat, cells.length);
      cells.forEach(([x, y, z], i) => {
        dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
        dummy.updateMatrix();
        imesh.setMatrixAt(i, dummy.matrix);
      });
      imesh.instanceMatrix.needsUpdate = true;
      this.meshGroup.add(imesh);
    });
  }
}

export class JBlocksGeoBuilder {
  constructor() {
    this.geoData = null;
    this.reset();
  }
  reset() {
    this.geoData = {
      vertices: [],
      normals: [],
      uvs: [],
      idxs: [],
      idx: 0,
    };
  }
  addBlockSide(spritesheet, name, cell, normal, offset = 0.5, scale = [1, 1]) {
    this._addPlane(spritesheet, name, cell, normal, offset, scale);
  }
  addSprite(spritesheet, cell, name) {
    const normals = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    normals.forEach((normal) => {
      this._addPlane(spritesheet, name, cell, normal, 0);
    });
  }
  addTri(spritesheet, name, cell, normal, type) {
    const { name2uv, size: tsize } = spritesheet;
    const uvStartSize = name2uv[name];
    if (!uvStartSize) {
      return;
    }
    uvStartSize.size[0] = 16 / tsize[0];

    _appendTriGeo(this.geoData, cell, normal, 0.5, uvStartSize, type);
  }
  _addPlane(spritesheet, name, cell, normal, offset = 0.5, scale = [1, 1]) {
    const { name2uv, size: tsize } = spritesheet;
    const uvStartSize = name2uv[name];
    if (!uvStartSize) {
      return;
    }
    uvStartSize.size[0] = 16 / tsize[0]; // NOTE: first frame fix
    _appendPlaneGeo(
      this.geoData,
      cell,
      normal,
      offset,
      uvStartSize,
      [1, 1],
      scale,
    );
  }
}

export class JInstancedSpritesBuilder {
  constructor() {
    this.meshGroup = new THREE.Group();
    this.sname2cells = {};
    this.sname2imesh = {};
  }
  add(cell, name) {
    if (!(name in this.sname2cells)) {
      this.sname2cells[name] = [];
    }
    this.sname2cells[name].push(cell);
  }
  dispose() {
    disposeMeshGroup(this.meshGroup);
    this.sname2cells = {};
    this.sname2imesh = {};
  }
  generate(spritesheet) {
    const dummy = new THREE.Object3D();
    Object.keys(this.sname2cells).forEach((name) => {
      const cells = this.sname2cells[name];
      const count = cells.length;
      const imesh = this._createInstancedSprite(spritesheet, name, count);
      this.sname2imesh[name] = imesh;
      cells.forEach((cell, i) => {
        dummy.position.set(...cell.map((v) => v + 0.5));
        dummy.updateMatrix();
        imesh.setMatrixAt(i, dummy.matrix);
      });
      imesh.instanceMatrix.needsUpdate = true;
      this.meshGroup.add(imesh);
    });
  }
  update(cameraPos) {
    const dummy = new THREE.Object3D();
    Object.keys(this.sname2cells).forEach((name) => {
      const cells = this.sname2cells[name];
      const imesh = this.sname2imesh[name];
      cells.forEach((cell, i) => {
        dummy.position.set(...cell.map((v) => v + 0.5));

        rotateMeshToCamera(dummy, cameraPos);

        dummy.updateMatrix();
        imesh.setMatrixAt(i, dummy.matrix);
      });
      imesh.instanceMatrix.needsUpdate = true;
    });
  }
  _createInstancedSprite(spritesheet, name, count) {
    const { name2uv, texture } = spritesheet;
    const { start, size } = name2uv[name];
    const geoData = createSpriteGeoData(start, size);
    const geo = createGeo(geoData);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
    });
    const imesh = new THREE.InstancedMesh(geo, mat, count);
    return imesh;
  }
}

export function rotateMeshToCamera(mesh, cameraPos) {
  const targetPosition = new THREE.Vector3(
    cameraPos.x,
    mesh.position.y, // Keep the plane's Y position fixed
    cameraPos.z,
  );
  mesh.lookAt(targetPosition);
}

export class JBlocksMeshBuilder {
  constructor(lights = false) {
    this.lights = lights;
    this.blocksGeoBuilder = new JBlocksGeoBuilder();
    this.mesh = new THREE.Mesh();
  }
  generate(spritesheet, pos2nameFn, start, size) {
    this.dispose();
    this._addBlocks(spritesheet, pos2nameFn, start, size);
    this._createMesh(spritesheet);
  }

  dispose() {
    this.blocksGeoBuilder.reset();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
  _createMesh(spritesheet) {
    const geoData = this.blocksGeoBuilder.geoData;
    const geo = createGeo(geoData);
    const { texture } = spritesheet;
    let mat = null;
    if (this.lights) {
      mat = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.FrontSide,
        transparent: true,
        depthWrite: true,
      });
    } else {
      mat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.FrontSide,
        transparent: true,
        depthWrite: true,
      });
    }

    this.mesh.geometry.dispose();
    this.mesh.geometry = geo;
    this.mesh.material.dispose();
    this.mesh.material = mat;
  }
  _addBlocks(spritesheet, pos2nameFn, start, size) {
    for (let y_ = 0; y_ < size[1]; y_++) {
      for (let z_ = 0; z_ < size[2]; z_++) {
        for (let x_ = 0; x_ < size[0]; x_++) {
          const localPosition = [x_, y_, z_];
          const position = jutils.addV(start, localPosition);
          let value = pos2nameFn(position);
          // console.log(position,value);
          if (!value) {
            continue;
          }
          if (typeof value === "string" && value.startsWith("@")) {
            this._handleSprite(spritesheet, position, value);
          } else if (value.indexOf("$") !== -1) {
            this._handleSlide(spritesheet, position, value, pos2nameFn);
          } else {
            this._handleBlock(spritesheet, position, value, pos2nameFn);
          }
        }
      }
    }
  }
  _handleSprite(spritesheet, position, value) {
    this.blocksGeoBuilder.addSprite(spritesheet, position, value);
  }
  _handleBlock(spritesheet, position, value, pos2nameFn) {
    const sideNormals = [
      [-1, 0, 0], // -x
      [1, 0, 0], // x
      [0, -1, 0], // -y
      [0, 1, 0], // y
      [0, 0, -1], // -z
      [0, 0, 1], // z
    ];
    for (let i = 0; i < sideNormals.length; i++) {
      const sideNormal = sideNormals[i];
      const nextPosition = jutils.addV(position, sideNormal);
      const nextValue = pos2nameFn(nextPosition);
      if (nextValue === value) {
        continue;
      }
      this.blocksGeoBuilder.addBlockSide(
        spritesheet,
        value,
        position,
        sideNormal,
      );
    }
  }
  _handleSlide(spritesheet, position, value, pos2nameFn) {
    // n[-1,1,0] -> no [-1,0,0], [0,1,0], use tri for [0,0,+-1] sides, no vert [-1,1,+-1]
    // n[1,1,0]
    // n[0,1,-1]
    // n[0,1,1]
    const [name, slideKey] = value.split("$");
    const slides = {
      "-1_1_0": {
        normal: [-1, 1, 0],
        sides: [
          [1, 0, 0],
          [0, -1, 0],
        ],
        tris: [
          ["tl", [0, 0, 1]],
          ["tr", [0, 0, -1]],
        ],
      },
      "1_1_0": {
        normal: [1, 1, 0],
        sides: [
          [-1, 0, 0],
          [0, -1, 0],
        ],
        tris: [
          ["tr", [0, 0, 1]],
          ["tl", [0, 0, -1]],
        ],
      },
      "0_1_-1": {
        normal: [0, 1, -1],
        sides: [
          [0, 0, 1],
          [0, -1, 0],
        ],
        tris: [
          ["tr", [1, 0, 0]],
          ["tl", [-1, 0, 0]],
        ],
      },
      "0_1_1": {
        normal: [0, 1, 1],
        sides: [
          [0, 0, -1],
          [0, -1, 0],
        ],
        tris: [
          ["tl", [1, 0, 0]],
          ["tr", [-1, 0, 0]],
        ],
      },
    };
    const slide = slides[slideKey];
    this.blocksGeoBuilder.addBlockSide(
      spritesheet,
      name,
      position,
      slide.normal,
      0,
      [1, 0.5],
    );
    slide.sides.forEach((sideNormal) => {
      this.blocksGeoBuilder.addBlockSide(
        spritesheet,
        name,
        position,
        sideNormal,
        0.5,
      );
    });
    slide.tris.forEach(([type, sideNormal]) => {
      this.blocksGeoBuilder.addTri(
        spritesheet,
        name,
        position,
        sideNormal,
        type,
      );
    });
  }
}

export class JSpritesMeshBuilder {
  constructor() {
    this.instancedSpritesBuilder = new JInstancedSpritesBuilder();
  }
  get meshGroup() {
    return this.instancedSpritesBuilder.meshGroup;
  }
  generate(spritesheet, pos2nameFn, start, size) {
    this.dispose();
    this._addBlocks(pos2nameFn, start, size);
    this.instancedSpritesBuilder.generate(spritesheet);
  }
  update(cameraPos) {
    this.instancedSpritesBuilder.update(cameraPos);
  }
  dispose() {
    this.instancedSpritesBuilder.dispose();
  }

  _addBlocks(pos2nameFn, start, size) {
    for (let y_ = 0; y_ < size[1]; y_++) {
      for (let z_ = 0; z_ < size[2]; z_++) {
        for (let x_ = 0; x_ < size[0]; x_++) {
          const localPosition = [x_, y_, z_];
          const position = jutils.addV(start, localPosition);
          const value = pos2nameFn(position);
          if (!value) {
            continue;
          }
          this.instancedSpritesBuilder.add(position, value);
        }
      }
    }
  }
}

function _appendPlaneGeo(
  geoData,
  cell,
  normal,
  offset,
  uvStartSize,
  tSize,
  scale = [1, 1],
) {
  const vCell = new THREE.Vector3(...cell);
  const vNormal = new THREE.Vector3(...normal);
  let vUp =
    vNormal.y === 0
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(vNormal.y, 0, 0);
  if (normal.filter((v) => v !== 0).length > 1) {
    vUp = new THREE.Vector3(...normal);
    vUp.x *= -1;
    vUp.z *= -1;
  }
  const vRight = vNormal.clone().multiplyScalar(-1).cross(vUp);
  // 2.tl 3.tr
  // 0.bl 1.br
  // 0,1,2 2,1,3
  const sideOffsets = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [-0.5, 0.5],
    [0.5, 0.5],
  ];
  const vNormalOffset = vNormal.clone().multiplyScalar(offset).addScalar(0.5);

  sideOffsets.forEach(([roff, uoff]) => {
    const vUpOffset = vUp.clone().multiplyScalar(uoff * scale[0]);
    const vRightOffset = vRight.clone().multiplyScalar(roff * scale[1]);
    const point = vCell
      .clone()
      .add(vRightOffset)
      .add(vUpOffset)
      .add(vNormalOffset);
    geoData.vertices.push(...Object.values(point));
    geoData.normals.push(...Object.values(vNormal));
    geoData.uvs.push(
      (uvStartSize.start[0] + uvStartSize.size[0] * (0.5 + roff)) / tSize[0],
      (uvStartSize.start[1] + uvStartSize.size[1] * (0.5 + uoff)) / tSize[1],
    );
  });

  geoData.idxs.push(
    geoData.idx,
    geoData.idx + 1,
    geoData.idx + 2,
    geoData.idx + 2,
    geoData.idx + 1,
    geoData.idx + 3,
  );
  geoData.idx += 4;
}

// s[-1,1,0] - full:[1,0,0],[0,-1,0]; tri:tl_n[0,0,1],tr_[0,0,-1]
function _appendTriGeo(geoData, cell, normal, offset, uvStartSize, type) {
  const types = ["bl", "br", "tr", "tl"];
  const typeIdx = types.indexOf(type);
  const tSize = [1, 1];
  const vCell = new THREE.Vector3(...cell);
  const vNormal = new THREE.Vector3(...normal);
  const vUp =
    vNormal.y === 0
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(vNormal.y, 0, 0);
  const vRight = vNormal.clone().multiplyScalar(-1).cross(vUp);
  // 3.tl 2.tr
  // 0.bl 1.br
  // bl-1,2,3 br-0,2,3 tr-0,1,3 tl-0,1,2
  const sideOffsets = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ];
  const vNormalOffset = vNormal.clone().multiplyScalar(offset).addScalar(0.5);

  sideOffsets
    .filter((_, i) => i !== typeIdx)
    .forEach(([roff, uoff]) => {
      const vUpOffset = vUp.clone().multiplyScalar(uoff);
      const vRightOffset = vRight.clone().multiplyScalar(roff);
      const point = vCell
        .clone()
        .add(vRightOffset)
        .add(vUpOffset)
        .add(vNormalOffset);
      geoData.vertices.push(...Object.values(point));
      geoData.normals.push(...Object.values(vNormal));
      geoData.uvs.push(
        (uvStartSize.start[0] + uvStartSize.size[0] * (0.5 + roff)) / tSize[0],
        (uvStartSize.start[1] + uvStartSize.size[1] * (0.5 + uoff)) / tSize[1],
      );
    });

  geoData.idxs.push(geoData.idx, geoData.idx + 1, geoData.idx + 2);
  geoData.idx += 3;
}

// const textureLoader = new THREE.TextureLoader();
// export function loadTexture(path, scale = { x: 1, y: 1 }, flipY = false) {
//   const texture = textureLoader.load(path);
//   texture.colorSpace = THREE.SRGBColorSpace;
//   texture.minFilter = THREE.NearestFilter;
//   texture.magFilter = THREE.NearestFilter;
//   texture.wrapS = THREE.RepeatWrapping;
//   texture.wrapT = THREE.RepeatWrapping;
//   texture.repeat.x = 1 / scale.x;
//   texture.repeat.y = 1 / scale.y;
//   texture.flipY = flipY;
//   return texture;
// }
