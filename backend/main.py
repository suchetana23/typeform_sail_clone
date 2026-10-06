from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import io
import csv
import os
import math
import re
import shutil

import models, schemas, crud
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Typeform Builder API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)


def validate_response(form, response: schemas.ResponseCreate):
    questions = {question.id: question for question in form.questions}
    answers = {}
    seen_question_ids = set()
    for answer in response.answers or []:
        question = questions.get(answer.question_id)
        if question is None:
            raise HTTPException(status_code=422, detail="An answer refers to a question outside this form")
        if answer.question_id in seen_question_ids:
            raise HTTPException(status_code=422, detail="A question can only have one answer")
        seen_question_ids.add(answer.question_id)

        value = answer.value
        if value == "":
            continue
        if question.type == models.QuestionType.email and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise HTTPException(status_code=422, detail=f"{question.title}: enter a valid email address")
        if question.type == models.QuestionType.number:
            try:
                if not math.isfinite(float(value)):
                    raise ValueError
            except ValueError:
                raise HTTPException(status_code=422, detail=f"{question.title}: enter a valid number") from None
        if question.type in (models.QuestionType.multiple_choice, models.QuestionType.dropdown):
            choices = (question.settings or {}).get("choices", [])
            if value not in choices:
                raise HTTPException(status_code=422, detail=f"{question.title}: choose one of the available options")
        if question.type == models.QuestionType.yes_no and value not in ("Yes", "No"):
            raise HTTPException(status_code=422, detail=f"{question.title}: choose Yes or No")
        if question.type == models.QuestionType.rating and value not in {"1", "2", "3", "4", "5"}:
            raise HTTPException(status_code=422, detail=f"{question.title}: choose a rating from 1 to 5")
        answers[answer.question_id] = value

    if response.is_completed:
        for question in form.questions:
            if question.is_required and not answers.get(question.id, "").strip():
                raise HTTPException(status_code=422, detail=f"{question.title} is required")

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    # Return a mocked URL for simplicity (in real app, this would be a static file route or cloud storage URL)
    return {"url": f"/api/uploads/{file.filename}"}

