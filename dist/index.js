"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const path = __importStar(require("path"));
const socket_server_1 = require("./socket-server");
let tray = null;
let socketServer = null;
// Deep link protocol handler
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        electron_1.app.setAsDefaultProtocolClient('pang-streamer', process.execPath, [path.resolve(process.argv[1])]);
    }
}
else {
    electron_1.app.setAsDefaultProtocolClient('pang-streamer');
}
// Single instance lock
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', (event, commandLine) => {
        // 다른 인스턴스에서 실행 시도 시 처리
        const url = commandLine.find(arg => arg.startsWith('pang-streamer://'));
        if (url) {
            console.log('Deep link received (second-instance):', url);
            handleDeepLink(url);
        }
    });
}
// macOS/Windows deep link handler
electron_1.app.on('open-url', (event, url) => {
    event.preventDefault();
    console.log('Deep link received (open-url):', url);
    handleDeepLink(url);
});
function handleDeepLink(url) {
    console.log('Handling deep link:', url);
    // pang-streamer://start - 앱 실행 (이미 실행 중)
    if (url.includes('start')) {
        console.log('App is already running');
    }
    // pang-streamer://quit - 앱 종료
    if (url.includes('quit')) {
        console.log('Quitting app via deep link');
        if (socketServer) {
            socketServer.stop().then(() => {
                electron_1.app.quit();
            });
        }
        else {
            electron_1.app.quit();
        }
    }
}
electron_1.app.whenReady().then(() => __awaiter(void 0, void 0, void 0, function* () {
    // Socket.IO 서버 시작
    socketServer = new socket_server_1.SocketServer(47284);
    try {
        const port = yield socketServer.start();
        console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
    }
    catch (error) {
        console.error('서버 시작 실패:', error);
    }
    // 시스템 트레이 아이콘 생성
    const getIconPath = () => {
        if (electron_1.app.isPackaged) {
            return path.join(process.resourcesPath, 'assets', 'tray.png');
        }
        else {
            return path.join(__dirname, '..', 'assets', 'tray.png');
        }
    };
    const icon = electron_1.nativeImage.createFromPath(getIconPath());
    tray = new electron_1.Tray(icon);
    // 트레이 컨텍스트 메뉴 구성
    const updateMenu = () => {
        const contextMenu = electron_1.Menu.buildFromTemplate([
            {
                label: 'Pang Streaming App',
                enabled: false
            },
            {
                label: `서버: localhost:${(socketServer === null || socketServer === void 0 ? void 0 : socketServer.getPort()) || '???'}`,
                enabled: false
            },
            { type: 'separator' },
            {
                label: '설정',
                click: () => {
                    console.log('설정 클릭됨');
                }
            },
            { type: 'separator' },
            {
                label: '종료',
                click: () => __awaiter(void 0, void 0, void 0, function* () {
                    if (socketServer) {
                        yield socketServer.stop();
                    }
                    electron_1.app.quit();
                })
            }
        ]);
        tray === null || tray === void 0 ? void 0 : tray.setContextMenu(contextMenu);
    };
    updateMenu();
    tray.setToolTip('Pang Streaming App');
    // Check for deep link on startup
    if (process.platform !== 'darwin') {
        const url = process.argv.find(arg => arg.startsWith('pang-streamer://'));
        if (url) {
            console.log('Deep link received (startup):', url);
            handleDeepLink(url);
        }
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
