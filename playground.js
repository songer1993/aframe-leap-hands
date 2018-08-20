const EVENTS = {
  CLICK: 'click',
  HANDPINCH: 'handpinch',
  HANDGRAB: 'handgrab',
  HANDRELEASE: 'handrelease'
};

const STATES = {
  PINCHING: 'hand-pinching',
  HOVERING: 'hand-hovering',
  HOVERED: 'hand-hovered'
};


const COLORS = {
  PRIMARY: '#6200EE',
  PRIMARY_VARIANT: '#3700B3',
  SECONDARY: '#03DAC6',
  SECONDARY_VARIANT: '#018786',
  BACKGROUND: '#FFFFFF',
  SURFACE: '#FFFFFF',
  ERROR: '#C51162',
  ON_PRIMARY: '#FFFFFF',
  ON_SECONDARY: '#000000',
  ON_BACKGROUND: '#000000',
  ON_SURFACE: '#000000',
  ON_ERROR: '#FFFFFF'
};

window.theme = {
  primary: '#6200EE',
  primaryVariant: '#3700B3',
  secondary: '#03DAC6',
  secondaryVariant: '#018786',
  backgroundd: '#FFFFFF',
  surface: '#FFFFFF',
  error: '#C51162',
  onPrimary: '#FFFFFF',
  onSecondary: '#000000',
  onBackground: '#000000',
  onSurface: '#000000',
  onError: '#FFFFFF',
  blue: '#4076fd',
  white: '#FFF',
  dark: '#263238',
  grey: '#B0B0B0'
};



// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

function download(strData, strFileName, strMimeType) {
  var D = document,
    A = arguments,
    a = D.createElement("a"),
    d = A[0],
    n = A[1],
    t = A[2] || "text/plain";

  //build download link:
  a.href = "data:" + strMimeType + "charset=utf-8," + escape(strData);


  if (window.MSBlobBuilder) { // IE10
    var bb = new MSBlobBuilder();
    bb.append(strData);
    return navigator.msSaveBlob(bb, strFileName);
  } /* end if(window.MSBlobBuilder) */



  if ('download' in a) { //FF20, CH19
    a.setAttribute("download", n);
    a.innerHTML = "downloading...";
    D.body.appendChild(a);
    setTimeout(function () {
      var e = D.createEvent("MouseEvents");
      e.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
      a.dispatchEvent(e);
      D.body.removeChild(a);
    }, 66);
    return true;
  }; /* end if('download' in a) */



  //do iframe dataURL download: (older W3)
  var f = D.createElement("iframe");
  D.body.appendChild(f);
  f.src = "data:" + (A[2] ? A[2] : "application/octet-stream") + (window.btoa ? ";base64" : "") + "," + (window.btoa ? window.btoa : escape)(strData);
  setTimeout(function () {
    D.body.removeChild(f);
  }, 333);
  return true;
}

