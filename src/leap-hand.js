const HandMesh = require('../lib/leap.hand-mesh'),
	CircularArray = require('circular-array'),
	HandBody = require('./helpers/hand-body');

let nextID = 1;

const EVENTS = {
	CLICK: 'click',
	HANDPINCH: 'handpinch',
	HANDGRAB: 'handgrab',
	HANDHOLD: 'handhold',
	RELEASE: 'release',
	HANDOPEN: 'handopen',
	FINGERTAP: 'fingertap'
};

const STATES = {
	OPENING: 'hand-opening',
	PINCHING: 'hand-pinching',
	GRABBING: 'hand-grabbing',
	HOLDING: 'hand-holding',
	TAPPING: 'finger-tapping'
};


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
		enablePhysics: {
			type: 'boolean',
			default: false
		},
		pinchDebounce: {
			type: 'number',
			default: 100
		}, // ms
		pinchSensitivity: {
			type: 'number',
			default: 0.95
		}, // [0,1]
		grabDebounce: {
			type: 'number',
			default: 100
		}, // ms
		grabSensitivity: {
			type: 'number',
			default: 0.95
		}, // [0,1]
		openDebounce: {
			type: 'number',
			default: 100
		}, // ms
		openSensitivity: {
			type: 'number',
			default: 0.95
		}, // [0,1]
		tapDebounce: {
			type: 'number',
			default: 100
		}, // ms
		tapSensitivity: {
			type: 'number',
			default: 0.2
		}, // [0,1]
		holdSensitivity: {
			type: 'number',
			default: 0.95
		}, // [0,1]
		releaseSensitivity: {
			type: 'number',
			default: 0.75
		}, // [0,1]
		palmWearables: {
			type: 'selectorAll',
			default: 'null'
		},
		fingerWearables: {
			type: 'selectorAll',
			default: 'null'
		},
		debug: {
			type: 'boolean',
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
		this.isTapping = false;

		const pinchBufferLen = Math.floor(this.data.pinchDebounce / (1000 / 120));
		const grabBufferLen = Math.floor(this.data.grabDebounce / (1000 / 120));
		const tapBufferLen = Math.floor(this.data.tapDebounce / (1000 / 120));

		this.grabStrength = 0;
		this.pinchStrength = 0;
		this.holdStrength = 0;
		this.tapStrength = 0;
		this.grabStrengthBuffer = /** @type {CircularArray<number>} */ new CircularArray(grabBufferLen);
		this.pinchStrengthBuffer = /** @type {CircularArray<number>} */ new CircularArray(pinchBufferLen);
		this.tapStrengthBuffer = /** @type {CircularArray<number>} */ new CircularArray(tapBufferLen);

		this.el.setObject3D('mesh', this.handMesh.getMesh());
		this.el.setAttribute('visible', false);

		this.palmWearables = [];
		this.fingerWearables = [];
	},

	update: function () {
		const data = this.data;
		if (data.enablePhysics && !this.handBody) {
			this.handBody = new HandBody(this.el, this);
		} else if (!data.enablePhysics && this.handBody) {
			this.handBody.remove();
			this.handBody = null;
		}

		for (let i = 0; i < this.palmWearables.length; i++) {
			this.el.removeChild(this.palmWearables[i]);
		}
		for (let i = 0; i < this.fingerWearables.length; i++) {
			this.el.removeChild(this.fingerWearables[i]);
		}

		this.palmWearables = this.data.palmWearables;
		for (let i = 0; i < this.palmWearables.length; i++) {
			let palmWearable = this.palmWearables[i];
			if (palmWearable.parentNode !== this.el) {
				this.el.appendChild(palmWearable);
			}
		}

		this.fingerWearables = this.data.fingerWearables;
		for (let i = 0; i < this.fingerWearables.length; i++) {
			let fingerWearable = this.fingerWearables[i];
			if (fingerWearable.parentNode !== this.el) {
				this.el.appendChild(fingerWearable);
			}
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
		for (let i = 0; i < this.palmWearables.length; i++) {
			this.el.removeChild(this.palmWearables[i]);
		}
		for (let i = 0; i < this.fingerWearables.length; i++) {
			this.el.removeChild(this.fingerWearables[i]);
		}
	},

	tick: function () {
		const hand = this.getHand();

		if (hand && hand.valid) {
			const finger = this.getFinger(hand, 1);

			this.handMesh.scaleTo(hand);
			this.handMesh.formTo(hand);
			this.grabStrengthBuffer.push(hand.grabStrength);
			this.pinchStrengthBuffer.push(hand.pinchStrength);
			this.tapStrengthBuffer.push(-finger.touchDistance);
			this.grabStrength = circularArrayAvg(this.grabStrengthBuffer);
			this.pinchStrength = circularArrayAvg(this.pinchStrengthBuffer);
			this.holdStrength = Math.max(this.grabStrength, this.pinchStrength);
			this.openStrength = 1 - this.holdStrength;
			this.tapStrength = circularArrayAvg(this.tapStrengthBuffer);

			const wasPinching = this.isPinching;
			const wasGrabbing = this.isGrabbing;
			const wasHolding = this.isHolding;
			const wasOpening = this.isOpening;
			const wasTapping = this.isTapping;

			let isPinching = this.pinchStrength > (wasPinching ? this.data.releaseSensitivity : this.data.pinchSensitivity);
			let isGrabbing = this.grabStrength > (wasGrabbing ? this.data.releaseSensitivity : this.data.grabSensitivity);
			let isHolding = this.holdStrength > (wasHolding ? this.data.releaseSensitivity : this.data.holdSensitivity);
			let isOpening = this.openStrength > (wasOpening ? this.data.releaseSensitivity : this.data.openSensitivity);
			let isTapping = this.tapStrength > (wasTapping ? 0 : this.data.tapSensitivity);

			if (isHolding) {
				isTapping = false;
			} else if (isTapping) {
				isHolding = false;
			}

			if (isPinching && !wasPinching) this.pinch(hand);
			if (!isPinching && wasPinching) this.release(hand);

			if (isGrabbing && !wasGrabbing) this.grab(hand);
			if (!isGrabbing && wasGrabbing) this.release(hand);

			if (isHolding && !wasHolding) this.hold(hand);
			if (!isHolding && wasHolding) this.release(hand);

			if (isOpening && !wasOpening) this.open(hand);
			if (!isOpening && wasOpening) this.release(hand);

			if (isTapping && !wasTapping) this.tap(hand);
			if (!isTapping && wasTapping) this.release(hand);
		} else if (this.isPinching || this.isGrabbing || this.isHolding) {
			this.release(null);
		}

		if (hand && !this.isVisible) {
			this.el.setAttribute('visible', true)
		}

		if (!hand && this.isVisible) {
			this.el.setAttribute('visible', false);
		}
		this.isVisible = !!hand;
	},

	getHand: function () {
		const data = this.data;
		const frame = this.system.getFrame();
		return frame.hands.length ? frame.hands[frame.hands[0].type === data.hand ? 0 : 1] : null;
	},

	getFinger: function (hand, id) {
		for (let i = 0; i < 5; i++) {
			if (hand.fingers[i].type === id) {
				return hand.fingers[i];
			}
		}
	},

	pinch: function (hand) {
		const eventDetail = this.getEventDetail(hand);

		this.el.emit(EVENTS.HANDPINCH, eventDetail);
		for (let i = 0; i < this.palmWearables.length; i++) {
			this.palmWearables[i].emit(EVENTS.HANDPINCH, eventDetail);
		}

		this.isPinching = true;
		this.el.addState(STATES.PINCHING);
	},

	grab: function (hand) {
		const eventDetail = this.getEventDetail(hand);

		this.el.emit(EVENTS.HANDGRAB, eventDetail);
		for (let i = 0; i < this.palmWearables.length; i++) {
			this.palmWearables[i].emit(EVENTS.HANDGRAB, eventDetail);
		}

		this.isGrabbing = true;
		this.el.addState(STATES.GRABBING);
	},

	open: function (hand) {
		const eventDetail = this.getEventDetail(hand);

		this.el.emit(EVENTS.HANDOPEN, eventDetail);
		for (let i = 0; i < this.palmWearables.length; i++) {
			this.palmWearables[i].emit(EVENTS.HANDOPEN, eventDetail);
		}

		this.isOpening = true;
		this.el.addState(STATES.OPENING);
	},

	hold: function (hand) {
		const eventDetail = this.getEventDetail(hand);

		this.el.emit(EVENTS.HANDHOLD, eventDetail);
		for (let i = 0; i < this.palmWearables.length; i++) {
			this.palmWearables[i].emit(EVENTS.HANDHOLD, eventDetail);
		}

		this.isHolding = true;
		this.el.addState(STATES.HOLDING);
	},

	tap: function (hand) {
		const eventDetail = this.getEventDetail(hand);

		this.el.emit(EVENTS.FINGERTAP, eventDetail);
		for (let i = 0; i < this.palmWearables.length; i++) {
			this.palmWearables[i].emit(EVENTS.FINGERTAP, eventDetail);
		}
		for (let i = 0; i < this.fingerWearables.length; i++) {
			this.fingerWearables[i].emit(EVENTS.FINGERTAP, eventDetail);
		}

		this.isTapping = true;
		this.el.addState(STATES.TAPPING);
	},


	release: function (hand) {
		const eventDetail = this.getEventDetail(hand);

		this.el.emit(EVENTS.RELEASE, eventDetail);
		this.el.emit(EVENTS.CLICK, eventDetail);

		for (let i = 0; i < this.palmWearables.length; i++) {
			this.palmWearables[i].emit(EVENTS.RELEASE, eventDetail);
			// if (this.isTapping) {
			// 	this.palmWearables[i].emit(EVENTS.CLICK, eventDetail);
			// }
		}

		for (let i = 0; i < this.fingerWearables.length; i++) {
			this.fingerWearables[i].emit(EVENTS.RELEASE, eventDetail);
			// if (this.isTapping) {
			// 	this.fingerWearables[i].emit(EVENTS.CLICK, eventDetail);
			// }
		}


		if (this.isPinching) {
			this.el.removeState(STATES.PINCHING);
			this.isPinching = false;
		}

		if (this.isGrabbing) {
			this.el.removeState(STATES.GRABBING);
			this.isGrabbing = false;
		}

		if (this.isHolding) {
			this.el.removeState(STATES.HOLDING);
			this.isHolding = false;
		}

		if (this.isOpening) {
			this.el.removeState(STATES.OPENING);
			this.isOpening = false;
		}

		if (this.isTapping) {
			this.el.removeState(STATES.TAPPING);
			this.isTapping = false;
		}
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