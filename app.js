/* 新建文件夹对话框 */
const FOLDER_COLORS = ['#ff6b6b','#ff9f43','#f5c542','#5cd68a','#5bd0c8','#7bb8e8','#4a9eff','#a78bfa'];
const folderDialogMask = document.getElementById('folderDialogMask');
const folderDialog = document.getElementById('folderDialog');
const folderColorRow = document.getElementById('folderColorRow');
const folderNameInput = document.getElementById('folderNameInput');
const folderNameBar = document.getElementById('folderNameBar');
const folderCancel = document.getElementById('folderCancel');
const folderSave = document.getElementById('folderSave');
let selectedFolderColor = FOLDER_COLORS[2];

function renderFolderColors(){
  folderColorRow.innerHTML = FOLDER_COLORS.map(c=>
    '<div class="folder-color'+(c===selectedFolderColor?' active':'')+'" data-color="'+c+'" style="background:'+c+'"></div>'
  ).join('');
  folderColorRow.querySelectorAll('.folder-color').forEach(el=>{
    el.addEventListener('click',()=>{
      selectedFolderColor = el.dataset.color;
      folderNameBar.style.background = selectedFolderColor;
      renderFolderColors();
    });
  });
}
folderNameBar.style.background = selectedFolderColor;
renderFolderColors();

folderNameInput.addEventListener('input',()=>{
  folderSave.classList.toggle('ready', !!folderNameInput.value.trim());
});
folderNameInput.addEventListener('keydown',e=>{
  if(e.key === 'Enter' && folderNameInput.value.trim()) folderSave.click();
});
function openFolderDialog(){
  folderNameInput.value=''; folderSave.classList.remove('ready');
  folderDialogMask.classList.add('open'); folderDialog.classList.add('open');
  setTimeout(()=>folderNameInput.focus(), 250);
}
function closeFolderDialog(){
  folderDialogMask.classList.remove('open'); folderDialog.classList.remove('open');
}
folderCancel.addEventListener('click',closeFolderDialog);
folderDialogMask.addEventListener('click',closeFolderDialog);

folderSave.addEventListener('click',async()=>{
  const name = folderNameInput.value.trim();
  if(!name) return;
  const f = {id:newId('f'), name, color:selectedFolderColor};
  await dbPutFolder(f); folders.push(f);
  closeFolderDialog(); renderSidebar();
  showToast('文件夹已创建');
});
document.getElementById('newFolderBtn').addEventListener('click',openFolderDialog);

/* 文件夹选择器 */
const folderPickerMask = document.getElementById('folderPickerMask');
const folderPicker = document.getElementById('folderPicker');
const folderPickerList = document.getElementById('folderPickerList');
let folderPickerMode = 'note'; 
let folderPickerNote = null;
let folderPickerEditorKey = null;
let folderPickerOnSelect = null;
let folderPickerSelected = null;

function openFolderPicker(note){
  folderPickerMode = 'note'; folderPickerNote = note; folderPickerEditorKey = null; folderPickerOnSelect = null;
  folderPickerSelected = folderOf(note); renderFolderPicker();
  folderPickerMask.classList.add('open'); folderPicker.classList.add('open');
}
function openFolderPickerForEditor(editorKey, currentFolderId, onSelect){
  folderPickerMode = 'editor'; folderPickerNote = null; folderPickerEditorKey = editorKey; folderPickerOnSelect = onSelect;
  folderPickerSelected = currentFolderId || UNCAT_ID; renderFolderPicker();
  folderPickerMask.classList.add('open'); folderPicker.classList.add('open');
}
function renderFolderPicker(){
  folderPickerList.innerHTML = folders.map(f=>{
    const active = folderPickerSelected === f.id;
    return '<div class="folder-picker-item'+(active?' active':'')+'" data-folder-id="'+f.id+'">'+
      '<span class="fp-dot" style="background:'+f.color+'"></span>'+
      '<span class="fp-name">'+escapeHtml(f.name)+'</span>'+
      (active?'<span class="fp-check">✓</span>':'')+
      '</div>';
  }).join('');
  folderPickerList.querySelectorAll('.folder-picker-item').forEach(el=>{
    el.addEventListener('click',()=>{ folderPickerSelected = el.dataset.folderId; renderFolderPicker(); });
  });
}
function closeFolderPicker(){
  folderPickerMask.classList.remove('open'); folderPicker.classList.remove('open');
  folderPickerNote = null; folderPickerEditorKey = null; folderPickerOnSelect = null;
}
document.getElementById('folderPickerCancel').addEventListener('click',closeFolderPicker);
folderPickerMask.addEventListener('click',closeFolderPicker);
document.getElementById('folderPickerSave').addEventListener('click',async()=>{
  if(folderPickerMode === 'note'){
    if(!folderPickerNote) return;
    folderPickerNote.folderId = folderPickerSelected || UNCAT_ID;
    await updateNote(folderPickerNote);
    closeFolderPicker(); renderSidebar(); showToast('已更新分类');
  } else {
    const cb = folderPickerOnSelect; const fid = folderPickerSelected || UNCAT_ID;
    closeFolderPicker(); if(typeof cb === 'function') cb(fid);
  }
});

