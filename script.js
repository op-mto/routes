var FIREBASE_URL = 'https://routes-ef3a9-default-rtdb.asia-southeast1.firebasedatabase.app';

var data = {
    users: [],
    routes: [],
    settings: { nextRouteId: 1, nextUserId: 4, addressHistory: { from: [], to: [] }, mtkCounter: 1, mtkDate: "" }
};

var currentUser = null;
var showCompleted = false;
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
        if (xhr.status === 200 && xhr.responseText !== 'null' && xhr.responseText !== '') {
            try {
                var loaded = JSON.parse(xhr.responseText);
                if (loaded && loaded.users) data.users = loaded.users;
                if (loaded && loaded.routes) data.routes = loaded.routes;
                if (loaded && loaded.settings) data.settings = loaded.settings;
            } catch(e) {}
        }
        if (!data.routes) data.routes = [];
        if (!data.users) data.users = [];
        if (!data.settings) data.settings = { nextRouteId: 1, nextUserId: 4, addressHistory: { from: [], to: [] }, mtkCounter: 1, mtkDate: "" };
        if (!data.settings.addressHistory) data.settings.addressHistory = { from: [], to: [] };
        if (!data.settings.mtkCounter) data.settings.mtkCounter = 1;
        renderTable();
    };
    xhr.onerror = function() { renderTable(); };
    xhr.send();
}

function saveData() {
    try { localStorage.setItem('routesData', JSON.stringify(data)); } catch(e) {}
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
        var btn = document.querySelector('.btn-toggle');
        if (btn) btn.textContent = 'Показать выполненные';
        startAutoRefresh();
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
    saveData(); renderTable(); clearForm();
    
    // Возвращаем кнопку обратно
    var btn = document.querySelector('.btn-save');
    if (btn) {
        btn.textContent = 'Сохранить';
        btn.setAttribute('onclick', 'saveRoute()');
    }
    
    alert('Маршрут №' + id + ' обновлен!');
}

function clearForm() {
    ['date','completionDate','from','to','task','note','internalComment'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('status').value = 'Активно';
}

function renderTable() {
    var tbody = document.getElementById('routesBody');
    if (!tbody || !data || !data.routes) return;
    if (!currentUser) { loadData(); return; }
    
    var isDriver = currentUser && currentUser.role === 'driver';
    
    // Обновляем заголовки таблицы
    var thead = document.querySelector('#routesTable thead tr');
    if (thead) {
        thead.innerHTML = '<th>№</th><th>Дата</th><th>Дата вып.</th><th>Откуда</th><th>Куда</th><th>Задача</th><th>Примечание</th><th>Статус</th>' +
            (isDriver ? '' : '<th>Внутр. комм.</th><th>Создал</th>') +
            '<th></th>';
    }
    
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
        html += '<td>';
if (r.task && r.task.indexOf('Globus ') === 0) {
    html += '<a href="#" onclick="openMTKFromLink(\'' + r.id + '\'); return false;" style="color:#1976D2;text-decoration:underline;cursor:pointer;">' + r.task + '</a>';
} else {
    html += (r.task||'');
}
html += '</td><td>' + (r.note||'') + '</td>';
        html += '<td class="' + sc + '">' + (r.status||'') + '</td>';
        
        if (!isDriver) {
            html += '<td>' + (r.internalComment||'') + '</td>';
            html += '<td><b>' + (r.createdBy||'') + '</b><br><small>' + (r.createdAt||'') + '</small></td>';
        }
        
        if (!isDriver) {
            html += '<td>';
            if (r.status === 'Активно') html += '<button onclick="completeRoute(' + r.id + ')" style="background:green;color:white;border:none;padding:3px 8px;margin:1px;cursor:pointer;">OK</button> ';
            if (currentUser.role === 'admin' || currentUser.role === 'dispatcher') html += '<button onclick="editRoute(' + r.id + ')" style="background:orange;border:none;padding:3px 8px;margin:1px;cursor:pointer;">Edit</button> ';
            if (currentUser.role === 'admin') html += '<button onclick="deleteRoute(' + r.id + ')" style="background:red;color:white;border:none;padding:3px 8px;margin:1px;cursor:pointer;">Del</button>';
            html += '</td>';
        }
    }
    
    tbody.innerHTML = html || '<tr><td colspan="' + (isDriver ? '9' : '11') + '">Нет маршрутов</td></tr>';
    
    document.getElementById('totalCount').textContent = data.routes.length;
    document.getElementById('activeCount').textContent = data.routes.filter(function(r){return r.status==='Активно';}).length;
    document.getElementById('completedCount').textContent = data.routes.filter(function(r){return r.status==='Выполнено';}).length;
}

