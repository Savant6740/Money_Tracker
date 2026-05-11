import { useState, useMemo, useCallback, useEffect, useRef } from "react";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Nunito:wght@400;500;600;700;800&display=swap";

// ── SECURITY CONFIGURATION ────────────────────────────────────────────────────
// These placeholders are replaced by GitHub Actions during deployment via sed.
// Never commit real hashes here — always use the placeholders below.
const PRAJAY_HASH = "__PRAJAY_PWD_HASH_PLACEHOLDER__";
const VAISHALI_HASH = "__VAISHALI_PWD_HASH_PLACEHOLDER__";

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
  {key:"other",label:"Other",emoji:"✨",col:"#6b7280"},
];

const mkSpend = () => { const o={}; SPEND_CATS.forEach(c=>o[c.key]=0); return o; };

const INIT = {
  cash:0, banks:[{id:1,bankName:"",accNumber:"",balance:0}],
  fds:[{id:1,bankName:"",principal:0,rate:0,maturityDate:""}],
  rds:[{id:1,bankName:"",monthly:0,totalDeposited:0,currentValue:0}],
  mfs:[{id:1,name:"",invested:0,growthRate:0}],
  stocks:[], gold:[{id:1,type:"Gold",grams:0,pricePerGram:0}],
  realestate:[{id:1,desc:"",currentValue:0}],
  pf:[{id:1,pfNumber:"",empContrib:0,emplrContrib:0,months:0,existingCorpus:0}],
  loans:[{id:1,name:"",type:"",outstanding:0,rate:0,emi:0}],
  creditCards:[{id:1,bank:"",cardNumber:"",outstanding:0}],
  lazyPay:[{id:1,outstanding:0,dueDate:""}],
  salary:0, spendHistory:[],
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
    const totalAssets=cash+bankTotal+fdTotal+rdTotal+mfTotal+stockTotal+goldTotal+reTotal+pfTotal;
    const loanTotal=data.loans.reduce((s,l)=>s+(+l.outstanding||0),0);
    const ccTotal=data.creditCards.reduce((s,c)=>s+(+c.outstanding||0),0);
    const lazyPayTotal=(data.lazyPay||[]).reduce((s,l)=>s+(+l.outstanding||0),0);
    const totalLiabilities=loanTotal+ccTotal+lazyPayTotal;
    const netWorth=totalAssets-totalLiabilities;
    const liquidCash=cash+bankTotal;
    const lockedInvestments=fdTotal+rdTotal+mfTotal+stockTotal+goldTotal+reTotal+pfTotal;
    const freeCash=liquidCash-ccTotal-lazyPayTotal;
    const monthlyEMI=data.loans.reduce((s,l)=>s+(+l.emi||0),0);
    return {bankTotal,fdTotal,rdTotal,mfTotal,stockTotal,goldTotal,reTotal,pfTotal,cash,
      totalAssets,loanTotal,ccTotal,lazyPayTotal,totalLiabilities,netWorth,liquidCash,
      lockedInvestments,freeCash,monthlyEMI};
  },[data]);
}

const VAISHALI_LIGHT = {
  bg:"#fdf2f8", cardBg:"#ffffff", headerBg:"linear-gradient(135deg,#fce7f3,#fbcfe8,#f9a8d4)",
  border:"#f9a8d4", accent:"#9d174d", accentL:"#be185d", accentD:"#831843",
  text:"#4a044e", textMuted:"#be185d99", tabActive:"#9d174d", tabInactive:"#be185d66",
  tabBar:"#ffffff", input:"#fdf2f8", danger:"#dc2626", success:"#16a34a",
  secBg:"#ffffff", stripBg:"linear-gradient(90deg,#fdf2f8,#fff0f6)",
  font:"'Nunito',sans-serif", serif:"'Playfair Display',serif", isDark:false, isVaishali:true
};

const VAISHALI_DARK = {
  bg:"#130010", cardBg:"#2a1020", headerBg:"linear-gradient(180deg,#2d0820 0%,#1a0510 60%,#130010 100%)",
  border:"#5a2040", accent:"#e91e8c", accentL:"#c490a8", accentD:"#be185d",
  text:"#f0c8d8", textMuted:"#7a5068", tabActive:"#e91e8c", tabInactive:"#7a5068",
  tabBar:"#100008", input:"#3d1530", danger:"#f87171", success:"#4ade80",
  secBg:"#2a1020", stripBg:"linear-gradient(90deg,#2a1020,#3b1632)",
  font:"'Nunito',sans-serif", serif:"'Playfair Display',serif", isDark:true, isVaishali:true
};

const PRAJAY_LIGHT = {
  bg:"#f8f8f8", cardBg:"#ffffff", headerBg:"#ffffff",
  border:"#e5e5e5", accent:"#111111", accentL:"#333333", accentD:"#000000",
  text:"#111111", textMuted:"#888888", tabActive:"#111111", tabInactive:"#bbbbbb",
  tabBar:"#ffffff", input:"#f5f5f5", danger:"#dc2626", success:"#16a34a",
  secBg:"#ffffff", stripBg:"#f5f5f5",
  font:"'Inter',system-ui,sans-serif", serif:"'Inter',system-ui,sans-serif", isDark:false, isVaishali:false
};

const PRAJAY_DARK = {
  bg:"#0a0a0a", cardBg:"#141414", headerBg:"#111111",
  border:"#2a2a2a", accent:"#ffffff", accentL:"#cccccc", accentD:"#888888",
  text:"#f0f0f0", textMuted:"#888888", tabActive:"#ffffff", tabInactive:"#555555",
  tabBar:"#111111", input:"#1e1e1e", danger:"#f87171", success:"#4ade80",
  secBg:"#141414", stripBg:"#1a1a1a",
  font:"'Inter',system-ui,sans-serif", serif:"'Inter',system-ui,sans-serif", isDark:true, isVaishali:false
};

// ── EXPORT HELPERS ────────────────────────────────────────────────────────────
function exportSpendingCSV(spendHistory) {
  if (!spendHistory.length) return alert("No spending history to export.");
  const headers = ["Month","Income","Total Spent","Saved","Savings %",...SPEND_CATS.map(c=>c.label),"Notes"];
  const rows = spendHistory.map(h => [
    h.month, h.salary, h.totalSpent, h.saved, h.savedPct.toFixed(1),
    ...SPEND_CATS.map(c=>h.spend[c.key]||0), h.note||""
  ]);
  const csv = [headers,...rows].map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="spending_report.csv"; a.click();
  URL.revokeObjectURL(url);
}

