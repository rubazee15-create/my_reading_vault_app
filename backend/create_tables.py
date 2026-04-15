from database import engine, Base
import models  # This is critical so SQLAlchemy sees the classes

def init_db():
    print("Connecting to Supabase and building the Vault...")
    # This command looks at everything inheriting from Base and creates it
    Base.metadata.create_all(bind=engine)
    print("✅ Success! Your tables (Users, Authors, Books) are now live in Supabase.")

if __name__ == "__main__":
    init_db()