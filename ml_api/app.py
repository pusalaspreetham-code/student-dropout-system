from flask import Flask, request, jsonify
import pickle
import pandas as pd

app = Flask(__name__)

model = pickle.load(open("../Voting Model/model/voting_model.pkl", "rb"))

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()   

        print("Received data:", data) 

        df = pd.DataFrame([data])

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

app.run(port=5000)