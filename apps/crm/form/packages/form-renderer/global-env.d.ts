declare global {
  interface Window {
    kovaaLab: {
      device: {
        ios: boolean
        android: boolean
        mobile: boolean
        windowHeight: number
        screenHeight: number
      }
    }
  }
}

export {}
