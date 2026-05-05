import { AIProvider } from '../types';

export async function getAIResponseForComment(comment: string, provider: AIProvider = 'gemini'): Promise<string> {
  if (!comment || comment.trim() === '') {
    return 'No valid customer comments provided for AI analysis.';
  }

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment, provider }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server error');
    }

    return data.text || 'AI could not generate a response.';
  } catch (error) {
    console.error('Error fetching AI response:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error [${provider}]: ${errorMessage}`;
  }
}
