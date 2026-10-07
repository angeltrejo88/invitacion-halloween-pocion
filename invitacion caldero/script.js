// ==========================================
// RITUAL DE LA POCION - LÓGICA DE JUEGO Y AUDIO
// ==========================================

// Configuración de la Receta
const recipe = {
  pumpkin: { current: 0, required: 2, icon: '🎃', img: 'calabaza.png' },
  bat:     { current: 0, required: 3, icon: '🦇', img: 'murcielago.png' },
  potion:  { current: 0, required: 2, icon: '🧪', img: 'pocion.png' },
  rabbit:  { current: 0, required: 4, icon: '🐇', img: 'pata_conejo.png' },
  web:     { current: 0, required: 2, icon: '🕸️', img: 'telarana.png' }
};

const TOTAL_REQUIRED = 2 + 3 + 2 + 4 + 2; // 13 en total
let currentTotal = 0;
let isAudioMuted = false;
let audioCtx = null;
let bgMusic = null;

// Rutas de archivos de audio reales (3 risas de bruja en un arreglo)
const AUDIO_FILES = {
  bgMusic: "music.mp3",
  laughs: ["bruja1.mp3", "bruja2.mp3", "bruja3.mp3"],
  explosion: "explosion_caldero.mp3"
};

// ==========================================
// SISTEMA DE AUDIO (WEB AUDIO API Y AUDIO REAL)
// ==========================================

function initAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Reproducción de música de fondo
function playBackgroundMusic() {
  if (isAudioMuted) return;
  if (!bgMusic) {
    bgMusic = new Audio(AUDIO_FILES.bgMusic);
    bgMusic.loop = true;
    bgMusic.volume = 0.4;
  }
  bgMusic.play().catch(() => {
    // Si falla la carga del archivo MP3 local, se tolera en silencio
  });
}

function pauseBackgroundMusic() {
  if (bgMusic && !bgMusic.paused) {
    bgMusic.pause();
  }
}

// Sonido de Risa de Bruja (Selección Aleatoria entre 3 risas)
function playWitchLaughSound() {
  if (isAudioMuted) return;
  
  // 1. Elegir un archivo de risa al azar del arreglo
  const randomLaughFile = AUDIO_FILES.laughs[Math.floor(Math.random() * AUDIO_FILES.laughs.length)];
  const laughAudio = new Audio(randomLaughFile);
  laughAudio.volume = 0.8;

  laughAudio.play().then(() => {}).catch(() => {
    // Generador de risa sintética de respaldo (varía el tono según la selección)
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const baseFreq = 380 + Math.random() * 180; // Frecuencia aleatoria para variedad
    
    for (let i = 0; i < 4; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq - (i * 40), now + (i * 0.15));
      osc.frequency.exponentialRampToValueAtTime(150, now + (i * 0.15) + 0.12);
      
      gain.gain.setValueAtTime(0.2, now + (i * 0.15));
      gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.15) + 0.12);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now + (i * 0.15));
      osc.stop(now + (i * 0.15) + 0.12);
    }
  });
}

// Sonido de Explosión
function playExplosionSound() {
  if (isAudioMuted) return;

  const explosionAudio = new Audio(AUDIO_FILES.explosion);
  explosionAudio.volume = 1.0;
  explosionAudio.play().then(() => {}).catch(() => {
    // Ruido blanco de explosión sintética
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const bufferSize = audioCtx.sampleRate * 0.5;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(50, now + 0.5);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    noise.start(now);
    noise.stop(now + 0.5);
  });
}

// ==========================================
// PAUSA AUTOMÁTICA EN SEGUNDO PLANO
// ==========================================

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseBackgroundMusic();
  } else {
    if (!isAudioMuted) {
      playBackgroundMusic();
    }
  }
});

window.addEventListener('pagehide', () => {
  pauseBackgroundMusic();
});

