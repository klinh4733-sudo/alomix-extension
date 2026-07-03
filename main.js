/**
 * Roy Super App - Main Logic (Unified)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation ---
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(item.dataset.target).classList.add('active');
        });
    });

    // --- Settings UI Logic ---
    const settingsModal = document.getElementById('settingsModal');
    const globalSettingsBtn = document.getElementById('globalSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');

    // Inputs
    const larkAppId = document.getElementById('larkAppId');
    const larkAppSecret = document.getElementById('larkAppSecret');
    const anousithTokenInput = document.getElementById('anousithToken');
    const halTokenInput = document.getElementById('halToken');

    const settingsMsg = document.getElementById('settingsMsg');


    let currentConfig = {}; // To store the loaded configuration

    const showMsg = (msg, type = 'success') => {
        settingsMsg.textContent = msg;
        settingsMsg.className = `msg-box ${type}`;
        settingsMsg.style.display = 'block';
        setTimeout(() => { settingsMsg.style.display = 'none'; }, 3000);
    };

    // Load all settings into currentConfig and update UI
    const loadConfig = async () => {
        currentConfig = await chrome.storage.local.get([
            'larkAppId', 'larkAppSecret', 'anousithToken', 'halToken'
        ]);
        // Update UI elements
        larkAppId.value = currentConfig.larkAppId || '';
        larkAppSecret.value = currentConfig.larkAppSecret || '';
        anousithTokenInput.value = currentConfig.anousithToken || '';
        halTokenInput.value = currentConfig.halToken || '';
    };

    // Initial load of config when the script runs
    loadConfig();

    globalSettingsBtn.addEventListener('click', () => {
        loadConfig(); // Reload settings when modal opens to ensure fresh data
        settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    // Individual Save Handlers
    document.getElementById('saveLarkBtn').addEventListener('click', () => {
        const appId = larkAppId.value.trim();
        const secret = larkAppSecret.value.trim();
        chrome.storage.local.set({ larkAppId: appId, larkAppSecret: secret }, () => {
            loadConfig();
            showMsg("Đã lưu cấu hình Lark!", "success");
        });
    });

    document.getElementById('saveAnousithBtn').addEventListener('click', () => {
        const token = anousithTokenInput.value.trim();
        chrome.storage.local.set({ anousithToken: token }, () => {
            loadConfig();
            showMsg("Đã lưu Token Anousith!", "success");
        });
    });

    document.getElementById('saveHalBtn').addEventListener('click', () => {
        const token = halTokenInput.value.trim();
        chrome.storage.local.set({ halToken: token }, () => {
            loadConfig();
            showMsg("Đã lưu Token HAL!", "success");
        });
    });





    // Settings Sidebar Tab Logic
    const settingsNavItems = document.querySelectorAll('.settings-nav-item');
    const settingsPanels = document.querySelectorAll('.settings-panel');

    settingsNavItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all tabs
            settingsNavItems.forEach(n => n.classList.remove('active'));
            // Add active to clicked tab
            item.classList.add('active');

            // Hide all panels
            settingsPanels.forEach(p => p.classList.remove('active'));

            // Show target panel
            const targetId = item.dataset.tab;
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });

    // --- Initialize Features ---
    initAddressSearch();
    initEmailSearch();


    // ==========================================================
    // Feature 1: Address Search Logic
    // ==========================================================
    function initAddressSearch() {
        const searchBtn = document.getElementById('searchBtn');
        const resultsArea = document.getElementById('resultsArea');
        const phoneInput = document.getElementById('phoneInput');
        const addressInput = document.getElementById('addressInput');

        // Translation Elements
        const translateInputBtn = document.getElementById('translateInputBtn');
        const editInputBtn = document.getElementById('editInputBtn');
        const inputInteractiveArea = document.getElementById('inputInteractiveArea');
        const inputOriginalVis = document.getElementById('inputOriginalVis');
        const inputTranslatedVis = document.getElementById('inputTranslatedVis');

        // Progress Elements
        const progressBar = document.getElementById('addrBar');
        const progressContainer = document.getElementById('addrProgress');
        const statusText = document.getElementById('addrStatus');

        const LARK_TABLE_ID = 'tblLHdQEmn3AEoYi';
        const LARK_APP_TOKEN_BASE = 'IA0ybZRGmaI18gs59XLlUkYHgtc';

        function setProgress(percent, text) {
            progressContainer.style.display = 'block';
            statusText.style.display = 'block';
            progressBar.style.width = percent + '%';
            statusText.textContent = text;
        }

        function hideProgress() {
            setTimeout(() => {
                progressContainer.style.display = 'none';
                statusText.style.display = 'none';
                progressBar.style.width = '0%';
            }, 500);
        }

        // --- Interactive Input Translation ---
        if (translateInputBtn) {
            translateInputBtn.addEventListener('click', async () => {
                const text = addressInput.value.trim();
                if (!text) {
                    addressInput.focus();
                    return;
                }

                translateInputBtn.textContent = "Translating...";
                translateInputBtn.disabled = true;

                try {
                    const mapping = await API.gemini.translateWithMapping(null, null, text);
                    renderInteractiveInput(mapping);

                } catch (e) {
                    console.error(e);
                    alert("Lỗi dịch: " + e.message);
                }
                finally {
                    translateInputBtn.textContent = "Dịch 🔍";
                    translateInputBtn.disabled = false;
                }
            });
        }

        if (editInputBtn) {
            editInputBtn.addEventListener('click', () => {
                // Restore Edit Mode
                addressInput.style.display = 'block';
                inputInteractiveArea.style.display = 'none';
                editInputBtn.style.display = 'none';
                translateInputBtn.style.display = 'block';
            });
        }

        function renderInteractiveInput(mapping) {
            // mapping = [{o, t}, ...]
            let origHTML = '';
            let transHTML = '';

            mapping.forEach((m, idx) => {
                const id = `in-seg-${idx}`;
                // Interactive Span for Original
                origHTML += `<span class="trans-segment interactive" data-oid="${id}">${m.o}</span> `;
                // Interactive Span for Translated
                transHTML += `<span class="trans-segment interactive" data-tid="${id}">${m.t}</span> `;
            });

            // Keep Textarea Visible
            addressInput.style.display = 'block';

            // Show Original (Visible now)
            inputOriginalVis.style.display = 'block';
            inputOriginalVis.innerHTML = origHTML;

            // Show Translated
            inputTranslatedVis.innerHTML = transHTML;
            inputInteractiveArea.style.display = 'block';

            // Toggle Buttons
            translateInputBtn.style.display = 'block';
            editInputBtn.style.display = 'none';

            // Highlight Events
            const transSegs = inputTranslatedVis.querySelectorAll('.trans-segment');
            transSegs.forEach(seg => {
                seg.addEventListener('mouseenter', () => {
                    const id = seg.dataset.tid;
                    const orig = inputOriginalVis.querySelector(`[data-oid="${id}"]`);
                    if (orig) orig.classList.add('active');
                    seg.classList.add('active');
                });
                seg.addEventListener('mouseleave', () => {
                    const id = seg.dataset.tid;
                    const orig = inputOriginalVis.querySelector(`[data-oid="${id}"]`);
                    if (orig) orig.classList.remove('active');
                    seg.classList.remove('active');
                });
            });
        }

        // --- Search Logic ---
        if (searchBtn) {
            searchBtn.addEventListener('click', async () => {
                // Auto-process: digits only, take last 8
                let phone = phoneInput.value.replace(/\D/g, '');
                if (phone.length > 8) phone = phone.slice(-8);
                phoneInput.value = phone;

                // If in interactive mode, use the raw value still in textarea? Yes or reconstruction? 
                // Textarea value persists even if hidden.
                const address = addressInput.value.trim();

                if (!phone || !address) {
                    resultsArea.innerHTML = `<div class="msg-box error">Vui lòng nhập SĐT và Địa chỉ</div>`;
                    return;
                }

                searchBtn.disabled = true;
                resultsArea.innerHTML = '';
                setProgress(10, "Đang khởi tạo...");

                const cfg = await chrome.storage.local.get(['larkAppId', 'larkAppSecret', 'anousithToken', 'halToken']);

                try {
                    let totalItems = [];
                    let sources = [];

                    // 1. Parallel Search (ANS & HAL)
                    setProgress(20, "Đang tìm kiếm trên ANS & HAL...");

                    const searchPromises = [];
                    if (cfg.anousithToken) {
                        searchPromises.push(API.anousith.search(phone, cfg.anousithToken).then(res => ({ source: 'Anousith', data: res })));
                    }
                    if (cfg.halToken) {
                        searchPromises.push(API.hal.search(phone, cfg.halToken).then(res => ({ source: 'HAL', data: res })));
                    }

                    const searchResults = await Promise.all(searchPromises);

                    // 2. Process and Unify results
                    const addressMap = new Map(); // key -> {pName, bName, sources: Set}

                    searchResults.forEach(res => {
                        const items = res.data;
                        const source = res.source;

                        items.forEach(item => {
                            // Normalize fields from different sources if needed
                            const pName = item.pName || (item.destProvinceId?.provinceName) || '';
                            const bName = item.bName || (item.destBranchId?.branch_name) || '';

                            const key = `${bName}|${pName}`.toLowerCase().trim();
                            if (key && key !== '|') {
                                if (!addressMap.has(key)) {
                                    addressMap.set(key, { pName, bName, sources: new Set([source]) });
                                } else {
                                    addressMap.get(key).sources.add(source);
                                }
                            }
                        });
                    });

                    const uniqueAddresses = Array.from(addressMap.values());

                    if (uniqueAddresses.length === 0) {
                        resultsArea.innerHTML = `<div class="msg-box">Không tìm thấy địa chỉ khớp trên Anousith hay HAL.</div>`;
                        setProgress(100, "Không có kết quả");
                        hideProgress();
                        return;
                    }

                    setProgress(60, `Tìm thấy ${uniqueAddresses.length} địa chỉ. Đang dịch...`);

                    try {
                        // ONE BATCH REQUEST for EVERYTHING
                        const batchRes = await API.gemini.translateBatch(
                            null,
                            null,
                            address, // user input
                            uniqueAddresses.map(a => ({ bName: a.bName, pName: a.pName }))
                        );

                        // Render Input Interactive Box
                        if (batchRes.inputMapping) {
                            renderInteractiveInput(batchRes.inputMapping);
                        }

                        // Render Results
                        const renderedResults = uniqueAddresses.map((addr, idx) => {
                            const trans = batchRes.ansResultsTrans?.[idx] || { bTrans: addr.bName, pTrans: addr.pName };

                            // Avoid redundancy: "Address | Province, Province"
                            let laoLine = addr.bName.replace(/\|/g, ',');
                            if (addr.pName && !laoLine.includes(addr.pName)) {
                                laoLine += `, ${addr.pName}`;
                            }

                            let vietLine = trans.bTrans.replace(/\|/g, ',');
                            if (trans.pTrans && !vietLine.includes(trans.pTrans)) {
                                vietLine += `, ${trans.pTrans}`;
                            }

                            // Final clean up of multiple commas or spaces
                            laoLine = laoLine.replace(/\s*,\s*/g, ', ').trim();
                            vietLine = vietLine.replace(/\s*,\s*/g, ', ').trim();

                            return renderResultCard({
                                laoLine: laoLine,
                                vietLine: vietLine,
                                sources: Array.from(addr.sources)
                            });
                        });

                        resultsArea.innerHTML = renderedResults.join('');

                    } catch (e) {
                        console.error("Batch translate failed", e);
                        resultsArea.innerHTML = uniqueAddresses.map(addr => renderResultCard({
                            laoLine: `${addr.bName}, ${addr.pName}`,
                            vietLine: `Lỗi dịch`,
                            sources: Array.from(addr.sources)
                        })).join('');
                    }


                    setProgress(100, "Hoàn tất");
                    hideProgress();

                } catch (e) {
                    console.error(e);
                    resultsArea.innerHTML = `<div class="msg-box error">Error: ${e.message}</div>`;
                    hideProgress();
                } finally {
                    searchBtn.disabled = false;
                }
            });
        }

        function renderResultCard(data) {
            const sourceBadges = data.sources.map(s => {
                const cls = s.toLowerCase() === 'anousith' ? 'badge-anousith' : 'badge-hal';
                return `<span class="source-badge ${cls}" style="margin-right:4px;">${s} Match</span>`;
            }).join('');

            return `
            <div class="result-card">
                <div style="margin-bottom:8px;">${sourceBadges}</div>
                <div class="address-display">
                    <div class="lao-row copy-target" title="Nhấn để copy tiếng Lào">
                        ${data.laoLine} 📋
                    </div>
                    <div class="viet-row">
                        ${data.vietLine}
                    </div>
                </div>
            </div>`;
        }


        // Copy Event Delegation
        resultsArea.addEventListener('click', (e) => {
            const target = e.target.closest('.copy-target');
            if (target) {
                const text = target.textContent.replace('📋', '').trim();
                navigator.clipboard.writeText(text);

                const originalBg = target.style.background;
                target.style.background = '#e8f5e9'; // Green tint
                setTimeout(() => target.style.background = originalBg, 200);
            }
        });
    }

    // ==========================================================
    // Feature 2: Email Search Logic
    // ==========================================================
    function initEmailSearch() {
        const findBtn = document.getElementById('findBtn');
        const input = document.getElementById('emailInput');
        const results = document.getElementById('emailResults');
        const status = document.getElementById('emailStatus');
        const progress = document.getElementById('progressContainer');
        const bar = document.getElementById('progressBar');

        const LARK_APP_TOKEN_EMAIL = "V5W8bSHCbawtwXsUHLjloVIEguc";
        const LARK_TABLE_ID_EMAIL = "tbl4R64xPw8PmSCr";

        if (findBtn) {
            findBtn.addEventListener('click', async () => {
                const raw = input.value;
                if (!raw.trim()) return status.textContent = "Nhập ít nhất 1 email";

                const emails = raw.split('\n').map(e => e.trim()).filter(e => e);

                findBtn.disabled = true;
                findBtn.textContent = "Processing...";
                status.textContent = "Đang xác thực...";
                results.innerHTML = '';
                progress.style.display = 'block';
                bar.style.width = '10%';

                const cfg = await chrome.storage.local.get(['larkAppId', 'larkAppSecret']);

                try {
                    if (!cfg.larkAppId || !cfg.larkAppSecret) throw new Error("Chưa cấu hình Lark App ID/Secret");

                    const token = await LarkService.getTenantAccessToken(cfg.larkAppId, cfg.larkAppSecret);

                    status.textContent = "Đang tìm trên Lark...";
                    bar.style.width = '50%';

                    const data = await LarkService.searchOrdersByEmails(token, LARK_APP_TOKEN_EMAIL, LARK_TABLE_ID_EMAIL, emails);

                    bar.style.width = '100%';
                    setTimeout(() => { progress.style.display = 'none'; }, 500);

                    const entries = Object.entries(data);
                    let total = 0;
                    const allIds = [];

                    if (!entries.length) {
                        results.innerHTML = `<div class="result-card" style="text-align:center">Không tìm thấy đơn hàng nào.</div>`;
                        status.textContent = "0 matches.";
                    } else {
                        entries.forEach(([email, orders]) => {
                            const list = Array.isArray(orders) ? orders : [orders];
                            list.forEach(id => { total++; allIds.push(id); });

                            const div = document.createElement('div');
                            div.className = 'result-card';
                            div.style.flexDirection = 'column';
                            div.style.alignItems = 'flex-start';
                            div.innerHTML = `
                            <div style="font-weight:600; font-size:12px; margin-bottom:5px;">${email}</div>
                            <div style="display:flex; flex-wrap:wrap; gap:5px;">
                                ${list.map(id => `<span class="source-badge badge-lark" style="cursor:pointer" title="Copy">${id}</span>`).join('')}
                            </div>
                        `;
                            results.appendChild(div);
                        });
                        status.textContent = `Tìm thấy ${total} đơn hàng.`;

                        // Copy
                        results.querySelectorAll('.source-badge').forEach(el => {
                            el.addEventListener('click', () => {
                                navigator.clipboard.writeText(el.textContent);
                                const old = el.style.background;
                                el.style.background = '#4CAF50';
                                el.style.color = '#fff';
                                setTimeout(() => {
                                    el.style.background = ''; el.style.color = '';
                                }, 500);
                            });
                        });

                        // POS Filter
                        if (allIds.length) {
                            status.textContent += " Đang gửi sang POS...";
                            // Send to content script
                            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                            if (tab) {
                                chrome.tabs.sendMessage(tab.id, { action: 'SEARCH_ORDERS', query: allIds.join(' ') }, r => {
                                    if (chrome.runtime.lastError) console.log(chrome.runtime.lastError);
                                    status.textContent = `Đã tìm thấy ${total} đơn. Đã gửi lệnh lọc sang POS.`;
                                });
                            }
                        }
                    }

                } catch (e) {
                    status.textContent = "Lỗi: " + e.message;
                    progress.style.display = 'none';
                } finally {
                    findBtn.disabled = false;
                    findBtn.textContent = "Tìm đơn hàng";
                }
            });
        }
    }
});
