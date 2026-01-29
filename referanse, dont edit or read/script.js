// JavaScript code will be here

let db;
const DB_NAME = 'MimiProDB';
const DB_VERSION = 1;

function initDB() {
return new Promise((resolve, reject) => {
const request = indexedDB.open(DB_NAME, DB_VERSION);
request.onerror = () => reject(request.error);
request.onsuccess = () => {
db = request.result;
resolve(db);
};
request.onupgradeneeded = (e) => {
const database = e.target.result;
if (!database.objectStoreNames.contains('products')) {
database.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
}
if (!database.objectStoreNames.contains('history')) {
const historyStore = database.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
historyStore.createIndex('date', 'date', { unique: false });
}
};
});
}

async function getAllFromStore(storeName) {
return new Promise((resolve, reject) => {
const transaction = db.transaction([storeName], 'readonly');
const store = transaction.objectStore(storeName);
const request = store.getAll();
request.onsuccess = () => resolve(request.result);
request.onerror = () => reject(request.error);
});
}

async function addToStore(storeName, data) {
return new Promise((resolve, reject) => {
const transaction = db.transaction([storeName], 'readwrite');
const store = transaction.objectStore(storeName);
const request = store.add(data);
request.onsuccess = () => resolve(request.result);
request.onerror = () => reject(request.error);
});
}

async function updateInStore(storeName, data) {
return new Promise((resolve, reject) => {
const transaction = db.transaction([storeName], 'readwrite');
const store = transaction.objectStore(storeName);
const request = store.put(data);
request.onsuccess = () => resolve(request.result);
request.onerror = () => reject(request.error);
});
}

async function deleteFromStore(storeName, id) {
return new Promise((resolve, reject) => {
const transaction = db.transaction([storeName], 'readwrite');
const store = transaction.objectStore(storeName);
const request = store.delete(id);
request.onsuccess = () => resolve();
request.onerror = () => reject(request.error);
});
}

async function clearStore(storeName) {
return new Promise((resolve, reject) => {
const transaction = db.transaction([storeName], 'readwrite');
const store = transaction.objectStore(storeName);
const request = store.clear();
request.onsuccess = () => resolve();
request.onerror = () => reject(request.error);
});
}

let products = [];
let history = [];
let editIndex = -1;
let editingHistoryIndex = -1;

let pendingDeleteCallback = null;

function showDeleteConfirm(callback) {
    pendingDeleteCallback = callback;
    document.getElementById('deleteConfirmPopup').classList.add('show');
}

function closeDeleteConfirm() {
    document.getElementById('deleteConfirmPopup').classList.remove('show');
    pendingDeleteCallback = null;
}

function confirmDeleteAction() {
    if (pendingDeleteCallback) {
        pendingDeleteCallback();
    }
    closeDeleteConfirm();
}

function addSwipeToDelete(row, deleteCallback) {
let startX = 0;
let currentX = 0;
let isSwiping = false;
let hasMoved = false;

row.addEventListener('touchstart', (e) => {
if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
const point = e.touches[0];
startX = point.clientX;
currentX = startX;
isSwiping = true;
hasMoved = false;
}, { passive: false });

row.addEventListener('touchmove', (e) => {
if (!isSwiping) return;
const point = e.touches[0];
currentX = point.clientX;
const diff = startX - currentX;

if (Math.abs(diff) > 10) {
hasMoved = true;
if (e.cancelable) e.preventDefault();
}

if (diff > 0 && diff < 150) {
row.style.transform = `translateX(${-diff}px)`;
row.style.backgroundColor = '#ffe6e6';
}
}, { passive: false });

row.addEventListener('touchend', () => {
if (!isSwiping) return;
const diff = startX - currentX;
if (hasMoved && diff > 100) {
showDeleteConfirm(() => {
row.style.transform = 'translateX(-500px)';
setTimeout(() => deleteCallback(), 300);
});
row.style.transform = '';
row.style.backgroundColor = '';
} else {
row.style.transform = '';
row.style.backgroundColor = '';
}
isSwiping = false;
hasMoved = false;
});
}