// ==========================================
// LÓGICA DE JUEGO (DRAG AND DROP)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  const cauldron = document.getElementById('cauldron');
  const btnRetry = document.getElementById('btn-retry');
  const btnAudioToggle = document.getElementById('btn-audio-toggle');
  const audioIcon = document.getElementById('audio-icon');

  // Control Mute
  btnAudioToggle.addEventListener('click', () => {
    isAudioMuted = !isAudioMuted;
    audioIcon.textContent = isAudioMuted ? "🔇" : "🔊";
    if (isAudioMuted) {
      pauseBackgroundMusic();
    } else {
      initAudioContext();
      playBackgroundMusic();
    }
  });

  // Reintento
  btnRetry.addEventListener('click', resetGame);

  // Drag and Drop Escritorio
  document.querySelectorAll('.ingredient-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      initAudioContext();
      playBackgroundMusic();
      const key = card.id.replace('card-', '');
      e.dataTransfer.setData("text/plain", key);
    });
  });

  cauldron.addEventListener('dragover', (e) => e.preventDefault());
  cauldron.addEventListener('drop', (e) => {
    e.preventDefault();
    const key = e.dataTransfer.getData("text/plain");
    processItem(key);
  });

  // Touch Events Móviles
  let activeKey = null;
  let dragClone = null;

  document.querySelectorAll('.ingredient-card').forEach(card => {
    card.addEventListener('touchstart', function(e) {
      initAudioContext();
      playBackgroundMusic();
      
      activeKey = this.id.replace('card-', '');
      const touch = e.touches[0];
      const itemData = recipe[activeKey];

      dragClone = document.createElement('div');
      dragClone.className = 'drag-clone';
      
      const img = document.createElement('img');
      img.src = itemData.img;
      img.onerror = () => {
        dragClone.textContent = itemData.icon;
      };
      dragClone.appendChild(img);

      dragClone.style.left = touch.clientX + 'px';
      dragClone.style.top = touch.clientY + 'px';
      document.body.appendChild(dragClone);
    }, { passive: true });

    card.addEventListener('touchmove', function(e) {
      if (!dragClone) return;
      const touch = e.touches[0];
      dragClone.style.left = touch.clientX + 'px';
      dragClone.style.top = touch.clientY + 'px';
    }, { passive: true });

    card.addEventListener('touchend', function(e) {
      if (!dragClone) return;

      const rect = cauldron.getBoundingClientRect();
      const touch = e.changedTouches[0];

      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        processItem(activeKey);
      }

      dragClone.remove();
      dragClone = null;
      activeKey = null;
    });
  });
});

// Procesar Ingrediente
function processItem(key) {
  if (!recipe[key]) return;

  // SI SE EXCEDE O AGREGA MAL = EXPLOSIÓN
  if (recipe[key].current >= recipe[key].required) {
    explodeCauldron();
    return;
  }

  // Agregar ingrediente correcto
  recipe[key].current++;
  currentTotal++;

  // Risa de Bruja Aleatoria
  playWitchLaughSound();

  // Actualizar UI
  const valElem = document.getElementById(`val-${key}`);
  const reqElem = document.getElementById(`req-${key}`);
  valElem.textContent = `${recipe[key].current} / ${recipe[key].required}`;

  if (recipe[key].current === recipe[key].required) {
    reqElem.classList.add('ready');
  }

  // Animación Caldero
  const cauldron = document.getElementById('cauldron');
  cauldron.style.transform = 'scale(1.08)';
  setTimeout(() => cauldron.style.transform = 'scale(1)', 150);

  // Cambiar color del líquido paulatinamente
  const liquid = document.getElementById('liquid');
  liquid.style.filter = `hue-rotate(${currentTotal * 25}deg)`;

  // Vibración hápida ligera
  if ("vibrate" in navigator) {
    navigator.vibrate(60);
  }

  // ¿Completó la poción?
  if (currentTotal === TOTAL_REQUIRED) {
    winGame();
  }
}

// Explosión del Caldero
function explodeCauldron() {
  playExplosionSound();
  
  const splatter = document.getElementById('splatter');
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 200, 100, 400]);
  }

  splatter.style.display = 'flex';
}

// Resetear Juego
function resetGame() {
  currentTotal = 0;
  for (let key in recipe) {
    recipe[key].current = 0;
    document.getElementById(`val-${key}`).textContent = `0 / ${recipe[key].required}`;
    document.getElementById(`req-${key}`).classList.remove('ready');
  }

  document.getElementById('liquid').style.filter = 'hue-rotate(0deg)';
  document.getElementById('splatter').style.display = 'none';
}

// Victoria: Revelar Invitación
function winGame() {
  const grimorio = document.getElementById('grimorio');
  const gameArea = document.getElementById('game-area');
  const shelf = document.getElementById('shelf');
  const instruction = document.getElementById('instruction-text');

  instruction.textContent = "✨ ¡Poción perfecta! El hechizo se ha liberado ✨";

  if ("vibrate" in navigator) {
    navigator.vibrate([100, 50, 100, 50, 300]);
  }

  setTimeout(() => {
    gameArea.style.display = 'none';
    shelf.style.display = 'none';
    grimorio.classList.add('visible');
  }, 400);
}