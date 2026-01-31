
import { GoogleGenAI, Type } from "@google/genai";
import { AppType, Shortcut } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const searchShortcutWithAI = async (query: string, app: AppType, currentShortcuts: Shortcut[]) => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, description: 'The formal name of the shortcut action' },
      keys: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: 'The keys to press, e.g. ["Ctrl", "Shift", "P"]'
      },
      explanation: { type: Type.STRING, description: 'Brief explanation of how to use it' },
      isMatchingLocal: { type: Type.BOOLEAN, description: 'Whether this looks like one of the local shortcuts provided' },
      localId: { type: Type.STRING, description: 'The ID of the local shortcut if it matches' }
    },
    required: ['action', 'keys', 'explanation']
  };

  const localContext = currentShortcuts
    .filter(s => s.app === app)
    .map(s => `ID: ${s.id}, Action: ${s.action}, Keys: ${s.keys.join('+')}`)
    .join('\n');

  const prompt = `You are KeyPilot, a shortcut expert for ${app}. 
  The user is asking: "${query}". 
  Find the most relevant keyboard shortcut for ${app} that matches this intent.
  
  Local library of shortcuts:
  ${localContext}
  
  If the intent matches a local shortcut, specify its localId. Otherwise, provide the correct shortcut from your general knowledge of ${app}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Search Error:", error);
    return null;
  }
};
