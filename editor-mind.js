/* 思维导图缩略图 */

function renderMindThumb(container, nodes){
  if(!container || !nodes || !nodes.length) return;
  const W = container.clientWidth, H = container.clientHeight;
  if(!W || !H) return;

  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  nodes.forEach(n=>{
    minX=Math.min(minX,n.x); minY=Math.min(minY,n.y);
    maxX=Math.max(maxX,n.x+120); maxY=Math.max(maxY,n.y+46);
  });
  const bw = Math.max(1, maxX-minX);
  const bh = Math.max(1, maxY-minY);
  const scale = Math.min(W/bw, H/bh, 1) * 0.82;

  const inner = document.createElement('div');
  inner.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;';
  inner.style.transform = 'translate('+((W-bw*scale)/2)+'px,'+((H-bh*scale)/2)+'px) scale('+scale+')';
  inner.style.width = bw+'px';
  inner.style.height = bh+'px';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS,'svg');
  svg.setAttribute('width', bw);
  svg.setAttribute('height', bh);

  const elMap = {};
  nodes.forEach(node=>{
    const el = document.createElement('div');
    el.className = 'mind-node' + (node.id==='root' ? ' root' : '');
    el.textContent = node.text;
    el.style.left = (node.x - minX) + 'px';
    el.style.top  = (node.y - minY) + 'px';
    inner.appendChild(el);
    elMap[node.id] = el;
  });
  container.appendChild(inner);

  nodes.forEach(node=>{
    if(!node.parent) return;
    const p = nodes.find(n=>n.id===node.parent);
    if(!p) return;
    const pEl = elMap[p.id], cEl = elMap[node.id];
    if(!pEl || !cEl) return;
    const x1 = (p.x-minX) + pEl.offsetWidth/2;
    const y1 = (p.y-minY) + pEl.offsetHeight/2;
    const x2 = (node.x-minX) + cEl.offsetWidth/2;
    const y2 = (node.y-minY) + cEl.offsetHeight/2;
    const cx1 = x1 + (x2-x1)/2, cy1 = y1;
    const cx2 = x1 + (x2-x1)/2, cy2 = y2;
    const path = document.createElementNS(svgNS,'path');
    path.setAttribute('d','M'+x1+' '+y1+' C'+cx1+' '+cy1+', '+cx2+' '+cy2+', '+x2+' '+y2);
    path.setAttribute('stroke','#c8c8c8');
    path.setAttribute('stroke-width','1.5');
    path.setAttribute('fill','none');
    svg.appendChild(path);
  });
  inner.insertBefore(svg, inner.firstChild);
}

function renderNotes(){
  const wasSwitching = notesGrid.classList.contains('switching');
  notesGrid.innerHTML='';
  notesGrid.className='notes-grid view-'+currentView;
  if(wasSwitching) notesGrid.classList.add('switching');

  bottomBarEl.classList.toggle('hidden', currentFilter === 'trash');
  if(currentFilter === 'trash' && typeof isExpanded !== 'undefined' && isExpanded){
    isExpanded = false;
    bottomBarEl.classList.remove('expanded');
  }

  const filtered=getFilteredNotes();
  if(!filtered.length){
    let emptyMsg = '还没有笔记<br>点击下方的 + 创建第一条';
    if(searchKeyword.trim()) emptyMsg = '没有找到匹配「'+escapeHtml(searchKeyword)+'」的笔记';
    else if(currentFilter==='trash') emptyMsg = '回收站是空的';
    else if(currentFilter!=='all') emptyMsg = '这个分类下还没有笔记';
    notesGrid.innerHTML='<div class="empty-state">'+emptyMsg+'</div>';
    pageSubtitle.textContent = notes.filter(n=>!n.deleted).length + ' 条笔记';
    requestAnimationFrame(syncHeaderCollapse);
    return;
  }

  const sorted=sortNotes(filtered);
  pageSubtitle.textContent = searchKeyword.trim()
    ? '找到 '+sorted.length+' 条'
    : filtered.length + ' 条笔记';
  const kw = searchKeyword.trim();
  const cards = sorted.map(n => buildNoteCard(n, kw));

  if(currentView === 'list'){
    cards.forEach(c => notesGrid.appendChild(c));
  } else {
    const colCount = currentView === 'compact' ? 3 : 2;
    const gap = currentView === 'compact' ? 8 : 14;
    const cols = [];
    for(let i=0;i<colCount;i++){
      const col = document.createElement('div');
      col.className = 'notes-col';
      notesGrid.appendChild(col);
      cols.push({el:col, h:0});
    }
    cards.forEach(card=>{
      let target = cols[0];
      for(const c of cols){ if(c.h < target.h) target = c; }
      target.el.appendChild(card);
      target.h += card.offsetHeight + gap;
    });
  }

  notesGrid.querySelectorAll('.note-card').forEach(card=>{
    if(card._mindNodes){
      const t = card.querySelector('.mind-thumb');
      if(t) renderMindThumb(t, card._mindNodes);
    }
  });

  requestAnimationFrame(syncHeaderCollapse);
}


/* 思维导图 */

const mindEditor=document.getElementById('mindEditor');
const mindInner=document.getElementById('mindInner');
const mindLines=document.getElementById('mindLines');
let mindNodes=[], selectedMindId='root', editingMind=null, mindDragging=null;

