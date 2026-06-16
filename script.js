var FIREBASE_URL = 'https://routes-ef3a9-default-rtdb.asia-southeast1.firebasedatabase.app';

var data = {
    users: [],
    routes: [],
    settings: { nextRouteId: 1, nextUserId: 4, addressHistory: { from: [], to: [] }, mtkCounter: 1, mtkDate: "" }
};

var currentUser = null;
var showCompleted = true;
window.currentMTKFile = null;

function getCurrentDateTime() {
    var now = new Date();
    var day = String(now.getDate()).padStart(2, '0');
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var year = now.getFullYear();
    var hours = String(now.getHours()).padStart(2, '0');
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var seconds = String(now.getSeconds()).padStart(2, '0');
    return day + '.' + month + '.' + year + ' ' + hours + ':' + minutes + ':' + seconds;
}

function loadData() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', FIREBASE_URL + '/data.json', true);
    xhr.onload = function() {
        if (xhr.status === 200 && xhr.responseText !== 'null') {
            try {
                var loaded = JSON.parse(xhr.responseText);
                if (loaded && loaded.users && loaded.routes && loaded.settings) {
                    data = loaded;
                }
            } catch(e) {
                console.log('Error loading data');
            }
        }
        if (!data.users) data.users = [];
        if (!data.routes) data.routes = [];
        if (!data.settings) data.settings = { nextRouteId: 1, nextUserId: 4, addressHistory: { from: [], to: [] }, mtkCounter: 1, mtkDate: "" };
        if (!data.settings.addressHistory) data.settings.addressHistory = { from: [], to: [] };
        renderTable();
    };
    xhr.send();
}

function saveData() {
    localStorage.setItem('routesData', JSON.stringify(data));
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', FIREBASE_URL + '/data.json', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
}

function updateAddressHistory() {
    if (!data.settings.addressHistory) data.settings.addressHistory = { from: [], to: [] };
    var from = document.getElementById('from').value.trim();
    var to = document.getElementById('to').value.trim();
    if (from && data.settings.addressHistory.from.indexOf(from) === -1) {
        data.settings.addressHistory.from.unshift(from);
        if (data.settings.addressHistory.from.length > 20) data.settings.addressHistory.from.pop();
    }
    if (to && data.settings.addressHistory.to.indexOf(to) === -1) {
        data.settings.addressHistory.to.unshift(to);
        if (data.settings.addressHistory.to.length > 20) data.settings.addressHistory.to.pop();
    }
    saveData();
    loadAddressDatalists();
}

function loadAddressDatalists() {
    var fromList = document.getElementById('fromList');
    var toList = document.getElementById('toList');
    if (!fromList) { fromList = document.createElement('datalist'); fromList.id = 'fromList'; document.body.appendChild(fromList); }
    if (!toList) { toList = document.createElement('datalist'); toList.id = 'toList'; document.body.appendChild(toList); }
    var h = data.settings.addressHistory || { from: [], to: [] };
    fromList.innerHTML = ''; h.from.forEach(function(x) { fromList.innerHTML += '<option value="' + x + '">'; });
    toList.innerHTML = ''; h.to.forEach(function(x) { toList.innerHTML += '<option value="' + x + '">'; });
    document.getElementById('from').setAttribute('list', 'fromList');
    document.getElementById('to').setAttribute('list', 'toList');
}

function login() {
    var loginValue = document.getElementById('loginInput').value.trim();
    var passwordValue = document.getElementById('passwordInput').value;
    var errorEl = document.getElementById('loginError');
    if (!loginValue || !passwordValue) { errorEl.textContent = 'Введите логин и пароль!'; return; }
    var user = null;
    for (var i = 0; i < data.users.length; i++) {
        if (data.users[i].login === loginValue && data.users[i].password === passwordValue) { user = data.users[i]; break; }
    }
    if (user) {
        currentUser = user;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'block';
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userRole').textContent = getRoleName(user.role);
        document.getElementById('adminSection').style.display = user.role === 'admin' ? 'block' : 'none';
        if (user.role === 'admin') renderUsers();
        document.getElementById('formSection').style.display = user.role === 'driver' ? 'none' : 'block';
        errorEl.textContent = '';
        loadAddressDatalists();
        renderTable();
    } else { errorEl.textContent = 'Неверный логин или пароль!'; }
}

function logout() {
    currentUser = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainScreen').style.display = 'none';
}

function getRoleName(role) { return { admin: 'Админ', dispatcher: 'Диспетчер', driver: 'Водитель' }[role] || role; }

