import { useEffect, useState } from 'react';
// React 19+ has automatic batching for all updates (including microtasks),
// so we no longer need unstable_batchedUpdates. We still batch via microtask
// to ensure we do not render more than once over all changed subscriptions.
let hasPendingCallback = false;
let callbacks = [];
function doCallback() {
    const cbs = callbacks;
    callbacks = [];
    hasPendingCallback = false;
    for (const callback of cbs) {
        callback();
    }
}
/**
 * Runs a query and returns the result. Re-runs automatically whenever the
 * query changes.
 *
 * NOTE: Changing `r` will cause the query to be re-run, but changing `query`
 * or `options` will not (by default). This is by design because these two
 * values are often object/array/function literals which change on every
 * render. If you want to re-run the query when these change, you can pass
 * them as dependencies.
 */
export function useSubscribe(r, query, options = {}) {
    const { default: def, dependencies = [], isEqual } = options;
    const [snapshot, setSnapshot] = useState(undefined);
    useEffect(() => {
        if (!r) {
            return;
        }
        const unsubscribe = r.subscribe(query, {
            onData: data => {
                // This is safe because we know that subscribe in fact can only return
                // `R` (the return type of query or def).
                callbacks.push(() => setSnapshot(data));
                if (!hasPendingCallback) {
                    void Promise.resolve().then(doCallback);
                    hasPendingCallback = true;
                }
            },
            isEqual,
        });
        return () => {
            unsubscribe();
            setSnapshot(undefined);
        };
    }, [r, ...dependencies]);
    if (snapshot === undefined) {
        return def;
    }
    return snapshot;
}
