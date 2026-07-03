const LarkService = {
    async getTenantAccessToken(appId, appSecret, forceRefresh = false) {
        // 1. Check Cache
        if (!forceRefresh) {
            const cached = await chrome.storage.local.get(['larkToken', 'tokenExpiry']);
            if (cached.larkToken && cached.tokenExpiry && Date.now() < cached.tokenExpiry) {
                return cached.larkToken;
            }
        }

        const url = 'https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal';
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify({
                    "app_id": appId,
                    "app_secret": appSecret
                })
            });

            const data = await response.json();
            if (data.code !== 0) {
                throw new Error(`Auth Error: ${data.msg} `);
            }

            // Cache token (Valid for 2 hours usually)
            // Subtract 5 mins buffer for safety
            await chrome.storage.local.set({
                'larkToken': data.tenant_access_token,
                'tokenExpiry': Date.now() + (data.expire * 1000) - 300000
            });

            return data.tenant_access_token;
        } catch (e) {
            console.error("Auth Fetch Failed:", url, e);
            throw e;
        }
    },

    async searchOrdersByEmails(token, appToken, tableId, emails) {
        if (!emails || emails.length === 0) return {};

        // 1. Chunking (Limit 50 conditions per request)
        const CHUNK_SIZE = 50;
        const chunks = [];
        for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
            chunks.push(emails.slice(i, i + CHUNK_SIZE));
        }

        let allRecords = [];

        // 2. Search chunks in parallel
        await Promise.all(chunks.map(async (chunk) => {
            const url = `https://open.larksuite.com/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`;

            // Construct Filter Conditions
            const conditions = chunk.map(email => ({
                field_name: "email",
                operator: "is",
                value: [email]
            }));

            const body = {
                field_names: ["email", "order_id"],
                filter: {
                    conjunction: "or",
                    conditions: conditions
                },
                automatic_fields: false
            };

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    body: JSON.stringify(body)
                });

                if (response.status === 401) throw new Error("Token Expired");

                const data = await response.json();
                if (data.code === 0 && data.data && data.data.items) {
                    allRecords = allRecords.concat(data.data.items);
                } else if (data.code !== 0) {
                    console.error("Lark Search Error:", data);
                }
            } catch (err) {
                console.error("Chunk Fetch Error:", err);
            }
        }));

        // 3. Process Results
        const results = {};
        allRecords.forEach(record => {
            const emailVal = this.extractText(record.fields.email);
            const orderVal = this.extractText(record.fields.order_id);

            if (emailVal && orderVal) {
                if (!results[emailVal]) results[emailVal] = [];
                if (!results[emailVal].includes(orderVal)) results[emailVal].push(orderVal);
            }
        });

        return results;
    },

    extractText(field) {
        if (!field) return null;
        if (typeof field === 'string') return field;
        if (Array.isArray(field) && field[0] && field[0].text) return field[0].text;
        if (typeof field === 'object') return field.text || field.name || null;
        return JSON.stringify(field);
    }
};
