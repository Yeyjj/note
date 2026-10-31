/* 列表渲染 */
const notesGrid=document.getElementById('notesGrid');
const pageTitle=document.getElementById('pageTitle');
const pageSubtitle=document.getElementById('pageSubtitle');
const bottomBarEl=document.getElementById('bottomBar');

const TYPE_INFO={
  text:{label:'文本',cls:'badge-text'},
  voice:{label:'语音',cls:'badge-voice'},
  mind:{label:'导图',cls:'badge-mind'},
  draw:{label:'手写',cls:'badge-draw'},
  book:{label:'书籍',cls:'badge-book'},
  chart:{label:'图表',cls:'badge-chart'},
  formula:{label:'公式',cls:'badge-formula'}
};

function getFilteredNotes(){
  let list = notes.slice();
  if(currentFilter === 'trash'){ list = list.filter(n=>n.deleted); }
  else{
    list = list.filter(n=>!n.deleted);
    if(['text','draw','voice','book','mind','chart','formula'].includes(currentFilter)){
      list = list.filter(n=>n.type === currentFilter);
    } else if(currentFilter !== 'all'){
      list = list.filter(n => folderOf(n) === currentFilter);
    }
  }
  if(searchKeyword.trim()){
    const kw = searchKeyword.trim().toLowerCase();
    list = list.filter(n=>{
      const title = (n.title||'').toLowerCase();
      const text = htmlToPlainText(n.content || '').toLowerCase();
      const intro = (n.intro||'').toLowerCase();
      const typeLabel = (TYPE_INFO[n.type]||TYPE_INFO.text).label;
      let extra = '';
      if(n.type==='mind' && n.nodes) extra = n.nodes.map(x=>x.text).join(' ').toLowerCase();
      if(n.type==='book') extra = (n.volumes||[]).map(v=>v.title).join(' ').toLowerCase();
      return title.includes(kw) || text.includes(kw) || intro.includes(kw)
          || typeLabel.includes(kw) || extra.includes(kw);
    });
  }
  return list;
}

function sortNotes(list){
  const arr=[...list];
  switch(currentSort){
    case 'updated':return arr.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0) || (b.updatedAt||b.createdAt)-(a.updatedAt||a.createdAt));
    case 'created':return arr.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0) || (b.createdAt||0)-(a.createdAt||0));
    case 'title':return arr.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0) || (a.title||'').localeCompare(b.title||'','zh'));
    case 'type':{const o={text:0,voice:1,mind:2,draw:3,book:4,chart:5,formula:6};
      return arr.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0) || (o[a.type]||0)-(o[b.type]||0));}
    case 'words':return arr.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0) || countWords(htmlToPlainText(b.content||''))-countWords(htmlToPlainText(a.content||'')));
    case 'size':return arr.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0) || noteSize(b)-noteSize(a));
    default:return arr;
  }
}

