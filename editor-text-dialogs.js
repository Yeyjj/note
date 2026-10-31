/* 图表（D3 多类型） */
const chartDialogMask = document.getElementById('chartDialogMask');
const chartDialog = document.getElementById('chartDialog');
const chartTypeGrid = document.getElementById('chartTypeGrid');
const chartTitleInput = document.getElementById('chartTitle');
const chartDataInput = document.getElementById('chartData');
let selectedChartType = 'bar';

chartTypeGrid.addEventListener('click', e=>{
  const item = e.target.closest('.picker-item'); if(!item) return;
  chartTypeGrid.querySelectorAll('.picker-item').forEach(x=>x.classList.remove('active'));
  item.classList.add('active'); selectedChartType = item.dataset.chart;
});

document.getElementById('chartColorThemes').addEventListener('click', e=>{
  const t = e.target.closest('.chart-theme'); if(!t) return;
  document.querySelectorAll('.chart-theme').forEach(x=>{ x.classList.remove('active'); x.style.borderColor = 'var(--line-2)'; });
  t.classList.add('active'); t.style.borderColor = 'var(--accent)';
});

function openChartDialog(){
  chartTitleInput.value = ''; chartDataInput.value = '一月,30\n二月,55\n三月,42\n四月,68';
  chartTypeGrid.querySelectorAll('.picker-item').forEach((x,i)=>x.classList.toggle('active', i===0));
  selectedChartType = 'bar';
  chartDialogMask.classList.add('open'); chartDialog.classList.add('open');
}
function closeChartDialog(){ chartDialogMask.classList.remove('open'); chartDialog.classList.remove('open'); }
document.getElementById('chartCancel').addEventListener('click', closeChartDialog);
chartDialogMask.addEventListener('click', closeChartDialog);
document.getElementById('chartSave').addEventListener('click', ()=>{
  if(typeof d3 === 'undefined'){ showToast('图表组件加载中，请稍后重试'); return; }
  const title = chartTitleInput.value.trim(); const raw = chartDataInput.value.trim();
  if(!raw){ showToast('请填写数据'); return; }
  const lines = raw.split('\n').map(l=>l.trim()).filter(Boolean); const data = [];
  for(const line of lines){
    const parts = line.split(','); const label = (parts[0]||'').trim(); const value = parseFloat((parts[1]||'').trim());
    if(label && !isNaN(value)) data.push({label, value});
  }
  if(data.length < 2){ showToast('至少需要两组数据'); return; }
  try{
    const showGrid = document.getElementById('chartShowGrid').checked;
    const showValue = document.getElementById('chartShowValue').checked;
    const themeEl = document.querySelector('.chart-theme.active');
    const theme = themeEl ? themeEl.dataset.theme : 'default';
    const html = renderChartSVG(selectedChartType, data, title, {showGrid, showValue, theme});
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-block'; wrapper.setAttribute('contenteditable','false'); wrapper.innerHTML = html;
    insertAtCursor(wrapper); closeChartDialog();
  }catch(err){ console.error(err); showToast('图表生成失败：'+(err.message||err)); }
});

const DEFAULT_CHART_COLORS = ['#f5c542','#7bb8e8','#8fc9a8','#e0a96d','#c48fb8','#8fbcd4','#a0d4a8','#d4b88f','#e88f8f','#9b8fe8'];

