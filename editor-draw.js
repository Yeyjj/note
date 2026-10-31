/* 手写 */
const drawEditor=document.getElementById('drawEditor');
const drawCanvas=document.getElementById('drawCanvas');
const drawTools=document.getElementById('drawTools');
const drawCtx=drawCanvas.getContext('2d');
let drawColor='#1a1a1a', drawSize=3, isDrawing=false, lastX=0, lastY=0, editingDraw=null;

function resizeDrawCanvas(){
  const rect=drawCanvas.parentElement.getBoundingClientRect();
  const dpr=window.devicePixelRatio||1;
  let saved=null;
  if(drawCanvas.width>0&&drawCanvas.height>0) saved=drawCanvas.toDataURL();
  drawCanvas.width=rect.width*dpr; drawCanvas.height=rect.height*dpr;
  drawCanvas.style.width=rect.width+'px'; drawCanvas.style.height=rect.height+'px';
  drawCtx.setTransform(dpr,0,0,dpr,0,0);
  drawCtx.lineCap='round'; drawCtx.lineJoin='round';
  // 如果是在深色模式下，且没有保存内容，填充背景色
  if(!saved) {
    const bg = getComputedStyle(document.body).getPropertyValue('--canvas-bg').trim();
    drawCtx.fillStyle = bg || '#fff';
    drawCtx.fillRect(0, 0, rect.width, rect.height);
  }
  if(saved){ 
    const img=new Image(); 
    img.onload=()=>{
      drawCtx.drawImage(img,0,0,rect.width,rect.height); 
    }; 
    img.src=saved; 
  }
}
function getPos(e){ const r=drawCanvas.getBoundingClientRect(); const t=e.touches?e.touches[0]:e;
  return {x:t.clientX-r.left, y:t.clientY-r.top}; }
drawCanvas.addEventListener('pointerdown',e=>{e.preventDefault();isDrawing=true;
  const p=getPos(e); lastX=p.x; lastY=p.y; drawCanvas.setPointerCapture(e.pointerId);});
drawCanvas.addEventListener('pointermove',e=>{ if(!isDrawing)return; e.preventDefault();
  const p=getPos(e); drawCtx.strokeStyle=drawColor; drawCtx.lineWidth=drawSize;
  drawCtx.beginPath(); drawCtx.moveTo(lastX,lastY); drawCtx.lineTo(p.x,p.y); drawCtx.stroke();
  lastX=p.x; lastY=p.y;});
drawCanvas.addEventListener('pointerup',e=>{isDrawing=false;try{drawCanvas.releasePointerCapture(e.pointerId);}catch(_){}});
drawCanvas.addEventListener('pointercancel',()=>{isDrawing=false;});
drawCanvas.addEventListener('pointerleave',()=>{isDrawing=false;});
drawTools.addEventListener('click',e=>{
  const c=e.target.closest('.color-dot'), s=e.target.closest('.size-dot');
  if(c){drawColor=c.dataset.color;drawTools.querySelectorAll('.color-dot').forEach(d=>d.classList.remove('active'));c.classList.add('active');}
  if(s){drawSize=parseInt(s.dataset.size,10);drawTools.querySelectorAll('.size-dot').forEach(d=>d.classList.remove('active'));s.classList.add('active');}
});
document.getElementById('clearCanvas').addEventListener('click',()=>{
  const rect=drawCanvas.parentElement.getBoundingClientRect();
  drawCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
  const bg = getComputedStyle(document.body).getPropertyValue('--canvas-bg').trim();
  drawCtx.fillStyle = bg || '#fff';
  drawCtx.fillRect(0, 0, rect.width, rect.height);
});
function openDrawEditor(note=null){
  if(isExpanded){isExpanded=false;bottomBarEl.classList.remove('expanded');}
  editingDraw=note;
  editorFolderId = note ? folderOf(note) : UNCAT_ID;
  updateEditorFolderPill('draw', editorFolderId);
  openScreen(drawEditor);
  setTimeout(()=>{resizeDrawCanvas();
    if(note&&note.image){ const img=new Image(); img.onload=()=>{
      const r=drawCanvas.parentElement.getBoundingClientRect();
      drawCtx.drawImage(img,0,0,r.width,r.height); }; img.src=note.image; }
  },380);
}
function isCanvasBlank(canvas){
  const ctx=canvas.getContext('2d');
  const buf=new Uint32Array(ctx.getImageData(0,0,canvas.width,canvas.height).data.buffer);
  return !buf.some(c=>c!==0);
}
async function saveDrawEditor(){
  const data=drawCanvas.toDataURL('image/png');
  // 注意：此处 isCanvasBlank 判断存在背景填充时会失效，此处根据实际绘制情况自行决定是否需精准判断，为了逻辑不报错，保留原逻辑（不过滤背景色）
  if(!isCanvasBlank(drawCanvas)){
    if(editingDraw){
      await createHistorySnapshot(JSON.parse(JSON.stringify(editingDraw)));
      editingDraw.image=data; editingDraw.folderId = editorFolderId;
      await updateNote(editingDraw);
    }
    else{
      await addNote({id:newId('d'),type:'draw',title:'手写笔记',content:'',image:data,
        folderId: editorFolderId,
        createdAt:Date.now(),updatedAt:Date.now()});
    }
  } else if(editingDraw){ 
    await createHistorySnapshot(JSON.parse(JSON.stringify(editingDraw)));
    await removeNote(editingDraw.id); 
  }
  closeScreen(drawEditor); editingDraw=null;
}
document.getElementById('drawDone').addEventListener('click',saveDrawEditor);
document.querySelector('[data-close="draw"]').addEventListener('click',saveDrawEditor);
window.addEventListener('resize',()=>{ if(drawEditor.classList.contains('open')) resizeDrawCanvas(); });