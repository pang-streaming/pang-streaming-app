"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamManager = void 0;
const child_process_1 = require("child_process");
const ffmpeg_helper_1 = require("./ffmpeg-helper");
class StreamManager {
    constructor() {
        this.activeStreams = new Map();
    }
    startStream(socketId, rtmpUrls, callbacks) {
        if (this.activeStreams.has(socketId)) {
            this.stopStream(socketId);
        }
        const ffmpegPath = (0, ffmpeg_helper_1.getFFmpegPath)();
        const ffmpegArgs = this.buildFFmpegArgs(rtmpUrls);
        const ffmpeg = (0, child_process_1.spawn)(ffmpegPath, ffmpegArgs, {
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
    buildFFmpegArgs(rtmpUrls) {
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
        }
        else {
            const teeOutputs = rtmpUrls.map(url => `[f=flv]${url}`).join('|');
            args.push('-f', 'tee', '-map', '0:v', '-map', '0:a', teeOutputs);
        }
        return args;
    }
    setupFFmpegHandlers(socketId, ffmpeg, callbacks) {
        if (!ffmpeg.stdin || !ffmpeg.stderr) {
            callbacks.onError('FFmpeg stdio not available');
            return;
        }
        ffmpeg.stdin.on('error', (err) => {
            if (err.code !== 'EPIPE') {
                console.error(`[${socketId}] stdin error:`, err);
            }
        });
        ffmpeg.stderr.on('data', (data) => {
            const msg = data.toString();
            if (msg.includes('rtmp') ||
                msg.includes('RTMP') ||
                msg.includes('handshake') ||
                msg.includes('Output #') ||
                msg.includes('error') ||
                msg.includes('Error')) {
                console.log(`[${socketId}] FFmpeg:`, msg.trim());
            }
        });
        ffmpeg.on('error', (err) => {
            console.error(`[${socketId}] FFmpeg spawn error:`, err);
            callbacks.onError('FFmpeg 시작 실패');
        });
        ffmpeg.on('close', (code) => {
            console.log(`[${socketId}] FFmpeg exited with code ${code}`);
            this.activeStreams.delete(socketId);
            callbacks.onClose(code);
        });
    }
    writeChunk(socketId, data) {
        const streamInfo = this.activeStreams.get(socketId);
        if (!streamInfo)
            return;
        const ffmpeg = streamInfo.process;
        if (!ffmpeg.stdin || !ffmpeg.stdin.writable)
            return;
        try {
            let buffer;
            if (data instanceof Buffer) {
                buffer = data;
            }
            else {
                buffer = Buffer.from(new Uint8Array(data));
            }
            streamInfo.chunkCount++;
            ffmpeg.stdin.write(buffer, (err) => {
                if (err && err.code !== 'EPIPE') {
                    console.error(`[${socketId}] Write error:`, err);
                }
            });
            const chunkCount = streamInfo.chunkCount;
            if (chunkCount <= 5 || chunkCount % 50 === 0) {
                console.log(`[${socketId}] Chunk ${chunkCount}: ${buffer.length} bytes`);
            }
        }
        catch (err) {
            if (err.code !== 'EPIPE') {
                console.error(`[${socketId}] Write error:`, err);
            }
        }
    }
    stopStream(socketId) {
        const streamInfo = this.activeStreams.get(socketId);
        if (!streamInfo)
            return;
        const ffmpeg = streamInfo.process;
        try {
            if (ffmpeg.stdin && ffmpeg.stdin.writable) {
                ffmpeg.stdin.end();
            }
        }
        catch (err) {
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
    stopAllStreams() {
        const socketIds = Array.from(this.activeStreams.keys());
        socketIds.forEach(socketId => this.stopStream(socketId));
    }
}
exports.StreamManager = StreamManager;