/* 编辑器内的分类胶囊 */
function updateEditorFolderPill(editorKey, folderId){
  const pill = document.querySelector('.editor-folder-pill[data-editor="'+editorKey+'"]');
  if(!pill) return;
  let f = folders.find(x=>x.id === (folderId || UNCAT_ID));
  if(!f) f = folders.find(x=>x.id === UNCAT_ID);
  if(!f) f = {name:'未分类', color:'#f5c542'};
  pill.querySelector('.ef-dot').style.background = f.color || '#f5c542';
  pill.querySelector('.ef-name').textContent = f.name || '未分类';
}

function getEditorCurrentFolder(editorKey){
  if(editorKey === 'text') return editingNote ? folderOf(editingNote) : editorFolderId;
  if(editorKey === 'draw') return editingDraw ? folderOf(editingDraw) : editorFolderId;
  if(editorKey === 'mind') return editingMind ? folderOf(editingMind) : editorFolderId;
  if(editorKey === 'book') return editingBook ? folderOf(editingBook) : editorFolderId;
  if(editorKey === 'voice') return editorFolderId;
  if(editorKey === 'detail') return detailNote ? folderOf(detailNote) : UNCAT_ID;
  return UNCAT_ID;
}

function handleEditorFolderClick(editorKey){
  const current = getEditorCurrentFolder(editorKey);
  openFolderPickerForEditor(editorKey, current, (fid)=>{
    if(editorKey === 'detail'){
      if(detailNote){ detailNote.folderId = fid; updateNote(detailNote); updateEditorFolderPill('detail', fid); showToast('已更新分类'); }
      return;
    }
    editorFolderId = fid;
    updateEditorFolderPill(editorKey, fid);
    if(editorKey === 'text' && editingNote){ editingNote.folderId = fid; updateNote(editingNote); }
    else if(editorKey === 'draw' && editingDraw){ editingDraw.folderId = fid; updateNote(editingDraw); }
    else if(editorKey === 'mind' && editingMind){ editingMind.folderId = fid; updateNote(editingMind); }
    else if(editorKey === 'book' && editingBook){ editingBook.folderId = fid; updateNote(editingBook); }
    showToast('已切换到「'+(folders.find(x=>x.id===fid)||{name:'未分类'}).name+'」');
  });
}

document.querySelectorAll('.editor-folder-pill').forEach(pill=>{
  pill.addEventListener('click', e=>{ e.stopPropagation(); handleEditorFolderClick(pill.dataset.editor); });
});

/* 密码设置 / 解锁 */
const passwordDialogMask = document.getElementById('passwordDialogMask');
const passwordDialog = document.getElementById('passwordDialog');
const passwordDialogTitle = document.getElementById('passwordDialogTitle');
const passwordInput1 = document.getElementById('passwordInput1');
const passwordInput2 = document.getElementById('passwordInput2');
const passwordHint = document.getElementById('passwordHint');
const passwordSave = document.getElementById('passwordSave');
let passwordMode = 'set';
let passwordTargetNote = null;
let passwordOnSuccess = null;

function openPasswordDialog(mode, note, onSuccess){
  passwordMode = mode; passwordTargetNote = note; passwordOnSuccess = onSuccess || null;
  passwordHint.textContent=''; passwordInput1.value=''; passwordInput2.value='';
  if(mode === 'set'){
    passwordDialogTitle.textContent='设置密码'; passwordInput2.style.display='block'; passwordSave.textContent='确定';
  } else {
    passwordDialogTitle.textContent='输入密码'; passwordInput2.style.display='none'; passwordSave.textContent='解锁';
  }
  passwordSave.classList.add('ready');
  passwordDialogMask.classList.add('open'); passwordDialog.classList.add('open');
  setTimeout(()=>passwordInput1.focus(), 250);
}
function closePasswordDialog(){
  passwordDialogMask.classList.remove('open'); passwordDialog.classList.remove('open');
  passwordTargetNote=null; passwordOnSuccess=null;
}
document.getElementById('passwordCancel').addEventListener('click',closePasswordDialog);
passwordDialogMask.addEventListener('click',closePasswordDialog);

