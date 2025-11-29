import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import selfsigned from 'selfsigned';

interface CertificateData {
  key: string;
  cert: string;
  expiresAt: number;
  installed: boolean;
}

const CERT_VALIDITY_DAYS = 365;
const CERT_FILE_NAME = 'server-cert.json';
const CERT_PEM_FILE_NAME = 'pang-streaming-cert.pem';

function getCertPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, CERT_FILE_NAME);
}

function getCertPemPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, CERT_PEM_FILE_NAME);
}

function isCertValid(certData: CertificateData): boolean {
  const now = Date.now();
  // 만료 30일 전에 갱신
  const renewThreshold = 30 * 24 * 60 * 60 * 1000;
  return certData.expiresAt - now > renewThreshold;
}

function generateCertificate(): CertificateData {
  console.log('새 자체 서명 인증서 생성 중...');

  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'organizationName', value: 'Pang Streaming App' }
  ];

  const pems = selfsigned.generate(attrs, {
    keySize: 2048,
    days: CERT_VALIDITY_DAYS,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' }
        ]
      }
    ]
  });

  const expiresAt = Date.now() + (CERT_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  return {
    key: pems.private,
    cert: pems.cert,
    expiresAt,
    installed: false
  };
}

function saveCertificate(certData: CertificateData): void {
  const certPath = getCertPath();
  const userDataPath = path.dirname(certPath);

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  fs.writeFileSync(certPath, JSON.stringify(certData, null, 2), 'utf-8');
  console.log('인증서 저장됨:', certPath);
}

function saveCertPem(cert: string): string {
  const pemPath = getCertPemPath();
  fs.writeFileSync(pemPath, cert, 'utf-8');
  return pemPath;
}

function installCertToSystem(certPath: string): boolean {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      // macOS: 사용자 키체인에 신뢰할 수 있는 인증서로 추가
      execSync(
        `security add-trusted-cert -r trustRoot -k ~/Library/Keychains/login.keychain-db "${certPath}"`,
        { stdio: 'pipe' }
      );
      console.log('macOS 키체인에 인증서 설치 완료');
      return true;
    } else if (platform === 'win32') {
      // Windows: 현재 사용자의 신뢰할 수 있는 루트 인증 기관에 추가
      execSync(
        `certutil -user -addstore "Root" "${certPath}"`,
        { stdio: 'pipe' }
      );
      console.log('Windows 인증서 저장소에 설치 완료');
      return true;
    } else {
      console.log('Linux는 수동 인증서 설치가 필요합니다');
      return false;
    }
  } catch (error) {
    console.error('인증서 시스템 설치 실패:', error);
    return false;
  }
}

function uninstallCertFromSystem(): void {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      // macOS: 기존 인증서 제거 (CommonName으로 찾아서 삭제)
      execSync(
        `security delete-certificate -c "localhost" ~/Library/Keychains/login.keychain-db 2>/dev/null || true`,
        { stdio: 'pipe' }
      );
    } else if (platform === 'win32') {
      // Windows: 기존 인증서 제거
      execSync(
        `certutil -user -delstore "Root" "localhost" 2>nul || exit 0`,
        { stdio: 'pipe' }
      );
    }
  } catch {
    // 기존 인증서가 없으면 무시
  }
}

function loadCertificate(): CertificateData | null {
  const certPath = getCertPath();

  if (!fs.existsSync(certPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(certPath, 'utf-8');
    return JSON.parse(content) as CertificateData;
  } catch (error) {
    console.error('인증서 로드 실패:', error);
    return null;
  }
}

export function getOrCreateCertificate(): { key: string; cert: string } {
  let certData = loadCertificate();

  // 유효한 인증서가 있고 이미 설치되어 있으면 재사용
  if (certData && isCertValid(certData) && certData.installed) {
    console.log('기존 인증서 사용 (시스템에 설치됨)');
    return { key: certData.key, cert: certData.cert };
  }

  // 새 인증서 생성이 필요한 경우
  const needNewCert = !certData || !isCertValid(certData);

  if (needNewCert) {
    // 기존 인증서 제거
    uninstallCertFromSystem();
    certData = generateCertificate();
  }

  // 인증서를 PEM 파일로 저장
  const pemPath = saveCertPem(certData!.cert);

  // 시스템에 설치
  const installed = installCertToSystem(pemPath);

  // 설치 상태와 함께 저장
  certData!.installed = installed;
  saveCertificate(certData!);

  return { key: certData!.key, cert: certData!.cert };
}
