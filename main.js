import { createElement, Component, Fragment, render } from "./toy-react";

class MyComponent extends Component {
    constructor() {
        super();
        this.state = {
            a: 1,
            b: 2,
        }
    }
    render() {
        let { title, ...props } = this.props;
        return <div {...props}>
            <h1>{title}</h1>
            <button onclick={() =>
                this.setState({ a: this.state.a + 1 })}>add</button>
            <br /><span>{this.state.a.toString()}</span>
            <br /><span>{this.state.b.toString()}</span>
        </div>;
    }
}

render(<Fragment key="alpha">
    <div>abc</div>
    <div>def</div>
    <div>ghi</div>
    <>
        <MyComponent title="mycomponent" />
        <p>#66ccff</p>
        <p>#66ccff</p>
    </>
</Fragment>, document.body);