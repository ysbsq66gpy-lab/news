// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : '';

// DOM Elements
const newsContainer = document.getElementById('newsContainer');
const refreshBtn = document.getElementById('refreshBtn');

// Fetch and display news
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

// Display news cards
function displayNews(newsArray) {
    newsContainer.innerHTML = '';

    newsArray.forEach((article, index) => {
        const card = createNewsCard(article, index);
        newsContainer.appendChild(card);
    });
}

// Create a news card element
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

// Show loading state
function showLoading() {
    newsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>뉴스를 불러오는 중...</p>
        </div>
    `;
}

// Show error message
function showError(message) {
    newsContainer.innerHTML = `
        <div class="error">
            <h2>⚠️ 오류 발생</h2>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

// Format date to Korean format
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

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event Listeners
refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('spinning');
    fetchNews().finally(() => {
        setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
    });
});

// Initial load
fetchNews();

// Auto-refresh every 5 minutes
setInterval(fetchNews, 5 * 60 * 1000);
