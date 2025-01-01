@echo off

:: Check if the virtual environment exists for the backend
if not exist C:\Users\Sam\fresh-backend\backend\venv (
    echo Virtual environment not found for backend. Creating...
    cd /d C:\Users\Sam\fresh-backend\backend
    python -m venv venv
)

:: Activate backend venv and run the backend
start cmd /k "cd /d C:\Users\Sam\fresh-backend\backend && ..\backend\venv\Scripts\activate && python app.py"

:: Start frontend (no need to check for venv here as it’s not required for npm)
start cmd /k "cd /d C:\Users\Sam\fresh-backend\frontend && npm start"