passwordInput1.addEventListener('keydown',e=>{
  if(e.key==='Enter'){ if(passwordMode==='set') passwordInput2.focus(); else passwordSave.click(); }
});
passwordInput2.addEventListener('keydown',e=>{ if(e.key==='Enter') passwordSave.click(); });

passwordSave.addEventListener('click', async ()=>{
  const p1 = passwordInput1.value;
  const p2 = passwordInput2.value;

  if(passwordMode === 'set'){
    if(!p1){ passwordHint.textContent='请输入密码'; return; }
    if(p1 !== p2){ passwordHint.textContent='两次输入不一致'; return; }
    const hash = await hashPassword(p1);
    const target = passwordTargetNote;
    if(target){ target.locked = true; target.passwordHash = hash; await updateNote(target); showToast('已设置密码'); }
    closePasswordDialog(); return;
  }

  if(!p1){ passwordHint.textContent='请输入密码'; return; }
  const hash = await hashPassword(p1);
  const target = passwordTargetNote;
  const cb = passwordOnSuccess;
  if(target && target.passwordHash === hash){
    closePasswordDialog();
    if(typeof cb === 'function') cb();
  } else {
    passwordHint.textContent = '密码错误';
    passwordInput1.value=''; passwordInput1.focus();
  }
});

async function removePassword(note){
  openPasswordDialog('unlock', note, async ()=>{
    note.locked = false; note.passwordHash = null;
    await updateNote(note); showToast('已移除密码');
  });
}

function requestOpenNote(note){
  if(note.locked && !note.deleted){ openPasswordDialog('unlock', note, ()=>openDetail(note)); return; }
  openDetail(note);
}

/* Iframe 预览弹窗 */
const iframeScreen = document.getElementById('iframeScreen');
const iframeView = document.getElementById('iframeView');
const iframeTitle = document.getElementById('iframeTitle');
const iframeBack = document.getElementById('iframeBack');
const iframeOpenExternal = document.getElementById('iframeOpenExternal');
let currentIframeUrl = '';

function openIframe(url, title) {
  currentIframeUrl = url; iframeTitle.textContent = title || url;
  iframeView.src = url; openScreen(iframeScreen);
}
iframeBack.addEventListener('click', () => {
  closeScreen(iframeScreen);
  setTimeout(() => { iframeView.src = 'about:blank'; }, 350);
});
iframeOpenExternal.addEventListener('click', () => { if (currentIframeUrl) window.open(currentIframeUrl, '_blank'); });

/* 导出图片与 PDF */
const EXPORT_JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const FONT_CN_URL = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf';

function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) return resolve();
    const s = document.createElement('script'); s.src = url; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
  });
}

function importNoteFile() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.note'; input.style.display = 'none'; document.body.appendChild(input);
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) { document.body.removeChild(input); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const note = JSON.parse(e.target.result);
        if (!note.id || !note.type) throw new Error('无效的笔记文件');
        note.id = newId('n'); note.createdAt = Date.now(); note.updatedAt = Date.now(); note.folderId = UNCAT_ID;
        if (note.attachments) {
          const newAtts = {};
          for (const key in note.attachments) {
            const att = note.attachments[key];
            if (att.src && att.src.startsWith('data:')) {
              const res = await fetch(att.src); const blob = await res.blob();
              newAtts[key] = { type: att.type, name: att.name, blob: blob, size: blob.size };
            } else { newAtts[key] = att; }
          }
          note.attachments = newAtts;
        }
        await addNote(note); showToast('笔记导入成功');
      } catch (err) { console.error(err); showToast('导入失败：文件格式错误'); }
      finally { document.body.removeChild(input); }
    };
    reader.readAsText(file);
  });
  input.click();
}

async function exportNoteAsFile(note) {
  let exportNote = { ...note };
  if (exportNote.attachments) {
    const newAtts = {};
    for (const key in exportNote.attachments) {
      const att = exportNote.attachments[key];
      if (att.blob) {
        const reader = new FileReader();
        const base64 = await new Promise(r => { reader.onload = e => r(e.target.result); reader.readAsDataURL(att.blob); });
        newAtts[key] = { type: att.type, name: att.name, src: base64 };
      } else { newAtts[key] = att; }
    }
    exportNote.attachments = newAtts;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportNote));
  const a = document.createElement('a'); a.href = dataStr; a.download = (note.title || '未命名笔记') + '.note'; a.click();
  showToast('已导出 .note 文件');
}

