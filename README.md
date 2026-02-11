# Bitcoin News Fetcher

Finnhub API를 사용하여 비트코인 및 암호화폐 뉴스를 가져오는 Node.js 애플리케이션입니다.

## 🚀 설치 방법

1. **의존성 설치**
```bash
npm install
```

2. **API 키 설정**
   - [Finnhub](https://finnhub.io/register)에서 무료 API 키를 발급받으세요
   - `.env.example` 파일을 `.env`로 복사하세요
   - `.env` 파일에 발급받은 API 키를 입력하세요

```bash
cp .env.example .env
```

`.env` 파일을 편집:
```
FINNHUB_API_KEY=your_actual_api_key_here
```

## 📖 사용 방법

```bash
npm start
```

또는

```bash
node index.js
```

## 📰 출력 예시

프로그램은 최신 암호화폐 뉴스 3개를 다음과 같은 형식으로 출력합니다:

```
🔍 Fetching crypto news from Finnhub...

📰 Article 1:
   Title: Bitcoin Surges Past $50,000
   Source: CoinDesk
   URL: https://...
   Published: 2/11/2026, 12:00:00 PM
   Summary: Bitcoin has reached a new milestone...

📰 Article 2:
   ...
```

## 🔧 기능

- ✅ Finnhub API를 사용한 실시간 암호화폐 뉴스 조회
- ✅ 환경 변수를 통한 안전한 API 키 관리
- ✅ 에러 핸들링
- ✅ 포맷팅된 출력

## 📝 라이선스

ISC
