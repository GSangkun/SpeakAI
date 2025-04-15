// import { v4 as uuidv4 } from 'uuid';

export function generateUUID(): string {
    // 使用随机数和当前时间生成唯一ID
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) +
           Date.now().toString(36);
}
