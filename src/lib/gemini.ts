import { toast } from "sonner";

export interface GeminiImageRequest {
  prompt: string;
  baseImage?: string; // base64 encoded image
  apiKey: string;
}

export interface GeminiImageResponse {
  success: boolean;
  imageData?: string; // base64 encoded result
  error?: string;
}

export async function generateImageWithGemini({
  prompt,
  baseImage,
  apiKey
}: GeminiImageRequest): Promise<GeminiImageResponse> {
  try {
    const contents: any[] = [
      {
        parts: [
          { text: prompt }
        ]
      }
    ];

    // If base image is provided, add it for editing
    if (baseImage) {
      // Convert data URL to base64 without prefix
      const base64Data = baseImage.split(',')[1];
      contents[0].parts.push({
        inline_data: {
          mime_type: "image/png",
          data: base64Data
        }
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the image data from the response
    const candidate = data.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((part: any) => part.inline_data);
    
    if (!imagePart?.inline_data?.data) {
      throw new Error("No image data in response");
    }

    return {
      success: true,
      imageData: `data:image/png;base64,${imagePart.inline_data.data}`
    };

  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}