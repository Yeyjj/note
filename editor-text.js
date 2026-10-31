/* 富文本编辑器 */
const textEditor=document.getElementById('textEditor');
const textTitle=document.getElementById('textTitle');
const richEditor=document.getElementById('richEditor');
const textDone=document.getElementById('textDone');
let editingNote=null;

function createTodoLine(text){
  const line = document.createElement('div');
  line.className = 'todo-line';
  const check = document.createElement('span');
  check.className = 'todo-check';
  check.setAttribute('contenteditable','false');
  check.setAttribute('tabindex', '-1');
  check.dataset.checked = 'false';
  const txt = document.createElement('span');
  txt.className = 'todo-text';
  txt.textContent = text || '';
  line.appendChild(check);
  line.appendChild(txt);
  return line;
}

function normalizeTodoLines(){
  richEditor.querySelectorAll('.todo-line').forEach(line=>{
    let check = null;
    let textEl = null;
    Array.from(line.children).forEach(ch=>{
      if(ch.classList.contains('todo-check')) check = ch;
      else if(ch.classList.contains('todo-text')) textEl = ch;
    });
    if(!check){
      check = document.createElement('span');
      check.className = 'todo-check';
      check.setAttribute('contenteditable','false');
      check.setAttribute('tabindex', '-1');
      check.dataset.checked = 'false';
      line.insertBefore(check, line.firstChild);
    }
    if(!check.dataset.checked) check.dataset.checked = 'false';
    if(!textEl){
      textEl = document.createElement('span');
      textEl.className = 'todo-text';
      Array.from(line.childNodes).forEach(n=>{
        if(n !== check) textEl.appendChild(n);
      });
      line.appendChild(textEl);
    }
  });
}

richEditor.addEventListener('scroll', () => {
  if (richEditor.scrollTop > 30) {
    textEditor.classList.add('scrolled');
  } else {
    textEditor.classList.remove('scrolled');
  }
}, { passive: true });

function openTextEditor(note=null){
  if(isExpanded){isExpanded=false;bottomBarEl.classList.remove('expanded');}
  editingNote=note;
  editorFolderId = note ? folderOf(note) : UNCAT_ID;
  updateEditorFolderPill('text', editorFolderId);
  currentAttachments = note && note.attachments ? Object.assign({}, note.attachments) : {};
  if(note){
    textTitle.value = note.title || '';
    richEditor.innerHTML = note.content || '';
  } else {
    textTitle.value=''; richEditor.innerHTML='';
  }
  
  textEditor.classList.remove('scrolled');

  openScreen(textEditor);
  setTimeout(()=>{
    hydrateAttachments(richEditor, currentAttachments);
    hydrateLatex(richEditor);
    bindTodoChecks(richEditor, null, false);
    normalizeTodoLines();
    bindAllTableMenus();
    if(!note || !note.title){
      textTitle.focus();
    } else {
      richEditor.focus();
      try{
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(richEditor);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }catch(_){}
    }
  },380);
}

async function saveTextEditor(){
  const title = textTitle.value.trim();
  normalizeTodoLines();
  const clone = richEditor.cloneNode(true);
  clone.querySelectorAll('[data-todo-bound]').forEach(el=>el.removeAttribute('data-todo-bound'));
  clone.querySelectorAll('[data-bound]').forEach(el=>el.removeAttribute('data-bound'));
  clone.querySelectorAll('[data-menu-bound]').forEach(el=>el.removeAttribute('data-menu-bound'));
  const cleanedHtml = cleanBlobUrls(clone.innerHTML).trim();
  const atts = stripAttachmentTempFields(currentAttachments);
  const hasAtt = Object.keys(atts).length > 0;
  
  if(title || cleanedHtml || hasAtt){
    if(editingNote){
      await createHistorySnapshot(JSON.parse(JSON.stringify(editingNote)));
      editingNote.title = title;
      editingNote.content = cleanedHtml;
      editingNote.attachments = atts;
      editingNote.folderId = editorFolderId;
      await updateNote(editingNote);
    } else {
      await addNote({ id:newId('t'), type:'text', title,
        content: cleanedHtml, attachments: atts,
        folderId: editorFolderId,
        createdAt:Date.now(), updatedAt:Date.now() });
    }
  } else if(editingNote){ 
    await createHistorySnapshot(JSON.parse(JSON.stringify(editingNote)));
    await removeNote(editingNote.id); 
  }
  closeScreen(textEditor); editingNote=null;
  hideSelTools();
}
textDone.addEventListener('click',saveTextEditor);
document.querySelector('[data-close="text"]').addEventListener('click',saveTextEditor);

