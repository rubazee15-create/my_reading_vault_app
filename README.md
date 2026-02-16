### 📚 Reading Vault Application
A robust backend API built with FastAPI to manage and track your personal library. 

### 📖 Overview
The Reading Vault is a digital tracker designed to help users manage their reading journey. It implements full CRUD operations to handle books, authors and reading statuses.

### 🛠️ Tech Stack
* **Framework:** FastAPI
* **Server:** Uvicorn
* **Language:** Python
* **Validation:** Pydantic 

### 📂 Project Structure
Following the modular approach:

├── main.py          
├── models.py        
├── schemas.py       
├── database.py      
└── crud.py          

### ⚙️ How to Run Locally

1. **Clone & Navigate the repository:**
   ```bash
   git clone https://github.com/rubazee15-create/my_reading_vault_app.git
   cd my_reading_vault_app

2. Create virtual Environment
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate

3. Install dependencies
   ```bash
   pip install -r requirements.txt

4. Start the FastAPI server
```bash
uvicorn main:app --reload

5. Access the API:
* Base API: http

### 📈 Roadmap
* Implement User Authentication (OAuth2)
* Add "Reading Progress" percentage tracking.
* Integrate a third-party Book API for auto-filling book details.
 
   
   
