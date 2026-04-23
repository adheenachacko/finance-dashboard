import { useState } from "react";
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

  const handleAnalyze = async () => {
  if (!file) return;
  setLoading(true);
  setError(null);
  setResult(null);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("http://localhost:8000/analyze", {
      method: "POST",
      body: formData,
    });
    
    const text = await response.text();
    console.log("Raw response:", text);
    
    const data = JSON.parse(text);
    console.log("Parsed data:", data);
    
    if (data.error) {
      setError(data.error);
    } else {
      setResult(data);
    }
  } catch (err) {
    console.log("Full error:", err.message);
    setError("Error: " + err.message);
  } finally {
    setLoading(false);
  }
};

  const chartData = result
    ? Object.entries(result.categories).map(([name, value]) => ({
        name,
        amount: value,
      }))
    : [];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Finance Dashboard</h1>

      {/* Upload Section */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Upload Statement</h2>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files[0])}
          style={styles.fileInput}
        />
        {file && (
          <p style={styles.fileName}>Selected: {file.name}</p>
        )}
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
          {/* Totals */}
          <div style={styles.totalsRow}>
            <div style={styles.totalCard}>
              <p style={styles.totalLabel}>Income</p>
              <p style={styles.totalAmount}>${result.income.toLocaleString()}</p>
            </div>
            <div style={styles.totalCard}>
              <p style={styles.totalLabel}>Spending</p>
              <p style={{ ...styles.totalAmount, color: "#e05c5c" }}>
                ${result.spending.toLocaleString()}
              </p>
            </div>
            <div style={styles.totalCard}>
              <p style={styles.totalLabel}>Savings</p>
              <p style={{ ...styles.totalAmount, color: "#2ecc71" }}>
                ${result.savings.toLocaleString()}
              </p>
            </div>
            <div style={styles.totalCard}>
              <p style={styles.totalLabel}>Savings Rate</p>
              <p style={{ ...styles.totalAmount, color: "#4f86c6" }}>
                {result.savings_rate}%
              </p>
            </div>
          </div>

          {/* Chart */}
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

          {/* AI Insights */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>AI Insights</h2>
            <p style={styles.summary}>{result.insights.summary}</p>

            <div style={styles.insightBox}>
              <p style={styles.insightLabel}>What you are doing well</p>
              <p>{result.insights.doing_well}</p>
            </div>

            <div style={styles.insightBox}>
              <p style={styles.insightLabel}>Biggest opportunity</p>
              <p>{result.insights.biggest_opportunity}</p>
            </div>

            <p style={styles.insightLabel}>Recommendations</p>
            {result.insights.recommendations.map((rec, i) => (
              <div key={i} style={styles.recommendation}>
                <span style={styles.recNumber}>{i + 1}</span>
                <p style={{ margin: 0 }}>{rec}</p>
              </div>
            ))}
          </div>

          {/* Transactions Table */}
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
                {result.transactions.map((t, i) => (
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
  );
}

const styles = {
  container: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "40px 20px",
    fontFamily: "Arial, sans-serif",
    background: "#f5f7fa",
    minHeight: "100vh",
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
  fileInput: { marginBottom: 12, display: "block" },
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
};