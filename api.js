const API = {
    // --- Anousith ---
    anousith: {
        endpoint: 'https://pro.api.anousith.express/graphql',
        async search(phone, token) {
            const query = `
query ItemsV2($where: ItemV2WhereInput, $skip: Int, $noLimit: Boolean, $limit: Int, $orderBy: OrderByItem) {
  itemsV2(
    where: $where
    skip: $skip
    noLimit: $noLimit
    limit: $limit
    orderBy: $orderBy
  ) {
    total
    data {
      _id
      trackingId
      receiverName
      receiverPhone
      createdDate
      itemStatus
      packagePrice
      destProvinceId {
        provinceName
      }
      destBranchId {
        branch_name
      }
    }
  }
}`;
            const variables = { where: { searchMultiple: phone, isDeleted: 0 }, limit: 5, orderBy: "originReceiveDate_DESC" };
            const body = { operationName: "ItemsV2", variables: variables, query: query };

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify(body)
            });
            const json = await response.json();
            if (json.errors) throw new Error(JSON.stringify(json.errors));
            return json.data?.itemsV2?.data || [];
        }
    },

    // --- HAL ---
    hal: {
        endpoint: 'https://hal.hal-logistics.la/api/v2/auth/customer/store/search-branches',
        async search(phone, token) {
            const url = `${this.endpoint}?phone_number=${phone}&is_active=true`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const json = await response.json();
            // Assuming structure based on API name 'search-branches'
            // Usually HAL returns data in a field like 'data' or 'items'
            // We will attempt to find branch/province info in common fields
            const data = json.data || json.items || (Array.isArray(json) ? json : []);

            // Map to standard format: {pName, bName}
            return data.map(item => {
                // User specifies: take 'name' and 'detail', combine them, 
                // and then cut off the string after the last '|'
                const nameStr = item.name || '';
                const detailStr = item.detail || '';

                let rawFull = nameStr;
                if (detailStr) {
                    // Combine name and detail. Detail usually starts with ' | ' or similar.
                    rawFull = `${nameStr}${detailStr}`;
                }

                // Split by '|' and join with comma
                const parts = rawFull.split('|').map(s => s.trim()).filter(Boolean);
                const processedName = parts.join(', ');

                // Return pName (Province) for reference/translation
                const pName = item.village?.district?.province?.name || '';

                return {
                    bName: processedName,
                    pName: pName
                };
            });
        }
    },

    // --- Lark ---
    lark: {
        async getToken(appId, appSecret) {
            const res = await fetch('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_id: appId, app_secret: appSecret })
            });
            const data = await res.json();
            return data.tenant_access_token;
        },
        async getAllRecords(token, appToken, tableId) {
            let records = []; let pageToken = ''; let hasMore = true; let count = 0; const MAX_RECORDS = 500;
            while (hasMore && count < MAX_RECORDS) {
                const url = `https://open.larksuite.com/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=100${pageToken ? '&page_token=' + pageToken : ''}`;
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                if (data.code !== 0) throw new Error(data.msg);
                if (data.data.items) { records = records.concat(data.data.items); count += data.data.items.length; }
                hasMore = data.data.has_more; pageToken = data.data.page_token;
            }
            return records;
        }
    },

    // --- Gemini ---
    gemini: {
        config: {
            apiKey: null,
            model: 'gemini-2.5-flash-lite'
        },

        async _call(apiKey, model, prompt) {
            // Resolve API key: param -> config -> chrome.storage
            let finalKey = apiKey || this.config.apiKey || null;
            let finalModel = model || this.config.model || 'gemini-2.5-flash-lite';

            if ((!finalKey || !finalModel) && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                try {
                    const items = await new Promise(res => chrome.storage.local.get(['geminiApiKey', 'geminiModel'], res));
                    finalKey = finalKey || items.geminiApiKey || null;
                    finalModel = finalModel || items.geminiModel || finalModel;
                } catch (e) { /* ignore storage errors */ }
            }

            if (!finalKey) throw new Error('No Gemini API key configured. Set it in extension options.');

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${finalKey}`;
            const MAX_RETRIES = 3;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                if (!response.ok) {
                    const err = await response.text();
                    if (response.status === 403 && /dunning/i.test(err)) {
                        throw new Error(
                            `Gemini API key bị Google từ chối do vấn đề thanh toán (billing) trên project Google Cloud gắn với key này (lỗi "Lightning dunning decision is deny"). ` +
                            `Đây không phải lỗi của extension - cần vào https://console.cloud.google.com/billing kiểm tra/khôi phục billing cho project đó, hoặc tạo API key Gemini mới từ một project khác đang hoạt động bình thường, rồi cập nhật lại trong phần Cài đặt của extension.`
                        );
                    }
                    if (response.status === 503 && attempt < MAX_RETRIES) {
                        await new Promise(res => setTimeout(res, attempt * 1000));
                        continue;
                    }
                    throw new Error(`API Error ${response.status}: ${err}`);
                }
                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            }
        },

        async testConnection(apiKey, model) {
            try {
                const res = await this._call(apiKey, model, "Say 'OK' if you can hear me.");
                return { success: true, message: res };
            } catch (e) {
                return { success: false, message: e.message };
            }
        },

        async findMatch(apiKey, model, userQuery, records) {
            return this.findLarkMatch(apiKey, model, userQuery, records);
        },

        async findLarkMatch(apiKey, model, userQuery, records) {
            const candidateList = records.map(r => ({
                id: r.record_id,
                p: r.fields['Province Name'] || r.fields['tinh'] || '',
                d: r.fields['District Name'] || '',
                b: r.fields['Branch Name'] || r.fields['branch_address'] || ''
            })).slice(0, 300);

            const prompt = `Analyze: "${userQuery}"
            Database: ${JSON.stringify(candidateList)}
            
            Strict Rules:
            1. IDENTIFY Province (P) and District (D) from Input.
            2. FILTER Database:
               - Priority A: Match P AND Match D. Return ALL matching branches.
               - Priority B: Match P but NO Match D. Return ALL branches in P.
               - Priority C: MATCH D (District) even if P is unknown/missing. Return ALL matches in D.
            3. OUTPUT: JSON Array of matching Record IDs (strings).
               Example: ["rec123", "rec456"] or [] if no match.`;

            try {
                const res = await this._call(apiKey, model, prompt);
                const jsonStr = res.replace(/```json/g, '').replace(/```/g, '').trim();
                const items = JSON.parse(jsonStr);
                return Array.isArray(items) ? items : [];
            } catch (e) {
                console.error("Lark Match Error", e);
                return [];
            }
        },

        async pickAnousithMatch(apiKey, model, userQuery, items) {
            if (!items || items.length === 0) return null;
            const simpleItems = items.map(i => ({
                id: i._id,
                p: i.destProvinceId?.provinceName || '',
                b: i.destBranchId?.branch_name || ''
            }));

            const prompt = `Task: Match Input Address to Candidate List.
            Input: "${userQuery}"
            Candidates: ${JSON.stringify(simpleItems)}
            
            Instruction:
            - Input is likely in Lao. Candidates may be in Lao or English (Latin).
            - Find the Candidate that matches the Input's Province and Branch/District.
            - Return the ID of the Best Match.
            - If no good match, return "null".
            
            Output: ID_STRING or "null"`;

            try {
                const res = await this._call(apiKey, model, prompt);
                const id = res.trim().replace(/"/g, '');
                if (id === 'null') return null;
                return items.find(i => i._id === id);
            } catch (e) { return null; }
        },

        async translate(apiKey, model, text) {
            if (!text) return '';
            const prompt = `Task: Translate the following Lao text to Vietnamese. 
            Rules:
            - Translate literally and accurately.
            - Do NOT add any extra information, notes, or explanations.
            - If it's a place name, use the standard Vietnamese equivalent.
            - Output should be ONLY the translated text.
            Input: "${text}"`;
            try {
                const result = await this._call(apiKey, model, prompt);
                return result || text;
            } catch (e) { return text; }
        },

        async translateWithMapping(apiKey, model, text) {
            if (!text) return [];
            const prompt = `Task: Segment and Translate Lao text to Vietnamese.
            Input: "${text}"
            Rules:
            1. Segment the input into logical parts (words or phrases).
            2. Translate each part to Vietnamese.
            3. DO NOT add any information not present in the input. 
            4. DO NOT attempt to fix or complete the address if it is partial.
            5. Return JSON: [{"o": "OriginalWord", "t": "TranslatedWord"}, ...]
            6. Output MUST be strictly JSON only.`;

            try {
                const res = await this._call(apiKey, model, prompt);
                const jsonStr = res.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(jsonStr);
            } catch (e) {
                console.error("Mapping failed", e);
                throw e;
            }
        },

        async translateBatch(apiKey, model, inputAddress, ansList) {
            // ansList: [{bName, pName}, ...]
            const dataToTranslate = {
                input: inputAddress,
                ansResults: ansList
            };

            const prompt = `Task: Translate and process a set of Lao addresses to Vietnamese.
            
            1. For "input": Segment it into logical parts and translate each part.
            2. For each item in "ansResults": Translate bName and pName accurately. Do NOT add extra info.
            
            Data: ${JSON.stringify(dataToTranslate)}
            
            JSON Output Format:
            {
               "inputMapping": [{"o": "WordLao", "t": "WordViet"}, ...],
               "ansResultsTrans": [{"bTrans": "...", "pTrans": "..."}, ...]
            }
            
            Rules:
            - Output MUST be strictly JSON. No text before or after.
            - Translate literally, don't hallucinate extra context.`;

            try {
                const res = await this._call(apiKey, model, prompt);
                const jsonStr = res.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(jsonStr);
            } catch (e) {
                console.error("Batch translate failed", e);
                throw e;
            }
        }
    }

};

