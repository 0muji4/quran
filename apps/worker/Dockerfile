FROM python:3.11-slim

WORKDIR /app

COPY apps/worker/requirements.txt /app/apps/worker/requirements.txt

RUN pip install --no-cache-dir -r /app/apps/worker/requirements.txt

COPY apps/worker /app/apps/worker

CMD ["python", "-u", "/app/apps/worker/main.py"]
