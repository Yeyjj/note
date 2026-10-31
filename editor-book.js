/* 书籍 */

const bookEditor=document.getElementById('bookEditor');
const bookCover=document.getElementById('bookCover');
const bookName=document.getElementById('bookName');
const bookIntro=document.getElementById('bookIntro');
const volumeList=document.getElementById('volumeList');
let bookCoverData=null, bookVolumes=[];

function openBookEditor(note=null){
  if(isExpanded){isExpanded=false;bottomBarEl.classList.remove('expanded');}
  editingBook=note;
  editorFolderId = note ? folderOf(note) : UNCAT_ID;
  updateEditorFolderPill('book', editorFolderId);
  if(note){
    bookCoverData=note.cover||null;
    bookName.value=note.title||'';
    bookIntro.value=note.intro||'';
    bookVolumes=JSON.parse(JSON.stringify(note.volumes||[]));
  } else {
    bookCoverData=null; bookName.value=''; bookIntro.value=''; bookVolumes=[];
  }
  renderBookCover(); renderVolumes(); openScreen(bookEditor);
  setTimeout(()=>{ if(!note||!note.title) bookName.focus(); },380);
}
function renderBookCover(){
  if(bookCoverData){
    bookCover.innerHTML='<img src="'+bookCoverData+'" alt="封面">';
  } else {
    bookCover.innerHTML='<span class="placeholder">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+
      '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'+
      '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>';
  }
}
bookCover.addEventListener('click',()=>{
  const input=document.createElement('input');
  input.type='file'; input.accept='image/*';
  input.addEventListener('change',()=>{
    const f=input.files[0]; if(!f)return;
    const r=new FileReader();
    r.onload=()=>{bookCoverData=r.result;renderBookCover();};
    r.readAsDataURL(f);
  });
  input.click();
});
function renderVolumes(){
  volumeList.innerHTML='';
  if(!bookVolumes.length){
    volumeList.innerHTML='<div class="book-empty">还没有分卷，点上方按钮添加</div>';
    return;
  }
  bookVolumes.forEach((vol,vi)=>{
    const div=document.createElement('div'); div.className='book-volume';
    const header=document.createElement('div'); header.className='book-volume-header';
    const titleInput=document.createElement('input');
    titleInput.className='book-volume-title';
    titleInput.placeholder='第 '+(vi+1)+' 卷';
    titleInput.value=vol.title||'';
    titleInput.addEventListener('input',()=>{vol.title=titleInput.value;});
    const delBtn=document.createElement('button');
    delBtn.className='book-volume-del'; delBtn.textContent='×';
    delBtn.addEventListener('click',()=>{
      if(!confirm('确定删除该卷及其所有章节？'))return;
      bookVolumes.splice(vi,1); renderVolumes();
    });
    header.appendChild(titleInput); header.appendChild(delBtn);
    div.appendChild(header);
    (vol.chapters||[]).forEach((ch,ci)=>{
      const row=document.createElement('div'); row.className='book-chapter';
      row.innerHTML='<div class="book-chapter-title">'+escapeHtml(ch.title||('第 '+(ci+1)+' 章'))+'</div>'+
        '<div class="book-chapter-actions"><span class="book-chapter-count">'+countWords(ch.content||'')+' 字</span>'+
        '<button class="book-chapter-del">×</button></div>';
      row.addEventListener('click',e=>{ if(e.target.classList.contains('book-chapter-del'))return; openChapterEditor(vol,ch); });
      row.querySelector('.book-chapter-del').addEventListener('click',e=>{
        e.stopPropagation();
        if(!confirm('删除该章节？'))return;
        vol.chapters.splice(ci,1); renderVolumes();
      });
      div.appendChild(row);
    });
    const addCh=document.createElement('button');
    addCh.className='book-add-btn'; addCh.textContent='+ 章节';
    addCh.style.marginTop='8px'; addCh.style.fontSize='12px'; addCh.style.padding='4px 10px';
    addCh.addEventListener('click',()=>{
      if(!vol.chapters) vol.chapters=[];
      vol.chapters.push({id:newId('c'),title:'第 '+(vol.chapters.length+1)+' 章',content:''});
      renderVolumes();
    });
    div.appendChild(addCh);
    volumeList.appendChild(div);
  });
}
document.getElementById('addVolumeBtn').addEventListener('click',()=>{
  bookVolumes.push({id:newId('v'),title:'第 '+(bookVolumes.length+1)+' 卷',chapters:[]});
  renderVolumes();
});
async function saveBookEditor(){
  const name=bookName.value.trim();
  const intro=bookIntro.value.trim();
  if(!name&&!intro&&!bookVolumes.length&&!bookCoverData){
    if(editingBook){
      await createHistorySnapshot(JSON.parse(JSON.stringify(editingBook)));
      await removeNote(editingBook.id);
    }
    closeScreen(bookEditor); editingBook=null; return;
  }
  if(editingBook){
    await createHistorySnapshot(JSON.parse(JSON.stringify(editingBook))); // 修复点
    
    editingBook.title=name||'未命名书籍';
    editingBook.intro=intro;
    editingBook.volumes=bookVolumes;
    editingBook.cover=bookCoverData;
    editingBook.folderId = editorFolderId;
    await updateNote(editingBook);
  } else {
    await addNote({ id:newId('b'),type:'book',
      title:name||'未命名书籍', intro:intro, cover:bookCoverData,
      volumes:bookVolumes, content:'',
      folderId: editorFolderId,
      createdAt:Date.now(),updatedAt:Date.now() });
  }
  closeScreen(bookEditor); editingBook=null;
}
document.getElementById('bookDone').addEventListener('click',saveBookEditor);
document.querySelector('[data-close="book"]').addEventListener('click',saveBookEditor);

/* 章节编辑 */
const chapterEditor=document.getElementById('chapterEditor');
const chapterTitle=document.getElementById('chapterTitle');
const chapterBody=document.getElementById('chapterBody');
let editingChapter=null;
function openChapterEditor(vol,chapter){
  editingChapter=chapter;
  chapterTitle.value=chapter.title||'';
  chapterBody.value=chapter.content||'';
  chapterTitle.readOnly=false; chapterBody.readOnly=false;
  document.getElementById('chapterDone').style.display='';
  openScreen(chapterEditor);
  setTimeout(()=>chapterTitle.focus(),380);
}
document.getElementById('chapterBack').addEventListener('click',()=>{
  editingChapter=null; closeScreen(chapterEditor);
  chapterTitle.readOnly=false; chapterBody.readOnly=false;
  document.getElementById('chapterDone').style.display='';
  renderVolumes();
});
document.getElementById('chapterDone').addEventListener('click',()=>{
  if(!editingChapter)return;
  editingChapter.title=chapterTitle.value.trim()||'未命名章节';
  editingChapter.content=chapterBody.value;
  editingChapter=null; closeScreen(chapterEditor); renderVolumes();
  showToast('章节已保存');
});


