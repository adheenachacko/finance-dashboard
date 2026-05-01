from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Float, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    people = relationship("Person", back_populates="user")


class Person(Base):
    __tablename__ = "people"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    statements = relationship("Statement", back_populates="person")
    user = relationship("User", back_populates="people")


class Statement(Base):
    __tablename__ = "statements"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("people.id"), nullable=True)
    person_name = Column(String, index=True)
    month = Column(String)
    transactions = Column(JSON)
    totals = Column(JSON)
    insights = Column(JSON)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    person = relationship("Person", back_populates="statements")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class HouseholdInsight(Base):
    __tablename__ = "household_insights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    year = Column(String, nullable=False)
    insights = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class NetWorthEntry(Base):
    __tablename__ = "net_worth_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    person_id = Column(Integer, ForeignKey("people.id"), nullable=True)
    person_name = Column(String, nullable=True)
    date = Column(String, nullable=False)
    accounts = Column(JSON, nullable=True)
    total_assets = Column(Float, default=0)
    total_debts = Column(Float, default=0)
    net_worth = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0)
    target_date = Column(String, nullable=True)  # YYYY-MM format
    color = Column(String, default="#4f86c6")
    created_at = Column(DateTime, default=datetime.utcnow)
    
def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()