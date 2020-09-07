import { createElement, Component, render } from "./toy-react";

class MyComponent extends Component {
    render() {
        let { title, ...props } = this.props;
        return <div {...props}>
            <h1>{title}</h1>
            {this.children}
        </div>;
    }
}

render(<MyComponent id="a" title="my component">
    <div>abc</div>
    <div>def</div>
    <div>ghi</div>
    <p>#66ccff</p>
</MyComponent>, document.body);