document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const mainView = document.getElementById('mainView');
    const settingsView = document.getElementById('settingsView');
    const openPanelBtn = document.getElementById('openPanelBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const phoneInput = document.getElementById('phoneInput');
    const addressInput = document.getElementById('addressInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultsArea = document.getElementById('resultsArea');

    // Settings elements
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const settingsStatus = document.getElementById('settingsStatus');
    const inpLarkAppId = document.getElementById('larkAppId');
    const inpLarkAppSecret = document.getElementById('larkAppSecret');
    const inpAnousithToken = document.getElementById('anousithToken');


    // Test API Button


    const LARK_APP_TOKEN = 'IA0ybZRGmaI18gs59XLlUkYHgtc';
    const LARK_TABLE_ID = 'tblLHdQEmn3AEoYi';

    // --- State Management ---
    function switchView(viewName) {
        if (viewName === 'settings') {
            mainView.style.display = 'none';
            settingsView.style.display = 'block';
            settingsBtn.style.display = 'none';
            openPanelBtn.style.display = 'none';
            loadSettings();
        } else {
            settingsView.style.display = 'none';
            mainView.style.display = 'block';
            settingsBtn.style.display = 'block';
            openPanelBtn.style.display = 'block';
        }
    }

    function showStatus(msg, type = 'success') {
        settingsStatus.textContent = msg;
        settingsStatus.className = 'status-msg ' + (type === 'error' ? 'error' : 'success');
        setTimeout(() => { settingsStatus.textContent = ''; }, 3000);
    }

    function loadSettings() {
        chrome.storage.local.get([
            'larkAppId', 'larkAppSecret', 'anousithToken'
        ], (items) => {
            inpLarkAppId.value = items.larkAppId || '';
            inpLarkAppSecret.value = items.larkAppSecret || '';
            inpAnousithToken.value = items.anousithToken || '';
        });
    }

    function saveSettings() {
        const config = {
            larkAppId: inpLarkAppId.value.trim(),
            larkAppSecret: inpLarkAppSecret.value.trim(),
            anousithToken: inpAnousithToken.value.trim()
        };
        chrome.storage.local.set(config, () => {
            showStatus('Đã lưu cấu hình!');
            setTimeout(() => switchView('main'), 800);
        });
    }




    // --- Helpers ---
    const STATUS_MAP = {
        'complete': 'Hoàn thành', 'pending': 'Đang chờ', 'return': 'Hoàn trả',
        'cancel': 'Đã hủy', 'delivering': 'Đang giao', 'received': 'Đã nhận', 'warehouse': 'Tại kho'
    };
    function translateStatus(s) { return STATUS_MAP[(s || '').toLowerCase()] || s || 'Unknown'; }

    // --- Render ---
    function renderAnousithCard(item) {
        return `
            <div class="result-card" id="card-${item._id}">
                <div class="card-header" style="justify-content: flex-start; gap: 8px;">
                    <span class="source-badge badge-anousith">Anousith Match</span>
                </div>
                
                 <!-- Key Fields Highlighted -->
                 <div class="highlight-section" style="background: #FFF5F5; padding: 10px; border-radius: 8px; margin-top: 8px; border: 1px solid #FFD8D8;">
                     <div class="info-row" style="margin-bottom: 8px;">
                        <span class="info-label" style="font-weight: 700; color: #E63946;">Tỉnh/TP Đích</span>
                        <div class="info-value text-select" style="font-size: 14px;">
                            <div id="trans-province-${item._id}" style="font-weight: 700;">...</div>
                            <div style="font-size: 11px; color: #888;">${item.destProvinceId?.provinceName || '---'}</div>
                        </div>
                     </div>
                     <div class="info-row">
                        <span class="info-label" style="font-weight: 700; color: #E63946;">Chi nhánh (Huyện)</span>
                         <div class="info-value text-select" style="font-size: 14px;">
                            <div id="trans-branch-${item._id}" style="font-weight: 700;">...</div>
                            <div style="font-size: 11px; color: #888;">${item.destBranchId?.branch_name || '---'}</div>
                        </div>
                     </div>
                 </div>
            </div>`;
    }

    function renderLarkCard(data) {
        return `
            <div class="result-card">
                <div class="card-header"><span class="source-badge badge-lark">Lark (AI Match)</span></div>
                <div class="highlight-section" style="padding: 5px;">
                    <div class="info-row"><span class="info-label">Tỉnh</span><span class="info-value text-select" style="font-weight:700;">${data.tinh || '---'}</span></div>
                    <div class="info-row"><span class="info-label">Chi nhánh</span><span class="info-value text-select" style="font-weight:700;">${data.branch_address || '---'}</span></div>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 8px 0;">
                    <div class="info-row"><span class="info-label">Chi tiết</span><span class="info-value text-select">${data.address_info || '---'}</span></div>
                </div>
            </div>`;
    }

    // --- Search Handler ---
    // --- Search Handler ---
    searchBtn.addEventListener('click', () => {
        const phone = phoneInput.value.trim();
        const address = addressInput.value.trim();

        if (!phone || !address) {
            resultsArea.innerHTML = `<div class="msg-error">Vui lòng nhập cả SĐT và Địa chỉ!</div>`;
            return;
        }

        searchBtn.classList.add('loading');
        searchBtn.disabled = true;
        resultsArea.innerHTML = '';

        // Helper: Extract content within parentheses (District)
        function getDistrictFromBranch(branchName) {
            const match = branchName.match(/\(([^)]+)\)/);
            return match ? match[1].trim().toLowerCase() : '';
        }

        // Helper: Check match (Province Priority > District)
        function isMatch(item, userAddrSpan) {
            const userAddr = userAddrSpan.toLowerCase();
            const provinceName = (item.destProvinceId?.provinceName || '').toLowerCase();
            const branchName = (item.destBranchId?.branch_name || '').toLowerCase();
            const districtName = getDistrictFromBranch(branchName);

            // 1. Province Match Check (Loose)
            // Handle "Vientiane Capital" vs "Vientiane"
            const pMatch = userAddr.includes(provinceName) || provinceName.includes(userAddr) ||
                (provinceName.includes('vientiane') && userAddr.includes('vientiane'));

            if (!pMatch) return false;

            // 2. District Match Check (if district exists in branch name)
            if (districtName) {
                return userAddr.includes(districtName);
            }

            // If no district in branch name, assume match if province matches (or could be strict?)
            // Policy: "khớp theo tỉnh và huyện". If district missing in data, maybe just return true?
            // Let's accept it if province matches and we can't verify district.
            return true;
        }

        chrome.storage.local.get(['anousithToken', 'larkAppId', 'larkAppSecret'], async (cfg) => {
            let found = false;
            let htmlBuffer = '';

            try {
                // 1. Anousith Search
                if (!cfg.anousithToken) htmlBuffer += `<div class="msg-error">Thiếu token Anousith</div>`;
                else {
                    try {
                        const items = await API.anousith.search(phone, cfg.anousithToken);

                        // Filter items based on Address
                        const matchingItems = items.filter(item => isMatch(item, address));

                        if (matchingItems.length > 0) {
                            found = true;
                            // Only render matching items
                            matchingItems.forEach(item => { htmlBuffer += renderAnousithCard(item); });
                            resultsArea.innerHTML = htmlBuffer;

                            // Translations
                            matchingItems.forEach(async (item) => {
                                const pName = item.destProvinceId?.provinceName || '';
                                const bName = item.destBranchId?.branch_name || '';

                                try {
                                    const [tProv, tBranch] = await Promise.all([
                                        pName ? API.gemini.translate(null, null, pName) : '',
                                        bName ? API.gemini.translate(null, null, bName) : ''
                                    ]);

                                    const elProv = document.getElementById(`trans-province-${item._id}`);
                                    const elBranch = document.getElementById(`trans-branch-${item._id}`);
                                    if (elProv) elProv.textContent = tProv || pName;
                                    if (elBranch) elBranch.textContent = tBranch || bName;
                                } catch (err) {
                                    console.warn("Trans Error", err);
                                    const elProv = document.getElementById(`trans-province-${item._id}`);
                                    const elBranch = document.getElementById(`trans-branch-${item._id}`);
                                    const errMsg = err.message.includes("403") ? "Lỗi Key" : "Lỗi Dịch";
                                    if (elProv) { elProv.textContent = pName + ` (${errMsg})`; elProv.style.color = 'red'; }
                                    if (elBranch) { elBranch.textContent = bName + ` (${errMsg})`; elBranch.style.color = 'red'; }
                                }
                            });
                        }
                    } catch (e) {
                        console.error(e);
                        // Don't show error immediately if we are going to fallback to Lark, 
                        // but usually Anousith error means token invalid or network.
                        htmlBuffer += `<div class="msg-error">Lỗi Anousith: ${e.message}</div>`;
                    }
                }

                // 2. Lark Fallback (if no matches found in Anousith)
                if (!found) {
                    if (!cfg.larkAppId) {
                        htmlBuffer += `<div class="msg-error">Không tìm thấy đơn Anousith phù hợp. <br>Thiếu cấu hình Lark để tìm kiếm mở rộng.</div>`;
                        resultsArea.innerHTML = htmlBuffer;
                    } else {
                        // Clear previous error if purely "not found"
                        if (!htmlBuffer.includes("Lỗi Anousith")) resultsArea.innerHTML = '<div class="msg-info">Đang tìm trên Lark Base...</div>';

                        try {
                            const token = await API.lark.getToken(cfg.larkAppId, cfg.larkAppSecret);
                            const records = await API.lark.getAllRecords(token, LARK_APP_TOKEN, LARK_TABLE_ID);
                            if (records.length) {
                                const match = await API.gemini.findMatch(null, null, address, records);
                                if (match) {
                                    found = true;
                                    resultsArea.innerHTML = renderLarkCard(match);
                                } else {
                                    resultsArea.innerHTML = `<div class="msg-info">Không tìm thấy địa chỉ phù hợp trên cả Anousith và Lark.</div>`;
                                }
                            } else {
                                resultsArea.innerHTML = `<div class="msg-info">Lark Base trống</div>`;
                            }
                        } catch (e) {
                            resultsArea.innerHTML = `<div class="msg-error">Lỗi Lark: ${e.message}</div>`;
                        }
                    }
                }

            } catch (e) {
                resultsArea.innerHTML = `<div class="msg-error">Lỗi không xác định: ${e.message}</div>`;
            } finally {
                searchBtn.classList.remove('loading');
                searchBtn.disabled = false;
            }
        });
    });

    settingsBtn.addEventListener('click', () => switchView('settings'));
    closeSettingsBtn.addEventListener('click', () => switchView('main'));
    saveSettingsBtn.addEventListener('click', saveSettings);
    openPanelBtn.addEventListener('click', () => {
        chrome.windows.create({ url: "popup.html", type: "popup", width: 380, height: 650 });
        window.close();
    });
});
