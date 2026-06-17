var FIREBASE_URL = 'https://routes-ef3a9-default-rtdb.asia-southeast1.firebasedatabase.app';
var blankId = null;
var blankData = null;
var userRole = '';

function getParam(name) {
    var url = new URL(window.location.href);
    return url.searchParams.get(name);
}

function loadBlank() {
    blankId = getParam('id');
    userRole = getParam('role') || '';
    
    if (userRole === 'driver') {
        document.getElementById('btnSave').style.display = 'none';
        document.getElementById('btnAdd').style.display = 'none';
    }
    
    if (blankId) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', FIREBASE_URL + '/data.json', true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                if (data && data.mtkBlanks) {
                    for (var i = 0; i < data.mtkBlanks.length; i++) {
                        if (data.mtkBlanks[i].id == blankId) {
                            blankData = data.mtkBlanks[i];
                            document.getElementById('title').textContent = 'Бланк: ' + blankData.name;
                            document.getElementById('fileName').textContent = blankData.name;
                            renderRows(blankData.items);
                            if (userRole === 'driver') disableInputs();
                            return;
                        }
                    }
                }
            }
            alert('Бланк не найден!');
        };
        xhr.send();
    } else {
        var today = new Date().toISOString().slice(0, 10);
        var day = today.slice(8, 10), month = today.slice(5, 7), year = today.slice(2, 4);
        
        var xhr = new XMLHttpRequest();
        xhr.open('GET', FIREBASE_URL + '/data.json', true);
        xhr.onload = function() {
            var counter = 1;
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                if (data && data.settings) counter = data.settings.mtkCounter || 1;
            }
            var fileName = 'Globus_' + day + '.' + month + '.' + year + '_' + counter + '.xlsx';
            blankData = { id: counter, name: fileName, items: [] };
            document.getElementById('title').textContent = 'Новый бланк: ' + fileName;
            document.getElementById('fileName').textContent = fileName;
            addRow(); addRow(); addRow();
        };
        xhr.send();
    }
}

function disableInputs() {
    var inputs = document.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = true;
    var btns = document.querySelectorAll('.btn-del');
    for (var i = 0; i < btns.length; i++) btns[i].style.display = 'none';
}

function renderRows(items) {
    var tbody = document.getElementById('mtkBody');
    tbody.innerHTML = '';
    if (items && items.length > 0) {
        for (var i = 0; i < items.length; i++) addRow(items[i]);
    } else {
        addRow(); addRow(); addRow();
    }
}

function addRow(item) {
    var tbody = document.getElementById('mtkBody');
    var row = tbody.insertRow();
    var num = tbody.rows.length;
    
    row.innerHTML = 
        '<td>' + num + '</td>' +
        '<td><input type="text" value="' + (item ? (item.partNumber || '') : '') + '"></td>' +
        '<td><input type="text" value="' + (item ? (item.name || '') : '') + '"></td>' +
        '<td><input type="text" value="' + (item ? (item.qty || '') : '') + '" style="width:80px;"></td>' +
        '<td><input type="text" value="' + (item ? (item.to || '') : '') + '" style="width:150px;"></td>' +
        '<td><button onclick="this.closest(\'tr\').remove(); updateNumbers();" class="btn-del">✕</button></td>';
    
    if (userRole === 'driver') {
        var inputs = row.querySelectorAll('input');
        for (var i = 0; i < inputs.length; i++) inputs[i].disabled = true;
        row.querySelector('.btn-del').style.display = 'none';
    }
}

function updateNumbers() {
    var rows = document.querySelectorAll('#mtkBody tr');
    for (var i = 0; i < rows.length; i++) rows[i].cells[0].textContent = i + 1;
}

function saveBlank() {
    var rows = document.querySelectorAll('#mtkBody tr');
    var items = [];
    for (var i = 0; i < rows.length; i++) {
        var inputs = rows[i].querySelectorAll('input');
        var partNumber = inputs[0]?.value || '';
        var name = inputs[1]?.value || '';
        var qty = inputs[2]?.value || '';
        var to = inputs[3]?.value || '';
        if (partNumber || name || qty || to) {
            items.push({ partNumber: partNumber, name: name, qty: qty, to: to });
        }
    }
    blankData.items = items;
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', FIREBASE_URL + '/data.json', true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            if (!data.mtkBlanks) data.mtkBlanks = [];
            var found = false;
            for (var i = 0; i < data.mtkBlanks.length; i++) {
                if (data.mtkBlanks[i].id === blankData.id) {
                    data.mtkBlanks[i] = blankData;
                    found = true;
                    break;
                }
            }
            if (!found) {
                data.mtkBlanks.push(blankData);
                if (data.settings) data.settings.mtkCounter = blankData.id + 1;
            }
            var xhr2 = new XMLHttpRequest();
            xhr2.open('PUT', FIREBASE_URL + '/data.json', true);
            xhr2.setRequestHeader('Content-Type', 'application/json');
            xhr2.send(JSON.stringify(data));
            xhr2.onload = function() {
                alert('Бланк сохранен!');
                // Не перезагружаем, чтобы не сбить сессию
            };
        }
    };
    xhr.send();
}

function copyTable() {
    var rows = document.querySelectorAll('#mtkBody tr');
    var text = '';
    
    for (var i = 0; i < rows.length; i++) {
        var inputs = rows[i].querySelectorAll('input');
        var num = rows[i].cells[0].textContent;
        var part = inputs[0]?.value || '';
        var name = inputs[1]?.value || '';
        var qty = inputs[2]?.value || '';
        var to = inputs[3]?.value || '';
        
        if (part || name || qty || to) {
            text += num + '\t' + part + '\t' + name + '\t' + qty + '\t' + to + '\n';
        }
    }
    
    var tmp = document.createElement('textarea');
    tmp.value = text;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand('copy');
    document.body.removeChild(tmp);
    
    alert('Таблица скопирована!\nВставьте в Excel (Ctrl+V)');
}

loadBlank();