// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : '';

// DOM Elements
const newsContainer = document.getElementById('newsContainer');
const refreshBtn = document.getElementById('refreshBtn');
const translateAllBtn = document.getElementById('translateAllBtn');
const aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');

// Translation state
let isTranslatedMode = false;
const translationCache = {};

// AI state
let aiModel = null;
let isAiMode = false;
const aiCache = {};

// ===== AI IMAGE ANALYSIS =====
async function loadAiModel() {
    if (aiModel) return aiModel;
    console.log('Loading MobileNet model...');
    aiModel = await mobilenet.load({ version: 2, alpha: 1.0 });
    console.log('MobileNet model loaded!');
    return aiModel;
}

async function analyzeCardImage(cardEl) {
    const imgEl = cardEl.querySelector('.news-image');
    const btn = cardEl.querySelector('.btn-card-ai');
    const wrapper = cardEl.querySelector('.news-image-wrapper');

    if (!imgEl || !wrapper) return;

    // Toggle off if already analyzed
    const existingOverlay = wrapper.querySelector('.ai-tags-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
        if (btn) {
            btn.textContent = '🤖 AI';
            btn.classList.remove('analyzed');
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = '분석 중...';
    }
    wrapper.classList.add('ai-analyzing');

    try {
        const model = await loadAiModel();

        // Create a separate image for classification (to handle CORS)
        const classifyImg = new Image();
        classifyImg.crossOrigin = 'anonymous';

        const imgSrc = imgEl.src;
        const cacheKey = imgSrc;

        let predictions;
        if (aiCache[cacheKey]) {
            predictions = aiCache[cacheKey];
        } else {
            predictions = await new Promise((resolve, reject) => {
                classifyImg.onload = async () => {
                    try {
                        const result = await model.classify(classifyImg, 3);
                        resolve(result);
                    } catch (e) {
                        reject(e);
                    }
                };
                classifyImg.onerror = () => {
                    // CORS failed, use server proxy
                    const proxyImg = new Image();
                    proxyImg.crossOrigin = 'anonymous';
                    proxyImg.onload = async () => {
                        try {
                            const result = await model.classify(proxyImg, 3);
                            resolve(result);
                        } catch (e) {
                            reject(e);
                        }
                    };
                    proxyImg.onerror = () => reject(new Error('Image load failed'));
                    proxyImg.src = `${API_BASE_URL}/api/proxy-image?url=${encodeURIComponent(imgSrc)}`;
                };
                classifyImg.src = imgSrc;
            });
            aiCache[cacheKey] = predictions;
        }

        // Display tags overlay
        const overlay = document.createElement('div');
        overlay.className = 'ai-tags-overlay';
        predictions.forEach((pred, i) => {
            const tag = document.createElement('span');
            const className = pred.className.split(',')[0].trim();
            const conf = (pred.probability * 100).toFixed(1);
            tag.className = `ai-tag ${i === 0 ? 'primary' : 'secondary'}`;
            tag.innerHTML = `${className} <span class="ai-tag-conf">${conf}%</span>`;
            overlay.appendChild(tag);
        });
        wrapper.appendChild(overlay);

        if (btn) {
            btn.textContent = '✓ 분석됨';
            btn.classList.add('analyzed');
        }
    } catch (error) {
        console.error('AI analysis error:', error);
        if (btn) btn.textContent = '⚠️ 실패';
    }

    wrapper.classList.remove('ai-analyzing');
    if (btn) btn.disabled = false;
}

async function analyzeAllImages() {
    aiAnalyzeBtn.disabled = true;

    if (isAiMode) {
        // Remove all AI overlays
        document.querySelectorAll('.ai-tags-overlay').forEach(el => el.remove());
        document.querySelectorAll('.btn-card-ai').forEach(btn => {
            btn.textContent = '🤖 AI';
            btn.classList.remove('analyzed');
        });
        aiAnalyzeBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            AI 이미지 분석`;
        aiAnalyzeBtn.classList.remove('active');
        isAiMode = false;
        aiAnalyzeBtn.disabled = false;
        return;
    }

    aiAnalyzeBtn.textContent = '🧠 모델 로딩 중...';
    await loadAiModel();
    aiAnalyzeBtn.textContent = '🔍 분석 중...';

    const cards = document.querySelectorAll('.news-card');
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (!card.querySelector('.ai-tags-overlay')) {
            await analyzeCardImage(card);
        }
    }

    aiAnalyzeBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        AI 태그 숨기기`;
    aiAnalyzeBtn.classList.add('active');
    isAiMode = true;
    aiAnalyzeBtn.disabled = false;
}

// ===== TRANSLATION =====
async function translateText(text, sourceLang = 'en', targetLang = 'ko') {
    const cacheKey = `${text}_${sourceLang}_${targetLang}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];

    try {
        const encoded = encodeURIComponent(text.substring(0, 500));
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${sourceLang}|${targetLang}`
        );
        const data = await response.json();

        if (data.responseStatus === 200 && data.responseData.translatedText) {
            const translated = data.responseData.translatedText;
            translationCache[cacheKey] = translated;
            return translated;
        }
        return null;
    } catch (error) {
        console.error('Translation error:', error);
        return null;
    }
}

