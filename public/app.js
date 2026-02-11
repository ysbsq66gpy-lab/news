// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : '';

// DOM Elements
const newsContainer = document.getElementById('newsContainer');
const refreshBtn = document.getElementById('refreshBtn');
const translateAllBtn = document.getElementById('translateAllBtn');
const aiSummaryBtn = document.getElementById('aiSummaryBtn');
const aiSummaryPanel = document.getElementById('aiSummaryPanel');
const aiSummaryContent = document.getElementById('aiSummaryContent');
const closeSummaryBtn = document.getElementById('closeSummaryBtn');
const summaryTimestamp = document.getElementById('summaryTimestamp');

// Translation state
let isTranslatedMode = false;
const translationCache = {};

// AI state
let useModel = null;
let currentPrices = [];
let currentNews = [];

// ===== AI MARKET ANALYSIS (TensorFlow.js + USE) =====
async function loadUSEModel() {
    if (useModel) return useModel;
    console.log('Loading Universal Sentence Encoder...');
    useModel = await use.load();
    console.log('USE model loaded!');
    return useModel;
}

// Sentiment reference sentences for cosine similarity
const POSITIVE_REFS = [
    "price surge rally bullish growth gains momentum positive",
    "adoption institutional investment partnership breakthrough",
    "all time high record breaking massive gains profit",
    "approval regulation support government backed launch success"
];

const NEGATIVE_REFS = [
    "crash decline bearish loss plunge drop sell off negative",
    "hack fraud scam theft stolen security breach vulnerability",
    "ban restriction regulation crackdown lawsuit investigation",
    "bankruptcy liquidation collapse failure default insolvency"
];

// Compute cosine similarity between two vectors
function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Analyze sentiment of headlines using USE embeddings
async function analyzeHeadlineSentiment(headlines) {
    const model = await loadUSEModel();

    // Encode all texts: headlines + positive refs + negative refs
    const allTexts = [...headlines, ...POSITIVE_REFS, ...NEGATIVE_REFS];
    const embeddings = await model.embed(allTexts);
    const embeddingArray = await embeddings.array();

    const headlineEmbeddings = embeddingArray.slice(0, headlines.length);
    const positiveEmbeddings = embeddingArray.slice(headlines.length, headlines.length + POSITIVE_REFS.length);
    const negativeEmbeddings = embeddingArray.slice(headlines.length + POSITIVE_REFS.length);

    const results = headlineEmbeddings.map((he, idx) => {
        // Average cosine similarity with positive and negative references
        const posSim = positiveEmbeddings.reduce((sum, pe) => sum + cosineSimilarity(he, pe), 0) / positiveEmbeddings.length;
        const negSim = negativeEmbeddings.reduce((sum, ne) => sum + cosineSimilarity(he, ne), 0) / negativeEmbeddings.length;

        const sentiment = posSim - negSim;
        return {
            headline: headlines[idx],
            positiveScore: posSim,
            negativeScore: negSim,
            sentiment: sentiment,
            label: sentiment > 0.02 ? 'positive' : sentiment < -0.02 ? 'negative' : 'neutral'
        };
    });

    embeddings.dispose();
    return results;
}

// Analyze price data
function analyzePriceData(prices) {
    const avgChange = prices.reduce((sum, p) => sum + p.change, 0) / prices.length;
    const gainers = prices.filter(p => p.change > 0).sort((a, b) => b.change - a.change);
    const losers = prices.filter(p => p.change <= 0).sort((a, b) => a.change - b.change);
    const maxGainer = gainers[0] || null;
    const maxLoser = losers[0] || null;

    const volatility = prices.reduce((sum, p) => {
        const range = ((p.high - p.low) / p.low) * 100;
        return sum + range;
    }, 0) / prices.length;

    let marketTrend;
    if (avgChange > 2) marketTrend = '강한 상승세';
    else if (avgChange > 0.5) marketTrend = '완만한 상승세';
    else if (avgChange > -0.5) marketTrend = '보합세';
    else if (avgChange > -2) marketTrend = '완만한 하락세';
    else marketTrend = '강한 하락세';

    let volatilityLabel;
    if (volatility > 8) volatilityLabel = '매우 높음';
    else if (volatility > 5) volatilityLabel = '높음';
    else if (volatility > 3) volatilityLabel = '보통';
    else volatilityLabel = '낮음';

    return { avgChange, gainers, losers, maxGainer, maxLoser, volatility, volatilityLabel, marketTrend };
}

