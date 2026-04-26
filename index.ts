import express, { Request, Response } from "express";
import cors from "cors";

const app = express();

app.set("trust proxy", true);
app.use(cors());

app.get("/api/get-ip", (req: Request, res: Response) => {
	res.json({ ip: req.ip });
});

const port: string | number = process.env.PORT || 8080;

app.listen(port, () => {
	console.log(`[ OK ] Server listening on http://localhost:${port}`);
});
