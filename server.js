const express = require('express');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = Number(process.env.PORT);
const databasePathValue = process.env.EXPENSES_DB_PATH;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Set PORT in .env to a valid port number.');
}

if (!databasePathValue) {
  throw new Error('Set EXPENSES_DB_PATH in .env to a database file path.');
}

const databasePath = path.resolve(__dirname, databasePathValue);
const categories = ['Food', 'Transportation', 'Shopping', 'Other'];

mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new DatabaseSync(databasePath);
database.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL CHECK (category IN ('Food', 'Transportation', 'Shopping', 'Other')),
    date TEXT NOT NULL
  )
`);

app.use(express.json());

app.get('/expenses', (req, res) => {
  const expenses = database.prepare(
    'SELECT id, name, amount, category, date FROM expenses ORDER BY date DESC, id DESC'
  ).all();
  res.json(expenses);
});

app.get('/expenses/summary', (req, res) => {
  const total = database.prepare(
    'SELECT COALESCE(ROUND(SUM(amount), 2), 0) AS total FROM expenses'
  ).get().total;
  const grouped = database.prepare(
    'SELECT category, ROUND(SUM(amount), 2) AS total FROM expenses GROUP BY category'
  ).all();
  const byCategory = Object.fromEntries(categories.map((category) => [category, 0]));

  for (const row of grouped) {
    byCategory[row.category] = row.total;
  }

  res.json({ total, byCategory });
});

app.post('/expenses', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const amount = req.body?.amount;
  const category = req.body?.category;
  const date = req.body?.date;
  const validDate = typeof date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && !Number.isNaN(Date.parse(`${date}T00:00:00.000Z`))
    && new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) === date;

  if (!name || name.length > 120 || !Number.isFinite(amount) || amount <= 0
    || !categories.includes(category) || !validDate) {
    return res.status(400).json({
      error: 'Enter a name, a positive amount, a valid category, and a valid date.',
    });
  }

  const result = database.prepare(
    'INSERT INTO expenses (name, amount, category, date) VALUES (?, ?, ?, ?)'
  ).run(name, Math.round(amount * 100) / 100, category, date);
  const expense = database.prepare(
    'SELECT id, name, amount, category, date FROM expenses WHERE id = ?'
  ).get(result.lastInsertRowid);
  res.status(201).json(expense);
});

app.delete('/expenses/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Expense ID must be a positive integer.' });
  }

  const result = database.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'That expense could not be found.' });
  }

  res.status(204).end();
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = error.status === 400 ? 400 : 500;
  res.status(status).json({
    error: status === 400 ? 'Please submit valid JSON.' : 'Something went wrong. Please try again.',
  });
});

app.use(express.static(path.join(__dirname, 'dist')));

app.listen(port, () => {
  console.log(`Expense API listening at http://localhost:${port}`);
});