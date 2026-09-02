(function () {
  'use strict';

  var THEME_KEY = 'c2s_theme';
  var SESSION_KEY = 'c2s_session';
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbyHfHdMDs0WpojC5aHdGYh_kytU8f7bbIfjsrTmzqg9F1xjI1R1d2ZNcV744S-MfPJb/exec';

  /* ---------- In-memory cache ---------- */

  var _mentees = [];
  var _mentors = [];

  /* ---------- Data layer (Google Sheets via Apps Script) ---------- */

  function fetchWithTimeout(url, options, ms) {
    options = options || {};
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (controller) options.signal = controller.signal;
    var timeout = setTimeout(function () {
      if (controller) controller.abort();
    }, ms || 20000);
    return fetch(url, options).then(function (res) {
      clearTimeout(timeout);
      return res;
    }).catch(function (err) {
      clearTimeout(timeout);
      if (controller && controller.signal.aborted) throw new Error('Request timed out. Please try again.');
      throw err;
    });
  }

  function apiGet(action, params) {
    var url = GAS_URL + '?action=' + encodeURIComponent(action) + '&_t=' + Date.now();
    if (params) {
      Object.keys(params).forEach(function (k) {
        url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      });
    }
    return fetchWithTimeout(url, null, 20000)
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.success) throw new Error(res.error || 'API error');
        return res.data;
      });
  }

  function apiPost(action, body) {
    return fetchWithTimeout(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(Object.assign({ action: action }, body))
    }, 20000)
      .then(function (r) {
        if (r && r.type === 'opaque') return { success: true, data: null };
        return r.json();
      })
      .then(function (res) {
        if (!res || !res.success) throw new Error((res && res.error) || 'API error');
        return res.data;
      });
  }

  function fetchMentees() {
    return apiGet('getMentees').then(function (data) {
      _mentees = Array.isArray(data) ? data : [];
      return _mentees;
    }).catch(function () {
      _mentees = [];
      return _mentees;
    });
  }

  function fetchMentors() {
    return apiGet('getMentors').then(function (data) {
      _mentors = (Array.isArray(data) ? data : []).map(normalizeMentor);
      return _mentors;
    }).catch(function () {
      _mentors = [];
      return _mentors;
    });
  }

  function getMentees() { return _mentees; }
  function getMentors() { return _mentors; }

  function getMenteeById(id) {
    return _mentees.filter(function (m) { return m.id === id; })[0] || null;
  }

  function addMentee(data) {
    data.id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    data.createdAt = new Date().toISOString();
    return apiPost('addMentee', { data: data }).then(function (saved) {
      _mentees.push(saved);
      return saved;
    });
  }

  function updateMentee(data) {
    data.updatedAt = new Date().toISOString();
    return apiPost('updateMentee', { data: data }).then(function (updated) {
      if (updated) {
        _mentees = _mentees.map(function (m) {
          return m.id === updated.id ? updated : m;
        });
      }
      return updated;
    });
  }

  function deleteMentee(id) {
    return apiPost('deleteMentee', { id: id }).then(function () {
      _mentees = _mentees.filter(function (m) { return m.id !== id; });
    });
  }

  /* ---------- Theming ---------- */

  function applyTheme() {
    var current = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', current);
    var icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = current === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
    var toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = current === 'dark';
  }

  function setTheme(mode) {
    localStorage.setItem(THEME_KEY, mode);
    applyTheme();
  }

  function toggleTheme() {
    var current = localStorage.getItem(THEME_KEY) || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  /* ---------- Helpers ---------- */

  function esc(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function statusBadgeClass(status) {
    if (status === 'Active') return 'badge-active';
    if (status === 'Inactive') return 'badge-inactive';
    return 'badge-transferred';
  }

  function yesNoBadge(val) {
    return val === 'Yes' ? '<span class="badge badge-yes">Yes</span>' : '<span class="badge badge-no">No</span>';
  }

  function trainingBadge(val) {
    var map = {
      'Completed': 'badge-completed',
      'Ongoing': 'badge-ongoing',
      'Incomplete': 'badge-incomplete',
      'Unenrolled': 'badge-unenrolled'
    };
    return '<span class="badge ' + (map[val] || 'badge-neutral') + '">' + esc(val) + '</span>';
  }

  function computeAge(birthday) {
    if (!birthday) return null;
    var b = new Date(birthday + 'T00:00:00');
    if (isNaN(b.getTime())) return null;
    var now = new Date();
    var age = now.getFullYear() - b.getFullYear();
    var m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age >= 0 ? age : null;
  }

  function flash(message, type) {
    var box = document.getElementById('flashMessage');
    if (!box) return;
    box.innerHTML = '<div class="alert alert-' + type + '">' + esc(message) + '</div>';
    setTimeout(function () { box.innerHTML = ''; }, 3600);
  }

  function setFormBusy(form, busy, busyText) {
    if (!form) return;
    var btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (busy) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = busyText || 'Saving...';
      btn.disabled = true;
    } else {
      if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
      btn.disabled = false;
    }
  }

  function setFormBusyAndRun(form, busyText, fn) {
    if (form.dataset.busy) return;
    form.dataset.busy = '1';
    setFormBusy(form, true, busyText);
    var done = function () {
      form.dataset.busy = '';
      setFormBusy(form, false);
    };
    try {
      fn(done);
    } catch (err) {
      done();
      throw err;
    }
  }

  function formatDate(iso) {
    if (!iso) return '\u2014';
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '\u2014';
    var opts = { year: 'numeric', month: 'short', day: 'numeric' };
    return d.toLocaleDateString(undefined, opts);
  }

  function showLoading(el) {
    if (el) el.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';
  }

  /* ---------- Dashboard (index.html) ---------- */

  function initials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function renderStats() {
    var el = document.getElementById('statsRow');
    if (!el) return;
    var mentees = getMentees();
    var active = mentees.filter(function (m) { return m.status === 'Active'; }).length;
    var inactive = mentees.filter(function (m) { return m.status === 'Inactive'; }).length;
    var transferred = mentees.filter(function (m) { return m.status === 'Transferred to Other Ministry'; }).length;
    el.innerHTML =
      card('Total Mentees', mentees.length, 'total') +
      card('Active', active, 'active') +
      card('Inactive', inactive, 'inactive') +
      card('Transferred', transferred, 'transferred');
  }

  function card(label, value, cls) {
    return '<div class="stat-card ' + cls + '"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + '</div></div>';
  }

  function renderTable() {
    var container = document.getElementById('tableContainer');
    if (!container) return;
    var searchEl = document.getElementById('searchInput');
    var filterEl = document.getElementById('statusFilter');
    var query = searchEl ? searchEl.value.trim().toLowerCase() : '';
    var status = filterEl ? filterEl.value : '';

    var mentees = getMentees().filter(function (m) {
      var matchQ = !query ||
        (m.name && m.name.toLowerCase().indexOf(query) !== -1) ||
        (m.contact && m.contact.indexOf(query) !== -1);
      var matchS = !status || m.status === status;
      return matchQ && matchS;
    });

    if (mentees.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>' +
        '<h3>No mentees found</h3>' +
        '<p>' + (query || status ? 'Try adjusting your search or filter.' : 'Get started by adding your first mentee.') + '</p>' +
        '</div>';
      return;
    }

    var rows = mentees.map(function (m) {
      return '<tr>' +
        '<td><div class="mentee-name">' + esc(m.name) + '</div></td>' +
        '<td><span class="badge ' + statusBadgeClass(m.status) + '"><span class="badge-dot"></span>' + esc(m.status) + '</span></td>' +
        '<td>' + yesNoBadge(m.potentialMentor) + '</td>' +
        '<td style="max-width:260px;">' + esc(m.remarks || '\u2014') + '</td>' +
        '<td><div class="row-actions">' +
        '<a href="view.html?id=' + encodeURIComponent(m.id) + '" class="btn btn-primary btn-sm">View</a>' +
        '</div></td></tr>';
    }).join('');

    container.innerHTML =
      '<table><thead><tr>' +
      '<th>Mentee</th><th>Status</th><th>Potential Mentor</th><th>Remarks</th><th style="text-align:right;">Actions</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function handleDelete(id) {
    var m = getMenteeById(id);
    if (!m) return;
    if (!confirm('Are you sure you want to delete "' + (m.name || 'this mentee') + '"? This cannot be undone.')) return;
    deleteMentee(id).then(function () {
      flash('Mentee deleted successfully.', 'success');
      setTimeout(function () { window.location.href = 'index.html'; }, 600);
    }).catch(function (err) {
      flash('Failed to delete: ' + err.message, 'danger');
    });
  }

  /* ---------- Create / Edit form ---------- */

  function bindForm() {
    var form = document.getElementById('menteeForm');
    if (!form) return;

    var birthdayEl = document.getElementById('birthday');
    var ageEl = document.getElementById('age');

    function updateAge() {
      var age = computeAge(birthdayEl.value);
      ageEl.value = age === null ? '' : String(age);
    }
    birthdayEl.addEventListener('change', updateAge);

    var contactEl = document.getElementById('contact');
    contactEl.addEventListener('input', function () {
      var digits = contactEl.value.replace(/\D/g, '');
      if (digits.length > 1 && digits.slice(0, 2) !== '09') digits = '09' + digits.replace(/^09/, '');
      contactEl.value = digits.slice(0, 11);
    });

    var editId = null;
    var urlParams = new URLSearchParams(window.location.search);
    var urlId = urlParams.get('id');

    if (window.EDIT_MODE) {
      if (!urlId) {
        window.location.href = 'index.html';
        return;
      }
      editId = urlId;

      fetchMentees().then(function () {
        var existing = getMenteeById(editId);
        if (!existing) {
          flash('Mentee not found.', 'danger');
          document.getElementById('editTitle').textContent = 'Mentee not found';
          return;
        }
        document.getElementById('name').value = existing.name || '';
        document.getElementById('status').value = existing.status || 'Active';
        document.getElementById('contact').value = existing.contact || '';
        document.getElementById('birthday').value = existing.birthday || '';
        document.getElementById('address').value = existing.address || '';
        document.getElementById('cldp1').value = existing.cldp1 || 'Unenrolled';
        document.getElementById('cldp2').value = existing.cldp2 || 'Unenrolled';
        document.getElementById('cldp3').value = existing.cldp3 || 'Unenrolled';
        var existingModuleVal = (existing.module && existing.moduleLesson)
          ? (existing.module + '|' + existing.moduleLesson)
          : (existing.moduleLesson || existing.module || '');
        setSelectValue(document.getElementById('moduleLesson'), existingModuleVal);
        document.getElementById('potentialMentor').value = existing.potentialMentor || 'No';
        document.getElementById('c2s101').value = existing.c2s101 || 'Not yet taken';
        document.getElementById('otherTrainings').value = existing.otherTrainings || '';
        document.getElementById('remarks').value = existing.remarks || '';
        updateAge();
        document.title = 'Edit Mentee - C2S Mentee Management';
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('name').value.trim();
      var contact = (document.getElementById('contact').value || '').replace(/\D/g, '');

      if (!name) { flash('Mentee name is required.', 'danger'); document.getElementById('name').focus(); return; }
      if (contact && !/^09\d{9}$/.test(contact)) { flash('Contact number must be exactly 11 digits starting with 09.', 'danger'); document.getElementById('contact').focus(); return; }

      var moduleLessonVal = document.getElementById('moduleLesson').value;
      var moduleParts = moduleLessonVal.split('|');
      var moduleLesson = moduleParts[1] || moduleLessonVal;
      var moduleLabel = moduleParts[0] || '';

      var data = {
        name: name,
        status: document.getElementById('status').value,
        contact: contact,
        birthday: document.getElementById('birthday').value || '',
        address: document.getElementById('address').value.trim(),
        cldp1: document.getElementById('cldp1').value,
        cldp2: document.getElementById('cldp2').value,
        cldp3: document.getElementById('cldp3').value,
        moduleLesson: moduleLesson,
        module: moduleLabel,
        potentialMentor: document.getElementById('potentialMentor').value,
        c2s101: document.getElementById('c2s101').value,
        otherTrainings: document.getElementById('otherTrainings').value.trim(),
        remarks: document.getElementById('remarks').value.trim()
      };

      setFormBusyAndRun(form, 'Saving...', function (done) {
        if (editId) {
          data.id = editId;
          data.mentor = (getMenteeById(editId) || {}).mentor || '';
          updateMentee(data).then(function () {
            done();
            flash('Mentee updated successfully.', 'success');
            setTimeout(function () { window.location.href = 'view.html?id=' + encodeURIComponent(editId); }, 600);
          }).catch(function (err) {
            done();
            flash('Failed to update: ' + err.message, 'danger');
          });
        } else {
          var currentUser = getSessionUser();
          data.mentor = currentUser ? String(currentUser.workerID || '') : '';
          addMentee(data).then(function () {
            done();
            flash('Mentee added successfully.', 'success');
            setTimeout(function () { window.location.href = 'index.html'; }, 600);
          }).catch(function (err) {
            done();
            flash('Failed to add: ' + err.message, 'danger');
          });
        }
      });
    });
  }

  function setSelectValue(select, value) {
    if (!value) return;
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === value) { select.selectedIndex = i; return; }
    }
    for (var j = 0; j < select.options.length; j++) {
      var opt = select.options[j];
      if (opt.text === value) { select.selectedIndex = j; return; }
    }
  }

  /* ---------- View page ---------- */

  function renderView() {
    var urlParams = new URLSearchParams(window.location.search);
    var id = urlParams.get('id');
    var nameEl = document.getElementById('detailName');
    if (!nameEl) return;

    apiGet('getMentees').then(function (data) {
      _mentees = Array.isArray(data) ? data : [];

      var m = getMenteeById(id);
      if (!m) {
        nameEl.textContent = 'Mentee not found';
        document.getElementById('detailContent').innerHTML = '<div class="empty-state"><h3>Mentee not found</h3><p>The mentee may have been deleted.</p><a href="index.html" class="btn btn-outline">&larr; Back to Dashboard</a></div>';
        return;
      }

      var age = computeAge(m.birthday);
      var moduleLabel = '';
      if (m.module && m.moduleLesson) moduleLabel = m.module + ' - ' + m.moduleLesson;
      else if (m.moduleLesson) moduleLabel = m.moduleLesson;
      else if (m.module) moduleLabel = m.module;
      else moduleLabel = '\u2014';

      document.getElementById('avatar').textContent = initials(m.name);
      nameEl.textContent = m.name || 'Untitled';
      document.getElementById('detailMeta').textContent =
        (m.mentor ? 'Mentor: @' + m.mentor : '') +
        (m.createdAt ? '  \u00B7  Added ' + new Date(m.createdAt).toLocaleDateString() : '');
      document.getElementById('statusBadge').className = 'badge ' + statusBadgeClass(m.status);
      document.getElementById('statusBadge').textContent = m.status;

      var grid = document.getElementById('detailGrid');
      grid.innerHTML =
        item('Status', esc(m.status)) +
        item('Contact Number', esc(m.contact || '\u2014')) +
        item('Birthday', m.birthday ? formatDate(m.birthday) : '\u2014') +
        item('Age', age === null ? '\u2014' : (age + ' years')) +
        item('Address', esc(m.address || '\u2014')) +
        item('Potential Mentor', yesNoBadge(m.potentialMentor)) +
        item('CLDP 1', trainingBadge(m.cldp1)) +
        item('CLDP 2', trainingBadge(m.cldp2)) +
        item('CLDP 3', trainingBadge(m.cldp3)) +
        item('Module / Lesson', esc(moduleLabel)) +
        item('C2S 101', esc(m.c2s101 || '\u2014')) +
        item('Other Trainings', esc(m.otherTrainings || '\u2014')) +
        item('Remarks', esc(m.remarks || '\u2014'), true);

      var readonly = urlParams.get('readonly') === '1';
      var editBtn = document.getElementById('editBtn');
      var deleteBtn = document.getElementById('deleteBtn');
      if (readonly) {
        if (editBtn) editBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
      } else {
        document.getElementById('editBtn').href = 'edit.html?id=' + encodeURIComponent(m.id);
        document.getElementById('deleteBtn').addEventListener('click', function () {
          handleDelete(m.id);
        });
      }
    }).catch(function (err) {
      nameEl.textContent = 'Unable to load mentee';
      document.getElementById('detailContent').innerHTML =
        '<div class="empty-state"><h3>Unable to load mentee details</h3>' +
        '<p>' + esc(err && err.message ? err.message : 'There was a problem connecting to the server.') + '</p>' +
        '<a href="index.html" class="btn btn-outline">&larr; Back to Dashboard</a></div>';
    });
  }

  function item(label, value, full) {
    return '<div class="info-item" ' + (full ? 'style="grid-column:1/-1;"' : '') + '>' +
      '<div class="info-label">' + label + '</div>' +
      '<div class="info-value">' + value + '</div></div>';
  }

  /* ---------- Settings page ---------- */

  function bindSettings() {
    var darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) {
      darkToggle.addEventListener('change', function () {
        setTheme(darkToggle.checked ? 'dark' : 'light');
        flash('Theme updated.', 'success');
      });
    }

    var accountCard = document.getElementById('accountCard');
    if (accountCard) {
      var user = getSessionUser();
      var isAdminUser = user && String(user.workerID) === ADMIN_STAFF_ID;

      if (isAdminUser) {
        accountCard.style.display = 'none';
        var emailCard = document.getElementById('emailSettingsCard');
        if (emailCard) emailCard.style.display = '';
        bindEmailSettings();
        return;
      }

      var nameEl = document.getElementById('acctName');
      var genderEl = document.getElementById('acctGender');
      var workerIDEl = document.getElementById('acctWorkerID');
      if (user) {
        if (nameEl) nameEl.value = user.name || '';
        if (genderEl) genderEl.value = user.gender || 'Male';
        if (workerIDEl) workerIDEl.value = user.workerID || '';
      }

      var form = document.getElementById('accountForm');
      if (form) {
        var saveBtn = form.querySelector('button[type="submit"]');

        function setSaving(saving) {
          if (!saveBtn) return;
          if (saving) {
            saveBtn.dataset.originalText = saveBtn.textContent;
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;
          } else {
            if (saveBtn.dataset.originalText) saveBtn.textContent = saveBtn.dataset.originalText;
            saveBtn.disabled = false;
          }
        }

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          if (saveBtn && saveBtn.disabled) return;

          var currentPass = document.getElementById('acctCurrentPass').value;
          var newName = nameEl.value.trim();
          var newGender = genderEl ? genderEl.value : '';
          var newWorkerID = workerIDEl.value.trim();
          var newPass = document.getElementById('acctNewPass').value;
          var confirmPass = document.getElementById('acctConfirmPass').value;

          if (!currentPass) { flash('Enter your current password to save changes.', 'danger'); return; }
          if (!newName) { flash('Full name is required.', 'danger'); return; }
          if (!newGender) { flash('Gender is required.', 'danger'); return; }
          if (!newWorkerID) { flash('Worker ID is required.', 'danger'); return; }
          if (newWorkerID.toLowerCase() === 'admin' || newWorkerID === ADMIN_STAFF_ID) { flash('That Worker ID is reserved.', 'danger'); return; }
          if (newPass || confirmPass) {
            if (newPass.length < 8) { flash('New password must be at least 8 characters.', 'danger'); return; }
            if (newPass !== confirmPass) { flash('New passwords do not match.', 'danger'); return; }
          }

          setSaving(true);

          loadMentorsForAuth(function () {
            var idx = indexOfMentorByUsername(user.workerID);
            if (idx === -1) { setSaving(false); flash('Account not found. Please sign out and sign in again.', 'danger'); return; }
            var mentor = _mentors[idx];

            if (mentor.password !== currentPass) { setSaving(false); flash('Current password is incorrect.', 'danger'); return; }

            var isTaken = _mentors.some(function (m) {
              return m !== mentor && (String(m.workerID).toLowerCase() === newWorkerID.toLowerCase());
            });
            if (isTaken) { setSaving(false); flash('That Worker ID is already in use.', 'danger'); return; }

            var oldWorkerID = mentor.workerID;
            var updatedMentor = {
              workerID: newWorkerID,
              name: newName,
              gender: newGender,
              password: newPass ? newPass : mentor.password
            };
            _mentors[idx] = updatedMentor;

            if (newWorkerID !== oldWorkerID) {
              _mentees = _mentees.map(function (m) {
                if (m.mentor === oldWorkerID) { m.mentor = newWorkerID; }
                return m;
              });
            }

            saveCachedMentors(_mentors);
            setSessionUser(updatedMentor, null);

            if (GAS_URL) {
              apiPost('updateMentor', { data: {
                oldWorkerID: oldWorkerID,
                workerID: newWorkerID,
                name: newName,
                gender: newGender,
                password: updatedMentor.password
              } }).catch(function () {});
            }

            setSaving(false);
            flash('Account updated successfully.', 'success');
            setTimeout(function () {
              if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
              window.scrollTo(0, 0);
              window.location.reload();
            }, 700);
          });
        });
      }
    }
  }

  /* ---------- Admin dashboard ---------- */

  function genderTitle(gender) {
    return String(gender || '').toLowerCase() === 'female' ? 'GORGEOUS' : 'GWAPO';
  }

  function buildMentorGroupHtml(mentorList, mentees) {
    return mentorList.map(function (mn) {
      var own = mentees.filter(function (m) { return String(m.mentor || '').trim() === String(mn.workerID || '').trim(); });
      var count = own.length;

      var menteeRows = own.length === 0
        ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No mentees assigned</td></tr>'
        : own.map(function (m) {
            return '<tr>' +
              '<td><a href="view.html?id=' + encodeURIComponent(m.id) + '&amp;readonly=1" class="mentee-name" style="color:var(--primary);">' + esc(m.name) + '</a></td>' +
              '<td><span class="badge ' + statusBadgeClass(m.status) + '"><span class="badge-dot"></span>' + esc(m.status) + '</span></td>' +
              '<td>' + yesNoBadge(m.potentialMentor) + '</td>' +
              '<td style="max-width:280px;">' + esc(m.remarks || '\u2014') + '</td>' +
              '</tr>';
          }).join('');

      var menteeBlock = own.length
        ? '<div class="admin-mentees" style="display:none;border-top:1px solid var(--border);">' +
          '<table><thead><tr><th>Mentee</th><th>Status</th><th>Potential Mentor</th><th>Remarks</th></tr></thead>' +
          '<tbody>' + menteeRows + '</tbody></table></div>'
        : '<div class="admin-mentees" style="display:none;border-top:1px solid var(--border);padding:16px 20px;color:var(--text-muted);">No mentees assigned.</div>';

      return '<div class="table-wrap admin-group" style="margin-bottom:16px;">' +
        '<div class="admin-mentor" data-mentor="' + esc(mn.workerID) + '" style="display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;padding:18px 20px;cursor:pointer;">' +
        '<div style="flex:1;min-width:150px;display:flex;align-items:center;justify-content:space-between;gap:12px;">' +
        '<span class="admin-mentor-name">' + esc(mn.name) + '</span>' +
        '<span class="admin-caret" style="color:var(--text-muted);">&#9662;</span>' +
        '</div>' +
        '<div style="display:flex;flex:1;min-width:200px;gap:24px;flex-wrap:wrap;">' +
        '<div><div class="info-label">Worker ID</div><div class="info-value">' + esc(mn.workerID) + '</div></div>' +
        '<div><div class="info-label">Password</div><div class="info-value">' + esc(mn.password || '\u2014') + '</div></div>' +
        '</div>' +
        '<div style="display:flex;flex:1;min-width:200px;gap:24px;flex-wrap:wrap;">' +
        '<div><div class="info-label">Gender</div><div class="info-value">' + esc(mn.gender || '\u2014') + '</div></div>' +
        '<div><div class="info-label">Mentees</div><div><span class="badge badge-neutral">' + count + '</span></div></div>' +
        '</div>' +
        '</div>' + menteeBlock + '</div>';
    }).join('');
  }

  function bindMentorExpand() {
    var container = document.getElementById('adminTableContainer');
    if (!container) return;
    container.querySelectorAll('.admin-group').forEach(function (group) {
      var block = group.querySelector('.admin-mentees');
      var caret = group.querySelector('.admin-caret');
      group.querySelector('.admin-mentor').addEventListener('click', function () {
        var isHidden = block.style.display === 'none';
        block.style.display = isHidden ? '' : 'none';
        caret.innerHTML = isHidden ? '&#9652;' : '&#9662;';
      });
    });
  }

  function renderMentorsPage() {
    var tableEl = document.getElementById('adminTableContainer');
    var titleEl = document.getElementById('mentorListTitle');
    var subEl = document.getElementById('mentorListSubtitle');
    var pageTitle = document.getElementById('pageTitle');
    if (!tableEl) return;

    var params = new URLSearchParams(window.location.search);
    var gender = params.get('gender') || '';
    var title = genderTitle(gender);

    if (titleEl) titleEl.textContent = title;
    if (pageTitle) pageTitle.textContent = title;
    if (subEl) subEl.textContent = '';

    showLoading(tableEl);

    Promise.all([fetchMentors(), fetchMentees()]).then(function () {
      var mentors = getMentors().filter(function (mn) { return mn.workerID !== ADMIN_STAFF_ID; });
      var mentees = getMentees();
      var filtered = mentors.filter(function (mn) {
        return String(mn.gender || '').toLowerCase() === gender.toLowerCase();
      });

      if (filtered.length === 0) {
        tableEl.innerHTML = '<div class="empty-state"><h3>No ' + title + ' mentors</h3><p>No mentors in this category yet.</p></div>';
        return;
      }

      tableEl.innerHTML = buildMentorGroupHtml(filtered, mentees);
      bindMentorExpand();
    });
  }

  function renderAdmin() {
    var statsEl = document.getElementById('adminStats');
    var tableEl = document.getElementById('adminGenderContainer');
    if (!statsEl || !tableEl) return;

    showLoading(tableEl);

    Promise.all([fetchMentors(), fetchMentees()]).then(function () {
      var mentors = getMentors().filter(function (mn) { return mn.workerID !== ADMIN_STAFF_ID; });
      var mentees = getMentees();
      var totalMentees = mentees.length;
      var totalMembers = mentors.length + totalMentees;

      statsEl.innerHTML =
        card('Total Mentors', mentors.length, 'total') +
        card('Total Mentees', totalMentees, 'active') +
        card('Total Members', totalMembers, 'transferred');

      var males = mentors.filter(function (mn) { return String(mn.gender || '').toLowerCase() === 'male'; });
      var females = mentors.filter(function (mn) { return String(mn.gender || '').toLowerCase() === 'female'; });

      function genderCard(name, count, link, cls) {
        return '<a href="' + link + '" class="stat-card ' + cls + '" style="display:block;text-decoration:none;color:inherit;">' +
          '<div class="stat-label">' + esc(name) + '</div>' +
          '<div class="stat-value">' + count + '</div>' +
          '</a>';
      }

      tableEl.innerHTML = '<section class="stats" style="margin-bottom:0;">' +
        genderCard('GWAPO MENTORS', males.length, 'mentors.html?gender=male', 'total') +
        genderCard('GORGEOUS MENTORS', females.length, 'mentors.html?gender=female', 'active') +
        '</section>';
    });
  }

  /* ---------- Email notification settings (admin) ---------- */

  function bindEmailSettings() {
    var card = document.getElementById('emailSettingsCard');
    var form = document.getElementById('emailSettingsForm');
    if (!card || !form) return;

    var emailEl = document.getElementById('notifyEmail');
    var testBtn = document.getElementById('testEmailBtn');

    function applySettings(s) {
      s = s || {};
      if (s.notifyEmail !== undefined) emailEl.value = s.notifyEmail || '';
    }

    function collectSettings() {
      return { notifyEmail: emailEl.value.trim() };
    }

    apiGet('getSettings').then(applySettings).catch(function () {});

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = emailEl.value.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        flash('Please enter a valid recipient email.', 'danger');
        return;
      }
      var settings = collectSettings();
      apiPost('saveSettings', { data: settings }).then(function () {
        return apiGet('getSettings');
      }).then(function (saved) {
        applySettings(saved);
        flash('Email notification settings saved.', 'success');
      }).catch(function (err) {
        flash('Failed to save settings: ' + err.message, 'danger');
      });
    });

    if (testBtn) {
      testBtn.addEventListener('click', function () {
        var email = emailEl.value.trim();
        if (!email) { flash('Enter a recipient email before sending a test.', 'danger'); return; }
        testBtn.disabled = true;
        var settings = collectSettings();
        apiPost('saveSettings', { data: settings }).then(function () {
          return apiPost('testEmail', { data: settings });
        }).then(function () {
          flash('Test email sent.', 'success');
          testBtn.disabled = false;
        }).catch(function (err) {
          flash('Failed to send test email: ' + err.message, 'danger');
          testBtn.disabled = false;
        });
      });
    }
  }

  /* ---------- Authentication ---------- */

  var ADMIN_STAFF_ID = '1990';
  var ADMIN_PASSWORD = 'admin123';
  var MENTORS_CACHE_KEY = 'c2s_mentors_cache';

  var DEFAULT_ADMIN = { workerID: ADMIN_STAFF_ID, name: 'Administrator', password: ADMIN_PASSWORD };

  function getSessionUser() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSessionUser(user, redirect) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    if (redirect) window.location.href = redirect;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function isAdmin(user) {
    return user && String(user.workerID) === ADMIN_STAFF_ID;
  }

  function indexOfMentorByUsername(username) {
    if (!username) return -1;
    for (var i = 0; i < _mentors.length; i++) {
      var id = _mentors[i].workerID || _mentors[i].username || '';
      if (String(id) === username) return i;
    }
    return -1;
  }

  function getCachedMentors() {
    try {
      var raw = localStorage.getItem(MENTORS_CACHE_KEY);
      var list = raw ? JSON.parse(raw) : null;
      if (Array.isArray(list) && list.length) return list;
    } catch (e) {}
    return null;
  }

  function saveCachedMentors(list) {
    try {
      localStorage.setItem(MENTORS_CACHE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function normalizeMentor(m) {
    if (!m.workerID && m.username) m.workerID = m.username;
    return m;
  }

  function mergeMentors(list) {
    var merged = (list || []).slice().map(normalizeMentor);
    var cached = getCachedMentors();
    if (cached) {
      cached.slice().map(normalizeMentor).forEach(function (c) {
        var exists = merged.some(function (m) { return String(m.workerID) === String(c.workerID); });
        if (!exists) merged.push(c);
      });
    }
    if (!merged.some(function (m) { return String(m.workerID) === ADMIN_STAFF_ID; })) {
      merged.unshift(DEFAULT_ADMIN);
    }
    saveCachedMentors(merged);
    return merged;
  }

  function loadMentorsForAuth(cb) {
    function done() {
      if (!_mentors.some(function (m) { return String(m.workerID) === ADMIN_STAFF_ID; })) {
        _mentors.unshift(DEFAULT_ADMIN);
      }
      cb();
    }

    function fetchAndMerge() {
      fetchMentors().then(function () {
        var fetched = Array.isArray(_mentors) ? _mentors : [];
        _mentors = mergeMentors(fetched);
        done();
      });
    }

    if (_mentors.length) { done(); return; }

    var cached = getCachedMentors();
    if (cached && cached.length) {
      _mentors = cached.slice();
      done();
      fetchAndMerge();
    } else {
      fetchAndMerge();
    }
  }

  function renderNav() {
    var user = getSessionUser();
    var container = document.querySelector('.topbar-actions');
    if (!container) return;

    var links = [];

    if (window.AUTH_PAGE) return;

    if (user) {
      links.push('<a href="settings.html">Settings</a>');
      links.push('<span class="topbar-user">' + esc(user.name || user.workerID) + '</span>');
      links.push('<a href="#" id="logoutLink" class="btn btn-outline btn-sm">Logout</a>');
    } else {
      links.push('<a href="login.html" class="btn btn-outline btn-sm">Login</a>');
    }

    container.innerHTML =
      '<nav class="topbar-nav">' + links.join('') + '</nav>';

    var logout = document.getElementById('logoutLink');
    if (logout) {
      logout.addEventListener('click', function (e) {
        e.preventDefault();
        clearSession();
        window.location.href = 'login.html';
      });
    }
  }

  function requireAuth() {
    var user = getSessionUser();
    var protectedPage = !/login\.html|register\.html/.test(window.location.pathname);
    if (protectedPage && !user && GAS_URL) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  function bindAuth() {
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var username = document.getElementById('loginUsername').value.trim();
        var password = document.getElementById('loginPassword').value;

        if (!username || !password) { flash('Please enter your Worker ID and password.', 'danger'); return; }

        if (username === ADMIN_STAFF_ID && password === ADMIN_PASSWORD) {
          setSessionUser({ workerID: ADMIN_STAFF_ID, name: 'Administrator' }, 'admin.html');
          return;
        }

        setFormBusyAndRun(loginForm, 'Signing in...', function (done) {
          loadMentorsForAuth(function () {
            var idx = indexOfMentorByUsername(username);
            if (idx === -1) {
              fetchMentors().then(function () {
                _mentors = mergeMentors(_mentors);
                var idx2 = indexOfMentorByUsername(username);
                if (idx2 === -1) { done(); flash('No account found with that Worker ID.', 'danger'); return; }
                if (_mentors[idx2].password !== password) { done(); flash('Incorrect password.', 'danger'); return; }
                var m2 = _mentors[idx2];
                setSessionUser({ workerID: m2.workerID, name: m2.name, gender: m2.gender || '' }, 'index.html');
              });
              return;
            }
            if (_mentors[idx].password !== password) { done(); flash('Incorrect password.', 'danger'); return; }
            var m = _mentors[idx];
            setSessionUser({ workerID: m.workerID, name: m.name, gender: m.gender || '' }, 'index.html');
          });
        });
      });
    }

    var registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = document.getElementById('regName').value.trim();
        var gender = document.getElementById('regGender') ? document.getElementById('regGender').value : '';
        var username = document.getElementById('regUsername').value.trim();
        var password = document.getElementById('regPassword').value;
        var confirm = document.getElementById('regConfirm').value;

        if (!name) { flash('Full name is required.', 'danger'); return; }
        if (!gender) { flash('Gender is required.', 'danger'); return; }
        if (!username) { flash('Worker ID is required.', 'danger'); return; }
        if (username.toLowerCase() === 'admin' || username === ADMIN_STAFF_ID) { flash('That Worker ID is reserved.', 'danger'); return; }
        if (password.length < 8) { flash('Password must be at least 8 characters.', 'danger'); return; }
        if (password !== confirm) { flash('Passwords do not match.', 'danger'); return; }

        setFormBusyAndRun(registerForm, 'Creating...', function (done) {
          loadMentorsForAuth(function () {
            var idx = indexOfMentorByUsername(username);
            if (idx !== -1) { done(); flash('That Worker ID is already registered.', 'danger'); return; }

            var newMentor = { workerID: username, name: name, gender: gender, password: password };
            _mentors.push(newMentor);
            saveCachedMentors(_mentors);

            if (GAS_URL) {
              apiPost('addMentor', { data: { workerID: username, name: name, gender: gender, password: password } }).then(function () {
                done();
                flash('Account created successfully. Please sign in.', 'success');
                setTimeout(function () { window.location.href = 'login.html'; }, 600);
              }).catch(function () {
                done();
                flash('Account created. Please sign in.', 'success');
                setTimeout(function () { window.location.href = 'login.html'; }, 600);
              });
            } else {
              done();
              flash('Account created successfully. Please sign in.', 'success');
              setTimeout(function () { window.location.href = 'login.html'; }, 600);
            }
          });
        });
      });
    }
  }

  /* ---------- Init ---------- */

  function init() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    applyTheme();

    var themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    renderNav();
    bindAuth();

    if (window.AUTH_PAGE) return;

    if (!requireAuth()) return;

    if (!GAS_URL) {
      flash('Google Apps Script URL not configured. Please set GAS_URL in app.js.', 'danger');
      return;
    }

    if (document.getElementById('statsRow')) {
      showLoading(document.getElementById('statsRow'));
      fetchMentees().then(function () {
        renderStats();
        renderTable();
        var searchEl = document.getElementById('searchInput');
        var filterEl = document.getElementById('statusFilter');
        if (searchEl) searchEl.addEventListener('input', renderTable);
        if (filterEl) { filterEl.addEventListener('change', renderTable); filterEl.addEventListener('input', renderTable); }
      });
    } else if (document.getElementById('tableContainer')) {
      showLoading(document.getElementById('tableContainer'));
      fetchMentees().then(function () {
        renderTable();
        var searchEl = document.getElementById('searchInput');
        var filterEl = document.getElementById('statusFilter');
        if (searchEl) searchEl.addEventListener('input', renderTable);
        if (filterEl) { filterEl.addEventListener('change', renderTable); filterEl.addEventListener('input', renderTable); }
      });
    }

    if (window.ADMIN_MODE) renderAdmin();
    if (window.MENTORS_MODE) renderMentorsPage();

    bindForm();
    renderView();
    bindSettings();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
