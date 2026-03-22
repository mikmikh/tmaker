import * as THREE from "three";
import { disposeMeshGroup } from "./blocks-mesh.js";
import { jddaRaycast3d } from "../utils/dda3d.js";

export class JRaycaster {
  constructor(far) {
    this.far = far;
    this.raycaster = new THREE.Raycaster(
      new THREE.Vector3(),
      new THREE.Vector3(),
      0,
      far,
    );
    this.meshGroup = new THREE.Group();
    this.selectionHelper = null;
    this.selectionHelperAdd = null;
    this.arrowHelper = null;
    this.mouseV = new THREE.Vector2();
    this.cell = [];
  }
  dispose() {
    disposeMeshGroup(this.meshGroup);
  }
  generate() {
    const size = [1.01, 1.01, 1.01];
    const geo = new THREE.BoxGeometry(...size);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const meshAdd = new THREE.Mesh(geo, mat);
    this.selectionHelper = mesh;
    this.selectionHelperAdd = meshAdd;
    this.meshGroup.add(this.selectionHelper);
    this.meshGroup.add(this.selectionHelperAdd);

    this.arrowHelper = new THREE.ArrowHelper(
      this.raycaster.ray.direction,
      this.raycaster.ray.origin,
      this.far,
      0xff0000,
    );
    this.meshGroup.add(this.arrowHelper);
  }

  update(predicateFn, camera) {
    this.arrowHelper.setDirection(this.raycaster.ray.direction);
    this.arrowHelper.position.copy(camera.position);
    this.raycaster.setFromCamera(this.mouseV, camera);
    // console.log('arrowHelper', this.arrowHelper);

    const vRayStart = Object.values(this.raycaster.ray.origin);
    const vRayDir = Object.values(this.raycaster.ray.direction);
    // console.log('vRayStart, vRayDir',vRayStart, vRayDir);

    
    const intersect = jddaRaycast3d(predicateFn, vRayStart, vRayDir, this.far);
    // console.log(res.normal);
    if (!intersect.hit) {
      this.selectionHelper.position.set(0,0,0);
      this.selectionHelperAdd.position.set(0,0,0);
      return;
    }
    const { point, normal } = intersect;
    const cell = point.map((v,i) => Math.floor(v-0.5 * normal[i]));
    this.cell = cell;
    this.cellAdd = cell.map((v,i) => v+normal[i]);// [cell[0] + normal[0], cell[1] + normal[1], cell[2] + normal[2]];
    // console.log(this.cellAdd);
    this.selectionHelper.position.set(...this.cell.map((v) => v + 0.5));
    this.selectionHelperAdd.position.set(...this.cellAdd.map((v) => v + 0.5));

    // const intersects = this.raycaster.intersectObjects(scene.children, true);
    // if (intersects.length === 0) {
    //   this.cell = null;
    //   this.selectionHelper.position.set(0, 0, 0);
    //   return;
    // }
    // const intersect = intersects[0];
    // const { point, normal } = intersect;
    // const cell = [
    //   Math.floor(point.x - 0.5 * normal.x),
    //   Math.floor(point.y - 0.5 * normal.y),
    //   Math.floor(point.z - 0.5 * normal.z),
    // ];
    // this.cell = cell;
    // this.cellAdd = [cell[0] + normal.x, cell[1] + normal.y, cell[2] + normal.z];
    // this.selectionHelper.position.set(...cell.map((v) => v + 0.5));
  }
}
