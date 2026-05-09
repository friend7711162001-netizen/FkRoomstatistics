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
    
    if (action === 'checkAdmin') {
      const emailToCheck = e.parameter.email;
      const adminSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("管理員");
      
      if (!adminSheet) {
        return createJsonResponse({ status: 'error', message: '找不到名稱為「管理員」的工作表' });
      }
      
      const data = adminSheet.getDataRange().getValues();
      let isAuthorized = false;
      let adminName = "";
      
      // 第一列是標題：姓名, 帳號
      for (let i = 1; i < data.length; i++) {
        const rowEmail = String(data[i][1]).trim().toLowerCase();
        if (rowEmail === String(emailToCheck).trim().toLowerCase()) {
          isAuthorized = true;
          adminName = data[i][0];
          break;
        }
      }
      
      return createJsonResponse({ 
        status: 'success', 
        isAuthorized: isAuthorized, 
        name: adminName 
      });
    }

    if (action === 'checkSysDate') {
      const targetDate = e.parameter.date;
      const sysSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("系統間數");
      if (!sysSheet) {
        return createJsonResponse({ status: 'error', message: '找不到名稱為「系統間數」的工作表' });
      }
      const data = sysSheet.getDataRange().getValues();
      let exists = false;
      for (let i = 1; i < data.length; i++) {
        let rowDateStr = "";
        if (data[i][0] instanceof Date) {
          const d = data[i][0];
          rowDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else {
          rowDateStr = String(data[i][0]).trim();
        }
        if (rowDateStr === targetDate) {
          exists = true;
          break;
        }
      }
      return createJsonResponse({ status: 'success', exists: exists });
    }

    if (action === 'checkUserReport') {
      const targetDate = e.parameter.date;
      const staffName = e.parameter.name;
      const branch = e.parameter.branch;
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      if (!sheet) {
        return createJsonResponse({ status: 'error', message: '找不到名稱為「資料庫」的工作表' });
      }
      const data = sheet.getDataRange().getValues();
      let exists = false;
      for (let i = 1; i < data.length; i++) {
        let rowDateStr = "";
        if (data[i][0] instanceof Date) {
          const d = data[i][0];
          rowDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else {
          rowDateStr = String(data[i][0]).trim();
        }
        const rowBranch = String(data[i][1]).trim();
        const rowName = String(data[i][2]).trim();
        
        if (rowDateStr === targetDate && rowName === String(staffName).trim() && rowBranch === String(branch).trim()) {
          exists = true;
          break;
        }
      }
      return createJsonResponse({ status: 'success', exists: exists });
    }

    if (action === 'importSysData') {
      const targetDate = e.parameter.date;
      const sysSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("系統間數");
      if (!sysSheet) {
        return createJsonResponse({ status: 'error', message: '找不到名稱為「系統間數」的工作表' });
      }
      
      const now = new Date();
      const uploadTime = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      const rowData = [
        targetDate,
        e.parameter.expect_yaling || "",
        e.parameter.expect_fengjia || "",
        e.parameter.expect_fengguo || "",
        e.parameter.expect_fenggu || "",
        uploadTime
      ];

      const isOverwrite = e.parameter.overwrite === 'true';
      let updated = false;

      if (isOverwrite) {
        const data = sysSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          let rowDateStr = "";
          if (data[i][0] instanceof Date) {
            const d = data[i][0];
            rowDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          } else {
            rowDateStr = String(data[i][0]).trim();
          }
          if (rowDateStr === targetDate) {
            sysSheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
            updated = true;
            break;
          }
        }
      }

      if (!updated) {
        sysSheet.appendRow(rowData);
      }

      return createJsonResponse({ status: 'success', message: '匯入成功' });
    }

    if (action === 'saveRemark') {
      const targetDate = e.parameter.date;
      const branch = e.parameter.branch;
      const remark = e.parameter.remark || "";
      
      const sysSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("系統間數");
      if (!sysSheet) {
        return createJsonResponse({ status: 'error', message: '找不到名稱為「系統間數」的工作表' });
      }

      let colIndex = -1;
      if (branch === '雅霖') colIndex = 7;
      else if (branch === '豐家') colIndex = 8;
      else if (branch === '豐國') colIndex = 9;
      else if (branch === '豐谷') colIndex = 10;
      else {
        return createJsonResponse({ status: 'error', message: '未知的館別' });
      }

      const data = sysSheet.getDataRange().getValues();
      let updated = false;

      for (let i = 1; i < data.length; i++) {
        let rowDateStr = "";
        if (data[i][0] instanceof Date) {
          const d = data[i][0];
          rowDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else {
          rowDateStr = String(data[i][0]).trim();
        }
        
        if (rowDateStr === targetDate) {
          sysSheet.getRange(i + 1, colIndex).setValue(remark);
          updated = true;
          break;
        }
      }

      if (!updated) {
        return createJsonResponse({ status: 'error', message: '該日期尚未匯入系統間數，無法儲存備註' });
      }

      return createJsonResponse({ status: 'success', message: '備註儲存成功' });
    }

    if (action === 'get') {
      const targetDate = e.parameter.date; // 格式預期為 "YYYY-MM-DD"
      
      // 取出該日期的系統間數
      let expectedCounts = { "雅霖": "", "豐家": "", "豐國": "", "豐谷": "" };
      let expectedRemarks = { "雅霖": "", "豐家": "", "豐國": "", "豐谷": "" };
      try {
        const sysSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("系統間數");
        if (sysSheet) {
          const sysData = sysSheet.getDataRange().getValues();
          for (let i = 1; i < sysData.length; i++) {
            let rowDateStr = "";
            if (sysData[i][0] instanceof Date) {
              const d = sysData[i][0];
              rowDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } else {
              rowDateStr = String(sysData[i][0]).trim();
            }
            if (rowDateStr === targetDate) {
              expectedCounts["雅霖"] = sysData[i][1] !== undefined ? sysData[i][1] : "";
              expectedCounts["豐家"] = sysData[i][2] !== undefined ? sysData[i][2] : "";
              expectedCounts["豐國"] = sysData[i][3] !== undefined ? sysData[i][3] : "";
              expectedCounts["豐谷"] = sysData[i][4] !== undefined ? sysData[i][4] : "";

              expectedRemarks["雅霖"] = sysData[i][6] !== undefined ? sysData[i][6] : "";
              expectedRemarks["豐家"] = sysData[i][7] !== undefined ? sysData[i][7] : "";
              expectedRemarks["豐國"] = sysData[i][8] !== undefined ? sysData[i][8] : "";
              expectedRemarks["豐谷"] = sysData[i][9] !== undefined ? sysData[i][9] : "";
              break; // 找到一筆即可
            }
          }
        }
      } catch (e) {
        console.error("讀取系統間數失敗", e);
      }

      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      
      if (!sheet) {
        return createJsonResponse({ status: 'error', message: '找不到名稱為「資料庫」的工作表' });
      }
      
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return createJsonResponse({ status: 'success', data: [], expected: expectedCounts, remarks: expectedRemarks });
      }
      
      const headers = data[0]; // [申報日期, 館別, 姓名, 退房間數, 續住間數, 休息間數, 備註欄, 上傳時間]
      const results = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // 處理日期格式
        let rowDateStr = "";
        if (row[0] instanceof Date) {
          const d = row[0];
          rowDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else {
          rowDateStr = String(row[0]).trim();
        }

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
      
      return createJsonResponse({ status: 'success', data: results, expected: expectedCounts, remarks: expectedRemarks });
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
      
      if (data.overwrite) {
        let updated = false;
        const dbData = sheet.getDataRange().getValues();
        for (let i = 1; i < dbData.length; i++) {
          let rowDateStr = "";
          if (dbData[i][0] instanceof Date) {
            const d = dbData[i][0];
            rowDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          } else {
            rowDateStr = String(dbData[i][0]).trim();
          }
          const rowBranch = String(dbData[i][1]).trim();
          const rowName = String(dbData[i][2]).trim();

          if (rowDateStr === data.reportDate && rowName === String(data.staffName).trim() && rowBranch === String(data.branch).trim()) {
            sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
            updated = true;
            break;
          }
        }
        if (!updated) {
          sheet.appendRow(rowData);
        }
      } else {
        sheet.appendRow(rowData);
      }
      
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
