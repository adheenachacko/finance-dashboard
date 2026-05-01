import { useState, useEffect, useRef } from "react";
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
  Housing: "#2c3e50",
  Travel: "#16a085",
  Other: "#95a5a6",
  Groceries: "#27ae60",
  Fitness: "#e67e22",
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

function PageHeader({ eyebrow, title }) {
  return (
    <div style={{
      marginBottom: 28,
      paddingBottom: 20,
      borderBottom: "1px solid #e8ecf0",
    }}>
      <p style={{
        fontSize: 11,
        fontWeight: "700",
        color: "#4f86c6",
        textTransform: "uppercase",
        letterSpacing: "2px",
        margin: "0 0 6px 0",
      }}>{eyebrow}</p>
      <h2 style={{
        fontSize: 26,
        fontWeight: "800",
        color: "#1a1a2e",
        margin: 0,
        letterSpacing: "-0.5px",
      }}>{title}</h2>
    </div>
  );
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
  const [refreshingInsights, setRefreshingInsights] = useState(false);
  const [totalsFilter, setTotalsFilter] = useState(null);
  const [tableSearch, setTableSearch] = useState("");
  const [tableAccountFilter, setTableAccountFilter] = useState("");
  const [tableCategoryFilter, setTableCategoryFilter] = useState("");
  const [tableStatusFilter, setTableStatusFilter] = useState("all");
  const [tableSort, setTableSort] = useState({ col: null, dir: "asc" });
  const [loadingMessage, setLoadingMessage] = useState("");
  const abortControllerRef = useRef(null);
  const [householdTrends, setHouseholdTrends] = useState([]);
  const [householdYear, setHouseholdYear] = useState(null);
  const [yearTransactions, setYearTransactions] = useState([]);
  const [yearCategoryFilter, setYearCategoryFilter] = useState(null);
  const [yearTableSearch, setYearTableSearch] = useState("");
  const [yearPersonFilter, setYearPersonFilter] = useState("");
  const [yearAccountFilter, setYearAccountFilter] = useState("");
  const [yearTableCategoryFilter, setYearTableCategoryFilter] = useState("");
  const [yearStatusFilter, setYearStatusFilter] = useState("all");
  const [yearSort, setYearSort] = useState({ col: null, dir: "asc" });
  const [yearEditingCategory, setYearEditingCategory] = useState(null);
  const [selectedYear, setSelectedYear] = useState("2026");
  const [householdInsights, setHouseholdInsights] = useState(null);
  const [householdInsightsDate, setHouseholdInsightsDate] = useState(null);
  const [generatingHouseholdInsights, setGeneratingHouseholdInsights] = useState(false);
  const [netWorthHistory, setNetWorthHistory] = useState([]);
  const [goals, setGoals] = useState([]);
  const [planningInsights, setPlanningInsights] = useState(null);
  const [generatingPlanningInsights, setGeneratingPlanningInsights] = useState(false);
  const [showAddNetWorth, setShowAddNetWorth] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newNetWorthDate, setNewNetWorthDate] = useState(new Date().toISOString().slice(0, 7));
  const [newAccounts, setNewAccounts] = useState([]);
  const [newGoal, setNewGoal] = useState({ name: "", target_amount: "", current_amount: "", target_date: "", color: "#4f86c6" });
  const [netWorthPersonId, setNetWorthPersonId] = useState("");

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

  const fetchHouseholdTrends = async () => {
    try {
      const response = await fetch(`${API}/household-trends`, { headers: authHeaders() });
      const data = await response.json();
      if (Array.isArray(data)) setHouseholdTrends(data);
    } catch { console.log("Could not fetch household trends"); }
  };

  const fetchHouseholdYear = async (year) => {
    try {
      const response = await fetch(`${API}/household-year/${year}`, { headers: authHeaders() });
      const data = await response.json();
      setHouseholdYear(data);
      fetchYearTransactions(year);
      fetchHouseholdInsights(year);
    } catch { console.log("Could not fetch household year"); }
  };

  const fetchHouseholdInsights = async (year) => {
    try {
      const response = await fetch(`${API}/household-year/${year}/insights`, { headers: authHeaders() });
      const data = await response.json();
      setHouseholdInsights(data.insights);
      setHouseholdInsightsDate(data.created_at);
    } catch { console.log("Could not fetch household insights"); }
  };

  const generateHouseholdInsights = async () => {
    setGeneratingHouseholdInsights(true);
    try {
      const response = await fetch(
        `${API}/household-year/${selectedYear}/insights`,
        { method: "POST", headers: authHeaders() }
      );
      const data = await response.json();
      setHouseholdInsights(data.insights);
      setHouseholdInsightsDate(data.created_at);
    } catch { console.log("Could not generate household insights"); }
    finally { setGeneratingHouseholdInsights(false); }
  };

  const fetchNetWorth = async () => {
    try {
      const response = await fetch(`${API}/net-worth`, { headers: authHeaders() });
      const data = await response.json();
      if (Array.isArray(data)) setNetWorthHistory(data);
    } catch { console.log("Could not fetch net worth"); }
  };

  const fetchGoals = async () => {
    try {
      const response = await fetch(`${API}/goals`, { headers: authHeaders() });
      const data = await response.json();
      if (Array.isArray(data)) setGoals(data);
    } catch { console.log("Could not fetch goals"); }
  };

  const saveNetWorth = async () => {
    try {
      const selectedPerson = people.find(p => p.id === parseInt(netWorthPersonId));
      const formData = new FormData();
      formData.append("accounts", JSON.stringify(newAccounts));
      formData.append("person_id", netWorthPersonId || "");
      formData.append("person_name", selectedPerson?.name || "Household");
      await fetch(`${API}/net-worth`, { method: "POST", headers: authHeaders(), body: formData });
      setShowAddNetWorth(false);
      setNewAccounts([]);
      setNetWorthPersonId("");
      fetchNetWorth();
    } catch { console.log("Could not save net worth"); }
  };

  const editNetWorth = (entry) => {
    setNetWorthPersonId(entry.person_id || "");
    setNewAccounts(entry.accounts || []);
    setShowAddNetWorth(true);
  };

  const deleteNetWorth = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await fetch(`${API}/net-worth/${id}`, { method: "DELETE", headers: authHeaders() });
      fetchNetWorth();
    } catch { console.log("Could not delete net worth entry"); }
  };

  const addAccount = () => {
    setNewAccounts(prev => [...prev, { name: "", type: "checking", balance: 0 }]);
  };

  const removeAccount = (i) => {
    setNewAccounts(prev => prev.filter((_, idx) => idx !== i));
  };

  const createGoal = async () => {
    if (!newGoal.name || !newGoal.target_amount) return;
    try {
      const formData = new FormData();
      formData.append("name", newGoal.name);
      formData.append("target_amount", newGoal.target_amount);
      formData.append("current_amount", newGoal.current_amount || 0);
      formData.append("target_date", newGoal.target_date || "");
      formData.append("color", newGoal.color);
      await fetch(`${API}/goals`, { method: "POST", headers: authHeaders(), body: formData });
      setShowAddGoal(false);
      setNewGoal({ name: "", target_amount: "", current_amount: "", target_date: "", color: "#4f86c6" });
      fetchGoals();
    } catch { console.log("Could not create goal"); }
  };

  const deleteGoal = async (id) => {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await fetch(`${API}/goals/${id}`, { method: "DELETE", headers: authHeaders() });
      fetchGoals();
    } catch { console.log("Could not delete goal"); }
  };

  const fetchPlanningInsights = async () => {
    setGeneratingPlanningInsights(true);
    try {
      const response = await fetch(`${API}/planning/insights`, { method: "POST", headers: authHeaders() });
      const data = await response.json();
      setPlanningInsights(data.insights);
    } catch { console.log("Could not generate planning insights"); }
    finally { setGeneratingPlanningInsights(false); }
  };

  const fetchYearTransactions = async (year) => {
    try {
      const response = await fetch(
        `${API}/household-year/${year}/transactions`,
        { headers: authHeaders() }
      );
      const data = await response.json();
      if (Array.isArray(data)) setYearTransactions(data);
    } catch { console.log("Could not fetch year transactions"); }
  };

  const toggleYearTransactionExcluded = async (statementId, originalIndex, currentExcluded) => {
    try {
      const formData = new FormData();
      formData.append("excluded", (!currentExcluded).toString());
      const response = await fetch(
        `${API}/statements/${statementId}/transaction/${originalIndex}`,
        { method: "PATCH", headers: authHeaders(), body: formData }
      );
      const data = await response.json();

      // Update year transactions locally
      setYearTransactions(prev => prev.map(t =>
        t.statement_id === statementId && t.original_index === originalIndex
          ? { ...t, excluded: !currentExcluded }
          : t
      ));

      // Also refresh household year totals
      if (householdMonth?.startsWith("year-")) {
        fetchHouseholdYear(householdMonth.replace("year-", ""));
      }

      // If this statement is currently loaded in the statement tab, update it too
      if (result?.id === statementId) {
        setResult(prev => ({
          ...prev,
          ...data.totals,
          transactions: data.transactions,
          categories: data.totals.categories
        }));
      }
    } catch { console.log("Could not toggle transaction"); }
  };

  const updateYearTransactionCategory = async (statementId, originalIndex, newCategory) => {
    try {
      const formData = new FormData();
      formData.append("category", newCategory);
      const response = await fetch(
        `${API}/statements/${statementId}/transaction/${originalIndex}`,
        { method: "PATCH", headers: authHeaders(), body: formData }
      );
      const data = await response.json();

      // Update year transactions locally
      setYearTransactions(prev => prev.map(t =>
        t.statement_id === statementId && t.original_index === originalIndex
          ? { ...t, category: newCategory }
          : t
      ));

      // Refresh year totals
      if (householdMonth?.startsWith("year-")) {
        fetchHouseholdYear(householdMonth.replace("year-", ""));
      }

      // If this statement is loaded in statement tab, update it too
      if (result?.id === statementId) {
        setResult(prev => ({
          ...prev,
          transactions: data.transactions,
          categories: data.totals.categories
        }));
      }

      setYearEditingCategory(null);
    } catch { console.log("Could not update category"); }
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

  const availableYears = [...new Set(statements.map(s => s.month.slice(0, 4)))].sort().reverse();

  const handleAnalyze = async () => {
    if (!files.length || !selectedPersonId) return;
    const selectedPerson = people.find(p => p.id === parseInt(selectedPersonId));
    setLoading(true); setError(null); setResult(null);

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      let finalResult = null;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const acctName = accountNames[i] || f.name.replace(".pdf", "");

        setLoadingMessage(
          files.length > 1
            ? `Processing file ${i + 1} of ${files.length} — ${acctName}...`
            : `Reading ${acctName}...`
        );

        const formData = new FormData();
        formData.append("file", f);
        formData.append("person_name", selectedPerson?.name || "Me");
        formData.append("person_id", selectedPersonId);
        formData.append("account_name", acctName);

        setLoadingMessage(
          files.length > 1
            ? `Categorizing transactions (${i + 1}/${files.length}) — ${acctName}...`
            : `Categorizing transactions — ${acctName}...`
        );

        const response = await fetch(`${API}/analyze`, {
          method: "POST", headers: authHeaders(), body: formData, signal
        });

        setLoadingMessage(
          files.length > 1
            ? `Generating insights (${i + 1}/${files.length})...`
            : "Generating insights..."
        );

        const text = await response.text();
        const data = JSON.parse(text);
        if (data.error) { setError(data.error); break; }

        // existing duplicate check...
        const alreadyExists = statements.some(s =>
          (s.person_id === parseInt(selectedPersonId) || s.person_name === selectedPerson?.name) &&
          s.month === data.month &&
          s.totals?.accounts?.includes(acctName)
        );
        if (data.merged && data.accounts?.includes(acctName) && alreadyExists) {
          window.confirm(
            `You already have a "${acctName}" statement for ${formatMonth(data.month)}. It has been updated.`
          );
        }

        finalResult = data;
      }
      if (finalResult) {
        setResult(finalResult);
        fetchStatements();
        resetTableFilters();
        setActiveTab("statement");
        setFiles([]);
        setAccountNames({});
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Analysis cancelled.");
      } else {
        setError("Error: " + err.message);
      }
    } finally {
      setLoading(false);
      setLoadingMessage("");
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      setError("Analysis cancelled.");
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setAccountNames(prev => {
      const updated = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < indexToRemove) updated[ki] = v;
        else if (ki > indexToRemove) updated[ki - 1] = v;
      });
      return updated;
    });
  };

  const resetTableFilters = () => {
    setTableSearch("");
    setTableAccountFilter("");
    setTableCategoryFilter("");
    setTableStatusFilter("all");
    setTableSort({ col: null, dir: "asc" });
    setCategoryFilter(null);
    setTotalsFilter(null);
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
      resetTableFilters();
      setActiveTab("statement");
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
    } catch { console.log("Could not update category"); }
  };

  const toggleExcluded = async (transactionIndex, currentExcluded) => {
    if (!result?.id) return;
    try {
      const formData = new FormData();
      formData.append("excluded", (!currentExcluded).toString());
      const response = await fetch(
        `${API}/statements/${result.id}/transaction/${transactionIndex}`,
        { method: "PATCH", headers: authHeaders(), body: formData }
      );
      const data = await response.json();
      setResult(prev => ({
        ...prev,
        ...data.totals,
        transactions: data.transactions,
        categories: data.totals.categories
      }));
    } catch { console.log("Could not toggle transaction"); }
  };

  const refreshInsights = async () => {
    if (!result?.id) return;
    setRefreshingInsights(true);
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
    } catch { console.log("Could not refresh insights"); }
    finally { setRefreshingInsights(false); }
  };

  const recalculateTotals = async () => {
    if (!result?.id) return;
    try {
      const response = await fetch(
        `${API}/statements/${result.id}/recalculate`,
        { method: "POST", headers: authHeaders() }
      );
      const data = await response.json();
      setResult(prev => ({
        ...prev,
        ...data.totals,
        categories: data.totals.categories
      }));
      fetchStatements();
    } catch { console.log("Could not recalculate"); }
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
    ? (() => {
      let txs = result.transactions.map((t, originalIndex) => ({ ...t, originalIndex }));
      if (categoryFilter) {
        txs = txs.filter(t => t.category === categoryFilter);
      } else if (totalsFilter === "spending") {
        txs = txs.filter(t => t.amount < 0 && t.category !== "Investment");
      } else if (totalsFilter === "income") {
        txs = txs.filter(t => t.amount > 0 && t.category !== "Investment");
      } else if (totalsFilter === "invested") {
        txs = txs.filter(t => t.category === "Investment");
      }
      if (tableSearch) {
        txs = txs.filter(t =>
          t.description?.toLowerCase().includes(tableSearch.toLowerCase()) ||
          t.note?.toLowerCase().includes(tableSearch.toLowerCase())
        );
      }
      if (tableAccountFilter) txs = txs.filter(t => t.account === tableAccountFilter);
      if (tableCategoryFilter) txs = txs.filter(t => t.category === tableCategoryFilter);
      if (tableStatusFilter === "active") txs = txs.filter(t => !t.excluded);
      else if (tableStatusFilter === "excluded") txs = txs.filter(t => t.excluded);
      if (tableSort.col === "date") {
        txs = [...txs].sort((a, b) =>
          tableSort.dir === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
        );
      } else if (tableSort.col === "amount") {
        txs = [...txs].sort((a, b) =>
          tableSort.dir === "asc" ? a.amount - b.amount : b.amount - a.amount
        );
      }
      return txs;
    })()
    : [];

  const statementsByPerson = people.map(person => ({
    ...person,
    statements: statements
      .filter(s => s.person_id === person.id || s.person_name === person.name)
      .sort((a, b) => b.month.localeCompare(a.month))
  }));

  const existingAccounts = [...new Set(statements.flatMap(s => s.totals?.accounts || []))];
  const allNamed = files.every((_, i) => accountNames[i]?.trim());
  const statementAccounts = result?.transactions
    ? [...new Set(result.transactions.map(t => t.account).filter(Boolean))]
    : [];
  const rollingAverages = trendsData.length >= 2 ? trendsData.map((d, i) => {
    const window = trendsData.slice(Math.max(0, i - 2), i + 1);
    const avg = (arr, key) => Math.round(arr.reduce((s, x) => s + x[key], 0) / arr.length);
    return {
      month: d.month,
      avg_savings_rate: avg(window, "savings_rate"),
    };
  }) : [];
  const availableMonths = [...new Set(statements.map(s => s.month))].sort();
  const hasTableFilters = tableSearch || tableAccountFilter || tableCategoryFilter || tableStatusFilter !== "all" || tableSort.col;

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
              const isActive = result?.id === s.id;
              return (
                <div key={s.id} style={styles.monthGroup}>
                  <div style={{
                    ...styles.monthHeader,
                    background: isActive ? "#3a3a5e" : "#2a2a3e",
                    borderLeft: isActive ? "3px solid #4f86c6" : "3px solid transparent"
                  }} onClick={() => {
                    loadStatement(s.id);
                    toggleMonth(key);
                  }}>
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
        <div style={styles.titleSection}>
          <h1 style={styles.title}>Finance Dashboard</h1>
          <p style={styles.titleSub}>Your personal money at a glance</p>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {[
            { key: "upload", label: "Upload" },
            { key: "statement", label: "Statement", disabled: !result },
            { key: "trends", label: "Trends" },
            { key: "household", label: "Household" },
            { key: "planning", label: "Planning", disabled: false },
          ].map(({ key, label, disabled }) => (
            <button
              key={key}
              onClick={() => {
                if (disabled) return;
                setActiveTab(key);
                if (key === "trends" && trendsPerson) fetchTrends(trendsPerson);
                if (key === "household") {
                  fetchHouseholdYear("2026");
                  setSelectedYear("2026");
                }
                if (key === "planning") { fetchNetWorth(); fetchGoals(); }
              }}
              style={{
                ...(activeTab === key ? styles.tabActive : styles.tab),
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <div style={styles.uploadCard}>
            <PageHeader eyebrow="Get Started" title="Upload Statement" />
            <p style={styles.uploadSubtitle}>Add a PDF or CSV statement to analyze your spending</p>

            {people.length === 0 ? (
              <p style={styles.noPeopleMsg}>Add a person using the + button in the sidebar first.</p>
            ) : (
              <>
                <div style={styles.uploadFormRow}>
                  <div style={styles.uploadFormGroup}>
                    <label style={styles.uploadLabel}>Person</label>
                    <select value={selectedPersonId}
                      onChange={(e) => setSelectedPersonId(e.target.value)}
                      style={styles.pillSelect}>
                      {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div style={styles.uploadFormGroup}>
                    <label style={styles.uploadLabel}>
                      {files.length > 0 ? "Add More Files" : "Statement File"}
                    </label>
                    <label style={styles.filePickerButton}>
                      📎 Choose File
                      <input type="file" accept=".pdf,.csv" multiple
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files);
                          setFiles(prev => {
                            const existingNames = prev.map(f => f.name);
                            const unique = newFiles.filter(f => !existingNames.includes(f.name));
                            return [...prev, ...unique];
                          });
                          e.target.value = "";
                        }}
                        style={{ display: "none" }} />
                    </label>
                  </div>
                </div>

                {files.length > 0 && (
                  <div style={styles.fileList}>
                    <datalist id="account-suggestions">
                      {existingAccounts.map((acc, i) => <option key={i} value={acc} />)}
                    </datalist>
                    {files.map((f, i) => (
                      <div key={i} style={styles.fileRow}>
                        <span style={styles.fileIcon}>📄</span>
                        <span style={styles.fileName}>{f.name}</span>
                        <input
                          type="text"
                          placeholder="Account name *"
                          value={accountNames[i] || ""}
                          onChange={(e) => setAccountNames(prev => ({ ...prev, [i]: e.target.value }))}
                          style={styles.pillInput}
                          list="account-suggestions"
                        />
                        <button onClick={() => removeFile(i)} style={styles.removeFileButton}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => { setFiles([]); setAccountNames({}); }} style={styles.clearFilesButton}>
                      Clear all
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 20 }}>
                  <button onClick={handleAnalyze}
                    disabled={!files.length || loading || !selectedPersonId || !allNamed}
                    style={loading || !files.length || !allNamed ? styles.pillButtonDisabled : styles.pillButton}>
                    {loading ? "⏳ Analyzing..." : "✦ Analyze Statement"}
                  </button>
                  {loading && (
                    <button onClick={handleCancel} style={styles.cancelButton}>✕ Cancel</button>
                  )}
                </div>
                {loading && loadingMessage && (
                  <p style={styles.loadingMessage}>{loadingMessage}</p>
                )}
              </>
            )}
            {error && <p style={styles.error}>{error}</p>}
          </div>
        )}

        {/* Statement Tab */}
        {activeTab === "statement" && result && (
          <>
            <div style={styles.resultLabelRow}>
              <PageHeader
                eyebrow={result?.person_name}
                title={formatMonth(result?.month)}
              />
              {result.accounts?.length > 0 && (
                <p style={styles.accountsLine}>Accounts: {result.accounts.join(", ")}</p>
              )}
            </div>

            <div style={styles.totalsRow}>
              {[
                { label: "Income", value: result.income, color: "#1a1a2e", filter: "income" },
                { label: "Spending", value: result.spending, color: "#e05c5c", filter: "spending" },
                { label: "Invested", value: result.invested || 0, color: "#9b59b6", filter: "invested" },
                { label: "Savings", value: result.savings, color: "#2ecc71", filter: null },
              ].map(({ label, value, color, filter }) => (
                <div key={label}
                  style={{
                    ...styles.totalCard,
                    cursor: filter ? "pointer" : "default",
                    outline: totalsFilter === filter && filter ? `2px solid ${color}` : "none",
                    transform: totalsFilter === filter && filter ? "scale(1.03)" : "scale(1)",
                    transition: "transform 0.15s, outline 0.15s",
                  }}
                  onClick={() => {
                    if (!filter) return;
                    setTotalsFilter(prev => prev === filter ? null : filter);
                    setCategoryFilter(null);
                  }}
                >
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
                  <Bar dataKey="amount" onClick={(data) => {
                    setCategoryFilter(prev => prev === data.name ? null : data.name);
                    setTotalsFilter(null);
                  }}>
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
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={recalculateTotals} style={styles.clearFilter}>
                    ↻ Recalculate Totals
                  </button>
                  <button
                    onClick={refreshInsights}
                    disabled={refreshingInsights}
                    style={refreshingInsights ? styles.pillButtonDisabled : styles.pillButton}
                  >
                    {refreshingInsights ? "↻ Generating..." : "✦ Generate Insights"}
                  </button>
                </div>
              </div>
              {refreshingInsights && (
                <div style={styles.insightsLoadingBar}>
                  <div style={styles.insightsLoadingFill} />
                </div>
              )}
              {result.insights ? (
                <>
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
                </>
              ) : (
                <p style={styles.noPeopleMsg}>
                  Click Generate Insights to get AI analysis of this statement.
                </p>
              )}
            </div>

            <div style={styles.card}>
              <div style={styles.tableHeader}>
                <h2 style={styles.cardTitle}>
                  {categoryFilter
                    ? `Transactions — ${categoryFilter}`
                    : totalsFilter
                      ? `Transactions — ${totalsFilter.charAt(0).toUpperCase() + totalsFilter.slice(1)}`
                      : "All Transactions"}
                </h2>
                <div style={{ display: "flex", gap: 8 }}>
                  {hasTableFilters && (
                    <button onClick={() => {
                      setTableSearch(""); setTableAccountFilter("");
                      setTableCategoryFilter(""); setTableStatusFilter("all");
                      setTableSort({ col: null, dir: "asc" });
                    }} style={styles.clearFilter}>
                      ↺ Reset filters
                    </button>
                  )}
                  {(categoryFilter || totalsFilter) && (
                    <button onClick={() => { setCategoryFilter(null); setTotalsFilter(null); }} style={styles.clearFilter}>
                      ✕ Clear filter
                    </button>
                  )}
                </div>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>
                      <div style={styles.thContent}>
                        Date
                        <button onClick={() => setTableSort(prev =>
                          prev.col === "date"
                            ? { col: "date", dir: prev.dir === "asc" ? "desc" : "asc" }
                            : { col: "date", dir: "asc" }
                        )} style={styles.sortButton}>
                          {tableSort.col === "date" ? (tableSort.dir === "asc" ? "↑" : "↓") : "↕"}
                        </button>
                      </div>
                    </th>
                    <th style={styles.th}>
                      <div style={styles.thContent}>Description</div>
                      <input type="text" placeholder="Search..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        style={styles.filterInput} />
                    </th>
                    <th style={styles.th}>
                      <div style={styles.thContent}>Account</div>
                      <select value={tableAccountFilter}
                        onChange={(e) => setTableAccountFilter(e.target.value)}
                        style={styles.filterSelect}>
                        <option value="">All</option>
                        {statementAccounts.map(acc => (
                          <option key={acc} value={acc}>{acc}</option>
                        ))}
                      </select>
                    </th>
                    <th style={styles.th}>
                      <div style={styles.thContent}>Category</div>
                      <select value={tableCategoryFilter}
                        onChange={(e) => setTableCategoryFilter(e.target.value)}
                        style={styles.filterSelect}>
                        <option value="">All</option>
                        {["Food", "Transport", "Shopping", "Subscriptions", "Utilities",
                          "Healthcare", "Entertainment", "Income", "Investment", "Housing", "Travel", "Groceries", "Fitness", "Other"].map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                      </select>
                    </th>
                    <th style={styles.th}>
                      <div style={styles.thContent}>
                        Amount
                        <button onClick={() => setTableSort(prev =>
                          prev.col === "amount"
                            ? { col: "amount", dir: prev.dir === "asc" ? "desc" : "asc" }
                            : { col: "amount", dir: "desc" }
                        )} style={styles.sortButton}>
                          {tableSort.col === "amount" ? (tableSort.dir === "asc" ? "↑" : "↓") : "↕"}
                        </button>
                      </div>
                    </th>
                    <th style={styles.th}>
                      <div style={styles.thContent}>Status</div>
                      <select value={tableStatusFilter}
                        onChange={(e) => setTableStatusFilter(e.target.value)}
                        style={styles.filterSelect}>
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="excluded">Excluded</option>
                      </select>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t, i) => (
                    <tr key={i} style={{
                      ...(i % 2 === 0 ? styles.rowEven : styles.rowOdd),
                      opacity: t.excluded ? 0.4 : 1
                    }}>
                      <td style={styles.td}>{t.date}</td>
                      <td style={styles.td}>
                        <div style={{ textDecoration: t.excluded ? "line-through" : "none" }}>
                          {t.description}
                        </div>
                        {t.note && t.note !== t.description && (
                          <div style={styles.noteText}>{t.note}</div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.accountBadge}>{t.account || "Unknown"}</span>
                      </td>
                      <td style={styles.td}>
                        {editingCategory === t.originalIndex ? (
                          <select
                            autoFocus
                            defaultValue={t.category}
                            onChange={(e) => updateCategory(t.originalIndex, e.target.value)}
                            onBlur={() => setEditingCategory(null)}
                            style={styles.categorySelect}
                          >
                            {["Food", "Transport", "Shopping", "Subscriptions", "Utilities",
                              "Healthcare", "Entertainment", "Income", "Investment", "Housing", "Travel", "Groceries", "Fitness", "Other"].map(cat => (
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
                            onClick={() => setEditingCategory(t.originalIndex)}
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
                      <td style={styles.td}>
                        <button
                          onClick={() => toggleExcluded(t.originalIndex, t.excluded)}
                          style={{
                            ...styles.excludeButton,
                            background: t.auto_excluded ? "#f0a500" : t.excluded ? "#e05c5c" : "#f0f4f8",
                            color: t.auto_excluded || t.excluded ? "white" : "#888",
                          }}
                          title={t.excluded ? "Click to include" : "Click to exclude"}>
                          {t.auto_excluded ? "Auto-excluded" : t.excluded ? "Excluded" : "Exclude"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTransactions.length === 0 && <p style={styles.noTransactions}>No transactions found.</p>}
            </div>
          </>
        )}

        {activeTab === "statement" && !result && (
          <div style={styles.card}>
            <p style={styles.noPeopleMsg}>Click a month in the sidebar to load a statement.</p>
          </div>
        )}

        {activeTab === "statement" && !result && (
          <div style={styles.card}>
            <p style={styles.noPeopleMsg}>Click a month in the sidebar to load a statement.</p>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === "trends" && (
          <div style={styles.card}>
            <PageHeader eyebrow="Analytics" title="Spending Trends" />
            <div style={styles.trendsControls}>
              <div>
                <label style={styles.label}>Person</label>
                <select value={trendsPerson}
                  onChange={(e) => { setTrendsPerson(e.target.value); fetchTrends(e.target.value); }}
                  style={styles.select}>
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
                  <LineChart data={trendsData.map((d, i) => ({
                    ...d,
                    month: formatMonthShort(d.month),
                    rolling_avg: rollingAverages[i]?.avg_savings_rate
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis unit="%" />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="savings_rate" name="Monthly Rate"
                      stroke="#2ecc71" strokeWidth={2} dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="rolling_avg" name="3 Month Avg"
                      stroke="#4f86c6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
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
                      <th style={styles.th}>3 Month Avg</th>
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
                        <td style={{ ...styles.td, color: "#9b59b6", fontWeight: "bold" }}>
                          {rollingAverages[i]?.avg_savings_rate !== undefined ? `${rollingAverages[i].avg_savings_rate}%` : "—"}
                        </td>
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
          <div style={{ display: "flex", gap: 20 }}>

            {/* Year selector sidebar */}
            <div style={styles.yearSidebar}>
              <p style={styles.yearSidebarTitle}>Year</p>
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => {
                    setSelectedYear(year);
                    setHouseholdInsights(null);
                    setHouseholdInsightsDate(null);
                    fetchHouseholdYear(year);
                  }}
                  style={{
                    ...styles.yearButton,
                    background: selectedYear === year ? "#4f86c6" : "white",
                    color: selectedYear === year ? "white" : "#555",
                    fontWeight: selectedYear === year ? "700" : "400",
                  }}
                >
                  {year}
                </button>
              ))}
            </div>

            {/* Main content */}
            <div style={{ flex: 1 }}>
              {householdYear ? (
                <>
                  <div style={styles.card}>
                    <PageHeader eyebrow="Combined View" title={`${householdYear.year} Household Summary`} />
                    <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>
                      Based on {householdYear.months_tracked} month{householdYear.months_tracked !== 1 ? "s" : ""} of data
                    </p>

                    <div style={styles.totalsRow}>
                      {[
                        { label: "Total Income", value: householdYear.total_income, color: "#1a1a2e" },
                        { label: "Total Spending", value: householdYear.total_spending, color: "#e05c5c" },
                        { label: "Total Invested", value: householdYear.total_invested, color: "#9b59b6" },
                        { label: "Total Saved", value: householdYear.total_savings, color: "#2ecc71" },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={styles.totalCard}>
                          <p style={styles.totalLabel}>{label}</p>
                          <p style={{ ...styles.totalAmount, color }}>${Math.round(value).toLocaleString()}</p>
                        </div>
                      ))}
                      <div style={styles.totalCard}>
                        <p style={styles.totalLabel}>Savings Rate</p>
                        <p style={{ ...styles.totalAmount, color: "#4f86c6" }}>{householdYear.savings_rate}%</p>
                      </div>
                    </div>

                    <div style={{
                      background: "linear-gradient(135deg, #1a1a2e 0%, #4f86c6 100%)",
                      borderRadius: 16,
                      padding: 24,
                      textAlign: "center",
                      color: "white"
                    }}>
                      <p style={{ margin: "0 0 8px 0", fontSize: 13, opacity: 0.8, textTransform: "uppercase", letterSpacing: "1px" }}>
                        Average Monthly Savings
                      </p>
                      <p style={{ margin: 0, fontSize: 36, fontWeight: "800" }}>
                        ${Math.round(householdYear.avg_monthly_savings).toLocaleString()}
                      </p>
                      <p style={{ margin: "8px 0 0 0", fontSize: 12, opacity: 0.7 }}>
                        per month across {householdYear.months_tracked} months tracked
                      </p>
                    </div>
                  </div>

                  <div style={styles.householdGrid}>
                    {householdYear.by_person.map((person, idx) => {
                      const color = PERSON_COLORS[idx % PERSON_COLORS.length];
                      return (
                        <div key={person.person_name} style={styles.card}>
                          <h2 style={{ ...styles.cardTitle, color }}>{person.person_name}</h2>
                          <p style={{ color: "#aaa", fontSize: 12, marginBottom: 16 }}>
                            {person.months} months tracked
                          </p>
                          <div style={styles.personTotalsRow}>
                            <div style={styles.personTotalCard}>
                              <p style={styles.totalLabel}>Income</p>
                              <p style={{ ...styles.personTotalAmount, color }}>${Math.round(person.income).toLocaleString()}</p>
                            </div>
                            <div style={styles.personTotalCard}>
                              <p style={styles.totalLabel}>Spending</p>
                              <p style={{ ...styles.personTotalAmount, color: "#e05c5c" }}>${Math.round(person.spending).toLocaleString()}</p>
                            </div>
                            <div style={styles.personTotalCard}>
                              <p style={styles.totalLabel}>Saved</p>
                              <p style={{ ...styles.personTotalAmount, color: "#2ecc71" }}>${Math.round(person.savings).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Household Insights */}
                  <div style={styles.card}>
                    <div style={styles.tableHeader}>
                      <div>
                        <h2 style={styles.cardTitle}>Couple's Financial Insights — {householdYear.year}</h2>
                        {householdInsightsDate && (
                          <p style={{ fontSize: 11, color: "#aaa", margin: "4px 0 0 0" }}>
                            Last generated {new Date(householdInsightsDate).toLocaleDateString("default", {
                              month: "short", day: "numeric", year: "numeric"
                            })}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={generateHouseholdInsights}
                        disabled={generatingHouseholdInsights}
                        style={generatingHouseholdInsights ? styles.pillButtonDisabled : styles.pillButton}
                      >
                        {generatingHouseholdInsights ? "↻ Generating..." : "✦ Generate Insights"}
                      </button>
                    </div>

                    {generatingHouseholdInsights && (
                      <div style={styles.insightsLoadingBar}>
                        <div style={styles.insightsLoadingFill} />
                      </div>
                    )}

                    {householdInsights ? (
                      <>
                        <p style={styles.summary}>{householdInsights.summary}</p>

                        {/* Doing well */}
                        <div style={styles.insightBox}>
                          <p style={styles.insightLabel}>What you're doing well</p>
                          {householdInsights.doing_well?.map((item, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                              <span style={{ color: "#2ecc71", fontWeight: "bold", fontSize: 16 }}>✓</span>
                              <p style={{ margin: 0, fontSize: 14 }}>{item}</p>
                            </div>
                          ))}
                        </div>

                        {/* Spending insights */}
                        <p style={styles.insightLabel}>Spending Breakdown</p>
                        {householdInsights.spending_insights?.map((item, i) => (
                          <div key={i} style={{ ...styles.insightBox, marginBottom: 12 }}>
                            <p style={{ fontWeight: "700", fontSize: 14, margin: "0 0 6px 0", color: "#1a1a2e" }}>
                              <span style={{
                                ...styles.categoryBadge,
                                background: CATEGORY_COLORS[item.category] || "#95a5a6",
                                marginRight: 8
                              }}>{item.category}</span>
                            </p>
                            <p style={{ margin: "0 0 6px 0", fontSize: 14, color: "#444" }}>{item.insight}</p>
                            <p style={{ margin: 0, fontSize: 13, color: "#4f86c6", fontWeight: "600" }}>
                              💡 {item.action}
                            </p>
                          </div>
                        ))}

                        {/* Investment tips */}
                        <div style={styles.insightBox}>
                          <p style={styles.insightLabel}>Investment Tips</p>
                          {householdInsights.investment_tips?.map((tip, i) => (
                            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
                              <span style={styles.recNumber}>{i + 1}</span>
                              <p style={{ margin: 0, fontSize: 14 }}>{tip}</p>
                            </div>
                          ))}
                        </div>

                        {/* Savings opportunities */}
                        <p style={styles.insightLabel}>Savings Opportunities</p>
                        {householdInsights.savings_opportunities?.map((opp, i) => (
                          <div key={i} style={{ ...styles.insightBox, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: "700", fontSize: 14, margin: "0 0 4px 0" }}>{opp.title}</p>
                              <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{opp.description}</p>
                            </div>
                            <div style={{ textAlign: "right", marginLeft: 16, flexShrink: 0 }}>
                              <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>Est. monthly savings</p>
                              <p style={{ margin: 0, fontSize: 18, fontWeight: "800", color: "#2ecc71" }}>
                                +${opp.estimated_monthly_savings?.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Goals */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
                          <div style={{ ...styles.insightBox, background: "linear-gradient(135deg, #f0f6ff 0%, #e8f4ff 100%)" }}>
                            <p style={{ ...styles.insightLabel, color: "#4f86c6" }}>Monthly Goal</p>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: "600" }}>{householdInsights.monthly_goal}</p>
                          </div>
                          <div style={{ ...styles.insightBox, background: "linear-gradient(135deg, #f0fff4 0%, #e8f8ee 100%)" }}>
                            <p style={{ ...styles.insightLabel, color: "#2ecc71" }}>Yearly Goal</p>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: "600" }}>{householdInsights.yearly_goal}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p style={styles.noPeopleMsg}>
                        Click Generate Insights to get personalized financial advice for {householdYear.year}.
                      </p>
                    )}
                  </div>

                  <div style={styles.card}>
                    <div style={styles.tableHeader}>
                      <h2 style={styles.cardTitle}>Spending by Category — {householdYear.year}</h2>
                      <button
                        onClick={() => {
                          fetchHouseholdYear(selectedYear);
                        }}
                        style={styles.clearFilter}
                      >
                        ↻ Refresh
                      </button>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(householdYear.by_category).map(([name, value]) => ({ name, amount: Math.round(value) }))}
                        style={{ cursor: "pointer" }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                        <Bar dataKey="amount" onClick={(data) => setYearCategoryFilter(prev => prev === data.name ? null : data.name)}>
                          {Object.entries(householdYear.by_category).map(([name]) => (
                            <Cell key={name}
                              fill={CATEGORY_COLORS[name] || "#95a5a6"}
                              opacity={yearCategoryFilter && yearCategoryFilter !== name ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    <table style={{ ...styles.table, marginTop: 20 }}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Category</th>
                          <th style={styles.th}>Total Spent</th>
                          <th style={styles.th}>Monthly Avg</th>
                          <th style={styles.th}>% of Spending</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(householdYear.by_category).map(([cat, amt], i) => (
                          <tr key={cat} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                            <td style={styles.td}>
                              <span style={{ ...styles.categoryBadge, background: CATEGORY_COLORS[cat] || "#95a5a6" }}>{cat}</span>
                            </td>
                            <td style={{ ...styles.td, fontWeight: "bold" }}>${Math.round(amt).toLocaleString()}</td>
                            <td style={{ ...styles.td, color: "#888" }}>
                              ${Math.round(amt / (householdYear.months_tracked || 1)).toLocaleString()}
                            </td>
                            <td style={{ ...styles.td, color: "#4f86c6", fontWeight: "bold" }}>
                              {householdYear.total_spending > 0 ? Math.round(amt / householdYear.total_spending * 100) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Year transactions table */}
                  <div style={styles.card}>
                    <div style={styles.tableHeader}>
                      <h2 style={styles.cardTitle}>
                        {yearCategoryFilter ? `Transactions — ${yearCategoryFilter}` : "All Transactions"}
                      </h2>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {yearCategoryFilter && (
                          <button onClick={() => setYearCategoryFilter(null)} style={styles.clearFilter}>
                            ✕ Clear filter
                          </button>
                        )}
                        {(yearTableSearch || yearPersonFilter || yearAccountFilter || yearStatusFilter !== "all" || yearSort.col) && (
                          <button onClick={() => {
                            setYearTableSearch("");
                            setYearPersonFilter("");
                            setYearAccountFilter("");
                            setYearStatusFilter("all");
                            setYearSort({ col: null, dir: "asc" });
                          }} style={styles.clearFilter}>
                            ↺ Reset filters
                          </button>
                        )}
                      </div>
                    </div>

                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>
                            <div style={styles.thContent}>
                              Date
                              <button onClick={() => setYearSort(prev =>
                                prev.col === "date"
                                  ? { col: "date", dir: prev.dir === "asc" ? "desc" : "asc" }
                                  : { col: "date", dir: "desc" }
                              )} style={styles.sortButton}>
                                {yearSort.col === "date" ? (yearSort.dir === "asc" ? "↑" : "↓") : "↕"}
                              </button>
                            </div>
                          </th>
                          <th style={styles.th}>
                            <div style={styles.thContent}>Person</div>
                            <select value={yearPersonFilter} onChange={(e) => setYearPersonFilter(e.target.value)} style={styles.filterSelect}>
                              <option value="">All</option>
                              {people.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>
                          </th>
                          <th style={styles.th}>
                            <div style={styles.thContent}>Description</div>
                            <input type="text" placeholder="Search..." value={yearTableSearch}
                              onChange={(e) => setYearTableSearch(e.target.value)} style={styles.filterInput} />
                          </th>
                          <th style={styles.th}>
                            <div style={styles.thContent}>Account</div>
                            <select value={yearAccountFilter} onChange={(e) => setYearAccountFilter(e.target.value)} style={styles.filterSelect}>
                              <option value="">All</option>
                              {[...new Set(yearTransactions.map(t => t.account).filter(Boolean))].map(acc => (
                                <option key={acc} value={acc}>{acc}</option>
                              ))}
                            </select>
                          </th>
                          <th style={styles.th}>
                            <div style={styles.thContent}>Category</div>
                            <select value={yearTableCategoryFilter} onChange={(e) => setYearTableCategoryFilter(e.target.value)} style={styles.filterSelect}>
                              <option value="">All</option>
                              {["Food", "Groceries", "Transport", "Shopping", "Subscriptions", "Utilities",
                                "Healthcare", "Entertainment", "Income", "Investment", "Housing", "Travel", "Fitness", "Other"].map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                          </th>
                          <th style={styles.th}>
                            <div style={styles.thContent}>
                              Amount
                              <button onClick={() => setYearSort(prev =>
                                prev.col === "amount"
                                  ? { col: "amount", dir: prev.dir === "asc" ? "desc" : "asc" }
                                  : { col: "amount", dir: "desc" }
                              )} style={styles.sortButton}>
                                {yearSort.col === "amount" ? (yearSort.dir === "asc" ? "↑" : "↓") : "↕"}
                              </button>
                            </div>
                          </th>
                          <th style={styles.th}>
                            <div style={styles.thContent}>Status</div>
                            <select value={yearStatusFilter} onChange={(e) => setYearStatusFilter(e.target.value)} style={styles.filterSelect}>
                              <option value="all">All</option>
                              <option value="active">Active</option>
                              <option value="excluded">Excluded</option>
                            </select>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let txs = yearTransactions
                            .filter(t => yearCategoryFilter ? t.category === yearCategoryFilter : true)
                            .filter(t => yearTableSearch ? t.description?.toLowerCase().includes(yearTableSearch.toLowerCase()) : true)
                            .filter(t => yearPersonFilter ? t.person_name === yearPersonFilter : true)
                            .filter(t => yearAccountFilter ? t.account === yearAccountFilter : true)
                            .filter(t => yearTableCategoryFilter ? t.category === yearTableCategoryFilter : true)
                            .filter(t => yearStatusFilter === "active" ? !t.excluded : yearStatusFilter === "excluded" ? t.excluded : true);

                          if (yearSort.col === "date") {
                            txs = [...txs].sort((a, b) =>
                              yearSort.dir === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
                            );
                          } else if (yearSort.col === "amount") {
                            txs = [...txs].sort((a, b) =>
                              yearSort.dir === "asc" ? a.amount - b.amount : b.amount - a.amount
                            );
                          }

                          return txs.map((t, i) => (
                            <tr key={i} style={{
                              ...(i % 2 === 0 ? styles.rowEven : styles.rowOdd),
                              opacity: t.excluded ? 0.4 : 1
                            }}>
                              <td style={styles.td}>{t.date}</td>
                              <td style={styles.td}>
                                <span style={{
                                  ...styles.accountBadge,
                                  background: t.person_name === people[0]?.name ? "#e8f0fe" : "#fce8f0",
                                  color: t.person_name === people[0]?.name ? "#4f86c6" : "#e05c5c",
                                  border: "none"
                                }}>
                                  {t.person_name}
                                </span>
                              </td>
                              <td style={styles.td}>
                                <div style={{ textDecoration: t.excluded ? "line-through" : "none" }}>
                                  {t.description}
                                </div>
                                {t.note && t.note !== t.description && (
                                  <div style={styles.noteText}>{t.note}</div>
                                )}
                              </td>
                              <td style={styles.td}>
                                <span style={styles.accountBadge}>{t.account || "Unknown"}</span>
                              </td>
                              <td style={styles.td}>
                                {yearEditingCategory === String(t.statement_id) + "-" + String(t.original_index) ? (
                                  <select
                                    autoFocus
                                    defaultValue={t.category}
                                    onChange={(e) => updateYearTransactionCategory(t.statement_id, t.original_index, e.target.value)}
                                    onBlur={() => setYearEditingCategory(null)}
                                    style={styles.categorySelect}
                                  >
                                    {["Food", "Groceries", "Transport", "Shopping", "Subscriptions", "Utilities",
                                      "Healthcare", "Entertainment", "Income", "Investment", "Housing", "Travel", "Fitness", "Other"].map(cat => (
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
                                    onClick={() => setYearEditingCategory(String(t.statement_id) + "-" + String(t.original_index))}
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
                              <td style={styles.td}>
                                <button
                                  onClick={() => toggleYearTransactionExcluded(t.statement_id, t.original_index, t.excluded)}
                                  style={{
                                    ...styles.excludeButton,
                                    background: t.auto_excluded ? "#f0a500" : t.excluded ? "#e05c5c" : "#f0f4f8",
                                    color: t.auto_excluded || t.excluded ? "white" : "#888",
                                  }}
                                >
                                  {t.auto_excluded ? "Auto-excluded" : t.excluded ? "Excluded" : "Exclude"}
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                    {yearTransactions
                      .filter(t => yearCategoryFilter ? t.category === yearCategoryFilter : true)
                      .filter(t => yearTableSearch ? t.description?.toLowerCase().includes(yearTableSearch.toLowerCase()) : true)
                      .length === 0 && (
                        <p style={styles.noTransactions}>No transactions found.</p>
                      )}
                  </div>
                </>
              ) : (
                <div style={styles.card}>
                  <p style={styles.noPeopleMsg}>Loading household data...</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "planning" && (
          <div>
            <div style={styles.card}>
              <PageHeader eyebrow="Future Planning" title="Net Worth & Goals" />
            </div>

            {/* Net Worth Section */}
            <div style={styles.card}>
              <div style={styles.tableHeader}>
                <h2 style={styles.cardTitle}>Net Worth Snapshot</h2>
                <button onClick={() => {
                  setNewAccounts([]);
                  setNetWorthPersonId(people[0]?.id || "");
                  setShowAddNetWorth(true);
                }} style={styles.pillButton}>
                  + Add / Update
                </button>
              </div>
              <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>
                Your current financial snapshot. Update this whenever your balances change significantly.
              </p>

              {showAddNetWorth && (
                <div style={{ background: "#f8f9fa", borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div>
                      <label style={styles.uploadLabel}>Person</label>
                      <select value={netWorthPersonId}
                        onChange={(e) => {
                          setNetWorthPersonId(e.target.value);
                          // Pre-fill with existing data if available
                          const existing = netWorthHistory.find(e2 => String(e2.person_id) === String(e.target.value));
                          if (existing) setNewAccounts(existing.accounts || []);
                          else setNewAccounts([]);
                        }}
                        style={styles.pillSelect}>
                        <option value="">Select person</option>
                        {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {newAccounts.map((acc, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "center" }}>
                      <input type="text" placeholder="Account name"
                        value={acc.name}
                        onChange={(e) => setNewAccounts(prev => prev.map((a, idx) => idx === i ? { ...a, name: e.target.value } : a))}
                        style={{ ...styles.pillInput, width: 200 }} />
                      <select value={acc.type}
                        onChange={(e) => setNewAccounts(prev => prev.map((a, idx) => idx === i ? { ...a, type: e.target.value } : a))}
                        style={styles.pillSelect}>
                        <optgroup label="Cash & Savings">
                          <option value="checking">Checking</option>
                          <option value="savings">Savings</option>
                          <option value="hsa">HSA</option>
                          <option value="money_market">Money Market</option>
                        </optgroup>
                        <optgroup label="Investments">
                          <option value="brokerage">Brokerage (Taxable)</option>
                          <option value="roth_ira">Roth IRA</option>
                          <option value="traditional_ira">Traditional IRA</option>
                          <option value="401k">401(k)</option>
                          <option value="roth_401k">Roth 401(k)</option>
                          <option value="403b">403(b)</option>
                          <option value="529">529 (Education)</option>
                        </optgroup>
                        <optgroup label="Other Assets">
                          <option value="real_estate">Real Estate</option>
                          <option value="crypto">Crypto</option>
                          <option value="other_asset">Other Asset</option>
                        </optgroup>
                        <optgroup label="Debts">
                          <option value="credit_card">Credit Card</option>
                          <option value="student_loan">Student Loan</option>
                          <option value="mortgage">Mortgage</option>
                          <option value="car_loan">Car Loan</option>
                          <option value="other_debt">Other Debt</option>
                        </optgroup>
                      </select>
                      <input type="number" placeholder="Balance"
                        value={acc.balance === 0 ? "" : Math.abs(acc.balance)}
                        onChange={(e) => setNewAccounts(prev => prev.map((a, idx) =>
                          idx === i ? { ...a, balance: parseFloat(e.target.value) || 0 } : a
                        ))}
                        style={{ ...styles.pillInput, width: 140 }} />
                      <button onClick={() => removeAccount(i)} style={styles.removeFileButton}>✕</button>
                    </div>
                  ))}

                  {newAccounts.length === 0 && (
                    <p style={{ color: "#aaa", fontSize: 13, marginBottom: 12 }}>
                      No accounts yet — click Add Account below.
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                    <button onClick={addAccount} style={styles.clearFilter}>+ Add Account</button>
                    <button onClick={saveNetWorth}
                      disabled={newAccounts.length === 0 || !netWorthPersonId}
                      style={newAccounts.length === 0 || !netWorthPersonId ? styles.pillButtonDisabled : styles.pillButton}>
                      Save Snapshot
                    </button>
                    <button onClick={() => { setShowAddNetWorth(false); setNewAccounts([]); }} style={styles.clearFilter}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {netWorthHistory.length > 0 ? (() => {
                const combinedNetWorth = netWorthHistory.reduce((s, e) => s + e.net_worth, 0);
                const combinedAssets = netWorthHistory.reduce((s, e) => s + e.total_assets, 0);
                const combinedDebts = netWorthHistory.reduce((s, e) => s + e.total_debts, 0);

                return (
                  <>
                    {/* Combined totals */}
                    <div style={{ ...styles.totalsRow, marginBottom: 24 }}>
                      <div style={styles.totalCard}>
                        <p style={styles.totalLabel}>Combined Net Worth</p>
                        <p style={{ ...styles.totalAmount, color: "#4f86c6" }}>${Math.round(combinedNetWorth).toLocaleString()}</p>
                      </div>
                      <div style={styles.totalCard}>
                        <p style={styles.totalLabel}>Total Assets</p>
                        <p style={{ ...styles.totalAmount, color: "#2ecc71" }}>${Math.round(combinedAssets).toLocaleString()}</p>
                      </div>
                      <div style={styles.totalCard}>
                        <p style={styles.totalLabel}>Total Debts</p>
                        <p style={{ ...styles.totalAmount, color: "#e05c5c" }}>${Math.round(combinedDebts).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Per person cards */}
                    <div style={styles.householdGrid}>
                      {netWorthHistory.map((entry, idx) => (
                        <div key={entry.id} style={{ background: "#f8f9fa", borderRadius: 16, padding: 20 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ margin: 0, color: PERSON_COLORS[idx % PERSON_COLORS.length], fontSize: 16, fontWeight: "700" }}>
                              {entry.person_name}
                            </h3>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "#aaa" }}>
                                Updated {formatMonth(entry.date)}
                              </span>
                              <button onClick={() => editNetWorth(entry)} style={{ ...styles.clearFilter, fontSize: 12 }}>
                                ✎ Edit
                              </button>
                              <button onClick={() => deleteNetWorth(entry.id)} style={styles.deleteButton}>✕</button>
                            </div>
                          </div>

                          <div style={styles.personTotalsRow}>
                            <div style={styles.personTotalCard}>
                              <p style={styles.totalLabel}>Net Worth</p>
                              <p style={{ ...styles.personTotalAmount, color: "#4f86c6" }}>${Math.round(entry.net_worth).toLocaleString()}</p>
                            </div>
                            <div style={styles.personTotalCard}>
                              <p style={styles.totalLabel}>Assets</p>
                              <p style={{ ...styles.personTotalAmount, color: "#2ecc71" }}>${Math.round(entry.total_assets).toLocaleString()}</p>
                            </div>
                            <div style={styles.personTotalCard}>
                              <p style={styles.totalLabel}>Debts</p>
                              <p style={{ ...styles.personTotalAmount, color: "#e05c5c" }}>${Math.round(entry.total_debts).toLocaleString()}</p>
                            </div>
                          </div>

                          {entry.accounts?.map((acc, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e8ecf0" }}>
                              <div>
                                <p style={{ margin: 0, fontWeight: "600", fontSize: 13 }}>{acc.name}</p>
                                <p style={{ margin: 0, fontSize: 11, color: "#aaa", textTransform: "capitalize" }}>
                                  {acc.type.replace(/_/g, " ")}
                                </p>
                              </div>
                              <p style={{ margin: 0, fontWeight: "700", fontSize: 14, color: acc.balance >= 0 ? "#2ecc71" : "#e05c5c" }}>
                                {acc.balance < 0 ? "-" : ""}${Math.abs(acc.balance).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                );
              })() : (
                <p style={styles.noPeopleMsg}>
                  No snapshot yet. Click Add / Update to enter your current account balances.
                </p>
              )}
            </div>

            {/* Projections */}
            {netWorthHistory.length > 0 && (() => {
              const latest = netWorthHistory[netWorthHistory.length - 1];
              const avgMonthlySavings = statements.length > 0
                ? statements.slice(0, 3).reduce((s, stmt) => s + (stmt.totals?.savings || 0), 0) / Math.min(statements.length, 3)
                : 0;
              const annualReturn = 0.07;
              const INVESTMENT_TYPES = ["brokerage", "roth_ira", "traditional_ira", "401k", "roth_401k", "403b", "529"];
              const CASH_TYPES = ["checking", "savings", "money_market", "hsa"];

              const currentInvested = latest.accounts
                ?.filter(a => INVESTMENT_TYPES.includes(a.type))
                .reduce((s, a) => s + Math.abs(a.balance), 0) || 0;

              const currentSavings = latest.accounts
                ?.filter(a => CASH_TYPES.includes(a.type))
                .reduce((s, a) => s + Math.abs(a.balance), 0) || 0;
              const projections = [1, 3, 5, 10].map(years => {
                // Investment accounts grow at 7% annually
                const investmentGrowth = currentInvested * Math.pow(1 + annualReturn, years);
                // Cash savings don't grow at 7% but accumulate
                const cashGrowth = currentSavings;
                // New monthly savings added each year
                const newContributions = avgMonthlySavings * 12 * years;
                // Total = grown investments + existing cash + new savings
                const total = investmentGrowth + cashGrowth + newContributions;
                return { years, total: Math.round(total) };
              });

              const chartProjections = Array.from({ length: 11 }, (_, i) => ({
                year: `Year ${i}`,
                projected: Math.round(
                  currentInvested * Math.pow(1 + annualReturn, i) +
                  currentSavings +
                  avgMonthlySavings * 12 * i
                )
              }));

              return (
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>Future Projections</h2>
                  <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>
                    Based on your current net worth and average monthly savings of ${Math.round(avgMonthlySavings).toLocaleString()}.
                    Investments assume 7% annual return.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                    {projections.map(({ years, total }) => (
                      <div key={years} style={styles.totalCard}>
                        <p style={styles.totalLabel}>{years} Year{years > 1 ? "s" : ""}</p>
                        <p style={{ ...styles.totalAmount, fontSize: 22, color: "#4f86c6" }}>${total.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>

                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartProjections}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`} />
                      <Line type="monotone" dataKey="projected" name="Projected Net Worth"
                        stroke="#4f86c6" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* Savings Goals */}
            <div style={styles.card}>
              <div style={styles.tableHeader}>
                <h2 style={styles.cardTitle}>Savings Goals</h2>
                <button onClick={() => setShowAddGoal(!showAddGoal)} style={styles.pillButton}>
                  + Add Goal
                </button>
              </div>

              {showAddGoal && (
                <div style={{ background: "#f8f9fa", borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                    <div>
                      <label style={styles.uploadLabel}>Goal Name</label>
                      <input type="text" placeholder="e.g. Italy Trip"
                        value={newGoal.name}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                        style={styles.pillInput} />
                    </div>
                    <div>
                      <label style={styles.uploadLabel}>Target Amount</label>
                      <input type="number" placeholder="10000"
                        value={newGoal.target_amount}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, target_amount: e.target.value }))}
                        style={{ ...styles.pillInput, width: 140 }} />
                    </div>
                    <div>
                      <label style={styles.uploadLabel}>Already Saved</label>
                      <input type="number" placeholder="0"
                        value={newGoal.current_amount}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, current_amount: e.target.value }))}
                        style={{ ...styles.pillInput, width: 140 }} />
                    </div>
                    <div>
                      <label style={styles.uploadLabel}>Target Date</label>
                      <input type="month"
                        value={newGoal.target_date}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, target_date: e.target.value }))}
                        style={styles.pillInput} />
                    </div>
                    <div>
                      <label style={styles.uploadLabel}>Color</label>
                      <input type="color" value={newGoal.color}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, color: e.target.value }))}
                        style={{ width: 48, height: 38, borderRadius: 8, border: "none", cursor: "pointer" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={createGoal} style={styles.pillButton}>Save Goal</button>
                    <button onClick={() => setShowAddGoal(false)} style={styles.clearFilter}>Cancel</button>
                  </div>
                </div>
              )}

              {goals.length === 0 ? (
                <p style={styles.noPeopleMsg}>No goals yet. Add a goal to track your progress.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {goals.map(goal => {
                    const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                    const remaining = goal.target_amount - goal.current_amount;
                    const avgMonthlySavings = statements.length > 0
                      ? statements.slice(0, 3).reduce((s, stmt) => s + (stmt.totals?.savings || 0), 0) / Math.min(statements.length, 3)
                      : 0;
                    const monthsToGoal = avgMonthlySavings > 0 ? Math.ceil(remaining / avgMonthlySavings) : null;

                    return (
                      <div key={goal.id} style={{ background: "#f8f9fa", borderRadius: 16, padding: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: "700", color: "#1a1a2e" }}>{goal.name}</h3>
                            {goal.target_date && (
                              <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#aaa" }}>
                                Target: {formatMonth(goal.target_date)}
                              </p>
                            )}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ margin: 0, fontSize: 20, fontWeight: "800", color: goal.color }}>
                              ${Math.round(goal.current_amount).toLocaleString()}
                              <span style={{ fontSize: 13, color: "#aaa", fontWeight: "400" }}>
                                {" "}/ ${Math.round(goal.target_amount).toLocaleString()}
                              </span>
                            </p>
                            {monthsToGoal && (
                              <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#888" }}>
                                ~{monthsToGoal} months at current savings rate
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div style={{ background: "#e8ecf0", borderRadius: 50, height: 10, marginBottom: 8 }}>
                          <div style={{
                            background: goal.color,
                            borderRadius: 50,
                            height: 10,
                            width: `${progress}%`,
                            transition: "width 0.5s"
                          }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{Math.round(progress)}% complete</p>
                          <div style={{ display: "flex", gap: 8 }}>
                            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>${Math.round(remaining).toLocaleString()} remaining</p>
                            <button onClick={() => deleteGoal(goal.id)} style={styles.deleteButton}>✕</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Planning Insights */}
            <div style={styles.card}>
              <div style={styles.tableHeader}>
                <h2 style={styles.cardTitle}>AI Financial Plan</h2>
                <button onClick={fetchPlanningInsights} disabled={generatingPlanningInsights}
                  style={generatingPlanningInsights ? styles.pillButtonDisabled : styles.pillButton}>
                  {generatingPlanningInsights ? "↻ Generating..." : "✦ Generate Plan"}
                </button>
              </div>
              {generatingPlanningInsights && (
                <div style={styles.insightsLoadingBar}><div style={styles.insightsLoadingFill} /></div>
              )}
              {planningInsights ? (
                <>
                  <p style={styles.summary}>{planningInsights.summary}</p>

                  <div style={styles.insightBox}>
                    <p style={styles.insightLabel}>Net Worth Analysis</p>
                    <p style={{ margin: 0, fontSize: 14 }}>{planningInsights.net_worth_analysis}</p>
                  </div>

                  <div style={styles.insightBox}>
                    <p style={styles.insightLabel}>Investment Analysis</p>
                    <p style={{ margin: 0, fontSize: 14 }}>{planningInsights.investment_analysis}</p>
                  </div>

                  {planningInsights.tax_optimization && (
                    <div style={styles.insightBox}>
                      <p style={styles.insightLabel}>Tax Optimization</p>
                      <p style={{ margin: 0, fontSize: 14 }}>{planningInsights.tax_optimization}</p>
                    </div>
                  )}

                  {planningInsights.emergency_fund_assessment && (
                    <div style={styles.insightBox}>
                      <p style={styles.insightLabel}>Emergency Fund</p>
                      <p style={{ margin: 0, fontSize: 14 }}>{planningInsights.emergency_fund_assessment}</p>
                    </div>
                  )}

                  {planningInsights.debt_strategy && (
                    <div style={styles.insightBox}>
                      <p style={styles.insightLabel}>Debt Strategy</p>
                      <p style={{ margin: 0, fontSize: 14 }}>{planningInsights.debt_strategy}</p>
                    </div>
                  )}

                  {planningInsights.goal_analysis?.length > 0 && (
                    <>
                      <p style={styles.insightLabel}>Goal Analysis</p>
                      {planningInsights.goal_analysis.map((g, i) => (
                        <div key={i} style={{ ...styles.insightBox, marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <p style={{ margin: 0, fontWeight: "700", fontSize: 14 }}>{g.goal_name}</p>
                            <span style={{
                              fontSize: 11, fontWeight: "700", padding: "2px 8px", borderRadius: 50,
                              background: g.on_track ? "#e8f8ee" : "#ffeaea",
                              color: g.on_track ? "#2ecc71" : "#e05c5c"
                            }}>
                              {g.on_track ? "On Track" : "Needs Attention"}
                            </span>
                          </div>
                          <p style={{ margin: "0 0 6px 0", fontSize: 13, color: "#555" }}>{g.insight}</p>
                          <p style={{ margin: 0, fontSize: 13, color: "#4f86c6", fontWeight: "600" }}>💡 {g.recommendation}</p>
                        </div>
                      ))}
                    </>
                  )}

                  <p style={styles.insightLabel}>Top Recommendations</p>
                  {planningInsights.top_recommendations?.map((rec, i) => (
                    <div key={i} style={{ ...styles.insightBox, marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <p style={{ margin: 0, fontWeight: "700", fontSize: 14 }}>{rec.title}</p>
                        <div style={{ display: "flex", gap: 6 }}>
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 50, fontWeight: "600",
                            background: rec.impact === "high" ? "#ffeaea" : rec.impact === "medium" ? "#fff8e1" : "#f0f4f8",
                            color: rec.impact === "high" ? "#e05c5c" : rec.impact === "medium" ? "#f0a500" : "#888"
                          }}>
                            {rec.impact} impact
                          </span>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 50, background: "#f0f6ff", color: "#4f86c6", fontWeight: "600" }}>
                            {rec.timeframe}
                          </span>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "#555" }}>{rec.description}</p>
                    </div>
                  ))}

                  <div style={styles.insightBox}>
                    <p style={styles.insightLabel}>Risk Assessment</p>
                    <p style={{ margin: 0, fontSize: 14 }}>{planningInsights.risk_assessment}</p>
                  </div>
                </>
              ) : (
                <p style={styles.noPeopleMsg}>
                  Add your account balances and goals above, then click Generate Plan for personalized financial planning advice.
                </p>
              )}
            </div>
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
  tabs: {
    display: "flex",
    gap: 6,
    marginBottom: 28,
    background: "#e8ecf0",
    borderRadius: 50,
    padding: 4,
    width: "fit-content",
    margin: "0 auto 28px auto",
  },
  tab: {
    background: "none",
    border: "none",
    borderRadius: 50,
    padding: "10px 32px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: "500",
    color: "#888",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  tabActive: {
    background: "white",
    border: "none",
    borderRadius: 50,
    padding: "10px 32px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a2e",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
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
  button: { background: "#4f86c6", color: "white", border: "none", padding: "12px 28px", borderRadius: 8, fontSize: 16, cursor: "pointer", fontWeight: "bold" },
  buttonDisabled: { background: "#ccc", color: "white", border: "none", padding: "12px 28px", borderRadius: 8, fontSize: 16, cursor: "not-allowed", fontWeight: "bold" },
  cancelButton: { background: "none", border: "1px solid #e05c5c", color: "#e05c5c", borderRadius: 8, padding: "12px 20px", cursor: "pointer", fontSize: 14, fontWeight: "bold" },
  removeFileButton: { background: "none", border: "none", color: "#e05c5c", cursor: "pointer", fontSize: 14, padding: "0 4px", fontWeight: "bold" },
  clearFilesButton: { background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12, color: "#888", marginTop: 4 },
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
  thContent: { display: "flex", alignItems: "center", gap: 4, marginBottom: 6 },
  sortButton: { background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#4f86c6", padding: 0 },
  filterInput: { width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid #ddd", fontSize: 12, boxSizing: "border-box" },
  filterSelect: { width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid #ddd", fontSize: 12, background: "white", boxSizing: "border-box" },
  th: { textAlign: "left", padding: "10px 12px", background: "#f5f7fa", fontWeight: "bold", fontSize: 13, color: "#555" },
  td: { padding: "10px 12px", fontSize: 14 },
  rowEven: { background: "white" },
  rowOdd: { background: "#fafafa" },
  accountBadge: { background: "#f0f4f8", color: "#555", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: "bold", border: "1px solid #ddd" },
  categoryBadge: { color: "white", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: "bold" },
  noTransactions: { color: "#888", fontSize: 14, textAlign: "center", padding: 20 },
  noteText: { fontSize: 11, color: "#aaa", marginTop: 2 },
  loadingMessage: { fontSize: 13, color: "#4f86c6", marginTop: 8, fontStyle: "italic" },
  excludeButton: { fontSize: 11, padding: "2px 8px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: "bold" },
  categorySelect: { fontSize: 12, padding: "2px 4px", borderRadius: 4, border: "1px solid #ddd" },
  insightsLoadingBar: { height: 3, background: "#f0f4f8", borderRadius: 2, marginBottom: 16, overflow: "hidden" },
  insightsLoadingFill: { height: "100%", width: "40%", background: "#4f86c6", borderRadius: 2, animation: "slidingBar 1.2s ease-in-out infinite" },
  titleSection: {
    textAlign: "center",
    marginBottom: 32,
    paddingBottom: 24,
    borderBottom: "1px solid #e8ecf0",
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    background: "linear-gradient(135deg, #1a1a2e 0%, #4f86c6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    margin: "0 0 6px 0",
    letterSpacing: "-1px",
  },
  titleSub: {
    fontSize: 14,
    color: "#aaa",
    margin: 0,
    letterSpacing: "2px",
    textTransform: "uppercase",
    fontWeight: "500",
  },
  uploadCard: {
    background: "white",
    borderRadius: 20,
    padding: 36,
    marginBottom: 20,
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    border: "1px solid #f0f0f0",
  },
  uploadTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a2e",
    margin: "0 0 6px 0",
  },
  uploadSubtitle: {
    fontSize: 13,
    color: "#aaa",
    margin: "0 0 28px 0",
  },
  uploadFormRow: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  uploadFormGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  uploadLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  pillSelect: {
    padding: "10px 16px",
    borderRadius: 50,
    border: "1.5px solid #e8ecf0",
    fontSize: 14,
    background: "#f8f9fa",
    color: "#1a1a2e",
    cursor: "pointer",
    outline: "none",
    minWidth: 160,
  },
  pillInput: {
    padding: "8px 16px",
    borderRadius: 50,
    border: "1.5px solid #e8ecf0",
    fontSize: 13,
    background: "#f8f9fa",
    color: "#1a1a2e",
    outline: "none",
    width: 200,
  },
  filePickerButton: {
    display: "inline-block",
    padding: "10px 20px",
    borderRadius: 50,
    border: "1.5px dashed #4f86c6",
    fontSize: 13,
    fontWeight: "600",
    color: "#4f86c6",
    cursor: "pointer",
    background: "#f0f6ff",
    transition: "all 0.2s",
  },
  fileList: {
    background: "#f8f9fa",
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  fileRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    background: "white",
    borderRadius: 50,
    padding: "8px 16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  fileIcon: {
    fontSize: 16,
  },
  pillButton: {
    background: "linear-gradient(135deg, #1a1a2e 0%, #4f86c6 100%)",
    color: "white",
    border: "none",
    padding: "12px 32px",
    borderRadius: 50,
    fontSize: 14,
    cursor: "pointer",
    fontWeight: "700",
    letterSpacing: "0.3px",
    boxShadow: "0 4px 16px rgba(79,134,198,0.4)",
  },
  pillButtonDisabled: {
    background: "#e8ecf0",
    color: "#aaa",
    border: "none",
    padding: "12px 32px",
    borderRadius: 50,
    fontSize: 14,
    cursor: "not-allowed",
    fontWeight: "700",
  },
  loadingMessage: {
    fontSize: 13,
    color: "#4f86c6",
    marginTop: 8,
    fontStyle: "italic",
  },
  yearSidebar: {
    width: 100,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingTop: 8,
  },
  yearSidebarTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: "1px",
    margin: "0 0 8px 0",
  },
  yearButton: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "10px 0",
    cursor: "pointer",
    fontSize: 14,
    width: "100%",
    transition: "all 0.15s",
  },
};