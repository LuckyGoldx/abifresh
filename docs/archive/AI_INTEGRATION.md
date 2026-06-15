# 🤖 AI INTEGRATION GUIDE
## Adding Python AI Chatbot to ABIFRESH PWA

---

## Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Python Integration Strategy](#python-integration-strategy)
3. [Tech Stack for AI Features](#tech-stack-for-ai-features)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Detailed Setup & Installation](#detailed-setup--installation)
6. [API Integration](#api-integration)
7. [Deployment](#deployment)
8. [Code Examples](#code-examples)
9. [FAQ & Troubleshooting](#faq--troubleshooting)

---

## Overview & Architecture

### Current Stack
```
Frontend (Next.js/React)
        ↓
Backend (Express.js/Node.js)
        ↓
Database (Supabase/PostgreSQL)
```

### Adding Python AI Services
```
Frontend (Next.js/React)
        ↓
Backend (Express.js/Node.js) ← Main orchestrator
        ↓                 ↓
    Supabase         Python AI Service
    PostgreSQL       (Flask/FastAPI)
```

### Why Python for AI?

✅ **Best AI/ML Libraries**
- TensorFlow, PyTorch, Scikit-learn
- LangChain, LlamaIndex for LLMs
- NLP libraries (NLTK, spaCy)

✅ **Large Language Models (LLMs)**
- OpenAI API integration
- Hugging Face models
- Local LLMs with Ollama

✅ **Easy to Integrate**
- REST API between Node.js and Python
- Minimal code changes needed
- Can run separately or in containers

✅ **Proven & Mature**
- 15+ years of ML ecosystem
- Thousands of pre-built models
- Excellent documentation

---

## Python Integration Strategy

### Architecture Pattern: Microservice

```
                    ┌─────────────────────┐
                    │   Frontend (React)  │
                    │   http://localhost:3000
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Backend (Express)   │
                    │ http://localhost:5000
                    │                     │
                    │ Routes:             │
                    │ /api/chat (proxy)   │
                    │ /api/products       │
                    │ /api/reports        │
                    └──────────┬──────────┘
                    ┌──────────┴──────────┐
                    │                     │
        ┌───────────▼────────────┐  ┌────▼────────────────┐
        │ Supabase (PostgreSQL)  │  │ Python AI Service   │
        │ - Sales data           │  │ http://localhost:8000
        │ - Inventory            │  │                      │
        │ - Users                │  │ Services:            │
        │ - Products             │  │ /chat (NLP)          │
        └────────────────────────┘  │ /product-search      │
                                    │ /generate-report     │
                                    │ /price-lookup        │
                                    └──────────────────────┘
```

### Communication Flow

**Example: User asks "What's the price of tomatoes?"**

```
1. Frontend (React)
   └─► User types question in chat box
   └─► Sends to http://localhost:5000/api/chat

2. Backend (Express)
   └─► Receives message
   └─► Extracts intent & entities
   └─► Forwards to Python AI service
   └─► Python processes request

3. Python AI Service
   └─► Understands question using NLP
   └─► Queries Supabase for tomato prices
   └─► Generates human-readable response
   └─► Sends back to Express

4. Backend (Express)
   └─► Formats response
   └─► Returns to React

5. Frontend (React)
   └─► Displays: "Tomatoes cost ₦1,500 per unit"
   └─► Saves chat to database
```

---

## 🔍 Real-World Query Examples with Actual Data

This section explains how the AI system handles real queries from your Supabase database.

### Example 1: "How many items are available?"

**User Query:** "How many items are available?"

**Execution Flow:**

```
1. Frontend sends chat message
   Input: "How many items are available?"

2. Backend (Express) receives
   POST /api/chat
   {
     "message": "How many items are available?"
   }

3. NLP Analysis (Python AI Service)
   Intent: INVENTORY_QUERY
   Entity: None (asking for total)
   
4. Python queries Supabase:
   SELECT item_id, name, active_store_quantity 
   FROM inventory_active_store 
   WHERE active_store_quantity > 0

5. Database returns:
   [
     { item_id: '1', name: 'Tomatoes', active_store_quantity: 50 },
     { item_id: '2', name: 'Carrots', active_store_quantity: 30 },
     { item_id: '3', name: 'Rice', active_store_quantity: 25 }
   ]

6. Python generates response:
   "We currently have 3 different products available in the active store:
    - Tomatoes: 50 units
    - Carrots: 30 units
    - Rice: 25 units
    Total: 105 units"

7. Frontend displays response in chat
```

**Backend Code:**
```typescript
router.post('/chat', authMiddleware, async (req, res) => {
  const { message } = req.body;
  
  // Call Python AI service
  const aiResponse = await axios.post('http://localhost:8000/api/chat', {
    message,
    user_id: req.user.id,
  });
  
  res.json({ response: aiResponse.data.response });
});
```

**Python Service Code:**
```python
@router.post("/chat")
async def chat(request: ChatRequest):
    intent = analyze_intent(request.message)
    
    if "available" in request.message.lower():
        # Query inventory from Supabase
        response = supabase.table('inventory_active_store')\
            .select('*')\
            .execute()
        
        items = response.data
        total_units = sum(item['active_store_quantity'] for item in items)
        
        return {
            "response": f"We have {len(items)} products with {total_units} total units available"
        }
```

---

### Example 2: "What are today's sales?"

**User Query:** "What are today's sales?"

**Execution Flow:**

```
1. Frontend sends chat message
   Input: "What are today's sales?"

2. Backend receives
   POST /api/chat
   { "message": "What are today's sales?" }

3. NLP Analysis (Python AI Service)
   Intent: SALES_QUERY
   Time Period: TODAY
   
4. Python queries Supabase:
   SELECT 
     SUM(total_amount) as total_sales,
     COUNT(*) as transaction_count,
     SUM(quantity) as items_sold
   FROM sales
   WHERE DATE(created_at) = CURRENT_DATE
   AND salesperson_id = '${user_id}'

5. Database returns:
   {
     total_sales: 45000,
     transaction_count: 12,
     items_sold: 25
   }

6. Python generates response:
   "Today's Sales Summary:
    📊 Total Sales: ₦45,000
    📦 Items Sold: 25 units
    🔄 Transactions: 12
    
    Top selling item: Tomatoes (10 units)"

7. Frontend displays with formatting
```

**Python Service Code:**
```python
async def handle_sales_query(user_id: str, time_period: str) -> str:
    from datetime import datetime, timedelta
    
    if time_period == "today":
        start_date = datetime.now().date()
        end_date = datetime.now().date()
    elif time_period == "week":
        today = datetime.now()
        start_date = today - timedelta(days=today.weekday())
        end_date = today
    elif time_period == "month":
        today = datetime.now()
        start_date = today.replace(day=1)
        end_date = today
    
    # Query Supabase
    response = supabase.rpc(
        'get_sales_summary',
        {
            'p_user_id': user_id,
            'p_start_date': start_date,
            'p_end_date': end_date
        }
    ).execute()
    
    data = response.data[0]
    
    summary = f"""
    Sales Summary for {time_period.upper()}:
    💰 Total Sales: ₦{data['total_sales']:,}
    📦 Items Sold: {data['items_sold']} units
    🔄 Transactions: {data['transaction_count']}
    📈 Average Transaction: ₦{data['total_sales'] // data['transaction_count']:,}
    """
    
    return summary
```

---

### Example 3: "Total sales for this week"

**User Query:** "Total sales for this week"

**Execution Flow:**

```
1. Frontend sends
   Input: "Total sales for this week"

2. Backend receives
   POST /api/chat
   { "message": "Total sales for this week" }

3. NLP Analysis
   Intent: SALES_QUERY
   Time Period: WEEK
   
4. Python calculates week dates
   Monday (7 days ago) to Today
   
5. Python queries Supabase:
   SELECT 
     SUM(total_amount) as total_sales,
     COUNT(*) as transactions,
     SUM(quantity) as items_sold,
     DATE(created_at) as sale_date
   FROM sales
   WHERE created_at >= NOW() - INTERVAL '7 days'
   AND created_at < NOW() + INTERVAL '1 day'
   GROUP BY DATE(created_at)
   ORDER BY sale_date DESC

6. Database returns daily breakdown:
   [
     { sale_date: '2026-01-24', total_sales: 45000, transactions: 12, items_sold: 25 },
     { sale_date: '2026-01-23', total_sales: 38000, transactions: 10, items_sold: 22 },
     { sale_date: '2026-01-22', total_sales: 52000, transactions: 14, items_sold: 28 },
     ...
   ]

7. Python aggregates and generates response:
   "Weekly Sales Report (Jan 18 - Jan 24, 2026)
    
    📊 Total Weekly Sales: ₦287,000
    📦 Total Items: 165 units
    🔄 Total Transactions: 82
    
    Daily Breakdown:
    - Friday (24th): ₦45,000 (12 transactions, 25 units)
    - Thursday (23rd): ₦38,000 (10 transactions, 22 units)
    - Wednesday (22nd): ₦52,000 (14 transactions, 28 units)
    
    Best Day: Wednesday with ₦52,000
    Best Item: Tomatoes (45 units sold)"

8. Frontend displays with nice formatting
```

**SQL Query (Supabase Function):**
```sql
CREATE OR REPLACE FUNCTION get_sales_by_period(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  sale_date DATE,
  total_sales NUMERIC,
  transaction_count BIGINT,
  items_sold BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(s.created_at) as sale_date,
    SUM(s.total_amount)::NUMERIC as total_sales,
    COUNT(*)::BIGINT as transaction_count,
    SUM(s.quantity)::BIGINT as items_sold
  FROM sales s
  WHERE s.sales_person_id = p_user_id
    AND DATE(s.created_at) >= p_start_date
    AND DATE(s.created_at) <= p_end_date
  GROUP BY DATE(s.created_at)
  ORDER BY sale_date DESC;
END;
$$ LANGUAGE plpgsql;
```

---

### Example 4: "Show unavailable items"

**User Query:** "Show unavailable items"

**Execution Flow:**

```
1. Frontend sends
   Input: "Show unavailable items"

2. Backend receives
   POST /api/chat
   { "message": "Show unavailable items" }

3. NLP Analysis
   Intent: INVENTORY_QUERY
   Type: UNAVAILABLE_ITEMS
   
4. Python queries Supabase:
   SELECT 
     i.name,
     i.base_price,
     COALESCE(mas.quantity, 0) as main_store_qty,
     COALESCE(aas.quantity, 0) as active_store_qty
   FROM items i
   LEFT JOIN inventory_main_store mas ON i.id = mas.item_id
   LEFT JOIN inventory_active_store aas ON i.id = aas.item_id
   WHERE COALESCE(aas.quantity, 0) = 0

5. Database returns:
   [
     { name: 'Beef', base_price: 5000, main_store_qty: 100, active_store_qty: 0 },
     { name: 'Fish', base_price: 3000, main_store_qty: 50, active_store_qty: 0 },
     { name: 'Chicken', base_price: 2500, main_store_qty: 30, active_store_qty: 0 }
   ]

6. Python generates response:
   "Unavailable Items in Active Store:
    
    ❌ Beef - ₦5,000/unit
       Main Store: 100 units available
       
    ❌ Fish - ₦3,000/unit
       Main Store: 50 units available
       
    ❌ Chicken - ₦2,500/unit
       Main Store: 30 units available
    
    💡 Tip: Move these items from main store to active store to enable sales"

7. Frontend displays unavailable items list
```

---

### Example 5: "Monthly sales report"

**User Query:** "Give me monthly sales report"

**Execution Flow:**

```
1. Frontend sends
   Input: "Give me monthly sales report"

2. Backend receives and NLP extracts
   Intent: SALES_QUERY
   Time Period: MONTH
   Report Type: DETAILED

3. Python queries multiple data points:

   a) Total sales:
      SELECT SUM(total_amount) FROM sales
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
   
   b) Sales by category:
      SELECT i.category, SUM(s.total_amount) as total
      FROM sales s
      JOIN items i ON s.item_id = i.id
      GROUP BY i.category
   
   c) Sales by payment method:
      SELECT payment_method, COUNT(*) as count, SUM(total_amount)
      FROM sales
      GROUP BY payment_method
   
   d) Top selling items:
      SELECT i.name, SUM(s.quantity) as units_sold
      FROM sales s
      JOIN items i ON s.item_id = i.id
      GROUP BY i.name
      ORDER BY units_sold DESC
      LIMIT 5

4. Database returns comprehensive data
   
5. Python generates detailed report:
   "📊 JANUARY 2026 SALES REPORT
    
    💰 FINANCIAL SUMMARY
    Total Sales: ₦1,245,000
    Transactions: 156
    Average Sale: ₦7,980
    
    📦 INVENTORY MOVEMENT
    Total Items Sold: 845 units
    Categories:
    - Vegetables: ₦450,000 (380 units)
    - Grains: ₦550,000 (350 units)
    - Protein: ₦245,000 (115 units)
    
    💳 PAYMENT METHODS
    - Cash: ₦750,000 (60%)
    - POS: ₦350,000 (28%)
    - Transfer: ₦145,000 (12%)
    
    🏆 TOP 5 SELLING ITEMS
    1. Tomatoes: 250 units (₦375,000)
    2. Rice: 180 units (₦360,000)
    3. Carrots: 150 units (₦112,500)
    4. Beans: 140 units (₦175,000)
    5. Onions: 125 units (₦87,500)
    
    📈 DAILY AVERAGE: ₦40,161/day
    
    💡 INSIGHTS:
    - Best selling day: Friday (avg ₦56,000)
    - Most used payment: Cash (60%)
    - Most profitable category: Grains (44%)"

6. Frontend displays formatted report with charts
```

---

### Example 6: "How many Tomatoes are available?"

**User Query:** "How many Tomatoes are available?"

**Execution Flow:**

```
1. Frontend sends
   Input: "How many Tomatoes are available?"

2. NLP extracts
   Intent: PRODUCT_QUERY
   Product: Tomatoes
   Type: SPECIFIC
   
3. Python queries Supabase:
   SELECT 
     i.name,
     i.base_price,
     aas.quantity as available,
     mas.quantity as in_main_store
   FROM items i
   LEFT JOIN inventory_active_store aas ON i.id = aas.item_id
   LEFT JOIN inventory_main_store mas ON i.id = mas.item_id
   WHERE LOWER(i.name) = LOWER('Tomatoes')

4. Database returns:
   {
     name: 'Tomatoes',
     base_price: 1500,
     available: 50,
     in_main_store: 200
   }

5. Python generates response:
   "🍅 Tomatoes
    
    Available for Sale: 50 units
    Price: ₦1,500/unit
    
    In Main Store: 200 units
    💡 Can replenish active store from main storage"

6. Frontend displays availability info
```

---

## Summary of Real Data Queries

The AI system handles these Supabase queries transparently:

| Query Type | Database Table | Response Example |
|-----------|-----------------|------------------|
| **Available Items** | inventory_active_store | "50 units of Tomatoes available" |
| **Unavailable Items** | inventory_active_store | "Beef not available, 100 units in main store" |
| **Today's Sales** | sales (filter by date) | "₦45,000 in 12 transactions today" |
| **Weekly Sales** | sales (filter by date range) | "₦287,000 total this week" |
| **Monthly Sales** | sales + items (aggregated) | "Complete monthly breakdown with charts" |
| **Specific Product** | items + inventory tables | "Tomatoes: 50 available, ₦1,500 each" |
| **Sales by Category** | sales + items (grouped) | "Vegetables: ₦450,000 (43% of sales)" |
| **Top Items** | sales + items (ranked) | "Top: Tomatoes (250 units sold)" |
| **Staff Performance** | sales (grouped by user) | "John sold ₦85,000 this week" |
| **Payment Methods** | sales (grouped by method) | "Cash: 60%, POS: 28%, Transfer: 12%" |

---

### Python Frameworks

| Framework | Use Case | Complexity |
|-----------|----------|-----------|
| **Flask** | Simple API, lightweight | Easy |
| **FastAPI** | Modern API, async support | Medium |
| **Django** | Full-stack (overkill for AI) | Hard |
| **Streamlit** | Quick dashboards (supplementary) | Easy |

**Recommendation: FastAPI** - Modern, async, auto-docs, great for microservices

### Python AI Libraries

| Library | Purpose | Version |
|---------|---------|---------|
| **openai** | ChatGPT integration | 1.3.0+ |
| **python-dotenv** | Environment variables | Latest |
| **sqlalchemy** | Database ORM | 2.0+ |
| **psycopg2** | PostgreSQL driver | Latest |
| **pydantic** | Data validation | 2.0+ |
| **langchain** | LLM chains (optional) | 0.1.0+ |
| **huggingface-hub** | Hugging Face models (optional) | Latest |
| **numpy** | Numerical computing | Latest |
| **pandas** | Data analysis | Latest |

### AI Model Options

#### Option 1: Cloud-Based (Easiest)
```python
# Use OpenAI API (ChatGPT)
from openai import OpenAI

client = OpenAI(api_key="sk-...")
response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "What products are available?"}]
)
```

**Pros:** No setup, most accurate, handles all NLP
**Cons:** Monthly costs, needs API key

#### Option 2: Local Models (Free)
```python
# Use Ollama + Llama2
from ollama import generate

response = generate(
    model='llama2',
    prompt='What products are available?'
)
```

**Pros:** Free, runs locally, no API key
**Cons:** Slower, needs 8GB+ RAM, less accurate

#### Option 3: Hybrid (Best)
```python
# Use Hugging Face models for free, robust
from transformers import pipeline

classifier = pipeline("zero-shot-classification")
result = classifier(
    "What products are available?",
    ["price-lookup", "product-search", "report-generation"]
)
```

**Pros:** Fast, free, good accuracy
**Cons:** Need GPU for speed

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up Python FastAPI project
- [ ] Create chatbot endpoint
- [ ] Basic NLP intent recognition
- [ ] Connect to Node.js backend

### Phase 2: Product Features (Week 2)
- [ ] Price lookup functionality
- [ ] Product availability check
- [ ] Inventory search by category
- [ ] Store items by location

### Phase 3: Advanced Features (Week 3)
- [ ] Report generation (daily/weekly)
- [ ] Sales analytics chatbot
- [ ] Predictive inventory
- [ ] Performance recommendations

### Phase 4: Polish & Deploy (Week 4)
- [ ] Error handling & logging
- [ ] Rate limiting & security
- [ ] Testing & optimization
- [ ] Production deployment

---

## Detailed Setup & Installation

### Step 1: Create Python AI Service Directory

```powershell
# From project root
cd c:\Users\LuckyGold\Desktop\AKV

# Create new folder
mkdir ai-service
cd ai-service
```

### Step 2: Create Virtual Environment

```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1

# On Windows CMD:
venv\Scripts\activate.bat

# You should see (venv) in terminal
(venv) PS C:\Users\LuckyGold\Desktop\AKV\ai-service>
```

### Step 3: Create requirements.txt

Create file `ai-service/requirements.txt`:

```
fastapi==0.104.1
uvicorn==0.24.0
python-dotenv==1.0.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
openai==1.3.9
httpx==0.25.2
```

### Step 4: Install Dependencies

```powershell
# Make sure venv is activated (should see (venv) prefix)
pip install -r requirements.txt
```

**Expected output:**
```
Successfully installed fastapi-0.104.1 uvicorn-0.24.0 ...
```

### Step 5: Create Python Project Structure

```
ai-service/
├── venv/                    # Virtual environment (ignore)
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables
├── main.py                  # FastAPI app entry point
├── config.py                # Configuration
├── models.py                # Data models
├── services/
│   ├── __init__.py
│   ├── chat_service.py      # NLP & chatbot logic
│   ├── product_service.py   # Product lookups
│   └── report_service.py    # Report generation
├── routes/
│   ├── __init__.py
│   ├── chat.py              # Chat endpoints
│   ├── products.py          # Product endpoints
│   └── reports.py           # Report endpoints
├── utils/
│   ├── __init__.py
│   └── nlp_utils.py         # NLP helper functions
└── Dockerfile               # For container deployment
```

### Step 6: Create Configuration File

Create `ai-service/config.py`:

```python
from dotenv import load_dotenv
import os

load_dotenv()

class Config:
    # API
    API_PORT = int(os.getenv("AI_API_PORT", 8000))
    API_HOST = os.getenv("AI_API_HOST", "localhost")
    
    # Backend Node.js Service
    NODE_API_URL = os.getenv("NODE_API_URL", "http://localhost:5000")
    
    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    # OpenAI (Optional)
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    # LLM Model
    LLM_MODEL = os.getenv("LLM_MODEL", "ollama")  # "openai" or "ollama"
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama2")
    
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", SUPABASE_URL)

config = Config()
```

### Step 7: Create .env File

Create `ai-service/.env`:

```env
# FastAPI
AI_API_PORT=8000
AI_API_HOST=localhost

# Node.js Backend
NODE_API_URL=http://localhost:5000

# Supabase (same as backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (if using ChatGPT)
OPENAI_API_KEY=sk-your-key-here

# LLM Model Selection
LLM_MODEL=ollama  # Options: "openai" or "ollama"
OLLAMA_MODEL=llama2  # For local LLM
```

---

## API Integration

### Architecture: Python ↔ Node.js Communication

**Backend (Express.js) receives request from Frontend:**
```javascript
// backend/src/routes/chat.routes.ts
router.post('/api/chat', authMiddleware, async (req, res) => {
  const { message, user_id } = req.body;
  
  // Call Python AI service
  const aiResponse = await axios.post('http://localhost:8000/chat', {
    message,
    user_id,
    context: { /* conversation history */ }
  });
  
  // Return to frontend
  res.json({ response: aiResponse.data.response });
});
```

**Python AI Service processes and responds:**
```python
# ai-service/routes/chat.py
@router.post("/chat")
async def chat(request: ChatRequest):
    # Understand user intent (NLP)
    intent = analyze_intent(request.message)
    
    # Route to appropriate handler
    if intent == "price-lookup":
        result = await product_service.lookup_price(request.message)
    elif intent == "product-search":
        result = await product_service.search_products(request.message)
    elif intent == "report-generation":
        result = await report_service.generate_report(request.message)
    else:
        result = await chat_service.general_chat(request.message)
    
    return {"response": result}
```

---

## Complete Code Examples

### Example 1: FastAPI Main App

Create `ai-service/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Import routes
from routes.chat import router as chat_router
from routes.products import router as products_router
from routes.reports import router as reports_router

load_dotenv()

app = FastAPI(
    title="ABIFRESH AI Service",
    description="AI-powered chatbot for sales management",
    version="1.0.0"
)

# CORS middleware (allow requests from Node.js backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",  # Backend
        "http://localhost:3000",  # Frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(products_router, prefix="/api", tags=["products"])
app.include_router(reports_router, prefix="/api", tags=["reports"])

# Health check endpoint
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "AI Service"}

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "ABIFRESH AI Service",
        "endpoints": [
            "POST /api/chat",
            "GET /api/products/search",
            "GET /api/products/price",
            "POST /api/reports/daily",
        ],
        "docs": "http://localhost:8000/docs"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_API_PORT", 8000))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=True
    )
```

### Example 2: Chat Service (NLP Intent Recognition)

Create `ai-service/services/chat_service.py`:

```python
from config import config
from utils.nlp_utils import analyze_sentiment, extract_entities
import httpx
import json

class ChatService:
    def __init__(self):
        self.backend_url = config.NODE_API_URL
        self.conversation_history = {}
    
    async def process_message(self, user_id: str, message: str) -> str:
        """
        Process user message and generate response.
        
        Supports:
        - What's the price of [product]?
        - List all [category] items
        - Generate today's report
        - How many [items] are available?
        """
        
        # Determine user intent
        intent = self._determine_intent(message)
        
        # Route to handler
        if "price" in intent:
            response = await self._handle_price_query(message)
        elif "inventory" in intent:
            response = await self._handle_inventory_query(message)
        elif "report" in intent:
            response = await self._handle_report_query(message)
        else:
            response = await self._handle_general_chat(message)
        
        return response
    
    def _determine_intent(self, message: str) -> str:
        """Determine user intent using simple keyword matching."""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ["price", "cost", "how much"]):
            return "price_query"
        elif any(word in message_lower for word in ["available", "stock", "inventory", "how many"]):
            return "inventory_query"
        elif any(word in message_lower for word in ["report", "today", "summary", "sales"]):
            return "report_query"
        else:
            return "general_chat"
    
    async def _handle_price_query(self, message: str) -> str:
        """Handle price lookup queries."""
        try:
            # Extract product name using simple NLP
            entities = extract_entities(message)
            product_name = entities.get("product", "")
            
            if not product_name:
                return "I couldn't understand which product. Please ask like: 'What's the price of tomatoes?'"
            
            # Call backend to get product info
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.backend_url}/api/products/search",
                    params={"name": product_name},
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    products = response.json()
                    if products:
                        product = products[0]
                        return f"{product['name']} costs ₦{product['price']} per unit. Available: {product['quantity']} units."
                    else:
                        return f"Sorry, I couldn't find '{product_name}' in our inventory."
            
        except Exception as e:
            return f"Error looking up price: {str(e)}"
    
    async def _handle_inventory_query(self, message: str) -> str:
        """Handle inventory/availability queries."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.backend_url}/api/inventory/active-store",
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    items = response.json()
                    total_items = len(items)
                    return f"We have {total_items} different products in the active store with {sum(item['quantity'] for item in items)} total units."
            
        except Exception as e:
            return f"Error checking inventory: {str(e)}"
    
    async def _handle_report_query(self, message: str) -> str:
        """Handle report generation queries."""
        return "I can generate sales reports! For detailed reports, please use the Admin Dashboard."
    
    async def _handle_general_chat(self, message: str) -> str:
        """Handle general conversation."""
        responses = {
            "hello": "Hello! I'm your ABIFRESH sales assistant. I can help you with:\n• Price lookups\n• Inventory checks\n• Sales reports\n• Product searches",
            "hi": "Hi there! How can I help?",
            "thanks": "You're welcome!",
            "help": "I can help with:\n1. Price lookup - 'What's the price of tomatoes?'\n2. Inventory - 'How many items are available?'\n3. Reports - 'Generate today's report'",
        }
        
        for key, response in responses.items():
            if key in message.lower():
                return response
        
        return "I'm not sure about that. You can ask me about prices, inventory, or sales reports!"

chat_service = ChatService()
```

### Example 3: Chat Routes

Create `ai-service/routes/chat.py`:

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.chat_service import chat_service

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    user_id: str
    conversation_id: str = None

class ChatResponse(BaseModel):
    response: str
    intent: str = None

@router.post("/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Main chatbot endpoint.
    
    Supports:
    - Price lookups: "What's the price of tomatoes?"
    - Inventory: "How many items are available?"
    - Reports: "Generate today's report"
    - General chat
    """
    try:
        response = await chat_service.process_message(
            request.user_id,
            request.message
        )
        
        return ChatResponse(
            response=response,
            intent="processed"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/history/{user_id}")
async def get_chat_history(user_id: str):
    """Get conversation history for a user."""
    # Implementation to fetch from database
    return {"user_id": user_id, "messages": []}

@router.post("/chat/clear/{user_id}")
async def clear_chat_history(user_id: str):
    """Clear chat history for a user."""
    return {"status": "cleared"}
```

### Example 4: Product Routes

Create `ai-service/routes/products.py`:

```python
from fastapi import APIRouter, Query
import httpx
from config import config

router = APIRouter()

@router.get("/products/search")
async def search_products(name: str = Query(...)):
    """Search for products by name."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{config.NODE_API_URL}/api/inventory/active-store",
                timeout=5.0
            )
            
            if response.status_code == 200:
                items = response.json()
                # Filter by name
                filtered = [
                    item for item in items
                    if name.lower() in item.get('name', '').lower()
                ]
                return filtered
            
    except Exception as e:
        return {"error": str(e)}

@router.get("/products/price")
async def get_product_price(name: str = Query(...)):
    """Get price for a specific product."""
    try:
        products = await search_products(name)
        if products:
            return products[0]
        return {"error": f"Product '{name}' not found"}
    except Exception as e:
        return {"error": str(e)}

@router.get("/products/category/{category}")
async def get_products_by_category(category: str):
    """Get all products in a category."""
    return {"category": category, "products": []}
```

### Example 5: NLP Utilities

Create `ai-service/utils/nlp_utils.py`:

```python
import re

def analyze_intent(message: str) -> str:
    """Analyze user intent from message."""
    message_lower = message.lower()
    
    keywords = {
        "price": ["price", "cost", "how much", "expensive"],
        "inventory": ["available", "stock", "how many", "quantity"],
        "product": ["product", "item", "goods", "what do you have"],
        "report": ["report", "summary", "analytics", "today"],
        "greeting": ["hello", "hi", "hey", "greetings"],
    }
    
    for intent, words in keywords.items():
        if any(word in message_lower for word in words):
            return intent
    
    return "unknown"

def extract_entities(message: str) -> dict:
    """Extract entities (product name, quantity, etc) from message."""
    entities = {}
    
    # Extract product name (simple approach)
    # Better: use spaCy NER model
    
    # Pattern: "price of [PRODUCT]" or "[PRODUCT] price"
    product_pattern = r"(?:price of|cost of|(?:what\'s the price of))\s+(.+?)(?:\?|$)"
    match = re.search(product_pattern, message, re.IGNORECASE)
    if match:
        entities["product"] = match.group(1).strip()
    
    # Extract numbers
    numbers = re.findall(r'\d+', message)
    if numbers:
        entities["quantity"] = int(numbers[0])
    
    return entities

def analyze_sentiment(message: str) -> str:
    """Analyze sentiment of message (positive, negative, neutral)."""
    positive_words = ["good", "great", "excellent", "thanks", "happy", "love"]
    negative_words = ["bad", "terrible", "awful", "hate", "angry", "no"]
    
    message_lower = message.lower()
    
    pos_count = sum(1 for word in positive_words if word in message_lower)
    neg_count = sum(1 for word in negative_words if word in message_lower)
    
    if pos_count > neg_count:
        return "positive"
    elif neg_count > pos_count:
        return "negative"
    else:
        return "neutral"
```

---

## Backend Integration (Express.js)

### Add Chat Route to Backend

Update `backend/src/routes/chat.routes.ts`:

```typescript
import express, { Router, Request, Response } from 'express';
import axios from 'axios';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

interface ChatRequest {
  message: string;
  conversation_id?: string;
}

// Send message to AI service
router.post('/chat', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { message } = req.body as ChatRequest;
    const userId = (req as any).user.id;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Call Python AI service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/chat`, {
      message,
      user_id: userId,
    });
    
    // Save chat to database (optional)
    // await saveChatMessage(userId, message, aiResponse.data.response);
    
    return res.json({
      response: aiResponse.data.response,
      timestamp: new Date(),
    });
    
  } catch (error) {
    console.error('AI Service error:', error);
    return res.status(500).json({
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Health check for AI service
router.get('/health', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`);
    return res.json({ ai_service: response.data });
  } catch (error) {
    return res.status(500).json({ ai_service: 'offline' });
  }
});

export default router;
```

Add to `backend/src/index.ts`:

```typescript
import chatRoutes from './routes/chat.routes';

// ... existing code ...

app.use('/api', chatRoutes);
```

Update `backend/.env`:

```env
# ... existing env vars ...

# AI Service
AI_SERVICE_URL=http://localhost:8000
```

---

## Frontend Chat Component

Create `frontend/components/ChatBot.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Send, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call backend API
      const response = await apiClient.post('/api/chat', {
        message: input,
      });

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-pink-500 text-white p-4 rounded-full shadow-lg hover:bg-pink-600 transition"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-xl flex flex-col h-96">
          {/* Header */}
          <div className="bg-pink-500 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-bold">ABIFRESH AI Assistant</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xl hover:bg-pink-600 p-1 rounded"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-4">
                <p>👋 Hi! Ask me about:</p>
                <p className="text-sm mt-2">• Product prices</p>
                <p className="text-sm">• Available inventory</p>
                <p className="text-sm">• Daily reports</p>
              </div>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="border-t p-4 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 border rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-white"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-pink-500 text-white p-2 rounded-lg hover:bg-pink-600 disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
```

Add to `frontend/app/layout.tsx`:

```typescript
import ChatBot from '@/components/ChatBot';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <ChatBot />
      </body>
    </html>
  );
}
```

---

## Step-by-Step Implementation Guide

### Phase 1: Basic Setup (Day 1)

```powershell
# 1. Create AI service directory
mkdir ai-service
cd ai-service

