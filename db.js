/* IndexedDB */

const DB_NAME='notes_db', DB_VERSION=4, STORE='notes', FOLDER_STORE='folders', HISTORY_STORE='history';
let db=null;
function openDB(){return new Promise((res,rej)=>{
  const r=indexedDB.open(DB_NAME,DB_VERSION);
  r.onupgradeneeded=e=>{const d=e.target.result;
    if(!d.objectStoreNames.contains(STORE)){
      const s=d.createObjectStore(STORE,{keyPath:'id'});
      s.createIndex('updatedAt','updatedAt');
      s.createIndex('createdAt','createdAt');
    }
    if(!d.objectStoreNames.contains(FOLDER_STORE)){
      d.createObjectStore(FOLDER_STORE,{keyPath:'id'});
    }
    if(!d.objectStoreNames.contains(HISTORY_STORE)){
      const hs = d.createObjectStore(HISTORY_STORE, {keyPath:'id'});
      hs.createIndex('noteId', 'noteId');
    }
  };
  r.onsuccess=e=>{db=e.target.result;res(db);};
  r.onerror=e=>rej(e.target.error);
});}
function dbPut(n){return new Promise((res,rej)=>{
  const t=db.transaction(STORE,'readwrite');
  t.objectStore(STORE).put(n);
  t.oncomplete=()=>res();t.onerror=e=>rej(e.target.error);});}
function dbDelete(id){return new Promise((res,rej)=>{
  const t=db.transaction(STORE,'readwrite');
  t.objectStore(STORE).delete(id);
  t.oncomplete=()=>res();t.onerror=e=>rej(e.target.error);});}
function dbGetAll(){return new Promise((res,rej)=>{
  const t=db.transaction(STORE,'readonly');
  const r=t.objectStore(STORE).getAll();
  r.onsuccess=()=>res(r.result||[]);r.onerror=e=>rej(e.target.error);});}
function dbGetAllFolders(){return new Promise((res,rej)=>{
  const t=db.transaction(FOLDER_STORE,'readonly');
  const r=t.objectStore(FOLDER_STORE).getAll();
  r.onsuccess=()=>res(r.result||[]);r.onerror=e=>rej(e.target.error);});}
function dbPutFolder(f){return new Promise((res,rej)=>{
  const t=db.transaction(FOLDER_STORE,'readwrite');
  t.objectStore(FOLDER_STORE).put(f);
  t.oncomplete=()=>res();t.onerror=e=>rej(e.target.error);});}
function dbDeleteFolder(id){return new Promise((res,rej)=>{
  const t=db.transaction(FOLDER_STORE,'readwrite');
  t.objectStore(FOLDER_STORE).delete(id);
  t.oncomplete=()=>res();t.onerror=e=>rej(e.target.error);});}

// 历史版本操作
function dbPutHistory(item){return new Promise((res,rej)=>{
  const t=db.transaction(HISTORY_STORE,'readwrite');
  t.objectStore(HISTORY_STORE).put(item);
  t.oncomplete=()=>res();t.onerror=e=>rej(e.target.error);});}

function dbGetHistory(noteId){return new Promise((res,rej)=>{
  const t=db.transaction(HISTORY_STORE,'readonly');
  const idx = t.objectStore(HISTORY_STORE).index('noteId');
  const r = idx.getAll(noteId);
  r.onsuccess=()=>res((r.result||[]).sort((a,b)=>b.savedAt-a.savedAt));
  r.onerror=e=>rej(e.target.error);});}

function dbDeleteHistory(id){return new Promise((res,rej)=>{
  const t=db.transaction(HISTORY_STORE,'readwrite');
  t.objectStore(HISTORY_STORE).delete(id);
  t.oncomplete=()=>res();t.onerror=e=>rej(e.target.error);});}

function dbClearHistoryForNote(noteId){return new Promise((res,rej)=>{
  const t=db.transaction(HISTORY_STORE,'readwrite');
  const store = t.objectStore(HISTORY_STORE);
  const idx = store.index('noteId');
  const req = idx.openCursor(noteId);
  req.onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      store.delete(cursor.primaryKey);
      cursor.continue();
    }
  };
  t.oncomplete=()=>res();t.onerror=e=>rej(e.target.error);});}

async function dbEnforceHistoryLimit(noteId) {
  const policy = localStorage.getItem('notes_history_policy') || 'count';
  const limit = parseInt(localStorage.getItem('notes_history_limit') || '20', 10);
  const history = await dbGetHistory(noteId);
  
  if (policy === 'count') {
    if (history.length > limit) {
      // 删除超出部分（history已按时间降序，删除末尾的）
      for (let i = limit; i < history.length; i++) {
        await dbDeleteHistory(history[i].id);
      }
    }
  } else if (policy === 'time') {
    const cutoff = Date.now() - limit * 24 * 3600 * 1000;
    for (const item of history) {
      if (item.savedAt < cutoff) {
        await dbDeleteHistory(item.id);
      } else {
        // 因为已经降序排列，只要遇到一个未过期的，后面的就都不用过期了
        break;
      }
    }
  }
}