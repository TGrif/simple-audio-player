/**
 *  simple-audio-player
 *
 *  @author TGrif 2019 - License MIT
 *  https://github.com/TGrif/simple-audio-player
 */


class SimpleAudioPlayer {
  
  constructor (audioCtx, destination, params) {
    
    this.audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    
    this.params = params || { pan: false, loop: false };  // TODO
    
    this.source = this.audioCtx.createBufferSource();
    this.destination = destination || this.audioCtx.destination;
    
    this.channels = 2;
    this.sampleRate = this.audioCtx.sampleRate;
    this.playbackRate = this.source.playbackRate.value;
    
    this.audioBuffer = undefined;
    
    this.gain = this.audioCtx.createGain();
    this.gain.gain.value = 1;
    this.volume = 100;
    
    this.panner = audioCtx.createStereoPanner();
    
    this.timer = undefined;
    this.trackDuration = 0;
    this.startedAt = 0;
    this.pausedAt = 0;
    
    this.muted = false;
    this.mutedVolume = this.volume;
    
    this.paused = true;
    
    this.loop = false;
    
    
    this.buildInterface();
    
  }
  
  
  buildInterface() {
    
    let simpleAudioPlayer = document.getElementsByClassName('simple-audio-player')[0];
    
    if (!simpleAudioPlayer)
      return console.error('simple-audio-player DOM element not found.');
    
    
    let sapScreen = document.createElement('div');
    sapScreen.id = 'sap-screen';
    simpleAudioPlayer.appendChild(sapScreen);
    
    let fileInput = document.createElement("input");
    fileInput.id = 'sap-file';
    fileInput.name = 'sap-file';
    fileInput.setAttribute('type', 'file')
    fileInput.addEventListener('change', this.playlist.bind(this));
    sapScreen.appendChild(fileInput);
    this.fileInput = fileInput;
    
    
    let sapControls = document.createElement('div');
    sapControls.setAttribute('class', 'controls');
    simpleAudioPlayer.appendChild(sapControls);
    
    let sapPlay = document.createElement('button');
    sapPlay.id = 'play';
    sapPlay.setAttribute('class', 'button fa fa-play');
    sapPlay.addEventListener("click", this.play.bind(this));
    sapControls.appendChild(sapPlay);
    this.sapPlay = sapPlay;
    
    let sapTrack = document.createElement('input');
    sapTrack.id = 'track';
    sapTrack.setAttribute('type', 'range');
    sapTrack.setAttribute('min', 0);
    sapTrack.setAttribute('max', 100);
    sapTrack.setAttribute('step', 1);
    sapTrack.setAttribute('value', 0);
    sapTrack.addEventListener('input', this.trackChange.bind(this));
    sapControls.appendChild(sapTrack);
    this.sapTrack = sapTrack;
    
    let sapTimeNow = document.createElement('span');
    sapTimeNow.id = 'time_now';
    sapTimeNow.innerHTML = '0:00';
    sapControls.appendChild(sapTimeNow);
    this.sapTimeNow = sapTimeNow;
    
    let sapTimeTotal = document.createElement('span');
    sapTimeTotal.id = 'time_total';
    sapTimeTotal.innerHTML = ' / 0:00';
    sapControls.appendChild(sapTimeTotal);
    this.sapTimeTotal = sapTimeTotal;
    
    let sapMute = document.createElement('button');
    sapMute.id = 'mute';
    sapMute.setAttribute('class', 'button fa fa-volume-up');
    sapMute.addEventListener("click", this.mute.bind(this));
    sapControls.appendChild(sapMute);
    this.sapMute = sapMute;
    
    let sapVolume = document.createElement('input');
    sapVolume.id = 'volume';
    sapVolume.setAttribute('type', 'range');
    sapVolume.setAttribute('min', 0);
    sapVolume.setAttribute('max', 100);
    sapVolume.setAttribute('step', 1);
    sapVolume.setAttribute('value', this.volume);
    sapVolume.addEventListener('input', this.volumeChange.bind(this));
    sapControls.appendChild(sapVolume);
    this.sapVolume = sapVolume;
    
    if (this.params && this.params.loop) {
      if (this.params.pan) simpleAudioPlayer.style.width = '460px';
      else simpleAudioPlayer.style.width = '410px';
      let sapLoop = document.createElement('button');
      sapLoop.id = 'loop';
      sapLoop.setAttribute('class', 'button fa fa-repeat');
      sapLoop.addEventListener("click", this.loopChange.bind(this));
      sapControls.appendChild(sapLoop);
      this.sapLoop = sapLoop;
    }
    
    if (this.params && this.params.pan) {
      simpleAudioPlayer.style.width = '440px';
      let sapPan = document.createElement('input');
      sapPan.id = 'pan';
      sapPan.setAttribute('type', 'range');
      sapPan.setAttribute('min', -1);
      sapPan.setAttribute('max', 1);
      sapPan.setAttribute('step', 0.1);
      sapPan.setAttribute('value', 0);
      sapPan.addEventListener('input', this.panChange.bind(this));
      sapPan.addEventListener('dblclick', this.panReinit.bind(this));
      sapControls.appendChild(sapPan);
      this.sapPan = sapPan;
    }
    
  }
  
