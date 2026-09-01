/*
 * Google Apps Script — C2S Mentee Management Backend
 *
 * SETUP:
 * 1. Open your Google Spreadsheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Create a second script file named "Code.gs" (or just paste into the default)
 * 5. Make sure your spreadsheet has two sheets named exactly:
 *      - "Mentors"  (columns: workerID | name | email | password)
 *        where "workerID" is the worker's ID used to sign in.
 *      - "Mentees"  (columns: id | name | status | contact | birthday | address |
 *                             cldp1 | cldp2 | cldp3 | module | moduleLesson |
 *                             potentialMentor | c2s101 | otherTrainings | remarks |
 *                             mentor | createdAt | updatedAt)
 * 6. Deploy > New deployment > Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 7. Copy the Web App URL and paste it into app.js as GAS_URL
 */

var MENTEES_SHEET = 'Mentees';
var MENTORS_SHEET = 'Mentors';

var MENTEE_HEADERS = [
  'id', 'name', 'status', 'contact', 'birthday', 'address',
  'cldp1', 'cldp2', 'cldp3', 'module', 'moduleLesson',
  'potentialMentor', 'c2s101', 'otherTrainings', 'remarks',
  'mentor', 'createdAt', 'updatedAt'
];

function doGet(e) {
  var action = e.parameter.action;
  var output = { success: false };

  try {
    if (action === 'getMentees') {
      output = { success: true, data: getMentees_() };
    } else if (action === 'getMentors') {
      output = { success: true, data: getMentors_() };
    } else if (action === 'getMentee') {
      var id = e.parameter.id;
      var all = getMentees_();
      var found = null;
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === id) { found = all[i]; break; }
      }
      output = { success: true, data: found };
    } else if (action === 'diag') {
      output = { success: true, data: diag_() };
    } else {
      output = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    output = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;
  var output = { success: false };

  try {
    if (action === 'addMentee') {
      var newMentee = body.data;
      newMentee.id = newMentee.id || generateId_();
      newMentee.createdAt = newMentee.createdAt || new Date().toISOString();
      appendRow_(MENTEES_SHEET, MENTEE_HEADERS, newMentee);
      output = { success: true, data: newMentee };

    } else if (action === 'updateMentee') {
      var updateData = body.data;
      var updated = updateMenteeRow_(updateData);
      output = { success: true, data: updated };

    } else if (action === 'deleteMentee') {
      var delId = body.id;
      deleteMenteeRow_(delId);
      output = { success: true };

    } else if (action === 'addMentor') {
      var newMentor = body.data;
      appendRow_(MENTORS_SHEET, ['workerID', 'name', 'email', 'password'], newMentor);
      output = { success: true, data: newMentor };

    } else {
      output = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    output = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Sheet helpers ---------- */

function getSheetData_(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[i][j] != null ? String(values[i][j]) : '';
    }
    rows.push(obj);
  }
  return rows;
}

function getMentees_() {
  return getSheetData_(MENTEES_SHEET);
}

function getMentors_() {
  return getSheetData_(MENTORS_SHEET);
}

function appendRow_(sheetName, headers, data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  }
  var row = headers.map(function (h) { return data[h] || ''; });
  sheet.appendRow(row);
}

function updateMenteeRow_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MENTEES_SHEET);
  if (!sheet) return null;
  var range = sheet.getDataRange();
  var values = range.getValues();
  var headers = values[0];
  var idCol = headers.indexOf('id');
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(data.id)) {
      for (var j = 0; j < headers.length; j++) {
        if (data.hasOwnProperty(headers[j])) {
          sheet.getRange(i + 1, j + 1).setValue(data[headers[j]]);
        }
      }
      var updated = {};
      var freshRow = sheet.getRange(i + 1, 1, 1, headers.length).getValues()[0];
      for (var k = 0; k < headers.length; k++) {
        updated[headers[k]] = freshRow[k] != null ? String(freshRow[k]) : '';
      }
      return updated;
    }
  }
  return null;
}

function deleteMenteeRow_(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MENTEES_SHEET);
  if (!sheet) return;
  var range = sheet.getDataRange();
  var values = range.getValues();
  var headers = values[0];
  var idCol = headers.indexOf('id');
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function generateId_() {
  return 'm' + new Date().getTime().toString(36) + Math.random().toString(36).slice(2, 7);
}

function diag_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { error: 'No active spreadsheet. Script may not be bound to a spreadsheet.' };
  var info = {
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    sheets: []
  };
  ss.getSheets().forEach(function (s) {
    info.sheets.push({
      name: s.getName(),
      lastRow: s.getLastRow()
    });
  });
  return info;
}
