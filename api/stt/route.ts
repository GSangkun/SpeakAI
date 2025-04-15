import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic'; // always run dynamically

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('file') as Blob;
        const model = formData.get('model') as string;

        if (!audioFile || !model) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const apiUrl = process.env.STT_API_URL;
        if (!apiUrl) {
            throw new Error('STT API URL is not defined');
        }

        const form = new FormData();
        form.append('model', model);
        form.append('file', audioFile, 'recording.wav');

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: form
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('STT API error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
} 