document.getElementById('toolScroll').addEventListener('click',e=>{
  const btn=e.target.closest('button'); if(!btn) return;
  applyRichCommand(btn.dataset.rich);
});
function applyRichCommand(cmd){
  richEditor.focus();
  const sel = window.getSelection();
  switch(cmd){
    case 'h1': document.execCommand('formatBlock', false, 'h1'); break;
    case 'h2': document.execCommand('formatBlock', false, 'h2'); break;
    case 'h3': document.execCommand('formatBlock', false, 'h3'); break;
    case 'bold': document.execCommand('bold'); break;
    case 'italic': document.execCommand('italic'); break;
    case 'strike': document.execCommand('strikeThrough'); break;
    case 'underline': document.execCommand('underline'); break;
    case 'code': {
      const t = (sel && !sel.isCollapsed) ? sel.toString() : '代码';
      const codeEl = document.createElement('code');
      codeEl.textContent = t;
      insertAtCursor(codeEl);
      break;
    }
    case 'codeblock': {
      const text = (sel && !sel.isCollapsed) ? sel.toString() : '';
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = text || '在此输入代码';
      pre.appendChild(code);
      insertAtCursor(pre);
      break;
    }
    case 'quote': document.execCommand('formatBlock', false, 'blockquote'); break;
    case 'ul': document.execCommand('insertUnorderedList'); break;
    case 'ol': document.execCommand('insertOrderedList'); break;
    case 'indent': {
      if(!sel.rangeCount) break;
      if(sel.isCollapsed) {
        let node = sel.anchorNode;
        if(node.nodeType === 3) node = node.parentNode;
        const block = findTopLevelBlock(node);
        if(block) {
          if (block.style.textIndent === '2em') { block.style.textIndent = ''; }
          else { block.style.textIndent = '2em'; }
        }
      } else {
        const range = sel.getRangeAt(0);
        const walker = document.createTreeWalker(richEditor, NodeFilter.SHOW_ELEMENT, {
          acceptNode(node) { if(isBlockNode(node)) return NodeFilter.FILTER_ACCEPT; return NodeFilter.FILTER_SKIP; }
        });
        let node = walker.currentNode;
        while(node) {
          if (range.intersectsNode(node)) {
            if (node.style.textIndent === '2em') { node.style.textIndent = ''; }
            else { node.style.textIndent = '2em'; }
          }
          node = walker.nextNode();
        }
      }
      break;
    }
    case 'todo': {
      const text = (sel && !sel.isCollapsed) ? sel.toString() : '';
      const line = createTodoLine(text || '待办事项');
      insertAtCursor(line);
      normalizeTodoLines();
      break;
    }
    case 'link': openLinkDialog(); return;
    case 'hr': document.execCommand('insertHorizontalRule'); break;
    case 'table': insertTable(); break;
    case 'chart': openChartDialog(); return;
    case 'formula': openFormulaDialog(); return;
    case 'attach': openAttachPanel(); return;
  }
}

const linkDialogMask = document.getElementById('linkDialogMask');
const linkDialog = document.getElementById('linkDialog');
const linkText = document.getElementById('linkText');
const linkUrl = document.getElementById('linkUrl');
const linkCancel = document.getElementById('linkCancel');
const linkSave = document.getElementById('linkSave');
let linkSavedRange = null;

function openLinkDialog(){
  const sel = window.getSelection();
  if(sel && sel.rangeCount){
    linkSavedRange = sel.getRangeAt(0).cloneRange();
    linkText.value = !sel.isCollapsed ? sel.toString() : '';
  } else { linkSavedRange = null; linkText.value = ''; }
  linkUrl.value = 'https://';
  linkDialogMask.classList.add('open'); linkDialog.classList.add('open');
  setTimeout(()=>{ if(!linkText.value) linkText.focus(); else linkUrl.focus(); }, 250);
}
function closeLinkDialog(){
  linkDialogMask.classList.remove('open'); linkDialog.classList.remove('open');
}
linkCancel.addEventListener('click', closeLinkDialog);
linkDialogMask.addEventListener('click', closeLinkDialog);