async function translateCard(cardEl) {
    const titleEl = cardEl.querySelector('.news-title a');
    const summaryEl = cardEl.querySelector('.news-summary');
    const btn = cardEl.querySelector('.btn-card-translate');

    if (cardEl.querySelector('.translated-text')) {
        cardEl.querySelectorAll('.translated-text').forEach(el => el.remove());
        if (btn) {
            btn.textContent = '🌐 번역';
            btn.classList.remove('translated');
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = '번역 중...';
    }

    const titleText = titleEl?.textContent?.trim();
    const summaryText = summaryEl?.textContent?.trim();

    const [translatedTitle, translatedSummary] = await Promise.all([
        titleText ? translateText(titleText) : null,
        summaryText ? translateText(summaryText) : null
    ]);

    if (translatedTitle || translatedSummary) {
        const translatedDiv = document.createElement('div');
        translatedDiv.className = 'translated-text';
        let html = '';
        if (translatedTitle) html += `<div class="translated-title">📌 ${escapeHtml(translatedTitle)}</div>`;
        if (translatedSummary) html += `<div>${escapeHtml(translatedSummary)}</div>`;
        translatedDiv.innerHTML = html;

        summaryEl.insertAdjacentElement('afterend', translatedDiv);

        if (btn) {
            btn.textContent = '✓ 번역됨';
            btn.classList.add('translated');
        }
    } else {
        if (btn) btn.textContent = '⚠️ 실패';
    }

    if (btn) btn.disabled = false;
}

async function translateAllCards() {
    translateAllBtn.disabled = true;

    if (isTranslatedMode) {
        // Remove all translations
        document.querySelectorAll('.translated-text').forEach(el => el.remove());
        document.querySelectorAll('.btn-card-translate').forEach(btn => {
            btn.textContent = '🌐 번역';
            btn.classList.remove('translated');
        });
        translateAllBtn.textContent = '한국어 번역';
        translateAllBtn.classList.remove('active');
        isTranslatedMode = false;
        translateAllBtn.disabled = false;
        return;
    }

    translateAllBtn.textContent = '번역 중...';

    const cards = document.querySelectorAll('.news-card');
    // Translate in batches of 3 to avoid rate limiting
    for (let i = 0; i < cards.length; i += 3) {
        const batch = Array.from(cards).slice(i, i + 3);
        await Promise.all(batch.map(card => {
            if (!card.querySelector('.translated-text')) {
                return translateCard(card);
            }
            return Promise.resolve();
        }));
        // Small delay between batches
        if (i + 3 < cards.length) await new Promise(r => setTimeout(r, 300));
    }

    translateAllBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/>
        </svg>
        원문 보기`;
    translateAllBtn.classList.add('active');
    isTranslatedMode = true;
    translateAllBtn.disabled = false;
}

// ===== PRICE TICKER =====
async function fetchPrices() {
    try {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
        const promises = symbols.map(symbol =>
            fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`).then(r => r.json())
        );
        const results = await Promise.all(promises);
        const prices = results.map(data => ({
            symbol: data.symbol,
            price: parseFloat(data.lastPrice),
            change: parseFloat(data.priceChangePercent),
            high: parseFloat(data.highPrice),
            low: parseFloat(data.lowPrice),
            volume: parseFloat(data.volume)
        }));
        displayPrices(prices);
    } catch (error) {
        console.error('Price fetch error:', error);
    }
}

