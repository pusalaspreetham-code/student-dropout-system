import pandas as pd
import pickle
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report
import matplotlib.pyplot as plt

# 1️⃣ Load dataset
df = pd.read_csv("Voting Model/data/rf_student_dropout_dataset.csv")

print("Dataset loaded successfully!")
print(df.head())

# 2️⃣ Separate features and target
X = df.drop("dropout", axis=1)
y = df["dropout"]

# 3️⃣ Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 4️⃣ Models
rf = RandomForestClassifier(n_estimators=100, random_state=42)
xgb = XGBClassifier(use_label_encoder=False, eval_metric='logloss')

# 🔥 FIXED Logistic Regression
lr = LogisticRegression(max_iter=1000)

# 5️⃣ Voting Model
model = VotingClassifier(
    estimators=[
        ('rf', rf),
        ('xgb', xgb),
        ('lr', lr)
    ],
    voting='soft'
)

# 6️⃣ Train
model.fit(X_train, y_train)

print("\nModel trained!")

# 7️⃣ Predictions
y_pred = model.predict(X_test)

# 🔥 Probability → Risk %
y_prob = model.predict_proba(X_test)[:, 1]
y_risk_percent = y_prob * 100

# 🔥 Risk Levels
risk_levels = []

for prob in y_risk_percent:
    if prob < 40:
        risk_levels.append("Low")
    elif prob < 70:
        risk_levels.append("Medium")
    else:
        risk_levels.append("High")

# 8️⃣ Accuracy
accuracy = accuracy_score(y_test, y_pred)
print("\nAccuracy:", accuracy)

print("\nClassification Report:\n")
print(classification_report(y_test, y_pred))

# 🔥 9️⃣ PRINT EVERYTHING CLEANLY
print("\nSample Predictions with Risk Levels:\n")

for i in range(10):
    print(
        f"Actual: {y_test.iloc[i]} | "
        f"Predicted: {y_pred[i]} | "
        f"Risk: {y_risk_percent[i]:.2f}% | "
        f"Level: {risk_levels[i]}"
    )

# 🔟 Save model
pickle.dump(model, open("Voting Model/model/voting_model.pkl", "wb"))

print("\nModel saved successfully!")

# 11️⃣ Plot
plt.figure()

plt.scatter(range(len(y_test)), y_test, label="Actual", alpha=0.7)
plt.scatter(range(len(y_pred)), y_pred, label="Predicted", alpha=0.7)

plt.xlabel("Sample Index")
plt.ylabel("Dropout (0 or 1)")
plt.title("Actual vs Predicted")
plt.legend()

plt.show()