function showPage(pageName) {
document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
document.getElementById(pageName).classList.add('active');
event.currentTarget.classList.add('active');
if (pageName === 'products') renderProducts();
if (pageName === 'history') {
initializeHistoryFilters();
renderHistory();
}
if (pageName === 'monthly') renderMonthlyReport();
}

async function renderProducts() {
products = await getAllFromStore('products');
const tbody = document.querySelector('#prodTable tbody');
tbody.innerHTML = '';
products.forEach((p, i) => {
const tr = document.createElement('tr');
tr.innerHTML = `
<td>${p.name}</td>
<td>${p.pcs}</td>
<td>৳${p.price}</td>
<td><button class="btn btn-primary btn-small" onclick="editProduct(${i})">Edit</button></td>
`;
addSwipeToDelete(tr, async () => {
await deleteFromStore('products', p.id);
renderProducts();
refreshSelects();
});
tbody.appendChild(tr);
});
}

function openModal() {
document.getElementById('modal').classList.add('show');
document.getElementById('modalTitle').innerText = 'Add Product';
document.getElementById('pname').value = '';
document.getElementById('ppc').value = '';
document.getElementById('pprice').value = '';
editIndex = -1;
}

function closeModal() {
document.getElementById('modal').classList.remove('show');
}

async function editProduct(i) {
editIndex = i;
const p = products[i];
document.getElementById('modalTitle').innerText = 'Edit Product';
document.getElementById('pname').value = p.name;
document.getElementById('ppc').value = p.pcs;
document.getElementById('pprice').value = p.price;
document.getElementById('modal').classList.add('show');
}

async function saveProduct() {
const name = document.getElementById('pname').value.trim();
const pcs = +document.getElementById('ppc').value;
const price = +document.getElementById('pprice').value;
if (!name || !pcs || !price) {
alert('Fill all fields');
return;
}
const obj = { name, pcs, price };
if (editIndex === -1) {
await addToStore('products', obj);
} else {
obj.id = products[editIndex].id;
await updateInStore('products', obj);
}
closeModal();
await renderProducts();
refreshSelects();
}

const invBody = document.querySelector('#invTable tbody');
const cashBody = document.querySelector('#cashTable tbody');
const expenseBody = document.querySelector('#expenseTable tbody');

async function addRow() {
const r = document.createElement('tr');
r.innerHTML = `
<td><select></select></td>
<td class="col-green"><input type="number" value="0"></td>
<td class="col-green"><input type="number" value="0"></td>
<td class="col-red"><input type="number" value="0"></td>
<td class="col-red"><input type="number" value="0"></td>
<td class="readonly">0</td>
<td><input type="number" value="0"></td>
<td class="readonly">0</td>
`;
const sel = r.querySelector('select');
const priceInput = r.children[6].firstChild;
products.forEach(p => sel.add(new Option(p.name, p.name)));
sel.onchange = function() {
const prod = products.find(p => p.name === this.value);
if (prod) {
priceInput.value = prod.price;
calcAll();
}
};
r.querySelectorAll('input, select').forEach(i => i.oninput = calcAll);
addSwipeToDelete(r, () => { r.remove(); calcAll(); });
invBody.appendChild(r);
}

const notes = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
notes.forEach(n => {
const tr = document.createElement('tr');
tr.innerHTML = `<td style="font-weight: 600;">৳${n}</td><td><input type="number" value="0"></td><td class="readonly">0</td>`;
tr.querySelector('input').oninput = calcAll;
cashBody.appendChild(tr);
});

function addExpense() {
document.getElementById('expenseModal').classList.add('show');
document.getElementById('expenseName').value = '';
document.getElementById('expenseAmount').value = '';
}

function closeExpenseModal() {
document.getElementById('expenseModal').classList.remove('show');
}

function saveExpenseFromModal() {
const name = document.getElementById('expenseName').value.trim();
const amt = +document.getElementById('expenseAmount').value;
if (!name || !amt || amt <= 0) {
alert('Please enter valid expense details');
return;
}
const tr = document.createElement('tr');
tr.innerHTML = `
<td>${name}</td>
<td><input type="number" value="${amt}"></td>
`;
tr.children[1].firstChild.oninput = calcAll;
addSwipeToDelete(tr, () => { tr.remove(); calcAll(); });
expenseBody.appendChild(tr);
calcAll();
closeExpenseModal();
}

