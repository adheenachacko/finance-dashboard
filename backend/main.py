from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from anthropic import Anthropic
from dotenv import load_dotenv
import io
import json
import os

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic()

def extract_text_from_pdf(file_bytes):
    pdf = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for i, page in enumerate(pdf.pages):
        page_text = page.extract_text() or ""
        text += f"\n--- PAGE {i+1} ---\n"
        text += page_text
    print(f"Total pages extracted: {len(pdf.pages)}")
    return text


def categorize_transactions(text):
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=8000,
        messages=[
            {
                "role": "user",
                "content": f"""Extract all transactions from this bank or credit card statement.
Return a JSON object with this exact structure, nothing else:

{{
  "transactions": [
    {{
      "date": "2026-04-01",
      "description": "Whole Foods Market",
      "amount": -87.43,
      "category": "Food"
    }}
  ]
}}

Rules:
- amount is negative for spending, positive for income/deposits
- category must be one of exactly these: Food, Transport, Shopping, Subscriptions, Utilities, Healthcare, Entertainment, Income, Other
- date format must be YYYY-MM-DD
- Ignore payment coupons, legal text, interest calculations, and notices
- Only extract actual purchase transactions and payments
- Return only valid JSON, absolutely no other text

Statement:
{text}"""
            }
        ]
    )

    raw = message.content[0].text.strip()
    print("=== CLAUDE RESPONSE ===")
    print(raw[:1000])
    print("=== END RESPONSE ===")

    # Strip markdown code blocks if Claude adds them
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw)


def generate_insights(transactions):
    # Calculate totals
    income = sum(t["amount"] for t in transactions if t["amount"] > 0)
    spending = sum(t["amount"] for t in transactions if t["amount"] < 0)
    savings = income + spending  # spending is negative so this works

    # Group by category
    categories = {}
    for t in transactions:
        if t["amount"] < 0:
            cat = t["category"]
            categories[cat] = categories.get(cat, 0) + abs(t["amount"])

    summary_data = {
        "income": round(income, 2),
        "spending": round(abs(spending), 2),
        "savings": round(savings, 2),
        "savings_rate": round((savings / income * 100), 1) if income > 0 else 0,
        "categories": {k: round(v, 2) for k, v in categories.items()}
    }

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1000,
        messages=[
            {
                "role": "user",
                "content": f"""Based on this monthly spending data, provide insights.
Return a JSON object with this exact structure, nothing else:

{{
  "summary": "2-3 sentence plain English summary of this month",
  "doing_well": "one specific thing they are doing well",
  "recommendations": [
    "specific actionable recommendation 1",
    "specific actionable recommendation 2",
    "specific actionable recommendation 3"
  ],
  "biggest_opportunity": "the single biggest way to save more money with a specific dollar estimate"
}}

Spending data:
{json.dumps(summary_data, indent=2)}"""
            }
        ]
    )

    raw = message.content[0].text.strip()
    
    print("=== INSIGHTS RESPONSE ===")
    print(raw[:500])
    print("=== END INSIGHTS ===")
    
    # Strip markdown code blocks if Claude wraps in them
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()
    
    insights = json.loads(raw)

    return {**summary_data, "insights": insights}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    contents = await file.read()
    text = extract_text_from_pdf(contents)
    
    print(f"Total pages extracted: {len(PdfReader(io.BytesIO(contents)).pages)}")
    print("=== EXTRACTED TEXT ===")
    print(text[:500])
    print("=== END TEXT ===")

    if not text.strip():
        return {"error": "Could not extract text from this PDF. Try a different file."}

    transaction_data = categorize_transactions(text)
    transactions = transaction_data["transactions"]
    result = generate_insights(transactions)
    result["transactions"] = transactions

    print("=== FINAL RESULT ===")
    print(result)
    print("=== END RESULT ===")

    return result

@app.get("/health")
async def health():
    return {"status": "ok"}