from fastapi import FastAPI, UploadFile, File, Depends, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from anthropic import Anthropic
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from models import Statement, Person, User, create_tables, get_db
from auth import hash_password, verify_password, create_access_token, get_current_user
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
create_tables()


# ── Auth ──────────────────────────────────────────────

@app.post("/signup")
async def signup(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=email, hashed_password=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "email": user.email}


@app.post("/login")
async def login(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "email": user.email}


@app.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"email": current_user.email, "id": current_user.id}


# ── People ────────────────────────────────────────────

@app.post("/people")
async def create_person(
    name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    person = Person(name=name, user_id=current_user.id)
    db.add(person)
    db.commit()
    db.refresh(person)
    return {"id": person.id, "name": person.name}


@app.get("/people")
async def get_people(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    people = db.query(Person).filter(
        Person.user_id == current_user.id
    ).order_by(Person.created_at).all()
    return [{"id": p.id, "name": p.name} for p in people]


@app.delete("/people/{person_id}")
async def delete_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    person = db.query(Person).filter(
        Person.id == person_id,
        Person.user_id == current_user.id
    ).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    db.delete(person)
    db.commit()
    return {"message": "Deleted successfully"}


# ── Statements ────────────────────────────────────────

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
    account_name: str = Form("Unknown"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"=== RECEIVED person_name: {person_name}, person_id: {person_id} ===")

    contents = await file.read()
    text = extract_text_from_pdf(contents)

    if not text.strip():
        return {"error": "Could not extract text from this PDF."}

    transaction_data = categorize_transactions(text)
    new_transactions = transaction_data["transactions"]

    # Tag each transaction with account name
    for t in new_transactions:
        t["account"] = account_name
    

    # Detect month from transactions if not provided
    if not month and new_transactions:
        first_date = new_transactions[0]["date"]
        month = first_date[:7]

    # Check if a statement already exists for this person and month
    existing = db.query(Statement).filter(
        Statement.person_id == person_id,
        Statement.month == month
    ).first()

    if existing:
        existing_transactions = existing.transactions or []
        all_transactions = existing_transactions + new_transactions

        seen = set()
        merged_transactions = []
        for t in all_transactions:
            key = f"{t['date']}_{t['description']}_{t['amount']}"
            if key not in seen:
                seen.add(key)
                merged_transactions.append(t)

        result = generate_insights(merged_transactions)
        result["transactions"] = merged_transactions

        # Track which accounts have been uploaded
        existing_accounts = existing.totals.get("accounts", [])
        if account_name not in existing_accounts:
            existing_accounts.append(account_name)

        existing.transactions = merged_transactions
        existing.totals = {
            "income": result["income"],
            "spending": result["spending"],
            "savings": result["savings"],
            "savings_rate": result["savings_rate"],
            "categories": result["categories"],
            "accounts": existing_accounts
        }
        existing.insights = result["insights"]
        db.commit()
        db.refresh(existing)

        result["id"] = existing.id
        result["month"] = month
        result["person_name"] = person_name
        result["merged"] = True
        result["transaction_count"] = len(merged_transactions)
        result["accounts"] = existing_accounts

        return result
    else:
        result = generate_insights(new_transactions)
        result["transactions"] = new_transactions

        statement = Statement(
            person_id=person_id,
            person_name=person_name,
            month=month,
            transactions=new_transactions,
            totals={
                "income": result["income"],
                "spending": result["spending"],
                "savings": result["savings"],
                "savings_rate": result["savings_rate"],
                "categories": result["categories"],
                "accounts": [account_name]
            },
            insights=result["insights"]
        )
        db.add(statement)
        db.commit()
        db.refresh(statement)

        result["id"] = statement.id
        result["month"] = month
        result["person_name"] = person_name
        result["merged"] = False
        result["transaction_count"] = len(new_transactions)
        result["accounts"] = [account_name]

        return result


@app.get("/statements")
async def get_statements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    people = db.query(Person).filter(Person.user_id == current_user.id).all()
    person_ids = [p.id for p in people]
    statements = db.query(Statement).filter(
        Statement.person_id.in_(person_ids)
    ).order_by(Statement.uploaded_at.desc()).all()
    return [
        {
            "id": s.id,
            "person_name": s.person_name,
            "person_id": s.person_id,
            "month": s.month,
            "totals": s.totals,
            "insights": s.insights,
            "uploaded_at": str(s.uploaded_at),
            "transactions": s.transactions
        }
        for s in statements
    ]


@app.get("/statements/{statement_id}")
async def get_statement(
    statement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    statement = db.query(Statement).filter(Statement.id == statement_id).first()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    return {
        "id": statement.id,
        "person_name": statement.person_name,
        "month": statement.month,
        "totals": statement.totals,
        "insights": statement.insights,
        "transactions": statement.transactions,
        "uploaded_at": str(statement.uploaded_at)
    }


@app.delete("/statements/{statement_id}")
async def delete_statement(
    statement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    statement = db.query(Statement).filter(Statement.id == statement_id).first()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    db.delete(statement)
    db.commit()
    return {"message": "Deleted successfully"}


@app.get("/health")
async def health():
    return {"status": "ok"}