// 导出图片增加清晰度选择
async function exportNoteAsImage(note) {
  const choice = prompt("请选择导出的图片清晰度：\n1 - 标准 (1x)\n2 - 高清 (2x)\n3 - 超清 (3x)", "2");
  if (!choice) return;
  const scale = choice === '1' ? 1 : (choice === '3' ? 3 : 2);

  showToast('正在生成图片...');
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const wrapper = document.createElement('div');
    // 临时赋予主题深色或浅色背景
    const bgColor = getComputedStyle(document.body).getPropertyValue('--surface').trim();
    wrapper.style.cssText = `position:fixed;left:-9999px;top:0;width:800px;background:${bgColor};padding:40px;border-radius:20px;z-index:9999;`;
    wrapper.innerHTML = `<h1 style="font-size:32px;margin:0 0 16px;color:var(--text-1);font-weight:600;">${escapeHtml(note.title||'未命名')}</h1>
      <div style="font-size:14px;color:var(--text-3);margin-bottom:24px;">${formatDate(note.updatedAt||note.createdAt)}</div>
      <div class="detail-markdown">${note.content || (note.type === 'draw' ? `<img src="${note.image}" style="max-width:100%">` : '')}</div>`;
    document.body.appendChild(wrapper);
    if (note.attachments) hydrateAttachments(wrapper.querySelector('.detail-markdown'), note.attachments);
    hydrateLatex(wrapper.querySelector('.detail-markdown'));
    
    const canvas = await html2canvas(wrapper, { scale: scale, useCORS: true, backgroundColor: bgColor });
    document.body.removeChild(wrapper);
    
    const imgData = canvas.toDataURL('image/png');
    const a = document.createElement('a'); a.href = imgData; a.download = (note.title || '未命名笔记') + '.png'; a.click();
    showToast(`已导出 ${scale}x PNG`);
  } catch (e) { console.error(e); showToast('导出图片失败'); }
}

async function exportNoteAsPDF(note) {
  showToast('正在加载中文字体并生成纯文字 PDF...');
  try {
    await loadScript(EXPORT_JSPDF_URL);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    try {
      const response = await fetch(FONT_CN_URL);
      const blob = await response.blob();
      const fontData = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
      });
      pdf.addFileToVFS('NotoSans.otf', fontData.split(',')[1]);
      pdf.addFont('NotoSans.otf', 'NotoSans', 'normal'); pdf.setFont('NotoSans');
    } catch (fontErr) {
      console.warn('中文字体下载失败', fontErr); showToast('网络加载中文字体失败，请检查网络'); return;
    }
    const pageWidth = pdf.internal.pageSize.getWidth(), pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15, maxLineWidth = pageWidth - margin * 2; let y = 20;

    pdf.setFontSize(22); pdf.setTextColor(30, 30, 30);
    const titleLines = pdf.splitTextToSize(note.title || '未命名笔记', maxLineWidth);
    titleLines.forEach(line => {
      if (y > pageHeight - margin) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y); y += 10;
    });
    y += 2;

    pdf.setFontSize(10); pdf.setTextColor(150, 150, 150);
    if (y > pageHeight - margin) { pdf.addPage(); y = margin; }
    pdf.text(formatDate(note.updatedAt || note.createdAt), margin, y); y += 12;

    pdf.setFontSize(12); pdf.setTextColor(60, 60, 60);
    const tmp = document.createElement('div'); tmp.innerHTML = note.content || '';
    const blocks = tmp.querySelectorAll('p, div, h1, h2, h3, li, blockquote, pre');
    if (blocks.length === 0) {
      const plainText = tmp.textContent || tmp.innerText || '';
      const lines = pdf.splitTextToSize(plainText, maxLineWidth);
      lines.forEach(line => {
        if (y > pageHeight - margin) { pdf.addPage(); y = margin; }
        pdf.text(line, margin, y); y += 6.5;
      });
    } else {
      blocks.forEach(el => {
        const tag = el.tagName.toLowerCase(); let text = el.textContent.trim();
        if (!text) return;
        if (tag === 'h1') { pdf.setFontSize(18); pdf.setTextColor(30, 30, 30); }
        else if (tag === 'h2') { pdf.setFontSize(16); pdf.setTextColor(30, 30, 30); }
        else if (tag === 'h3') { pdf.setFontSize(14); pdf.setTextColor(30, 30, 30); }
        else if (tag === 'pre') { pdf.setFontSize(10); pdf.setTextColor(100, 100, 100); }
        else if (tag === 'blockquote') { pdf.setFontSize(12); pdf.setTextColor(120, 120, 120); }
        else { pdf.setFontSize(12); pdf.setTextColor(60, 60, 60); }
        if (tag === 'li') {
          const isOrdered = el.parentElement && el.parentElement.tagName.toLowerCase() === 'ol';
          text = (isOrdered ? '1. ' : '• ') + text;
        }
        const lines = pdf.splitTextToSize(text, maxLineWidth);
        lines.forEach(line => {
          if (y > pageHeight - margin - 10) { pdf.addPage(); y = margin; }
          pdf.text(line, margin, y); y += (tag === 'pre' ? 5 : 7);
        });
        y += 3; 
      });
    }
    pdf.save((note.title || '未命名笔记') + '.pdf');
    showToast('已导出纯文字 PDF');
  } catch (e) { console.error(e); showToast('导出 PDF 失败：' + e.message); }
}

