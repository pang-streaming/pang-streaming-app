# Pang Streaming App

시스템 트레이에 상주하면서 WebM 스트림을 RTMP로 전송하는 Electron 앱

## 주요 기능

- ✅ **시스템 트레이 전용** - 창 없이 백그라운드 동작
- ✅ **Socket.IO 서버** - WebM 스트림 수신
- ✅ **FFmpeg 통합** - WebM → RTMP 실시간 변환
- ✅ **다중 RTMP 전송** - 하나의 스트림을 여러 서버로 동시 전송
- ✅ **자동 포함** - FFmpeg 바이너리 자동 패키징

## 개발

```bash
# 개발 모드 실행
npm run dev

# 빌드만
npm run build

# 코드 린트
npm run lint

# 코드 자동 수정
npm run lint:fix
```

## 배포

### 설치 파일 생성

```bash
# 현재 OS용 설치 파일
npm run dist

# 특정 OS용
npm run dist:mac    # macOS
npm run dist:win    # Windows
npm run dist:linux  # Linux

# 패키징 테스트 (설치 파일 없이)
npm run pack
```

생성된 파일은 `dist/` 폴더에 저장됩니다.

## Socket.IO API

### 이벤트

**클라이언트 → 서버:**
- `start-stream-webm` - 스트림 시작
  ```javascript
  socket.emit('start-stream-webm', {
    rtmpUrl: 'rtmp://server/live/stream'
    // 또는 여러 서버
    rtmpUrl: ['rtmp://server1/live/stream', 'rtmp://server2/live/stream']
  });
  ```

- `video-chunk-webm` - 비디오 청크 전송
  ```javascript
  socket.emit('video-chunk-webm', buffer);
  ```

- `stop-stream` - 스트림 종료
  ```javascript
  socket.emit('stop-stream');
  ```

**서버 → 클라이언트:**
- `stream-ready` - 스트림 준비 완료
- `stream-error` - 스트림 에러 발생
- `stream-closed` - 스트림 정상 종료

### 기본 포트

- Socket.IO 서버: `http://localhost:3000`

## 기술 스택

- **Electron** - 데스크톱 앱 프레임워크
- **Socket.IO** - 실시간 통신
- **FFmpeg** - 비디오 스트림 변환
- **TypeScript** - 타입 안전성
- **ESLint** - 코드 품질 관리

## 프로젝트 구조

```
src/
├── index.ts           # 메인 프로세스 & 트레이 UI
├── socket-server.ts   # Socket.IO 서버 관리
├── stream-manager.ts  # FFmpeg 스트림 처리
└── ffmpeg-helper.ts   # FFmpeg 경로 헬퍼
```
