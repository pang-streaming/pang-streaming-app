import { app, Tray, Menu, nativeImage } from 'electron';
import { SocketServer } from './socket-server';

let socketServer: SocketServer | null = null;

app.whenReady().then(async () => {
  socketServer = new SocketServer(3000);
  try {
    const port = await socketServer.start();
    console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
  } catch (error) {
    console.error('서버 시작 실패:', error);
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
