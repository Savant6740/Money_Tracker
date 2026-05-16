import { useState, useMemo, useCallback } from "react";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Nunito:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap";

const PRAJAY_HASH   = process.env.REACT_APP_PRAJAY_HASH   || "__PRAJAY_PWD_HASH_PLACEHOLDER__";
const VAISHALI_HASH = process.env.REACT_APP_VAISHALI_HASH || "__VAISHALI_PWD_HASH_PLACEHOLDER__";

async function checkHash(input, expectedHash) {
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex === expectedHash;
}

const QUOTES = [
  "She who controls her money, controls her destiny. 💅",
  "A woman with savings needs no one's permission. 👑",
  "Invest in yourself — your returns are infinite. 💐",
  "Behind every independent woman is a well-planned budget. 👠",
  "Financial freedom is the most beautiful accessory. 👜",
  "She didn't wait for a knight — she built her own castle. 🏰",
  "Your portfolio is your power. Grow it fiercely. 🌹",
  "Smart women earn, save, invest — and live on their own terms. 💋",
  "Money in her account means choices in her life. 💎",
  "She is her own bank, her own boss, her own future. 🌸",
];

const fmt = (n) => {
  const abs = Math.abs(n);
  if (abs >= 10000000) return `₹${(n/10000000).toFixed(2)}Cr`;
  if (abs >= 100000)   return `₹${(n/100000).toFixed(2)}L`;
  if (abs >= 1000)     return `₹${(n/1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
};
const fmtFull = (n) => `₹${Math.abs(n).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
const randQuote = () => QUOTES[Math.floor(Math.random()*QUOTES.length)];

const SPEND_CATS = [
  {key:"rent",label:"Rent / Home",emoji:"🏠",col:"#db2777"},
  {key:"food",label:"Food & Dining",emoji:"🍽️",col:"#be185d"},
  {key:"cafe",label:"Cafés & Coffee",emoji:"☕",col:"#9d174d"},
  {key:"shopping",label:"Shopping",emoji:"🛍️",col:"#ec4899"},
  {key:"selfcare",label:"Self Care",emoji:"💅",col:"#f472b6"},
  {key:"trips",label:"Trips & Travel",emoji:"✈️",col:"#a21caf"},
  {key:"conveyance",label:"Conveyance",emoji:"🚗",col:"#7e22ce"},
  {key:"medical",label:"Medical & Health",emoji:"💊",col:"#dc2626"},
  {key:"gadgets",label:"Gadgets & Tech",emoji:"📱",col:"#2563eb"},
  {key:"subscriptions",label:"Subscriptions",emoji:"📺",col:"#0891b2"},
  {key:"home",label:"Home & Decor",emoji:"🕯️",col:"#d97706"},
  {key:"emisloan",label:"EMIs & Loans",emoji:"🏦",col:"#ef4444"},
  {key:"other",label:"Other",emoji:"✨",col:"#6b7280"},
];

const PRAJAY_CATS = [
  {key:"lunch",       label:"Lunch",             emoji:"🍱", col:"#f59e0b"},
  {key:"oneTime",     label:"One-Time Expenses",  emoji:"💡", col:"#8b5cf6"},
  {key:"rent",        label:"Rent",               emoji:"🏠", col:"#3b82f6"},
  {key:"bujjamma",    label:"Bujjamma",           emoji:"👵", col:"#ec4899"},
  {key:"fuel",        label:"Fuel Expenses",      emoji:"⛽", col:"#f97316"},
  {key:"dineout",     label:"Dineout & Order-in", emoji:"🍜", col:"#06b6d4"},
  {key:"shopping",    label:"Shopping",           emoji:"🛍️", col:"#10b981"},
  {key:"entertainment",label:"Entertainment",    emoji:"🎬", col:"#e11d48"},
];

const mkSpend   = () => { const o={}; SPEND_CATS.forEach(c=>o[c.key]=0); return o; };
const mkBudgets = () => { const o={}; PRAJAY_CATS.forEach(c=>o[c.key]=0); return o; };

const INIT = {
  cash:0, banks:[{id:1,bankName:"",accNumber:"",balance:0}],
  fds:[{id:1,bankName:"",principal:0,rate:0,maturityDate:""}],
  rds:[{id:1,bankName:"",monthly:0,totalDeposited:0,currentValue:0}],
  mfs:[{id:1,name:"",invested:0,growthRate:0}],
  stocks:[], gold:[{id:1,type:"Gold",grams:0,pricePerGram:0}],
  realestate:[{id:1,desc:"",currentValue:0}],
  pf:[{id:1,pfNumber:"",empContrib:0,emplrContrib:0,months:0,existingCorpus:0}],
  debtors:[{id:1,name:"",amount:0,dueDate:"",note:""}],
  loans:[{id:1,name:"",type:"",outstanding:0,rate:0,emi:0}],
  creditCards:[{id:1,bank:"",cardNumber:"",outstanding:0}],
  lazyPay:[{id:1,outstanding:0,dueDate:""}],
  creditors:[{id:1,name:"",amount:0,dueDate:"",note:""}],
  salary:0, spendHistory:[],
  expenses:[], budgets:mkBudgets(), monthlyIncomes:[],
};

function calcMFValue(mf){ return (+mf.invested||0)*(1+(+mf.growthRate||0)/100); }
function calcPFCorpus(pf,months){
  const monthly=(+pf.empContrib||0)+(+pf.emplrContrib||0);
  const rate=0.0815/12; const n=months||0; const existing=+pf.existingCorpus||0;
  if(n===0) return existing;
  return Math.round(existing*Math.pow(1+rate,n)+monthly*((Math.pow(1+rate,n)-1)/rate));
}

function useSummary(data){
  return useMemo(()=>{
    const bankTotal=data.banks.reduce((s,b)=>s+(+b.balance||0),0);
    const fdTotal=data.fds.reduce((s,f)=>s+(+f.principal||0),0);
    const rdTotal=data.rds.reduce((s,r)=>s+(+r.currentValue||0),0);
    const mfTotal=data.mfs.reduce((s,m)=>s+calcMFValue(m),0);
    const stockTotal=data.stocks.reduce((s,st)=>s+((+st.qty||0)*(+st.price||0)),0);
    const goldTotal=data.gold.reduce((s,g)=>s+((+g.grams||0)*(+g.pricePerGram||0)),0);
    const reTotal=data.realestate.reduce((s,r)=>s+(+r.currentValue||0),0);
    const pfTotal=data.pf.reduce((s,p)=>s+calcPFCorpus(p,+p.months||0),0);
    const cash=+data.cash||0;
    const advances=(data.expenses||[]).filter(e=>e.type==="advance");
    const advanceTotal=advances.reduce((s,a)=>s+(+a.amount||0),0);
    const debtorTotal=(data.debtors||[]).reduce((s,d)=>s+(+d.amount||0),0);
    const totalAssets=cash+bankTotal+fdTotal+rdTotal+mfTotal+stockTotal+goldTotal+reTotal+pfTotal+advanceTotal+debtorTotal;
    const loanTotal=data.loans.reduce((s,l)=>s+(+l.outstanding||0),0);
    const ccTotal=data.creditCards.reduce((s,c)=>s+(+c.outstanding||0),0);
    const lazyPayTotal=(data.lazyPay||[]).reduce((s,l)=>s+(+l.outstanding||0),0);
    const creditorTotal=(data.creditors||[]).reduce((s,c)=>s+(+c.amount||0),0);
    const totalLiabilities=loanTotal+ccTotal+lazyPayTotal+creditorTotal;
    const netWorth=totalAssets-totalLiabilities;
    const liquidCash=cash+bankTotal;
    const lockedInvestments=fdTotal+rdTotal+mfTotal+stockTotal+goldTotal+reTotal+pfTotal;
    const freeCash=liquidCash-ccTotal-lazyPayTotal;
    const monthlyEMI=data.loans.reduce((s,l)=>s+(+l.emi||0),0);
    return {bankTotal,fdTotal,rdTotal,mfTotal,stockTotal,goldTotal,reTotal,pfTotal,cash,
      totalAssets,loanTotal,ccTotal,lazyPayTotal,totalLiabilities,netWorth,liquidCash,
      lockedInvestments,freeCash,monthlyEMI,advanceTotal,debtorTotal,creditorTotal};
  },[data]);
}

// ── THEMES ────────────────────────────────────────────────────────────────────
const VAISHALI_LIGHT = {
  bg:"#fdf2f8", cardBg:"#ffffff", headerBg:"linear-gradient(135deg,#fce7f3,#fbcfe8,#f9a8d4)",
  border:"#f9a8d4", accent:"#9d174d", accentL:"#be185d", accentD:"#831843",
  text:"#4a044e", textMuted:"#be185d99", tabActive:"#9d174d", tabInactive:"#be185d66",
  tabBar:"#ffffff", input:"#fdf2f8", danger:"#dc2626", success:"#16a34a",
  secBg:"#ffffff", font:"'Nunito',sans-serif", serif:"'Playfair Display',serif", isDark:false, isVaishali:true
};
const VAISHALI_DARK = {
  bg:"#130010", cardBg:"#2a1020", headerBg:"linear-gradient(180deg,#2d0820 0%,#1a0510 60%,#130010 100%)",
  border:"#5a2040", accent:"#e91e8c", accentL:"#c490a8", accentD:"#be185d",
  text:"#f0c8d8", textMuted:"#7a5068", tabActive:"#e91e8c", tabInactive:"#7a5068",
  tabBar:"#100008", input:"#3d1530", danger:"#f87171", success:"#4ade80",
  secBg:"#2a1020", font:"'Nunito',sans-serif", serif:"'Playfair Display',serif", isDark:true, isVaishali:true
};
const PRAJAY_LIGHT = {
  bg:"#f0f0f0", cardBg:"#ffffff", headerBg:"#ffffff",
  border:"#e8e8e8", accent:"#0a0a0a", accentL:"#3a3a3a", accentD:"#000000",
  text:"#0a0a0a", textMuted:"#8a8a8a", tabActive:"#0a0a0a", tabInactive:"#c0c0c0",
  tabBar:"#ffffff", input:"#f5f5f5", danger:"#e53e3e", success:"#1a9640",
  secBg:"#ffffff", highlight:"#f7f7f7", card2:"#fafafa",
  font:"'DM Sans',system-ui,sans-serif", mono:"'DM Mono',monospace",
  serif:"'DM Sans',system-ui,sans-serif", isDark:false, isVaishali:false
};
const PRAJAY_DARK = {
  bg:"#0c0c0c", cardBg:"#181818", headerBg:"#111111",
  border:"#2c2c2c", accent:"#f5f5f5", accentL:"#b8b8b8", accentD:"#888888",
  text:"#f0f0f0", textMuted:"#606060", tabActive:"#f5f5f5", tabInactive:"#484848",
  tabBar:"#111111", input:"#222222", danger:"#ff6b6b", success:"#4ade80",
  secBg:"#181818", highlight:"#202020", card2:"#1c1c1c",
  font:"'DM Sans',system-ui,sans-serif", mono:"'DM Mono',monospace",
  serif:"'DM Sans',system-ui,sans-serif", isDark:true, isVaishali:false
};

// ── EXPORT HELPERS ────────────────────────────────────────────────────────────
function exportSnapshotExcel(summary, data) {
  const rows = [
    ["Category","Amount"],
    ["=== ASSETS ===",""],
    ["Cash", summary.cash],["Bank Accounts", summary.bankTotal],["Fixed Deposits", summary.fdTotal],
    ["Recurring Deposits", summary.rdTotal],["Mutual Funds", summary.mfTotal],["Stocks", summary.stockTotal],
    ["Gold & Silver", summary.goldTotal],["Real Estate", summary.reTotal],["Provident Fund", summary.pfTotal],
    ["TOTAL ASSETS", summary.totalAssets],["",""],
    ["=== LIABILITIES ===",""],["Loans", summary.loanTotal],["Credit Cards", summary.ccTotal],
    ["LazyPay", summary.lazyPayTotal],["TOTAL LIABILITIES", summary.totalLiabilities],["",""],
    ["NET WORTH", summary.netWorth],["Liquid Cash", summary.liquidCash],
    ["Free Cash", summary.freeCash],["Locked Investments", summary.lockedInvestments],["Monthly EMI", summary.monthlyEMI],
  ];
  let html = `<html><head><meta charset="utf-8"/></head><body><table border="1" style="border-collapse:collapse">${rows.map(([l,v])=>{
    const isBold=l.startsWith("===")||l==="NET WORTH"||l.startsWith("TOTAL");
    const bg=l.startsWith("===")?"#fce7f3":l==="NET WORTH"?"#f9a8d4":isBold?"#fff0f6":"#ffffff";
    return `<tr><td style="padding:6px;font-weight:${isBold?"bold":"normal"};background:${bg}">${l}</td><td style="padding:6px;font-weight:${isBold?"bold":"normal"};background:${bg};text-align:right">${typeof v==="number"?`₹${v.toLocaleString("en-IN")}`:v}</td></tr>`;
  }).join("")}</table></body></html>`;
  const blob=new Blob([html],{type:"application/vnd.ms-excel"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="wealth_snapshot.xls"; a.click();
  URL.revokeObjectURL(url);
}
function exportSpendingCSV(spendHistory) {
  if(!spendHistory.length) return alert("No spending history to export.");
  const headers=["Month","Income","Total Spent","Saved","Savings %",...SPEND_CATS.map(c=>c.label),"Notes"];
  const rows=spendHistory.map(h=>[h.month,h.salary,h.totalSpent,h.saved,h.savedPct.toFixed(1),...SPEND_CATS.map(c=>h.spend[c.key]||0),h.note||""]);
  const csv=[headers,...rows].map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="spending_report.csv"; a.click();
  URL.revokeObjectURL(url);
}
function exportSpendingExcel(spendHistory) {
  if(!spendHistory.length) return alert("No spending history to export.");
  const headers=["Month","Income","Total Spent","Saved","Savings %",...SPEND_CATS.map(c=>c.label),"Notes"];
  const rows=spendHistory.map(h=>[h.month,h.salary,h.totalSpent,h.saved,h.savedPct.toFixed(1),...SPEND_CATS.map(c=>h.spend[c.key]||0),h.note||""]);
  let html=`<html><head><meta charset="utf-8"/></head><body><table border="1">${[headers,...rows].map(r=>`<tr>${r.map(v=>`<td style="padding:4px">${v}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
  const blob=new Blob([html],{type:"application/vnd.ms-excel"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="spending_report.xls"; a.click();
  URL.revokeObjectURL(url);
}

// ── USER SELECT ───────────────────────────────────────────────────────────────
function UserSelect({onSelect}){
  return (
    <div style={{minHeight:"100vh",background:"#0a0a0a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui"}}>
      <div style={{textAlign:"center",padding:32}}>
        <div style={{fontSize:13,letterSpacing:4,color:"#666",marginBottom:32,textTransform:"uppercase"}}>Select Profile</div>
        <div style={{display:"flex",gap:20}}>
          <button onClick={()=>onSelect("vaishali")} style={{background:"linear-gradient(135deg,#9d174d,#db2777)",border:"none",borderRadius:20,padding:"32px 28px",cursor:"pointer",minWidth:140}}>
            <div style={{fontSize:32,marginBottom:8}}>🌸</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#fff"}}>Vaishali</div>
            <div style={{fontSize:11,color:"#fce7f3",marginTop:4,fontStyle:"italic"}}>Her Vault</div>
          </button>
          <button onClick={()=>onSelect("prajay")} style={{background:"#111",border:"1px solid #2a2a2a",borderRadius:20,padding:"32px 28px",cursor:"pointer",minWidth:140}}>
            <div style={{fontSize:32,marginBottom:8,color:"#fff",fontFamily:"'DM Mono',monospace",fontWeight:700}}>P</div>
            <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:18,fontWeight:600,color:"#fff",letterSpacing:-.3}}>Prajay</div>
            <div style={{fontSize:11,color:"#666",marginTop:4,fontFamily:"'DM Sans',sans-serif"}}>Finance OS</div>
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordScreen({user,onUnlock,th}){
  const [pwd,setPwd]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const expectedHash=user==="vaishali"?VAISHALI_HASH:PRAJAY_HASH;
  const handleUnlock=async()=>{
    if(!pwd) return;
    setLoading(true); setErr("");
    if(expectedHash.includes("PLACEHOLDER")){
      setErr("Password not configured. Set REACT_APP_"+(user==="vaishali"?"VAISHALI":"PRAJAY")+"_HASH in your .env file.");
      setLoading(false); return;
    }
    const valid=await checkHash(pwd,expectedHash);
    if(valid){onUnlock();}else{setErr("Wrong password");setPwd("");}
    setLoading(false);
  };
  const isP=!th.isVaishali;
  return (
    <div style={{minHeight:"100vh",background:th.isDark?(isP?"#0c0c0c":"#130010"):(isP?"#f0f0f0":"linear-gradient(135deg,#fce7f3,#fbcfe8)"),display:"flex",alignItems:"center",justifyContent:"center",fontFamily:th.font}}>
      <div style={{background:th.cardBg,borderRadius:24,padding:"44px 32px",width:340,textAlign:"center",border:`1.5px solid ${th.border}`}}>
        {isP?(
          <div style={{marginBottom:28}}>
            <div style={{width:64,height:64,borderRadius:16,background:th.isDark?"#222":"#0a0a0a",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:24,color:"#fff",fontFamily:"'DM Mono',monospace",fontWeight:700}}>P</div>
            <div style={{fontSize:22,fontWeight:700,color:th.text,letterSpacing:-.5,marginBottom:4}}>Prajay Finance</div>
            <div style={{fontSize:12,color:th.textMuted,letterSpacing:.2}}>Enter your PIN to access</div>
          </div>
        ):(
          <div style={{marginBottom:28}}>
            <div style={{fontSize:60,marginBottom:14}}>🌸</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:th.isDark?"#e8c0d0":"#9d174d",marginBottom:6}}>Vaishali Wealth</div>
          </div>
        )}
        <div style={{position:"relative",marginBottom:12}}>
          <input style={{width:"100%",border:`1.5px solid ${th.border}`,borderRadius:14,padding:"13px 16px",fontSize:14,color:th.text,background:th.input,outline:"none",boxSizing:"border-box",fontFamily:th.font,paddingRight:44}} type="password" placeholder="Password" value={pwd} autoFocus onChange={e=>{setPwd(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&handleUnlock()}/>
          <span style={{position:"absolute",right:14,top:13,fontSize:20,pointerEvents:"none"}}>{isP?"🔐":"🙈"}</span>
        </div>
        {err&&<div style={{color:"#f87171",fontSize:12,marginBottom:8}}>{err}</div>}
        <button style={{width:"100%",marginTop:4,padding:16,background:isP?(th.isDark?"#f5f5f5":"#0a0a0a"):"linear-gradient(90deg,#e91e8c,#c2185b)",color:isP?(th.isDark?"#000":"#fff"):"#fff",border:"none",borderRadius:14,fontSize:15,fontWeight:700,cursor:loading?"wait":"pointer",fontFamily:th.font,opacity:loading?0.7:1}} onClick={handleUnlock} disabled={loading}>
          {loading?"Checking...":isP?"Unlock":"Unlock 🌸"}
        </button>
      </div>
    </div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────────────────
const V_TABS=[{id:"home",label:"Overview"},{id:"assets",label:"Assets"},{id:"liab",label:"Loans"},{id:"spending",label:"Spending"},{id:"loanplan",label:"Pay Off"},{id:"project",label:"Grow"},{id:"snapshot",label:"Snapshot"}];
const P_TABS=[
  {id:"home",    label:"Home"},
  {id:"assets",  label:"Assets"},
  {id:"liab",    label:"Debts"},
  {id:"expenses",label:"Expenses"},
  {id:"payoff",  label:"Pay Off"},
  {id:"project", label:"Growth"},
  {id:"snapshot",label:"Snapshot"},
];

export default function App(){
  const [user,setUser]=useState(null);
  const [unlocked,setUnlocked]=useState(false);
  const [darkMode,setDarkMode]=useState(false);
  const [data,setData]=useState(INIT);
  const [tab,setTab]=useState("home");
  const [quote]=useState(randQuote);
  const [nwVisible,setNwVisible]=useState(false);
  const [spendDraft,setSpendDraft]=useState({
    salary:0,
    month:new Date().toLocaleString("default",{month:"long"})+" "+new Date().getFullYear(),
    target:50,spend:mkSpend(),note:"",
  });
  const summary=useSummary(data);
  const th=user==="vaishali"?(darkMode?VAISHALI_DARK:VAISHALI_LIGHT):(darkMode?PRAJAY_DARK:PRAJAY_LIGHT);
  const TABS=user==="vaishali"?V_TABS:P_TABS;
  const upd=useCallback((key,val)=>setData(p=>({...p,[key]:val})),[]);
  const updItem=useCallback((key,idx,field,val)=>setData(p=>{const a=[...p[key]];a[idx]={...a[idx],[field]:val};return{...p,[key]:a};}),[]);
  const addItem=useCallback((key,tmpl)=>setData(p=>({...p,[key]:[...p[key],{...tmpl,id:Date.now()}]})),[]);
  const delItem=useCallback((key,idx)=>setData(p=>{const a=[...p[key]];a.splice(idx,1);return{...p,[key]:a};}),[]);

  if(!user) return <UserSelect onSelect={u=>{setUser(u);}}/>;
  if(!unlocked) return <PasswordScreen user={user} onUnlock={()=>setUnlocked(true)} th={th}/>;

  const screenBg=th.isDark&&th.isVaishali?"#130010":th.bg;
  const isP=!th.isVaishali;
  const css=`
    @import url('${FONT_LINK}');
    *{box-sizing:border-box;transition:background-color .3s,border-color .3s,color .2s;}
    input:focus,select:focus{border-color:${isP?(th.isDark?"#f5f5f5":"#0a0a0a"):th.accent}!important;outline:none;}
    input[type=number]::-webkit-inner-spin-button{opacity:.3;}
    ::-webkit-scrollbar{width:2px;height:2px;}
    ::-webkit-scrollbar-thumb{background:${th.border};border-radius:2px;}
    .tab-bar::-webkit-scrollbar{display:none;}
    .pcard{box-shadow:${th.isDark?"none":"0 1px 3px rgba(0,0,0,0.06)"};transition:box-shadow .2s;}
    .pbtn{transition:all .15s ease;letter-spacing:.3px;}
    .pbtn:active{transform:scale(0.98);}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .fi{animation:fadeIn .25s ease both;}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  `;

  return (
    <div style={{background:screenBg,minHeight:"100vh",maxWidth:480,margin:"0 auto",fontFamily:th.font,paddingBottom:40}}>
      <style>{css}</style>
      {/* TOP BAR */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:isP?"12px 16px 10px":"10px 14px 0",background:th.tabBar,borderBottom:`1px solid ${th.isDark&&th.isVaishali?"#3a1530":th.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>{setUser(null);setUnlocked(false);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:th.textMuted,fontFamily:th.font,padding:"4px 8px"}}>← Switch</button>
          <span style={{fontSize:isP?14:13,fontWeight:700,color:isP?th.text:(th.isDark&&th.isVaishali?"#e91e8c":th.accent),fontFamily:isP?"'DM Sans',sans-serif":th.serif,letterSpacing:isP?-.3:0}}>{user==="vaishali"?"Vaishali 🌸":"Prajay"}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:th.textMuted,fontFamily:isP?"'DM Mono',monospace":th.font}}>{darkMode?"dark":"light"}</span>
          <div onClick={()=>setDarkMode(d=>!d)} style={{width:44,height:24,borderRadius:12,background:darkMode?(isP?"#333":th.accent):th.border,cursor:"pointer",position:"relative",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:darkMode?22:2,width:20,height:20,borderRadius:10,background:darkMode?(isP?"#f5f5f5":"#130010"):"#fff",transition:"left .25s",boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      {isP?(
        <div className="tab-bar" style={{display:"flex",overflowX:"auto",background:th.tabBar,borderBottom:`1px solid ${th.border}`,position:"sticky",top:0,zIndex:20,padding:"0 8px"}}>
          {P_TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:"0 0 auto",background:tab===t.id?(th.isDark?"#f5f5f5":"#0a0a0a"):"none",border:"none",borderRadius:tab===t.id?8:0,color:tab===t.id?(th.isDark?"#0a0a0a":"#ffffff"):th.tabInactive,padding:"8px 12px",margin:"6px 2px",fontSize:10,fontWeight:tab===t.id?700:500,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif",letterSpacing:.3}}>
              {t.label}
            </button>
          ))}
        </div>
      ):(
        <div className="tab-bar" style={{display:"flex",overflowX:"auto",background:th.tabBar,borderBottom:`1px solid ${th.isDark&&th.isVaishali?"#3a1530":th.border}`,position:"sticky",top:0,zIndex:20}}>
          {V_TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:"0 0 auto",background:"none",border:"none",borderBottom:`2.5px solid ${tab===t.id?th.tabActive:"transparent"}`,color:tab===t.id?th.tabActive:th.tabInactive,padding:"10px 12px",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:th.font}}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* PRAJAY HOME HEADER */}
      {tab==="home"&&isP&&(
        <div style={{background:th.headerBg,padding:"20px 16px 16px",borderBottom:`1px solid ${th.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{fontSize:11,letterSpacing:3,color:th.textMuted,textTransform:"uppercase",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>FINANCE OS</div>
              <div style={{fontSize:30,fontWeight:700,color:th.text,letterSpacing:-1,lineHeight:1.1}}>Prajay</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginBottom:4}}>{new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</div>
              <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace"}}>EMI/mo · {fmt(summary.monthlyEMI)}</div>
            </div>
          </div>
          <div onClick={()=>setNwVisible(v=>!v)} className="pcard" style={{background:th.isDark?"#1c1c1c":"#0a0a0a",borderRadius:18,padding:"18px 20px",cursor:"pointer",marginBottom:14,border:`1px solid ${th.border}`}}>
            <div style={{fontSize:10,letterSpacing:3,color:th.isDark?"#606060":"#666",textTransform:"uppercase",marginBottom:8,fontFamily:"'DM Mono',monospace"}}>NET WORTH</div>
            {nwVisible?(
              <div>
                <div style={{fontSize:38,fontWeight:700,color:"#fff",letterSpacing:-1.5,lineHeight:1,fontFamily:"'DM Sans',sans-serif"}}>{summary.netWorth<0?"−":""}{fmtFull(Math.abs(summary.netWorth))}</div>
                <div style={{display:"flex",gap:20,fontSize:11,marginTop:10}}>
                  <span style={{color:"#4ade80",fontFamily:"'DM Mono',monospace"}}>↑ {fmt(summary.totalAssets)}</span>
                  <span style={{color:"#ff6b6b",fontFamily:"'DM Mono',monospace"}}>↓ {fmt(summary.totalLiabilities)}</span>
                </div>
                <div style={{fontSize:9,color:"#555",marginTop:6,fontFamily:"'DM Mono',monospace"}}>tap to hide</div>
              </div>
            ):(
              <div style={{fontSize:13,color:"#888",fontFamily:"'DM Mono',monospace",letterSpacing:1}}>tap to reveal ···</div>
            )}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[
              {icon:"💧",l:"Liquid",s:`Cash (${fmt(summary.cash)}) + Bank (${fmt(summary.bankTotal)})`,v:summary.liquidCash,c:"#3b82f6"},
              {icon:"⚡",l:"Free Cash",s:`Liquid − CC (${fmt(summary.ccTotal)}) − LP (${fmt(summary.lazyPayTotal||0)})`,v:summary.freeCash,c:summary.freeCash>=0?"#4ade80":"#ff6b6b"},
              {icon:"📈",l:"Investments",s:`FD+RD+MF+Stocks+Gold+RE+PF`,v:summary.lockedInvestments,c:"#a78bfa"},
              {icon:"🏦",l:"Bank Balance",s:"Across accounts",v:summary.bankTotal,c:"#38bdf8"},
            ].map(({icon,l,s,v,c})=>(
              <div key={l} className="pcard" style={{background:th.cardBg,borderRadius:14,padding:"14px",border:`1px solid ${th.border}`}}>
                <div style={{fontSize:16,marginBottom:6}}>{icon}</div>
                <div style={{fontSize:20,fontWeight:700,color:th.text,letterSpacing:-.5,fontFamily:"'DM Sans',sans-serif"}}>{fmt(v)}</div>
                <div style={{fontSize:11,fontWeight:600,color:th.text,marginTop:2}}>{l}</div>
                <div style={{fontSize:8,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginTop:2,lineHeight:1.4}}>{s}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>exportSnapshotExcel(summary,data)} className="pbtn" style={{display:"block",width:"100%",padding:"12px 16px",background:th.isDark?"#f5f5f5":"#0a0a0a",color:th.isDark?"#0a0a0a":"#fff",border:"none",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",letterSpacing:.3}}>
            Export Snapshot →
          </button>
        </div>
      )}

      {/* VAISHALI HEADERS */}
      {tab==="home"&&th.isVaishali&&th.isDark&&(
        <div style={{background:"linear-gradient(180deg,#5a1040 0%,#3e0b2c 15%,#2a0820 32%,#1e0618 50%,#150412 68%,#130010 85%,#130010 100%)",padding:"20px 16px 18px",borderBottom:"1px solid #2a0e20"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:700,color:"#e91e8c",marginBottom:6}}>Vaishali 🌸</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:13,color:"#c490a8",marginBottom:10}}>{`"Women who understand money write their own stories."`}</div>
          <div onClick={()=>setNwVisible(v=>!v)} style={{background:"rgba(42,16,32,0.6)",borderRadius:14,padding:"11px 18px",border:"1px dashed #5a3048",cursor:"pointer",margin:"10px 0 14px",textAlign:"center"}}>
            {nwVisible?(
              <div>
                <div style={{fontSize:9,letterSpacing:2.5,color:"#9a6878",textTransform:"uppercase",marginBottom:6}}>YOUR NET WORTH</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:"#e91e8c"}}>{summary.netWorth<0?"−":""}{fmtFull(Math.abs(summary.netWorth))}</div>
                <div style={{display:"flex",justifyContent:"center",gap:14,fontSize:11,marginTop:5}}>
                  <span style={{color:"#4ade80"}}>▲ {fmt(summary.totalAssets)} Assets</span>
                  <span style={{color:"#f87171"}}>▼ {fmt(summary.totalLiabilities)} Debts</span>
                </div>
              </div>
            ):(
              <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:13,color:"#9a7080"}}>💎 Tap to reveal your net worth ✨</div>
            )}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["💧","Liquid",summary.liquidCash],["🌸","Free Cash",summary.freeCash],["🔒","Investments",summary.lockedInvestments],["📅","EMI/mo",summary.monthlyEMI]].map(([icon,l,v])=>(
              <div key={l} style={{background:"#2a1020",borderRadius:18,padding:"16px 14px",textAlign:"center",border:"1px solid #4a1a38"}}>
                <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
                <div style={{fontSize:18,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#f0c8d8",marginBottom:2}}>{fmt(v)}</div>
                <div style={{fontSize:11,color:"#f0c8d8",fontWeight:600}}>{l}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>exportSnapshotExcel(summary,data)} style={{display:"block",width:"100%",marginTop:14,padding:"12px 16px",background:"linear-gradient(90deg,#e91e8c,#c2185b)",color:"#fff",border:"none",borderRadius:14,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:th.font,letterSpacing:.5}}>📊 Export to Excel</button>
        </div>
      )}
      {tab==="home"&&th.isVaishali&&!th.isDark&&(
        <div style={{background:th.headerBg,padding:"20px 16px 16px",borderBottom:`1px solid ${th.border}`}}>
          <div style={{fontFamily:th.serif,fontSize:11,letterSpacing:4,color:th.accentL,marginBottom:10,opacity:.7,textAlign:"center"}}>💅 👠 👜 💐 👑</div>
          <div style={{fontFamily:th.serif,fontSize:21,fontWeight:700,color:th.accent,marginBottom:3}}>Vaishali 🌸</div>
          <div style={{fontSize:11,color:th.accent,fontStyle:"italic",background:"#fff0f6",borderRadius:8,padding:"8px 12px",borderLeft:`3px solid ${th.accentL}`,marginBottom:14}}>❝ {quote} ❞</div>
          <div onClick={()=>setNwVisible(v=>!v)} style={{padding:"14px 20px",cursor:"pointer",marginBottom:14,textAlign:"center"}}>
            <div style={{fontSize:10,letterSpacing:3,color:th.accentL,textTransform:"uppercase",marginBottom:6}}>YOUR NET WORTH</div>
            {nwVisible?(
              <div>
                <div style={{fontFamily:th.serif,fontSize:36,fontWeight:700,color:th.accent}}>{summary.netWorth<0?"−":""}{fmtFull(Math.abs(summary.netWorth))}</div>
                <div style={{display:"flex",justifyContent:"center",gap:14,fontSize:12,marginTop:6}}>
                  <span style={{color:th.success}}>▲ {fmt(summary.totalAssets)} Assets</span>
                  <span style={{color:th.danger}}>▼ {fmt(summary.totalLiabilities)} Debts</span>
                </div>
              </div>
            ):(
              <div style={{fontSize:22,letterSpacing:4}}>💎 Tap to reveal 💎</div>
            )}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{l:"Liquid",sub:"Cash + Bank",val:summary.liquidCash,icon:"💧"},{l:"Free Cash",sub:"Liquid minus dues",val:summary.freeCash,icon:"🌸"},{l:"Investments",sub:"FD, MF, Stocks...",val:summary.lockedInvestments,icon:"🔒"},{l:"EMI/mo",sub:"Total EMIs",val:summary.monthlyEMI,icon:"📅"}].map(({l,sub,val,icon})=>(
              <div key={l} style={{background:"rgba(255,255,255,0.85)",borderRadius:16,padding:"14px 12px",textAlign:"center",borderTop:"3px solid #c2185b"}}>
                <div style={{fontSize:18,marginBottom:2}}>{icon}</div>
                <div style={{fontSize:17,fontWeight:700,fontFamily:th.serif,color:th.accentL}}>{fmt(val)}</div>
                <div style={{fontSize:10,color:th.accent,marginTop:1,fontWeight:600}}>{l}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>exportSnapshotExcel(summary,data)} style={{display:"block",width:"100%",marginTop:12,padding:"11px 16px",background:`linear-gradient(90deg,${th.accentL},${th.accentD})`,color:"#fff",border:"none",borderRadius:14,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:th.font}}>📊 Export to Excel</button>
        </div>
      )}

      <main style={{padding:"14px"}}>
        {tab==="home"    &&!isP&&<HomeTabVaishali summary={summary} data={data} th={th}/>}
        {tab==="home"    &&isP &&<HomeTabPrajay summary={summary} data={data} setData={setData} th={th}/>}
        {tab==="assets"  &&!isP&&<AssetsTab data={data} upd={upd} updItem={updItem} addItem={addItem} delItem={delItem} summary={summary} th={th}/>}
        {tab==="assets"  &&isP &&<AssetsTabPrajay data={data} upd={upd} updItem={updItem} addItem={addItem} delItem={delItem} summary={summary} th={th}/>}
        {tab==="liab"    &&<LiabilitiesTab data={data} upd={upd} updItem={updItem} addItem={addItem} delItem={delItem} summary={summary} th={th}/>}
        {tab==="spending"&&!isP&&<SpendingTab data={data} upd={upd} setData={setData} th={th} spendDraft={spendDraft} setSpendDraft={setSpendDraft}/>}
        {tab==="expenses"&&isP &&<PrajayExpensesTab data={data} setData={setData} summary={summary} th={th}/>}
        {tab==="loanplan"&&!isP&&<LoanPlanTab data={data} th={th}/>}
        {tab==="payoff"  &&isP &&<PrajayPayOffTab data={data} th={th}/>}
        {tab==="project" &&<ProjectionTab data={data} summary={summary} th={th}/>}
        {tab==="snapshot"&&<SnapshotTab data={data} summary={summary} th={th}/>}
      </main>
    </div>
  );
}

// ── HOME TAB – VAISHALI ───────────────────────────────────────────────────────
function HomeTabVaishali({summary,data,th}){
  const [showCalc,setShowCalc]=useState(false);
  const assetRows=[
    {label:"Cash",val:summary.cash,col:"#22c55e"},
    {label:"Bank Accounts",val:summary.bankTotal,col:"#3b82f6"},
    {label:"Fixed Deposits",val:summary.fdTotal,col:"#06b6d4"},
    {label:"Rec. Deposits",val:summary.rdTotal,col:"#14b8a6"},
    {label:"Mutual Funds",val:summary.mfTotal,col:"#8b5cf6"},
    {label:"Stocks",val:summary.stockTotal,col:"#f59e0b"},
    {label:"Gold & Silver",val:summary.goldTotal,col:"#eab308"},
    {label:"Real Estate",val:summary.reTotal,col:"#f97316"},
    {label:"Provident Fund",val:summary.pfTotal,col:"#10b981"},
    ...(summary.debtorTotal>0?[{label:"Debtors (Receivable)",val:summary.debtorTotal,col:"#06b6d4"}]:[]),
  ].filter(r=>r.val>0);
  const ratio=summary.totalAssets>0?summary.totalLiabilities/summary.totalAssets:0;
  const score=Math.max(0,Math.min(100,Math.round((1-ratio)*100)));
  const sc=score>=70?th.success:score>=40?"#d97706":th.danger;
  const total=summary.totalAssets||1;
  const netDiff=summary.totalAssets-summary.totalLiabilities;
  const PieChart=()=>{
    if(assetRows.length===0) return null;
    let cum=0; const cx=70,cy=70,r=55;
    const slices=assetRows.map(row=>{const pct=row.val/total;const a=pct*360;const s=cum;cum+=a;return{...row,pct,angle:a,start:s};});
    const toXY=(cx,cy,r,deg)=>{const rad=(deg-90)*Math.PI/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};};
    return (
      <svg width="140" height="140" viewBox="0 0 140 140">
        {slices.map((s,i)=>{if(s.angle<0.5)return null;const p1=toXY(cx,cy,r,s.start),p2=toXY(cx,cy,r,s.start+s.angle);const lg=s.angle>180?1:0;return<path key={i} d={`M${cx},${cy} L${p1.x},${p1.y} A${r},${r},0,${lg},1,${p2.x},${p2.y} Z`} fill={s.col} stroke={th.cardBg} strokeWidth="1.5"/>;})}
        <circle cx={cx} cy={cy} r={28} fill={th.cardBg}/>
        <text x={cx} y={cy-4} textAnchor="middle" fill={th.isDark&&th.isVaishali?"#e91e8c":th.accent} fontSize="9" fontWeight="700">Assets</text>
        <text x={cx} y={cy+8} textAnchor="middle" fill={th.textMuted} fontSize="8">{fmt(total)}</text>
      </svg>
    );
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Sec title="💎 Wealth Overview" th={th}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          {[{l:"Total Assets",v:summary.totalAssets,c:th.success},{l:"Total Liabilities",v:summary.totalLiabilities,c:th.danger},{l:"Liquid Cash",v:summary.liquidCash,c:"#3b82f6"},{l:"Free Cash",v:summary.freeCash,c:netDiff>=0?th.success:th.danger}].map(({l,v,c})=>(
            <div key={l} style={{background:th.isDark?"rgba(255,255,255,0.04)":th.bg,borderRadius:10,padding:"10px 12px",border:`1px solid ${th.border}`}}>
              <div style={{fontSize:14,fontWeight:700,color:c,fontFamily:th.serif}}>{fmt(v)}</div>
              <div style={{fontSize:10,color:th.textMuted,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{background:th.isDark?"rgba(255,255,255,0.04)":th.bg,borderRadius:10,padding:"12px",border:`1px solid ${th.border}`,textAlign:"center"}}>
          <div style={{fontSize:10,color:th.textMuted,marginBottom:4,textTransform:"uppercase",letterSpacing:2}}>Net (Assets − Liabilities)</div>
          <div style={{fontSize:22,fontWeight:700,color:netDiff>=0?th.success:th.danger,fontFamily:th.serif}}>{netDiff<0?"−":""}{fmtFull(Math.abs(netDiff))}</div>
        </div>
        <button onClick={()=>setShowCalc(v=>!v)} style={{marginTop:10,width:"100%",padding:"8px",background:"transparent",border:`1.5px dashed ${th.isDark?"#6b3a52":th.accentL}`,borderRadius:10,cursor:"pointer",fontSize:11,fontWeight:700,color:th.isDark?"#c490a8":th.accentL,fontFamily:th.font}}>
          {showCalc?"▲ Hide Calculations":"▼ How are these calculated?"}
        </button>
        {showCalc&&(
          <div className="fi" style={{marginTop:8,background:th.isDark?"rgba(255,255,255,0.03)":th.bg,borderRadius:10,padding:12,border:`1px solid ${th.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:th.isDark?"#c490a8":th.accentL,marginBottom:8,fontFamily:th.serif}}>📐 How Your Numbers Are Calculated</div>
            {[
              {label:"💧 Liquid Cash",formula:`Cash in Hand (${fmtFull(summary.cash)}) + All Bank Balances (${fmtFull(summary.bankTotal)})`,result:fmtFull(summary.liquidCash)},
              {label:"🌸 Free Cash",formula:`Liquid Cash (${fmtFull(summary.liquidCash)}) − Credit Card Dues (${fmtFull(summary.ccTotal)}) − LazyPay (${fmtFull(summary.lazyPayTotal)})`,result:fmtFull(summary.freeCash)},
              {label:"🔒 Locked Investments",formula:`FDs (${fmtFull(summary.fdTotal)}) + RDs (${fmtFull(summary.rdTotal)}) + Mutual Funds (${fmtFull(summary.mfTotal)}) + Stocks (${fmtFull(summary.stockTotal)}) + Gold (${fmtFull(summary.goldTotal)}) + Real Estate (${fmtFull(summary.reTotal)}) + PF (${fmtFull(summary.pfTotal)})`,result:fmtFull(summary.lockedInvestments)},
              {label:"📊 Total Assets",formula:`Cash + Banks + FDs + RDs + MFs + Stocks + Gold + Real Estate + PF${summary.debtorTotal>0?` + Debtors (${fmtFull(summary.debtorTotal)})`:""} = ${fmtFull(summary.totalAssets)}`,result:fmtFull(summary.totalAssets)},
              {label:"💳 Total Liabilities",formula:`Loans (${fmtFull(summary.loanTotal)}) + Credit Cards (${fmtFull(summary.ccTotal)}) + LazyPay (${fmtFull(summary.lazyPayTotal)})${summary.creditorTotal>0?` + Creditors (${fmtFull(summary.creditorTotal)})":""}`,result:fmtFull(summary.totalLiabilities)},
            ].map(({label,formula,result})=>(
              <div key={label} style={{marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${th.border}`}}>
                <div style={{fontSize:11,fontWeight:700,color:th.text,marginBottom:3}}>{label}</div>
                <div style={{fontSize:10,color:th.textMuted,lineHeight:1.6,marginBottom:3}}>{formula}</div>
                <div style={{fontSize:12,fontWeight:700,color:th.success,fontFamily:th.serif}}>= {result}</div>
              </div>
            ))}
          </div>
        )}
      </Sec>
      <Sec title="💰 Asset Breakdown" th={th}>
        {assetRows.length===0?<Empty text="Add assets to see your breakdown 💐" th={th}/>:(
          <div style={{display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <PieChart/>
            <div style={{flex:1,minWidth:140}}>
              {assetRows.map(r=>(
                <div key={r.label} style={{marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}>
                    <span style={{color:th.text,fontWeight:600}}>{r.label}</span>
                    <span style={{color:r.col,fontWeight:700}}>{fmt(r.val)}</span>
                  </div>
                  <div style={{height:5,background:th.isDark?"rgba(255,255,255,0.1)":th.bg,borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${(r.val/total*100).toFixed(1)}%`,height:"100%",background:r.col,borderRadius:3}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Sec>
      <Sec title="🩺 Wealth Health" th={th}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <svg width="90" height="90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke={th.isDark?"rgba(255,255,255,0.1)":"#fce7f3"} strokeWidth="10"/>
            <circle cx="50" cy="50" r="42" fill="none" stroke={sc} strokeWidth="10" strokeDasharray={`${score*2.638} 263.8`} strokeLinecap="round" transform="rotate(-90 50 50)"/>
            <text x="50" y="46" textAnchor="middle" fill={sc} fontSize="20" fontWeight="bold">{score}</text>
            <text x="50" y="60" textAnchor="middle" fill={th.textMuted} fontSize="9">/100</text>
          </svg>
          <div>
            <div style={{color:sc,fontSize:16,fontWeight:700,fontFamily:th.serif,marginBottom:4}}>{score>=70?"Excellent 💅":score>=40?"Growing 🌺":"Needs Love 🌷"}</div>
            <div style={{color:th.text,fontSize:11}}>Debt-to-Asset: {(ratio*100).toFixed(1)}%</div>
          </div>
        </div>
      </Sec>
    </div>
  );
}

// ── HOME TAB – PRAJAY ─────────────────────────────────────────────────────────
function HomeTabPrajay({summary,data,setData,th}){
  const expenses=data.expenses||[];
  const monthlyIncomes=data.monthlyIncomes||[];
  const [showIncomeForm,setShowIncomeForm]=useState(false);
  const now=new Date();
  const curMonthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const [incomeMonth,setIncomeMonth]=useState(curMonthKey);
  const [incomeAmt,setIncomeAmt]=useState("");

  const monthlyData=useMemo(()=>{
    const months=[];
    for(let i=5;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label=d.toLocaleString("default",{month:"short"});
      const expTotal=expenses.filter(e=>e.date&&e.date.startsWith(key)&&e.type==="expense").reduce((s,e)=>s+(+e.amount||0),0);
      const incRec=monthlyIncomes.find(m=>m.month===key);
      const income=incRec?+incRec.income:0;
      months.push({key,label,income,expense:expTotal});
    }
    return months;
  },[expenses,monthlyIncomes]);

  const maxVal=Math.max(...monthlyData.map(m=>Math.max(m.income,m.expense)),1);
  const hasData=monthlyData.some(m=>m.income>0||m.expense>0);

  const advances=expenses.filter(e=>e.type==="advance");
  const advanceByPerson=advances.reduce((acc,a)=>{
    const p=a.person||"Unknown";
    acc[p]=(acc[p]||0)+(+a.amount||0);
    return acc;
  },{});

  const ratio=summary.totalAssets>0?summary.totalLiabilities/summary.totalAssets:0;
  const score=Math.max(0,Math.min(100,Math.round((1-ratio)*100)));
  const sc=score>=70?th.success:score>=40?"#d97706":th.danger;

  const saveIncome=()=>{
    if(!incomeAmt) return;
    setData(p=>{
      const inc=[...(p.monthlyIncomes||[]).filter(m=>m.month!==incomeMonth),{month:incomeMonth,income:+incomeAmt}];
      return {...p,monthlyIncomes:inc};
    });
    setIncomeAmt(""); setShowIncomeForm(false);
  };

  const INP={width:"100%",border:`1.5px solid ${th.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:th.text,background:th.input,outline:"none",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif",marginBottom:8};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Wealth Score */}
      <div className="pcard" style={{background:th.cardBg,borderRadius:18,padding:16,border:`1px solid ${th.border}`,display:"flex",alignItems:"center",gap:16}}>
        <svg width="80" height="80" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke={th.isDark?"#2a2a2a":"#f0f0f0"} strokeWidth="10"/>
          <circle cx="50" cy="50" r="42" fill="none" stroke={sc} strokeWidth="10" strokeDasharray={`${score*2.638} 263.8`} strokeLinecap="round" transform="rotate(-90 50 50)"/>
          <text x="50" y="46" textAnchor="middle" fill={sc} fontSize="20" fontWeight="bold" fontFamily="'DM Sans',sans-serif">{score}</text>
          <text x="50" y="60" textAnchor="middle" fill={th.textMuted} fontSize="9" fontFamily="'DM Mono',monospace">/100</text>
        </svg>
        <div>
          <div style={{fontSize:11,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginBottom:4}}>WEALTH SCORE</div>
          <div style={{fontSize:18,fontWeight:700,color:sc,marginBottom:2}}>{score>=70?"Excellent ◆":score>=40?"Growing 📈":"Needs Work 💪"}</div>
          <div style={{fontSize:11,color:th.textMuted}}>Debt/Asset: {(ratio*100).toFixed(1)}%</div>
          <div style={{fontSize:11,color:th.textMuted}}>Monthly EMI: {fmt(summary.monthlyEMI)}</div>
        </div>
      </div>

      {/* Income vs Expense Chart */}
      <div className="pcard" style={{background:th.cardBg,borderRadius:18,padding:16,border:`1px solid ${th.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:th.text}}>Income vs Expenses</div>
            <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace"}}>LAST 6 MONTHS</div>
          </div>
          <button onClick={()=>setShowIncomeForm(f=>!f)} style={{padding:"6px 12px",background:th.isDark?"#1c1c1c":"#f5f5f5",border:`1px solid ${th.border}`,borderRadius:8,fontSize:11,fontWeight:600,color:th.text,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
            + Income
          </button>
        </div>

        {showIncomeForm&&(
          <div className="fi" style={{background:th.isDark?"#1c1c1c":"#f8f8f8",borderRadius:12,padding:12,marginBottom:12,border:`1px solid ${th.border}`}}>
            <div style={{fontSize:11,fontWeight:600,color:th.text,marginBottom:8}}>Set Monthly Income</div>
            <input type="month" value={incomeMonth} onChange={e=>setIncomeMonth(e.target.value)} style={INP}/>
            <input type="number" value={incomeAmt} onChange={e=>setIncomeAmt(e.target.value)} placeholder="₹ Income amount" style={INP}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={saveIncome} style={{flex:1,padding:"8px",background:th.isDark?"#f5f5f5":"#0a0a0a",color:th.isDark?"#0a0a0a":"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
              <button onClick={()=>setShowIncomeForm(false)} style={{padding:"8px 12px",background:"transparent",border:`1px solid ${th.border}`,borderRadius:8,fontSize:12,color:th.textMuted,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>
        )}

        {!hasData?(
          <div style={{textAlign:"center",padding:"24px 0",color:th.textMuted,fontSize:12}}>
            <div style={{fontSize:24,marginBottom:8}}>📊</div>
            Add income & expenses to see chart
          </div>
        ):(
          <>
            <div style={{display:"flex",alignItems:"flex-end",gap:4,height:100,marginBottom:6,marginTop:14}}>
              {monthlyData.map((m,i)=>(
                <div key={i} style={{flex:1,display:"flex",gap:2,alignItems:"flex-end",height:"100%",justifyContent:"center"}}>
                  <div style={{flex:1,background:th.success,borderRadius:"3px 3px 0 0",height:`${(m.income/maxVal*100).toFixed(1)}%`,opacity:.85,minHeight:m.income>0?2:0,transition:"height .4s"}}/>
                  <div style={{flex:1,background:th.danger,borderRadius:"3px 3px 0 0",height:`${(m.expense/maxVal*100).toFixed(1)}%`,opacity:.85,minHeight:m.expense>0?2:0,transition:"height .4s"}}/>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:4,marginBottom:8}}>
              {monthlyData.map((m,i)=>(
                <div key={i} style={{flex:1,textAlign:"center",fontSize:9,color:th.textMuted,fontFamily:"'DM Mono',monospace"}}>{m.label}</div>
              ))}
            </div>
            <div style={{display:"flex",gap:16,justifyContent:"center",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:th.textMuted}}>
                <div style={{width:10,height:10,borderRadius:2,background:th.success}}/>Income
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:th.textMuted}}>
                <div style={{width:10,height:10,borderRadius:2,background:th.danger}}/>Expenses
              </div>
            </div>
            <div style={{borderTop:`1px solid ${th.border}`,paddingTop:10}}>
              {monthlyData.filter(m=>m.income>0||m.expense>0).slice(-3).map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",fontSize:11}}>
                  <span style={{color:th.textMuted,fontFamily:"'DM Mono',monospace",fontSize:10,minWidth:32}}>{m.label}</span>
                  <span style={{color:th.success,fontFamily:"'DM Mono',monospace"}}>{fmt(m.income)}</span>
                  <span style={{color:th.danger,fontFamily:"'DM Mono',monospace"}}>{fmt(m.expense)}</span>
                  <span style={{color:m.income-m.expense>=0?th.success:th.danger,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{m.income-m.expense>=0?"+":""}{fmt(m.income-m.expense)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Advances summary */}
      {Object.keys(advanceByPerson).length>0&&(
        <div className="pcard" style={{background:th.cardBg,borderRadius:18,padding:16,border:`1px solid ${th.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:th.text,marginBottom:12}}>Advances Outstanding</div>
          {Object.entries(advanceByPerson).map(([person,amt])=>(
            <div key={person} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${th.border}`}}>
              <div style={{fontSize:12,fontWeight:600,color:th.text}}>{person}</div>
              <div style={{fontSize:14,fontWeight:700,color:"#f59e0b",fontFamily:"'DM Mono',monospace"}}>{fmtFull(amt)}</div>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:8,paddingTop:6,borderTop:`1px solid ${th.border}`}}>
            <span style={{fontSize:11,color:th.textMuted}}>Total Outstanding</span>
            <span style={{fontSize:13,fontWeight:700,color:"#f59e0b",fontFamily:"'DM Mono',monospace"}}>{fmtFull(summary.advanceTotal||0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ASSETS TAB – VAISHALI ─────────────────────────────────────────────────────
function AssetsTab({data,upd,updItem,addItem,delItem,summary,th}){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Sec title="💵 Cash in Hand" th={th}>
        <F label="Cash Amount (₹)" type="number" value={data.cash} onChange={v=>upd("cash",+v)} placeholder="Enter cash amount" th={th}/>
        <Cv th={th}>{fmtFull(+data.cash||0)}</Cv>
      </Sec>
      <Sec title="🏦 Bank Accounts" th={th}>
        <QStrip q="A woman with her own savings account is unstoppable. 💅" th={th}/>
        {data.banks.map((b,i)=>(
          <Item key={b.id||i} title={`Bank Account ${i+1}`} onDel={data.banks.length>1?()=>delItem("banks",i):null} th={th}>
            <F label="Bank Name" value={b.bankName} onChange={v=>updItem("banks",i,"bankName",v)} placeholder="e.g. HDFC, SBI" th={th}/>
            <F label="Account Number (last 4)" value={b.accNumber} onChange={v=>updItem("banks",i,"accNumber",v)} placeholder="XXXX1234" th={th}/>
            <F label="Balance (₹)" type="number" value={b.balance} onChange={v=>updItem("banks",i,"balance",+v)} placeholder="Balance" th={th}/>
            <Cv th={th}>{fmtFull(+b.balance||0)}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("banks",{bankName:"",accNumber:"",balance:0})} th={th}/>
        <Total th={th}>{fmtFull(summary.bankTotal)}</Total>
      </Sec>
      <Sec title="🔒 Fixed Deposits" th={th}>
        {data.fds.map((f,i)=>(
          <Item key={f.id||i} title={`Fixed Deposit ${i+1}`} onDel={data.fds.length>1?()=>delItem("fds",i):null} th={th}>
            <F label="Bank" value={f.bankName} onChange={v=>updItem("fds",i,"bankName",v)} placeholder="Bank name" th={th}/>
            <F label="Principal (₹)" type="number" value={f.principal} onChange={v=>updItem("fds",i,"principal",+v)} placeholder="Principal amount" th={th}/>
            <F label="Interest Rate (% p.a.)" type="number" value={f.rate} onChange={v=>updItem("fds",i,"rate",+v)} placeholder="e.g. 7.5" th={th}/>
            <F label="Maturity Date" type="date" value={f.maturityDate} onChange={v=>updItem("fds",i,"maturityDate",v)} th={th}/>
            <Cv th={th}>{fmtFull(+f.principal||0)}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("fds",{bankName:"",principal:0,rate:0,maturityDate:""})} th={th}/>
        <Total th={th}>{fmtFull(summary.fdTotal)}</Total>
      </Sec>
      <Sec title="🔄 Recurring Deposits" th={th}>
        {data.rds.map((r,i)=>(
          <Item key={r.id||i} title={`RD ${i+1}`} onDel={data.rds.length>1?()=>delItem("rds",i):null} th={th}>
            <F label="Bank" value={r.bankName} onChange={v=>updItem("rds",i,"bankName",v)} placeholder="Bank name" th={th}/>
            <F label="Monthly Amount (₹)" type="number" value={r.monthly} onChange={v=>updItem("rds",i,"monthly",+v)} placeholder="Monthly deposit" th={th}/>
            <F label="Total Deposited (₹)" type="number" value={r.totalDeposited} onChange={v=>updItem("rds",i,"totalDeposited",+v)} placeholder="Amount deposited so far" th={th}/>
            <F label="Current Value (₹)" type="number" value={r.currentValue} onChange={v=>updItem("rds",i,"currentValue",+v)} placeholder="Current value with interest" th={th}/>
            <Cv th={th}>{fmtFull(+r.currentValue||0)}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("rds",{bankName:"",monthly:0,totalDeposited:0,currentValue:0})} th={th}/>
        <Total th={th}>{fmtFull(summary.rdTotal)}</Total>
      </Sec>
      <Sec title="📊 Mutual Funds" th={th}>
        <QStrip q="SIP by SIP, she builds an empire. 💐" th={th}/>
        {data.mfs.map((m,i)=>(
          <Item key={m.id||i} title={`MF ${i+1}`} onDel={data.mfs.length>1?()=>delItem("mfs",i):null} th={th}>
            <F label="Fund Name" value={m.name} onChange={v=>updItem("mfs",i,"name",v)} placeholder="e.g. Axis Bluechip Fund" th={th}/>
            <F label="Invested Amount (₹)" type="number" value={m.invested} onChange={v=>updItem("mfs",i,"invested",+v)} placeholder="Amount invested" th={th}/>
            <F label="Growth Rate (% returns)" type="number" value={m.growthRate} onChange={v=>updItem("mfs",i,"growthRate",+v)} placeholder="e.g. 12" th={th}/>
            <Cv th={th}>Current: {fmtFull(calcMFValue(m))}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("mfs",{name:"",invested:0,growthRate:0})} th={th}/>
        <Total th={th}>{fmtFull(summary.mfTotal)}</Total>
      </Sec>
      <Sec title="📈 Stocks & Equity" th={th}>
        {data.stocks.length===0&&<Empty text="No stocks added" th={th}/>}
        {data.stocks.map((s,i)=>(
          <Item key={s.id||i} title={s.name||`Stock ${i+1}`} onDel={()=>delItem("stocks",i)} th={th}>
            <F label="Company / Ticker" value={s.name} onChange={v=>updItem("stocks",i,"name",v)} placeholder="e.g. RELIANCE, TCS" th={th}/>
            <F label="Quantity (shares)" type="number" value={s.qty} onChange={v=>updItem("stocks",i,"qty",+v)} placeholder="No. of shares" th={th}/>
            <F label="Current Price (₹/share)" type="number" value={s.price} onChange={v=>updItem("stocks",i,"price",+v)} placeholder="Current market price" th={th}/>
            <Cv th={th}>{fmtFull((+s.qty||0)*(+s.price||0))}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("stocks",{name:"",qty:0,price:0})} th={th}/>
        <Total th={th}>{fmtFull(summary.stockTotal)}</Total>
      </Sec>
      <Sec title="🥇 Gold & Silver" th={th}>
        <QStrip q="Gold has always been a woman's wisest investment. 👑" th={th}/>
        {data.gold.map((g,i)=>(
          <Item key={g.id||i} title={`${g.type||"Gold/Silver"} ${i+1}`} onDel={data.gold.length>1?()=>delItem("gold",i):null} th={th}>
            <F label="Type" value={g.type} onChange={v=>updItem("gold",i,"type",v)} placeholder="Gold or Silver" th={th}/>
            <F label="Weight (grams)" type="number" value={g.grams} onChange={v=>updItem("gold",i,"grams",+v)} placeholder="Weight in grams" th={th}/>
            <F label="Price per gram (₹)" type="number" value={g.pricePerGram} onChange={v=>updItem("gold",i,"pricePerGram",+v)} placeholder="Current rate/gram" th={th}/>
            <Cv th={th}>{fmtFull((+g.grams||0)*(+g.pricePerGram||0))}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("gold",{type:"Gold",grams:0,pricePerGram:0})} th={th}/>
        <Total th={th}>{fmtFull(summary.goldTotal)}</Total>
      </Sec>
      <Sec title="🏠 Real Estate" th={th}>
        {data.realestate.map((r,i)=>(
          <Item key={r.id||i} title={`Property ${i+1}`} onDel={data.realestate.length>1?()=>delItem("realestate",i):null} th={th}>
            <F label="Description / Location" value={r.desc} onChange={v=>updItem("realestate",i,"desc",v)} placeholder="e.g. Flat in Pune" th={th}/>
            <F label="Current Market Value (₹)" type="number" value={r.currentValue} onChange={v=>updItem("realestate",i,"currentValue",+v)} placeholder="Current value" th={th}/>
            <Cv th={th}>{fmtFull(+r.currentValue||0)}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("realestate",{desc:"",currentValue:0})} th={th}/>
        <Total th={th}>{fmtFull(summary.reTotal)}</Total>
      </Sec>
      <Sec title="🏛️ Provident Fund" th={th}>
        <QStrip q="Your PF is silent wealth — growing while you sleep. 🌙" th={th}/>
        {data.pf.map((p,i)=>{
          const c6=calcPFCorpus(p,6),c12=calcPFCorpus(p,12),c36=calcPFCorpus(p,36),c60=calcPFCorpus(p,60);
          return (
            <Item key={p.id||i} title={`PF Account ${i+1}`} onDel={data.pf.length>1?()=>delItem("pf",i):null} th={th}>
              <F label="PF / UAN Number" value={p.pfNumber} onChange={v=>updItem("pf",i,"pfNumber",v)} placeholder="UAN Number" th={th}/>
              <F label="Existing Corpus (₹)" type="number" value={p.existingCorpus} onChange={v=>updItem("pf",i,"existingCorpus",+v)} placeholder="Current PF balance" th={th}/>
              <F label="Employee Contribution / Month (₹)" type="number" value={p.empContrib} onChange={v=>updItem("pf",i,"empContrib",+v)} placeholder="Your monthly contribution" th={th}/>
              <F label="Employer Contribution / Month (₹)" type="number" value={p.emplrContrib} onChange={v=>updItem("pf",i,"emplrContrib",+v)} placeholder="Company's monthly contribution" th={th}/>
              <F label="Projection Period (months)" type="number" value={p.months} onChange={v=>updItem("pf",i,"months",+v)} placeholder="e.g. 12, 24, 60" th={th}/>
              {(+p.empContrib>0||+p.emplrContrib>0)&&(
                <div style={{background:th.isDark?"rgba(16,185,129,0.1)":"#f0fdf4",borderRadius:10,padding:10,marginTop:6,border:`1px solid ${th.isDark?"#064e3b":"#bbf7d0"}`}}>
                  <div style={{fontSize:11,fontWeight:700,color:th.success,marginBottom:6}}>📈 Wealth Buildup (@ 8.15% p.a.)</div>
                  {[["6 months",c6],["1 year",c12],["3 years",c36],["5 years",c60]].map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0",borderBottom:`1px solid ${th.isDark?"rgba(16,185,129,0.15)":"#dcfce7"}`}}>
                      <span style={{color:th.isDark?"#6ee7b7":"#166534"}}>{l}</span>
                      <span style={{fontWeight:700,color:th.success}}>{fmtFull(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Item>
          );
        })}
        <Add onClick={()=>addItem("pf",{pfNumber:"",empContrib:0,emplrContrib:0,months:0,existingCorpus:0})} th={th}/>
        <Total th={th}>{fmtFull(summary.pfTotal)}</Total>
      </Sec>
      <Sec title="🤝 Debtors (Money Owed to You)" th={th}>
        <QStrip q="Track what others owe you — every rupee counts. 💐" th={th}/>
        {(data.debtors||[]).map((d,i)=>(
          <Item key={d.id||i} title={d.name?`Debtor — ${d.name}`:`Debtor ${i+1}`} onDel={(data.debtors||[]).length>1?()=>delItem("debtors",i):null} th={th}>
            <F label="Name / Description" value={d.name} onChange={v=>updItem("debtors",i,"name",v)} placeholder="Who owes you?" th={th}/>
            <F label="Amount (₹)" type="number" value={d.amount} onChange={v=>updItem("debtors",i,"amount",+v)} placeholder="Amount receivable" th={th}/>
            <F label="Expected Date" type="date" value={d.dueDate} onChange={v=>updItem("debtors",i,"dueDate",v)} th={th}/>
            <F label="Note" value={d.note} onChange={v=>updItem("debtors",i,"note",v)} placeholder="Reason / details" th={th}/>
            {d.dueDate&&(()=>{const due=new Date(d.dueDate);const today=new Date();today.setHours(0,0,0,0);const overdue=due<today;return <div style={{fontSize:11,color:overdue?th.danger:"#d97706",marginTop:2,fontWeight:600}}>{overdue?"⚠️ Overdue!":"📅 Due: "+due.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>;})()}
            <Cv th={th}>{fmtFull(+d.amount||0)}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("debtors",{name:"",amount:0,dueDate:"",note:""})} th={th}/>
        <Total th={th}>{fmtFull(summary.debtorTotal)}</Total>
      </Sec>

      {/* ── ASSET CALCULATION BREAKDOWN ── */}
      <Sec title="📐 Asset Category Breakdown & Calculations" th={th}>
        <QStrip q="Know exactly where your wealth stands — every category counts. 👑" th={th}/>
        {[
          {
            cat:"💵 Cash in Hand",
            total:summary.cash,
            col:"#22c55e",
            lines:[`Cash Amount entered: ${fmtFull(summary.cash)}`],
            formula:`Total = ${fmtFull(summary.cash)}`
          },
          {
            cat:"🏦 Bank Accounts",
            total:summary.bankTotal,
            col:"#3b82f6",
            lines:data.banks.filter(b=>+b.balance>0).map((b,i)=>`${b.bankName||`Bank ${i+1}`}${b.accNumber?` (****${b.accNumber})`:""}  →  ${fmtFull(+b.balance)}`),
            formula:`Total = ${data.banks.filter(b=>+b.balance>0).map(b=>fmtFull(+b.balance)).join(" + ") || "₹0"} = ${fmtFull(summary.bankTotal)}`
          },
          {
            cat:"🔒 Fixed Deposits",
            total:summary.fdTotal,
            col:"#06b6d4",
            lines:data.fds.filter(f=>+f.principal>0).map((f,i)=>`${f.bankName||`FD ${i+1}`}  →  Principal: ${fmtFull(+f.principal)}${+f.rate>0?`  @${f.rate}%`:""}${f.maturityDate?`  (Matures: ${new Date(f.maturityDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})})`:""}`) ,
            formula:`Total Principal = ${data.fds.filter(f=>+f.principal>0).map(f=>fmtFull(+f.principal)).join(" + ") || "₹0"} = ${fmtFull(summary.fdTotal)}`
          },
          {
            cat:"🔄 Recurring Deposits",
            total:summary.rdTotal,
            col:"#14b8a6",
            lines:data.rds.filter(r=>+r.currentValue>0).map((r,i)=>`${r.bankName||`RD ${i+1}`}  →  Deposited: ${fmtFull(+r.totalDeposited||0)}  |  Current Value: ${fmtFull(+r.currentValue)}`),
            formula:`Total Current Value = ${data.rds.filter(r=>+r.currentValue>0).map(r=>fmtFull(+r.currentValue)).join(" + ") || "₹0"} = ${fmtFull(summary.rdTotal)}`
          },
          {
            cat:"📊 Mutual Funds",
            total:summary.mfTotal,
            col:"#8b5cf6",
            lines:data.mfs.filter(m=>+m.invested>0).map((m,i)=>`${m.name||`MF ${i+1}`}  →  Invested: ${fmtFull(+m.invested)}${+m.growthRate>0?`  ×(1+${m.growthRate}%) = ${fmtFull(calcMFValue(m))}`:`  = ${fmtFull(calcMFValue(m))}`}`),
            formula:`Total Current Value = ${data.mfs.filter(m=>+m.invested>0).map(m=>fmtFull(calcMFValue(m))).join(" + ") || "₹0"} = ${fmtFull(summary.mfTotal)}`
          },
          {
            cat:"📈 Stocks & Equity",
            total:summary.stockTotal,
            col:"#f59e0b",
            lines:data.stocks.filter(s=>(+s.qty||0)*(+s.price||0)>0).map((s,i)=>`${s.name||`Stock ${i+1}`}  →  ${s.qty} shares × ₹${(+s.price||0).toLocaleString("en-IN")} = ${fmtFull((+s.qty||0)*(+s.price||0))}`),
            formula:`Total = ${data.stocks.filter(s=>(+s.qty||0)*(+s.price||0)>0).map(s=>fmtFull((+s.qty||0)*(+s.price||0))).join(" + ") || "₹0"} = ${fmtFull(summary.stockTotal)}`
          },
          {
            cat:"🥇 Gold & Silver",
            total:summary.goldTotal,
            col:"#eab308",
            lines:data.gold.filter(g=>(+g.grams||0)*(+g.pricePerGram||0)>0).map((g,i)=>`${g.type||"Gold"} ${i+1}  →  ${g.grams}g × ₹${(+g.pricePerGram||0).toLocaleString("en-IN")}/g = ${fmtFull((+g.grams||0)*(+g.pricePerGram||0))}`),
            formula:`Total = ${data.gold.filter(g=>(+g.grams||0)*(+g.pricePerGram||0)>0).map(g=>fmtFull((+g.grams||0)*(+g.pricePerGram||0))).join(" + ") || "₹0"} = ${fmtFull(summary.goldTotal)}`
          },
          {
            cat:"🏠 Real Estate",
            total:summary.reTotal,
            col:"#f97316",
            lines:data.realestate.filter(r=>+r.currentValue>0).map((r,i)=>`${r.desc||`Property ${i+1}`}  →  ${fmtFull(+r.currentValue)}`),
            formula:`Total = ${data.realestate.filter(r=>+r.currentValue>0).map(r=>fmtFull(+r.currentValue)).join(" + ") || "₹0"} = ${fmtFull(summary.reTotal)}`
          },
          ...data.pf.filter(p=>(+p.empContrib>0||+p.emplrContrib>0||+p.existingCorpus>0)).map((p,i)=>{
            const monthly=(+p.empContrib||0)+(+p.emplrContrib||0);
            const n=+p.months||0;
            const existing=+p.existingCorpus||0;
            const rate=0.0815/12;
            const corpus=calcPFCorpus(p,n);
            const growthFactor=n>0?Math.pow(1+rate,n):1;
            return {
              cat:`🏛️ Provident Fund${data.pf.length>1?` ${i+1}`:""}${p.pfNumber?` (${p.pfNumber})`:""}`,
              total:corpus,
              col:"#10b981",
              lines:[
                `Existing Corpus: ${fmtFull(existing)}`,
                `Employee Contribution/month: ${fmtFull(+p.empContrib||0)}`,
                `Employer Contribution/month: ${fmtFull(+p.emplrContrib||0)}`,
                `Total Monthly Addition: ${fmtFull(monthly)}`,
                `Projection Period: ${n} months`,
                `Interest Rate: 8.15% p.a. (0.6792% per month)`,
                n>0?`Formula: Existing (${fmtFull(existing)}) × (1+0.006792)^${n} + Monthly (${fmtFull(monthly)}) × [(1+0.006792)^${n} − 1] / 0.006792`:`Formula: Existing Corpus only (no projection months set)`,
                n>0?`= ${fmtFull(Math.round(existing*growthFactor))} + ${fmtFull(Math.round(monthly*((growthFactor-1)/rate)))}`:""
              ].filter(Boolean),
              formula:`PF Corpus = ${fmtFull(corpus)}`
            };
          }),
          ...(summary.debtorTotal>0?[{
            cat:"🤝 Debtors (Receivable)",
            total:summary.debtorTotal,
            col:"#06b6d4",
            lines:(data.debtors||[]).filter(d=>+d.amount>0).map((d,i)=>`${d.name||`Debtor ${i+1}`}  →  ${fmtFull(+d.amount)}`),
            formula:`Total Receivable = ${(data.debtors||[]).filter(d=>+d.amount>0).map(d=>fmtFull(+d.amount)).join(" + ") || "₹0"} = ${fmtFull(summary.debtorTotal)}`
          }]:[]),
        ].map(({cat,total,col,lines,formula})=>(
          <div key={cat} style={{background:th.isDark?"rgba(255,255,255,0.03)":th.bg,borderRadius:12,padding:12,marginBottom:10,border:`1.5px solid ${th.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontFamily:th.serif,fontSize:12,fontWeight:700,color:th.isDark?"#c490a8":th.accentL}}>{cat}</div>
              <div style={{fontSize:14,fontWeight:700,color:col,fontFamily:th.serif}}>{fmtFull(total)}</div>
            </div>
            {lines.map((l,i)=>(
              <div key={i} style={{fontSize:10,color:th.textMuted,padding:"2px 0",paddingLeft:8,borderLeft:`2px solid ${col}33`}}>{l}</div>
            ))}
            <div style={{marginTop:8,paddingTop:6,borderTop:`1px dashed ${th.border}`,fontSize:11,fontWeight:700,color:col}}>{formula}</div>
          </div>
        ))}
        <div style={{background:th.isDark?"rgba(16,185,129,0.08)":"#f0fdf4",borderRadius:12,padding:12,border:`1.5px solid ${th.isDark?"#064e3b":"#bbf7d0"}`,marginTop:6}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <div style={{fontSize:12,fontWeight:700,color:th.success,fontFamily:th.serif}}>💰 GRAND TOTAL ASSETS</div>
            <div style={{fontSize:16,fontWeight:700,color:th.success,fontFamily:th.serif}}>{fmtFull(summary.totalAssets)}</div>
          </div>
          <div style={{fontSize:10,color:th.textMuted,lineHeight:1.8}}>
            Cash ({fmtFull(summary.cash)}) + Banks ({fmtFull(summary.bankTotal)}) + FDs ({fmtFull(summary.fdTotal)}) + RDs ({fmtFull(summary.rdTotal)}) + MFs ({fmtFull(summary.mfTotal)}) + Stocks ({fmtFull(summary.stockTotal)}) + Gold ({fmtFull(summary.goldTotal)}) + Real Estate ({fmtFull(summary.reTotal)}) + PF ({fmtFull(summary.pfTotal)}){summary.debtorTotal>0?` + Debtors (${fmtFull(summary.debtorTotal)})`:""}
          </div>
          <div style={{marginTop:4,fontSize:12,fontWeight:700,color:th.success,fontFamily:th.serif}}>= {fmtFull(summary.totalAssets)}</div>
        </div>
      </Sec>
    </div>
  );
}

// ── ASSETS TAB – PRAJAY ───────────────────────────────────────────────────────
function AssetsTabPrajay({data,upd,updItem,addItem,delItem,summary,th}){
  const advances=(data.expenses||[]).filter(e=>e.type==="advance");
  const advanceByPerson=advances.reduce((acc,a)=>{
    const p=a.person||"Unknown";
    if(!acc[p]) acc[p]={total:0,items:[]};
    acc[p].total+=(+a.amount||0);
    acc[p].items.push(a);
    return acc;
  },{});
  const bankTotal=data.banks.reduce((s,b)=>s+(+b.balance||0),0)||1;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Cash */}
      <PCard title="Cash in Hand" th={th}>
        <PField label="CASH AMOUNT" type="number" value={data.cash} onChange={v=>upd("cash",+v)} placeholder="₹ 0" th={th}/>
        <PValRow label="Balance" value={fmtFull(+data.cash||0)} color={th.success} th={th}/>
      </PCard>

      {/* Bank Accounts with graph */}
      <div className="pcard" style={{background:th.cardBg,borderRadius:18,border:`1px solid ${th.border}`,overflow:"hidden"}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${th.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:th.text}}>Bank Accounts</div>
          <div style={{fontSize:11,color:th.textMuted,marginTop:2,fontFamily:"'DM Mono',monospace"}}>Total: {fmtFull(summary.bankTotal)}</div>
        </div>
        <BankBalanceGraph banks={data.banks} total={bankTotal} th={th}/>
        <div style={{padding:"0 16px 16px"}}>
          {data.banks.map((b,i)=>(
            <BankAccountCard key={b.id||i} bank={b} index={i} total={bankTotal} onDel={data.banks.length>1?()=>delItem("banks",i):null} onChange={(field,val)=>updItem("banks",i,field,val)} th={th}/>
          ))}
          <button onClick={()=>addItem("banks",{bankName:"",accNumber:"",balance:0})} style={{display:"block",width:"100%",marginTop:4,padding:"10px",background:"transparent",border:`1.5px dashed ${th.border}`,borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,color:th.textMuted,fontFamily:"'DM Sans',sans-serif"}}>+ Add Bank Account</button>
        </div>
      </div>

      {/* Fixed Deposits */}
      <PCard title="Fixed Deposits" subtitle={`Total: ${fmtFull(summary.fdTotal)}`} th={th}>
        {data.fds.map((f,i)=>(
          <PItem key={f.id||i} title={f.bankName||`FD ${i+1}`} onDel={data.fds.length>1?()=>delItem("fds",i):null} th={th}>
            <PField label="BANK" value={f.bankName} onChange={v=>updItem("fds",i,"bankName",v)} placeholder="Bank name" th={th}/>
            <PField label="PRINCIPAL (₹)" type="number" value={f.principal} onChange={v=>updItem("fds",i,"principal",+v)} placeholder="₹ 0" th={th}/>
            <PField label="RATE (% p.a.)" type="number" value={f.rate} onChange={v=>updItem("fds",i,"rate",+v)} placeholder="e.g. 7.5" th={th}/>
            <PField label="MATURITY DATE" type="date" value={f.maturityDate} onChange={v=>updItem("fds",i,"maturityDate",v)} th={th}/>
            <PValRow label="Principal" value={fmtFull(+f.principal||0)} color="#06b6d4" th={th}/>
          </PItem>
        ))}
        <PAddBtn onClick={()=>addItem("fds",{bankName:"",principal:0,rate:0,maturityDate:""})} th={th}/>
      </PCard>

      {/* Mutual Funds */}
      <PCard title="Mutual Funds" subtitle={`Total: ${fmtFull(summary.mfTotal)}`} th={th}>
        {data.mfs.map((m,i)=>(
          <PItem key={m.id||i} title={m.name||`MF ${i+1}`} onDel={data.mfs.length>1?()=>delItem("mfs",i):null} th={th}>
            <PField label="FUND NAME" value={m.name} onChange={v=>updItem("mfs",i,"name",v)} placeholder="Fund name" th={th}/>
            <PField label="INVESTED (₹)" type="number" value={m.invested} onChange={v=>updItem("mfs",i,"invested",+v)} placeholder="₹ 0" th={th}/>
            <PField label="GROWTH RATE (%)" type="number" value={m.growthRate} onChange={v=>updItem("mfs",i,"growthRate",+v)} placeholder="e.g. 12" th={th}/>
            <PValRow label="Current Value" value={fmtFull(calcMFValue(m))} color="#8b5cf6" th={th}/>
          </PItem>
        ))}
        <PAddBtn onClick={()=>addItem("mfs",{name:"",invested:0,growthRate:0})} th={th}/>
      </PCard>

      {/* Stocks */}
      <PCard title="Stocks & Equity" subtitle={`Total: ${fmtFull(summary.stockTotal)}`} th={th}>
        {data.stocks.length===0&&<div style={{color:th.textMuted,fontSize:12,padding:"8px 0",fontFamily:"'DM Mono',monospace"}}>No stocks added</div>}
        {data.stocks.map((s,i)=>(
          <PItem key={s.id||i} title={s.name||`Stock ${i+1}`} onDel={()=>delItem("stocks",i)} th={th}>
            <PField label="TICKER" value={s.name} onChange={v=>updItem("stocks",i,"name",v)} placeholder="e.g. RELIANCE" th={th}/>
            <PField label="QUANTITY" type="number" value={s.qty} onChange={v=>updItem("stocks",i,"qty",+v)} placeholder="Shares" th={th}/>
            <PField label="PRICE (₹)" type="number" value={s.price} onChange={v=>updItem("stocks",i,"price",+v)} placeholder="₹ per share" th={th}/>
            <PValRow label="Value" value={fmtFull((+s.qty||0)*(+s.price||0))} color="#f59e0b" th={th}/>
          </PItem>
        ))}
        <PAddBtn onClick={()=>addItem("stocks",{name:"",qty:0,price:0})} th={th}/>
      </PCard>

      {/* Gold */}
      <PCard title="Gold & Silver" subtitle={`Total: ${fmtFull(summary.goldTotal)}`} th={th}>
        {data.gold.map((g,i)=>(
          <PItem key={g.id||i} title={`${g.type||"Gold"} ${i+1}`} onDel={data.gold.length>1?()=>delItem("gold",i):null} th={th}>
            <PField label="TYPE" value={g.type} onChange={v=>updItem("gold",i,"type",v)} placeholder="Gold or Silver" th={th}/>
            <PField label="WEIGHT (grams)" type="number" value={g.grams} onChange={v=>updItem("gold",i,"grams",+v)} placeholder="grams" th={th}/>
            <PField label="PRICE / GRAM (₹)" type="number" value={g.pricePerGram} onChange={v=>updItem("gold",i,"pricePerGram",+v)} placeholder="₹ per gram" th={th}/>
            <PValRow label="Value" value={fmtFull((+g.grams||0)*(+g.pricePerGram||0))} color="#eab308" th={th}/>
          </PItem>
        ))}
        <PAddBtn onClick={()=>addItem("gold",{type:"Gold",grams:0,pricePerGram:0})} th={th}/>
      </PCard>

      {/* Real Estate */}
      <PCard title="Real Estate" subtitle={`Total: ${fmtFull(summary.reTotal)}`} th={th}>
        {data.realestate.map((r,i)=>(
          <PItem key={r.id||i} title={r.desc||`Property ${i+1}`} onDel={data.realestate.length>1?()=>delItem("realestate",i):null} th={th}>
            <PField label="DESCRIPTION" value={r.desc} onChange={v=>updItem("realestate",i,"desc",v)} placeholder="e.g. Flat in Pune" th={th}/>
            <PField label="CURRENT VALUE (₹)" type="number" value={r.currentValue} onChange={v=>updItem("realestate",i,"currentValue",+v)} placeholder="₹ 0" th={th}/>
            <PValRow label="Value" value={fmtFull(+r.currentValue||0)} color="#f97316" th={th}/>
          </PItem>
        ))}
        <PAddBtn onClick={()=>addItem("realestate",{desc:"",currentValue:0})} th={th}/>
      </PCard>

      {/* PF */}
      <PCard title="Provident Fund (EPF)" subtitle={`Total: ${fmtFull(summary.pfTotal)}`} th={th}>
        {data.pf.map((p,i)=>{
          const c12=calcPFCorpus(p,12),c60=calcPFCorpus(p,60);
          return (
            <PItem key={p.id||i} title={p.pfNumber||`PF Account ${i+1}`} onDel={data.pf.length>1?()=>delItem("pf",i):null} th={th}>
              <PField label="UAN NUMBER" value={p.pfNumber} onChange={v=>updItem("pf",i,"pfNumber",v)} placeholder="UAN" th={th}/>
              <PField label="EXISTING CORPUS (₹)" type="number" value={p.existingCorpus} onChange={v=>updItem("pf",i,"existingCorpus",+v)} placeholder="₹ 0" th={th}/>
              <PField label="EMPLOYEE CONTRIB/MONTH (₹)" type="number" value={p.empContrib} onChange={v=>updItem("pf",i,"empContrib",+v)} placeholder="₹ 0" th={th}/>
              <PField label="EMPLOYER CONTRIB/MONTH (₹)" type="number" value={p.emplrContrib} onChange={v=>updItem("pf",i,"emplrContrib",+v)} placeholder="₹ 0" th={th}/>
              <PField label="PROJECTION PERIOD (months)" type="number" value={p.months} onChange={v=>updItem("pf",i,"months",+v)} placeholder="e.g. 60" th={th}/>
              {(+p.empContrib>0||+p.emplrContrib>0)&&(
                <div style={{background:th.isDark?"rgba(16,185,129,0.08)":"#f0fdf4",borderRadius:10,padding:10,marginTop:6,border:`1px solid ${th.isDark?"#064e3b":"#bbf7d0"}`}}>
                  <div style={{fontSize:10,fontWeight:700,color:th.success,marginBottom:6,fontFamily:"'DM Mono',monospace"}}>PROJECTED @ 8.15% P.A.</div>
                  {[["1 year",c12],["5 years",c60]].map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0"}}>
                      <span style={{color:th.textMuted}}>{l}</span>
                      <span style={{fontWeight:700,color:th.success,fontFamily:"'DM Mono',monospace"}}>{fmtFull(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </PItem>
          );
        })}
        <PAddBtn onClick={()=>addItem("pf",{pfNumber:"",empContrib:0,emplrContrib:0,months:0,existingCorpus:0})} th={th}/>
      </PCard>

      {/* Advances — shown as assets */}
      {Object.keys(advanceByPerson).length>0&&(
        <div className="pcard" style={{background:th.cardBg,borderRadius:18,border:`1px solid ${th.border}`,overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${th.border}`}}>
            <div style={{fontSize:13,fontWeight:700,color:th.text}}>Advances Given (Recoverable)</div>
            <div style={{fontSize:11,color:th.textMuted,marginTop:2,fontFamily:"'DM Mono',monospace"}}>Total: {fmtFull(summary.advanceTotal||0)}</div>
          </div>
          <div style={{padding:"12px 16px"}}>
            {Object.entries(advanceByPerson).map(([person,pdata])=>(
              <div key={person} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:th.text}}>{person}</div>
                    <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace"}}>{pdata.items.length} advance{pdata.items.length!==1?"s":""}</div>
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:"#f59e0b",fontFamily:"'DM Mono',monospace"}}>{fmtFull(pdata.total)}</div>
                </div>
                {pdata.items.map((item,j)=>(
                  <div key={j} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 10px",background:th.isDark?"#222":"#f8f8f8",borderRadius:8,marginBottom:3}}>
                    <div>
                      <div style={{fontSize:11,color:th.text}}>{item.description||"Advance"}</div>
                      <div style={{fontSize:9,color:th.textMuted,fontFamily:"'DM Mono',monospace"}}>{item.date}</div>
                    </div>
                    <span style={{fontSize:12,fontWeight:600,color:"#f59e0b",fontFamily:"'DM Mono',monospace"}}>{fmtFull(+item.amount)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── BANK BALANCE GRAPH ────────────────────────────────────────────────────────
function BankBalanceGraph({banks,total,th}){
  const [open,setOpen]=useState(false);
  const activeBanks=banks.filter(b=>(+b.balance||0)>0);
  if(activeBanks.length===0) return null;
  const COLS=["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ec4899","#06b6d4"];
  const cx=70,cy=70,r=55,innerR=38;
  const toXY=(r2,deg)=>{const rad=(deg-90)*Math.PI/180;return{x:cx+r2*Math.cos(rad),y:cy+r2*Math.sin(rad)};};
  let cum=0;
  const slices=activeBanks.map((b,i)=>{
    const pct=(+b.balance||0)/total; const a=pct*360; const s=cum; cum+=a;
    return{...b,pct,angle:a,start:s,col:COLS[i%COLS.length]};
  });
  return (
    <div style={{borderBottom:`1px solid ${th.border}`}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",background:"none",border:"none",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:th.textMuted,fontSize:11}}>
        <span style={{fontFamily:"'DM Mono',monospace",letterSpacing:.5}}>VIEW BALANCE CHART</span>
        <span style={{fontSize:14}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{padding:"0 16px 16px"}} className="fi">
          {activeBanks.map((b,i)=>{
            const pct=(+b.balance||0)/total*100;
            return (
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                  <span style={{color:th.text,fontWeight:600}}>{b.bankName||`Account ${i+1}`}{b.accNumber?` ····${b.accNumber}`:""}</span>
                  <span style={{color:COLS[i%COLS.length],fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmtFull(+b.balance||0)}</span>
                </div>
                <div style={{height:10,background:th.isDark?"#2a2a2a":"#f0f0f0",borderRadius:5,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:COLS[i%COLS.length],borderRadius:5,transition:"width 0.5s ease"}}/>
                </div>
                <div style={{fontSize:9,color:th.textMuted,marginTop:2,textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{pct.toFixed(1)}% of total</div>
              </div>
            );
          })}
          {/* Donut */}
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:12}}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              {slices.map((s,i)=>{
                if(s.angle<0.5) return null;
                const p1=toXY(r,s.start),p2=toXY(r,s.start+s.angle);
                const lg=s.angle>180?1:0;
                return <path key={i} d={`M${cx},${cy} L${p1.x},${p1.y} A${r},${r},0,${lg},1,${p2.x},${p2.y} Z`} fill={s.col} stroke={th.cardBg} strokeWidth="2"/>;
              })}
              <circle cx={cx} cy={cy} r={innerR} fill={th.cardBg}/>
              <text x={cx} y={cy-5} textAnchor="middle" fill={th.text} fontSize="10" fontWeight="700">Banks</text>
              <text x={cx} y={cy+8} textAnchor="middle" fill={th.textMuted} fontSize="8">{fmt(total)}</text>
            </svg>
            <div style={{flex:1}}>
              {slices.map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                  <div style={{width:8,height:8,borderRadius:2,background:s.col,flexShrink:0}}/>
                  <span style={{fontSize:10,color:th.text,flex:1}}>{s.bankName||`Account ${i+1}`}</span>
                  <span style={{fontSize:10,color:s.col,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmt(+s.balance||0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BankAccountCard({bank,index,total,onDel,onChange,th}){
  const [open,setOpen]=useState(false);
  return (
    <div style={{background:th.isDark?"#1c1c1c":"#f8f8f8",borderRadius:12,marginBottom:8,marginTop:8,border:`1px solid ${th.border}`,overflow:"hidden"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",background:"none",border:"none",padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:12,fontWeight:600,color:th.text}}>{bank.bankName||`Bank Account ${index+1}`}{bank.accNumber?` ····${bank.accNumber}`:""}</div>
          <div style={{fontSize:13,fontWeight:700,color:"#3b82f6",marginTop:2,fontFamily:"'DM Mono',monospace"}}>{fmtFull(+bank.balance||0)}</div>
        </div>
        <span style={{fontSize:14,color:th.textMuted}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{padding:"0 14px 14px",borderTop:`1px solid ${th.border}`}} className="fi">
          <PField label="BANK NAME" value={bank.bankName} onChange={v=>onChange("bankName",v)} placeholder="e.g. HDFC, SBI" th={th}/>
          <PField label="ACC NUMBER (last 4)" value={bank.accNumber} onChange={v=>onChange("accNumber",v)} placeholder="XXXX" th={th}/>
          <PField label="BALANCE (₹)" type="number" value={bank.balance} onChange={v=>onChange("balance",+v)} placeholder="₹ 0" th={th}/>
          {onDel&&<button onClick={onDel} style={{fontSize:11,color:th.danger,background:"none",border:`1px solid ${th.danger}`,borderRadius:8,padding:"4px 12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",marginTop:4}}>Remove</button>}
        </div>
      )}
    </div>
  );
}

// ── PRAJAY EXPENSES TAB ───────────────────────────────────────────────────────
function PrajayExpensesTab({data,setData,summary,th}){
  const [showForm,setShowForm]=useState(false);
  const [showBudget,setShowBudget]=useState(false);
  const now=new Date();
  const curMonthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const [filterMonth,setFilterMonth]=useState(curMonthKey);
  const [form,setForm]=useState({
    date:now.toISOString().slice(0,10),
    category:"lunch",description:"",amount:"",
    type:"expense",person:"",paymentMode:"cash",bankId:"",creditCardId:"",
  });
  const [budgetEdits,setBudgetEdits]=useState(data.budgets||mkBudgets());

  const expenses=data.expenses||[];
  const budgets=data.budgets||mkBudgets();
  const filtered=expenses.filter(e=>e.date&&e.date.startsWith(filterMonth));
  const filteredExpenses=filtered.filter(e=>e.type==="expense");
  const filteredAdvances=filtered.filter(e=>e.type==="advance");
  const monthlyIncomes=data.monthlyIncomes||[];

  const catTotals=PRAJAY_CATS.reduce((acc,c)=>{
    acc[c.key]=filteredExpenses.filter(e=>e.category===c.key).reduce((s,e)=>s+(+e.amount||0),0);
    return acc;
  },{});
  const totalExpenses=filteredExpenses.reduce((s,e)=>s+(+e.amount||0),0);
  const monthIncome=monthlyIncomes.find(m=>m.month===filterMonth);

  const setFF=(field,val)=>setForm(f=>({...f,[field]:val}));

  const addExpense=()=>{
    if(!form.amount||!form.date) return;
    const entry={...form,id:Date.now(),amount:+form.amount};
    setData(p=>({...p,expenses:[...(p.expenses||[]),entry]}));
    setForm({date:now.toISOString().slice(0,10),category:"lunch",description:"",amount:"",type:"expense",person:"",paymentMode:"cash",bankId:"",creditCardId:""});
    setShowForm(false);
  };
  const delExpense=(id)=>setData(p=>({...p,expenses:(p.expenses||[]).filter(e=>e.id!==id)}));
  const saveBudget=()=>{setData(p=>({...p,budgets:{...budgetEdits}}));setShowBudget(false);};

  const budgetWarnings=PRAJAY_CATS.filter(c=>{
    const budget=+budgets[c.key]||0;
    return budget>0&&catTotals[c.key]>budget;
  });

  const INP={width:"100%",border:`1.5px solid ${th.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,color:th.text,background:th.input,outline:"none",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif",marginBottom:8};
  const SEL={...INP};
  const ptoggle=(active,label,onClick)=>(
    <button onClick={onClick} style={{padding:"7px 14px",borderRadius:20,fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",border:`1.5px solid ${active?(th.isDark?"#f5f5f5":"#0a0a0a"):th.border}`,background:active?(th.isDark?"#f5f5f5":"#0a0a0a"):"transparent",color:active?(th.isDark?"#000":"#fff"):th.textMuted,transition:"all .15s"}}>{label}</button>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Budget warnings */}
      {budgetWarnings.length>0&&(
        <div style={{background:th.isDark?"rgba(229,62,62,0.12)":"#fff5f5",border:`1.5px solid ${th.danger}`,borderRadius:14,padding:14}}>
          <div style={{fontSize:13,fontWeight:700,color:th.danger,marginBottom:8}}>⚠️ Budget Exceeded</div>
          {budgetWarnings.map(c=>(
            <div key={c.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",fontSize:12}}>
              <span style={{color:th.text}}>{c.emoji} {c.label}</span>
              <span style={{color:th.danger,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmtFull(catTotals[c.key])} / {fmtFull(+budgets[c.key])}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="pcard" style={{background:th.cardBg,borderRadius:18,padding:16,border:`1px solid ${th.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:th.text}}>Expense Tracker</div>
            <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace"}}>MONTH</div>
          </div>
          <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{...INP,width:"auto",marginBottom:0,fontSize:12,padding:"6px 10px"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
          {[{l:"Income",v:monthIncome?monthIncome.income:0,c:th.success},{l:"Spent",v:totalExpenses,c:th.danger},{l:"Saved",v:(monthIncome?monthIncome.income:0)-totalExpenses,c:((monthIncome?monthIncome.income:0)-totalExpenses)>=0?th.success:th.danger}].map(({l,v,c})=>(
            <div key={l} style={{background:th.isDark?"#1c1c1c":"#f8f8f8",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:c,fontFamily:"'DM Mono',monospace"}}>{fmt(v)}</div>
              <div style={{fontSize:9,color:th.textMuted,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setShowForm(f=>!f)} className="pbtn" style={{flex:1,padding:"10px 14px",background:th.isDark?"#f5f5f5":"#0a0a0a",color:th.isDark?"#0a0a0a":"#fff",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
            {showForm?"✕ Close":"+ Add Entry"}
          </button>
          <button onClick={()=>setShowBudget(f=>!f)} style={{padding:"10px 14px",background:"transparent",color:th.textMuted,border:`1.5px solid ${th.border}`,borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
            🎯 Budget
          </button>
        </div>
      </div>

      {/* Add Entry Form */}
      {showForm&&(
        <div className="pcard fi" style={{background:th.cardBg,borderRadius:18,padding:16,border:`1.5px solid ${th.isDark?"#444":"#e0e0e0"}`}}>
          <div style={{fontSize:13,fontWeight:700,color:th.text,marginBottom:14}}>New Entry</div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginBottom:6}}>TYPE</div>
            <div style={{display:"flex",gap:8}}>
              {ptoggle(form.type==="expense","💸 Expense",()=>setFF("type","expense"))}
              {ptoggle(form.type==="advance","🤝 Advance Given",()=>setFF("type","advance"))}
            </div>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginBottom:4}}>DATE</div>
            <input type="date" value={form.date} onChange={e=>setFF("date",e.target.value)} style={INP}/>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginBottom:4}}>CATEGORY</div>
            <select value={form.category} onChange={e=>setFF("category",e.target.value)} style={SEL}>
              {PRAJAY_CATS.map(c=><option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          {form.type==="advance"&&(
            <div style={{marginBottom:8}}>
              <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginBottom:4}}>PERSON NAME</div>
              <input type="text" value={form.person} onChange={e=>setFF("person",e.target.value)} placeholder="Who did you give to?" style={INP}/>
            </div>
          )}
          <div style={{marginBottom:8}}>
            <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginBottom:4}}>DESCRIPTION</div>
            <input type="text" value={form.description} onChange={e=>setFF("description",e.target.value)} placeholder="What was this for?" style={INP}/>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginBottom:4}}>AMOUNT (₹)</div>
            <input type="number" value={form.amount} onChange={e=>setFF("amount",e.target.value)} placeholder="₹ 0" style={INP}/>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginBottom:6}}>PAID VIA</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[["cash","💵 Cash"],["bank","🏦 Bank"],["credit_card","💳 Credit Card"]].map(([k,l])=>ptoggle(form.paymentMode===k,l,()=>setFF("paymentMode",k)))}
            </div>
            {form.paymentMode==="bank"&&data.banks.filter(b=>b.bankName).length>0&&(
              <select value={form.bankId} onChange={e=>setFF("bankId",e.target.value)} style={{...SEL,marginTop:8}}>
                <option value="">Select Bank</option>
                {data.banks.filter(b=>b.bankName).map((b,i)=><option key={i} value={b.id}>{b.bankName}{b.accNumber?` ····${b.accNumber}`:""}</option>)}
              </select>
            )}
            {form.paymentMode==="credit_card"&&data.creditCards.filter(c=>c.bank).length>0&&(
              <select value={form.creditCardId} onChange={e=>setFF("creditCardId",e.target.value)} style={{...SEL,marginTop:8}}>
                <option value="">Select Card</option>
                {data.creditCards.filter(c=>c.bank).map((c,i)=><option key={i} value={c.id}>{c.bank}{c.cardNumber?` ····${c.cardNumber}`:""}</option>)}
              </select>
            )}
          </div>
          <button onClick={addExpense} className="pbtn" style={{width:"100%",padding:13,background:th.isDark?"#f5f5f5":"#0a0a0a",color:th.isDark?"#0a0a0a":"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Save Entry</button>
        </div>
      )}

      {/* Budget Editor */}
      {showBudget&&(
        <div className="pcard fi" style={{background:th.cardBg,borderRadius:18,padding:16,border:`1.5px solid ${th.isDark?"#444":"#e0e0e0"}`}}>
          <div style={{fontSize:13,fontWeight:700,color:th.text,marginBottom:4}}>Budget Limits</div>
          <div style={{fontSize:11,color:th.textMuted,marginBottom:14}}>Set monthly budget per category. You'll get a warning when exceeded.</div>
          {PRAJAY_CATS.map(c=>{
            const spent=catTotals[c.key]||0;
            const budget=+budgetEdits[c.key]||0;
            const over=budget>0&&spent>budget;
            return (
              <div key={c.key} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{fontSize:12,fontWeight:600,color:th.text}}>{c.emoji} {c.label}</div>
                  {budget>0&&<div style={{fontSize:10,color:over?th.danger:th.success,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{fmt(spent)} / {fmt(budget)}</div>}
                </div>
                <input type="number" value={budgetEdits[c.key]||""} onChange={e=>setBudgetEdits(b=>({...b,[c.key]:+e.target.value}))} placeholder="₹ 0 (no limit)" style={{...INP,marginBottom:0,borderColor:over?th.danger:th.border}}/>
                {over&&<div style={{fontSize:10,color:th.danger,marginTop:2}}>⚠️ Over by {fmtFull(spent-budget)}</div>}
              </div>
            );
          })}
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button onClick={saveBudget} className="pbtn" style={{flex:1,padding:12,background:th.isDark?"#f5f5f5":"#0a0a0a",color:th.isDark?"#0a0a0a":"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Save Budget</button>
            <button onClick={()=>setShowBudget(false)} style={{padding:"12px 16px",background:"transparent",color:th.textMuted,border:`1px solid ${th.border}`,borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {filteredExpenses.length>0&&(
        <div className="pcard" style={{background:th.cardBg,borderRadius:18,padding:16,border:`1px solid ${th.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:th.text,marginBottom:14}}>Category Breakdown</div>
          {PRAJAY_CATS.filter(c=>catTotals[c.key]>0).sort((a,b)=>catTotals[b.key]-catTotals[a.key]).map(c=>{
            const spent=catTotals[c.key];
            const budget=+budgets[c.key]||0;
            const pct=budget>0?Math.min(100,spent/budget*100):100;
            const over=budget>0&&spent>budget;
            return (
              <div key={c.key} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{fontSize:12,fontWeight:600,color:th.text}}>{c.emoji} {c.label}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    {over&&<span style={{fontSize:9,color:th.danger,fontWeight:700,background:`${th.danger}18`,padding:"2px 6px",borderRadius:6}}>OVER</span>}
                    <span style={{fontSize:12,fontWeight:700,color:c.col,fontFamily:"'DM Mono',monospace"}}>{fmtFull(spent)}</span>
                  </div>
                </div>
                <div style={{height:6,background:th.isDark?"#2a2a2a":"#f0f0f0",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${budget>0?pct:100}%`,height:"100%",background:over?th.danger:c.col,borderRadius:3,transition:"width 0.4s ease"}}/>
                </div>
                {budget>0&&<div style={{fontSize:9,color:th.textMuted,marginTop:2,textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{fmtFull(spent)} of {fmtFull(budget)}</div>}
              </div>
            );
          })}
          <div style={{borderTop:`1px solid ${th.border}`,paddingTop:10,marginTop:4,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:12,color:th.textMuted}}>Total Spent</span>
            <span style={{fontSize:14,fontWeight:700,color:th.danger,fontFamily:"'DM Mono',monospace"}}>{fmtFull(totalExpenses)}</span>
          </div>
        </div>
      )}

      {/* Transaction List */}
      {filteredExpenses.length>0&&(
        <div className="pcard" style={{background:th.cardBg,borderRadius:18,border:`1px solid ${th.border}`,overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${th.border}`}}>
            <div style={{fontSize:13,fontWeight:700,color:th.text}}>Expenses</div>
            <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace"}}>{filteredExpenses.length} transactions</div>
          </div>
          {[...filteredExpenses].sort((a,b)=>b.date.localeCompare(a.date)).map((e,i)=>{
            const cat=PRAJAY_CATS.find(c=>c.key===e.category)||PRAJAY_CATS[0];
            return (
              <div key={e.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<filteredExpenses.length-1?`1px solid ${th.border}`:"none"}}>
                <div style={{width:36,height:36,borderRadius:10,background:`${cat.col}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat.emoji}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:th.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.description||cat.label}</div>
                  <div style={{fontSize:10,color:th.textMuted,marginTop:1,fontFamily:"'DM Mono',monospace"}}>{e.date} · {e.paymentMode==="cash"?"Cash":e.paymentMode==="bank"?"Bank":"Card"}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:th.danger,fontFamily:"'DM Mono',monospace"}}>{fmtFull(+e.amount)}</div>
                  <button onClick={()=>delExpense(e.id)} style={{fontSize:9,color:th.textMuted,background:"none",border:"none",cursor:"pointer",padding:"2px 0"}}>remove</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Advances List */}
      {filteredAdvances.length>0&&(
        <div className="pcard" style={{background:th.cardBg,borderRadius:18,border:`1px solid ${th.border}`,overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${th.border}`}}>
            <div style={{fontSize:13,fontWeight:700,color:th.text}}>Advances Given</div>
            <div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace"}}>{filteredAdvances.length} advance{filteredAdvances.length!==1?"s":""}</div>
          </div>
          {[...filteredAdvances].sort((a,b)=>b.date.localeCompare(a.date)).map((e,i)=>(
            <div key={e.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<filteredAdvances.length-1?`1px solid ${th.border}`:"none"}}>
              <div style={{width:36,height:36,borderRadius:10,background:"rgba(245,158,11,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🤝</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:th.text}}>{e.person||"Unknown"}</div>
                <div style={{fontSize:10,color:th.textMuted,marginTop:1,fontFamily:"'DM Mono',monospace"}}>{e.date} · {e.description||"Advance"}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",fontFamily:"'DM Mono',monospace"}}>{fmtFull(+e.amount)}</div>
                <button onClick={()=>delExpense(e.id)} style={{fontSize:9,color:th.textMuted,background:"none",border:"none",cursor:"pointer",padding:"2px 0"}}>remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredExpenses.length===0&&filteredAdvances.length===0&&(
        <div style={{textAlign:"center",padding:"40px 20px",color:th.textMuted}}>
          <div style={{fontSize:32,marginBottom:12}}>💳</div>
          <div style={{fontSize:14,fontWeight:600,color:th.text,marginBottom:4}}>No entries for this month</div>
          <div style={{fontSize:12}}>Tap "+ Add Entry" to start tracking</div>
        </div>
      )}
    </div>
  );
}

// ── PAY OFF TAB – PRAJAY ─────────────────────────────────────────────────────
function PrajayPayOffTab({data,th}){
  const loans=data.loans.filter(l=>+l.outstanding>0&&+l.emi>0);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {loans.length===0&&(
        <div style={{textAlign:"center",padding:"40px 20px",color:th.textMuted}}>
          <div style={{fontSize:32,marginBottom:12}}>📉</div>
          <div style={{fontSize:14,fontWeight:600,color:th.text,marginBottom:4}}>No active loans</div>
          <div style={{fontSize:12}}>Add loan details in the Debts tab</div>
        </div>
      )}
      {loans.map((l,i)=><LoanRepaymentCard key={i} loan={l} index={i} th={th}/>)}
    </div>
  );
}

function LoanRepaymentCard({loan,index,th}){
  const [showSchedule,setShowSchedule]=useState(false);
  const [showGraph,setShowGraph]=useState(false);
  const outstanding=+loan.outstanding||0,emi=+loan.emi||0,rate=+loan.rate||0;
  const mr=rate/100/12;
  let totalMonths=0;
  if(mr>0&&emi>outstanding*mr) totalMonths=Math.ceil(-Math.log(1-outstanding*mr/emi)/Math.log(1+mr));
  else if(mr===0&&emi>0) totalMonths=Math.ceil(outstanding/emi);
  const isInfinite=!isFinite(totalMonths)||totalMonths>600;
  const totalPayable=isInfinite?0:emi*totalMonths;
  const totalInterest=isInfinite?0:Math.max(0,totalPayable-outstanding);
  const extra=emi*1.2;
  let mFaster=0;
  if(mr>0&&extra>outstanding*mr) mFaster=Math.ceil(-Math.log(1-outstanding*mr/extra)/Math.log(1+mr));
  const intSaved=Math.max(0,totalInterest-(extra*mFaster-outstanding));
  const done=new Date(); if(!isInfinite) done.setMonth(done.getMonth()+totalMonths);

  const schedule=useMemo(()=>{
    if(isInfinite||totalMonths===0) return [];
    const rows=[]; let bal=outstanding;
    const n=Math.min(totalMonths,360);
    const d=new Date();
    for(let m=1;m<=n;m++){
      const interest=bal*mr;
      const principal=Math.min(emi-interest,bal);
      bal=Math.max(0,bal-principal);
      const dt=new Date(d.getFullYear(),d.getMonth()+m,1);
      rows.push({month:m,label:`${dt.toLocaleString("default",{month:"short",year:"numeric"})}`,interest:Math.round(interest),principal:Math.round(principal),balance:Math.round(bal),emi:Math.round(emi)});
      if(bal<=0) break;
    }
    return rows;
  },[outstanding,mr,emi,totalMonths,isInfinite]);

  const graphPts=useMemo(()=>{
    if(schedule.length===0) return [];
    const step=Math.max(1,Math.floor(schedule.length/12));
    return schedule.filter((_,i)=>i%step===0||i===schedule.length-1);
  },[schedule]);

  const GW=320,GH=100,PAD=30;

  return (
    <div className="pcard" style={{background:th.cardBg,borderRadius:18,border:`1px solid ${th.border}`,overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${th.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:th.text}}>{loan.name||`Loan ${index+1}`}</div>
            {loan.type&&<div style={{fontSize:11,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginTop:2}}>{loan.type}</div>}
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:16,fontWeight:700,color:th.danger,fontFamily:"'DM Mono',monospace"}}>{fmtFull(outstanding)}</div>
            <div style={{fontSize:10,color:th.textMuted}}>outstanding</div>
          </div>
        </div>
      </div>

      {/* Key stats */}
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${th.border}`}}>
        {isInfinite&&(
          <div style={{background:`${th.danger}15`,border:`1px solid ${th.danger}`,borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:11,color:th.danger,fontWeight:600}}>
            ⚠️ EMI (₹{emi.toLocaleString("en-IN")}) doesn't cover monthly interest (₹{Math.round(outstanding*mr).toLocaleString("en-IN")}). Please increase your EMI.
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            {l:"Rate",v:`${rate}% p.a.`},{l:"EMI/month",v:fmtFull(emi)},
            {l:"Payoff in",v:isInfinite?"∞":`${totalMonths} months`},{l:"Payoff by",v:isInfinite?"Never":done.toLocaleDateString("en-IN",{month:"short",year:"numeric"})},
            {l:"Total Payable",v:isInfinite?"∞":fmtFull(totalPayable)},{l:"Total Interest",v:isInfinite?"∞":fmtFull(totalInterest)},
          ].map(({l,v})=>(
            <div key={l} style={{background:th.isDark?"#1c1c1c":"#f8f8f8",borderRadius:8,padding:"8px 10px"}}>
              <div style={{fontSize:9,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginBottom:2}}>{l.toUpperCase()}</div>
              <div style={{fontSize:12,fontWeight:700,color:th.text,fontFamily:"'DM Mono',monospace"}}>{v}</div>
            </div>
          ))}
        </div>
        {!isInfinite&&mFaster>0&&(
          <div style={{background:th.isDark?"rgba(74,222,128,0.08)":"#f0fdf4",borderRadius:10,padding:12,border:`1px solid ${th.isDark?"#064e3b":"#bbf7d0"}`,marginTop:10}}>
            <div style={{fontWeight:700,color:th.success,fontSize:12,marginBottom:6}}>Pay 20% Extra → Save {fmtFull(intSaved)}</div>
            <div style={{fontSize:11,color:th.textMuted}}>Pay {fmtFull(extra)}/mo → {totalMonths-mFaster} months faster</div>
          </div>
        )}
      </div>

      {/* Outstanding balance graph + EMI split */}
      {!isInfinite&&graphPts.length>1&&(
        <>
          <button onClick={()=>setShowGraph(o=>!o)} style={{width:"100%",background:"none",border:"none",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:th.textMuted,fontSize:11,borderBottom:showGraph?`1px solid ${th.border}`:"none"}}>
            <span style={{fontFamily:"'DM Mono',monospace",letterSpacing:.5}}>📉 REPAYMENT GRAPH</span>
            <span style={{fontSize:14}}>{showGraph?"▲":"▼"}</span>
          </button>
          {showGraph&&(
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${th.border}`}} className="fi">
              <div style={{marginBottom:8,fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace"}}>OUTSTANDING BALANCE OVER TIME</div>
              <svg width="100%" viewBox={`0 0 ${GW} ${GH+PAD}`} style={{overflow:"visible"}}>
                {[0,0.25,0.5,0.75,1].map(p=>(
                  <g key={p}>
                    <line x1={PAD} y1={GH*(1-p)} x2={GW-10} y2={GH*(1-p)} stroke={th.isDark?"#2a2a2a":"#f0f0f0"} strokeWidth="1"/>
                    <text x={PAD-2} y={GH*(1-p)+3} textAnchor="end" fontSize="7" fill={th.textMuted} fontFamily="'DM Mono',monospace">{fmt(outstanding*p)}</text>
                  </g>
                ))}
                <polygon
                  points={[
                    ...graphPts.map((p,i)=>{const x=PAD+(i/(graphPts.length-1))*(GW-PAD-10);const y=GH*(p.balance/outstanding);return`${x},${y}`;}),
                    `${GW-10},${GH}`,`${PAD},${GH}`
                  ].join(" ")}
                  fill={`${th.danger}15`}
                />
                <polyline
                  points={graphPts.map((p,i)=>{const x=PAD+(i/(graphPts.length-1))*(GW-PAD-10);const y=GH*(p.balance/outstanding);return`${x},${y}`;}).join(" ")}
                  fill="none" stroke={th.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
                {graphPts.filter((_,i)=>i%3===0||i===graphPts.length-1).map((p,i)=>{
                  const idx=graphPts.indexOf(p);
                  const x=PAD+(idx/(graphPts.length-1))*(GW-PAD-10);
                  const y=GH*(p.balance/outstanding);
                  return <circle key={i} cx={x} cy={y} r="3" fill={th.danger}/>;
                })}
                {graphPts.filter((_,i)=>i%(Math.ceil(graphPts.length/4))===0||i===graphPts.length-1).map((p,i)=>{
                  const idx=graphPts.indexOf(p);
                  const x=PAD+(idx/(graphPts.length-1))*(GW-PAD-10);
                  return <text key={i} x={x} y={GH+14} textAnchor="middle" fontSize="7" fill={th.textMuted} fontFamily="'DM Mono',monospace">{p.label}</text>;
                })}
              </svg>

              {/* Principal vs Interest stacked bars */}
              {schedule.length>0&&(
                <>
                  <div style={{marginTop:16,marginBottom:8,fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace"}}>PRINCIPAL vs INTEREST — FIRST 12 MONTHS</div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:3,height:60}}>
                    {schedule.slice(0,12).map((row,i)=>{
                      const total2=row.principal+row.interest||1;
                      const pPct=row.principal/total2*100;
                      const iPct=row.interest/total2*100;
                      return (
                        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",height:"100%",justifyContent:"flex-end",gap:1}}>
                          <div style={{height:`${iPct}%`,background:"#f97316",borderRadius:"2px 2px 0 0",minHeight:iPct>0?2:0}}/>
                          <div style={{height:`${pPct}%`,background:th.success,borderRadius:"0",minHeight:pPct>0?2:0}}/>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{display:"flex",gap:16,marginTop:6,justifyContent:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:th.textMuted}}>
                      <div style={{width:8,height:8,borderRadius:2,background:th.success}}/>Principal
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:th.textMuted}}>
                      <div style={{width:8,height:8,borderRadius:2,background:"#f97316"}}/>Interest
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Repayment Schedule */}
          <button onClick={()=>setShowSchedule(o=>!o)} style={{width:"100%",background:"none",border:"none",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:th.textMuted,fontSize:11}}>
            <span style={{fontFamily:"'DM Mono',monospace",letterSpacing:.5}}>📅 REPAYMENT SCHEDULE</span>
            <span style={{fontSize:14}}>{showSchedule?"▲":"▼"}</span>
          </button>
          {showSchedule&&(
            <div style={{padding:"0 0 12px"}} className="fi">
              <div style={{maxHeight:320,overflowY:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,fontFamily:"'DM Mono',monospace"}}>
                  <thead>
                    <tr style={{background:th.isDark?"#1c1c1c":"#f0f0f0"}}>
                      {["Month","EMI","Principal","Interest","Balance"].map(h=>(
                        <td key={h} style={{padding:"7px 10px",fontSize:9,color:th.textMuted,fontWeight:700,letterSpacing:.5}}>{h}</td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.slice(0,60).map((row,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${th.border}`,background:i%2===0?"transparent":(th.isDark?"rgba(255,255,255,0.01)":"rgba(0,0,0,0.01)")}}>
                        <td style={{padding:"7px 10px",color:th.textMuted,fontSize:10}}>{row.label}</td>
                        <td style={{padding:"7px 10px",color:th.text}}>{fmt(row.emi)}</td>
                        <td style={{padding:"7px 10px",color:th.success}}>{fmt(row.principal)}</td>
                        <td style={{padding:"7px 10px",color:"#f97316"}}>{fmt(row.interest)}</td>
                        <td style={{padding:"7px 10px",color:row.balance===0?th.success:th.danger,fontWeight:row.balance===0?700:400}}>{row.balance===0?"Paid ✓":fmt(row.balance)}</td>
                      </tr>
                    ))}
                    {schedule.length>60&&(
                      <tr><td colSpan={5} style={{padding:"8px 10px",color:th.textMuted,fontSize:10,textAlign:"center"}}>... {schedule.length-60} more months</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── LIABILITIES TAB ───────────────────────────────────────────────────────────
function LiabilitiesTab({data,upd,updItem,addItem,delItem,summary,th}){
  const isP=!th.isVaishali;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {th.isVaishali&&<QStrip q="Every debt cleared is a chain broken. Keep going, queen! 💪" th={th}/>}

      {isP?(
        <PCard title="Loans & Mortgages" subtitle={`Total: ${fmtFull(summary.loanTotal)}`} th={th}>
          {data.loans.map((l,i)=>(
            <PItem key={l.id||i} title={l.name||`Loan ${i+1}`} onDel={data.loans.length>1?()=>delItem("loans",i):null} th={th}>
              <PField label="LOAN NAME" value={l.name} onChange={v=>updItem("loans",i,"name",v)} placeholder="e.g. Home Loan" th={th}/>
              <PField label="TYPE" value={l.type} onChange={v=>updItem("loans",i,"type",v)} placeholder="Home / Car / Personal" th={th}/>
              <PField label="OUTSTANDING (₹)" type="number" value={l.outstanding} onChange={v=>updItem("loans",i,"outstanding",+v)} placeholder="₹ 0" th={th}/>
              <PField label="RATE (% p.a.)" type="number" value={l.rate} onChange={v=>updItem("loans",i,"rate",+v)} placeholder="e.g. 8.5" th={th}/>
              <PField label="EMI / MONTH (₹)" type="number" value={l.emi} onChange={v=>updItem("loans",i,"emi",+v)} placeholder="₹ 0" th={th}/>
              <PValRow label="Outstanding" value={fmtFull(+l.outstanding||0)} color={th.danger} th={th}/>
            </PItem>
          ))}
          <PAddBtn onClick={()=>addItem("loans",{name:"",type:"",outstanding:0,rate:0,emi:0})} th={th}/>
        </PCard>
      ):(
        <Sec title="🏛️ Loans & Mortgages" th={th}>
          {data.loans.map((l,i)=>(
            <Item key={l.id||i} title={`Loan ${i+1}${l.name?` — ${l.name}`:""}`} onDel={data.loans.length>1?()=>delItem("loans",i):null} th={th}>
              <F label="Loan Name" value={l.name} onChange={v=>updItem("loans",i,"name",v)} placeholder="e.g. Home Loan" th={th}/>
              <F label="Loan Type" value={l.type} onChange={v=>updItem("loans",i,"type",v)} placeholder="Home / Car / Personal" th={th}/>
              <F label="Outstanding Balance (₹)" type="number" value={l.outstanding} onChange={v=>updItem("loans",i,"outstanding",+v)} placeholder="Remaining principal" th={th}/>
              <F label="Interest Rate (% p.a.)" type="number" value={l.rate} onChange={v=>updItem("loans",i,"rate",+v)} placeholder="e.g. 8.5" th={th}/>
              <F label="EMI per Month (₹)" type="number" value={l.emi} onChange={v=>updItem("loans",i,"emi",+v)} placeholder="Monthly EMI" th={th}/>
              <Cv red th={th}>{fmtFull(+l.outstanding||0)}</Cv>
            </Item>
          ))}
          <Add onClick={()=>addItem("loans",{name:"",type:"",outstanding:0,rate:0,emi:0})} th={th}/>
          <Total red th={th}>{fmtFull(summary.loanTotal)}</Total>
        </Sec>
      )}

      {isP?(
        <PCard title="Credit Cards" subtitle={`Total: ${fmtFull(summary.ccTotal)}`} th={th}>
          {data.creditCards.map((c,i)=>(
            <PItem key={c.id||i} title={c.bank||`Card ${i+1}`} onDel={data.creditCards.length>1?()=>delItem("creditCards",i):null} th={th}>
              <PField label="BANK / CARD NAME" value={c.bank} onChange={v=>updItem("creditCards",i,"bank",v)} placeholder="e.g. HDFC Regalia" th={th}/>
              <PField label="CARD NUMBER (last 4)" value={c.cardNumber} onChange={v=>updItem("creditCards",i,"cardNumber",v)} placeholder="XXXX" th={th}/>
              <PField label="OUTSTANDING (₹)" type="number" value={c.outstanding} onChange={v=>updItem("creditCards",i,"outstanding",+v)} placeholder="₹ 0" th={th}/>
              <PValRow label="Outstanding" value={fmtFull(+c.outstanding||0)} color={th.danger} th={th}/>
            </PItem>
          ))}
          <PAddBtn onClick={()=>addItem("creditCards",{bank:"",cardNumber:"",outstanding:0})} th={th}/>
        </PCard>
      ):(
        <Sec title="💳 Credit Cards" th={th}>
          {data.creditCards.map((c,i)=>(
            <Item key={c.id||i} title={`Card ${i+1}${c.bank?` — ${c.bank}`:""}`} onDel={data.creditCards.length>1?()=>delItem("creditCards",i):null} th={th}>
              <F label="Bank / Card Name" value={c.bank} onChange={v=>updItem("creditCards",i,"bank",v)} placeholder="e.g. HDFC Regalia" th={th}/>
              <F label="Card Number (last 4)" value={c.cardNumber} onChange={v=>updItem("creditCards",i,"cardNumber",v)} placeholder="XXXX" th={th}/>
              <F label="Outstanding Amount (₹)" type="number" value={c.outstanding} onChange={v=>updItem("creditCards",i,"outstanding",+v)} placeholder="Current dues" th={th}/>
              <Cv red th={th}>{fmtFull(+c.outstanding||0)}</Cv>
            </Item>
          ))}
          <Add onClick={()=>addItem("creditCards",{bank:"",cardNumber:"",outstanding:0})} th={th}/>
          <Total red th={th}>{fmtFull(summary.ccTotal)}</Total>
        </Sec>
      )}

      {isP?(
        <PCard title="LazyPay / BNPL" subtitle={`Total: ${fmtFull(summary.lazyPayTotal||0)}`} th={th}>
          {(data.lazyPay||[]).map((l,i)=>(
            <PItem key={l.id||i} title={`LazyPay ${i+1}`} onDel={(data.lazyPay||[]).length>1?()=>delItem("lazyPay",i):null} th={th}>
              <PField label="OUTSTANDING (₹)" type="number" value={l.outstanding} onChange={v=>updItem("lazyPay",i,"outstanding",+v)} placeholder="₹ 0" th={th}/>
              <PField label="DUE DATE" type="date" value={l.dueDate} onChange={v=>updItem("lazyPay",i,"dueDate",v)} th={th}/>
              {l.dueDate&&(()=>{const due=new Date(l.dueDate);const today=new Date();today.setHours(0,0,0,0);const overdue=due<today;return <div style={{fontSize:11,color:overdue?th.danger:"#d97706",marginTop:-4,marginBottom:8,fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{overdue?"⚠️ OVERDUE":"📅 Due: "+due.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>;})()}
              <PValRow label="Outstanding" value={fmtFull(+l.outstanding||0)} color={th.danger} th={th}/>
            </PItem>
          ))}
          <PAddBtn onClick={()=>addItem("lazyPay",{outstanding:0,dueDate:""})} th={th}/>
        </PCard>
      ):(
        <Sec title="🛒 LazyPay / BNPL" th={th}>
          <QStrip q="Clear LazyPay dues first — small debts add up fast! 👑" th={th}/>
          {(data.lazyPay||[]).map((l,i)=>(
            <Item key={l.id||i} title={`LazyPay ${i+1}`} onDel={(data.lazyPay||[]).length>1?()=>delItem("lazyPay",i):null} th={th}>
              <F label="Outstanding Amount (₹)" type="number" value={l.outstanding} onChange={v=>updItem("lazyPay",i,"outstanding",+v)} placeholder="Amount due on LazyPay" th={th}/>
              <F label="Due Date" type="date" value={l.dueDate} onChange={v=>updItem("lazyPay",i,"dueDate",v)} th={th}/>
              {l.dueDate&&(()=>{const due=new Date(l.dueDate);const today=new Date();today.setHours(0,0,0,0);return <div style={{fontSize:11,color:due<today?th.danger:"#d97706",marginTop:2,fontWeight:600}}>{due<today?"⚠️ Overdue!":"📅 Due: "+due.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>;})()}
              <Cv red th={th}>{fmtFull(+l.outstanding||0)}</Cv>
            </Item>
          ))}
          <Add onClick={()=>addItem("lazyPay",{outstanding:0,dueDate:""})} th={th}/>
          <Total red th={th}>{fmtFull(summary.lazyPayTotal||0)}</Total>
        </Sec>
      )}

      {isP?(
        <div className="pcard" style={{background:th.cardBg,borderRadius:18,padding:18,border:`1px solid ${th.border}`,textAlign:"center"}}>
          <div style={{fontSize:11,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginBottom:4}}>TOTAL LIABILITIES</div>
          <div style={{fontSize:30,fontWeight:700,color:th.danger,fontFamily:"'DM Mono',monospace",letterSpacing:-1}}>{fmtFull(summary.totalLiabilities)}</div>
          <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:10,fontSize:11,color:th.textMuted,fontFamily:"'DM Mono',monospace"}}>
            <span>Loans <b style={{color:th.danger}}>{fmt(summary.loanTotal)}</b></span>
            <span>CC <b style={{color:th.danger}}>{fmt(summary.ccTotal)}</b></span>
            <span>LP <b style={{color:th.danger}}>{fmt(summary.lazyPayTotal||0)}</b></span>
          </div>
          <div style={{marginTop:8,fontSize:11,color:th.textMuted}}>Monthly EMI: <b style={{color:"#f97316",fontFamily:"'DM Mono',monospace"}}>{fmtFull(summary.monthlyEMI)}</b></div>
        </div>
      ):(
        <>
        <Sec title="🧾 Creditors (Money You Owe Informally)" th={th}>
          <QStrip q="Track what you owe others — clear debts bring clarity. 💪" th={th}/>
          {(data.creditors||[]).map((c,i)=>(
            <Item key={c.id||i} title={c.name?`Creditor — ${c.name}`:`Creditor ${i+1}`} onDel={(data.creditors||[]).length>1?()=>delItem("creditors",i):null} th={th}>
              <F label="Name / Description" value={c.name} onChange={v=>updItem("creditors",i,"name",v)} placeholder="To whom do you owe?" th={th}/>
              <F label="Amount (₹)" type="number" value={c.amount} onChange={v=>updItem("creditors",i,"amount",+v)} placeholder="Amount owed" th={th}/>
              <F label="Due Date" type="date" value={c.dueDate} onChange={v=>updItem("creditors",i,"dueDate",v)} th={th}/>
              <F label="Note" value={c.note} onChange={v=>updItem("creditors",i,"note",v)} placeholder="Reason / details" th={th}/>
              {c.dueDate&&(()=>{const due=new Date(c.dueDate);const today=new Date();today.setHours(0,0,0,0);return <div style={{fontSize:11,color:due<today?th.danger:"#d97706",marginTop:2,fontWeight:600}}>{due<today?"⚠️ Overdue!":"📅 Due: "+due.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>;})()}
              <Cv red th={th}>{fmtFull(+c.amount||0)}</Cv>
            </Item>
          ))}
          <Add onClick={()=>addItem("creditors",{name:"",amount:0,dueDate:"",note:""})} th={th}/>
          <Total red th={th}>{fmtFull(summary.creditorTotal||0)}</Total>
        </Sec>
        <div style={{background:th.cardBg,border:`2px solid ${th.border}`,borderRadius:16,padding:16,textAlign:"center"}}>
          <div style={{fontSize:11,color:th.textMuted,marginBottom:2}}>Total Liabilities</div>
          <div style={{fontFamily:th.serif,fontSize:26,fontWeight:700,color:th.danger}}>{fmtFull(summary.totalLiabilities)}</div>
          <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:8,fontSize:11,color:th.textMuted,flexWrap:"wrap"}}>
            <span>Loans: <b style={{color:th.danger}}>{fmtFull(summary.loanTotal)}</b></span>
            <span>CC: <b style={{color:th.danger}}>{fmtFull(summary.ccTotal)}</b></span>
            {(summary.creditorTotal||0)>0&&<span>Creditors: <b style={{color:th.danger}}>{fmtFull(summary.creditorTotal)}</b></span>}
          </div>
          <div style={{fontSize:11,color:th.textMuted,marginTop:8}}>Monthly EMI Burden</div>
          <div style={{fontFamily:th.serif,fontSize:18,fontWeight:700,color:"#f97316"}}>{fmtFull(summary.monthlyEMI)}/month</div>
        </div>
        </>
      )}
    </div>
  );
}

// ── VAISHALI LOAN PLAN TAB ────────────────────────────────────────────────────
function LoanPlanTab({data,th}){
  const loans=data.loans.filter(l=>+l.outstanding>0&&+l.emi>0);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <QStrip q="Debt is temporary. Financial freedom is forever. 🌸" th={th}/>
      {loans.length===0&&<Empty text="Add loan details in the Debts tab first 💐" th={th}/>}
      {loans.map((l,i)=><VaishaliLoanCard key={i} loan={l} index={i} th={th}/>)}
    </div>
  );
}
function VaishaliLoanCard({loan,index,th}){
  const [showGraph,setShowGraph]=useState(false);
  const [showSchedule,setShowSchedule]=useState(false);
  const outstanding=+loan.outstanding||0,emi=+loan.emi||0,rate=+loan.rate||0,mr=rate/100/12;
  let months=0;
  if(mr>0&&emi>outstanding*mr) months=Math.ceil(-Math.log(1-outstanding*mr/emi)/Math.log(1+mr));
  else if(mr===0&&emi>0) months=Math.ceil(outstanding/emi);
  else if(mr>0&&emi>0&&emi<=outstanding*mr) months=Infinity;
  const isInfinite=!isFinite(months);
  const totalPayable=isInfinite?0:emi*months;
  const totalInterest=isInfinite?0:Math.max(0,totalPayable-outstanding);
  const monthlyInterest=Math.round(outstanding*mr);

  // Extra payment scenarios
  const extra20=emi*1.2;
  let mFaster20=0;
  if(mr>0&&extra20>outstanding*mr) mFaster20=Math.ceil(-Math.log(1-outstanding*mr/extra20)/Math.log(1+mr));
  else if(mr===0) mFaster20=Math.ceil(outstanding/extra20);
  const intSaved20=Math.max(0,totalInterest-Math.max(0,extra20*mFaster20-outstanding));

  const extra50=emi*1.5;
  let mFaster50=0;
  if(mr>0&&extra50>outstanding*mr) mFaster50=Math.ceil(-Math.log(1-outstanding*mr/extra50)/Math.log(1+mr));
  else if(mr===0) mFaster50=Math.ceil(outstanding/extra50);
  const intSaved50=Math.max(0,totalInterest-Math.max(0,extra50*mFaster50-outstanding));

  const done=new Date(); if(!isInfinite) done.setMonth(done.getMonth()+months);

  const schedule=useMemo(()=>{
    if(isInfinite||months===0) return [];
    const rows=[]; let bal=outstanding;
    const n=Math.min(months,360);
    const d=new Date();
    for(let m=1;m<=n;m++){
      const interest=bal*mr;
      const principal=Math.min(emi-interest,bal);
      bal=Math.max(0,bal-principal);
      const dt=new Date(d.getFullYear(),d.getMonth()+m,1);
      rows.push({month:m,label:`${dt.toLocaleString("default",{month:"short",year:"numeric"})}`,interest:Math.round(interest),principal:Math.round(principal),balance:Math.round(bal),emi:Math.round(emi)});
      if(bal<=0) break;
    }
    return rows;
  },[outstanding,mr,emi,months,isInfinite]);

  const graphPts=useMemo(()=>{
    if(schedule.length===0) return [];
    const step=Math.max(1,Math.floor(schedule.length/12));
    return schedule.filter((_,i)=>i%step===0||i===schedule.length-1);
  },[schedule]);

  const GW=320,GH=100,PAD=30;

  return (
    <Sec title={`🏛️ ${loan.name||`Loan ${index+1}`}${loan.type?` — ${loan.type}`:""}`} th={th}>
      {isInfinite&&(
        <div style={{background:th.isDark?"rgba(220,38,38,0.15)":"#fff1f2",border:`1.5px solid ${th.danger}`,borderRadius:12,padding:"10px 12px",marginBottom:10,fontSize:12,color:th.danger,fontWeight:600}}>
          ⚠️ EMI (₹{emi.toLocaleString("en-IN")}) doesn't cover monthly interest (₹{monthlyInterest.toLocaleString("en-IN")}). Increase your EMI above ₹{(monthlyInterest+1).toLocaleString("en-IN")}.
        </div>
      )}
      {/* Key Numbers */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        {[
          {l:"Outstanding",v:fmtFull(outstanding),c:th.danger},
          {l:"Rate (p.a.)",v:`${rate}%`,c:th.text},
          {l:"Monthly EMI",v:fmtFull(emi),c:th.text},
          {l:"Monthly Interest",v:fmtFull(monthlyInterest),c:"#f97316"},
          {l:"Monthly Principal",v:isInfinite?"—":fmtFull(Math.round(emi-monthlyInterest)),c:th.success},
          {l:"Payoff In",v:isInfinite?"∞":`${months} months`,c:isInfinite?th.danger:th.text},
          {l:"Payoff By",v:isInfinite?"Never":done.toLocaleDateString("en-IN",{month:"short",year:"numeric"}),c:isInfinite?th.danger:th.success},
          {l:"Total Payable",v:isInfinite?"∞":fmtFull(totalPayable),c:th.text},
        ].map(({l,v,c})=>(
          <div key={l} style={{background:th.isDark?"rgba(255,255,255,0.04)":th.bg,borderRadius:8,padding:"8px 10px",border:`1px solid ${th.border}`}}>
            <div style={{fontSize:9,color:th.textMuted,textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>{l}</div>
            <div style={{fontSize:12,fontWeight:700,color:c,fontFamily:th.serif}}>{v}</div>
          </div>
        ))}
      </div>
      {/* Calculation breakdown */}
      {!isInfinite&&(
        <div style={{background:th.isDark?"rgba(255,255,255,0.03)":th.bg,borderRadius:10,padding:12,border:`1px solid ${th.border}`,marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:700,color:th.isDark?"#c490a8":th.accentL,marginBottom:8,fontFamily:th.serif}}>📐 How These Are Calculated</div>
          <div style={{fontSize:10,color:th.textMuted,lineHeight:1.8}}>
            <div>• Monthly Interest = Outstanding (₹{outstanding.toLocaleString("en-IN")}) × Rate ({rate}%) ÷ 12 = <b style={{color:"#f97316"}}>{fmtFull(monthlyInterest)}</b></div>
            <div>• Monthly Principal Paid = EMI (₹{emi.toLocaleString("en-IN")}) − Monthly Interest (₹{monthlyInterest.toLocaleString("en-IN")}) = <b style={{color:th.success}}>{fmtFull(Math.round(emi-monthlyInterest))}</b></div>
            <div>• Payoff Months = −ln(1 − Outstanding × MonthlyRate ÷ EMI) ÷ ln(1 + MonthlyRate) = <b style={{color:th.text}}>{months} months</b></div>
            <div>• Total Payable = EMI × Months = {fmtFull(emi)} × {months} = <b style={{color:th.text}}>{fmtFull(totalPayable)}</b></div>
            <div>• Total Interest = Total Payable − Outstanding = {fmtFull(totalPayable)} − {fmtFull(outstanding)} = <b style={{color:th.danger}}>{fmtFull(totalInterest)}</b></div>
          </div>
        </div>
      )}
      {/* Balance milestones */}
      {months>0&&(
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:700,color:th.isDark?"#c490a8":th.accentL,marginBottom:6,fontFamily:th.serif}}>📅 Balance Milestones</div>
          {[3,6,12,24,36].filter(m=>m<months).map(m=>{
            const nwBal=outstanding*Math.pow(1+mr,m)-emi*((Math.pow(1+mr,m)-1)/mr);
            const pctPaid=((outstanding-Math.max(0,nwBal))/outstanding*100);
            return (
              <div key={m} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${th.border}`}}>
                <span style={{fontSize:10,color:th.text}}>After {m} month{m>1?"s":""}</span>
                <span style={{fontSize:10,color:th.success}}>{pctPaid.toFixed(1)}% paid</span>
                <span style={{fontSize:11,color:th.danger,fontWeight:600,fontFamily:th.serif}}>{fmtFull(Math.max(0,nwBal))} left</span>
              </div>
            );
          })}
        </div>
      )}
      {/* Extra payment scenarios */}
      {!isInfinite&&(
        <div style={{background:th.isDark?"rgba(16,185,129,0.08)":"#f0fdf4",borderRadius:12,padding:12,border:`1px solid ${th.isDark?"#064e3b":"#bbf7d0"}`,marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:700,color:th.success,marginBottom:8,fontFamily:th.serif}}>💡 Extra Payment Strategies</div>
          {[{label:"Pay 20% Extra",amount:extra20,faster:months-mFaster20,saved:intSaved20},{label:"Pay 50% Extra",amount:extra50,faster:months-mFaster50,saved:intSaved50}].map(({label,amount,faster,saved})=>(
            <div key={label} style={{background:th.isDark?"rgba(255,255,255,0.05)":th.bg,borderRadius:8,padding:"8px 10px",marginBottom:6,border:`1px solid ${th.isDark?"#064e3b":"#bbf7d0"}`}}>
              <div style={{fontSize:11,fontWeight:700,color:th.success,marginBottom:2}}>{label} → EMI: {fmtFull(amount)}/mo</div>
              <div style={{fontSize:10,color:th.textMuted}}>⚡ {faster>0?`${faster} months faster (done in ${mFaster20||mFaster50} months)`:"Not enough data"}</div>
              <div style={{fontSize:10,color:th.textMuted}}>💰 Interest saved: <b style={{color:th.success}}>{fmtFull(saved)}</b></div>
            </div>
          ))}
          <div style={{fontSize:10,color:th.textMuted,marginTop:4,fontStyle:"italic"}}>* Any amount freed after loan payoff can be redirected to investments 📈</div>
        </div>
      )}
      {/* Graph */}
      {!isInfinite&&graphPts.length>1&&(
        <>
          <button onClick={()=>setShowGraph(o=>!o)} style={{width:"100%",background:"none",border:`1px dashed ${th.border}`,borderRadius:10,padding:"8px",cursor:"pointer",fontSize:11,fontWeight:700,color:th.isDark?"#c490a8":th.accentL,fontFamily:th.font,marginBottom:4}}>
            {showGraph?"▲ Hide Graph":"📉 Show Repayment Graph"}
          </button>
          {showGraph&&(
            <div className="fi" style={{marginBottom:10}}>
              <div style={{fontSize:10,color:th.textMuted,marginBottom:6,fontFamily:th.serif}}>OUTSTANDING BALANCE OVER TIME</div>
              <svg width="100%" viewBox={`0 0 ${GW} ${GH+20}`} style={{overflow:"visible"}}>
                {[0,0.25,0.5,0.75,1].map(p=>(
                  <g key={p}>
                    <line x1={PAD} y1={GH*(1-p)} x2={GW-10} y2={GH*(1-p)} stroke={th.isDark?"#2a1a28":"#fce7f3"} strokeWidth="1"/>
                    <text x={PAD-2} y={GH*(1-p)+3} textAnchor="end" fontSize="7" fill={th.textMuted}>{fmt(outstanding*p)}</text>
                  </g>
                ))}
                <polygon points={[...graphPts.map((p,i)=>{const x=PAD+(i/(graphPts.length-1))*(GW-PAD-10);const y=GH*(p.balance/outstanding);return`${x},${y}`;}),`${GW-10},${GH}`,`${PAD},${GH}`].join(" ")} fill={`${th.danger}15`}/>
                <polyline points={graphPts.map((p,i)=>{const x=PAD+(i/(graphPts.length-1))*(GW-PAD-10);const y=GH*(p.balance/outstanding);return`${x},${y}`;}).join(" ")} fill="none" stroke={th.isDark?"#e91e8c":th.accentL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                {graphPts.filter((_,i)=>i%(Math.ceil(graphPts.length/4))===0||i===graphPts.length-1).map((p,i)=>{
                  const idx=graphPts.indexOf(p);
                  const x=PAD+(idx/(graphPts.length-1))*(GW-PAD-10);
                  return <text key={i} x={x} y={GH+14} textAnchor="middle" fontSize="7" fill={th.textMuted}>{p.label}</text>;
                })}
              </svg>
              {/* Principal vs Interest bars */}
              {schedule.length>0&&(
                <>
                  <div style={{marginTop:12,fontSize:10,color:th.textMuted,marginBottom:6,fontFamily:th.serif}}>PRINCIPAL vs INTEREST — FIRST 12 MONTHS</div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:3,height:60}}>
                    {schedule.slice(0,12).map((row,i)=>{
                      const total2=row.principal+row.interest||1;
                      return (
                        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",height:"100%",justifyContent:"flex-end",gap:1}}>
                          <div style={{height:`${row.interest/total2*100}%`,background:"#f97316",borderRadius:"2px 2px 0 0",minHeight:row.interest>0?2:0}}/>
                          <div style={{height:`${row.principal/total2*100}%`,background:th.success,borderRadius:"0",minHeight:row.principal>0?2:0}}/>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{display:"flex",gap:16,marginTop:6,justifyContent:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:th.textMuted}}>
                      <div style={{width:8,height:8,borderRadius:2,background:th.success}}/>Principal
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:th.textMuted}}>
                      <div style={{width:8,height:8,borderRadius:2,background:"#f97316"}}/>Interest
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
      {/* Repayment Schedule */}
      {!isInfinite&&schedule.length>0&&(
        <>
          <button onClick={()=>setShowSchedule(o=>!o)} style={{width:"100%",background:"none",border:`1px dashed ${th.border}`,borderRadius:10,padding:"8px",cursor:"pointer",fontSize:11,fontWeight:700,color:th.isDark?"#c490a8":th.accentL,fontFamily:th.font}}>
            {showSchedule?"▲ Hide Schedule":"📅 Show Repayment Schedule"}
          </button>
          {showSchedule&&(
            <div className="fi" style={{maxHeight:280,overflowY:"auto",marginTop:8}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,fontFamily:th.font}}>
                <thead>
                  <tr style={{background:th.isDark?"rgba(255,255,255,0.05)":th.bg}}>
                    {["Month","EMI","Principal","Interest","Balance"].map(h=>(
                      <td key={h} style={{padding:"6px 4px",fontSize:9,color:th.textMuted,fontWeight:700}}>{h}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.slice(0,48).map((row,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${th.border}`}}>
                      <td style={{padding:"5px 4px",color:th.textMuted,fontSize:9}}>{row.label}</td>
                      <td style={{padding:"5px 4px",color:th.text}}>{fmt(row.emi)}</td>
                      <td style={{padding:"5px 4px",color:th.success}}>{fmt(row.principal)}</td>
                      <td style={{padding:"5px 4px",color:"#f97316"}}>{fmt(row.interest)}</td>
                      <td style={{padding:"5px 4px",color:row.balance===0?th.success:th.danger,fontWeight:row.balance===0?700:400}}>{row.balance===0?"Paid ✓":fmt(row.balance)}</td>
                    </tr>
                  ))}
                  {schedule.length>48&&<tr><td colSpan={5} style={{padding:"6px 4px",color:th.textMuted,fontSize:9,textAlign:"center"}}>... {schedule.length-48} more months</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Sec>
  );
}

// ── SPENDING TAB (Vaishali) ───────────────────────────────────────────────────
function SpendingTab({data,upd,setData,th,spendDraft,setSpendDraft}){
  const {salary,month,target,spend,note}=spendDraft;
  const setSalary=v=>setSpendDraft(d=>({...d,salary:v}));
  const setMonth=v=>setSpendDraft(d=>({...d,month:v}));
  const setTarget=v=>setSpendDraft(d=>({...d,target:v}));
  const setSpend=fn=>setSpendDraft(d=>({...d,spend:fn(d.spend)}));
  const setNote=v=>setSpendDraft(d=>({...d,note:v}));
  const totalSpent=Object.values(spend).reduce((s,v)=>s+(+v||0),0);
  const savedRaw=(+salary||0)-totalSpent;
  const saved=Math.max(0,savedRaw);
  const savedPct=salary>0?savedRaw/salary*100:0;
  const spendPct=salary>0?totalSpent/salary*100:0;
  const tgt=+target||50;
  const onTrack=savedPct>=tgt;
  const sc=onTrack?th.success:savedPct>=tgt*0.7?"#d97706":th.danger;
  const nonZero=SPEND_CATS.filter(c=>+spend[c.key]>0);
  const total=totalSpent||1;
  const SpendPie=()=>{
    if(nonZero.length===0) return null;
    let cum=0; const cx=65,cy=65,r=52;
    const slices=nonZero.map(c=>{const pct=+spend[c.key]/total;const a=pct*360;const s=cum;cum+=a;return{...c,pct,angle:a,start:s};});
    const toXY=(cx2,cy2,r2,deg)=>{const rad=(deg-90)*Math.PI/180;return{x:cx2+r2*Math.cos(rad),y:cy2+r2*Math.sin(rad)};};
    return (
      <svg width="130" height="130" viewBox="0 0 130 130">
        {slices.map((s,i)=>{if(s.angle<0.5)return null;const p1=toXY(cx,cy,r,s.start),p2=toXY(cx,cy,r,s.start+s.angle);const lg=s.angle>180?1:0;return<path key={i} d={`M${cx},${cy} L${p1.x},${p1.y} A${r},${r},0,${lg},1,${p2.x},${p2.y} Z`} fill={s.col} stroke={th.cardBg} strokeWidth="1.5"/>;})}
        <circle cx={cx} cy={cy} r={26} fill={th.cardBg}/>
        <text x={cx} y={cy-3} textAnchor="middle" fill={th.isDark&&th.isVaishali?"#e91e8c":th.accent} fontSize="8" fontWeight="700">Spent</text>
        <text x={cx} y={cy+8} textAnchor="middle" fill={th.textMuted} fontSize="7">{fmt(totalSpent)}</text>
      </svg>
    );
  };
  const saveMonth=()=>{
    if(!salary) return;
    setData(p=>({...p,spendHistory:[...(p.spendHistory||[]),{month,salary:+salary,spend:{...spend},totalSpent,saved,savedPct,note}]}));
    setSpendDraft({salary:0,month:new Date().toLocaleString("default",{month:"long"})+" "+new Date().getFullYear(),target:+target,spend:mkSpend(),note:""});
  };
  const INP={width:"100%",border:`1.5px solid ${th.border}`,borderRadius:10,padding:"8px 12px",fontSize:13,color:th.text,background:th.input,outline:"none",boxSizing:"border-box",fontFamily:th.font};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <QStrip q="Track every rupee — because a queen knows where her money goes. 👑" th={th}/>
      {+salary>0&&spendPct>50&&(
        <div style={{background:th.isDark?"rgba(220,38,38,0.15)":"#fff1f2",border:`2px solid ${th.danger}`,borderRadius:16,padding:"14px 16px"}}>
          <div style={{fontWeight:700,color:th.danger,fontSize:14,marginBottom:4}}>⚠️ Spending Alert 💸</div>
          <div style={{fontSize:12,color:th.isDark?"#fca5a5":th.danger}}>Spending is <strong>{spendPct.toFixed(1)}%</strong> of income — above 50%.</div>
        </div>
      )}
      <Sec title="📅 Month & Income" th={th}>
        <F label="Month" value={month} onChange={setMonth} placeholder="e.g. May 2025" th={th}/>
        <F label="Salary / Income (₹)" type="number" value={salary} onChange={setSalary} placeholder="Amount credited" th={th}/>
        <F label="Savings Target (%)" type="number" value={target} onChange={setTarget} placeholder="e.g. 50" th={th}/>
      </Sec>
      <Sec title="💸 Expenses by Category" th={th}>
        {SPEND_CATS.map(c=>(
          <div key={c.key} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{fontSize:18,width:24}}>{c.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:th.text,fontWeight:700,marginBottom:2}}>{c.label}</div>
              <input style={{...INP,borderColor:+spend[c.key]>0?c.col:th.border}} type="number" value={spend[c.key]||""} placeholder="₹ 0" onChange={e=>setSpend(p=>({...p,[c.key]:+e.target.value}))}/>
            </div>
            {+spend[c.key]>0&&<div style={{fontSize:11,fontWeight:700,color:c.col,minWidth:50,textAlign:"right"}}>{fmt(+spend[c.key])}</div>}
          </div>
        ))}
        <F label="Notes / Remarks" value={note} onChange={setNote} placeholder="e.g. vacation month..." th={th}/>
      </Sec>
      {(+salary>0||totalSpent>0)&&(
        <>
          <div style={{background:th.cardBg,border:`2px solid ${sc}`,borderRadius:16,padding:16,textAlign:"center"}}>
            <div style={{fontSize:26}}>{onTrack?"💅":"🌷"}</div>
            <div style={{fontFamily:th.serif,fontSize:16,fontWeight:700,color:sc,marginBottom:4}}>{onTrack?`On track! Saved ${savedPct.toFixed(1)}%`:`Savings at ${savedPct.toFixed(1)}%`}</div>
            <div style={{height:14,background:th.isDark?"rgba(255,255,255,0.1)":th.bg,borderRadius:10,margin:"8px 0"}}>
              <div style={{width:`${Math.min(100,savedPct)}%`,height:"100%",background:sc,borderRadius:10,transition:"width .5s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:th.text}}>
              <span>Spent: {fmtFull(totalSpent)}</span>
              <span style={{fontWeight:700,color:sc}}>Saved: {fmtFull(saved)}</span>
              <span>Income: {fmtFull(+salary)}</span>
            </div>
          </div>
          {nonZero.length>0&&(
            <Sec title="📊 Spending Breakdown" th={th}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
                <SpendPie/>
                <div style={{flex:1,minWidth:130}}>
                  {nonZero.sort((a,b)=>(+spend[b.key])-(+spend[a.key])).map(c=>(
                    <div key={c.key} style={{marginBottom:6}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:1}}>
                        <span style={{color:th.text}}>{c.emoji} {c.label}</span>
                        <span style={{color:c.col,fontWeight:700}}>{fmt(+spend[c.key])}</span>
                      </div>
                      <div style={{height:5,background:th.isDark?"rgba(255,255,255,0.1)":th.bg,borderRadius:3,overflow:"hidden"}}>
                        <div style={{width:`${(+spend[c.key]/total*100).toFixed(1)}%`,height:"100%",background:c.col,borderRadius:3}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Sec>
          )}
          <button style={{display:"block",width:"100%",background:`linear-gradient(90deg,${th.accentL},${th.accent})`,color:"#fff",border:"none",borderRadius:12,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:th.font}} onClick={saveMonth}>Save This Month's Record</button>
        </>
      )}
      {(data.spendHistory||[]).length>0&&(
        <>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>exportSpendingCSV(data.spendHistory||[])} style={{flex:1,padding:"10px",background:th.isDark?"#1e3a5f":"#eff6ff",color:th.isDark?"#93c5fd":"#1d4ed8",border:`1.5px solid ${th.isDark?"#1d4ed8":"#93c5fd"}`,borderRadius:12,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:th.font}}>📄 Export CSV</button>
            <button onClick={()=>exportSpendingExcel(data.spendHistory||[])} style={{flex:1,padding:"10px",background:th.isDark?"rgba(250,168,212,0.15)":"#fff0f6",color:th.accentL,border:`1.5px solid ${th.accentL}`,borderRadius:12,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:th.font}}>📗 Export Excel</button>
          </div>
          <Sec title="📅 Spending History" th={th}>
            {(data.spendHistory||[]).map((h,i)=>{
              const topCat=SPEND_CATS.filter(c=>+h.spend[c.key]>0).sort((a,b)=>+h.spend[b.key]-+h.spend[a.key]).slice(0,3);
              return (
                <div key={i} style={{background:th.bg,borderRadius:12,padding:12,marginBottom:8,border:`1px solid ${th.border}`}}>
                  <div style={{fontWeight:700,color:th.accentL,fontFamily:th.serif}}>{h.month}</div>
                  <div style={{display:"flex",gap:12,fontSize:11,color:th.text,margin:"4px 0"}}>
                    <span>💰 {fmtFull(h.salary)}</span><span>💸 {fmtFull(h.totalSpent)}</span>
                    <span style={{color:h.savedPct>=tgt?th.success:th.danger,fontWeight:700}}>{h.savedPct.toFixed(1)}% saved</span>
                  </div>
                  {topCat.length>0&&<div style={{fontSize:10,color:th.text}}>Top: {topCat.map(c=>`${c.emoji} ${c.label}: ${fmt(+h.spend[c.key])}`).join(" · ")}</div>}
                </div>
              );
            })}
          </Sec>
        </>
      )}
    </div>
  );
}

// ── AI SUGGESTIONS ────────────────────────────────────────────────────────────
function AISuggestions({data,summary,targetAmt,targetYr,growth,extra,th}){
  const [suggestions,setSuggestions]=useState([]);
  const [loading,setLoading]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const now=new Date();
  const yearsLeft=targetYr-now.getFullYear();
  const monthsLeft=yearsLeft*12-now.getMonth();
  const gap=targetAmt-summary.netWorth;
  const monthlyNeeded=monthsLeft>0?Math.round(gap/monthsLeft):0;
  const fetchSuggestions=async()=>{
    setLoading(true);
    try{
      const name=th.isVaishali?"Vaishali":"Prajay";
      const prompt=`You are a personal finance advisor for an Indian ${th.isVaishali?"woman":"man"} named ${name}. Give 6 highly specific, actionable suggestions to reach their wealth goal.\n\nProfile:\n- Net Worth: ₹${summary.netWorth.toLocaleString("en-IN")}\n- Total Assets: ₹${summary.totalAssets.toLocaleString("en-IN")}\n- Total Liabilities: ₹${summary.totalLiabilities.toLocaleString("en-IN")}\n- Monthly EMI: ₹${summary.monthlyEMI.toLocaleString("en-IN")}\n- Wealth Goal: ₹${targetAmt.toLocaleString("en-IN")} by ${targetYr}\n- Monthly savings needed: ₹${monthlyNeeded.toLocaleString("en-IN")}\n\nReturn ONLY a JSON array of exactly 6 objects: "emoji","title"(max 5 words),"suggestion"(2-3 sentences),"impact":"high"|"medium"|"low","category":"invest"|"save"|"debt"|"income"|"protect". No preamble, no markdown.`;
      const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
      const result=await response.json();
      const text=result.content?.map(c=>c.text||"").join("")||"[]";
      setSuggestions(JSON.parse(text.replace(/```json|```/g,"").trim()));
      setLoaded(true);
    }catch(e){
      setSuggestions([{emoji:"💡",title:"Start SIPs immediately",suggestion:"Begin a monthly SIP of ₹5,000+ in a diversified equity mutual fund for long-term wealth.",impact:"high",category:"invest"},{emoji:"💳",title:"Clear high-interest debt",suggestion:"Pay off credit card and LazyPay dues — they charge 36-42% p.a. and erode wealth.",impact:"high",category:"debt"},{emoji:"🏦",title:"Build emergency fund",suggestion:"Keep 3-6 months of expenses in a high-yield savings account before investing.",impact:"medium",category:"protect"}]);
      setLoaded(true);
    }
    setLoading(false);
  };
  const impactColor=(impact)=>impact==="high"?"#4ade80":impact==="medium"?"#fbbf24":"#94a3b8";
  const catColor=(cat)=>({invest:"#8b5cf6",save:"#3b82f6",debt:"#f87171",income:"#10b981",protect:"#f59e0b"})[cat]||"#6b7280";
  const isP=!th.isVaishali;
  return (
    <div>
      {!loaded&&(
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <button onClick={fetchSuggestions} disabled={loading} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"14px 24px",background:isP?(th.isDark?"#f5f5f5":"#0a0a0a"):`linear-gradient(90deg,${th.accentL},${th.accentD})`,color:isP?(th.isDark?"#000":"#fff"):"#fff",border:"none",borderRadius:16,fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",fontFamily:th.font,opacity:loading?0.7:1}}>
            {loading?(<><span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>{isP?"◆":"🌸"}</span> Analysing…</>):(isP?"Get AI Suggestions ◆":"✨ Get My Wealth Suggestions 👑")}
          </button>
        </div>
      )}
      {loaded&&suggestions.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {suggestions.map((s,i)=>(
            <div key={i} style={{background:th.isDark?th.cardBg:th.cardBg,borderRadius:16,padding:"14px 16px",border:`1.5px solid ${th.border}`,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:4,background:impactColor(s.impact),borderRadius:"4px 0 0 4px"}}/>
              <div style={{paddingLeft:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:20}}>{s.emoji}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:th.text,fontFamily:th.serif}}>{s.title}</div>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    <span style={{fontSize:9,background:catColor(s.category)+"22",color:catColor(s.category),borderRadius:6,padding:"2px 6px",fontWeight:700,textTransform:"uppercase"}}>{s.category}</span>
                    <span style={{fontSize:9,background:impactColor(s.impact)+"22",color:impactColor(s.impact),borderRadius:6,padding:"2px 6px",fontWeight:700,textTransform:"uppercase"}}>{s.impact}</span>
                  </div>
                </div>
                <div style={{fontSize:12,color:th.textMuted,lineHeight:1.6}}>{s.suggestion}</div>
              </div>
            </div>
          ))}
          <button onClick={fetchSuggestions} disabled={loading} style={{padding:"10px",marginTop:4,background:"transparent",border:`1.5px dashed ${th.border}`,borderRadius:12,fontSize:12,fontWeight:700,color:th.textMuted,cursor:"pointer",fontFamily:th.font}}>
            {loading?"Refreshing...":"🔄 Refresh Suggestions"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── PROJECTION TAB ────────────────────────────────────────────────────────────
function ProjectionTab({data,summary,th}){
  const [targetAmt,setTargetAmt]=useState(0);
  const [targetYr,setTargetYr]=useState(new Date().getFullYear()+5);
  const [growth,setGrowth]=useState(0);
  const [extra,setExtra]=useState(0);
  const now=new Date(); const ny=now.getFullYear(),nm=now.getMonth();
  const hasTarget=targetAmt>0&&targetYr>ny&&growth>0;
  const months=useMemo(()=>{
    if(!hasTarget) return [];
    const rows=[]; let nw=summary.netWorth;
    const mg=(1+growth/100)**(1/12)-1;
    const total=(targetYr-ny)*12+(11-nm);
    for(let i=0;i<=Math.min(total,60);i++){
      const d=new Date(ny,nm+i,1);
      rows.push({label:`${d.toLocaleString("default",{month:"short"})} ${d.getFullYear()}`,nw:Math.round(nw)});
      nw=nw*(1+mg)+(+extra||0);
    }
    return rows;
  },[summary.netWorth,growth,extra,targetYr,hasTarget]);
  const finalNW=months[months.length-1]?.nw||summary.netWorth;
  const onTrack=hasTarget&&finalNW>=targetAmt;
  const gap=targetAmt>0?targetAmt-finalNW:0;
  const yearsLeft=targetYr-ny;
  const monthsLeft=yearsLeft*12-nm;
  const needed=useMemo(()=>{
    if(!hasTarget||monthsLeft<=0) return 0;
    const mg=(1+growth/100)**(1/12)-1;
    const rn=(1+mg)**monthsLeft;
    return Math.max(0,Math.round((targetAmt-summary.netWorth*rn)*mg/(rn-1)));
  },[summary.netWorth,targetAmt,targetYr,growth,hasTarget,monthsLeft]);

  // How much loan payoff frees up
  const loanFreeup=summary.monthlyEMI; // after paying off loans, this becomes savings
  const savingsGap=Math.max(0,needed-(+extra||0));
  const fromLoans=Math.min(loanFreeup,savingsGap);
  const stillNeeded=Math.max(0,savingsGap-fromLoans);

  const LineChart=()=>{
    const pts=months.filter((_,i)=>i%3===0||i===months.length-1);
    if(pts.length<2) return null;
    const W=340,H=120,PAD=30;
    const maxV=Math.max(...pts.map(p=>p.nw),targetAmt);
    const minV=Math.min(...pts.map(p=>p.nw),0);
    const range=maxV-minV||1;
    const x=(i)=>PAD+(i/(pts.length-1))*(W-PAD*2);
    const y=(v)=>H-10-(v-minV)/range*(H-30);
    const path=pts.map((p,i)=>`${i===0?"M":"L"}${x(i)},${y(p.nw)}`).join(" ");
    const tY=y(targetAmt);
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        <line x1={PAD} y1={tY} x2={W-PAD} y2={tY} stroke={th.success} strokeWidth="1" strokeDasharray="4,3" opacity="0.7"/>
        <text x={W-PAD+2} y={tY+4} fontSize="8" fill={th.success}>Goal</text>
        <path d={path} fill="none" stroke={th.isDark&&th.isVaishali?"#e91e8c":th.accentL} strokeWidth="2.5" strokeLinecap="round"/>
        {pts.map((p,i)=><circle key={i} cx={x(i)} cy={y(p.nw)} r="3" fill={p.nw>=targetAmt?th.success:(th.isDark&&th.isVaishali?"#e91e8c":th.accentL)}/>)}
      </svg>
    );
  };
  const isP=!th.isVaishali;
  if(isP) return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <PCard title="Wealth Goal" th={th}>
        <PField label="TARGET NET WORTH (₹)" type="number" value={targetAmt||""} onChange={v=>setTargetAmt(+v)} placeholder="Enter your target amount" th={th}/>
        <PField label="TARGET YEAR" type="number" value={targetYr} onChange={v=>setTargetYr(+v)} placeholder={`e.g. ${ny+5}`} th={th}/>
        <PField label="EXPECTED GROWTH (% p.a.)" type="number" value={growth||""} onChange={v=>setGrowth(+v)} placeholder="e.g. 10" th={th}/>
        <PField label="EXTRA MONTHLY SAVINGS (₹)" type="number" value={extra||""} onChange={v=>setExtra(+v)} placeholder="Additional savings per month" th={th}/>
        {!hasTarget&&<div style={{fontSize:11,color:th.textMuted,textAlign:"center",padding:"8px 0"}}>Enter target amount, year, and growth rate to see projections</div>}
      </PCard>
      {hasTarget&&(
        <>
        <div className="pcard" style={{background:th.cardBg,border:`2px solid ${onTrack?th.success:th.danger}`,borderRadius:18,padding:16,textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:4}}>{onTrack?"◆":"→"}</div>
          <div style={{fontSize:16,fontWeight:700,color:onTrack?th.success:th.danger,marginBottom:4,fontFamily:"'DM Mono',monospace"}}>{onTrack?`On Track — ${fmtFull(finalNW)}`:`Gap: ${fmtFull(Math.abs(gap))}`}</div>
          <div style={{fontSize:12,color:th.textMuted}}>{onTrack?`You'll hit ${fmtFull(targetAmt)} by ${targetYr}`:`Need ₹${needed.toLocaleString("en-IN")}/month more`}</div>
        </div>
        <PCard title="Net Worth Projection" th={th}>
          <LineChart/>
          <div style={{marginTop:8}}>
            {months.filter((_,i)=>i%6===0||i===months.length-1).map((m,i)=>{
              const pct=Math.min(100,m.nw/targetAmt*100);
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <span style={{fontSize:10,color:th.text,minWidth:65,fontFamily:"'DM Mono',monospace"}}>{m.label}</span>
                  <div style={{flex:1,height:7,background:th.isDark?"rgba(255,255,255,0.1)":th.bg,borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${pct}%`,height:"100%",background:m.nw>=targetAmt?th.success:th.accentL,borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:600,color:m.nw>=targetAmt?th.success:th.text,minWidth:65,textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{fmt(m.nw)}</span>
                </div>
              );
            })}
          </div>
        </PCard>
        {/* Detailed plan */}
        <PCard title="📐 How To Reach Your Goal" th={th}>
          <div style={{fontSize:12,color:th.text,marginBottom:12,lineHeight:1.7}}>
            <div style={{marginBottom:6,fontWeight:700,fontFamily:"'DM Mono',monospace",color:th.success}}>Current Situation:</div>
            <div>• Current Net Worth: <b>{fmtFull(summary.netWorth)}</b></div>
            <div>• Target: <b>{fmtFull(targetAmt)}</b> by <b>{targetYr}</b> ({yearsLeft} years left)</div>
            <div>• Gap to fill: <b style={{color:th.danger}}>{fmtFull(Math.max(0,targetAmt-summary.netWorth))}</b></div>
            <div>• Growth assumed: <b>{growth}% p.a.</b></div>
          </div>
          {!onTrack&&(
            <div style={{background:th.isDark?"rgba(255,255,255,0.04)":"#f8f8f8",borderRadius:10,padding:10,marginBottom:10,border:`1px solid ${th.border}`}}>
              <div style={{fontSize:11,fontWeight:700,color:th.danger,marginBottom:6}}>💸 Additional Monthly Savings Needed: {fmtFull(needed)}/month</div>
              <div style={{fontSize:10,color:th.textMuted,lineHeight:1.7}}>
                <div>• From redirecting EMI payments (after loan payoff): <b style={{color:th.success}}>{fmtFull(fromLoans)}/month</b></div>
                <div>• Still needed from new savings: <b style={{color:th.danger}}>{fmtFull(stillNeeded)}/month</b></div>
                {fromLoans>0&&<div style={{marginTop:4,fontSize:9,color:th.textMuted}}>Tip: Pay off loans early → redirect ₹{loanFreeup.toLocaleString("en-IN")}/mo EMI to investments</div>}
              </div>
            </div>
          )}
          <div style={{fontSize:10,color:th.textMuted,lineHeight:1.7}}>
            <div style={{fontWeight:700,color:th.success,marginBottom:4}}>Suggested Action Plan:</div>
            {needed>0&&<div>1️⃣ Increase SIPs/investments by <b>{fmtFull(stillNeeded)}/month</b> — at {growth}% returns, this grows significantly</div>}
            {loanFreeup>0&&<div>2️⃣ After paying off loans, redirect your <b>{fmtFull(loanFreeup)}/month</b> EMI into mutual funds</div>}
            <div>3️⃣ Review and boost growth rate via equity investments (target 12-15% p.a.)</div>
            <div>4️⃣ Avoid lifestyle inflation — every saved rupee compounds powerfully</div>
          </div>
        </PCard>
        <PCard title="AI Suggestions" th={th}>
          <AISuggestions data={data} summary={summary} targetAmt={targetAmt} targetYr={targetYr} growth={growth} extra={extra} th={th}/>
        </PCard>
        </>
      )}
    </div>
  );
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <QStrip q="She who plans today, rules tomorrow. 💅" th={th}/>
      <Sec title="🎯 Set Your Wealth Goal" th={th}>
        <F label="Target Net Worth (₹)" type="number" value={targetAmt||""} onChange={v=>setTargetAmt(+v)} placeholder="Enter your target amount" th={th}/>
        <F label="Target Year" type="number" value={targetYr} onChange={v=>setTargetYr(+v)} placeholder={`e.g. ${ny+5}`} th={th}/>
        <F label="Expected Annual Growth (%)" type="number" value={growth||""} onChange={v=>setGrowth(+v)} placeholder="e.g. 10" th={th}/>
        <F label="Additional Monthly Savings (₹)" type="number" value={extra||""} onChange={v=>setExtra(+v)} placeholder="Extra savings per month" th={th}/>
        {!hasTarget&&<div style={{fontSize:11,color:th.textMuted,textAlign:"center",padding:"8px 0",fontStyle:"italic"}}>Enter target amount, year, and growth rate to see projections 💐</div>}
      </Sec>
      {hasTarget&&(
        <>
        <div style={{background:th.isDark&&th.isVaishali?"#2a1020":th.cardBg,border:`2px solid ${onTrack?th.success:(th.isDark&&th.isVaishali?"#e91e8c":th.accentL)}`,borderRadius:16,padding:16,textAlign:"center"}}>
          <div style={{fontSize:24}}>{onTrack?"💅":"🌷"}</div>
          <div style={{fontFamily:th.serif,fontSize:16,fontWeight:700,color:onTrack?th.success:(th.isDark&&th.isVaishali?"#e91e8c":th.accentL),marginBottom:4}}>{onTrack?`On Track! Projected ${fmtFull(finalNW)}`:`Gap: ${fmtFull(Math.abs(gap))}`}</div>
          <div style={{fontSize:12,color:th.text}}>{onTrack?`You'll hit ${fmtFull(targetAmt)} by ${targetYr}`:`Save ₹${needed.toLocaleString("en-IN")}/month more`}</div>
        </div>
        <Sec title="📈 Net Worth Projection" th={th}>
          <LineChart/>
          <div style={{marginTop:8}}>
            {months.filter((_,i)=>i%6===0||i===months.length-1).map((m,i)=>{
              const pct=Math.min(100,m.nw/targetAmt*100);
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <span style={{fontSize:10,color:th.text,minWidth:65}}>{m.label}</span>
                  <div style={{flex:1,height:7,background:th.isDark?"rgba(255,255,255,0.1)":th.bg,borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${pct}%`,height:"100%",background:m.nw>=targetAmt?th.success:(th.isDark&&th.isVaishali?"#e91e8c":th.accentL),borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:600,color:m.nw>=targetAmt?th.success:(th.isDark&&th.isVaishali?"#e91e8c":th.accentL),minWidth:65,textAlign:"right"}}>{fmt(m.nw)}</span>
                </div>
              );
            })}
          </div>
        </Sec>
        {/* Detailed plan for Vaishali */}
        <Sec title="📐 How to Reach Your Target" th={th}>
          <div style={{fontSize:11,color:th.text,lineHeight:1.8}}>
            <div style={{marginBottom:8}}>
              <div style={{fontWeight:700,color:th.isDark?"#c490a8":th.accentL,fontFamily:th.serif,marginBottom:4}}>📊 Your Current Situation:</div>
              <div>• Net Worth today: <b style={{color:th.isDark?"#e91e8c":th.accent}}>{fmtFull(summary.netWorth)}</b></div>
              <div>• Target: <b>{fmtFull(targetAmt)}</b> by <b>{targetYr}</b> ({yearsLeft} years from now)</div>
              <div>• Gap to fill: <b style={{color:th.danger}}>{fmtFull(Math.max(0,targetAmt-summary.netWorth))}</b></div>
              <div>• At {growth}% annual growth, your money already grows by <b>{fmtFull(Math.round(summary.netWorth*growth/100))}</b>/year</div>
            </div>
            {!onTrack&&(
              <div style={{background:th.isDark?"rgba(220,38,38,0.1)":"#fff1f2",borderRadius:10,padding:10,marginBottom:8,border:`1px solid ${th.danger}33`}}>
                <div style={{fontWeight:700,color:th.danger,marginBottom:4}}>💸 Extra monthly savings needed: {fmtFull(needed)}/month</div>
                <div>• Your current EMI burden: <b style={{color:"#f97316"}}>{fmtFull(summary.monthlyEMI)}/month</b></div>
                {fromLoans>0&&<div>• After loan payoffs, redirect EMI as investment: <b style={{color:th.success}}>{fmtFull(fromLoans)}/month</b></div>}
                {stillNeeded>0&&<div>• Net new savings still needed: <b style={{color:th.danger}}>{fmtFull(stillNeeded)}/month</b></div>}
              </div>
            )}
            <div style={{fontWeight:700,color:th.isDark?"#c490a8":th.accentL,fontFamily:th.serif,marginBottom:4}}>✨ Your Action Plan:</div>
            {needed>0&&<div>1️⃣ Start a SIP of <b>{fmtFull(Math.max(stillNeeded,1000))}/month</b> in an equity mutual fund targeting 12-15% p.a.</div>}
            {loanFreeup>0&&<div>2️⃣ After clearing loans, redirect <b>{fmtFull(loanFreeup)}</b>/month EMI savings into investments</div>}
            <div>3️⃣ Increase income — a salary hike of even {fmtFull(needed)} more/month changes everything</div>
            <div>4️⃣ Avoid lifestyle inflation — stay disciplined with each salary increment</div>
            <div>5️⃣ Review your portfolio every 6 months to stay on track</div>
          </div>
        </Sec>
        <Sec title="✨ Personalised Wealth Advice" th={th}>
          <AISuggestions data={data} summary={summary} targetAmt={targetAmt} targetYr={targetYr} growth={growth} extra={extra} th={th}/>
        </Sec>
        </>
      )}
    </div>
  );
}

// ── SNAPSHOT TAB ──────────────────────────────────────────────────────────────
function SnapshotTab({data,summary,th}){
  const rows=[
    ["Gross Assets",fmtFull(summary.totalAssets),th.success,true],
    [" Cash",fmtFull(summary.cash),"#22c55e",false],
    [" Bank Accounts",fmtFull(summary.bankTotal),"#3b82f6",false],
    [" Fixed Deposits",fmtFull(summary.fdTotal),"#06b6d4",false],
    [" Rec. Deposits",fmtFull(summary.rdTotal),"#14b8a6",false],
    [" Mutual Funds",fmtFull(summary.mfTotal),"#8b5cf6",false],
    [" Stocks",fmtFull(summary.stockTotal),"#f59e0b",false],
    [" Gold & Silver",fmtFull(summary.goldTotal),"#eab308",false],
    [" Real Estate",fmtFull(summary.reTotal),"#f97316",false],
    [" Provident Fund",fmtFull(summary.pfTotal),"#10b981",false],
    ...(!th.isVaishali&&(summary.advanceTotal||0)>0?[[" Advances Given",fmtFull(summary.advanceTotal||0),"#f59e0b",false]]:[]),
    ...(th.isVaishali&&(summary.debtorTotal||0)>0?[[" Debtors (Receivable)",fmtFull(summary.debtorTotal||0),"#06b6d4",false]]:[]),
    ["—"],
    ["Gross Liabilities",fmtFull(summary.totalLiabilities),th.danger,true],
    [" Loans",fmtFull(summary.loanTotal),"#ef4444",false],
    [" Credit Cards",fmtFull(summary.ccTotal),"#f87171",false],
    [" LazyPay",fmtFull(summary.lazyPayTotal||0),"#fb923c",false],
    ...(th.isVaishali&&(summary.creditorTotal||0)>0?[[" Creditors (Payable)",fmtFull(summary.creditorTotal||0),"#ef4444",false]]:[]),
    ["—"],
    ["NET WORTH",fmtFull(summary.netWorth),summary.netWorth>=0?th.accent:th.danger,true],
    ["—"],
    ["Liquid (Cash+Bank)",fmtFull(summary.liquidCash),"#4ec9a0",false],
    ["Free Cash",fmtFull(summary.freeCash),summary.freeCash>=0?"#4ec9a0":"#e05c7a",false],
    ["Locked Investments",fmtFull(summary.lockedInvestments),"#4ec9a0",false],
    ["Monthly EMI",fmtFull(summary.monthlyEMI),"#f97316",false],
  ];
  const isP=!th.isVaishali;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {th.isVaishali&&<QStrip q="Know your numbers. Own your future. 👑" th={th}/>}
      {isP?(
        <PCard title="Full Wealth Snapshot" th={th}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <tbody>
              {rows.map(([l,v,c,bold],i)=>
                l==="—"?<tr key={i}><td colSpan={2} style={{padding:"3px 0"}}><div style={{borderTop:`1px solid ${th.border}`}}/></td></tr>:(
                  <tr key={i}>
                    <td style={{padding:"6px 4px",fontSize:l.startsWith(" ")?11:12,color:th.text,borderBottom:`1px solid ${th.border}`,fontWeight:bold?700:400,fontFamily:bold?"'DM Mono',monospace":"'DM Sans',sans-serif"}}>{l.trim()}</td>
                    <td style={{padding:"6px 4px",fontSize:bold?14:12,textAlign:"right",color:c,fontWeight:bold?700:400,borderBottom:`1px solid ${th.border}`,fontFamily:"'DM Mono',monospace"}}>{v}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <button onClick={()=>exportSnapshotExcel(summary,data)} className="pbtn" style={{display:"block",width:"100%",marginTop:14,padding:"11px",background:th.isDark?"#f5f5f5":"#0a0a0a",color:th.isDark?"#0a0a0a":"#fff",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>📗 Export Excel</button>
        </PCard>
      ):(
        <Sec title="📋 Full Wealth Snapshot" th={th}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <tbody>
              {rows.map(([l,v,c,bold],i)=>
                l==="—"?<tr key={i}><td colSpan={2} style={{padding:"3px 0"}}><div style={{borderTop:`1px solid ${th.border}`}}/></td></tr>:(
                  <tr key={i} style={bold?{background:th.isDark?"rgba(255,255,255,0.04)":th.bg}:{}}>
                    <td style={{padding:"6px 4px",fontSize:l.startsWith(" ")?11:12,color:th.text,borderBottom:`1px solid ${th.border}`,fontWeight:bold?700:400,fontFamily:th.font}}>{l.trim()}</td>
                    <td style={{padding:"6px 4px",fontSize:bold?14:12,textAlign:"right",color:c,fontWeight:bold?700:400,borderBottom:`1px solid ${th.border}`,fontFamily:bold?th.serif:th.font}}>{v}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <button onClick={()=>exportSnapshotExcel(summary,data)} style={{display:"block",width:"100%",marginTop:12,padding:"9px",background:`linear-gradient(90deg,${th.accentL},${th.accentD})`,color:"#fff",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:th.font}}>📗 Export Excel</button>
        </Sec>
      )}
    </div>
  );
}

// ── PRAJAY DESIGN SYSTEM ──────────────────────────────────────────────────────
function PCard({title,subtitle,children,th}){
  return (
    <div className="pcard" style={{background:th.cardBg,borderRadius:18,border:`1px solid ${th.border}`,overflow:"hidden"}}>
      {(title||subtitle)&&(
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${th.border}`}}>
          {title&&<div style={{fontSize:13,fontWeight:700,color:th.text}}>{title}</div>}
          {subtitle&&<div style={{fontSize:10,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginTop:2}}>{subtitle}</div>}
        </div>
      )}
      <div style={{padding:"14px 16px"}}>{children}</div>
    </div>
  );
}
function PItem({title,children,onDel,th}){
  const [open,setOpen]=useState(true);
  return (
    <div style={{background:th.isDark?"#1c1c1c":"#f8f8f8",borderRadius:12,marginBottom:8,border:`1px solid ${th.border}`,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px"}}>
        <button onClick={()=>setOpen(o=>!o)} style={{background:"none",border:"none",textAlign:"left",cursor:"pointer",flex:1,padding:0,fontFamily:"'DM Sans',sans-serif"}}>
          <div style={{fontSize:12,fontWeight:600,color:th.text}}>{title}</div>
        </button>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={()=>setOpen(o=>!o)} style={{background:"none",border:"none",cursor:"pointer",color:th.textMuted,fontSize:12}}>{open?"▲":"▼"}</button>
          {onDel&&<button onClick={onDel} style={{background:"none",border:"none",color:th.danger,cursor:"pointer",fontSize:14,padding:"2px"}}>✕</button>}
        </div>
      </div>
      {open&&<div style={{padding:"0 12px 12px",borderTop:`1px solid ${th.border}`}} className="fi">{children}</div>}
    </div>
  );
}
function PField({label,type="text",value,onChange,placeholder,th}){
  return (
    <div style={{marginBottom:8}}>
      <div style={{fontSize:9,color:th.textMuted,fontFamily:"'DM Mono',monospace",marginBottom:4,letterSpacing:.5}}>{label}</div>
      <input style={{width:"100%",border:`1.5px solid ${th.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,color:th.text,background:th.input,outline:"none",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}} type={type} value={value??""} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>
    </div>
  );
}
function PAddBtn({onClick,th}){
  return <button onClick={onClick} style={{display:"block",width:"100%",marginTop:4,padding:"9px",background:"transparent",border:`1.5px dashed ${th.border}`,borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,color:th.textMuted,fontFamily:"'DM Sans',sans-serif"}}>+ Add More</button>;
}
function PValRow({label,value,color,th}){
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderTop:`1px solid ${th.border}`,marginTop:4}}>
      <span style={{fontSize:10,color:th.textMuted}}>{label}</span>
      <span style={{fontSize:13,fontWeight:700,color,fontFamily:"'DM Mono',monospace"}}>{value}</span>
    </div>
  );
}

// ── SHARED COMPONENTS (Vaishali) ──────────────────────────────────────────────
function Sec({title,children,th}){
  return (
    <div style={{background:th.isDark&&th.isVaishali?"#2a1020":th.cardBg,borderRadius:16,padding:14,border:`1.5px solid ${th.isDark&&th.isVaishali?"#4a1a38":th.border}`}}>
      <div style={{fontFamily:th.serif,fontSize:14,fontWeight:700,color:th.isDark&&th.isVaishali?"#d4899a":th.accent,marginBottom:10,borderBottom:`1px solid ${th.isDark&&th.isVaishali?"#4a1a38":th.border}`,paddingBottom:7}}>{title}</div>
      {children}
    </div>
  );
}
function Item({title,children,onDel,th}){
  return (
    <div style={{background:th.isDark&&th.isVaishali?"#1e0a18":th.bg,borderRadius:12,padding:12,marginBottom:10,border:`1.5px solid ${th.isDark&&th.isVaishali?"#3a1530":th.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontFamily:th.serif,fontSize:12,fontWeight:700,color:th.isDark&&th.isVaishali?"#c490a8":th.accentL}}>{title}</div>
        {onDel&&<button onClick={onDel} style={{background:"none",border:"none",color:th.danger,cursor:"pointer",fontSize:14,padding:"2px 6px"}}>✕</button>}
      </div>
      {children}
    </div>
  );
}
function F({label,type="text",value,onChange,placeholder,th}){
  return (
    <div style={{marginBottom:8}}>
      <label style={{display:"block",fontSize:10,color:th.isDark&&th.isVaishali?"#c490a8":th.accent,marginBottom:2,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{label}</label>
      <input style={{width:"100%",border:`1.5px solid ${th.isDark&&th.isVaishali?"#4a1a38":th.border}`,borderRadius:10,padding:"8px 12px",fontSize:13,color:th.isDark&&th.isVaishali?"#f0c8d8":th.text,background:th.isDark&&th.isVaishali?"#1e0a18":th.input,outline:"none",boxSizing:"border-box",fontFamily:th.font}} type={type} value={value??""} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>
    </div>
  );
}
function Add({onClick,th}){
  return <button onClick={onClick} style={{display:"block",width:"100%",marginTop:4,padding:"8px",background:"transparent",border:`1.5px dashed ${th.isDark&&th.isVaishali?"#6b3a52":th.accentL}`,borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,color:th.isDark&&th.isVaishali?"#c490a8":th.accentL,fontFamily:th.font}}>+ Add More</button>;
}
function Total({children,red,th}){
  return <div style={{textAlign:"right",fontSize:13,fontWeight:700,color:red?th.danger:th.success,marginTop:6,padding:"6px 4px",borderTop:`1px solid ${th.border}`,fontFamily:th.serif}}>Total: {children}</div>;
}
function Cv({children,red,th}){
  return <div style={{fontSize:12,fontWeight:700,color:red?th.danger:th.success,marginTop:4,padding:"4px 0",fontFamily:th.serif}}>{children}</div>;
}
function Empty({text,th}){
  return <div style={{color:th.textMuted,fontSize:12,padding:"8px 0",textAlign:"center",fontStyle:"italic"}}>{text}</div>;
}
function QStrip({q,th}){
  return (
    <div style={{background:th.isDark&&th.isVaishali?"rgba(233,30,140,0.08)":"rgba(190,24,93,0.06)",borderRadius:10,padding:"8px 12px",marginBottom:8,borderLeft:`3px solid ${th.isDark&&th.isVaishali?"#e91e8c":th.accentL}`}}>
      <div style={{fontSize:11,color:th.isDark&&th.isVaishali?"#c490a8":th.accentL,fontStyle:"italic",fontFamily:th.serif,lineHeight:1.5}}>❝ {q} ❞</div>
    </div>
  );
}
