import { app, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { SocketServer } from './socket-server';

let tray: Tray | null = null;
let socketServer: SocketServer | null = null;

// Deep link protocol handler
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('pang-streamer', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('pang-streamer');
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // 다른 인스턴스에서 실행 시도 시 처리
    const url = commandLine.find(arg => arg.startsWith('pang-streamer://'));
    if (url) {
      console.log('Deep link received (second-instance):', url);
      handleDeepLink(url);
    }
  });
}

// macOS/Windows deep link handler
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log('Deep link received (open-url):', url);
  handleDeepLink(url);
});

function handleDeepLink(url: string) {
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
        app.quit();
      });
    } else {
      app.quit();
    }
  }
}

app.whenReady().then(async () => {
  // Socket.IO 서버 시작
  socketServer = new SocketServer(47284);
  try {
    const port = await socketServer.start();
    console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
  } catch (error) {
    console.error('서버 시작 실패:', error);
  }

  // 시스템 트레이 아이콘 생성
  const getIconPath = () => {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'assets', 'tray.png');
    } else {
      return path.join(__dirname, '..', 'assets', 'tray.png');
    }
  };

  const icon = nativeImage.createFromPath(getIconPath());
  tray = new Tray(icon);

  // 트레이 컨텍스트 메뉴 구성
  const updateMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Pang Streaming App',
        enabled: false
      },
      {
        label: `서버: localhost:${socketServer?.getPort() || '???'}`,
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
        click: async () => {
          if (socketServer) {
            await socketServer.stop();
          }
          app.quit();
        }
      }
    ]);
    tray?.setContextMenu(contextMenu);
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
});

// 모든 윈도우가 닫혀도 앱이 종료되지 않도록 설정
app.on('window-all-closed', () => {
  // 아무것도 하지 않음 (기본적으로 종료되지 않음)
});

// Dock에서 숨기기 (macOS)
if (process.platform === 'darwin') {
  app.dock?.hide();
}
