import pandas as pd
import numpy as np

np.random.seed(42)

n = 5000

data = {
    "attendance": np.random.randint(30, 100, n),
    "marks": np.random.randint(30, 100, n),
    "study_hours": np.random.randint(1, 8, n),
    "distance_from_home": np.random.randint(1, 20, n),
    "annual_income": np.random.randint(100000, 1000000, n),
    "previous_marks": np.random.randint(30, 100, n),
    "backlogs": np.random.randint(0, 5, n),
    "assignments_completed": np.random.randint(40, 100, n),
    "participation": np.random.randint(1, 10, n)
}

df = pd.DataFrame(data)

# -----------------------------
# Strong structured logic
# -----------------------------

score = np.zeros(n)

# Strong signals
score += (df["attendance"] < 60) * 3
score += (df["marks"] < 50) * 3
score += (df["backlogs"] > 2) * 2

# Medium signals
score += (df["study_hours"] < 2) * 1
score += (df["previous_marks"] < 50) * 1

# Weak signals
score += (df["assignments_completed"] < 60) * 1
score += (df["participation"] < 4) * 1

# Very small noise
score += np.random.randint(0, 2, n)

# Final decision
df["dropout"] = (score >= 5).astype(int)

# VERY small label noise (1%)
flip = np.random.choice(n, size=int(0.01 * n), replace=False)
df.loc[flip, "dropout"] = 1 - df.loc[flip, "dropout"]

# Save
df.to_csv("Voting Model/data/rf_student_dropout_dataset.csv", index=False)

print("Dataset ready!")