linkSave.addEventListener('click', ()=>{
  const text = linkText.value.trim() || '链接';
  const url = linkUrl.value.trim();
  if(!url || url === 'https://'){ showToast('请输入链接地址'); return; }
  const a = document.createElement('a');
  a.href = url; a.textContent = text; a.target = '_blank'; a.style.color = '#f5c542';
  if(linkSavedRange){
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(linkSavedRange);
  }
  insertAtCursor(a);
  closeLinkDialog();
});

const BLOCK_TAGS = ['DIV','P','H1','H2','H3','H4','H5','H6','UL','OL','LI','BLOCKQUOTE','TABLE','HR','PRE','FIGURE','SECTION'];

function isBlockNode(node){
  return node && node.nodeType === 1 && BLOCK_TAGS.indexOf(node.tagName) !== -1;
}
function findTopLevelBlock(node){
  if(!node || node === richEditor) return null;
  let cur = node;
  if(cur.nodeType === 3) cur = cur.parentNode;
  while(cur && cur !== richEditor){
    if(cur.parentNode === richEditor) return cur;
    cur = cur.parentNode;
  }
  return null;
}
function ensureTrailingParagraph(afterNode){
  if(!afterNode || !afterNode.parentNode) return null;
  const next = afterNode.nextSibling;
  if(next && next.nodeType === 1 && BLOCK_TAGS.indexOf(next.tagName) !== -1) return next;
  const p = document.createElement('p');
  p.innerHTML = '<br>';
  afterNode.parentNode.insertBefore(p, afterNode.nextSibling);
  return p;
}
function placeCaret(node, atStart){
  if(!node) return;
  const sel = window.getSelection();
  const r = document.createRange();
  try{
    if(atStart){ r.setStart(node, 0); }
    else { r.selectNodeContents(node); r.collapse(false); }
    r.collapse(true);
  }catch(e){ r.selectNodeContents(node); }
  sel.removeAllRanges(); sel.addRange(r);
}
function insertAtCursor(node){
  if(!richEditor || !node) return;
  richEditor.focus();

  const sel = window.getSelection();
  let range;
  if(sel.rangeCount && richEditor.contains(sel.anchorNode)){
    range = sel.getRangeAt(0);
  } else {
    range = document.createRange();
    range.selectNodeContents(richEditor);
    range.collapse(false);
  }
  range.deleteContents();

  if(isBlockNode(node)){
    const topBlock = findTopLevelBlock(range.startContainer);
    if(topBlock && topBlock.parentNode === richEditor){
      richEditor.insertBefore(node, topBlock.nextSibling);
    } else if(range.startContainer === richEditor){
      const ref = richEditor.childNodes[range.startOffset] || null;
      richEditor.insertBefore(node, ref);
    } else {
      richEditor.appendChild(node);
    }
    ensureTrailingParagraph(node);
    const editable = node.querySelector('.todo-text') || node.querySelector('[contenteditable="true"]');
    if(editable){ placeCaret(editable, false); }
    else {
      const next = node.nextSibling;
      if(next && next.nodeType === 1) placeCaret(next, true);
    }
  } else {
    range.insertNode(node);
    const r2 = document.createRange();
    r2.setStartAfter(node);
    r2.collapse(true);
    sel.removeAllRanges(); sel.addRange(r2);
  }
}

function insertTable(){
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  wrap.setAttribute('contenteditable','false');
  wrap.innerHTML = '<button class="table-more-btn" contenteditable="false" title="表格操作">⋯</button>'+
    '<table contenteditable="true"><tbody>'+
    '<tr><th>列1</th><th>列2</th></tr><tr><td>值1</td><td>值2</td></tr>'+
    '</tbody></table>';
  insertAtCursor(wrap);
  bindAllTableMenus();
  const firstCell = wrap.querySelector('td');
  if(firstCell){
    setTimeout(()=>{
      const r = document.createRange();
      r.selectNodeContents(firstCell); r.collapse(true);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); richEditor.focus();
    }, 0);
  }
}

const selTools = document.getElementById('selTools');
const itbSize = document.getElementById('itbSize');
let savedRange = null;
let selInteracting = false;

