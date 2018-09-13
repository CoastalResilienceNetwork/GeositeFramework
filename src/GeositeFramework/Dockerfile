FROM python:2.7-slim

RUN mkdir -p /usr/src/GeositeFramework

WORKDIR /usr/src/GeositeFramework

COPY requirements.txt .

RUN pip install -r requirements.txt

ENTRYPOINT ["python"]

CMD ["./scripts/server.py"]
