const FINGER_IDS = {
  thumb: 0,
  index: 1,
  middle: 2,
  ring: 3,
  pinky: 4
};

module.exports = AFRAME.registerComponent('leap-wearable', {
  schema: {
    hand: {
      type: 'selector',
    },
    origin: {
      type: 'string',
      default: 'palm',
      oneOf: ['palm', 'palmEdgeLower', 'palmEdgeMiddle', 'palmEdgeUpper', 'thumb', 'index', 'middle', 'ring', 'pinky']
    },
    direction: {
      type: 'string',
      default: 'palmNormal',
      oneOf: ['palmNormal', 'thumb', 'index', 'middle', 'ring', 'pinky']
    },
    translation: {
      type: "string",
      default: "0 0 0",
      parse: AFRAME.utils.coordinates.parse
    },
    lookAt: {
      type: 'string',
      default: 'end'
    },
    show: {
      type: 'string',
      default: '',
      parse: function (value) {
        return value.split(',');
      }
    },
    hide: {
      type: 'string',
      default: '',
      parse: function (value) {
        return value.split(',');
      }
    },
  },

  init: function () {
    this.handEl = null;

    var bind = AFRAME.utils.bind;
    this.show = bind(this.show, this);
    this.hide = bind(this.hide, this);
    // console.log(this.data.translation);
  },

  update: function () {
    if (this.data.hand) {
      this.handEl = this.data.hand;
    } else {
      this.handEl = this.el.parentNode;
    }
  },

  play: function () {
    this.show();
    this.addEventListeners();
  },

  remove: function () {
    this.hide();
    this.removeEventListeners();
  },

  pause: function () {
    this.removeEventListeners();
  },

  addEventListeners() {
    for (let i = 0; i < this.data.show.length; i++) {
      this.el.addEventListener(this.data.show[i], this.show);
    }
    for (let i = 0; i < this.data.hide.length; i++) {
      this.el.addEventListener(this.data.hide[i], this.hide);
    }
  },

  removeEventListeners() {
    for (let i = 0; i < this.data.show.length; i++) {
      this.el.removeEventListener(this.data.show[i], this.show);
    }
    for (let i = 0; i < this.data.hide.length; i++) {
      this.el.removeEventListener(this.data.hide[i], this.hide);
    }
  },

  show() {
    this.live = true;
    this.el.setAttribute('visible', true);
    // if (this.el.components['raycaster'] !== undefined) {
    //   this.el.setAttribute('raycaster', 'enabled', true);
    // }
  },

  hide() {
    this.live = false;
    this.el.setAttribute('visible', false);
    this.el.object3D.position.set(-10000, -10000, -10000);
    // if (this.el.components['raycaster'] !== undefined) {
    //   this.el.setAttribute('raycaster', 'enabled', false);
    // }
  },

  tick: function () {
    if (this.handEl && this.live) {
      const handComp = this.handEl.components['leap-hand'];
      const hand = handComp.getHand();
      let fingerId;
      let origin, direction, distance, translation, position, end, lookAtTarget;

      if (hand && hand.valid) {
        if (this.data.origin === 'palm') {
          origin = new THREE.Vector3().fromArray(hand.palmPosition);
        } else if (this.data.origin === 'palmEdgeLower') {
          fingerId = FINGER_IDS['pinky'];
          origin = new THREE.Vector3().fromArray(handComp.getFinger(hand, fingerId).metacarpal.prevJoint);
        } else if (this.data.origin === 'palmEdgeMiddle') {
          fingerId = FINGER_IDS['pinky'];
          origin = new THREE.Vector3().fromArray(handComp.getFinger(hand, fingerId).mcpPosition);
        } else if (this.data.origin === 'palmEdgeUpper') {
          fingerId = FINGER_IDS['pinky'];
          origin = new THREE.Vector3().fromArray(handComp.getFinger(hand, fingerId).proximal.prevJoint);
        } else {
          fingerId = FINGER_IDS[this.data.origin];
          origin = new THREE.Vector3().fromArray(handComp.getFinger(hand, fingerId).tipPosition);
        }

        if (this.data.direction === 'palmNormal') {
          direction = new THREE.Vector3().fromArray(hand.palmNormal);
        } else if (this.data.direction === 'palmDirection') {
          direction = new THREE.Vector3().fromArray(hand.direction);
        } else if (this.data.direction === 'palmSelection') {
          direction = new THREE.Vector3().fromArray(hand.direction).divideScalar(2).add(new THREE.Vector3().fromArray(hand.palmNormal)).normalize();
        } else {
          fingerId = FINGER_IDS[this.data.direction];
          direction = new THREE.Vector3().fromArray(handComp.getFinger(hand, fingerId).direction);
        }


        distance = new THREE.Vector3().copy(direction).multiplyScalar(this.data.translation.z);
        translation = new THREE.Vector3(this.data.translation.x, this.data.translation.y, 0);
        position = new THREE.Vector3().copy(origin).add(translation).add(distance);
        end = new THREE.Vector3().copy(position).add(direction);

        this.el.object3D.position.set(position.x, position.y, position.z);
        if (this.data.lookAt === 'origin') {
          this.el.object3D.lookAt(origin);
        } else if (this.data.lookAt === 'end') {
          this.el.object3D.lookAt(end);
        } else {
          lookAtTarget = document.querySelector(this.data.lookAt);
          this.el.object3D.lookAt(lookAtTarget.object3D.position);
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