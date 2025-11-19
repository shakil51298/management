const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 50000;

// Middleware
app.use(cors());
app.use(express.json());

// Delete old database to start fresh
if (fs.existsSync('./management.db')) {
  fs.unlinkSync('./management.db');
  console.log('Old database deleted, creating fresh database...');
}

// Initialize SQLite database
const db = new sqlite3.Database('./management.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

// Initialize database with all tables
function initializeDatabase() {
  // Create tables in correct order
  
  // 1. Customers table
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating customers table:', err);
    else console.log('Customers table created');
  });

  // 2. Agents table
  db.run(`CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('usdt', 'dhs')),
    usdt_rate REAL DEFAULT 3.67,
    dhs_rate REAL DEFAULT 1,
    phone TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating agents table:', err);
    else console.log('Agents table created');
  });

  // 3. Suppliers table
  db.run(`CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    rmb_to_usdt_rate REAL DEFAULT 7.2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating suppliers table:', err);
    else console.log('Suppliers table created');
  });

  // 4. Bank accounts table
  db.run(`CREATE TABLE IF NOT EXISTS bank_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT,
    currency TEXT NOT NULL,
    balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating bank_accounts table:', err);
    else console.log('Bank accounts table created');
  });

  // 5. Supplier transactions table
  db.run(`CREATE TABLE IF NOT EXISTS supplier_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    customer_id INTEGER,
    transaction_date DATE DEFAULT CURRENT_DATE,
    rmb_amount REAL,
    usdt_rate REAL,
    calculated_usdt REAL,
    type TEXT CHECK(type IN ('supplier_to_me', 'me_to_supplier')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
    FOREIGN KEY (customer_id) REFERENCES customers (id)
  )`, (err) => {
    if (err) console.error('Error creating supplier_transactions table:', err);
    else console.log('Supplier transactions table created');
  });

  // 6. Bills table
  db.run(`CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    agent_id INTEGER,
    bill_date DATE DEFAULT CURRENT_DATE,
    amount REAL,
    selling_price REAL,
    total_bill REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (id),
    FOREIGN KEY (agent_id) REFERENCES agents (id)
  )`, (err) => {
    if (err) console.error('Error creating bills table:', err);
    else console.log('Bills table created');
  });

  // 7. Payments table
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    agent_id INTEGER,
    supplier_id INTEGER,
    payment_date DATE DEFAULT CURRENT_DATE,
    amount REAL,
    currency TEXT DEFAULT 'aed',
    type TEXT DEFAULT 'customer_payment',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (id),
    FOREIGN KEY (agent_id) REFERENCES agents (id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
  )`, (err) => {
    if (err) console.error('Error creating payments table:', err);
    else console.log('Payments table created');
  });

  // 8. Agent settlements table
  db.run(`CREATE TABLE IF NOT EXISTS agent_settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER,
    settlement_date DATE DEFAULT CURRENT_DATE,
    amount REAL,
    currency TEXT,
    type TEXT CHECK(type IN ('received', 'paid')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents (id)
  )`, (err) => {
    if (err) console.error('Error creating agent_settlements table:', err);
    else console.log('Agent settlements table created');
  });

  // Insert sample data after tables are created
  setTimeout(() => {
    insertSampleData();
  }, 500);
}

