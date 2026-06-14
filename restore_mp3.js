const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
if (!ffmpegPath) {
  throw new Error('ffmpeg-static not found');
}
console.log('Using ffmpeg:', ffmpegPath);
const restored = [];
for (let i = 1; i <= 10; i += 1) {
  const pcm = path.join(__dirname, `BOOGEYMAN.KX4.DARK.AUDIO.${i}.pcm`);
  const mp3 = path.join(__dirname, `BOOGEYMAN.KX4.DARK.AUDIO.${i}.mp3`);
  if (!fs.existsSync(pcm)) {
    console.log(`SKIP missing PCM ${pcm}`);
    continue;
  }
  if (fs.existsSync(mp3)) {
    console.log(`SKIP existing MP3 ${mp3}`);
    continue;
  }
  console.log(`RESTORE ${mp3} from ${pcm}`);
  const res = spawnSync(ffmpegPath, ['-y', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', pcm, mp3], { stdio: 'pipe' });
  if (res.status !== 0) {
    console.error(`FAILED ${mp3}:`, res.stderr.toString());
  } else {
    restored.push(mp3);
  }
}
console.log('restored count:', restored.length);
