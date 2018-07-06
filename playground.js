var EVENTS = {
  CLICK: 'click',
  HANDPINCH: 'handpinch',
  HANDGRAB: 'handgrab',
  HANDRELEASE: 'handrelease'
};

var STATES = {
  PINCHING: 'hand-pinching',
  HOVERING: 'hand-hovering',
  HOVERED: 'hand-hovered'
};


AFRAME.registerPrimitive('a-grid', {
  defaultComponents: {
    geometry: {
      primitive: 'plane',
      width: 75,
      height: 75
    },
    rotation: {
      x: -90,
      y: 0,
      z: 0
    },
    material: {
      src: 'url(https://cdn.rawgit.com/donmccurdy/aframe-extras/v1.16.3/assets/grid.png)',
      repeat: '75 75'
    }
  },
  mappings: {
    width: 'geometry.width',
    height: 'geometry.height',
    src: 'material.src'
  }
});

AFRAME.registerComponent('holdable', {
  schema: {
    activeColor: {
      default: 'orange'
    }
  },
  dependencies: ['dynamic-body'],
  init: function () {
    this.physics = /** @type {AFRAME.System}     */ this.el.sceneEl.systems.physics;
    this.constraint = /** @type {CANNON.Constraint} */ null;
    this.handID = /** @type {number} */ null;
    this.el.addEventListener('handpinch', this.onHoldStart.bind(this));
    this.el.addEventListener('handopen', this.onHoldStop.bind(this));
  },

  onHoldStart: function (e) {
    if (this.handID) return;

    this.originalColor = this.el.getAttribute('material').color;
    this.el.setAttribute('material', 'color', this.data.activeColor);
    this.constraint = new CANNON.LockConstraint(this.el.body, e.detail.body);
    console.log(this.physics);
    this.physics.driver.world.addConstraint(this.constraint);
    this.handID = e.detail.handID;
  },

  onHoldStop: function (e) {
    if (e.detail.handID !== this.handID) return;

    this.el.setAttribute('material', 'color', this.originalColor);
    this.physics.driver.world.removeConstraint(this.constraint);
    this.constraint = null;
    this.handID = null;
  }
});