# 2. Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Create requirements.txt
# (See "Create requirements.txt" section above)

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create project files (main.py, config.py, etc)
# (See code examples above)

# 6. Start Python service
python main.py
# Should see: Uvicorn running on http://localhost:8000
```

### Phase 2: Connect to Backend (Day 2)

```typescript
// In Express backend, add chat route (see code example above)
// Update index.ts to include chat routes
// Update .env with AI_SERVICE_URL=http://localhost:8000

// Test with:
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "What products are available?"
  }'
```

### Phase 3: Add to Frontend (Day 3)

```bash
# No new installations needed
# Just add ChatBot.tsx component to frontend
# Import in layout.tsx
# Test by running frontend and clicking chat button
```

---

## Testing the AI Integration

### Test 1: Basic Chat
```bash
# Start in browser
http://localhost:3000

# Click chat button (bottom right)
# Type: "Hello"
# Should respond with greeting
```

### Test 2: Price Lookup
```bash
# In chat: "What's the price of tomatoes?"
# Should respond: "Tomatoes cost ₦X per unit"

# Note: Requires tomatoes to exist in database
```

### Test 3: Inventory Check
```bash
# In chat: "How many items are available?"
# Should respond: "We have X items with Y units total"
```

### Test 4: API Call
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What products do you have?",
    "user_id": "test-user"
  }'

# Should return: {"response": "..."}
```

