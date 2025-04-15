import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

// API密钥和模型配置 - 实际应用中应从环境变量获取
const API_KEY = "969ede49bca14d02ba765701eb9e3283.EW4hIKrKhuZPZixd";
const API_URL_WS = "wss://open.bigmodel.cn/api/rtav/GLM-Realtime"; // 官方文档中的正确WebSocket地址

// 手动构建JWT - 添加类型声明
function createCustomJWT(payload: Record<string, any>, secret: string): string {
  // 创建header
  const header = {
    alg: 'HS256',
    sign_type: 'SIGN'
  };
  
  // Base64编码header和payload
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
  // 创建签名
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
  // 合并成JWT
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 确保API Key正确
    const [id, secret] = API_KEY.split('.');
    
    if (!id || !secret) {
      throw new Error("API Key格式不正确");
    }
    
    // 一致的有效期设置
    const exp = Math.floor(Date.now() / 1000) + 600; // 10分钟有效期
    const timestamp = Date.now();
    
    const payload = {
      api_key: id,
      exp: exp,
      timestamp: timestamp
    };
    
    const token = createCustomJWT(payload, secret);
    
    // 返回正确的WebSocket连接信息
    return NextResponse.json({
      success: true,
      token: token,
      wsUrl: API_URL_WS, // 使用变量保持一致性
      message: "JWT生成成功，准备连接WebSocket"
    });
  } catch (error) {
    console.error("JWT生成失败:", error);
    return NextResponse.json(
      { success: false, error: `JWT生成失败: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 