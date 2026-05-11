import React, { useState, useMemo, useEffect } from "react";

// ── SECURITY CONFIGURATION ──────────────────────────────────────────────────
// This string is replaced by GitHub Actions during deployment.
// If running locally, you can temporarily replace "__PRAJAY_PWD_HASH_PLACEHOLDER__" 
// with your actual SHA-256 hash to test it.
const PRAJAY_HASH = window.PRAJAY_PWD_HASH || "__PRAJAY_PWD_HASH_PLACEHOLDER__";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,400&display=swap";

// ── THEMES ──────────────────────────────────────────────────────────────────
const PRAJAY_DARK = {
  bg: "#050505",
  cardBg: "#111111",
  border: "#1f1f1f",
  accent: "#ffffff",
  text: "#ffffff",
  textMuted: "#888888",
  danger: "#ff453a",
  success: "#32d74b",
  navBg: "rgba(10,10,10,0.85)",
  font: "'Inter', sans-serif",
  isDark: true,
  isVaishali: false
};

const VAISHALI_LIGHT = {
  bg: "#fdf2f8", cardBg: "#ffffff", border: "#f9a8d4", accent: "#9d174d",
  text: "#4a044e", textMuted: "#be185d99", navBg: "#ffffff", font: "'Nunito', sans-serif",
  isDark: false, isVaishali: true
};

// ── DATA STRUCTURES ────────────────────────────────────────────────────────
const INIT_PRAJAY = {
  cash: 15000,
  banks: [{ id: 1, bankName: "HDFC", balance: 245000 }],
  loans: [{ id: 1, name: "Home Loan", outstanding: 1250000, rate: 8.5, emi: 18000 }],
  // V2 Specific Data Structures
  transactions: [], // Will hold individual expenses
  budgets: {
    Lunch: 5000,
    Rent: 25000,
    Fuel: 4000,
    Bujjamma: 2000,
    "Dineout and Order-in": 6000,
    Shopping: 5000,
    Entertainment: 3000,
    "One-Time Expenses": 10000
  }
};

// ── UTILS ──────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Math.abs(n).toLocaleString("en-IN")}`;

// SHA-256 Hashing helper for password verification
async function checkHash(input) {
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === PRAJAY_HASH;
}

