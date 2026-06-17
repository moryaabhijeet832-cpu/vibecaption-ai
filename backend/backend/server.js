import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "VibeCaption AI backend is running"
  });
});

app.post("/generate", async (req, res) => {
  try {
    const { photoIdea, mood, language, postType, audience } = req.body;

    if (!photoIdea || photoIdea.trim() === "") {
      return res.status(400).json({
        error: "Please describe your photo or post idea."
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "Groq API key is missing on server."
      });
    }

    const prompt = `
You are an expert Instagram content creator.

Create content for this Instagram post:

Photo/Post idea: ${photoIdea}
Mood/Vibe: ${mood || "Stylish"}
Language: ${language || "Hinglish"}
Post type: ${postType || "Instagram Post"}
Audience: ${audience || "Indian Instagram audience"}

Give output in this exact format:

1. Best Caption:
2. 5 Short Captions:
3. 10 Hashtags:
4. 5 Song Suggestions:
5. Reel Hook:
6. Story Text:
7. Call To Action:

Keep the content trendy, natural, viral-style and not too robotic.
`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You create high-quality Instagram captions, hashtags, reel hooks and song suggestions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_completion_tokens: 900
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "AI API error"
      });
    }

    const result = data.choices?.[0]?.message?.content || "No result generated.";

    res.json({ result });

  } catch (error) {
    res.status(500).json({
      error: "Server error. Please try again."
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