function calcAll() {
let sales = 0;
invBody.querySelectorAll('tr').forEach(r => {
const p = products.find(x => x.name === r.children[0].firstChild.value);
if (!p) return;
const d = (+r.children[1].firstChild.value) * p.pcs + (+r.children[2].firstChild.value);
const ret = (+r.children[3].firstChild.value) * p.pcs + (+r.children[4].firstChild.value);
const sold = Math.max(0, d - ret);
const userPrice = +r.children[6].firstChild.value || p.price;
const tot = sold * userPrice;
r.children[5].innerText = sold;
r.children[7].innerText = Math.round(tot);
sales += tot;
});
let cash = 0;
cashBody.querySelectorAll('tr').forEach(r => {
const n = parseInt(r.children[0].innerText.replace('৳', ''));
const q = +r.children[1].firstChild.value;
const t = n * q;
r.children[2].innerText = Math.round(t);
cash += t;
});
let expense = 0;
expenseBody.querySelectorAll('tr').forEach(r => {
expense += +r.children[1].firstChild.value;
});
const netTotal = sales - cash - expense;
document.getElementById('sales').innerText = Math.round(sales);
document.getElementById('cash').innerText = Math.round(cash);
document.getElementById('totalExpense').innerText = Math.round(expense);
document.getElementById('summaryS').innerText = Math.round(sales);
document.getElementById('summaryC').innerText = Math.round(cash);
document.getElementById('summaryE').innerText = Math.round(expense);
document.getElementById('net').innerText = Math.round(netTotal);
}

async function saveCalculation() {
if (invBody.querySelectorAll('tr').length === 0) {
alert('Please add products to calculate');
return;
}



let name;
if (editingHistoryIndex === -1) {
name = await showCustomPrompt('Customer Name');
} else {
name = await showCustomPrompt('Customer Name', history[editingHistoryIndex].name.split(', ')[0]);
}



if (!name) return;
const date = new Date().toISOString();
const calcData = [];
invBody.querySelectorAll('tr').forEach(r => {
const product = r.children[0].firstChild.value;
if (!product) return;
calcData.push({
product,
dc: r.children[1].firstChild.value,
dp: r.children[2].firstChild.value,
rc: r.children[3].firstChild.value,
rp: r.children[4].firstChild.value,
sold: r.children[5].innerText,
price: r.children[6].firstChild.value,
total: r.children[7].innerText
});
});
if (calcData.length === 0) {
alert('Please select products');
return;
}
const expenseData = [];
expenseBody.querySelectorAll('tr').forEach(r => {
expenseData.push({
name: r.children[0].innerText,
amount: r.children[1].firstChild.value
});
});
const cashDetail = [];
cashBody.querySelectorAll('tr').forEach(r => {
cashDetail.push({
note: parseInt(r.children[0].innerText.replace('৳', '')),
qty: +r.children[1].firstChild.value,
total: +r.children[2].innerText
});
});
const calcObj = {
name: `${name}, ${new Date(date).toLocaleDateString()}`,
date,
sales: document.getElementById('sales').innerText,
cash: document.getElementById('cash').innerText,
totalExpense: document.getElementById('totalExpense').innerText,
net: document.getElementById('net').innerText,
calculation: calcData,
expenses: expenseData,
cashDetail
};
if (editingHistoryIndex === -1) {
await addToStore('history', calcObj);
alert('Calculation Saved Successfully!');
} else {
calcObj.id = history[editingHistoryIndex].id;
await updateInStore('history', calcObj);
editingHistoryIndex = -1;
alert('Calculation Updated Successfully!');
}
clearForm();
}

function clearForm() {
invBody.innerHTML = '';
expenseBody.innerHTML = '';
cashBody.querySelectorAll('tr').forEach(r => {
r.children[1].firstChild.value = '0';
});
calcAll();
addRow();
}

