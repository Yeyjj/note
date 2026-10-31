/* KaTeX + markdown it 初始化 */

let mdRenderer = null;
function getMarkdownRenderer(){
  if(mdRenderer) return mdRenderer;
  if(typeof markdownit === 'undefined' || typeof texmath === 'undefined' || typeof katex === 'undefined'){
    return null;
  }
  try{
    const md = markdownit({ html: true, breaks: true, linkify: true });
    md.use(texmath, {
      engine: katex,
      delimiters: 'dollars',
      katexOptions: { throwOnError: false, strict: false, trust: true }
    });
    mdRenderer = md;
  }catch(e){ console.warn('markdown-it init failed', e); }
  return mdRenderer;
}
function hydrateLatex(container){
  if(!container) return;
  if(typeof katex === 'undefined' || !katex || !katex.renderToString) return;
  container.querySelectorAll('.latex-src').forEach(el=>{
    if(el.classList.contains('latex-rendered')) return;
    const src = el.getAttribute('data-src') || '';
    const display = el.getAttribute('data-display') === '1';
    try{
      el.innerHTML = katex.renderToString(src, {
        throwOnError: false, displayMode: display, strict: false, trust: true
      });
      el.classList.add('latex-rendered');
    }catch(e){ el.textContent = src; }
  });
}
function scheduleLatexRetry(){
  if(typeof katex !== 'undefined') return;
  let tries = 0;
  const timer = setInterval(()=>{
    tries++;
    if(typeof katex !== 'undefined'){
      clearInterval(timer);
      document.querySelectorAll('.latex-src').forEach(el=>{
        if(el.classList.contains('latex-rendered')) return;
        const src = el.getAttribute('data-src') || '';
        const display = el.getAttribute('data-display') === '1';
        try{
          el.innerHTML = katex.renderToString(src, {
            throwOnError: false, displayMode: display, strict: false, trust: true
          });
          el.classList.add('latex-rendered');
        }catch(e){ el.textContent = src; }
      });
    } else if(tries > 60){ clearInterval(timer); }
  }, 250);
}


/* 图标 */

const SVG_ICON = {
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
  pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1-4 11-11 3 3-11 11-4 1z"/><path d="M14.5 6.5l3 3"/></svg>',
  mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  brain:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="10" y1="10" x2="6.5" y2="6.5"/><line x1="14" y1="10" x2="17.5" y2="6.5"/><line x1="10" y1="14" x2="6.5" y2="17.5"/><line x1="14" y1="14" x2="17.5" y2="17.5"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6z"/><path d="M12 15v5"/></svg>',
  folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'
};


/* 工具函数 */

