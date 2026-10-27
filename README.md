# spending-tracker

## Run the API

Install dependencies once:

```bash
npm install
```

Start the Express server:

```bash
npm start
```

The server listens at `http://localhost:3000`. For automatic restarts while editing, use `npm run dev` instead.
The first start creates `data/products.sqlite` and the `products` table. Node.js 22.5 or newer is required for its built-in SQLite support.

## Routes

- `GET /api/products` returns rows from SQLite. Open `http://localhost:3000/api/products` in a browser to try it; a new database returns an empty array.
- `POST /api/products` echoes the submitted JSON body.

To add a row, start the server once to create the database, then run this in another terminal from the project folder:

```bash
node -e "const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync('data/products.sqlite'); db.prepare('INSERT INTO products (name, price) VALUES (?, ?)').run('Calculator', 8.5); db.close();"
```

Reload `GET /api/products` and the new product will be included in the response. The query selects each product's `id`, `name`, and `price` from the `products` table, ordered by `id`.

Try the POST route from the browser console while the server is running:

```js
fetch('http://localhost:3000/api/products', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ name: 'Calculator', price: 8.5 }),
}).then((response) => response.json()).then(console.log);
```

The POST response is `{ "name": "Calculator", "price": 8.5 }`.