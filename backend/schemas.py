from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime
from models import QuestionType

# --- Questions ---

class QuestionBase(BaseModel):
    type: QuestionType
    title: str
    description: Optional[str] = None
    is_required: bool = False
    order: int
    settings: Optional[Dict[str, Any]] = None

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(QuestionBase):
    type: Optional[QuestionType] = None
    title: Optional[str] = None
    description: Optional[str] = None
    is_required: Optional[bool] = None
    order: Optional[int] = None
    settings: Optional[Dict[str, Any]] = None

class Question(QuestionBase):
    id: str
    form_id: str

    model_config = ConfigDict(from_attributes=True)

# --- Forms ---

class FormBase(BaseModel):
    title: str
    is_published: bool = False
    theme: Optional[Dict[str, Any]] = None

class FormCreate(FormBase):
    pass

class FormUpdate(BaseModel):
    title: Optional[str] = None
    is_published: Optional[bool] = None
    theme: Optional[Dict[str, Any]] = None

class Form(FormBase):
    id: str
    created_at: datetime
    updated_at: datetime
    questions: List[Question] = []

    model_config = ConfigDict(from_attributes=True)

class FormSummary(Form):
    response_count: int = 0

# --- Answers & Responses ---

class AnswerBase(BaseModel):
    question_id: str
    value: str

class AnswerCreate(AnswerBase):
    pass

class Answer(AnswerBase):
    id: str
    response_id: str

    model_config = ConfigDict(from_attributes=True)

class ResponseBase(BaseModel):
    is_completed: bool = False

class ResponseCreate(ResponseBase):
    answers: Optional[List[AnswerCreate]] = []

class Response(ResponseBase):
    id: str
    form_id: str
    submitted_at: datetime
    answers: List[Answer] = []

    model_config = ConfigDict(from_attributes=True)
