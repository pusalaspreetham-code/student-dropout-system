# 🎓 Student Dropout Prediction System

## 📌 Overview

This project is a **full-stack machine learning application** designed to predict whether a student is at risk of dropping out. It integrates a machine learning model with a backend server and frontend interface to provide real-time predictions.

---

## 🚀 Features

* Predict student dropout risk using ML model
* Store and manage student data
* REST API integration between backend and ML model
* User-friendly frontend dashboard
* Real-time prediction results

---

## 🛠️ Tech Stack

### 🔹 Machine Learning

* Python
* Pandas, NumPy

### 🔹 Backend

* Node.js
* Express.js

### 🔹 Database

* PostgreSQL

### 🔹 Frontend

* HTML, CSS, JavaScript

---

## 📂 Project Structure

```
project/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── db.js
│   ├── server.js
│   └── package.json
│
├── frontend/
│
├── ml_api/
│   ├── app.py
│   ├── model.pkl
│   └── requirements.txt
│
├── .gitignore
├── README.md
```

---

## ⚙️ Installation & Setup

### 🔹 1. Clone the repository

```
git clone https://github.com/pusalaspreetham-code/student-dropout-system.git
cd student-dropout-system
```

---

### 🔹 2. Setup Backend

```
cd backend
npm install
npm start
```

---

### 🔹 3. Setup ML API

```
cd ml_api
pip install -r requirements.txt
python app.py
```

---

### 🔹 4. Open Frontend

* Open `frontend/index.html` in browser

---

## 🧠 How It Works

1. User enters student details in frontend
2. Data is sent to backend (Node.js)
3. Backend calls ML API (Python Flask)
4. ML model predicts dropout risk
5. Result is sent back and displayed

---

## 📊 Model Details

* Algorithm: Random Forest (or your model)
* Model stored as: `model.pkl`
* Used for fast predictions without retraining

---

## 🔐 Environment Variables

Create a `.env` file in backend:

```
DB_USER=your_username
DB_PASSWORD=your_password
DB_HOST=localhost
```

---

## 🎯 Future Improvements

* Deploy application to cloud (AWS / Render)
* Improve model accuracy with more data
* Add authentication system
* Build React-based frontend

Preetham Pusala
