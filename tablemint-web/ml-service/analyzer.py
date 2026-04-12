import os
import requests
import spacy
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

HF_TOKEN = os.getenv("HF_TOKEN")
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}


nlp = spacy.load("en_core_web_sm")

SENTIMENT_URL = "https://router.huggingface.co/hf-inference/models/cardiffnlp/twitter-roberta-base-sentiment-latest"
ABSA_URL      = "https://router.huggingface.co/hf-inference/models/yangheng/deberta-v3-base-absa-v1.1"

STRUCTURED_ASPECTS = {"food", "service", "ambience", "nightmare", "place", "thing", "lot", "way", "time"}
ABSA_MIN_LENGTH    = 40

LABEL_MAP = {
    "positive": "POSITIVE",
    "negative": "NEGATIVE",
    "neutral":  "NEUTRAL",
    "label_0":  "NEGATIVE",
    "label_1":  "NEUTRAL",
    "label_2":  "POSITIVE"
}


def run_sentiment(text: str) -> dict:
    response = requests.post(
        SENTIMENT_URL,
        headers=HEADERS,
        json={"inputs": text[:512]},
        timeout=30
    )
    data = response.json()

    if isinstance(data, list) and isinstance(data[0], list):
        top = max(data[0], key=lambda x: x["score"])
        return {
            "label": LABEL_MAP.get(top["label"].lower(), "NEUTRAL"),
            "score": round(top["score"], 4)
        }

    if isinstance(data, list) and isinstance(data[0], dict):
        top = max(data, key=lambda x: x["score"])
        return {
            "label": LABEL_MAP.get(top["label"].lower(), "NEUTRAL"),
            "score": round(top["score"], 4)
        }

    raise ValueError(f"Unexpected sentiment response: {data}")


def run_absa(text: str, aspect: str) -> dict:
    response = requests.post(
        ABSA_URL,
        headers=HEADERS,
        json={
            "inputs": [
                {
                    "text":      text[:400],
                    "text_pair": aspect
                }
            ]
        },
        timeout=30
    )
    data = response.json()


    if isinstance(data, list) and isinstance(data[0], list):
        top = max(data[0], key=lambda x: x["score"])
        return {
            "aspect":    aspect,
            "sentiment": LABEL_MAP.get(top["label"].lower(), "NEUTRAL"),
            "score":     round(top["score"], 3)
        }

    if isinstance(data, list) and isinstance(data[0], dict):
        top = max(data, key=lambda x: x["score"])
        return {
            "aspect":    aspect,
            "sentiment": LABEL_MAP.get(top["label"].lower(), "NEUTRAL"),
            "score":     round(top["score"], 3)
        }

    return {"aspect": aspect, "sentiment": "NEUTRAL", "score": 0.5}


def extract_unstructured_aspects(text: str) -> list[str]:
    doc = nlp(text.lower())
    aspects = [chunk.root.text for chunk in doc.noun_chunks]
    return [
        a for a in set(aspects)
        if a not in STRUCTURED_ASPECTS and len(a) > 2
    ]


def analyze_review(text: str) -> dict:
    if not text or len(text.strip()) < 5:
        return {
            "sentiment_label": "NEUTRAL",
            "sentiment_score": 0.5,
            "aspects": []
        }

    try:
        sentiment = run_sentiment(text)
    except Exception as e:
        print(f"[ML] Sentiment failed: {e}")
        sentiment = {"label": "NEUTRAL", "score": 0.5}

    aspects = []
    if len(text.strip()) >= ABSA_MIN_LENGTH:
        try:
            unstructured = extract_unstructured_aspects(text)
            for aspect in unstructured[:8]:
                result = run_absa(text, aspect)
                aspects.append(result)
        except Exception as e:
            print(f"[ML] ABSA failed: {e}")

    return {
        "sentiment_label": sentiment["label"],
        "sentiment_score": sentiment["score"],
        "aspects":         aspects
    }


def analyze_batch(reviews: list[str]) -> dict:
    if not reviews:
        return {
            "total":          0,
            "positive_pct":   0,
            "negative_pct":   0,
            "neutral_pct":    0,
            "aspect_summary": []
        }

    counts     = {"POSITIVE": 0, "NEGATIVE": 0, "NEUTRAL": 0}
    aspect_map: dict[str, dict] = {}

    for text in reviews:
        if not text or len(text.strip()) < 5:
            continue

        result = analyze_review(text)
        counts[result["sentiment_label"]] += 1

        for a in result["aspects"]:
            key = a["aspect"]
            if key not in aspect_map:
                aspect_map[key] = {"POSITIVE": 0, "NEGATIVE": 0, "NEUTRAL": 0, "total": 0}
            aspect_map[key][a["sentiment"]] += 1
            aspect_map[key]["total"]        += 1

    total = sum(counts.values())

    aspect_summary = []
    for aspect, data in sorted(
        aspect_map.items(),
        key=lambda x: x[1]["total"],
        reverse=True
    )[:10]:
        aspect_summary.append({
            "aspect":         aspect,
            "total_mentions": data["total"],
            "positive_pct":   round(data["POSITIVE"] / data["total"] * 100),
            "negative_pct":   round(data["NEGATIVE"] / data["total"] * 100),
        })

    return {
        "total":          total,
        "positive_pct":   round(counts["POSITIVE"] / total * 100) if total else 0,
        "negative_pct":   round(counts["NEGATIVE"] / total * 100) if total else 0,
        "neutral_pct":    round(counts["NEUTRAL"]  / total * 100) if total else 0,
        "aspect_summary": aspect_summary
    }