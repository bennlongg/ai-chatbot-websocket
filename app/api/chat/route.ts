import { StreamingTextResponse } from 'ai'

export const runtime = 'edge'

interface WebSocketMessage {
  content: string
  index: number
  name: string
  id: string
  nextSpeaker?: string
  // Add any other relevant fields that your WebSocket messages might have
}

interface AIStreamCallbacks {
  // Define the structure of callbacks if you have specific ones
  onCompletion?: (data: string, json: any) => void
  onSpeakerChange?: (data: string, json: any) => void
  onClosed?: () => void
  // ... other callback types
}

function parseWebSocketData(): (data: string) => {
  content: string
  end: boolean
  newName?: boolean
} {
  let previousSpeaker: string = ''
  let previousName: string = ''

  return (data: string) => {
    const json: WebSocketMessage = JSON.parse(data)

    const newSpeaker =
      json?.nextSpeaker &&
      previousSpeaker &&
      json?.nextSpeaker !== previousSpeaker
    const newName = json?.name && previousName && json?.name !== previousName

    if (newSpeaker) {
      previousSpeaker = ''
      previousName = ''
      return { content: json?.content ?? '', end: true, newName: false }
    }

    if (json?.nextSpeaker) {
      previousSpeaker = json.nextSpeaker
    }

    if (newName) {
      previousName = json.name
      return { content: json?.content ?? '', end: false, newName: true }
    }

    console.log('JSON', json)
    return { content: json?.content ?? '', end: false, newName: false }
  }
}

function WebSocketStream(
  webSocket: WebSocket,
  cb?: AIStreamCallbacks
): ReadableStream<string> {
  const parser = parseWebSocketData()
  return new ReadableStream({
    start(controller) {
      webSocket.onmessage = event => {
        const lol = JSON.parse(event.data)
        const { content, end, newName } = parser(event.data)

        if (newName) {
          controller.enqueue(
            `${JSON.stringify({ speaker: lol.name })}---${content}`
          )
          return
        }
        if (end) {
          controller.enqueue('---')
          return
        }

        if (lol?.nextSpeaker) {
          controller.enqueue(
            `${JSON.stringify({ speaker: lol?.nextSpeaker })}---`
          )
          return
        }
        controller.enqueue(content)

        // Invoke callback if defined
        cb?.onCompletion?.(content, lol)
      }

      webSocket.onclose = () => {
        cb?.onClosed?.()
        controller.close()
      }
    },
    pull(controller) {
      // Handle pull requests from the stream's consumer
    },
    cancel() {
      webSocket.close()
    }
  })
}

export async function POST(req: Request): Promise<StreamingTextResponse> {
  const json = await req.json()
  const { messages } = json
  // const data = new experimental_StreamData()
  // const userId = (await auth())?.user.id;

  // if (!userId) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  const webSocket = new WebSocket('ws://localhost:3000/chat/relay')

  const stream = WebSocketStream(webSocket, {
    onCompletion: (_data, json) => {
      // console.log('ON COMPLETION', data)
      // if (json.nextSpeaker) {
      //   data.append({ name: json.nextSpeaker })
      // }
      // Implement your logic for handling completion
      // For example, updating a database or sending a notification
    }
  })

  // Send initial messages to the WebSocket server
  webSocket.onopen = () => {
    webSocket.send(messages[messages.length - 1].content)
  }

  return new StreamingTextResponse(stream)
}

// export async function POST(req: Request) {
//   const json = await req.json()
//   const { messages, previewToken } = json
//   // const userId = (await auth())?.user.id

//   // if (!userId) {
//   //   return new Response('Unauthorized', {
//   //     status: 401
//   //   })
//   // }

//   // if (previewToken) {
//   //   openai.apiKey = previewToken
//   // }

//   const res = await openai.chat.completions.create({
//     model: 'gpt-3.5-turbo',
//     messages,
//     temperature: 0.7,
//     stream: true
//   })

//   const stream = OpenAIStream(res, {
//     async onCompletion(completion) {
//       const title = json.messages[0].content.substring(0, 100)
//       const id = json.id ?? nanoid()
//       const createdAt = Date.now()
//       const path = `/chat/${id}`
//       const payload = {
//         id,
//         title,
//         userId,
//         createdAt,
//         path,
//         messages: [
//           ...messages,
//           {
//             content: completion,
//             role: 'assistant'
//           }
//         ]
//       }
//       await kv.hmset(`chat:${id}`, payload)
//       await kv.zadd(`user:chat:${userId}`, {
//         score: createdAt,
//         member: `chat:${id}`
//       })
//     }
//   })

//   return new StreamingTextResponse(stream)
// }
