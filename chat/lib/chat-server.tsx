// "use server"

// export async function chatCompletion(messages: { role: string, content: string }[]) {
//     'use server'
//     const url = process.env.OPENAI_CHAT_COMPLETION_URL;
//     if (!url) {
//         console.error('API URL is not defined');
//         return;
//     }
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': "Bearer " + process.env.OPENAI_API_KEY,
//         },
//         body: JSON.stringify({
//             model: process.env.OPENAI_MODEL_NAME,
//             messages: messages,
//             temperature: 0.7,
//             response_format: { type: 'json_object' },
//         }),
//     });

//     if (!response.ok) {
//         console.error('Error translating message:', response.statusText);
//         return;
//     }

//     const data = await response.json();
//     const respRawJson = data.choices[0].message.content;
//     return respRawJson
// }
