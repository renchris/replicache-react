import { DependencyList } from 'react';
export type Subscribable<Tx> = {
    subscribe<Data>(query: (tx: Tx) => Promise<Data>, options: {
        onData: (data: Data) => void;
        isEqual?: ((a: Data, b: Data) => boolean) | undefined;
    }): () => void;
};
export type RemoveUndefined<T> = T extends undefined ? never : T;
export type UseSubscribeOptions<QueryRet, Default> = {
    /** Default can already be undefined since it is an unbounded type parameter. */
    default?: Default;
    dependencies?: DependencyList | undefined;
    isEqual?: ((a: QueryRet, b: QueryRet) => boolean) | undefined;
};
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
export declare function useSubscribe<Tx, QueryRet, Default = undefined>(r: Subscribable<Tx> | null | undefined, query: (tx: Tx) => Promise<QueryRet>, options?: UseSubscribeOptions<QueryRet, Default>): RemoveUndefined<QueryRet> | Default;
