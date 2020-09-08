const RENDER_TO_DOM = Symbol('render to dom');

function notObject(val) {
    return typeof val !== 'object' || val === null;
}

export class Component {
    constructor() {
        this.props = Object.create(null);
        this.children = [];
        this._range = null;
    }
    setAttribute(key, value) {
        this.props[key] = value;
    }
    appendChild(comp) {
        this.children.push(comp)
    }
    get vdom() {
        return this.render().vdom;
    }
    get vchildren() {
        return this.children.map(child => child.vdom);
    }
    /** @param {Range} dom_range */
    [RENDER_TO_DOM](dom_range) {
        this._range = dom_range;
        this.render()[RENDER_TO_DOM](dom_range);
    }
    rerender() {
        let removeRange = this._range;
        let insertRange = removeRange.cloneRange();
        insertRange.collapse(true);

        this[RENDER_TO_DOM](insertRange);

        removeRange.setStart(
            insertRange.endContainer,
            insertRange.endOffset);
        removeRange.deleteContents();
    }
    setState(newState) {
        if (notObject(this.state)) {
            this.state = newState;
            this.rerender();
            return;
        }

        let merge = (oldState, newState) => {
            for (let p in newState) {
                if (notObject(oldState[p])) {
                    oldState[p] = newState[p];
                }
                else merge(oldState[p], newState[p]);
            }
        }
        merge(this.state, newState);
        this.rerender();
    }
}

export class Fragment extends Component {
    constructor() {
        super();
        this.type = "#fragment";
        this.key;
    }
    setAttribute(key, value) {
        if (key !== "key") return;
        super.setAttribute(key, value);
    }
    get vdom() {
        return this;
    }
    /** @param {Range} dom_range */
    [RENDER_TO_DOM](dom_range) {
        this.children.forEach(c => {
            c[RENDER_TO_DOM](dom_range);
            dom_range = dom_range.cloneRange();
            dom_range.collapse();
        });
        dom_range.detach();
    }
}

class ElementWrapper extends Component {
    constructor(tagName) {
        super();
        /** @type {keyof HTMLElementTagNameMap} */
        this.type = tagName;
    }
    get vdom() {
        return this;
    }
    /** @param {Range} dom_range */
    [RENDER_TO_DOM](dom_range) {
        dom_range.deleteContents();

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

        for (let child of this.children) {
            let childRange = document.createRange();
            childRange.setStart(root, root.childNodes.length);
            childRange.setEnd(root, root.childNodes.length);
            child[RENDER_TO_DOM](childRange);
        }

        dom_range.insertNode(root);
    }
}

class TextWrapper extends Component {
    constructor(text) {
        super();
        this.type = "#text"
        this.content = text;
        this.root = document.createTextNode(text);
    }
    get vdom() {
        return this;
    }
    /** @param {Range} dom_range */
    [RENDER_TO_DOM](dom_range) {
        dom_range.deleteContents();
        dom_range.insertNode(this.root);
    }
}

export function createElement(type, attrs, ...childs) {
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

    let insertChilds = (childs) => {
        for (let child of childs) {
            if (child === void 0 || child === null) {
                continue;
            }
            if (typeof child === "string") {
                child = new TextWrapper(child);
            }
            if (typeof child == "object" && child instanceof Array) {
                insertChilds(child);
            }
            else e.appendChild(child);
        }
    }
    insertChilds(childs);
    return e;
}

export function render(component, parentElement) {
    let range = document.createRange();
    range.setStart(parentElement, 0);
    range.setEnd(parentElement, parentElement.childNodes.length);
    range.deleteContents();
    component[RENDER_TO_DOM](range)
}