function renderChartSVG(type, data, title, options = {}){
  const { showGrid = true, showValue = true, theme = 'default' } = options;
  let colors = DEFAULT_CHART_COLORS;
  if (theme === 'cool') colors = ['#8b5cf6','#3b82f6','#06b6d4','#0ea5e9','#6366f1','#2dd4bf','#a78bfa','#38bdf8','#818cf8','#67e8f9'];
  if (theme === 'warm') colors = ['#ef4444','#f97316','#eab308','#f59e0b','#ec4899','#f43f5e','#fb923c','#facc15','#f87171','#fbbf24'];

  const W = 360, H = 240;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svgEl = document.createElementNS(svgNS, 'svg');
  svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svgEl.setAttribute('xmlns', svgNS);
  
  // 关键：由于外层 chart-block 强制 color: var(--text-2)，这里 currentColor 生效
  const svg = d3.select(svgEl);

  const topPad = title ? 28 : 12, bottomPad = 36, leftPad = 40, rightPad = 16;

  if(title){
    svg.append('text').attr('x', W/2).attr('y', 18).attr('text-anchor', 'middle')
      .attr('font-size', 13).attr('font-weight', 600).attr('fill', 'currentColor').attr('fill-opacity', 0.85).attr('font-family', 'sans-serif').text(title);
  }

  function fmtTick(v){
    if(Math.abs(v) >= 1000000) return (v/1000000).toFixed(1)+'M';
    if(Math.abs(v) >= 1000) return (v/1000).toFixed(1)+'k';
    if(Number.isInteger(v)) return v;
    return v.toFixed(1);
  }

  function drawCartesianAxes(xScale, yScale, isBand){
    if (showGrid) {
      yScale.ticks(4).forEach(t=>{
        svg.append('line').attr('x1', leftPad).attr('x2', W - rightPad).attr('y1', yScale(t)).attr('y2', yScale(t))
          .attr('stroke', 'currentColor').attr('stroke-opacity', 0.12).attr('stroke-width', 1);
      });
    }
    svg.append('line').attr('x1', leftPad).attr('x2', W - rightPad).attr('y1', H - bottomPad).attr('y2', H - bottomPad)
      .attr('stroke', 'currentColor').attr('stroke-opacity', 0.28).attr('stroke-width', 1.2);
    yScale.ticks(4).forEach(t=>{
      svg.append('text').attr('x', leftPad - 6).attr('y', yScale(t) + 3).attr('text-anchor', 'end')
        .attr('font-size', 9).attr('fill', 'currentColor').attr('fill-opacity', 0.55).attr('font-family', 'sans-serif').text(fmtTick(t));
    });
    data.forEach(d=>{
      const cx = isBand ? xScale(d.label) + xScale.bandwidth()/2 : xScale(d.label);
      svg.append('text').attr('x', cx).attr('y', H - bottomPad + 14).attr('text-anchor', 'middle')
        .attr('font-size', 9).attr('fill', 'currentColor').attr('fill-opacity', 0.6).attr('font-family', 'sans-serif').text(d.label);
    });
  }

  const maxV = d3.max(data, d => d.value) || 1;

  if(type === 'bar'){
    const x = d3.scaleBand().domain(data.map(d=>d.label)).range([leftPad, W-rightPad]).padding(0.35);
    const y = d3.scaleLinear().domain([0, maxV]).nice().range([H-bottomPad, topPad]);
    drawCartesianAxes(x, y, true);
    data.forEach((d,i)=>{
      const bw = x.bandwidth(); const yy = y(d.value);
      svg.append('rect').attr('x', x(d.label)).attr('y', yy).attr('width', bw).attr('height', Math.max(0, (H-bottomPad) - yy))
        .attr('rx', 3).attr('fill', colors[i % colors.length]);
      if (showValue) {
        svg.append('text').attr('x', x(d.label)+bw/2).attr('y', yy - 4).attr('text-anchor','middle')
          .attr('font-size',9).attr('fill','currentColor').attr('fill-opacity',0.75).attr('font-family','sans-serif').text(fmtTick(d.value));
      }
    });
  }
  else if(type === 'hbar'){
    const y = d3.scaleBand().domain(data.map(d=>d.label)).range([topPad, H-bottomPad]).padding(0.3);
    const x = d3.scaleLinear().domain([0, maxV]).nice().range([leftPad, W-rightPad]);
    if (showGrid) {
      x.ticks(4).forEach(t=>{
        svg.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', topPad).attr('y2', H - bottomPad)
          .attr('stroke','currentColor').attr('stroke-opacity',0.12).attr('stroke-width',1);
      });
    }
    svg.append('line').attr('x1', leftPad).attr('x2', leftPad).attr('y1', topPad).attr('y2', H - bottomPad)
      .attr('stroke','currentColor').attr('stroke-opacity',0.28).attr('stroke-width',1.2);
    x.ticks(4).forEach(t=>{
      svg.append('text').attr('x', x(t)).attr('y', H - bottomPad + 14).attr('text-anchor','middle')
        .attr('font-size',9).attr('fill','currentColor').attr('fill-opacity',0.55).attr('font-family','sans-serif').text(fmtTick(t));
    });
    data.forEach((d,i)=>{
      const bh = y.bandwidth(); const xx = x(d.value);
      svg.append('rect').attr('x', leftPad).attr('y', y(d.label)).attr('width', Math.max(0, xx - leftPad)).attr('height', bh)
        .attr('rx', 3).attr('fill', colors[i % colors.length]);
      svg.append('text').attr('x', leftPad - 6).attr('y', y(d.label) + bh/2 + 3).attr('text-anchor','end')
        .attr('font-size',9).attr('fill','currentColor').attr('fill-opacity',0.6).attr('font-family','sans-serif').text(d.label);
      if (showValue) {
        svg.append('text').attr('x', xx + 4).attr('y', y(d.label) + bh/2 + 3).attr('font-size',9)
          .attr('fill','currentColor').attr('fill-opacity',0.75).attr('font-family','sans-serif').text(fmtTick(d.value));
      }
    });
  }
  else if(type === 'line' || type === 'area' || type === 'step'){
    const x = d3.scalePoint().domain(data.map(d=>d.label)).range([leftPad + 10, W - rightPad - 10]);
    const y = d3.scaleLinear().domain([0, maxV]).nice().range([H-bottomPad, topPad]);
    drawCartesianAxes(x, y, false);
    const curve = type === 'step' ? d3.curveStepAfter : d3.curveMonotoneX;
    if(type === 'area'){
      const areaGen = d3.area().x(d => x(d.label)).y0(H - bottomPad).y1(d => y(d.value)).curve(curve);
      svg.append('path').attr('d', areaGen(data)).attr('fill', colors[0]).attr('fill-opacity', 0.32);
    }
    const lineGen = d3.line().x(d => x(d.label)).y(d => y(d.value)).curve(curve);
    svg.append('path').attr('d', lineGen(data)).attr('stroke', type === 'step' ? '#8fc9a8' : '#7bb8e8')
      .attr('stroke-width', 2.5).attr('fill', 'none').attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');

    data.forEach((d,i)=>{
      const cx = x(d.label), cy = y(d.value);
      svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 3.5).attr('fill', 'var(--surface)') // 适配深色
        .attr('stroke', colors[i % colors.length]).attr('stroke-width', 2);
      if (showValue) {
        svg.append('text').attr('x', cx).attr('y', cy - 8).attr('text-anchor','middle').attr('font-size',9)
          .attr('fill','currentColor').attr('fill-opacity',0.75).attr('font-family','sans-serif').text(fmtTick(d.value));
      }
    });
  }
  else if(type === 'scatter'){
    const x = d3.scalePoint().domain(data.map(d=>d.label)).range([leftPad + 10, W - rightPad - 10]);
    const y = d3.scaleLinear().domain([0, maxV]).nice().range([H-bottomPad, topPad]);
    drawCartesianAxes(x, y, false);
    data.forEach((d,i)=>{
      svg.append('circle').attr('cx', x(d.label)).attr('cy', y(d.value))
        .attr('r', Math.max(4, Math.min(9, 4 + (d.value / maxV) * 6))).attr('fill', colors[i % colors.length]).attr('fill-opacity', 0.75);
    });
  }
  else if(type === 'pie' || type === 'donut'){
    const cx = W * 0.62, cy = (H + topPad) / 2 + 4;
    const R = Math.min(W * 0.62 - leftPad, H - topPad - 10) * 0.46;
    const innerR = type === 'donut' ? R * 0.55 : 0;
    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(innerR).outerRadius(R);
    const g = svg.append('g').attr('transform', 'translate(' + cx + ',' + cy + ')');
    pie(data).forEach((a, i) => {
      g.append('path').attr('d', arc(a)).attr('fill', colors[i % colors.length]).attr('stroke', 'var(--surface)').attr('stroke-width', 1.5);
    });
    if(type === 'donut'){
      const total = d3.sum(data, d => d.value);
      g.append('text').attr('text-anchor','middle').attr('dy','0.2em').attr('font-size', 14).attr('font-weight', 600)
        .attr('fill','currentColor').attr('fill-opacity',0.85).attr('font-family','sans-serif').text(fmtTick(total));
    }
    const gLegend = svg.append('g').attr('transform', 'translate(12,' + (topPad + 8) + ')');
    data.forEach((d, i) => {
      const row = gLegend.append('g').attr('transform', 'translate(0,' + (i * 15) + ')');
      row.append('rect').attr('width', 9).attr('height', 9).attr('rx', 2).attr('fill', colors[i % colors.length]);
      row.append('text').attr('x', 14).attr('y', 8).attr('font-size', 10).attr('fill', 'currentColor').attr('fill-opacity', 0.75).attr('font-family', 'sans-serif').text(d.label + ' ' + fmtTick(d.value));
    });
  }
  else if(type === 'rose'){
    const cx = W/2, cy = (H + topPad)/2, R = Math.min(W, H - topPad) * 0.42;
    const rScale = d3.scaleLinear().domain([0, maxV]).range([R * 0.3, R]);
    const pie = d3.pie().value(d => d.value).sort(null).padAngle(0.008);
    const arc = d3.arc().innerRadius(0).outerRadius(d => rScale(d.data.value));
    const g = svg.append('g').attr('transform', 'translate(' + cx + ',' + cy + ')');
    pie(data).forEach((a, i) => {
      g.append('path').attr('d', arc(a)).attr('fill', colors[i % colors.length]).attr('fill-opacity', 0.88);
    });
  }
  else if(type === 'radar'){
    const cx = W/2, cy = (H + topPad)/2 - 2, R = Math.min(W, H - topPad) * 0.34, n = data.length;
    const angleOf = i => (Math.PI * 2 * i / n) - Math.PI / 2;
    for(let lv = 1; lv <= 4; lv++){
      const r = R * lv / 4;
      const pts = data.map((d,i)=>{ const ang = angleOf(i); return [cx + r*Math.cos(ang), cy + r*Math.sin(ang)]; }).map(p=>p.join(',')).join(' ');
      svg.append('polygon').attr('points', pts).attr('fill', 'none').attr('stroke', 'currentColor').attr('stroke-opacity', 0.12);
    }
    data.forEach((d,i)=>{
      const ang = angleOf(i);
      svg.append('line').attr('x1', cx).attr('y1', cy).attr('x2', cx + R*Math.cos(ang)).attr('y2', cy + R*Math.sin(ang)).attr('stroke', 'currentColor').attr('stroke-opacity', 0.12);
    });
    const pts = data.map((d,i)=>{ const ang = angleOf(i); const r = R * (d.value / maxV); return [cx + r*Math.cos(ang), cy + r*Math.sin(ang)]; });
    svg.append('polygon').attr('points', pts.map(p=>p.join(',')).join(' ')).attr('fill', colors[0]).attr('fill-opacity', 0.35).attr('stroke', colors[0]).attr('stroke-width', 2);
    pts.forEach((p,i)=>{ svg.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 3).attr('fill', colors[i % colors.length]); });
    data.forEach((d,i)=>{
      const ang = angleOf(i); const lx = cx + (R + 16) * Math.cos(ang); const ly = cy + (R + 16) * Math.sin(ang);
      svg.append('text').attr('x', lx).attr('y', ly + 3).attr('text-anchor', Math.abs(Math.cos(ang)) < 0.3 ? 'middle' : (Math.cos(ang) > 0 ? 'start' : 'end'))
        .attr('font-size', 9).attr('fill','currentColor').attr('fill-opacity',0.65).attr('font-family','sans-serif').text(d.label);
    });
  }
  return svgEl.outerHTML;
}

