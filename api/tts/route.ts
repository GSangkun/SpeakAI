import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice = 'zh-CN-XiaoxiaoNeural', outputFormat = 'audio-24khz-48kbitrate-mono-mp3' } = body;

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const subscriptionKey = process.env.AZURE_SPEECH_KEY;
    const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;

    if (!subscriptionKey || !region) {
      return NextResponse.json(
        { error: 'Azure Speech credentials not configured' },
        { status: 500 }
      );
    }

    // 1. 获取访问令牌
    const tokenResponse = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!tokenResponse.ok) {
      throw new Error(`Failed to fetch token: ${tokenResponse.statusText}`);
    }

    const accessToken = await tokenResponse.text();

    // 2. 使用令牌调用TTS API
    // 准备SSML (Speech Synthesis Markup Language)
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
        <voice name="${voice}">
          <prosody rate="0%" pitch="0%">
            ${text}
          </prosody>
        </voice>
      </speak>
    `;

    // 调用Azure TTS API
    const ttsResponse = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': outputFormat,
          'User-Agent': 'YoungSpeakAI'
        },
        body: ssml
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      throw new Error(`TTS API call failed: ${ttsResponse.status} ${ttsResponse.statusText}, ${errorText}`);
    }

    // 3. 获取音频数据并返回
    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    
    // 返回音频数据
    return new NextResponse(audioArrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioArrayBuffer.byteLength.toString()
      }
    });
  } catch (error) {
    console.error('Error in TTS processing:', error);
    return NextResponse.json(
      { error: `Failed to generate speech: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
