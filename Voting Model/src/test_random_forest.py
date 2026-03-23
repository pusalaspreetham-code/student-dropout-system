import pickle
import pandas as pd

# 1️⃣ Load model
model = pickle.load(open("Voting Model/model/voting_model.pkl", "rb"))

print("Model loaded successfully!")

# 2️⃣ Example student data 
data = {
    "attendance": [100],
    "marks": [40],
    "study_hours": [2],
    "distance_from_home": [10],
    "annual_income": [300000],
    "previous_marks": [45],
    "backlogs": [2],
    "assignments_completed": [80],
    "participation": [3]
}

df = pd.DataFrame(data)

# 3️⃣ Prediction
prediction = model.predict(df)[0]

# 4️⃣ Risk percentage
probability = model.predict_proba(df)[0][1]
risk_percent = probability * 100

# 5️⃣ Risk level
if risk_percent < 40:
    risk_level = "Low"
elif risk_percent < 70:
    risk_level = "Medium"
else:
    risk_level = "High"

# 6️⃣ Output
print("\n----- Prediction Result -----\n")

print("Dropout Prediction:", prediction)

if prediction == 1:
    print("Status: Likely to Dropout")
else:
    print("Status: Not Likely to Dropout")

print(f"Risk Percentage: {risk_percent:.2f}%")
print("Risk Level:", risk_level)

print("\n-----------------------------")