function initializeHistoryFilters() {
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
document.getElementById('filterDate').value = `${year}-${month}-${day}`;
}

async function renderHistory() {
history = await getAllFromStore('history');
const filterYear = document.getElementById('filterYear').value;
const filterMonth = document.getElementById('filterMonth').value;
const filterDate = document.getElementById('filterDate').value;
const dailyData = {};
history.forEach((h, i) => {
const date = new Date(h.date);
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const dateKey = `${year}-${month}-${day}`;
let matchesFilter = true;
if (filterYear && year != filterYear) matchesFilter = false;
if (filterMonth && month != filterMonth) matchesFilter = false;
if (filterDate && filterDate != dateKey) matchesFilter = false;
if (!matchesFilter) return;
if (!dailyData[dateKey]) {
dailyData[dateKey] = {
date,
dateFormatted: date.toLocaleDateString(),
records: []
};
}
dailyData[dateKey].records.push({ index: i, data: h });
});
const sortedDates = Object.keys(dailyData).sort((a, b) => b.localeCompare(a));
const tbody = document.querySelector('#historyTable tbody');
tbody.innerHTML = '';
if (sortedDates.length === 0) {
tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;color:#999'>No records found</td></tr>";
} else {
sortedDates.forEach(dateKey => {
const dayData = dailyData[dateKey];
dayData.records.forEach((rec, idx) => {
const tr = document.createElement('tr');
tr.innerHTML = `
<td>${idx === 0 ? dayData.dateFormatted : ''}</td>
<td>${rec.data.name.split(', ')[0]}</td>
<td>৳${Math.round(parseFloat(rec.data.sales))}</td>
<td><button class="btn btn-primary btn-small" onclick="viewCalculation(${rec.index})">View</button></td>
<td><button class="btn btn-primary btn-small" onclick="loadCalculationForEdit(${rec.index})">Edit</button></td>
`;
addSwipeToDelete(tr, async () => {
await deleteFromStore('history', rec.data.id);
renderHistory();
});
tbody.appendChild(tr);
});
});
}
updateFilterYears();
}

function updateFilterYears() {
const yearSelect = document.getElementById('filterYear');
const currentYear = yearSelect.value;
const years = new Set();
history.forEach(h => {
const year = new Date(h.date).getFullYear();
years.add(year);
});
const sortedYears = Array.from(years).sort((a, b) => b - a);
yearSelect.innerHTML = '<option value="">All</option>';
sortedYears.forEach(year => {
yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
});
yearSelect.value = currentYear;
}

function clearFilters() {
document.getElementById('filterYear').value = '';
document.getElementById('filterMonth').value = '';
document.getElementById('filterDate').value = '';
renderHistory();
}

