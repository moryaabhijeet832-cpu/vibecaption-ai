import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "6mb" }));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "VibeCaption AI backend is running"
  });
});

app.post("/generate", async (req, res) => {
  try {
    const {
      photoIdea,
      mood,
      language,
      postType,
      audience,
      imageBase64,
      imageMimeType
    } = req.body;

    const cleanIdea = photoIdea?.trim() || "";

    const cleanImageBase64 = imageBase64
      ? imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "")
      : "";

    if (!cleanIdea && !cleanImageBase64) {
      return res.status(400).json({
        error: "Please write something or upload a photo."
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "Groq API key is missing on server."
      });
    }

    const hasImage = !!cleanImageBase64;

    const promptText = `
You are an expert Instagram content creator.

Create Instagram content based on the user's input.

If an image is provided, carefully analyze:
- outfit
- location/background
- mood/vibe
- colors
- pose/body language
- objects/details visible
- possible theme of the post

User text description: ${cleanIdea || "No extra description provided"}
Mood/Vibe: ${mood || "Stylish"}
Language: ${language || "Hinglish"}
Post type: ${postType || "Instagram Post"}
Audience: ${audience || "Indian Instagram audience"}

Return output in this exact format:

1. Best Caption:
2. 5 Short Captions:
3. 10 Hashtags:
4. 5 Song Suggestions:
5. Reel Hook:
6. Story Text:
7. Call To Action:

Rules:
- Start directly with "1. Best Caption:"
- Do not write any intro like "Here is the Instagram content".
- Do not use markdown bold symbols like **.
- Do not use backticks.
- Keep section numbers exactly 1 to 7.
- Do not include hashtags inside Best Caption or Short Captions. Put hashtags only in section 3.
- In Song Suggestions, include song name with artist/singer name when possible.
- Make it natural, trendy and social-media friendly.
- If image is available, use image details strongly.
- If both image and text are given, combine both.
- Keep language according to user selection.
`;

    let model = "llama-3.3-70b-versatile";
    let messages = [];

    if (hasImage) {
      model = "meta-llama/llama-4-scout-17b-16e-instruct";

      messages = [
        {
          role: "system",
          content:
            "You create high-quality Instagram captions, hashtags, reel hooks and song suggestions from image and text input."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${imageMimeType || "image/jpeg"};base64,${cleanImageBase64}`
              }
            }
          ]
        }
      ];
    } else {
      messages = [
        {
          role: "system",
          content:
            "You create high-quality Instagram captions, hashtags, reel hooks and song suggestions."
        },
        {
          role: "user",
          content: promptText
        }
      ];
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.8,
        max_completion_tokens: 1000
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
    console.error(error);

    res.status(500).json({
      error: "Server error. Please try again."
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