function buildNoteCard(note, kw){
  const card=document.createElement('div');
  card.className='note-card';
  if(selectedIds.has(note.id)) card.classList.add('selected');
  if(note.pinned) card.classList.add('pinned');
  if(note.locked) card.classList.add('locked');

  const info=TYPE_INFO[note.type]||TYPE_INFO.text;
  const title=note.title||info.label+'笔记';
  const date=formatDate(note.updatedAt||note.createdAt);

  let thumbHtml = '';
  if(note.type === 'text' || note.type === 'chart' || note.type === 'formula'){
    let inner = note.content || '';
    if(kw) inner = highlightInHTML(inner, kw);
    thumbHtml = '<div class="note-thumb-content">'+inner+'</div>';
  } else if(note.type === 'voice'){
    thumbHtml = '<div class="note-thumb-text">'+SVG_ICON.mic+'录音 '+formatDuration(note.duration||0)+'</div>';
  } else if(note.type === 'mind'){
    thumbHtml = '<div class="mind-thumb"></div>';
    card._mindNodes = note.nodes || [];
  } else if(note.type === 'draw'){
    thumbHtml = '<img src="'+(note.image||'')+'" style="width:100%;height:100%;object-fit:cover;">';
  } else if(note.type === 'book'){
    if(note.cover){
      thumbHtml = '<div class="note-thumb-cover"><img src="'+note.cover+'" alt="封面"></div>';
    } else {
      const volCount=(note.volumes||[]).length;
      const chCount=(note.volumes||[]).reduce((s,v)=>s+(v.chapters||[]).length,0);
      thumbHtml = '<div class="note-thumb-text">'+SVG_ICON.book+volCount+' 卷 · '+chCount+' 章</div>';
    }
  }

  const lockIcon = note.locked ? '<span class="lock-icon">'+SVG_ICON.lock+'</span>' : '';

  card.innerHTML =
    '<div class="note-check"></div>'+
    '<div class="note-badge '+info.cls+'">'+info.label+'</div>'+
    '<div class="note-thumb">'+thumbHtml+'</div>'+
    '<div class="note-meta">'+
      '<div class="note-title">'+lockIcon+highlight(title,kw)+'</div>'+
      '<div class="note-date">'+escapeHtml(date)+'</div>'+
    '</div>';

  if(note.type==='book' && note.cover){
    const b=card.querySelector('.note-badge'); if(b) b.style.display='none';
  }
  card.querySelectorAll('.note-thumb-content img').forEach(img=>img.style.maxWidth='100%');
  card.querySelectorAll('.note-thumb-content a').forEach(a=>a.removeAttribute('href'));
  if((note.type==='text'||note.type==='chart'||note.type==='formula') && note.attachments){
    hydrateAttachments(card.querySelector('.note-thumb-content'), note.attachments);
  }
  hydrateLatex(card.querySelector('.note-thumb-content'));
  bindTodoChecks(card.querySelector('.note-thumb-content'), note, true);

  let longFired = false;
  let pressTimer=null, startX=0, startY=0;

  card.addEventListener('click', e=>{
    if(longFired){ longFired=false; return; }
    if(e.target.closest('.todo-check')) return;
    if(multiSelectMode){ e.stopPropagation(); toggleSelect(note.id,card); return; }
    requestOpenNote(note);
  });

  card.addEventListener('pointerdown', e=>{
    if(multiSelectMode) return;
    if(e.target.closest('.todo-check')) return;
    longFired=false; startX=e.clientX; startY=e.clientY;
    pressTimer=setTimeout(()=>{
      longFired=true;
      openCardMenu(note, e.clientX, e.clientY);
      if(navigator.vibrate) try{navigator.vibrate(15);}catch(_){}
    }, 480);
  });
  card.addEventListener('pointermove', e=>{
    if(!pressTimer) return;
    if(Math.hypot(e.clientX-startX, e.clientY-startY) > 8){
      clearTimeout(pressTimer); pressTimer=null;
    }
  });
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>
    card.addEventListener(ev, ()=>{ if(pressTimer){clearTimeout(pressTimer);pressTimer=null;} })
  );

  return card;
}

const sidebar = document.getElementById('sidebar');
const sidebarTypes = document.getElementById('sidebarTypes');
const folderList = document.getElementById('folderList');
const editFoldersBtn = document.getElementById('editFoldersBtn');

