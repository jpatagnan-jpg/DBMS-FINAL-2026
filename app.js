const STORAGE_KEY = "utangtrack-demo-v1";
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const todayISO = () => new Date().toISOString().slice(0, 10);
const dayOffset = (days) => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const toCents = value => {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value ?? "").trim());
  return match ? Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0")) : NaN;
};
const fromCents = value => value / 100;
const sumMoney = (items, select) => fromCents(items.reduce((sum, item) => sum + toCents(select(item)), 0));
const initialData = () => ({
  settings: { store_name: "Mila's Sari-Sari", full_name: "Mila Cruz", email: "mila@example.com", contact: "0917 123 4567", address: "San Isidro, Quezon City" },
  customers: [
    { id:"c1",full_name:"Juan Dela Cruz",contact_number:"0917 123 4567",address:"San Isidro",created_at:dayOffset(-50) },
    { id:"c2",full_name:"Ana Reyes",contact_number:"0928 556 1020",address:"Rizal Street",created_at:dayOffset(-35) },
    { id:"c3",full_name:"Pedro Santos",contact_number:"0998 341 2290",address:"Purok 2",created_at:dayOffset(-22) },
    { id:"c4",full_name:"Liza Mendoza",contact_number:"0916 812 0093",address:"Mabini Avenue",created_at:dayOffset(-14) },
    { id:"c5",full_name:"Carlo Garcia",contact_number:"0920 441 8812",address:"San Isidro",created_at:dayOffset(-8) }
  ],
  products: [
    { id:"p1",product_name:"Rice (per kilo)",category:"Essentials",price:58,stock_quantity:28,created_at:dayOffset(-60) },
    { id:"p2",product_name:"Cooking oil 250ml",category:"Essentials",price:35,stock_quantity:9,created_at:dayOffset(-50) },
    { id:"p3",product_name:"Instant noodles",category:"Snacks",price:15,stock_quantity:42,created_at:dayOffset(-45) },
    { id:"p4",product_name:"Canned sardines",category:"Canned goods",price:27,stock_quantity:6,created_at:dayOffset(-40) },
    { id:"p5",product_name:"Coffee sachet",category:"Beverages",price:8,stock_quantity:55,created_at:dayOffset(-35) },
    { id:"p6",product_name:"Laundry detergent",category:"Household",price:12,stock_quantity:3,created_at:dayOffset(-25) }
  ],
  transactions: [
    { id:"t1",customer_id:"c1",description:"Rice, cooking oil & noodles",quantity:1,unit_price:185,total_amount:185,transaction_date:dayOffset(-1),due_date:dayOffset(6),notes:"",status:"Unpaid" },
    { id:"t2",customer_id:"c2",description:"Canned goods and coffee",quantity:1,unit_price:135,total_amount:135,transaction_date:todayISO(),due_date:dayOffset(7),notes:"",status:"Unpaid" },
    { id:"t3",customer_id:"c3",description:"Groceries",quantity:1,unit_price:420,total_amount:420,transaction_date:dayOffset(-12),due_date:dayOffset(-2),notes:"",status:"Overdue" },
    { id:"t4",customer_id:"c4",description:"Household essentials",quantity:1,unit_price:260,total_amount:260,transaction_date:dayOffset(-4),due_date:dayOffset(3),notes:"",status:"Unpaid" },
    { id:"t5",customer_id:"c1",description:"Rice and canned sardines",quantity:1,unit_price:315,total_amount:315,transaction_date:dayOffset(-18),due_date:dayOffset(-8),notes:"",status:"Unpaid" },
    { id:"t6",customer_id:"c5",description:"Snacks and drinks",quantity:1,unit_price:95,total_amount:95,transaction_date:dayOffset(-2),due_date:dayOffset(5),notes:"",status:"Unpaid" }
  ],
  payments: [
    { id:"pay1",customer_id:"c2",transaction_id:"t2",amount:40,payment_date:todayISO(),notes:"Partial payment" },
    { id:"pay2",customer_id:"c3",transaction_id:"t3",amount:100,payment_date:dayOffset(-4),notes:"" }
  ]
});
let db;
try { db = JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialData(); } catch { db = initialData(); }
let currentPage = "dashboard";
let selectedLedgerId = db.customers[0]?.id || "";
let reportStart = dayOffset(-30), reportEnd = todayISO();
let activeQuery = "";
let activeFilter = "all";

const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));
const money = value => peso.format(Number(value || 0));
const shortDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"}) : "—";
const customer = id => db.customers.find(item => item.id === id);
const paymentsFor = id => sumMoney(db.payments.filter(item => item.transaction_id === id), item => item.amount);
const transactionPaid = item => paymentsFor(item.id);
const outstanding = item => fromCents(Math.max(0, toCents(item.total_amount) - toCents(transactionPaid(item))));
const customerBalance = id => fromCents(db.transactions.filter(item => item.customer_id === id).reduce((sum,item) => sum + toCents(outstanding(item)),0));
const customerCredit = id => sumMoney(db.transactions.filter(item => item.customer_id === id), item => item.total_amount);
const customerPayments = id => sumMoney(db.payments.filter(item => item.customer_id === id), item => item.amount);
const getStatus = item => {
  const balance = outstanding(item);
  if (balance <= 0) return "Fully Paid";
  if (item.due_date && item.due_date < todayISO()) return "Overdue";
  if (transactionPaid(item) > 0) return "Partially Paid";
  return "Unpaid";
};
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); render(); }
function statusBadge(status) {
  const cls = status === "Fully Paid" ? "paid" : status === "Overdue" ? "overdue" : status === "Partially Paid" ? "partial" : "unpaid";
  return `<span class="status status-${cls}">${escapeHTML(status)}</span>`;
}
function avatar(name = "?") { return escapeHTML(name.split(/\s+/).slice(0,2).map(part => part[0] || "").join("").toUpperCase()); }
function heading(kicker,title,description,action="") {
  return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}
