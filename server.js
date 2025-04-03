const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Create database and tables if they don't exist
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Create database
    await connection.query('CREATE DATABASE IF NOT EXISTS crm_db');
    await connection.query('USE crm_db');

    // Create leads table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        occupation VARCHAR(255) NOT NULL,
        status ENUM('hot', 'warm', 'cold') NOT NULL DEFAULT 'cold',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create notes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
      )
    `);

    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Initialize database
initializeDatabase();

// Routes
app.get('/api/leads', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching leads' });
  }
});

app.get('/api/leads/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching lead' });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const { name, address, phone, occupation, status } = req.body;
    const [result] = await pool.query(
      'INSERT INTO leads (name, address, phone, occupation, status) VALUES (?, ?, ?, ?, ?)',
      [name, address, phone, occupation, status]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Error creating lead' });
  }
});

app.patch('/api/leads/:id', async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE leads SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Lead updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error updating lead' });
  }
});

app.get('/api/leads/:id/notes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notes WHERE lead_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching notes' });
  }
});

app.post('/api/leads/:id/notes', async (req, res) => {
  try {
    const { content } = req.body;
    const [result] = await pool.query(
      'INSERT INTO notes (lead_id, content) VALUES (?, ?)',
      [req.params.id, content]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Error creating note' });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM notes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting note' });
  }
});

app.patch('/api/lead/edit/:id', async (req, res)=>{
  try{
    const {name, address, phone, occupation} = req.body;
    await pool.query('UPDATE leads SET name = ?, address = ?, phone = ?, occupation = ? WHERE id = ?', [name, address, phone, occupation, req.params.id]);
    res.json({message: 'Lead updated successfully'});
  }catch(e){
    res.status(500).json({error: e})
  }
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 