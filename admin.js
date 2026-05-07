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
            document.getElementById('filterDate').value = `${yyyy}-${mm}-${dd}`;
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

    const logoutBtn = document.getElementById('logoutBtn');
    const fetchDataBtn = document.getElementById('fetchDataBtn');
    const filterDateInput = document.getElementById('filterDate');
    const resultsContainer = document.getElementById('resultsContainer');
    const adminLoadingOverlay = document.getElementById('adminLoadingOverlay');

    const detailsModal = document.getElementById('detailsModal');
    const closeDetailsBtn = document.getElementById('closeDetailsBtn');
    
    // 關閉彈窗
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', () => {
            detailsModal.classList.add('hidden');
        });
    }

    // 委派點擊事件給詳細資訊按鈕
    resultsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('details-btn')) {
            const branch = e.target.getAttribute('data-branch');
            if (window.currentStats && window.currentStats[branch]) {
                showDetailsModal(branch, window.currentStats[branch].rawData);
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

    // 查詢資料
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
            // 讀取預期系統間數
            const expectYaling = document.getElementById('expect-雅霖').value;
            const expectFengjia = document.getElementById('expect-豐家').value;
            const expectFengguo = document.getElementById('expect-豐國').value;
            const expectFenggu = document.getElementById('expect-豐谷').value;

            let saveSys = false;
            if (expectYaling || expectFengjia || expectFengguo || expectFenggu) {
                saveSys = true;
            }

            // 使用 GET 向 GAS 索取資料
            // 為了避免 GAS 快取，可以加上 timestamp
            let url = `${CONFIG.GAS_WEB_APP_URL}?action=get&date=${encodeURIComponent(targetDate)}&t=${new Date().getTime()}`;
            
            if (saveSys) {
                url += `&saveSys=true`;
                url += `&expect_yaling=${encodeURIComponent(expectYaling)}`;
                url += `&expect_fengjia=${encodeURIComponent(expectFengjia)}`;
                url += `&expect_fengguo=${encodeURIComponent(expectFengguo)}`;
                url += `&expect_fenggu=${encodeURIComponent(expectFenggu)}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'success') {
                renderResults(data.data, targetDate);
                
                // 查詢且渲染完成後，清空輸入框 (不保留記憶)
                document.getElementById('expect-雅霖').value = '';
                document.getElementById('expect-豐家').value = '';
                document.getElementById('expect-豐國').value = '';
                document.getElementById('expect-豐谷').value = '';
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

    function renderResults(records, targetDate) {
        // 取得預期數值
        const expected = {
            "雅霖": document.getElementById('expect-雅霖').value,
            "豐家": document.getElementById('expect-豐家').value,
            "豐國": document.getElementById('expect-豐國').value,
            "豐谷": document.getElementById('expect-豐谷').value
        };

        // 預期的館別
        const branches = ["雅霖", "豐家", "豐國", "豐谷"];
        
        // 初始化統計物件
        const stats = {};
        branches.forEach(b => {
            stats[b] = { checkout: 0, stay: 0, rest: 0, rawData: [] };
        });

        // 加總資料 (備註：試算表日期格式可能會略有不同，若 GAS 有統一回傳 YYYY-MM-DD 比較好比對，
        // 這裡假設 GAS 已經過濾好日期，或者我們在這裡依賴 GAS 給的陣列)
        records.forEach(row => {
            const branch = row.branch;
            if (stats[branch] !== undefined) {
                stats[branch].checkout += parseInt(row.checkoutRooms) || 0;
                stats[branch].stay += parseInt(row.stayRooms) || 0;
                stats[branch].rest += parseInt(row.restRooms) || 0;
                stats[branch].rawData.push(row);
            } else {
                // 若出現非預期館別，動態新增
                stats[branch] = { 
                    checkout: parseInt(row.checkoutRooms) || 0, 
                    stay: parseInt(row.stayRooms) || 0, 
                    rest: parseInt(row.restRooms) || 0,
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
            if (expectStr !== "") {
                const expectNum = parseInt(expectStr) || 0;
                if (expectNum !== totalRooms) {
                    cardClasses += ' error-card';
                    warningHtml = `
                        <div class="warning-text">
                            ⚠️ 申報加總 (${totalRooms}) 與系統總間數 (${expectNum}) 不符！
                        </div>
                    `;
                }
            }

            const card = document.createElement('div');
            card.className = cardClasses;
            
            card.innerHTML = `
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${targetDate} - ${branch}</span>
                    <button class="details-btn btn-secondary" style="width: auto; padding: 6px 12px; font-size: 0.85rem;" data-branch="${branch}">詳細資訊</button>
                </div>
                <div class="stat-row">
                    <span class="stat-label">退房間數</span>
                    <span class="stat-value">${data.checkout} 間</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">續住間數</span>
                    <span class="stat-value">${data.stay} 間</span>
                </div>
                <div class="stat-row" style="border-bottom: 1px dashed var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
                    <span class="stat-label">休息間數</span>
                    <span class="stat-value">${data.rest} 間</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label" style="font-weight: 600; color: var(--text-main);">總計間數</span>
                    <span class="stat-value" style="color: var(--primary-color); font-size: 1.2rem; font-weight: 600;">${totalRooms} 間</span>
                </div>
                ${warningHtml}
                <div style="margin-top: 15px; font-size: 0.85rem; color: var(--text-light);">
                    共 ${data.rawData.length} 筆申報紀錄
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
});