function renderSidebar(){
  const typeItems = [
    {id:'all', icon:SVG_ICON.list, label:'全部笔记'},
    {id:'text', icon:SVG_ICON.doc, label:'文本笔记'},
    {id:'draw', icon:SVG_ICON.pen, label:'手写笔记'},
    {id:'voice', icon:SVG_ICON.mic, label:'语音笔记'},
    {id:'book', icon:SVG_ICON.book, label:'书籍'},
    {id:'mind', icon:SVG_ICON.brain, label:'思维导图'},
    {id:'trash', icon:SVG_ICON.trash, label:'最近删除'},
  ];
  sidebarTypes.innerHTML = typeItems.map(t=>{
    let count = 0;
    if(t.id === 'trash') count = notes.filter(n=>n.deleted).length;
    else if(t.id === 'all') count = notes.filter(n=>!n.deleted).length;
    else count = notes.filter(n=>!n.deleted && n.type === t.id).length;
    const active = currentFilter === t.id ? ' active' : '';
    const danger = t.id === 'trash' ? ' danger' : '';
    return '<div class="sidebar-item'+active+danger+'" data-filter="'+t.id+'">'+
      '<span class="sb-icon">'+t.icon+'</span>'+
      '<span class="sb-label">'+t.label+'</span>'+
      '<span class="sb-count">'+count+'</span>'+
    '</div>';
  }).join('');

  folderList.innerHTML = folders.map(f=>{
    const count = notes.filter(n=>!n.deleted && folderOf(n) === f.id).length;
    const active = currentFilter === f.id ? ' active' : '';
    return '<div class="folder-item'+active+'" data-folder="'+f.id+'">'+
      '<span class="folder-dot" style="background:'+f.color+'"></span>'+
      '<span class="folder-name">'+escapeHtml(f.name)+'</span>'+
      '<span class="folder-count">'+count+'</span>'+
      '<button class="folder-del" data-del-folder="'+f.id+'">×</button>'+
      '<span class="folder-chev">›</span>'+
    '</div>';
  }).join('');

  sidebarTypes.querySelectorAll('.sidebar-item').forEach(el=>{
    el.addEventListener('click',()=>{
      currentFilter = el.dataset.filter;
      closeSidebar();
      renderNotes();renderSidebar();
    });
  });
  folderList.querySelectorAll('.folder-item').forEach(el=>{
    el.addEventListener('click',(e)=>{
      if(e.target.classList.contains('folder-del')) return;
      currentFilter = el.dataset.folder;
      closeSidebar();
      renderNotes();renderSidebar();
    });
  });
  folderList.querySelectorAll('.folder-del').forEach(el=>{
    el.addEventListener('click',(e)=>{
      e.stopPropagation();
      const id = el.dataset.delFolder;
      if(id === UNCAT_ID){ showToast('「未分类」不可删除'); return; }
      if(!confirm('删除该文件夹？（笔记会归入未分类）')) return;
      dbDeleteFolder(id).then(()=>{
        folders = folders.filter(f=>f.id !== id);
        notes.forEach(n=>{
          if(n.folderId === id){ n.folderId = null; dbPut(n); }
        });
        if(currentFilter === id) currentFilter = 'all';
        renderSidebar();renderNotes();
      });
    });
  });
  updateSidebarShift();
}

editFoldersBtn.addEventListener('click',()=>{
  sidebarEditing = !sidebarEditing;
  sidebar.classList.toggle('editing', sidebarEditing);
  editFoldersBtn.textContent = sidebarEditing ? '完成' : '编辑';
});

const toggleIcon = document.getElementById('toggleIcon');
const overlay = document.getElementById('overlay');
const sidebarSettings = document.getElementById('sidebarSettings');
const menuCard = document.getElementById('menuCard');
const hamburger = document.getElementById('hamburger');

