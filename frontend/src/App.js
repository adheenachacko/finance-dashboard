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

export default function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statements, setStatements] = useState([]);
  const [personName, setPersonName] = useState("Me");

  useEffect(() => {
    fetchStatements();
  }, []);

  const fetchStatements = async () => {
    try {
      const response = await fetch("http://localhost:8000/statements");
      const data = await response.json();
      setStatements(data);
    } catch {
      console.log("Could not fetch statements");
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("person_name", personName);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
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
      const response = await fetch(`http://localhost:8000/statements/${id}`);
      const data = await response.json();
      setResult({
        ...data.totals,
        insights: data.insights,
        transactions: data.transactions,
        month: data.month,
        person_name: data.person_name
      });
    } catch {
      console.log("Could not load statement");
    }
  };

  const deleteStatement = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this statement?")) return;
    try {
      await fetch(`http://localhost:8000/statements/${id}`, {
        method: "DELETE",
      });
      fetchStatements();
      if (result?.id === id) setResult(null);
    } catch {
      console.log("Could not delete statement");
    }
  };

  const chartData = result
    ? Object.entries(result.categories || {}).map(([name, value]) => ({
      name,
      amount: value,
    }))
    : [];

  return (
    <div style={styles.page}>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>History</h2>
        {statements.length === 0 && (
          <p style={styles.sidebarEmpty}>No statements yet</p>
        )}
        {statements.map((s) => (
          <div
            key={s.id}
            onClick={() => loadStatement(s.id)}
            style={styles.sidebarItem}
          >
            <div style={styles.sidebarTop}>
              <p style={styles.sidebarPerson}>{s.person_name}</p>
              <button
                onClick={(e) => deleteStatement(s.id, e)}
                style={styles.deleteButton}
              >
                ✕
              </button>
            </div>
            <p style={styles.sidebarMonth}>{s.month}</p>
            <p style={styles.sidebarAmount}>
              Saved ${s.totals?.savings?.toLocaleString() || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={styles.main}>
        <h1 style={styles.title}>Finance Dashboard</h1>

        {/* Upload Section */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Upload Statement</h2>
          <div style={styles.uploadRow}>
            <div>
              <label style={styles.label}>Person Name</label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="e.g. Adheena"
                style={styles.input}
              />
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
            disabled={!file || loading}
            style={loading || !file ? styles.buttonDisabled : styles.button}
          >
            {loading ? "Analyzing..." : "Analyze Statement"}
          </button>
          {error && <p style={styles.error}>{error}</p>}
        </div>

        {/* Results */}
        {result && (
          <>
            {result.person_name && result.month && (
              <p style={styles.resultLabel}>
                {result.person_name} — {result.month}
              </p>
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
  },
  sidebarTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
  },
  sidebarEmpty: {
    color: "#888",
    fontSize: 13,
  },
  sidebarItem: {
    background: "#2a2a3e",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  sidebarPerson: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
    margin: "0 0 4px 0",
  },
  sidebarMonth: {
    color: "#4f86c6",
    fontSize: 12,
    margin: "0 0 4px 0",
  },
  sidebarAmount: {
    color: "#2ecc71",
    fontSize: 12,
    margin: 0,
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
  input: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #ddd",
    fontSize: 14,
    width: 180,
  },
  fileInput: {
    display: "block",
    fontSize: 14,
  },
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
  sidebarTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deleteButton: {
    background: "none",
    border: "none",
    color: "#888",
    cursor: "pointer",
    fontSize: 12,
    padding: 2,
  },
};