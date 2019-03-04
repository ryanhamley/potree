

import {Action} from "./Actions.js";
import {Utils} from "./utils.js";
import {EventDispatcher} from "./EventDispatcher.js";

export class Annotation extends EventDispatcher {
	constructor (args = {}) {
		super();

		let valueOrDefault = (a, b) => {
			if(a === null || a === undefined){
				return b;
			}else{
				return a;
			}
		};

		this.scene = null;
		this._title = args.title || 'No Title';
		this._description = args.description || '';
		this.offset = new THREE.Vector3();

		if (!args.position) {
			this.position = null;
		} else if (args.position instanceof THREE.Vector3) {
			this.position = args.position;
		} else {
			this.position = new THREE.Vector3(...args.position);
		}

		this.cameraPosition = (args.cameraPosition instanceof Array)
			? new THREE.Vector3().fromArray(args.cameraPosition) : args.cameraPosition;
		this.cameraTarget = (args.cameraTarget instanceof Array)
			? new THREE.Vector3().fromArray(args.cameraTarget) : args.cameraTarget;
		this.radius = args.radius;
		this.view = args.view || null;
		this.keepOpen = false;
		this.descriptionVisible = false;
		this.showDescription = true;
		this.actions = args.actions || [];
		this.isHighlighted = false;
		this._visible = true;
		this.__visible = true;
		this._display = true;
		this._expand = false;
		this.collapseThreshold = [args.collapseThreshold, 100].find(e => e !== undefined);

		this.children = [];
		this.parent = null;
		this.boundingBox = new THREE.Box3();

		let iconClose = exports.resourcePath + '/icons/close.svg';

		this.domElement = Utils.createHTML(`
			<div class="annotation" oncontextmenu="return false;">
				<div class="annotation-titlebar">
					<span class="annotation-label"></span>
				</div>
				<div class="annotation-description">
					<span class="annotation-description-close">
						<img src="${iconClose}" width="16px">
					</span>
					<span class="annotation-description-content">${this._description}</span>
				</div>
			</div>
		`);

		this.elTitlebar = this.domElement.querySelector('.annotation-titlebar');
		this.elTitle = this.domElement.querySelector('.annotation-label');
		this.elTitle.textContent = this._title;
		this.elDescription = this.domElement.querySelector('.annotation-description');
		this.elDescriptionClose = this.domElement.querySelector('.annotation-description-close');
		console.log('this.elDescriptionClose', this.elDescriptionClose);
		// this.elDescriptionContent = document.querySelector(".annotation-description-content");

		this.clickTitle = () => {
			if(this.hasView()){
				this.moveHere(this.scene.getActiveCamera());
			}
			this.dispatchEvent({type: 'click', target: this});
		};

		this.elTitle.click(this.clickTitle);

		this.actions = this.actions.map(a => {
			if (a instanceof Action) {
				return a;
			} else {
				return new Action(a);
			}
		});

		for (let action of this.actions) {
			action.pairWith(this);
		}

		let actions = this.actions.filter(
			a => a.showIn === undefined || a.showIn.includes('scene'));

		for (let action of actions) {
			let elButton = Utils.createHTML(`<img src="${action.icon}" class="annotation-action-icon">`);
			this.elTitlebar.appendChild(elButton);
			elButton.on('click', () => action.onclick({annotation: this}));
		}

		// TODO: move these to after this.domElement is attached to the DOM
		// console.log('this.domElement', this.domElement);
		// this.elDescriptionClose.on('hover',
		// 	e => this.elDescriptionClose.style.opacity = '1'
		// );
		// this.elDescriptionClose.on('hover',
		// 	e => this.elDescriptionClose.style.opacity = '0.5'
		// );
		// this.elDescriptionClose.on('click', e => this.setHighlighted(false));
		// // this.elDescriptionContent.html(this._description);
		// this.domElement.on('mouseenter', e => this.setHighlighted(true));
		// this.domElement.on('mouseleave', e => this.setHighlighted(false));
		//
		// this.domElement.on('touchstart', e => {
		// 	this.setHighlighted(!this.isHighlighted);
		// });

		this.display = false;
		//this.display = true;

	}

