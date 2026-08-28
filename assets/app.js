(function () {
  'use strict';

  var STORAGE_KEY = 'c2s_mentees';
  var THEME_KEY = 'c2s_theme';

  /* ---------- Data layer (localStorage) ---------- */

  var SAMPLE_MENTEES = [
    { name: 'Ana Reyes', status: 'Active', contact: '09171234501', birthday: '2004-05-12', address: '123 Mabini St., Brgy. San Antonio, Manila', cldp1: 'Completed', cldp2: 'Ongoing', cldp3: 'Unenrolled', moduleLesson: 'Lesson 1', module: 'Module 1', potentialMentor: 'Yes', c2s101: 'Lesson 2', otherTrainings: 'ASP, Worship Team', remarks: 'Very engaged in group activities and always on time.' },
    { name: 'Carlos Mendoza', status: 'Active', contact: '09171234502', birthday: '2003-09-03', address: '456 Luna Ave., Brgy. Katipunan, Quezon City', cldp1: 'Ongoing', cldp2: 'Unenrolled', cldp3: 'Unenrolled', moduleLesson: 'Lesson 3', module: 'Module 2', potentialMentor: 'No', c2s101: 'Lesson 1', otherTrainings: 'Revamp', remarks: 'Shows potential, just started CLDP 1 recently.' },
    { name: 'Bianca Santos', status: 'Inactive', contact: '09171234503', birthday: '2005-01-27', address: '789 Rizal Rd., Brgy. Sta. Cruz, Manila', cldp1: 'Incomplete', cldp2: 'Unenrolled', cldp3: 'Unenrolled', moduleLesson: 'Lesson 2', module: 'Module 1', potentialMentor: 'No', c2s101: 'Lesson 4', otherTrainings: 'First Aid Training', remarks: 'On a break, planning to return next quarter.' },
    { name: 'Daniel Cruz', status: 'Transferred to Other Ministry', contact: '09171234504', birthday: '2002-11-19', address: '321 Bonifacio St., Brgy. Maybunga, Pasig', cldp1: 'Completed', cldp2: 'Completed', cldp3: 'Ongoing', moduleLesson: 'Lesson 5', module: 'Module 3', potentialMentor: 'Yes', c2s101: 'Completed', otherTrainings: 'Worship Team, Revamp', remarks: 'Transferred to the Youth Ministry department.' },
    { name: 'Elena Torres', status: 'Active', contact: '09171234505', birthday: '2004-03-08', address: '654 Aguinaldo Ave., Brgy. Poblacion, Makati', cldp1: 'Unenrolled', cldp2: 'Unenrolled', cldp3: 'Unenrolled', moduleLesson: 'Lesson 1', module: 'Module 1', potentialMentor: 'No', c2s101: 'Lesson 1', otherTrainings: 'None yet', remarks: 'New mentee, just enrolled this quarter.' },
    { name: 'Miguel Aquino', status: 'Active', contact: '09171234506', birthday: '2001-07-22', address: '987 Katipunan Ave., Brgy. Loyola, Quezon City', cldp1: 'Completed', cldp2: 'Completed', cldp3: 'Completed', moduleLesson: 'Lesson 6', module: 'Module 4', potentialMentor: 'Yes', c2s101: 'Completed', otherTrainings: 'ASP, Revamp, Leadership Training', remarks: 'Graduated all CLDP levels, ready to become a mentor.' },
    { name: 'Sofia Ramos', status: 'Active', contact: '09171234507', birthday: '2005-12-01', address: '135 P. Burgos St., Brgy. Sampaloc, Manila', cldp1: 'Ongoing', cldp2: 'Unenrolled', cldp3: 'Unenrolled', moduleLesson: 'Lesson 4', module: 'Module 2', potentialMentor: 'No', c2s101: 'Lesson 3', otherTrainings: 'Creative Arts Team', remarks: 'Very creative, leads the arts subgroup.' },
    { name: 'Luke Navarro', status: 'Inactive', contact: '09171234508', birthday: '2004-02-14', address: '246 Espana Blvd., Brgy. Dapitan, Manila', cldp1: 'Unenrolled', cldp2: 'Unenrolled', cldp3: 'Unenrolled', moduleLesson: 'Lesson 1', module: 'Module 1', potentialMentor: 'No', c2s101: 'Lesson 1', otherTrainings: 'Sports Ministry', remarks: 'Recently inactive due to school schedule.' }
  ];

  var MENTOR_SLOTS = ['jdoe', 'ssmith', 'mgarcia'];

  function seedMentees() {
    var seeded = SAMPLE_MENTEES.map(function (m, i) {
      return Object.assign({}, m, {
        id: 'sample' + (i + 1),
        createdAt: new Date().toISOString(),
        mentor: MENTOR_SLOTS[i % MENTOR_SLOTS.length]
      });
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function getMentees() {
    var list;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      list = raw ? JSON.parse(raw) : [];
    } catch (e) {
      list = [];
    }
    if (!Array.isArray(list) || list.length === 0) {
      return seedMentees().slice();
    }
    var redistributed = false;
    if (list.some(function (m) { return m.mentor === 'admin'; })) {
      list = list.map(function (m, i) {
        if (m.mentor === 'admin') {
          m = Object.assign({}, m, { mentor: MENTOR_SLOTS[i % MENTOR_SLOTS.length] });
          redistributed = true;
        }
        return m;
      });
    }
    if (redistributed) localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  }

  function saveMentees(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function getMenteeById(id) {
    return getMentees().filter(function (m) { return m.id === id; })[0] || null;
  }

  function uid() {
    return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- Theming ---------- */

  function applyTheme() {
    var current = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', current);
    var icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = current === 'dark' ? '☀️' : '🌙';
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

  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    var opts = { year: 'numeric', month: 'short', day: 'numeric' };
    return d.toLocaleDateString(undefined, opts);
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
        '<td><div class="mentee-name">' + esc(m.name) + '</div><div class="mentee-sub">' + esc(m.contact || 'No contact') + '</div></td>' +
        '<td><span class="badge ' + statusBadgeClass(m.status) + '"><span class="badge-dot"></span>' + esc(m.status) + '</span></td>' +
        '<td>' + yesNoBadge(m.potentialMentor) + '</td>' +
        '<td style="max-width:260px;">' + esc(m.remarks || '—') + '</td>' +
        '<td><div class="row-actions">' +
        '<a href="view.html?id=' + encodeURIComponent(m.id) + '" class="btn btn-primary btn-sm">View</a>' +
        '</div></td></tr>';
    }).join('');

    container.innerHTML =
      '<table><thead><tr>' +
      '<th>Mentee</th><th>Status</th><th>Potential Mentor</th><th>Remarks</th><th style="text-align:right;">Actions</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';

    container.querySelectorAll('[data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = decodeURIComponent(btn.getAttribute('data-delete'));
        handleDelete(id);
      });
    });
  }

  function handleDelete(id) {
    var m = getMenteeById(id);
    if (!m) return;
    if (!confirm('Are you sure you want to delete "' + (m.name || 'this mentee') + '"? This cannot be undone.')) return;
    var list = getMentees().filter(function (x) { return x.id !== id; });
    saveMentees(list);
    flash('Mentee deleted successfully.', 'success');
    renderStats();
    renderTable();
  }

  /* ---------- Mentor data ---------- */

  var SAMPLE_MENTORS = [
    { username: 'admin', name: 'Administrator', email: 'admin@c2s.local', password: 'admin12345' },
    { username: 'jdoe', name: 'John Doe', email: 'john.doe@example.com', password: 'password1' },
    { username: 'ssmith', name: 'Sarah Smith', email: 'sarah.smith@example.com', password: 'password2' },
    { username: 'mgarcia', name: 'Maria Garcia', email: 'maria.garcia@example.com', password: 'password3' }
  ];

  function getMentors() {
    try {
      var raw = localStorage.getItem('c2s_mentors');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    localStorage.setItem('c2s_mentors', JSON.stringify(SAMPLE_MENTORS));
    return SAMPLE_MENTORS.slice();
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
      document.getElementById('c2s101').value = existing.c2s101 || 'Lesson 1';
      document.getElementById('otherTrainings').value = existing.otherTrainings || '';
      document.getElementById('remarks').value = existing.remarks || '';
      updateAge();
      document.title = 'Edit Mentee - C2S Mentee Management';
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

      var list = getMentees();
      if (editId) {
        list = list.map(function (m) {
          if (m.id === editId) return Object.assign({}, m, data, { updatedAt: new Date().toISOString() });
          return m;
        });
        saveMentees(list);
        flash('Mentee updated successfully.', 'success');
        setTimeout(function () { window.location.href = 'view.html?id=' + encodeURIComponent(editId); }, 600);
      } else {
        data.id = uid();
        data.createdAt = new Date().toISOString();
        data.mentor = 'admin';
        list.push(data);
        saveMentees(list);
        flash('Mentee added successfully.', 'success');
        setTimeout(function () { window.location.href = 'index.html'; }, 600);
      }
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
    var m = getMenteeById(id);
    var nameEl = document.getElementById('detailName');
    if (!nameEl) return;

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
    else moduleLabel = '—';

    document.getElementById('avatar').textContent = initials(m.name);
    nameEl.textContent = m.name || 'Untitled';
    document.getElementById('detailMeta').textContent =
      (m.mentor ? 'Mentor: @' + m.mentor : '') +
      (m.createdAt ? '  ·  Added ' + new Date(m.createdAt).toLocaleDateString() : '');
    document.getElementById('statusBadge').className = 'badge ' + statusBadgeClass(m.status);
    document.getElementById('statusBadge').textContent = m.status;

    var grid = document.getElementById('detailGrid');
    grid.innerHTML =
      item('Status', esc(m.status)) +
      item('Contact Number', esc(m.contact || '—')) +
      item('Birthday', m.birthday ? formatDate(m.birthday) : '—') +
      item('Age', age === null ? '—' : (age + ' years')) +
      item('Address', esc(m.address || '—')) +
      item('Potential Mentor', yesNoBadge(m.potentialMentor)) +
      item('CLDP 1', trainingBadge(m.cldp1)) +
      item('CLDP 2', trainingBadge(m.cldp2)) +
      item('CLDP 3', trainingBadge(m.cldp3)) +
      item('Module / Lesson', esc(moduleLabel)) +
      item('C2S 101', esc(m.c2s101 || '—')) +
      item('Other Trainings', esc(m.otherTrainings || '—')) +
      item('Remarks', esc(m.remarks || '—'), true);

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

    var smtpForm = document.getElementById('smtpForm');
    if (smtpForm) {
      var saved = loadSmtp();
      if (saved) {
        document.getElementById('smtpUser').value = saved.user || '';
        document.getElementById('adminEmail').value = saved.adminEmail || '';
        document.getElementById('smtpPass').value = saved.pass || '';
      }
      smtpForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var user = document.getElementById('smtpUser').value.trim();
        var pass = document.getElementById('smtpPass').value.trim();
        var adminEmail = document.getElementById('adminEmail').value.trim();
        saveSmtp({ user: user, pass: pass, adminEmail: adminEmail });
        flash('SMTP settings saved.', 'success');
      });
    }
  }

  function loadSmtp() {
    try {
      var raw = localStorage.getItem('c2s_smtp');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveSmtp(data) {
    localStorage.setItem('c2s_smtp', JSON.stringify(data));
  }

  /* ---------- Admin dashboard ---------- */

  function renderAdmin() {
    var statsEl = document.getElementById('adminStats');
    var tableEl = document.getElementById('adminTableContainer');
    if (!statsEl || !tableEl) return;

    var mentors = getMentors().filter(function (mn) { return mn.username !== 'admin'; });
    var mentees = getMentees();
    var totalMentees = mentees.length;
    var totalMembers = mentors.length + totalMentees;

    statsEl.innerHTML =
      card('Total Mentors', mentors.length, 'total') +
      card('Total Mentees', totalMentees, 'active') +
      card('Total Members', totalMembers, 'transferred');

    if (mentors.length === 0) {
      tableEl.innerHTML = '<div class="empty-state"><h3>No mentors registered</h3><p>Mentor accounts will appear here once created.</p></div>';
      return;
    }

    var html = mentors.map(function (mn) {
      var own = mentees.filter(function (m) { return m.mentor === mn.username; });
      var count = own.length;

      var menteeRows = own.length === 0
        ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No mentees assigned</td></tr>'
        : own.map(function (m) {
            return '<tr>' +
              '<td><a href="view.html?id=' + encodeURIComponent(m.id) + '&amp;readonly=1" class="mentee-name" style="color:var(--primary);">' + esc(m.name) + '</a></td>' +
              '<td><span class="badge ' + statusBadgeClass(m.status) + '"><span class="badge-dot"></span>' + esc(m.status) + '</span></td>' +
              '<td>' + yesNoBadge(m.potentialMentor) + '</td>' +
              '<td style="max-width:280px;">' + esc(m.remarks || '—') + '</td>' +
              '</tr>';
          }).join('');

      var menteeBlock = own.length
        ? '<div class="admin-mentees" style="display:none;border-top:1px solid var(--border);">' +
          '<table><thead><tr><th>Mentee</th><th>Status</th><th>Potential Mentor</th><th>Remarks</th></tr></thead>' +
          '<tbody>' + menteeRows + '</tbody></table></div>'
        : '<div class="admin-mentees" style="display:none;border-top:1px solid var(--border);padding:16px 20px;color:var(--text-muted);">No mentees assigned.</div>';

      return '<div class="table-wrap admin-group" style="margin-bottom:16px;">' +
        '<div class="admin-mentor" data-mentor="' + esc(mn.username) + '" style="display:flex;flex-wrap:wrap;gap:24px;align-items:center;padding:18px 20px;cursor:pointer;">' +
        '<div style="flex:1;min-width:180px;"><span class="admin-mentor-name">' + esc(mn.name) + '</span><div class="mentee-sub">@' + esc(mn.username) + '</div></div>' +
        '<div><div class="info-label">Email</div><div class="info-value">' + esc(mn.email) + '</div></div>' +
        '<div><div class="info-label">Password</div><div class="info-value">' + esc(mn.password || '—') + '</div></div>' +
        '<div><div class="info-label">Mentees</div><div><span class="badge badge-neutral">' + count + '</span></div></div>' +
        '<div class="admin-caret" style="color:var(--text-muted);">&#9662;</div>' +
        '</div>' + menteeBlock + '</div>';
    }).join('');

    tableEl.innerHTML = html;

    tableEl.querySelectorAll('.admin-group').forEach(function (group) {
      var block = group.querySelector('.admin-mentees');
      var caret = group.querySelector('.admin-caret');
      group.querySelector('.admin-mentor').addEventListener('click', function () {
        var isHidden = block.style.display === 'none';
        block.style.display = isHidden ? '' : 'none';
        caret.innerHTML = isHidden ? '&#9652;' : '&#9662;';
      });
    });
  }

  /* ---------- Init ---------- */

  function init() {
    applyTheme();

    var themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    if (document.getElementById('statsRow')) renderStats();
    if (document.getElementById('tableContainer')) {
      renderTable();
      var searchEl = document.getElementById('searchInput');
      var filterEl = document.getElementById('statusFilter');
      if (searchEl) searchEl.addEventListener('input', renderTable);
      if (filterEl) { filterEl.addEventListener('change', renderTable); filterEl.addEventListener('input', renderTable); }
    }

    if (window.ADMIN_MODE) renderAdmin();

    bindForm();
    renderView();
    bindSettings();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
