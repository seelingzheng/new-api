/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const FOG_COLOR = 0x05070e
const PARTICLE_COLOR = 0x00f0ff
const LINE_COLOR = 0x7000ff
const LINK_DISTANCE = 35
const POINTER_RADIUS = 60

export default function DeepSpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      })
    } catch {
      // Browsers without a WebGL context fall back to the CSS glow layers.
      return
    }

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(FOG_COLOR, 0.0015)

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 200

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)

    const particleCount = window.innerWidth < 768 ? 150 : 350
    const positions = new Float32Array(particleCount * 3)
    const velocities: THREE.Vector3[] = []
    const origins: THREE.Vector3[] = []

    for (let i = 0; i < particleCount; i += 1) {
      const origin = new THREE.Vector3(
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 200
      )
      positions[i * 3] = origin.x
      positions[i * 3 + 1] = origin.y
      positions[i * 3 + 2] = origin.z
      origins.push(origin)
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        )
      )
    }

    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    )
    const particleMaterial = new THREE.PointsMaterial({
      color: PARTICLE_COLOR,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array(particleCount * particleCount * 3),
        3
      )
    )
    const lineMaterial = new THREE.LineBasicMaterial({
      color: LINE_COLOR,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    })
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
    scene.add(lines)

    const linePositions = lineGeometry.attributes.position.array as Float32Array
    const particleAttribute = particleGeometry.attributes
      .position as THREE.BufferAttribute
    const particlePositions = particleAttribute.array as Float32Array

    const pointer = new THREE.Vector2(-1000, -1000)
    const raycaster = new THREE.Raycaster()
    const focusPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const pointerWorld = new THREE.Vector3()

    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    })
    window.addEventListener('resize', handleResize)

    renderer.setAnimationLoop(() => {
      raycaster.setFromCamera(pointer, camera)
      raycaster.ray.intersectPlane(focusPlane, pointerWorld)

      let vertexIndex = 0
      let connectedPairs = 0

      for (let i = 0; i < particleCount; i += 1) {
        const i3 = i * 3
        let x = particlePositions[i3]
        let y = particlePositions[i3 + 1]
        let z = particlePositions[i3 + 2]

        x += velocities[i].x
        y += velocities[i].y
        z += velocities[i].z

        const deltaX = pointerWorld.x - x
        const deltaY = pointerWorld.y - y
        const distanceToPointer = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

        if (distanceToPointer < POINTER_RADIUS) {
          const force = (POINTER_RADIUS - distanceToPointer) / POINTER_RADIUS
          x -= deltaX * force * 0.05
          y -= deltaY * force * 0.05
        } else {
          x += (origins[i].x - x) * 0.01
          y += (origins[i].y - y) * 0.01
          z += (origins[i].z - z) * 0.01
        }

        particlePositions[i3] = x
        particlePositions[i3 + 1] = y
        particlePositions[i3 + 2] = z

        for (let j = i + 1; j < particleCount; j += 1) {
          const j3 = j * 3
          const otherX = particlePositions[j3]
          const otherY = particlePositions[j3 + 1]
          const otherZ = particlePositions[j3 + 2]
          const squaredDistance =
            (x - otherX) ** 2 + (y - otherY) ** 2 + (z - otherZ) ** 2

          if (squaredDistance < LINK_DISTANCE * LINK_DISTANCE) {
            linePositions[vertexIndex] = x
            linePositions[vertexIndex + 1] = y
            linePositions[vertexIndex + 2] = z
            linePositions[vertexIndex + 3] = otherX
            linePositions[vertexIndex + 4] = otherY
            linePositions[vertexIndex + 5] = otherZ
            vertexIndex += 6
            connectedPairs += 1
          }
        }
      }

      particleAttribute.needsUpdate = true
      lineGeometry.setDrawRange(0, connectedPairs * 2)
      lineGeometry.attributes.position.needsUpdate = true
      scene.rotation.y += 0.0005
      scene.rotation.x += 0.0002
      renderer.render(scene, camera)
    })

    return () => {
      renderer.setAnimationLoop(null)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('resize', handleResize)
      particleGeometry.dispose()
      lineGeometry.dispose()
      particleMaterial.dispose()
      lineMaterial.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className='nextoken-space-canvas'
      aria-hidden='true'
    />
  )
}
