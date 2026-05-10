const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: 'https://vigneshagencyin.vercel.app/',
    credentials: true,
  })
);
app.use(express.json());

// MongoDB only — no SQLite routes mounted
connectDB().then(() => {
  app.get('/', (req, res) =>
    res.json({
      status: 'VIGNESH AGENCY backend (MongoDB)',
      bills: '/api/mongo-bills',
      billThermal: '/api/mongo-bills/:id/thermal',
      dashboard: '/api/dashboard',
      dealers: '/api/dealers',
      products: '/api/products',
      reports: '/api/reports',
    })
  );
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/dealers', require('./routes/dealers'));
  app.use('/api/products', require('./routes/products'));
  app.use('/api/mongo-bills', require('./routes/mongoBills'));
  app.use('/api/reports', require('./routes/reports'));

  app.listen(PORT, () => {
    console.log(`Server running → http://localhost:${PORT}`);
  });
});
