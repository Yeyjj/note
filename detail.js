/* 详情 */
const noteDetail=document.getElementById('noteDetail');
const detailTitle=document.getElementById('detailTitle');
const detailDate=document.getElementById('detailDate');
const detailContentWrap=document.getElementById('detailContentWrap');
const detailEdit=document.getElementById('detailEdit');
const detailShare=document.getElementById('detailShare');
const detailDeleteBtn=document.getElementById('detailDelete');
const detailClickArea=document.getElementById('detailClickArea');
const detailMoreBtn=document.getElementById('detailMoreBtn');
const detailMenu=document.getElementById('detailMenu');
const historyScreen=document.getElementById('historyScreen');
const historyList=document.getElementById('historyList');
let detailNote=null, detailAudioEl=null;

function updateDetailMenuState(){
  if(!detailNote) return;
  const pinSpan = document.querySelector('#dMenuPin span');
  const lockSpan = document.querySelector('#dMenuLock span');
  const delSpan = document.querySelector('#dMenuDelete span');
  const delItem = document.getElementById('dMenuDelete');
  if(pinSpan) pinSpan.textContent = detailNote.pinned ? '取消收藏' : '收藏';
  if(lockSpan) lockSpan.textContent = detailNote.locked ? '移除笔记锁' : '添加笔记锁';
  if(delSpan) delSpan.textContent = detailNote.deleted ? '恢复' : '删除';
  if(delItem) delItem.style.color = detailNote.deleted ? '#27ae60' : 'var(--danger)';
}

function closeDetailMenu(){
  if(detailMenu) detailMenu.classList.remove('open');
}

function openDetail(note){
  detailNote=note;
  detailTitle.textContent=note.title||(TYPE_INFO[note.type]||TYPE_INFO.text).label+'笔记';
  detailDate.textContent=formatDate(note.updatedAt||note.createdAt)+' · '+formatSize(noteSize(note));
  detailContentWrap.innerHTML='';
  detailDeleteBtn.style.display='none';
  closeDetailMenu();

  if(note.type==='text' || note.type==='chart' || note.type==='formula'){
    const div=document.createElement('div'); div.className='detail-markdown';
    currentAttachments = note.attachments || {};
    div.innerHTML = note.content || '';
    hydrateAttachments(div, currentAttachments);
    hydrateLatex(div);
    bindTodoChecks(div, note, false);
    detailContentWrap.appendChild(div);
  } else if(note.type==='voice'){
    const wrap=document.createElement('div'); wrap.className='note-audio';
    const audio=document.createElement('audio'); audio.controls=true; audio.src=note.audio;
    wrap.appendChild(audio); detailContentWrap.appendChild(wrap); detailAudioEl=audio;
  } else if(note.type==='draw'){
    const wrap=document.createElement('div'); wrap.className='detail-draw';
    const img=document.createElement('img'); img.src=note.image;
    wrap.appendChild(img); detailContentWrap.appendChild(wrap);
  } else if(note.type==='mind'){
    const wrap=document.createElement('div'); wrap.className='detail-mind';
    detailContentWrap.appendChild(wrap); renderMindStatic(wrap,note.nodes||[]);
  } else if(note.type==='book'){
    renderBookDetail(note);
  }
  detailEdit.style.display = (note.type==='voice' || note.deleted) ? 'none' : 'block';
  updateEditorFolderPill('detail', folderOf(note));
  updateDetailMenuState();
  openScreen(noteDetail);
}

