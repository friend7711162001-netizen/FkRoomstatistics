/**
 * 集團間數核對表 - Google Apps Script 後端
 * 
 * 請將此程式碼貼到 Google 試算表的「擴充功能」 > 「Apps Script」中。
 * 部署步驟：
 * 1. 點擊右上角「部署」 > 「新增部署作業」
 * 2. 類型選擇「網頁應用程式」
 * 3. 執行身分：選擇「我 (您的信箱)」
 * 4. 誰可以存取：選擇「所有人」
 * 5. 點擊「部署」，並授予必要的權限
 * 6. 複製出現的「網頁應用程式網址」，填入前端的 config.js 中
 */

const SHEET_NAME = "資料庫";

// 處理 GET 請求 (管理員查詢資料)
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'get') {
      const targetDate = e.parameter.date; // 格式預期為 "YYYY-MM-DD"
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      
      if (!sheet) {
        return createJsonResponse({ status: 'error', message: '找不到名稱為「資料庫」的工作表' });
      }
      
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return createJsonResponse({ status: 'success', data: [] });
      }
      
      const headers = data[0]; // [申報日期, 館別, 姓名, 退房間數, 續住間數, 休息間數, 備註欄, 上傳時間]
      const results = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // 處理日期格式 (試算表讀出的日期可能是 Date 物件)
        let rowDateStr = "";
        if (row[0] instanceof Date) {
          const d = row[0];
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          rowDateStr = `${yyyy}-${mm}-${dd}`;
        } else {
          rowDateStr = String(row[0]).trim();
        }

        // 如果該列的日期符合目標日期，才加入結果中
        if (rowDateStr === targetDate) {
          results.push({
            reportDate: rowDateStr,
            branch: row[1],
            staffName: row[2],
            checkoutRooms: row[3],
            stayRooms: row[4],
            restRooms: row[5],
            remarks: row[6],
            uploadTime: row[7]
          });
        }
      }
      
      return createJsonResponse({ status: 'success', data: results });
    }
    
    return createJsonResponse({ status: 'error', message: '無效的操作' });
    
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

// 處理 POST 請求 (登記人員送出資料)
function doPost(e) {
  try {
    // 由於我們前端使用 text/plain 發送 JSON 內容以避開 CORS preflight
    // 資料會放在 e.postData.contents 裡面
    const bodyString = e.postData.contents;
    const data = JSON.parse(bodyString);
    
    if (data.action === 'submit') {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      
      if (!sheet) {
        return createJsonResponse({ status: 'error', message: '找不到名稱為「資料庫」的工作表' });
      }
      
      // 確保欄位順序：申報日期, 館別, 姓名, 退房間數, 續住間數, 休息間數, 備註欄, 上傳時間
      const rowData = [
        data.reportDate,
        data.branch,
        data.staffName,
        data.checkoutRooms,
        data.stayRooms,
        data.restRooms,
        data.remarks,
        data.uploadTime
      ];
      
      sheet.appendRow(rowData);
      
      // 回傳成功 (雖然因為前端使用 no-cors 模式，不一定讀得到這個 response，但還是按照規範回傳)
      return createJsonResponse({ status: 'success', message: '資料寫入成功' });
    }
    
    return createJsonResponse({ status: 'error', message: '無效的操作' });
    
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

// 輔助函式：建立 JSON 回應並設定 CORS Header
function createJsonResponse(responseObject) {
  return ContentService.createTextOutput(JSON.stringify(responseObject))
    .setMimeType(ContentService.MimeType.JSON);
}
