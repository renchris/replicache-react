import { resolver } from '@rocicorp/resolver';
import { expect } from 'chai';
import React from 'react';
import { render } from 'react-dom';
import { Replicache, TEST_LICENSE_KEY } from 'replicache';
import { useSubscribe } from './index.js';
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
test('null/undefined replicache', async () => {
    const { promise, resolve } = resolver();
    function A({ rep, def }) {
        const subResult = useSubscribe(rep, async () => {
            resolve();
            return 'hello';
        }, { default: def });
        return React.createElement("div", null, subResult);
    }
    const div = document.createElement('div');
    render(React.createElement(A, { key: "a", rep: null, def: "a" }), div);
    expect(div.textContent).to.equal('a');
    render(React.createElement(A, { key: "b", rep: undefined, def: "b" }), div);
    expect(div.textContent).to.equal('b');
    const rep = new Replicache({
        name: 'null-undef-test',
        licenseKey: TEST_LICENSE_KEY,
        mutators: {
            dummy: () => undefined,
        },
    });
    render(React.createElement(A, { key: "c", rep: rep, def: "c" }), div);
    expect(div.textContent).to.equal('c');
    await promise;
    await sleep(1);
    expect(div.textContent).to.equal('hello');
    await rep.close();
});
test('Batching of subscriptions', async () => {
    const mutators = {
        async addData(tx, data) {
            for (const [k, v] of Object.entries(data)) {
                await tx.put(k, v);
            }
        },
    };
    const renderLog = [];
    const rep = new Replicache({
        name: Math.random().toString(36).substring(2),
        mutators,
        licenseKey: TEST_LICENSE_KEY,
    });
    await rep.clientID;
    await sleep(1);
    const div = document.createElement('div');
    function A({ rep }) {
        const dataA = useSubscribe(rep, 
        // TODO: Use type param to get when new Replicache is released.
        async (tx) => (await tx.get('a')), { default: null });
        renderLog.push('render A', dataA);
        return React.createElement(B, { rep: rep, dataA: dataA });
    }
    function B({ rep, dataA }) {
        const dataB = useSubscribe(rep, async (tx) => (await tx.get('b')), { default: null });
        renderLog.push('render B', dataA, dataB);
        return (React.createElement(React.Fragment, null,
            React.createElement("div", null,
                "a: ",
                dataA),
            React.createElement("div", null,
                "b: ",
                dataB)));
    }
    render(React.createElement(A, { rep: rep }), div);
    await sleep(1);
    expect(renderLog).to.deep.equal(['render A', null, 'render B', null, null]);
    expect(div.innerHTML).to.equal('<div>a: </div><div>b: </div>');
    renderLog.length = 0;
    await rep.mutate.addData({ a: 'a1', b: 'b2' });
    await sleep(1);
    expect(renderLog).to.deep.equal(['render A', 'a1', 'render B', 'a1', 'b2']);
    expect(div.innerHTML).to.equal('<div>a: a1</div><div>b: b2</div>');
    renderLog.length = 0;
    await rep.mutate.addData({ b: 'b3' });
    await sleep(1);
    expect(renderLog).to.deep.equal(['render B', 'a1', 'b3']);
    expect(div.innerHTML).to.equal('<div>a: a1</div><div>b: b3</div>');
    await rep.close();
});
test('returning undefined', async () => {
    const { promise, resolve } = resolver();
    function A({ rep, def }) {
        const subResult = useSubscribe(rep, async () => {
            resolve();
            return undefined;
        }, { default: def });
        return React.createElement("div", null, subResult);
    }
    const div = document.createElement('div');
    const rep = new Replicache({
        name: 'return-undefined',
        licenseKey: TEST_LICENSE_KEY,
        mutators: {},
    });
    render(React.createElement(A, { key: "c", rep: rep, def: "default" }), div);
    expect(div.textContent).to.equal('default');
    await promise;
    await sleep(1);
    expect(div.textContent).to.equal('default');
    await rep.close();
});
test('changing subscribable instances', async () => {
    const { promise: p1, resolve: r1 } = resolver();
    function A({ rep, val, res, }) {
        const subResult = useSubscribe(rep, async () => {
            res();
            return val;
        }, undefined);
        return React.createElement("div", null, subResult === undefined ? '' : val);
    }
    const div = document.createElement('div');
    const rep1 = new Replicache({
        name: 'change-instance',
        licenseKey: TEST_LICENSE_KEY,
        mutators: {},
    });
    render(React.createElement(A, { rep: rep1, val: "a", res: r1 }), div);
    await p1;
    await sleep(1);
    expect(div.textContent).to.equal('a');
    const rep2 = new Replicache({
        name: 'change-instance2',
        licenseKey: TEST_LICENSE_KEY,
        mutators: {},
    });
    const { promise: p2, resolve: r2 } = resolver();
    render(React.createElement(A, { rep: rep2, val: "b", res: r2 }), div);
    await p2;
    await sleep(1);
    expect(div.textContent).to.equal('b');
    const { resolve: r3 } = resolver();
    render(React.createElement(A, { rep: undefined, val: "c", res: r3 }), div);
    await sleep(1);
    expect(div.textContent).to.equal('');
    await rep1.close();
    await rep2.close();
});
test('using isEqual', async () => {
    const { promise, resolve } = resolver();
    const sentinel = Symbol();
    class FakeReplicache {
        subscribe(query, { onData, isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b), }) {
            const data = query({});
            let previous = sentinel;
            void data.then(data => {
                if (previous === sentinel || isEqual(previous, data)) {
                    previous = data;
                    return onData(data);
                }
            });
            return () => undefined;
        }
    }
    function A({ rep, def, }) {
        const subResult = useSubscribe(rep, async () => {
            resolve();
            return 123n;
        }, {
            isEqual(a, b) {
                return a === b;
            },
            default: def,
        });
        return (React.createElement("div", null,
            typeof subResult,
            ", ",
            String(subResult)));
    }
    const div = document.createElement('div');
    render(React.createElement(A, { key: "a", rep: null, def: "a" }), div);
    expect(div.textContent).to.equal('string, a');
    render(React.createElement(A, { key: "b", rep: undefined, def: "b" }), div);
    expect(div.textContent).to.equal('string, b');
    const rep = new FakeReplicache();
    render(React.createElement(A, { key: "c", rep: rep, def: "c" }), div);
    expect(div.textContent).to.equal('string, c');
    await promise;
    await sleep(1);
    expect(div.textContent).to.equal('bigint, 123');
});
test.skip('using isEqual [type checking]', async () => {
    const use = (...args) => args;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function expectType(_expression) {
        // intentionally empty
    }
    class FakeReplicache {
        subscribe(query, options) {
            use(query, options);
            return () => undefined;
        }
    }
    {
        const s = useSubscribe(new FakeReplicache(), tx => {
            use(tx);
            return Promise.resolve(123n);
        }, { isEqual: (a, b) => a === b });
        expectType(s);
    }
    {
        // default not passed so it is undefined
        const s = useSubscribe(new FakeReplicache(), tx => {
            use(tx);
            return Promise.resolve(123);
        });
        expectType(s);
    }
    {
        const s = useSubscribe(new FakeReplicache(), tx => {
            use(tx);
            const m = new Map([[1, true]]);
            return Promise.resolve(m);
        });
        expectType(s);
    }
    {
        const s = useSubscribe(new FakeReplicache(), tx => {
            use(tx);
            return Promise.resolve(true);
        }, { default: 456 });
        expectType(s);
    }
    {
        const s = useSubscribe(new FakeReplicache(), tx => {
            use(tx);
            return Promise.resolve(123n);
        }, { isEqual: (a, b) => a === b, default: 'abc' });
        expectType(s);
    }
    {
        // @ ts-expect-error Type 'Promise<bigint>' is not assignable to type 'Promise<ReadonlyJSONValue>'.ts(2345)
        const s = useSubscribe(new FakeReplicache(), tx => {
            use(tx);
            return Promise.resolve(123n);
        });
        use(s);
    }
});
