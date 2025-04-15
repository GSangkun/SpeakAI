export const runtime = 'edge';

// 智谱AI API配置
const ZHIPU_AI_API_URL = 'https://open.bigmodel.cn/api/paas/v4/images/generations';
const API_KEY = 'a67ee6e3cbcb4caeb046fa9698c0584d.wOvvkhCtclTxF9F1';

// 使用模拟数据进行开发和测试
const USE_MOCK_DATA = false; // 设置为false禁用模拟数据

// 模拟图像描述生成
const generateMockImageDescription = () => {
  console.log('使用模拟数据代替智谱AI图像识别');
  
  const mockDescriptions = [
    "这张图片显示一个人站在户外环境中。背景是蓝天和一些树木，看起来是一个公园或者花园。这个人穿着休闲装，面带微笑。图片色彩明亮，光线充足，整体氛围非常愉快。",
    
    "这是一张城市街景照片。画面中有几栋高楼大厦，人行道上有行人走动。街道两旁停放着一些车辆，远处可以看到交通信号灯。天空呈现出淡蓝色，可能是在白天拍摄的。整体画面展现了繁忙的城市生活。",
    
    "图片中是一只可爱的猫咪，看起来是家猫品种，有着漂亮的毛色。猫咪正坐在窗台上，似乎在观察窗外的情况。阳光透过窗户洒在猫咪身上，营造出温暖舒适的氛围。猫咪看起来很放松，眼神专注。",
    
    "这是一张美食照片，展示了一盘精美的菜肴。盘子中央是主菜，周围装饰有一些蔬菜和调味料。食物摆盘精致，色彩搭配和谐，看起来非常美味可口。这可能是在餐厅或者家庭厨房拍摄的成品菜肴。",
    
    "图片中是一片自然风景，展示了一个湖泊或海滩区域。水面平静，倒映着周围的景色。远处有山脉或丘陵的轮廓，天空中有几朵白云。这是一个宁静优美的自然环境，适合休闲放松。"
  ];
  
  return mockDescriptions[Math.floor(Math.random() * mockDescriptions.length)];
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return new Response(JSON.stringify({ error: '缺少图像文件' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('发送图像识别请求到智谱AI');
    
    // 如果启用了模拟数据，则返回模拟响应
    if (USE_MOCK_DATA) {
      const mockDescription = generateMockImageDescription();
      
      return new Response(JSON.stringify({ 
        description: mockDescription,
        isMock: true // 标记这是模拟数据
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 将图像转换为Base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    // 调用智谱AI的API进行图像识别
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4v', // 使用GLM-4V模型进行视觉识别
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: '请描述这张图片中的内容，尽可能详细' },
              { 
                type: 'image_url', 
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('智谱AI图像识别API错误:', errorText);
      
      // API调用失败时也使用模拟数据
      const mockDescription = generateMockImageDescription();
      return new Response(JSON.stringify({ 
        description: mockDescription,
        isMock: true,
        originalError: errorText
      }), {
        status: 200, // 返回200而不是错误状态码
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('智谱AI图像识别响应:', data);

    return new Response(JSON.stringify({ 
      description: data.choices[0]?.message?.content || '无法识别图像内容'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('处理图像识别请求时出错:', error);
    
    // 错误时使用模拟数据
    const mockDescription = generateMockImageDescription();
    return new Response(JSON.stringify({ 
      description: mockDescription,
      isMock: true,
      error: '服务器内部错误'
    }), {
      status: 200, // 返回200而不是错误状态码
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 