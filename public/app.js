// ===== FIREBASE CONFIGURATION =====
const firebaseConfig = {
    apiKey: "AIzaSyBiH3RTqyi0WTDpO34mWroTO9E_Kl0DnMI",
    authDomain: "login-6871e.firebaseapp.com",
    projectId: "login-6871e",
    storageBucket: "login-6871e.firebasestorage.app",
    messagingSenderId: "296005361292",
    appId: "1:296005361292:web:da445604d63c54c693a5a9",
    measurementId: "G-9Q9DD0QM2Y"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

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

// Auth DOM
const authBtn = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authModalTitle = document.getElementById('authModalTitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authSwitchBtn = document.getElementById('authSwitchBtn');
const authSwitchText = document.getElementById('authSwitchText');
const authError = document.getElementById('authError');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const inlineLoginBtn = document.getElementById('inlineLoginBtn');

// Comments DOM
const commentsContainer = document.getElementById('commentsContainer');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentAvatar = document.getElementById('commentAvatar');
const charCount = document.getElementById('charCount');
const submitCommentBtn = document.getElementById('submitCommentBtn');
const loginPrompt = document.getElementById('loginPrompt');
const commentCount = document.getElementById('commentCount');

// YouTube DOM
const youtubeContainer = document.getElementById('youtubeContainer');
const refreshVideosBtn = document.getElementById('refreshVideosBtn');

// State
let isTranslatedMode = false;
const translationCache = {};
let useModel = null;
let currentPrices = [];
let currentNews = [];
let isLoginMode = true;
let currentUser = null;

// ===== FIREBASE AUTH =====
auth.onAuthStateChanged(user => {
    currentUser = user;
    updateAuthUI(user);
});

function updateAuthUI(user) {
    if (user) {
        const displayName = user.displayName || user.email.split('@')[0];
        const initial = displayName.charAt(0).toUpperCase();
        authBtn.innerHTML = `
            <div class="user-avatar-small">${initial}</div>
            ${escapeHtml(displayName)}`;
        authBtn.classList.add('logged-in');
        authBtn.onclick = showUserMenu;

        // Show comment form, hide login prompt
        loginPrompt.classList.add('hidden');
        commentForm.classList.remove('hidden');
        commentAvatar.textContent = initial;
    } else {
        authBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
            로그인`;
        authBtn.classList.remove('logged-in');
        authBtn.onclick = () => openAuthModal(true);

        loginPrompt.classList.remove('hidden');
        commentForm.classList.add('hidden');
    }
}

function openAuthModal(login = true) {
    isLoginMode = login;
    authModal.classList.remove('hidden');
    authError.classList.add('hidden');
    authForm.reset();

    if (login) {
        authModalTitle.textContent = '로그인';
        authSubmitBtn.textContent = '로그인';
        authSwitchText.textContent = '계정이 없으신가요?';
        authSwitchBtn.textContent = '회원가입';
    } else {
        authModalTitle.textContent = '회원가입';
        authSubmitBtn.textContent = '가입하기';
        authSwitchText.textContent = '이미 계정이 있으신가요?';
        authSwitchBtn.textContent = '로그인';
    }
}

function closeModal() {
    authModal.classList.add('hidden');
}

function showAuthError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
}

function showUserMenu() {
    if (!currentUser) return;
    const confirmed = confirm(`${currentUser.email}\n\n로그아웃 하시겠습니까?`);
    if (confirmed) {
        auth.signOut();
    }
}

// Auth Event Listeners
closeAuthModal.addEventListener('click', closeModal);
authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeModal();
});

authSwitchBtn.addEventListener('click', () => {
    openAuthModal(!isLoginMode);
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.add('hidden');
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = '처리 중...';

    const email = authEmail.value.trim();
    const password = authPassword.value;

    try {
        if (isLoginMode) {
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            await cred.user.updateProfile({ displayName: email.split('@')[0] });
        }
        closeModal();
    } catch (error) {
        const messages = {
            'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
            'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
            'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
            'auth/user-not-found': '등록되지 않은 이메일입니다.',
            'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
            'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
            'auth/too-many-requests': '너무 많은 시도입니다. 잠시 후 다시 시도하세요.',
            'auth/api-key-not-valid.-please-pass-a-valid-api-key.': '⚠️ Firebase API 키가 설정되지 않았습니다. .env 파일에서 Firebase 설정을 확인하세요.'
        };
        showAuthError(messages[error.code] || error.message);
    }

    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = isLoginMode ? '로그인' : '가입하기';
});

googleSignInBtn.addEventListener('click', async () => {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
        closeModal();
    } catch (error) {
        if (error.code === 'auth/popup-closed-by-user') return;
        showAuthError(error.message);
    }
});

authBtn.addEventListener('click', () => {
    if (!currentUser) openAuthModal(true);
});

inlineLoginBtn?.addEventListener('click', () => openAuthModal(true));

// ===== COMMUNITY COMMENTS (Firestore) =====
const COMMENTS_COLLECTION = 'crypto_comments';

async function loadComments() {
    try {
        const snapshot = await db.collection(COMMENTS_COLLECTION)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        const comments = [];
        snapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });

        commentCount.textContent = `${comments.length}개의 댓글`;
        renderComments(comments);
    } catch (error) {
        console.error('Comments load error:', error);
        commentsContainer.innerHTML = `
            <div class="comments-empty">
                <p>💬 첫 번째 댓글을 남겨보세요!</p>
                <p class="text-muted">Firebase 연결 후 커뮤니티 기능이 활성화됩니다.</p>
            </div>`;
        commentCount.textContent = '0개의 댓글';
    }
}

function renderComments(comments) {
    if (comments.length === 0) {
        commentsContainer.innerHTML = `
            <div class="comments-empty">
                <p>💬 아직 댓글이 없습니다</p>
                <p class="text-muted">첫 번째 댓글을 남겨보세요!</p>
            </div>`;
        return;
    }

    commentsContainer.innerHTML = comments.map(c => {
        const initial = (c.authorName || '?').charAt(0).toUpperCase();
        const date = c.createdAt?.toDate ? c.createdAt.toDate() : new Date();
        const timeAgo = formatDate(date);
        const isOwn = currentUser && currentUser.uid === c.authorId;

        return `
            <div class="comment-item ${isOwn ? 'own' : ''}">
                <div class="comment-avatar-wrapper">
                    <div class="comment-avatar-icon">${initial}</div>
                </div>
                <div class="comment-body">
                    <div class="comment-meta">
                        <span class="comment-author">${escapeHtml(c.authorName || '익명')}</span>
                        <span class="comment-time">${timeAgo}</span>
                    </div>
                    <p class="comment-text">${escapeHtml(c.text)}</p>
                    ${isOwn ? `<button class="btn-delete-comment" onclick="deleteComment('${c.id}')">삭제</button>` : ''}
                </div>
            </div>`;
    }).join('');
}

async function submitComment(e) {
    e.preventDefault();
    if (!currentUser) return openAuthModal(true);

    const text = commentInput.value.trim();
    if (!text) return;

    submitCommentBtn.disabled = true;
    submitCommentBtn.textContent = '게시 중...';

    try {
        await db.collection(COMMENTS_COLLECTION).add({
            text: text,
            authorId: currentUser.uid,
            authorName: currentUser.displayName || currentUser.email.split('@')[0],
            authorEmail: currentUser.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        commentInput.value = '';
        charCount.textContent = '0/500';
        await loadComments();
    } catch (error) {
        console.error('Comment submit error:', error);
        alert('댓글 작성에 실패했습니다.');
    }

    submitCommentBtn.disabled = false;
    submitCommentBtn.textContent = '💬 댓글 작성';
}

async function deleteComment(commentId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
        await db.collection(COMMENTS_COLLECTION).doc(commentId).delete();
        await loadComments();
    } catch (error) {
        console.error('Delete error:', error);
    }
}

commentForm.addEventListener('submit', submitComment);
commentInput.addEventListener('input', () => {
    charCount.textContent = `${commentInput.value.length}/500`;
});

// ===== YOUTUBE CRYPTO VIDEOS =====
const YOUTUBE_SEARCH_QUERIES = [
    'bitcoin analysis today',
    'cryptocurrency market update',
    'crypto trading strategy',
    'ethereum news today',
    'bitcoin price prediction'
];

// Curated list of crypto YouTube channels/videos (no API key needed)
const CRYPTO_VIDEOS = [
    { id: 'Lhf_2gJJS1I', title: 'Bitcoin 최신 시장 분석', channel: 'CoinDesk' },
    { id: 'rYQgy8QDEBI', title: '암호화폐 시장 동향', channel: 'Coin Bureau' },
    { id: 'GIlEOrQlZOk', title: 'BTC 기술적 분석', channel: 'DataDash' },
    { id: 'Yb6825iv0Vk', title: '이더리움 업데이트', channel: 'Bankless' },
    { id: 'mQke4waGbDA', title: '코인 시장 전망', channel: 'Ben Cowen' },
    { id: '41JCpzvnn_0', title: '크립토 뉴스 브리핑', channel: 'CryptosRUs' }
];

let ytPlayers = {};

function onYouTubeIframeAPIReady() {
    console.log('YouTube IFrame API ready');
}

function renderYouTubeVideos() {
    // Shuffle and pick 4 videos
    const shuffled = [...CRYPTO_VIDEOS].sort(() => Math.random() - 0.5).slice(0, 4);

    youtubeContainer.innerHTML = shuffled.map((video, idx) => `
        <div class="youtube-card">
            <div class="youtube-thumb" id="ytPlayer${idx}" data-video-id="${video.id}">
                <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg"
                     alt="${escapeHtml(video.title)}"
                     class="youtube-thumbnail"
                     onerror="this.src='https://placehold.co/320x180/1a1f3f/f7931a?text=Video'">
                <div class="youtube-play-btn" onclick="playVideo('${video.id}', 'ytPlayer${idx}')">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>
            </div>
            <div class="youtube-info">
                <h3 class="youtube-title">${escapeHtml(video.title)}</h3>
                <span class="youtube-channel">${escapeHtml(video.channel)}</span>
            </div>
        </div>
    `).join('');
}

function playVideo(videoId, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    container.classList.add('playing');

    if (typeof YT !== 'undefined' && YT.Player) {
        ytPlayers[containerId] = new YT.Player(containerId, {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                autoplay: 1,
                modestbranding: 1,
                rel: 0
            }
        });
    } else {
        // Fallback to iframe
        container.innerHTML = `
            <iframe width="100%" height="100%"
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0"
                frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }
}

refreshVideosBtn.addEventListener('click', () => {
    // Destroy existing players
    Object.values(ytPlayers).forEach(p => {
        if (p && p.destroy) p.destroy();
    });
    ytPlayers = {};
    renderYouTubeVideos();
});

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
async function translateText(text, sourceLang = 'en', targetLang = 'ko') {
    const cacheKey = `${text}_${sourceLang}_${targetLang}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];

    try {
        const encoded = encodeURIComponent(text);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encoded}`;
        const response = await fetch(url);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        if (data && data[0]) {
            const translated = data[0].map(item => item[0]).join('');
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
    // Batched translation for efficiency
    for (let i = 0; i < cards.length; i += 3) {
        const batch = Array.from(cards).slice(i, i + 3);
        await Promise.all(batch.map(card => {
            if (!card.querySelector('.translated-text')) {
                return translateCard(card);
            }
            return Promise.resolve();
        }));
        if (i + 3 < cards.length) await new Promise(r => setTimeout(r, 400));
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
renderYouTubeVideos();
loadComments();

// Auto-refresh prices every 10 seconds
setInterval(fetchPrices, 10 * 1000);

// Auto-refresh news every 5 minutes
setInterval(fetchNews, 5 * 60 * 1000);
