import { useState, useMemo, useCallback } from "react";

// ─────────────────────────────────────────
//  Data helpers
// ─────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CATEGORIES = {
  income:  ["Salary","Freelance","Investment","Gift","Other Income"],
  expense: ["Housing","Food","Transport","Entertainment","Health","Shopping","Education","Utilities","Other"],
};

const CAT_COLORS = {
  Housing:"#6366f1", Food:"#f59e0b", Transport:"#10b981", Entertainment:"#ec4899",
  Health:"#3b82f6", Shopping:"#8b5cf6", Education:"#14b8a6", Utilities:"#f97316",
  Other:"#6b7280", "Other Income":"#84cc16",
  Salary:"#22c55e", Freelance:"#a3e635", Investment:"#34d399", Gift:"#fb923c",
};

const SEED_DATA = [
  {id:uid(),date:"2026-04-01",type:"income", amount:4500,category:"Salary",     note:"Monthly salary"},
  {id:uid(),date:"2026-04-03",type:"expense",amount:1200,category:"Housing",    note:"Rent"},
  {id:uid(),date:"2026-04-05",type:"expense",amount:280, category:"Food",       note:"Groceries"},
  {id:uid(),date:"2026-04-08",type:"expense",amount:95,  category:"Transport",  note:"Gas"},
  {id:uid(),date:"2026-04-10",type:"income", amount:650, category:"Freelance",  note:"Design project"},
  {id:uid(),date:"2026-04-14",type:"expense",amount:45,  category:"Entertainment",note:"Netflix+Spotify"},
  {id:uid(),date:"2026-04-17",type:"expense",amount:180, category:"Shopping",   note:"Clothes"},
  {id:uid(),date:"2026-04-20",type:"expense",amount:75,  category:"Utilities",  note:"Electric bill"},
  {id:uid(),date:"2026-04-22",type:"expense",amount:120, category:"Health",     note:"Gym membership"},
  {id:uid(),date:"2026-05-01",type:"income", amount:4500,category:"Salary",     note:"Monthly salary"},
  {id:uid(),date:"2026-05-02",type:"expense",amount:1200,category:"Housing",    note:"Rent"},
  {id:uid(),date:"2026-05-03",type:"expense",amount:310, category:"Food",       note:"Groceries + eating out"},
  {id:uid(),date:"2026-05-05",type:"income", amount:200, category:"Investment", note:"Dividends"},
  {id:uid(),date:"2026-05-07",type:"expense",amount:90,  category:"Transport",  note:"Bus pass"},
  {id:uid(),date:"2026-05-09",type:"expense",amount:250, category:"Shopping",   note:"Electronics"},
  {id:uid(),date:"2026-05-11",type:"expense",amount:55,  category:"Entertainment",note:"Concert ticket"},
];

const BUDGETS_SEED = {
  Housing:1300, Food:400, Transport:150, Entertainment:100,
  Shopping:200, Health:150, Utilities:100, Education:50,
};

