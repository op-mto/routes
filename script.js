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
        if (xhr.status === 200 && xhr.responseText !== 'null' && xhr.responseText !== '') {
            try {
                var loaded = JSON.parse(xhr.responseText);
                if (loaded && typeof loaded === 'object') {
                    if (loaded.users) data.users = loaded.users;
                    if (loaded.routes) data.routes = loaded.routes;
                    if (loaded.settings) data.settings = loaded.settings;
                }
            } catch(e) {}
        }
        if (!data.routes) data.routes = [];
        if (!data.users) data.users = [];
        if (!data.settings) data.settings = { nextRouteId: 1, nextUserId: 4, addressHistory: { from: [], to: [] }, mtkCounter: 1, mtkDate: "" };
        if (!data.settings.addressHistory) data.settings.addressHistory = { from: [], to: [] };
        renderTable();
    };
    xhr.onerror = function() {
        renderTable();
    };
    xhr.send();
}

function saveData() {
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
    if (data.users) {
        for (var i = 0; i < data.users.length; i++) {
            if (data.users[i].login === loginValue && data.users[i].password === passwordValue) { user = data.users[i]; break; }
       