function pageAction(label,icon,action) { return `<button class="button button-primary" data-action="${action}"><i data-lucide="${icon}"></i>${label}</button>`; }
function metric(label,value,icon,detail,iconClass="") {
  return `<article class="metric-card"><div class="metric-top"><span class="metric-label">${label}</span><span class="metric-icon ${iconClass}"><i data-lucide="${icon}"></i></span></div><div class="metric-value">${value}</div><div class="metric-bottom">${detail}</div></article>`;
}
function transactionTable(items, limit) {
  const rows = [...items].sort((a,b) => b.transaction_date.localeCompare(a.transaction_date)).slice(0,limit || 100);
  if (!rows.length) return `<tr><td class="table-empty" colspan="6">No credit transactions found.</td></tr>`;
  return rows.map(item => `<tr><td><span class="customer-cell"><span class="mini-avatar">${avatar(customer(item.customer_id)?.full_name || "?")}</span>${escapeHTML(customer(item.customer_id)?.full_name || "Deleted customer")}</span></td><td>${escapeHTML(item.description)}</td><td>${shortDate(item.transaction_date)}</td><td class="amount">${money(item.total_amount)}</td><td>${statusBadge(getStatus(item))}</td><td><button class="row-action" title="View transaction" data-action="edit-transaction" data-id="${item.id}"><i data-lucide="arrow-up-right"></i></button></td></tr>`).join("");
}
function customersDue() {
  const rows = db.customers.map(item=>({item,balance:customerBalance(item.id)})).filter(row=>row.balance>0).sort((a,b)=>b.balance-a.balance).slice(0,5);
  if (!rows.length) return `<div class="empty-state"><i data-lucide="circle-check"></i><br>All customer balances are clear.</div>`;
  return rows.map(({item,balance})=>`<div class="due-person"><span class="mini-avatar">${avatar(item.full_name)}</span><div class="due-info"><b>${escapeHTML(item.full_name)}</b><small>${escapeHTML(item.contact_number || "No contact number")}</small></div><div class="due-balance">${money(balance)}<small>outstanding</small></div></div>`).join("");
}
function monthlyBars() {
  const months = [];
  for (let offset=5;offset>=0;offset--) {
    const date=new Date(); date.setDate(1); date.setMonth(date.getMonth()-offset);
    const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
    const value=sumMoney(db.payments.filter(item=>item.payment_date.slice(0,7)===key),item=>item.amount);
    months.push({label:date.toLocaleDateString("en-PH",{month:"short"}),value});
  }
  const max=Math.max(...months.map(m=>m.value),100);
  return months.map((item,index)=>`<div class="bar-column"><div class="bar ${index===5?"current":""}" style="height:${Math.max(5,item.value/max*88)}%"></div><span class="bar-label">${item.label}</span></div>`).join("");
}
function dashboard() {
  const totalOutstanding=fromCents(db.customers.reduce((sum,item)=>sum+toCents(customerBalance(item.id)),0));
  const totalPaid=sumMoney(db.payments,item=>item.amount);
  const todayPaid=sumMoney(db.payments.filter(item=>item.payment_date===todayISO()),item=>item.amount);
  const overdue=db.transactions.filter(item=>getStatus(item)==="Overdue").length;
  const recent=[...db.transactions].sort((a,b)=>b.transaction_date.localeCompare(a.transaction_date)).slice(0,5);
  const currentMonth=new Date().toISOString().slice(0,7);
  const monthPaid=sumMoney(db.payments.filter(item=>item.payment_date.slice(0,7)===currentMonth),item=>item.amount);
  const areaPoints = Array.from({length:7},(_,i)=>`${35+i*65},${130-((i*37+monthPaid/20)%85)}`).join(" ");
  return `${heading(new Date().toLocaleDateString("en-PH",{weekday:"long",month:"long",day:"numeric"}).toUpperCase(),"Good morning, Mila <span class='wave'>☀</span>","Here’s what’s happening at your store today.",pageAction("New transaction","plus","new-transaction"))}
    <div class="metrics-grid">
      ${metric("Total customers",db.customers.length,"users-round","Your suki community")}
      ${metric("Outstanding utang",money(totalOutstanding),"hand-coins",`${db.transactions.filter(i=>outstanding(i)>0).length} open credit accounts`,"yellow")}
      ${metric("Payments received",money(totalPaid),"wallet",`<strong>${money(todayPaid)}</strong> collected today`,"blue")}
      ${metric("Overdue accounts",String(overdue).padStart(2,"0"),"alarm-clock",overdue?`<strong>Needs a friendly follow-up</strong>`:"You're all caught up","red")}
    </div>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel-header"><div><div class="panel-title">Payment activity</div><div class="panel-subtitle">Collections over the past 7 days</div></div><button class="text-link" data-page="reports">View report <i data-lucide="arrow-right"></i></button></div>
        <div class="activity-amount">${money(todayPaid)}</div><p class="activity-note">Collected today <span>·</span> ${money(monthPaid)} this month</p>
        <div class="chart-wrap"><svg viewBox="0 0 470 190" role="img" aria-label="Weekly payment activity chart"><defs><linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#a8c3a0" stop-opacity=".36"/><stop offset="100%" stop-color="#a8c3a0" stop-opacity="0"/></linearGradient></defs><line class="chart-grid" x1="34" y1="28" x2="455" y2="28"/><line class="chart-grid" x1="34" y1="70" x2="455" y2="70"/><line class="chart-grid" x1="34" y1="112" x2="455" y2="112"/><line class="chart-grid" x1="34" y1="154" x2="455" y2="154"/><text class="chart-label" x="0" y="31">₱400</text><text class="chart-label" x="0" y="73">₱300</text><text class="chart-label" x="0" y="115">₱200</text><text class="chart-label" x="0" y="157">₱100</text><polygon class="chart-area" points="35,165 ${areaPoints} 425,165"/><polyline class="chart-line" points="${areaPoints}"/>${areaPoints.split(" ").map(p=>{const [x,y]=p.split(",");return `<circle class="chart-dot" cx="${x}" cy="${y}" r="3.5"/>`}).join("")}<text class="chart-label" x="34" y="183">Mon</text><text class="chart-label" x="100" y="183">Tue</text><text class="chart-label" x="165" y="183">Wed</text><text class="chart-label" x="230" y="183">Thu</text><text class="chart-label" x="295" y="183">Fri</text><text class="chart-label" x="360" y="183">Sat</text><text class="chart-label" x="425" y="183">Sun</text></svg><div class="chart-legend"><span><i class="legend-key"></i>Payments collected</span></div></div></section>
      <section class="panel"><div class="panel-header"><div><div class="panel-title">Monthly collections</div><div class="panel-subtitle">Payments received by month</div></div><span class="metric-icon yellow"><i data-lucide="chart-no-axes-column-increasing"></i></span></div><div class="activity-amount">${money(monthPaid)}</div><p class="activity-note">Collected this month</p><div class="bar-chart">${monthlyBars()}</div><div class="activity-footer"><span>Last 6 months</span><strong>Credit ≠ income. This chart shows payments.</strong></div></section>
    </div>
    <div class="lower-grid"><section class="panel table-panel"><div class="panel-header"><div><div class="panel-title">Recent transactions</div><div class="panel-subtitle">Latest credit activity in your store</div></div><button class="text-link" data-page="utang">See all <i data-lucide="arrow-right"></i></button></div><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Description</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${transactionTable(recent,5)}</tbody></table></div></section>
    <section class="panel"><div class="panel-header"><div><div class="panel-title">Customers to follow up</div><div class="panel-subtitle">Highest outstanding balances</div></div><button class="text-link" data-page="customers">View all</button></div><div class="due-list">${customersDue()}</div></section></div>`;
}
function customersPage() {
  const records=db.customers.filter(item=>`${item.full_name} ${item.contact_number} ${item.address}`.toLowerCase().includes(activeQuery.toLowerCase()));
  return `${heading("YOUR COMMUNITY","Customers","Manage your suki, contact details, and balances.",pageAction("Add customer","user-round-plus","new-customer"))}
    <div class="page-stat-strip"><span class="stat-pill">All customers <b>${db.customers.length}</b></span><span class="stat-pill">With balance <b>${db.customers.filter(c=>customerBalance(c.id)>0).length}</b></span><span class="stat-pill">Total outstanding <b>${money(fromCents(db.customers.reduce((s,c)=>s+toCents(customerBalance(c.id)),0)))}</b></span></div>
    <div class="toolbar"><label class="search-box"><i data-lucide="search"></i><input id="searchInput" placeholder="Search name, phone, or address..." value="${escapeHTML(activeQuery)}"></label><select class="filter-select" id="customerFilter"><option value="all">All customers</option><option value="balance">Has balance</option><option value="clear">No balance</option></select></div>
    <div class="table-card"><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Contact</th><th>Address</th><th>Total utang</th><th>Payments</th><th>Balance</th><th>Joined</th><th>Actions</th></tr></thead><tbody>${records.filter(c=>activeFilter==="all"||(activeFilter==="balance"?customerBalance(c.id)>0:customerBalance(c.id)===0)).map(item=>`<tr><td><span class="customer-cell"><span class="mini-avatar">${avatar(item.full_name)}</span>${escapeHTML(item.full_name)}</span></td><td>${escapeHTML(item.contact_number||"—")}</td><td>${escapeHTML(item.address||"—")}</td><td>${money(customerCredit(item.id))}</td><td>${money(customerPayments(item.id))}</td><td class="amount">${money(customerBalance(item.id))}</td><td>${shortDate(item.created_at)}</td><td><div class="row-actions"><button class="row-action" title="Edit" data-action="edit-customer" data-id="${item.id}"><i data-lucide="pencil"></i></button><button class="row-action" title="Open ledger" data-action="open-ledger" data-id="${item.id}"><i data-lucide="notebook-tabs"></i></button><button class="row-action" title="Delete" data-action="delete-customer" data-id="${item.id}"><i data-lucide="trash-2"></i></button></div></td></tr>`).join("")||`<tr><td colspan="8" class="table-empty">No customers match your search.</td></tr>`}</tbody></table></div></div>`;
}
function utangPage() {
  const items=db.transactions.filter(item=>`${customer(item.customer_id)?.full_name||""} ${item.description}`.toLowerCase().includes(activeQuery.toLowerCase())).filter(item=>activeFilter==="all"||getStatus(item)===activeFilter);
  return `${heading("CREDIT BOOK","Utang management","Record purchases and keep every balance up to date.",pageAction("Record utang","plus","new-transaction"))}
    <div class="page-stat-strip"><span class="stat-pill">Transactions <b>${db.transactions.length}</b></span><span class="stat-pill">Open balances <b>${db.transactions.filter(i=>outstanding(i)>0).length}</b></span><span class="stat-pill">Outstanding <b>${money(fromCents(db.customers.reduce((s,c)=>s+toCents(customerBalance(c.id)),0)))}</b></span></div>
    <div class="toolbar"><label class="search-box"><i data-lucide="search"></i><input id="searchInput" placeholder="Search customer or purchase..." value="${escapeHTML(activeQuery)}"></label><select class="filter-select" id="statusFilter"><option value="all">All statuses</option>${["Unpaid","Partially Paid","Fully Paid","Overdue"].map(s=>`<option ${activeFilter===s?"selected":""}>${s}</option>`).join("")}</select></div>
    <div class="table-card"><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Purchase description</th><th>Date</th><th>Due date</th><th>Total</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>${[...items].sort((a,b)=>b.transaction_date.localeCompare(a.transaction_date)).map(item=>`<tr><td><span class="customer-cell"><span class="mini-avatar">${avatar(customer(item.customer_id)?.full_name||"?")}</span>${escapeHTML(customer(item.customer_id)?.full_name||"Deleted customer")}</span></td><td>${escapeHTML(item.description)}</td><td>${shortDate(item.transaction_date)}</td><td>${shortDate(item.due_date)}</td><td>${money(item.total_amount)}</td><td class="amount">${money(outstanding(item))}</td><td>${statusBadge(getStatus(item))}</td><td><div class="row-actions"><button class="row-action" title="Edit" data-action="edit-transaction" data-id="${item.id}"><i data-lucide="pencil"></i></button><button class="row-action" title="Delete" data-action="delete-transaction" data-id="${item.id}"><i data-lucide="trash-2"></i></button></div></td></tr>`).join("")||`<tr><td colspan="8" class="table-empty">No transactions found.</td></tr>`}</tbody></table></div></div>`;
}
function paymentsPage() {
  const records=[...db.payments].filter(item=>`${customer(item.customer_id)?.full_name||""} ${item.notes||""}`.toLowerCase().includes(activeQuery.toLowerCase())).sort((a,b)=>b.payment_date.localeCompare(a.payment_date));
  const month=new Date().toISOString().slice(0,7);
  const monthTotal=sumMoney(db.payments.filter(p=>p.payment_date.slice(0,7)===month),p=>p.amount);
  return `${heading("MONEY IN","Payments","Record collections, track payment history, and print receipts.",pageAction("Record payment","circle-dollar-sign","new-payment"))}<div class="page-stat-strip"><span class="stat-pill">Total collected <b>${money(sumMoney(db.payments,p=>p.amount))}</b></span><span class="stat-pill">This month <b>${money(monthTotal)}</b></span><span class="stat-pill">Payment records <b>${db.payments.length}</b></span></div>
    <div class="toolbar"><label class="search-box"><i data-lucide="search"></i><input id="searchInput" placeholder="Search customer or notes..." value="${escapeHTML(activeQuery)}"></label></div><div class="table-card"><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Credit purchase</th><th>Payment date</th><th>Amount received</th><th>Notes</th><th>Receipt</th></tr></thead><tbody>${records.map(p=>`<tr><td><span class="customer-cell"><span class="mini-avatar">${avatar(customer(p.customer_id)?.full_name||"?")}</span>${escapeHTML(customer(p.customer_id)?.full_name||"Deleted customer")}</span></td><td>${escapeHTML(db.transactions.find(t=>t.id===p.transaction_id)?.description||"Account payment")}</td><td>${shortDate(p.payment_date)}</td><td class="amount">${money(p.amount)}</td><td>${escapeHTML(p.notes||"—")}</td><td><button class="row-action" title="Print receipt" data-action="receipt" data-id="${p.id}"><i data-lucide="printer"></i></button></td></tr>`).join("")||`<tr><td colspan="6" class="table-empty">No payments yet. Record your first collection.</td></tr>`}</tbody></table></div></div>`;
}
function ledgerPage() {
  const selected=customer(selectedLedgerId)||db.customers[0];
  if(!selected) return `${heading("CUSTOMER STATEMENT","Customer ledger","A clear history of every credit and payment.",pageAction("Add customer","user-round-plus","new-customer"))}<div class="panel empty-state">Add a customer first to start a ledger.</div>`;
  selectedLedgerId=selected.id;
  const entries=[...db.transactions.filter(t=>t.customer_id===selected.id).map(t=>({date:t.transaction_date,type:"credit",title:t.description,amount:t.total_amount,ref:t.id})),...db.payments.filter(p=>p.customer_id===selected.id).map(p=>({date:p.payment_date,type:"payment",title:p.notes||"Payment received",amount:p.amount,ref:p.id}))].sort((a,b)=>a.date.localeCompare(b.date));
  const customers=db.customers;
  return `${heading("CUSTOMER STATEMENT","Customer ledger","A clear history of every credit and payment.",`<button class="button button-secondary" data-action="print-ledger"><i data-lucide="printer"></i>Print statement</button>`)}
    <div class="ledger-layout"><aside class="panel ledger-side"><h3>Your customers</h3>${customers.map(c=>`<button class="ledger-customer ${c.id===selected.id?"selected":""}" data-action="select-ledger" data-id="${c.id}"><span class="mini-avatar">${avatar(c.full_name)}</span><span><b>${escapeHTML(c.full_name)}</b><small>${money(customerBalance(c.id))} balance</small></span></button>`).join("")}</aside><section class="panel ledger-content"><div class="ledger-summary"><div><h2>${escapeHTML(selected.full_name)}</h2><p>${escapeHTML(selected.contact_number||"No phone")} · ${escapeHTML(selected.address||"No address")}</p></div><div class="ledger-balance">${money(customerBalance(selected.id))}<small>Current balance</small></div></div><div class="page-stat-strip" style="padding:13px 17px 0"><span class="stat-pill">Total credit <b>${money(customerCredit(selected.id))}</b></span><span class="stat-pill">Payments <b>${money(customerPayments(selected.id))}</b></span></div><div class="ledger-table"><div class="ledger-entry" style="font-weight:700;color:#879188"><small>Date</small><span>Activity</span><span style="text-align:right">Amount</span></div>${entries.map(entry=>`<div class="ledger-entry"><small>${shortDate(entry.date)}</small><span>${entry.type==="credit"?"<b>Credit purchase</b>":"<b>Payment received</b>"}<br><small>${escapeHTML(entry.title)}</small></span><span class="${entry.type==="credit"?"entry-credit":"entry-payment"}">${entry.type==="credit"?"+":"−"}${money(entry.amount)}</span></div>`).join("")||`<div class="empty-state">No ledger activity for this customer yet.</div>`}</div></section></div>`;
}
function productsPage() {
  const products=db.products.filter(p=>`${p.product_name} ${p.category}`.toLowerCase().includes(activeQuery.toLowerCase()));
  return `${heading("YOUR SHELVES","Products","Keep your product prices and stock in one place.",pageAction("Add product","package-plus","new-product"))}<div class="page-stat-strip"><span class="stat-pill">Products <b>${db.products.length}</b></span><span class="stat-pill">Low stock <b>${db.products.filter(p=>Number(p.stock_quantity)<=5).length}</b></span><span class="stat-pill">Inventory value <b>${money(fromCents(db.products.reduce((s,p)=>s+toCents(p.price)*Number(p.stock_quantity),0)))}</b></span></div><div class="toolbar"><label class="search-box"><i data-lucide="search"></i><input id="searchInput" placeholder="Search products or category..." value="${escapeHTML(activeQuery)}"></label></div><div class="product-card-grid">${products.map((p,index)=>`<article class="product-card"><div class="product-top"><span class="product-illustration"><i data-lucide="${["package","shopping-basket","coffee","sprout","milk","cookie"][index%6]}"></i></span><span class="product-category">${escapeHTML(p.category||"Uncategorized")}</span></div><h3>${escapeHTML(p.product_name)}</h3><div class="product-price">${money(p.price)}</div><div class="product-meta"><span>In stock</span><strong style="${p.stock_quantity<=5?"color:#c15f5f":""}">${p.stock_quantity} units${p.stock_quantity<=5?" · Low":""}</strong></div><div class="product-actions"><button class="button button-secondary button-small" data-action="edit-product" data-id="${p.id}"><i data-lucide="pencil"></i>Edit</button><button class="button button-secondary button-small" data-action="adjust-stock" data-id="${p.id}"><i data-lucide="boxes"></i>Stock</button><button class="row-action" style="margin-left:auto" title="Delete product" data-action="delete-product" data-id="${p.id}"><i data-lucide="trash-2"></i></button></div></article>`).join("")||`<div class="panel empty-state">No products match your search.</div>`}</div>`;
}
function reportsPage() {
  const transactions=db.transactions.filter(t=>t.transaction_date>=reportStart&&t.transaction_date<=reportEnd);
  const payments=db.payments.filter(p=>p.payment_date>=reportStart&&p.payment_date<=reportEnd);
  const credit=sumMoney(transactions,t=>t.total_amount), collected=sumMoney(payments,p=>p.amount);
  return `${heading("THE BIG PICTURE","Reports & analytics","Understand credit issued, payments collected, and what’s outstanding.",`<button class="button button-secondary" data-action="export-csv"><i data-lucide="download"></i>Export CSV</button>`)}
    <div class="report-filters"><label class="filter-select">From <input id="reportStart" type="date" value="${reportStart}" style="border:0;background:transparent;font:inherit"></label><label class="filter-select">To <input id="reportEnd" type="date" value="${reportEnd}" style="border:0;background:transparent;font:inherit"></label><button class="button button-secondary button-small" data-action="apply-report"><i data-lucide="filter"></i>Apply</button><button class="button button-secondary button-small" data-action="print"><i data-lucide="printer"></i>Print</button></div>
    <div class="report-summary"><div class="report-box"><small>Credit issued in period</small><b>${money(credit)}</b></div><div class="report-box"><small>Payments collected in period</small><b>${money(collected)}</b></div><div class="report-box"><small>Current outstanding balance</small><b>${money(fromCents(db.customers.reduce((s,c)=>s+toCents(customerBalance(c.id)),0)))}</b></div></div>
    <div class="lower-grid"><section class="panel table-panel"><div class="panel-header"><div><div class="panel-title">Credit transactions</div><div class="panel-subtitle">${shortDate(reportStart)} — ${shortDate(reportEnd)}</div></div></div><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Purchase</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${transactions.map(t=>`<tr><td>${escapeHTML(customer(t.customer_id)?.full_name||"Deleted customer")}</td><td>${escapeHTML(t.description)}</td><td>${shortDate(t.transaction_date)}</td><td>${money(t.total_amount)}</td><td>${statusBadge(getStatus(t))}</td></tr>`).join("")||`<tr><td colspan="5" class="table-empty">No credit in this date range.</td></tr>`}</tbody></table></div></section><section class="panel table-panel"><div class="panel-header"><div><div class="panel-title">Payment collections</div><div class="panel-subtitle">Real cash received in this period</div></div></div><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Date</th><th>Amount</th></tr></thead><tbody>${payments.map(p=>`<tr><td>${escapeHTML(customer(p.customer_id)?.full_name||"Deleted customer")}</td><td>${shortDate(p.payment_date)}</td><td class="amount">${money(p.amount)}</td></tr>`).join("")||`<tr><td colspan="3" class="table-empty">No payments in this date range.</td></tr>`}</tbody></table></div></section></div>
    <div class="panel table-panel" style="margin-top:16px"><div class="panel-header"><div><div class="panel-title">Outstanding balances</div><div class="panel-subtitle">Customers with remaining balances</div></div></div><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Contact</th><th>Credit</th><th>Paid</th><th>Balance</th></tr></thead><tbody>${db.customers.filter(c=>customerBalance(c.id)>0).sort((a,b)=>customerBalance(b.id)-customerBalance(a.id)).map(c=>`<tr><td>${escapeHTML(c.full_name)}</td><td>${escapeHTML(c.contact_number||"—")}</td><td>${money(customerCredit(c.id))}</td><td>${money(customerPayments(c.id))}</td><td class="amount">${money(customerBalance(c.id))}</td></tr>`).join("")||`<tr><td colspan="5" class="table-empty">No outstanding balances.</td></tr>`}</tbody></table></div></div>`;
}
function settingsPage() {
  return `${heading("MAKE IT YOURS","Store settings","Your store details and personal preferences.",`<span class="status status-partial">Local demo mode</span>`)}
    <div class="settings-layout"><section class="settings-card"><h2>Store & owner details</h2><p>Displayed on your account and customer receipts.</p><form id="settingsForm"><div class="form-grid"><div class="field"><label for="storeName">Store name</label><input id="storeName" name="store_name" value="${escapeHTML(db.settings.store_name)}" required></div><div class="field"><label for="ownerName">Owner name</label><input id="ownerName" name="full_name" value="${escapeHTML(db.settings.full_name)}" required></div><div class="field"><label for="storeEmail">Email address</label><input id="storeEmail" type="email" name="email" value="${escapeHTML(db.settings.email)}"></div><div class="field"><label for="storeContact">Contact number</label><input id="storeContact" name="contact" value="${escapeHTML(db.settings.contact)}"></div><div class="field full"><label for="storeAddress">Store address</label><textarea id="storeAddress" name="address">${escapeHTML(db.settings.address)}</textarea></div></div><button class="button button-primary settings-save"><i data-lucide="save"></i>Save changes</button></form></section>
    <section class="settings-card"><h2>Preferences</h2><p>Choose how you like to manage your store.</p><div class="pref-row"><span><b>Low-stock reminders</b><small>Highlight products with five or fewer items.</small></span><input class="switch" type="checkbox" checked></div><div class="pref-row"><span><b>Overdue account alerts</b><small>Highlight credit past its due date.</small></span><input class="switch" type="checkbox" checked></div><div class="pref-row"><span><b>PHP currency formatting</b><small>Use Philippine Peso throughout the app.</small></span><input class="switch" type="checkbox" checked disabled></div><div style="background:#f8f8f2;padding:13px;border-radius:9px;margin-top:17px;color:#7e897f;font-size:10px;line-height:1.6"><b style="color:#536257">About this demo</b><br>Records are saved in this browser only. Supabase sign-in, secure multi-user access, and cloud backups require a configured Supabase project.</div></section></div>`;
}
function render() {
  const pages={dashboard,customers:customersPage,utang:utangPage,payments:paymentsPage,ledger:ledgerPage,products:productsPage,reports:reportsPage,settings:settingsPage};
  document.getElementById("content").innerHTML=pages[currentPage]();
  document.getElementById("pageCrumb").textContent={dashboard:"Dashboard",customers:"Customers",utang:"Utang management",payments:"Payments",ledger:"Customer ledger",products:"Products",reports:"Reports",settings:"Settings"}[currentPage];
  document.getElementById("sidebarStore").textContent=db.settings.store_name;
  document.getElementById("ownerLabel").textContent=db.settings.full_name;
  document.getElementById("customerCount").textContent=db.customers.length;
  document.querySelectorAll(".nav-link").forEach(link=>link.classList.toggle("active",link.dataset.page===currentPage));
  if(window.lucide) lucide.createIcons();
}
function go(page) {
  currentPage=page; activeQuery=""; activeFilter="all";
  document.getElementById("sidebar").classList.remove("open");
  render(); window.scrollTo({top:0,behavior:"smooth"});
}
function toast(message,error=false) {
  const el=document.createElement("div");el.className=`toast${error?" error":""}`;el.textContent=message;
  document.getElementById("toastRegion").appendChild(el);setTimeout(()=>el.remove(),2900);
}
function showModal(title,subtitle,fields,values={},submitLabel="Save") {
  const formFields=fields.map(field=>{
    const value=values[field.name]??field.value??"";
    if(field.type==="select") return `<div class="field ${field.full?"full":""}"><label for="${field.name}">${field.label}</label><select id="${field.name}" name="${field.name}" ${field.required?"required":""}>${field.options.map(option=>`<option value="${escapeHTML(option.value)}" ${String(value)===String(option.value)?"selected":""}>${escapeHTML(option.label)}</option>`).join("")}</select></div>`;
    if(field.type==="textarea") return `<div class="field ${field.full?"full":""}"><label for="${field.name}">${field.label}</label><textarea id="${field.name}" name="${field.name}" placeholder="${escapeHTML(field.placeholder||"")}" ${field.required?"required":""}>${escapeHTML(value)}</textarea></div>`;
    return `<div class="field ${field.full?"full":""}"><label for="${field.name}">${field.label}</label><input id="${field.name}" name="${field.name}" type="${field.type||"text"}" value="${escapeHTML(value)}" placeholder="${escapeHTML(field.placeholder||"")}" ${field.required?"required":""} ${field.min!==undefined?`min="${field.min}"`:""} ${field.step?`step="${field.step}"`:""}></div>`;
  }).join("");
  const modal=document.getElementById("modal");
  modal.innerHTML=`<div class="modal-head"><div><h2 id="modalTitle">${title}</h2><p>${subtitle}</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close"><i data-lucide="x"></i></button></div><form id="modalForm"><div class="form-grid">${formFields}</div><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">${submitLabel}</button></div></form>`;
  document.getElementById("modalBackdrop").hidden=false;
  if(window.lucide)lucide.createIcons();
  modal.querySelector("input,select,textarea")?.focus();
  return modal.querySelector("#modalForm");
}
function closeModal(){document.getElementById("modalBackdrop").hidden=true;}
function handleSubmit(event) {
  event.preventDefault();
  const form=event.target;
  const data=Object.fromEntries(new FormData(form).entries());
  const editId=form.dataset.editId;
  if(form.dataset.kind==="customer"){
    const record={id:editId||uid(),full_name:data.full_name.trim(),contact_number:data.contact_number.trim(),address:data.address.trim(),created_at:editId?customer(editId).created_at:todayISO()};
    if(!record.full_name){toast("Please enter a customer name.",true);return;}
    editId?Object.assign(customer(editId),record):db.customers.push(record);
    if(!selectedLedgerId)selectedLedgerId=record.id;
    toast(editId?"Customer updated.":"Customer added.");
  } else if(form.dataset.kind==="product"){
    const priceCents=toCents(data.price), record={id:editId||uid(),product_name:data.product_name.trim(),category:data.category.trim(),price:fromCents(priceCents),stock_quantity:Number(data.stock_quantity),created_at:editId?db.products.find(p=>p.id===editId).created_at:todayISO()};
    if(!record.product_name||!Number.isFinite(priceCents)||!Number.isInteger(record.stock_quantity)||record.stock_quantity<0){toast("Enter a product name, a price with up to two decimals, and whole-number stock.",true);return;}
    editId?Object.assign(db.products.find(p=>p.id===editId),record):db.products.push(record);
    toast(editId?"Product updated.":"Product added.");
  } else if(form.dataset.kind==="transaction"){
    const quantity=Number(data.quantity),unitPriceCents=toCents(data.unit_price);
    if(!customer(data.customer_id)||!data.description.trim()||!Number.isInteger(quantity)||quantity<1||!Number.isFinite(unitPriceCents)){toast("Check the customer, description, quantity, and a unit price with up to two decimals.",true);return;}
    const existing=editId?db.transactions.find(t=>t.id===editId):null;
    if(existing&&transactionPaid(existing)>0){toast("A transaction with payments cannot be edited; keep its financial history intact.",true);return;}
    const record={id:editId||uid(),customer_id:data.customer_id,description:data.description.trim(),quantity,unit_price:fromCents(unitPriceCents),total_amount:fromCents(quantity*unitPriceCents),transaction_date:data.transaction_date,due_date:data.due_date,notes:data.notes.trim()};
    editId?Object.assign(existing,record):db.transactions.push(record);
    toast(editId?"Transaction updated.":"Credit transaction recorded.");
  } else if(form.dataset.kind==="payment"){
    const transaction=db.transactions.find(t=>t.id===data.transaction_id),amountCents=toCents(data.amount);
    if(!transaction||!Number.isFinite(amountCents)||amountCents<=0){toast("Choose a credit account and enter a payment with up to two decimals.",true);return;}
    if(amountCents>toCents(outstanding(transaction))){toast(`Payment is greater than the remaining balance of ${money(outstanding(transaction))}.`,true);return;}
    db.payments.push({id:uid(),customer_id:transaction.customer_id,transaction_id:transaction.id,amount:fromCents(amountCents),payment_date:data.payment_date,notes:data.notes.trim()});
    toast("Payment recorded.");
  }
  closeModal();save();
}
function openCustomer(id) {
  const item=id?customer(id):null;
  const form=showModal(item?"Edit customer":"Add a customer",item?"Update this suki's contact details.":"Add someone new to your suki community.",[
    {name:"full_name",label:"Full name",required:true,full:true,placeholder:"e.g. Juan Dela Cruz"},
    {name:"contact_number",label:"Contact number",placeholder:"09xx xxx xxxx"},
    {name:"address",label:"Address",placeholder:"Street or neighborhood"}
  ],item||{});
  form.dataset.kind="customer";form.dataset.editId=id||"";
}
function openProduct(id) {
  const item=id?db.products.find(p=>p.id===id):null;
  const form=showModal(item?"Edit product":"Add a product",item?"Update product details and stock.":"Add an item to your store inventory.",[
    {name:"product_name",label:"Product name",required:true,full:true,placeholder:"e.g. Rice (per kilo)"},
    {name:"category",label:"Category",placeholder:"Essentials"},
    {name:"price",label:"Selling price (PHP)",type:"number",required:true,min:"0",step:"0.01",placeholder:"0.00"},
    {name:"stock_quantity",label:"Stock quantity",type:"number",required:true,min:"0",step:"1"}
  ],item||{stock_quantity:0});
  form.dataset.kind="product";form.dataset.editId=id||"";
}
function openTransaction(id) {
  const item=id?db.transactions.find(t=>t.id===id):null;
  const form=showModal(item?"Edit credit transaction":"Record a credit purchase",item?"Update unpaid transaction details.":"Add a purchase to a customer's utang.",[
    {name:"customer_id",label:"Customer",type:"select",required:true,full:true,options:db.customers.map(c=>({value:c.id,label:c.full_name})),value:item?.customer_id},
    {name:"description",label:"What did they get?",required:true,full:true,placeholder:"e.g. Rice, cooking oil & noodles"},
    {name:"quantity",label:"Quantity",type:"number",required:true,min:"1",step:"1"},
    {name:"unit_price",label:"Price per item (PHP)",type:"number",required:true,min:"0",step:"0.01"},
    {name:"transaction_date",label:"Transaction date",type:"date",required:true},
    {name:"due_date",label:"Due date",type:"date"},
    {name:"notes",label:"Notes",type:"textarea",full:true,placeholder:"Optional details"}
  ],item||{quantity:1,unit_price:0,transaction_date:todayISO(),due_date:dayOffset(7)});
  form.dataset.kind="transaction";form.dataset.editId=id||"";
}
function openPayment() {
  const candidates=db.transactions.filter(t=>outstanding(t)>0);
  if(!candidates.length){toast("There are no outstanding accounts to pay.");return;}
  const form=showModal("Record a payment","Choose an open credit purchase to apply this payment.",[
    {name:"transaction_id",label:"Customer · purchase · balance",type:"select",required:true,full:true,options:candidates.map(t=>({value:t.id,label:`${customer(t.customer_id)?.full_name||"Customer"} · ${t.description} · ${money(outstanding(t))}`}))},
    {name:"amount",label:"Payment amount (PHP)",type:"number",required:true,min:"0.01",step:"0.01",placeholder:"0.00"},
    {name:"payment_date",label:"Payment date",type:"date",required:true},
    {name:"notes",label:"Notes",type:"textarea",full:true,placeholder:"Optional payment note"}
  ],{payment_date:todayISO()});
  form.dataset.kind="payment";
}
function printReceipt(id) {
  const payment=db.payments.find(p=>p.id===id);if(!payment)return;
  const c=customer(payment.customer_id),t=db.transactions.find(item=>item.id===payment.transaction_id);
  const win=window.open("","_blank","width=620,height=720");if(!win){toast("Allow pop-ups to print the receipt.",true);return;}
  win.document.write(`<!doctype html><html><head><title>Payment receipt</title><style>body{font:15px Arial,sans-serif;color:#26332d;padding:40px;max-width:520px;margin:auto}.brand{color:#245c45;font-size:24px;font-weight:bold}.muted{color:#78837a;font-size:13px}.line{border-top:1px dashed #bbb;margin:22px 0}.row{display:flex;justify-content:space-between;margin:13px 0}.total{font-size:22px;font-weight:bold;color:#245c45}.thanks{text-align:center;margin-top:35px;color:#78837a}</style></head><body><div class="brand">UtangTrack</div><p class="muted">${escapeHTML(db.settings.store_name)} · ${escapeHTML(db.settings.contact)}</p><div class="line"></div><h2>Payment receipt</h2><p class="muted">Receipt ${escapeHTML(payment.id.slice(0,8).toUpperCase())} · ${shortDate(payment.payment_date)}</p><div class="row"><span>Received from</span><b>${escapeHTML(c?.full_name||"Customer")}</b></div><div class="row"><span>For</span><span>${escapeHTML(t?.description||"Account payment")}</span></div><div class="row total"><span>Amount paid</span><span>${money(payment.amount)}</span></div><div class="row"><span>Remaining balance</span><b>${money(t?outstanding(t):0)}</b></div><div class="row"><span>Notes</span><span>${escapeHTML(payment.notes||"—")}</span></div><div class="line"></div><p class="thanks">Salamat po sa pagtangkilik!<br><br><span class="muted">This receipt confirms a payment received.</span></p><script>window.onload=()=>window.print();<\\/script></body></html>`);win.document.close();
}
function exportCSV() {
  const rows=[["Date","Customer","Description","Credit PHP","Paid PHP","Balance PHP","Status"],...db.transactions.filter(t=>t.transaction_date>=reportStart&&t.transaction_date<=reportEnd).map(t=>[t.transaction_date,customer(t.customer_id)?.full_name||"",t.description,Number(t.total_amount).toFixed(2),transactionPaid(t).toFixed(2),outstanding(t).toFixed(2),getStatus(t)])];
  const csv=rows.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));link.download="utangtrack-report.csv";link.click();URL.revokeObjectURL(link.href);toast("CSV report downloaded.");
}
document.addEventListener("click",event=>{
  const pageButton=event.target.closest("[data-page]");
  if(pageButton){go(pageButton.dataset.page);return;}
  const button=event.target.closest("[data-action]");if(!button)return;
  const {action,id}=button.dataset;
  if(action==="new-customer")openCustomer();
  else if(action==="edit-customer")openCustomer(id);
  else if(action==="new-product")openProduct();
  else if(action==="edit-product")openProduct(id);
  else if(action==="adjust-stock"){const product=db.products.find(p=>p.id===id);const next=prompt(`Stock quantity for ${product.product_name}:`,product.stock_quantity);if(next===null)return;const value=Number(next);if(!Number.isInteger(value)||value<0){toast("Stock must be a whole number, zero or higher.",true);return;}product.stock_quantity=value;save();toast("Stock updated.");}
  else if(action==="new-transaction"){if(!db.customers.length){toast("Add a customer before recording utang.",true);return;}openTransaction();}
  else if(action==="edit-transaction")openTransaction(id);
  else if(action==="new-payment")openPayment();
  else if(action==="delete-customer"){const c=customer(id);if(db.transactions.some(t=>t.customer_id===id)){toast("This customer has financial history. Keep the record to preserve the ledger.",true);return;}if(confirm(`Delete ${c.full_name}?`)){db.customers=db.customers.filter(item=>item.id!==id);if(selectedLedgerId===id)selectedLedgerId=db.customers[0]?.id||"";save();toast("Customer deleted.");}}
  else if(action==="delete-transaction"){const t=db.transactions.find(item=>item.id===id);if(db.payments.some(p=>p.transaction_id===id)){toast("This transaction has payment history and cannot be deleted.",true);return;}if(confirm("Delete this credit transaction?")){db.transactions=db.transactions.filter(item=>item.id!==id);save();toast("Transaction deleted.");}}
  else if(action==="delete-product"){const p=db.products.find(item=>item.id===id);if(confirm(`Delete ${p.product_name} from your product list?`)){db.products=db.products.filter(item=>item.id!==id);save();toast("Product deleted.");}}
  else if(action==="receipt")printReceipt(id);
  else if(action==="select-ledger"){selectedLedgerId=id;render();}
  else if(action==="open-ledger"){selectedLedgerId=id;go("ledger");}
  else if(action==="print-ledger"||action==="print")window.print();
  else if(action==="export-csv")exportCSV();
  else if(action==="apply-report"){const start=document.getElementById("reportStart").value,end=document.getElementById("reportEnd").value;if(start>end){toast("Start date must be before the end date.",true);return;}reportStart=start;reportEnd=end;render();}
  else if(action==="close-modal")closeModal();
});
document.addEventListener("submit",event=>{
  if(event.target.id==="modalForm"){handleSubmit(event);return;}
  if(event.target.id==="settingsForm"){event.preventDefault();const values=Object.fromEntries(new FormData(event.target).entries());db.settings={...db.settings,...values};save();toast("Store settings saved.");}
});
document.addEventListener("input",event=>{
  if(event.target.id==="searchInput"){const start=event.target.selectionStart;activeQuery=event.target.value;render();const input=document.getElementById("searchInput");input?.focus();input?.setSelectionRange(start,start);}
});
document.addEventListener("change",event=>{
  if(event.target.id==="customerFilter"||event.target.id==="statusFilter"){activeFilter=event.target.value;render();}
});
document.getElementById("menuToggle").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("todayText").textContent=new Date().toLocaleDateString("en-PH",{weekday:"short",month:"short",day:"numeric"});
document.querySelectorAll(".nav-link").forEach(link=>link.addEventListener("click",()=>go(link.dataset.page)));
render();
