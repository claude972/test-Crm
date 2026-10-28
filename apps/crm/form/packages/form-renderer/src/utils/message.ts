export function sendMessageToParent(eventName: string) {
  window.parent?.postMessage(
    {
      source: 'KOVAALAB',
      eventName
    },
    '*'
  )
}
