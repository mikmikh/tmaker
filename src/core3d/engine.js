import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class JEngine {
  constructor(rootEl = document.body) {
    this.rootEl = rootEl;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.clock = null;
    this.onUpdate = null; // (dt) => void

    // bind
    this._animateBound = this._animate.bind(this);
    this._handleResizeBound = this._handleResize.bind(this);
  }
  getRect() {
    return this.rootEl.getBoundingClientRect();
  }
  init() {
    const rect = this.getRect();
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.setClearColor(0x80a0c0);
    this.rootEl.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, rect.width / rect.height);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.camera.position.set(5, 5, 5);

    const axesHelper = new THREE.AxesHelper(10);
    this.scene.add(axesHelper);

    window.addEventListener("resize", this._handleResizeBound);

    this.running = false;
  }
  start() {
    this.clock = new THREE.Clock();
    this.running=true;
    requestAnimationFrame(this._animateBound);
  }
  stop() {
    this.running = false;
  }
  _animate() {
    if (this.running) {
      requestAnimationFrame(this._animateBound);
    }
    const dt = this.clock.getDelta();

    const controls = this.controls;
    const camera = this.camera;
    controls.update();
    this.renderer.render(this.scene, camera);
    this.onUpdate?.(dt);
  }
  _handleResize() {
    const rect = this.getRect();
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
  }
}
