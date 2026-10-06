from sqlalchemy.orm import Session
import models, schemas
from uuid import uuid4
import json

def get_forms(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Form).offset(skip).limit(limit).all()

def get_form(db: Session, form_id: str):
    return db.query(models.Form).filter(models.Form.id == form_id).first()

def get_question(db: Session, question_id: str):
    return db.query(models.Question).filter(models.Question.id == question_id).first()

def get_response(db: Session, response_id: str):
    return db.query(models.Response).filter(models.Response.id == response_id).first()

def create_form(db: Session, form: schemas.FormCreate):
    db_form = models.Form(**form.model_dump())
    db.add(db_form)
    db.commit()
    db.refresh(db_form)
    return db_form

def update_form(db: Session, form_id: str, form_update: schemas.FormUpdate):
    db_form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if db_form:
        update_data = form_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_form, key, value)
        db.commit()
        db.refresh(db_form)
    return db_form

def delete_form(db: Session, form_id: str):
    db_form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if db_form:
        db.delete(db_form)
        db.commit()
    return db_form

def duplicate_form(db: Session, form_id: str):
    source = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not source:
        return None
    copy = models.Form(
        title=f"{source.title} (copy)",
        is_published=False,
        theme=source.theme,
    )
    db.add(copy)
    db.flush()
    for q in source.questions:
        db.add(models.Question(
            form_id=copy.id,
            type=q.type,
            title=q.title,
            description=q.description,
            is_required=q.is_required,
            order=q.order,
            settings=q.settings,
        ))
    db.commit()
    db.refresh(copy)
    return copy

def create_question(db: Session, form_id: str, question: schemas.QuestionCreate):
    db_question = models.Question(**question.model_dump(), form_id=form_id)
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

def update_question(db: Session, question_id: str, question_update: schemas.QuestionUpdate):
    db_question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if db_question:
        update_data = question_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_question, key, value)
        db.commit()
        db.refresh(db_question)
    return db_question

def delete_question(db: Session, question_id: str):
    db_question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if db_question:
        db.delete(db_question)
        db.commit()
    return db_question

def update_questions_bulk(db: Session, form_id: str, questions: list[schemas.Question]):
    existing_questions = {q.id: q for q in db.query(models.Question).filter(models.Question.form_id == form_id).all()}

    if len(questions) != len(existing_questions) or {question.id for question in questions} != set(existing_questions):
        return None

    for question in questions:
        db_question = existing_questions[question.id]
        for field in ("type", "title", "description", "is_required", "order", "settings"):
            setattr(db_question, field, getattr(question, field))

    db.commit()
    return sorted(existing_questions.values(), key=lambda question: question.order)

def create_response(db: Session, form_id: str, response: schemas.ResponseCreate):
    db_response = models.Response(form_id=form_id, is_completed=response.is_completed)
    db.add(db_response)
    db.commit()
    db.refresh(db_response)
    
    if response.answers:
        for answer_in in response.answers:
            db_answer = models.Answer(
                response_id=db_response.id,
                question_id=answer_in.question_id,
                value=answer_in.value
            )
            db.add(db_answer)
        db.commit()
        db.refresh(db_response)
    return db_response

def update_response(db: Session, response_id: str, response_update: schemas.ResponseCreate):
    db_response = db.query(models.Response).filter(models.Response.id == response_id).first()
    if not db_response:
        return None
    db_response.is_completed = response_update.is_completed
    db.query(models.Answer).filter(models.Answer.response_id == response_id).delete()
    for answer_in in response_update.answers or []:
        db_answer = models.Answer(
            response_id=db_response.id,
            question_id=answer_in.question_id,
            value=answer_in.value
        )
        db.add(db_answer)
    db.commit()
    db.refresh(db_response)
    return db_response

def get_responses(db: Session, form_id: str):
    return db.query(models.Response).filter(models.Response.form_id == form_id).all()
