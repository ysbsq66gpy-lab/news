# Crypto News Hub 🚀

Finnhub API를 사용한 실시간 비트코인 및 암호화폐 뉴스 웹 애플리케이션입니다.

## ✨ 주요 기능

- 🌐 **웹 인터페이스** - 아름다운 다크모드 UI
- 📰 **실시간 뉴스** - 최신 암호화폐 뉴스 자동 업데이트
- 🎨 **모던 디자인** - 그라데이션, 애니메이션, 반응형 디자인
- 🔄 **자동 새로고침** - 5분마다 자동으로 뉴스 업데이트
- 📱 **반응형** - 모바일, 태블릿, 데스크톱 지원
- ⚡ **빠른 성능** - Express.js 기반 서버

## 🚀 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. API 키 설정
[Finnhub](https://finnhub.io/register)에서 무료 API 키를 발급받으세요.

`.env.example` 파일을 `.env`로 복사:
```bash
cp .env.example .env
```

`.env` 파일 편집:
```
FINNHUB_API_KEY=your_actual_api_key_here
```

### 3. 서버 실행
```bash
npm start
```

브라우저에서 `http://localhost:3000` 접속

## 📖 사용 방법

### 웹 애플리케이션으로 실행
```bash
npm start
```

### CLI 모드로 실행
```bash
npm run cli
```

## 🌐 배포하기

### Vercel로 배포

1. **Vercel CLI 설치**
```bash
npm i -g vercel
```

2. **배포 실행**
```bash
vercel
```

3. **환경 변수 설정**
Vercel 대시보드에서 환경 변수 추가:
- Key: `FINNHUB_API_KEY`
- Value: 발급받은 API 키

4. **프로덕션 배포**
```bash
vercel --prod
```

### GitHub Pages + Serverless 배포

1. GitHub에 푸시
2. Vercel과 GitHub 저장소 연결
3. 환경 변수 설정
4. 자동 배포 완료!

## 🛠️ 기술 스택

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **API**: Finnhub API
- **Deployment**: Vercel (Serverless)
- **Tools**: dotenv, node-fetch, cors

## 📂 프로젝트 구조

```
crypto-news-hub/
├── public/              # 프론트엔드 파일
│   ├── index.html      # 메인 HTML
│   ├── styles.css      # 스타일시트
│   └── app.js          # 클라이언트 JavaScript
├── server.js           # Express 서버
├── index.js            # CLI 버전
├── package.json        # 프로젝트 설정
├── vercel.json         # Vercel 배포 설정
├── .env.example        # 환경 변수 템플릿
└── README.md           # 문서
```

## 🎨 미리보기

웹 인터페이스 특징:
- ✨ 다크모드 디자인
- 🎯 카드 기반 레이아웃
- 🌈 그라데이션 효과
- 💫 부드러운 애니메이션
- 📱 완벽한 반응형

## 📝 API 엔드포인트

- `GET /api/news` - 암호화폐 뉴스 조회
- `GET /api/health` - 서버 상태 확인

## 🔒 보안

- API 키는 환경 변수로 관리
- `.env` 파일은 `.gitignore`에 포함
- CORS 설정으로 보안 강화

## 📝 라이선스

ISC

## 🤝 기여

Pull Request와 Issue는 언제나 환영합니다!

## 📧 문의

문의사항이 있으시면 Issue를 열어주세요.
