import express, { RequestHandler } from "express";
import Inspekt from "./core.js";
import inspektExpress from "./adapters/express.js";

const inspekt = new Inspekt({
    apiKey: "ins_live_ttjthtjhthhtththhtjtjthnnjjjjjjj",
    analysisMode: "always",
    redactKeys: ["x-api-key"],
});

// inspekt.analyze({ url: "https://jsonplaceholder.typicode.com/posts/1", method: "GET", status: 200 })
// inspekt.handleBackgroundAnalysis();


const port = 4000;
const app = express();

app.use(express.json());
app.use(inspektExpress(inspekt));

app.post("/test", async (req, res) => {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/posts/1", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        return res.json(await response.json());
    } catch (err) {
        return res.send("Failed");
    }
});


app.listen(port, () => console.log("listening"))
