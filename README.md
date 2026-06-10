# Memora

Memora is a study assistant built with Django REST Framework and React/Vite. It manages
PDF courses, AI summaries and flashcards, quizzes, revision planning, and To-Dos.

## Local setup

### Backend

```bash
cd Backend
python -m venv venv
./venv/bin/pip install -r requirements.txt
cp .env.example .env
./venv/bin/python manage.py migrate
./venv/bin/python manage.py runserver
```

Set `GROQ_API_KEY` before using AI generation. During local development, the console
email backend prints account verification and password-reset links in the backend
terminal. For production, configure SMTP using `EMAIL_HOST_USER`,
`EMAIL_HOST_PASSWORD`, and `DEFAULT_FROM_EMAIL`.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Validation

```bash
cd Backend
./venv/bin/python manage.py test
./venv/bin/python manage.py check

cd ../frontend
npm run lint
npm run build
```

## Production

Set `DJANGO_DEBUG=false`, a long random `DJANGO_SECRET_KEY`, the deployed hosts and
CORS origins, and `VITE_API_ORIGIN`. Uploaded PDFs are served only through an
authenticated API endpoint; configure persistent private media storage for deployment.