function openSidebar(){
  sidebar.classList.add('open');
  overlay.classList.add('open');
  toggleIcon.classList.add('active');
  document.body.classList.add('sidebar-open');
  closeMenuCard(true);
  closeSearch();
  requestAnimationFrame(updateSidebarShift);
}
function closeSidebar(){
  sidebar.classList.remove('open');
  toggleIcon.classList.remove('active');
  document.body.classList.remove('sidebar-open');
  if(!menuCard.classList.contains('open')) overlay.classList.remove('open');
  sidebarEditing = false;
  sidebar.classList.remove('editing');
  editFoldersBtn.textContent = '编辑';
  sidebar.querySelectorAll('.shifted').forEach(el=>el.classList.remove('shifted'));
}
toggleIcon.addEventListener('click',e=>{
  e.stopPropagation();
  if(sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
});
overlay.addEventListener('click',()=>{
  if(menuCard.classList.contains('open')){ closeMenuCard(); return; }
  if(sidebar.classList.contains('open')){ closeSidebar(); return; }
});

sidebarSettings.addEventListener('click',()=>{
  closeSidebar();
  openScreen(settingsScreen);
});

let sidebarScrollRaf = null;
function updateSidebarShift(){
  if(!sidebar.classList.contains('open')) return;
  const br = toggleIcon.getBoundingClientRect();
  const items = sidebar.querySelectorAll('.sidebar-item, .folder-item');
  items.forEach(el=>{
    const r = el.getBoundingClientRect();
    const overlap = r.bottom > br.top && r.top < br.bottom && r.left < br.right && r.right > br.left;
    el.classList.toggle('shifted', overlap);
  });
}
sidebar.addEventListener('scroll', ()=>{
  if(sidebarScrollRaf) return;
  sidebarScrollRaf = requestAnimationFrame(()=>{
    sidebarScrollRaf = null;
    updateSidebarShift();
  });
}, { passive:true });

const cardMenu = document.createElement('div');
cardMenu.id = 'cardMenu';
cardMenu.innerHTML = `
  <div class="mi" data-act="pin">${SVG_ICON.pin}<span>置顶</span></div>
  <div class="mi" data-act="folder">${SVG_ICON.folder}<span>移动到…</span></div>
  <div class="mi" data-act="lock">${SVG_ICON.lock}<span>加密</span></div>
  <div class="divider"></div>
  <div class="mi danger" data-act="delete">${SVG_ICON.trash}<span>删除</span></div>
`;
document.body.appendChild(cardMenu);

let menuNote = null;
function openCardMenu(note, x, y){
  menuNote = note;
  cardMenu.querySelector('[data-act="pin"] span').textContent = note.pinned ? '取消置顶' : '置顶';
  cardMenu.querySelector('[data-act="lock"] span').textContent = note.locked ? '移除密码' : '加密';
  const w=180, h=200;
  cardMenu.style.left = Math.max(8, Math.min(x, innerWidth-w-8))+'px';
  cardMenu.style.top  = Math.max(8, Math.min(y, innerHeight-h-8))+'px';
  cardMenu.style.opacity='1'; cardMenu.style.pointerEvents='auto';
  cardMenu.style.transform='scale(1)';
}
function closeCardMenu(){
  cardMenu.style.opacity='0'; cardMenu.style.pointerEvents='none';
  cardMenu.style.transform='scale(.92)'; menuNote=null;
}
cardMenu.addEventListener('click', async e=>{
  const item = e.target.closest('[data-act]'); if(!item||!menuNote) return;
  const act = item.dataset.act; const n = menuNote; closeCardMenu();
  if(act==='pin'){ n.pinned=!n.pinned; await updateNote(n); showToast(n.pinned?'已置顶':'已取消置顶'); }
  if(act==='folder'){ openFolderPicker(n); }
  if(act==='lock'){ n.locked? removePassword(n) : openPasswordDialog('set', n); }
  if(act==='delete'){
    if(confirm('确定删除「'+(n.title||'无标题')+'」吗？')){
      n.deleted=true; n.deletedAt=Date.now(); await updateNote(n);
      showToast('已移至回收站'); renderSidebar();
    }
  }
});
document.addEventListener('click', e=>{ if(!cardMenu.contains(e.target)) closeCardMenu(); });

const selectBar=document.getElementById('selectBar');
const selectCount=document.getElementById('selectCount');

function exitMultiSelect(){
  multiSelectMode=false;selectedIds.clear();
  document.body.classList.remove('multi-select');
  selectBar.classList.remove('open');renderNotes();
}
function toggleSelect(id,cardEl){
  if(selectedIds.has(id))selectedIds.delete(id);else selectedIds.add(id);
  if(cardEl)cardEl.classList.toggle('selected',selectedIds.has(id));
  selectCount.textContent='已选 '+selectedIds.size+' 项';
  document.getElementById('selectShare').style.display=selectedIds.size?'':'none';
  document.getElementById('selectDelete').style.display=selectedIds.size?'':'none';
}
document.getElementById('selectCancel').addEventListener('click',exitMultiSelect);
document.getElementById('selectDelete').addEventListener('click',async()=>{
  if(!selectedIds.size)return;
  if(!confirm('确定删除选中的 '+selectedIds.size+' 条笔记吗？'))return;
  for(const id of [...selectedIds]){
    const n = notes.find(x=>x.id===id);
    if(n){n.deleted = true;n.deletedAt = Date.now();await dbPut(n);}
  }
  exitMultiSelect(); renderSidebar();
});

async function createHistorySnapshot(noteToSnapshot){
  const historyEnabled = localStorage.getItem('notes_history_enabled') !== '0';
  if(!historyEnabled || !noteToSnapshot || noteToSnapshot.deleted) return;

  const contentSignature = JSON.stringify({
    t: noteToSnapshot.title, c: noteToSnapshot.content, n: noteToSnapshot.nodes,
    im: noteToSnapshot.image, v: noteToSnapshot.volumes, i: noteToSnapshot.intro, cv: noteToSnapshot.cover
  });

  const existingHistory = await dbGetHistory(noteToSnapshot.id);
  if (existingHistory.length > 0) {
    const latest = existingHistory[0];
    const latestSignature = JSON.stringify({
      t: latest.title, c: latest.content, n: latest.nodes, im: latest.image,
      v: latest.volumes, i: latest.intro, cv: latest.cover
    });
    if (contentSignature === latestSignature) return; 
  }

  let previewText = '';
  if(noteToSnapshot.type === 'text' || noteToSnapshot.type === 'chart' || noteToSnapshot.type === 'formula'){
    previewText = htmlToPlainText(noteToSnapshot.content || '').slice(0, 80);
  } else if(noteToSnapshot.type === 'book'){
    previewText = (noteToSnapshot.intro || '').slice(0, 80) || '书籍';
  } else if(noteToSnapshot.type === 'mind'){
    previewText = (noteToSnapshot.nodes || []).map(n => n.text).join(', ').slice(0, 80);
  } else if(noteToSnapshot.type === 'draw'){
    previewText = '手写笔记';
  } else {
    previewText = noteToSnapshot.title || '';
  }

  const historyItem = {
    id: newId('h'), noteId: noteToSnapshot.id, title: noteToSnapshot.title,
    content: noteToSnapshot.content,
    nodes: noteToSnapshot.nodes ? JSON.parse(JSON.stringify(noteToSnapshot.nodes)) : null,
    image: noteToSnapshot.image,
    volumes: noteToSnapshot.volumes ? JSON.parse(JSON.stringify(noteToSnapshot.volumes)) : null,
    intro: noteToSnapshot.intro, cover: noteToSnapshot.cover, type: noteToSnapshot.type,
    savedAt: Date.now(), preview: previewText
  };

  await dbPutHistory(historyItem);
  await dbEnforceHistoryLimit(noteToSnapshot.id);
}

async function addNote(note){
  if(!note.folderId) note.folderId = UNCAT_ID;
  await dbPut(note); notes.push(note); renderNotes(); renderSidebar();
}

async function updateNote(note){
  note.updatedAt=Date.now(); await dbPut(note);
  const i=notes.findIndex(n=>n.id===note.id); if(i>=0) notes[i]=note;
  renderNotes();
}

async function removeNote(id){
  await dbDelete(id); notes=notes.filter(n=>n.id!==id);
  await dbClearHistoryForNote(id);
  renderNotes(); renderSidebar();
}

function openScreen(el){el.classList.add('open');}
function closeScreen(el){el.classList.remove('open');}

/* 搜索相关逻辑调整 */
const searchBtn=document.getElementById('searchBtn');
const searchPill=document.getElementById('searchPill');
const searchInput=document.getElementById('searchInput');
const searchMask=document.getElementById('searchMask');
let searchOpen=false;
function toggleMenuCard(){
  if(!menuCard.classList.contains('open')){
    closeSearch();
    menuCard.classList.add('open');
    hamburger.classList.add('active');
    overlay.classList.add('open');
    document.body.classList.add('menu-open');
  } else {
    closeMenuCard();
  }
}
function closeMenuCard(keepOverlay){
  menuCard.classList.remove('open');
  hamburger.classList.remove('active');
  document.body.classList.remove('menu-open');
  menuCard.querySelectorAll('.menu-item').forEach(i=>i.classList.remove('expanded'));
  menuCard.querySelectorAll('.submenu').forEach(s=>s.classList.remove('open'));
  if(!keepOverlay && !sidebar.classList.contains('open')){
    overlay.classList.remove('open');
  }
}
hamburger.addEventListener('click',e=>{e.stopPropagation();toggleMenuCard();});
menuCard.addEventListener('click',e=>e.stopPropagation());

menuCard.querySelectorAll('.menu-item[data-menu]').forEach(item=>{
  item.addEventListener('click',()=>{
    const m=item.dataset.menu;
    if(m==='settings'){closeMenuCard();openScreen(settingsScreen);return;}
    const subId=m==='view'?'submenuView':'submenuSort';
    const sub=document.getElementById(subId);
    const isOpen=item.classList.contains('expanded');
    menuCard.querySelectorAll('.menu-item').forEach(i=>i.classList.remove('expanded'));
    menuCard.querySelectorAll('.submenu').forEach(s=>s.classList.remove('open'));
    if(!isOpen){item.classList.add('expanded');sub.classList.add('open');}
  });
});
function switchView(newView){
  if(newView===currentView){closeMenuCard();return;}
  currentView=newView; savePrefs(); updateSubmenuChecks();
  notesGrid.classList.add('switching');
  setTimeout(()=>{
    renderNotes();
    requestAnimationFrame(()=>requestAnimationFrame(()=>notesGrid.classList.remove('switching')));
  },180);
  closeMenuCard();
}
menuCard.querySelectorAll('[data-view]').forEach(el=>{
  el.addEventListener('click',()=>switchView(el.dataset.view));});
menuCard.querySelectorAll('[data-sort]').forEach(el=>{
  el.addEventListener('click',()=>{
    currentSort=el.dataset.sort; savePrefs(); updateSubmenuChecks(); renderNotes(); closeMenuCard();});});
function updateSubmenuChecks(){
  menuCard.querySelectorAll('[data-check]').forEach(c=>{
    const k=c.dataset.check;
    c.textContent=(k===currentView||k===currentSort)?'✓':'';
  });
  menuCard.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('selected',el.dataset.view===currentView));
  menuCard.querySelectorAll('[data-sort]').forEach(el=>el.classList.toggle('selected',el.dataset.sort===currentSort));
}

