import torch
import spacy
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
import torch.nn.functional as F

def get_device():
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return 0
    return -1

DEVICE = get_device()
DEVICE_OBJ = torch.device("mps" if DEVICE == "mps" else ("cuda" if DEVICE == 0 else "cpu"))

# Aspects already covered by your star ratings — skip these in ABSA
STRUCTURED_ASPECTS = {"food", "service", "ambience"}

# Threshold — only run ABSA on comments longer than this
ABSA_MIN_LENGTH = 40

# ── Lazy-loaded model singletons ──────────────────────────────────────────────
_nlp = None
_sentiment_pipeline = None
_absa_tokenizer = None
_absa_model = None


def get_nlp():
    global _nlp
    if _nlp is None:
        print("[ML] Loading spaCy model...")
        _nlp = spacy.load("en_core_web_sm")
        print("[ML] spaCy ready")
    return _nlp


def get_sentiment_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        print("[ML] Loading sentiment model (cardiffnlp/twitter-roberta-base-sentiment-latest)...")
        _sentiment_pipeline = pipeline(
            "text-classification",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            device=DEVICE,
            dtype=torch.float16 if DEVICE != -1 else torch.float32,
        )
        print("[ML] Sentiment model ready")
    return _sentiment_pipeline


def get_absa_model():
    global _absa_tokenizer, _absa_model
    if _absa_tokenizer is None or _absa_model is None:
        print("[ML] Loading ABSA model (yangheng/deberta-v3-base-absa-v1.1) — ~738 MB, first run only...")
        model_name = "yangheng/deberta-v3-base-absa-v1.1"
        _absa_tokenizer = AutoTokenizer.from_pretrained(model_name)
        _absa_model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if DEVICE != -1 else torch.float32,
        ).to(DEVICE_OBJ)
        _absa_model.eval()
        print("[ML] ABSA model ready")
    return _absa_tokenizer, _absa_model


print(f"[ML] Device selected: {DEVICE_OBJ} | Models will load on first request")

LABEL_MAP = {
    "positive": "POSITIVE",
    "negative": "NEGATIVE",
    "neutral":  "NEUTRAL"
}

# DeBERTa ABSA label order: [negative, neutral, positive]
ABSA_ID2LABEL = {0: "NEGATIVE", 1: "NEUTRAL", 2: "POSITIVE"}


def extract_unstructured_aspects(text: str) -> list[str]:
    doc = get_nlp()(text.lower())
    aspects = [chunk.root.text for chunk in doc.noun_chunks]
    return [
        a for a in set(aspects)
        if a not in STRUCTURED_ASPECTS and len(a) > 2
    ]


def run_sentiment(text: str) -> dict:
    with torch.no_grad():
        result = get_sentiment_pipeline()(text[:512], truncation=True, padding=True)[0]
    return {
        "label": LABEL_MAP.get(result["label"].lower(), "NEUTRAL"),
        "score": round(result["score"], 4)
    }


def run_absa(text: str, aspects: list[str]) -> list[dict]:
    """
    Uses the raw tokenizer + model directly to properly handle text_pair
    (sentence + aspect) classification. Much more stable than pipeline().
    """
    tokenizer, model = get_absa_model()
    results = []
    with torch.no_grad():
        for aspect in aspects[:8]:
            try:
                inputs = tokenizer(
                    text[:400],           # sentence
                    aspect,               # aspect as text_pair
                    return_tensors="pt",
                    truncation=True,
                    max_length=512,
                    padding=True,
                ).to(DEVICE_OBJ)

                logits = model(**inputs).logits          # shape [1, 3]
                probs  = F.softmax(logits, dim=-1)[0]   # [neg, neu, pos]
                pred_idx = probs.argmax().item()

                results.append({
                    "aspect":    aspect,
                    "sentiment": ABSA_ID2LABEL[pred_idx],
                    "score":     round(probs[pred_idx].item(), 3),
                })
            except Exception as e:
                print(f"[ML] ABSA failed for aspect '{aspect}': {e}")
                # skip this aspect but continue with others
    return results


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
        return {"sentiment_label": "NEUTRAL", "sentiment_score": 0.5, "aspects": []}

    aspects = []
    if len(text.strip()) >= ABSA_MIN_LENGTH:
        try:
            unstructured = extract_unstructured_aspects(text)
            if unstructured:
                aspects = run_absa(text, unstructured)
        except Exception as e:
            print(f"[ML] ABSA extraction failed: {e}")
            # aspects stay []

    return {
        "sentiment_label": sentiment["label"],
        "sentiment_score": sentiment["score"],
        "aspects": aspects
    }


def analyze_batch(reviews: list[str]) -> dict:
    if not reviews:
        return {
            "total": 0,
            "positive_pct": 0,
            "negative_pct": 0,
            "neutral_pct": 0,
            "aspect_summary": []
        }

    counts = {"POSITIVE": 0, "NEGATIVE": 0, "NEUTRAL": 0}
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
            aspect_map[key]["total"] += 1

    total = sum(counts.values())

    aspect_summary = []
    for aspect, data in sorted(
        aspect_map.items(),
        key=lambda x: x[1]["total"],
        reverse=True
    )[:10]:
        aspect_summary.append({
            "aspect": aspect,
            "total_mentions": data["total"],
            "positive_pct": round(data["POSITIVE"] / data["total"] * 100),
            "negative_pct": round(data["NEGATIVE"] / data["total"] * 100),
        })

    return {
        "total": total,
        "positive_pct": round(counts["POSITIVE"] / total * 100) if total else 0,
        "negative_pct": round(counts["NEGATIVE"] / total * 100) if total else 0,
        "neutral_pct":  round(counts["NEUTRAL"]  / total * 100) if total else 0,
        "aspect_summary": aspect_summary
    }

