let currentUser = null;

// Google Identity Services 登入回呼
async function handleCredentialResponse(response) {
    // 這裡的 response.credential 是 JWT token
    const responsePayload = parseJwt(response.credential);
    const userEmail = responsePayload.email;

    // 將 UI 切換為載入中
    const adminLoadingOverlay = document.getElementById('adminLoadingOverlay');
    adminLoadingOverlay.classList.remove('hidden');

    try {
        // 向 GAS 驗證是否為管理員
        const url = `${CONFIG.GAS_WEB_APP_URL}?action=checkAdmin&email=${encodeURIComponent(userEmail)}&t=${new Date().getTime()}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 'success' && data.isAuthorized) {
            currentUser = responsePayload;
            // 使用試算表上設定的名字，若無則用 Google 帳號的名字
            document.getElementById('adminName').textContent = data.name || currentUser.name;
            
            // 切換介面
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('dashboardSection').classList.remove('hidden');

            // 預設填入今日日期
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;
            document.getElementById('filterDate').value = todayStr;
            document.getElementById('historyDate').value = todayStr;
            const importDateEl = document.getElementById('importDate');
            if (importDateEl) importDateEl.value = todayStr;
        } else {
            alert('抱歉，您的帳號 (' + userEmail + ') 不在管理員名單中。');
            // 嘗試撤銷授權
            if(google && google.accounts && google.accounts.id) {
                 google.accounts.id.disableAutoSelect();
            }
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        alert('驗證身分時發生錯誤：' + error.message);
    } finally {
        adminLoadingOverlay.classList.add('hidden');
    }
}

// 解析 JWT
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

window.onGoogleLibraryLoad = function () {
    if (CONFIG.GOOGLE_CLIENT_ID && !CONFIG.GOOGLE_CLIENT_ID.includes("請在此填入")) {
        google.accounts.id.initialize({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse
        });
        // 渲染按鈕
        google.accounts.id.renderButton(
            document.getElementById("buttonDiv"),
            { theme: "outline", size: "large", type: "standard", shape: "rectangular" }
        );
        // 啟用 One Tap (一鍵登入)，提升登入速度體驗
        google.accounts.id.prompt();
    } else {
        console.warn("未設定 GOOGLE_CLIENT_ID。若要正常登入，請在 config.js 中設定。");
    }
};

document.addEventListener('DOMContentLoaded', () => {

    // 設置總資料庫連結
    const mainDbBtn = document.getElementById('mainDbBtn');
    if (mainDbBtn && typeof CONFIG !== 'undefined' && CONFIG.MAIN_DB_URL) {
        mainDbBtn.href = CONFIG.MAIN_DB_URL;
    }

    // 設置旅宿E館家連結
    const eHotelBtn = document.getElementById('eHotelBtn');
    if (eHotelBtn && typeof CONFIG !== 'undefined' && CONFIG.E_HOTEL_URL) {
        eHotelBtn.href = CONFIG.E_HOTEL_URL;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    const fetchDataBtn = document.getElementById('fetchDataBtn');
    const fetchHistoryBtn = document.getElementById('fetchHistoryBtn'); // 歷史調閱按鈕
    const filterDateInput = document.getElementById('filterDate');
    const historyDateInput = document.getElementById('historyDate'); // 歷史調閱日期
    const resultsContainer = document.getElementById('resultsContainer');
    const historyContainer = document.getElementById('historyContainer');
    const adminLoadingOverlay = document.getElementById('adminLoadingOverlay');

    // 分頁切換邏輯
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // 切換按鈕狀態
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 切換內容顯示
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}Tab`) {
                    content.classList.add('active');
                }
            });
        });
    });

    const detailsModal = document.getElementById('detailsModal');
    const closeDetailsBtn = document.getElementById('closeDetailsBtn');
    
    // 關閉彈窗
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', () => {
            detailsModal.classList.add('hidden');
        });
    }

    // 委派點擊事件給詳細資訊與儲存備註按鈕
    resultsContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('details-btn')) {
            const branch = e.target.getAttribute('data-branch');
            if (window.currentStats && window.currentStats[branch]) {
                showDetailsModal(branch, window.currentStats[branch].rawData);
            }
            return;
        }

        if (e.target.classList.contains('save-remark-btn')) {
            const btn = e.target;
            const branch = btn.getAttribute('data-branch');
            const targetDate = btn.getAttribute('data-date');
            const remarkText = document.getElementById(`remark-${branch}`).value;

            if (!CONFIG.GAS_WEB_APP_URL || CONFIG.GAS_WEB_APP_URL.includes("請在此填入")) {
                alert("系統尚未設定完成：請在 config.js 中設定 GAS_WEB_APP_URL");
                return;
            }

            const originalText = btn.textContent;
            btn.textContent = '儲存中...';
            btn.disabled = true;

            try {
                let url = `${CONFIG.GAS_WEB_APP_URL}?action=saveRemark&date=${encodeURIComponent(targetDate)}&branch=${encodeURIComponent(branch)}&remark=${encodeURIComponent(remarkText)}&t=${new Date().getTime()}`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.status === 'success') {
                    btn.textContent = '儲存成功！';
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.disabled = false;
                    }, 2000);
                } else {
                    throw new Error(data.message || '儲存失敗');
                }
            } catch (error) {
                console.error('Save Remark Error:', error);
                alert('備註儲存失敗：' + error.message);
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }
    });

    function showDetailsModal(branch, rawData) {
        const title = document.getElementById('detailsModalTitle');
        const body = document.getElementById('detailsModalBody');
        
        title.textContent = `${branch} - 詳細資訊`;
        
        if (rawData.length === 0) {
            body.innerHTML = '<p style="text-align: center; color: var(--text-light);">無詳細資料</p>';
        } else {
            let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
            rawData.forEach(row => {
                html += `
                <div style="background: var(--bg-color); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="font-weight: 600; color: var(--primary-color); margin-bottom: 12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 1.1rem;">${row.staffName}</span>
                        <span style="font-size: 0.8rem; color: var(--text-light);">${row.uploadTime || ''}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.95rem; margin-bottom: 8px;">
                        <span>退房: <b>${row.checkoutRooms}</b></span>
                        <span>續住: <b>${row.stayRooms}</b></span>
                        <span>休息: <b>${row.restRooms}</b></span>
                        <span style="color: #A0B6A5;">未整: <b>${row.uncleanedRooms || 0}</b></span>
                    </div>
                    ${row.remarks ? `<div style="font-size: 0.9rem; color: var(--text-main); background: #fff; padding: 8px; border-radius: 8px; margin-top: 8px;"><b>備註：</b>${row.remarks}</div>` : ''}
                </div>`;
            });
            html += '</div>';
            body.innerHTML = html;
        }
        
        detailsModal.classList.remove('hidden');
    }

    // 登出
    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('dashboardSection').classList.add('hidden');
        resultsContainer.innerHTML = '';
        
        // 嘗試撤銷授權
        if(google && google.accounts && google.accounts.id) {
             google.accounts.id.disableAutoSelect();
        }
    });

    // 匯入系統間數
    const importSysBtn = document.getElementById('importSysBtn');
    if (importSysBtn) {
        importSysBtn.addEventListener('click', async () => {
            const importDate = document.getElementById('importDate').value;
            if (!importDate) {
                alert('請選擇匯入日期！');
                return;
            }

            if (!CONFIG.GAS_WEB_APP_URL || CONFIG.GAS_WEB_APP_URL.includes("請在此填入")) {
                alert("系統尚未設定完成：請在 config.js 中設定 GAS_WEB_APP_URL");
                return;
            }

            const expectYaling = document.getElementById('expect-雅霖').value;
            const expectFengjia = document.getElementById('expect-豐家').value;
            const expectFengguo = document.getElementById('expect-豐國').value;
            const expectFenggu = document.getElementById('expect-豐谷').value;

            const expectRestYaling = document.getElementById('expect-rest-雅霖').value;
            const expectRestFengjia = document.getElementById('expect-rest-豐家').value;
            const expectRestFengguo = document.getElementById('expect-rest-豐國').value;
            const expectRestFenggu = document.getElementById('expect-rest-豐谷').value;

            if (!expectYaling && !expectFengjia && !expectFengguo && !expectFenggu && !expectRestYaling && !expectRestFengjia && !expectRestFengguo && !expectRestFenggu) {
                alert('請至少填寫一項系統預期資料！');
                return;
            }

            adminLoadingOverlay.classList.remove('hidden');

            try {
                // 檢查該日期是否已有資料
                const checkUrl = `${CONFIG.GAS_WEB_APP_URL}?action=checkSysDate&date=${encodeURIComponent(importDate)}&t=${new Date().getTime()}`;
                const checkRes = await fetch(checkUrl);
                const checkData = await checkRes.json();

                let overwrite = false;
                if (checkData.status === 'success' && checkData.exists) {
                    if (!confirm(`日期 ${importDate} 的系統間數已有紀錄，是否確定要覆蓋？`)) {
                        adminLoadingOverlay.classList.add('hidden');
                        return; // 使用者取消
                    }
                    overwrite = true;
                }

                // 匯入資料
                let importUrl = `${CONFIG.GAS_WEB_APP_URL}?action=importSysData&date=${encodeURIComponent(importDate)}&overwrite=${overwrite}&t=${new Date().getTime()}`;
                importUrl += `&expect_yaling=${encodeURIComponent(expectYaling)}`;
                importUrl += `&expect_fengjia=${encodeURIComponent(expectFengjia)}`;
                importUrl += `&expect_fengguo=${encodeURIComponent(expectFengguo)}`;
                importUrl += `&expect_fenggu=${encodeURIComponent(expectFenggu)}`;
                importUrl += `&expect_rest_yaling=${encodeURIComponent(expectRestYaling)}`;
                importUrl += `&expect_rest_fengjia=${encodeURIComponent(expectRestFengjia)}`;
                importUrl += `&expect_rest_fengguo=${encodeURIComponent(expectRestFengguo)}`;
                importUrl += `&expect_rest_fenggu=${encodeURIComponent(expectRestFenggu)}`;

                const importRes = await fetch(importUrl);
                const importData = await importRes.json();

                if (importData.status === 'success') {
                    alert('系統間數匯入成功！');
                    // 清空輸入框
                    document.getElementById('expect-雅霖').value = '';
                    document.getElementById('expect-豐家').value = '';
                    document.getElementById('expect-豐國').value = '';
                    document.getElementById('expect-豐谷').value = '';
                    document.getElementById('expect-rest-雅霖').value = '';
                    document.getElementById('expect-rest-豐家').value = '';
                    document.getElementById('expect-rest-豐國').value = '';
                    document.getElementById('expect-rest-豐谷').value = '';
                } else {
                    throw new Error(importData.message || '匯入失敗');
                }

            } catch (error) {
                console.error('Fetch Error:', error);
                alert('操作發生錯誤：' + error.message);
            } finally {
                adminLoadingOverlay.classList.add('hidden');
            }
        });
    }

    // 數據稽核查詢
    fetchDataBtn.addEventListener('click', async () => {
        const targetDate = filterDateInput.value;
        if (!targetDate) {
            alert('請選擇日期！');
            return;
        }

        if (!CONFIG.GAS_WEB_APP_URL || CONFIG.GAS_WEB_APP_URL.includes("請在此填入")) {
            alert("系統尚未設定完成：請在 config.js 中設定 GAS_WEB_APP_URL");
            return;
        }

        adminLoadingOverlay.classList.remove('hidden');
        resultsContainer.innerHTML = '';

        try {
            // 使用 GET 向 GAS 索取資料
            let url = `${CONFIG.GAS_WEB_APP_URL}?action=get&date=${encodeURIComponent(targetDate)}&t=${new Date().getTime()}`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'success') {
                // 檢查是否已匯入系統總間數
                const expected = data.expected || {};
                const expectedRest = data.expectedRest || {};
                const isImported = Object.values(expected).some(val => val !== "") || Object.values(expectedRest).some(val => val !== "");
                
                if (!isImported) {
                    alert(`日期 ${targetDate} 的系統總間數尚未匯入，請先於上方「填寫系統總間數」並點擊「匯入」後，再進行稽核查詢！`);
                    return; // 中止並提示
                }

                renderResults(data.data, targetDate, data.expected, data.expectedRest, data.remarks, data.yesterdayUncleaned);
            } else {
                throw new Error(data.message || '取得資料失敗');
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            alert('無法取得資料：' + error.message);
        } finally {
            adminLoadingOverlay.classList.add('hidden');
        }
    });

    // 歷史調閱查詢 (獨立)
    fetchHistoryBtn.addEventListener('click', async () => {
        const targetDate = historyDateInput.value;
        if (!targetDate) {
            alert('請選擇日期！');
            return;
        }

        adminLoadingOverlay.classList.remove('hidden');
        historyContainer.innerHTML = '';

        try {
            const url = `${CONFIG.GAS_WEB_APP_URL}?action=get&date=${encodeURIComponent(targetDate)}&t=${new Date().getTime()}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'success') {
                renderHistory(data.data, data.remarks, data.expected, data.expectedRest, data.yesterdayUncleaned);
            } else {
                throw new Error(data.message || '取得資料失敗');
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            alert('無法取得資料：' + error.message);
        } finally {
            adminLoadingOverlay.classList.add('hidden');
        }
    });

    function renderResults(records, targetDate, expectedData, expectedRestData, expectedRemarksData, yesterdayUncleanedData) {
        // 取得預期數值
        const expected = expectedData || {
            "雅霖": "",
            "豐家": "",
            "豐國": "",
            "豐谷": ""
        };

        const expectedRest = expectedRestData || {
            "雅霖": "",
            "豐家": "",
            "豐國": "",
            "豐谷": ""
        };

        const expectedRemarks = expectedRemarksData || {
            "雅霖": "",
            "豐家": "",
            "豐國": "",
            "豐谷": ""
        };

        const yesterdayUncleaned = yesterdayUncleanedData || {
            "雅霖": 0, "豐家": 0, "豐國": 0, "豐谷": 0
        };

        // 預期的館別
        const branches = ["雅霖", "豐家", "豐國", "豐谷"];
        
        // 初始化統計物件
        const stats = {};
        branches.forEach(b => {
            stats[b] = { checkout: 0, stay: 0, rest: 0, uncleaned: 0, rawData: [] };
        });

        // 加總資料 (備註：試算表日期格式可能會略有不同，若 GAS 有統一回傳 YYYY-MM-DD 比較好比對，
        // 這裡假設 GAS 已經過濾好日期，或者我們在這裡依賴 GAS 給的陣列)
        records.forEach(row => {
            const branch = row.branch;
            if (stats[branch] !== undefined) {
                stats[branch].checkout += parseInt(row.checkoutRooms) || 0;
                stats[branch].stay += parseInt(row.stayRooms) || 0;
                stats[branch].rest += parseInt(row.restRooms) || 0;
                stats[branch].uncleaned += parseInt(row.uncleanedRooms) || 0;
                stats[branch].rawData.push(row);
            } else {
                // 若出現非預期館別，動態新增
                stats[branch] = { 
                    checkout: parseInt(row.checkoutRooms) || 0, 
                    stay: parseInt(row.stayRooms) || 0, 
                    rest: parseInt(row.restRooms) || 0,
                    uncleaned: parseInt(row.uncleanedRooms) || 0,
                    rawData: [row]
                };
            }
        });

        // 產生 UI
        let hasData = false;
        
        for (const [branch, data] of Object.entries(stats)) {
            if (data.rawData.length > 0) {
                hasData = true;
            }

            const totalRooms = data.checkout + data.stay + data.rest;
            let cardClasses = 'result-card';
            let warningHtml = '';

            // 稽核判斷
            const expectStr = expected[branch];
            const expectRestStr = expectedRest[branch];
            const totalStay = data.checkout + data.stay;
            const totalRest = data.rest;
            const uncleanedRooms = data.uncleaned;
            const yUncleaned = yesterdayUncleaned[branch] || 0;

            if (expectStr !== "") {
                let expectNum = parseInt(expectStr) || 0;
                // 套用留房未整邏輯
                expectNum = expectNum - uncleanedRooms + yUncleaned;

                if (totalStay > expectNum) {
                    cardClasses += ' error-card';
                    warningHtml += `
                        <div class="warning-text">
                            ⚠️ 住宿加總 (${totalStay}) 與系統間數 (${expectNum}) 不符！
                        </div>
                    `;
                } else if (totalStay < expectNum) {
                    cardClasses += ' short-card';
                    warningHtml += `
                        <div class="short-text">
                            ⚠️ 住宿加總 (${totalStay}) 與系統間數 (${expectNum}) 不符！
                        </div>
                    `;
                }
            }

            if (expectRestStr !== "") {
                const expectRestNum = parseInt(expectRestStr) || 0;
                if (totalRest > expectRestNum) {
                    if (!cardClasses.includes('error-card')) cardClasses += ' error-card';
                    warningHtml += `
                        <div class="warning-text" style="margin-top: 4px;">
                            ⚠️ 休息加總 (${totalRest}) 與系統休數 (${expectRestNum}) 不符！
                        </div>
                    `;
                } else if (totalRest < expectRestNum) {
                    if (!cardClasses.includes('short-card') && !cardClasses.includes('error-card')) cardClasses += ' short-card';
                    warningHtml += `
                        <div class="short-text" style="margin-top: 4px;">
                            ⚠️ 休息加總 (${totalRest}) 與系統休數 (${expectRestNum}) 不符！
                        </div>
                    `;
                }
            }

            // UI display for uncleaned adjustment
            let uncleanedInfoHtml = '';
            if (uncleanedRooms > 0 || yUncleaned > 0) {
                let textSegments = [];
                if (uncleanedRooms > 0) textSegments.push(`本日留房未整: -${uncleanedRooms}`);
                if (yUncleaned > 0) textSegments.push(`昨日留房未整: +${yUncleaned}`);
                uncleanedInfoHtml = `<div style="font-size: 0.85rem; color: #8BA39E; font-weight: 600; text-align: right; margin-bottom: 8px;">ℹ️ 系統間數調整 (${textSegments.join(', ')})</div>`;
            }

            const card = document.createElement('div');
            card.className = cardClasses;
            
            card.innerHTML = `
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${targetDate} - <a href="${CONFIG.SHEET_URLS && CONFIG.SHEET_URLS[branch] ? CONFIG.SHEET_URLS[branch] : '#'}" target="_blank" class="branch-link-btn">${branch}</a></span>
                    <button class="details-btn btn-secondary" style="width: auto; padding: 6px 12px; font-size: 0.85rem;" data-branch="${branch}">詳細資訊</button>
                </div>
                ${uncleanedInfoHtml}
                <div class="stat-row">
                    <span class="stat-label">退房間數</span>
                    <span class="stat-value">${data.checkout} 間</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">續住間數</span>
                    <span class="stat-value">${data.stay} 間</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">休息間數</span>
                    <span class="stat-value">${data.rest} 間</span>
                </div>
                <div class="stat-row" style="border-bottom: 1px dashed var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
                    <span class="stat-label" style="color: #A0B6A5;">留房未整</span>
                    <span class="stat-value" style="color: #A0B6A5;">${data.uncleaned} 間</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label" style="font-weight: 600; color: var(--text-main);">總計間數</span>
                    <span class="stat-value" style="color: var(--primary-color); font-size: 1.2rem; font-weight: 600;">${totalRooms} 間</span>
                </div>
                ${warningHtml}
                <div style="margin-top: 15px; font-size: 0.85rem; color: var(--text-light);">
                    共 ${data.rawData.length} 筆申報紀錄
                </div>
                <div style="margin-top: 15px; border-top: 1px dashed var(--border-color); padding-top: 15px;">
                    <textarea id="remark-${branch}" rows="2" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 8px; resize: vertical; font-family: inherit;" placeholder="在此填寫稽核備註...">${expectedRemarks[branch] || ""}</textarea>
                    <button class="btn-secondary save-remark-btn" style="width: 100%; margin-top: 8px; padding: 6px;" data-branch="${branch}" data-date="${targetDate}">儲存備註</button>
                </div>
            `;
            resultsContainer.appendChild(card);
        }

        if (!hasData) {
            resultsContainer.innerHTML = `
                <div class="no-data">
                    <div style="font-size: 2rem; margin-bottom: 10px;">📄</div>
                    <p>本日無任何申報資料</p>
                </div>
            `;
        }
        
        window.currentStats = stats;
    }

    // 渲染歷史調閱分頁 (依照館別分組)
    function renderHistory(records, auditRemarksData, expectedData, expectedRestData, yesterdayUncleanedData) {
        if (records.length === 0) {
            historyContainer.innerHTML = `
                <div class="no-data">
                    <div style="font-size: 2rem; margin-bottom: 10px;">📄</div>
                    <p>本日無任何申報資料</p>
                </div>
            `;
            return;
        }

        const yesterdayUncleaned = yesterdayUncleanedData || {
            "雅霖": 0, "豐家": 0, "豐國": 0, "豐谷": 0
        };

        const branches = ["雅霖", "豐家", "豐國", "豐谷"];
        const groupedData = {};
        branches.forEach(b => groupedData[b] = []);

        // 將資料分組
        records.forEach(row => {
            if (groupedData[row.branch]) {
                groupedData[row.branch].push(row);
            } else {
                // 如果有非預期的館別
                if (!groupedData[row.branch]) groupedData[row.branch] = [];
                groupedData[row.branch].push(row);
            }
        });

        let historyHtml = '';

        // 依照館別順序產生表格
        Object.keys(groupedData).forEach(branch => {
            const branchRecords = groupedData[branch];
            if (branchRecords.length === 0) return;

            // 計算該館別總計
            const branchTotal = branchRecords.reduce((acc, r) => {
                acc.checkout += parseInt(r.checkoutRooms) || 0;
                acc.stay += parseInt(r.stayRooms) || 0;
                acc.rest += parseInt(r.restRooms) || 0;
                acc.uncleaned += parseInt(r.uncleanedRooms) || 0;
                return acc;
            }, { checkout: 0, stay: 0, rest: 0, uncleaned: 0 });

            // 產生該館別的區塊
            const auditRemark = (auditRemarksData && auditRemarksData[branch]) ? auditRemarksData[branch] : "";
            const expectedCount = (expectedData && expectedData[branch]) ? expectedData[branch] : "";
            const expectedRestCount = (expectedRestData && expectedRestData[branch]) ? expectedRestData[branch] : "";
            
            const totalStay = branchTotal.checkout + branchTotal.stay;
            const totalRest = branchTotal.rest;
            const totalUncleaned = branchTotal.uncleaned;
            const yUncleaned = yesterdayUncleaned[branch] || 0;

            let matchStatusHtml = '';
            
            // 住宿比對
            if (expectedCount !== "") {
                let expNum = parseInt(expectedCount) || 0;
                
                // 套用留房未整邏輯
                expNum = expNum - totalUncleaned + yUncleaned;

                if (totalStay > expNum) {
                    matchStatusHtml += `<div style="color: #C06C61; font-size: 0.9rem; display: inline-block; background: #FDF3F2; padding: 4px 8px; border-radius: 4px;">⚠️ 系統間數: ${expNum} (住宿多 ${totalStay - expNum} 間)</div>`;
                } else if (totalStay < expNum) {
                    matchStatusHtml += `<div style="color: #B59341; font-size: 0.9rem; display: inline-block; background: #FDF7E7; padding: 4px 8px; border-radius: 4px;">⚠️ 系統間數: ${expNum} (住宿少 ${expNum - totalStay} 間)</div>`;
                } else {
                    matchStatusHtml += `<div style="color: #52796f; font-size: 0.9rem; display: inline-block; background: #f0f4f3; padding: 4px 8px; border-radius: 4px;">✓ 住宿符合: ${expNum}</div>`;
                }
            }
            
            // 休息比對
            if (expectedRestCount !== "") {
                const expRestNum = parseInt(expectedRestCount) || 0;
                if (totalRest > expRestNum) {
                    matchStatusHtml += `<div style="color: #C06C61; font-size: 0.9rem; display: inline-block; background: #FDF3F2; padding: 4px 8px; border-radius: 4px;">⚠️ 系統休數: ${expRestNum} (休息多 ${totalRest - expRestNum} 間)</div>`;
                } else if (totalRest < expRestNum) {
                    matchStatusHtml += `<div style="color: #B59341; font-size: 0.9rem; display: inline-block; background: #FDF7E7; padding: 4px 8px; border-radius: 4px;">⚠️ 系統休數: ${expRestNum} (休息少 ${expRestNum - totalRest} 間)</div>`;
                } else {
                    matchStatusHtml += `<div style="color: #52796f; font-size: 0.9rem; display: inline-block; background: #f0f4f3; padding: 4px 8px; border-radius: 4px;">✓ 休息符合: ${expRestNum}</div>`;
                }
            }
            
            let uncleanedInfoHtml = '';
            if (totalUncleaned > 0 || yUncleaned > 0) {
                let textSegments = [];
                if (totalUncleaned > 0) textSegments.push(`本日未整: -${totalUncleaned}`);
                if (yUncleaned > 0) textSegments.push(`昨日未整: +${yUncleaned}`);
                uncleanedInfoHtml = `<div style="font-size: 0.85rem; color: rgba(255, 255, 255, 0.9); font-weight: 500;">ℹ️ 系統間數調整 (${textSegments.join(', ')})</div>`;
            }

            historyHtml += `
                <div class="history-group">
                    <div class="history-group-title" style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <div>【<a href="${CONFIG.SHEET_URLS && CONFIG.SHEET_URLS[branch] ? CONFIG.SHEET_URLS[branch] : '#'}" target="_blank" style="color: white; text-decoration: underline; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px;">${branch}</a>】 歷史紀錄明細</div>
                            <div style="display: flex; gap: 4px; flex-wrap: wrap;">${matchStatusHtml}</div>
                        </div>
                        ${uncleanedInfoHtml}
                    </div>
                    ${auditRemark ? `
                    <div style="background: #fff9e6; border: 1px solid #ffe58f; padding: 10px 15px; border-radius: 8px; margin-bottom: 15px; font-size: 0.95rem; color: #856404;">
                        <strong>📢 稽核備註：</strong>${auditRemark}
                    </div>` : ''}
                    <div class="history-table-container">
                        <table class="history-table">
                            <thead>
                                <tr>
                                    <th>姓名</th>
                                    <th class="cell-num">退房</th>
                                    <th class="cell-num">續住</th>
                                    <th class="cell-num">休息</th>
                                    <th class="cell-num">未整</th>
                                    <th>備註</th>
                                    <th>上傳時間</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${branchRecords.map(r => `
                                    <tr>
                                        <td class="cell-name">${r.staffName}</td>
                                        <td class="cell-num">${r.checkoutRooms}</td>
                                        <td class="cell-num">${r.stayRooms}</td>
                                        <td class="cell-num">${r.restRooms}</td>
                                        <td class="cell-num" style="color: #A0B6A5;">${r.uncleanedRooms || 0}</td>
                                        <td class="cell-remarks">${r.remarks || '-'}</td>
                                        <td class="cell-time">${formatDateTime(r.uploadTime)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr class="total-row">
                                    <td class="cell-name" style="text-align: right;">館別總計</td>
                                    <td class="cell-num">${branchTotal.checkout}</td>
                                    <td class="cell-num">${branchTotal.stay}</td>
                                    <td class="cell-num">${branchTotal.rest}</td>
                                    <td class="cell-num" style="color: #A0B6A5;">${branchTotal.uncleaned}</td>
                                    <td colspan="2"></td>
                                </tr>
                                <tr style="background-color: var(--bg-color);">
                                    <td colspan="6" style="text-align: left; color: var(--primary-color); font-weight: 600; border-top: none;">
                                        三項合計：${branchTotal.checkout + branchTotal.stay + branchTotal.rest} 間
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        });

        historyContainer.innerHTML = historyHtml || '<p class="no-data">無資料</p>';
    }

    // 時間格式化輔助函式
    function formatDateTime(dateStr) {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');
            return `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;
        } catch (e) {
            return dateStr;
        }
    }
});