// Generate full market summary
async function generateMarketSummary() {
    aiSummaryBtn.disabled = true;
    aiSummaryBtn.textContent = '🧠 모델 로딩 중...';

    // Show panel with loading
    aiSummaryPanel.classList.remove('hidden');
    aiSummaryContent.innerHTML = `
        <div class="ai-loading">
            <div class="ai-loading-dots"><span></span><span></span><span></span></div>
            <p>TensorFlow.js 모델을 로딩하고 있습니다...</p>
        </div>`;

    try {
        // Ensure we have data
        if (currentPrices.length === 0) await fetchPricesData();
        if (currentNews.length === 0) await fetchNewsData();

        aiSummaryBtn.textContent = '🔍 분석 중...';
        aiSummaryContent.querySelector('.ai-loading p').textContent = 'AI가 뉴스 감성을 분석하고 있습니다...';

        // 1. Analyze headlines with USE
        const headlines = currentNews.slice(0, 15).map(n => n.headline);
        const sentimentResults = await analyzeHeadlineSentiment(headlines);

        // 2. Analyze prices
        const priceAnalysis = analyzePriceData(currentPrices);

        // 3. Compute overall sentiment
        const posCount = sentimentResults.filter(s => s.label === 'positive').length;
        const negCount = sentimentResults.filter(s => s.label === 'negative').length;
        const neuCount = sentimentResults.filter(s => s.label === 'neutral').length;
        const total = sentimentResults.length;
        const posPercent = Math.round((posCount / total) * 100);
        const negPercent = Math.round((negCount / total) * 100);
        const neuPercent = 100 - posPercent - negPercent;

        const avgSentiment = sentimentResults.reduce((sum, s) => sum + s.sentiment, 0) / total;

        // 4. Determine overall market mood
        let overallMood, moodEmoji;
        if (avgSentiment > 0.03 && priceAnalysis.avgChange > 1) {
            overallMood = '매우 긍정적'; moodEmoji = '🚀';
        } else if (avgSentiment > 0.01 || priceAnalysis.avgChange > 0.5) {
            overallMood = '긍정적'; moodEmoji = '📈';
        } else if (avgSentiment < -0.03 && priceAnalysis.avgChange < -1) {
            overallMood = '매우 부정적'; moodEmoji = '🔻';
        } else if (avgSentiment < -0.01 || priceAnalysis.avgChange < -0.5) {
            overallMood = '부정적'; moodEmoji = '📉';
        } else {
            overallMood = '중립적'; moodEmoji = '➡️';
        }

        // 5. Find key topics from headlines
        const topPositive = sentimentResults.filter(s => s.label === 'positive').slice(0, 2);
        const topNegative = sentimentResults.filter(s => s.label === 'negative').slice(0, 2);

        // 6. Render summary
        const symbolNames = { 'BTCUSDT': 'BTC', 'ETHUSDT': 'ETH', 'BNBUSDT': 'BNB', 'SOLUSDT': 'SOL', 'XRPUSDT': 'XRP' };

        let html = `
            <h3>${moodEmoji} 시장 종합 판단: ${overallMood}</h3>
            <p>현재 암호화폐 시장은 <strong>${priceAnalysis.marketTrend}</strong>를 보이고 있으며,
            뉴스 감성은 전반적으로 <strong>${overallMood}</strong>입니다.
            시장 변동성은 <strong>${priceAnalysis.volatilityLabel}</strong> 수준입니다.</p>

            <h3>📊 가격 동향</h3>
            <div class="price-summary-grid">
                ${currentPrices.map(p => `
                    <div class="price-summary-item">
                        <div class="coin-name">${symbolNames[p.symbol] || p.symbol}</div>
                        <div class="coin-change ${p.change >= 0 ? 'up' : 'down'}">
                            ${p.change >= 0 ? '▲' : '▼'} ${Math.abs(p.change).toFixed(2)}%
                        </div>
                    </div>
                `).join('')}
            </div>
            <p>평균 변동률: <strong>${priceAnalysis.avgChange >= 0 ? '+' : ''}${priceAnalysis.avgChange.toFixed(2)}%</strong>
            ${priceAnalysis.maxGainer ? ` | 최고 상승: <strong>${symbolNames[priceAnalysis.maxGainer.symbol]} (+${priceAnalysis.maxGainer.change.toFixed(2)}%)</strong>` : ''}
            ${priceAnalysis.maxLoser ? ` | 최대 하락: <strong>${symbolNames[priceAnalysis.maxLoser.symbol]} (${priceAnalysis.maxLoser.change.toFixed(2)}%)</strong>` : ''}
            </p>

            <h3>🧠 뉴스 감성 분석</h3>
            <div class="sentiment-labels">
                <span><span class="sentiment-dot positive"></span> 긍정 ${posPercent}%</span>
                <span><span class="sentiment-dot neutral"></span> 중립 ${neuPercent}%</span>
                <span><span class="sentiment-dot negative"></span> 부정 ${negPercent}%</span>
            </div>
            <div class="sentiment-bar">
                <div class="sentiment-positive" style="width:${posPercent}%"></div>
                <div class="sentiment-neutral" style="width:${neuPercent}%"></div>
                <div class="sentiment-negative" style="width:${negPercent}%"></div>
            </div>
            <p>${total}개 뉴스 중 긍정 ${posCount}건, 중립 ${neuCount}건, 부정 ${negCount}건으로 분석되었습니다.</p>`;

        if (topPositive.length > 0) {
            html += `<h3>✅ 긍정적 뉴스</h3><ul>`;
            topPositive.forEach(s => {
                html += `<li>${escapeHtml(s.headline)} <em style="color:#48bb78">(+${(s.sentiment * 100).toFixed(1)})</em></li>`;
            });
            html += `</ul>`;
        }

        if (topNegative.length > 0) {
            html += `<h3>⚠️ 주의할 뉴스</h3><ul>`;
            topNegative.forEach(s => {
                html += `<li>${escapeHtml(s.headline)} <em style="color:#fc5c65">(${(s.sentiment * 100).toFixed(1)})</em></li>`;
            });
            html += `</ul>`;
        }

        html += `
            <h3>💡 요약</h3>
            <ul>
                <li>시장 추세: ${priceAnalysis.marketTrend} (평균 ${priceAnalysis.avgChange >= 0 ? '+' : ''}${priceAnalysis.avgChange.toFixed(2)}%)</li>
                <li>뉴스 감성: ${overallMood} (긍정 ${posPercent}% vs 부정 ${negPercent}%)</li>
                <li>변동성: ${priceAnalysis.volatilityLabel} (일중 평균 ${priceAnalysis.volatility.toFixed(1)}%)</li>
            </ul>`;

        aiSummaryContent.innerHTML = html;
        summaryTimestamp.textContent = new Date().toLocaleString('ko-KR');

        aiSummaryBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 3 3v1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v1a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-1H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2v-1a3 3 0 0 1 3-3V6a4 4 0 0 1 4-4z"/>
                <circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M10 17h4"/>
            </svg>
            다시 분석`;
        aiSummaryBtn.classList.add('active');

    } catch (error) {
        console.error('Market analysis error:', error);
        aiSummaryContent.innerHTML = `
            <div style="text-align:center; padding:2rem; color:#fc5c65;">
                <p>⚠️ 분석 중 오류가 발생했습니다.</p>
                <p style="font-size:0.85rem; color:var(--text-secondary)">${escapeHtml(error.message)}</p>
            </div>`;
    }

    aiSummaryBtn.disabled = false;
}

// Fetch prices data (store for AI analysis)
async function fetchPricesData() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
    const promises = symbols.map(symbol =>
        fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`).then(r => r.json())
    );
    const results = await Promise.all(promises);
    currentPrices = results.map(data => ({
        symbol: data.symbol,
        price: parseFloat(data.lastPrice),
        change: parseFloat(data.priceChangePercent),
        high: parseFloat(data.highPrice),
        low: parseFloat(data.lowPrice),
        volume: parseFloat(data.volume)
    }));
    return currentPrices;
}