function renderBookDetail(note){
  const wrap=document.createElement('div'); wrap.className='detail-book';
  let html='';
  html+='<div class="book-cover-view">'+(note.cover?'<img src="'+note.cover+'" alt="封面">':
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'+
    '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>')+'</div>';
  html+='<h3>'+escapeHtml(note.title||'未命名书籍')+'</h3>';
  html+='<div class="book-intro">'+escapeHtml(note.intro||'暂无简介')+'</div>';
  (note.volumes||[]).forEach((vol,vi)=>{
    html+='<div class="volume-title">'+escapeHtml(vol.title||('第 '+(vi+1)+' 卷'))+'</div>';
    (vol.chapters||[]).forEach((ch,ci)=>{
      html+='<div class="book-chapter-view" data-vol="'+vi+'" data-ch="'+ci+'">'+
        '<span>'+escapeHtml(ch.title||('第 '+(ci+1)+' 章'))+'</span>'+
        '<span class="book-chapter-count">'+countWords(ch.content||'')+' 字</span>'+
      '</div>';
    });
    if(!(vol.chapters||[]).length){
      html+='<div style="color:var(--text-4);font-size:13px;padding:6px 0;">（该卷暂无章节）</div>';
    }
  });
  wrap.innerHTML=html;
  wrap.querySelectorAll('.book-chapter-view').forEach(el=>{
    el.addEventListener('click',()=>{
      const vi=parseInt(el.dataset.vol,10),ci=parseInt(el.dataset.ch,10);
      const vol=note.volumes[vi],ch=vol.chapters[ci];
      openChapterReader(vol,ch);
    });
  });
  detailContentWrap.appendChild(wrap);
}

function openChapterReader(vol,ch){
  editingChapter=null;
  chapterTitle.value=ch.title||'';
  chapterBody.value=ch.content||'';
  chapterTitle.readOnly=true; chapterBody.readOnly=true;
  document.getElementById('chapterDone').style.display='none';
  openScreen(chapterEditor);
}

function renderMindStatic(container,nodes){
  let maxX=400,maxY=400;
  nodes.forEach(n=>{maxX=Math.max(maxX,n.x+200);maxY=Math.max(maxY,n.y+100);});
  container.style.minHeight=maxY+'px';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','100%'); svg.setAttribute('height',maxY);
  svg.style.position='absolute'; svg.style.top='0'; svg.style.left='0'; svg.style.pointerEvents='none';
  const created={};
  nodes.forEach(node=>{
    const el=document.createElement('div');
    el.className='mind-node'+(node.id==='root'?' root':'');
    el.textContent=node.text; el.style.left=node.x+'px'; el.style.top=node.y+'px';
    el.style.cursor='default'; container.appendChild(el); created[node.id]={el,node};
  });
  nodes.forEach(node=>{
    if(!node.parent)return;
    const p=nodes.find(n=>n.id===node.parent); if(!p)return;
    const pEl=created[p.id].el, cEl=created[node.id].el;
    const x1=p.x+pEl.offsetWidth/2, y1=p.y+pEl.offsetHeight/2;
    const x2=node.x+cEl.offsetWidth/2, y2=node.y+cEl.offsetHeight/2;
    const cx1=x1+(x2-x1)/2, cy1=y1, cx2=x1+(x2-x1)/2, cy2=y2;
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d','M'+x1+' '+y1+' C'+cx1+' '+cy1+', '+cx2+' '+cy2+', '+x2+' '+y2);
    path.setAttribute('stroke','#c8c8c8'); path.setAttribute('stroke-width','2'); path.setAttribute('fill','none');
    svg.appendChild(path);
  });
  container.insertBefore(svg,container.firstChild);
}

document.getElementById('detailBack').addEventListener('click',()=>{
  closeDetailMenu();
  if(detailAudioEl){detailAudioEl.pause();detailAudioEl=null;}
  closeScreen(noteDetail); detailNote=null;
});

detailEdit.addEventListener('click',()=>{
  if(!detailNote)return;
  const n=detailNote; closeScreen(noteDetail);
  setTimeout(()=>{
    if(n.type==='text' || n.type==='chart' || n.type==='formula') openTextEditor(n);
    else if(n.type==='draw') openDrawEditor(n);
    else if(n.type==='mind') openMindEditor(n);
    else if(n.type==='book') openBookEditor(n);
  },350);
});

