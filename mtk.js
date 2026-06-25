var FIREBASE_URL = 'https://routes-ef3a9-default-rtdb.asia-southeast1.firebasedatabase.app';
var blankId = null;
var blankData = null;
var userRole = '';
/*для блокировки бланка мтк*/
var isLocked = false;

function getParam(name) { var url = new URL(window.location.href); return url.searchParams.get(name); }

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
                            /*
                            renderRows(blankData.items);
                            if (userRole === 'driver') disableInputs();
                            return;*/
                            renderRows(blankData.items);
if (userRole === 'driver') {
    disableInputs();
} else if (blankData.locked) {
    lockForm();
}
return;
                        }
                    }
                }
            }
            alert('Бланк не найден!');
        };
        xhr.send();
    } else {
       /* var today = new Date().toISOString().slice(0, 10);
        var day = today.slice(8, 10), month = today.slice(5, 7), year = today.slice(2, 4);
        
        var xhr2 = new XMLHttpRequest();
        xhr2.open('GET', FIREBASE_URL + '/data.json', true);
        xhr2.onload = function() {
          var counter = 1;
           if (xhr2.status === 200) {
           var data = JSON.parse(xhr2.responseText);
           if (data && data.settings) {
             if (data.settings.mtkDate !== today) {
                counter = 1;
        } else {
            counter = data.settings.mtkCounter || 1;
        }
    }
}
            var fileName = 'Globus_' + day + '.' + month + '.' + year + '_' + counter + '.xlsx';
            blankData = { id: counter, name: fileName, items: [] };
            document.getElementById('title').textContent = 'Новый бланк: ' + fileName;
            document.getElementById('fileName').textContent = fileName;
            addRow(); addRow(); addRow();
        };
        xhr2.send();*/
        blankData = { id: null, name: '', items: [] };
        document.getElementById('title').textContent = 'Новый бланк';
        document.getElementById('fileName').textContent = '';
        addRow(); addRow(); addRow();
        
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
        '<td><button onclick="this.closest(\'tr\').remove();updateNumbers();" class="btn-del">✕</button></td>';
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
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', FIREBASE_URL + '/data.json', true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            if (!data.mtkBlanks) data.mtkBlanks = [];
            if (!data.routes) data.routes = [];
            if (!data.settings) data.settings = { nextRouteId: 1 };

            // Получаем свежий счётчик при сохранении
if (!blankData.id) {
    var today = new Date().toISOString().slice(0,10);
    var day = today.slice(8,10), month = today.slice(5,7), year = today.slice(2,4);
    if (data.settings.mtkDate !== today) { data.settings.mtkCounter = 1; data.settings.mtkDate = today; }
    var counter = data.settings.mtkCounter || 1;
    var fileName = 'Globus_' + day + '.' + month + '.' + year + '_' + counter + '.xlsx';
    blankData.id = counter;
    blankData.name = fileName;
    data.settings.mtkCounter = counter + 1;
    document.getElementById('title').textContent = 'Бланк: ' + fileName;
    document.getElementById('fileName').textContent = fileName;
}
// конец  Получаем свежий счётчик при сохранении            
            // Проверяем есть ли уже маршрут
            var routeExists = false;
            for (var i = 0; i < data.routes.length; i++) {
                if (data.routes[i].task === 'Globus ' + blankData.name) {
                    routeExists = true;
                    break;
                }
            }
            
            // Создаем маршрут только если его нет
            if (!routeExists) {
                var now = new Date();
                var dt = String(now.getDate()).padStart(2,'0') + '.' + 
                         String(now.getMonth()+1).padStart(2,'0') + '.' + 
                         now.getFullYear() + ' ' +
                         String(now.getHours()).padStart(2,'0') + ':' + 
                         String(now.getMinutes()).padStart(2,'0') + ':' + 
                         String(now.getSeconds()).padStart(2,'0');
                
              
                
               // конец  Получаем свежий счётчик при сохранении
                
                
                
                data.routes.push({
                    id: data.settings.nextRouteId,
                    date: new Date().toISOString().slice(0, 10),
                    completionDate: '',
                    from: 'Globus',
                    to: '',
                    task: 'Globus ' + blankData.name,
                    note: '',
                    status: 'Активно',
                    internalComment: '',
                    createdBy: getParam('user') || 'Диспетчер',
                    createdAt: dt,
                    updatedAt: dt,
                    // createdBy: getParam('user') || 'Диспетчер',
                });
                data.settings.nextRouteId++;
            }
            
            // Обновляем бланк
            var found = false;
            for (var i = 0; i < data.mtkBlanks.length; i++) {
                if (data.mtkBlanks[i].id == blankData.id) {
                    data.mtkBlanks[i].items = items;
                    found = true;
                    break;
                }
            }
            if (!found) {
                data.mtkBlanks.push({ id: blankData.id, name: blankData.name, items: items });
               /* if (data.settings) data.settings.mtkCounter = blankData.id + 1;*/
                if (data.settings) {
    data.settings.mtkCounter = blankData.id + 1;
    data.settings.mtkDate = new Date().toISOString().slice(0,10);
}
            }
            
            // Сохраняем в Firebase
            var xhr2 = new XMLHttpRequest();
            xhr2.open('PUT', FIREBASE_URL + '/data.json', true);
            xhr2.setRequestHeader('Content-Type', 'application/json');
            xhr2.send(JSON.stringify(data));
            xhr2.onload = function() {
                alert('Сохранено!');
                if (window.opener && !window.opener.closed) {
                    window.opener.clearForm();
                    window.opener.loadData();
                }
                window.close();
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
    if (text) {
        var tmp = document.createElement('textarea');
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
        alert('Скопировано!');
    }
}
function downloadXLSX() {
    if (!blankData.name) {
        alert('Сначала сохраните бланк!');
        return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'template.xlsx', true);
    xhr.responseType = 'arraybuffer';
    
    xhr.onload = function() {
        if (xhr.status === 200) {
            var workbook = new ExcelJS.Workbook();
            workbook.xlsx.load(xhr.response).then(function() {
                var sheet = workbook.getWorksheet(1);
                
                // A17 — имя бланка без Globus_ и без .xlsx
                var cleanName = blankData.name.replace('Globus_', '').replace('.xlsx', '');
                sheet.getCell('A17').value = cleanName;
                
                // A19 — текущая дата ДД.ММ.ГГГГ
                var today = new Date();
                var dd = String(today.getDate()).padStart(2, '0');
                var mm = String(today.getMonth() + 1).padStart(2, '0');
                var yyyy = today.getFullYear();
                sheet.getCell('A19').value = dd + '.' + mm + '.' + yyyy;
                
                // Заполняем запчасти с 22 строки
                var rows = document.querySelectorAll('#mtkBody tr');
                for (var i = 0; i < rows.length; i++) {
                    var inputs = rows[i].querySelectorAll('input');
                    var rowNum = 22 + i;
                    
                    sheet.getCell('A' + rowNum).value = i + 1;
                    sheet.getCell('B' + rowNum).value = inputs[0]?.value || '';
                    sheet.getCell('C' + rowNum).value = inputs[1]?.value || '';
                    sheet.getCell('D' + rowNum).value = inputs[2]?.value || '';
                    sheet.getCell('E' + rowNum).value = inputs[3]?.value || '';
                }
                
                // Сохраняем
                workbook.xlsx.writeBuffer().then(function(buffer) {
                    var blob = new Blob([buffer], { type: 'application/vnd.ms-excel' });
                    var a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = blankData.name;
                    a.click();
                    alert('Файл сохранен!');
                    /*для блокировки бланка мтк*/
                    lockForm();
                    /*для блокировки бланка мтк*/
                });
            });
        }
    };
    xhr.send();
}
/*для блокировки бланка мтк*/

 /*function lockForm() {
    isLocked = true;
    var inputs = document.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = true;
    document.getElementById('btnSave').style.display = 'none';
    document.getElementById('btnAdd').style.display = 'none';
    document.getElementById('btnUnlock').style.display = 'inline-block';
}*/

function lockForm() {
    isLocked = true;
    blankData.locked = true;
    saveBlankState();
    var inputs = document.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = true;
    document.getElementById('btnSave').style.display = 'none';
    document.getElementById('btnAdd').style.display = 'none';
    document.getElementById('btnUnlock').style.display = 'inline-block';
}

/*function unlockForm() {
    if (userRole === 'driver') { alert('Водитель не может редактировать!'); return; }
    isLocked = false;
    var inputs = document.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = false;
    document.getElementById('btnSave').style.display = 'inline-block';
    document.getElementById('btnAdd').style.display = 'inline-block';
    document.getElementById('btnUnlock').style.display = 'none';
}*/
function unlockForm() {
    if (userRole !== 'admin') { 
        alert('Только администратор может разблокировать!'); 
        return; 
    }
    isLocked = false;
    blankData.locked = false;
    saveBlankState();
    var inputs = document.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = false;
    document.getElementById('btnSave').style.display = 'inline-block';
    document.getElementById('btnAdd').style.display = 'inline-block';
    document.getElementById('btnUnlock').style.display = 'none';
}
function saveBlankState() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', FIREBASE_URL + '/data.json', true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            if (data && data.mtkBlanks) {
                for (var i = 0; i < data.mtkBlanks.length; i++) {
                    if (data.mtkBlanks[i].id === blankData.id) {
                        data.mtkBlanks[i].locked = blankData.locked;
                        break;
                    }
                }
                var xhr2 = new XMLHttpRequest();
                xhr2.open('PUT', FIREBASE_URL + '/data.json', true);
                xhr2.setRequestHeader('Content-Type', 'application/json');
                xhr2.send(JSON.stringify(data));
            }
        }
    };
    xhr.send();
}
loadBlank();
