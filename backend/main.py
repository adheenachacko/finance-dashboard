from fastapi import FastAPI, Form, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from anthropic import Anthropic
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from models import Statement, create_tables, get_db
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

# Create tables on startup
create_tables()


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

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw)


def generate_insights(transactions):
    income = sum(t["amount"] for t in transactions if t["amount"] > 0)
    spending = sum(t["amount"] for t in transactions if t["amount"] < 0)
    savings = income + spending

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

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    insights = json.loads(raw)

    return {**summary_data, "insights": insights}


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    person_name: str = Form("Me"),
    person_id: int = Form(None),
    month: str = Form(None),
    db: Session = Depends(get_db)
):
    print(f"=== RECEIVED person_name: {person_name}, person_id: {person_id} ===")
    contents = await file.read()
    text = extract_text_from_pdf(contents)

    if not text.strip():
        return {"error": "Could not extract text from this PDF."}

    transaction_data = categorize_transactions(text)
    transactions = transaction_data["transactions"]
    result = generate_insights(transactions)
    result["transactions"] = transactions

    # Detect month from transactions if not provided
    if not month and transactions:
        first_date = transactions[0]["date"]
        month = first_date[:7]  # takes YYYY-MM from YYYY-MM-DD

    # Save to database
    statement = Statement(
        person_id=person_id,
        person_name=person_name,
        month=month,
        transactions=transactions,
        totals={
            "income": result["income"],
            "spending": result["spending"],
            "savings": result["savings"],
            "savings_rate": result["savings_rate"],
            "categories": result["categories"]
        },
        insights=result["insights"]
    )
    db.add(statement)
    db.commit()
    db.refresh(statement)

    result["id"] = statement.id
    result["month"] = month
    result["person_name"] = person_name

    return result


@app.get("/statements")
async def get_statements(db: Session = Depends(get_db)):
    statements = db.query(Statement).order_by(Statement.uploaded_at.desc()).all()
    return [
        {
            "id": s.id,
            "person_name": s.person_name,
            "month": s.month,
            "totals": s.totals,
            "insights": s.insights,
            "uploaded_at": s.uploaded_at,
            "transactions": s.transactions
        }
        for s in statements
    ]


@app.get("/statements/{statement_id}")
async def get_statement(statement_id: int, db: Session = Depends(get_db)):
    statement = db.query(Statement).filter(Statement.id == statement_id).first()
    if not statement:
        return {"error": "Statement not found"}
    return {
        "id": statement.id,
        "person_name": statement.person_name,
        "month": statement.month,
        "totals": statement.totals,
        "insights": statement.insights,
        "transactions": statement.transactions,
        "uploaded_at": statement.uploaded_at
    }

@app.delete("/statements/{statement_id}")
async def delete_statement(statement_id: int, db: Session = Depends(get_db)):
    statement = db.query(Statement).filter(Statement.id == statement_id).first()
    if not statement:
        return {"error": "Statement not found"}
    db.delete(statement)
    db.commit()
    return {"message": "Deleted successfully"}

@app.post("/people")
async def create_person(name: str, db: Session = Depends(get_db)):
    from models import Person
    person = Person(name=name)
    db.add(person)
    db.commit()
    db.refresh(person)
    return {"id": person.id, "name": person.name}


@app.get("/people")
async def get_people(db: Session = Depends(get_db)):
    from models import Person
    people = db.query(Person).order_by(Person.created_at).all()
    return [{"id": p.id, "name": p.name} for p in people]


@app.delete("/people/{person_id}")
async def delete_person(person_id: int, db: Session = Depends(get_db)):
    from models import Person
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        return {"error": "Person not found"}
    db.delete(person)
    db.commit()
    return {"message": "Deleted successfully"}

@app.get("/health")
async def health():
    return {"status": "ok"}