function completeRoute(id) {
    for (var i = 0; i < data.routes.length; i++) {
        if (data.routes[i].id === id) {
            data.routes[i].status = 'Выполнено';
            data.routes[i].completionDate = new Date().toISOString().slice(0, 10);
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
            
            // Меняем кнопку
            var btn = document.querySelector('.btn-save');
            if (btn) {
                btn.textContent = 'Обновить';
                btn.setAttribute('onclick', 'updateRoute(' + id + ')');
            }
            break;
        }
    }
}

function deleteRoute(id) {
    if (!currentUser || currentUser.role !== 'admin') { alert('Только администратор!'); return; }
    if (confirm('Удалить?')) { data.routes = data.routes.filter(function(r){return r.id !== id;}); saveData(); renderTable(); }
}

function toggleCompleted() {
    showCompleted = !showCompleted;
    var btn = document.querySelector('.btn-toggle');
    if (btn) btn.textContent = showCompleted ? 'Скрыть выполненные' : 'Показать выполненные';
    renderTable();
}

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
    if (currentUser && currentUser.role === 'driver') {
        alert('Водитель не может создавать бланки!');
        return;
    }
    var today = new Date().toISOString().slice(0, 10);
    if (data.settings.mtkDate !== today) { data.settings.mtkCounter = 1; data.settings.mtkDate = today; }
    var day = today.slice(8, 10), month = today.slice(5, 7), year = today.slice(2, 4);
    var fileName = 'Globus_' + day + '.' + month + '.' + year + '_' + data.settings.mtkCounter + '.xlsx';
    data.settings.mtkCounter++; saveData();
    document.getElementById('task').value = 'Globus ' + fileName;
    document.getElementById('from').value = 'Globus';
    window.open('mtk.html', 'mtk', 'width=900,height=700');
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

function startAutoRefresh() {
    setInterval(function() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', FIREBASE_URL + '/data.json?t=' + Date.now(), true);
        xhr.onload = function() {
            if (xhr.status === 200 && xhr.responseText !== 'null' && xhr.responseText !== '') {
                try {
                    var newData = JSON.parse(xhr.responseText);
                    if (newData && newData.routes) {
                        var oldLen = data.routes.length;
                        data.routes = newData.routes;
                        data.settings = newData.settings || data.settings;
                        data.users = newData.users || data.users;
                        if (data.routes.length !== oldLen || document.getElementById('from').value === '') {
                            renderTable();
                        }
                    }
                } catch(e) {}
            }
        };
        xhr.send();
    }, 5000);
}

function screenshotTable() {
    var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    
    if (isFirefox) {
        copyAsFormattedText();
    } else {
        copyAsImage();
    }
}

function copyAsImage() {
    var rows = document.querySelectorAll('#routesTable tbody tr');
    var vis = [];
    for (var i = 0; i < rows.length; i++) {
        if (rows[i].style.display !== 'none' && !rows[i].classList.contains('completed')) {
            vis.push(rows[i]);
        }
    }
    if (vis.length === 0) { alert('Нет данных!'); return; }
    
    var t = document.createElement('table');
    t.style.cssText = 'border-collapse:collapse;background:white;font-family:Arial;font-size:16px;position:absolute;left:-9999px;';
    var h = '<thead><tr>';
    ['№','Дата','Дата вып.','Откуда','Куда','Задача','Примечание'].forEach(function(x) {
        h += '<th style="border:1px solid #999;padding:10px 14px;background:#4a7a8c;color:white;font-size:17px;">' + x + '</th>';
    });
    h += '</tr></thead><tbody>';
    for (var r = 0; r < vis.length; r++) {
        var cells = vis[r].querySelectorAll('td');
        h += '<tr>';
        for (var c = 0; c < 7; c++) {
            h += '<td style="border:1px solid #ddd;padding:8px 12px;font-size:16px;' + (r%2===0?'background:#f9f9f9;':'') + '">' + (cells[c]?cells[c].textContent.trim():'') + '</td>';
        }
        h += '</tr>';
    }
    h += '</tbody>';
    t.innerHTML = h;
    document.body.appendChild(t);
    
    html2canvas(t, { backgroundColor: '#fff', scale: 2 }).then(function(canvas) {
        document.body.removeChild(t);
        canvas.toBlob(function(blob) {
            navigator.clipboard.write([new ClipboardItem({'image/png': blob})]).then(function() {
                alert('Изображение скопировано в буфер!');
            });
        });
    });
}

