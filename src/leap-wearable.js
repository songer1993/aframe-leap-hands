module.exports = AFRAME.registerComponent('leap-wearable', {
  schema: {
    hand: {
      type: 'selector',
    },
    finger: {
      type: 'boolean',
      default: false
    },
    fingerId: {
      type: 'number',
      default: 1,
      oneOf: [0, 1, 2, 3, 4]
    },
    distance: {
      type: 'number',
      default: 0
    },
    lookAtOrigin: {
      type: 'boolean',
      default: true
    }
  },

  init: function () {
    if (this.data.hand) {
      this.handEl = this.data.hand;
    } else {
      this.handEl = this.el.parentNode;
    }
  },

  update: function () {
    if (this.data.by) {
      this.handEl = this.data.by;
    } else {
      this.handEl = this.el.parentNode;
    }
  },

  remove: function () {
    this.handEl = null;
  },

  tick: function () {
    const handComp = this.handEl.components['leap-hand'];
    const hand = handComp.getHand();

    if (hand && hand.valid) {
      if (this.data.finger) {
        const finger = handComp.getFinger(hand, this.data.fingerId);
        const origin = new THREE.Vector3();
        const position = new THREE.Vector3();

        origin.fromArray(finger.tipPosition);
        position.copy(origin);
        this.el.object3D.position.set(position.x, position.y, position.z);
      } else {
        const origin = new THREE.Vector3();
        const palmNormal = new THREE.Vector3();
        const direction = new THREE.Vector3();
        const position = new THREE.Vector3();
        const distance = new THREE.Vector3();

        origin.fromArray(hand.palmPosition);
        palmNormal.fromArray(hand.palmNormal);
        direction.fromArray(hand.direction).divideScalar(2).add(palmNormal).normalize();
        distance.copy(direction).multiplyScalar(this.data.distance);
        position.copy(origin).add(distance);
        this.el.object3D.position.set(position.x, position.y, position.z);
        if (this.data.lookAtOrigin) {
          this.el.object3D.lookAt(origin);
        }

        if (this.el.components['raycaster'] !== undefined) {
          this.el.setAttribute('raycaster', {
            'origin': origin,
            'direction': direction
          });
        }
      }
    }
  }

});