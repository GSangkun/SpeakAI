import { NextRequest, NextResponse } from 'next/server';
import { SiliconFlowService } from '../../../intelligence-llm/lib/llm-service';

export const runtime = 'edge';
export const dynamic = 'force-dynamic'; // always run dynamically

export async function POST(request: NextRequest) {
    const { messageList } = await request.json();

    if (!process.env.SILICONFLOW_API_KEY) {
        console.error('SILICONFLOW_API_KEY is not defined')
        return NextResponse.json({ error: 'quick trial chat service is offline' }, { status: 403 });
    }

    try {
        const siliconFlowService = new SiliconFlowService(process.env.SILICONFLOW_API_KEY, 'deepseek-ai/DeepSeek-V2.5');
        const stream = siliconFlowService.chatCompletionInStream(messageList);

        return (await stream).toTextStreamResponse()
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'quick trial chat service is temporarily unavailable' }, { status: 500 });
    }
}

