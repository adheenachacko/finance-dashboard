from fastapi import FastAPI, UploadFile, File, Depends, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm.attributes import flag_modified
from pypdf import PdfReader
from anthropic import Anthropic
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from models import Statement, Person, User, create_tables, get_db
from auth import hash_password, verify_password, create_access_token, get_current_user
import io
import json
import os
import csv
import io as io_module

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

def parse_venmo_csv(file_bytes):
    content = file_bytes.decode("utf-8")
    lines = content.split("\n")
    
    # Find the header row
    header_idx = None
    for i, line in enumerate(lines):
        if "ID" in line and "Datetime" in line and "Type" in line:
            header_idx = i
            break
    
    if header_idx is None:
        return []

    reader = csv.DictReader(lines[header_idx:])
    transactions = []

    for row in reader:
        try:
            amount_str = row.get("Amount (total)", "").strip()
            if not amount_str or amount_str == "":
                continue

            # Clean amount
            amount_str = amount_str.replace("$", "").replace(",", "").replace(" ", "")
            if not amount_str or amount_str in ["-", "+"]:
                continue

            amount = float(amount_str)
            if amount == 0:
                continue

            # Get date
            datetime_str = row.get("Datetime", "").strip()
            if not datetime_str:
                continue
            date = datetime_str[:10]

            # Get note and people
            note = row.get("Note", "").strip()
            from_person = row.get("From", "").strip()
            to_person = row.get("To", "").strip()
            tx_type = row.get("Type", "").strip()
            status = row.get("Status", "").strip()

            if status != "Complete" and status != "Issued":
                continue

            # Skip standard bank transfers
            if tx_type == "Standard Transfer":
                continue

            description = note if note else f"{from_person} → {to_person}"

            transactions.append({
                "date": date,
                "description": description,
                "note": note,
                "amount": amount,
                "category": "Other",
                "account": "Venmo"
            })
        except (ValueError, KeyError):
            continue

    return transactions


def categorize_venmo_transactions(transactions):
    if not transactions:
        return transactions

    # Build a list for Claude to categorize
    tx_list = [
        {"index": i, "note": t["note"] or t["description"], "amount": t["amount"]}
        for i, t in enumerate(transactions)
    ]

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=4000,
        messages=[{
            "role": "user",
            "content": f"""Categorize these Venmo transactions based on their notes.
Return a JSON array with this exact structure, nothing else:

[
  {{"index": 0, "category": "Food"}}
]

Category must be one of exactly these: Food, Transport, Shopping, Subscriptions, Utilities, Healthcare, Entertainment, Income, Investment, Housing, Travel, Other

Rules:
- Rent payments, mortgage payments, and housing-related expenses should be categorized as Housing
- Flights, hotels, Airbnb = Travel
- Uber, Lyft, gas, parking = Transport
- Positive amounts are money received — if someone paid you back for food, still categorize as Food
- Negative amounts are money sent
- Use the note to determine category
- "sushi", "dinner", "lunch", "drinks", "omakase" = Food
- "uber", "lyft", "gas", "parking", "ski", "flight" = Transport  
- "class", "tip", "sauna", "bliss" = Healthcare or Entertainment based on context
- Group splits for events = Entertainment
- If unclear = Other
- Return only valid JSON array, no other text
- Transfers to investment accounts like Vanguard, Fidelity, Schwab = Investment


Transactions:
{json.dumps(tx_list, indent=2)}"""
        }]
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    categories = json.loads(raw)
    for item in categories:
        idx = item["index"]
        if idx < len(transactions):
            transactions[idx]["category"] = item["category"]

    return transactions


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
- category must be one of exactly these: Food, Transport, Shopping, Subscriptions, Utilities, Healthcare, Entertainment, Income, Investment, Housing, Travel, Other
- Flights, hotels, Airbnb, vacation rentals, and travel-related bookings should be categorized as Travel
- Local transport like Uber, Lyft, subway, PATH, parking = Transport
- Travel is for trips and accommodation, Transport is for daily commuting
- Rent payments, mortgage payments, and housing-related expenses should be categorized as Housing
- date format must be YYYY-MM-DD
- Ignore payment coupons, legal text, interest calculations, and notices
- Only extract actual purchase transactions and payments
- Return only valid JSON, absolutely no other text
- Any transfer to Vanguard, Fidelity, Schwab, Robinhood, or similar investment platforms should be categorized as Investment
- category must be one of exactly these: Food, Transport, Shopping, Subscriptions, Utilities, Healthcare, Entertainment, Income, Investment, Other
- Transfers to investment accounts like Vanguard, Fidelity, Schwab = Investment
- Credits, refunds, and statement credits shown in the Credits section should have POSITIVE amounts (money back to you)
- Platinum Digital Entertainment Credit, Platinum Resy Credit, Platinum Walmart+ Credit are statement credits — positive amounts, categorize based on what they're for (Entertainment, Food, Subscriptions)
- Any line in a Credits section with a negative sign in the PDF should be treated as positive in your output since it represents money returned
- Refunds from merchants should be positive amounts
- New Charges are negative amounts (money spent)
- Credits/Payments/Refunds are positive amounts (money returned or credited)


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

