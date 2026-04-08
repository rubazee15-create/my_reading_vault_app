### 📚 Reading Vault Application
A robust backend API built with FastAPI to manage and track your personal library. 

### 📖 Overview
The Reading Vault is a digital tracker designed to help users manage their reading journey. It implements full CRUD operations to handle books, authors and reading statuses.

### 🛠️ Tech Stack
* **Framework:** FastAPI
* **Database:** PostgreSQL
* **ORM:** SQLAlchemy
* **Server:** Uvicorn
* **Language:** Python
* **Validation:** Pydantic
* **Frontend:** React (Vite)

### 📂 Project Structure
Following the modular approach:

```text
├── backend/
│   ├── main.py           # App entry point
│   ├── models.py         # SQLAlchemy database models
│   ├── database.py       # Database connection & SessionLocal
│   ├── migrate.py        # Script to migrate JSON data to Postgres
│   ├── books.json        # (Legacy) Source data for migration
│   ├── alembic.ini.example  # Alembic config template
│   ├── .env.example      # Environment variables template
│   └── requirements.txt  # Project dependencies
└── frontend/
    ├── src/              # React source files
    └── package.json      # Frontend dependencies
```

### ⚙️ Installation & Setup

1. **Clone & Navigate the Repository:**
   ```bash
   git clone https://github.com/rubazee15-create/my_reading_vault_app.git
   cd my_reading_vault_app

2. **Create Virtual Environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt

4. **Start the FastAPI Server:**
   ```bash
   uvicorn main:app --reload

5. **Access the API:**
* Base API: http://127.0.0.1:8000
* Interactive Swagger UI: http://127.0.0.1:8000/docs

### 🖥️ Frontend Setup

1. **Navigate to the Frontend Directory:**
```
cd frontend
```

2. **Install Frontend Dependencies:**
```
npm install
```

3. **Start the React Development Server:**
```
npm run dev
```

4. **Access the Frontend:**
* Frontend (Vite Dev Server): __http://localhost:5173__

> Make sure the backend server is running before starting the frontend.


### 📈 Roadmap
#### **🟢 Phase 1: Foundation & Persistence (Completed)**
* [x] Basic CRUD operations for Books.
* [x] Data validation with Pydantic.
* [x] Database Migration: Transitioned from books.json to PostgreSQL.
* [x] ORM Integration: Implemented SQLAlchemy for database interactions.

#### **🔵 Phase 2: Frontend Interface (Completed)**

* [x] React UI with book cards and progress tracking
* [x] Bookshelf visualization
* [x] Reading goals, heatmap, challenges

#### **🟡 Phase 3: Security & Relationships (Completed)** 
* [x] Database Migrations: Integrate Alembic to handle schema changes without losing data.
* [x] Multi-Tenancy: Add Users table and associate books with specific user IDs.
* [x] User Authentication: Implement OAuth2 with JWT (JSON Web Tokens) and refresh token strategy.
* [x] Complex Relationships: Add an Authors table with a One-to-Many relationship to Books.

#### **🟠 Phase 4: Enhanced Features & Analytics (Current)**
* [x] Search & Filtering: Add query parameters to filter by genre, rating, or reading status.
* [x] Reading Progress API: Logic to calculate percentage read.
* [x] External Integration: Connect to the Open Library API or Google Books API to fetch book metadata via Book Title Search.
* [x] Image Support: Allow users to upload book cover images (stored in AWS S3 or locally).
* [x] Unit Testing: Introduced pytest with a separate SQLite test database, achieving 83% coverage across 24 passing tests.

#### **🔴 Phase 5: Scaling & DevOps**
* [x] Containerization: Create a docker-compose.yml to spin up the FastAPI app and PostgreSQL instantly.
* [ ] API Documentation: Enhance Swagger UI with custom tags, descriptions, and example responses.
* [ ] CI/CD Pipeline: Set up GitHub Actions to run tests automatically on every push.
   
   
