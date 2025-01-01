#!/bin/bash
start powershell -NoExit -Command "cd backend; ../backend/venv/Scripts/activate; python app.py"
start powershell -NoExit -Command "cd frontend; npm start"