searchBtn.addEventListener('click',e=>{e.stopPropagation();openSearch();});
function openSearch(){
  if(searchOpen)return;
  searchOpen=true; closeMenuCard(); closeCardMenu();
  searchBtn.classList.add('hidden');
  searchPill.classList.add('active');
  searchMask.classList.add('open'); // 显示遮罩
  document.body.classList.add('search-open');
  // 强制聚焦，兼容移动端
  setTimeout(()=>{ if(searchOpen) { searchInput.focus(); } }, 300);
}
function closeSearch(){
  if(!searchOpen)return;
  searchOpen=false;
  searchBtn.classList.remove('hidden');
  searchPill.classList.remove('active');
  searchMask.classList.remove('open'); // 隐藏遮罩
  document.body.classList.remove('search-open');
  searchInput.value=''; searchKeyword=''; renderNotes();
}
searchInput.addEventListener('input',()=>{searchKeyword=searchInput.value;renderNotes();});
searchInput.addEventListener('blur',()=>{
  setTimeout(()=>{if(searchOpen&&document.activeElement!==searchInput)closeSearch();},150);});
document.addEventListener('click',e=>{
  if(!searchOpen)return;
  if(searchPill.contains(e.target))return;
  closeSearch();
});
searchMask.addEventListener('click', closeSearch); // 点击遮罩关闭搜索

