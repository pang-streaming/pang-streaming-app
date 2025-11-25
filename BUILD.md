# 빌드 가이드

## 빠른 시작

### macOS DMG 생성 (Mac에서)
```bash
npm run dist:mac
```

생성 파일: `dist/Pang Streaming App-1.0.0.dmg`

### Windows EXE 생성 (Mac에서 크로스 빌드)
```bash
# Wine 설치 필요 (처음 한 번만)
brew install --cask wine-stable

# 빌드
npm run dist:win
```

생성 파일:
- `dist/Pang Streaming App Setup 1.0.0.exe` (설치파일)
- `dist/Pang Streaming App 1.0.0.exe` (포터블)

### 현재 OS용 자동 빌드
```bash
npm run dist
```

## 빌드 전 체크리스트

1. **package.json 수정**
   ```json
   {
     "author": "Your Name <your.email@example.com>",
     "description": "앱 설명"
   }
   ```

2. **아이콘 추가 (선택사항)**
   - `assets/icon.icns` (Mac, 512x512 이상)
   - `assets/icon.ico` (Windows)
   - `assets/icon.png` (Linux, 512x512)

3. **빌드 실행**
   ```bash
   npm run build    # TypeScript 컴파일
   npm run dist:mac # 배포 파일 생성
   ```

## 빌드 옵션

### 패키징 테스트 (설치파일 없이)
빠르게 패키징 결과 확인:
```bash
npm run pack
```
`dist/mac-arm64/` 또는 `dist/mac/` 폴더에 앱 생성

### 특정 플랫폼 빌드
```bash
npm run dist:mac     # macOS
npm run dist:win     # Windows
npm run dist:linux   # Linux
```

## 생성되는 파일

### macOS
- `Pang Streaming App-1.0.0.dmg` - 설치 이미지
- `Pang Streaming App-1.0.0-mac.zip` - 압축 파일
- `Pang Streaming App-1.0.0-arm64-mac.zip` (Apple Silicon)

### Windows
- `Pang Streaming App Setup 1.0.0.exe` - NSIS 설치파일
- `Pang Streaming App 1.0.0.exe` - 포터블 버전

### Linux
- `Pang Streaming App-1.0.0.AppImage` - AppImage
- `pang-streaming-app_1.0.0_amd64.deb` - Debian 패키지

## 문제 해결

### "Author email is required" 에러
package.json에 author 추가:
```json
"author": "Your Name <email@example.com>"
```

### Windows 빌드 실패 (Mac에서)
Wine 설치:
```bash
brew install --cask wine-stable
```

### FFmpeg 포함 확인
빌드 후 앱 실행하여 콘솔 확인:
```
FFmpeg 경로: /path/to/ffmpeg
```

### 앱 서명 경고
개발용이라면 무시 가능. 배포용은 코드 서명 필요:
- Mac: Apple Developer 계정
- Windows: Code Signing Certificate

## 배포

### macOS
1. DMG 파일 배포
2. 사용자: Gatekeeper 우회 (개발 빌드)
   - 우클릭 → 열기

### Windows  
1. EXE 파일 배포
2. Windows Defender 경고 무시
   - "추가 정보" → "실행"

### 자동 업데이트 (선택)
electron-updater 추가 고려

## 빌드 시간

- 패키징 테스트: ~30초
- DMG 생성: 1-2분
- Windows 크로스 빌드: 3-5분
- 전체 플랫폼: 5-10분

## 추가 설정

### 자동 시작 (선택)
```typescript
app.setLoginItemSettings({
  openAtLogin: true
});
```

### 앱 아이콘 변경
1. 아이콘 파일 준비
2. `assets/` 폴더에 추가
3. package.json 확인:
   ```json
   "mac": {
     "icon": "assets/icon.icns"
   }
   ```
4. 재빌드
