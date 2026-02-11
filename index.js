require('dotenv').config();
const fetch = require('node-fetch');

const API_KEY = process.env.FINNHUB_API_KEY || 'YOUR_FINNHUB_API_KEY';

async function getBitcoinNews() {
  try {
    console.log('🔍 Fetching crypto news from Finnhub...\n');
    
    // Fetching general market news, often includes crypto
    const response = await fetch(`https://finnhub.io/api/v1/news?category=crypto&token=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      console.log('No news articles found.');
      return;
    }
    
    // Display the first 3 news articles
    const topNews = data.slice(0, 3);
    
    topNews.forEach((article, index) => {
      console.log(`📰 Article ${index + 1}:`);
      console.log(`   Title: ${article.headline}`);
      console.log(`   Source: ${article.source}`);
      console.log(`   URL: ${article.url}`);
      console.log(`   Published: ${new Date(article.datetime * 1000).toLocaleString()}`);
      console.log(`   Summary: ${article.summary?.substring(0, 150)}...`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error fetching news:', error.message);
    
    if (API_KEY === 'YOUR_FINNHUB_API_KEY') {
      console.log('\n⚠️  Please set your Finnhub API key in the .env file');
      console.log('   Get your free API key at: https://finnhub.io/register');
    }
  }
}

getBitcoinNews();