// ── MAIN APP COMPONENT ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [data, setData] = useState(INIT_PRAJAY);
  const [activeTab, setActiveTab] = useState("home");

  const th = user === "vaishali" ? VAISHALI_LIGHT : PRAJAY_DARK;

  const handleLogin = async (pwd) => {
    if (user === "vaishali") {
      if (pwd === "1234") setUnlocked(true); // Placeholder for Vaishali
      else alert("Incorrect password");
    } else {
      // Prajay Authentication via SHA-256
      const isValid = await checkHash(pwd);
      if (isValid || PRAJAY_HASH === "__PRAJAY_PWD_HASH_PLACEHOLDER__") {
        setUnlocked(true);
      } else {
        alert("Invalid PIN ◆");
      }
    }
  };

  const handleLogout = () => {
    setUnlocked(false);
    setUser(null);
  };

  // 1. Initial Profile Selection Screen
  if (!user) {
    return (
      <div style={{ background: "#000", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
        <link href={FONT_LINK} rel="stylesheet" />
        <p style={{ color: "#666", fontSize: 12, letterSpacing: 4, marginBottom: 40 }}>SELECT VAULT</p>
        <div style={{ display: "flex", gap: 20 }}>
          <button onClick={() => setUser("prajay")} style={{ background: "#111", border: "1px solid #333", borderRadius: 24, padding: "30px 20px", width: 140, color: "#fff", cursor: "pointer", transition: "all 0.2s" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>◆</div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>Prajay</div>
            <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>Finance V2</div>
          </button>
          <button onClick={() => setUser("vaishali")} style={{ background: "linear-gradient(135deg, #9d174d, #db2777)", border: "none", borderRadius: 24, padding: "30px 20px", width: 140, color: "#fff", cursor: "pointer" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌸</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700 }}>Vaishali</div>
            <div style={{ fontSize: 10, color: "#fbcfe8", marginTop: 4, fontStyle: "italic" }}>Her Vault</div>
          </button>
        </div>
      </div>
    );
  }

  // 2. Login Screen
  if (!unlocked) {
    return (
      <div style={{ background: th.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: th.font }}>
        <div style={{ background: th.cardBg, padding: 40, borderRadius: 32, border: `1px solid ${th.border}`, width: 320, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 10, color: th.text }}>{user === "prajay" ? "◆" : "🌸"}</div>
          <h2 style={{ color: th.text, margin: "0 0 30px 0", fontSize: 24, fontWeight: 700 }}>Enter PIN</h2>
          <input 
            type="password" 
            placeholder="••••"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleLogin(e.target.value); }}
            style={{ width: "100%", background: th.bg, border: `1px solid ${th.border}`, padding: "16px", borderRadius: 16, color: th.text, fontSize: 24, textAlign: "center", letterSpacing: 8, outline: "none", marginBottom: 20 }}
          />
          <button 
            onClick={(e) => handleLogin(e.target.previousSibling.value)} 
            style={{ width: "100%", padding: "16px", borderRadius: 16, background: th.accent, color: th.bg, fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer" }}
          >
            Unlock
          </button>
          <button onClick={handleLogout} style={{ marginTop: 20, background: "none", border: "none", color: th.textMuted, fontSize: 12, cursor: "pointer" }}>← Back</button>
        </div>
      </div>
    );
  }

  // 3. Main FOLD UI Dashboard (Prajay)
  return (
    <div style={{ background: th.bg, minHeight: "100vh", color: th.text, fontFamily: th.font, paddingBottom: 100 }}>
      {/* Top Header */}
      <header style={{ padding: "50px 24px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: 2, color: th.textMuted, margin: "0 0 6px 0", fontWeight: 600 }}>DASHBOARD</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: -1 }}>Prajay ◆</h1>
        </div>
        <button onClick={handleLogout} style={{ background: th.cardBg, border: `1px solid ${th.border}`, color: th.text, width: 40, height: 40, borderRadius: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          🔒
        </button>
      </header>

      {/* Main Content Area */}
      <main style={{ padding: "0 24px" }}>
        {activeTab === "home" && <PrajayHome data={data} th={th} />}
        {activeTab === "spending" && <PrajaySpending th={th} />}
        {activeTab === "assets" && <PlaceholderTab title="Assets & Accounts" th={th} />}
        {activeTab === "payoff" && <PlaceholderTab title="Loan Repayment" th={th} />}
      </main>

      {/* FOLD-Style Bottom Navigation */}
      <nav style={{ 
        position: "fixed", bottom: 0, left: 0, right: 0, 
        background: th.navBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        display: "flex", justifyContent: "space-around", padding: "20px 10px 30px",
        borderTop: `1px solid ${th.border}`, zIndex: 100
      }}>
        {[
          { id: "home", label: "Overview", icon: "◆" },
          { id: "assets", label: "Assets", icon: "🏛️" },
          { id: "spending", label: "Activity", icon: "💸" },
          { id: "payoff", label: "Pay Off", icon: "📉" }
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{ 
              background: "none", border: "none", cursor: "pointer",
              color: activeTab === t.id ? th.accent : th.textMuted,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              transition: "color 0.2s"
            }}
          >
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── VIEWS / TABS ────────────────────────────────────────────────────────────

function PrajayHome({ data, th }) {
  // Temporary calculations for Phase 1
  const totalAssets = data.cash + data.banks.reduce((acc, b) => acc + b.balance, 0);
  const totalDebts = data.loans.reduce((acc, l) => acc + l.outstanding, 0);
  const netWorth = totalAssets - totalDebts;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      
      {/* Primary Net Worth Card */}
      <div style={{ background: th.cardBg, borderRadius: 28, padding: 24, border: `1px solid ${th.border}` }}>
        <p style={{ fontSize: 10, color: th.textMuted, letterSpacing: 2, margin: "0 0 8px 0", fontWeight: 600 }}>NET WORTH</p>
        <h2 style={{ fontSize: 42, fontWeight: 800, margin: 0, letterSpacing: -1.5 }}>
          {netWorth < 0 ? "-" : ""}{fmt(netWorth)}
        </h2>
        
        <div style={{ display: "flex", gap: 24, marginTop: 24 }}>
          <div>
             <p style={{ fontSize: 10, color: th.textMuted, margin: "0 0 4px 0", fontWeight: 600 }}>ASSETS</p>
             <p style={{ color: th.success, fontWeight: 700, fontSize: 16, margin: 0 }}>↑ {fmt(totalAssets)}</p>
          </div>
          <div>
             <p style={{ fontSize: 10, color: th.textMuted, margin: "0 0 4px 0", fontWeight: 600 }}>DEBTS</p>
             <p style={{ color: th.danger, fontWeight: 700, fontSize: 16, margin: 0 }}>↓ {fmt(totalDebts)}</p>
          </div>
        </div>
      </div>

      {/* Income vs Expense Graph Placeholder (Building in Phase 2) */}
      <div style={{ height: 220, background: th.cardBg, borderRadius: 28, border: `1px solid ${th.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
        <span style={{ fontSize: 32, marginBottom: 12 }}>📊</span>
        <p style={{ color: th.text, fontSize: 14, fontWeight: 600, margin: "0 0 4px 0" }}>Monthly Bar Graph</p>
        <p style={{ color: th.textMuted, fontSize: 12, margin: 0 }}>Will populate automatically based on Phase 2 Expense Logging.</p>
      </div>

    </div>
  );
}

function PrajaySpending({ th }) {
  return (
    <div style={{ background: th.cardBg, borderRadius: 28, padding: 30, border: `1px solid ${th.border}`, textAlign: "center" }}>
      <span style={{ fontSize: 40, display: "block", marginBottom: 16 }}>📝</span>
      <h3 style={{ fontSize: 18, margin: "0 0 8px 0", fontWeight: 700 }}>Expense Logging Setup</h3>
      <p style={{ color: th.textMuted, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
        Phase 1 layout complete. In Phase 2, this tab will feature the individual expense logging system with category limits and "Bujjamma" advance tracking.
      </p>
    </div>
  );
}

function PlaceholderTab({ title, th }) {
  return (
    <div style={{ background: th.cardBg, borderRadius: 28, padding: 30, border: `1px solid ${th.border}`, textAlign: "center" }}>
      <h3 style={{ fontSize: 18, margin: "0 0 8px 0", fontWeight: 700 }}>{title}</h3>
      <p style={{ color: th.textMuted, fontSize: 13, margin: 0 }}>Coming in Phase 2/3.</p>
    </div>
  );
}