function insertSampleData() {
  // Insert sample agents
  db.get("SELECT COUNT(*) as count FROM agents", (err, row) => {
    if (err) {
      console.error('Error checking agents:', err);
      return;
    }
    
    if (row.count === 0) {
      console.log('Inserting sample agents...');
      const sampleAgents = [
        ['Ali USDT Agent', 'usdt', 3.67, 1, '123-456-7890', 'ali@usdt.com'],
        ['Ahmed DHS Agent', 'dhs', 3.67, 1, '123-456-7891', 'ahmed@dhs.com'],
        ['USDT Exchange', 'usdt', 3.68, 1, '123-456-7892', 'exchange@usdt.com']
      ];

      const insertAgent = db.prepare("INSERT INTO agents (name, type, usdt_rate, dhs_rate, phone, email) VALUES (?, ?, ?, ?, ?, ?)");
      
      sampleAgents.forEach((agent, index) => {
        insertAgent.run(agent, (err) => {
          if (err) {
            console.error('Error inserting agent:', err);
          } else {
            console.log(`Agent ${index + 1} inserted`);
          }
        });
      });
      
      insertAgent.finalize();
      console.log('Sample agents inserted successfully');
    }
  });

  // Insert sample customers
  db.get("SELECT COUNT(*) as count FROM customers", (err, row) => {
    if (err) {
      console.error('Error checking customers:', err);
      return;
    }
    
    if (row.count === 0) {
      console.log('Inserting sample customers...');
      const sampleCustomers = [
        ['John Doe', 'john@example.com', '123-456-7890', '123 Main St'],
        ['Jane Smith', 'jane@example.com', '123-456-7891', '456 Oak Ave'],
        ['Bob Johnson', 'bob@example.com', '123-456-7892', '789 Pine Rd']
      ];

      const insertCustomer = db.prepare("INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)");
      
      sampleCustomers.forEach((customer, index) => {
        insertCustomer.run(customer, (err) => {
          if (err) {
            console.error('Error inserting customer:', err);
          } else {
            console.log(`Customer ${index + 1} inserted`);
          }
        });
      });
      
      insertCustomer.finalize();
      console.log('Sample customers inserted successfully');
    }
  });

  // Insert sample suppliers
  db.get("SELECT COUNT(*) as count FROM suppliers", (err, row) => {
    if (err) {
      console.error('Error checking suppliers:', err);
      return;
    }
    
    if (row.count === 0) {
      console.log('Inserting sample suppliers...');
      const sampleSuppliers = [
        ['China Trading Co.', 'Mr. Zhang', '+86-138-0011-2233', 'zhang@china-trading.com', 7.2],
        ['Global Suppliers Ltd.', 'Ms. Li', '+86-139-0055-6677', 'li@global-suppliers.com', 7.15],
        ['Eastern Imports', 'Mr. Wang', '+86-137-0088-9944', 'wang@eastern-imports.com', 7.25]
      ];

      const insertSupplier = db.prepare("INSERT INTO suppliers (name, contact_person, phone, email, rmb_to_usdt_rate) VALUES (?, ?, ?, ?, ?)");
      
      sampleSuppliers.forEach((supplier, index) => {
        insertSupplier.run(supplier, (err) => {
          if (err) {
            console.error('Error inserting supplier:', err);
          } else {
            console.log(`Supplier ${index + 1} inserted`);
          }
        });
      });
      
      insertSupplier.finalize();
      console.log('Sample suppliers inserted successfully');
    }
  });

  // Insert sample bank accounts
  db.get("SELECT COUNT(*) as count FROM bank_accounts", (err, row) => {
    if (err) {
      console.error('Error checking bank_accounts:', err);
      return;
    }
    
    if (row.count === 0) {
      console.log('Inserting sample bank accounts...');
      const sampleAccounts = [
        ['Main AED Account', 'Emirates NBD', '1234567890', 'AED', 50000],
        ['USD Business Account', 'HSBC', '9876543210', 'USD', 15000],
        ['USDT Wallet', 'Binance', 'USDTWALLET123', 'USDT', 12000],
        ['RMB Account', 'ICBC', '1122334455', 'RMB', 80000]
      ];

      const insertAccount = db.prepare("INSERT INTO bank_accounts (account_name, bank_name, account_number, currency, balance) VALUES (?, ?, ?, ?, ?)");
      
      sampleAccounts.forEach((account, index) => {
        insertAccount.run(account, (err) => {
          if (err) {
            console.error('Error inserting bank account:', err);
          } else {
            console.log(`Bank account ${index + 1} inserted`);
          }
        });
      });
      
      insertAccount.finalize();
      console.log('Sample bank accounts inserted successfully');
    }
  });
}

// ==================== CUSTOMER ROUTES ====================

