import { toast } from "sonner";

// Define interfaces for better type safety
interface Part {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface Content {
  parts: Part[];
}

interface GeminiImageRequest {
  prompt: string;
  baseImage?: string; // base64 encoded image
  apiKey: string;
  provider: "google" | "openrouter"; // Added provider selection
}

interface GeminiImageResponse {
  success: boolean;
  imageData?: string; // base64 encoded result
  error?: string;
}

// Interfaces for API responses
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts: Array<{
        inline_data?: {
          mime_type: string;
          data: string;
        };
      }>;
    };
  }>;
}

// Discriminated union for OpenRouter message content
interface TextContent {
  type: "text";
  text: string;
}

interface ImageUrlContent {
  type: "image_url";
  image_url: {
    url: string;
  };
}

type OpenRouterMessageContent = TextContent | ImageUrlContent;

interface OpenRouterImageContent {
  type: "image_url";
  image_url: {
    url: string;
  };
  index?: number;
}

// Updated interface for OpenRouter message to include images array
interface OpenRouterMessage {
  role: "user" | "assistant";
  content?: OpenRouterMessageContent[] | string | object; // Allow string/object for robustness
  images?: Array<{ // Directly use the structure from JSON
    type: "image_url";
    image_url: {
      url: string;
    };
    index?: number;
  }>;
}

interface OpenRouterChoice {
  message: OpenRouterMessage;
  finish_reason?: string;
  native_finish_reason?: string;
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
}

// Define types for requestBody
type GoogleRequestBody = { contents: Content[] };
type OpenRouterRequestBody = { model: string; messages: OpenRouterMessage[] };
type RequestBody = GoogleRequestBody | OpenRouterRequestBody;


export async function generateImageWithGemini({
  prompt,
  baseImage,
  apiKey,
  provider // Destructure provider
}: GeminiImageRequest): Promise<GeminiImageResponse> {
  try {
    const contents: Content[] = [
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

    // Determine the API endpoint based on the provider
    let apiUrl: string;
    const headers: Record<string, string> = { // Changed to const
      "Content-Type": "application/json",
    };

    if (provider === "google") {
      apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent";
      headers["x-goog-api-key"] = apiKey;
    } else if (provider === "openrouter") {
      apiUrl = "https://openrouter.ai/api/v1/chat/completions"; // OpenRouter endpoint for chat completions
      headers["Authorization"] = `Bearer ${apiKey}`; // OpenRouter uses Authorization header
    } else {
      throw new Error("Unsupported provider");
    }

    let requestBody: RequestBody; // Typed requestBody

    if (provider === "google") {
      requestBody = { contents };
    } else if (provider === "openrouter") {
      requestBody = {
        model: "google/gemini-2.5-flash-image-preview:free", // Model name for OpenRouter, including :free as per user feedback
        messages: [
          {
            role: "user",
            content: contents[0].parts.map((part: Part) => { // Typed part
              if (part.text) {
                return { type: "text", text: part.text } satisfies TextContent;
              } else if (part.inline_data) {
                return {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${part.inline_data.data}`
                  }
                } satisfies ImageUrlContent;
              }
              return null; // Should not happen with current structure
            }).filter((item): item is OpenRouterMessageContent => item !== null) // Filter out any nulls and assert type
          }
        ]
      };
    } else {
      throw new Error("Unsupported provider");
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    let imageData: string | undefined;

    if (provider === "google") {
      const googleData = data as GeminiResponse; // Type assertion for Google response
      const candidate = googleData.candidates?.[0];
      const imagePart = candidate?.content?.parts?.find((part: Part) => part.inline_data); // Typed part
      
      if (imagePart?.inline_data?.data) {
        imageData = `data:image/png;base64,${imagePart.inline_data.data}`;
      } else {
        throw new Error("No image data in Google response");
      }
    } else if (provider === "openrouter") {
      const openRouterData = data as OpenRouterResponse;
      const choice = openRouterData.choices?.[0];

      // Check for content filter errors
      if (choice?.finish_reason === "content_filter" || choice?.native_finish_reason === "PROHIBITED_CONTENT") {
        throw new Error("Content was flagged by AI safety filter. Please try a different prompt or image.");
      }

      const message = choice?.message;

      let imageData: string | undefined;

      // Prioritize checking the 'images' array first, as seen in the provided JSON
      if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
        const imageContent = message.images.find((img: OpenRouterImageContent) => img.type === "image_url");
        if (imageContent?.image_url?.url) {
          imageData = imageContent.image_url.url;
        }
      }

      // If no image found in 'images' array, fall back to checking 'content'
      if (!imageData && message?.content) {
        // Case 1: message.content is an array of content parts
        if (Array.isArray(message.content)) {
          const imageContent = message.content.find((content: OpenRouterMessageContent) => content.type === "image_url");
          if (imageContent?.image_url?.url) {
            imageData = imageContent.image_url.url;
          } else {
            // Fallback to text content if no image found
            const textContent = message.content.find((content: OpenRouterMessageContent) => content.type === "text");
            if (textContent?.text) {
              throw new Error("OpenRouter response did not contain image data, but text: " + textContent.text);
            } else {
              throw new Error("No image data in OpenRouter response");
            }
          }
        } 
        // Case 2: message.content is a single object (not an array)
        else if (typeof message.content === 'object' && !Array.isArray(message.content)) {
          const contentObj = message.content as OpenRouterMessageContent; 
          if (contentObj.type === "image_url" && contentObj.image_url?.url) {
            imageData = contentObj.image_url.url;
          } else if (contentObj.type === "text" && contentObj.text) {
            throw new Error("OpenRouter response did not contain image data, but text: " + contentObj.text);
          } else {
            throw new Error("OpenRouter response content has unexpected object structure");
          }
        } 
        // Case 3: message.content is a string
        else if (typeof message.content === 'string') {
          throw new Error("OpenRouter response content is a string, cannot extract image data: " + message.content);
        }
      }

      // If imageData is still undefined after checks, throw an error
      if (!imageData) {
        throw new Error("Failed to extract image data from OpenRouter response");
      }
      
      return {
        success: true,
        imageData: imageData
      };
    }

    if (!imageData) {
      throw new Error("Failed to extract image data from response");
    }

    return {
      success: true,
      imageData: imageData
    };

  } catch (error) {
    console.error(`Provider API error (${provider}):`, error);
    toast.error(`Error generating image with ${provider}: ${error instanceof Error ? error.message : "Unknown error"}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}