function escapeHtml(s){return String(s==null?'':s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function stripHtml(html){const d=document.createElement('div');
  d.innerHTML=html||'';return d.textContent||d.innerText||'';}
function highlight(text, keyword){
  const safe=escapeHtml(text);
  if(!keyword||!keyword.trim())return safe;
  const kw=keyword.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  try{const re=new RegExp('('+kw+')','gi');return safe.replace(re,'<mark>$1</mark>');}
  catch(e){return safe;}
}

/* 在 HTML 内容中对文本节点做搜索高亮 */
function highlightInHTML(html, kw){
  if(!kw || !kw.trim() || !html) return html || '';
  let tmp;
  try{
    tmp = document.createElement('div');
    tmp.innerHTML = html;
  }catch(e){ return html; }

  let re;
  try{
    const pattern = kw.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    re = new RegExp('('+pattern+')','gi');
  }catch(e){ return html; }

  const SKIP = {MARK:1,SCRIPT:1,STYLE:1,TEXTAREA:1,SVG:1};
  const SKIP_CLASS = { 'latex-src':1, 'katex':1, 'todo-check':1, 'table-more-btn':1 };

  function walk(node){
    const kids = Array.from(node.childNodes);
    for(const child of kids){
      if(child.nodeType === 3){
        const text = child.nodeValue;
        if(!text) continue;
        re.lastIndex = 0;
        if(!re.test(text)) continue;
        re.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0, m;
        while((m = re.exec(text))){
          if(!m[0]){ re.lastIndex++; continue; }
          if(m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          const mark = document.createElement('mark');
          mark.textContent = m[0];
          frag.appendChild(mark);
          last = m.index + m[0].length;
        }
        if(last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.replaceChild(frag, child);
      } else if(child.nodeType === 1){
        if(SKIP[child.tagName]) continue;
        if(child.classList){
          let skip = false;
          for(const c of child.classList){ if(SKIP_CLASS[c]){ skip = true; break; } }
          if(skip) continue;
        }
        walk(child);
      }
    }
  }
  walk(tmp);
  return tmp.innerHTML;
}

function formatDate(ts){const d=new Date(ts),n=new Date();
  if(d.toDateString()===n.toDateString()){
    return '今天 '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
  return (d.getMonth()+1)+'月'+d.getDate()+'日';}
function formatDuration(sec){sec=Math.max(0,Math.floor(sec||0));
  return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
function countWords(t){if(!t)return 0;
  return ((t.match(/[\u4e00-\u9fa5]/g)||[]).length)+((t.match(/[a-zA-Z]+/g)||[]).length);}
function newId(p){return (p||'n')+Date.now()+Math.random().toString(36).slice(2,7);}
function noteSize(n){try{return new Blob([JSON.stringify(n)]).size;}catch(e){return 0;}}
function formatSize(b){if(b<1024)return b+' B';if(b<1024*1024)return (b/1024).toFixed(1)+' KB';
  return (b/1024/1024).toFixed(1)+' MB';}
function folderOf(note){return note.folderId || UNCAT_ID;}

const toastEl=document.getElementById('toast');
let toastTimer=null;
function showToast(msg){toastEl.textContent=msg;toastEl.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),1800);}


/* 密码哈希 */

async function hashPassword(password){
  if(window.crypto && window.crypto.subtle){
    try{
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(e){}
  }
  let hash = 0;
  for(let i=0;i<password.length;i++){ hash = ((hash<<5)-hash)+password.charCodeAt(i); hash|=0; }
  return 'simple_'+hash.toString(16);
}


/* 附件管理 */

let currentAttachments = {};
function hydrateAttachments(container, attachments){
  if(!container || !attachments) return;
  const list = container.querySelectorAll ? container.querySelectorAll('[data-attach-id]') : [];
  const arr = Array.from(list);
  if(container.dataset && container.dataset.attachId) arr.push(container);
  arr.forEach(el=>{
    const id = el.dataset.attachId;
    const att = attachments[id];
    if(!att) return;
    if(att.src && !att.blob){
      if(el.tagName==='IMG'||el.tagName==='AUDIO'||el.tagName==='VIDEO') el.src = att.src;
      else if(el.tagName==='A') el.href = att.src;
      return;
    }
    if(!att.blob) return;
    let url = att._objectUrl;
    if(!url || att._urlBlob !== att.blob){
      url = URL.createObjectURL(att.blob);
      att._objectUrl = url;
      att._urlBlob = att.blob;
    }
    if(el.tagName==='IMG'||el.tagName==='AUDIO'||el.tagName==='VIDEO') el.src = url;
    else if(el.tagName==='A') el.href = url;
  });
}
function cleanBlobUrls(html){ return String(html||'').replace(/\s(src|href)="blob:[^"]*"/g,''); }
function htmlToPlainText(html){
  if(!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('img,audio,video').forEach(el=>el.remove());
  return (tmp.textContent || tmp.innerText || '').trim();
}
function stripAttachmentTempFields(atts){
  const out = {};
  Object.keys(atts || {}).forEach(id=>{
    const a = atts[id];
    out[id] = { type:a.type, name:a.name, blob:a.blob, size:a.size, src:a.src };
  });
  return out;
}


/* 待办复选框（事件委托，更稳健） */

function bindTodoChecks(container, note, persist){
  if(!container) return;
  if(container.dataset.todoBound === '1') return;
  container.dataset.todoBound = '1';
  container.addEventListener('click', e=>{
    const check = e.target.closest('.todo-check');
    if(!check) return;
    e.preventDefault();
    e.stopPropagation();
    const nowChecked = check.dataset.checked !== 'true';
    check.dataset.checked = nowChecked ? 'true' : 'false';
    const line = check.closest('.todo-line');
    if(line){
      const t = line.querySelector('.todo-text');
      if(t) t.classList.toggle('done', nowChecked);
    }
    if(persist && note){
      const wrapper = check.closest('.note-thumb-content');
      if(wrapper){
        note.content = wrapper.innerHTML;
        note.updatedAt = Date.now();
        dbPut(note);
        const i = notes.findIndex(n=>n.id===note.id);
        if(i>=0) notes[i] = note;
      }
    }
  });
}


