import axios from "axios";

const API_URL =
  "https://8neoa7izbf.execute-api.us-east-2.amazonaws.com/Prod/chat";

// Generate unique session ID on app load
const generateSessionId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `stocklens-${timestamp}-${random}`;
};

const SESSION_ID = generateSessionId();

export async function sendMessageToAgent(
  message: string,
  sessionId: string = SESSION_ID
) {
  try {
    // Wrap the payload in "body" as a JSON string
    const payload = {
      body: JSON.stringify({
        user_query: message,
        session_id: sessionId,
      }),
    };

    console.log("📤 Sending request to API Gateway...", payload);

    const response = await axios.post(API_URL, payload, {
      headers: { "Content-Type": "application/json" },
      withCredentials: false,
      timeout: 30000, // Increased timeout for longer responses
    });

    console.log("📥 Raw Axios response.data:", response.data);

    let body = response.data;
    if (body.body && typeof body.body === "string") {
      console.log("🔍 'body' is a string. Attempting JSON.parse...");
      body = JSON.parse(body.body);
      console.log("✅ Parsed body:", body);
    }

    return body.response ?? "Agent returned no response.";
  } catch (err: any) {
    console.error("API Error:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    }
    return "Error contacting agent.";
  }
}