const bottomBar=document.getElementById('bottomBar');
const addBtn=document.getElementById('addBtn');
const btnVoice=document.getElementById('btnVoice');
const btnMindmap=document.getElementById('btnMindmap');
const btnImport=document.getElementById('btnImport');
const btnPen=document.getElementById('btnPen');
const btnBook=document.getElementById('btnBook');
let pressTimer=null, longPressFired=false, isExpanded=false;
const HOLD_MS=300;

addBtn.addEventListener('pointerdown',e=>{
  e.stopPropagation();
  if(isExpanded)return;
  longPressFired=false;
  pressTimer=setTimeout(()=>{ longPressFired=true; isExpanded=true; bottomBar.classList.add('expanded'); },HOLD_MS);
});
addBtn.addEventListener('pointerup',e=>{
  e.stopPropagation();
  if(pressTimer){clearTimeout(pressTimer);pressTimer=null;}
  const wl=longPressFired; longPressFired=false;
  if(wl)return;
  openTextEditor(null);
});
['pointerleave','pointercancel'].forEach(evt=>{
  addBtn.addEventListener(evt,()=>{ if(pressTimer){clearTimeout(pressTimer);pressTimer=null;} longPressFired=false; });
});
btnVoice.addEventListener('click',e=>{e.stopPropagation();isExpanded=false;bottomBar.classList.remove('expanded');openVoiceEditor();});
btnMindmap.addEventListener('click',e=>{e.stopPropagation();isExpanded=false;bottomBar.classList.remove('expanded');openMindEditor(null);});
btnPen.addEventListener('click',e=>{e.stopPropagation();isExpanded=false;bottomBar.classList.remove('expanded');openDrawEditor(null);});
btnBook.addEventListener('click',e=>{e.stopPropagation();isExpanded=false;bottomBar.classList.remove('expanded');openBookEditor(null);});
document.addEventListener('click',e=>{
  if(!isExpanded)return;
  if(bottomBar.contains(e.target))return;
  isExpanded=false; bottomBar.classList.remove('expanded');
});

