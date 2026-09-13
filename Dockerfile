# Step 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Step 2: Build Python Backend & Bundle Frontend Static Assets
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY api/requirements.txt /app/api/requirements.txt
RUN pip install --no-cache-dir -r /app/api/requirements.txt

# Copy ML engine and API code
COPY ml/recommend.py /app/ml/recommend.py
COPY api/main.py /app/api/main.py

# Copy prebuilt frontend static files into /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Default database path (can be overridden via volume mount or ENV)
ENV DB_PATH=/data/books.db
WORKDIR /app/api

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
