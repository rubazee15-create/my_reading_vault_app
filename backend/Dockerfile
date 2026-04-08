# Start from official Python image
FROM python:3.12-slim

# Set working directory inside the container
WORKDIR /app

# Copy requirements first (for faster builds)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Create uploads folder inside container
RUN mkdir -p uploads

# Expose port 8000
EXPOSE 8000

# Command to run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]