---

## Deployment

### Deploy Python AI Service

#### Option 1: Heroku (Free Tier)
```bash
# 1. Create Procfile in ai-service/
echo "web: uvicorn main:app --host 0.0.0.0 --port \$PORT" > Procfile

# 2. Deploy to Heroku
heroku create abifresh-ai-service
git push heroku main

# 3. Update backend .env
AI_SERVICE_URL=https://abifresh-ai-service.herokuapp.com
```

#### Option 2: Railway (Recommended, ₦0 startup)
```bash
# 1. Connect GitHub to Railway
# 2. Create new project
# 3. Select ai-service folder
# 4. Railway auto-deploys on push
# 5. Copy public URL
# 6. Update backend .env
```

#### Option 3: Docker (Local/VPS)
```bash
# Create Dockerfile in ai-service/
# (See docker example below)

docker build -t abifresh-ai .
docker run -p 8000:8000 --env-file .env abifresh-ai
```

### Dockerfile for AI Service

Create `ai-service/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Advanced Features to Add Later

### 1. Sentiment Analysis
```python
# Detect if user is happy/angry
from textblob import TextBlob

sentiment = TextBlob(message).sentiment.polarity
# -1 (negative) to 1 (positive)
```

### 2. Multi-Language Support
```python
from google.cloud import translate_v2