@app.get("/api/uploads/{filename}")
async def get_uploaded_file(filename: str):
    from fastapi.responses import FileResponse
    file_path = f"uploads/{filename}"
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/api/forms", response_model=List[schemas.FormSummary])
def read_forms(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    forms = crud.get_forms(db, skip=skip, limit=limit)
    for form in forms:
        form.response_count = len(form.responses)
    return forms

@app.post("/api/forms", response_model=schemas.Form)
def create_form(form: schemas.FormCreate, db: Session = Depends(get_db)):
    return crud.create_form(db=db, form=form)

@app.post("/api/forms/{form_id}/duplicate", response_model=schemas.Form)
def duplicate_form(form_id: str, db: Session = Depends(get_db)):
    copy = crud.duplicate_form(db, form_id=form_id)
    if copy is None:
        raise HTTPException(status_code=404, detail="Form not found")
    return copy

@app.get("/api/forms/{form_id}", response_model=schemas.Form)
def read_form(form_id: str, db: Session = Depends(get_db)):
    db_form = crud.get_form(db, form_id=form_id)
    if db_form is None:
        raise HTTPException(status_code=404, detail="Form not found")
    return db_form

@app.put("/api/forms/{form_id}", response_model=schemas.Form)
def update_form(form_id: str, form: schemas.FormUpdate, db: Session = Depends(get_db)):
    db_form = crud.update_form(db, form_id, form)
    if db_form is None:
        raise HTTPException(status_code=404, detail="Form not found")
    return db_form

@app.delete("/api/forms/{form_id}", response_model=schemas.Form)
def delete_form(form_id: str, db: Session = Depends(get_db)):
    db_form = crud.delete_form(db, form_id)
    if db_form is None:
        raise HTTPException(status_code=404, detail="Form not found")
    return db_form

@app.post("/api/forms/{form_id}/questions", response_model=schemas.Question)
def create_question_for_form(form_id: str, question: schemas.QuestionCreate, db: Session = Depends(get_db)):
    if crud.get_form(db, form_id) is None:
        raise HTTPException(status_code=404, detail="Form not found")
    return crud.create_question(db=db, form_id=form_id, question=question)

@app.put("/api/forms/{form_id}/questions/{question_id}", response_model=schemas.Question)
def update_question(form_id: str, question_id: str, question: schemas.QuestionUpdate, db: Session = Depends(get_db)):
    existing = crud.get_question(db, question_id)
    if existing is None or existing.form_id != form_id:
        raise HTTPException(status_code=404, detail="Question not found")
    db_question = crud.update_question(db, question_id, question)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return db_question

@app.delete("/api/forms/{form_id}/questions/{question_id}", response_model=schemas.Question)
def delete_question(form_id: str, question_id: str, db: Session = Depends(get_db)):
    existing = crud.get_question(db, question_id)
    if existing is None or existing.form_id != form_id:
        raise HTTPException(status_code=404, detail="Question not found")
    db_question = crud.delete_question(db, question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return db_question

@app.put("/api/forms/{form_id}/questions", response_model=List[schemas.Question])
def bulk_update_questions(form_id: str, questions: List[schemas.Question], db: Session = Depends(get_db)):
    form = crud.get_form(db, form_id)
    if form is None:
        raise HTTPException(status_code=404, detail="Form not found")
    question_ids = {question.id for question in form.questions}
    if len(questions) != len(question_ids) or {question.id for question in questions} != question_ids:
        raise HTTPException(status_code=422, detail="The reorder request must include each form question exactly once")
    updated = crud.update_questions_bulk(db, form_id, questions)
    if updated is None:
        raise HTTPException(status_code=422, detail="The reorder request contains invalid questions")
    return updated

@app.post("/api/forms/{form_id}/responses", response_model=schemas.Response)
def submit_response(form_id: str, response: schemas.ResponseCreate, db: Session = Depends(get_db)):
    form = crud.get_form(db, form_id)
    if form is None:
        raise HTTPException(status_code=404, detail="Form not found")
    if not form.is_published:
        raise HTTPException(status_code=404, detail="Form is not published")
    validate_response(form, response)
    return crud.create_response(db, form_id=form_id, response=response)

@app.put("/api/responses/{response_id}", response_model=schemas.Response)
def update_existing_response(response_id: str, response: schemas.ResponseCreate, db: Session = Depends(get_db)):
    existing = crud.get_response(db, response_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Response not found")
    validate_response(existing.form, response)
    db_res = crud.update_response(db, response_id=response_id, response_update=response)
    if not db_res:
        raise HTTPException(status_code=404, detail="Response not found")
    return db_res

@app.get("/api/forms/{form_id}/responses", response_model=List[schemas.Response])
def get_responses_for_form(form_id: str, db: Session = Depends(get_db)):
    return crud.get_responses(db, form_id=form_id)

@app.get("/api/forms/{form_id}/responses/csv")
def export_responses_csv(form_id: str, db: Session = Depends(get_db)):
    form = crud.get_form(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    responses = crud.get_responses(db, form_id)
    
    stream = io.StringIO()
    writer = csv.writer(stream)
    
    # Header
    header = ["Response ID", "Submitted At", "Is Completed"]
    question_map = {q.id: q.title for q in form.questions}
    header.extend([q.title for q in form.questions])
    writer.writerow(header)
    
    # Rows
    for resp in responses:
        row = [resp.id, resp.submitted_at.isoformat(), resp.is_completed]
        answers_dict = {a.question_id: a.value for a in resp.answers}
        for q in form.questions:
            row.append(answers_dict.get(q.id, ""))
        writer.writerow(row)
    
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=form_{form_id}_responses.csv"
    return response

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
