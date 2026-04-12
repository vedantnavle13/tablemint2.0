from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import analyzer


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("ML service ready on port 5001")
    print("Docs at http://localhost:5001/docs")
    yield
    print("ML service shutting down")


app = FastAPI(
    title="TableMint ML Service",
    version="1.0.0",
    lifespan=lifespan
)


class SingleRequest(BaseModel):
    text: str


class BatchRequest(BaseModel):
    reviews: list[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze-single")
def analyze_single(req: SingleRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    return analyzer.analyze_review(req.text)


@app.post("/analyze-batch")
def analyze_batch(req: BatchRequest):
    if not req.reviews:
        raise HTTPException(status_code=400, detail="reviews array is required")
    return analyzer.analyze_batch(req.reviews)