function exportSpendingExcel(spendHistory) {
  if (!spendHistory.length) return alert("No spending history to export.");
  const headers = ["Month","Income","Total Spent","Saved","Savings %",...SPEND_CATS.map(c=>c.label),"Notes"];
  const rows = spendHistory.map(h => [
    h.month, h.salary, h.totalSpent, h.saved, h.savedPct.toFixed(1),
    ...SPEND_CATS.map(c=>h.spend[c.key]||0), h.note||""
  ]);
  let html = `<html><head><meta charset="utf-8"/></head><body><table border="1" style="border-collapse:collapse"><tr>${headers.map(h=>`<th style="background:#f9a8d4;font-weight:bold;padding:6px">${h}</th>`).join("")}</tr>${rows.map(r=>`<tr>${r.map(v=>`<td style="padding:4px">${v}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
  const blob = new Blob([html],{type:"application/vnd.ms-excel"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="spending_report.xls"; a.click();
  URL.revokeObjectURL(url);
}

function exportSnapshotExcel(summary, data) {
  const rows = [
    ["Category","Amount"],
    ["=== ASSETS ===",""],
    ["Cash", summary.cash],
    ["Bank Accounts", summary.bankTotal],
    ["Fixed Deposits", summary.fdTotal],
    ["Recurring Deposits", summary.rdTotal],
    ["Mutual Funds", summary.mfTotal],
    ["Stocks", summary.stockTotal],
    ["Gold & Silver", summary.goldTotal],
    ["Real Estate", summary.reTotal],
    ["Provident Fund", summary.pfTotal],
    ["TOTAL ASSETS", summary.totalAssets],
    ["",""],
    ["=== LIABILITIES ===",""],
    ["Loans", summary.loanTotal],
    ["Credit Cards", summary.ccTotal],
    ["LazyPay", summary.lazyPayTotal],
    ["TOTAL LIABILITIES", summary.totalLiabilities],
    ["",""],
    ["NET WORTH", summary.netWorth],
    ["Liquid Cash", summary.liquidCash],
    ["Free Cash", summary.freeCash],
    ["Locked Investments", summary.lockedInvestments],
    ["Monthly EMI", summary.monthlyEMI],
  ];
  let html = `<html><head><meta charset="utf-8"/></head><body><table border="1" style="border-collapse:collapse">${rows.map(([l,v])=>{ const isBold = l.startsWith("===") || l==="NET WORTH" || l.startsWith("TOTAL"); const bg = l.startsWith("===")?"#fce7f3":l==="NET WORTH"?"#f9a8d4":isBold?"#fff0f6":"#ffffff"; return `<tr><td style="padding:6px;font-weight:${isBold?"bold":"normal"};background:${bg}">${l}</td><td style="padding:6px;font-weight:${isBold?"bold":"normal"};background:${bg};text-align:right">${typeof v==="number"?`₹${v.toLocaleString("en-IN")}`:v}</td></tr>`; }).join("")}</table></body></html>`;
  const blob = new Blob([html],{type:"application/vnd.ms-excel"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="wealth_snapshot.xls"; a.click();
  URL.revokeObjectURL(url);
}

// ── USER SELECT ───────────────────────────────────────────────────────────────
function UserSelect({onSelect}){
  return (
    <div style={{minHeight:"100vh",background:"#0a0a0a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui"}}>
      <div style={{textAlign:"center",padding:32}}>
        <div style={{fontSize:13,letterSpacing:4,color:"#666",marginBottom:32,textTransform:"uppercase"}}>Select Profile</div>
        <div style={{display:"flex",gap:20}}>
          <button onClick={()=>onSelect("vaishali")} style={{background:"linear-gradient(135deg,#9d174d,#db2777)",border:"none",borderRadius:20,padding:"32px 28px",cursor:"pointer",minWidth:140,transition:"transform .2s"}}>
            <div style={{fontSize:32,marginBottom:8}}>🌸</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#fff"}}>Vaishali</div>
            <div style={{fontSize:11,color:"#fce7f3",marginTop:4,fontStyle:"italic"}}>Her Vault</div>
          </button>
          <button onClick={()=>onSelect("prajay")} style={{background:"#1a1a1a",border:"1px solid #333",borderRadius:20,padding:"32px 28px",cursor:"pointer",minWidth:140,transition:"transform .2s"}}>
            <div style={{fontSize:32,marginBottom:8}}>◆</div>
            <div style={{fontFamily:"system-ui",fontSize:18,fontWeight:600,color:"#fff",letterSpacing:.5}}>Prajay</div>
            <div style={{fontSize:11,color:"#888",marginTop:4}}>Finance Tracker</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PASSWORD SCREEN (both users — SHA-256 hash via GitHub secret) ─────────────
function PasswordScreen({user, onUnlock, th}){
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const expectedHash = user === "vaishali" ? VAISHALI_HASH : PRAJAY_HASH;

  const handleUnlock = async () => {
    if (!pwd) return;
    setLoading(true);
    setErr("");
    // Safety: if the placeholder was never replaced by CI, block access
    if (expectedHash.includes("PLACEHOLDER")) {
      setErr("App not deployed correctly — secret not injected.");
      setLoading(false);
      return;
    }
    const valid = await checkHash(pwd, expectedHash);
    if (valid) {
      onUnlock();
    } else {
      setErr("Wrong password");
      setPwd("");
    }
    setLoading(false);
  };

  const screenBg = th.isVaishali && th.isDark
    ? "radial-gradient(ellipse at 50% 0%,#3d1030 0%,#2a0820 35%,#1a0510 65%,#100008 100%)"
    : th.isVaishali
    ? "linear-gradient(135deg,#fce7f3,#fbcfe8,#f9a8d4)"
    : th.isDark ? "#0a0a0a" : "#f8f8f8";

  const isP = !th.isVaishali;

  const cardStyle = th.isVaishali && th.isDark ? {
    background:"#3b1530", borderRadius:24, padding:"44px 32px", width:340,
    textAlign:"center", border:"1.5px solid rgba(180,100,140,0.35)",
    boxShadow:"0 0 80px rgba(180,30,100,0.12), 0 0 120px rgba(100,10,60,0.08)",
  } : {
    background:th.cardBg, borderRadius:28, padding:"40px 32px",
    width:340, textAlign:"center", border:`1.5px solid ${th.border}`,
  };

  const IS = {
    width:"100%",
    border: isP ? `1.5px solid ${th.isDark?"#333":"#ddd"}` : `1.5px solid rgba(180,100,140,0.35)`,
    borderRadius:16, padding:"13px 16px", fontSize:14,
    color: isP ? th.text : (th.isDark ? "#e8c0d0" : th.text),
    background: isP ? (th.isDark?"#1a1a1a":"#f5f5f5") : (th.isDark?"#2a1020":th.input),
    outline:"none", boxSizing:"border-box", fontFamily:th.font, marginBottom:10,
  };

  const PB = {
    width:"100%", marginTop:12, padding:16,
    background: isP
      ? (th.isDark?"linear-gradient(90deg,#222,#444)":"linear-gradient(90deg,#111,#333)")
      : "linear-gradient(90deg,#e91e8c,#c2185b)",
    color:"#fff", border:"none", borderRadius:16, fontSize:15, fontWeight:700,
    cursor: loading ? "wait" : "pointer", fontFamily:th.font, letterSpacing:.3,
    boxShadow: isP ? "0 4px 18px rgba(0,0,0,0.35)" : "0 4px 24px rgba(233,30,140,0.45)",
    opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={{minHeight:"100vh",background:screenBg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:th.font}}>
      <div style={cardStyle}>
        {isP ? (
          <div>
            <div style={{fontSize:48,marginBottom:12,color:th.isDark?"#fff":"#111"}}>◆</div>
            <div style={{fontFamily:"system-ui",fontSize:24,fontWeight:700,letterSpacing:.5,color:th.isDark?"#ffffff":"#111111",marginBottom:4}}>Prajay Finance</div>
            <div style={{fontSize:12,color:th.textMuted,marginBottom:28,letterSpacing:.3}}>Enter your PIN to access your vault</div>
          </div>
        ) : (
          <div>
            <div style={{fontSize:60,marginBottom:14}}>🌸</div>
            <div style={{fontFamily:th.serif,fontSize:26,fontWeight:700,color:th.isDark?"#e8c0d0":"#9d174d",marginBottom:6}}>Vaishali Wealth</div>
            <div style={{fontSize:13,color:th.isDark?"#a07888":th.textMuted,marginBottom:28}}>Enter your password to continue</div>
          </div>
        )}
        <div style={{position:"relative",marginBottom:0}}>
          <input
            style={{...IS, paddingRight:44}}
            type="password"
            placeholder="Password"
            value={pwd}
            autoFocus
            onChange={e=>{setPwd(e.target.value);setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&handleUnlock()}
          />
          <span style={{position:"absolute",right:14,top:13,fontSize:20,pointerEvents:"none"}}>{isP?"🔐":"🙈"}</span>
        </div>
        {err && <div style={{color:"#f87171",fontSize:12,marginBottom:8}}>{err}</div>}
        <button style={PB} onClick={handleUnlock} disabled={loading}>
          {loading ? "Checking..." : isP ? "Unlock ◆" : "Unlock 🌸"}
        </button>
      </div>
    </div>
  );
}

const V_TABS=[{id:"home",label:"Overview"},{id:"assets",label:"Assets"},{id:"liab",label:"Loans"},{id:"spending",label:"Spending"},{id:"loans",label:"Pay Off"},{id:"project",label:"Grow"},{id:"snapshot",label:"Snapshot"}];
const P_TABS=[{id:"home",label:"Home"},{id:"assets",label:"Assets"},{id:"liab",label:"Debts"},{id:"spending",label:"Spending"},{id:"loans",label:"Loans"},{id:"project",label:"Growth"},{id:"snapshot",label:"Snapshot"}];

export default function App(){
  const [user,setUser]=useState(null);
  const [unlocked,setUnlocked]=useState(false);
  const [darkMode,setDarkMode]=useState(false);
  const [data,setData]=useState(INIT);
  const [tab,setTab]=useState("home");
  const [quote]=useState(randQuote);
  const [nwVisible,setNwVisible]=useState(false);
  const summary=useSummary(data);
  const th = user==="vaishali" ? (darkMode?VAISHALI_DARK:VAISHALI_LIGHT) : (darkMode?PRAJAY_DARK:PRAJAY_LIGHT);
  const TABS = user==="vaishali" ? V_TABS : P_TABS;
  const upd=useCallback((key,val)=>setData(p=>({...p,[key]:val})),[]);
  const updItem=useCallback((key,idx,field,val)=>setData(p=>{const a=[...p[key]];a[idx]={...a[idx],[field]:val};return {...p,[key]:a};}),[]);
  const addItem=useCallback((key,tmpl)=>setData(p=>({...p,[key]:[...p[key],{...tmpl,id:Date.now()}]})),[]);
  const delItem=useCallback((key,idx)=>setData(p=>{const a=[...p[key]];a.splice(idx,1);return {...p,[key]:a};}),[]);

  if(!user) return <UserSelect onSelect={u=>{setUser(u);}}/>;
  if(!unlocked) return <PasswordScreen user={user} onUnlock={()=>setUnlocked(true)} th={th}/>;

  const screenBg = th.isDark && th.isVaishali ? "#130010" : th.bg;
  const css=`*{box-sizing:border-box;transition:background-color .35s,border-color .35s,color .25s;} input:focus{border-color:${th.accent}!important;outline:none;} input[type=number]::-webkit-inner-spin-button{opacity:.4;} ::-webkit-scrollbar{width:3px;height:3px;} ::-webkit-scrollbar-thumb{background:${th.border};border-radius:2px;} .tab-bar::-webkit-scrollbar{display:none;}`;

  return (
    <div style={{background:screenBg,minHeight:"100vh",maxWidth:480,margin:"0 auto",fontFamily:th.font,paddingBottom:40,transition:"background .35s"}}>
      <link href={FONT_LINK} rel="stylesheet"/>
      <style>{css}</style>

      {/* TOP BAR */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px 0",background:th.tabBar,borderBottom:`1px solid ${th.isDark&&th.isVaishali?"#3a1530":th.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>{setUser(null);setUnlocked(false);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:th.textMuted,fontFamily:th.font,padding:"4px 8px"}}>← Switch</button>
          <span style={{fontSize:13,fontWeight:700,color:th.isDark&&th.isVaishali?"#e91e8c":th.accent,fontFamily:th.serif}}>{user==="vaishali"?"Vaishali 🌸":"Prajay"}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:th.textMuted}}>{darkMode?"Dark":"Light"}</span>
          <div onClick={()=>setDarkMode(d=>!d)} style={{width:44,height:24,borderRadius:12,background:darkMode?th.accent:th.border,cursor:"pointer",position:"relative",transition:"background .35s",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:darkMode?22:2,width:20,height:20,borderRadius:10,background:darkMode?(th.isVaishali?"#130010":"#0a0a0a"):"#fff",transition:"left .3s",boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="tab-bar" style={{display:"flex",overflowX:"auto",background:th.tabBar,borderBottom:`1px solid ${th.isDark&&th.isVaishali?"#3a1530":th.border}`,position:"sticky",top:0,zIndex:20}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:"0 0 auto",background:"none",border:"none",
            borderBottom:`2.5px solid ${tab===t.id?th.tabActive:"transparent"}`,
            color:tab===t.id?th.tabActive:th.tabInactive,
            padding:"10px 12px",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",
            fontFamily:th.font,transition:"all .2s",letterSpacing:0,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* HEADER — VAISHALI DARK */}
      {tab==="home" && th.isVaishali && th.isDark && (
        <div style={{background:"linear-gradient(180deg,#5a1040 0%,#3e0b2c 15%,#2a0820 32%,#1e0618 50%,#150412 68%,#130010 85%,#130010 100%)",padding:"20px 16px 18px",borderBottom:`1px solid #2a0e20`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:700,color:"#e91e8c",marginBottom:6,letterSpacing:-.5,lineHeight:1.15}}>Vaishali 🌸</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:13,color:"#c490a8",lineHeight:1.55,letterSpacing:.1}}>{`\u201cWomen who understand money write their own stories.\u201d`}</div>
            </div>
            <div style={{background:"rgba(50,8,34,0.85)",borderRadius:14,padding:"10px 12px",border:"1.5px solid #4a1a38",cursor:"pointer",flexShrink:0,marginLeft:12}}>🔒</div>
          </div>
          <div onClick={()=>setNwVisible(v=>!v)} style={{background:"rgba(42,16,32,0.6)",borderRadius:14,padding:"11px 18px",border:"1px dashed #5a3048",cursor:"pointer",margin:"10px 0 14px",textAlign:"center"}}>
            {nwVisible ? (
              <div>
                <div style={{fontSize:9,letterSpacing:2.5,color:"#9a6878",textTransform:"uppercase",marginBottom:6}}>YOUR NET WORTH</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:"#e91e8c"}}>{summary.netWorth<0?"−":""}{fmtFull(Math.abs(summary.netWorth))}</div>
                <div style={{display:"flex",justifyContent:"center",gap:14,fontSize:11,marginTop:5}}>
                  <span style={{color:"#4ade80"}}>▲ {fmt(summary.totalAssets)} Assets</span>
                  <span style={{color:"#f87171"}}>▼ {fmt(summary.totalLiabilities)} Debts</span>
                </div>
                <div style={{fontSize:9,color:"#7a4858",marginTop:5}}>Tap to hide 🌸</div>
              </div>
            ) : (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"2px 0"}}>
                <span style={{fontSize:18}}>💎</span>
                <span style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:13,color:"#9a7080",letterSpacing:.2}}>Tap to reveal your net worth</span>
                <span style={{fontSize:14}}>✨</span>
              </div>
            )}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <QCardDark label="Liquid" sub="Cash + Bank" val={summary.liquidCash} icon="💧" th={th}/>
            <QCardDark label="Free Cash" sub="Liquid minus dues" val={summary.freeCash} icon="🌸" th={th}/>
            <QCardDark label="Investments" sub="FD, MF, Stocks..." val={summary.lockedInvestments} icon="🔒" th={th}/>
            <QCardDark label="EMI/mo" sub="Total EMIs" val={summary.monthlyEMI} icon="📅" th={th}/>
          </div>
          <button onClick={()=>exportSnapshotExcel(summary,data)} style={{display:"block",width:"100%",marginTop:14,padding:"12px 16px",background:"linear-gradient(90deg,#e91e8c,#c2185b)",color:"#fff",border:"none",borderRadius:14,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:th.font,letterSpacing:.5,boxShadow:"0 4px 20px rgba(233,30,140,0.3)"}}>
            📊 Export to Excel
          </button>
        </div>
      )}

      {/* HEADER — VAISHALI LIGHT */}
      {tab==="home" && th.isVaishali && !th.isDark && (
        <div style={{background:th.headerBg,padding:"20px 16px 16px",textAlign:"left",borderBottom:`1px solid ${th.border}`}}>
          <div style={{fontFamily:th.serif,fontSize:11,letterSpacing:4,color:th.accentL,marginBottom:10,opacity:.7,textAlign:"center"}}>💅 👠 👜 💐 👑 💅 👠 👜</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div>
              <div style={{fontFamily:th.serif,fontSize:21,fontWeight:700,color:th.accent,marginBottom:3}}>Vaishali 🌸</div>
              <div style={{fontFamily:th.serif,fontSize:11,fontStyle:"italic",color:th.accentL,marginBottom:10,lineHeight:1.5}}>Let's calculate your wealth!</div>
              <div style={{fontSize:11,color:th.accent,fontStyle:"italic",background:"#fff0f6",borderRadius:8,padding:"8px 12px",borderLeft:`3px solid ${th.accentL}`}}>❝ {quote} ❞</div>
            </div>
          </div>
          <div onClick={()=>setNwVisible(v=>!v)} style={{padding:"14px 20px",cursor:"pointer",marginBottom:14,textAlign:"center"}}>
            <div style={{fontSize:10,letterSpacing:3,color:th.accentL,textTransform:"uppercase",marginBottom:6}}>YOUR NET WORTH</div>
            {nwVisible ? (
              <div>
                <div style={{fontFamily:th.serif,fontSize:36,fontWeight:700,color:th.accent}}>{summary.netWorth<0?"−":""}{fmtFull(Math.abs(summary.netWorth))}</div>
                <div style={{display:"flex",justifyContent:"center",gap:14,fontSize:12,marginTop:6}}>
                  <span style={{color:th.success}}>▲ {fmt(summary.totalAssets)} Assets</span>
                  <span style={{color:th.danger}}>▼ {fmt(summary.totalLiabilities)} Debts</span>
                </div>
              </div>
            ) : (
              <div style={{fontSize:22,letterSpacing:4}}>💎 Tap to reveal 💎</div>
            )}
            <div style={{fontSize:10,color:th.accentL,marginTop:4}}>{nwVisible?"Tap to hide 🌸":"Your wealth awaits... 👑"}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <QCard label="Liquid" sub="Cash + Bank" val={summary.liquidCash} icon="💧" col={th.accentL} th={th}/>
            <QCard label="Free Cash" sub="Liquid minus dues" val={summary.freeCash} icon="🌸" col={th.accent} th={th}/>
            <QCard label="Investments" sub="FD, MF, Stocks..." val={summary.lockedInvestments} icon="🔒" col={th.accentD} th={th}/>
            <QCard label="EMI/mo" sub="Total EMIs" val={summary.monthlyEMI} icon="📅" col={th.accentD} th={th}/>
          </div>
          <button onClick={()=>exportSnapshotExcel(summary,data)} style={{display:"block",width:"100%",marginTop:12,padding:"11px 16px",background:`linear-gradient(90deg,${th.accentL},${th.accentD})`,color:"#fff",border:"none",borderRadius:14,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:th.font,letterSpacing:.5}}>📊 Export to Excel</button>
          <div style={{fontFamily:th.serif,fontSize:11,letterSpacing:3,color:th.accentL,marginTop:12,opacity:.6,textAlign:"center"}}>🌹 🌺 🌸 🌼 🌷 🌻 🌸 🌹</div>
        </div>
      )}

      {/* HEADER — PRAJAY */}
      {tab==="home" && !th.isVaishali && (
        <div style={{background:th.headerBg,padding:"20px 16px 18px",borderBottom:`1px solid ${th.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div>
              <div style={{fontSize:10,letterSpacing:3,color:th.textMuted,textTransform:"uppercase",marginBottom:6}}>◆ DASHBOARD</div>
              <div style={{fontSize:28,fontWeight:700,color:th.text,letterSpacing:-.5,marginBottom:6}}>Prajay ◆</div>
              <div style={{fontSize:11,color:th.textMuted,fontStyle:"italic",lineHeight:1.55,maxWidth:220,borderLeft:`3px solid ${th.isDark?"#333":"#ccc"}`,paddingLeft:10}}>"Build wealth quietly. Let your results make the noise."</div>
            </div>
            <div style={{background:th.cardBg,borderRadius:14,padding:"10px 12px",border:`1px solid ${th.border}`,cursor:"pointer",flexShrink:0,marginLeft:12}}>🔒</div>
          </div>
          <div onClick={()=>setNwVisible(v=>!v)} style={{background:th.cardBg,borderRadius:16,padding:"16px 20px",border:`1px solid ${th.border}`,cursor:"pointer",marginBottom:14,textAlign:"center"}}>
            <div style={{fontSize:10,letterSpacing:2,color:th.textMuted,textTransform:"uppercase",marginBottom:6}}>NET WORTH</div>
            {nwVisible?(
              <div>
                <div style={{fontSize:34,fontWeight:700,color:th.text,letterSpacing:-1}}>{summary.netWorth<0?"−":""}{fmtFull(Math.abs(summary.netWorth))}</div>
                <div style={{display:"flex",justifyContent:"center",gap:20,fontSize:12,marginTop:8}}>
                  <span style={{color:th.success}}>↑ {fmt(summary.totalAssets)} Assets</span>
                  <span style={{color:th.danger}}>↓ {fmt(summary.totalLiabilities)} Debts</span>
                </div>
                <div style={{fontSize:10,color:th.textMuted,marginTop:6}}>Tap to hide</div>
              </div>
            ):(
              <div style={{fontSize:14,color:th.textMuted,letterSpacing:1}}>◆ Tap to reveal</div>
            )}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[["💧","Liquid","Cash + Bank",summary.liquidCash],["💸","Free Cash","After dues",summary.freeCash],["📈","Investments","Locked assets",summary.lockedInvestments],["🗓️","EMI / mo","Monthly burden",summary.monthlyEMI]].map(([icon,l,s,v])=>(
              <div key={l} style={{background:th.cardBg,borderRadius:12,padding:"12px 14px",border:`1px solid ${th.border}`}}>
                <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
                <div style={{fontSize:18,fontWeight:700,color:th.text,letterSpacing:-.5}}>{fmt(v)}</div>
                <div style={{fontSize:11,fontWeight:600,color:th.text,marginTop:1}}>{l}</div>
                <div style={{fontSize:10,color:th.textMuted}}>{s}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>exportSnapshotExcel(summary,data)} style={{display:"block",width:"100%",padding:"11px 16px",background:th.isDark?"#ffffff":"#111111",color:th.isDark?"#000000":"#ffffff",border:"none",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:th.font,letterSpacing:.5}}>
            📊 Export Snapshot
          </button>
        </div>
      )}

      <main style={{padding:"14px"}}>
        {tab==="home"&&<HomeTab summary={summary} th={th}/>}
        {tab==="assets"&&<AssetsTab data={data} upd={upd} updItem={updItem} addItem={addItem} delItem={delItem} summary={summary} th={th}/>}
        {tab==="liab"&&<LiabilitiesTab data={data} upd={upd} updItem={updItem} addItem={addItem} delItem={delItem} summary={summary} th={th}/>}
        {tab==="spending"&&<SpendingTab data={data} upd={upd} setData={setData} th={th}/>}
        {tab==="loans"&&<LoanPlanTab data={data} th={th}/>}
        {tab==="project"&&<ProjectionTab data={data} summary={summary} th={th}/>}
        {tab==="snapshot"&&<SnapshotTab data={data} summary={summary} th={th}/>}
      </main>
    </div>
  );
}

// ── DARK MODE QUICK CARD ──────────────────────────────────────────────────────
function QCardDark({label,sub,val,icon,th}){
  return (
    <div style={{background:"#2a1020",borderRadius:18,padding:"16px 14px",textAlign:"center",border:"1px solid #4a1a38"}}>
      <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
      <div style={{fontSize:18,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#f0c8d8",marginBottom:2}}>{fmt(val)}</div>
      <div style={{fontSize:11,color:"#f0c8d8",fontWeight:600,marginBottom:1}}>{label}</div>
      <div style={{fontSize:9,color:"#7a5068"}}>{sub}</div>
    </div>
  );
}

// ── LIGHT MODE QUICK CARD ─────────────────────────────────────────────────────
function QCard({label,sub,val,icon,col,th}){
  return (
    <div style={{background:"rgba(255,255,255,0.85)",borderRadius:16,padding:"14px 12px",textAlign:"center",border:"none",borderTop:"3px solid #c2185b"}}>
      <div style={{fontSize:18,marginBottom:2}}>{icon}</div>
      <div style={{fontSize:17,fontWeight:700,fontFamily:"'Playfair Display',serif",color:col}}>{fmt(val)}</div>
      <div style={{fontSize:10,color:th.accent,marginTop:1,fontWeight:600}}>{label}</div>
      <div style={{fontSize:9,color:th.textMuted,marginTop:1}}>{sub}</div>
    </div>
  );
}

// ── HOME TAB ──────────────────────────────────────────────────────────────────
function HomeTab({summary,th}){
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
        <text x={cx} y={cy-4} textAnchor="middle" fill={th.isDark&&th.isVaishali?"#e91e8c":th.accent} fontSize="9" fontWeight="700" fontFamily="Playfair Display">Assets</text>
        <text x={cx} y={cy+8} textAnchor="middle" fill={th.isDark&&th.isVaishali?"#c490a8":th.accentL} fontSize="8" fontFamily="Nunito">{fmt(total)}</text>
      </svg>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Sec title={th.isVaishali?"💎 Wealth Overview":"Wealth Overview"} th={th}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          {[
            {l:"Total Assets",v:summary.totalAssets,c:th.success},
            {l:"Total Liabilities",v:summary.totalLiabilities,c:th.danger},
            {l:"Liquid Cash",v:summary.liquidCash,c:"#3b82f6"},
            {l:"Free Cash",v:summary.freeCash,c:netDiff>=0?th.success:th.danger},
          ].map(({l,v,c})=>(
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
      </Sec>

      <Sec title={th.isVaishali?"💰 Asset Breakdown":"Asset Breakdown"} th={th}>
        {assetRows.length===0?<Empty text={th.isVaishali?"Add assets to see your breakdown 💐":"Add assets to get started"} th={th}/>:(
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

      <Sec title={th.isVaishali?"🩺 Wealth Health":"Wealth Health Score"} th={th}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <svg width="90" height="90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke={th.isDark?"rgba(255,255,255,0.1)":"#fce7f3"} strokeWidth="10"/>
            <circle cx="50" cy="50" r="42" fill="none" stroke={sc} strokeWidth="10" strokeDasharray={`${score*2.638} 263.8`} strokeLinecap="round" transform="rotate(-90 50 50)"/>
            <text x="50" y="46" textAnchor="middle" fill={sc} fontSize="20" fontWeight="bold">{score}</text>
            <text x="50" y="60" textAnchor="middle" fill={th.textMuted} fontSize="9">/100</text>
          </svg>
          <div>
            <div style={{color:sc,fontSize:16,fontWeight:700,fontFamily:th.serif,marginBottom:4}}>{score>=70?(th.isVaishali?"Excellent 💅":"Excellent ◆"):score>=40?(th.isVaishali?"Growing 🌺":"Growing 📈"):(th.isVaishali?"Needs Love 🌷":"Needs Work 💪")}</div>
            <div style={{color:th.text,fontSize:11}}>Debt-to-Asset: {(ratio*100).toFixed(1)}%</div>
            {th.isVaishali&&<div style={{color:th.textMuted,fontSize:10,marginTop:4,fontStyle:"italic"}}>{score>=70?"Your finances are flourishing! 🌹":score>=40?"You're building something beautiful 🌸":"Every queen starts somewhere. Keep going! 💪"}</div>}
            {!th.isVaishali&&<div style={{color:th.textMuted,fontSize:10,marginTop:4,fontStyle:"italic"}}>{score>=70?"Solid. Keep compounding.":score>=40?"Good momentum. Stay disciplined.":"Time to cut debt and build assets."}</div>}
          </div>
        </div>
      </Sec>

      <Sec title={th.isVaishali?"📋 Full Snapshot":"Quick Snapshot"} th={th}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <tbody>
            {[
              ["Gross Assets",fmtFull(summary.totalAssets),"#4ec9a0",false],
              ["Gross Liabilities",fmtFull(summary.totalLiabilities),"#e05c7a",false],
              ["NET WORTH",fmtFull(summary.netWorth),th.isDark?(summary.netWorth>=0?th.accent:th.danger):(summary.netWorth>=0?"#e91e8c":th.danger),true],
              ["Liquid (Cash+Bank)",fmtFull(summary.liquidCash),th.isDark?"#4ec9a0":"#3b82f6",false],
              ["Locked Investments",fmtFull(summary.lockedInvestments),"#4ec9a0",false],
              ["Free Cash",fmtFull(summary.freeCash),summary.freeCash>=0?"#4ec9a0":"#e05c7a",false],
              ["Monthly EMI",fmtFull(summary.monthlyEMI),"#f97316",false],
            ].map(([l,v,c,bold])=>(
              <tr key={l} style={bold?{background:th.isDark?"rgba(255,255,255,0.04)":th.bg}:{}}>
                <td style={{padding:"7px 4px",fontSize:bold?13:11,color:th.isVaishali&&!th.isDark?"#9d174d":th.text,borderBottom:`1px solid ${th.border}`,fontWeight:bold?700:400,fontFamily:th.isVaishali&&!th.isDark?"'Playfair Display',serif":th.font}}>{l}</td>
                <td style={{padding:"7px 4px",fontSize:bold?14:12,textAlign:"right",color:c,fontWeight:bold?700:500,borderBottom:`1px solid ${th.border}`,fontFamily:bold?th.serif:th.font}}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Sec>
    </div>
  );
}

// ── ASSETS TAB ────────────────────────────────────────────────────────────────
function AssetsTab({data,upd,updItem,addItem,delItem,summary,th}){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Sec title={th.isVaishali?"💵 Cash in Hand":"Cash in Hand"} th={th}>
        <F label="Cash Amount (₹)" type="number" value={data.cash} onChange={v=>upd("cash",+v)} placeholder="Enter cash amount" th={th}/>
        <Cv>{fmtFull(+data.cash||0)}</Cv>
      </Sec>
      <Sec title={th.isVaishali?"🏦 Bank Accounts":"Bank Accounts"} th={th}>
        {th.isVaishali&&<QStrip q="A woman with her own savings account is unstoppable. 💅" th={th}/>}
        {data.banks.map((b,i)=>(
          <Item key={b.id||i} title={`Bank Account ${i+1}`} onDel={data.banks.length>1?()=>delItem("banks",i):null} th={th}>
            <F label="Bank Name" value={b.bankName} onChange={v=>updItem("banks",i,"bankName",v)} placeholder="e.g. HDFC, SBI" th={th}/>
            <F label="Account Number (last 4)" value={b.accNumber} onChange={v=>updItem("banks",i,"accNumber",v)} placeholder="XXXX1234" th={th}/>
            <F label="Balance (₹)" type="number" value={b.balance} onChange={v=>updItem("banks",i,"balance",+v)} placeholder="Balance" th={th}/>
            <Cv>{fmtFull(+b.balance||0)}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("banks",{bankName:"",accNumber:"",balance:0})} th={th}/>
        <Total th={th}>{fmtFull(summary.bankTotal)}</Total>
      </Sec>
      <Sec title={th.isVaishali?"🔒 Fixed Deposits":"Fixed Deposits"} th={th}>
        {data.fds.map((f,i)=>(
          <Item key={f.id||i} title={`Fixed Deposit ${i+1}`} onDel={data.fds.length>1?()=>delItem("fds",i):null} th={th}>
            <F label="Bank" value={f.bankName} onChange={v=>updItem("fds",i,"bankName",v)} placeholder="Bank name" th={th}/>
            <F label="Principal (₹)" type="number" value={f.principal} onChange={v=>updItem("fds",i,"principal",+v)} placeholder="Principal amount" th={th}/>
            <F label="Interest Rate (% p.a.)" type="number" value={f.rate} onChange={v=>updItem("fds",i,"rate",+v)} placeholder="e.g. 7.5" th={th}/>
            <F label="Maturity Date" type="date" value={f.maturityDate} onChange={v=>updItem("fds",i,"maturityDate",v)} th={th}/>
            <Cv>{fmtFull(+f.principal||0)}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("fds",{bankName:"",principal:0,rate:0,maturityDate:""})} th={th}/>
        <Total th={th}>{fmtFull(summary.fdTotal)}</Total>
      </Sec>
      <Sec title={th.isVaishali?"🔄 Recurring Deposits":"Recurring Deposits"} th={th}>
        {data.rds.map((r,i)=>(
          <Item key={r.id||i} title={`RD ${i+1}`} onDel={data.rds.length>1?()=>delItem("rds",i):null} th={th}>
            <F label="Bank" value={r.bankName} onChange={v=>updItem("rds",i,"bankName",v)} placeholder="Bank name" th={th}/>
            <F label="Monthly Amount (₹)" type="number" value={r.monthly} onChange={v=>updItem("rds",i,"monthly",+v)} placeholder="Monthly deposit" th={th}/>
            <F label="Total Deposited (₹)" type="number" value={r.totalDeposited} onChange={v=>updItem("rds",i,"totalDeposited",+v)} placeholder="Amount deposited so far" th={th}/>
            <F label="Current Value (₹)" type="number" value={r.currentValue} onChange={v=>updItem("rds",i,"currentValue",+v)} placeholder="Current value with interest" th={th}/>
            <Cv>{fmtFull(+r.currentValue||0)}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("rds",{bankName:"",monthly:0,totalDeposited:0,currentValue:0})} th={th}/>
        <Total th={th}>{fmtFull(summary.rdTotal)}</Total>
      </Sec>
      <Sec title={th.isVaishali?"📊 Mutual Funds":"Mutual Funds"} th={th}>
        {th.isVaishali&&<QStrip q="SIP by SIP, she builds an empire. 💐" th={th}/>}
        {data.mfs.map((m,i)=>(
          <Item key={m.id||i} title={`MF ${i+1}`} onDel={data.mfs.length>1?()=>delItem("mfs",i):null} th={th}>
            <F label="Fund Name" value={m.name} onChange={v=>updItem("mfs",i,"name",v)} placeholder="e.g. Axis Bluechip Fund" th={th}/>
            <F label="Invested Amount (₹)" type="number" value={m.invested} onChange={v=>updItem("mfs",i,"invested",+v)} placeholder="Amount invested" th={th}/>
            <F label="Growth Rate (% returns)" type="number" value={m.growthRate} onChange={v=>updItem("mfs",i,"growthRate",+v)} placeholder="e.g. 12" th={th}/>
            <Cv>Current: {fmtFull(calcMFValue(m))}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("mfs",{name:"",invested:0,growthRate:0})} th={th}/>
        <Total th={th}>{fmtFull(summary.mfTotal)}</Total>
      </Sec>
      <Sec title={th.isVaishali?"📈 Stocks & Equity":"Stocks & Equity"} th={th}>
        {data.stocks.length===0&&<Empty text={th.isVaishali?"No stocks yet 📈":"No stocks added"} th={th}/>}
        {data.stocks.map((s,i)=>(
          <Item key={s.id||i} title={s.name||`Stock ${i+1}`} onDel={()=>delItem("stocks",i)} th={th}>
            <F label="Company / Ticker" value={s.name} onChange={v=>updItem("stocks",i,"name",v)} placeholder="e.g. RELIANCE, TCS" th={th}/>
            <F label="Quantity (shares)" type="number" value={s.qty} onChange={v=>updItem("stocks",i,"qty",+v)} placeholder="No. of shares" th={th}/>
            <F label="Current Price (₹/share)" type="number" value={s.price} onChange={v=>updItem("stocks",i,"price",+v)} placeholder="Current market price" th={th}/>
            <Cv>{fmtFull((+s.qty||0)*(+s.price||0))}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("stocks",{name:"",qty:0,price:0})} th={th}/>
        <Total th={th}>{fmtFull(summary.stockTotal)}</Total>
      </Sec>
      <Sec title={th.isVaishali?"🥇 Gold & Silver":"Gold & Silver"} th={th}>
        {th.isVaishali&&<QStrip q="Gold has always been a woman's wisest investment. 👑" th={th}/>}
        {data.gold.map((g,i)=>(
          <Item key={g.id||i} title={`${g.type||"Gold/Silver"} ${i+1}`} onDel={data.gold.length>1?()=>delItem("gold",i):null} th={th}>
            <F label="Type" value={g.type} onChange={v=>updItem("gold",i,"type",v)} placeholder="Gold or Silver" th={th}/>
            <F label="Weight (grams)" type="number" value={g.grams} onChange={v=>updItem("gold",i,"grams",+v)} placeholder="Weight in grams" th={th}/>
            <F label="Price per gram (₹)" type="number" value={g.pricePerGram} onChange={v=>updItem("gold",i,"pricePerGram",+v)} placeholder="Current rate/gram" th={th}/>
            <Cv>{fmtFull((+g.grams||0)*(+g.pricePerGram||0))}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("gold",{type:"Gold",grams:0,pricePerGram:0})} th={th}/>
        <Total th={th}>{fmtFull(summary.goldTotal)}</Total>
      </Sec>
      <Sec title={th.isVaishali?"🏠 Real Estate":"Real Estate"} th={th}>
        {data.realestate.map((r,i)=>(
          <Item key={r.id||i} title={`Property ${i+1}`} onDel={data.realestate.length>1?()=>delItem("realestate",i):null} th={th}>
            <F label="Description / Location" value={r.desc} onChange={v=>updItem("realestate",i,"desc",v)} placeholder="e.g. Flat in Pune" th={th}/>
            <F label="Current Market Value (₹)" type="number" value={r.currentValue} onChange={v=>updItem("realestate",i,"currentValue",+v)} placeholder="Current value" th={th}/>
            <Cv>{fmtFull(+r.currentValue||0)}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("realestate",{desc:"",currentValue:0})} th={th}/>
        <Total th={th}>{fmtFull(summary.reTotal)}</Total>
      </Sec>
      <Sec title={th.isVaishali?"🏛️ Provident Fund (PF / EPF)":"Provident Fund (EPF)"} th={th}>
        {th.isVaishali&&<QStrip q="Your PF is silent wealth — growing while you sleep. 🌙" th={th}/>}
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
    </div>
  );
}

// ── LIABILITIES TAB ───────────────────────────────────────────────────────────
function LiabilitiesTab({data,upd,updItem,addItem,delItem,summary,th}){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {th.isVaishali&&<QStrip q="Every debt cleared is a chain broken. Keep going, queen! 💪" th={th}/>}
      <Sec title={th.isVaishali?"🏛️ Loans & Mortgages":"Loans & Mortgages"} th={th}>
        {data.loans.map((l,i)=>(
          <Item key={l.id||i} title={`Loan ${i+1}${l.name?` — ${l.name}`:""}`} onDel={data.loans.length>1?()=>delItem("loans",i):null} th={th}>
            <F label="Loan Name" value={l.name} onChange={v=>updItem("loans",i,"name",v)} placeholder="e.g. Home Loan" th={th}/>
            <F label="Loan Type" value={l.type} onChange={v=>updItem("loans",i,"type",v)} placeholder="Home / Car / Personal / Education" th={th}/>
            <F label="Outstanding Balance (₹)" type="number" value={l.outstanding} onChange={v=>updItem("loans",i,"outstanding",+v)} placeholder="Remaining principal" th={th}/>
            <F label="Interest Rate (% p.a.)" type="number" value={l.rate} onChange={v=>updItem("loans",i,"rate",+v)} placeholder="e.g. 8.5" th={th}/>
            <F label="EMI per Month (₹)" type="number" value={l.emi} onChange={v=>updItem("loans",i,"emi",+v)} placeholder="Monthly EMI" th={th}/>
            <Cv red>{fmtFull(+l.outstanding||0)}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("loans",{name:"",type:"",outstanding:0,rate:0,emi:0})} th={th}/>
        <Total red th={th}>{fmtFull(summary.loanTotal)}</Total>
      </Sec>
      <Sec title={th.isVaishali?"💳 Credit Cards":"Credit Cards"} th={th}>
        {data.creditCards.map((c,i)=>(
          <Item key={c.id||i} title={`Card ${i+1}${c.bank?` — ${c.bank}`:""}`} onDel={data.creditCards.length>1?()=>delItem("creditCards",i):null} th={th}>
            <F label="Bank / Card Name" value={c.bank} onChange={v=>updItem("creditCards",i,"bank",v)} placeholder="e.g. HDFC Regalia" th={th}/>
            <F label="Card Number (last 4)" value={c.cardNumber} onChange={v=>updItem("creditCards",i,"cardNumber",v)} placeholder="XXXX" th={th}/>
            <F label="Outstanding Amount (₹)" type="number" value={c.outstanding} onChange={v=>updItem("creditCards",i,"outstanding",+v)} placeholder="Current dues" th={th}/>
            <Cv red>{fmtFull(+c.outstanding||0)}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("creditCards",{bank:"",cardNumber:"",outstanding:0})} th={th}/>
        <Total red th={th}>{fmtFull(summary.ccTotal)}</Total>
      </Sec>
      <Sec title={th.isVaishali?"🛒 LazyPay / BNPL":"LazyPay / BNPL"} th={th}>
        {th.isVaishali&&<QStrip q="Clear LazyPay dues first — small debts add up fast! 👑" th={th}/>}
        {(data.lazyPay||[]).map((l,i)=>(
          <Item key={l.id||i} title={`LazyPay ${i+1}`} onDel={(data.lazyPay||[]).length>1?()=>delItem("lazyPay",i):null} th={th}>
            <F label="Outstanding Amount (₹)" type="number" value={l.outstanding} onChange={v=>updItem("lazyPay",i,"outstanding",+v)} placeholder="Amount due on LazyPay" th={th}/>
            <F label="Due Date" type="date" value={l.dueDate} onChange={v=>updItem("lazyPay",i,"dueDate",v)} th={th}/>
            {l.dueDate&&(
              <div style={{fontSize:11,color:new Date(l.dueDate)<new Date()?th.danger:"#d97706",marginTop:2,fontWeight:600}}>
                {new Date(l.dueDate)<new Date()?"⚠️ Overdue!":"📅 Due: "+new Date(l.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
              </div>
            )}
            <Cv red>{fmtFull(+l.outstanding||0)}</Cv>
          </Item>
        ))}
        <Add onClick={()=>addItem("lazyPay",{outstanding:0,dueDate:""})} th={th}/>
        <Total red th={th}>{fmtFull(summary.lazyPayTotal||0)}</Total>
      </Sec>
      <div style={{background:th.cardBg,border:`2px solid ${th.border}`,borderRadius:16,padding:16,textAlign:"center"}}>
        <div style={{fontSize:11,color:th.textMuted,marginBottom:2}}>Total Liabilities</div>
        <div style={{fontFamily:th.serif,fontSize:26,fontWeight:700,color:th.danger}}>{fmtFull(summary.totalLiabilities)}</div>
        <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:8,fontSize:11,color:th.textMuted}}>
          <span>Loans: <b style={{color:th.danger}}>{fmtFull(summary.loanTotal)}</b></span>
          <span>CC: <b style={{color:th.danger}}>{fmtFull(summary.ccTotal)}</b></span>
          <span>LP: <b style={{color:th.danger}}>{fmtFull(summary.lazyPayTotal||0)}</b></span>
        </div>
        <div style={{fontSize:11,color:th.textMuted,marginTop:8,marginBottom:2}}>Monthly EMI Burden</div>
        <div style={{fontFamily:th.serif,fontSize:18,fontWeight:700,color:"#f97316"}}>{fmtFull(summary.monthlyEMI)}/month</div>
      </div>
    </div>
  );
}

// ── SPENDING TAB ──────────────────────────────────────────────────────────────
function SpendingTab({data,upd,setData,th}){
  const [salary,setSalary]=useState(0);
  const [month,setMonth]=useState(new Date().toLocaleString("default",{month:"long"})+" "+new Date().getFullYear());
  const [target,setTarget]=useState(50);
  const [spend,setSpend]=useState(mkSpend());
  const [note,setNote]=useState("");
  const totalSpent=Object.values(spend).reduce((s,v)=>s+(+v||0),0);
  const saved=Math.max(0,(+salary||0)-totalSpent);
  const savedPct=salary>0?saved/salary*100:0;
  const spendPct=salary>0?totalSpent/salary*100:0;
  const tgt=+target||50;
  const onTrack=savedPct>=tgt;
  const overspending=spendPct>50;
  const sc=onTrack?th.success:savedPct>=tgt*0.7?"#d97706":th.danger;
  const nonZero=SPEND_CATS.filter(c=>+spend[c.key]>0);
  const total=totalSpent||1;

  const SpendPie=()=>{
    if(nonZero.length===0) return null;
    let cum=0; const cx=65,cy=65,r=52;
    const slices=nonZero.map(c=>{const pct=+spend[c.key]/total;const a=pct*360;const s=cum;cum+=a;return{...c,pct,angle:a,start:s};});
    const toXY=(cx,cy,r,deg)=>{const rad=(deg-90)*Math.PI/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};};
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
    setSpend(mkSpend()); setSalary(0); setNote("");
  };

  const INP={width:"100%",border:`1.5px solid ${th.border}`,borderRadius:10,padding:"8px 12px",fontSize:13,color:th.text,background:th.input,outline:"none",boxSizing:"border-box",fontFamily:th.font};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {th.isVaishali&&<QStrip q="Track every rupee — because a queen knows where her money goes. 👑" th={th}/>}
      {overspending && +salary>0 && (
        <div style={{background:th.isDark?"rgba(220,38,38,0.15)":"#fff1f2",border:`2px solid ${th.danger}`,borderRadius:16,padding:"14px 16px"}}>
          <div style={{fontSize:18,marginBottom:4}}>⚠️</div>
          <div style={{fontWeight:700,color:th.danger,fontSize:14,marginBottom:4}}>{th.isVaishali?"Financial Discipline Alert 💸":"Spending Alert"}</div>
          <div style={{fontSize:12,color:th.isDark?"#fca5a5":th.danger}}>Your spending is <strong>{spendPct.toFixed(1)}%</strong> of your income — above the 50% threshold. {th.isVaishali?"Queens budget, not just earn! Review your biggest expenses. 👑":"Consider reviewing your expenses."}</div>
          <div style={{marginTop:8,fontSize:11,color:th.textMuted}}>Target: spend ≤50% · Spent: {fmtFull(totalSpent)} · Income: {fmtFull(+salary)}</div>
        </div>
      )}
      <Sec title={th.isVaishali?"📅 Month & Income":"Month & Income"} th={th}>
        <F label="Month" value={month} onChange={setMonth} placeholder="e.g. May 2025" th={th}/>
        <F label="Salary / Income Credited (₹)" type="number" value={salary} onChange={setSalary} placeholder="Amount credited" th={th}/>
        <F label="Savings Target (%)" type="number" value={target} onChange={setTarget} placeholder="e.g. 50" th={th}/>
      </Sec>
      <Sec title={th.isVaishali?"💸 Expenses by Category":"Expenses by Category"} th={th}>
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
        <F label="Notes / Remarks" value={note} onChange={setNote} placeholder="e.g. vacation month, big purchase..." th={th}/>
      </Sec>
      {(+salary>0||totalSpent>0)&&(
        <>
          <div style={{background:th.cardBg,border:`2px solid ${sc}`,borderRadius:16,padding:16,textAlign:"center"}}>
            <div style={{fontSize:26}}>{onTrack?(th.isVaishali?"💅":"✓"):(th.isVaishali?"🌷":"!")}</div>
            <div style={{fontFamily:th.serif,fontSize:16,fontWeight:700,color:sc,marginBottom:4}}>{onTrack?`On track! Saved ${savedPct.toFixed(1)}%`:`Savings at ${savedPct.toFixed(1)}%`}</div>
            <div style={{height:14,background:th.isDark?"rgba(255,255,255,0.1)":th.bg,borderRadius:10,position:"relative",margin:"8px 0"}}>
              <div style={{width:`${Math.min(100,savedPct)}%`,height:"100%",background:sc,borderRadius:10,transition:"width .5s"}}/>
              <div style={{position:"absolute",top:-3,bottom:-3,left:`${tgt}%`,width:2,background:th.accent,transform:"translateX(-50%)"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:th.text}}>
              <span>Spent: {fmtFull(totalSpent)}</span>
              <span style={{fontWeight:700,color:sc}}>Saved: {fmtFull(saved)}</span>
              <span>Income: {fmtFull(+salary)}</span>
            </div>
          </div>
          {nonZero.length>0&&(
            <Sec title={th.isVaishali?"📊 Spending Breakdown":"Spending Breakdown"} th={th}>
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
                      <div style={{fontSize:9,color:th.textMuted,textAlign:"right"}}>{(+spend[c.key]/total*100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </Sec>
          )}
          <Sec title={th.isVaishali?"📋 This Month Summary":"This Month Summary"} th={th}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <tbody>
                {[["Income",fmtFull(+salary||0),"#3b82f6"],["Total Spent",fmtFull(totalSpent),th.danger],["Amount Saved",fmtFull(saved),th.success],["Savings %",`${savedPct.toFixed(1)}%`,sc],["Target %",`${tgt}%`,th.accent],["Spending %",`${spendPct.toFixed(1)}%`,overspending?th.danger:"#d97706"]].map(([l,v,c])=>(
                  <tr key={l}><td style={{padding:"7px 4px",fontSize:12,color:th.text,borderBottom:`1px solid ${th.border}`}}>{l}</td><td style={{padding:"7px 4px",fontSize:12,textAlign:"right",color:c,fontWeight:600,borderBottom:`1px solid ${th.border}`}}>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </Sec>
          <button style={{display:"block",width:"100%",background:th.isVaishali?`linear-gradient(90deg,${th.accentL},${th.accent})`:(th.isDark?"#fff":"#111"),color:th.isVaishali?"#fff":(th.isDark?"#000":"#fff"),border:"none",borderRadius:12,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:th.font}} onClick={saveMonth}>Save This Month's Record</button>
        </>
      )}
      {(data.spendHistory||[]).length>0&&(
        <>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>exportSpendingCSV(data.spendHistory||[])} style={{flex:1,padding:"10px",background:th.isDark?"#1e3a5f":"#eff6ff",color:th.isDark?"#93c5fd":"#1d4ed8",border:`1.5px solid ${th.isDark?"#1d4ed8":"#93c5fd"}`,borderRadius:12,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:th.font}}>📄 Export CSV</button>
            <button onClick={()=>exportSpendingExcel(data.spendHistory||[])} style={{flex:1,padding:"10px",background:th.isVaishali?(th.isDark?"rgba(250,168,212,0.15)":"#fff0f6"):(th.isDark?"#1a1a1a":"#f9fafb"),color:th.isVaishali?th.accentL:th.text,border:`1.5px solid ${th.isVaishali?th.accentL:th.border}`,borderRadius:12,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:th.font}}>📗 Export Excel</button>
          </div>
          <Sec title={th.isVaishali?"📅 Spending History":"Spending History"} th={th}>
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
                  {h.note&&<div style={{fontSize:10,color:th.textMuted,marginTop:2,fontStyle:"italic"}}>📝 {h.note}</div>}
                </div>
              );
            })}
          </Sec>
        </>
      )}
    </div>
  );
}

// ── LOAN PLAN TAB ─────────────────────────────────────────────────────────────
function LoanPlanTab({data,th}){
  const loans=data.loans.filter(l=>+l.outstanding>0&&+l.emi>0);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {th.isVaishali&&<QStrip q="Debt is temporary. Financial freedom is forever. 🌸" th={th}/>}
      {loans.length===0&&<Empty text={th.isVaishali?"Add loan details in the Debts tab first 💐":"Add loan details in the Debts tab first"} th={th}/>}
      {loans.map((l,i)=>{
        const outstanding=+l.outstanding||0,emi=+l.emi||0,rate=+l.rate||0,mr=rate/100/12;
        let months=0;
        if(mr>0&&emi>outstanding*mr) months=Math.ceil(-Math.log(1-outstanding*mr/emi)/Math.log(1+mr));
        else if(mr===0&&emi>0) months=Math.ceil(outstanding/emi);
        const totalPayable=emi*months,totalInterest=Math.max(0,totalPayable-outstanding);
        const extra=emi*1.2;
        let mFaster=0;
        if(mr>0&&extra>outstanding*mr) mFaster=Math.ceil(-Math.log(1-outstanding*mr/extra)/Math.log(1+mr));
        const intSaved=Math.max(0,totalInterest-(extra*mFaster-outstanding));
        const done=new Date(); done.setMonth(done.getMonth()+months);
        return (
          <Sec key={i} title={`${th.isVaishali?"🏛️ ":""}${l.name||`Loan ${i+1}`}${l.type?` — ${l.type}`:""}`} th={th}>
            <div style={{display:"flex",gap:12,marginBottom:10}}>
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="28" fill="none" stroke={th.isDark?"rgba(255,255,255,0.1)":"#fce7f3"} strokeWidth="7"/>
                <circle cx="36" cy="36" r="28" fill="none" stroke={th.danger} strokeWidth="7" strokeDasharray="175.9 0" strokeLinecap="round" transform="rotate(-90 36 36)"/>
                <text x="36" y="33" textAnchor="middle" fill={th.danger} fontSize="10" fontWeight="bold">{months}mo</text>
                <text x="36" y="44" textAnchor="middle" fill={th.textMuted} fontSize="7">left</text>
              </svg>
              <div>
                <div style={{fontSize:12,color:th.danger,fontWeight:700}}>Outstanding: {fmtFull(outstanding)}</div>
                <div style={{fontSize:11,color:th.text}}>Rate: {rate}% · EMI: {fmtFull(emi)}/mo</div>
                <div style={{fontSize:11,color:th.textMuted}}>Done: {done.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</div>
                <div style={{fontSize:11,color:th.danger}}>Total Interest: {fmtFull(totalInterest)}</div>
              </div>
            </div>
            {months>0&&(
              <div style={{marginBottom:10}}>
                {[3,6,12,24].filter(m=>m<months).map(m=>{
                  const nwBal=outstanding*Math.pow(1+mr,m)-emi*((Math.pow(1+mr,m)-1)/mr);
                  return (
                    <div key={m} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0",borderBottom:`1px solid ${th.border}`}}>
                      <span style={{color:th.text}}>After {m} months</span>
                      <span style={{color:th.danger,fontWeight:600}}>{fmtFull(Math.max(0,nwBal))} left</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{background:th.isDark?"rgba(16,185,129,0.1)":"#f0fdf4",borderRadius:12,padding:12,border:`1px solid ${th.isDark?"#064e3b":"#bbf7d0"}`}}>
              <div style={{fontWeight:700,color:th.success,fontSize:12,marginBottom:6}}>Pay 20% Extra → Save More</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0"}}>
                <span style={{color:th.isDark?"#6ee7b7":"#166534"}}>Extra EMI: {fmtFull(extra)}/mo</span>
                <span style={{color:th.success,fontWeight:700}}>{months-mFaster>0?`${months-mFaster} months faster`:""}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                <span style={{color:th.isDark?"#6ee7b7":"#166534"}}>Interest Saved</span>
                <span style={{color:th.success,fontWeight:700}}>{fmtFull(intSaved)}</span>
              </div>
            </div>
          </Sec>
        );
      })}
    </div>
  );
}

// ── AI SUGGESTIONS ────────────────────────────────────────────────────────────
function AISuggestions({data,summary,targetAmt,targetYr,growth,extra,th}){
  const [suggestions,setSuggestions]=useState([]);
  const [loading,setLoading]=useState(false);
  const [loaded,setLoaded]=useState(false);

  const latestSpend=(data.spendHistory||[]).slice(-1)[0];
  const now=new Date();
  const yearsLeft=targetYr-now.getFullYear();
  const monthsLeft=yearsLeft*12-now.getMonth();
  const gap=targetAmt-summary.netWorth;
  const monthlyNeeded=monthsLeft>0?Math.round(gap/monthsLeft):0;

  const topSpendCats=latestSpend
    ?SPEND_CATS.filter(c=>+latestSpend.spend[c.key]>0).sort((a,b)=>+latestSpend.spend[b.key]-+latestSpend.spend[a.key]).slice(0,3)
    :[];

  const fetchSuggestions=async()=>{
    setLoading(true);
    try{
      const name=th.isVaishali?"Vaishali":"Prajay";
      const toneNote=th.isVaishali
        ?"Be warm, empowering, and direct. Use encouraging language suited for a woman building her financial independence."
        :"Be direct, analytical, and no-nonsense. Use concise, action-oriented language suited for a man focused on building wealth efficiently.";
      const pronoun=th.isVaishali?"her":"his";
      const prompt=`You are a personal finance advisor for an Indian ${th.isVaishali?"woman":"man"} named ${name}. Based on ${pronoun} financial data, give ${pronoun} 6 highly specific, actionable suggestions to reach ${pronoun} wealth goal. ${toneNote}

${name}'s financial profile:
- Current Net Worth: ₹${summary.netWorth.toLocaleString("en-IN")}
- Total Assets: ₹${summary.totalAssets.toLocaleString("en-IN")}
- Total Liabilities: ₹${summary.totalLiabilities.toLocaleString("en-IN")}
- Liquid Cash: ₹${summary.liquidCash.toLocaleString("en-IN")}
- Free Cash: ₹${summary.freeCash.toLocaleString("en-IN")}
- Monthly EMI: ₹${summary.monthlyEMI.toLocaleString("en-IN")}
- Mutual Funds: ₹${summary.mfTotal.toLocaleString("en-IN")}
- Stocks: ₹${summary.stockTotal.toLocaleString("en-IN")}
- Gold: ₹${summary.goldTotal.toLocaleString("en-IN")}
- Fixed Deposits: ₹${summary.fdTotal.toLocaleString("en-IN")}
- Provident Fund: ₹${summary.pfTotal.toLocaleString("en-IN")}
- Wealth Goal: ₹${targetAmt.toLocaleString("en-IN")} by ${targetYr}
- Years left: ${yearsLeft}
- Monthly savings needed to reach goal: ₹${monthlyNeeded.toLocaleString("en-IN")}
- Current extra monthly savings set: ₹${(+extra||0).toLocaleString("en-IN")}
- Expected growth rate: ${growth}% per year
${latestSpend?`
Recent monthly spending:
- Income: ₹${latestSpend.salary.toLocaleString("en-IN")}
- Total spent: ₹${latestSpend.totalSpent.toLocaleString("en-IN")}
- Savings rate: ${latestSpend.savedPct.toFixed(1)}%
- Top spend categories: ${topSpendCats.map(c=>`${c.label}: ₹${latestSpend.spend[c.key].toLocaleString("en-IN")}`).join(", ")}`:"No spending history yet."}

Return ONLY a JSON array of exactly 6 objects, each with:
- "emoji": one relevant emoji
- "title": short action title (max 5 words)
- "suggestion": specific actionable advice (2-3 sentences, use ₹ amounts where relevant)
- "impact": "high" | "medium" | "low"
- "category": "invest" | "save" | "debt" | "income" | "protect"

No preamble, no markdown, just the JSON array.`;

      const response=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})
      });
      const result=await response.json();
      const text=result.content?.map(c=>c.text||"").join("")||"[]";
      const clean=text.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      setSuggestions(parsed);
      setLoaded(true);
    }catch(e){
      setSuggestions([
        {emoji:"💡",title:"Start with SIPs",suggestion:"Begin a monthly SIP of at least ₹5,000 in a diversified equity mutual fund. Even small amounts compound significantly over time.",impact:"high",category:"invest"},
        {emoji:"💳",title:"Clear high-interest debt first",suggestion:"Pay off credit card and LazyPay dues immediately — they typically charge 36-42% p.a. This is your highest guaranteed return.",impact:"high",category:"debt"},
        {emoji:"🏦",title:"Build an emergency fund",suggestion:"Keep 3-6 months of expenses in a high-yield savings account or liquid fund. This prevents dipping into investments during emergencies.",impact:"medium",category:"protect"},
      ]);
      setLoaded(true);
    }
    setLoading(false);
  };

  const impactColor=(impact)=>impact==="high"?"#4ade80":impact==="medium"?"#fbbf24":"#94a3b8";
  const catColor=(cat)=>({invest:"#8b5cf6",save:"#3b82f6",debt:"#f87171",income:"#10b981",protect:"#f59e0b"})[cat]||"#6b7280";

  return (
    <div>
      {!loaded&&(
        <div style={{textAlign:"center",padding:"20px 0"}}>
          {th.isVaishali&&<QStrip q="Your personalized wealth roadmap is just one tap away. 💅" th={th}/>}
          <button onClick={fetchSuggestions} disabled={loading} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"14px 24px",background:th.isDark&&th.isVaishali?"linear-gradient(90deg,#e91e8c,#c2185b)":th.isVaishali?`linear-gradient(90deg,${th.accentL},${th.accentD})`:(th.isDark?"#fff":"#111"),color:th.isVaishali?"#fff":(th.isDark?"#000":"#fff"),border:"none",borderRadius:16,fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",fontFamily:th.font,boxShadow:th.isDark&&th.isVaishali?"0 4px 20px rgba(233,30,140,0.35)":"none",opacity:loading?0.7:1}}>
            {loading?(<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>{th.isVaishali?"🌸":"◆"}</span>{th.isVaishali?"Analysing your wealth…":"Analysing your portfolio…"}</>):(<>{th.isVaishali?"✨ Get My Wealth Suggestions 👑":"◆ Get My Wealth Suggestions"}</>)}
          </button>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {loaded&&suggestions.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {suggestions.map((s,i)=>(
            <div key={i} style={{background:th.isDark&&th.isVaishali?"#2a1020":th.isDark?"#1a1a1a":th.cardBg,borderRadius:16,padding:"14px 16px",border:`1.5px solid ${th.isDark&&th.isVaishali?"#4a1a38":th.border}`,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:4,background:impactColor(s.impact),borderRadius:"4px 0 0 4px"}}/>
              <div style={{paddingLeft:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:20}}>{s.emoji}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:th.isDark&&th.isVaishali?"#f0c8d8":th.text,fontFamily:th.serif}}>{s.title}</div>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    <span style={{fontSize:9,background:catColor(s.category)+"22",color:catColor(s.category),borderRadius:6,padding:"2px 6px",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{s.category}</span>
                    <span style={{fontSize:9,background:impactColor(s.impact)+"22",color:impactColor(s.impact),borderRadius:6,padding:"2px 6px",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{s.impact}</span>
                  </div>
                </div>
                <div style={{fontSize:12,color:th.isDark&&th.isVaishali?"#c490a8":th.textMuted,lineHeight:1.6}}>{s.suggestion}</div>
              </div>
            </div>
          ))}
          <button onClick={fetchSuggestions} disabled={loading} style={{padding:"10px",marginTop:4,background:"transparent",border:`1.5px dashed ${th.isDark&&th.isVaishali?"#6b3a52":th.accentL}`,borderRadius:12,fontSize:12,fontWeight:700,color:th.isDark&&th.isVaishali?"#c490a8":th.accentL,cursor:"pointer",fontFamily:th.font}}>
            {loading?(th.isVaishali?"🌸 Refreshing...":"◆ Refreshing..."):(th.isVaishali?"🔄 Refresh Suggestions":"🔄 Refresh Suggestions")}
          </button>
        </div>
      )}
    </div>
  );
}

// ── PROJECTION TAB ────────────────────────────────────────────────────────────
function ProjectionTab({data,summary,th}){
  const [targetAmt,setTargetAmt]=useState(5000000);
  const [targetYr,setTargetYr]=useState(2030);
  const [growth,setGrowth]=useState(10);
  const [extra,setExtra]=useState(0);
  const now=new Date(); const ny=now.getFullYear(),nm=now.getMonth();

  const months=useMemo(()=>{
    const rows=[]; let nw=summary.netWorth;
    const mg=(1+growth/100)**(1/12)-1;
    const total=(targetYr-ny)*12+(11-nm);
    for(let i=0;i<=Math.min(total,60);i++){
      const d=new Date(ny,nm+i,1);
      rows.push({label:`${d.toLocaleString("default",{month:"short"})} ${d.getFullYear()}`,nw:Math.round(nw)});
      nw=nw*(1+mg)+(+extra||0);
    }
    return rows;
  },[summary.netWorth,growth,extra,targetYr]);

  const finalNW=months[months.length-1]?.nw||0;
  const onTrack=finalNW>=targetAmt;
  const gap=targetAmt-finalNW;

  const needed=useMemo(()=>{
    const total=(targetYr-ny)*12+(11-nm);
    const mg=(1+growth/100)**(1/12)-1;
    const rn=(1+mg)**total;
    return Math.max(0,Math.round((targetAmt-summary.netWorth*rn)*mg/(rn-1)));
  },[summary.netWorth,targetAmt,targetYr,growth]);

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
        <text x={PAD} y={y(pts[0].nw)-6} fontSize="8" fill={th.text}>{fmt(pts[0].nw)}</text>
        <text x={x(pts.length-1)} y={y(pts[pts.length-1].nw)-6} fontSize="8" fill={onTrack?th.success:(th.isDark&&th.isVaishali?"#e91e8c":th.accentL)} textAnchor="end">{fmt(finalNW)}</text>
      </svg>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {th.isVaishali&&<QStrip q="She who plans today, rules tomorrow. 💅" th={th}/>}
      <Sec title={th.isVaishali?"🎯 Set Your Wealth Goal":"Wealth Goal"} th={th}>
        <F label="Target Net Worth (₹)" type="number" value={targetAmt} onChange={v=>setTargetAmt(+v)} placeholder="e.g. 5000000" th={th}/>
        <F label="Target Year" type="number" value={targetYr} onChange={v=>setTargetYr(+v)} placeholder="e.g. 2030" th={th}/>
        <F label="Expected Annual Growth (%)" type="number" value={growth} onChange={v=>setGrowth(+v)} placeholder="e.g. 10" th={th}/>
        <F label="Additional Monthly Savings (₹)" type="number" value={extra} onChange={v=>setExtra(+v)} placeholder="Extra savings per month" th={th}/>
      </Sec>
      <div style={{background:th.isDark&&th.isVaishali?"#2a1020":th.cardBg,border:`2px solid ${onTrack?th.success:(th.isDark&&th.isVaishali?"#e91e8c":th.accentL)}`,borderRadius:16,padding:16,textAlign:"center"}}>
        <div style={{fontSize:24}}>{onTrack?(th.isVaishali?"💅":"✓"):(th.isVaishali?"🌷":"→")}</div>
        <div style={{fontFamily:th.serif,fontSize:16,fontWeight:700,color:onTrack?th.success:(th.isDark&&th.isVaishali?"#e91e8c":th.accentL),marginBottom:4}}>{onTrack?`On Track! Projected ${fmtFull(finalNW)}`:`Gap: ${fmtFull(Math.abs(gap))}`}</div>
        <div style={{fontSize:12,color:th.text}}>{onTrack?`You'll hit ${fmtFull(targetAmt)} by ${targetYr}`:`Save ₹${needed.toLocaleString("en-IN")}/month more`}</div>
      </div>
      <Sec title={th.isVaishali?"📈 Net Worth Projection":"Net Worth Projection"} th={th}>
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
      <Sec title={th.isVaishali?"✨ Personalised Wealth Advice":"AI Wealth Suggestions"} th={th}>
        <AISuggestions data={data} summary={summary} targetAmt={targetAmt} targetYr={targetYr} growth={growth} extra={extra} th={th}/>
      </Sec>
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
    ["—"],
    ["Gross Liabilities",fmtFull(summary.totalLiabilities),th.danger,true],
    [" Loans",fmtFull(summary.loanTotal),"#ef4444",false],
    [" Credit Cards",fmtFull(summary.ccTotal),"#f87171",false],
    [" LazyPay",fmtFull(summary.lazyPayTotal||0),"#fb923c",false],
    ["—"],
    ["NET WORTH",fmtFull(summary.netWorth),summary.netWorth>=0?th.accent:th.danger,true],
    ["—"],
    ["Liquid (Cash+Bank)",fmtFull(summary.liquidCash),"#4ec9a0",false],
    ["Free Cash",fmtFull(summary.freeCash),summary.freeCash>=0?"#4ec9a0":"#e05c7a",false],
    ["Locked Investments",fmtFull(summary.lockedInvestments),"#4ec9a0",false],
    ["Monthly EMI",fmtFull(summary.monthlyEMI),"#f97316",false],
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {th.isVaishali&&<QStrip q="Know your numbers. Own your future. 👑" th={th}/>}
      <Sec title={th.isVaishali?"📋 Full Wealth Snapshot":"Full Wealth Snapshot"} th={th}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <tbody>
            {rows.map(([l,v,c,bold],i)=>
              l==="—"?<tr key={i}><td colSpan={2} style={{padding:"3px 0"}}><div style={{borderTop:`1px solid ${th.border}`}}/></td></tr>:(
                <tr key={i} style={bold?{background:th.isDark?"rgba(255,255,255,0.04)":th.bg}:{}}>
                  <td style={{padding:"6px 4px",fontSize:l.startsWith(" ")?11:12,color:th.text,borderBottom:`1px solid ${th.border}`,fontWeight:bold?700:400}}>{l.trim()}</td>
                  <td style={{padding:"6px 4px",fontSize:bold?14:12,textAlign:"right",color:c,fontWeight:bold?700:400,borderBottom:`1px solid ${th.border}`,fontFamily:bold?th.serif:th.font}}>{v}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={()=>exportSnapshotExcel(summary,data)} style={{flex:1,padding:"9px",background:th.isVaishali&&!th.isDark?"linear-gradient(90deg,#e91e8c,#c2185b)":th.isVaishali&&th.isDark?"rgba(233,30,140,0.15)":th.isDark?"#1a1a1a":"#f9fafb",color:th.isVaishali?"#ffffff":th.text,border:th.isVaishali&&!th.isDark?"none":`1.5px solid ${th.isVaishali?(th.isDark?"#e91e8c":th.accentL):th.border}`,borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:th.font,boxShadow:th.isVaishali&&!th.isDark?"0 3px 14px rgba(233,30,140,0.35)":"none"}}>
            📗 Export Excel
          </button>
        </div>
      </Sec>
    </div>
  );
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
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
  const INP={width:"100%",border:`1.5px solid ${th.isDark&&th.isVaishali?"#4a1a38":th.border}`,borderRadius:10,padding:"8px 12px",fontSize:13,color:th.isDark&&th.isVaishali?"#f0c8d8":th.text,background:th.isDark&&th.isVaishali?"#1e0a18":th.input,outline:"none",boxSizing:"border-box",fontFamily:th.font};
  return (
    <div style={{marginBottom:8}}>
      <label style={{display:"block",fontSize:10,color:th.isDark&&th.isVaishali?"#c490a8":th.accent,marginBottom:2,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{label}</label>
      <input style={INP} type={type} value={value??""} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>
    </div>
  );
}

function Add({onClick,th}){
  return <button onClick={onClick} style={{display:"block",width:"100%",marginTop:4,padding:"8px",background:"transparent",border:`1.5px dashed ${th.isDark&&th.isVaishali?"#6b3a52":th.accentL}`,borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,color:th.isDark&&th.isVaishali?"#c490a8":th.accentL,fontFamily:th.font}}>+ Add More</button>;
}

function Empty({text,th}){return <div style={{color:th.textMuted,fontSize:13,textAlign:"center",padding:"12px 0",fontStyle:"italic"}}>{text}</div>;}

function QStrip({q,th}){
  return <div style={{background:th.isDark&&th.isVaishali?"linear-gradient(90deg,#2a1020,#3b1632)":th.stripBg,borderRadius:10,padding:"7px 12px",fontSize:11,color:th.isDark&&th.isVaishali?"#c490a8":th.accentL,fontStyle:"italic",marginBottom:8,borderLeft:`3px solid ${th.isDark&&th.isVaishali?"#e91e8c":th.accentL}`}}>🌸 {q}</div>;
}

function Cv({children,red}){return <div style={{fontSize:11,color:red?"#f87171":"inherit",marginTop:2,textAlign:"right",fontWeight:600}}>{children}</div>;}

function Total({children,red,th}){
  return <div style={{fontSize:12,color:red?th.danger:(th.isDark&&th.isVaishali?"#c490a8":th.accentL),textAlign:"right",marginTop:6,fontWeight:700}}>Total: {children}</div>;
}
