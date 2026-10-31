/* 设置页 —— 主题 */
const settingsScreen = document.getElementById('settingsScreen');
document.getElementById('settingsBack').addEventListener('click',()=>{ closeScreen(settingsScreen); });

const darkModeToggle = document.getElementById('darkModeToggle');
const glassSlider = document.getElementById('glassSlider');
const glassLevelLabel = document.getElementById('glassLevelLabel');
const gsSolid = document.getElementById('gsSolid');
const gsGlass = document.getElementById('gsGlass');

const historyEnableToggle = document.getElementById('historyEnableToggle');
const historyLimitRow = document.getElementById('historyLimitRow');
const historyLimitValueRow = document.getElementById('historyLimitValueRow');
const historyLimitLabel = document.getElementById('historyLimitLabel');
const historyLimitValue = document.getElementById('historyLimitValue');
const historyPolicyRadios = document.querySelectorAll('input[name="historyPolicy"]');

function applyDarkMode(isDark){
  document.body.classList.toggle('dark', isDark);
  darkModeToggle.checked = isDark;
  try{ localStorage.setItem('notes_dark', isDark ? '1' : '0'); }catch(e){}
}

function applyGlassLevel(value){
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const t = v / 100;
  const root = document.documentElement;
  root.style.setProperty('--glass-blur', (t * 32).toFixed(1) + 'px');
  root.style.setProperty('--glass-alpha', (1 - 0.72 * t).toFixed(3));
  glassSlider.value = v;
  glassLevelLabel.textContent = v + '%';
  gsSolid.classList.toggle('active', v <= 25);
  gsGlass.classList.toggle('active', v >= 75);
  try{ localStorage.setItem('notes_glass', String(v)); }catch(e){}
}

function updateHistoryDropdownOptions() {
  const policy = document.querySelector('input[name="historyPolicy"]:checked').value;
  const oldVal = historyLimitValue.value;
  
  if (policy === 'count') {
    historyLimitValue.innerHTML = `
      <option value="5">5 个</option>
      <option value="10">10 个</option>
      <option value="20">20 个</option>
      <option value="50">50 个</option>
      <option value="100">100 个</option>
    `;
  } else {
    historyLimitValue.innerHTML = `
      <option value="1">1 天</option>
      <option value="3">3 天</option>
      <option value="7">7 天</option>
      <option value="30">30 天</option>
    `;
  }
  
  if (historyLimitValue.querySelector(`option[value="${oldVal}"]`)) {
    historyLimitValue.value = oldVal;
  } else {
    historyLimitValue.value = policy === 'count' ? '20' : '7';
  }
  updateHistoryLimitLabel();
}

function updateHistoryLimitLabel() {
  const policy = document.querySelector('input[name="historyPolicy"]:checked').value;
  const val = historyLimitValue.value;
  historyLimitLabel.textContent = policy === 'count' 
    ? `保留最近 ${val} 个版本` 
    : `保留最近 ${val} 天`;
}

function updateHistorySettingsUI(){
  const enabled = historyEnableToggle.checked;
  historyLimitRow.style.opacity = enabled ? '1' : '0.4';
  historyLimitValueRow.style.opacity = enabled ? '1' : '0.4';
  historyLimitRow.style.pointerEvents = enabled ? 'auto' : 'none';
  historyLimitValueRow.style.pointerEvents = enabled ? 'auto' : 'none';
}

function loadHistorySettings(){
  const enabled = localStorage.getItem('notes_history_enabled') !== '0';
  historyEnableToggle.checked = enabled;

  const policy = localStorage.getItem('notes_history_policy') || 'count';
  historyPolicyRadios.forEach(r => r.checked = (r.value === policy));

  updateHistoryDropdownOptions();
  
  const limit = localStorage.getItem('notes_history_limit');
  if (limit && historyLimitValue.querySelector(`option[value="${limit}"]`)) {
    historyLimitValue.value = limit;
  }
  updateHistoryLimitLabel();
  updateHistorySettingsUI();
}

darkModeToggle.addEventListener('change', ()=>{ applyDarkMode(darkModeToggle.checked); });
glassSlider.addEventListener('input', ()=>{ applyGlassLevel(glassSlider.value); });

historyEnableToggle.addEventListener('change', () => {
  localStorage.setItem('notes_history_enabled', historyEnableToggle.checked ? '1' : '0');
  updateHistorySettingsUI();
});

historyPolicyRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    localStorage.setItem('notes_history_policy', radio.value);
    localStorage.setItem('notes_history_limit', radio.value === 'count' ? '20' : '7');
    updateHistoryDropdownOptions();
    loadHistorySettings(); 
  });
});

historyLimitValue.addEventListener('change', () => {
  localStorage.setItem('notes_history_limit', historyLimitValue.value);
  updateHistoryLimitLabel();
});

loadHistorySettings();

/* 备份与恢复 */
function loadScriptOnce(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) return resolve();
    const s = document.createElement('script'); s.src = url; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
  });
}

