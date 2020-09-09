const RENDER_TO_DOM = Symbol('render to dom');

function notObject(val) {
    return typeof val !== 'object' || val === null;
}

/** @param {Range} range @param {Node} node */
function replaceContent(range, node) {
    range.insertNode(node);
    range.setStartAfter(node);
    range.deleteContents();

    range.setStartBefore(node);
    range.setEndAfter(node);
}

/** @typedef { ElementWrapper | TextWrapper | Fragment } VDOMTYPE */

/**
 * @param {VDOMTYPE} oldNode 
 * @param {VDOMTYPE} newNode 
 */
function isSameNode(oldNode, newNode) {
    if (oldNode.type !== newNode.type) return false;
    if (Object.keys(oldNode.props).length !==
        Object.keys(newNode.props).length) return false;
    for (let key in newNode.props) {
        if (newNode.props[key] !== oldNode.props[key]) {
            return false;
        }
    }
    if (newNode.type === "#text") {
        if (newNode.content !== oldNode.content) {
            return false;
        }
    }
    return true;
}

function mergeState(oldState, newState) {
    for (let p in newState) {
        if (notObject(oldState[p])) {
            oldState[p] = newState[p];
        }
        else mergeState(oldState[p], newState[p]);
    }
}

export class Component {
    constructor() {
        this.props = Object.create(null);
        /** @type {Component[]} */
        this.children = [];
    }
    /** @param {string} key @param {unknown} value */
    setAttribute(key, value) {
        this.props[key] = value;
    }
    /** @param {Component} comp */
    appendChild(comp) {
        this.children.push(comp)
    }
    /** @type {VDOMTYPE} */
    get vdom() {
        return this.render().vdom;
    }
    update() {
        /**
         * @param {VDOMTYPE} oldNode 
         * @param {VDOMTYPE} newNode 
         */
        let update = (oldNode, newNode) => {
            if (!isSameNode(oldNode, newNode)) {
                newNode[RENDER_TO_DOM](oldNode._range);
                return;
            }
            if (newNode.type !== "#fragment") {
                newNode._range = oldNode._range;
                if (newNode.type === "#text") return;
            }

            let newChilds = newNode.vchildren;
            /** @type {typeof newNode} */
            let oldSame = oldNode;
            /** @type {VDOMTYPE[]} */
            let oldChilds = oldSame.vchildren;

            if (!newChilds.length) return;
            let tailChild = oldChilds[oldChilds.length - 1];
            let tailRange = tailChild ? tailChild._range : oldSame._range;

            for (let i = 0; i < newChilds.length; ++i) {
                let newChild = newChilds[i];
                let oldChild = oldChilds[i];
                if (oldChild) {
                    update(oldChild, newChild);
                }
                else {
                    let insertRange = tailRange.cloneRange();
                    insertRange.collapse();
                    newChild[RENDER_TO_DOM](insertRange);
                    tailRange = insertRange;
                }
            }
            for (let i = newChilds.length; i < oldChilds.length; ++i) {
                oldChilds[i]._range.deleteContents();
            }
        };
        let vdom = this.vdom;
        update(this._vdom, vdom);
        this._vdom = vdom;
    }
    setState(newState) {
        if (notObject(this.state)) {
            this.state = newState;
            this.update();
            return;
        }
        mergeState(this.state, newState);
        this.update();
    }
}

class VDOMType extends Component {
    get vdom() {
        return this;
    }
    /** @param {Range} dom_range */
    [RENDER_TO_DOM](dom_range) {
        this._range = dom_range;
    }
}

class VDOMhasVChildren extends VDOMType {
    get vdom() {
        this.vchildren = this.children.map(child => child.vdom);
        return this;
    }
    /** @param {Range} dom_range */
    [RENDER_TO_DOM](dom_range) {
        super[RENDER_TO_DOM](dom_range);
        if (!this.vchildren) this.vdom;
    }
}

export class Fragment extends VDOMhasVChildren {
    constructor() {
        super();
        /** @type {"#fragment"} */
        this.type = "#fragment";
    }
    /** @param {string} key @param {unknown} value */
    setAttribute(key, value) {
        if (key !== "key") return;
        super.setAttribute(key, value);
    }
    /** @param {Range} dom_range */
    [RENDER_TO_DOM](dom_range) {
        super[RENDER_TO_DOM](dom_range);

        this.vchildren.forEach(c => {
            dom_range = dom_range.cloneRange();
            c[RENDER_TO_DOM](dom_range);
            dom_range.collapse();
        });
    }
}

class ElementWrapper extends VDOMhasVChildren {
    /** @param {keyof HTMLElementTagNameMap} tagName */
    constructor(tagName) {
        super();
        this.type = tagName;
    }
    /** @param {Range} dom_range */
    [RENDER_TO_DOM](dom_range) {
        super[RENDER_TO_DOM](dom_range);

        let root = document.createElement(this.type);
        for (let key in this.props) {
            let value = this.props[key];
            if (key.match(/^on([\s\S]+)$/)) {
                root.addEventListener(
                    RegExp.$1.replace(/^[\s\S]/,
                        c => c.toLowerCase()), value);
            }
            else if (key === "className") {
                root.setAttribute("class", value);
            }
            else {
                root.setAttribute(key, value);
            }
        }

        for (let child of this.vchildren) {
            let childRange = document.createRange();
            childRange.setStart(root, root.childNodes.length);
            childRange.setEnd(root, root.childNodes.length);
            child[RENDER_TO_DOM](childRange);
        }

        replaceContent(dom_range, root);
    }
}

class TextWrapper extends VDOMType {
    /** @param {string} text */
    constructor(text) {
        super();
        /** @type {"#text"} */
        this.type = "#text"
        this.content = text;
    }
    /** @param {Range} dom_range */
    [RENDER_TO_DOM](dom_range) {
        super[RENDER_TO_DOM](dom_range);

        let root = document.createTextNode(this.content);
        replaceContent(dom_range, root);
    }
}

/**
 * @param {string|typeof Component} type 
 * @param {Record<string, any>} attrs 
 * @param {...string|Component|Component[]} childs 
 */
export function createElement(type, attrs, ...childs) {
    /** @type {Component} */
    let e;
    if (typeof type === "string") {
        e = new ElementWrapper(type);
    }
    else {
        e = new type;
    }

    for (let p in attrs) {
        e.setAttribute(p, attrs[p]);
    }

    /** @param {(string|Component|Component[])[]} childs */
    let insertChilds = (childs) => {
        for (let child of childs) {
            if (child === void 0 || child === null) {
                continue;
            }
            if (typeof child == "object" && child instanceof Array) {
                insertChilds(child);
                return;
            }
            if (typeof child === "string") {
                child = new TextWrapper(child);
            }
            e.appendChild(child);
        }
    }
    insertChilds(childs);
    return e;
}

/** @param {Component} component @param {Node} parentElement */
export function render(component, parentElement) {
    let range = document.createRange();
    range.setStart(parentElement, 0);
    range.setEnd(parentElement, parentElement.childNodes.length);
    range.deleteContents();
    let root = component.vdom;
    if (!component[RENDER_TO_DOM]) {
        component._vdom = root;
    }
    root[RENDER_TO_DOM](range)
}