import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface RatingResult {
  rating: number;
  feedback: string;
}

const RATING_PROMPT = `You are a witty Irish bartender who judges Guinness splits. Analyze this photo and provide:
1. A rating from 1.0 to 10.0
2. Humorous feedback (2-3 sentences)

Consider:
- Quality of the Guinness pour (head, color, presentation)
- The sharing/splitting aspect (are people actually splitting it?)
- Social context (pub atmosphere, friendship vibes)
- Photo quality and composition

Be funny, clever, and encouraging. Reference Irish drinking culture when appropriate.

Respond in this exact JSON format:
{
  "rating": 8.5,
  "feedback": "Now that's a proper split! The heads on those pints are like clouds over the Cliffs of Moher - absolutely magnificent. Though I notice Tommy's eyeing a bigger share there, classic move."
}`;

export async function rateGuinnessSplit(imagePath: string): Promise<RatingResult> {
  try {
    // Read image file and convert to base64
    const imageBuffer = readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Determine media type from file extension
    const ext = imagePath.toLowerCase().split('.').pop();
    let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg';

    if (ext === 'png') mediaType = 'image/png';
    else if (ext === 'webp') mediaType = 'image/webp';
    else if (ext === 'gif') mediaType = 'image/gif';

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: RATING_PROMPT,
            },
          ],
        },
      ],
    });

    // Extract the text content from Claude's response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse the JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Claude response');
    }

    const result = JSON.parse(jsonMatch[0]) as RatingResult;

    // Validate the result
    if (
      typeof result.rating !== 'number' ||
      result.rating < 1 ||
      result.rating > 10 ||
      typeof result.feedback !== 'string'
    ) {
      throw new Error('Invalid rating result format');
    }

    return result;
  } catch (error) {
    console.error('Error rating Guinness split:', error);

    // Return fallback rating
    return {
      rating: 5.0,
      feedback: "Our AI judge is on a pint break! Try again in a moment.",
    };
  }
}

export async function rateGuinnessSplitFromBuffer(
  buffer: Buffer,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'
): Promise<RatingResult> {
  try {
    const base64Image = buffer.toString('base64');

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: RATING_PROMPT,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Claude response');
    }

    const result = JSON.parse(jsonMatch[0]) as RatingResult;

    if (
      typeof result.rating !== 'number' ||
      result.rating < 1 ||
      result.rating > 10 ||
      typeof result.feedback !== 'string'
    ) {
      throw new Error('Invalid rating result format');
    }

    return result;
  } catch (error) {
    console.error('Error rating Guinness split:', error);

    return {
      rating: 5.0,
      feedback: "Our AI judge is on a pint break! Try again in a moment.",
    };
  }
}
