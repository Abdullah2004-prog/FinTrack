from flask import Flask, render_template, request, jsonify, send_file
import csv
import json
import os
from datetime import datetime

# This file is the web connector. Your original finance-tracking project
# remains in original-project/ and is not modified.

app = Flask(__name__)
DATA_FILE = "transactions.json"
CSV_FILE = "transactions.csv"

def load_transactions():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []

def save_transactions(items):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=4)

def amount_of(t):
    try:
        return float(t.get("amount", 0))
    except (TypeError, ValueError):
        return 0.0

@app.route("/")
def index():
    return render_template("index.html")

@app.get("/api/transactions")
def transactions():
    return jsonify(load_transactions())

@app.post("/api/transactions")
def add_transaction():
    data = request.get_json(force=True)
    items = load_transactions()
    item = {
        "date": data.get("date") or datetime.now().strftime("%Y-%m-%d"),
        "amount": float(data.get("amount", 0)),
        "category": data.get("category", "Other"),
        "payment_type": data.get("payment_type", "Cash"),
        "type": data.get("type", "Expense")
    }
    items.append(item)
    save_transactions(items)
    return jsonify(item), 201

@app.get("/api/summary")
def summary():
    items = load_transactions()
    income = sum(amount_of(t) for t in items if str(t.get("type","")).lower()=="income")
    expense = sum(amount_of(t) for t in items if str(t.get("type","")).lower()=="expense")
    return jsonify({
        "income": income,
        "expense": expense,
        "balance": income-expense,
        "transactions": len(items)
    })

@app.get("/download/csv")
def download_csv():
    items = load_transactions()
    fields = ["date", "amount", "category", "payment_type", "type"]
    with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(items)
    return send_file(CSV_FILE, as_attachment=True, download_name="fintrack_transactions.csv")

if __name__ == "__main__":
    app.run(debug=True)
