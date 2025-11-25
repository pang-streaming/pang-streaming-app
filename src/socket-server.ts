import { Server, Socket } from 'socket.io';
import { createServer, Server as HttpServer } from 'http';
import { StreamManager } from './stream-manager';

interface StreamConfig {
  rtmpUrl: string | string[];
}

export class SocketServer {
  private io: Server | null = null;
  private httpServer: HttpServer | null = null;
  private port: number;
  private streamManager: StreamManager;

  constructor(port: number = 3000) {
    this.port = port;
    this.streamManager = new StreamManager();
  }

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer = createServer();
        this.io = new Server(this.httpServer, {
          cors: {
            origin: '*',
            methods: ['GET', 'POST']
          },
          maxHttpBufferSize: 1e8
        });

        this.setupEventHandlers();

        this.httpServer.listen(this.port, () => {
          console.log(`Socket.IO 서버 시작됨: http://localhost:${this.port}`);
          resolve(this.port);
        });

        this.httpServer.on('error', (error: Error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log('클라이언트 연결됨:', socket.id);

      socket.on('start-stream-webm', (config: StreamConfig) => {
        this.handleStartStream(socket, config);
      });

      socket.on('video-chunk-webm', (data: { buffer: Buffer | ArrayBuffer; timestamp: number } | Buffer | ArrayBuffer) => {
        this.handleVideoChunk(socket, data);
      });

      socket.on('stop-stream', () => {
        this.handleStopStream(socket);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleStartStream(socket: Socket, config: StreamConfig): void {
    console.log(`[${socket.id}] Starting WebM stream`, config);

    const rtmpUrls = Array.isArray(config.rtmpUrl)
      ? config.rtmpUrl
      : [config.rtmpUrl || 'rtmp://localhost:1935/live/stream'];

    console.log(`[${socket.id}] Streaming to ${rtmpUrls.length} server(s):`, rtmpUrls);

    try {
      this.streamManager.startStream(socket.id, rtmpUrls, {
        onReady: () => {
          socket.emit('stream-ready');
        },
        onError: (message: string) => {
          socket.emit('stream-error', { message });
        },
        onClose: (code: number | null) => {
          if (code !== 0 && code !== null) {
            socket.emit('stream-error', { message: `FFmpeg exited with code ${code}` });
          } else {
            socket.emit('stream-closed', { code });
          }
        }
      });

      console.log(`[${socket.id}] Stream initialized`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${socket.id}] Stream start error:`, errorMessage);
      socket.emit('stream-error', { message: errorMessage });
    }
  }

  private handleVideoChunk(socket: Socket, data: { buffer: Buffer | ArrayBuffer; timestamp: number } | Buffer | ArrayBuffer): void {
    try {
      // 객체 형태로 온 경우 buffer 추출
      const buffer = (data as any).buffer !== undefined ? (data as any).buffer : data;
      this.streamManager.writeChunk(socket.id, buffer);
    } catch (error) {
      if (error instanceof Error && error.message !== 'EPIPE') {
        console.error(`[${socket.id}] Chunk write error:`, error.message);
      }
    }
  }

  private handleStopStream(socket: Socket): void {
    this.streamManager.stopStream(socket.id);
    console.log(`[${socket.id}] Stream stopped`);
  }

  private handleDisconnect(socket: Socket): void {
    this.streamManager.stopStream(socket.id);
    console.log(`[${socket.id}] Client disconnected`);
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.streamManager.stopAllStreams();

      if (this.io) {
        this.io.close(() => {
          console.log('Socket.IO 서버 종료됨');
          if (this.httpServer) {
            this.httpServer.close(() => {
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  getIO(): Server | null {
    return this.io;
  }

  getPort(): number {
    return this.port;
  }
}
