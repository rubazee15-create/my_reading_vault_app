import os
import psycopg2 
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(url)
    print("✅ Success! Your Reading Vault is connected to Supabase.")
    conn.close()
except Exception as e:
    print(f"❌ Connection failed: {e}")