/* 公式 */
const formulaDialogMask = document.getElementById('formulaDialogMask');
const formulaDialog = document.getElementById('formulaDialog');
const formulaTypeGrid = document.getElementById('formulaTypeGrid');
const formulaInput = document.getElementById('formulaInput');
let selectedFormulaType = 'inline';

formulaTypeGrid.addEventListener('click', e=>{
  const item = e.target.closest('.picker-item'); if(!item) return;
  formulaTypeGrid.querySelectorAll('.picker-item').forEach(x=>x.classList.remove('active'));
  item.classList.add('active'); selectedFormulaType = item.dataset.formula;
  const tplMap = { inline: 'E = mc^2', display: '\\int_{0}^{\\infty} e^{-x^2} \\, dx = \\frac{\\sqrt{\\pi}}{2}', frac: '\\frac{a+b}{c+d}', sqrt: '\\sqrt{x^2 + y^2}', sum: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}', int: '\\int_{a}^{b} f(x)\\,dx' };
  formulaInput.value = tplMap[selectedFormulaType] || '';
});
function openFormulaDialog(){
  formulaInput.value = 'E = mc^2'; formulaTypeGrid.querySelectorAll('.picker-item').forEach((x,i)=>x.classList.toggle('active', i===0));
  selectedFormulaType = 'inline'; formulaDialogMask.classList.add('open'); formulaDialog.classList.add('open');
  setTimeout(()=>formulaInput.focus(), 250);
}
function closeFormulaDialog(){ formulaDialogMask.classList.remove('open'); formulaDialog.classList.remove('open'); }
document.getElementById('formulaCancel').addEventListener('click', closeFormulaDialog);
formulaDialogMask.addEventListener('click', closeFormulaDialog);
document.getElementById('formulaSave').addEventListener('click', ()=>{
  const val = formulaInput.value.trim();
  if(!val){ showToast('请填写公式内容'); return; }
  if(typeof katex === 'undefined' || !katex.renderToString){ showToast('公式组件加载中，请稍后重试'); return; }
  const display = selectedFormulaType === 'display' ? '1' : '0';
  const wrapper = document.createElement('span'); wrapper.className = 'latex-src';
  wrapper.setAttribute('contenteditable','false'); wrapper.setAttribute('data-src', val); wrapper.setAttribute('data-display', display);
  try{
    wrapper.innerHTML = katex.renderToString(val, { throwOnError: false, displayMode: display === '1', strict: false, trust: true });
    wrapper.classList.add('latex-rendered');
  }catch(e){ wrapper.textContent = val; }
  if(display === '1'){
    const block = document.createElement('div'); block.style.textAlign = 'center'; block.style.margin = '.6em 0';
    block.appendChild(wrapper); insertAtCursor(block);
  } else { insertAtCursor(wrapper); }
  closeFormulaDialog();
});