function copyAsFormattedText() {
    var rows = document.querySelectorAll('#routesTable tbody tr');
    
    var data = [];
    for (var i = 0; i < rows.length; i++) {
        if (rows[i].style.display === 'none') continue;
        if (rows[i].classList.contains('completed')) continue;
        
        var cells = rows[i].querySelectorAll('td');
        data.push([
            cells[0] ? cells[0].textContent.trim() : '',
            cells[1] ? cells[1].textContent.trim() : '',
            cells[2] ? cells[2].textContent.trim() : '',
            cells[3] ? cells[3].textContent.trim() : '',
            cells[4] ? cells[4].textContent.trim() : '',
            cells[5] ? cells[5].textContent.trim() : '',
            cells[6] ? cells[6].textContent.trim() : ''
        ]);
    }
    
    if (data.length === 0) { alert('Нет данных!'); return; }
    
    // Фиксированная ширина столбцов
    var widths = [5, 12, 12, 12, 8, 35, 15];
    var headers = ['№', 'Дата', 'Дата вып.', 'Откуда', 'Куда', 'Задача', 'Примечание'];
    
    function wrapText(text, width) {
        if (text.length <= width) return [text];
        var lines = [];
        var remaining = text;
        while (remaining.length > width) {
            lines.push(remaining.substring(0, width));
            remaining = remaining.substring(width);
        }
        if (remaining.length > 0) lines.push(remaining);
        return lines;
    }
    
    function line(left, mid, right) {
        var s = left;
        for (var i = 0; i < 7; i++) s += '─'.repeat(widths[i]) + mid;
        return s.substring(0, s.length - 1) + right + '\n';
    }
    
    function row(values) {
        // Разбиваем каждую ячейку на строки
        var lines = [];
        var maxLines = 0;
        for (var i = 0; i < 7; i++) {
            lines[i] = wrapText(values[i] || '', widths[i] - 1);
            maxLines = Math.max(maxLines, lines[i].length);
        }
        
        var result = '';
        for (var l = 0; l < maxLines; l++) {
            result += '│';
            for (var i = 0; i < 7; i++) {
                var text = l < lines[i].length ? lines[i][l] : '';
                result += ' ' + text.padEnd(widths[i] - 1) + '│';
            }
            result += '\n';
        }
        return result;
    }
    
    var text = '';
    text += line('┌', '┬', '┐');
    text += row(headers);
    text += line('├', '┼', '┤');
    
   for (var i = 0; i < data.length; i++) {
        text += row(data[i]);
    }
    
    text += line('└', '┴', '┘');
    
    var tmp = document.createElement('textarea');
    tmp.value = text;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand('copy');
    document.body.removeChild(tmp);
    
    alert('Таблица скопирована!\nВставьте в Telegram (Ctrl+V)');
}

function openMTKBlank() {
    if (currentUser && currentUser.role === 'driver') {
        alert('Водитель не может создавать бланки!');
        return;
    }
    var today = new Date().toISOString().slice(0, 10);
    if (data.settings.mtkDate !== today) { data.settings.mtkCounter = 1; data.settings.mtkDate = today; }
    var day = today.slice(8, 10), month = today.slice(5, 7), year = today.slice(2, 4);
    var fileName = 'Globus_' + day + '.' + month + '.' + year + '_' + data.settings.mtkCounter + '.xlsx';
    
    // Сразу сохраняем пустой бланк в Firebase
    if (!data.mtkBlanks) data.mtkBlanks = [];
    data.mtkBlanks.push({
        id: data.settings.mtkCounter,
        name: fileName,
        items: []
    });
    
    data.settings.mtkCounter++; 
    saveData();
    
    document.getElementById('task').value = 'Globus ' + fileName;
    document.getElementById('from').value = 'Globus';
    
    window.open('mtk.html?id=' + (data.settings.mtkCounter - 1) + '&role=dispatcher', 'mtk', 'width=900,height=700');
}
function openMTKFromLink(routeId) {
    var route = null;
    for (var i = 0; i < data.routes.length; i++) {
        if (data.routes[i].id === routeId) {
            route = data.routes[i];
            break;
        }
    }
    
    if (!route || !route.task || route.task.indexOf('Globus ') !== 0) {
        alert('Бланк не найден!');
        return;
    }
    
    var fileName = route.task.replace('Globus ', '');
    
    var blankId = null;
    if (data.mtkBlanks) {
        for (var i = 0; i < data.mtkBlanks.length; i++) {
            if (data.mtkBlanks[i].name === fileName) {
                blankId = data.mtkBlanks[i].id;
                break;
            }
        }
    }
    
    if (blankId === null) {
        alert('Бланк не найден в базе!');
        return;
    }
    
    var role = currentUser ? currentUser.role : '';
    window.open('mtk.html?id=' + blankId + '&role=' + role, 'mtk_' + blankId, 'width=900,height=700');
}

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    document.getElementById('btnLogin').addEventListener('click', login);
});
