// File: proxy-server.js
// This is the backend proxy server needed to bypass CORS.

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());

app.get('/api/market-data', async (req, res) => {
    try {
        const graphqlQuery = {
            query: `
                query GetMarketBySlug($slug: String!) {
                    marketBySlug(slug: $slug) {
                        id, question, slug, outcomes { id, index, title, ticker, price },
                        strikePrice, referenceAsset, clobTokenId
                    }
                }
            `,
            variables: { slug: "bitcoin-up-or-down-september-27-9pm-et" }
        };

        const response = await axios.post('https://gamma-api.polymarket.com/query', graphqlQuery, {
            headers: { 'Content-Type': 'application/json' }
        });

        res.json(response.data);

    } catch (error) {
        console.error('Error fetching from Polymarket API:', error.message);
        res.status(500).json({ error: 'Failed to fetch data from Polymarket API' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Polymarket data proxy server running at http://localhost:${PORT}`);
});