import { createElement, Component, render } from "./toy-react";

class MyComponent extends Component {
    render() {
        return <div class={this.props.class}>
            <h1 id={this.props.id}>my component</h1>
            {this.children}
        </div>;
    }
}

render(<MyComponent id="a" class="c">
    <div>abc</div>
    <div></div>
    <div></div>
    <div></div>
</MyComponent>, document.body);