function viewCalculation(i) {
  const h = history[i];
  const customer = h.name.split(', ')[0];
  const dateText = h.name.split(', ')[1] || new Date(h.date).toLocaleDateString();

  let html = `
  <div class="print-document">
    <div class="print-header">
      <h2>Calculation Details</h2>
      <p><strong>Customer & Date:</strong> ${customer}, ${dateText}</p>
    </div>

    <div class="print-section">
      <h3>Products & Sales</h3>
      <table class="print-table">
        <colgroup>
          <col style="width:38%">
          <col style="width:7%"><col style="width:7%"><col style="width:7%"><col style="width:7%">
          <col style="width:8%"><col style="width:12%"><col style="width:14%">
        </colgroup>
        <thead>
          <tr>
            <th class="col-product">Product Name</th>
            <th class="col-num">DC</th>
            <th class="col-num">DP</th>
            <th class="col-num">RC</th>
            <th class="col-num">RP</th>
            <th class="col-num">Sold</th>
            <th class="col-num">Price</th>
            <th class="col-num">Total</th>
          </tr>
        </thead>
        <tbody>`;

  h.calculation.forEach(c => {
    html += `
          <tr>
            <td class="col-product">${c.product}</td>
            <td class="col-num">${c.dc}</td>
            <td class="col-num">${c.dp}</td>
            <td class="col-num">${c.rc}</td>
            <td class="col-num">${c.rp}</td>
            <td class="col-num">${c.sold}</td>
            <td class="col-num">৳${c.price}</td>
            <td class="col-total">৳${c.total}</td>
          </tr>`;
  });

  html += `
        </tbody>
      </table>
    </div>

    <div class="print-three-column">
      <div class="print-section-third">
        <h3>Cash Denominations</h3>
        <table class="print-table">
          <thead>
            <tr><th class="col-product">Note (৳)</th><th class="col-num">Qty</th><th class="col-num">Total (৳)</th></tr>
          </thead>
          <tbody>`;

  if (h.cashDetail && h.cashDetail.length > 0) {
    h.cashDetail.forEach(c => {
      if (c.qty > 0) {
        html += `<tr><td class="col-product">${c.note}</td><td class="col-num">${c.qty}</td><td class="col-num">৳${c.total}</td></tr>`;
      }
    });
  } else {
    html += `<tr><td class="col-product" colspan="3" style="text-align:center;color:#999;">No cash</td></tr>`;
  }

  html += `
          </tbody>
        </table>
      </div>

      <div class="print-section-third">
        <h3>Extra Expenses</h3>`;

  if (h.expenses && h.expenses.length > 0) {
    html += `<table class="print-table"><thead><tr><th class="col-product">Expense Name</th><th class="col-num">Amount (৳)</th></tr></thead><tbody>`;
    h.expenses.forEach(e => {
      html += `<tr><td style="text-align:left">${e.name}</td><td class="col-num">৳${e.amount}</td></tr>`;
    });
    html += `</tbody></table>`;
  } else {
    html += `<p style="text-align:center;color:#999;margin-top:6px;">No expenses</p>`;
  }

  html += `
      </div>

      <div class="print-section-third">
        <h3>Summary</h3>
        <table class="print-summary-table">
          <tbody>
            <tr><td>Sales Total:</td><td class="col-num">৳${Math.round(h.sales)}</td></tr>
            <tr><td>Cash Received:</td><td class="col-num">৳${Math.round(h.cash)}</td></tr>
            <tr><td>Total Expenses:</td><td class="col-num">৳${Math.round(h.totalExpense)}</td></tr>
            <tr><td>NET TOTAL:</td><td class="col-num">৳${Math.round(h.net)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  document.getElementById('viewContent').innerHTML = html;
  document.getElementById('viewModal').classList.add('show');
}

function closeViewModal() {
document.getElementById('viewModal').classList.remove('show');
}





function printDocument() {
    if (window.AndroidPrint && typeof AndroidPrint.print === "function") {
        AndroidPrint.print();   // Android native print (A4, @media print)
    } else {
        alert("Printing is not supported on this device.");
    }
}





async function loadCalculationForEdit(i) {
editingHistoryIndex = i;
const h = history[i];
invBody.innerHTML = '';
h.calculation.forEach(calc => {
const r = document.createElement('tr');
r.innerHTML = `<td><select></select></td><td class="col-green"><input type="number" value="${calc.dc}"></td><td class="col-green"><input type="number" value="${calc.dp}"></td><td class="col-red"><input type="number" value="${calc.rc}"></td><td class="col-red"><input type="number" value="${calc.rp}"></td><td class="readonly">${calc.sold}</td><td><input type="number" value="${calc.price}"></td><td class="readonly">${calc.total}</td>`;
const sel = r.querySelector('select');
const priceInput = r.children[6].firstChild;
products.forEach(p => sel.add(new Option(p.name, p.name)));
sel.value = calc.product;
sel.onchange = function() {
const prod = products.find(p => p.name === this.value);
if (prod) {
priceInput.value = prod.price;
calcAll();
}
};
r.querySelectorAll('input, select').forEach(inp => inp.oninput = calcAll);
addSwipeToDelete(r, () => { r.remove(); calcAll(); });
invBody.appendChild(r);
});
expenseBody.innerHTML = '';
if (h.expenses && h.expenses.length > 0) {
h.expenses.forEach(exp => {
const tr = document.createElement('tr');
tr.innerHTML = `<td>${exp.name}</td><td><input type="number" value="${exp.amount}"></td>`;
tr.children[1].firstChild.oninput = calcAll;
addSwipeToDelete(tr, () => { tr.remove(); calcAll(); });
expenseBody.appendChild(tr);
});
}
if (h.cashDetail && h.cashDetail.length > 0) {
h.cashDetail.forEach((cash, idx) => {
const rows = cashBody.querySelectorAll('tr');
if (rows[idx]) {
rows[idx].children[1].firstChild.value = cash.qty;
}
});
}
calcAll();
showPage('inventory');
}

async function renderMonthlyReport() {
history = await getAllFromStore('history');
const monthlyData = {};
history.forEach(h => {
const date = new Date(h.date);
const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
if (!monthlyData[monthKey]) {
monthlyData[monthKey] = {
monthName,
date,
deliveries: [],
totalSales: 0
};
}
monthlyData[monthKey].deliveries.push(h);
monthlyData[monthKey].totalSales += parseFloat(h.sales) || 0;
});
const sortedMonths = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a));
let html = '';
if (sortedMonths.length === 0) {
html = "<p style='text-align:center;color:#999;padding:20px'>No delivery records found</p>";
} else {
sortedMonths.forEach(monthKey => {
const monthData = monthlyData[monthKey];
const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const isCurrentMonth = monthKey === currentMonth;
const isCollapsed = !isCurrentMonth;
html += `<div class="month-section"><div class="month-header" onclick="toggleMonth(this)"><span>${monthData.monthName} (${monthData.deliveries.length} deliveries)</span><span class="month-toggle">${isCollapsed ? '▼' : '▲'}</span></div><div class="month-content ${isCollapsed ? 'collapsed' : ''}"><div style="overflow-x: auto;"><table style="width: 100%; font-size: 13px;"><thead><tr><th>Customer & Date</th><th>Sales (৳)</th><th>Net (৳)</th><th>View</th></tr></thead><tbody>`;
monthData.deliveries.forEach(delivery => {
const historyIdx = history.indexOf(delivery);
html += `<tr><td>${delivery.name}</td><td>৳${Math.round(parseFloat(delivery.sales))}</td><td>৳${Math.round(parseFloat(delivery.net))}</td><td><button class="btn btn-primary btn-small" onclick="viewCalculation(${historyIdx})">View</button></td></tr>`;
});
html += `</tbody></table></div><div class="month-summary">Monthly Sales: ৳${Math.round(monthData.totalSales)}</div></div></div>`;
});
}
document.getElementById('monthlyContent').innerHTML = html;
}

function toggleMonth(element) {
const content = element.nextElementSibling;
const toggle = element.querySelector('.month-toggle');
if (content.classList.contains('collapsed')) {
content.classList.remove('collapsed');
toggle.textContent = '▲';
} else {
content.classList.add('collapsed');
toggle.textContent = '▼';
}
}

function refreshSelects() {
invBody.querySelectorAll('select').forEach(sel => {
const current = sel.value;
sel.innerHTML = '';
products.forEach(p => sel.add(new Option(p.name, p.name)));
sel.value = current;
});
}



let promptResolve = null;

function showCustomPrompt(title, defaultValue = '') {
return new Promise((resolve) => {
promptResolve = resolve;
document.getElementById('promptTitle').innerText = title;
document.getElementById('promptInput').value = defaultValue;
document.getElementById('customPrompt').classList.add('show');
document.getElementById('promptInput').focus();
});
}

function closeCustomPrompt() {
document.getElementById('customPrompt').classList.remove('show');
if (promptResolve) {
promptResolve(null);
promptResolve = null;
}
}

function submitCustomPrompt() {
const value = document.getElementById('promptInput').value.trim();
document.getElementById('customPrompt').classList.remove('show');
if (promptResolve) {
promptResolve(value || null);
promptResolve = null;
}
}

// Allow Enter key to submit
document.addEventListener('DOMContentLoaded', () => {
document.getElementById('promptInput')?.addEventListener('keypress', (e) => {
if (e.key === 'Enter') {
submitCustomPrompt();
}
});
});












initDB().then(async () => {
products = await getAllFromStore('products');
addRow();
});