function displayPrices(prices) {
    const symbolNames = {
        'BTCUSDT': 'BTC',
        'ETHUSDT': 'ETH',
        'BNBUSDT': 'BNB',
        'SOLUSDT': 'SOL',
        'XRPUSDT': 'XRP'
    };

    prices.forEach(coin => {
        const card = document.getElementById(`price-${coin.symbol}`);
        if (!card) return;

        card.classList.remove('loading-shimmer');

        const valueEl = card.querySelector('.price-value');
        const changeEl = card.querySelector('.price-change');

        const formattedPrice = coin.price >= 1
            ? `$${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `$${coin.price.toFixed(4)}`;

        const isUp = coin.change >= 0;
        const arrow = isUp ? '▲' : '▼';

        valueEl.textContent = formattedPrice;
        changeEl.textContent = `${arrow} ${Math.abs(coin.change).toFixed(2)}%`;
        changeEl.className = `price-change ${isUp ? 'up' : 'down'}`;

        // Flash animation on update
        valueEl.classList.remove('price-flash');
        void valueEl.offsetWidth; // trigger reflow
        valueEl.classList.add('price-flash');
    });
}

// ===== NEWS =====
async function fetchNews() {
    try {
        showLoading();
        isTranslatedMode = false;
        translateAllBtn.classList.remove('active');
        translateAllBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/>
            </svg>
            한국어 번역`;

        const response = await fetch(`${API_BASE_URL}/api/news`);

        if (!response.ok) {
            throw new Error('Failed to fetch news');
        }

        const news = await response.json();

        if (!news || news.length === 0) {
            showError('뉴스를 찾을 수 없습니다.');
            return;
        }

        displayNews(news);
    } catch (error) {
        console.error('Error:', error);
        showError('뉴스를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
}

function displayNews(newsArray) {
    newsContainer.innerHTML = '';

    newsArray.forEach((article, index) => {
        const card = createNewsCard(article, index);
        newsContainer.appendChild(card);
    });
}

function createNewsCard(article, index) {
    const card = document.createElement('article');
    card.className = 'news-card';
    card.style.animationDelay = `${index * 0.1}s`;

    const imageUrl = article.image || 'https://via.placeholder.com/400x200/1a1f3f/f7931a?text=Crypto+News';
    const date = new Date(article.datetime * 1000);
    const formattedDate = formatDate(date);

    card.innerHTML = `
        <div class="news-image-wrapper">
            <img src="${imageUrl}" alt="${escapeHtml(article.headline)}" class="news-image" crossorigin="anonymous"
                 onerror="this.src='https://via.placeholder.com/400x200/1a1f3f/f7931a?text=Crypto+News'">
        </div>
        <div class="news-content">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; gap:0.4rem;">
                <span class="news-source">${escapeHtml(article.source)}</span>
                <div style="display:flex; gap:0.35rem;">
                    <button class="btn-card-ai" onclick="analyzeCardImage(this.closest('.news-card'))">🤖 AI</button>
                    <button class="btn-card-translate" onclick="translateCard(this.closest('.news-card'))">🌐 번역</button>
                </div>
            </div>
            <h2 class="news-title">
                <a href="${article.url}" target="_blank" rel="noopener noreferrer">
                    ${escapeHtml(article.headline)}
                </a>
            </h2>
            <p class="news-summary">
                ${escapeHtml(article.summary || '요약 없음')}
            </p>
            <div class="news-meta">
                <span class="news-date">${formattedDate}</span>
                <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-link">
                    자세히 보기 →
                </a>
            </div>
        </div>
    `;

    return card;
}

function showLoading() {
    newsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>뉴스를 불러오는 중...</p>
        </div>
    `;
}

function showError(message) {
    newsContainer.innerHTML = `
        <div class="error">
            <h2>⚠️ 오류 발생</h2>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== EVENT LISTENERS =====
refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('spinning');
    Promise.all([fetchNews(), fetchPrices()]).finally(() => {
        setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
    });
});

translateAllBtn.addEventListener('click', translateAllCards);
aiAnalyzeBtn.addEventListener('click', analyzeAllImages);

// ===== INITIAL LOAD =====
fetchPrices();
fetchNews();

// Auto-refresh prices every 10 seconds
setInterval(fetchPrices, 10 * 1000);

// Auto-refresh news every 5 minutes
setInterval(fetchNews, 5 * 60 * 1000);
