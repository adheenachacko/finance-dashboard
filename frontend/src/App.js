import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend
} from "recharts";

const CATEGORY_COLORS = {
  Food: "#4f86c6",
  Transport: "#f0a500",
  Shopping: "#e05c5c",
  Subscriptions: "#9b59b6",
  Utilities: "#1abc9c",
  Healthcare: "#2ecc71",
  Entertainment: "#e74c3c",
  Other: "#95a5a6",
};

const PERSON_COLORS = ["#4f86c6", "#e05c5c", "#2ecc71", "#f0a500"];

function formatMonth(monthStr) {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

function formatMonthShort(monthStr) {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleString("default", { month: "short", year: "2-digit" });
}

const API = "http://localhost:8000";
function getToken() { return localStorage.getItem("token"); }
function authHeaders() { return { Authorization: `Bearer ${getToken()}` }; }

function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    try {
      const response = await fetch(`${API}/${isLogin ? "login" : "signup"}`, {
        method: "POST", body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.detail || "Something went wrong");
      } else {
        localStorage.setItem("token", data.access_token);
        onLogin(data.email);
      }
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authPage}>
      <div style={styles.authCard}>
        <h1 style={styles.authTitle}>Finance Dashboard</h1>
        <p style={styles.authSubtitle}>{isLogin ? "Sign in to your account" : "Create your account"}</p>
        <label style={styles.label}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          style={styles.authInput} placeholder="you@email.com" />
        <label style={styles.label}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          style={styles.authInput} placeholder="••••••••"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        {error && <p style={styles.error}>{error}</p>}
        <button onClick={handleSubmit} disabled={loading}
          style={loading ? styles.buttonDisabled : styles.button}>
          {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
        </button>
        <p style={styles.authSwitch}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <span onClick={() => { setIsLogin(!isLogin); setError(null); }} style={styles.authLink}>
            {isLogin ? "Sign up" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [files, setFiles] = useState([]);
  const [accountNames, setAccountNames] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [people, setPeople] = useState([]);
  const [statements, setStatements] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [trendsData, setTrendsData] = useState([]);
  const [trendsPerson, setTrendsPerson] = useState("");
  const [householdMonth, setHouseholdMonth] = useState("");
  const [householdData, setHouseholdData] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      fetch(`${API}/me`, { headers: authHeaders() })
        .then(r => r.json())
        .then(data => { if (data.email) setUser(data.email); })
        .catch(() => { })
        .finally(() => setCheckingAuth(false));
    } else {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (user) { fetchPeople(); fetchStatements(); }
  }, [user]);

  useEffect(() => {
    if (people.length > 0 && !trendsPerson) {
      setTrendsPerson(people[0].id);
    }
  }, [people]);

  const fetchPeople = async () => {
    try {
      const response = await fetch(`${API}/people`, { headers: authHeaders() });
      const data = await response.json();
      setPeople(data);
      if (data.length > 0) setSelectedPersonId(data[0].id);
    } catch { console.log("Could not fetch people"); }
  };

  const fetchStatements = async () => {
    try {
      const response = await fetch(`${API}/statements`, { headers: authHeaders() });
      const data = await response.json();
      setStatements(data);
    } catch { console.log("Could not fetch statements"); }
  };

  const fetchTrends = async (personId) => {
  if (!personId) return;
  try {
    const response = await fetch(`${API}/trends/${personId}`, { headers: authHeaders() });
    const data = await response.json();
    if (Array.isArray(data)) {
      setTrendsData(data);
    } else {
      setTrendsData([]);
      console.log("Trends error:", data);
    }
  } catch { console.log("Could not fetch trends"); }
};

  const fetchHousehold = async (month) => {
    if (!month) return;
    try {
      const response = await fetch(`${API}/household/${month}`, { headers: authHeaders() });
      const data = await response.json();
      setHouseholdData(data);
    } catch { console.log("Could not fetch household"); }
  };

  const addPerson = async () => {
    if (!newPersonName.trim()) return;
    const formData = new FormData();
    formData.append("name", newPersonName);
    try {
      const response = await fetch(`${API}/people`, {
        method: "POST", headers: authHeaders(), body: formData,
      });
      const data = await response.json();
      setNewPersonName(""); setShowAddPerson(false);
      await fetchPeople();
      setSelectedPersonId(data.id);
    } catch { console.log("Could not add person"); }
  };

  const deletePerson = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this person and all their statements?")) return;
    try {
      await fetch(`${API}/people/${id}`, { method: "DELETE", headers: authHeaders() });
      fetchPeople(); fetchStatements(); setResult(null);
    } catch { console.log("Could not delete person"); }
  };

  const handleAnalyze = async () => {
    if (!files.length || !selectedPersonId) return;
    const selectedPerson = people.find(p => p.id === parseInt(selectedPersonId));
    setLoading(true); setError(null); setResult(null);

    try {
      let finalResult = null;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const formData = new FormData();
        formData.append("file", f);
        formData.append("person_name", selectedPerson?.name || "Me");
        formData.append("person_id", selectedPersonId);
        formData.append("account_name", accountNames[i] || f.name.replace(".pdf", ""));
        const response = await fetch(`${API}/analyze`, {
          method: "POST", headers: authHeaders(), body: formData,
        });
        const text = await response.text();
        const data = JSON.parse(text);
        if (data.error) { setError(data.error); break; }

        const acctName = accountNames[i];
        if (data.merged && data.accounts?.includes(acctName)) {
          const alreadyExists = statements.some(s =>
            (s.person_id === parseInt(selectedPersonId) || s.person_name === selectedPerson?.name) &&
            s.month === data.month &&
            s.totals?.accounts?.includes(acctName)
          );
          if (alreadyExists) {
            window.confirm(
              `You already have a "${acctName}" statement for ${formatMonth(data.month)}. It has been updated with the new data.`
            );
          }
        }

        finalResult = data;
      }
      if (finalResult) { setResult(finalResult); fetchStatements(); }
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStatement = async (id) => {
    try {
      const response = await fetch(`${API}/statements/${id}`, { headers: authHeaders() });
      const data = await response.json();
      setResult({
        ...data.totals,
        insights: data.insights,
        transactions: data.transactions,
        month: data.month,
        person_name: data.person_name,
        id: data.id,
        accounts: data.totals?.accounts || []
      });
      setCategoryFilter(null);
      setActiveTab("upload");
    } catch { console.log("Could not load statement"); }
  };

  const deleteStatement = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this statement?")) return;
    try {
      await fetch(`${API}/statements/${id}`, { method: "DELETE", headers: authHeaders() });
      fetchStatements();
      if (result?.id === id) setResult(null);
    } catch { console.log("Could not delete statement"); }
  };

  const updateCategory = async (transactionIndex, newCategory) => {
    if (!result?.id) return;
    try {
      const formData = new FormData();
      formData.append("category", newCategory);
      const response = await fetch(
        `${API}/statements/${result.id}/transaction/${transactionIndex}`,
        { method: "PATCH", headers: authHeaders(), body: formData }
      );
      const data = await response.json();
      setResult(prev => ({
        ...prev,
        transactions: data.transactions,
        categories: data.totals.categories
      }));
      setEditingCategory(null);
    } catch {
      console.log("Could not update category");
    }
  };

  const refreshInsights = async () => {
    if (!result?.id) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${API}/statements/${result.id}/refresh-insights`,
        { method: "POST", headers: authHeaders() }
      );
      const data = await response.json();
      setResult(prev => ({
        ...prev,
        ...data.totals,
        insights: data.insights
      }));
      fetchStatements();
    } catch {
      console.log("Could not refresh insights");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null); setPeople([]); setStatements([]); setResult(null);
  };

  const toggleMonth = (key) => {
    setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const chartData = result
    ? Object.entries(result.categories || {}).map(([name, value]) => ({ name, amount: value }))
    : [];

  const filteredTransactions = result?.transactions
    ? categoryFilter ? result.transactions.filter(t => t.category === categoryFilter) : result.transactions
    : [];

  const statementsByPerson = people.map(person => ({
    ...person,
    statements: statements.filter(s =>
      s.person_id === person.id || s.person_name === person.name
    )
  }));

  const existingAccounts = [...new Set(statements.flatMap(s => s.totals?.accounts || []))];
  const allNamed = files.every((_, i) => accountNames[i]?.trim());

  const availableMonths = [...new Set(statements.map(s => s.month))].sort();

  if (checkingAuth) return <div style={styles.loading}>Loading...</div>;
  if (!user) return <AuthScreen onLogin={setUser} />;

  return (
    <div style={styles.page}>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>People</h2>
          <button onClick={() => setShowAddPerson(!showAddPerson)} style={styles.addButton}>+</button>
        </div>

        {showAddPerson && (
          <div style={styles.addPersonBox}>
            <input type="text" value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Name" style={styles.addPersonInput}
              onKeyDown={(e) => e.key === "Enter" && addPerson()} />
            <button onClick={addPerson} style={styles.addPersonButton}>Add</button>
          </div>
        )}

        {statementsByPerson.map(person => (
          <div key={person.id} style={styles.personGroup}>
            <div style={styles.personHeader}>
              <p style={styles.personName}>{person.name}</p>
              <button onClick={(e) => deletePerson(person.id, e)} style={styles.deleteButton}>✕</button>
            </div>
            {person.statements.length === 0 && <p style={styles.noStatements}>No statements</p>}
            {person.statements.map(s => {
              const key = `${person.id}_${s.month}`;
              const isExpanded = expandedMonths[key];
              const accounts = s.totals?.accounts || [];
              return (
                <div key={s.id} style={styles.monthGroup}>
                  <div style={styles.monthHeader} onClick={() => toggleMonth(key)}>
                    <div style={styles.monthHeaderLeft}>
                      <span style={styles.monthArrow}>{isExpanded ? "▾" : "▸"}</span>
                      <p style={styles.sidebarMonth}>{formatMonth(s.month)}</p>
                    </div>
                    <button onClick={(e) => deleteStatement(s.id, e)} style={styles.deleteButton}>✕</button>
                  </div>
                  {isExpanded && (
                    <div style={styles.monthDetail}>
                      {accounts.length > 0 && (
                        <div style={styles.accountList}>
                          {accounts.map((acc, i) => <p key={i} style={styles.accountTag}>📄 {acc}</p>)}
                        </div>
                      )}
                      <div style={styles.monthTotals} onClick={() => loadStatement(s.id)}>
                        <p style={styles.monthTotalRow}><span style={styles.monthTotalLabel}>Income</span><span style={styles.monthTotalIncome}>${(s.totals?.income || 0).toLocaleString()}</span></p>
                        <p style={styles.monthTotalRow}><span style={styles.monthTotalLabel}>Spent</span><span style={styles.monthTotalSpent}>${(s.totals?.spending || 0).toLocaleString()}</span></p>
                        <p style={styles.monthTotalRow}><span style={styles.monthTotalLabel}>Saved</span><span style={s.totals?.savings > 0 ? styles.monthTotalSaved : styles.monthTotalSpent}>${(s.totals?.savings || 0).toLocaleString()}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <div style={styles.logoutSection}>
          <p style={styles.userEmail}>{user}</p>
          <button onClick={handleLogout} style={styles.logoutButton}>Sign out</button>
        </div>
      </div>

      {/* Main */}
      <div style={styles.main}>
        <h1 style={styles.title}>Finance Dashboard</h1>

        {/* Tabs */}
        <div style={styles.tabs}>
          {["upload", "trends", "household"].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "trends" && trendsPerson) fetchTrends(trendsPerson);
                if (tab === "household" && householdMonth) fetchHousehold(householdMonth);
              }}
              style={activeTab === tab ? styles.tabActive : styles.tab}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Upload Statement</h2>
              {people.length === 0 ? (
                <p style={styles.noPeopleMsg}>Add a person using the + button in the sidebar first.</p>
              ) : (
                <>
                  <div style={styles.uploadRow}>
                    <div>
                      <label style={styles.label}>Person</label>
                      <select value={selectedPersonId}
                        onChange={(e) => setSelectedPersonId(e.target.value)} style={styles.select}>
                        {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Account Name <span style={{ color: "#e05c5c" }}>*</span></label>
                      {files.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          {files.map((f, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                              <span style={{ fontSize: 13, color: "#555", width: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                📄 {f.name}
                              </span>
                              <input
                                type="text"
                                placeholder="Account name *"
                                value={accountNames[i] || ""}
                                onChange={(e) => setAccountNames(prev => ({ ...prev, [i]: e.target.value }))}
                                style={styles.input}
                                list="account-suggestions"
                              />
                            </div>
                          ))}
                          <datalist id="account-suggestions">
                            {existingAccounts.map((acc, i) => <option key={i} value={acc} />)}
                          </datalist>
                        </div>
                      )}
                      <datalist id="account-suggestions">
                        {existingAccounts.map((acc, i) => <option key={i} value={acc} />)}
                      </datalist>
                    </div>
                    <div>
                      <label style={styles.label}>Statement PDF(s)</label>
                      <input type="file" accept=".pdf,.csv" multiple
                        onChange={(e) => setFiles(Array.from(e.target.files))}
                        style={styles.fileInput} />
                    </div>
                  </div>
                  {files.length > 0 && (
                    <p style={styles.fileName}>
                      {files.length === 1 ? files[0].name : `${files.length} files selected`}
                    </p>
                  )}
                  <button onClick={handleAnalyze}
                    disabled={!files.length || loading || !selectedPersonId || !allNamed}
                    style={loading || !files.length || !allNamed ? styles.buttonDisabled : styles.button}>
                    {loading ? "Analyzing..." : "Analyze Statement"}
                  </button>
                </>
              )}
              {error && <p style={styles.error}>{error}</p>}
            </div>

            {result && (
              <>
                {result.person_name && result.month && (
                  <div style={styles.resultLabelRow}>
                    <p style={styles.resultLabel}>{result.person_name} — {formatMonth(result.month)}</p>
                    {result.accounts?.length > 0 && (
                      <p style={styles.accountsLine}>Accounts: {result.accounts.join(", ")}</p>
                    )}
                  </div>
                )}

                <div style={styles.totalsRow}>
                  {[
                    { label: "Income", value: result.income, color: "#1a1a2e" },
                    { label: "Spending", value: result.spending, color: "#e05c5c" },
                    { label: "Invested", value: result.invested || 0, color: "#9b59b6" },
                    { label: "Savings", value: result.savings, color: "#2ecc71" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={styles.totalCard}>
                      <p style={styles.totalLabel}>{label}</p>
                      <p style={{ ...styles.totalAmount, color }}>${(value || 0).toLocaleString()}</p>
                    </div>
                  ))}
                  <div style={styles.totalCard}>
                    <p style={styles.totalLabel}>Savings Rate</p>
                    <p style={{ ...styles.totalAmount, color: "#4f86c6" }}>{result.savings_rate || 0}%</p>
                  </div>
                </div>

                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>Spending by Category</h2>
                  <p style={styles.chartHint}>Click a bar to filter transactions by category</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} style={{ cursor: "pointer" }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                      <Bar dataKey="amount" onClick={(data) => setCategoryFilter(prev => prev === data.name ? null : data.name)}>
                        {chartData.map((entry) => (
                          <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#95a5a6"}
                            opacity={categoryFilter && categoryFilter !== entry.name ? 0.3 : 1} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={styles.card}>
                  <div style={styles.tableHeader}>
                    <h2 style={styles.cardTitle}>AI Insights</h2>
                    <button onClick={refreshInsights} disabled={loading} style={styles.clearFilter}>
                      ↻ Refresh Insights
                    </button>
                  </div>
                  <p style={styles.summary}>{result.insights?.summary}</p>
                  <div style={styles.insightBox}>
                    <p style={styles.insightLabel}>What you are doing well</p>
                    <p>{result.insights?.doing_well}</p>
                  </div>
                  <div style={styles.insightBox}>
                    <p style={styles.insightLabel}>Biggest opportunity</p>
                    <p>{result.insights?.biggest_opportunity}</p>
                  </div>
                  <p style={styles.insightLabel}>Recommendations</p>
                  {result.insights?.recommendations?.map((rec, i) => (
                    <div key={i} style={styles.recommendation}>
                      <span style={styles.recNumber}>{i + 1}</span>
                      <p style={{ margin: 0 }}>{rec}</p>
                    </div>
                  ))}
                </div>

                <div style={styles.card}>
                  <div style={styles.tableHeader}>
                    <h2 style={styles.cardTitle}>
                      {categoryFilter ? `Transactions — ${categoryFilter}` : "All Transactions"}
                    </h2>
                    {categoryFilter && (
                      <button onClick={() => setCategoryFilter(null)} style={styles.clearFilter}>
                        ✕ Clear filter
                      </button>
                    )}
                  </div>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Description</th>
                        <th style={styles.th}>Account</th>
                        <th style={styles.th}>Category</th>
                        <th style={styles.th}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((t, i) => (
                        <tr key={i} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                          <td style={styles.td}>{t.date}</td>
                          <td style={styles.td}>
                            <div>{t.description}</div>
                            {t.note && t.note !== t.description && (
                              <div style={styles.noteText}>{t.note}</div>
                            )}
                          </td>
                          <td style={styles.td}>
                            <span style={styles.accountBadge}>{t.account || "Unknown"}</span>
                          </td>
                          <td style={styles.td}>
                            {editingCategory === i ? (
                              <select
                                autoFocus
                                defaultValue={t.category}
                                onChange={(e) => updateCategory(i, e.target.value)}
                                onBlur={() => setEditingCategory(null)}
                                style={styles.categorySelect}
                              >
                                {["Food", "Transport", "Shopping", "Subscriptions", "Utilities",
                                  "Healthcare", "Entertainment", "Income", "Other"].map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                              </select>
                            ) : (
                              <span
                                style={{
                                  ...styles.categoryBadge,
                                  background: CATEGORY_COLORS[t.category] || "#95a5a6",
                                  cursor: "pointer"
                                }}
                                onClick={() => setEditingCategory(i)}
                                title="Click to edit category"
                              >
                                {t.category} ✎
                              </span>
                            )}
                          </td>
                          <td style={{
                            ...styles.td,
                            color: t.amount < 0 ? "#e05c5c" : "#2ecc71",
                            fontWeight: "bold"
                          }}>
                            {t.amount < 0 ? "-" : "+"}${Math.abs(t.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredTransactions.length === 0 && <p style={styles.noTransactions}>No transactions found.</p>}
                </div>
              </>
            )}
          </>
        )}

        {/* Trends Tab */}
        {activeTab === "trends" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Spending Trends</h2>
            <div style={styles.trendsControls}>
              <div>
                <label style={styles.label}>Person</label>
                <select
                  value={trendsPerson}
                  onChange={(e) => {
                    setTrendsPerson(e.target.value);
                    fetchTrends(e.target.value);
                  }}
                  style={styles.select}
                >
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            {trendsData.length === 0 ? (
              <p style={styles.noPeopleMsg}>No data yet. Upload at least 2 months of statements to see trends.</p>
            ) : (
              <>
                <h3 style={styles.chartSubtitle}>Income vs Spending</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendsData.map(d => ({ ...d, month: formatMonthShort(d.month) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#4f86c6" />
                    <Bar dataKey="spending" name="Spending" fill="#e05c5c" />
                  </BarChart>
                </ResponsiveContainer>

                <h3 style={styles.chartSubtitle}>Savings Rate Over Time</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendsData.map(d => ({ ...d, month: formatMonthShort(d.month) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis unit="%" />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Line type="monotone" dataKey="savings_rate" name="Savings Rate"
                      stroke="#2ecc71" strokeWidth={2} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>

                <h3 style={styles.chartSubtitle}>Monthly Summary</h3>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Month</th>
                      <th style={styles.th}>Income</th>
                      <th style={styles.th}>Spending</th>
                      <th style={styles.th}>Savings</th>
                      <th style={styles.th}>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendsData.map((d, i) => (
                      <tr key={i} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                        <td style={styles.td}>{formatMonth(d.month)}</td>
                        <td style={{ ...styles.td, color: "#4f86c6", fontWeight: "bold" }}>${d.income.toLocaleString()}</td>
                        <td style={{ ...styles.td, color: "#e05c5c", fontWeight: "bold" }}>${d.spending.toLocaleString()}</td>
                        <td style={{ ...styles.td, color: d.savings > 0 ? "#2ecc71" : "#e05c5c", fontWeight: "bold" }}>${d.savings.toLocaleString()}</td>
                        <td style={{ ...styles.td, color: "#4f86c6", fontWeight: "bold" }}>{d.savings_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {/* Household Tab */}
        {activeTab === "household" && (
          <div>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Household View</h2>
              <div style={styles.trendsControls}>
                <div>
                  <label style={styles.label}>Month</label>
                  <select
                    value={householdMonth}
                    onChange={(e) => {
                      setHouseholdMonth(e.target.value);
                      fetchHousehold(e.target.value);
                    }}
                    style={styles.select}
                  >
                    <option value="">Select a month</option>
                    {availableMonths.map(m => (
                      <option key={m} value={m}>{formatMonth(m)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {householdData && householdData.people.length > 0 ? (
              <>
                {/* Combined totals */}
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>Combined Household — {formatMonth(householdData.month)}</h2>
                  <div style={styles.totalsRow}>
                    {[
                      { label: "Total Income", value: householdData.combined.income, color: "#1a1a2e" },
                      { label: "Total Spending", value: householdData.combined.spending, color: "#e05c5c" },
                      { label: "Total Savings", value: householdData.combined.savings, color: "#2ecc71" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={styles.totalCard}>
                        <p style={styles.totalLabel}>{label}</p>
                        <p style={{ ...styles.totalAmount, color }}>${(value || 0).toLocaleString()}</p>
                      </div>
                    ))}
                    <div style={styles.totalCard}>
                      <p style={styles.totalLabel}>Household Rate</p>
                      <p style={{ ...styles.totalAmount, color: "#4f86c6" }}>{householdData.combined.savings_rate}%</p>
                    </div>
                  </div>
                </div>

                {/* Per person breakdown */}
                <div style={styles.householdGrid}>
                  {householdData.people.map((person, idx) => {
                    const color = PERSON_COLORS[idx % PERSON_COLORS.length];
                    const personChartData = Object.entries(person.categories || {}).map(([name, value]) => ({ name, amount: value }));
                    return (
                      <div key={person.person_id} style={styles.card}>
                        <h2 style={{ ...styles.cardTitle, color }}>{person.person_name}</h2>
                        {person.accounts?.length > 0 && (
                          <p style={styles.accountsLine}>Accounts: {person.accounts.join(", ")}</p>
                        )}
                        <div style={styles.personTotalsRow}>
                          <div style={styles.personTotalCard}>
                            <p style={styles.totalLabel}>Income</p>
                            <p style={{ ...styles.personTotalAmount, color }}>${(person.income || 0).toLocaleString()}</p>
                          </div>
                          <div style={styles.personTotalCard}>
                            <p style={styles.totalLabel}>Spending</p>
                            <p style={{ ...styles.personTotalAmount, color: "#e05c5c" }}>${(person.spending || 0).toLocaleString()}</p>
                          </div>
                          <div style={styles.personTotalCard}>
                            <p style={styles.totalLabel}>Savings</p>
                            <p style={{ ...styles.personTotalAmount, color: "#2ecc71" }}>${(person.savings || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={personChartData}>
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                            <Bar dataKey="amount">
                              {personChartData.map((entry) => (
                                <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#95a5a6"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })}
                </div>

                {householdData.people.length === 1 && (
                  <p style={styles.householdHint}>
                    Only {householdData.people[0].person_name} has statements for this month. Upload statements for other household members to see a full comparison.
                  </p>
                )}
              </>
            ) : householdMonth ? (
              <div style={styles.card}>
                <p style={styles.noPeopleMsg}>No statements found for {formatMonth(householdMonth)}. Upload statements for this month first.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  loading: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "Arial, sans-serif", color: "#888" },
  authPage: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f5f7fa", fontFamily: "Arial, sans-serif" },
  authCard: { background: "white", borderRadius: 16, padding: 40, width: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.1)" },
  authTitle: { fontSize: 28, fontWeight: "bold", color: "#1a1a2e", marginBottom: 8, textAlign: "center" },
  authSubtitle: { color: "#888", textAlign: "center", marginBottom: 24, fontSize: 14 },
  authInput: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 16, boxSizing: "border-box" },
  authSwitch: { textAlign: "center", fontSize: 13, color: "#888", marginTop: 16 },
  authLink: { color: "#4f86c6", cursor: "pointer", fontWeight: "bold" },
  page: { display: "flex", minHeight: "100vh", background: "#f5f7fa", fontFamily: "Arial, sans-serif" },
  sidebar: { width: 240, background: "#1a1a2e", padding: 20, flexShrink: 0, display: "flex", flexDirection: "column" },
  sidebarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sidebarTitle: { color: "white", fontSize: 16, fontWeight: "bold", margin: 0 },
  addButton: { background: "#4f86c6", color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  addPersonBox: { background: "#2a2a3e", borderRadius: 8, padding: 10, marginBottom: 16, display: "flex", gap: 8 },
  addPersonInput: { flex: 1, padding: "6px 8px", borderRadius: 4, border: "none", fontSize: 13, background: "#1a1a2e", color: "white" },
  addPersonButton: { background: "#4f86c6", color: "white", border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontSize: 13 },
  personGroup: { marginBottom: 20 },
  personHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  personName: { color: "#4f86c6", fontWeight: "bold", fontSize: 14, margin: 0 },
  noStatements: { color: "#555", fontSize: 12, margin: "0 0 8px 0" },
  monthGroup: { marginBottom: 8 },
  monthHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "8px 10px", borderRadius: 8, background: "#2a2a3e" },
  monthHeaderLeft: { display: "flex", alignItems: "center", gap: 6 },
  monthArrow: { color: "#4f86c6", fontSize: 12 },
  sidebarMonth: { color: "white", fontSize: 12, margin: 0 },
  monthDetail: { background: "#222236", borderRadius: "0 0 8px 8px", padding: 10 },
  accountList: { marginBottom: 8 },
  accountTag: { color: "#aaa", fontSize: 11, margin: "2px 0" },
  monthTotals: { cursor: "pointer" },
  monthTotalRow: { display: "flex", justifyContent: "space-between", margin: "3px 0", fontSize: 12 },
  monthTotalLabel: { color: "#888" },
  monthTotalIncome: { color: "#4f86c6", fontWeight: "bold" },
  monthTotalSpent: { color: "#e05c5c", fontWeight: "bold" },
  monthTotalSaved: { color: "#2ecc71", fontWeight: "bold" },
  deleteButton: { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 12, padding: 2 },
  logoutSection: { marginTop: "auto", paddingTop: 16, borderTop: "1px solid #2a2a3e" },
  userEmail: { color: "#888", fontSize: 11, margin: "0 0 8px 0", wordBreak: "break-all" },
  logoutButton: { background: "none", border: "1px solid #444", color: "#888", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, width: "100%" },
  main: { flex: 1, padding: "40px 32px", maxWidth: 960 },
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 16, color: "#1a1a2e" },
  tabs: { display: "flex", gap: 8, marginBottom: 24 },
  tab: { background: "white", border: "1px solid #ddd", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 14, color: "#555" },
  tabActive: { background: "#4f86c6", border: "1px solid #4f86c6", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 14, color: "white", fontWeight: "bold" },
  card: { background: "white", borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 4, color: "#1a1a2e" },
  chartHint: { fontSize: 12, color: "#aaa", marginBottom: 16 },
  chartSubtitle: { fontSize: 15, fontWeight: "bold", color: "#555", margin: "24px 0 12px 0" },
  trendsControls: { display: "flex", gap: 24, marginBottom: 20 },
  uploadRow: { display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" },
  label: { display: "block", fontSize: 13, fontWeight: "bold", color: "#555", marginBottom: 6 },
  select: { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, width: 180, background: "white" },
  input: { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, width: 180 },
  fileInput: { display: "block", fontSize: 14 },
  fileName: { color: "#555", fontSize: 14, marginBottom: 12 },
  button: { background: "#4f86c6", color: "white", border: "none", padding: "12px 28px", borderRadius: 8, fontSize: 16, cursor: "pointer", fontWeight: "bold" },
  buttonDisabled: { background: "#ccc", color: "white", border: "none", padding: "12px 28px", borderRadius: 8, fontSize: 16, cursor: "not-allowed", fontWeight: "bold" },
  noPeopleMsg: { color: "#888", fontSize: 14 },
  error: { color: "#e05c5c", marginTop: 12 },
  resultLabelRow: { marginBottom: 16 },
  resultLabel: { fontSize: 18, fontWeight: "bold", color: "#1a1a2e", margin: "0 0 4px 0" },
  accountsLine: { fontSize: 13, color: "#888", margin: 0 },
  totalsRow: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 20 },
  totalCard: { background: "white", borderRadius: 12, padding: 20, textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  totalLabel: { color: "#888", fontSize: 14, margin: "0 0 8px 0" },
  totalAmount: { fontSize: 28, fontWeight: "bold", margin: 0, color: "#1a1a2e" },
  householdGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginBottom: 20 },
  personTotalsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 },
  personTotalCard: { background: "#f5f7fa", borderRadius: 8, padding: 12, textAlign: "center" },
  personTotalAmount: { fontSize: 20, fontWeight: "bold", margin: 0 },
  householdHint: { color: "#888", fontSize: 13, textAlign: "center", padding: "0 0 20px 0" },
  summary: { fontSize: 16, lineHeight: 1.6, color: "#333", marginBottom: 20 },
  insightBox: { background: "#f5f7fa", borderRadius: 8, padding: 16, marginBottom: 16 },
  insightLabel: { fontWeight: "bold", color: "#4f86c6", marginBottom: 8, fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5 },
  recommendation: { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12, padding: 12, background: "#f5f7fa", borderRadius: 8 },
  recNumber: { background: "#4f86c6", color: "white", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold", flexShrink: 0 },
  tableHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  clearFilter: { background: "#f5f7fa", border: "1px solid #ddd", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 13, color: "#555" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 12px", background: "#f5f7fa", fontWeight: "bold", fontSize: 13, color: "#555" },
  td: { padding: "10px 12px", fontSize: 14 },
  rowEven: { background: "white" },
  rowOdd: { background: "#fafafa" },
  accountBadge: { background: "#f0f4f8", color: "#555", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: "bold", border: "1px solid #ddd" },
  categoryBadge: { color: "white", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: "bold" },
  noTransactions: { color: "#888", fontSize: 14, textAlign: "center", padding: 20 },
  requiredHint: { color: "#e05c5c", fontSize: 13, marginBottom: 8 },
  noteText: { fontSize: 11, color: "#aaa", marginTop: 2 },
  categorySelect: { fontSize: 12, padding: "2px 4px", borderRadius: 4, border: "1px solid #ddd" },
};