translator = translate_v2.Client()
translated = translator.translate_text("Hello", target_language='fr')
# Speak in French, Igbo, Yoruba, etc.
```

### 3. Voice Chat
```python
# Convert speech to text
from google.cloud import speech_v1

# Users speak questions, AI responds with voice
```

### 4. Predictive Analytics
```python
# Predict inventory needs
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor

# Based on historical sales, predict stock needed
```

### 5. Natural Language Understanding (Advanced)
```python
# Use spaCy for better NLP
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("User wants to buy 5 tomatoes")
# Extract: product="tomatoes", quantity=5, action="buy"
```

---

## FAQ & Troubleshooting

### Q: Do I need to learn Python to use this?
**A:** No! The code examples are ready-to-use. Just follow the setup steps.

### Q: Can I use ChatGPT instead of Ollama?
**A:** Yes! Just change `LLM_MODEL=openai` in `.env` and add `OPENAI_API_KEY`.

### Q: Will Python be slow?
**A:** No! FastAPI is one of the fastest Python frameworks. ~100ms response time.

### Q: Can I run Python and Node.js together?
**A:** Yes! They communicate via REST API. Run both on different ports (5000 and 8000).

### Q: What if port 8000 is already in use?
**A:** Change in `ai-service/.env`:
```
AI_API_PORT=8001
```

### Q: How do I add more AI features?
**A:** Add new service class in `services/` and new route in `routes/`.

### Q: Can I deploy AI service to the same place as backend?
**A:** Yes! Use a single Koyeb project with multiple services (Docker Compose).

### Q: What if I want to use a different LLM?
**A:** Options:
- OpenAI (ChatGPT) - Paid but best
- Ollama (Local Llama2) - Free, runs locally
- Hugging Face - Free, requires GPU
- Google Vertex AI - Paid
- Claude API - Paid

### Error: "ConnectionRefusedError: [Errno 111] Connection refused"
**Solution:** Make sure Node.js backend is running:
```powershell
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd ai-service
python main.py
```

### Error: "ModuleNotFoundError: No module named 'fastapi'"
**Solution:** Install dependencies:
```powershell
cd ai-service
pip install -r requirements.txt
```

### Error: "CORS error" when calling from Express to Python
**Solution:** Check CORS configuration in `main.py`:
```python
allow_origins=[
    "http://localhost:5000",  # Backend
    "http://localhost:3000",  # Frontend
]
```

---

## Stack Comparison: Python AI vs Alternatives

| Feature | Python | Node.js ML | Go | Rust |
|---------|--------|-----------|----|----|
| **AI Libraries** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐ |
| **Ease of Setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Performance** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Community** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Integration** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

**Winner:** Python for AI + Node.js for backend = Best of both worlds! ✨

---

## Summary

### What You Can Do Now:
✅ Run full system on localhost (3 ports)
✅ Add Python AI services without changing Node.js/React
✅ Create chatbot for price/inventory/reports
✅ Deploy Python separately from backend
✅ Scale AI independently as needs grow

### Architecture Benefits:
✅ Separation of concerns (AI ≠ Business Logic)
✅ Flexibility to swap AI models
✅ Scalability (AI can handle more requests)
✅ Technology agnostic (add other Python tools later)
✅ Team specialization (Python devs ≠ Node.js devs)

### Next Steps:
1. Follow setup instructions (Step 1-7)
2. Test basic Python FastAPI app
3. Add chat route to Express backend
4. Add ChatBot component to React frontend
5. Test end-to-end chatbot conversation

---

**Ready to add AI to your PWA? Start with Step 1! 🚀**