detailClickArea.addEventListener('click', (e) => {
  if(!detailNote) return;
  if(e.target.closest('a')) return;
  if(e.target.tagName === 'AUDIO' || e.target.tagName === 'VIDEO') return;
  if(e.target.closest('button')) return;
  if(e.target.closest('.todo-check')) return;
  if(e.target.closest('.book-chapter-view')) return;
  if(detailNote.type === 'voice' || detailNote.deleted) return;
  detailEdit.click();
});

detailShare.addEventListener('click',async()=>{
  if(!detailNote)return;
  await shareNotes([detailNote]);
});

detailMoreBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (detailMenu.classList.contains('open')) { closeDetailMenu(); }
  else { updateDetailMenuState(); detailMenu.classList.add('open'); }
});

document.addEventListener('click', (e) => {
  if (detailMenu.classList.contains('open') && !detailMenu.contains(e.target) && !detailMoreBtn.contains(e.target)) {
    closeDetailMenu();
  }
});

document.getElementById('dMenuPin').addEventListener('click', async () => {
  if(!detailNote) return;
  detailNote.pinned = !detailNote.pinned;
  await updateNote(detailNote);
  showToast(detailNote.pinned ? '已收藏' : '已取消收藏');
  updateDetailMenuState(); closeDetailMenu();
});

document.getElementById('dMenuLock').addEventListener('click', () => {
  if(!detailNote) return;
  if(detailNote.locked){ removePassword(detailNote); }
  else { openPasswordDialog('set', detailNote); }
  closeDetailMenu();
});

document.getElementById('dMenuPrint').addEventListener('click', () => {
  closeDetailMenu(); showToast('该功能暂未开放');
});

document.getElementById('dMenuDelete').addEventListener('click', () => {
  closeDetailMenu(); detailDeleteBtn.click();
});

['dMenuBg', 'dMenuCard'].forEach(id => {
  const el = document.getElementById(id);
  if(el) el.addEventListener('click', () => { closeDetailMenu(); showToast('该功能暂未开放'); });
});

document.getElementById('dMenuHistory').addEventListener('click', async () => {
  closeDetailMenu();
  if(!detailNote) return;
  historyList.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-3)">加载中...</div>';
  openScreen(historyScreen);
  const history = await dbGetHistory(detailNote.id);
  if(!history.length){
    historyList.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-3)">暂无历史版本</div>'; return;
  }
  historyList.innerHTML = history.map(item => `
    <div class="history-item" data-id="${item.id}" style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:15px;font-weight:600;color:var(--text-1);">${escapeHtml(item.title||'无标题')}</div>
        <div style="font-size:12px;color:var(--text-3);">${formatDate(item.savedAt)}</div>
      </div>
      <div style="font-size:13px;color:var(--text-2);line-height:1.5;height:40px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
        ${escapeHtml(item.preview || '无内容预览')}
      </div>
      <div style="display:flex;gap:10px;margin-top:12px;">
        <button class="hist-preview-btn" data-id="${item.id}" style="padding:6px 12px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line-2);color:var(--text-1);font-size:13px;cursor:pointer;">预览</button>
        <button class="hist-restore-btn" data-id="${item.id}" style="padding:6px 12px;border-radius:6px;background:var(--accent);border:none;color:#fff;font-size:13px;cursor:pointer;">恢复此版本</button>
        <button class="hist-delete-btn" data-id="${item.id}" style="padding:6px 12px;border-radius:6px;background:transparent;border:1px solid var(--line-2);color:var(--danger);font-size:13px;cursor:pointer;margin-left:auto;">删除</button>
      </div>
    </div>
  `).join('');

  historyList.querySelectorAll('.hist-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if(!confirm('确定删除该历史版本？')) return;
      const id = btn.dataset.id; await dbDeleteHistory(id);
      document.querySelector(`.history-item[data-id="${id}"]`).remove();
      showToast('已删除历史版本');
    });
  });

  historyList.querySelectorAll('.hist-preview-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id; const item = history.find(h => h.id === id); if(!item) return;
      if(item.type === 'text' || item.type === 'chart' || item.type === 'formula'){
        detailContentWrap.innerHTML = `<div class="detail-markdown">${item.content || ''}</div>`;
        hydrateLatex(detailContentWrap);
      } else if(item.type === 'mind') {
        detailContentWrap.innerHTML = ''; const wrap = document.createElement('div');
        wrap.className = 'detail-mind'; detailContentWrap.appendChild(wrap);
        renderMindStatic(wrap, item.nodes || []);
      } else if(item.type === 'draw') {
        detailContentWrap.innerHTML = `<div class="detail-draw"><img src="${item.image}"></div>`;
      }
      detailTitle.textContent = (item.title||'无标题') + ' (历史快照)';
      closeScreen(historyScreen); showToast('当前显示为历史预览，退出后恢复');
    });
  });

  historyList.querySelectorAll('.hist-restore-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id; const item = history.find(h => h.id === id); if(!item) return;
      if(!confirm('确定用此版本覆盖当前笔记吗？当前改动会作为一个新的历史版本保留。')) return;
      await createHistorySnapshot(detailNote);
      detailNote.title = item.title; detailNote.content = item.content; detailNote.nodes = item.nodes;
      detailNote.image = item.image; detailNote.volumes = item.volumes; detailNote.intro = item.intro; detailNote.cover = item.cover;
      await updateNote(detailNote); closeScreen(historyScreen); openDetail(detailNote); showToast('已恢复到此版本');
    });
  });
});

