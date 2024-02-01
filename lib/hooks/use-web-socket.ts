import React from 'react'

export const useWebSocket = (url: string) => {
  const [socket, setSocket] = React.useState<WebSocket | null>(null)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const webSocket = new WebSocket(url)
    webSocket.onopen = () => console.log('WebSocket Connected')
    webSocket.onerror = () => setError(new Error('WebSocket Error'))
    webSocket.onclose = () => console.log('WebSocket Disconnected')

    setSocket(webSocket)

    return () => {
      webSocket.close()
    }
  }, [url])

  return { socket, error }
}