function saveRoute() {
    var from = document.getElementById('from').value.trim();
    var to = document.getElementById('to').value.trim();
    var task = document.getElementById('task').value.trim();
    if (!from || !to || !task) { alert('Заполните Откуда, Куда, Задача!'); return; }
    var now = getCurrentDateTime();
    data.routes.push({
        id: data.settings.nextRouteId,
        date: document.getElementById('date').value || new Date().toISOString().slice(0, 10),
        completionDate: document.getElementById('completionDate').value || '',
        from: from, to: to, task: task,
        note: document.getElementById('note').value || '',
        status: document.getElementById('status').value || 'Активно',
        internalComment: document.getElementById('internalComment').value || '',
        createdBy: currentUser ? currentUser.name : '',
        createdAt: now, updatedAt: now, updatedBy: currentUser ? currentUser.name : ''
    });
    data.settings.nextRouteId++;
    saveData(); updateAddressHistory(); renderTable(); clearForm();
    alert('Маршрут сохранен!');
}

function updateRoute(id) {
    var from = document.getElementById('from').value.trim();
    var to = document.getElementById('to').value.trim();
    var task = document.getElementById('task').value.trim();
    if (!from || !to || !task) { alert('Заполните поля!'); return; }
    for (var i = 0; i < data.routes.length; i++) {
        if (data.routes[i].id === id) {
            data.routes[i].date = document.getElementById('date').value || '';
            data.routes[i].completionDate = document.getElementById('completionDate').value || '';
            data.routes[i].from = from; data.routes[i].to = to; data.routes[i].task = task;
            data.routes[i].note = document.getElementById('note').value || '';
            data.routes[i].status = document.getElementById('status').value;
            data.routes[i].internalComment = document.getElementById('internalComment').value || '';
            data.routes[i].updatedAt = getCurrentDateTime();
            data.routes[i].updatedBy = currentUser ? currentUser.name : '';
            break;
        }
    }
    saveData(); updateAddressHistory(); renderTable(); clearForm();
}

