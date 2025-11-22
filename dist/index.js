"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const socket_server_1 = require("./socket-server");
let socketServer = null;
electron_1.app.whenReady().then(() => __awaiter(void 0, void 0, void 0, function* () {
    socketServer = new socket_server_1.SocketServer(3000);
    try {
        const port = yield socketServer.start();
        console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
    }
    catch (error) {
        console.error('서버 시작 실패:', error);
    }
}));
// 모든 윈도우가 닫혀도 앱이 종료되지 않도록 설정
electron_1.app.on('window-all-closed', () => {
    // 아무것도 하지 않음 (기본적으로 종료되지 않음)
});
// Dock에서 숨기기 (macOS)
if (process.platform === 'darwin') {
    (_a = electron_1.app.dock) === null || _a === void 0 ? void 0 : _a.hide();
}
