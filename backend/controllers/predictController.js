const axios = require("axios");

exports.predict = async (req, res) => {
    console.log("Sending data to ML:", req.body);

    try {
        const response = await axios.post(
            "http://127.0.0.1:5000/predict",
            req.body,
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        res.json(response.data);

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).send("Prediction error");
    }
};

