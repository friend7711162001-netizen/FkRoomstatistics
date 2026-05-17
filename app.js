document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reportForm');
    const branchInput = document.getElementById('branch');
    const staffNameInput = document.getElementById('staffName');
    const reportDateInput = document.getElementById('reportDate');
    const successModal = document.getElementById('successModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // --- 國際化 (i18n) 設定 ---
    const langToggleBtn = document.getElementById('langToggleBtn');
    
    const translations = {
        "zh-TW": {
            title: "集團間數申報",
            subtitle: "請確實填寫今日實際整理房間數據，<br>未整理請填寫在[留房未整]。<br>如今日有整理不同館別，請分開申報。",
            reportDate: "申報日期",
            branch: "館別",
            branchSelect: "請選擇館別",
            yaling: "雅霖",
            fengjia: "豐家",
            fengguo: "豐國",
            fenggu: "豐谷",
            staffName: "姓名",
            staffNamePlaceholder: "請輸入您的姓名",
            checkoutRooms: "退房間數",
            stayRooms: "續住間數",
            restRooms: "休息間數",
            uncleanedRooms: "留房未整",
            remarks: "備註欄",
            remarksPlaceholder: "選填...",
            submitBtn: "送出申報",
            successTitle: "申報成功",
            successMsg: "辛苦了！",
            closeBtn: "關閉",
            loadingMsg: "處理中..."
        },
        "en": {
            title: "Room Reporting",
            subtitle: "Please accurately fill in today's actual cleaned room data.<br>If not cleaned, please fill it in [Uncleaned].<br>If you cleaned different branches, report them separately.",
            reportDate: "Report Date",
            branch: "Branch",
            branchSelect: "Select a branch",
            yaling: "Yaling",
            fengjia: "Foungjia",
            fengguo: "Foungkou",
            fenggu: "Founggu",
            staffName: "Name",
            staffNamePlaceholder: "Enter your name",
            checkoutRooms: "Checkout",
            stayRooms: "Stay",
            restRooms: "Rest",
            uncleanedRooms: "Uncleaned",
            remarks: "Remarks",
            remarksPlaceholder: "Optional...",
            submitBtn: "Submit",
            successTitle: "Success",
            successMsg: "Good job!",
            closeBtn: "Close",
            loadingMsg: "Processing..."
        }
    };

    let currentLang = localStorage.getItem('fk_room_lang') || 'zh-TW';

    function applyTranslations(lang) {
        document.documentElement.lang = lang;
        if (langToggleBtn) {
            langToggleBtn.textContent = lang === 'zh-TW' ? 'English' : '中文';
        }
        
        const dict = translations[lang];
        
        // 翻譯內部文字 (使用 innerHTML 支援 <br>)
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                el.innerHTML = dict[key];
            }
        });

        // 翻譯 placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key]) {
                el.setAttribute('placeholder', dict[key]);
            }
        });
    }

    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', (e) => {
            e.preventDefault(); // 防止按鈕可能處於表單內而觸發提交
            currentLang = currentLang === 'zh-TW' ? 'en' : 'zh-TW';
            localStorage.setItem('fk_room_lang', currentLang);
            applyTranslations(currentLang);
        });
    }

    // 初始化語言
    applyTranslations(currentLang);
    // --- 國際化 (i18n) 設定結束 ---

    // 設定今天的日期為預設值
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    reportDateInput.value = `${yyyy}-${mm}-${dd}`;

    // 讀取 LocalStorage 記憶
    const savedBranch = localStorage.getItem('fk_room_branch');
    const savedName = localStorage.getItem('fk_room_name');
    
    if (savedBranch) branchInput.value = savedBranch;
    if (savedName) staffNameInput.value = savedName;

    // 表單送出處理
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 檢查是否已設定 GAS URL
        if (!CONFIG.GAS_WEB_APP_URL || CONFIG.GAS_WEB_APP_URL.includes("請在此填入")) {
            alert("系統尚未設定完成：請管理員在 config.js 中設定 GAS_WEB_APP_URL");
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        loadingOverlay.classList.remove('hidden');

        let overwrite = false;
        try {
            const checkUrl = `${CONFIG.GAS_WEB_APP_URL}?action=checkUserReport&date=${encodeURIComponent(reportDateInput.value)}&name=${encodeURIComponent(staffNameInput.value)}&branch=${encodeURIComponent(branchInput.value)}&t=${new Date().getTime()}`;
            const checkRes = await fetch(checkUrl);
            const checkData = await checkRes.json();
            
            if (checkData.status === 'success' && checkData.exists) {
                loadingOverlay.classList.add('hidden');
                if (!confirm(`${reportDateInput.value} 已經有您在「${branchInput.value}」的申報資料，請問要覆蓋嗎？`)) {
                    submitBtn.disabled = false;
                    return;
                }
                loadingOverlay.classList.remove('hidden');
                overwrite = true;
            }
        } catch (e) {
            console.error("Check existing report failed:", e);
        }

        // 取得當下時間做為上傳時間
        const now = new Date();
        const uploadTime = now.toLocaleString('zh-TW');

        // 準備資料
        const formData = {
            action: 'submit', // 告訴 GAS 這是提交動作
            overwrite: overwrite,
            reportDate: reportDateInput.value,
            branch: branchInput.value,
            staffName: staffNameInput.value,
            checkoutRooms: document.getElementById('checkoutRooms').value || 0,
            stayRooms: document.getElementById('stayRooms').value || 0,
            restRooms: document.getElementById('restRooms').value || 0,
            uncleanedRooms: document.getElementById('uncleanedRooms').value || 0,
            remarks: document.getElementById('remarks').value,
            uploadTime: uploadTime
        };

        try {
            // 使用 GET 請求 (JSONP 替代方案) 或 POST，GAS 支援 redirect 可以用 POST 但會有 CORS，
            // 這裡我們使用 fetch 與 mode: 'no-cors' 來發送，這是一種常見的 GAS 無痛傳遞方式，
            // 但 no-cors 無法讀取 response。更穩定的做法是用 POST text/plain 或是 GET 帶參數。
            // 我們採用 POST (body JSON stringified) 搭配 content-type text/plain 避免 preflight options。
            
            const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // 加上這行以略過 CORS 錯誤
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(formData)
            });

            // 記憶此次的館別與姓名
            localStorage.setItem('fk_room_branch', branchInput.value);
            localStorage.setItem('fk_room_name', staffNameInput.value);

            // 顯示成功並清空數字
            loadingOverlay.classList.add('hidden');
            successModal.classList.remove('hidden');

            // 清空不需要記憶的欄位
            document.getElementById('checkoutRooms').value = '';
            document.getElementById('stayRooms').value = '';
            document.getElementById('restRooms').value = '';
            document.getElementById('uncleanedRooms').value = '';
            document.getElementById('remarks').value = '';

        } catch (error) {
            console.error('Error:', error);
            alert("送出失敗，請檢查網路連線或聯繫管理員。");
            loadingOverlay.classList.add('hidden');
        } finally {
            submitBtn.disabled = false;
        }
    });

    // 關閉彈窗
    closeModalBtn.addEventListener('click', () => {
        successModal.classList.add('hidden');
    });
});
