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
    holdDistance: {
      type: 'number',
      default: 0
    },
    lookAtOrigin: {
      type: 'boolean',
      default: true
    },
    raycaster: {
      type: 'selector'
    },
    crawling: {
      type: 'boolean',
      default: false
    },
    crawlingDistance: {
      type: 'number',
      default: 0.05
    }
  },

  init: function () {
    this.intersection = null;
    this.handEl = null;
    this.raycasterEl = null;

    this.addEventListeners = this.addEventListeners.bind(this);
    this.removeEventListeners = this.removeEventListeners.bind(this);
    this.onIntersection = this.onIntersection.bind(this);
    this.onIntersectionCleared = this.onIntersectionCleared.bind(this);
  },

  update: function () {
    if (this.data.hand) {
      this.handEl = this.data.hand;
    } else {
      this.handEl = this.el.parentNode;
    }
    if (this.data.raycaster) {
      this.raycasterEl = this.data.raycaster;
    } else if (this.el.components['raycaster'] !== undefined) {
      this.raycasterEl = null;
    } else {
      this.raycasterEl = this.el.parentNode.querySelector(['raycaster']);
    }
    this.addEventListeners();
  },

  addEventListeners: function () {
    const raycasterEl = this.raycasterEl;
    if (raycasterEl) {
      raycasterEl.addEventListener('raycaster-intersection', (e) => {
        this.onIntersection(e)
      });
      raycasterEl.addEventListener('raycaster-intersection-cleared', (e) => {
        this.onIntersectionCleared(e)
      });
    }
  },

  removeEventListeners: function () {
    const raycasterEl = this.raycasterEl;
    if (raycasterEl) {
      raycasterEl.removeEventListener('raycaster-intersection', (e) => {
        this.onIntersection(e)
      });
      raycasterEl.removeEventListener('raycaster-intersection-cleared', (e) => {
        this.onIntersectionCleared(e)
      });
    }
  },

  onIntersection: function (e) {
    console.log('onintersection');
    this.intersection = this.getNearestIntersection(e.detail.intersections);
    if (this.data.crawling && this.intersection) {
      this.el.setAttribute('material', 'color', 'white');
    }
    const self = this;
    setInterval(function () {
      self.raycasterEl.components['raycaster'].refreshObjects();
    }, 100);
  },

  onIntersectionCleared: function (e) {
    console.log('onintersectioncleared');
    this.intersection = null;
    if (this.data.crawling) {
      this.el.setAttribute('material', 'color', 'black');
    }
  },

  getNearestIntersection: function (intersections) {
    for (var i = 0, l = intersections.length; i < l; i++) {
      // ignore cursor itself to avoid flicker && ignore "ignore-ray" class
      if (this.el === intersections[i].object.el || intersections[i].object.el.classList.contains("ignore-ray")) {
        continue;
      }
      return intersections[i];
    }
    return null;
  },

  remove: function () {
    this.handEl = null;
    this.raycasterEl = null;
    this.intersection = null;
    this.removeEventListeners();
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
        if (this.raycasterEl) {
          const raycaster = this.raycasterEl.components['raycaster'];
          raycaster.checkIntersections();
          const intersection = this.getNearestIntersection(raycaster.intersections);
          if (this.data.crawling && intersection) {
            const worldToLocalMat = new THREE.Matrix4().getInverse(this.handEl.object3D.matrixWorld);
            const worldPoint = intersection.point.clone();
            const worldNormal = intersection.face.normal.clone().normalize();
            const lookAtTarget = new THREE.Vector3().addVectors(worldPoint, worldNormal).applyMatrix4(worldToLocalMat);
            this.el.object3D.lookAt(lookAtTarget);
            const position = new THREE.Vector3().addVectors(worldPoint, worldNormal.multiplyScalar(this.data.crawlingDistance)).applyMatrix4(worldToLocalMat);
            this.el.object3D.position.set(position.x, position.y, position.z);
          } else {
            const origin = new THREE.Vector3().fromArray(hand.palmPosition);
            const palmNormal = new THREE.Vector3().fromArray(hand.palmNormal);;
            const direction = new THREE.Vector3().fromArray(hand.direction).divideScalar(2).add(palmNormal).normalize();
            const distance = new THREE.Vector3().copy(direction).multiplyScalar(this.data.holdDistance);
            const position = new THREE.Vector3().copy(origin).add(distance);

            this.el.object3D.position.set(position.x, position.y, position.z);
            if (this.data.lookAtOrigin) {
              this.el.object3D.lookAt(origin);
            }
          }
        } else {
          const origin = new THREE.Vector3().fromArray(hand.palmPosition);
          const palmNormal = new THREE.Vector3().fromArray(hand.palmNormal);;
          const direction = new THREE.Vector3().fromArray(hand.direction).divideScalar(2).add(palmNormal).normalize();
          const distance = new THREE.Vector3().copy(direction).multiplyScalar(this.data.holdDistance);
          const position = new THREE.Vector3().copy(origin).add(distance);

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
  }

});