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
            // 使用 GET 向 GAS 索取資料
            // 為了避免 GAS 快取，可以加上 timestamp
            const url = `${CONFIG.GAS_WEB_APP_URL}?action=get&date=${encodeURIComponent(targetDate)}&t=${new Date().getTime()}`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'success') {
                renderResults(data.data, targetDate);
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

            const card = document.createElement('div');
            card.className = 'result-card';
            
            card.innerHTML = `
                <div class="card-header">${targetDate} - ${branch}</div>
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
    }
});