function clearForm() {
    ['date','completionDate','from','to','task','note','internalComment'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('status').value = 'Активно';
}

function renderTable() {
    var tbody = document.getElementById('routesBody');
    if (!tbody) return;
    var searchTerm = (document.getElementById('search')||{}).value || '';
    searchTerm = searchTerm.toLowerCase();
    var routes = data.routes.slice().sort(function(a,b){ return b.id - a.id; });
    var html = '';
    for (var i = 0; i < routes.length; i++) {
        var r = routes[i];
        if (!showCompleted && r.status === 'Выполнено') continue;
        if (searchTerm && (r.task+' '+r.from+' '+r.to+' '+r.note).toLowerCase().indexOf(searchTerm) === -1) continue;
        var sc = { 'Активно':'status-active', 'Ожидание':'status-waiting', 'Выполнено':'status-completed' }[r.status] || '';
        html += '<tr' + (r.status==='Выполнено'?' class="completed"':'') + '>';
        html += '<td>' + r.id + '</td><td>' + (r.date||'') + '</td><td>' + (r.completionDate||'') + '</td>';
        html += '<td>' + (r.from||'') + '</td><td>' + (r.to||'') + '</td>';
        html += '<td>' + (r.task||'') + '</td><td>' + (r.note||'') + '</td>';
        html += '<td class="' + sc + '">' + (r.status||'') + '</td>';
        html += '<td>' + (r.internalComment||'') + '</td>';
        html += '<td><b>' + (r.createdBy||'') + '</b><br><small>' + (r.createdAt||'') + '</small></td><td>';
        if (r.status !== 'Выполнено') html += '<button onclick="completeRoute('+r.id+')" style="background:green;color:white;border:none;padding:3px 8px;margin:1px;cursor:pointer;">OK</button> ';
        if (currentUser && (currentUser.role==='admin'||currentUser.role==='dispatcher')) html += '<button onclick="editRoute('+r.id+')" style="background:orange;border:none;padding:3px 8px;margin:1px;cursor:pointer;">Edit</button> ';
        if (currentUser && currentUser.role==='admin') html += '<button onclick="deleteRoute('+r.id+')" style="background:red;color:white;border:none;padding:3px 8px;margin:1px;cursor:pointer;">Del</button>';
        html += '</td></tr>';
    }
    tbody.innerHTML = html || '<tr><td colspan="11">Нет маршрутов</td></tr>';
    document.getElementById('totalCount').textContent = data.routes.length;
    document.getElementById('activeCount').textContent = data.routes.filter(function(r){return r.status==='Активно';}).length;
    document.getElementById('completedCount').textContent = data.routes.filter(function(r){return r.status==='Выполнено';}).length;
}

function completeRoute(id) {
    for (var i = 0; i < data.routes.length; i++) {
        if (data.routes[i].id === id) {
            data.routes[i].status = 'Выполнено';
            data.routes[i].completionDate = new Date().toISOString().slice(0, 10);
            data.routes[i].updatedAt = getCurrentDateTime();
            data.routes[i].updatedBy = currentUser ? currentUser.name : '';
            break;
        }
    }
    saveData(); renderTable();
}

function editRoute(id) {
    for (var i = 0; i < data.routes.length; i++) {
        if (data.routes[i].id === id) {
            var r = data.routes[i];
            document.getElementById('date').value = r.date || '';
            document.getElementById('completionDate').value = r.completionDate || '';
            document.getElementById('from').value = r.from || '';
            document.getElementById('to').value = r.to || '';
            document.getElementById('task').value = r.task || '';
            document.getElementById('note').value = r.note || '';
            document.getElementById('status').value = r.status || 'Активно';
            document.getElementById('internalComment').value = r.internalComment || '';
            break;
        }
    }
}

function deleteRoute(id) {
    if (!currentUser || currentUser.role !== 'admin') { alert('Только администратор!'); return; }
    if (confirm('Удалить?')) { data.routes = data.routes.filter(function(r){return r.id !== id;}); saveData(); renderTable(); }
}

function toggleCompleted() { showCompleted = !showCompleted; renderTable(); }

function addUser() {
    if (!currentUser || currentUser.role !== 'admin') return;
    var login = document.getElementById('newLogin').value.trim();
    var pass = document.getElementById('newPassword').value;
    var name = document.getElementById('newName').value.trim();
    var role = document.getElementById('newRole').value;
    if (!login || !pass || !name) { alert('Заполните все поля!'); return; }
    data.users.push({ id: data.settings.nextUserId, login: login, password: pass, name: name, role: role });
    data.settings.nextUserId++; saveData(); renderUsers();
}

function deleteUser(id) { if (confirm('Удалить?')) { data.users = data.users.filter(function(u){return u.id !== id;}); saveData(); renderUsers(); } }

function renderUsers() {
    var c = document.getElementById('usersTable'); if (!c) return;
    var h = '<h4>Пользователи:</h4>';
    data.users.forEach(function(u) {
        h += '<div>' + u.name + ' (' + u.login + ') - ' + getRoleName(u.role);
        if (u.role !== 'admin') h += ' <button onclick="deleteUser('+u.id+')" style="background:red;color:white;border:none;padding:2px 8px;">X</button>';
        h += '</div>';
    });
    c.innerHTML = h;
}

function openMTKBlank() {
    var today = new Date().toISOString().slice(0, 10);
    if (data.settings.mtkDate !== today) { data.settings.mtkCounter = 1; data.settings.mtkDate = today; }
    var day = today.slice(8, 10), month = today.slice(5, 7), year = today.slice(2, 4);
    var fileName = 'Globus_' + day + '.' + month + '.' + year + '_' + data.settings.mtkCounter + '.xlsx';
    window.currentMTKFile = { name: fileName, path: 'mtk/' + fileName };
    data.settings.mtkCounter++; saveData();
    document.getElementById('task').value = 'Globus ' + fileName;
    document.getElementById('from').value = 'Globus';
}

function exportJSON() {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'data.json'; a.click();
}

function importJSON() {
    var inp = document.createElement('input'); inp.type = 'file';
    inp.onchange = function(e) {
        var r = new FileReader();
        r.onload = function(ev) { data = JSON.parse(ev.target.result); saveData(); renderTable(); };
        r.readAsText(e.target.files[0]);
    }; inp.click();
}

function screenshotTable() {
    var rows = document.querySelectorAll('#routesTable tbody tr');
    var vis = [];
    for (var i = 0; i < rows.length; i++) {
        if (rows[i].style.display !== 'none' && !rows[i].classList.contains('completed')) vis.push(rows[i]);
    }
    if (vis.length === 0) { alert('Нет данных!'); return; }
    var t = document.createElement('table');
    t.style.cssText = 'border-collapse:collapse;background:white;font-family:Arial;font-size:16px;position:absolute;left:-9999px;';
    var h = '<thead><tr>';
    ['№','Дата','Дата вып.','Откуда','Куда','Задача','Примечание'].forEach(function(x) {
        h += '<th style="border:1px solid #666;padding:10px 14px;background:#4a7a8c;color:white;font-size:17px;white-space:nowrap;">' + x + '</th>';
    });
    h += '</tr></thead><tbody>';
    for (var r = 0; r < vis.length; r++) {
        var cells = vis[r].querySelectorAll('td'); h += '<tr>';
        for (var c = 0; c < 7; c++) {
            h += '<td style="border:1px solid #ccc;padding:8px 12px;font-size:16px;' + (r%2===0?'background:#f5f5f5;':'') + (c<=4?'white-space:nowrap;':'') + '">' + (cells[c]?cells[c].textContent.trim():'') + '</td>';
        }
        h += '</tr>';
    }
    h += '</tbody>'; t.innerHTML = h; document.body.appendChild(t);
    setTimeout(function() {
        html2canvas(t, { backgroundColor: '#fff', scale: 2 }).then(function(canvas) {
            document.body.removeChild(t);
            var link = document.createElement('a');
            link.download = 'Маршруты_' + new Date().toISOString().slice(0,10) + '.png';
            link.href = canvas.toDataURL('image/png'); link.click();
        });
    }, 100);
}

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    document.getElementById('btnLogin').addEventListener('click', login);
});
