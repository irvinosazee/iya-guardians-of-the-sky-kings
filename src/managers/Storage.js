/* ============================================================
 * Storage.js — persistent save/load via IndexedDB, with a
 * localStorage fallback. Stores one "save" record.
 * Exposed as window.GameSave (avoids clobbering window.Storage).
 * ============================================================ */
class SaveStore {
  constructor(){
    this.dbName = 'iya-game';
    this.store = 'progress';
    this.db = null;
    this.ready = this._open();
  }

  _open(){
    return new Promise((res) => {
      try {
        if(!window.indexedDB){ res(false); return; }
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if(!db.objectStoreNames.contains(this.store)) db.createObjectStore(this.store);
        };
        req.onsuccess = () => { this.db = req.result; res(true); };
        req.onerror   = () => { this.db = null; res(false); };
      } catch(e){ res(false); }
    });
  }

  async save(data){
    await this.ready;
    if(this.db){
      try {
        await new Promise((res, rej) => {
          const tx = this.db.transaction(this.store, 'readwrite');
          tx.objectStore(this.store).put(data, 'save');
          tx.oncomplete = res; tx.onerror = rej;
        });
        return true;
      } catch(e){ /* fall through */ }
    }
    try { localStorage.setItem('iya-save', JSON.stringify(data)); return true; }
    catch(e){ return false; }
  }

  async load(){
    await this.ready;
    if(this.db){
      try {
        return await new Promise((res) => {
          const tx = this.db.transaction(this.store, 'readonly');
          const rq = tx.objectStore(this.store).get('save');
          rq.onsuccess = () => res(rq.result || null);
          rq.onerror   = () => res(null);
        });
      } catch(e){ /* fall through */ }
    }
    try { const s = localStorage.getItem('iya-save'); return s ? JSON.parse(s) : null; }
    catch(e){ return null; }
  }

  async clear(){
    await this.ready;
    if(this.db){
      try {
        const tx = this.db.transaction(this.store, 'readwrite');
        tx.objectStore(this.store).delete('save');
      } catch(e){}
    }
    try { localStorage.removeItem('iya-save'); } catch(e){}
  }
}
window.GameSave = new SaveStore();
window.autosave = () => { try { if(window.GameSave) GameSave.save(GameState.serialize()); } catch(e){} };
