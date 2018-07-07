const HandMesh = require('../lib/leap.hand-mesh'),
	CircularArray = require('circular-array'),
	HandCursor = require('./helpers/hand-cursor'),
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
		cursorRingMixin: {
			default: ''
		},
		cursorRingDistance: {
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

		this.pinchTarget = /** @type {AFRAME.Element} */ null;
		this.grabTarget = /** @type {AFRAME.Element} */ null;
		this.holdTarget = /** @type {AFRAME.Element} */ null;

		this.el.setObject3D('mesh', this.handMesh.getMesh());
		this.handMesh.hide();

		this.cursor = new HandCursor(this.data.cursorMixin, this.data.cursorRingMixin);
		this.el.appendChild(this.cursor.el);
		this.el.appendChild(this.cursor.ringEl);
		this.cursor.hide();
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
		this.el.removeChild(this.cursor.el);
		this.el.removeChild(this.cursor.ringEl);
		this.cursor = null;
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

			this.cursor.update(this.data, hand, isHolding);
		} else if (this.isPinching || this.isGrabbing || this.isHolding) {
			this.release(null);
		}

		if (hand && !this.isVisible) {
			this.handMesh.show();
			this.cursor.show();
		}

		if (!hand && this.isVisible) {
			this.handMesh.hide();
			this.cursor.hide();
		}
		this.isVisible = !!hand;
	},

	getHand: function () {
		const data = this.data;
		const frame = this.system.getFrame();
		return frame.hands.length ? frame.hands[frame.hands[0].type === data.hand ? 0 : 1] : null;
	},


	pinch: function (hand) {
		let {
			objects,
			results,
			eventDetail
		} = this.getEventDetail(hand);


		this.el.emit(EVENTS.HANDPINCH, eventDetail);
		this.cursor.el.emit(EVENTS.HANDPINCH, eventDetail);

		objects = [].slice.call(this.el.sceneEl.querySelectorAll(this.data.objects))
			.map(function (el) {
				return el.object3D;
			});
		results = this.cursor.intersectObjects(objects, true);
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
		this.cursor.el.emit(EVENTS.HANDGRAB, eventDetail);

		objects = [].slice.call(this.el.sceneEl.querySelectorAll(this.data.objects))
			.map(function (el) {
				return el.object3D;
			});
		results = this.cursor.intersectObjects(objects, true);
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
		this.cursor.el.emit(EVENTS.HANDHOLD, eventDetail);

		objects = [].slice.call(this.el.sceneEl.querySelectorAll(this.data.objects))
			.map(function (el) {
				return el.object3D;
			});
		results = this.cursor.intersectObjects(objects, true);
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
		this.cursor.el.emit(EVENTS.HANDRELEASE, eventDetail);

		this.el.emit(EVENTS.CLICK, eventDetail);
		this.cursor.el.emit(EVENTS.CLICK, eventDetail);
		this.cursor.ringEl.emit(EVENTS.CLICK, eventDetail);

		if (this.pinchTarget) {
			this.pinchTarget.emit(EVENTS.HANDRELEASE, eventDetail);
			// this.pinchTarget.emit(EVENTS.CLICK, eventDetail);
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