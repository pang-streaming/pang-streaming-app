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

    console.log(`[${socketId}] FFmpeg command: ${ffmpegPath} ${ffmpegArgs.join(' ')}`);

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

  private parseRtmpUrl(url: string): { baseUrl: string; streamKey: string; hasApp: boolean } {
    console.log(`[RTMP] Parsing URL: ${url}`);
    
    // Check for rtmp://host:port/app/key (2 path segments)
    const withAppMatch = url.match(/^(rtmp:\/\/[^\/]+:\d+)\/([^\/]+)\/(.+)$/);
    if (withAppMatch) {
      console.log(`[RTMP] Format: host:port/app/key`);
      return { 
        baseUrl: `${withAppMatch[1]}/${withAppMatch[2]}`, 
        streamKey: withAppMatch[3],
        hasApp: true 
      };
    }
    
    // Check for rtmp://host:port/key (1 path segment)
    const withoutAppMatch = url.match(/^(rtmp:\/\/[^\/]+:\d+)\/(.+)$/);
    if (withoutAppMatch) {
      console.log(`[RTMP] Format: host:port/key -> using rtmp_playpath`);
      return { 
        baseUrl: withoutAppMatch[1], 
        streamKey: withoutAppMatch[2],
        hasApp: false 
      };
    }
    
    console.log(`[RTMP] Unknown format, using as-is`);
    return { baseUrl: url, streamKey: '', hasApp: false };
  }

  private buildFFmpegArgs(rtmpUrls: string[]): string[] {
    const args = [
      '-fflags', '+genpts',
      '-i', 'pipe:0',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-map', '0:v',
      '-map', '0:a'
    ];

    if (rtmpUrls.length === 1) {
      const { baseUrl, streamKey, hasApp } = this.parseRtmpUrl(rtmpUrls[0]);
      
      args.push('-f', 'flv');
      
      if (!hasApp && streamKey) {
        // Use rtmp_playpath to explicitly set stream key
        console.log(`[RTMP] Using playpath: ${streamKey} on ${baseUrl}`);
        args.push('-rtmp_playpath', streamKey);
        args.push(baseUrl);
      } else {
        console.log(`[RTMP] Using full URL: ${rtmpUrls[0]}`);
        args.push(rtmpUrls[0]);
      }
    } else {
      const teeOutputs = rtmpUrls.map(url => `[f=flv]${url}`).join('|');
      args.push('-f', 'tee', teeOutputs);
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
