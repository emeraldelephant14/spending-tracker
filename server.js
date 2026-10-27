const express = require('express');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const port = process.env.PORT || 3000;
const databasePath = process.env.PRODUCTS_DB_PATH || path.join(__dirname, 'data', 'products.sqlite');

mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new DatabaseSync(databasePath);
database.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
  )
`);

app.use(express.json());

app.get('/api/products', (req, res) => {
  const products = database.prepare('SELECT id, name, price FROM products ORDER BY id').all();
  res.json(products);
});

app.post('/api/products', (req, res) => {
  res.status(200).json(req.body);
});

app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});