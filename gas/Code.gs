/*
 * Google Apps Script — C2S Mentee Management Backend
 *
 * SETUP:
 * 1. Open your Google Spreadsheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Create a second script file named "Code.gs" (or just paste into the default)
 * 5. Make sure your spreadsheet has two sheets named exactly:
 *      - "Mentors"  (columns: workerID | name | gender | password)
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
var SETTINGS_SHEET = 'Settings';

var MENTEE_HEADERS = [
  'id', 'name', 'status', 'contact', 'birthday', 'address',
  'cldp1', 'cldp2', 'cldp3', 'module', 'moduleLesson',
  'potentialMentor', 'c2s101', 'otherTrainings', 'remarks',
  'mentor', 'createdAt', 'updatedAt'
];

function doGet(e) {
  var output = { success: false };
  if (!e || !e.parameter) {
    return ContentService
      .createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var action = e.parameter.action;

  try {
    if (action === 'getMentees') {
      output = { success: true, data: getMentees_() };
    } else if (action === 'getMentors') {
      output = { success: true, data: getMentors_() };
    } else if (action === 'getMentee') {
      var id = e.parameter.id || null;
      var all = getMentees_();
      var found = null;
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === id) { found = all[i]; break; }
      }
      output = { success: true, data: found };
    } else if (action === 'getSettings') {
      output = { success: true, data: getSettings_() };
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
  var output = { success: false };
  var body = null;
  try {
    body = (e && e.postData) ? JSON.parse(e.postData.contents) : {};
  } catch (err) {
    body = {};
  }
  var action = body.action;

  try {
    if (action === 'addMentee') {
      var newMentee = body.data;
      newMentee.id = newMentee.id || generateId_();
      newMentee.createdAt = newMentee.createdAt || new Date().toISOString();
      appendRow_(MENTEES_SHEET, MENTEE_HEADERS, newMentee);
      output = { success: true, data: newMentee };
      sendNotification_(
        'New mentee added',
        'A mentee was added to the system by mentor "' + (newMentee.mentor || 'Unknown') + '".\n\n' +
          'Name: ' + newMentee.name + '\n' +
          'Status: ' + newMentee.status + '\n' +
          'Mentor: ' + newMentee.mentor
      );

    } else if (action === 'updateMentee') {
      var updateData = body.data;
      var updated = updateMenteeRow_(updateData);
      output = { success: true, data: updated };
      sendNotification_(
        'Mentee updated',
        'A mentee was updated by mentor "' + (updateData.mentor || 'Unknown') + '".\n\n' +
          'Name: ' + (updated ? updated.name : updateData.name) + '\n' +
          'Status: ' + (updated ? updated.status : updateData.status)
      );

    } else if (action === 'deleteMentee') {
      var delId = body.id;
      deleteMenteeRow_(delId);
      output = { success: true };

    } else if (action === 'addMentor') {
      var newMentor = body.data;
      appendRow_(MENTORS_SHEET, ['workerID', 'name', 'gender', 'password'], newMentor);
      output = { success: true, data: newMentor };
      sendNotification_(
        'New mentor registered',
        'A new mentor registered an account.\n\n' +
          'Name: ' + newMentor.name + '\n' +
          'Gender: ' + newMentor.gender + '\n' +
          'Worker ID: ' + newMentor.workerID
      );

    } else if (action === 'updateMentor') {
      var upData = body.data;
      updateMentorRow_(upData);
      output = { success: true, data: upData };
      sendNotification_(
        'Mentor account updated',
        'A mentor updated their account information.\n\n' +
          'Previous Worker ID: ' + upData.oldWorkerID + '\n' +
          'Worker ID: ' + upData.workerID + '\n' +
          'Name: ' + upData.name + '\n' +
          'Gender: ' + upData.gender
      );

    } else if (action === 'saveSettings') {
      saveSettings_(body.data || {});
      output = { success: true, data: getSettings_() };

    } else if (action === 'testEmail') {
      var sendResult = sendNotification_('C2S Test Email', 'This is a test notification from the C2S Mentee Management System. Your email settings are working correctly.');
      output = { success: sendResult.ok, error: sendResult.error || null };

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

function updateMentorRow_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MENTORS_SHEET);
  if (!sheet) return;
  var range = sheet.getDataRange();
  var values = range.getValues();
  var headers = values[0];
  var idCol = headers.indexOf('workerID');
  if (idCol === -1) return;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(data.oldWorkerID)) {
      var rowIndex = i + 1;
      var newWorkerID = data.workerID || data.oldWorkerID;
      sheet.getRange(rowIndex, idCol + 1).setValue(newWorkerID);
      var nameCol = headers.indexOf('name');
      if (nameCol !== -1) sheet.getRange(rowIndex, nameCol + 1).setValue(data.name || '');
      var genderCol = headers.indexOf('gender');
      if (genderCol !== -1) sheet.getRange(rowIndex, genderCol + 1).setValue(data.gender || '');
      var passCol = headers.indexOf('password');
      if (passCol !== -1) sheet.getRange(rowIndex, passCol + 1).setValue(data.password || '');

      reassignMenteesTo_(data.oldWorkerID, newWorkerID);
      break;
    }
  }
}

function reassignMenteesTo_(oldWorkerID, newWorkerID) {
  if (oldWorkerID === newWorkerID) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MENTEES_SHEET);
  if (!sheet) return;
  var range = sheet.getDataRange();
  var values = range.getValues();
  var headers = values[0];
  var mentorCol = headers.indexOf('mentor');
  if (mentorCol === -1) return;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][mentorCol]) === String(oldWorkerID)) {
      sheet.getRange(i + 1, mentorCol + 1).setValue(newWorkerID);
    }
  }
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

/* ---------- Email notification settings ---------- */

var DEFAULT_SETTINGS = {
  notifyEmail: ''
};

function ensureSettingsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SETTINGS_SHEET);
    sheet.appendRow(['key', 'value']);
  }
  return sheet;
}

function getSettings_() {
  var settings = {};
  var keys = Object.keys(DEFAULT_SETTINGS);
  for (var i = 0; i < keys.length; i++) settings[keys[i]] = DEFAULT_SETTINGS[keys[i]];

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!sheet) return settings;

  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length <= 1) return settings;
  for (var r = 1; r < values.length; r++) {
    var key = String(values[r][0]);
    if (settings.hasOwnProperty(key)) settings[key] = values[r][1] != null ? String(values[r][1]) : '';
  }
  return settings;
}

function saveSettings_(data) {
  var sheet = ensureSettingsSheet_();
  var keys = Object.keys(DEFAULT_SETTINGS);
  var range = sheet.getDataRange();
  var values = range.getValues();
  var newRows = [];

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var hasValue = data.hasOwnProperty(key);
    var newVal = hasValue ? String(data[key]) : DEFAULT_SETTINGS[key];
    var found = false;
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][0]) === key) {
        sheet.getRange(r + 1, 2).setValue(newVal);
        found = true;
        break;
      }
    }
    if (!found) newRows.push([key, newVal]);
  }
  if (newRows.length) sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 2).setValues(newRows);
}

function sendNotification_(subject, body) {
  try {
    var settings = getSettings_();
    var to = String(settings.notifyEmail || '').trim();
    if (!to) return { ok: false, error: 'No recipient email is saved. Save a recipient address first.' };

    MailApp.sendEmail(to, '[C2S] ' + subject, body);
    return { ok: true };
  } catch (err) {
    Logger.log('Notification error: ' + err.message);
    return { ok: false, error: err.message };
  }
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
