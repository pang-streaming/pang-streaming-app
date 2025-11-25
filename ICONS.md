# 아이콘 추가 가이드

## 빠른 시작

### 1. PNG 이미지 준비
- 크기: 1024x1024px (정사각형)
- 포맷: PNG (투명 배경 권장)
- 파일명: `icon.png`

### 2. 온라인 변환 (추천)

**macOS (ICNS):**
1. https://cloudconvert.com/png-to-icns 접속
2. `icon.png` 업로드
3. 변환 후 다운로드: `icon.icns`
4. `assets/icon.icns`에 저장

**Windows (ICO):**
1. https://cloudconvert.com/png-to-ico 접속
2. `icon.png` 업로드
3. 변환 후 다운로드: `icon.ico`
4. `assets/icon.ico`에 저장

**Linux (PNG):**
- 원본 PNG를 `assets/icon.png`로 복사

### 3. 트레이 아이콘 준비
```bash
# 16x16 또는 22x22 크기의 작은 아이콘
# assets/tray.png
# assets/tray@2x.png (Retina용, 32x32 또는 44x44)
```

### 4. 파일 구조
```
assets/
├── icon.icns       # macOS 앱 아이콘
├── icon.ico        # Windows 앱 아이콘  
├── icon.png        # Linux 앱 아이콘 (512x512)
├── tray.png        # 트레이 아이콘 (16x16 또는 22x22)
└── tray@2x.png     # 트레이 Retina (32x32 또는 44x44)
```

### 5. 재빌드
```bash
npm run dist:mac
```

## macOS에서 ICNS 직접 생성

### 준비물
- 1024x1024 PNG 이미지 (`source.png`)

### 명령어
```bash
# 1. iconset 폴더 생성
mkdir icon.iconset

# 2. 다양한 크기로 리사이즈
sips -z 16 16     source.png --out icon.iconset/icon_16x16.png
sips -z 32 32     source.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     source.png --out icon.iconset/icon_32x32.png
sips -z 64 64     source.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   source.png --out icon.iconset/icon_128x128.png
sips -z 256 256   source.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   source.png --out icon.iconset/icon_256x256.png
sips -z 512 512   source.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   source.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 source.png --out icon.iconset/icon_512x512@2x.png

# 3. ICNS 생성
iconutil -c icns icon.iconset

# 4. assets로 이동
mv icon.icns assets/

# 5. 정리
rm -rf icon.iconset
```

## Windows ICO 생성 (ImageMagick 사용)

### 설치
```bash
brew install imagemagick
```

### 생성
```bash
convert source.png -define icon:auto-resize=256,128,64,48,32,16 assets/icon.ico
```

## 트레이 아이콘 생성

### macOS/Linux
```bash
# 16x16 (일반)
sips -z 16 16 source.png --out assets/tray.png

# 32x32 (Retina)
sips -z 32 32 source.png --out assets/tray@2x.png
```

### Windows
```bash
# 16x16
sips -z 16 16 source.png --out assets/tray.png
```

## 코드에서 트레이 아이콘 사용

### src/index.ts
```typescript
import { nativeImage } from 'electron';
import * as path from 'path';

// 개발 환경
const iconPath = path.join(__dirname, '..', 'assets', 'tray.png');

// 또는 패키징된 환경
const iconPath = path.join(process.resourcesPath, 'assets', 'tray.png');

const icon = nativeImage.createFromPath(iconPath);
tray = new Tray(icon);
```

## 아이콘 디자인 팁

### 앱 아이콘
- 단순하고 명확한 디자인
- 작은 크기에서도 인식 가능
- 투명 배경 권장
- 모서리는 시스템이 자동으로 둥글게 처리

### 트레이 아이콘
- **매우 단순해야 함** (16x16px)
- 단색 또는 2색 사용
- 높은 대비
- macOS: 검은색 + 투명 배경 (시스템이 자동 반전)
- Windows: 흰색 + 투명 배경

## 무료 아이콘 리소스

- [Flaticon](https://www.flaticon.com/)
- [Icons8](https://icons8.com/)
- [Iconfinder](https://www.iconfinder.com/)
- [Noun Project](https://thenounproject.com/)

## 확인

빌드 후 확인:
```bash
# macOS
open dist/mac-arm64/Pang\ Streaming\ App.app
# 앱 정보 보기 → 아이콘 확인

# DMG 마운트 후
open dist/Pang\ Streaming\ App-1.0.0-arm64.dmg
```

## 문제 해결

### 아이콘이 안 보임
1. 파일 경로 확인: `assets/icon.icns` 존재?
2. package.json 확인: `build.mac.icon` 설정?
3. 캐시 삭제 후 재빌드:
   ```bash
   rm -rf dist
   npm run dist:mac
   ```

### 트레이 아이콘이 깨짐
- 크기 확인: 16x16 또는 22x22
- 단순한 디자인 사용
- Template 이미지 사용:
  ```typescript
  icon.setTemplateImage(true);
  ```
