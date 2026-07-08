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
            
            // 寫入休息間數 (K, L, M, N 欄, 對應 11, 12, 13, 14 欄)
            const restData = [
              e.parameter.expect_rest_yaling || "",
              e.parameter.expect_rest_fengjia || "",
              e.parameter.expect_rest_fengguo || "",
              e.parameter.expect_rest_fenggu || ""
            ];
            sysSheet.getRange(i + 1, 11, 1, 4).setValues([restData]);
            
            updated = true;
            break;
          }
        }
      }

      if (!updated) {
        // 新增時，保留 G~J 空白以相容備註，並將休息間數接在後方 K~N
        const newRowData = [
          targetDate,
          e.parameter.expect_yaling || "",
          e.parameter.expect_fengjia || "",
          e.parameter.expect_fengguo || "",
          e.parameter.expect_fenggu || "",
          uploadTime,
          "", "", "", "", // G, H, I, J 備註預設留空
          e.parameter.expect_rest_yaling || "",
          e.parameter.expect_rest_fengjia || "",
          e.parameter.expect_rest_fengguo || "",
          e.parameter.expect_rest_fenggu || ""
        ];
        sysSheet.appendRow(newRowData);
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
      let expectedRestCounts = { "雅霖": "", "豐家": "", "豐國": "", "豐谷": "" };
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

              expectedRestCounts["雅霖"] = sysData[i][10] !== undefined ? sysData[i][10] : "";
              expectedRestCounts["豐家"] = sysData[i][11] !== undefined ? sysData[i][11] : "";
              expectedRestCounts["豐國"] = sysData[i][12] !== undefined ? sysData[i][12] : "";
              expectedRestCounts["豐谷"] = sysData[i][13] !== undefined ? sysData[i][13] : "";
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
      
      let yesterdayStr = "";
      if (targetDate) {
        const parts = targetDate.split("-");
        if (parts.length === 3) {
          const tDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          tDate.setDate(tDate.getDate() - 1);
          yesterdayStr = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}-${String(tDate.getDate()).padStart(2, '0')}`;
        }
      }
      
      let yesterdayUncleaned = { "雅霖": 0, "豐家": 0, "豐國": 0, "豐谷": 0 };

      if (data.length <= 1) {
        return createJsonResponse({ status: 'success', data: [], expected: expectedCounts, expectedRest: expectedRestCounts, remarks: expectedRemarks, yesterdayUncleaned: yesterdayUncleaned });
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

        const branch = String(row[1]).trim();
        
        if (rowDateStr === yesterdayStr && yesterdayUncleaned[branch] !== undefined) {
          yesterdayUncleaned[branch] += (parseInt(row[8]) || 0);
        }

        if (rowDateStr === targetDate) {
          results.push({
            reportDate: rowDateStr,
            branch: branch,
            staffName: row[2],
            checkoutRooms: row[3],
            stayRooms: row[4],
            restRooms: row[5],
            remarks: row[6],
            uploadTime: row[7],
            uncleanedRooms: parseInt(row[8]) || 0
          });
        }
      }
      
      return createJsonResponse({ status: 'success', data: results, expected: expectedCounts, expectedRest: expectedRestCounts, remarks: expectedRemarks, yesterdayUncleaned: yesterdayUncleaned });
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
      
      // 確保欄位順序：申報日期, 館別, 姓名, 退房間數, 續住間數, 休息間數, 備註欄, 上傳時間, 留房未整
      const rowData = [
        data.reportDate,
        data.branch,
        data.staffName,
        data.checkoutRooms,
        data.stayRooms,
        data.restRooms,
        data.remarks,
        data.uploadTime,
        data.uncleanedRooms || ""
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

// ====== 新增：每週寄送稽核週報 ======
function sendWeeklyAuditReport() {
  try {
    const sheetDb = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("資料庫");
    const sheetSys = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("系統間數");
    const sheetAdmin = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("管理員");
    
    if (!sheetDb || !sheetSys || !sheetAdmin) {
      console.error("找不到必要的工作表");
      return;
    }

    // 1. 計算上週一到週日的日期範圍
    const today = new Date(); // 假設執行時是週三
    const dayOfWeek = today.getDay(); // 0(Sun) ~ 6(Sat), 週三 = 3
    
    // 如果今天不是週三，此程式依然可以跑，但我們就以「執行當下的前一個完整週(一~日)」來抓資料
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysSinceMonday - 7);
    
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - daysSinceMonday - 1);
    
    // 產生 YYYY-MM-DD 的字串陣列以便比對
    const targetDates = [];
    for (let d = new Date(lastMonday); d <= lastSunday; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      targetDates.push(`${yyyy}-${mm}-${dd}`);
    }

    // 2. 抓取 Email 清單 (管理員 C 欄, index=2)
    const adminData = sheetAdmin.getDataRange().getValues();
    const emailList = [];
    for (let i = 1; i < adminData.length; i++) {
      const email = String(adminData[i][2]).trim(); // C欄
      if (email && email.includes('@')) {
        emailList.push(email);
      }
    }
    
    if (emailList.length === 0) {
      console.log("沒有找到要寄送的 Email 名單 (管理員工作表 C 欄)");
      return;
    }

    // 3. 讀取 [資料庫] 計算申報總數
    // 結構: date -> branch -> { stayTotal, restTotal, uncleanedTotal }
    const reportSummary = {};
    
    // Add preFirstDate to calculate yesterdayUncleaned for the first targetDate
    const firstDateParts = targetDates[0].split('-');
    const preFirstDate = new Date(parseInt(firstDateParts[0]), parseInt(firstDateParts[1]) - 1, parseInt(firstDateParts[2]));
    preFirstDate.setDate(preFirstDate.getDate() - 1);
    const preFirstDateStr = `${preFirstDate.getFullYear()}-${String(preFirstDate.getMonth() + 1).padStart(2, '0')}-${String(preFirstDate.getDate()).padStart(2, '0')}`;
    
    reportSummary[preFirstDateStr] = {
      "雅霖": { stayTotal: 0, restTotal: 0, uncleanedTotal: 0 }, 
      "豐家": { stayTotal: 0, restTotal: 0, uncleanedTotal: 0 }, 
      "豐國": { stayTotal: 0, restTotal: 0, uncleanedTotal: 0 }, 
      "豐谷": { stayTotal: 0, restTotal: 0, uncleanedTotal: 0 }
    };

    targetDates.forEach(date => {
      reportSummary[date] = { 
        "雅霖": { stayTotal: 0, restTotal: 0, uncleanedTotal: 0 }, 
        "豐家": { stayTotal: 0, restTotal: 0, uncleanedTotal: 0 }, 
        "豐國": { stayTotal: 0, restTotal: 0, uncleanedTotal: 0 }, 
        "豐谷": { stayTotal: 0, restTotal: 0, uncleanedTotal: 0 } 
      };
    });
    
    const dbData = sheetDb.getDataRange().getValues();
    for (let i = 1; i < dbData.length; i++) {
      const row = dbData[i];
      let rowDateStr = "";
      if (row[0] instanceof Date) {
        rowDateStr = `${row[0].getFullYear()}-${String(row[0].getMonth() + 1).padStart(2, '0')}-${String(row[0].getDate()).padStart(2, '0')}`;
      } else {
        rowDateStr = String(row[0]).trim();
      }
      
      if (targetDates.includes(rowDateStr) || rowDateStr === preFirstDateStr) {
        const branch = String(row[1]).trim();
        const checkout = parseInt(row[3]) || 0;
        const stay = parseInt(row[4]) || 0;
        const rest = parseInt(row[5]) || 0;
        const uncleaned = parseInt(row[8]) || 0;
        
        if (reportSummary[rowDateStr] && reportSummary[rowDateStr][branch] !== undefined) {
          if (targetDates.includes(rowDateStr)) {
            reportSummary[rowDateStr][branch].stayTotal += (checkout + stay);
            reportSummary[rowDateStr][branch].restTotal += rest;
          }
          reportSummary[rowDateStr][branch].uncleanedTotal += uncleaned;
        }
      }
    }

    // 4. 讀取 [系統間數] 取得預期數值與備註
    // 結構: date -> branch -> { expected: N, expectedRest: M, remark: "..." }
    const sysSummary = {};
    targetDates.forEach(date => {
      sysSummary[date] = {
        "雅霖": { expected: null, expectedRest: null, remark: "" },
        "豐家": { expected: null, expectedRest: null, remark: "" },
        "豐國": { expected: null, expectedRest: null, remark: "" },
        "豐谷": { expected: null, expectedRest: null, remark: "" }
      };
    });
    
    const sysData = sheetSys.getDataRange().getValues();
    for (let i = 1; i < sysData.length; i++) {
      let rowDateStr = "";
      if (sysData[i][0] instanceof Date) {
        rowDateStr = `${sysData[i][0].getFullYear()}-${String(sysData[i][0].getMonth() + 1).padStart(2, '0')}-${String(sysData[i][0].getDate()).padStart(2, '0')}`;
      } else {
        rowDateStr = String(sysData[i][0]).trim();
      }
      
      if (targetDates.includes(rowDateStr)) {
        // 只要該日期有系統間數紀錄，未填寫的住宿與休息數（空字串或 undefined）在稽核時預設為 0
        sysSummary[rowDateStr]["雅霖"] = { 
          expected: sysData[i][1] !== "" && sysData[i][1] !== undefined ? parseInt(sysData[i][1]) || 0 : 0, 
          expectedRest: sysData[i][10] !== "" && sysData[i][10] !== undefined ? parseInt(sysData[i][10]) || 0 : 0,
          remark: sysData[i][6] || "" 
        };
        sysSummary[rowDateStr]["豐家"] = { 
          expected: sysData[i][2] !== "" && sysData[i][2] !== undefined ? parseInt(sysData[i][2]) || 0 : 0, 
          expectedRest: sysData[i][11] !== "" && sysData[i][11] !== undefined ? parseInt(sysData[i][11]) || 0 : 0,
          remark: sysData[i][7] || "" 
        };
        sysSummary[rowDateStr]["豐國"] = { 
          expected: sysData[i][3] !== "" && sysData[i][3] !== undefined ? parseInt(sysData[i][3]) || 0 : 0, 
          expectedRest: sysData[i][12] !== "" && sysData[i][12] !== undefined ? parseInt(sysData[i][12]) || 0 : 0,
          remark: sysData[i][8] || "" 
        };
        sysSummary[rowDateStr]["豐谷"] = { 
          expected: sysData[i][4] !== "" && sysData[i][4] !== undefined ? parseInt(sysData[i][4]) || 0 : 0, 
          expectedRest: sysData[i][13] !== "" && sysData[i][13] !== undefined ? parseInt(sysData[i][13]) || 0 : 0,
          remark: sysData[i][9] || "" 
        };
      }
    }

    // 5. 產生 HTML 信件內容
    const dateRangeStr = `${targetDates[0]} ~ ${targetDates[targetDates.length - 1]}`;
    let diffCount = 0;
    
    // 生成四館的表格
    const branches = ["雅霖", "豐家", "豐國", "豐谷"];
    let tablesHtml = "";
    
    for (const branch of branches) {
      tablesHtml += `<h3 style="color: #2c3e50; border-bottom: 2px solid #ddd; padding-bottom: 5px;">📍 ${branch}</h3>`;
      tablesHtml += `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: sans-serif; font-size: 14px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;" rowspan="2">日期</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;" colspan="3">住宿 (退+續)</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;" colspan="3">休息</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;" rowspan="2">稽核備註</th>
            </tr>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #ddd; padding: 6px; text-align: right; font-size: 12px; color: #555;">申報</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: right; font-size: 12px; color: #555;">系統</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: right; font-size: 12px; color: #555;">差異</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: right; font-size: 12px; color: #555;">申報</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: right; font-size: 12px; color: #555;">系統</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: right; font-size: 12px; color: #555;">差異</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      for (const date of targetDates) {
        const reportedObj = reportSummary[date][branch];
        const reportedStay = reportedObj.stayTotal;
        const reportedRest = reportedObj.restTotal;
        
        const expectedObj = sysSummary[date][branch];
        const expectedStayRaw = expectedObj.expected;
        
        // 取得前一日的日期字串
        const dateParts = date.split('-');
        const yesterday = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        
        let expectedStay = expectedStayRaw;
        if (expectedStayRaw !== null) {
            const todayUncleaned = reportedObj.uncleanedTotal || 0;
            const yesterdayUncleaned = reportSummary[yesterdayStr] ? reportSummary[yesterdayStr][branch].uncleanedTotal : 0;
            expectedStay = expectedStayRaw - todayUncleaned + yesterdayUncleaned;
        }

        const expectedRest = expectedObj.expectedRest;
        const remark = expectedObj.remark;
        
        let diffStayStr = "-";
        let diffRestStr = "-";
        let rowStyle = "";
        let rowHasDiff = false;
        
        if (expectedStay !== null) {
          const diff = reportedStay - expectedStay;
          if (diff > 0) {
            diffStayStr = `<span style="color: #C06C61; font-weight: bold;">+${diff}</span>`;
            rowHasDiff = true;
          } else if (diff < 0) {
            diffStayStr = `<span style="color: #B59341; font-weight: bold;">${diff}</span>`;
            rowHasDiff = true;
          } else {
            diffStayStr = "0";
          }
        }
        
        if (expectedRest !== null) {
          const diff = reportedRest - expectedRest;
          if (diff > 0) {
            diffRestStr = `<span style="color: #C06C61; font-weight: bold;">+${diff}</span>`;
            rowHasDiff = true;
          } else if (diff < 0) {
            diffRestStr = `<span style="color: #B59341; font-weight: bold;">${diff}</span>`;
            rowHasDiff = true;
          } else {
            diffRestStr = "0";
          }
        }

        if (rowHasDiff) {
            rowStyle = "background-color: #FDF3F2;"; // 有差異整列標紅底
            diffCount++;
        }
        
        tablesHtml += `
          <tr style="${rowStyle}">
            <td style="border: 1px solid #ddd; padding: 8px;">${date}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${reportedStay}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${expectedStay !== null ? expectedStay : '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right; background-color: rgba(0,0,0,0.02);">${diffStayStr}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${reportedRest}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${expectedRest !== null ? expectedRest : '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right; background-color: rgba(0,0,0,0.02);">${diffRestStr}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${remark}</td>
          </tr>
        `;
      }
      
      tablesHtml += `</tbody></table>`;
    }

    const subject = `[集團間數稽核週報] ${dateRangeStr} 房間稽核總結`;
    const summaryText = diffCount === 0 
      ? `上週 ${dateRangeStr} 各館別資料皆與系統相符，無異常。` 
      : `上週 ${dateRangeStr} 共有 <b>${diffCount}</b> 筆紀錄與系統間數不符，詳細情形請參閱下方各館明細：`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #333;">
        <h2 style="color: #2c3e50;">📊 集團間數稽核週報</h2>
        <p style="font-size: 16px; background-color: #e9ecef; padding: 15px; border-radius: 8px;">
          ${summaryText}
        </p>
        
        ${tablesHtml}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <p style="color: #777; font-size: 14px;">此信件為系統自動發送，請勿直接回覆。</p>
          <a href="https://friend7711162001-netizen.github.io/FkRoomstatistics/admin.html" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #2c3e50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">前往管理員後台查看詳細紀錄</a>
        </div>
      </div>
    `;

    // 6. 寄出信件
    MailApp.sendEmail({
      to: emailList.join(","),
      subject: subject,
      htmlBody: htmlBody
    });
    
    console.log(`週報已成功寄送至: ${emailList.join(",")}`);
    
  } catch (error) {
    console.error("發送週報失敗: " + error.toString());
  }
}
