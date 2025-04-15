export const runtime = 'edge';

// 智谱AI GLM-4 API配置 - 使用免费模型
const GLM4_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const API_KEY = 'a67ee6e3cbcb4caeb046fa9698c0584d.wOvvkhCtclTxF9F1';

export async function POST(req: Request) {
  try {
    const { messages, stream = false, persona = "友好" } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: '消息格式不正确' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('发送请求到智谱AI:', { messages });
    
    // 构建请求体 - 使用免费模型
    const requestBody = {
      model: "GLM-4-Flash-250414", // 更改为免费模型
      messages,
      stream,
      temperature: 0.7,
      // 根据人设调整系统提示
      system: getPersonaPrompt(persona)
    };
    
    // 发送请求到智谱AI
    const response = await fetch(GLM4_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('智谱AI响应错误:', response.status, errorText);
      
      return new Response(JSON.stringify({ 
        error: '智谱AI请求失败',
        status: response.status,
        details: errorText
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 如果是流式响应，直接转发
    if (stream) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }
    
    // 非流式响应处理
    const result = await response.json();
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('处理GLM-4请求时出错:', error);
    
    return new Response(JSON.stringify({ 
      error: '服务器内部错误',
      details: (error as Error).message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 根据不同人设生成系统提示词
function getPersonaPrompt(persona: string): string {
  switch(persona) {
    case "友好":
      return "你是一个友好的数字人助手，乐于帮助用户解决各种问题。请保持积极、温暖的语气，使用礼貌的用语，并表现出对用户的关心和支持。你的回答应该简洁有用，不要过于冗长，但要确保提供完整的信息。";
    
    case "专业":
      return "你是一个专业的数字人助手，擅长提供准确的事实和专业知识。请保持客观、严谨的语气，使用专业但易于理解的语言。避免过于口语化的表达，注重逻辑性和信息的准确性。你的回答应该有条理，并在适当的情况下引用可靠的信息来源。";
    
    case "幽默":
      return "你是一个幽默风趣的数字人助手，喜欢用轻松活泼的方式与用户交流。请在回答中适当地加入机智的幽默元素，使用生动的比喻和有趣的表达。但注意幽默不应该以任何形式冒犯用户，而是为了创造愉快的交流氛围。即使在解决问题时，也要保持轻松愉快的语调。";
    
    case "浪漫":
      return "你是一个浪漫优雅的数字人助手，擅长使用优美的语言与用户交流。请在回答中融入诗意和审美元素，使用优雅、富有感情色彩的表达。可以适当引用文学、艺术或音乐作品来丰富交流。你的语调应该温柔而有魅力，传达出对美好事物的欣赏。";
      
    default:
      return "你是一个智能数字人助手，目标是提供有用、安全且诚实的回答。请以自然、礼貌的语气回应用户，使用简洁明了的语言，避免过长的回答。";
  }
} 