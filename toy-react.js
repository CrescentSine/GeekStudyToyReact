export class Component {
    constructor() {
        this.props = Object.create(null);
        this.children = [];
        this._root = null;
    }
    setAttribute(key, value) {
        this.props[key] = value;
    }
    appendChild(comp) {
        this.children.push(comp)
    }
    get root() {
        if (!this._root) {
            this._root = this.render().root;
        }
        return this._root;
    }
}

class ElementWrapper {
    constructor(tagName) {
        this.root = document.createElement(tagName);
    }
    setAttribute(key, value) {
        this.root.setAttribute(key, value);
    }
    appendChild(comp) {
        this.root.appendChild(comp.root);
    }
}

class TextWrapper {
    constructor(text) {
        this.root = document.createTextNode(text);
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
    parentElement.appendChild(component.root);
}