"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketServer = void 0;
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const stream_manager_1 = require("./stream-manager");
class SocketServer {
    constructor(port = 3000) {
        this.io = null;
        this.httpServer = null;
        this.port = port;
        this.streamManager = new stream_manager_1.StreamManager();
    }
    start() {
        return new Promise((resolve, reject) => {
            try {
                this.httpServer = (0, http_1.createServer)();
                this.io = new socket_io_1.Server(this.httpServer, {
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
                this.httpServer.on('error', (error) => {
                    reject(error);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    setupEventHandlers() {
        if (!this.io)
            return;
        this.io.on('connection', (socket) => {
            console.log('클라이언트 연결됨:', socket.id);
            socket.on('start-stream-webm', (config) => {
                this.handleStartStream(socket, config);
            });
            socket.on('video-chunk-webm', (data) => {
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
    handleStartStream(socket, config) {
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
                onError: (message) => {
                    socket.emit('stream-error', { message });
                },
                onClose: (code) => {
                    if (code !== 0 && code !== null) {
                        socket.emit('stream-error', { message: `FFmpeg exited with code ${code}` });
                    }
                    else {
                        socket.emit('stream-closed', { code });
                    }
                }
            });
            console.log(`[${socket.id}] Stream initialized`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[${socket.id}] Stream start error:`, errorMessage);
            socket.emit('stream-error', { message: errorMessage });
        }
    }
    handleVideoChunk(socket, data) {
        try {
            this.streamManager.writeChunk(socket.id, data);
        }
        catch (error) {
            if (error instanceof Error && error.message !== 'EPIPE') {
                console.error(`[${socket.id}] Chunk write error:`, error.message);
            }
        }
    }
    handleStopStream(socket) {
        this.streamManager.stopStream(socket.id);
        console.log(`[${socket.id}] Stream stopped`);
    }
    handleDisconnect(socket) {
        this.streamManager.stopStream(socket.id);
        console.log(`[${socket.id}] Client disconnected`);
    }
    stop() {
        return new Promise((resolve) => {
            this.streamManager.stopAllStreams();
            if (this.io) {
                this.io.close(() => {
                    console.log('Socket.IO 서버 종료됨');
                    if (this.httpServer) {
                        this.httpServer.close(() => {
                            resolve();
                        });
                    }
                    else {
                        resolve();
                    }
                });
            }
            else {
                resolve();
            }
        });
    }
    getIO() {
        return this.io;
    }
    getPort() {
        return this.port;
    }
}
exports.SocketServer = SocketServer;
