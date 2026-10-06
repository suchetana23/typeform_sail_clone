import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Enum, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import relationship
import datetime
import enum
from database import Base

class QuestionType(str, enum.Enum):
    short_text = "short_text"
    long_text = "long_text"
    multiple_choice = "multiple_choice"
    dropdown = "dropdown"
    email = "email"
    number = "number"
    yes_no = "yes_no"
    rating = "rating"
    file_upload = "file_upload"

def generate_uuid():
    return str(uuid.uuid4())

class Form(Base):
    __tablename__ = "forms"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    title = Column(String, index=True)
    is_published = Column(Boolean, default=False)
    theme = Column(JSON, nullable=True) # {"primary_color": "#...", "dark_mode": true}
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    questions = relationship("Question", back_populates="form", cascade="all, delete-orphan", order_by="Question.order")
    responses = relationship("Response", back_populates="form", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    form_id = Column(String, ForeignKey("forms.id"))
    type = Column(Enum(QuestionType))
    title = Column(String)
    description = Column(String, nullable=True)
    is_required = Column(Boolean, default=False)
    order = Column(Integer)
    settings = Column(JSON, nullable=True) # e.g., {"choices": ["A", "B"], "logic_jumps": [...]}

    form = relationship("Form", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")


class Response(Base):
    __tablename__ = "responses"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    form_id = Column(String, ForeignKey("forms.id"))
    is_completed = Column(Boolean, default=False)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)

    form = relationship("Form", back_populates="responses")
    answers = relationship("Answer", back_populates="response", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    response_id = Column(String, ForeignKey("responses.id"))
    question_id = Column(String, ForeignKey("questions.id"))
    value = Column(Text) # JSON serialized for complex answers

    response = relationship("Response", back_populates="answers")
    question = relationship("Question", back_populates="answers")