function showExportMenu() {
  const existing = document.getElementById('exportMenu');
  if(existing) existing.remove();
  
  const menu = document.createElement('div');
  menu.id = 'exportMenu'; menu.className = 'menu-card open';
  menu.style.cssText = 'top:auto;bottom:100px;left:50%;margin-left:-90px;width:180px;z-index:4000;';
  menu.innerHTML = `
    <div class="menu-item" data-export="note"><span>导出 .note 文件</span></div>
    <div class="menu-item" data-export="png"><span>导出 PNG 图片</span></div>
    <div class="menu-item" data-export="pdf"><span>导出纯文字 PDF</span></div>
  `;
  document.body.appendChild(menu);
  
  menu.addEventListener('click', async e => {
    const item = e.target.closest('[data-export]'); if(!item) return;
    menu.remove();
    const type = item.dataset.export;
    const targetNote = detailNote || notes.find(n => selectedIds.has(n.id)) || notes[0]; 
    if(!targetNote) { showToast('没有可导出的笔记'); return; }
    if(type === 'note') await exportNoteAsFile(targetNote);
    if(type === 'png') await exportNoteAsImage(targetNote);
    if(type === 'pdf') await exportNoteAsPDF(targetNote);
  });
  
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(ev) {
      if(!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', closeMenu); }
    });
  }, 100);
}

if(btnImport) {
  btnImport.addEventListener('click', e => {
    e.stopPropagation(); isExpanded = false; bottomBar.classList.remove('expanded'); importNoteFile();
  });
}

const detailActions = document.querySelector('#noteDetail .detail-actions');
if (detailActions && !document.getElementById('detailExportBtn')) {
  const exportBtn = document.createElement('button');
  exportBtn.id = 'detailExportBtn'; exportBtn.className = 'detail-share'; exportBtn.textContent = '导出'; exportBtn.onclick = showExportMenu;
  detailActions.insertBefore(exportBtn, detailActions.firstChild);
}

document.addEventListener('click', function(e) {
  const a = e.target.closest('a');
  if (a && a.href && !a.href.startsWith('javascript:')) {
    if ((richEditor && richEditor.contains(a)) || (detailContentWrap && detailContentWrap.contains(a))) {
      e.preventDefault(); e.stopPropagation(); openIframe(a.href, a.textContent);
    }
  }
}, true);

(async function init(){
  try{
    await openDB(); notes = await dbGetAll(); folders = await dbGetAllFolders();
    let inited = null;
    try{ inited = localStorage.getItem('notes_default_folders_init'); }catch(e){}
    if(!inited && folders.length === 0){
      for(const f of DEFAULT_FOLDERS){ await dbPutFolder(f); }
      folders = DEFAULT_FOLDERS.slice();
      try{ localStorage.setItem('notes_default_folders_init','1'); }catch(e){}
    }
    if(!folders.some(f=>f.id===UNCAT_ID)){
      const unc = {id:UNCAT_ID, name:'未分类', color:'#f5c542'}; await dbPutFolder(unc); folders.unshift(unc);
    }
    for(const n of notes){ if(!n.deleted && !n.folderId){ n.folderId = UNCAT_ID; await dbPut(n); } }
    const now = Date.now();
    for(const n of notes){
      if(n.deleted && n.deletedAt && (now - n.deletedAt > 30*24*3600*1000)){ await dbDelete(n.id); }
    }
    notes = notes.filter(n=>!(n.deleted && n.deletedAt && (now - n.deletedAt > 30*24*3600*1000)));

    let dark = false, glass = 75;
    try{
      dark = localStorage.getItem('notes_dark') === '1';
      const g = localStorage.getItem('notes_glass'); if(g !== null) glass = parseInt(g, 10);
    }catch(e){}
    applyDarkMode(dark); applyGlassLevel(isNaN(glass) ? 75 : glass);
  } catch(e){ console.error(e); }
  updateSubmenuChecks(); renderSidebar(); renderNotes(); scheduleLatexRetry();
})();