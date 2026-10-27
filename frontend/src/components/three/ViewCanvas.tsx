import { View } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Component, type ReactNode } from 'react'

/**
 * One full-window, click-through canvas that renders every small 3D viewport in the app (user figures,
 * room previews) via drei's <View>. Browsers allow only a handful of WebGL contexts, so a table of
 * twelve avatars must not create twelve canvases.
 */
export function ViewCanvas() {
  return (
    <CanvasBoundary>
      <Canvas
        eventSource={document.getElementById('root')!}
        eventPrefix="client"
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 5 }}
        className="no-print"
      >
        <View.Port />
      </Canvas>
    </CanvasBoundary>
  )
}

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
