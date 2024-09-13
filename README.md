An audio-to-text generator with timestamp
![image](https://github.com/user-attachments/assets/155ff819-e206-410e-b9ab-51d7cf27e461)

## Features
- Speech to text converstion with timestamp
- Utilizing [whisper](https://github.com/openai/whisper) for generating text
- Using GPU accelaration for faster processing

## Project requirements
Node version **20** or higher is required for the frontend, and Python version **3.10** or higher is required for the backend to run this project. The project could also work on a smaller version. Minimum **8GB** GPU VRAM is required. 

## How to run frontend
- Go to the frontend directory
- create `.env` file
- Copy everything from the `.env.example` file
- Assign values
- Run npm i and then npm run dev
- To run this project in production mode, first build the project using npm run build, and then use npm run preview to run.

There is a `VITE_BACKEND_URL` variable in the .env file. The value of that variable will be the base url of the backend. For example, if the backend runs on http://localhost:8000, the value of the `VITE_BACKEND_URL` variable will be http://localhost:8000

## How to run backend
- Go to the backend directory
- Assign values
- run `python -m venv venv` and `.\venv\Scripts\activate` to create a new virtual environment and activate it (for windows OS)
- Run `pip install -r requirements.txt` to install all the dependencies
- Run `fastapi dev main.py` for run

Project demo: [Link]()
