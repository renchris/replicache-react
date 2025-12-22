# replicache-react

[![npm version](https://badge.fury.io/js/replicache-react.svg)](https://www.npmjs.com/package/replicache-react)

<br />
  <pre>npm i <a href="https://www.npmjs.com/package/replicache-react">replicache-react</a></pre>
  <br />

Provides a `useSubscribe()` hook for React which wraps Replicache's `subscribe()` method.

## React 19+ Fork

This is a **React 19+ compatible fork** of the official `replicache-react` package. Key differences:

- **Removes deprecated batching APIs**: No longer relies on `unstable_batchedUpdates`, leveraging React 19's automatic batching instead
- **Adds `keepPreviousData` option**: Eliminates UI flash during navigation by preserving data across subscription transitions
- **Requires React 19+**: Takes advantage of improved batching behavior in React 19

### Installation

```bash
npm install @renchris/replicache-react
# or via GitHub
npm install renchris/replicache-react#feat/react-19-automatic-batching
```

**Peer Dependencies**: React 19+

### Migration from Official Package

1. Update to React 19+
2. Replace `replicache-react` with `@renchris/replicache-react` in your `package.json`
3. No code changes required - API is fully compatible
4. Optional: Use new `keepPreviousData` option to prevent UI flash during navigation

## API

### function useSubscribe

React hook that allows you monitor replicache changes

| Parameter        | Type                                        | Description                                                                      |
| :--------------- | :------------------------------------------ | :------------------------------------------------------------------------------- |
| `rep`            | `Replicache`                                | Replicache instance that is being monitored                                      |
| `query`          | `(tx: ReadTransaction) => Promise<R>`       | Query that retrieves data to be watched                                          |
| `options?`       | `Object \| undefined`                       | Option bag containing the named arguments listed below ⬇️                        |
| `.default?`      | `R \| undefined = undefined`                | Default value returned on first render _or_ whenever `query` returns `undefined` |
| `.dependencies?` | `Array<any> = []`                           | List of dependencies, query will be rerun when any of these change               |
| `.isEqual?`      | `((a: R, b: R) => boolean) = jsonDeepEqual` | Compare two returned values. Used to know whether to refire subscription.        |
| `.keepPreviousData?` | `boolean = true`                            | When `true` (default), preserves previous data during dependency transitions to eliminate UI flash. Set to `false` to reset immediately. |

## Usage

example of `useSubscribe` in todo app that is watching a specific category

```js
const {category} = props;
const todos = useSubscribe(
  replicache,
  tx => {
    return tx
      .scan({prefix: `/todo/${category}`})
      .values()
      .toArray();
  },
  {
    default: [],
    dependencies: [category],
  },
);

return (
  <ul>
    {todos.map(t => (
      <li>{t.title}</li>
    ))}
  </ul>
);
```

## New Feature: `keepPreviousData`

The `keepPreviousData` option (default: `true`) eliminates UI flash when navigating between views with different subscription dependencies.

### Problem Without `keepPreviousData`

When switching between subscriptions (e.g., navigating between categories), the hook traditionally resets to `undefined` or the default value, causing a brief flash of empty content before new data loads:

```typescript
// User switches from category "work" to "personal"
// 1. Hook unsubscribes from "work" data → returns default: []
// 2. UI renders empty list (FLASH!)
// 3. Hook subscribes to "personal" data
// 4. UI renders "personal" todos
```

### Solution With `keepPreviousData: true` (Default)

The hook preserves the previous subscription's data while the new subscription initializes:

```typescript
// User switches from category "work" to "personal"
// 1. Hook unsubscribes from "work" data → KEEPS "work" data displayed
// 2. Hook subscribes to "personal" data
// 3. UI renders "personal" todos (NO FLASH!)
```

### Example

```typescript
const todos = useSubscribe(
  rep,
  tx => getTodosByCategory(tx, category),
  {
    default: [],
    dependencies: [category],
    keepPreviousData: true, // Default - can be omitted
  }
);

// When category changes:
// - Old behavior: Shows [] briefly → new data
// - New behavior: Shows old data → new data (smooth transition)
```

### When to Disable

Set `keepPreviousData: false` if you want to explicitly show the default value during transitions:

```typescript
const todos = useSubscribe(
  rep,
  tx => getTodosByCategory(tx, category),
  {
    default: [],
    dependencies: [category],
    keepPreviousData: false, // Show [] during category switch
  }
);
```

## Changelog

### 6.1.0 (React 19+ Fork)

- **NEW**: Add `keepPreviousData` option (default: `true`) to eliminate UI flash during subscription transitions
- **Enhancement**: Add generation counter to prevent stale subscription callbacks
- **Enhancement**: Add isMounted guard to prevent setState after unmount
- **Enhancement**: Improve type safety with `Exclude<T, undefined>` instead of conditional type
- **Enhancement**: Add comprehensive JSDoc documentation with examples
- Requires React 19+

### 6.0.0

Remove `unstable_batchedUpdates` - no longer needed with React 19's automatic batching.
Requires React 19+. See https://react.dev/blog/2024/12/05/react-19

### 5.0.1

Change package to pure ESM. See See https://github.com/rocicorp/replicache-react/pull/61 for more information.

### 5.0.0

- Add support for custom `isEqual`. See https://github.com/rocicorp/replicache-react/pull/59 for more information.
- Requires Replicache 14.

### 4.0.1

Removes `def` from default dependencies. This is how it was before 0.4.0. Including by default makes it very easy to accidentally trigger render loops. People can added it explicitly if they really want.

### 4.0.0

This release changes the semantics of `def` slightly. In previous releases, `def` was returned only until `query` returned, then `useSubscribe` returns `query`'s result. Now, `def` is returned initially, but also if `query` returns `undefined`.

This is an ergonomic benefit because it avoids having to type the default in two places. Before:

```ts
useSubscribe(r, tx => (await tx.get('count')) ?? 0, 0);
```

now:

```ts
useSubscribe(r, tx => tx.get('count'), 0);
```

### 3.1.0

Support a new generic form of `ReadTransaction`. New Replicaches and Reflects have `tx.get<T>` and `tx.scan<T>`. This update adds support for these to `replicache-react`. See: https://github.com/rocicorp/replicache-react/pull/55

### 3.0.0

Support (and require) Replicache 13.

### 2.11.0

When changing the value of `r` passed in, return the `def` value again, until the new subscription fires. See: https://github.com/rocicorp/replicache-react/commit/369d7513b09f48598db338c6776a9a22c7198e5c