	installHandles(viewer){
		if(this.handles !== undefined){
			return;
		}

		let domElement = Utils.createHTML(`
			<div style="position: absolute; left: 300; top: 200; pointer-events: none">
				<svg width="300" height="600">
					<line x1="0" y1="0" x2="1200" y2="200" style="stroke: black; stroke-width:2" />
					<circle cx="50" cy="50" r="4" stroke="black" stroke-width="2" fill="gray" />
					<circle cx="150" cy="50" r="4" stroke="black" stroke-width="2" fill="gray" />
				</svg>
			</div>
		`);

		let svg = document.querySelector("svg")[0];
		let elLine = document.querySelector("line")[0];
		let elStart = document.querySelectorAll("circle")[0];
		let elEnd = document.querySelectorAll("circle")[1];

		let setCoordinates = (start, end) => {
			elStart.setAttribute("cx", `${start.x}`);
			elStart.setAttribute("cy", `${start.y}`);

			elEnd.setAttribute("cx", `${end.x}`);
			elEnd.setAttribute("cy", `${end.y}`);

			elLine.setAttribute("x1", start.x);
			elLine.setAttribute("y1", start.y);
			elLine.setAttribute("x2", end.x);
			elLine.setAttribute("y2", end.y);

			let box = svg.getBBox();
			svg.setAttribute("width", `${box.width}`);
			svg.setAttribute("height", `${box.height}`);
			svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);

			let ya = start.y - end.y;
			let xa = start.x - end.x;

			if(ya > 0){
				start.y = start.y - ya;
			}
			if(xa > 0){
				start.x = start.x - xa;
			}

			domElement.css("left", `${start.x}px`);
			domElement.css("top", `${start.y}px`);

		};

		viewer.renderArea.appendChild(domElement);


		let annotationStartPos = this.position.cloneNode(true);
		let annotationStartOffset = this.offset.cloneNode(true);

		// this.domElement.draggable({
		// 	start: (event, ui) => {
		// 		annotationStartPos = this.position.cloneNode(true);
		// 		annotationStartOffset = this.offset.cloneNode(true);
		// 		document.querySelector(".annotation-titlebar").style.pointerEvents = 'none';
		//
		// 		console.log(document.querySelector(".annotation-titlebar"));
		// 	},
		// 	stop: () => {
		// 		document.querySelector(".annotation-titlebar").style.pointerEvents = '';
		// 	},
		// 	drag: (event, ui ) => {
		// 		let renderAreaWidth = viewer.renderer.getSize().width;
		// 		let renderAreaHeight = viewer.renderer.getSize().height;
		//
		// 		let diff = {
		// 			x: ui.originalPosition.left - ui.position.left,
		// 			y: ui.originalPosition.top - ui.position.top
		// 		};
		//
		// 		let nDiff = {
		// 			x: -(diff.x / renderAreaWidth) * 2,
		// 			y: (diff.y / renderAreaWidth) * 2
		// 		};
		//
		// 		let camera = viewer.scene.getActiveCamera();
		// 		let oldScreenPos = new THREE.Vector3()
		// 			.addVectors(annotationStartPos, annotationStartOffset)
		// 			.project(camera);
		//
		// 		let newScreenPos = oldScreenPos.cloneNode(true);
		// 		newScreenPos.x += nDiff.x;
		// 		newScreenPos.y += nDiff.y;
		//
		// 		let newPos = newScreenPos.cloneNode(true);
		// 		newPos.unproject(camera);
		//
		// 		let newOffset = new THREE.Vector3().subVectors(newPos, this.position);
		// 		this.offset.copy(newOffset);
		// 	}
		// });

