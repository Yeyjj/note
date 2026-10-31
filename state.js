/* 默认文件夹 */

const UNCAT_ID = 'f_default_uncategorized';
const DEFAULT_FOLDERS = [
  {id:UNCAT_ID,             name:'未分类', color:'#f5c542'},
  {id:'f_default_travel',   name:'旅游',   color:'#4a9eff'},
  {id:'f_default_personal', name:'个人',   color:'#5bd0c8'},
  {id:'f_default_life',     name:'生活',   color:'#5cd68a'},
  {id:'f_default_work',     name:'工作',   color:'#ff6b6b'}
];


/* 状态 */

let notes=[];
let folders=[];
let currentFilter='all';
let currentView='grid';
let currentSort='updated';
let searchKeyword='';
let multiSelectMode=false;
let selectedIds=new Set();
let editingBook=null;
let sidebarEditing=false;
let editorFolderId = UNCAT_ID;

try{
  const v=localStorage.getItem('notes_view');const s=localStorage.getItem('notes_sort');
  if(v)currentView=v;if(s)currentSort=s;
}catch(e){}
function savePrefs(){try{
  localStorage.setItem('notes_view',currentView);
  localStorage.setItem('notes_sort',currentSort);}catch(e){}}


