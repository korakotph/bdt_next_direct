FROM docker:27-cli AS docker-cli

FROM python:3.12-slim

COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-cli /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose

RUN apt-get update && apt-get install -y --no-install-recommends \
        zip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 9090
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:9090", "--workers", "4", "--threads", "4", "--timeout", "0"]
