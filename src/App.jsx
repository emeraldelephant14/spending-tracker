import { useEffect, useState } from 'react';

const categories = ['Food', 'Transportation', 'Shopping', 'Other'];
const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
});

function getToday() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

async function readJson(response) {
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(result?.error || 'Something went wrong. Please try again.');
  }
  return result;
}

function App() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, byCategory: {} });
  const [form, setForm] = useState({
    name: '',
    amount: '',
    category: categories[0],
    date: getToday(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formMessageType, setFormMessageType] = useState('');

  async function loadExpenses() {
    setErrorMessage('');
    try {
      const [expenseResponse, summaryResponse] = await Promise.all([
        fetch('/expenses'),
        fetch('/expenses/summary'),
      ]);
      const [expenseData, summaryData] = await Promise.all([
        readJson(expenseResponse),
        readJson(summaryResponse),
      ]);
      setExpenses(expenseData);
      setSummary(summaryData);
    } catch (error) {
      setErrorMessage(`${error.message} Check the connection and try again.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormMessage('');
    setErrorMessage('');

    try {
      await readJson(await fetch('/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          amount: Number(form.amount),
        }),
      }));
      setForm({ name: '', amount: '', category: categories[0], date: getToday() });
      setFormMessage('Expense saved.');
      setFormMessageType('success');
      await loadExpenses();
    } catch (error) {
      setFormMessage(`${error.message} Your entry is still here; please try again.`);
      setFormMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    setErrorMessage('');
    try {
      await readJson(await fetch(`/expenses/${id}`, { method: 'DELETE' }));
      await loadExpenses();
    } catch (error) {
      setErrorMessage(`${error.message} The expense was not removed.`);
    } finally {
      setDeletingId(null);
    }
  }

  const largestCategoryTotal = Math.max(...categories.map((category) => summary.byCategory[category] || 0), 0);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Pocket Ledger home">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>Pocket Ledger</span>
        </a>
        <span className="topbar-label">STUDENT SPENDING</span>
      </header>

      <main className="page">
        <section className="overview" aria-labelledby="page-title">
          <div className="overview-heading">
            <p className="eyebrow">YOUR MONEY, AT A GLANCE</p>
            <h1 id="page-title">Spending overview</h1>
          </div>
          <div className="total-block" aria-live="polite">
            <span className="total-label">Total spending</span>
            <strong>{currency.format(summary.total)}</strong>
          </div>
        </section>

        <section className="category-summary" aria-labelledby="category-title">
          <div className="summary-heading">
            <h2 id="category-title">By category</h2>
            <span>ALL TIME</span>
          </div>
          <div className="category-grid">
            {categories.map((category) => {
              const amount = summary.byCategory[category] || 0;
              const width = largestCategoryTotal > 0 ? (amount / largestCategoryTotal) * 100 : 0;
              return (
                <div className={`category-item category-${category.toLowerCase()}`} key={category}>
                  <div className="category-meta">
                    <span className="category-name">{category}</span>
                    <strong>{currency.format(amount)}</strong>
                  </div>
                  <div className="category-track" aria-hidden="true">
                    <span style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {errorMessage && (
          <div className="notice notice-error" role="alert">
            <span>{errorMessage}</span>
            <button type="button" className="text-button" onClick={loadExpenses}>Retry</button>
          </div>
        )}

        <div className="ledger-layout">
          <section className="entry-panel" aria-labelledby="entry-title">
            <div className="panel-heading">
              <span className="section-index">01</span>
              <h2 id="entry-title">Add an expense</h2>
            </div>
            <form className="expense-form" onSubmit={handleSubmit}>
              <label htmlFor="expense-name">What was it?</label>
              <input
                id="expense-name"
                name="name"
                type="text"
                maxLength="120"
                placeholder="Coffee, bus fare..."
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />

              <label htmlFor="expense-amount">Amount</label>
              <div className="amount-input">
                <span aria-hidden="true">$</span>
                <input
                  id="expense-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div>
                  <label htmlFor="expense-category">Category</label>
                  <select
                    id="expense-category"
                    name="category"
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                  >
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="expense-date">Date</label>
                  <input
                    id="expense-date"
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    required
                  />
                </div>
              </div>

              <button className="submit-button" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Add expense'}
                <span aria-hidden="true">+</span>
              </button>
              <p className={`form-message ${formMessageType}`} role="status" aria-live="polite">
                {formMessage}
              </p>
            </form>
          </section>

          <section className="expenses-panel" aria-labelledby="expenses-title">
            <div className="panel-heading expenses-heading">
              <div className="panel-title-group">
                <span className="section-index">02</span>
                <h2 id="expenses-title">Recent expenses</h2>
              </div>
              <span className="expense-count">{expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}</span>
            </div>

            {loading ? (
              <p className="list-state">Loading expenses...</p>
            ) : expenses.length === 0 ? (
              <p className="list-state empty-state">No expenses yet.</p>
            ) : (
              <ul className="expense-list">
                {expenses.map((expense) => (
                  <li className="expense-row" key={expense.id}>
                    <div className="expense-main">
                      <span className={`category-dot category-${expense.category.toLowerCase()}`} aria-hidden="true" />
                      <div className="expense-copy">
                        <strong>{expense.name}</strong>
                        <span>{formatDate(expense.date)}</span>
                      </div>
                    </div>
                    <span className="expense-category">{expense.category}</span>
                    <strong className="expense-amount">{currency.format(expense.amount)}</strong>
                    <button
                      className="delete-button"
                      type="button"
                      onClick={() => handleDelete(expense.id)}
                      disabled={deletingId === expense.id}
                      aria-label={`Delete ${expense.name}`}
                    >
                      {deletingId === expense.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;