var localStorageSpace = function () {
  var data = '';

  console.log('Current local storage: ');

  for (var key in window.localStorage) {

    if (window.localStorage.hasOwnProperty(key)) {
      data += window.localStorage[key];
      console.log(key + " = " + ((window.localStorage[key].length * 16) / (8 * 1024)).toFixed(2) + ' KB');
    }

  }

  console.log(data ? '\n' + 'Total space used: ' + ((data.length * 16) / (8 * 1024)).toFixed(2) + ' KB' : 'Empty (0 KB)');
  console.log(data ? 'Approx. space remaining: ' + (5120 - ((data.length * 16) / (8 * 1024)).toFixed(2)) + ' KB' : '5 MB');
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

// AFRAME.registerComponent('sphere-collider', {
//   schema: {
//     objects: {
//       default: ''
//     },
//     state: {
//       default: 'collided'
//     },
//     radius: {
//       default: 0.05
//     },
//     watch: {
//       default: true
//     }
//   },

//   init: function () {
//     /** @type {MutationObserver} */
//     this.observer = null;
//     /** @type {Array<Element>} Elements to watch for collisions. */
//     this.els = [];
//     /** @type {Array<Element>} Elements currently in collision state. */
//     this.collisions = [];

//     this.handleHit = this.handleHit.bind(this);
//     this.handleHitEnd = this.handleHitEnd.bind(this);
//   },

//   remove: function () {
//     this.pause();
//   },

//   play: function () {
//     const sceneEl = this.el.sceneEl;

//     if (this.data.watch) {
//       this.observer = new MutationObserver(this.update.bind(this, null));
//       this.observer.observe(sceneEl, {
//         childList: true,
//         subtree: true
//       });
//     }
//   },

//   pause: function () {
//     if (this.observer) {
//       this.observer.disconnect();
//       this.observer = null;
//     }
//   },

//   /**
//    * Update list of entities to test for collision.
//    */
//   update: function () {
//     const data = this.data;
//     let objectEls;

//     // Push entities into list of els to intersect.
//     if (data.objects) {
//       objectEls = this.el.sceneEl.querySelectorAll(data.objects);
//     } else {
//       // If objects not defined, intersect with everything.
//       objectEls = this.el.sceneEl.children;
//     }
//     // Convert from NodeList to Array
//     this.els = Array.prototype.slice.call(objectEls);
//   },

//   tick: (function () {
//     const position = new THREE.Vector3(),
//       meshPosition = new THREE.Vector3(),
//       colliderScale = new THREE.Vector3(),
//       distanceMap = new Map();
//     return function () {
//       const el = this.el,
//         data = this.data,
//         mesh = el.getObject3D('mesh'),
//         collisions = [];
//       let colliderRadius;

//       if (!mesh) {
//         return;
//       }

//       distanceMap.clear();
//       position.copy(el.object3D.getWorldPosition());
//       el.object3D.getWorldScale(colliderScale);
//       colliderRadius = data.radius * scaleFactor(colliderScale);
//       // Update collision list.
//       this.els.forEach(intersect);

//       // Emit events and add collision states, in order of distance.
//       collisions
//         .sort((a, b) => distanceMap.get(a) > distanceMap.get(b) ? 1 : -1)
//         .forEach(this.handleHit);

//       // Remove collision state from current element.
//       if (collisions.length === 0) {
//         el.emit('hit', {
//           el: null
//         });
//       }

//       // Remove collision state from other elements.
//       this.collisions
//         .filter((el) => !distanceMap.has(el))
//         .forEach(this.handleHitEnd);

//       // Store new collisions
//       this.collisions = collisions;

//       // Bounding sphere collision detection
//       function intersect(el) {
//         let radius, mesh, distance, box, extent, size;

//         if (!el.isEntity) {
//           return;
//         }

//         mesh = el.getObject3D('mesh');

//         if (!mesh) {
//           return;
//         }

//         box = new THREE.Box3().setFromObject(mesh);
//         size = box.getSize();
//         extent = Math.max(size.x, size.y, size.z) / 2;
//         radius = Math.sqrt(2 * extent * extent);
//         box.getCenter(meshPosition);

//         if (!radius) {
//           return;
//         }

//         distance = position.distanceTo(meshPosition);
//         if (distance < radius + colliderRadius) {
//           collisions.push(el);
//           distanceMap.set(el, distance);
//         }
//       }
//       // use max of scale factors to maintain bounding sphere collision
//       function scaleFactor(scaleVec) {
//         return Math.max.apply(null, scaleVec.toArray());
//       }
//     };
//   })(),

//   handleHit: function (targetEl) {
//     targetEl.emit('hit');
//     targetEl.addState(this.data.state);
//     this.el.emit('hit', {
//       el: targetEl
//     });
//   },
//   handleHitEnd: function (targetEl) {
//     targetEl.emit('hitend');
//     targetEl.removeState(this.data.state);
//     this.el.emit('hitend', {
//       el: targetEl
//     });
//   }
// });

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

AFRAME.registerComponent('event-adapter', {
  multiple: true,
  schema: {
    from: {
      type: 'string',
      default: 'grab-start'
    },
    to: {
      type: 'string',
      default: 'mousedown'
    }
  },
  init: function () {
    this.adapt = this.adapt.bind(this);
    this.el.addEventListener(this.data.from, e => this.adapt(e));
  },
  adapt: function (e) {
    if (e instanceof CustomEvent) {
      if (this.data.to === 'click') {
        if (this.el.is('hovered')) {
          this.el.emit(this.data.to, e.detail)
        }
      } else {
        this.el.emit(this.data.to, e.detail)
      }
    }
  }
});

AFRAME.registerComponent('spawn', {
  schema: {
    default: '',
    parse: AFRAME.utils.styleParser.parse
  },

  dependencies: ['clickable'],

  init: function () {
    const data = this.data;
    const el = this.el;
    el.addEventListener('click', AFRAME.utils.debounce(() => {
      // Create element.
      const entityName = "a-" + data.entity;
      // AFRAME.log("Insert " + entityName);
      const spawnEl = document.createElement(entityName);
      spawnEl.setAttribute('id', data.entity + makeid());
      spawnEl.setAttribute('position', '0 2 -2');

      Object.keys(data).forEach(name => {
        if (name === 'type') {
          return;
        }
        AFRAME.utils.entity.setComponentProperty(spawnEl, name, data[name]);
      });

      // Append to scene.
      const layout = el.sceneEl.querySelector('[id^=layout]')
      if (!layout) {
        layout = document.createElement('a-entity');
        layout.setAttribute('id', 'layout' + makeid());
        el.sceneEl.appendChild(layout);
      }
      layout.appendChild(spawnEl);

    }, 250));
  },
});

// AFRAME.registerComponent('sphere-collider', {
//   schema: {
//     objects: {default: ''},
//     state: {default: 'collided'},
//     radius: {default: 0.05},
//     watch: {default: true}
//   },

//   init: function () {
//     /** @type {MutationObserver} */
//     this.observer = null;
//     /** @type {Array<Element>} Elements to watch for collisions. */
//     this.els = [];
//     /** @type {Array<Element>} Elements currently in collision state. */
//     this.collisions = [];

//     this.handleHit = this.handleHit.bind(this);
//     this.handleHitEnd = this.handleHitEnd.bind(this);
//   },

//   remove: function () {
//     this.pause();
//   },

//   play: function () {
//     const sceneEl = this.el.sceneEl;

//     if (this.data.watch) {
//       this.observer = new MutationObserver(this.update.bind(this, null));
//       this.observer.observe(sceneEl, {childList: true, subtree: true});
//     }
//   },

//   pause: function () {
//     if (this.observer) {
//       this.observer.disconnect();
//       this.observer = null;
//     }
//   },

//   /**
//    * Update list of entities to test for collision.
//    */
//   update: function () {
//     const data = this.data;
//     let objectEls;

//     // Push entities into list of els to intersect.
//     if (data.objects) {
//       objectEls = this.el.sceneEl.querySelectorAll(data.objects);
//     } else {
//       // If objects not defined, intersect with everything.
//       objectEls = this.el.sceneEl.children;
//     }
//     // Convert from NodeList to Array
//     this.els = Array.prototype.slice.call(objectEls);
//   },

//   tick: (function () {
//     const position = new THREE.Vector3(),
//         meshPosition = new THREE.Vector3(),
//         colliderScale = new THREE.Vector3(),
//         distanceMap = new Map();
//     return function () {
//       const el = this.el,
//           data = this.data,
//           mesh = el.getObject3D('mesh'),
//           collisions = [];
//       let colliderRadius;

//       if (!mesh) { return; }

//       distanceMap.clear();
//       position.copy(el.object3D.getWorldPosition());
//       el.object3D.getWorldScale(colliderScale);
//       colliderRadius = data.radius * scaleFactor(colliderScale);
//       // Update collision list.
//       this.els.forEach(intersect);

//       // Emit events and add collision states, in order of distance.
//       collisions
//         .sort((a, b) => distanceMap.get(a) > distanceMap.get(b) ? 1 : -1)
//         .forEach(this.handleHit);

//       // Remove collision state from current element.
//       if (collisions.length === 0) { el.emit('hit', {el: null}); }

//       // Remove collision state from other elements.
//       this.collisions
//         .filter((el) => !distanceMap.has(el))
//         .forEach(this.handleHitEnd);

//       // Store new collisions
//       this.collisions = collisions;

//       // Bounding sphere collision detection
//       function intersect (el) {
//         let radius, mesh, distance, box, extent, size;

//         if (!el.isEntity) { return; }

//         mesh = el.getObject3D('mesh');

//         if (!mesh) { return; }

//         box = new THREE.Box3().setFromObject(mesh);
//         size = box.getSize();
//         extent = Math.max(size.x, size.y, size.z) / 2;
//         radius = Math.sqrt(2 * extent * extent);
//         box.getCenter(meshPosition);

//         if (!radius) { return; }

//         distance = position.distanceTo(meshPosition);
//         if (distance < radius + colliderRadius) {
//           collisions.push(el);
//           distanceMap.set(el, distance);
//         }
//       }
//       // use max of scale factors to maintain bounding sphere collision
//       function scaleFactor (scaleVec) {
//         return Math.max.apply(null, scaleVec.toArray());
//       }
//     };
//   })(),

//   handleHit: function (targetEl) {
//     targetEl.emit('hit');
//     targetEl.addState(this.data.state);
//     this.el.emit('hit', {el: targetEl});
//   },
//   handleHitEnd: function (targetEl) {
//     targetEl.emit('hitend');
//     targetEl.removeState(this.data.state);
//     this.el.emit('hitend', {el: targetEl});
//   }
// });

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function getLastLayoutIndex(keyword = 'layout') {
  const layoutKeys = [];
  const keys = Object.keys(localStorage);
  for (let i = 0; i < localStorage.length; i++) {
    if (keys[i].includes(keyword)) {
      layoutKeys.push(keys[i]);
    }
  }
  return layoutKeys.length
}

function removeAllCompoents(el) {
  var components = el.components;
  for (let i = 0; i < components.length; i++) {
    el.removeAttribute(components[i]);
  }
}

function saveLayout() {
  const keyword = "layout"
  const layoutEl = document.querySelector('[id^=layout]');
  const layout = [];
  const widgets = layoutEl.childNodes;
  let position, rotation, scale;
  for (let i = 0; i < widgets.length; i++) {
    position = widgets[i].object3D.position;
    rotation = widgets[i].object3D.rotation;
    scale = widgets[i].object3D.scale;
    layout.push({
      'type': widgets[i].nodeName.split('-')[1].toLowerCase(),
      'pX': position.x,
      'pY': position.y,
      'pZ': position.z,
      'rX': rotation.x,
      'rY': rotation.y,
      'rZ': rotation.z,
      'sX': scale.x,
      'sY': scale.y,
      'sZ': scale.z
    });
  }
  const id = keyword + '-' + (getLastLayoutIndex(keyword) + 1);
  localStorage.setItem(id, JSON.stringify(layout));
  return layout;
}

function clearLayout() {
  const sceneEl = document.querySelector('a-scene');
  const layoutEl = document.querySelector('[id^=layout]');
  const widgets = layoutEl.childNodes;
  for (let i = 0; i < widgets.length; i++) {
    // removeAllCompoents(widgets[i]);
    layoutEl.removeChild(widgets[i]);
    // sceneEl.remove(widgets[i]); 
    // layoutEl.remove(widgets[i]);
  }
  // layoutEl.innerText = "";
  // sceneEl.remove(layoutEl);
  // var newLayoutEl = document.createElement('a-entity');
  // newLayoutEl.setAttribute('id', 'layout' + makeid());
  // sceneEl.appendChild(newLayoutEl);
}



AFRAME.registerComponent('group-opacity', {
  schema: {
    opacity: {
      default: 1.0
    }
  },
  update: function () {
    const opacity = this.data.opacity;
    this.el.object3D.traverse(function (o) {
      if (o.material) {
        o.material.opacity = opacity;
      }
    });
  }
});
// AFRAME.registerComponent('group-opacity', {
//   tick: function (t) {
//     var opacity = (Math.sin(t / 1000) + 1) / 2;
//     this.el.object3D.traverse(function (o) {
//       if (o.material) {
//         o.material.opacity = opacity;
//       }
//     });
//   }
// });
// function getLastLayoutIndex(keyword = 'layout') {
//   return localforage.keys().then(keys => {
//     const layoutKeys = [];
//     keys.forEach((key) => {
//       if (key.includes(keyword))
//         layoutKeys.push(key);
//     });
//     return layoutKeys.length
//   });
// }

// async function saveLayout(layoutEl = null, keyword = 'layout') {
//   if (!layoutEl) {
//     layoutEl = document.querySelector('#layout');
//   }
//   const layout = [];
//   layoutEl.childNodes.forEach((component) => {
//     const position = component.object3D.position;
//     const rotation = component.object3D.rotation;
//     const scale = component.object3D.scale;
//     layout.push({
//       'type': component.nodeName.split('-')[1].toLowerCase(),
//       'pX': position.x,
//       'pY': position.y,
//       'pZ': position.z,
//       'rX': rotation.x,
//       'rY': rotation.y,
//       'rZ': rotation.z,
//       'sX': scale.x,
//       'sY': scale.y,
//       'sZ': scale.z
//     });
//   })
//   const id = keyword + '-' + ((await getLastLayoutIndex(keyword)) + 1);
//   localforage.setItem(id, JSON.stringify(layout)).then(value => console.log(value));
// }