// Get all customers with balance information
app.get('/api/customers', (req, res) => {
  const query = `
    SELECT c.*, 
           COALESCE(SUM(b.total_bill), 0) as total_billed,
           COALESCE(SUM(p.amount), 0) as total_paid,
           COALESCE(SUM(b.total_bill), 0) - COALESCE(SUM(p.amount), 0) as balance
    FROM customers c
    LEFT JOIN bills b ON c.id = b.customer_id
    LEFT JOIN payments p ON c.id = p.customer_id AND p.type = 'customer_payment'
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching customers:', err);
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ customers: rows });
  });
});

// Get single customer with details
app.get('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  
  const customerQuery = "SELECT * FROM customers WHERE id = ?";
  const billsQuery = "SELECT * FROM bills WHERE customer_id = ? ORDER BY bill_date DESC";
  const paymentsQuery = `
    SELECT p.*, a.name as agent_name, a.type as agent_type, 
           b.account_name as bank_account_name, b.bank_name, b.currency as bank_currency
    FROM payments p 
    LEFT JOIN agents a ON p.agent_id = a.id 
    LEFT JOIN bank_accounts b ON p.bank_account_id = b.id
    WHERE p.customer_id = ? 
    ORDER BY p.payment_date DESC
  `;
  const supplierPaymentsQuery = `
    SELECT st.*, s.name as supplier_name 
    FROM supplier_transactions st 
    LEFT JOIN suppliers s ON st.supplier_id = s.id 
    WHERE st.customer_id = ? 
    ORDER BY st.transaction_date DESC
  `;
  
  db.get(customerQuery, [id], (err, customer) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    
    db.all(billsQuery, [id], (err, bills) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      
      db.all(paymentsQuery, [id], (err, payments) => {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        
        db.all(supplierPaymentsQuery, [id], (err, supplierPayments) => {
          if (err) {
            res.status(400).json({ error: err.message });
            return;
          }
          
          const totalBilled = bills.reduce((sum, bill) => sum + bill.total_bill, 0);
          const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
          const supplierPaid = supplierPayments.reduce((sum, sp) => sum + (sp.type === 'supplier_to_me' ? sp.calculated_usdt : 0), 0);
          const balance = totalBilled - totalPaid - supplierPaid;
          
          res.json({
            customer,
            bills,
            payments,
            supplierPayments,
            summary: {
              totalBilled,
              totalPaid,
              supplierPaid,
              balance
            }
          });
        });
      });
    });
  });
});

// Create new customer
app.post('/api/customers', (req, res) => {
  const { name, email, phone, address } = req.body;
  
  db.run(
    "INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)",
    [name, email, phone, address],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID,
        message: 'Customer created successfully'
      });
    }
  );
});

// Update customer
app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address } = req.body;
  
  db.run(
    "UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?",
    [name, email, phone, address, id],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Customer updated successfully' });
    }
  );
});

// Delete customer
app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  
  db.serialize(() => {
    db.run("DELETE FROM bills WHERE customer_id = ?", id);
    db.run("DELETE FROM payments WHERE customer_id = ?", id);
    db.run("UPDATE supplier_transactions SET customer_id = NULL WHERE customer_id = ?", id);
    db.run("DELETE FROM customers WHERE id = ?", id, function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Customer deleted successfully' });
    });
  });
});

// ==================== AGENT ROUTES ====================

// Get all agents
app.get('/api/agents', (req, res) => {
  const query = `
    SELECT a.*,
           COALESCE(SUM(p.amount), 0) as total_received,
           COALESCE(SUM(CASE WHEN s.type = 'received' THEN s.amount ELSE 0 END), 0) as total_settled,
           COALESCE(SUM(p.amount), 0) - 
           COALESCE(SUM(CASE WHEN s.type = 'received' THEN s.amount ELSE 0 END), 0) as pending_balance
    FROM agents a
    LEFT JOIN payments p ON a.id = p.agent_id
    LEFT JOIN agent_settlements s ON a.id = s.agent_id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching agents:', err);
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ agents: rows });
  });
});

// Get single agent with details
app.get('/api/agents/:id', (req, res) => {
  const { id } = req.params;
  
  const agentQuery = "SELECT * FROM agents WHERE id = ?";
  const paymentsQuery = `
    SELECT p.*, c.name as customer_name 
    FROM payments p 
    LEFT JOIN customers c ON p.customer_id = c.id 
    WHERE p.agent_id = ? 
    ORDER BY p.payment_date DESC
  `;
  const settlementsQuery = "SELECT * FROM agent_settlements WHERE agent_id = ? ORDER BY settlement_date DESC";
  
  db.get(agentQuery, [id], (err, agent) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    
    db.all(paymentsQuery, [id], (err, payments) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      
      db.all(settlementsQuery, [id], (err, settlements) => {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        
        const totalReceived = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const totalSettled = settlements
          .filter(s => s.type === 'received')
          .reduce((sum, settlement) => sum + settlement.amount, 0);
        const pendingBalance = totalReceived - totalSettled;
        
        res.json({
          agent,
          payments,
          settlements,
          summary: {
            totalReceived,
            totalSettled,
            pendingBalance
          }
        });
      });
    });
  });
});

