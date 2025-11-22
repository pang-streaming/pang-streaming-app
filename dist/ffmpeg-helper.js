"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFFmpegPath = getFFmpegPath;
exports.testFFmpeg = testFFmpeg;
const electron_1 = require("electron");
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
function getFFmpegPath() {
    const ffmpegPath = ffmpeg_static_1.default;
    if (electron_1.app.isPackaged) {
        return ffmpegPath.replace('app.asar', 'app.asar.unpacked');
    }
    return ffmpegPath;
}
function testFFmpeg() {
    try {
        const ffmpegPath = getFFmpegPath();
        console.log('FFmpeg 경로:', ffmpegPath);
    }
    catch (error) {
        console.error('FFmpeg 로드 실패:', error);
    }
}
