const HandMesh = require('../lib/leap.hand-mesh'),
	CircularArray = require('circular-array'),
	Intersector = require('./helpers/intersector'),
	HandBody = require('./helpers/hand-body');

let nextID = 1;

const EVENTS = {
	CLICK: 'click',
	HANDPINCH: 'handpinch',
	HANDGRAB: 'handgrab',
	HANDHOLD: 'handhold',
	HANDRELEASE: 'handrelease'
};

const STATES = {
	PINCHING: 'hand-pinching',
	GRABBING: 'hand-grabbing',
	HOLDING: 'hand-holding',
};

const handCursorDefualtId = 'handcursordefault';

/**
 * A-Frame component for a single Leap Motion hand.
 */
module.exports = AFRAME.registerComponent('leap-hand', {
	schema: {
		hand: {
			default: '',
			oneOf: ['left', 'right'],
			required: true
		},
		objects: {
			default: '[grabbable]'
		},
		enablePhysics: {
			default: false
		},
		pinchDebounce: {
			default: 100
		}, // ms
		pinchSensitivity: {
			default: 0.95
		}, // [0,1]
		grabDebounce: {
			default: 100
		}, // ms
		grabSensitivity: {
			default: 0.95
		}, // [0,1]
		holdDistance: {
			default: 0.05
		}, // m
		holdSensitivity: {
			default: 0.95
		}, // [0,1]
		releaseSensitivity: {
			default: 0.75
		}, // [0,1]
		cursorMixin: {
			default: ''
		},
		cursorDistance: {
			default: 0.05
		},
		debug: {
			default: false
		}
	},

	init: function () {
		this.system = this.el.sceneEl.systems.leap;

		this.handID = nextID++;
		this.hand = /** @type {Leap.Hand} */ null;
		this.handBody = /** @type {HandBody} */ null;
		this.handMesh = new HandMesh();

		this.isVisible = false;
		this.isPinching = false;
		this.isGrabbing = false;
		this.isHolding = false;

		const pinchBufferLen = Math.floor(this.data.pinchDebounce / (1000 / 120));
		const grabBufferLen = Math.floor(this.data.grabDebounce / (1000 / 120));
		this.grabStrength = 0;
		this.pinchStrength = 0;
		this.holdStrength = 0;
		this.grabStrengthBuffer = /** @type {CircularArray<number>} */ new CircularArray(grabBufferLen);
		this.pinchStrengthBuffer = /** @type {CircularArray<number>} */ new CircularArray(pinchBufferLen);

		this.intersector = new Intersector();
		this.pinchTarget = /** @type {AFRAME.Element} */ null;
		this.grabTarget = /** @type {AFRAME.Element} */ null;
		this.holdTarget = /** @type {AFRAME.Element} */ null;

		this.el.setObject3D('mesh', this.handMesh.getMesh());
		this.handMesh.hide();

		if (this.data.debug) {
			this.el.object3D.add(this.intersector.getMesh());
		}

		const cursorEl = document.createElement('a-entity');
		if (this.data.cursorMixin) {
			cursorEl.setAttribute('mixin', this.data.cursorMixin);
		} else {
			const assets = this.el.sceneEl.querySelector('a-assets') || this.el.sceneEl.appendChild(document.createElement('a-assets'));
			const cursorDefault = document.createElement('a-mixin');
			cursorDefault.setAttribute('id', handCursorDefualtId);
			cursorDefault.setAttribute('raycaster', 'showLine', true);
			cursorDefault.setAttribute('super-hands', 'colliderEvent', 'raycaster-intersection');
			cursorDefault.setAttribute('super-hands', 'colliderEventProperty', 'els');
			cursorDefault.setAttribute('super-hands', 'colliderEndEvent', 'raycaster-intersection-cleared');
			cursorDefault.setAttribute('super-hands', 'colliderEndEventProperty', 'clearedEls');
			cursorDefault.setAttribute('super-hands', 'grabStartButtons', 'handpinch');
			cursorDefault.setAttribute('super-hands', 'grabEndButtons', 'handrelease');
			cursorDefault.setAttribute('super-hands', 'stretchStartButtons', 'handpinch');
			cursorDefault.setAttribute('super-hands', 'stretchEndButtons', 'handrelease');
			cursorDefault.setAttribute('super-hands', 'dragDropStartButtons', 'handpinch');
			cursorDefault.setAttribute('super-hands', 'dragDropEndButtons', 'handrealse');
			cursorDefault.setAttribute('static-body', 'shape: sphere; sphereRadius: 0.02');
			assets.appendChild(cursorDefault);
			cursorEl.setAttribute('mixin', handCursorDefualtId);
		}
		this.cursorEl = cursorEl;
		this.el.appendChild(this.cursorEl);
	},

	update: function () {
		const data = this.data;
		if (data.enablePhysics && !this.handBody) {
			this.handBody = new HandBody(this.el, this);
		} else if (!data.enablePhysics && this.handBody) {
			this.handBody.remove();
			this.handBody = null;
		}
	},

	remove: function () {
		if (this.handMesh) {
			this.el.removeObject3D('mesh');
			this.handMesh = null;
		}
		if (this.handBody) {
			this.handBody.remove();
			this.handBody = null;
		}
		if (this.intersector.getMesh()) {
			this.el.object3D.remove(this.intersector.getMesh());
			this.intersector = null;
		}
		this.el.removeChild(this.cursorEl);
	},

	tick: function () {
		const hand = this.getHand();

		if (hand && hand.valid) {
			this.handMesh.scaleTo(hand);
			this.handMesh.formTo(hand);
			this.grabStrengthBuffer.push(hand.grabStrength);
			this.pinchStrengthBuffer.push(hand.pinchStrength);
			this.grabStrength = circularArrayAvg(this.grabStrengthBuffer);
			this.pinchStrength = circularArrayAvg(this.pinchStrengthBuffer);
			this.holdStrength = Math.max(this.grabStrength, this.pinchStrength)

			const wasPinching = this.isPinching;
			const wasGrabbing = this.isGrabbing;
			const wasHolding = this.isHolding;

			const isPinching = this.pinchStrength > (wasPinching ? this.data.releaseSensitivity : this.data.pinchSensitivity);
			const isGrabbing = this.grabStrength > (wasGrabbing ? this.data.releaseSensitivity : this.data.grabSensitivity);
			const isHolding = this.holdStrength > (wasHolding ? this.data.releaseSensitivity : this.data.holdSensitivity);

			if (isPinching && !this.wasPinching) this.pinch(hand);
			if (!isPinching && this.wasPinching) this.release(hand);

			if (isGrabbing && !this.wasGrabbing) this.grab(hand);
			if (!isGrabbing && this.wasGrabbing) this.release(hand);

			if (isHolding && !this.isHolding) this.hold(hand);
			if (!isHolding && this.isHolding) this.release(hand);
			this.intersector.update(this.data, this.el.object3D, hand, isHolding);
			this.updateHandRaycaster(hand);
		} else if (this.isPinching || this.isGrabbing || this.isHolding) {
			this.release(null);
		}

		if (hand && !this.isVisible) {
			this.handMesh.show();
			this.intersector.show();
			this.cursorEl.setAttribute('visible', true);
		}

		if (!hand && this.isVisible) {
			this.handMesh.hide();
			this.intersector.hide();
			this.cursorEl.setAttribute('visible', false);
		}
		this.isVisible = !!hand;
	},

	getHand: function () {
		const data = this.data;
		const frame = this.system.getFrame();
		return frame.hands.length ? frame.hands[frame.hands[0].type === data.hand ? 0 : 1] : null;
	},

	updateHandRaycaster: function (hand) {
		const origin = new THREE.Vector3();
		const palmNormal = new THREE.Vector3();
		const direction = new THREE.Vector3();
		const position = new THREE.Vector3();
		const distance = new THREE.Vector3();

		origin.fromArray(hand.palmPosition);
		palmNormal.fromArray(hand.palmNormal);
		direction.fromArray(hand.direction).divideScalar(2).add(palmNormal).normalize();
		distance.copy(direction).multiplyScalar(this.data.cursorDistance);
		position.copy(origin).add(distance);

		const cursor = this.cursorEl;
		cursor.object3D.position.set(position.x, position.y, position.z);
		cursor.object3D.lookAt(origin);
		cursor.setAttribute('raycaster', 'direction', direction);
	},

	pinch: function (hand) {
		let {
			objects,
			results,
			eventDetail
		} = this.getEventDetail(hand);


		this.el.emit(EVENTS.HANDPINCH, eventDetail);
		this.cursorEl.emit(EVENTS.HANDPINCH, eventDetail);

		objects = [].slice.call(this.el.sceneEl.querySelectorAll(this.data.objects))
			.map(function (el) {
				return el.object3D;
			});
		results = this.intersector.intersectObjects(objects, true);
		this.pinchTarget = results[0] && results[0].object && results[0].object.el;
		if (this.pinchTarget) {
			this.pinchTarget.emit(EVENTS.HANDPINCH, eventDetail);
		}
		this.isPinching = true;
		this.el.addState(STATES.PINCHING);
	},

	grab: function (hand) {
		let {
			objects,
			results,
			eventDetail
		} = this.getEventDetail(hand);

		this.el.emit(EVENTS.HANDGRAB, eventDetail);
		this.cursorEl.emit(EVENTS.HANDGRAB, eventDetail);

		objects = [].slice.call(this.el.sceneEl.querySelectorAll(this.data.objects))
			.map(function (el) {
				return el.object3D;
			});
		results = this.intersector.intersectObjects(objects, true);
		this.grabTarget = results[0] && results[0].object && results[0].object.el;
		if (this.grabTarget) {
			this.grabTarget.emit(EVENTS.HANDGRAB, eventDetail);
		}
		this.isGrabbing = true;
		this.el.addState(STATES.GRABBING);
	},


	hold: function (hand) {
		let {
			objects,
			results,
			eventDetail
		} = this.getEventDetail(hand);

		this.el.emit(EVENTS.HANDHOLD, eventDetail);
		this.cursorEl.emit(EVENTS.HANDHOLD, eventDetail);

		objects = [].slice.call(this.el.sceneEl.querySelectorAll(this.data.objects))
			.map(function (el) {
				return el.object3D;
			});
		results = this.intersector.intersectObjects(objects, true);
		this.holdTarget = results[0] && results[0].object && results[0].object.el;
		if (this.holdTarget) {
			this.holdTarget.emit(EVENTS.HANDHOLD, eventDetail);
		}
		this.isHolding = true;
		this.el.addState(STATES.HOLDING);
	},


	release: function (hand) {
		const eventDetail = this.getEventDetail(hand);

		this.el.emit(EVENTS.HANDRELEASE, eventDetail);
		this.cursorEl.emit(EVENTS.HANDRELEASE, eventDetail);

		if (this.pinchTarget) {
			this.pinchTarget.emit(EVENTS.HANDRELEASE, eventDetail);
			this.pinchTarget = null;
			this.el.removeState(STATES.PINCHING);
		}
		this.isPinching = false;

		if (this.grabTarget) {
			this.grabTarget.emit(EVENTS.HANDRELEASE, eventDetail);
			this.grabTarget = null;
			this.el.removeState(STATES.GRABBING);
		}
		this.isGrabbing = false;

		if (this.holdTarget) {
			this.holdTarget.emit(EVENTS.HANDRELEASE, eventDetail);
			this.holdTarget = null;
			this.el.removeState(STATES.HOLDING);
		}
		this.isHolding = false;
	},

	getEventDetail: function (hand) {
		return {
			hand: hand,
			handID: this.handID,
			body: this.handBody ? this.handBody.palmBody : null
		};
	}
});

function circularArrayAvg(array) {
	let avg = 0;
	array = array.array();
	for (let i = 0; i < array.length; i++) {
		avg += array[i];
	}
	return avg / array.length;
}