// Create new agent
app.post('/api/agents', (req, res) => {
  const { name, type, usdt_rate, dhs_rate, phone, email } = req.body;
  
  db.run(
    "INSERT INTO agents (name, type, usdt_rate, dhs_rate, phone, email) VALUES (?, ?, ?, ?, ?, ?)",
    [name, type, usdt_rate || 3.67, dhs_rate || 1, phone, email],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID,
        message: 'Agent created successfully'
      });
    }
  );
});

// Update agent
app.put('/api/agents/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, usdt_rate, dhs_rate, phone, email } = req.body;
  
  db.run(
    "UPDATE agents SET name = ?, type = ?, usdt_rate = ?, dhs_rate = ?, phone = ?, email = ? WHERE id = ?",
    [name, type, usdt_rate, dhs_rate, phone, email, id],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Agent updated successfully' });
    }
  );
});

// Delete agent
app.delete('/api/agents/:id', (req, res) => {
  const { id } = req.params;
  
  db.serialize(() => {
    db.run("UPDATE payments SET agent_id = NULL WHERE agent_id = ?", id);
    db.run("DELETE FROM agent_settlements WHERE agent_id = ?", id);
    db.run("DELETE FROM agents WHERE id = ?", id, function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Agent deleted successfully' });
    });
  });
});

// ==================== SUPPLIER ROUTES ====================

