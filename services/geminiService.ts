
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { BookAnalysis, DOKLevel, QuestionType, Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzePage = async (content: string, isImage: boolean, pageNum: number): Promise<{ questions: Question[], topics: string[] }> => {
  const prompt = isImage 
    ? `Analyze this image of page ${pageNum} from a book. Extract core concepts and generate 3-5 high-quality DOK questions (mix of MCQ and Essay).`
    : `Analyze the following text (Section ${pageNum}). Extract core concepts and generate 3-5 high-quality DOK questions (mix of MCQ and Essay).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: isImage 
      ? [{ parts: [{ inlineData: { mimeType: "image/jpeg", data: content } }, { text: prompt }] }]
      : [{ parts: [{ text: `${prompt}\n\nContent:\n${content}` }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topics: { type: Type.ARRAY, items: { type: Type.STRING } },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, enum: [QuestionType.OBJECTIVE, QuestionType.ESSAY] },
                dokLevel: { type: Type.STRING, enum: [DOKLevel.LEVEL_1, DOKLevel.LEVEL_2, DOKLevel.LEVEL_3, DOKLevel.LEVEL_4] },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["id", "type", "dokLevel", "question", "correctAnswer", "explanation"]
            }
          }
        },
        required: ["topics", "questions"]
      },
      systemInstruction: "You are an expert educator. Generate DOK-leveled questions based on the provided page. Ensure high academic rigor.",
    },
  });

  return JSON.parse(response.text);
};

export const synthesizeAnalysis = async (allTopics: string[], totalQuestions: number): Promise<{ title: string, summary: string, finalTopics: string[] }> => {
  const prompt = `I have analyzed a book page by page. 
  Extracted topics: ${allTopics.join(", ")}. 
  Total questions generated: ${totalQuestions}.
  
  Please provide a formal Title for this study set, a concise 2-sentence summary of the overall material, and a refined list of the top 5 key unique topics.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          finalTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "summary", "finalTopics"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const createStudyChat = (context?: string): Chat => {
  const systemInstruction = context 
    ? `You are a helpful academic tutor. You are assisting a student with a book they just uploaded. 
       Here is some context/summary of the book: ${context}. 
       Answer their questions accurately based on this material. If they ask things outside the scope, try to relate it back to the material or provide general academic guidance.`
    : `You are a helpful academic tutor. Assist the student with their studies, focusing on Depth of Knowledge (DOK) levels and critical thinking.`;

  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction,
    },
  });
};