def calculate_totals(transactions):
    active = [t for t in transactions if not t.get("excluded", False)]
    
    income = sum(t["amount"] for t in active
                 if t["amount"] > 0
                 and t.get("category") not in ["Investment"])
    spending = sum(t["amount"] for t in active
                   if t["amount"] < 0
                   and t.get("category") not in ["Investment"])
    invested = sum(abs(t["amount"]) for t in active
                   if t.get("category") == "Investment"
                   and t["amount"] < 0)
    savings = income + spending
    total_income = income + invested
    savings_rate = round((savings + invested) / total_income * 100, 1) if total_income > 0 else 0

    categories = {}
    for t in active:
        if t.get("category") not in ["Investment"]:
            cat = t["category"]
            if t["amount"] < 0:
                categories[cat] = categories.get(cat, 0) + abs(t["amount"])
            elif t["amount"] > 0 and cat not in ["Income"]:
                # Credit/refund — subtract from category spending
                categories[cat] = categories.get(cat, 0) - t["amount"]

    # Remove categories with zero or negative totals
    categories = {k: round(v, 2) for k, v in categories.items() if v > 0}

    return {
        "income": round(income, 2),
        "spending": round(abs(spending), 2),
        "savings": round(savings, 2),
        "invested": round(invested, 2),
        "total_saved": round(savings + invested, 2),
        "savings_rate": savings_rate,
        "categories": {k: round(v, 2) for k, v in categories.items()}
    }

def auto_exclude_matching_returns(transactions):
    from collections import defaultdict
    
    merchant_transactions = defaultdict(list)
    
    for i, t in enumerate(transactions):
        # Create a simplified merchant key from description
        key = t["description"][:20].strip().lower()
        merchant_transactions[key].append((i, t["amount"]))
    
    excluded_indices = set()
    
    for key, txs in merchant_transactions.items():
        if len(txs) < 2:
            continue
        
        amounts = [amt for _, amt in txs]
        indices = [idx for idx, _ in txs]
        
        # Look for pairs that cancel out
        for i in range(len(amounts)):
            for j in range(i + 1, len(amounts)):
                if abs(amounts[i] + amounts[j]) < 0.01:  # they cancel out
                    excluded_indices.add(indices[i])
                    excluded_indices.add(indices[j])
    
    for i, t in enumerate(transactions):
        if i in excluded_indices and not t.get("excluded", False):
            t["excluded"] = True
            t["auto_excluded"] = True  # flag so user knows it was automatic
    
    return transactions, len(excluded_indices) // 2

