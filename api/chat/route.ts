export const runtime = 'edge';
export const dynamic = 'force-dynamic'; // always run dynamically

export async function POST(request: Request) {
    try {
        const { messages, action } = await request.json();
        const url = process.env.OPENAI_CHAT_COMPLETION_URL;
        if (!url) {
            return new Response(JSON.stringify({ error: 'API URL is not defined' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL_NAME,
                messages: messages,
                temperature: 0.7,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            return new Response(JSON.stringify({ error: response.statusText }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        let jsonResponse;
        try {
            jsonResponse = JSON.parse(content);
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            return new Response(JSON.stringify({ error: 'Invalid response format from AI' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (action === 'revise') {
            return new Response(JSON.stringify({ revision: jsonResponse.revision }), {
                headers: { 'Content-Type': 'application/json' },
            });
        } else if (action === 'generate') {
            return new Response(JSON.stringify({ recommended: jsonResponse.recommended }), {
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            return new Response(JSON.stringify({ error: 'Unknown action type' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (error) {
        console.error('Error in chat completion:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}