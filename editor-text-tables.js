/* 表格菜单 */

const tableMenuEl = document.getElementById('tableMenu');
let activeTableWrap = null;

function bindAllTableMenus(){
  richEditor.querySelectorAll('.table-wrap').forEach(wrap=>{
    if(wrap.dataset.menuBound === '1') return;
    wrap.dataset.menuBound = '1';
    const btn = wrap.querySelector('.table-more-btn');
    if(!btn) return;
    btn.addEventListener('click', e=>{
      e.preventDefault(); e.stopPropagation();
      activeTableWrap = wrap;
      const r = btn.getBoundingClientRect();
      tableMenuEl.style.left = Math.min(r.left, innerWidth-160)+'px';
      tableMenuEl.style.top = (r.bottom+6)+'px';
      tableMenuEl.classList.add('open');
    });
  });
}
document.addEventListener('click', e=>{
  if(!tableMenuEl.contains(e.target) && !e.target.closest('.table-more-btn')){
    tableMenuEl.classList.remove('open');
  }
});
tableMenuEl.addEventListener('click', e=>{
  const item = e.target.closest('[data-table-act]'); if(!item || !activeTableWrap) return;
  const act = item.dataset.tableAct;
  const table = activeTableWrap.querySelector('table');
  if(!table) return;
  switch(act){
    case 'addRow': {
      const rows = table.querySelectorAll('tr');
      const lastRow = rows[rows.length-1];
      const cols = lastRow ? lastRow.children.length : 1;
      const tr = document.createElement('tr');
      for(let i=0;i<cols;i++){
        const cell = document.createElement('td');
        cell.innerHTML = '<br>';
        tr.appendChild(cell);
      }
      table.querySelector('tbody').appendChild(tr);
      break;
    }
    case 'delRow': {
      const sel = window.getSelection();
      const tr = sel.anchorNode ?
        (sel.anchorNode.nodeType===1 ? sel.anchorNode : sel.anchorNode.parentElement).closest('tr') : null;
      const rows = table.querySelectorAll('tr');
      if(rows.length > 1){
        const target = tr && table.contains(tr) ? tr : rows[rows.length-1];
        if(target) target.remove();
      }
      break;
    }
    case 'addCol': {
      const rows = table.querySelectorAll('tr');
      rows.forEach(r=>{
        const isHead = r.children[0] && r.children[0].tagName === 'TH';
        const cell = document.createElement(isHead ? 'th' : 'td');
        cell.textContent = isHead ? '列'+(r.children.length+1) : '';
        r.appendChild(cell);
      });
      break;
    }
    case 'delCol': {
      const rows = table.querySelectorAll('tr');
      const maxCols = Math.max(...Array.from(rows).map(r=>r.children.length));
      if(maxCols > 1){
        rows.forEach(r=>{
          if(r.children.length === maxCols){
            r.removeChild(r.lastElementChild);
          }
        });
      }
      break;
    }
    case 'delTable': {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      activeTableWrap.parentNode.insertBefore(p, activeTableWrap.nextSibling);
      activeTableWrap.remove();
      placeCaret(p, true);
      break;
    }
  }
  tableMenuEl.classList.remove('open');
  activeTableWrap = null;
});


