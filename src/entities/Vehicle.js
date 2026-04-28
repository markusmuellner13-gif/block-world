import * as THREE from 'three';

const CAR_SPEED    = 18;
const CAR_REVERSE  = 8;
const CAR_TURN     = 1.8;
const CAR_GRAVITY  = -20;
const CAR_FRICTION = 0.85;

export class Vehicle {
  constructor(position, world) {
    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.world    = world;
    this.speed    = 0;
    this.yaw      = 0;
    this.occupied = false;
    this.driver   = null;
    this.onGround = true;

    this.group = new THREE.Group();
    this._buildModel();
    this.group.position.copy(this.position);
  }

  _mat(color, rough = 0.7) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: rough < 0.5 ? 0.6 : 0.1 });
  }

  _buildModel() {
    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.6, 3.4),
      this._mat(0xcc2222, 0.4)
    );
    body.position.y = 0.55;
    this.group.add(body);

    // Roof / cabin
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.55, 1.8),
      this._mat(0xdd3333, 0.4)
    );
    cabin.position.set(0, 1.1, 0.1);
    this.group.add(cabin);

    // Windows
    const winMat = this._mat(0x88bbff, 0.1);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.45, 0.05), winMat);
    windshield.position.set(0, 1.1, 1.0);
    this.group.add(windshield);

    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.4, 0.05), winMat);
    rearWindow.position.set(0, 1.1, -0.8);
    this.group.add(rearWindow);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.22, 12);
    const wheelMat = this._mat(0x222222, 0.9);
    const hubMat   = this._mat(0x888888, 0.3);
    const hubGeo   = new THREE.CylinderGeometry(0.15, 0.15, 0.24, 8);

    const wheelPos = [
      [-0.9, 0, 1.1], [0.9, 0, 1.1],
      [-0.9, 0, -1.1], [0.9, 0, -1.1],
    ];
    this._wheels = [];
    for (const [wx, wy, wz] of wheelPos) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy + 0.38, wz);
      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wx, wy + 0.38, wz);
      this.group.add(wheel, hub);
      this._wheels.push(wheel);
    }

    // Headlights
    const hlMat = this._mat(0xffff88, 0.1);
    const hlGeo = new THREE.BoxGeometry(0.3, 0.2, 0.05);
    [-0.55, 0.55].forEach(hx => {
      const hl = new THREE.Mesh(hlGeo, hlMat);
      hl.position.set(hx, 0.6, 1.72);
      this.group.add(hl);
    });

    // Bumpers
    const bumpMat = this._mat(0x888888, 0.2);
    const frontBump = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 0.12), bumpMat);
    frontBump.position.set(0, 0.28, 1.76);
    const rearBump = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 0.12), bumpMat);
    rearBump.position.set(0, 0.28, -1.76);
    this.group.add(frontBump, rearBump);
  }

  enter(player) {
    this.occupied = true;
    this.driver   = player;
  }

  exit() {
    this.occupied = false;
    this.driver   = null;
  }

  update(dt, controls, camera) {
    if (this.occupied && controls) {
      const { fx, fz } = controls.getMovement();

      // fz < 0 = forward, fz > 0 = reverse
      if (fz < 0) this.speed = Math.min(this.speed + CAR_SPEED * dt, CAR_SPEED);
      else if (fz > 0) this.speed = Math.max(this.speed - CAR_REVERSE * dt, -CAR_REVERSE);
      else this.speed *= CAR_FRICTION;

      if (Math.abs(this.speed) > 0.1) {
        this.yaw -= fx * CAR_TURN * dt * (this.speed / CAR_SPEED);
      }
    } else {
      this.speed *= CAR_FRICTION;
    }

    // Direction
    this.velocity.x = Math.sin(this.yaw) * this.speed;
    this.velocity.z = Math.cos(this.yaw) * this.speed;

    // Gravity
    if (!this.onGround) this.velocity.y += CAR_GRAVITY * dt;

    // Apply
    const nx = this.position.x + this.velocity.x * dt;
    const nz = this.position.z + this.velocity.z * dt;
    const ny = this.position.y + this.velocity.y * dt;

    const floorY = this.world.getSurfaceHeight(Math.floor(nx), Math.floor(nz));
    if (ny <= floorY) {
      this.position.y = floorY;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.position.y = ny;
      this.onGround = false;
    }
    this.position.x = nx;
    this.position.z = nz;

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;

    // Spin wheels with speed
    for (const w of this._wheels) {
      w.rotation.x += this.speed * dt * 0.5;
    }

    // Attach driver to car
    if (this.driver) {
      this.driver.position.set(
        this.position.x,
        this.position.y + 1.2,
        this.position.z
      );
      if (camera) {
        camera.position.set(
          this.position.x - Math.sin(this.yaw) * 8,
          this.position.y + 4,
          this.position.z - Math.cos(this.yaw) * 8
        );
        camera.lookAt(this.position);
      }
    }
  }

  get distanceTo() {
    return (pos) => this.position.distanceTo(pos);
  }
}
