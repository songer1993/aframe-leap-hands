function HandCursor(cursorMixin, cursorRingMixin) {
  const cursorEl = document.createElement('a-entity');
  cursorEl.setAttribute('mixin', cursorMixin);
  this.el = cursorEl;
  const ringEl = document.createElement('a-entity');
  ringEl.setAttribute('mixin', cursorRingMixin);
  this.ringEl = ringEl;
}

HandCursor.prototype.update = function (options, hand, isHolding) {
  const origin = new THREE.Vector3();
  const palmNormal = new THREE.Vector3();
  const direction = new THREE.Vector3();

  let lookat;

  origin.fromArray(hand.palmPosition);
  palmNormal.fromArray(hand.palmNormal);
  direction.fromArray(hand.direction).divideScalar(2).add(palmNormal).normalize();
  this.el.object3D.position.set(origin.x, origin.y, origin.z);
  this.el.setAttribute('raycaster', {
    'origin': origin,
    'direction': direction
  });

  const position = new THREE.Vector3();
  const distance = new THREE.Vector3();
  distance.copy(direction).multiplyScalar(options.cursorRingDistance);
  position.copy(origin).add(distance);
  this.ringEl.object3D.position.set(position.x, position.y, position.z);
  this.ringEl.object3D.lookAt(origin);

  // const objects = [].slice.call(this.el.sceneEl.querySelectorAll(options.objects))
  //   .map(function (el) {
  //     return el.object3D;
  //   });
  // const intersections = this.intersectObjects(objects, true);
  // if (intersections[0] && intersections[0].object && intersections[0].object.el) {
  //   const intersection = intersections[0];
  //   const worldToLocal = new THREE.Matrix4().getInverse(this.ringEl.object3D.matrixWorld)
  //   const global_normal = intersection.face.normal.clone().applyMatrix4(worldToLocal).normalize();
  //   const position = intersection.point.clone().applyMatrix4(worldToLocal).add(global_normal.multiplyScalar(0.05));
  //   this.ringEl.object3D.position.set(position.x, position.y, position.z);
  //   this.ringEl.object3D.lookAt(origin);
  // } else {
  //   const position = new THREE.Vector3();
  //   const distance = new THREE.Vector3();
  //   distance.copy(direction).multiplyScalar(options.cursorRingDistance);
  //   position.copy(origin).add(distance);
  //   this.ringEl.object3D.position.set(position.x, position.y, position.z);
  //   this.ringEl.object3D.lookAt(origin);
  // }
};

HandCursor.prototype.intersectObjects = function (objects, isRecursive) {
  return this.el.components['raycaster'].raycaster.intersectObjects(objects, isRecursive);
};

HandCursor.prototype.show = function () {
  this.el.setAttribute('visible', true);
  this.ringEl.setAttribute('visible', true);
};

HandCursor.prototype.hide = function () {
  this.el.setAttribute('visible', false);
  this.ringEl.setAttribute('visible', false);
};

module.exports = HandCursor;