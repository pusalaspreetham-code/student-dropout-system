from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

model = pickle.load(open("../Voting Model/model/voting_model.pkl", "rb"))

# -------- FEATURE LIST (FROM VERSION 1) --------
FEATURES = [
    "attendance",
    "marks",
    "study_hours",
    "distance_from_home",
    "annual_income",
    "previous_marks",
    "backlogs",
    "assignments_completed",
    "participation"
]


# -------- MAIN PREDICT (MERGED SAFE VERSION) --------
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        print("Received data:", data)   # from version 2

        df = pd.DataFrame([data])

        # -------- CLEANING (VERSION 1) --------
        df = df.drop(columns=["name", "student_id"], errors="ignore")

        # -------- FORCE CORRECT FEATURE ORDER --------
        df = df[FEATURES]

        # -------- MODEL PREDICTION --------
        prediction = model.predict(df)[0]
        probability = model.predict_proba(df)[0][1]

        risk_percent = probability * 100

        if risk_percent < 40:
            level = "Low"
        elif risk_percent < 70:
            level = "Medium"
        else:
            level = "High"

        return jsonify({
            "prediction": int(prediction),
            "risk_percent": risk_percent,
            "risk_level": level
        })

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"error": str(e)}), 400


# -------- SERVER START (ONLY ONCE) --------
if __name__ == "__main__":
    app.run(port=5000)