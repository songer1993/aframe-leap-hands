function HandFinger(fingerMixin) {
  const fingerEl = document.createElement('a-entity');
  fingerEl.setAttribute('mixin', fingerMixin);
  this.el = fingerEl;
}

HandFinger.prototype.update = function (options, hand, id, isHolding) {
  const position = new THREE.Vector3();
  position.fromArray(hand.fingers[id].tipPosition);
  this.el.object3D.position.set(position.x, position.y, position.z);
};

HandFinger.prototype.show = function () {
  this.el.setAttribute('visible', true);
};

HandFinger.prototype.hide = function () {
  this.el.setAttribute('visible', false);
};

module.exports = HandFinger;