/* 语音 */

const voiceEditor=document.getElementById('voiceEditor');
const voiceBtn=document.getElementById('voiceBtn');
const voiceTime=document.getElementById('voiceTime');
const voiceStatus=document.getElementById('voiceStatus');
const voicePlay=document.getElementById('voicePlay');
const voicePlayBtn=document.getElementById('voicePlayBtn');
const voicePlayBar=document.getElementById('voicePlayBar');
const voiceProgress=document.getElementById('voiceProgress');
const voicePlayTime=document.getElementById('voicePlayTime');
const voiceDone=document.getElementById('voiceDone');
let mediaRecorder=null, audioChunks=[], voiceStartTime=0, voiceTimerInterval=null;
let recordedBlob=null, recordedUrl=null, recordingMime='', voiceAudioEl=null, voicePlaying=false;

function resetVoiceUI(){
  voiceTime.textContent='00:00'; voiceStatus.textContent='点击下方按钮开始录音';
  voiceBtn.className='voice-btn record';
  voiceBtn.innerHTML='<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+
    '<rect x="7" y="3" width="10" height="14" rx="5"/>'+
    '<path d="M5 11a7 7 0 0 0 14 0"/>'+
    '<line x1="12" y1="18" x2="12" y2="21"/></svg>';
  voicePlay.style.display='none'; voiceDone.disabled=true;
  recordedBlob=null; recordedUrl=null; audioChunks=[];
  if(voiceAudioEl){voiceAudioEl.pause();voiceAudioEl=null;} voicePlaying=false;
}
function openVoiceEditor(){
  if(isExpanded){isExpanded=false;bottomBarEl.classList.remove('expanded');}
  editorFolderId = UNCAT_ID;
  updateEditorFolderPill('voice', editorFolderId);
  resetVoiceUI(); openScreen(voiceEditor);
}
function startVoiceRecord(){
  if(!navigator.mediaDevices||!window.MediaRecorder){alert('当前浏览器不支持录音功能');return;}
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    audioChunks=[];
    const types=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'];
    recordingMime='';
    for(const t of types){ if(MediaRecorder.isTypeSupported(t)){recordingMime=t;break;} }
    mediaRecorder=recordingMime?new MediaRecorder(stream,{mimeType:recordingMime}):new MediaRecorder(stream);
    mediaRecorder.ondataavailable=e=>{ if(e.data&&e.data.size>0) audioChunks.push(e.data); };
    mediaRecorder.onstop=()=>{
      stream.getTracks().forEach(t=>t.stop());
      recordedBlob=new Blob(audioChunks,{type:recordingMime||'audio/webm'});
      recordedUrl=URL.createObjectURL(recordedBlob);
      voiceStatus.textContent='录音完成，可试听或保存';
      voicePlay.style.display='flex'; voiceDone.disabled=false;
      const tmp=new Audio(recordedUrl);
      tmp.addEventListener('loadedmetadata',()=>{
        voicePlayTime.textContent='00:00 / '+formatDuration(tmp.duration);
      });
    };
    mediaRecorder.start();
    voiceStartTime=Date.now(); voiceTime.textContent='00:00';
    voiceStatus.textContent='正在录音…';
    voiceBtn.className='voice-btn stop';
    voiceBtn.innerHTML='<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
    voiceEditor.classList.add('voice-recording');
    voiceTimerInterval=setInterval(()=>{
      voiceTime.textContent=formatDuration((Date.now()-voiceStartTime)/1000);},200);
  }).catch(err=>alert('无法访问麦克风：'+err.message));
}
function stopVoiceRecord(){
  if(mediaRecorder&&mediaRecorder.state!=='inactive')mediaRecorder.stop();
  clearInterval(voiceTimerInterval); voiceEditor.classList.remove('voice-recording');
}
voiceBtn.addEventListener('click',()=>{
  if(mediaRecorder&&mediaRecorder.state==='recording')stopVoiceRecord();else startVoiceRecord();
});
voicePlayBtn.addEventListener('click',()=>{
  if(!recordedUrl)return;
  if(!voiceAudioEl){
    voiceAudioEl=new Audio(recordedUrl);
    voiceAudioEl.addEventListener('timeupdate',()=>{
      const c=voiceAudioEl.currentTime,d=voiceAudioEl.duration||0;
      voiceProgress.style.width=(d?(c/d*100):0)+'%';
      voicePlayTime.textContent=formatDuration(c)+' / '+formatDuration(d);});
    voiceAudioEl.addEventListener('ended',()=>{
      voicePlaying=false;voiceProgress.style.width='0%';
      voicePlayBtn.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';});
  }
  if(voicePlaying){voiceAudioEl.pause();voicePlaying=false;
    voicePlayBtn.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';}
  else{voiceAudioEl.play();voicePlaying=true;
    voicePlayBtn.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';}
});
voicePlayBar.addEventListener('click',e=>{
  if(!voiceAudioEl||!voiceAudioEl.duration)return;
  const r=voicePlayBar.getBoundingClientRect();
  voiceAudioEl.currentTime=((e.clientX-r.left)/r.width)*voiceAudioEl.duration;
});
function saveVoiceEditor(){
  if(!recordedBlob)return;
  const duration=voiceAudioEl?voiceAudioEl.duration:(Date.now()-voiceStartTime)/1000;
  const reader=new FileReader();
  reader.onload=async()=>{
    await addNote({id:newId('v'),type:'voice',title:'语音笔记',content:'',
      audio:reader.result,mime:recordingMime||'audio/webm',duration:duration||0,
      folderId: editorFolderId,
      createdAt:Date.now(),updatedAt:Date.now()});
    closeScreen(voiceEditor);
    if(voiceAudioEl){voiceAudioEl.pause();voiceAudioEl=null;} voicePlaying=false;
  };
  reader.readAsDataURL(recordedBlob);
}
voiceDone.addEventListener('click',saveVoiceEditor);
document.querySelector('[data-close="voice"]').addEventListener('click',()=>{
  if(mediaRecorder&&mediaRecorder.state==='recording')stopVoiceRecord();
  if(voiceAudioEl){voiceAudioEl.pause();voiceAudioEl=null;} voicePlaying=false;
  closeScreen(voiceEditor);
});


