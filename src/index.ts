import { app, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { SocketServer } from './socket-server';

let tray: Tray | null = null;
let socketServer: SocketServer | null = null;

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
});

// 모든 윈도우가 닫혀도 앱이 종료되지 않도록 설정
app.on('window-all-closed', () => {
  // 아무것도 하지 않음 (기본적으로 종료되지 않음)
});

// Dock에서 숨기기 (macOS)
if (process.platform === 'darwin') {
  app.dock?.hide();
}
