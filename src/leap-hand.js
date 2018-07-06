var HandMesh = require('../lib/leap.hand-mesh'),
	CircularArray = require('circular-array'),
	Intersector = require('./helpers/intersector'),
	HandBody = require('./helpers/hand-body');

var nextID = 1;

var EVENTS = {
	CLICK: 'click',
	HANDPINCH: 'handpinch',
	HANDGRAB: 'handgrab',
	HANDHOLD: 'handhold',
	HANDRELEASE: 'handrelease'
};

var STATES = {
	PINCHING: 'hand-pinching',
	GRABBING: 'hand-grabbing',
	HOLDING: 'hand-holding',
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
		objects: {
			default: '*'
		},
		enablePhysics: {
			default: false
		},
		gestureDebounce: {
			default: 15
		},
		holdDistance: {
			default: 0.2
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

		this.intersector = new Intersector();
		this.pinchTarget = /** @type {AFRAME.Element} */ null;
		this.grabTarget = /** @type {AFRAME.Element} */ null;
		this.holdTarget = /** @type {AFRAME.Element} */ null;

		this.el.setObject3D('mesh', this.handMesh.getMesh());
		this.handMesh.hide();

		if (this.data.debug) {
			this.el.object3D.add(this.intersector.getMesh());
		}
	},

	update: function () {
		var data = this.data;
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
	},

	tick: function () {
		var hand = this.getHand();

		if (hand && hand.valid) {
			this.handMesh.scaleTo(hand);
			this.handMesh.formTo(hand);

			var wasPinching = this.isPinching;
			var wasGrabbing = this.isGrabbing;
			var wasHolding = this.isHolding;

			var {
				isPinching,
				isGrabbing,
				isHolding
			} = this.getGestures(hand, this.data.gestureDebounce);

			if (isPinching && !wasPinching) this.pinch(hand);
			if (!isPinching && wasPinching) this.release(hand);

			if (isGrabbing && !wasGrabbing) this.grab(hand);
			if (!isGrabbing && wasGrabbing) this.release(hand);

			if (isHolding && !wasHolding) this.hold(hand);
			if (!isHolding && wasHolding) this.release(hand);
			this.intersector.update(this.data, this.el.object3D, hand, isHolding);
		} else if (this.isPinching || this.isGrabbing || this.isHolding) {
			this.release(null);
		}

		if (hand && !this.isVisible) {
			this.handMesh.show();
			this.intersector.show();
		}

		if (!hand && this.isVisible) {
			this.handMesh.hide();
			this.intersector.hide();
		}
		this.isVisible = !!hand;
	},

	getHand: function () {
		var data = this.data,
			frame = this.system.getFrame();
		return frame.hands.length ? frame.hands[frame.hands[0].type === data.hand ? 0 : 1] : null;
	},

	getGestures: function (hand, historySamples) {
		var isPinching;
		var isGrabbing;
		var isHolding;

		if (hand.pinchStrength == 1) isPinching = true;
		else if (hand.pinchStrength == 0) isPinching = false;
		else {
			var sum = 0
			for (var s = 0; s < historySamples; s++) {
				var oldHand = this.system.getFrame(s).hand(hand.id)
				if (!oldHand.valid) break;
				sum += oldHand.pinchStrength
			}
			var avg = sum / s;
			if (hand.pinchStrength - avg < 0) isPinching = true;
			else if (hand.pinchStrength > 0) isPinching = false;
		}

		if (hand.grabStrength == 1) isGrabbing = true;
		else if (hand.grabStrength == 0) isGrabbing = false;
		else {
			var sum = 0
			for (var s = 0; s < historySamples; s++) {
				var oldHand = this.system.getFrame(s).hand(hand.id)
				if (!oldHand.valid) break;
				sum += oldHand.grabStrength
			}
			var avg = sum / s;
			if (hand.grabStrength - avg < 0) isGrabbing = true;
			else if (hand.grabStrength > 0) isGrabbing = false;
		}

		isHolding = isPinching || isGrabbing;

		return {
			isPinching,
			isGrabbing,
			isHolding
		};
	},

	pinch: function (hand) {
		var objects, results,
			eventDetail = this.getEventDetail(hand);

		this.el.emit(EVENTS.HANDPINCH, eventDetail);

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
		var objects, results,
			eventDetail = this.getEventDetail(hand);

		this.el.emit(EVENTS.HANDGRAB, eventDetail);

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
		var objects, results,
			eventDetail = this.getEventDetail(hand);

		this.el.emit(EVENTS.HANDHOLD, eventDetail);

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
		var eventDetail = this.getEventDetail(hand);

		this.el.emit(EVENTS.HANDRELEASE, eventDetail);

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
	var avg = 0;
	array = array.array();
	for (var i = 0; i < array.length; i++) {
		avg += array[i];
	}
	return avg / array.length;
}