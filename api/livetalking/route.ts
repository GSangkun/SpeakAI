import { NextRequest, NextResponse } from 'next/server';

/**
 * 模拟LiveTalking API接口
 * 用于在Mac上无法运行原始LiveTalking服务时提供替代功能
 */
export async function POST(request: Request) {
  try {
    // 解析请求体
    const body = await request.json();
    const { text, avatar_id } = body;

    // 验证必要参数
    if (!text) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数: text' },
        { status: 400 }
      );
    }

    console.log(`💬 模拟LiveTalking处理请求: 文本="${text}", 角色ID=${avatar_id || '默认'}`);

    // 模拟处理延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 记录处理过程
    console.log('▶️ 模拟生成音频和口型数据');
    console.log('✅ 模拟处理完成');

    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: '模拟LiveTalking处理成功',
      data: {
        processed_text: text,
        avatar_id: avatar_id || 'default',
        process_time_ms: 500,
        animation_frames: Math.ceil(text.length / 2), // 模拟帧数
        audio_duration_ms: text.length * 80 // 模拟音频时长
      }
    });
  } catch (error) {
    console.error('模拟LiveTalking处理失败:', error);
    return NextResponse.json(
      { success: false, message: `处理失败: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 