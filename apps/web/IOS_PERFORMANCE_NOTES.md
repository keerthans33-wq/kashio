# iOS Navigation Performance Notes

## Loading Skeletons (`loading.tsx`)

Next.js App Router treats `loading.tsx` as a Suspense boundary. The skeleton renders instantly while the page's async server data fetch runs, eliminating blank/white flash on navigation.

Added dark-themed skeletons for all main routes:

| Route | File |
|---|---|
| `/dashboard` | `app/(app)/dashboard/loading.tsx` |
| `/wfh` | `app/(app)/wfh/loading.tsx` |
| `/import` | `app/(app)/import/loading.tsx` |
| `/review` | `app/(app)/review/loading.tsx` (rewritten from light-mode) |

All skeletons use `rgba(255,255,255,0.06)` bones with CSS `pulse` animation, matching the app's dark theme (`#05070E` / deep navy backgrounds).

## Optimistic WFH Entry Submission

**Problem:** After submitting a WFH entry the user saw nothing until the server action completed and Next.js revalidated the page.

**Solution:** `WfhEntriesSection.tsx` uses React 19's `useOptimistic` + async `startTransition`:

```tsx
const [entries, addOptimistic] = useOptimistic<OptimisticEntry[], OptimisticEntry>(
  initialEntries,
  (state, newEntry) => [newEntry, ...state].sort((a, b) => b.date.localeCompare(a.date)),
);

function handleAdd(date, hours, note): Promise<{ error: string } | undefined> {
  return new Promise((resolve) => {
    startTransition(async () => {
      addOptimistic({ id: `opt-${Date.now()}`, date, hours, note: note || null, pending: true });
      const result = await addWfhEntry(date, hours, note);
      resolve(result);
    });
  });
}
```

- Entry appears immediately at `opacity: 0.55` with a "saving…" label
- Remove button hidden while pending
- On success: `revalidatePath("/wfh")` causes server re-render; `useOptimistic` auto-reconciles to the real entry
- On error: optimistic state is discarded; `WfhForm` displays the error message

The `startTransition` is wrapped in a `Promise` so `WfhForm` can `await` the result and display server-side validation errors inline.

## Client-Side Navigation

Bottom navigation already uses Next.js `<Link>` components which prefetch routes on hover/visibility. The WFH page export link was updated from `<a href>` to `<Link href>` to benefit from the same prefetch behaviour.
