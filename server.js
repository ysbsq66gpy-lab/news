require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.FINNHUB_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API endpoint to fetch crypto prices from Binance
app.get('/api/prices', async (req, res) => {
    try {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
        const promises = symbols.map(symbol =>
            axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`)
        );
        const responses = await Promise.all(promises);
        const prices = responses.map(r => ({
            symbol: r.data.symbol,
            price: parseFloat(r.data.lastPrice),
            change: parseFloat(r.data.priceChangePercent),
            high: parseFloat(r.data.highPrice),
            low: parseFloat(r.data.lowPrice),
            volume: parseFloat(r.data.volume)
        }));
        res.json(prices);
    } catch (error) {
        console.error('Error fetching prices:', error.message);
        res.status(500).json({ error: 'Failed to fetch prices', message: error.message });
    }
});

// API endpoint to fetch crypto news
app.get('/api/news', async (req, res) => {
    try {
        if (!API_KEY || API_KEY === 'YOUR_FINNHUB_API_KEY') {
            return res.status(500).json({
                error: 'API key not configured',
                message: 'Please set FINNHUB_API_KEY in environment variables'
            });
        }

        const response = await fetch(
            `https://finnhub.io/api/v1/news?category=crypto&token=${API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({
            error: 'Failed to fetch news',
            message: error.message
        });
    }
});

// Image proxy for AI analysis (bypasses CORS)
app.get('/api/proxy-image', async (req, res) => {
    try {
        const imageUrl = req.query.url;
        if (!imageUrl) return res.status(400).json({ error: 'Missing url parameter' });

        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const contentType = response.headers['content-type'] || 'image/jpeg';
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=3600');
        res.send(Buffer.from(response.data));
    } catch (error) {
        console.error('Image proxy error:', error.message);
        res.status(500).json({ error: 'Failed to proxy image' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
