const $=id=>document.getElementById(id);
const money=n=>"PKR "+Number(n||0).toLocaleString("en-PK",{maximumFractionDigits:2});
let transactions=[];

async function load(){
  const [t,s]=await Promise.all([fetch("/api/transactions"),fetch("/api/summary")]);
  transactions=await t.json(); const summary=await s.json();
  $("income").textContent=money(summary.income);
  $("expense").textContent=money(summary.expense);
  $("balance").textContent=money(summary.balance);
  $("count").textContent=summary.transactions;
  const total=summary.income+summary.expense;
  $("incomeShare").style.width=(total?Math.min(100,summary.income/total*100):0)+"%";
  renderTransactions(); renderBudgets(); renderSavings(summary.balance);
}
function renderTransactions(){
  const rows=$("transactionRows"); rows.innerHTML="";
  [...transactions].reverse().slice(0,10).forEach(t=>{
    const income=String(t.type||"Expense").toLowerCase()==="income";
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${t.date||"-"}</td><td><span class="pill ${income?"in":"out"}">${income?"Income":"Expense"}</span></td><td>${t.category||"-"}</td><td>${t.payment_type||"-"}</td><td class="right ${income?"amount-in":"amount-out"}">${income?"+":"−"} ${money(t.amount).replace("PKR ","PKR ")}</td>`;
    rows.appendChild(tr);
  });
  if(!transactions.length) rows.innerHTML='<tr><td colspan="5" style="text-align:center;color:#98a0af;padding:35px">No transactions yet. Add your first record.</td></tr>';
}
function renderBudgets(){
  // Limits used by the original FinTrack Budget setup.
  const limits={Food:5000,Transport:15000,Bills:15000,Shopping:10000,Entertainment:5000};
  const spent={};
  transactions.forEach(t=>{
    if(String(t.type||"").toLowerCase()==="expense")
      spent[t.category]=(spent[t.category]||0)+Number(t.amount||0);
  });

  $("budgetBars").innerHTML=Object.entries(limits).map(([c,l])=>{
    const v=spent[c]||0,p=Math.min(100,v/l*100);
    return `<div class="bar-row"><div class="bar-label"><span>${c}</span><b>${money(v)} / ${money(l)}</b></div><div class="bar"><i style="width:${p}%"></i></div></div>`;
  }).join("");

  const alerts=[];
  Object.entries(limits).forEach(([category,limit])=>{
    const value=spent[category]||0;
    if(value>=limit){
      alerts.push({category,value,limit,level:"danger",message:"Budget limit reached or exceeded."});
    }else if(value>=limit*0.8){
      alerts.push({category,value,limit,level:"warning",message:`${Math.round(value/limit*100)}% of your budget has been used.`});
    }
  });

  const panel=$("alerts"), list=$("alertList");
  if(!alerts.length){ panel.style.display="none"; return; }
  panel.style.display="block";
  $("alertCount").textContent=`${alerts.length} alert${alerts.length===1?"":"s"}`;
  list.innerHTML=alerts.map(a=>`
    <div class="alert-item">
      <div class="alert-symbol ${a.level==="danger"?"danger":""}">!</div>
      <div class="alert-text">
        <b>${a.category} — ${a.message}</b>
        <span>${money(a.value)} spent out of ${money(a.limit)}</span>
      </div>
    </div>`).join("");
}

function renderSavings(balance){
  const goal=20000,p=Math.max(0,Math.min(100,balance/goal*100));
  $("savingProgress").style.width=p+"%"; $("savingPercent").textContent=Math.round(p)+"%"; $("savedAmount").textContent=money(Math.max(0,balance))+" saved";
}
function openModal(){$("modal").classList.add("show");$("date").value=new Date().toISOString().slice(0,10)}
function closeModal(){$("modal").classList.remove("show")}
document.querySelectorAll(".toggle button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".toggle button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");$("type").value=b.dataset.type});
$("txForm").onsubmit=async e=>{
  e.preventDefault();
  const data={type:$("type").value,amount:$("amount").value,date:$("date").value,category:$("category").value,payment_type:$("payment").value};
  const r=await fetch("/api/transactions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  if(r.ok){e.target.reset();$("type").value="Expense";document.querySelectorAll(".toggle button").forEach((x,i)=>x.classList.toggle("selected",i===0));closeModal();load()}
};
function downloadCSV(){window.location.href="/download/csv"}
$("modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
load();