/* 附件 */
const attachPanel=document.getElementById('attachPanel');
const attachMask=document.getElementById('attachMask');
let attachSavedRange = null;

function openAttachPanel(){
  const sel = window.getSelection();
  if(sel.rangeCount && richEditor.contains(sel.anchorNode)){ attachSavedRange = sel.getRangeAt(0).cloneRange(); }
  else { attachSavedRange = null; }
  attachMask.classList.add('open'); attachPanel.classList.add('open');
}
function closeAttachPanel(){ attachMask.classList.remove('open'); attachPanel.classList.remove('open'); }
attachMask.addEventListener('click',closeAttachPanel);
attachPanel.addEventListener('click', e=>{
  const item=e.target.closest('.attach-item'); if(!item) return;
  closeAttachPanel(); pickAttachment(item.dataset.attach);
});
function pickAttachment(type){
  const input=document.createElement('input'); input.type='file'; input.style.display='none';
  if(type==='image')input.accept='image/*'; else if(type==='audio')input.accept='audio/*'; else if(type==='video')input.accept='video/*'; else input.accept='*/*';
  document.body.appendChild(input);
  input.addEventListener('change',()=>{
    const file=input.files[0]; 
    if(!file) { if (input.parentNode) document.body.removeChild(input); return; }
    const id=newId('a'); currentAttachments[id] = { type, name: file.name, blob: file, size: file.size };
    const wrapper = document.createElement('div');
    if(type==='image'){
      const img=document.createElement('img'); img.dataset.attachId=id; img.alt=file.name; wrapper.appendChild(img);
    } else if(type==='audio'){
      wrapper.className='md-attachment'; const a=document.createElement('audio'); a.controls=true; a.dataset.attachId=id; wrapper.appendChild(a);
    } else if(type==='video'){
      wrapper.className='md-attachment'; const v=document.createElement('video'); v.controls=true; v.dataset.attachId=id; wrapper.appendChild(v);
    } else {
      wrapper.className='md-attachment'; const fd=document.createElement('div'); fd.className='file-name';
      fd.innerHTML = SVG_ICON.doc + '<a data-attach-id="'+id+'" download="'+escapeHtml(file.name)+'">'+escapeHtml(file.name)+'</a>'; wrapper.appendChild(fd);
    }
    if (attachSavedRange) {
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(attachSavedRange);
    }
    richEditor.focus(); insertAtCursor(wrapper); hydrateAttachments(wrapper, currentAttachments); showToast('已插入');
    if (input.parentNode) document.body.removeChild(input);
  });
  input.click();
}