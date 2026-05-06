const CONFIG = {
    // 請填入您在 Google Cloud Console 申請的 OAuth Client ID
    // 雖然不使用 Google Sheets API，但管理員登入仍需要此 ID 作為身分驗證
    GOOGLE_CLIENT_ID: "1060578452489-nt3gqi9c0p2lv312c4e65gbr3c93tri3.apps.googleusercontent.com",
    
    // 請填入您部署 Google Apps Script 後取得的網頁應用程式 URL
    // 格式如: "https://script.google.com/macros/s/XXXXX/exec"
    GAS_WEB_APP_URL: "https://script.google.com/a/macros/yaling-hotel.tw/s/AKfycbwWI9FQRKi299tkPhrvv8Y1AfpP4MgqbpRx0F6FVo-WkCWsBqLUI6Y_ry4pUTO0nnqk/exec",
    
    // 管理員可授權的 Email 列表 (選填，若留空則不限制特定 Google 帳號，只要有登入即可看)
    // 範例: ["admin@example.com", "manager@example.com"]
    ALLOWED_ADMIN_EMAILS: []
};