function openMindEditor(note=null){
  if(isExpanded){isExpanded=false;bottomBarEl.classList.remove('expanded');}
  editingMind=note;
  editorFolderId = note ? folderOf(note) : UNCAT_ID;
  updateEditorFolderPill('mind', editorFolderId);
  if(note&&note.nodes&&note.nodes.length) mindNodes=JSON.parse(JSON.stringify(note.nodes));
  else mindNodes=[{id:'root',text:'中心主题',x:120,y:200,parent:null}];
  selectedMindId='root'; openScreen(mindEditor); setTimeout(renderMind,380);
}
function renderMind(){
  mindInner.querySelectorAll('.mind-node').forEach(n=>n.remove());
  mindNodes.forEach(node=>{
    const el=document.createElement('div');
    el.className='mind-node'+(node.id==='root'?' root':'')+(node.id===selectedMindId?' selected':'');
    el.dataset.id=node.id; el.textContent=node.text;
    el.style.left=node.x+'px'; el.style.top=node.y+'px';
    if(node.id!=='root'){
      const del=document.createElement('span'); del.className='node-del'; del.textContent='×';
      del.addEventListener('click',ev=>{ev.stopPropagation();deleteMindNode(node.id);});
      el.appendChild(del);
    }
    el.addEventListener('click',ev=>{ev.stopPropagation();selectedMindId=node.id;renderMind();});
    el.addEventListener('dblclick',ev=>{ev.stopPropagation();
      const t=prompt('修改节点文字',node.text);
      if(t!==null&&t.trim()){node.text=t.trim();renderMind();}});
    el.addEventListener('pointerdown',ev=>{
      if(ev.target.classList.contains('node-del'))return; ev.stopPropagation();
      selectedMindId=node.id;
      mindDragging={id:node.id,startX:ev.clientX,startY:ev.clientY,originX:node.x,originY:node.y};
      el.setPointerCapture(ev.pointerId);});
    el.addEventListener('pointermove',ev=>{
      if(!mindDragging||mindDragging.id!==node.id)return; ev.preventDefault();
      node.x=mindDragging.originX+(ev.clientX-mindDragging.startX);
      node.y=mindDragging.originY+(ev.clientY-mindDragging.startY);
      el.style.left=node.x+'px'; el.style.top=node.y+'px'; drawMindLines();});
    el.addEventListener('pointerup',ev=>{mindDragging=null;
      try{el.releasePointerCapture(ev.pointerId);}catch(_){}renderMind();});
    mindInner.appendChild(el);
  });
  drawMindLines();
}
function drawMindLines(){
  let maxX=800, maxY=600;
  mindNodes.forEach(n=>{maxX=Math.max(maxX,n.x+200);maxY=Math.max(maxY,n.y+100);});
  mindLines.setAttribute('width',maxX); mindLines.setAttribute('height',maxY);
  mindLines.style.width=maxX+'px'; mindLines.style.height=maxY+'px';
  let svg='';
  mindNodes.forEach(node=>{
    if(!node.parent)return;
    const p=mindNodes.find(n=>n.id===node.parent); if(!p)return;
    const pEl=mindInner.querySelector('[data-id="'+p.id+'"]');
    const cEl=mindInner.querySelector('[data-id="'+node.id+'"]');
    if(!pEl||!cEl)return;
    const x1=p.x+pEl.offsetWidth/2, y1=p.y+pEl.offsetHeight/2;
    const x2=node.x+cEl.offsetWidth/2, y2=node.y+cEl.offsetHeight/2;
    const cx1=x1+(x2-x1)/2, cy1=y1, cx2=x1+(x2-x1)/2, cy2=y2;
    svg+='<path d="M'+x1+' '+y1+' C'+cx1+' '+cy1+', '+cx2+' '+cy2+', '+x2+' '+y2+
      '" stroke="#c8c8c8" stroke-width="2" fill="none"/>';
  });
  mindLines.innerHTML=svg;
}
function addMindChild(){
  const p=mindNodes.find(n=>n.id===selectedMindId); if(!p)return;
  const sib=mindNodes.filter(n=>n.parent===p.id);
  const id=newId('m');
  mindNodes.push({id,text:'新节点',x:p.x+180,y:p.y+(sib.length*60-30),parent:p.id});
  selectedMindId=id; renderMind();
}
function deleteMindNode(id){
  if(id==='root')return;
  const del=[id]; let i=0;
  while(i<del.length){ const c=del[i];
    mindNodes.forEach(n=>{if(n.parent===c&&!del.includes(n.id))del.push(n.id);}); i++; }
  mindNodes=mindNodes.filter(n=>!del.includes(n.id));
  selectedMindId='root'; renderMind();
}
document.getElementById('mindAddChild').addEventListener('click',addMindChild);
document.getElementById('mindDeleteNode').addEventListener('click',()=>{
  if(selectedMindId!=='root') deleteMindNode(selectedMindId);
});
async function saveMindEditor(){
  if(editingMind){
    await createHistorySnapshot(JSON.parse(JSON.stringify(editingMind))); // 修复点
    
    editingMind.nodes=JSON.parse(JSON.stringify(mindNodes));
    editingMind.folderId = editorFolderId;
    await updateNote(editingMind);
  } else {
    await addNote({id:newId('m'),type:'mind',title:'思维导图',content:'',
      nodes:JSON.parse(JSON.stringify(mindNodes)),
      folderId: editorFolderId,
      createdAt:Date.now(),updatedAt:Date.now()});
  }
  closeScreen(mindEditor); editingMind=null;
}
document.getElementById('mindDone').addEventListener('click',saveMindEditor);
document.querySelector('[data-close="mind"]').addEventListener('click',saveMindEditor);


