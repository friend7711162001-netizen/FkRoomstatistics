const CONFIG = {
    // 請填入您在 Google Cloud Console 申請的 OAuth Client ID
    // 雖然不使用 Google Sheets API，但管理員登入仍需要此 ID 作為身分驗證
    GOOGLE_CLIENT_ID: "1060578452489-nt3gqi9c0p2lv312c4e65gbr3c93tri3.apps.googleusercontent.com",
    
    // 請填入您部署 Google Apps Script 後取得的網頁應用程式 URL
    // 格式如: "https://script.google.com/macros/s/XXXXX/exec"
    GAS_WEB_APP_URL: "https://script.google.com/a/macros/yaling-hotel.tw/s/AKfycbwWI9FQRKi299tkPhrvv8Y1AfpP4MgqbpRx0F6FVo-WkCWsBqLUI6Y_ry4pUTO0nnqk/exec",
    
    // 管理員可授權的 Email 列表 (選填，若留空則不限制特定 Google 帳號，只要有登入即可看)
    // 範例: ["admin@example.com", "manager@example.com"]
    ALLOWED_ADMIN_EMAILS: [],
    
    // 各館別的 Google Sheet 連結 (請將 # 替換為實際的試算表網址)
    SHEET_URLS: {
        "雅霖": "https://docs.google.com/spreadsheets/d/1o1AuN5hJVC2PjXO1EEFQuBiaJXEv1S33WYz9gJ68JDw/",
        "豐家": "https://docs.google.com/spreadsheets/d/1N3H-UZwBpJmHrjTaatu-JKAN_eCyrKrO_iL8GwT21KM/",
        "豐國": "https://docs.google.com/spreadsheets/d/1pl9pYDFCO54ZETNAHlwOM9pLr60vLLpOR1370w2DjKs/",
        "豐谷": "https://docs.google.com/spreadsheets/d/1uUKvKzCleBshG1QZ9SdiNbVwso-u1RQwNtovamTv8j8/"
    },

    // 總資料庫 Google Sheet 連結 (請將 # 替換為實際的試算表網址)
    MAIN_DB_URL: "https://docs.google.com/spreadsheets/d/1ykBxFGMRZ3AUq8em00_2xDKLJT4kt7zp4tbmIFjIyGo/"
};
