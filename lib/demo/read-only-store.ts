/**
 * The store behind the public demo: reads come from the demo account, and
 * every write is turned down.
 *
 * Each call builds its own in-memory store from freshly generated data, so
 * two requests, or two server instances, never share a row. Nothing a
 * visitor does can be seen by the next one, because nothing they do is kept:
 * a write comes back as `read-only` without touching any data at all.
 *
 * The write side is written out method by method, not derived from the
 * memory store, so adding a write to the Store interface fails to compile
 * here until the demo has decided what to do with it.
 */

import { createMemoryStore } from "@/lib/store/memory-store";
import { storeFailed, type Store, type StoreResult } from "@/lib/store/types";
import { buildDemoData, DEMO_USER_ID } from "./data";

const refused = async (): Promise<StoreResult<never>> =>
  storeFailed({ kind: "read-only" });

export function createReadOnlyDemoStore(now: Date = new Date()): Store {
  const data = createMemoryStore({
    viewerId: DEMO_USER_ID,
    data: buildDemoData(now),
  });

  return {
    profiles: {
      get: data.profiles.get,
      setSavings: refused,
      markOnboarded: refused,
      createOnboarded: refused,
    },
    incomeSources: {
      list: data.incomeSources.list,
      add: refused,
      remove: refused,
    },
    categories: {
      listVisible: data.categories.listVisible,
      listCustom: data.categories.listCustom,
      find: data.categories.find,
      add: refused,
      remove: refused,
    },
    transactions: {
      listAll: data.transactions.listAll,
      listSince: data.transactions.listSince,
      listRecurring: data.transactions.listRecurring,
      listRecent: data.transactions.listRecent,
      get: data.transactions.get,
      add: refused,
      update: refused,
      remove: refused,
    },
  };
}