let resizeTimer=null;
window.addEventListener('resize',()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{
    notesGrid.querySelectorAll('.note-card').forEach(card=>{
      if(card._mindNodes){
        const t=card.querySelector('.mind-thumb');
        if(t){ t.innerHTML=''; renderMindThumb(t, card._mindNodes); }
      }
    });
    updateSidebarShift();
  },180);
});

let headerCollapsed = false;
const HEADER_COLLAPSE_THRESHOLD = 40;

function setHeaderCollapsed(collapsed){
  if(collapsed === headerCollapsed) return;
  headerCollapsed = collapsed;
  const root = document.documentElement.style;
  if(collapsed){
    root.setProperty('--header-title-top', '18px');
    root.setProperty('--header-title-left', '72px');
    root.setProperty('--header-title-size', '17px');
    root.setProperty('--header-subtitle-top', '38px');
    root.setProperty('--header-subtitle-left', '72px');
    root.setProperty('--header-grid-top', '64px');
    root.setProperty('--header-bar-height', '64px');
    root.setProperty('--header-bar-opacity', '1');
  } else {
    root.setProperty('--header-title-top', '72px');
    root.setProperty('--header-title-left', '27px');
    root.setProperty('--header-title-size', '32px');
    root.setProperty('--header-subtitle-top', '112px');
    root.setProperty('--header-subtitle-left', '28px');
    root.setProperty('--header-grid-top', '142px');
    root.setProperty('--header-bar-height', '0px');
    root.setProperty('--header-bar-opacity', '0');
  }
}
function syncHeaderCollapse(){
  setHeaderCollapsed(notesGrid.scrollTop > HEADER_COLLAPSE_THRESHOLD);
}
notesGrid.addEventListener('scroll', syncHeaderCollapse, { passive:true });