async function ensureJSZip() {
  if (typeof JSZip !== 'undefined') return JSZip;
  try { await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'); return window.JSZip; }
  catch (e) { throw new Error('无法加载压缩库'); }
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
  });
}
function dataURLToBlob(dataURL) {
  const parts = dataURL.split(','); const mimeMatch = parts[0].match(/:(.*?);/); const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(parts[1]); let n = bstr.length; const u8 = new Uint8Array(n); while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

async function serializeNote(note) {
  const exportNote = JSON.parse(JSON.stringify(note, (key, val) => {
    if (val instanceof Blob) return undefined; if (key.startsWith('_')) return undefined; return val;
  }));
  if (exportNote.attachments) {
    const newAtts = {};
    for (const key in exportNote.attachments) {
      const att = exportNote.attachments[key]; const out = { type: att.type, name: att.name, size: att.size };
      if (att.blob) { out.src = await blobToDataURL(att.blob); } else if (att.src) { out.src = att.src; }
      newAtts[key] = out;
    }
    exportNote.attachments = newAtts;
  }
  return exportNote;
}

function deserializeNote(note) {
  if (note.attachments) {
    const newAtts = {};
    for (const key in note.attachments) {
      const att = note.attachments[key];
      if (att.src && att.src.startsWith('data:')) {
        try { const blob = dataURLToBlob(att.src); newAtts[key] = { type: att.type, name: att.name, blob, size: blob.size }; }
        catch (e) { newAtts[key] = { type: att.type, name: att.name, src: att.src, size: att.size }; }
      } else { newAtts[key] = att; }
    }
    note.attachments = newAtts;
  }
  return note;
}

function safeFileName(name, fallback) {
  const s = String(name || '').replace(/[\\/:*?"<>|\r\n\t]/g, '_').trim(); return (s || fallback).slice(0, 80);
}

async function exportBackup() {
  let JSZipLib;
  try { JSZipLib = await ensureJSZip(); } catch (e) { showToast(e.message); return; }
  const allNotes = notes.filter(n => !n.deleted);
  if (!allNotes.length) { showToast('没有可备份的笔记'); return; }

  showToast('正在打包备份，请稍候…');
  const btn = document.getElementById('exportBackupBtn');
  if (btn) { btn.disabled = true; btn.textContent = '打包中…'; }

  try {
    const zip = new JSZipLib(); const notesFolder = zip.folder('notes'); const metaList = [];
    for (let i = 0; i < allNotes.length; i++) {
      const note = allNotes[i]; const serialized = await serializeNote(note);
      const baseName = safeFileName(serialized.title, (note.type || 'note') + '_' + (i + 1));
      let fileName = baseName + '.note'; let suffix = 1;
      while (metaList.some(m => m.file === fileName)) { fileName = baseName + '_' + (suffix++) + '.note'; }
      notesFolder.file(fileName, JSON.stringify(serialized, null, 2));
      metaList.push({ file: fileName, id: note.id, type: note.type, title: note.title || '' });
    }
    const meta = { format: 'notebak', version: 1, appName: '笔记', createdAt: Date.now(), noteCount: metaList.length, notes: metaList };
    zip.file('backup.json', JSON.stringify(meta, null, 2));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 }, mimeType: 'application/x-notebak' });

    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
    const a = document.createElement('a'); const url = URL.createObjectURL(blob);
    a.href = url; a.download = `笔记备份_${stamp}.notebak`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`已导出 ${metaList.length} 条笔记`);
  } catch (e) {
    console.error(e); showToast('导出失败：' + (e.message || e));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '导出备份'; }
  }
}

function importBackup() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = '*/*'; input.style.display = 'none'; document.body.appendChild(input);
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) { document.body.removeChild(input); return; }
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith('.notebak') && !nameLower.endsWith('.zip') && !nameLower.endsWith('.bak')) {
      showToast('请选择 .notebak 备份文件'); document.body.removeChild(input); return;
    }
    let arrayBuffer;
    try { arrayBuffer = await file.arrayBuffer(); } catch (e) { showToast('读取文件失败：' + e.message); document.body.removeChild(input); return; }
    let JSZipLib;
    try { JSZipLib = await ensureJSZip(); } catch (e) { showToast(e.message); document.body.removeChild(input); return; }
    showToast('正在解析备份…');

    try {
      const zip = await JSZipLib.loadAsync(arrayBuffer);
      let metaFile = zip.file('backup.json');
      if (!metaFile) {
        const hit = Object.keys(zip.files).find(p => p.endsWith('backup.json')); if (hit) metaFile = zip.file(hit);
      }
      if (!metaFile) {
        const hasNote = Object.keys(zip.files).some(p => p.endsWith('.note'));
        if (!hasNote) throw new Error('不是有效的 .notebak 备份（缺少 backup.json）');
      }
      const noteEntries = Object.keys(zip.files).filter(p => p.endsWith('.note') && !zip.files[p].dir);
      if (!noteEntries.length) throw new Error('备份中没有任何笔记');
      if (!confirm(`备份包含 ${noteEntries.length} 条笔记，确定导入吗？`)) { document.body.removeChild(input); return; }

      let success = 0, failed = 0;
      for (const path of noteEntries) {
        try {
          const text = await zip.file(path).async('string'); const raw = JSON.parse(text);
          if (!raw || !raw.type) throw new Error('无效笔记数据');
          raw.id = newId('n'); raw.deleted = false; raw.deletedAt = null;
          raw.createdAt = raw.createdAt || Date.now(); raw.updatedAt = Date.now(); raw.folderId = UNCAT_ID; raw.pinned = false;
          deserializeNote(raw); await addNote(raw); success++;
        } catch (e) { console.warn('导入笔记失败：', path, e); failed++; }
      }
      showToast(`导入完成：成功 ${success} 条${failed ? '，失败 ' + failed + ' 条' : ''}`);
    } catch (e) {
      console.error(e); showToast('导入失败：' + (e.message || e));
    } finally {
      if (input.parentNode) document.body.removeChild(input);
    }
  });
  input.click();
}

document.getElementById('exportBackupBtn').addEventListener('click', exportBackup);
document.getElementById('importBackupBtn').addEventListener('click', importBackup);