document.getElementById('historyBack').addEventListener('click', () => {
  closeScreen(historyScreen);
  if(detailNote) openDetail(detailNote);
});

document.getElementById('historyClearAll').addEventListener('click', async () => {
  if(!detailNote) return;
  if(!confirm('确定清空该笔记的所有历史版本吗？')) return;
  await dbClearHistoryForNote(detailNote.id);
  historyList.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-3)">暂无历史版本</div>';
  showToast('已清空');
});

detailDeleteBtn.addEventListener('click',async()=>{
  if(!detailNote)return;
  if(detailNote.deleted){
    detailNote.deleted=false; detailNote.deletedAt=null;
    await updateNote(detailNote);
    closeScreen(noteDetail); detailNote=null; renderSidebar(); showToast('已恢复');
  } else {
    if(!confirm('确定删除这条笔记吗？'))return;
    if(detailAudioEl){detailAudioEl.pause();detailAudioEl=null;}
    detailNote.deleted=true; detailNote.deletedAt=Date.now();
    await updateNote(detailNote);
    closeScreen(noteDetail); detailNote=null; renderSidebar();
  }
});

async function shareNotes(list){
  if(list.length===1){
    const n=list[0];
    let text='';
    if(n.type==='text'||n.type==='chart'||n.type==='formula') text=(n.title?n.title+'\n\n':'')+htmlToPlainText(n.content);
    else if(n.type==='voice') text=(n.title||'语音笔记')+'\n\n（录音时长 '+formatDuration(n.duration||0)+'）';
    else if(n.type==='mind') text=(n.title||'思维导图')+'\n\n'+(n.nodes||[]).map(x=>'· '+x.text).join('\n');
    else if(n.type==='draw') text=(n.title||'手写笔记')+'\n\n（手写图片）';
    else if(n.type==='book') text=(n.title||'书籍')+'\n\n简介：'+(n.intro||'');
    if(navigator.share){ try{await navigator.share({title:n.title||'笔记',text});return;}catch(e){if(e&&e.name==='AbortError')return;} }
    try{await navigator.clipboard.writeText(text);showToast('已复制到剪贴板');}catch(e){showToast('分享失败');}
    return;
  }
  const merged=list.map(n=>'【'+(n.title||'无标题')+'】').join('\n');
  if(navigator.share){ try{await navigator.share({title:'分享 '+list.length+' 条笔记',text:merged});return;}catch(e){if(e&&e.name==='AbortError')return;} }
  try{await navigator.clipboard.writeText(merged);showToast('已复制 '+list.length+' 条笔记');}catch(e){showToast('分享失败');}
}