// Get all suppliers with balance information
app.get('/api/suppliers', (req, res) => {
  const query = `
    SELECT s.*,
           COALESCE(SUM(CASE WHEN st.type = 'supplier_to_me' THEN st.calculated_usdt ELSE 0 END), 0) as total_rmb_received,
           COALESCE(SUM(CASE WHEN st.type = 'me_to_supplier' THEN st.calculated_usdt ELSE 0 END), 0) as total_usdt_paid,
           COALESCE(SUM(CASE WHEN st.type = 'supplier_to_me' THEN st.calculated_usdt ELSE -st.calculated_usdt END), 0) as net_balance
    FROM suppliers s
    LEFT JOIN supplier_transactions st ON s.id = st.supplier_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching suppliers:', err);
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ suppliers: rows });
  });
});

// Get single supplier with details
app.get('/api/suppliers/:id', (req, res) => {
  const { id } = req.params;
  
  const supplierQuery = "SELECT * FROM suppliers WHERE id = ?";
  const transactionsQuery = `
    SELECT st.*, c.name as customer_name 
    FROM supplier_transactions st 
    LEFT JOIN customers c ON st.customer_id = c.id 
    WHERE st.supplier_id = ? 
    ORDER BY st.transaction_date DESC
  `;
  
  db.get(supplierQuery, [id], (err, supplier) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    
    if (!supplier) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }
    
    db.all(transactionsQuery, [id], (err, transactions) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      
      const totalRmbReceived = transactions
        .filter(t => t.type === 'supplier_to_me')
        .reduce((sum, t) => sum + t.rmb_amount, 0);
      const totalUsdtPaid = transactions
        .filter(t => t.type === 'me_to_supplier')
        .reduce((sum, t) => sum + t.calculated_usdt, 0);
      const netBalance = totalRmbReceived - totalUsdtPaid;
      
      res.json({
        supplier,
        transactions,
        summary: {
          totalRmbReceived,
          totalUsdtPaid,
          netBalance
        }
      });
    });
  });
});

// Create new supplier
app.post('/api/suppliers', (req, res) => {
  const { name, contact_person, phone, email, rmb_to_usdt_rate } = req.body;
  
  db.run(
    "INSERT INTO suppliers (name, contact_person, phone, email, rmb_to_usdt_rate) VALUES (?, ?, ?, ?, ?)",
    [name, contact_person, phone, email, rmb_to_usdt_rate || 7.2],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID,
        message: 'Supplier created successfully'
      });
    }
  );
});

// Update supplier
app.put('/api/suppliers/:id', (req, res) => {
  const { id } = req.params;
  const { name, contact_person, phone, email, rmb_to_usdt_rate } = req.body;
  
  db.run(
    "UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, rmb_to_usdt_rate = ? WHERE id = ?",
    [name, contact_person, phone, email, rmb_to_usdt_rate, id],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Supplier updated successfully' });
    }
  );
});

// Delete supplier
app.delete('/api/suppliers/:id', (req, res) => {
  const { id } = req.params;
  
  db.serialize(() => {
    db.run("DELETE FROM supplier_transactions WHERE supplier_id = ?", id);
    db.run("DELETE FROM suppliers WHERE id = ?", id, function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Supplier deleted successfully' });
    });
  });
});

// ==================== SUPPLIER TRANSACTION ROUTES ====================

// Create supplier transaction
app.post('/api/supplier-transactions', (req, res) => {
  const { supplier_id, customer_id, transaction_date, rmb_amount, usdt_rate, calculated_usdt, type, notes } = req.body;
  
  db.run(
    "INSERT INTO supplier_transactions (supplier_id, customer_id, transaction_date, rmb_amount, usdt_rate, calculated_usdt, type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [supplier_id, customer_id, transaction_date, rmb_amount, usdt_rate, calculated_usdt, type, notes],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID,
        message: 'Supplier transaction recorded successfully'
      });
    }
  );
});

// Update supplier transaction
app.put('/api/supplier-transactions/:id', (req, res) => {
  const { id } = req.params;
  const { supplier_id, customer_id, transaction_date, rmb_amount, usdt_rate, calculated_usdt, type, notes } = req.body;
  
  db.run(
    "UPDATE supplier_transactions SET supplier_id = ?, customer_id = ?, transaction_date = ?, rmb_amount = ?, usdt_rate = ?, calculated_usdt = ?, type = ?, notes = ? WHERE id = ?",
    [supplier_id, customer_id, transaction_date, rmb_amount, usdt_rate, calculated_usdt, type, notes, id],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Supplier transaction updated successfully' });
    }
  );
});

// Delete supplier transaction
app.delete('/api/supplier-transactions/:id', (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM supplier_transactions WHERE id = ?", id, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'Supplier transaction deleted successfully' });
  });
});

// ==================== BANK ACCOUNT ROUTES ====================

// Get all bank accounts
app.get('/api/bank-accounts', (req, res) => {
  db.all("SELECT * FROM bank_accounts ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ bankAccounts: rows });
  });
});

// Create bank account
app.post('/api/bank-accounts', (req, res) => {
  const { account_name, bank_name, account_number, currency, balance } = req.body;
  
  db.run(
    "INSERT INTO bank_accounts (account_name, bank_name, account_number, currency, balance) VALUES (?, ?, ?, ?, ?)",
    [account_name, bank_name, account_number, currency, balance || 0],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID,
        message: 'Bank account created successfully'
      });
    }
  );
});

// Update bank account
app.put('/api/bank-accounts/:id', (req, res) => {
  const { id } = req.params;
  const { account_name, bank_name, account_number, currency, balance } = req.body;
  
  db.run(
    "UPDATE bank_accounts SET account_name = ?, bank_name = ?, account_number = ?, currency = ?, balance = ? WHERE id = ?",
    [account_name, bank_name, account_number, currency, balance, id],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Bank account updated successfully' });
    }
  );
});

// Delete bank account
app.delete('/api/bank-accounts/:id', (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM bank_accounts WHERE id = ?", id, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'Bank account deleted successfully' });
  });
});

// ==================== DASHBOARD/OVERVIEW ROUTES ====================

// Get overview data for "Me" page
app.get('/api/overview', (req, res) => {
  const overviewQueries = {
    customers: `
      SELECT COUNT(*) as total_customers,
             SUM(balance) as total_customer_balance
      FROM (
        SELECT c.id, 
               COALESCE(SUM(b.total_bill), 0) - COALESCE(SUM(p.amount), 0) as balance
        FROM customers c
        LEFT JOIN bills b ON c.id = b.customer_id
        LEFT JOIN payments p ON c.id = p.customer_id AND p.type = 'customer_payment'
        GROUP BY c.id
      )
    `,
    agents: `
      SELECT COUNT(*) as total_agents,
             SUM(pending_balance) as total_agent_balance
      FROM (
        SELECT a.id,
               COALESCE(SUM(p.amount), 0) - 
               COALESCE(SUM(CASE WHEN s.type = 'received' THEN s.amount ELSE 0 END), 0) as pending_balance
        FROM agents a
        LEFT JOIN payments p ON a.id = p.agent_id
        LEFT JOIN agent_settlements s ON a.id = s.agent_id
        GROUP BY a.id
      )
    `,
    suppliers: `
      SELECT COUNT(*) as total_suppliers,
             SUM(net_balance) as total_supplier_balance
      FROM (
        SELECT s.id,
               COALESCE(SUM(CASE WHEN st.type = 'supplier_to_me' THEN st.calculated_usdt ELSE -st.calculated_usdt END), 0) as net_balance
        FROM suppliers s
        LEFT JOIN supplier_transactions st ON s.id = st.supplier_id
        GROUP BY s.id
      )
    `,
    bankAccounts: `
      SELECT COUNT(*) as total_accounts,
             SUM(balance) as total_balance,
             GROUP_CONCAT(currency) as currencies
      FROM bank_accounts
    `
  };

  const results = {};
  let completed = 0;

  Object.keys(overviewQueries).forEach(key => {
    db.get(overviewQueries[key], (err, row) => {
      if (err) {
        console.error(`Error fetching ${key}:`, err);
      } else {
        results[key] = row;
      }
      
      completed++;
      if (completed === Object.keys(overviewQueries).length) {
        res.json(results);
      }
    });
  });
});

// ==================== BILL ROUTES ====================

// Create new bill
app.post('/api/bills', (req, res) => {
  const { customer_id, agent_id, bill_date, amount, selling_price, total_bill } = req.body;
  
  db.run(
    "INSERT INTO bills (customer_id, agent_id, bill_date, amount, selling_price, total_bill) VALUES (?, ?, ?, ?, ?, ?)",
    [customer_id, agent_id, bill_date, amount, selling_price, total_bill],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID,
        message: 'Bill created successfully'
      });
    }
  );
});

// Update bill
app.put('/api/bills/:id', (req, res) => {
  const { id } = req.params;
  const { bill_date, amount, selling_price, total_bill } = req.body;
  
  db.run(
    "UPDATE bills SET bill_date = ?, amount = ?, selling_price = ?, total_bill = ? WHERE id = ?",
    [bill_date, amount, selling_price, total_bill, id],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Bill updated successfully' });
    }
  );
});

// Delete bill
app.delete('/api/bills/:id', (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM bills WHERE id = ?", id, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'Bill deleted successfully' });
  });
});

// ==================== PAYMENT ROUTES ====================

// Create new payment

app.post('/api/payments', (req, res) => {
  const { customer_id, agent_id, bank_account_id, supplier_id, payment_date, amount, currency, type, notes, agent_rate } = req.body;
  
  db.serialize(() => {
    // Insert the payment
    db.run(
      "INSERT INTO payments (customer_id, agent_id, bank_account_id, supplier_id, payment_date, amount, currency, type, notes, agent_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [customer_id, agent_id, bank_account_id, supplier_id, payment_date, amount, currency || 'bdt', type || 'customer_payment', notes || '', agent_rate || null],
      function(err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        
        const paymentId = this.lastID;
        
        // If payment is to bank account, update bank balance
        if (bank_account_id) {
          db.run(
            "UPDATE bank_accounts SET balance = balance + ? WHERE id = ?",
            [amount, bank_account_id],
            function(err) {
              if (err) {
                console.error('Error updating bank balance:', err);
                // Still return success for payment, but log the bank update error
              }
              
              res.json({ 
                id: paymentId,
                message: 'Payment recorded and bank balance updated successfully'
              });
            }
          );
        } else {
          res.json({ 
            id: paymentId,
            message: 'Payment recorded successfully'
          });
        }
      }
    );
  });
});


// Update payment
app.put('/api/payments/:id', (req, res) => {
  const { id } = req.params;
  const { customer_id, agent_id, bank_account_id, supplier_id, payment_date, amount, currency, type, notes, agent_rate, old_bank_account_id, old_amount } = req.body;
  
  db.serialize(() => {
    // First revert old bank balance if it existed
    if (old_bank_account_id && old_amount) {
      db.run(
        "UPDATE bank_accounts SET balance = balance - ? WHERE id = ?",
        [old_amount, old_bank_account_id],
        function(err) {
          if (err) {
            console.error('Error reverting old bank balance:', err);
          }
        }
      );
    }
    
    // Update the payment
    db.run(
      "UPDATE payments SET customer_id = ?, agent_id = ?, bank_account_id = ?, supplier_id = ?, payment_date = ?, amount = ?, currency = ?, type = ?, notes = ?, agent_rate = ? WHERE id = ?",
      [customer_id, agent_id, bank_account_id, supplier_id, payment_date, amount, currency, type, notes, agent_rate, id],
      function(err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        
        // If new payment is to bank account, update bank balance
        if (bank_account_id) {
          db.run(
            "UPDATE bank_accounts SET balance = balance + ? WHERE id = ?",
            [amount, bank_account_id],
            function(err) {
              if (err) {
                console.error('Error updating bank balance:', err);
              }
              
              res.json({ message: 'Payment updated and bank balance adjusted successfully' });
            }
          );
        } else {
          res.json({ message: 'Payment updated successfully' });
        }
      }
    );
  });
});

// Delete payment
app.delete('/api/payments/:id', (req, res) => {
  const { id } = req.params;
  
  // First get payment details to check if it was to a bank account
  db.get("SELECT bank_account_id, amount FROM payments WHERE id = ?", [id], (err, payment) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    
    db.serialize(() => {
      // If payment was to bank account, revert the balance
      if (payment && payment.bank_account_id) {
        db.run(
          "UPDATE bank_accounts SET balance = balance - ? WHERE id = ?",
          [payment.amount, payment.bank_account_id],
          function(err) {
            if (err) {
              console.error('Error reverting bank balance:', err);
            }
          }
        );
      }
      
      // Delete the payment
      db.run("DELETE FROM payments WHERE id = ?", [id], function(err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.json({ message: 'Payment deleted successfully' });
      });
    });
  });
});

// ==================== AGENT SETTLEMENT ROUTES ====================

// Create settlement
app.post('/api/agent-settlements', (req, res) => {
  const { agent_id, settlement_date, amount, currency, type, notes } = req.body;
  
  db.run(
    "INSERT INTO agent_settlements (agent_id, settlement_date, amount, currency, type, notes) VALUES (?, ?, ?, ?, ?, ?)",
    [agent_id, settlement_date, amount, currency, type, notes],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID,
        message: 'Settlement recorded successfully'
      });
    }
  );
});

// Update settlement
app.put('/api/agent-settlements/:id', (req, res) => {
  const { id } = req.params;
  const { settlement_date, amount, currency, type, notes } = req.body;
  
  db.run(
    "UPDATE agent_settlements SET settlement_date = ?, amount = ?, currency = ?, type = ?, notes = ? WHERE id = ?",
    [settlement_date, amount, currency, type, notes, id],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Settlement updated successfully' });
    }
  );
});

// Delete settlement
app.delete('/api/agent-settlements/:id', (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM agent_settlements WHERE id = ?", id, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'Settlement deleted successfully' });
  });
});

// ==================== TEST & HEALTH ROUTES ====================

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend server is working!',
    endpoints: {
      customers: '/api/customers',
      agents: '/api/agents',
      suppliers: '/api/suppliers',
      bankAccounts: '/api/bank-accounts',
      overview: '/api/overview',
      bills: '/api/bills',
      payments: '/api/payments',
      settlements: '/api/agent-settlements',
      supplierTransactions: '/api/supplier-transactions'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  const tables = ['customers', 'agents', 'suppliers', 'bank_accounts', 'supplier_transactions', 'bills', 'payments', 'agent_settlements'];
  let missingTables = [];
  
  const checkTable = (tableName, callback) => {
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
      if (err || !row) {
        missingTables.push(tableName);
      }
      callback();
    });
  };
  
  let completed = 0;
  tables.forEach(table => {
    checkTable(table, () => {
      completed++;
      if (completed === tables.length) {
        if (missingTables.length === 0) {
          res.json({ status: 'healthy', message: 'All tables exist' });
        } else {
          res.status(500).json({ status: 'unhealthy', message: `Missing tables: ${missingTables.join(', ')}` });
        }
      }
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  /api/test`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/customers`);
  console.log(`   GET  /api/agents`);
  console.log(`   GET  /api/suppliers`);
  console.log(`   GET  /api/bank-accounts`);
  console.log(`   GET  /api/overview`);
  console.log(`   POST /api/supplier-transactions`);
});