export const runtime = 'edge';

// 智谱AI API配置
const ZHIPU_AI_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const API_KEY = 'a67ee6e3cbcb4caeb046fa9698c0584d.wOvvkhCtclTxF9F1';

// 使用模拟数据进行开发和测试
const USE_MOCK_DATA = false; // 设置为false禁用模拟数据

// 模拟响应生成函数
const generateMockResponse = (message: string) => {
  console.log('使用模拟数据代替智谱AI响应');
  
  // 常见问题的模拟回复
  const commonResponses: {[key: string]: string} = {
    '你好': '你好！我是智能数字人助手，有什么我可以帮到你的吗？',
    '你是谁': '我是基于人工智能技术开发的数字人助手，可以陪你聊天、回答问题、识别图像等。',
    '你能做什么': '我可以与你进行对话、回答问题、描述上传的图片内容，还能结合语音进行交流。未来我还会支持更多功能！',
    '天气': '抱歉，我目前无法获取实时天气信息。不过我可以帮你解答其他问题或者陪你聊天。',
    '讲个笑话': '为什么程序员总是分不清万圣节和圣诞节？因为 Oct 31 = Dec 25'
  };
  
  // 检查是否匹配常见问题
  for (const [key, response] of Object.entries(commonResponses)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return response;
    }
  }
  
  // 默认回复
  const defaultResponses = [
    '这个问题很有趣，让我思考一下。作为AI助手，我认为沟通和理解是最重要的。',
    '谢谢你的提问！我很高兴能和你交流。不过我的知识有限，希望我的回答对你有所帮助。',
    '我理解你的问题，这确实值得深入探讨。从不同角度来看，这个话题有很多可以分享的观点。',
    '很高兴收到你的消息！我喜欢与人交流，希望我们的对话愉快而有意义。',
    '这是个很好的问题。作为AI，我尽力提供有价值的回答，但有时候也需要更多信息才能给出更准确的回应。'
  ];
  
  // 随机选择一个默认回复
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
};

export async function POST(req: Request) {
  try {
    const { message, role = 'user' } = await req.json();
    
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('发送请求到智谱AI:', { message });

    // 如果启用了模拟数据，则返回模拟响应
    if (USE_MOCK_DATA) {
      const mockReply = generateMockResponse(message);
      
      return new Response(JSON.stringify({ 
        reply: mockReply,
        isMock: true // 标记这是模拟数据
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 实际API调用
    const response = await fetch(ZHIPU_AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4', // 使用GLM-4模型
        messages: [
          {
            role: role,
            content: message,
          }
        ],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1500,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('智谱AI API错误:', errorText);
      
      // API调用失败时也使用模拟数据
      const mockReply = generateMockResponse(message);
      return new Response(JSON.stringify({ 
        reply: mockReply,
        isMock: true,
        originalError: errorText
      }), {
        status: 200, // 返回200而不是错误状态码
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('智谱AI响应:', data);

    return new Response(JSON.stringify({ 
      reply: data.choices[0]?.message?.content || '对不起，我无法生成回复' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('处理智谱AI请求时出错:', error);
    
    // 错误时使用模拟数据
    const mockReply = generateMockResponse("错误");
    return new Response(JSON.stringify({ 
      reply: mockReply,
      isMock: true,
      error: '服务器内部错误'
    }), {
      status: 200, // 返回200而不是错误状态码
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 