# What is “Nano Banana” (from Google)?

* “Nano Banana” is the internal/codename for **Gemini 2.5 Flash Image**, Google’s new image **generation + editing** model now integrated into the Gemini app and available via the Gemini API / Google AI Studio and Vertex AI. It focuses on **precise local edits, multi-image fusion, and character/likeness consistency**. ([Google Developers Blog][1], [blog.google][2])
* Google’s developer post explicitly refers to **“Gemini 2.5 Flash Image (aka nano-banana)”**, with examples of **targeted transformations** (remove objects/people, alter pose, recolor B\&W, blur background), **multi-image blending**, and **world-knowledge-aware edits**. It also notes **SynthID** watermarking on outputs. ([Google Developers Blog][1])
* Mainstream coverage confirms the launch/integration into Gemini, emphasizing its **multi-step editing**, **image combination**, and **viral** rollout. ([Axios][3], [El País][4], [The Times of India][5])
* Developers can try it in **Google AI Studio** under the **“gemini-2.5-flash-image-preview”** model. ([Google AI Studio][6])

---

# Engineering prompt for code-gen: build “PhotoBanana”

Copy-paste this entire brief into your code generator (or into me) to scaffold the app.

**Title:** PhotoBanana – AI photo editor with Nano Banana (Gemini 2.5 Flash Image)

**Goal:** A **streamlined AI photo editor** that focuses on **annotation-driven editing** rather than complex layer compositing. Users upload images, create annotations (shapes, brush strokes, text notes) to specify desired changes, then submit everything to Google's **Gemini 2.5 Flash Image (Nano Banana)** for AI processing.

**Simple but Powerful Workflow:**
1. **Upload** - Single image upload with preview
2. **Annotate** - Use drawing tools to mark areas and add text instructions
3. **Organize** - Manage annotations with basic layer controls (show/hide, reorder, remove)
4. **Process** - Send image + annotations to AI for intelligent editing
5. **Review** - Compare results and iterate with new annotations
6. **Export** - Download the final edited image

**Key Differentiators from Full Photoshop:**
- **Annotation-first approach** - drawings become AI instructions
- **Simplified layer system** - just for organizing annotations, not complex compositing
- **AI-powered processing** - no manual editing skills required
- **Iterative workflow** - easy to refine results with additional annotations

**Tech stack (preferred):**

* **Next.js 14 (App Router) + TypeScript**
* **React** UI with **Tailwind CSS**; shadcn/ui components
* **Canvas** annotation layer using **Konva** or **Fabric.js** (vector shapes, freehand, masks)
* **Server actions / API routes** to call **Google Generative AI (Gemini) SDK**
  Model: `gemini-2.5-flash-image-preview` (a.k.a. nano-banana)
* Storage: local first; optional cloud bucket for images
* Auth: optional (NextAuth) – stub interfaces

**Core features (MVP):**

1. **Project workspace**

   * Drag-drop or click to **upload 1–5 images**; set one as the **base**.
   * Optional **reference image(s)** for style transfer / fusion.
   * EXIF strip on upload (privacy toggle).
2. **Annotation tools**

   * **Bounding box**, **lasso/freehand**, **brush** (alpha mask), **eraser**, **point selections**.
   * **Text notes** pinned to regions (become edit instructions).
   * **Layers panel** (reorder, lock, hide), **zoom/pan**, **snap to edges**.
3. **Prompting panel**

   * Natural-language prompt field.
   * **Region-aware prompts**: auto-append coordinates or binary mask derived from annotations.
   * Presets: *Remove object*, *Change background*, *Recolor*, *Pose tweak*, *Inpainting*, *Outpainting*, *Blend with secondary image*, *Style from reference*.
4. **Edits engine (server)**

   * Build a request composer that converts:

     * Base image (PNG/JPEG) + zero/one/many reference images
     * **Masks** (PNG alpha) per region OR coordinates metadata
     * Text prompt (+ system prompt to keep identity/consistency)
   * Call Gemini via Google GenAI SDK:
     `model = "gemini-2.5-flash-image-preview"`
     `contents = [prompt, base_image, ...reference_images, (optional) mask parts]`
   * Stream results if supported; otherwise poll.
   * Display output; push to **non-destructive history stack** with thumbnails.
5. **History & compare**

   * Step through versions, **A/B swipe compare**, quick **Revert**.
6. **Export**

   * Download PNG/JPEG; include EXIF note: “Edited with AI (SynthID watermark may be embedded by model).”
7. **Safety & disclosures**

   * Banner: “Outputs may contain **SynthID** invisible watermark per Google’s policy; follow local laws and platform rules.”
   * Content safety checks (NSFW toggle with server-side guard).
8. **Nice to have**

   * **Prompt templates** per tool.
   * **Brush-guided inpainting** latency indicator.
   * Keyboard shortcuts (B brush, E eraser, V move, M mask, Z zoom, Cmd/Ctrl+Z undo).

**Key user flows:**

* *Local edit:* Upload → lasso subject → prompt “change jacket to red leather, keep same person” → run → compare → export.
* *Object removal:* Box select unwanted person → preset “Remove object” → run.
* *Fusion:* Upload “room.jpg” + “chair.png”, box region on floor → prompt “place the chair in the boxed area, matching lighting and shadows” → run.
* *Style transfer:* Upload portrait + reference painting → prompt “apply reference’s color palette and brush texture but keep face identity” → run.

**API sketch (server route):**