// ─────────────────────────────────────────
//  Tiny chart components (no deps)
// ─────────────────────────────────────────
function BarChart({ data, color="#6366f1", height=80 }) {
  const max = Math.max(...data.map(d=>d.value), 1);
  return (
    <div style={{display:"flex", alignItems:"flex-end", gap:4, height, padding:"0 4px"}}>
      {data.map((d, i) => (
        <div key={i} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2}}>
          <div title={`$${d.value.toLocaleString()}`} style={{
            width:"100%", background:color, borderRadius:"3px 3px 0 0",
            height:`${(d.value/max)*100}%`, minHeight: d.value>0?3:0,
            transition:"height 0.3s", cursor:"default",
            opacity: 0.75 + (i/data.length)*0.25,
          }}/>
          <span style={{fontSize:9, color:"#6b7280", whiteSpace:"nowrap"}}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutSlice({ cx, cy, r, startAngle, endAngle, color, label, value, total }) {
  const toRad = d => (d-90)*Math.PI/180;
  const x1=cx+r*Math.cos(toRad(startAngle)), y1=cy+r*Math.sin(toRad(startAngle));
  const x2=cx+r*Math.cos(toRad(endAngle)),   y2=cy+r*Math.sin(toRad(endAngle));
  const large = endAngle-startAngle > 180 ? 1 : 0;
  const pct = ((value/total)*100).toFixed(1);
  return (
    <path d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
      fill={color} opacity={0.9} stroke="#1a1a2e" strokeWidth={2}>
      <title>{label}: ${value.toLocaleString()} ({pct}%)</title>
    </path>
  );
}

function PieChart({ segments, size=140 }) {
  const total = segments.reduce((s,d)=>s+d.value,0);
  if (!total) return <div style={{width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center",color:"#555",fontSize:12}}>No data</div>;
  let angle = 0;
  const cx=size/2, cy=size/2, r=size/2-4;
  return (
    <svg width={size} height={size}>
      {segments.map((s,i) => {
        const sweep = (s.value/total)*360;
        const slice = <DonutSlice key={i} cx={cx} cy={cy} r={r}
          startAngle={angle} endAngle={angle+sweep}
          color={s.color} label={s.label} value={s.value} total={total}/>;
        angle += sweep;
        return slice;
      })}
      <circle cx={cx} cy={cy} r={r*0.55} fill="#0f0f1e"/>
      <text x={cx} y={cy-6} textAnchor="middle" fill="#c8c8e8" fontSize={11} fontFamily="monospace">Total</text>
      <text x={cx} y={cy+10} textAnchor="middle" fill="#ffd700" fontSize={10} fontFamily="monospace" fontWeight="bold">
        ${total.toLocaleString()}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────
//  Components
// ─────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background:"#0f0f1e", border:"1px solid #1e1e3a", borderRadius:10,
      padding:16, ...style
    }}>{children}</div>
  );
}

function StatCard({ label, value, sub, color="#ffd700", icon }) {
  return (
    <Card style={{flex:1, minWidth:140}}>
      <div style={{fontSize:11, color:"#6b7280", marginBottom:4}}>{icon} {label}</div>
      <div style={{fontSize:22, fontWeight:"bold", color, fontFamily:"monospace"}}>{value}</div>
      {sub && <div style={{fontSize:11, color:"#4b5563", marginTop:4}}>{sub}</div>}
    </Card>
  );
}

function BudgetBar({ category, spent, budget }) {
  const pct = budget ? Math.min(100, (spent/budget)*100) : 0;
  const over = spent > budget;
  return (
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
        <span style={{color: CAT_COLORS[category]||"#888"}}>● {category}</span>
        <span style={{color: over?"#ff4466":"#6b7280"}}>${spent} / ${budget}</span>
      </div>
      <div style={{background:"#1a1a2e", height:7, borderRadius:4, overflow:"hidden"}}>
        <div style={{
          width:`${pct}%`, height:"100%", borderRadius:4, transition:"width 0.4s",
          background: over?"#ff4466":pct>75?"#f59e0b":CAT_COLORS[category]||"#6366f1"
        }}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
//  Main App
// ─────────────────────────────────────────
export default function FinanceDashboard() {
  const [txs, setTxs]       = useState(SEED_DATA);
  const [budgets, setBudgets]= useState(BUDGETS_SEED);
  const [tab, setTab]        = useState("dashboard"); // dashboard | transactions | budget
  const [filter, setFilter]  = useState({ type:"all", category:"all", month:"all" });
  const [form, setForm]      = useState({ type:"expense", amount:"", category:"Food", note:"", date:today() });
  const [editBudget, setEditBudget] = useState(null);

  // Derived stats
  const stats = useMemo(() => {
    const income  = txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
    const expense = txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
    const balance = income - expense;
    const savings = income ? ((balance/income)*100).toFixed(1) : 0;
    return { income, expense, balance, savings };
  }, [txs]);

  const monthlyData = useMemo(() => {
    const map = {};
    txs.forEach(t => {
      const m = t.date.slice(0,7);
      if (!map[m]) map[m] = {income:0, expense:0};
      map[m][t.type] += t.amount;
    });
    return Object.entries(map).sort().slice(-6).map(([m,v])=>({
      label: months[parseInt(m.slice(5,7))-1],
      ...v
    }));
  }, [txs]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    txs.filter(t=>t.type==="expense").forEach(t => {
      map[t.category] = (map[t.category]||0) + t.amount;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1])
      .map(([label,value])=>({label,value,color:CAT_COLORS[label]||"#888"}));
  }, [txs]);

  const currentMonthExpenses = useMemo(() => {
    const m = today().slice(0,7);
    const map = {};
    txs.filter(t=>t.type==="expense"&&t.date.startsWith(m))
       .forEach(t => map[t.category]=(map[t.category]||0)+t.amount);
    return map;
  }, [txs]);

  const filteredTxs = useMemo(() => {
    return txs.filter(t => {
      if (filter.type !== "all" && t.type !== filter.type) return false;
      if (filter.category !== "all" && t.category !== filter.category) return false;
      if (filter.month !== "all" && !t.date.startsWith(filter.month)) return false;
      return true;
    }).sort((a,b) => b.date.localeCompare(a.date));
  }, [txs, filter]);

  const addTransaction = useCallback(() => {
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) return;
    setTxs(prev => [...prev, {
      id:uid(), ...form, amount:parseFloat(form.amount)
    }]);
    setForm(f => ({...f, amount:"", note:""}));
  }, [form]);

  const deleteTransaction = useCallback((id) => {
    setTxs(prev => prev.filter(t => t.id !== id));
  }, []);

  const TAB_STYLE = active => ({
    padding:"8px 20px", border:"none", cursor:"pointer",
    fontFamily:"monospace", fontSize:13, borderRadius:6,
    background: active ? "#6366f1" : "transparent",
    color: active ? "#fff" : "#6b7280",
    transition:"all 0.2s",
  });

  return (
    <div style={{
      background:"#080812", minHeight:"100vh", fontFamily:"'Courier New', monospace",
      color:"#c8c8e8", padding:20,
    }}>
      {/* Header */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20}}>
        <div>
          <h1 style={{margin:0, fontSize:22, color:"#ffd700", letterSpacing:1}}>💰 Finance Tracker</h1>
          <p style={{margin:0, fontSize:12, color:"#4b5563"}}>Personal budget & expense dashboard</p>
        </div>
        <div style={{display:"flex", gap:4, background:"#0f0f1e", padding:4, borderRadius:8}}>
          {["dashboard","transactions","budget"].map(t => (
            <button key={t} onClick={()=>setTab(t)} style={TAB_STYLE(tab===t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── DASHBOARD ────────────────────────── */}
      {tab === "dashboard" && (
        <div style={{display:"flex", flexDirection:"column", gap:16}}>
          {/* Stat cards */}
          <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
            <StatCard label="Total Income"  value={`$${stats.income.toLocaleString()}`}  color="#22c55e" icon="⬆"/>
            <StatCard label="Total Expense" value={`$${stats.expense.toLocaleString()}`} color="#ff4466" icon="⬇"/>
            <StatCard label="Balance"       value={`$${stats.balance.toLocaleString()}`}
                      color={stats.balance>=0?"#ffd700":"#ff4466"} icon="💼"/>
            <StatCard label="Savings Rate"  value={`${stats.savings}%`} color="#6366f1" icon="🏦"
                      sub={stats.balance>=0?"On track":"Spending more than earning"}/>
          </div>

          <div style={{display:"flex", gap:16, flexWrap:"wrap"}}>
            {/* Monthly bar chart */}
            <Card style={{flex:2, minWidth:260}}>
              <div style={{fontSize:13, color:"#ffd700", marginBottom:12}}>📊 Monthly Overview</div>
              <div style={{display:"flex", gap:16}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11, color:"#22c55e", marginBottom:4}}>Income</div>
                  <BarChart data={monthlyData.map(m=>({label:m.label,value:m.income}))} color="#22c55e"/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11, color:"#ff4466", marginBottom:4}}>Expenses</div>
                  <BarChart data={monthlyData.map(m=>({label:m.label,value:m.expense}))} color="#ff4466"/>
                </div>
              </div>
            </Card>

            {/* Pie chart */}
            <Card style={{flex:1, minWidth:200}}>
              <div style={{fontSize:13, color:"#ffd700", marginBottom:12}}>🥧 By Category</div>
              <div style={{display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
                <PieChart segments={categoryBreakdown} size={130}/>
                <div style={{fontSize:11}}>
                  {categoryBreakdown.slice(0,5).map(s=>(
                    <div key={s.label} style={{display:"flex",gap:8,marginBottom:4,alignItems:"center"}}>
                      <span style={{width:8,height:8,background:s.color,borderRadius:"50%",display:"inline-block"}}/>
                      <span style={{color:"#9ca3af"}}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Recent transactions */}
          <Card>
            <div style={{fontSize:13, color:"#ffd700", marginBottom:12}}>🕐 Recent Transactions</div>
            {txs.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(t=>(
              <div key={t.id} style={{display:"flex",justifyContent:"space-between",
                padding:"8px 0", borderBottom:"1px solid #1e1e3a", fontSize:13}}>
                <div>
                  <span style={{
                    background: CAT_COLORS[t.category]+"22",
                    color: CAT_COLORS[t.category]||"#888",
                    padding:"2px 6px", borderRadius:4, fontSize:11, marginRight:8,
                  }}>{t.category}</span>
                  {t.note}
                </div>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <span style={{color:"#6b7280",fontSize:11}}>{t.date}</span>
                  <span style={{color:t.type==="income"?"#22c55e":"#ff4466",fontWeight:"bold"}}>
                    {t.type==="income"?"+":"-"}${t.amount}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── TRANSACTIONS ─────────────────────── */}
      {tab === "transactions" && (
        <div style={{display:"flex", flexDirection:"column", gap:16}}>
          {/* Add form */}
          <Card>
            <div style={{fontSize:13, color:"#ffd700", marginBottom:12}}>➕ Add Transaction</div>
            <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
              {[["type",["income","expense"]],["category", CATEGORIES[form.type]]].map(([key,opts])=>(
                <select key={key} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                  style={{background:"#1a1a2e",color:"#c8c8e8",border:"1px solid #2a2a4e",
                    padding:"8px 10px",borderRadius:6,fontFamily:"monospace",fontSize:12}}>
                  {opts.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              ))}
              <input type="number" placeholder="Amount" value={form.amount}
                onChange={e=>setForm(f=>({...f,amount:e.target.value}))}
                style={{width:100,background:"#1a1a2e",color:"#c8c8e8",
                  border:"1px solid #2a2a4e",padding:"8px 10px",borderRadius:6,
                  fontFamily:"monospace",fontSize:12}}/>
              <input type="text" placeholder="Note (optional)" value={form.note}
                onChange={e=>setForm(f=>({...f,note:e.target.value}))}
                style={{flex:1,minWidth:140,background:"#1a1a2e",color:"#c8c8e8",
                  border:"1px solid #2a2a4e",padding:"8px 10px",borderRadius:6,
                  fontFamily:"monospace",fontSize:12}}/>
              <input type="date" value={form.date}
                onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                style={{background:"#1a1a2e",color:"#c8c8e8",
                  border:"1px solid #2a2a4e",padding:"8px 10px",borderRadius:6,
                  fontFamily:"monospace",fontSize:12}}/>
              <button onClick={addTransaction} style={{
                background:"#6366f1",color:"#fff",border:"none",padding:"8px 20px",
                borderRadius:6,cursor:"pointer",fontFamily:"monospace",fontSize:12}}>
                Add
              </button>
            </div>
          </Card>

          {/* Filters */}
          <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
            {[["type",["all","income","expense"]],
              ["category",["all",...CATEGORIES.income,...CATEGORIES.expense]]].map(([key,opts])=>(
              <select key={key} value={filter[key]} onChange={e=>setFilter(f=>({...f,[key]:e.target.value}))}
                style={{background:"#0f0f1e",color:"#c8c8e8",border:"1px solid #1e1e3a",
                  padding:"6px 10px",borderRadius:6,fontFamily:"monospace",fontSize:12}}>
                {opts.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
              </select>
            ))}
            <span style={{marginLeft:"auto",fontSize:12,color:"#6b7280",alignSelf:"center"}}>
              {filteredTxs.length} transactions
            </span>
          </div>

          {/* Table */}
          <Card style={{padding:0, overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#12121e",color:"#6b7280"}}>
                  {["Date","Type","Category","Note","Amount",""].map(h=>(
                    <th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:400}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map(t=>(
                  <tr key={t.id} style={{borderTop:"1px solid #1a1a2e"}}>
                    <td style={{padding:"9px 14px",color:"#6b7280"}}>{t.date}</td>
                    <td style={{padding:"9px 14px"}}>
                      <span style={{color:t.type==="income"?"#22c55e":"#ff4466"}}>
                        {t.type==="income"?"▲":"▼"} {t.type}
                      </span>
                    </td>
                    <td style={{padding:"9px 14px"}}>
                      <span style={{color:CAT_COLORS[t.category]||"#888"}}>{t.category}</span>
                    </td>
                    <td style={{padding:"9px 14px",color:"#9ca3af"}}>{t.note||"—"}</td>
                    <td style={{padding:"9px 14px",fontWeight:"bold",
                      color:t.type==="income"?"#22c55e":"#ff4466"}}>
                      {t.type==="income"?"+":"-"}${t.amount.toLocaleString()}
                    </td>
                    <td style={{padding:"9px 14px"}}>
                      <button onClick={()=>deleteTransaction(t.id)} style={{
                        background:"transparent",border:"1px solid #2a2a4e",
                        color:"#6b7280",cursor:"pointer",borderRadius:4,
                        padding:"2px 8px",fontSize:11,fontFamily:"monospace"}}>✕</button>
                    </td>
                  </tr>
                ))}
                {filteredTxs.length===0 && (
                  <tr><td colSpan={6} style={{padding:20,textAlign:"center",color:"#4b5563"}}>
                    No transactions found
                  </td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── BUDGET ────────────────────────────── */}
      {tab === "budget" && (
        <div style={{display:"flex", gap:16, flexWrap:"wrap"}}>
          <Card style={{flex:2, minWidth:280}}>
            <div style={{fontSize:13, color:"#ffd700", marginBottom:4}}>🎯 Monthly Budget Tracker</div>
            <div style={{fontSize:11, color:"#6b7280", marginBottom:16}}>
              Showing spending for {months[new Date().getMonth()]} {new Date().getFullYear()}
            </div>
            {Object.keys(budgets).map(cat=>(
              <BudgetBar key={cat} category={cat}
                spent={currentMonthExpenses[cat]||0} budget={budgets[cat]}/>
            ))}
          </Card>

          <Card style={{flex:1, minWidth:220}}>
            <div style={{fontSize:13, color:"#ffd700", marginBottom:12}}>✏️ Edit Budgets</div>
            {Object.entries(budgets).map(([cat,val])=>(
              <div key={cat} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                <span style={{color:CAT_COLORS[cat]||"#888",fontSize:12,flex:1}}>{cat}</span>
                <span style={{color:"#6b7280",fontSize:12,minWidth:20}}>$</span>
                <input type="number" value={editBudget?.[cat]??val}
                  onChange={e=>setEditBudget(b=>({...(b||budgets),[cat]:+e.target.value}))}
                  style={{width:70,background:"#1a1a2e",color:"#c8c8e8",
                    border:"1px solid #2a2a4e",padding:"4px 6px",borderRadius:4,
                    fontFamily:"monospace",fontSize:12}}/>
              </div>
            ))}
            <button onClick={()=>{if(editBudget)setBudgets(editBudget);setEditBudget(null);}}
              style={{width:"100%",marginTop:8,background:"#6366f1",color:"#fff",
                border:"none",padding:"8px",borderRadius:6,cursor:"pointer",
                fontFamily:"monospace",fontSize:12}}>
              Save Budgets
            </button>
            <div style={{marginTop:16, padding:12, background:"#0a0a18",
                         borderRadius:6, fontSize:11, color:"#4b5563"}}>
              <div style={{color:"#6b7280", marginBottom:6}}>This month summary</div>
              <div>Total budget: <b style={{color:"#c8c8e8"}}>
                ${Object.values(budgets).reduce((a,b)=>a+b,0).toLocaleString()}
              </b></div>
              <div>Total spent: <b style={{color:"#ff4466"}}>
                ${Object.values(currentMonthExpenses).reduce((a,b)=>a+b,0).toLocaleString()}
              </b></div>
              <div>Remaining: <b style={{color:"#22c55e"}}>
                ${(Object.values(budgets).reduce((a,b)=>a+b,0) -
                   Object.values(currentMonthExpenses).reduce((a,b)=>a+b,0)).toLocaleString()}
              </b></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
