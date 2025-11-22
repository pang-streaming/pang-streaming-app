import { spawn, ChildProcess } from 'child_process';
import { getFFmpegPath } from './ffmpeg-helper';

interface StreamCallbacks {
  onReady: () => void;
  onError: (message: string) => void;
  onClose: (code: number | null) => void;
}

interface StreamInfo {
  process: ChildProcess;
  chunkCount: number;
  urls: string[];
}

export class StreamManager {
  private activeStreams: Map<string, StreamInfo> = new Map();

  startStream(socketId: string, rtmpUrls: string[], callbacks: StreamCallbacks): void {
    if (this.activeStreams.has(socketId)) {
      this.stopStream(socketId);
    }

    const ffmpegPath = getFFmpegPath();
    const ffmpegArgs = this.buildFFmpegArgs(rtmpUrls);

    const ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.setupFFmpegHandlers(socketId, ffmpeg, callbacks);

    this.activeStreams.set(socketId, {
      process: ffmpeg,
      chunkCount: 0,
      urls: rtmpUrls
    });

    callbacks.onReady();
  }

  private buildFFmpegArgs(rtmpUrls: string[]): string[] {
    const args = [
      '-fflags', '+genpts',
      '-i', 'pipe:0',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100'
    ];

    if (rtmpUrls.length === 1) {
      args.push('-f', 'flv', rtmpUrls[0]);
    } else {
      const teeOutputs = rtmpUrls.map(url => `[f=flv]${url}`).join('|');
      args.push('-f', 'tee', '-map', '0:v', '-map', '0:a', teeOutputs);
    }

    return args;
  }

  private setupFFmpegHandlers(
    socketId: string,
    ffmpeg: ChildProcess,
    callbacks: StreamCallbacks
  ): void {
    if (!ffmpeg.stdin || !ffmpeg.stderr) {
      callbacks.onError('FFmpeg stdio not available');
      return;
    }

    ffmpeg.stdin.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE') {
        console.error(`[${socketId}] stdin error:`, err);
      }
    });

    ffmpeg.stderr.on('data', (data: Buffer) => {
      const msg = data.toString();
      if (
        msg.includes('rtmp') ||
        msg.includes('RTMP') ||
        msg.includes('handshake') ||
        msg.includes('Output #') ||
        msg.includes('error') ||
        msg.includes('Error')
      ) {
        console.log(`[${socketId}] FFmpeg:`, msg.trim());
      }
    });

    ffmpeg.on('error', (err: Error) => {
      console.error(`[${socketId}] FFmpeg spawn error:`, err);
      callbacks.onError('FFmpeg 시작 실패');
    });

    ffmpeg.on('close', (code: number | null) => {
      console.log(`[${socketId}] FFmpeg exited with code ${code}`);
      this.activeStreams.delete(socketId);
      callbacks.onClose(code);
    });
  }

  writeChunk(socketId: string, data: Buffer | ArrayBuffer): void {
    const streamInfo = this.activeStreams.get(socketId);
    if (!streamInfo) return;

    const ffmpeg = streamInfo.process;
    if (!ffmpeg.stdin || !ffmpeg.stdin.writable) return;

    try {
      let buffer: Buffer;
      if (data instanceof Buffer) {
        buffer = data;
      } else {
        buffer = Buffer.from(new Uint8Array(data));
      }
      
      streamInfo.chunkCount++;

      ffmpeg.stdin.write(buffer, (err?: Error | null) => {
        if (err && (err as NodeJS.ErrnoException).code !== 'EPIPE') {
          console.error(`[${socketId}] Write error:`, err);
        }
      });

      const chunkCount = streamInfo.chunkCount;
      if (chunkCount <= 5 || chunkCount % 50 === 0) {
        console.log(`[${socketId}] Chunk ${chunkCount}: ${buffer.length} bytes`);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EPIPE') {
        console.error(`[${socketId}] Write error:`, err);
      }
    }
  }

  stopStream(socketId: string): void {
    const streamInfo = this.activeStreams.get(socketId);
    if (!streamInfo) return;

    const ffmpeg = streamInfo.process;

    try {
      if (ffmpeg.stdin && ffmpeg.stdin.writable) {
        ffmpeg.stdin.end();
      }
    } catch (err) {
      // Ignore errors on cleanup
    }

    ffmpeg.kill('SIGTERM');

    setTimeout(() => {
      if (!ffmpeg.killed) {
        ffmpeg.kill('SIGKILL');
      }
    }, 1000);

    this.activeStreams.delete(socketId);
  }

  stopAllStreams(): void {
    const socketIds = Array.from(this.activeStreams.keys());
    socketIds.forEach(socketId => this.stopStream(socketId));
  }
}