  switchPlayBtn() {
    if (this.paused) {
      this.sapPlay.classList.remove("fa-play");
      this.sapPlay.classList.add("fa-pause");
    } else {
      this.sapPlay.classList.remove("fa-pause");
      this.sapPlay.classList.add("fa-play");
    }
  }
  
  switchMuteBtn() {
    if (this.volume == 0) {
      this.sapMute.classList.remove("fa-volume-up");
      this.sapMute.classList.remove("fa-volume-down");
      this.sapMute.classList.add('fa-volume-off');
    } else if (volume >= 1 && volume <= 40) {  // TODO
      this.sapMute.classList.remove("fa-volume-up");
      this.sapMute.classList.remove("fa-volume-off");
      this.sapMute.classList.add('fa-volume-down');
    } else {
      this.sapMute.classList.remove("fa-volume-down");
      this.sapMute.classList.remove("fa-volume-off");
      this.sapMute.classList.add('fa-volume-up');
    }
  }
  
  formatTime(time) {  // https://stackoverflow.com/a/6313008/5156280
    
    let sec_num = parseInt(time, 10);
    
    let hours = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    let seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (minutes < 10) minutes = minutes;
    if (seconds < 10) seconds = "0" + seconds;
    
    return minutes + ':' + seconds;
    
  }
  
  timerScreen() {

    let timeElapsed = this.audioCtx.currentTime - this.startedAt;
    let time = timeElapsed - this.pausedAt;
    this.sapTimeNow.innerHTML = this.formatTime(timeElapsed);
    
    let proportion = Math.round((time * 100) / this.trackDuration);
    this.sapTrack.value = this.trackDuration ? proportion : 0;
  
    if (this.formatTime(time) !== this.formatTime(this.trackDuration)) {
      this.timer = window.requestAnimationFrame(this.timerScreen.bind(this));
    } else {
      if (this.loop) this.playlist();
    }
    
  }
  
  loadFile(file) {
    
    let objUrl = (window.URL || window.webkitURL).createObjectURL(file);
    
    fetch(objUrl)
      .then(response => response.arrayBuffer())
      .then(buffer => {
        this.audioCtx.decodeAudioData(buffer, data => {
          this.audioBuffer = data;
          this.trackDuration = data.duration;
          this.play();
          this.sapTimeTotal.innerHTML = ' / ' + this.formatTime(this.trackDuration);
      }, err => console.error)
    }, err => console.error);
    
    console.info('simple-audio-player - Playing:', file.name);
  }
  
  playlist() {
    
    let file = this.fileInput.files[0];
    let title = file.name;

    this.paused = true;
    this.pausedAt = 0;
    this.startedAt = this.audioCtx.currentTime;
    
    this.source.disconnect();
    this.loadFile(file);
    
  }
  
  play() {
    
    if (!this.audioBuffer) return;
    
    if (this.paused) {
      
      this.source = this.audioCtx.createBufferSource();
      this.source.buffer = this.audioBuffer;

      this.startedAt = this.audioCtx.currentTime - this.pausedAt;
      this.source.start(0, this.pausedAt);
      this.pausedAt = 0;    // https://stackoverflow.com/a/31653217/5156280
      
      this.timerScreen()
      
    } else {
      
      this.source.stop();
      
      this.pausedAt = this.audioCtx.currentTime - this.startedAt;
      
      window.cancelAnimationFrame(this.timer)
      
    }
    
    this.switchPlayBtn();
    
    this.paused = !this.paused;
    
    this.plug(this.source, this.destination);
    
  }
  
  mute() {
    if (this.muted) {
      this.volume = this.mutedVolume;
    } else {
      this.mutedVolume = this.volume;
      this.volume = 0;
    }
    
    this.switchMuteBtn();
    
    this.sapVolume.value = this.volume;
    this.gain.gain.value = this.volume / 100;
    
    this.muted = !this.muted;
  }
  
  volumeChange() {
    this.volume = this.sapVolume.value;
    let volumeValue = this.volume / 100;
    this.gain.gain.setValueAtTime(volumeValue, this.audioCtx.currentTime);
    this.switchMuteBtn();
  }
  
  trackChange() {  // FIXME
    this.source.stop();
    window.cancelAnimationFrame(this.timer);
    this.paused = true;
    this.pausedAt = (this.trackDuration / 100) * this.sapTrack.value;
    // this.play()
  }
  
  panChange() {
    this.panner.pan.setValueAtTime(this.sapPan.value, this.audioCtx.currentTime);
  }
  
  panReinit() {
    this.sapPan.value = 0;
  }
  
  loopChange() {
    this.loop = !this.loop;
    let classActive = this.loop ? 'deepskyblue' : 'white';
    this.sapLoop.style.color = classActive;
  }
  
  plug(source, destination) {
    source.connect(this.gain);
    this.gain.connect(this.panner);
    this.panner.connect(destination);  // TODO
  }
  
  output() {
    return this.gain;
  }
  
}

