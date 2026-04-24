import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
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

function formatMonth(monthStr) {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

const API = "http://localhost:8000";

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

// ── Auth Screen ───────────────────────────────────────

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
        method: "POST",
        body: formData,
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
        <p style={styles.authSubtitle}>
          {isLogin ? "Sign in to your account" : "Create your account"}
        </p>

        <label style={styles.label}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.authInput}
          placeholder="you@email.com"
        />

        <label style={styles.label}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.authInput}
          placeholder="••••••••"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={loading ? styles.buttonDisabled : styles.button}
        >
          {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
        </button>

        <p style={styles.authSwitch}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <span
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            style={styles.authLink}
          >
            {isLogin ? "Sign up" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [people, setPeople] = useState([]);
  const [statements, setStatements] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [showAddPerson, setShowAddPerson] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) {
      fetch(`${API}/me`, { headers: authHeaders() })
        .then(r => r.json())
        .then(data => {
          if (data.email) setUser(data.email);
        })
        .catch(() => { })
        .finally(() => setCheckingAuth(false));
    } else {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchPeople();
      fetchStatements();
    }
  }, [user]);

  const fetchPeople = async () => {
    try {
      const response = await fetch(`${API}/people`, { headers: authHeaders() });
      const data = await response.json();
      setPeople(data);
      if (data.length > 0) setSelectedPersonId(data[0].id);
    } catch {
      console.log("Could not fetch people");
    }
  };

  const fetchStatements = async () => {
    try {
      const response = await fetch(`${API}/statements`, { headers: authHeaders() });
      const data = await response.json();
      setStatements(data);
    } catch {
      console.log("Could not fetch statements");
    }
  };

  const addPerson = async () => {
    if (!newPersonName.trim()) return;
    const formData = new FormData();
    formData.append("name", newPersonName);
    try {
      const response = await fetch(`${API}/people`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await response.json();
      setNewPersonName("");
      setShowAddPerson(false);
      await fetchPeople();
      setSelectedPersonId(data.id);
    } catch {
      console.log("Could not add person");
    }
  };

  const deletePerson = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this person and all their statements?")) return;
    try {
      await fetch(`${API}/people/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      fetchPeople();
      fetchStatements();
      setResult(null);
    } catch {
      console.log("Could not delete person");
    }
  };

  const handleAnalyze = async () => {
    if (!file || !selectedPersonId) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const selectedPerson = people.find(p => p.id === parseInt(selectedPersonId));
    const formData = new FormData();
    formData.append("file", file);
    formData.append("person_name", selectedPerson?.name || "Me");
    formData.append("person_id", selectedPersonId);

    try {
      const response = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const text = await response.text();
      const data = JSON.parse(text);
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        fetchStatements();
      }
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStatement = async (id) => {
    try {
      const response = await fetch(`${API}/statements/${id}`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      setResult({
        ...data.totals,
        insights: data.insights,
        transactions: data.transactions,
        month: data.month,
        person_name: data.person_name,
        id: data.id
      });
    } catch {
      console.log("Could not load statement");
    }
  };

  const deleteStatement = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this statement?")) return;
    try {
      await fetch(`${API}/statements/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      fetchStatements();
      if (result?.id === id) setResult(null);
    } catch {
      console.log("Could not delete statement");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setPeople([]);
    setStatements([]);
    setResult(null);
  };

  const chartData = result
    ? Object.entries(result.categories || {}).map(([name, value]) => ({
      name,
      amount: value,
    }))
    : [];

  const statementsByPerson = people.map(person => ({
    ...person,
    statements: statements.filter(s =>
      s.person_id === person.id || s.person_name === person.name
    )
  }));

  if (checkingAuth) return <div style={styles.loading}>Loading...</div>;
  if (!user) return <AuthScreen onLogin={setUser} />;

  return (
    <div style={styles.page}>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>People</h2>
          <button
            onClick={() => setShowAddPerson(!showAddPerson)}
            style={styles.addButton}
          >
            +
          </button>
        </div>

        {showAddPerson && (
          <div style={styles.addPersonBox}>
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Name"
              style={styles.addPersonInput}
              onKeyDown={(e) => e.key === "Enter" && addPerson()}
            />
            <button onClick={addPerson} style={styles.addPersonButton}>
              Add
            </button>
          </div>
        )}

        {statementsByPerson.map(person => (
          <div key={person.id} style={styles.personGroup}>
            <div style={styles.personHeader}>
              <p style={styles.personName}>{person.name}</p>
              <button
                onClick={(e) => deletePerson(person.id, e)}
                style={styles.deleteButton}
              >
                ✕
              </button>
            </div>

            {person.statements.length === 0 && (
              <p style={styles.noStatements}>No statements</p>
            )}

            {person.statements.map(s => (
              <div
                key={s.id}
                onClick={() => loadStatement(s.id)}
                style={styles.sidebarItem}
              >
                <div style={styles.sidebarTop}>
                  <p style={styles.sidebarMonth}>{formatMonth(s.month)}</p>
                  <button
                    onClick={(e) => deleteStatement(s.id, e)}
                    style={styles.deleteButton}
                  >
                    ✕
                  </button>
                </div>
                <p style={styles.sidebarAmount}>
                  {s.totals?.savings > 0
                    ? `Saved $${s.totals.savings.toLocaleString()}`
                    : `Spent $${s.totals?.spending?.toLocaleString() || 0}`}
                </p>

              </div>
            ))}
          </div>
        ))}

        {/* Logout */}
        <div style={styles.logoutSection}>
          <p style={styles.userEmail}>{user}</p>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={styles.main}>
        <h1 style={styles.title}>Finance Dashboard</h1>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Upload Statement</h2>

          {people.length === 0 ? (
            <p style={styles.noPeopleMsg}>
              Add a person using the + button in the sidebar first.
            </p>
          ) : (
            <>
              <div style={styles.uploadRow}>
                <div>
                  <label style={styles.label}>Person</label>
                  <select
                    value={selectedPersonId}
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                    style={styles.select}
                  >
                    {people.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Statement PDF</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files[0])}
                    style={styles.fileInput}
                  />
                </div>
              </div>
              {file && <p style={styles.fileName}>Selected: {file.name}</p>}
              <button
                onClick={handleAnalyze}
                disabled={!file || loading || !selectedPersonId}
                style={loading || !file ? styles.buttonDisabled : styles.button}
              >
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
                <p style={styles.resultLabel}>
                  {result.person_name} — {formatMonth(result.month)}
                </p>
                {result.merged && (
                  <p style={styles.mergedBadge}>
                    Merged with existing — {result.transaction_count} total transactions
                  </p>
                )}
              </div>
            )}

            <div style={styles.totalsRow}>
              <div style={styles.totalCard}>
                <p style={styles.totalLabel}>Income</p>
                <p style={styles.totalAmount}>
                  ${(result.income || 0).toLocaleString()}
                </p>
              </div>
              <div style={styles.totalCard}>
                <p style={styles.totalLabel}>Spending</p>
                <p style={{ ...styles.totalAmount, color: "#e05c5c" }}>
                  ${(result.spending || 0).toLocaleString()}
                </p>
              </div>
              <div style={styles.totalCard}>
                <p style={styles.totalLabel}>Savings</p>
                <p style={{ ...styles.totalAmount, color: "#2ecc71" }}>
                  ${(result.savings || 0).toLocaleString()}
                </p>
              </div>
              <div style={styles.totalCard}>
                <p style={styles.totalLabel}>Savings Rate</p>
                <p style={{ ...styles.totalAmount, color: "#4f86c6" }}>
                  {result.savings_rate || 0}%
                </p>
              </div>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Spending by Category</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Bar dataKey="amount">
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={CATEGORY_COLORS[entry.name] || "#95a5a6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>AI Insights</h2>
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
              <h2 style={styles.cardTitle}>All Transactions</h2>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {result.transactions?.map((t, i) => (
                    <tr key={i} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                      <td style={styles.td}>{t.date}</td>
                      <td style={styles.td}>{t.description}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.categoryBadge,
                          background: CATEGORY_COLORS[t.category] || "#95a5a6"
                        }}>
                          {t.category}
                        </span>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontFamily: "Arial, sans-serif",
    color: "#888",
  },
  authPage: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#f5f7fa",
    fontFamily: "Arial, sans-serif",
  },
  authCard: {
    background: "white",
    borderRadius: 16,
    padding: 40,
    width: 380,
    boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
  },
  authTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginBottom: 8,
    textAlign: "center",
  },
  authSubtitle: {
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
    fontSize: 14,
  },
  authInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 14,
    marginBottom: 16,
    boxSizing: "border-box",
  },
  authSwitch: {
    textAlign: "center",
    fontSize: 13,
    color: "#888",
    marginTop: 16,
  },
  authLink: {
    color: "#4f86c6",
    cursor: "pointer",
    fontWeight: "bold",
  },
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#f5f7fa",
    fontFamily: "Arial, sans-serif",
  },
  sidebar: {
    width: 220,
    background: "#1a1a2e",
    padding: 20,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
  },
  sidebarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sidebarTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    margin: 0,
  },
  addButton: {
    background: "#4f86c6",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: 24,
    height: 24,
    cursor: "pointer",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  addPersonBox: {
    background: "#2a2a3e",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    display: "flex",
    gap: 8,
  },
  addPersonInput: {
    flex: 1,
    padding: "6px 8px",
    borderRadius: 4,
    border: "none",
    fontSize: 13,
    background: "#1a1a2e",
    color: "white",
  },
  addPersonButton: {
    background: "#4f86c6",
    color: "white",
    border: "none",
    borderRadius: 4,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 13,
  },
  personGroup: {
    marginBottom: 20,
  },
  personHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  personName: {
    color: "#4f86c6",
    fontWeight: "bold",
    fontSize: 14,
    margin: 0,
  },
  noStatements: {
    color: "#555",
    fontSize: 12,
    margin: "0 0 8px 0",
  },
  sidebarItem: {
    background: "#2a2a3e",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    cursor: "pointer",
  },
  sidebarTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sidebarMonth: {
    color: "white",
    fontSize: 12,
    margin: 0,
  },
  sidebarAmount: {
    color: "#2ecc71",
    fontSize: 12,
    margin: "4px 0 0 0",
  },
  deleteButton: {
    background: "none",
    border: "none",
    color: "#888",
    cursor: "pointer",
    fontSize: 12,
    padding: 2,
  },
  logoutSection: {
    marginTop: "auto",
    paddingTop: 16,
    borderTop: "1px solid #2a2a3e",
  },
  userEmail: {
    color: "#888",
    fontSize: 11,
    margin: "0 0 8px 0",
    wordBreak: "break-all",
  },
  logoutButton: {
    background: "none",
    border: "1px solid #444",
    color: "#888",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 12,
    width: "100%",
  },
  main: {
    flex: 1,
    padding: "40px 32px",
    maxWidth: 900,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#1a1a2e",
  },
  card: {
    background: "white",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1a1a2e",
  },
  uploadRow: {
    display: "flex",
    gap: 24,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 6,
  },
  select: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #ddd",
    fontSize: 14,
    width: 180,
    background: "white",
  },
  fileInput: { display: "block", fontSize: 14 },
  fileName: { color: "#555", fontSize: 14, marginBottom: 12 },
  button: {
    background: "#4f86c6",
    color: "white",
    border: "none",
    padding: "12px 28px",
    borderRadius: 8,
    fontSize: 16,
    cursor: "pointer",
    fontWeight: "bold",
  },
  buttonDisabled: {
    background: "#ccc",
    color: "white",
    border: "none",
    padding: "12px 28px",
    borderRadius: 8,
    fontSize: 16,
    cursor: "not-allowed",
    fontWeight: "bold",
  },
  noPeopleMsg: { color: "#888", fontSize: 14 },
  error: { color: "#e05c5c", marginTop: 12 },
  resultLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginBottom: 16,
  },
  totalsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 20,
  },
  totalCard: {
    background: "white",
    borderRadius: 12,
    padding: 20,
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  totalLabel: { color: "#888", fontSize: 14, margin: "0 0 8px 0" },
  totalAmount: { fontSize: 28, fontWeight: "bold", margin: 0, color: "#1a1a2e" },
  summary: { fontSize: 16, lineHeight: 1.6, color: "#333", marginBottom: 20 },
  insightBox: {
    background: "#f5f7fa",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  insightLabel: {
    fontWeight: "bold",
    color: "#4f86c6",
    marginBottom: 8,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recommendation: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
    padding: 12,
    background: "#f5f7fa",
    borderRadius: 8,
  },
  recNumber: {
    background: "#4f86c6",
    color: "white",
    borderRadius: "50%",
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: "bold",
    flexShrink: 0,
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    background: "#f5f7fa",
    fontWeight: "bold",
    fontSize: 13,
    color: "#555",
  },
  td: { padding: "10px 12px", fontSize: 14 },
  rowEven: { background: "white" },
  rowOdd: { background: "#fafafa" },
  categoryBadge: {
    color: "white",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "bold",
  },
  resultLabelRow: {
    marginBottom: 16,
  },
  mergedBadge: {
    fontSize: 13,
    color: "#2ecc71",
    margin: "4px 0 0 0",
  },
  input: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #ddd",
    fontSize: 14,
    width: 180,
  },
};