```ts
// POST /api/edit
// body: { prompt: string, baseImage: string (data URL), refs?: string[], mask?: string (PNG data URL), seed?: number }
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  const { prompt, baseImage, refs = [], mask } = await req.json();
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });

  const contents: any[] = [prompt, dataUrlToPart(baseImage)];
  for (const r of refs) contents.push(dataUrlToPart(r));
  if (mask) contents.push({ mimeType: "image/png", data: dataUrlToBytes(mask) });

  const res = await model.generateContent({ contents });
  const imgPart = res.response.candidates[0].content.parts.find(p => p.inlineData);
  return NextResponse.json({ image: `data:image/png;base64,${imgPart.inlineData.data}` });
}
```

**Annotation → mask conversion:**

* Use Konva shapes to compose a **canvas mask** (white where selected, transparent elsewhere). Export `toDataURL("image/png")` and send as `mask`.

**Prompting best practices (bake into system prompt):**

* “Preserve subject identity/likeness. Respect anatomy and scene geometry. Keep lighting/time-of-day consistent unless specified. Make **only** changes implied by the selection.”
* For fusion: “Match perspective, shadows, and color temperature to base image.”

**UI details:**

* Clean split view: **Canvas left**, **Prompt & Layers right**.
* Buttons: *Run Edit*, *Undo*, *Redo*, *Compare*, *Export*.
* Progress bar + cancel token during generation.

**Config & secrets:**

* `GOOGLE_API_KEY` for Gemini API (server side only).
* `OPENROUTER_API_KEY` for OpenRouter API (alternative provider).
* Rate limits with simple in-memory limiter (upgradeable).

**Multi-Provider Configuration:**

The app supports both **Google Gemini** and **OpenRouter** as AI providers for maximum flexibility and reliability.

**Google Gemini Setup:**
```bash
GOOGLE_API_KEY=your_google_api_key_here
```

**OpenRouter Setup:**
```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

**OpenRouter API Integration:**

OpenRouter provides access to multiple AI models including Gemini 2.5 Flash Image, with benefits like:
- Unified API for multiple providers
- Automatic failover and load balancing
- Competitive pricing
- Advanced routing options

**OpenRouter API Example:**
```ts
// POST /api/edit-openrouter
// body: { prompt: string, baseImage: string (data URL), refs?: string[], mask?: string (PNG data URL) }
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, baseImage, refs = [], mask } = await req.json();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
      "X-Title": "PhotoBanana AI Editor"
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image-preview:free", // Use free tier
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: baseImage }
          },
          ...(refs.map(ref => ({
            type: "image_url",
            image_url: { url: ref }
          }))),
          ...(mask ? [{
            type: "image_url",
            image_url: { url: mask }
          }] : [])
        ]
      }],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  const data = await response.json();
  return NextResponse.json({
    image: data.choices[0].message.content,
    provider: "openrouter"
  });
}
```

**OpenRouter Model Options:**

* **Free Tier:** `google/gemini-2.5-flash-image-preview:free`
  - No cost for basic usage
  - Rate limited but sufficient for development/testing
  - Good for getting started with the API

* **Paid Tier:** `google/gemini-2.5-flash-image-preview`
  - Higher rate limits and priority processing
  - Pay-per-use pricing
  - Better for production applications

**Free Tier Usage Notes:**
- Limited requests per hour/minute
- May have queue times during peak usage
- Perfect for development, prototyping, and small-scale applications
- Upgrade to paid tier when scaling up

**Provider Selection Logic:**
```ts
// Client-side provider selection
const [provider, setProvider] = useState<"google" | "openrouter">("google");

// API endpoint selection based on provider
const apiEndpoint = provider === "google"
  ? "/api/edit-google"
  : "/api/edit-openrouter";
```

**Benefits of Multi-Provider Support:**
- **Reliability**: Automatic failover if one provider is down
- **Cost Optimization**: Choose the most cost-effective provider
- **Performance**: Route to fastest available endpoint
- **Flexibility**: Access to different model versions and capabilities

**Testing:**

* Seeded snapshots for deterministic diffs (when supported).
* Upload fixtures: product-on-white, busy street, living room, portrait.

**Legal & compliance:**

* Show **SynthID** disclosure and link to policy.
* Add user checkbox confirming they have rights to edit/upload images.

**Stretch goals:**

* Multi-step edit queue (chain prompts).
* Team projects with share links.
* Mobile canvas with touch gestures.

**Guides / Docs:**

* https://ai.google.dev/gemini-api/docs/*
* image-generation#image_generation_text-to-image
* https://openrouter.ai/google/gemini-2.5-flash-image-preview

---

[1]: https://developers.googleblog.com/en/introducing-gemini-2-5-flash-image/?utm_source=chatgpt.com "Introducing Gemini 2.5 Flash Image, our state-of-the-art image model"
[2]: https://blog.google/products/gemini/updated-image-editing-model/?utm_source=chatgpt.com "Image editing in Gemini just got a major upgrade - The Keyword"
[3]: https://www.axios.com/2025/08/26/nano-banana-google-ai-images?utm_source=chatgpt.com "Google aims to be top banana in AI image editing"
[4]: https://elpais.com/tecnologia/2025-08-29/google-se-vuelve-viral-con-nano-banana-su-modelo-mas-avanzado-de-edicion-de-imagenes-con-ia.html?utm_source=chatgpt.com "Google se vuelve viral con Nano Banana, su modelo más avanzado de edición de imágenes con IA"
[5]: https://timesofindia.indiatimes.com/technology/tech-news/google-ceo-sundar-pichai-shares-3-bananas-heres-what-they-mean/articleshow/123548276.cms?utm_source=chatgpt.com "Google CEO Sundar Pichai shares '3 Bananas': Here's what they mean"
[6]: https://aistudio.google.com/?model=gemini-2.5-flash-image-preview&utm_source=chatgpt.com "Gemini 2.5 Flash Image (Nano Banana) - Google AI Studio"