def generate_insights(transactions):
    active = [t for t in transactions if not t.get("excluded", False)]
    
    income = sum(t["amount"] for t in active 
             if t["amount"] > 0 
             and t.get("category") not in ["Investment"])

    spending = sum(t["amount"] for t in active 
               if t["amount"] < 0 
               and t.get("category") not in ["Investment"])
    invested = sum(abs(t["amount"]) for t in active 
               if t.get("category") == "Investment" 
               and t["amount"] < 0)
    savings = income + spending
    total_saved = savings + invested

    ccategories = {}
    for t in active:
        if t.get("category") not in ["Investment"]:
            cat = t["category"]
            if t["amount"] < 0:
                categories[cat] = categories.get(cat, 0) + abs(t["amount"])
            elif t["amount"] > 0 and cat not in ["Income"]:
                # Credit/refund — subtract from category spending
                categories[cat] = categories.get(cat, 0) - t["amount"]

    # Remove categories with zero or negative totals
    categories = {k: round(v, 2) for k, v in categories.items() if v > 0}

    total_income = income + invested
    savings_rate = round((total_saved / total_income * 100), 1) if total_income > 0 else 0

    summary_data = {
        "income": round(income, 2),
        "spending": round(abs(spending), 2),
        "savings": round(savings, 2),
        "invested": round(invested, 2),
        "total_saved": round(total_saved, 2),
        "savings_rate": savings_rate,
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

Note: The person invests ${round(invested, 2)} per month automatically. Factor this into your insights as a positive.

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
    filename = file.filename.lower()

    # Route to CSV or PDF parser
    # Route to CSV or PDF parser
    if filename.endswith(".csv"):
        all_transactions = parse_venmo_csv(contents)
        if not all_transactions:
            return {"error": "Could not parse this CSV. Make sure it is a Venmo statement."}

        all_transactions = categorize_venmo_transactions(all_transactions)

        all_transactions, auto_excluded_count = auto_exclude_matching_returns(all_transactions)
        if auto_excluded_count > 0:
            print(f"Auto-excluded {auto_excluded_count} matching return pairs")

        # Tag with account name
        for t in all_transactions:
            t["account"] = account_name

        # Group by month
        from collections import defaultdict
        by_month = defaultdict(list)
        for t in all_transactions:
            month_key = t["date"][:7]
            by_month[month_key].append(t)

        # Process each month separately
        last_result = None
        for month_key, month_transactions in sorted(by_month.items()):
            existing = db.query(Statement).filter(
                Statement.person_id == person_id,
                Statement.month == month_key
            ).first()

            if existing:
                existing_transactions = existing.transactions or []
                all_month = existing_transactions + month_transactions
                seen = set()
                merged = []
                for t in all_month:
                    key = f"{t['date']}_{t['description']}_{t['amount']}"
                    if key not in seen:
                        seen.add(key)
                        merged.append(t)

                month_result = calculate_totals(merged)
                month_result["insights"] = None
                month_result["transactions"] = merged
                month_result["transactions"] = merged

                existing_accounts = existing.totals.get("accounts", [])
                if account_name not in existing_accounts:
                    existing_accounts.append(account_name)

                existing.transactions = merged
                existing.totals = {
                    "income": month_result["income"],
                    "spending": month_result["spending"],
                    "savings": month_result["savings"],
                    "savings_rate": month_result["savings_rate"],
                    "categories": month_result["categories"],
                    "accounts": existing_accounts
                }
                existing.insights = month_result["insights"]
                db.commit()
                db.refresh(existing)

                month_result["id"] = existing.id
                month_result["month"] = month_key
                month_result["person_name"] = person_name
                month_result["merged"] = True
                month_result["accounts"] = existing_accounts

            else:
                month_result = calculate_totals(month_transactions)
                month_result["insights"] = None
                month_result["transactions"] = month_transactions

                statement = Statement(
                    person_id=person_id,
                    person_name=person_name,
                    month=month_key,
                    transactions=month_transactions,
                    totals={
                        "income": month_result["income"],
                        "spending": month_result["spending"],
                        "savings": month_result["savings"],
                        "savings_rate": month_result["savings_rate"],
                        "categories": month_result["categories"],
                        "accounts": [account_name]
                    },
                    insights=month_result["insights"]
                )
                db.add(statement)
                db.commit()
                db.refresh(statement)

                month_result["id"] = statement.id
                month_result["month"] = month_key
                month_result["person_name"] = person_name
                month_result["merged"] = False
                month_result["accounts"] = [account_name]

            last_result = month_result

        # Return the most recent month's result
        last_result["transaction_count"] = len(all_transactions)
        last_result["csv_months_processed"] = sorted(by_month.keys())
        return last_result
    else:
        text = extract_text_from_pdf(contents)
        if not text.strip():
            return {"error": "Could not extract text from this PDF."}
        transaction_data = categorize_transactions(text)
        new_transactions = transaction_data["transactions"]
        for t in new_transactions:
            t["account"] = account_name
            t["note"] = t.get("description", "")

    # Tag each transaction with account name
    for t in new_transactions:
        t["account"] = account_name

    # Detect month
    if not month and new_transactions:
        first_date = new_transactions[0]["date"]
        month = first_date[:7]

    # Check for existing statement and merge
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

        result = calculate_totals(merged_transactions)
        result["insights"] = None
        result["transactions"] = merged_transactions

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
        result = calculate_totals(new_transactions)
        result["insights"] = None
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

@app.get("/trends/{person_id}")
async def get_trends(
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

    statements = db.query(Statement).filter(
        Statement.person_id == person_id
    ).order_by(Statement.month).all()

    return [
    {
        "month": s.month,
        "income": s.totals.get("income", 0),
        "spending": s.totals.get("spending", 0),
        "savings": s.totals.get("savings", 0),
        "invested": s.totals.get("invested", 0),
        "total_saved": s.totals.get("total_saved", 0),
        "savings_rate": s.totals.get("savings_rate", 0),
    }
    for s in statements
]


@app.get("/household/{month}")
async def get_household(
    month: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    people = db.query(Person).filter(
        Person.user_id == current_user.id
    ).all()

    result = []
    for person in people:
        statement = db.query(Statement).filter(
            Statement.person_id == person.id,
            Statement.month == month
        ).first()
        if statement:
            result.append({
                "person_id": person.id,
                "person_name": person.name,
                "month": month,
                "income": statement.totals.get("income", 0),
                "spending": statement.totals.get("spending", 0),
                "savings": statement.totals.get("savings", 0),
                "savings_rate": statement.totals.get("savings_rate", 0),
                "categories": statement.totals.get("categories", {}),
                "accounts": statement.totals.get("accounts", []),
            })

    total_income = sum(r["income"] for r in result)
    total_spending = sum(r["spending"] for r in result)
    total_savings = sum(r["savings"] for r in result)
    total_savings_rate = round((total_savings / total_income * 100), 1) if total_income > 0 else 0

    return {
        "month": month,
        "people": result,
        "combined": {
            "income": round(total_income, 2),
            "spending": round(total_spending, 2),
            "savings": round(total_savings, 2),
            "savings_rate": total_savings_rate
        }
    }

@app.patch("/statements/{statement_id}/transaction/{transaction_index}")
async def update_transaction(
    statement_id: int,
    transaction_index: int,
    category: str = Form(None),
    excluded: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    statement = db.query(Statement).filter(Statement.id == statement_id).first()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")

    transactions = list(statement.transactions)
    if transaction_index >= len(transactions):
        raise HTTPException(status_code=400, detail="Transaction index out of range")

    if category is not None:
        transactions[transaction_index]["category"] = category
    
    if excluded is not None:
        transactions[transaction_index]["excluded"] = excluded == "true"

    statement.transactions = transactions

    # Active = not excluded
    active = [t for t in transactions if not t.get("excluded", False)]

    # Recalculate totals
    income = sum(t["amount"] for t in active
                 if t["amount"] > 0
                 and t.get("category") not in ["Investment"])

    spending = sum(t["amount"] for t in active
                   if t["amount"] < 0
                   and t.get("category") not in ["Investment"])

    invested = sum(abs(t["amount"]) for t in active
               if t.get("category") == "Investment"
               and t["amount"] < 0)

    savings = income + spending
    total_income = income + invested
    savings_rate = round((savings + invested) / total_income * 100, 1) if total_income > 0 else 0

    categories = {}
    for t in active:
        if t.get("category") not in ["Investment"]:
            cat = t["category"]
            if t["amount"] < 0:
                categories[cat] = categories.get(cat, 0) + abs(t["amount"])
            elif t["amount"] > 0 and cat not in ["Income"]:
                # Credit/refund — subtract from category spending
                categories[cat] = categories.get(cat, 0) - t["amount"]

    # Remove categories with zero or negative totals
    categories = {k: round(v, 2) for k, v in categories.items() if v > 0}

    totals = dict(statement.totals)
    totals.update({
        "income": round(income, 2),
        "spending": round(abs(spending), 2),
        "savings": round(savings, 2),
        "invested": round(invested, 2),
        "total_saved": round(savings + invested, 2),
        "savings_rate": savings_rate,
        "categories": {k: round(v, 2) for k, v in categories.items()}
    })
    statement.transactions = transactions
    statement.totals = totals
    flag_modified(statement, "transactions")
    flag_modified(statement, "totals")
    db.commit()
    db.refresh(statement)

    return {"message": "Updated", "transactions": transactions, "totals": statement.totals}

@app.post("/statements/{statement_id}/refresh-insights")
async def refresh_insights(
    statement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    statement = db.query(Statement).filter(Statement.id == statement_id).first()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")

    result = generate_insights(statement.transactions)
    
    totals = dict(statement.totals)
    totals.update({
        "income": result["income"],
        "spending": result["spending"],
        "savings": result["savings"],
        "invested": result.get("invested", 0),
        "total_saved": result.get("total_saved", 0),
        "savings_rate": result["savings_rate"],
        "categories": result["categories"]
    })
    statement.totals = totals
    statement.insights = result["insights"]
    flag_modified(statement, "totals")
    flag_modified(statement, "insights")
    db.commit()
    db.refresh(statement)

    return {
        "insights": statement.insights,
        "totals": statement.totals
    }

@app.get("/household-trends")
async def get_household_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    people = db.query(Person).filter(
        Person.user_id == current_user.id
    ).all()

    # Get all months that have data
    all_months = set()
    for person in people:
        statements = db.query(Statement).filter(
            Statement.person_id == person.id
        ).all()
        for s in statements:
            all_months.add(s.month)

    all_months = sorted(all_months)
    result = []

    for month in all_months:
        month_data = {"month": month, "income": 0, "spending": 0, "savings": 0, "invested": 0}
        for person in people:
            statement = db.query(Statement).filter(
                Statement.person_id == person.id,
                Statement.month == month
            ).first()
            if statement:
                month_data["income"] += statement.totals.get("income", 0)
                month_data["spending"] += statement.totals.get("spending", 0)
                month_data["savings"] += statement.totals.get("savings", 0)
                month_data["invested"] += statement.totals.get("invested", 0)

        month_data["savings_rate"] = round(
            (month_data["savings"] + month_data["invested"]) /
            (month_data["income"] + month_data["invested"]) * 100, 1
        ) if (month_data["income"] + month_data["invested"]) > 0 else 0

        result.append(month_data)

    # Calculate rolling 3 month averages
    for i, d in enumerate(result):
        window = result[max(0, i - 2): i + 1]
        d["rolling_income"] = round(sum(x["income"] for x in window) / len(window), 2)
        d["rolling_spending"] = round(sum(x["spending"] for x in window) / len(window), 2)
        d["rolling_savings"] = round(sum(x["savings"] for x in window) / len(window), 2)
        d["rolling_savings_rate"] = round(sum(x["savings_rate"] for x in window) / len(window), 1)

    return result


@app.get("/health")
async def health():
    return {"status": "ok"}