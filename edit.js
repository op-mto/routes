var FIREBASE_URL = 'https://routes-ef3a9-default-rtdb.asia-southeast1.firebasedatabase.app';
var routeId = null;

function getParam(name) { return new URL(window.location.href).searchParams.get(name); }

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

function load() {
    routeId = getParam('id');
    var role = getParam('role') || '';
    
    if (role === 'driver') {
        document.querySelector('.btn-save').style.display = 'none';
    }
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', FIREBASE_URL + '/data.json', true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            if (data && data.routes) {
                for (var i = 0; i < data.routes.length; i++) {
                    if (data.routes[i].id == routeId) {
                        var r = data.routes[i];
                        document.getElementById('date').value = r.date || '';
                        document.getElementById('completionDate').value = r.completionDate || '';
                        document.getElementById('from').value = r.from || '';
                        document.getElementById('to').value = r.to || '';
                        document.getElementById('task').value = r.task || '';
                        document.getElementById('note').value = r.note || '';
                        document.getElementById('status').value = r.status || 'Активно';
                        document.getElementById('priority').value = r.priority || '0';
                        document.getElementById('internalComment').value = r.internalComment || '';
                        
                        // Блокируем задачу если из бланка
                        if (r.task && r.task.indexOf('Globus ') === 0) {
                            document.getElementById('task').disabled = true;
                        }
                        
                        // Водитель только смотрит
                        if (role === 'driver') {
                            var inputs = document.querySelectorAll('input, textarea, select');
                            for (var j = 0; j < inputs.length; j++) inputs[j].disabled = true;
                        }
                        return;
                    }
                }
            }
        }
    };
    xhr.send();
}

function save() {
    var from = document.getElementById('from').value.trim();
    var to = document.getElementById('to').value.trim();
    var task = document.getElementById('task').value.trim();
    
    // Если задача заблокирована — берём старую
    if (document.getElementById('task').disabled) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', FIREBASE_URL + '/data.json', false);
        xhr.send();
        if (xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            for (var i = 0; i < data.routes.length; i++) {
                if (data.routes[i].id == routeId) {
                    task = data.routes[i].task;
                    break;
                }
            }
        }
    }
    
    if (!from || !to || !task) { alert('Заполните Откуда, Куда, Задача!'); return; }
    if (!document.getElementById('date').value) { alert('Заполните Дату!'); return; }
    
    var xhr2 = new XMLHttpRequest();
    xhr2.open('GET', FIREBASE_URL + '/data.json', true);
    xhr2.onload = function() {
        if (xhr2.status === 200) {
            var data = JSON.parse(xhr2.responseText);
            for (var i = 0; i < data.routes.length; i++) {
                if (data.routes[i].id == routeId) {
                    data.routes[i].date = document.getElementById('date').value;
                    data.routes[i].completionDate = document.getElementById('completionDate').value || '';
                    data.routes[i].from = from;
                    data.routes[i].to = to;
                    if (!document.getElementById('task').disabled) data.routes[i].task = task;
                    data.routes[i].note = document.getElementById('note').value || '';
                    data.routes[i].status = document.getElementById('status').value;
                    // Запись в историю при изменении статуса
if (document.getElementById('status').value === 'Выполнено') {
    if (!data.history) data.history = [];
    var now = new Date();
    var dt = String(now.getDate()).padStart(2,'0') + '.' + String(now.getMonth()+1).padStart(2,'0') + '.' + now.getFullYear() + ' ' +
             String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');
    data.history.unshift({
        time: dt,
        user: getParam('user') || 'Система',
        action: 'Выполнение',
        routeId: parseInt(routeId),
        details: ''
    });
}

                    // Запись в историю для любого редактирования
                    if (!data.history) data.history = [];
                    var now = new Date();
                    var dt = String(now.getDate()).padStart(2,'0') + '.' + String(now.getMonth()+1).padStart(2,'0') + '.' + now.getFullYear() + ' ' +
                             String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');
                    data.history.unshift({
                        time: dt,
                        user: getParam('user') || 'Система',
                        action: 'Редактирование',
                        routeId: parseInt(routeId),
                        details: task
                    });
                    
                    data.routes[i].priority = document.getElementById('priority').value;
                    data.routes[i].internalComment = document.getElementById('internalComment').value || '';
                    data.routes[i].updatedAt = getCurrentDateTime();
                    break;
                }
            }
            
            var xhr3 = new XMLHttpRequest();
            xhr3.open('PUT', FIREBASE_URL + '/data.json', true);
            xhr3.setRequestHeader('Content-Type', 'application/json');
            xhr3.send(JSON.stringify(data));
            xhr3.onload = function() {
                alert('Маршрут обновлен!');
                if (window.opener && !window.opener.closed) window.opener.loadData();
                window.close();
            };
        }
    };
    xhr2.send();
}

load();
