async function login() {
    const admission_id = document.getElementById("admission_id").value;
    const date_of_birth = document.getElementById("date_of_birth").value;

    const res = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            admission_id,
            date_of_birth: date_of_birth
        })
    });

    const data = await res.json();

    if (!res.ok) {
        document.getElementById("error").innerText = data.message;
        return;
    }

    localStorage.setItem("studentData", JSON.stringify(data));
    window.location.href = "dashboard.html";
}