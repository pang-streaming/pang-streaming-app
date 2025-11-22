import { app } from 'electron';
import ffmpegStatic from 'ffmpeg-static';

export function getFFmpegPath(): string {
  const ffmpegPath = ffmpegStatic as string;
  
  if (app.isPackaged) {
    return ffmpegPath.replace('app.asar', 'app.asar.unpacked');
  }
  
  return ffmpegPath;
}

export function testFFmpeg(): void {
  try {
    const ffmpegPath = getFFmpegPath();
    console.log('FFmpeg 경로:', ffmpegPath);
  } catch (error) {
    console.error('FFmpeg 로드 실패:', error);
  }
}