// Fetch news data (store for AI analysis)
async function fetchNewsData() {
    const response = await fetch(`${API_BASE_URL}/api/news`);
    if (response.ok) {
        currentNews = await response.json();
    }
    return currentNews;
}

// ===== TRANSLATION =====
async function translateText(text, sourceLang = 'en', targetLang = 'ko', retryCount = 0) {
    const cacheKey = `${text}_${sourceLang}_${targetLang}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];

    try {
        const encoded = encodeURIComponent(text.substring(0, 500));
        const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${sourceLang}|${targetLang}`;
        const response = await fetch(url);

        if (response.status === 429 && retryCount < 2) {
            console.warn(`Translation rate limited (429). Retrying in 2 seconds... (Attempt ${retryCount + 1})`);
            await new Promise(r => setTimeout(r, 2000 + (retryCount * 1000)));
            return translateText(text, sourceLang, targetLang, retryCount + 1);
        }

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
    // Translate summary first as a batch, then titles
    for (let i = 0; i < cards.length; i += 2) {
        const batch = Array.from(cards).slice(i, i + 2);
        await Promise.all(batch.map(card => {
            if (!card.querySelector('.translated-text')) {
                return translateCard(card);
            }
            return Promise.resolve();
        }));
        // Increase delay between batches to respect free API limits
        if (i + 2 < cards.length) await new Promise(r => setTimeout(r, 800));
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
        currentPrices = prices;
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

        valueEl.classList.remove('price-flash');
        void valueEl.offsetWidth;
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
        currentNews = news;

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

    const PLACEHOLDER = 'https://placehold.co/400x200/1a1f3f/f7931a?text=Crypto+News';
    const imageUrl = article.image || PLACEHOLDER;
    const date = new Date(article.datetime * 1000);
    const formattedDate = formatDate(date);

    card.innerHTML = `
        <img src="${imageUrl}" alt="${escapeHtml(article.headline)}" class="news-image"
             onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
        <div class="news-content">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                <span class="news-source">${escapeHtml(article.source)}</span>
                <button class="btn-card-translate" onclick="translateCard(this.closest('.news-card'))">🌐 번역</button>
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
aiSummaryBtn.addEventListener('click', generateMarketSummary);
closeSummaryBtn.addEventListener('click', () => {
    aiSummaryPanel.classList.add('hidden');
    aiSummaryBtn.classList.remove('active');
    aiSummaryBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 3 3v1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v1a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-1H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2v-1a3 3 0 0 1 3-3V6a4 4 0 0 1 4-4z"/>
            <circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M10 17h4"/>
        </svg>
        AI 시장 분석`;
});

// ===== INITIAL LOAD =====
fetchPrices();
fetchNews();

// Auto-refresh prices every 10 seconds
setInterval(fetchPrices, 10 * 1000);

// Auto-refresh news every 5 minutes
setInterval(fetchNews, 5 * 60 * 1000);
