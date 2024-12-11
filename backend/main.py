# Using FAST API instead of Django

from contextlib import asynccontextmanager
from fastapi import FastAPI     # type: ignore #Fastapi: SPI Server
from fastapi.middleware.cors import CORSMiddleware # type: ignore
import uvicorn      # type: ignore #Uvicorn: To run server
from constants import SERVER_URL, PORT, ENV
from apps.calculator.route import router as calculator_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],    #Vite frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
async def health():
    return {'message': 'Server is running'}

app.include_router(calculator_router, prefix='/calculate', tags=['calculate'])

# Use the below only for local machine (Its not for deployment)
# if __name__ == '__main__':
#     uvicorn.run('main:app', host=SERVER_URL, port=int(PORT), reload=(ENV == 'dev'))

