// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : '';

// DOM Elements
const newsContainer = document.getElementById('newsContainer');
const refreshBtn = document.getElementById('refreshBtn');

// ===== PRICE TICKER =====
async function fetchPrices() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/prices`);
        if (!response.ok) throw new Error('Failed to fetch prices');
        const prices = await response.json();
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
        <img src="${imageUrl}" alt="${escapeHtml(article.headline)}" class="news-image"
             onerror="this.src='https://via.placeholder.com/400x200/1a1f3f/f7931a?text=Crypto+News'">
        <div class="news-content">
            <span class="news-source">${escapeHtml(article.source)}</span>
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

// ===== INITIAL LOAD =====
fetchPrices();
fetchNews();

// Auto-refresh prices every 10 seconds
setInterval(fetchPrices, 10 * 1000);

// Auto-refresh news every 5 minutes
setInterval(fetchNews, 5 * 60 * 1000);