		let updateCallback = () => {
			let position = this.position;
			let scene = viewer.scene;

			let renderAreaWidth = viewer.renderer.getSize().width;
			let renderAreaHeight = viewer.renderer.getSize().height;

			let start = this.position.cloneNode(true);
			let end = new THREE.Vector3().addVectors(this.position, this.offset);

			let toScreen = (position) => {
				let camera = scene.getActiveCamera();
				let screenPos = new THREE.Vector3();

				let worldView = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
				let ndc = new THREE.Vector4(position.x, position.y, position.z, 1.0).applyMatrix4(worldView);
				// limit w to small positive value, in case position is behind the camera
				ndc.w = Math.max(ndc.w, 0.1);
				ndc.divideScalar(ndc.w);

				screenPos.copy(ndc);
				screenPos.x = renderAreaWidth * (screenPos.x + 1) / 2;
				screenPos.y = renderAreaHeight * (1 - (screenPos.y + 1) / 2);

				return screenPos;
			};

			start = toScreen(start);
			end = toScreen(end);

			setCoordinates(start, end);

		};

		viewer.addEventListener("update", updateCallback);

		this.handles = {
			domElement,
			setCoordinates,
			updateCallback
		};
	}

	removeHandles(viewer){
		if(this.handles === undefined){
			return;
		}

		//$(viewer.renderArea).remove(this.handles.domElement);
		this.handles.domElement.parentNode.removeChild(this.handles.domElement);
		viewer.removeEventListener("update", this.handles.updateCallback);

		delete this.handles;
	}

	get visible () {
		return this._visible;
	}

	set visible (value) {
		if (this._visible === value) {
			return;
		}

		this._visible = value;

		//this.traverse(node => {
		//	node.display = value;
		//});

		this.dispatchEvent({
			type: 'visibility_changed',
			annotation: this
		});
	}

	get display () {
		return this._display;
	}

	set display (display) {
		if (this._display === display) {
			return;
		}

		this._display = display;

		if (display) {
			// this.domElement.fadeIn(200);
			this.domElement.style.display = '';
		} else {
			// this.domElement.fadeOut(200);
			this.domElement.style.display = 'none';
		}
	}

	get expand () {
		return this._expand;
	}

	set expand (expand) {
		if (this._expand === expand) {
			return;
		}

		if (expand) {
			this.display = false;
		} else {
			this.display = true;
			this.traverseDescendants(node => {
				node.display = false;
			});
		}

		this._expand = expand;
	}

	get title () {
		return this._title;
	}

	set title (title) {
		if (this._title === title) {
			return;
		}

		this._title = title;
		this.elTitle.innerHTML = '';
		this.elTitle.appendChild(this._title);
	}

	get description () {
		return this._description;
	}

	set description (description) {
		if (this._description === description) {
			return;
		}

		this._description = description;

		const elDescriptionContent = this.elDescription.find(".annotation-description-content");
		elDescriptionContent.innerHTML = '';
		elDescriptionContent.appendChild(this._description);
	}

	add (annotation) {
		if (!this.children.includes(annotation)) {
			this.children.push(annotation);
			annotation.parent = this;

			let descendants = [];
			annotation.traverse(a => { descendants.push(a); });

			for (let descendant of descendants) {
				let c = this;
				while (c !== null) {
					c.dispatchEvent({
						'type': 'annotation_added',
						'annotation': descendant
					});
					c = c.parent;
				}
			}
		}
	}

	level () {
		if (this.parent === null) {
			return 0;
		} else {
			return this.parent.level() + 1;
		}
	}

	hasChild(annotation) {
		return this.children.includes(annotation);
	}

	remove (annotation) {
		if (this.hasChild(annotation)) {
			annotation.removeAllChildren();
			annotation.dispose();
			this.children = this.children.filter(e => e !== annotation);
			annotation.parent = null;
		}
	}

	removeAllChildren() {
		this.children.forEach((child) => {
			if (child.children.length > 0) {
				child.removeAllChildren();
			}

			this.remove(child);
		});
	}

	updateBounds () {
		let box = new THREE.Box3();

		if (this.position) {
			box.expandByPoint(this.position);
		}

		for (let child of this.children) {
			child.updateBounds();

			box.union(child.boundingBox);
		}

		this.boundingBox.copy(box);
	}

	traverse (handler) {
		let expand = handler(this);

		if (expand === undefined || expand === true) {
			for (let child of this.children) {
				child.traverse(handler);
			}
		}
	}

	traverseDescendants (handler) {
		for (let child of this.children) {
			child.traverse(handler);
		}
	}

	flatten () {
		let annotations = [];

		this.traverse(annotation => {
			annotations.push(annotation);
		});

		return annotations;
	}

	descendants () {
		let annotations = [];

		this.traverse(annotation => {
			if (annotation !== this) {
				annotations.push(annotation);
			}
		});

		return annotations;
	}

	setHighlighted (highlighted) {
		if (highlighted) {
			this.domElement.style.opacity = '0.8';
			this.elTitlebar.style.boxShadow = '0 0 5px #fff';
			this.domElement.style.zIndex = '1000';

			if (this._description) {
				this.descriptionVisible = true;
				this.elDescription.fadeIn(200);
				this.elDescription.style.position = 'relative';
			}
		} else {
			this.domElement.style.opacity = '0.5';
			this.elTitlebar.style.boxShadow = '';
			this.domElement.style.zIndex = '100';
			this.descriptionVisible = false;
			this.elDescription.style.display = 'none';
		}

		this.isHighlighted = highlighted;
	}

	hasView () {
		let hasPosTargetView = this.cameraTarget instanceof THREE.Vector3;
		hasPosTargetView = hasPosTargetView && this.cameraPosition instanceof THREE.Vector3;

		let hasRadiusView = this.radius !== undefined;

		let hasView = hasPosTargetView || hasRadiusView;

		return hasView;
	};

	moveHere (camera) {
		if (!this.hasView()) {
			return;
		}

		let view = this.scene.view;
		let animationDuration = 500;
		let easing = TWEEN.Easing.Quartic.Out;

		let endTarget;
		if (this.cameraTarget) {
			endTarget = this.cameraTarget;
		} else if (this.position) {
			endTarget = this.position;
		} else {
			endTarget = this.boundingBox.getCenter(new THREE.Vector3());
		}

		if (this.cameraPosition) {
			let endPosition = this.cameraPosition;

			Utils.moveTo(this.scene, endPosition, endTarget);

			//{ // animate camera position
			//	let tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
			//	tween.easing(easing);
			//	tween.start();
			//}

			//{ // animate camera target
			//	let camTargetDistance = camera.position.distanceTo(endTarget);
			//	let target = new THREE.Vector3().addVectors(
			//		camera.position,
			//		camera.getWorldDirection().cloneNode(true).multiplyScalar(camTargetDistance)
			//	);
			//	let tween = new TWEEN.Tween(target).to(endTarget, animationDuration);
			//	tween.easing(easing);
			//	tween.onUpdate(() => {
			//		view.lookAt(target);
			//	});
			//	tween.onComplete(() => {
			//		view.lookAt(target);
			//		this.dispatchEvent({type: 'focusing_finished', target: this});
			//	});

			//	this.dispatchEvent({type: 'focusing_started', target: this});
			//	tween.start();
			//}
		} else if (this.radius) {
			let direction = view.direction;
			let endPosition = endTarget.cloneNode(true).add(direction.multiplyScalar(-this.radius));
			let startRadius = view.radius;
			let endRadius = this.radius;

			{ // animate camera position
				let tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
				tween.easing(easing);
				tween.start();
			}

			{ // animate radius
				let t = {x: 0};

				let tween = new TWEEN.Tween(t)
					.to({x: 1}, animationDuration)
					.onUpdate(function () {
						view.radius = this.x * endRadius + (1 - this.x) * startRadius;
					});
				tween.easing(easing);
				tween.start();
			}
		}
	};

	dispose () {
		if (this.domElement.parentElement) {
			this.domElement.parentElement.removeChild(this.domElement);
		}
	};

	toString () {
		return 'Annotation: ' + this._title;
	}
};