function showSelTools(){
  const sel = window.getSelection();
  if(sel && sel.rangeCount && !sel.isCollapsed){
    try{ savedRange = sel.getRangeAt(0).cloneRange(); }catch(e){}
  }
  selTools.classList.add('active');
}
function hideSelTools(){
  selTools.classList.remove('active');
  savedRange = null;
}
function restoreRange(){
  if(!savedRange) return false;
  try{
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); return true;
  }catch(e){ return false; }
}

document.addEventListener('selectionchange', ()=>{
  if(!textEditor.classList.contains('open')){ hideSelTools(); return; }
  if(selInteracting) return;
  const sel = window.getSelection();
  if(!sel || sel.isCollapsed || !sel.anchorNode || !richEditor.contains(sel.anchorNode)){
    hideSelTools(); return;
  }
  showSelTools();
});

selTools.addEventListener('pointerdown', e=>{ selInteracting = true; });
document.addEventListener('pointerup', ()=>{
  if(selInteracting){ setTimeout(()=>{ selInteracting = false; }, 120); }
});

selTools.querySelectorAll('.itb-color').forEach(el=>{
  el.addEventListener('pointerdown', e=>{ e.preventDefault(); });
  el.addEventListener('click', e=>{
    e.preventDefault();
    const color = el.dataset.color;
    richEditor.focus();
    if(!restoreRange()) return;
    document.execCommand('foreColor', false, color);
    selInteracting = true;
    setTimeout(()=>{ selInteracting = false; }, 120);
  });
});

itbSize.addEventListener('change', ()=>{
  const size = itbSize.value;
  itbSize.value = '';
  if(!size) return;
  richEditor.focus();
  if(!restoreRange()) return;
  const sel = window.getSelection();
  if(!sel.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  span.style.fontSize = size + 'px';
  try{ range.surroundContents(span); }
  catch(e){ const frag = range.extractContents(); span.appendChild(frag); range.insertNode(span); }
  selInteracting = true;
  setTimeout(()=>{ selInteracting = false; }, 120);
});

richEditor.addEventListener('input', ()=>{ normalizeTodoLines(); });

richEditor.addEventListener('keydown', e=>{
  if(e.isComposing) return;
  const sel = window.getSelection();
  if(!sel || !sel.rangeCount) return;
  let node = sel.anchorNode;
  if(node && node.nodeType === 3) node = node.parentNode;
  if(!node || !richEditor.contains(node)) return;

  if(e.key === 'Backspace' && sel.isCollapsed && sel.anchorOffset === 0){
    const textHost = node.closest ? node.closest('.todo-text') : null;
    if(textHost){
      const prev = textHost.previousElementSibling;
      if(prev && prev.classList && prev.classList.contains('todo-check')){
        const line = textHost.closest('.todo-line');
        if(textContent.trim() === '' && line){
          e.preventDefault();
          const before = line.previousElementSibling;
          line.remove();
          if(before){ placeCaret(before, false); }
          else {
            const p = document.createElement('p'); p.innerHTML = '<br>';
            richEditor.insertBefore(p, richEditor.firstChild);
            placeCaret(p, true);
          }
          return;
        }
        e.preventDefault();
        return;
      }
    }
  }

  if(e.key !== 'Enter' || e.shiftKey) return;
  const todoLine = node.closest ? node.closest('.todo-line') : null;
  if(todoLine && richEditor.contains(todoLine)){
    e.preventDefault();
    const textEl = todoLine.querySelector('.todo-text');
    const isEmpty = !textEl || textEl.textContent.trim() === '';
    if(isEmpty){
      const p = document.createElement('p'); p.innerHTML = '<br>';
      if(todoLine.parentNode){ todoLine.parentNode.insertBefore(p, todoLine.nextSibling); todoLine.remove(); }
      placeCaret(p, true);
    } else {
      const newLine = createTodoLine('');
      todoLine.parentNode.insertBefore(newLine, todoLine.nextSibling);
      placeCaret(newLine.querySelector('.todo-text'), true);
    }
    return;
  }

  if(node.closest && (node.closest('li') || node.closest('ul') || node.closest('ol'))) return;

  const top = findTopLevelBlock(node);
  if(top && top.tagName === 'DIV' && !top.classList.contains('todo-line')){
    e.preventDefault();
    const p = document.createElement('p'); p.innerHTML = '<br>';
    top.parentNode.insertBefore(p, top.nextSibling);
    placeCaret(p, true);
  }
});