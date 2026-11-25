FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 OLLAMA_BASE_URL=http://host.docker.internal:11434
COPY requirements.txt .
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "2", "--timeout", "300", "-b", "0.0.0.0:5000", "app.application:app"]
