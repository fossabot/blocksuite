import {
  applyUpdate,
  type Doc,
  encodeStateAsUpdate,
  encodeStateVectorFromUpdate,
} from 'yjs';

import type { DatasourceDocAdapter } from './type.js';
import { getDoc } from './utils.js';

const selfUpdateOrigin = Symbol('self-origin');

export const createLazyProvider = (
  rootDoc: Doc,
  datasource: DatasourceDocAdapter
) => {
  let totalRefCount = 0;
  const refCountMap = new Map<string, number>();
  const pendingMap = new Map<string, Uint8Array[]>(); // guid -> pending-updates
  const updateHandlerMap = new Map<string, () => void>();
  let datasourceUnsub: (() => void) | undefined;

  async function syncDoc(doc: Doc) {
    const guid = doc.guid;
    const start = performance.now();

    // perf: optimize me
    const currentUpdate = encodeStateAsUpdate(doc);

    const remoteUpdate = await datasource.queryDocState(guid, {
      stateVector: encodeStateVectorFromUpdate(currentUpdate),
    });

    const updates = [currentUpdate]; // setUpdatesCache(guid, [currentUpdate]);
    pendingMap.set(guid, []);

    if (remoteUpdate) {
      applyUpdate(doc, remoteUpdate, selfUpdateOrigin);
      const newUpdate = encodeStateAsUpdate(
        doc,
        encodeStateVectorFromUpdate(remoteUpdate)
      );
      updates.push(newUpdate);
      await datasource.sendDocUpdate(guid, newUpdate);
    }

    console.log(
      'idb: downloadAndApply',
      guid,
      (performance.now() - start).toFixed(2),
      'ms'
    );
  }

  function setupDocListener(doc: Doc) {
    const handler = async (update: Uint8Array, origin: unknown) => {
      if (origin === selfUpdateOrigin) {
        return;
      }
      datasource.sendDocUpdate(doc.guid, update).catch(console.error);
    };
    doc.on('update', handler);
    updateHandlerMap.set(doc.guid, () => {
      doc.off('update', handler);
    });
  }

  function removeDocListener(doc: Doc) {
    updateHandlerMap.get(doc.guid)?.();
  }

  function setupDatasourceListeners() {
    datasourceUnsub = datasource.onDocUpdate?.((guid, update) => {
      const doc = getDoc(rootDoc, guid);
      if (doc) {
        applyUpdate(doc, update);
      } else {
        // doc is not found, we may need to store it temporarily
        console.warn('idb: doc not found', guid);
        pendingMap.set(guid, (pendingMap.get(guid) ?? []).concat(update));
      }
    });
  }

  async function connect(guid: string) {
    let refcount = refCountMap.get(guid) ?? 0;
    refcount++;
    totalRefCount++;
    refCountMap.set(guid, refcount);
    // console.log('idb: connect', guid, refcount);
    if (refcount === 1) {
      const doc = getDoc(rootDoc, guid);
      if (doc) {
        await syncDoc(doc);
        setupDocListener(doc);
      } else {
        console.warn('idb: doc not found', guid);
      }
    }

    if (totalRefCount === 1) {
      setupDatasourceListeners();
    }
  }

  async function disconnect(guid: string) {
    let refcount = refCountMap.get(guid) ?? 0;
    refcount--;
    totalRefCount--;
    refCountMap.set(guid, refcount);
    // console.log('idb: disconnect', guid, refcount);
    if (refcount === 0) {
      const doc = getDoc(rootDoc, guid);
      if (doc) {
        removeDocListener(doc);
      } else {
        console.warn('idb: doc not found', guid);
      }
    }

    if (totalRefCount === 0) {
      datasourceUnsub?.();
      datasourceUnsub = undefined;
    }
  }

  return {
    connect,
    disconnect,
  };
};
