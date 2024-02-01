import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Type definition for a segment of a message.
 */
type MessageSegment = {
  content: string
  index: number
  name: string
  id: string
}

/**
 * Type definition for a notice indicating the next speaker.
 */
type SpeakerNotice = {
  nextSpeaker: string
}

/**
 * Union type for incoming data, which can be either a message segment or a speaker notice.
 */
type IncomingData = MessageSegment | SpeakerNotice

/**
 * Type definition for a full message.
 */
type FullMessage = {
  content: string
  name: string
  id: string
}

/**
 * Combines an array of message segments into a full message.
 *
 * @param segments - The array of message segments to combine.
 * @returns The combined full message, or undefined if the segments array is empty.
 */
const createFullMessage = (
  segments: MessageSegment[]
): FullMessage | undefined => {
  if (!segments.length) return
  const sortedSegments = segments.sort((a, b) => a.index - b.index)
  const content = sortedSegments.map(segment => segment.content).join('')
  const { id, name } = sortedSegments[0]
  return { content, name, id }
}

/**
 * Combines an array of messages with a new message.
 *
 * @param messages - The array of existing messages.
 * @param newMessage - The new message to be added.
 * @returns The combined array of messages.
 */
const combineMessages = (messages: FullMessage[], newMessage?: FullMessage) => {
  if (!newMessage) {
    return messages
  }
  return [...messages, newMessage]
}

/**
 * Custom hook that manages the current message state.
 * @returns An object containing the current message, functions to add a message segment, reset the current message, and get the full message.
 */
const useCurrentMessage = () => {
  // use state to force re-render
  // use ref to keep track of segments and access them within effect
  const [, setSegments] = useState<MessageSegment[]>([])
  const segmentsRef = useRef<MessageSegment[]>([])

  const addMessageSegment = useCallback((segment: MessageSegment) => {
    setSegments(prevSegments => [...prevSegments, segment])
    segmentsRef.current = [...segmentsRef.current, segment]
  }, [])

  const resetCurrentMessage = useCallback(() => {
    setSegments([])
    segmentsRef.current = []
  }, [])

  const getCurrentMessage = useCallback(() => {
    return createFullMessage(segmentsRef.current)
  }, [])

  return {
    addMessageSegment,
    resetCurrentMessage,
    getCurrentMessage
  }
}
/**
 * Custom hook for managing chat functionality.
 *
 * @param socket - The WebSocket connection.
 * @returns An object containing the chat messages, user speaking status, loading status, and a function to send messages.
 */
export const useChat = (socket: WebSocket | null) => {
  const { addMessageSegment, resetCurrentMessage, getCurrentMessage } =
    useCurrentMessage()
  const [messages, setMessages] = useState<FullMessage[]>([])
  const [userToSpeak, setUserToSpeak] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const addMessage = (m: FullMessage) => {
    setMessages(prevMessages => [...prevMessages, m])
  }

  const sendMessage = useCallback(
    (content: string) => {
      setUserToSpeak(false)

      addMessage({
        name: 'User',
        id: 'user',
        content
      })

      if (socket) socket.send(content)
    },
    [socket]
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        setIsLoading(true)
        const data: IncomingData = JSON.parse(event.data)

        switch (true) {
          case 'content' in data:
            addMessageSegment(data)
            break
          case 'nextSpeaker' in data:
            const userIsNext = data.nextSpeaker === 'User'
            setIsLoading(!userIsNext)
            setUserToSpeak(userIsNext)

            const fullMessage = getCurrentMessage()
            if (fullMessage) addMessage(fullMessage)
            resetCurrentMessage()
            break
          default:
            throw new Error('Invalid incoming data')
        }
      } catch (error) {
        console.error('Failed to parse incoming message', error)
      }
    }

    if (socket) {
      socket.onmessage = handleMessage
    }
  }, [addMessageSegment, getCurrentMessage, resetCurrentMessage, socket])

  const liveMessages = combineMessages(messages, getCurrentMessage())

  return {
    messages: liveMessages,
    userToSpeak,
    isLoading,
    sendMessage
  }
}
