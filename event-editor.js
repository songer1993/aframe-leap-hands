function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

AFRAME.registerComponent('open-event-editor', {
  schema: {
    event: {
      type: 'string',
      default: 'fuseend'
    },
    editor: {
      type: 'selector',
      default: '#eventEditor'
    }
  },
  init: function () {
    var bind = AFRAME.utils.bind;
    this.openEditor = bind(this.openEditor, this);
  },
  update: function () {},
  play: function () {
    this.addEventListeners();
  },
  pause: function () {
    this.removeEventListeners();
  },
  remove: function () {
    this.removeEventListeners();
  },
  addEventListeners: function () {
    this.el.addEventListener(this.data.event, this.openEditor);
  },
  removeEventListeners: function () {
    this.el.removeEventListener(this.data.event, this.openEditor);
  },
  openEditor: function () {
    var detail = {
      'caller': this.el
    };
    this.data.editor.emit('openeditor', detail);
  }
});

AFRAME.registerComponent('event-editor', {
  schema: {
    event: {
      type: 'string',
      default: 'openeditor'
    }
  },
  init: function () {
    this.buildEditor();
    // Bind methods.
    var bind = AFRAME.utils.bind;
    this.show = bind(this.show, this);
    this.hide = bind(this.hide, this);
    this.save = bind(this.save, this);
    this.clear = bind(this.clear, this);
  },
  buildEditor: function () {
    this.el.setAttribute('position', '-10000 -10000 -10000');

    var editor = this.editor = document.createElement('a-card');
    editor.setAttribute('id', this.el.id + 'EventEditor');
    editor.setAttribute('width', 2);
    editor.setAttribute('height', 1.2);
    editor.setAttribute('color', '#fff');
    editor.setAttribute('type', 'flat');
    this.el.appendChild(editor);

    var form = document.createElement('a-form');
    editor.appendChild(form);

    var iconEventEntity = document.createElement('a-icon-button');
    iconEventEntity.setAttribute('width', 0.2);
    iconEventEntity.setAttribute('height', 0.2);
    iconEventEntity.setAttribute('position', '0.15 1.1 0.001');
    iconEventEntity.setAttribute('color', '#aaa');
    iconEventEntity.setAttribute('button-color', '#fff');
    iconEventEntity.setAttribute('type', 'flat');
    iconEventEntity.setAttribute('src', '#entityIcon');
    iconEventEntity.setAttribute('mixin', 'static-ui');
    form.appendChild(iconEventEntity);

    var inpEventEntity = this.inpEventEntity = document.createElement('a-input');
    inpEventEntity.setAttribute('id', this.el.id + 'InpEventEntity');
    inpEventEntity.setAttribute('width', 1.6);
    inpEventEntity.setAttribute('height', 0.15);
    inpEventEntity.setAttribute('position', '0.35 1.1 0.001');
    inpEventEntity.setAttribute('placeholder', 'Entity ID');
    inpEventEntity.setAttribute('color', '#263238');
    inpEventEntity.setAttribute('background-color', '#bbb');
    inpEventEntity.setAttribute('placeholder-color', '#aaa');
    inpEventEntity.setAttribute('type', 'flat');
    inpEventEntity.setAttribute('mixin', 'static-ui');
    form.appendChild(inpEventEntity);

    var iconEventTarget = document.createElement('a-icon-button');
    iconEventTarget.setAttribute('width', 0.2);
    iconEventTarget.setAttribute('height', 0.2);
    iconEventTarget.setAttribute('position', '0.15 0.9 0.001');
    iconEventTarget.setAttribute('color', '#aaa');
    iconEventTarget.setAttribute('button-color', '#fff');
    iconEventTarget.setAttribute('type', 'flat');
    iconEventTarget.setAttribute('src', '#targetIcon');
    iconEventTarget.setAttribute('mixin', 'static-ui');
    form.appendChild(iconEventTarget);

    var inpEventTarget = this.inpEventTarget = document.createElement('a-input');
    inpEventTarget.setAttribute('id', this.el.id + 'InpEventTarget');
    inpEventTarget.setAttribute('width', 1.6);
    inpEventTarget.setAttribute('height', 0.15);
    inpEventTarget.setAttribute('position', '0.35 0.9 0.001');
    inpEventTarget.setAttribute('placeholder', 'Target ID, e.g. box1');
    inpEventTarget.setAttribute('color', '#263238');
    inpEventTarget.setAttribute('background-color', '#bbb');
    inpEventTarget.setAttribute('placeholder-color', '#aaa');
    inpEventTarget.setAttribute('type', 'flat');
    inpEventTarget.setAttribute('mixin', 'static-ui');
    form.appendChild(inpEventTarget);

    var iconEventName = document.createElement('a-icon-button');
    iconEventName.setAttribute('width', 0.2);
    iconEventName.setAttribute('height', 0.2);
    iconEventName.setAttribute('position', '0.15 0.7 0.001');
    iconEventName.setAttribute('color', '#aaa');
    iconEventName.setAttribute('button-color', '#fff');
    iconEventName.setAttribute('type', 'flat');
    iconEventName.setAttribute('src', '#eventIcon');
    iconEventName.setAttribute('mixin', 'static-ui');
    form.appendChild(iconEventName);

    var inpEventName = this.inpEventName = document.createElement('a-input');
    inpEventName.setAttribute('id', this.el.id + 'InpEventName');
    inpEventName.setAttribute('width', 1.6);
    inpEventName.setAttribute('height', 0.15);
    inpEventName.setAttribute('position', '0.35 0.7 0.001');
    inpEventName.setAttribute('placeholder', 'Event Name, e.g. click');
    inpEventName.setAttribute('color', '#263238');
    inpEventName.setAttribute('background-color', '#bbb');
    inpEventName.setAttribute('placeholder-color', '#aaa');
    inpEventName.setAttribute('type', 'flat');
    inpEventName.setAttribute('mixin', 'static-ui');
    form.appendChild(inpEventName);


    var inpEventDetail = this.inpEventDetail = document.createElement('a-input');
    inpEventDetail.setAttribute('id', this.el.id + 'InpEventDetail');
    inpEventDetail.setAttribute('width', 1.9);
    inpEventDetail.setAttribute('height', 0.2);
    inpEventDetail.setAttribute('position', '0.05 0.5 0.001');
    inpEventDetail.setAttribute('placeholder', 'Add your action...');
    inpEventDetail.setAttribute('color', '#263238');
    inpEventDetail.setAttribute('background-color', '#fff');
    inpEventDetail.setAttribute('placeholder-color', '#aaa');
    inpEventDetail.setAttribute('type', 'flat');
    inpEventDetail.setAttribute('mixin', 'static-ui');
    form.appendChild(inpEventDetail);

    var btnClear = this.btnClear = document.createElement('a-button');
    btnClear.setAttribute('id', this.el.id + 'BtnClear')
    btnClear.setAttribute('position', '0.9 0.15 0.002');
    btnClear.setAttribute('width', 1);
    btnClear.setAttribute('scale', '0.5 0.5 0.5');
    btnClear.setAttribute('mixin', 'static-ui');
    btnClear.setAttribute('value', 'Clear');
    btnClear.setAttribute('type', 'flat');
    btnClear.setAttribute('color', '#4076fd');
    btnClear.setAttribute('button-color', '#fff');
    form.appendChild(btnClear);

    var btnSave = this.btnSave = document.createElement('a-button');
    btnSave.setAttribute('id', this.el.id + 'btnSave');
    btnSave.setAttribute('position', '1.45 0.15 0.002');
    btnSave.setAttribute('width', 1);
    btnSave.setAttribute('scale', '0.5 0.5 0.5');
    btnSave.setAttribute('mixin', 'static-ui');
    btnSave.setAttribute('value', 'Save');
    btnSave.setAttribute('type', 'raised');
    btnSave.setAttribute('color', '#fff');
    btnSave.setAttribute('button-color', '#4076fd');
    form.appendChild(btnSave);
  },
  update: function () {},
  tick: function () {},
  remove: function () {
    this.removeEventListeners();
    this.el.sceneEl.removeChild(this.editor);
  },
  pause: function () {
    this.removeEventListeners();
  },
  play: function () {
    this.addEventListeners();
  },
  addEventListeners: function () {
    this.el.addEventListener(this.data.event, (e) => {
      this.show(e.detail.caller)
    });
    this.btnSave.addEventListener('click', this.save);
    this.btnClear.addEventListener('click', this.clear);
  },
  removeEventListeners: function () {
    this.el.addEventListener(this.data.event, (e) => {
      this.show(e.detail.caller)
    });
    this.btnSave.removeEventListener('click', this.save);
    this.btnClear.removeEventListener('click', this.clear);
  },
  save: function () {
    this.entity.id = this.inpEventEntity.value;
    if (this.inpEventEntity.value && this.inpEventTarget.value && this.inpEventName && this.inpEventDetail.value) {
      var scriptText = `var ${this.entity.id} = document.querySelector('#${this.entity.id}'); ${this.entity.id}.addEventListener('${this.inpEventName.value}', function(){var ${this.inpEventTarget.value} = document.querySelector('#${this.inpEventTarget.value}'); ${this.inpEventTarget.value}.${this.inpEventDetail.value}});`;
      console.log(scriptText);
      var newScript = document.createElement("script");
      var inlineScript = document.createTextNode(scriptText);
      newScript.appendChild(inlineScript);
      document.querySelector('body').appendChild(newScript);
    }
    this.clear();
    this.hide();
  },
  clear: function () {
    var blank = '';
    this.inpEventName.setAttribute('value', blank);
    this.inpEventTarget.setAttribute('value', blank);
    this.inpEventDetail.setAttribute('value', blank);
  },
  show: function (entity) {
    this.entity = entity;
    if (!this.entity.id) {
      this.entity.id = makeid();
    };
    this.inpEventEntity.setAttribute('value', this.entity.id);

    var bbox = new THREE.Box3().setFromObject(entity.querySelector('a-image').object3D);
    if (bbox) {
      this.el.object3D.position.set(bbox.max.x, bbox.min.y, bbox.min.z);
    } else {
      this.el.object3D.position.set(-0.5, 0.5, -1);
    }
  },
  hide: function () {
    this.el.object3D.position.set(-10000, -10000, -10000);
    var keyboard = document.querySelector('[keyboard]');
    if (keyboard) keyboard.hide();
  }
})