import sys
import os
from datetime import datetime, timedelta

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
import models
import schemas
import crud

FORM1_RESPONSES = [
    {"name": "Alice Johnson", "rating": "5", "choice": "Speed", "comments": "Loved how fast everything was!"},
    {"name": "Bob Smith", "rating": "4", "choice": "Quality", "comments": ""},
    {"name": "Carol White", "rating": "5", "choice": "Support", "comments": "The support team was amazing."},
    {"name": "David Lee", "rating": "3", "choice": "Price", "comments": ""},
    {"name": "Emma Davis", "rating": "5", "choice": "Quality", "comments": "Great product overall."},
    {"name": "Frank Miller", "rating": "2", "choice": "Speed", "comments": ""},
    {"name": "Grace Kim", "rating": "4", "choice": "Quality", "comments": "Solid experience."},
]

FORM2_RESPONSES = [
    {"email": "jane@example.com", "plus_one": "Yes"},
    {"email": "john@example.com", "plus_one": "No"},
    {"email": "sam@example.com", "plus_one": "Yes"},
    {"email": "tina@example.com", "plus_one": "No"},
    {"email": "raj@example.com", "plus_one": "Yes"},
]


def seed_form_response(db, form, answers_by_title, offset_hours: float):
    response_in = schemas.ResponseCreate(
        answers=[schemas.AnswerCreate(question_id=qid, value=val) for qid, val in answers_by_title],
        is_completed=True,
    )
    response = crud.create_response(db, form.id, response_in)
    response.submitted_at = datetime.now(datetime.UTC) - timedelta(hours=offset_hours)
    db.commit()


def seed():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    existing = {f.title: f for f in crud.get_forms(db)}
    created_something = False

    # Form 1: Customer Feedback
    form1 = existing.get("Customer Feedback Survey")
    if not form1:
        form1 = crud.create_form(db, schemas.FormCreate(title="Customer Feedback Survey", is_published=True))

        crud.create_question(db, form1.id, schemas.QuestionCreate(
            type=models.QuestionType.short_text,
            title="What's your name?",
            order=0,
            is_required=True
        ))

        crud.create_question(db, form1.id, schemas.QuestionCreate(
            type=models.QuestionType.rating,
            title="How would you rate our service?",
            order=1,
            is_required=True
        ))

        crud.create_question(db, form1.id, schemas.QuestionCreate(
            type=models.QuestionType.multiple_choice,
            title="What did you like the most?",
            description="Select one option.",
            order=2,
            is_required=False,
            settings={"choices": ["Speed", "Quality", "Price", "Support"]}
        ))

        crud.create_question(db, form1.id, schemas.QuestionCreate(
            type=models.QuestionType.long_text,
            title="Any other comments?",
            order=3,
            is_required=False
        ))
        created_something = True

    q1 = {q.title: q.id for q in form1.questions}
    if crud.get_responses(db, form1.id) == [] and len(q1) == 4:
        for i, r in enumerate(FORM1_RESPONSES):
            seed_form_response(db, form1, [
                (q1["What's your name?"], r["name"]),
                (q1["How would you rate our service?"], r["rating"]),
                (q1["What did you like the most?"], r["choice"]),
                *([(q1["Any other comments?"], r["comments"])] if r["comments"] else []),
            ], offset_hours=i * 5 + 1)
        print(f"Seeded {len(FORM1_RESPONSES)} responses for 'Customer Feedback Survey'.")

    # Form 2: Event Registration
    form2 = existing.get("Tech Meetup Registration")
    if not form2:
        form2 = crud.create_form(db, schemas.FormCreate(title="Tech Meetup Registration", is_published=True))

        crud.create_question(db, form2.id, schemas.QuestionCreate(
            type=models.QuestionType.email,
            title="What is your email address?",
            order=0,
            is_required=True
        ))

        crud.create_question(db, form2.id, schemas.QuestionCreate(
            type=models.QuestionType.yes_no,
            title="Will you be bringing a plus one?",
            order=1,
            is_required=True
        ))
        created_something = True

    q2 = {q.title: q.id for q in form2.questions}
    if crud.get_responses(db, form2.id) == [] and len(q2) == 2:
        for i, r in enumerate(FORM2_RESPONSES):
            seed_form_response(db, form2, [
                (q2["What is your email address?"], r["email"]),
                (q2["Will you be bringing a plus one?"], r["plus_one"]),
            ], offset_hours=i * 8 + 2)
        print(f"Seeded {len(FORM2_RESPONSES)} responses for 'Tech Meetup Registration'.")

    if created_something:
        print("Seed data successfully inserted.")
    elif not created_something:
        print("Database already seeded.")


if __name__ == "__main__":
    seed()
